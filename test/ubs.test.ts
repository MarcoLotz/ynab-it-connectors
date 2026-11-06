import assert from "node:assert/strict";
import { test } from "node:test";
import { ynabRows } from "./helpers.ts";

test("ubs", () => {
  // e-banking transactions CSV, German UI: semicolon-separated, UTF-8 with BOM, LF, every line
  // ending in ";". Eight lines of account details padded with ";" and a blank line above the
  // header; newest first, YYYY-MM-DD. "Belastung" is negative and "Gutschrift" positive, with
  // no thousands separator; the amount is their sum. Dated by "Abschlussdatum" (trade date).
  // Payee is "Beschreibung1" up to its first comma (the address follows); memo is
  // "Beschreibung2" after its last ", " (card number and expiry come first). "Beschreibung3",
  // "Einzelbetrag", "Saldo" and "Fussnoten" are ignored.
  assert.deepEqual(ynabRows("ubs"), [
    // Card purchase not booked yet (empty "Buchungsdatum"): kept, it is already in the balance.
    ["2026-09-30", "SBB CFF FFS", "Zahlung Debitkarte", "-4.20"],
    // Fee: no comma in either description, so both are used whole; the footnote is ignored.
    ["2026-09-30", "Saldo Dienstleistungspreise", "Saldo Dienstleistungspreise", "-2.00"],
    // Foreign-currency card purchase: the CHF amount is used, the EUR one in "Beschreibung3"
    // is ignored.
    ["2026-09-28", "BOOKING.COM", "Zahlung Debitkarte", "-23.70"],
    // Card purchase: dated by the trade date (27.09), not the booking date (29.09); umlaut kept.
    ["2026-09-27", "Coop-1234 Zürich HB", "Zahlung Debitkarte", "-42.35"],
    // ATM withdrawal: money out.
    ["2026-09-26", "UBS Zürich Paradeplatz", "Bezug Bancomat", "-200.00"],
    // Salary: a credit, positive; the address after the first comma is dropped.
    ["2026-09-25", "Example AG", "Gutschrift", "5200.00"],
    // Collective e-banking order: one transaction for the total, named after "Beschreibung1"
    // of the total line. Its two detail lines (no dates, amounts in "Einzelbetrag") are skipped.
    ["2026-09-01", "Immo Example AG", "e-banking-Sammelauftrag", "-5071.65"],
  ]);
});
