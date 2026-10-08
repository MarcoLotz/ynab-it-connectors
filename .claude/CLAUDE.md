# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Open-source (Apache 2.0) TypeScript connectors that convert bank and credit card exports into YNAB import CSVs. ynabit.com (closed source) runs them in the visitor's browser: it installs this repo from GitHub at a release tag and compiles the TypeScript source itself. There is no build step and nothing is published to npm.

## Layout

- `src/core.ts`: types (`Transaction`, `Connector`, `Row`), `csv()` (builds a connector for a CSV export from its columns), `parseDate`, `parseAmount`, `parseCsv`, `formatAmount`, `toYnabCsv`, `outputName` and `decode`.
- `src/index.ts`: the registry (`connectors`, keyed by id = file name), `detect` (highest score wins) and `convert` (checks the output is valid for YNAB).
- `src/connectors/<id>.ts`: one connector per bank, card or format. Most use `csv()`; `camt.ts` (XML) and `mt940.ts` implement `Connector` directly.
- `test/data/<id>.*` and `test/data/<id>-<variant>.*`: realistic, anonymised sample exports with the real files' bytes (encoding, BOM, CRLF).
- `test/<id>.test.ts`: one test per sample listing exactly the rows YNAB will import (`ynabRows` from `test/helpers.ts`), with a comment per row and per skipped entry.
- `test/connectors.test.ts`: checks every connector is registered, complete (sample, test, README entry) and produces valid YNAB rows. `test/core.test.ts` covers the helpers.
- `.github/workflows/`: `ci.yml` runs `npm run check` on Node 22 and 24; `release.yml` creates a GitHub release for a `v*` tag.

## Commands

```
npm ci
npm run check                   # biome check + typecheck + tests
npm run fix                     # biome check --write
npm run typecheck               # tsc -p . && tsc -p test
npm test                        # node --test "test/*.test.ts"
node --test test/zkb.test.ts    # one test file
```

## Conventions

- Amounts are integer milliunits (12.34 is 12340), never floats; negative = money out. Dates are `YYYY-MM-DD` from `parseDate`.
- Connectors are pure functions from a file's text to transactions: no network, DOM, Node APIs, storage or dynamic code. `tsconfig.json` limits `src/` to `lib: es2022` with no types, and Biome bans `globalThis`, `eval` and `Function` there.
- Bank-specific logic stays in its connector; shared parsing goes in `src/core.ts`. No runtime dependencies.
- Node >= 22.18 runs the TypeScript tests natively; imports use `.ts` extensions.
- Samples use fake personal data (Jane Muster, Example AG, CH00 0000 0000 0000 0000 0, XXXX XXXX XXXX 1234). Never let a tool rewrite their line endings or encoding.
- A new connector also needs its sample, its test, an entry in `src/index.ts` and its name in `README.md` (see `CONTRIBUTING.md`).
- Comments only where they explain why.

## Working Style

- Keep code direct and skip boilerplate. Add no abstractions or defensive error handling beyond what's needed.
- Optimise for low maintenance: few files, no new dependencies without a strong reason.
