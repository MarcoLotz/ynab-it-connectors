/** Neon: app account statement CSV export. */

import { csv, parseAmount, parseDate } from "../core.ts";

export default csv({
  name: "Neon",
  countries: ["CH"],
  delimiter: ";",
  columns: ["Date", "Amount", "Original amount", "Exchange rate", "Description", "Subject"],
  howToExport: [
    "In the neon app, tap Profile (bottom right) › Account statements (Kontoauszüge).",
    "Pick the monthly or yearly statement you want.",
    "Download it as CSV, not PDF.",
  ],
  convert: (rows) =>
    rows.map((row) => ({
      date: parseDate(row.Date),
      payee: row.Description,
      memo: row.Subject,
      amount: parseAmount(row.Amount), // in CHF, also for foreign-currency payments
    })),
});
