import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decode,
  formatAmount,
  outputName,
  parseAmount,
  parseCsv,
  parseDate,
  toYnabCsv,
} from "../src/index.ts";

test("parseAmount", () => {
  const cases: [string, number][] = [
    ["-1'234.50", -1234500],
    ["1 234,50", 1234500],
    ["1.234,5", 1234500],
    ["1,234.56", 1234560],
    ["1 234,50", 1234500], // no-break space
    ["−7.10", -7100], // minus sign
    ["+12", 12000],
    ["12.500", 12500],
    ["0.125", 125],
    ["0.1235", 124], // rounded to milliunits
    [".5", 500],
    ["-0", 0],
    ["", 0],
    ["  ", 0],
  ];
  for (const [text, expected] of cases) assert.equal(parseAmount(text), expected, text);
  for (const text of ["abc", "-", "12,34,56", "1.2.3", "CHF 12"]) {
    assert.throws(() => parseAmount(text), /Unrecognised amount/, text);
  }
});

test("formatAmount", () => {
  assert.equal(formatAmount(-1234500), "-1234.50");
  assert.equal(formatAmount(5), "0.005");
  assert.equal(formatAmount(12340), "12.34");
  assert.equal(formatAmount(-12345), "-12.345");
  assert.equal(formatAmount(0), "0.00");
  assert.equal(formatAmount(-0), "0.00");
});

test("parseDate", () => {
  for (const text of [
    "30.09.2026",
    "2026-09-30",
    "2026-09-30 23:59:59",
    "2026-09-30 6:11:59",
    "2026-09-30T06:11:59+02:00",
    " 30.09.26 ",
    "30/09/2026",
  ]) {
    assert.equal(parseDate(text), "2026-09-30", text);
  }
  assert.equal(parseDate("1.9.2026"), "2026-09-01");
  assert.equal(parseDate("09/30/2026", "MM/DD/YYYY"), "2026-09-30");
  assert.equal(parseDate("260930", "YYMMDD"), "2026-09-30");
  assert.equal(parseDate("20260930", "YYYYMMDD"), "2026-09-30");
  for (const text of ["31.09.2026", "2026-13-01", "09/30/2026", "", "yesterday"]) {
    assert.throws(() => parseDate(text), /Unrecognised date/, text);
  }
});

test("parseCsv", () => {
  assert.deepEqual(parseCsv('a,"b, c","say ""hi"""\r\n1,,3\n'), [
    ["a", "b, c", 'say "hi"'],
    ["1", "", "3"],
  ]);
  assert.deepEqual(parseCsv('"multi\nline";x', ";"), [["multi\nline", "x"]]);
  assert.deepEqual(parseCsv('Date from:;="01.09.2026"\n\nend;', ";"), [
    ["Date from:", '="01.09.2026"'],
    [""],
    ["end", ""],
  ]);
  assert.deepEqual(parseCsv(""), []);
});

test("toYnabCsv", () => {
  const csv = toYnabCsv([
    { date: "2026-09-30", payee: "  Migros \n Zürich ", memo: 'Say "hi", ok', amount: -12500 },
    { date: "2026-09-29", payee: "Refund", memo: "", amount: -0 },
  ]);
  assert.equal(
    csv,
    'Date,Payee,Memo,Amount\r\n2026-09-30,Migros Zürich,"Say ""hi"", ok",-12.50\r\n' +
      "2026-09-29,Refund,,0.00\r\n",
  );
});

test("decode", () => {
  const utf8 = new TextEncoder().encode("Zürich");
  assert.equal(decode(utf8), "Zürich");
  assert.equal(decode(new Uint8Array([0xef, 0xbb, 0xbf, ...utf8])), "Zürich"); // BOM dropped
  assert.equal(decode(new Uint8Array([0x5a, 0xfc, 0x72, 0xe9])), "Züré"); // Windows-1252
  assert.equal(decode(new Uint8Array([0x80, 0x96])), "€–"); // Windows-1252, not Latin-1
  assert.equal(decode(new Uint8Array([0xff, 0xfe, 0x5a, 0x00, 0xfc, 0x00])), "Zü"); // UTF-16
});

test("outputName", () => {
  assert.equal(outputName("statement.csv"), "statement_ynab.csv");
  assert.equal(outputName("camt.053_2026.xml"), "camt.053_2026_ynab.csv");
  assert.equal(outputName("export"), "export_ynab.csv");
});
