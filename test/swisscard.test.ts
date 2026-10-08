import assert from "node:assert/strict";
import { test } from "node:test";
import { ynabRows } from "./helpers.ts";

test("swisscard", () => {
  // app.swisscard.ch CSV (SC-Transactions_<export time>.csv): comma-separated, UTF-8 without BOM,
  // unquoted header on line 1, every data value double-quoted (empty ones too), no footer.
  // Newest first, DD.MM.YYYY; one file mixes all cards of the account. "Amount" is in CHF from
  // Swisscard's view (purchases positive, refunds and payments negative), so the sign is flipped.
  // Card number, Currency, the foreign-currency columns, Debit/Credit and categories are ignored.
  assert.deepEqual(ynabRows("swisscard"), [
    // The two "Pending" rows (Steam, Migros) are skipped: only "Posted" rows are kept, and
    // pending ones are exported again once posted. Steam (USD) has no CHF "Amount" yet, which
    // would otherwise import as 0.00.
    // Purchase: payee is "Merchant", memo is "Description"; the umlaut survives (UTF-8).
    ["2026-09-28", "Coop", "COOP-1234 ZH BAHNHOFSTR., ZÜRICH", "-17.55"],
    // Foreign-currency purchase: the CHF "Amount" is used (no thousands separator), EUR ignored.
    ["2026-09-24", "Booking.com", "BOOKING.COM, AMSTERDAM", "-1234.50"],
    // Purchase on the second card of the account: same output, the card is not kept.
    ["2026-09-22", "Zeughauskeller", "ZEUGHAUSKELLER, ZÜRICH", "-86.50"],
    // Refund (negative, Credit): money in.
    ["2026-09-15", "Digitec Galaxus", "DIGITEC GALAXUS AG, ZÜRICH", "149.00"],
    // Card bill payment: no "Merchant", so the payee falls back to "Description"; it is
    // kept as money in, like a transfer into the YNAB credit-card account.
    ["2026-09-10", "IHRE ZAHLUNG – BESTEN DANK", "IHRE ZAHLUNG – BESTEN DANK", "1873.25"],
  ]);
});
