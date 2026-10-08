/** ynabit connectors: turn bank and credit card exports into YNAB import files. */

import camt from "./connectors/camt.ts";
import mt940 from "./connectors/mt940.ts";
import neon from "./connectors/neon.ts";
import postfinance from "./connectors/postfinance.ts";
import revolut from "./connectors/revolut.ts";
import swisscard from "./connectors/swisscard.ts";
import viseca from "./connectors/viseca.ts";
import wise from "./connectors/wise.ts";
import zkb from "./connectors/zkb.ts";
import type { Connector, Transaction } from "./core.ts";

export * from "./core.ts";

/** Every connector, keyed by its id: the name of its file in src/connectors. */
export const connectors = {
  camt,
  mt940,
  neon,
  postfinance,
  revolut,
  swisscard,
  viseca,
  wise,
  zkb,
} as const satisfies Record<string, Connector>;

export type ConnectorId = keyof typeof connectors;

/** The id of the connector that best matches the file, or undefined if none does. */
export function detect(text: string): ConnectorId | undefined {
  let best: ConnectorId | undefined;
  let bestScore = 0;
  for (const [id, connector] of Object.entries(connectors) as [ConnectorId, Connector][]) {
    const score = connector.detect(text);
    if (score > bestScore) [best, bestScore] = [id, score];
  }
  return best;
}

/** Converts a file with the given connector and checks that YNAB will accept the result. */
export function convert(text: string, id: ConnectorId): Transaction[] {
  const transactions = connectors[id].convert(text);
  for (const t of transactions) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date) || !Number.isSafeInteger(t.amount)) {
      throw new Error(`Bug in the ${connectors[id].name} connector: invalid date or amount`);
    }
  }
  return transactions;
}
