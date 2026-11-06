/** Raiffeisen: e-banking account transactions CSV export. */

import { csv, parseAmount, parseDate, type Transaction } from "../core.ts";

export default csv({
  name: "Raiffeisen",
  countries: ["CH"],
  delimiter: ";",
  columns: ["IBAN", "Booked At", "Text", "Credit/Debit Amount", "Valuta Date"],
  howToExport: [
    "Log in to Raiffeisen e-banking on the web.",
    "Open your account's transactions (Kontobewegungen) and pick the period.",
    "Export them as CSV, not PDF.",
  ],
  convert: (rows) =>
    rows.reduce<Transaction[]>((transactions, row) => {
      const last = transactions.at(-1);
      // Long texts continue on lines of their own, with only "Text" filled.
      if (!row["Booked At"]) {
        if (last) last.memo = `${last.memo} ${row.Text}`.trim();
        return transactions;
      }
      transactions.push({
        date: parseDate(row["Booked At"]), // 2026-09-30 00:00:00.0
        payee: row.Text,
        memo: row.Details ?? "", // only in exports since July 2024
        amount: parseAmount(row["Credit/Debit Amount"]),
      });
      return transactions;
    }, []),
});
