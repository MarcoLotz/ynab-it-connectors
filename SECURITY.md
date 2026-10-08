# Security

## Supported versions

Only the latest release gets fixes.

## Reporting a vulnerability

Please don't open a public issue. Report it privately on GitHub instead: [Security › Report a vulnerability](https://github.com/MarcoLotz/ynabit-connectors/security/advisories/new). You'll usually get a reply within a week.

In scope:

- A connector that sends data anywhere, reads anything besides the text it's given, or runs code.
- A file crafted to make a parser hang or exhaust memory.

For problems with ynabit.com itself, write to contact@marcolotz.com.

## Security model

Connectors are pure functions from a file's text to transactions, and the package has no runtime dependencies. `src/` is type-checked against the ECMAScript library alone (no DOM or Node APIs) and Biome rejects `globalThis`, `eval` and `Function` there. These are guard rails, not a sandbox, so a maintainer reviews every change before it's merged. On ynabit.com, connectors run in the visitor's browser and files are never uploaded.
