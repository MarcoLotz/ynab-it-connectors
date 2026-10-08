import assert from "node:assert/strict";
import { test } from "node:test";
import { ynabRows } from "./helpers.ts";

test("viseca", () => {
  // Viseca one bill CSV (Bills › Download .csv): comma-separated, UTF-8 with BOM, LF, nothing
  // quoted, English header on line 1, no footer. "Date" is YYYY-MM-DD HH:MM:SS; "Amount" has
  // 3 decimals (the last always 0) in the card currency, from Viseca's view (purchases positive,
  // refunds and bill payments negative), so the sign is flipped. Card rows come first, then the
  // card-less rows. Only "Date", "StateType", "MerchantName", "Details" and "Amount" are read;
  // "Currency", "OriginalAmount", "OriginalCurrency" and "Exchange Rate" are ignored.
  assert.deepEqual(ynabRows("viseca"), [
    // the PENDING SBB row is skipped (synthetic: only BOOKED rows seen in real exports)
    // Purchase: payee is "MerchantName", memo is "Details"; time dropped, umlaut kept (UTF-8).
    ["2026-09-28", "Coop", "Coop-1234 Zürich HB", "-42.35"],
    // Foreign-currency purchase: the CHF "Amount" is used, the EUR amount and rate ignored.
    ["2026-09-21", "Booking.com", "BOOKING.COM HOTEL", "-176.95"],
    // Refund (negative in the export): money in, dated by "Date", not the earlier ValutaDate.
    ["2026-09-18", "Digitec Galaxus", "Digitec Galaxus AG", "149.00"],
    // Purchase with an empty "MerchantName": the payee falls back to "Details".
    // Its Type "fee" is common on ordinary purchases and is ignored.
    ["2026-09-15", "Bergbahnen Example AG", "Bergbahnen Example AG", "-23.80"],
    // Card bill payment (no CardId): "MerchantName" is empty, so the payee is "Details". It is
    // kept as money in, like a transfer into the YNAB credit-card account.
    ["2026-09-25", "Ihre Zahlung - Danke", "Ihre Zahlung - Danke", "1873.25"],
    // Card-less charge (positive, no CardId or merchant; real "Details" text unknown): payee
    // from "Details", money out like a purchase.
    ["2026-09-24", "Account charge", "Account charge", "-2.00"],
  ]);
});
