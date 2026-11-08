/** UBS: e-banking account transactions CSV export. */

import { type Connector, csv, parseAmount, parseDate } from "../core.ts";

// The export's headers follow the e-banking language: trade date, value date, debit, credit and
// the first two description columns. English exports have used both "Debit amount" and "Debit".
const LANGUAGES = [
  ["Trade date", "Value date", "Debit amount", "Credit amount", "Description1", "Description2"],
  ["Trade date", "Value date", "Debit", "Credit", "Description1", "Description2"],
  ["Abschlussdatum", "Valutadatum", "Belastung", "Gutschrift", "Beschreibung1", "Beschreibung2"],
  ["Date de transaction", "Date de valeur", "Débit", "Crédit", "Description1", "Description2"],
  [
    "Data dell'operazione",
    "Data di valuta",
    "Addebito",
    "Accredito",
    "Descrizione1",
    "Descrizione2",
  ],
] as const;

const info = {
  name: "UBS",
  countries: ["CH"],
  howToExport: [
    "Log in to UBS e-banking on the web.",
    "Open your account's transactions and pick the period.",
    "Download them as CSV, not PDF.",
  ],
};

const languages = LANGUAGES.map(([trade, value, debit, credit, description1, description2]) =>
  csv({
    ...info,
    delimiter: ";",
    columns: [trade, value, debit, credit, description1, description2],
    convert: (rows) =>
      rows
        .filter((row) => row[trade] || row[value]) // detail lines of a collective order have no dates
        .map((row) => {
          const type = row[description2];
          return {
            date: parseDate(row[trade] || row[value]),
            payee: row[description1].split(",")[0] ?? "", // name or merchant, then its address
            memo: type.slice(type.lastIndexOf(", ") + 1).trim(), // drops the card number
            amount: parseAmount(row[credit]) + parseAmount(row[debit]), // debits are negative
          };
        }),
  }),
);

export default {
  ...info,
  detect: (text) => Math.max(...languages.map((language) => language.detect(text))),
  convert(text) {
    const language = languages.find((l) => l.detect(text));
    if (!language) throw new Error("Not a UBS export (no e-banking transaction list header)");
    return language.convert(text);
  },
} satisfies Connector;
