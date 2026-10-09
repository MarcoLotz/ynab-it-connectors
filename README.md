# ynabit connectors

[![CI](https://github.com/MarcoLotz/ynabit-connectors/actions/workflows/ci.yml/badge.svg)](https://github.com/MarcoLotz/ynabit-connectors/actions/workflows/ci.yml)

Connectors turn bank and credit card exports into files you can import into [YNAB](https://www.ynab.com). They power [ynabit.com](https://www.ynabit.com), a free converter that runs entirely in your browser. Each connector is a pure function from a file's text to transactions: it has no access to the network, storage or the page, so your statements never leave your device.

## Supported banks and formats

| Name | Country | File |
| --- | --- | --- |
| Neon | Switzerland | CSV account statement |
| PostFinance | Switzerland | CSV of an account's transactions (e-finance) |
| Revolut | International | CSV account statement |
| Swisscard | Switzerland | CSV of credit card transactions |
| Viseca | Switzerland | CSV of credit card transactions |
| Wise | International | CSV transaction history |
| ZKB | Switzerland | CSV bank statement with details |
| camt.053 / camt.054 | International (ISO 20022 standard) | XML statement or notification; camt.052 works too |
| MT940 | International (SWIFT standard) | Statement ending in `.sta`, `.mt940` or `.txt` |

Bank missing? Many banks, in Europe especially, export camt.053 or MT940, which already work.

## Use it in your project

The package isn't on npm: install a release tag from GitHub.

```sh
npm install github:MarcoLotz/ynabit-connectors#v0.1.0
```

It ships TypeScript source, so your bundler compiles it. With Next.js, add `transpilePackages: ["ynabit-connectors"]` to `next.config`; Vite, esbuild and Bun need nothing. The imports end in `.ts`, so a TypeScript project needs `"allowImportingTsExtensions": true` (with `"noEmit": true`).

```ts
import { convert, decode, detect, outputName, toYnabCsv } from "ynabit-connectors";

/** Converts a bank export into the file to import into YNAB. */
async function toYnab(file: File): Promise<File> {
  const text = decode(new Uint8Array(await file.arrayBuffer()));
  const id = detect(text); // the best-matching connector, or undefined
  if (!id) throw new Error(`${file.name} is not an export we know`);
  const csv = toYnabCsv(convert(text, id)); // convert throws errors meant for the user
  return new File([csv], outputName(file.name), { type: "text/csv" });
}
```

`connectors[id]` has the `name`, `countries` and `howToExport` steps to show your users. Amounts are integer milliunits, like in the YNAB API: 12.34 is 12340. The package also exports the building blocks connectors use (`csv`, `parseDate`, `parseAmount`, `parseCsv`, `formatAmount`) and the types `Connector`, `Transaction`, `Row` and `ConnectorId`.

## Add your bank

A connector is a single small TypeScript file, plus an anonymised sample export and a test. [CONTRIBUTING.md](CONTRIBUTING.md) walks you through it. Can't code? [Request a connector](https://github.com/MarcoLotz/ynabit-connectors/issues/new?template=connector_request.yml) with a few anonymised lines of your export.

## Sponsor

ynabit is free. If it saves you time, [sponsor its development](https://github.com/sponsors/MarcoLotz).

## License

[AGPL-3.0](LICENSE). Copyright 2026 Marco Barbosa Gomes Lotz (Neucom Software Design).

I chose AGPL-3.0 because I want you to be able to run these connectors locally on your own machine, without using the website, if you wish to, but I don't want companies making use of the source code for profit. I also didn't want a license that scares people away from contributing, so I picked a standard open source license that contributors already know. AGPL-3.0 doesn't forbid commercial use, but anyone who distributes a modified version, or runs one as a service for others, must publish its complete source code under the same license, so nobody else can turn this code into a closed product.

Not affiliated with or endorsed by YNAB (You Need A Budget LLC).
