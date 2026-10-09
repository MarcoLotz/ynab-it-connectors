# Contributing

Thanks for helping! Most contributions are new connectors, one per bank, card or file format. Bugs and ideas go in [issues](https://github.com/MarcoLotz/ynabit-connectors/issues). By taking part you agree to the [code of conduct](CODE_OF_CONDUCT.md), and by contributing you agree to the [license of contributions](#license-of-contributions).

## Adding a connector

A connector is one file in [`src/connectors/`](src/connectors), with a sample export and a test next to it. Its id is the file name: lowercase letters and digits, such as `mybank`. CI fails until all three files exist.

| File | What it is |
| --- | --- |
| `src/connectors/mybank.ts` | The connector, including the export steps shown on the website |
| `test/data/mybank.csv` | A sample export that looks exactly like the real one, with fake data |
| `test/mybank.test.ts` | One test: the rows YNAB should receive from the sample |

### 1. The connector

Most exports are CSV files, and `csv()` from [`src/core.ts`](src/core.ts) does the work:

```ts
/** My Bank: e-banking account transactions CSV export. */

import { csv, parseAmount, parseDate } from "../core.ts";

export default csv({
  name: "My Bank", // shown on the website
  countries: ["CH"], // ISO 3166-1 alpha-2 codes; [] for international banks and formats
  delimiter: ";", // optional, defaults to ","
  // The header columns you read. A file is recognised by a line that contains all of them.
  columns: ["Booking date", "Text", "Debit", "Credit", "Status"],
  // 2 to 5 short steps to download this exact file, for people who don't code.
  howToExport: [
    "Log in to My Bank e-banking on the web and set the language to English.",
    "Open Accounts › your account › Transactions.",
    "Pick the period, then click Export › CSV.",
  ],
  convert: (rows) =>
    rows
      .filter((row) => row.Status === "Booked") // pending rows come back once booked
      .map((row) => ({
        date: parseDate(row["Booking date"]), // 30.09.2026 or 2026-09-30; else pass the format
        payee: row.Text,
        memo: row.Purpose ?? "", // not in `columns`, so it may be missing
        amount: parseAmount(row.Credit) - parseAmount(row.Debit), // milliunits, negative = out
      })),
});
```

- `convert` gets every non-blank line below the header, keyed by column name. Lines above the header, such as account details, are skipped for you; footers are not, so filter them out.
- Amounts are integer milliunits, never floats: `parseAmount("1'234.50")` is `1234500`. It also reads decimal commas (`1.234,50`), the `−` sign and empty cells (0).
- `parseDate` reads ISO and day-first dates. Pass the format for anything else: `parseDate(text, "MM/DD/YYYY")`.
- When several connectors match a file, the one with the most columns wins, so list enough columns to tell your export apart from the others.
- Files that aren't CSV implement the `Connector` interface from `src/core.ts` directly, with their own `detect` and `convert`. See [`camt.ts`](src/connectors/camt.ts) (XML) and [`mt940.ts`](src/connectors/mt940.ts).

Then register it in [`src/index.ts`](src/index.ts) with one import and one entry in `connectors`, both in alphabetical order:

```ts
import mybank from "./connectors/mybank.ts";
```

### 2. The sample export

Start from a real export and keep its structure exactly: header, column order, delimiter, quoting, encoding, BOM, line endings, and any lines above or below the transactions. Edit it in a text editor, not a spreadsheet app. Then:

- Keep 5 to 9 rows that cover every case your connector handles: money in and out, every row it skips (pending, cancelled, footers, …) and odd number formats such as `1'234.50`.
- Replace every personal detail with fake data, such as `Jane Muster`, `Example AG`, `CH00 0000 0000 0000 0000 0`, `DE00 0000 0000 0000 0000 00` or `XXXX XXXX XXXX 1234`. Shop names like Migros, Coop, SBB or REWE are fine.

Save it as `test/data/mybank.csv` (or `.xml`, `.sta`, …). Another variant of the same export, such as an older version, goes in `test/data/mybank-<variant>.csv` with a test of its own.

### 3. The test

One test lists exactly what YNAB will import from the sample. Describe the file format at the top, then add a comment for each row saying what it checks, and one for each skipped row saying why. [`test/zkb.test.ts`](test/zkb.test.ts) is a good example.

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { ynabRows } from "./helpers.ts";

test("mybank", () => {
  // e-banking transactions CSV: semicolon-separated, UTF-8, two lines of account details above
  // the header. "Debit" and "Credit" are unsigned; the amount is credit - debit. The memo is
  // "Purpose", which card purchases leave empty.
  assert.deepEqual(ynabRows("mybank"), [
    // Card purchase: a debit, negative.
    ["2026-09-30", "Migros", "", "-12.50"],
    // Pending card purchase (29.09): skipped, it comes back once booked.
    // Salary: a credit, positive; "4'500.00" has a thousands separator.
    ["2026-09-25", "Example AG", "Salary September", "4500.00"],
  ]);
});
```

`ynabRows` converts the sample the way the website does, and checks it is recognised as your connector and not another. [`test/connectors.test.ts`](test/connectors.test.ts) checks the rest for every connector: registration, the export steps, a README entry and output that YNAB accepts.

### 4. Check and open a pull request

Add the connector's name to the table in `README.md`, then run the checks and open a pull request:

```sh
npm ci
npm run check
```

Can't code? [Request a connector](https://github.com/MarcoLotz/ynabit-connectors/issues/new?template=connector_request.yml) with the header line and two or three rows, personal details replaced.

## Rules for connectors

Connectors run in the browser of someone converting their bank statements, so:

- **Pure functions only.** A connector gets a file's text and returns transactions: no network, DOM, Node APIs, storage, or code created at runtime. `tsconfig.json` checks `src/` against the ECMAScript library alone and Biome rejects `globalThis`, `eval` and `Function` there. Reviewers reject anything that gets around either.
- **Linear time.** A crafted file must not make a parser hang, so avoid regular expressions that can backtrack catastrophically.
- **No runtime dependencies.** Shared parsing goes in `src/core.ts`; bank-specific logic stays in its connector.

## License of contributions

The connectors are licensed under [AGPL-3.0](LICENSE). By opening a pull request you agree that:

- your contribution is licensed under AGPL-3.0, like the rest of the project, and
- Marco Barbosa Gomes Lotz (Neucom Software Design) may also use, modify, sublicense and distribute it under other terms, for example in ynabit.com, whose own code is closed source. This permission is perpetual, worldwide, non-exclusive, royalty-free and irrevocable.

You keep the copyright to your work. Only submit code and sample exports that you made yourself or have the right to share.

## Development

You need Node.js 24 or newer, which runs the TypeScript tests natively. There is no build step.

```sh
npm ci
npm run check    # Biome lint and format check, type check, tests
npm run fix      # applies Biome's formatting and safe fixes
npm run typecheck
npm test
node --test test/zkb.test.ts    # one test file
```

## Reviewing a connector (maintainers)

CI checks that the files exist and are registered, that every sample is recognised as its own connector, and that the output is valid for YNAB. What's left for you:

- [ ] The sample looks like a real export (structure untouched) and has no personal data.
- [ ] Every skip, sign flip and fallback in `convert` has a sample row and a test comment.
- [ ] The signs are right: purchases and fees negative, income and refunds positive.
- [ ] `howToExport` leads to the exact export the connector reads.
- [ ] No I/O or dynamic code, and no `declare` that reaches past the ECMAScript library.
- [ ] No new dependencies.

## Releasing (maintainers)

Versions follow semver: a new connector is a minor release, a fix a patch.

1. Bump the version in a pull request: `npm version minor --no-git-tag-version` updates `package.json` and `package-lock.json`.
2. Once it's merged, tag `main`:

   ```sh
   git switch main && git pull
   git tag v0.2.0 && git push origin v0.2.0
   ```

The [release workflow](.github/workflows/release.yml) runs the checks, makes sure the tag matches `package.json` and creates the GitHub release. ynabit.com uses it once its dependency is bumped to the new tag.
