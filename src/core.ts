/** Building blocks for connectors: types, parsing helpers and the YNAB file writer. */

/** One transaction in the YNAB import file. */
export interface Transaction {
  /** YYYY-MM-DD. Use `parseDate`. */
  date: string;
  payee: string;
  memo: string;
  /** Milliunits, like the YNAB API: 12.34 is 12340. Negative = money out. Use `parseAmount`. */
  amount: number;
}

/** Turns one kind of export file into transactions. Most connectors are built with `csv()`. */
export interface Connector {
  /** Shown on the website, e.g. "Revolut". */
  name: string;
  /** ISO 3166-1 alpha-2 codes of the countries served; empty for international banks and formats. */
  countries: readonly string[];
  /** 2 to 5 short steps to download the file this connector reads, for people who don't code. */
  howToExport: readonly string[];
  /** How well the file matches: 0 means it isn't this connector's. The highest score wins. */
  detect(text: string): number;
  /** The file's transactions. Throws an Error with a message for the user if it can't. */
  convert(text: string): Transaction[];
}

/** A CSV row keyed by header name. Declared columns are always there; others may be missing. */
export type Row<C extends string = string> = Readonly<Record<C, string>> &
  Readonly<Partial<Record<string, string>>>;

export interface CsvConnector<C extends string> {
  name: string;
  countries: readonly string[];
  howToExport: readonly string[];
  /** Header columns you read. A file is recognised by a line that contains all of them. */
  columns: readonly C[];
  /** Defaults to ",". */
  delimiter?: string;
  /** Gets every non-blank line below the header line, keyed by column name. */
  convert(rows: Row<C>[]): Transaction[];
}

/** A connector for a CSV export. Lines above the header, such as account details, are skipped. */
export function csv<const C extends string>(spec: CsvConnector<C>): Connector {
  const { columns, delimiter = ",", convert, ...info } = spec;
  const findHeader = (lines: string[][]) =>
    lines.findIndex((cells) => {
      const names = new Set(cells.map((cell) => cell.trim()));
      return columns.every((column) => names.has(column));
    });
  return {
    ...info,
    detect: (text) =>
      // The header and any account details above it fit in the first 64 KB.
      findHeader(parseCsv(text.slice(0, 65_536), delimiter)) < 0 ? 0 : columns.length,
    convert(text) {
      const lines = parseCsv(text, delimiter);
      const start = findHeader(lines);
      const header = lines[start]?.map((cell) => cell.trim());
      if (!header) {
        const expected = [...columns].sort().join(", ");
        throw new Error(`Not a ${info.name} export (expected columns: ${expected})`);
      }
      const rows = lines
        .slice(start + 1)
        .filter((cells) => cells.some((cell) => cell !== ""))
        .map((cells) => Object.fromEntries(header.map((name, i) => [name, cells[i] ?? ""])));
      return convert(rows as Row<C>[]);
    },
  };
}

/**
 * Splits CSV text into lines of cells. Follows RFC 4180, but leniently: a quote inside an
 * unquoted cell, or text after a closing quote, is kept as is.
 */
export function parseCsv(text: string, delimiter = ","): string[][] {
  const lines: string[][] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let cellStart = true;
  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);
    if (quoted) {
      if (char !== '"') cell += char;
      else if (text.charAt(i + 1) === '"') cell += text.charAt(++i);
      else quoted = false;
    } else if (char === '"' && cellStart) {
      quoted = true;
      cellStart = false;
    } else if (char === delimiter) {
      cells.push(cell);
      cell = "";
      cellStart = true;
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text.charAt(i + 1) === "\n") i++;
      cells.push(cell);
      lines.push(cells);
      cells = [];
      cell = "";
      cellStart = true;
    } else {
      cell += char;
      cellStart = false;
    }
  }
  if (cell || cells.length) lines.push([...cells, cell]);
  return lines;
}

const DATE_FORMATS = ["YYYY-MM-DD", "DD.MM.YYYY", "DD.MM.YY", "DD/MM/YYYY"];
const DATE_PARTS: Record<string, string> = {
  YYYY: "(?<year>\\d{4})",
  YY: "(?<year>\\d{2})",
  MM: "(?<month>\\d{1,2})",
  DD: "(?<day>\\d{1,2})",
};

/**
 * Parses a date into YYYY-MM-DD. By default it reads ISO dates (2026-09-30, optionally with a
 * time) and day-first dates (30.09.2026, 30.09.26, 30/09/2026). For anything else pass the
 * format, such as "MM/DD/YYYY" or "YYMMDD".
 */
export function parseDate(text: string, format?: string): string {
  for (const f of format ? [format] : DATE_FORMATS) {
    const pattern = f.replace(
      /YYYY|YY|MM|DD|./g,
      (part) => DATE_PARTS[part] ?? part.replace(/\W/, "\\$&"),
    );
    const parts = new RegExp(`^${pattern}(?:[ T].*)?$`).exec(text.trim())?.groups;
    if (!parts?.year || !parts.month || !parts.day) continue;
    const year = Number(parts.year.length === 2 ? `20${parts.year}` : parts.year);
    const month = Number(parts.month);
    const day = Number(parts.day);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  throw new Error(`Unrecognised date: "${text}"`);
}

/**
 * Parses an amount into milliunits: "-1'234.50" is -1234500. Understands thousands separators
 * (' ’ space . ,), a decimal comma and the − sign. Empty means 0.
 */
export function parseAmount(text: string): number {
  let s = text
    .trim()
    .replaceAll("−", "-")
    .replace(/['’\s]/g, "");
  if (!s) return 0;
  const decimalComma = s.lastIndexOf(",") > s.lastIndexOf(".");
  s = decimalComma ? s.replaceAll(".", "").replace(",", ".") : s.replaceAll(",", "");
  const [, sign, units = "", fraction = ""] = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(s) ?? [];
  if (!(units || fraction)) throw new Error(`Unrecognised amount: "${text}"`);
  const digits = fraction.padEnd(4, "0");
  const roundUp = digits.charAt(3) >= "5" ? 1 : 0;
  const milliunits = Number(units || 0) * 1000 + Number(digits.slice(0, 3)) + roundUp;
  if (!Number.isSafeInteger(milliunits)) throw new Error(`Amount too large: "${text}"`);
  return sign === "-" ? -milliunits || 0 : milliunits;
}

/** Milliunits as YNAB expects them: 2 decimals, or 3 if the third isn't 0. */
export function formatAmount(milliunits: number): string {
  const abs = Math.abs(milliunits);
  const fraction = String(abs % 1000).padStart(3, "0");
  const sign = milliunits < 0 ? "-" : "";
  return `${sign}${Math.floor(abs / 1000)}.${fraction.endsWith("0") ? fraction.slice(0, 2) : fraction}`;
}

/** The YNAB import file: a CSV with the columns Date, Payee, Memo and Amount. */
export function toYnabCsv(transactions: readonly Transaction[]): string {
  const clean = (text: string) => text.replace(/\s+/g, " ").trim();
  const quote = (cell: string) =>
    /[",\r\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;
  const lines = [
    ["Date", "Payee", "Memo", "Amount"],
    ...transactions.map((t) => [t.date, clean(t.payee), clean(t.memo), formatAmount(t.amount)]),
  ];
  return lines.map((cells) => `${cells.map(quote).join(",")}\r\n`).join("");
}

/** The name of the YNAB file for an export: statement.csv becomes statement_ynab.csv. */
export function outputName(fileName: string): string {
  return `${fileName.replace(/\.[^.]*$/, "")}_ynab.csv`;
}

// Part of every browser and of Node, but not of the ECMAScript library connectors are checked with.
declare const TextDecoder: new (
  label?: string,
  options?: { fatal?: boolean },
) => { decode(bytes: Uint8Array): string };

/** Reads a file's bytes as UTF-8 (BOM optional) or UTF-16 (with BOM), else as Windows-1252. */
export function decode(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes); // older Windows-style exports
  }
}
