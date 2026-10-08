import assert from "node:assert/strict";
import { test } from "node:test";
import { ynabRows } from "./helpers.ts";

test("postfinance", () => {
  // e-finance account export, English UI: semicolon-separated, UTF-8 with BOM, CRLF, no newline
  // after the last line. Five `Label:;="value"` preamble lines and a blank line sit above the
  // header, a blank line below it; rows are newest first; then a blank line, "Disclaimer:" and
  // its text. In the rows only the notification text is quoted. Credits are positive, debits
  // already negative, with no thousands separator or trailing zeros (4500, -12.5). "Type of
  // transaction", "Tag" and "Category" are ignored.
  // Not in the output: the preamble (above the header), the blank lines and both disclaimer
  // lines (no amount in either column).
  assert.deepEqual(ynabRows("postfinance"), [
    // Monthly fee: a debit, already negative. Payee is the whole notification text, no memo.
    ["2026-09-30", "PREIS FÜR BANKPAKET SMART 08.2026", "", "-5.00"],
    // Card purchase: dated by the booking date (29.09), not the purchase date in the text
    // (27.09); the double space in the text is collapsed.
    [
      "2026-09-29",
      "KAUF/DIENSTLEISTUNG VOM 27.09.2026 KARTEN NR. XXXX1234 MIGROS ZÜRICH SCHWEIZ",
      "",
      "-63.95",
    ],
    // TWINT purchase: "-12.5" gets two decimals.
    [
      "2026-09-28",
      "TWINT KAUF/DIENSTLEISTUNG VOM 28.09.2026 COOP PRONTO ZÜRICH (CH)",
      "",
      "-12.50",
    ],
    // Salary: a credit, positive; "4500" has no thousands separator and no decimals.
    [
      "2026-09-25",
      "GUTSCHRIFT AUFTRAGGEBER: EXAMPLE AG MUSTERSTRASSE 1 8000 ZÜRICH " +
        "MITTEILUNGEN: LOHN SEPTEMBER 2026 REFERENZEN: 260925CH0EXMPL01",
      "",
      "4500.00",
    ],
    // Card refund: a credit, positive (its empty Category does not matter).
    [
      "2026-09-21",
      "GUTSCHRIFT POSTFINANCE CARD VOM 19.09.2026 KARTEN NR. XXXX1234 DIGITEC GALAXUS AG " +
        "ZÜRICH (CH)",
      "",
      "59.90",
    ],
    // TWINT money received: a credit.
    [
      "2026-09-15",
      "TWINT GELD EMPFANGEN VOM 15.09.2026 VON TELEFON-NR. +41790000000 JANE MUSTER " +
        "MITTEILUNGEN: PIZZA",
      "",
      "20.00",
    ],
    // CH-DD direct debit and standing order: debits, "-1850" without a thousands separator.
    [
      "2026-09-02",
      "AUFTRAG CH-DD-BASISLASTSCHRIFT ZAHLUNGSEMPFÄNGER: EXAMPLE VERSICHERUNG AG " +
        "MITTEILUNGEN: PRÄMIE 09.2026",
      "",
      "-312.45",
    ],
    [
      "2026-09-01",
      "LASTSCHRIFT DAUERAUFTRAG: CH0000000000000000000 IMMO EXAMPLE AG " +
        "SENDER REFERENZ: MIETE 09.2026",
      "",
      "-1850.00",
    ],
  ]);
});
