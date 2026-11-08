import assert from "node:assert/strict";
import { test } from "node:test";
import { ynabRows } from "./helpers.ts";

test("migrosbank", () => {
  // e-banking account statement CSV, German UI: semicolon-separated, UTF-8 with BOM, LF, every
  // value double-quoted except an empty "Referenznummer". Thirteen lines of statement and
  // customer details sit above the header, no footer. Oldest first, DD.MM.YYYY; "Betrag" is
  // signed with no thousands separator. Payee is "Buchungstext" up to its first comma (address
  // and IBAN follow), memo is "Mitteilung". "Referenznummer", "Saldo" and "Valuta" are ignored.
  assert.deepEqual(ynabRows("migrosbank"), [
    // Standing order: a debit, negative; the IBAN after the name is dropped.
    ["2026-09-01", "Immo Example AG", "Miete September 2026", "-1850.00"],
    // Salary: a credit, positive.
    ["2026-09-25", "Example AG", "Lohn September 2026", "5200.00"],
    // QR bill: empty message, the QR reference is not kept.
    ["2026-09-28", "Example Versicherung AG", "", "-312.40"],
    // Transfer to another account of the customer.
    ["2026-09-29", "Jane Muster", "Sparen", "-1407.00"],
    // Fee: no comma, so the whole text is the payee; umlaut kept (UTF-8).
    ["2026-09-30", "Kontoführungsgebühr", "", "-3.00"],
  ]);
});

test("migrosbank in French", () => {
  // The same export with a French UI: French headers, no "Saldo" column, fewer details above
  // the header and decimal commas.
  assert.deepEqual(ynabRows("migrosbank-fr"), [
    // "-1234,50": decimal comma.
    ["2026-09-03", "Services Industriels Example", "", "-1234.50"],
    ["2026-09-15", "Jane Muster", "Remboursement", "80.00"],
  ]);
});
