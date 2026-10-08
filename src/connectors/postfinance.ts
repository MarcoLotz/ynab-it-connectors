/** PostFinance: e-finance account transactions CSV export. */

import { csv, parseAmount, parseDate } from "../core.ts";

export default csv({
  name: "PostFinance",
  countries: ["CH"],
  delimiter: ";",
  columns: ["Date", "Notification text", "Credit in CHF", "Debit in CHF"],
  howToExport: [
    "Log in to e-finance on the web and set the language to English.",
    "Open the transaction list of your CHF account, not of a credit card.",
    "Pick the period and scroll to the end so every transaction is loaded.",
    "Click Export › CSV.",
  ],
  convert: (rows) =>
    rows
      .filter((row) => row["Credit in CHF"] || row["Debit in CHF"]) // drops the closing disclaimer
      .map((row) => ({
        date: parseDate(row.Date),
        payee: row["Notification text"],
        memo: "",
        amount: parseAmount(row["Credit in CHF"]) + parseAmount(row["Debit in CHF"]),
      })),
});
