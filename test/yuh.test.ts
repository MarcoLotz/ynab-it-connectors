import assert from "node:assert/strict";
import { test } from "node:test";
import { ynabRows } from "./helpers.ts";

test("yuh", () => {
  // App activity CSV: semicolon-separated, UTF-8 with BOM, LF, upper-case English header on
  // line 1, no footer. Oldest first, DD/MM/YYYY. "DEBIT" is negative and "CREDIT" positive,
  // each with its own currency column; only CHF amounts are read. Text cells are written
  // """like this""", so they keep a pair of quotes that is removed. Payee is "RECIPIENT", else
  // "SENDER", else "ACTIVITY NAME"; memo is "ACTIVITY NAME". "ACTIVITY TYPE", the card and
  // locality, fees and the trading columns are ignored.
  assert.deepEqual(ynabRows("yuh"), [
    // Money received: payee is "SENDER".
    ["2026-09-01", "Jane Muster", "Überweisung von Jane Muster", "500.00"],
    // Card purchase in CHF: no recipient or sender, so the payee is the activity name.
    ["2026-09-03", "Migros Zürich HB", "Migros Zürich HB", "-34.60"],
    // The EUR card purchase (05.09) is skipped: it doesn't move CHF.
    // TWINT payment: payee is "RECIPIENT".
    ["2026-09-08", "Max Muster", "Twint an Max Muster", "-20.00"],
    // Share purchase: the CHF debit (shares plus the 1.00 fee) leaves the account.
    ["2026-09-10", "2x Example Holding", "2x Example Holding", "-140.00"],
    // The reward in Swissqoins (12.09, no amount) and the USD dividend (15.09) are skipped.
  ]);
});
