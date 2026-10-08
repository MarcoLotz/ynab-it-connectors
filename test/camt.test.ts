import assert from "node:assert/strict";
import { test } from "node:test";
import { convert } from "../src/index.ts";
import { ynabRows } from "./helpers.ts";

test("camt", () => {
  // camt.053.001.08 bank-to-customer statement as Swiss banks export it (Swiss Payment
  // Standards): UTF-8 XML in the default namespace, pretty-printed. Two Stmt elements for the
  // same CHF account (1-15 and 16-30 September) are merged; entries are oldest first. One
  // transaction per Ntry, however many TxDtls it has, so totals match the statement's Bal.
  // Entries whose Sts/Cd isn't BOOK are skipped. The amount is Amt, negative for DBIT; the date
  // is BookgDt (Dt, or the date of DtTm), else ValDt. With exactly one TxDtls, the payee is the
  // counterparty's Pty/Nm (creditor of a debit, debtor of a credit), else AddtlTxInf; otherwise
  // AddtlNtryInf. The memo is RmtInf/Ustrd, else Strd/AddtlRmtInf, else the structured
  // reference, else AddtlNtryInf if it isn't the payee. Bal, BkTxCd, Refs and the parties'
  // addresses and accounts are ignored.
  assert.deepEqual(ynabRows("camt"), [
    // Debit card purchase: dated by BookgDt (02.09), not ValDt (01.09). The payee is the
    // creditor; no remittance info, so the memo is AddtlNtryInf. AddtlTxInf is ignored.
    ["2026-09-02", "Migros", "Debit card purchase", "-64.35"],
    // QR-bill: the creditor, not the debtor (the account owner), is the payee. No Ustrd and no
    // message, so the memo is the QR reference from Strd/CdtrRefInf/Ref.
    ["2026-09-07", "Example Energie AG", "000000000000000047202609018", "-112.80"],
    // QR-bill with a creditor reference (SCOR) and a message: the message (Strd/AddtlRmtInf) is
    // the memo, not the reference.
    ["2026-09-08", "Example Verlag AG", "Jahresabo 2026/27", "-79.00"],
    // Collective booking (Btch with two TxDtls): one transaction for the total, payee from
    // AddtlNtryInf, memo the Ustrd of both payments. The umlaut checks UTF-8 decoding.
    [
      "2026-09-10",
      "Collective debit e-banking (2 payments)",
      "Prämie Oktober 2026 Mitgliederbeitrag 2026/27",
      "-502.35",
    ],
    // TWINT: BookgDt has a DtTm, whose date (14.09) is used rather than ValDt (12.09). No
    // RltdPties, so the payee is AddtlTxInf.
    ["2026-09-14", "SBB CFF FFS", "TWINT payment", "-12.40"],
    // Card purchase in the second statement, which is merged with the first.
    ["2026-09-17", "Coop", "Debit card purchase", "-38.60"],
    // Its reversal: CRDT with RvslInd true, so positive as CdtDbtInd says. The details still
    // describe the original purchase, so the payee is its creditor.
    ["2026-09-18", "Coop", "Reversal debit card purchase", "38.60"],
    // Salary: a credit, so the debtor is the payee (the creditor is the account owner).
    ["2026-09-25", "Example AG", "Salary September 2026", "5200.00"],
    // Fee without NtryDtls: payee from AddtlNtryInf, which is then not repeated as memo.
    ["2026-09-30", "Account management fee", "", "-5.00"],
    // The PDNG Orell Füssli card purchase is skipped: it isn't booked yet.
  ]);
});

test("camt-v04", () => {
  // camt.054.001.04 debit/credit notification of a German EUR account, as Java-based banking
  // systems write it: every element has the ns2: namespace prefix, indented by 4 spaces, and
  // every Dt has a time zone (2026-09-29+02:00), as xs:date allows; the zone is ignored.
  // Sts is text ("BOOK") and the parties' Nm is directly under Dbtr/Cdtr (no Pty) in this version.
  assert.deepEqual(ynabRows("camt-v04"), [
    // SEPA direct debit: "&amp;" in the creditor's name is decoded; the two Ustrd lines are
    // joined with a space.
    [
      "2026-09-29",
      "Example Strom GmbH & Co. KG",
      "Abschlag Oktober 2026 Vertragskonto 000000000",
      "-86.00",
    ],
    // Transfer received: a credit, positive, from the debtor.
    ["2026-09-30", "Max Muster", "Miete Garage Oktober", "250.00"],
    // Card payment: dated by BookgDt (30.09), not ValDt (28.09); no remittance info, so the memo
    // is AddtlNtryInf.
    ["2026-09-30", "REWE Markt GmbH", "Kartenzahlung girocard", "-42.17"],
  ]);
});

test("camt with several accounts asks for one file per account", () => {
  const statement = (iban: string) =>
    `<Stmt><Acct><Id><IBAN>${iban}</IBAN></Id><Ccy>CHF</Ccy></Acct></Stmt>`;
  const xml = `<Document><BkToCstmrStmt>${statement("CH0000000000000000000")}${statement(
    "CH0000000000000000001",
  )}</BkToCstmrStmt></Document>`;
  assert.throws(() => convert(xml, "camt"), /Export one account per file/);
});
