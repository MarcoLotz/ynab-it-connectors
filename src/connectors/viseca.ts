/** Viseca (one app): credit card transactions CSV export. */

import { csv, parseAmount, parseDate } from "../core.ts";

export default csv({
  name: "Viseca",
  countries: ["CH"],
  columns: ["Date", "StateType", "MerchantName", "Details", "Amount"],
  howToExport: [
    "Log in at one.viseca.ch, in the one app or via e-banking (ZKB: Cards › Credit cards).",
    "Open Bills (Rechnungen) › your card account › Download .csv and pick the time frame.",
    "Use that .csv file; PDF bills and Excel lists won't work.",
    "Amounts are in the card currency (e.g. CHF or EUR): use a YNAB account in that currency.",
  ],
  convert: (rows) =>
    rows
      .filter((row) => row.StateType === "BOOKED")
      .map((row) => ({
        date: parseDate(row.Date),
        payee: row.MerchantName || row.Details, // MerchantName is empty on bill payments, some purchases
        memo: row.Details,
        amount: -parseAmount(row.Amount), // purchases are positive in the export
      })),
});
