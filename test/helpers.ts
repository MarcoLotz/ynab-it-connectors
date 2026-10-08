import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { type ConnectorId, convert, decode, detect, parseCsv, toYnabCsv } from "../src/index.ts";

const DATA = new URL("./data/", import.meta.url);

/** test/data/<name>.<any extension>, decoded the way the website reads files. */
export function sample(name: string): string {
  const file = readdirSync(DATA).find((f) => f.replace(/\.[^.]*$/, "") === name);
  assert.ok(file, `add an anonymised sample export: test/data/${name}.csv (or .xml, .sta, …)`);
  return decode(readFileSync(new URL(file, DATA)));
}

/**
 * Converts test/data/<name>.* the way the website does and returns the rows YNAB will import.
 * Also checks the sample is recognised as its connector (the part of <name> before any "-").
 */
export function ynabRows(name: string): string[][] {
  const id = name.split("-")[0] as ConnectorId;
  const text = sample(name);
  assert.equal(detect(text), id, `test/data/${name} is not recognised as ${id}`);
  const [header, ...rows] = parseCsv(toYnabCsv(convert(text, id)));
  assert.deepEqual(header, ["Date", "Payee", "Memo", "Amount"]);
  return rows;
}
