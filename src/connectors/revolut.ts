/** Revolut: account statement CSV export. */

import { csv, parseAmount, parseDate } from "../core.ts";

export default csv({
  name: "Revolut",
  countries: [],
  columns: ["State", "Completed Date", "Description", "Amount", "Fee"],
  howToExport: [
    "Set the Revolut app language to English; statements may take up to 2 hours to follow.",
    "On app.revolut.com, select the account (currency) › Statement (top right).",
    "Choose Excel (it downloads a CSV), pick the period, then click Generate.",
    "Repeat for each currency account; import each file into its own YNAB account.",
  ],
  convert: (rows) =>
    rows
      .filter((row) => row.State === "COMPLETED")
      .map((row) => ({
        date: parseDate(row["Completed Date"]),
        payee: row.Description,
        memo: row.Description,
        amount: parseAmount(row.Amount) - parseAmount(row.Fee),
      })),
});
