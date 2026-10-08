/** Wise: transaction history CSV export. */

import { csv, parseAmount, parseDate } from "../core.ts";

export default csv({
  name: "Wise",
  countries: [],
  columns: [
    "ID",
    "Status",
    "Direction",
    "Finished on",
    "Source fee amount",
    "Source name",
    "Source amount (after fees)",
    "Target name",
  ],
  howToExport: [
    "On wise.com, set the language to English (your name › Language and appearance).",
    "On Home, click See all next to Transactions.",
    "Use Filter to pick the dates (up to a year), then click Download and choose CSV.",
    "Don't use a balance statement from Statements and reports: it has another format.",
    "One file holds all your balances, each in its own currency; amounts are not converted.",
  ],
  convert: (rows) =>
    rows
      // NEUTRAL: moved or converted between your own balances.
      .filter((row) => !row.ID.includes("TRANSFER") && row.Direction !== "NEUTRAL")
      // A refund is its own IN row; the original charge stays COMPLETED.
      .filter(
        (row) =>
          row.Status === "COMPLETED" || (row.Status === "REFUNDED" && row.Direction === "IN"),
      )
      .map((row) => {
        const out = row.Direction === "OUT";
        const amount = parseAmount(row["Source amount (after fees)"]);
        const payee = out ? row["Target name"] : row["Source name"];
        return {
          date: parseDate(row["Finished on"]),
          payee,
          memo: payee,
          amount: out ? -amount - parseAmount(row["Source fee amount"]) : amount, // fee comes on top
        };
      }),
});
