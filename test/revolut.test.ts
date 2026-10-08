import assert from "node:assert/strict";
import { test } from "node:test";
import { ynabRows } from "./helpers.ts";

test("revolut", () => {
  // Account statement, "Excel" format (really a CSV), English app: comma-separated, UTF-8
  // without BOM, LF, only descriptions with a comma are quoted. Header on line 1, no footer,
  // oldest first by "Completed Date" (by "Started Date" for rows without one). "Amount" is
  // signed and "Fee" is unsigned; the amount is Amount - Fee, which is also how "Balance"
  // moves. Rows whose State is not COMPLETED are skipped. Payee and memo are both
  // "Description"; "Type", "Product", "Started Date", "Currency" and "Balance" are ignored.
  assert.deepEqual(ynabRows("revolut"), [
    // Top-up: money in, positive.
    ["2026-09-01", "Top-up by *1234", "Top-up by *1234", "500.00"],
    // Card payment: dated by "Completed Date" (03.09), not "Started Date" (02.09).
    ["2026-09-03", "Migros", "Migros", "-64.35"],
    // The REVERTED Too Good To Go payment (empty Completed Date) is skipped.
    // Card payment with a fee, which is subtracted: -38.60 - 0.39.
    ["2026-09-08", "Amazon.de", "Amazon.de", "-38.99"],
    // ATM fee: -250.00 - 1.00. The description contains a comma, so it is quoted.
    [
      "2026-09-13",
      "Cash withdrawal at Zurich, Bahnhofplatz",
      "Cash withdrawal at Zurich, Bahnhofplatz",
      "-251.00",
    ],
    // Incoming transfer: money in, positive.
    ["2026-09-15", "Transfer from Jane Muster", "Transfer from Jane Muster", "150.00"],
    // Card refund: positive. The umlaut checks UTF-8 decoding.
    ["2026-09-18", "Orell Füssli", "Orell Füssli", "34.90"],
    // The PENDING SBB CFF FFS payment (empty Completed Date) is skipped.
  ]);
});
