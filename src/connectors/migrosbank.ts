/** Migros Bank: e-banking account statement CSV export. */

import { type Connector, csv, parseAmount, parseDate } from "../core.ts";

// The export's headers follow the e-banking language: date, booking text, message, reference
// and amount.
const LANGUAGES = [
  ["Datum", "Buchungstext", "Mitteilung", "Referenznummer", "Betrag"],
  ["Date", "Libellé", "Message", "Numéro de référence", "Montant"],
  ["Data", "Testo di registrazione", "Comunicazione", "Numero di riferimento", "Importo"],
] as const;

const info = {
  name: "Migros Bank",
  countries: ["CH"],
  howToExport: [
    "Log in to Migros Bank e-banking on the web.",
    "Open your account's statement (Kontoauszug) and pick the period.",
    "Export it as CSV, not PDF.",
    "Migros Bank credit cards: use the Viseca export, it is the same file.",
  ],
};

const languages = LANGUAGES.map(([date, text, message, reference, amount]) =>
  csv({
    ...info,
    delimiter: ";",
    columns: [date, text, message, reference, amount],
    convert: (rows) =>
      rows.map((row) => ({
        date: parseDate(row[date]),
        payee: row[text].split(",")[0] ?? "", // name, then address and IBAN
        memo: row[message],
        amount: parseAmount(row[amount]), // signed; decimal point or comma
      })),
  }),
);

export default {
  ...info,
  detect: (text) => Math.max(...languages.map((language) => language.detect(text))),
  convert(text) {
    const language = languages.find((l) => l.detect(text));
    if (!language) throw new Error("Not a Migros Bank export (no account statement header)");
    return language.convert(text);
  },
} satisfies Connector;
