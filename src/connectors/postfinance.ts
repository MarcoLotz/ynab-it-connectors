/** PostFinance: e-finance account transactions CSV export, in any of the four UI languages. */

import { type Connector, csv, parseAmount, parseDate } from "../core.ts";

// The export's headers follow the e-finance language: date, notification text, credit, debit.
const LANGUAGES = [
  ["Date", "Notification text", "Credit in CHF", "Debit in CHF"],
  ["Datum", "Avisierungstext", "Gutschrift in CHF", "Lastschrift in CHF"],
  ["Date", "Texte de notification", "Crédit en CHF", "Débit en CHF"],
  ["Data", "Testo di avviso", "Accredito in CHF", "Addebito in CHF"],
] as const;

const info = {
  name: "PostFinance",
  countries: ["CH"],
  howToExport: [
    "Log in to e-finance on the web.",
    "Open the transaction list of your CHF account, not of a credit card.",
    "Pick the period and scroll to the end so every transaction is loaded.",
    "Click Export › CSV.",
  ],
};

const languages = LANGUAGES.map(([date, text, credit, debit]) =>
  csv({
    ...info,
    delimiter: ";",
    columns: [date, text, credit, debit],
    convert: (rows) =>
      rows
        .filter((row) => row[credit] || row[debit]) // drops the closing disclaimer
        .map((row) => ({
          date: parseDate(row[date]),
          payee: row[text],
          memo: "",
          amount: parseAmount(row[credit]) + parseAmount(row[debit]),
        })),
  }),
);

export default {
  ...info,
  detect: (text) => Math.max(...languages.map((language) => language.detect(text))),
  convert(text) {
    const language = languages.find((l) => l.detect(text));
    if (!language)
      throw new Error("Not a PostFinance export (no e-finance transaction list header)");
    return language.convert(text);
  },
} satisfies Connector;
