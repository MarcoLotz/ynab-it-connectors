/** SWIFT MT940 bank statement: a standard export of many banks in Germany, the Netherlands, … */

import { type Connector, parseAmount, parseDate, type Transaction } from "../core.ts";

export default {
  name: "MT940",
  countries: [],
  howToExport: [
    "In your e-banking, open the account's transactions or statements and look for Export.",
    "Choose the format MT940 (sometimes called SWIFT or STA) and pick the period.",
    "Download the file: it ends in .sta, .mt940 or .txt.",
    "Export one account per file and import each into the matching YNAB account.",
  ],
  // Not :61:, which a statement without bookings lacks (ING sends those by default).
  detect: (text) => (/^:20:/m.test(text) && /^:60[FM]:/m.test(text) ? 1 : 0),
  convert(text) {
    const list = fields(text);
    const tags = new Set(list.map(([tag]) => tag));
    if (!tags.has(":20:") || !(tags.has(":60F:") || tags.has(":60M:"))) {
      throw new Error("Not an MT940 export (expected :20: and :60F: fields)");
    }
    const accounts = new Set(
      list.filter(([tag]) => tag === ":25:").map(([, value]) => value.trim()),
    );
    if (accounts.size > 1) {
      throw new Error(
        `This file has statements of ${accounts.size} accounts. ` +
          "Export one account per file and import each into its own YNAB account.",
      );
    }
    return list.flatMap(([tag, value], i) => {
      if (tag !== ":61:") return [];
      const [nextTag, nextValue] = list[i + 1] ?? [];
      return [transaction(value, nextTag === ":86:" ? nextValue : undefined)];
    });
  },
} satisfies Connector;

/** The fields of every statement in the file, in order, with wrapped lines joined by "\n". */
function fields(text: string): [tag: string, value: string][] {
  const result: [string, string][] = [];
  for (const line of text.split(/\r?\n|\r/)) {
    const tag = /^:\d\d[A-Z]?:/.exec(line)?.[0];
    const last = result.at(-1);
    if (tag) result.push([tag, line.slice(tag.length)]);
    // Skips the SWIFT envelope ({1:…}{2:…}{4: … -}) and the "-" that ends each statement.
    else if (last && !/^(\{|-\}|-?\s*$)/.test(line)) last[1] += `\n${line}`;
  }
  return result;
}

/** A :61: statement line, with the :86: information to the account owner that follows it. */
function transaction(line: string, info: string | undefined): Transaction {
  // The booking date is optional; ASN Bank and Citi leave it blank.
  const match = /^(\d{6})(?:(\d{4})| {4})?(RC|RD|C|D)[A-Z]?(\d+,\d*)/.exec(line);
  if (!match) throw new Error(`Unrecognised MT940 transaction: ":61:${line}"`);
  const [, valueDate = "", entryDate, mark, amount = ""] = match;
  let date: string;
  if (entryDate) {
    // The booking date has no year: the value date's, ±1 if New Year lies between them. The
    // value date isn't parsed: German banks date month-end fees 30 February.
    const months = Number(valueDate.slice(2, 4)) - Number(entryDate.slice(0, 2));
    const year = 2000 + Number(valueDate.slice(0, 2)) + Math.round(months / 12);
    date = parseDate(`${year}${entryDate}`, "YYYYMMDD");
  } else {
    date = parseDate(valueDate, "YYMMDD");
  }
  return {
    date,
    // Without :86:, the supplementary details on the second line of :61:, if any.
    ...details(info ?? line.split("\n").slice(1).join(" ")),
    // RD (reversal of a debit) is money in, RC (reversal of a credit) money out.
    amount: (mark === "C" || mark === "RD" ? 1 : -1) * parseAmount(amount),
  };
}

/** Payee and memo from the :86: field, which comes in three shapes. */
function details(info: string): Pick<Transaction, "payee" | "memo"> {
  // Banks wrap the field at a fixed width, in the middle of words too.
  const text = info.replaceAll("\n", "");

  if (/^\d{3}\?/.test(text)) {
    // German banks: a transaction code, then ?00 booking text, ?10 primanota, ?20-?29 and
    // ?60-?63 purpose, ?30 bank code, ?31 account, ?32-?33 name and so on. Long values are cut
    // into the next subfield at a fixed width, so they are joined without a separator.
    const subfields = Array.from(text.matchAll(/\?(\d\d)([^?]*)/g), ([, key, value = ""]) => ({
      key: Number(key),
      value,
    }));
    const join = (from: number, to: number) =>
      subfields
        .filter(({ key }) => key >= from && key <= to)
        .map(({ value }) => value)
        .join("");
    const booking = join(0, 0);
    const purpose = join(20, 29) + join(60, 63);
    // SEPA labels the parts of the purpose: EREF+ reference, MREF+ mandate, CRED+ creditor id,
    // SVWZ+ the text meant for people, … Keep that text (without it, what precedes the labels).
    const sepa = purpose.split(/(EREF|KREF|MREF|CRED|DEBT|SVWZ|ABWA|ABWE)\+/);
    const memo = sepa.length > 1 ? sepa[sepa.indexOf("SVWZ") + 1] : purpose;
    return { payee: join(32, 33) || booking, memo: memo || booking };
  }

  if (/^\/[A-Z]{2,4}\//.test(text)) {
    // SWIFT form, e.g. in the Netherlands: /TRTP/SEPA OVERBOEKING/IBAN/…/NAME/…/REMI/…/EREF/…
    // (ABN AMRO), /EREF/…//CNTP/IBAN/BIC/name/city///REMI/USTD//… (ING). Values may contain
    // slashes and codes like /INV/, so only 4 letters (and BIC) make a key.
    const get = (key: string) =>
      new RegExp(`/${key}/(.*?)/?(?=/(?:[A-Z]{4}|BIC)/|$)`).exec(text)?.[1] ?? "";
    const payee = get("NAME") || (/\/CNTP\/[^/]*\/[^/]*\/([^/]*)/.exec(text)?.[1] ?? "");
    // ING: /REMI/USTD//text/ (unstructured) or /REMI/STRD/CUR/payment reference/.
    const memo = get("REMI(?:/(?:USTD|STRD)/[A-Z]*)?");
    // Other banks' keys (HSBC's /OCMT/, Citi's /PT/…): keep the text.
    if (payee || memo) return { payee, memo };
  }

  const free = info.replaceAll("\n", " ");
  return { payee: free, memo: free };
}
