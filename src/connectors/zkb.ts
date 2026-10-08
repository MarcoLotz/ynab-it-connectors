/** ZKB (Zürcher Kantonalbank): e-banking account statement CSV export. */

import { csv, parseAmount, parseDate } from "../core.ts";

export default csv({
  name: "ZKB",
  countries: ["CH"],
  delimiter: ";",
  columns: ["Date", "Booking text", "Debit CHF", "Credit CHF"],
  howToExport: [
    "Log in to ZKB eBanking on the web and set the language to English.",
    "Open Account & Payments › your CHF account › Bank Statements (top right).",
    "Pick the account and the period, then click CSV › with details.",
  ],
  convert: (rows) =>
    rows
      .filter((row) => row.Date) // detail lines of a collective booking have no date
      .map((row) => {
        const booking = row["Booking text"];
        const colon = booking.indexOf(": ");
        const payee = row.Details || (colon < 0 ? booking : booking.slice(colon + 2));
        return {
          date: parseDate(row.Date),
          payee: payee.split(",")[0] ?? "",
          memo: row["Payment purpose"] || booking,
          amount: parseAmount(row["Credit CHF"]) - parseAmount(row["Debit CHF"]),
        };
      }),
});
