import assert from "node:assert/strict";
import { test } from "node:test";
import { ynabRows } from "./helpers.ts";

test("wise", () => {
  // Wise "transaction history" CSV (wise.com › Transactions), English UI: all currency balances
  // in one file, comma-separated, UTF-8 without BOM, LF. Header on line 1 (multi-word names
  // quoted), no footer, newest first by "Finished on". 21 columns; every row ends with a comma
  // (empty Note). Amounts are unsigned plain decimals; the sign comes from Direction (OUT/IN).
  // On OUT rows the fee in "Source fee amount" comes on top of "Source amount (after fees)".
  // Currencies, rates, Reference and Category are ignored.
  assert.deepEqual(ynabRows("wise"), [
    // Card payment in EUR from the CHF balance: OUT is negative, payee and memo are the
    // merchant ("Target name"). The CHF side plus the fee: -12.25 - 0.06.
    ["2026-09-28", "Café de Flore", "Café de Flore", "-12.31"],
    // Balance cashback (IN): positive, payee is "Source name" (Target name is empty).
    // Dated by "Finished on" (27.09), not "Created on" (26.09).
    ["2026-09-27", "TransferWise", "TransferWise", "0.42"],
    // Refund (REFUNDED, IN): positive, with the merchant ("Source name") as payee.
    ["2026-09-24", "Digitec Galaxus", "Digitec Galaxus", "49.90"],
    // the REFUNDED OUT Microsoft Store row (a reversed 1.00 hold) is skipped
    // The refunded card payment stays a COMPLETED row of its own; its 0.00 fee changes nothing.
    ["2026-09-19", "Digitec Galaxus", "Digitec Galaxus", "-49.90"],
    // the CANCELLED SBB CFF FFS row is skipped
    // the NEUTRAL BALANCE_TRANSACTION row (CHF -> EUR between own balances) is skipped
    // Direct debit from the EUR balance: no Source name and empty fee columns (fee 0); the
    // EUR amount is imported as is.
    ["2026-09-10", "Example GmbH", "Example GmbH", "-39.90"],
    // the TRANSFER row (a top-up, "Money added") is skipped, as is every ID with "TRANSFER"
  ]);
});
