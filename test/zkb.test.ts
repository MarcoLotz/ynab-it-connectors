import assert from "node:assert/strict";
import { test } from "node:test";
import { ynabRows } from "./helpers.ts";

test("zkb", () => {
  // eBanking "Bank Statements" CSV with details, English UI: semicolon-separated, every field
  // double-quoted (empty ones too), UTF-8 with BOM, CRLF. Header on line 1, no footer, newest
  // first. "Debit CHF" and "Credit CHF" are unsigned with no thousands separator; the amount is
  // credit - debit. Payee is "Details", else "Booking text" after its first ": " (if any), cut
  // at the first comma; memo is "Payment purpose", else the whole "Booking text". "Curr",
  // "Amount details", the references, "Value date" and "Balance CHF" are ignored.
  assert.deepEqual(ynabRows("zkb"), [
    // Fee: a debit, negative. No Details and no ": ", so the payee is the whole booking text.
    ["2026-09-30", "Payment transaction prices", "Payment transaction prices", "-2.00"],
    // Card purchase: dated by "Date" (29.09), not "Value date" (27.09). The payee is cut at the
    // first comma, so the merchant only survives in the memo.
    [
      "2026-09-29",
      "Purchase ZKB Visa Debit card no. xxxx 1234",
      "Purchase ZKB Visa Debit card no. xxxx 1234, Migros Zürich HB",
      "-23.45",
    ],
    // TWINT to a merchant: payee is the booking text after "Debit TWINT: ".
    ["2026-09-28", "SBB CFF FFS", "Debit TWINT: SBB CFF FFS", "-12.40"],
    // TWINT from a person ("SURNAME, FIRSTNAME +41..."): a credit, positive; the comma cut
    // leaves only the surname as payee.
    ["2026-09-26", "MUSTER", "Credit TWINT: MUSTER, MAX +41790000000", "20.00"],
    // Collective booking: one transaction for the total. Its two detail lines (empty Date,
    // counterparty in "Booking text", line amount in "Amount details") are skipped.
    ["2026-09-25", "Debit Mobile Banking (2)", "Debit Mobile Banking (2)", "-502.35"],
    // Money received: payee is "Details" up to the first comma, memo is "Payment purpose".
    ["2026-09-24", "Jane Muster", "Holiday flat share", "350.00"],
    // Standing order: same, as a debit; "1850.00" has no thousands separator.
    ["2026-09-01", "Immo Example AG", "Rent September 2026", "-1850.00"],
  ]);
});
