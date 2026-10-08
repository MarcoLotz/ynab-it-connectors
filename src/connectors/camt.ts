/** ISO 20022 camt.053 statements, camt.054 notifications and camt.052 reports (XML). */

import { type Connector, parseAmount, parseDate, type Transaction } from "../core.ts";

interface XmlElement {
  /** Without its namespace prefix. */
  name: string;
  children: XmlElement[];
  text: string;
}

const TOKEN = new RegExp(
  [
    /<!--[\s\S]*?-->/, // comment
    /<\?[\s\S]*?\?>/, // processing instruction, such as <?xml version="1.0"?>
    /<!DOCTYPE[^[>]*(?:\[[^\]]*\])?\s*>/,
    /<!\[CDATA\[([\s\S]*?)\]\]>/,
    /<\/([^\s>]+)\s*>/, // end tag
    /<([^\s/>]+)(?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*\s*(\/?)>/, // start tag, attributes skipped
    /([^<]+)/, // text
  ]
    .map((part) => part.source)
    .join("|"),
  "gy",
);
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const DAMAGED = "This XML file is damaged or incomplete";

// Only the predefined entities and character references: custom entities are never expanded.
const decodeText = (text: string) =>
  text.replace(
    /&(amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);/g,
    (_, ref: string) =>
      ENTITIES[ref] ?? String.fromCodePoint(Number(ref.slice(1).replace("x", "0x"))),
  );
const localName = (name: string) => name.slice(name.indexOf(":") + 1);

/** A small non-validating XML parser. DOMParser is a browser API, which connectors don't get. */
function parseXml(xml: string): XmlElement {
  const root: XmlElement = { name: "", children: [], text: "" };
  const open = [root];
  let parsed = 0;
  for (const [token, cdata, endTag, startTag, selfClosing, content] of xml.matchAll(TOKEN)) {
    const parent = open[open.length - 1] as XmlElement;
    parsed += token.length;
    if (startTag) {
      const element: XmlElement = { name: localName(startTag), children: [], text: "" };
      parent.children.push(element);
      if (!selfClosing) open.push(element);
    } else if (endTag) {
      if (open.pop()?.name !== localName(endTag)) throw new Error(DAMAGED);
    } else if (cdata !== undefined) parent.text += cdata;
    else if (content) parent.text += decodeText(content);
  }
  if (parsed < xml.length || open.length > 1) throw new Error(DAMAGED);
  return root;
}

/** The elements at a path of child names, such as "NtryDtls/TxDtls". */
const all = (element: XmlElement, path: string) =>
  path
    .split("/")
    .reduce(
      (found, name) => found.flatMap((e) => e.children.filter((child) => child.name === name)),
      [element],
    );
const texts = (element: XmlElement, path: string) =>
  all(element, path)
    .map((e) => e.text.trim())
    .filter(Boolean);
/** The first non-empty text at any of the paths. */
const text = (element: XmlElement, ...paths: string[]) =>
  paths.flatMap((path) => texts(element, path))[0] ?? "";

const ROOT = /<(?:[\w.-]+:)?BkToCstmr(?:Stmt|DbtCdtNtfctn|AcctRpt)[\s>]/;
const STATEMENTS = ["BkToCstmrStmt/Stmt", "BkToCstmrDbtCdtNtfctn/Ntfctn", "BkToCstmrAcctRpt/Rpt"];

function transaction(entry: XmlElement): Transaction {
  const debit = text(entry, "CdtDbtInd") === "DBIT";
  // A reversal is booked in the opposite direction (a reversed debit is a CRDT with RvslInd
  // true), so CdtDbtInd alone gives the amount's sign. Its details still describe the original
  // transaction, though, so the counterparty of a reversed debit is its creditor.
  const party = debit !== (text(entry, "RvslInd") === "true") ? "Cdtr" : "Dbtr";
  const details = all(entry, "NtryDtls/TxDtls");
  // A batch (collective booking) has a TxDtls per payment but is one transaction on the statement.
  const [single] = details.length === 1 ? details : [];
  const info = text(entry, "AddtlNtryInf");
  const payee =
    (single &&
      text(
        single,
        `RltdPties/${party}/Nm`, // up to camt v07
        `RltdPties/${party}/Pty/Nm`, // camt v08 and later
        `RltdPties/Ultmt${party}/Nm`,
        `RltdPties/Ultmt${party}/Pty/Nm`,
        "AddtlTxInf",
      )) ||
    info;
  const amount = parseAmount(text(entry, "Amt"));
  // The first 10 characters: DtTm has a time, and Dt may have a time zone (2026-09-14+02:00).
  const date = text(entry, "BookgDt/Dt", "BookgDt/DtTm", "ValDt/Dt", "ValDt/DtTm").slice(0, 10);
  return {
    date: parseDate(date),
    payee,
    memo:
      texts(entry, "NtryDtls/TxDtls/RmtInf/Ustrd").join(" ") ||
      // Where Swiss banks put a QR-bill's message, next to its reference.
      texts(entry, "NtryDtls/TxDtls/RmtInf/Strd/AddtlRmtInf").join(" ") ||
      texts(entry, "NtryDtls/TxDtls/RmtInf/Strd/CdtrRefInf/Ref").join(" ") ||
      (info === payee ? "" : info),
    amount: debit ? -amount : amount,
  };
}

export default {
  name: "camt.053 / camt.054",
  countries: [],
  howToExport: [
    "In your e-banking, open the account's transactions or statements and look for an export.",
    "Choose camt.053, also called ISO 20022, XML or camt; camt.054 and camt.052 work too.",
    "Pick the period and download the .xml file; unzip it first if it comes as a .zip.",
    "Export each account to its own file, to import it into the matching YNAB account.",
  ],
  detect: (xml) => (ROOT.test(xml) ? 1 : 0),
  convert(xml) {
    if (!ROOT.test(xml)) throw new Error("Not a camt.053 / camt.054 export");
    const document = parseXml(xml);
    const statements = STATEMENTS.flatMap((path) => all(document, `Document/${path}`));
    const accounts = statements.map(
      (s) => `${text(s, "Acct/Id/IBAN", "Acct/Id/Othr/Id")} ${text(s, "Acct/Ccy")}`,
    );
    // Daily statements of one account are merged, but a YNAB import goes into a single account.
    if (new Set(accounts).size > 1) {
      throw new Error(
        "This file has statements of several accounts. Export one account per file " +
          "and import each into its own YNAB account.",
      );
    }
    // Booked entries only, not PDNG or INFO. Sts is the code itself in older versions and holds
    // it in Cd in newer ones; an entry without one counts as booked.
    return statements
      .flatMap((statement) => all(statement, "Ntry"))
      .filter((entry) => ["BOOK", ""].includes(text(entry, "Sts/Cd", "Sts")))
      .map(transaction);
  },
} satisfies Connector;
