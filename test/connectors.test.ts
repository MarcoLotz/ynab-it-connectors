// Checks every connector must pass. Bank-specific behaviour is tested in test/<id>.test.ts.

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { type ConnectorId, connectors, convert, detect } from "../src/index.ts";
import { sample, ynabRows } from "./helpers.ts";

const ids = Object.keys(connectors) as ConnectorId[];
const root = new URL("../", import.meta.url);

test("every file in src/connectors is registered in src/index.ts under its name", () => {
  const files = readdirSync(new URL("src/connectors/", root)).map((f) => f.replace(/\.ts$/, ""));
  assert.deepEqual(ids.toSorted(), files.toSorted());
});

for (const id of ids) {
  test(`${id} is complete`, () => {
    const { name, countries, howToExport } = connectors[id];
    assert.ok(name.trim(), "name is empty");
    for (const code of countries) assert.match(code, /^[A-Z]{2}$/, "use ISO 3166-1 alpha-2 codes");
    assert.ok(howToExport.length >= 2 && howToExport.length <= 5, "howToExport: 2 to 5 steps");
    for (const step of howToExport) assert.ok(step.trim(), "howToExport has an empty step");
    assert.ok(existsSync(new URL(`test/${id}.test.ts`, root)), `add a test: test/${id}.test.ts`);
    const readme = readFileSync(new URL("README.md", root), "utf8");
    assert.ok(readme.includes(name), `add ${name} to the list in README.md`);
  });

  test(`${id} output is valid for YNAB`, () => {
    const rows = ynabRows(id);
    assert.ok(rows.length, "the sample should contain at least one transaction");
    for (const [date, payee, memo, amount, ...rest] of rows) {
      assert.match(date ?? "", /^\d{4}-\d{2}-\d{2}$/);
      assert.match(amount ?? "", /^-?\d+\.\d{2,3}$/);
      assert.equal(payee, payee?.trim());
      assert.equal(memo, memo?.trim());
      assert.deepEqual(rest, []);
    }
  });
}

test("an unknown file is not recognised", () => {
  assert.equal(detect("foo,bar\n1,2\n"), undefined);
  assert.equal(detect(""), undefined);
});

test("converting with the wrong connector explains itself", () => {
  assert.throws(() => convert(sample("neon"), "zkb"), /Not a ZKB export/);
});
