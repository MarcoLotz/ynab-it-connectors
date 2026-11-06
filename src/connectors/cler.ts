/** Bank Cler: e-banking account transactions CSV export. */

import { type Connector, csv, parseAmount, parseDate } from "../core.ts";

// The export's headers follow the e-banking language and name the account currency:
// booking date, order type, text, debit and credit.
const LANGUAGES = [
  ["Buchungsdatum", "Auftragsart", "Text", "Belastungsbetrag", "Gutschriftsbetrag"],
  ["Date de comptabilisation", "Type d'ordre", "Libellé", "Montant débité", "Montant crédité"],
  [
    "Data di registrazione",
    "Tipo di ordine",
    "Testo",
    "Importo di addebito",
    "Importo di accredito",
  ],
] as const;
const CURRENCIES = ["CHF", "EUR", "USD"];

const info = {
  name: "Bank Cler",
  countries: ["CH"],
  howToExport: [
    "Log in to Bank Cler e-banking on the web (the Zak app has no export).",
    "Open Accounts, pick the account and the period.",
    "Export the transactions as CSV.",
  ],
};

const languages = LANGUAGES.flatMap(([date, type, text, debitName, creditName]) =>
  CURRENCIES.map((currency) => {
    const debit = `${debitName} (${currency})`;
    const credit = `${creditName} (${currency})`;
    return csv({
      ...info,
      delimiter: ";",
      columns: [date, type, text, debit, credit],
      convert: (rows) =>
        rows.map((row) => ({
          date: parseDate(row[date] ?? ""),
          payee: row[text]?.split("\n")[0] ?? "", // name, then address lines and references
          memo: row[type] ?? "",
          amount: parseAmount(row[credit] ?? "") - parseAmount(row[debit] ?? ""), // both unsigned
        })),
    });
  }),
);

export default {
  ...info,
  detect: (text) => Math.max(...languages.map((language) => language.detect(text))),
  convert(text) {
    const language = languages.find((l) => l.detect(text));
    if (!language) throw new Error("Not a Bank Cler export (no e-banking transaction list header)");
    return language.convert(text);
  },
} satisfies Connector;
