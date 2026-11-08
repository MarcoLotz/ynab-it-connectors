import assert from "node:assert/strict";
import { test } from "node:test";
import { ynabRows } from "./helpers.ts";

test("cler", () => {
  // e-banking transactions CSV, German UI: semicolon-separated, Windows-1252 (Latin-1), LF,
  // header on line 1 naming the account currency ("Belastungsbetrag (CHF)"), no footer.
  // Newest first, DD.MM.YYYY. Debit and credit are unsigned; the amount is credit - debit.
  // "Text" is quoted when it spans several lines: name, address, IBAN, reference. Payee is its
  // first line, memo is "Auftragsart". "Saldo (CHF)" is ignored.
  assert.deepEqual(ynabRows("cler"), [
    // Fee: one-line text; the umlaut is read from Windows-1252.
    ["2026-09-30", "Kontoführungsgebühr", "Kontoführungsgebühr", "-2.00"],
    // QR bill: only the first line of the five-line text is kept.
    ["2026-09-29", "Example Versicherung AG", "QR-Rechnung", "-312.40"],
    // Collective debit: one transaction for the total.
    ["2026-09-26", "Sammelbelastung vom 26.09.2026", "Sammelbelastung", "-617.40"],
    // Salary: a credit, positive.
    ["2026-09-25", "Example AG", "Gutschrift", "5200.00"],
    // Standing order.
    ["2026-09-01", "Immo Example AG", "Zahlung (Dauerauftrag)", "-1850.00"],
  ]);
});
