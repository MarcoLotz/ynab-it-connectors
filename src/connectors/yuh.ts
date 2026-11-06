/** Yuh: app account activity CSV export. */

import { csv, parseAmount, parseDate } from "../core.ts";

// Names come wrapped in their own quotes: """Migros""" in the file is "Migros" in the cell.
const unquote = (text = "") => text.replace(/^"(.*)"$/, "$1");

export default csv({
  name: "Yuh",
  countries: ["CH"],
  delimiter: ";",
  columns: ["DATE", "ACTIVITY TYPE", "ACTIVITY NAME", "DEBIT", "DEBIT CURRENCY", "CREDIT"],
  howToExport: [
    "In the Yuh app, open your activities (the list of transactions).",
    "Tap the export icon, pick the period and export it as CSV.",
    "Only CHF amounts are imported: add spending in other currencies to YNAB yourself.",
  ],
  convert: (rows) =>
    rows
      // Rewards, trades and payments in other currencies don't move CHF.
      .filter((row) => row["DEBIT CURRENCY"] === "CHF" || row["CREDIT CURRENCY"] === "CHF")
      .map((row) => {
        const name = unquote(row["ACTIVITY NAME"]);
        return {
          date: parseDate(row.DATE), // DD/MM/YYYY
          payee: unquote(row.RECIPIENT) || unquote(row.SENDER) || name,
          memo: name,
          amount:
            (row["CREDIT CURRENCY"] === "CHF" ? parseAmount(row.CREDIT) : 0) +
            (row["DEBIT CURRENCY"] === "CHF" ? parseAmount(row.DEBIT) : 0), // debits are negative
        };
      }),
});
