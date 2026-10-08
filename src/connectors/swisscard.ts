/** Swisscard: credit card transactions CSV export. */

import { csv, parseAmount, parseDate } from "../core.ts";

export default csv({
  name: "Swisscard",
  countries: ["CH"],
  columns: ["Transaction date", "Merchant", "Description", "Amount", "Status"],
  howToExport: [
    "Log in at app.swisscard.ch and set the language to English.",
    "Open your card account's transactions and export them as CSV, not Excel.",
    "Wait until recent purchases are posted: pending ones are left out.",
    "One file holds all cards of the account, so import it into one YNAB account.",
  ],
  convert: (rows) =>
    rows
      // Pending rows come back once posted; pending FX rows have no Amount yet.
      .filter((row) => row.Status === "Posted")
      .map((row) => ({
        date: parseDate(row["Transaction date"]),
        payee: row.Merchant || row.Description, // Merchant is empty on bill payments, some credits
        memo: row.Description,
        amount: -parseAmount(row.Amount), // purchases are positive in the export
      })),
});
