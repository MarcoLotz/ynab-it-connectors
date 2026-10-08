import assert from "node:assert/strict";
import { test } from "node:test";
import { ynabRows } from "./helpers.ts";

test("neon", () => {
  // neon app "Account statements" CSV: semicolon-separated, ASCII without BOM, LF, header on
  // line 1, no footer. Every value is double-quoted, but an empty Subject is "" or left bare (;;).
  // ISO dates, newest first. "Amount" is signed CHF (negative = money out), so no sign flip.
  // Payee is "Description", memo is "Subject". "Original amount", "Original currency",
  // "Exchange rate", "Category", "Tags", "Wise" and "Spaces" are ignored.
  assert.deepEqual(ynabRows("neon"), [
    // QR-bill payment: the reference in "Subject" becomes the memo.
    ["2026-09-30", "Sunrise GmbH", "QR-Bill: REF: 210000000003139471430009017", "-89.90"],
    // Salary: money in, positive as exported.
    ["2026-09-25", "Example AG", "Lohn September", "5200.00"],
    // Move to a neon Space (Spaces = yes), Subject "": imported like any other transaction.
    ["2026-09-22", "Holidays", "", "-500.00"],
    // Transfer sent with Wise (Wise = yes): imported like any other transaction.
    ["2026-09-18", "Example GmbH", "Invoice 4711", "-154.20"],
    // Card payment in EUR: the CHF "Amount" is used, not "Original amount" (-29.00 EUR).
    ["2026-09-14", "Trenitalia", "", "-27.10"],
    // Refund: money in, with the merchant as payee.
    ["2026-09-10", "Zalando", "", "59.90"],
    // Card payment in CHF with a bare empty Subject (;;): empty memo.
    ["2026-09-03", "Migros", "", "-12.50"],
  ]);
});
