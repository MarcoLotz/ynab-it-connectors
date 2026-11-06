import assert from "node:assert/strict";
import { test } from "node:test";
import { ynabRows } from "./helpers.ts";

test("raiffeisen", () => {
  // e-banking transactions CSV with "Details" (exports since July 2024): semicolon-separated,
  // UTF-8 without BOM, LF, nothing quoted, English header on line 1 whatever the UI language,
  // no footer. Oldest first; "Booked At" is YYYY-MM-DD 00:00:00.0. "Credit/Debit Amount" is
  // signed with no thousands separator and drops trailing zeros (-40.7, 5200). Payee is the
  // whole "Text", memo is "Details". "IBAN", "Balance" and "Valuta Date" are ignored.
  assert.deepEqual(ynabRows("raiffeisen"), [
    // Standing order: a debit, negative; the message is in "Details".
    [
      "2026-09-01",
      "Dauerauftrag Immo Example AG",
      "Musterstrasse 1 8000 Zürich CH Mitteilungen: Miete September 2026 CHF 1850.00 -",
      "-1850.00",
    ],
    // Card purchase: dated by "Booked At" (03.09), not "Valuta Date" (02.09); no "Details".
    [
      "2026-09-03",
      "Einkauf Coop Zürich HB 02.09.2026, 18:46, Karten-Nr. 123456xxxxxx1234",
      "",
      "-23.45",
    ],
    // Salary: a credit, positive.
    [
      "2026-09-10",
      "Gutschrift Example AG, Bahnhofstrasse 10, 8001 Zürich",
      "Mitteilungen: Lohn September 2026 CHF 5200.00 -",
      "5200.00",
    ],
    // Cash withdrawal.
    [
      "2026-09-18",
      "Bargeldbezug Raiffeisen Zürich 18.09.2026, 10:12, Karten-Nr. 123456xxxxxx1234",
      "",
      "-200.00",
    ],
    // "-40.7": one decimal.
    [
      "2026-09-22",
      "Einkauf Migros Oerlikon 21.09.2026, 17:31, Karten-Nr. 123456xxxxxx1234",
      "",
      "-40.70",
    ],
    // Fee.
    ["2026-09-30", "Kontoführungsgebühr", "", "-2.00"],
  ]);
});

test("raiffeisen without details", () => {
  // The same export without "Details", as written before July 2024 and still seen in 2025:
  // ASCII, LF. A text too long for one line goes on to a line with only "Text" filled.
  assert.deepEqual(ynabRows("raiffeisen-nodetails"), [
    // Money received: no "Details" column, so the memo is empty.
    ["2026-09-25", "Gutschrift Jane Muster, Musterweg 2, 8000 Zuerich", "", "350.00"],
    // QR bill: the continuation line below it becomes the memo and is not a transaction.
    [
      "2026-09-29",
      "Zahlung QR-Rechnung Example Versicherung AG, Postfach, 3000 Bern",
      "Mitteilungen: Police 12345 Praemie Oktober 2026",
      "-312.40",
    ],
    [
      "2026-09-30",
      "Einkauf SBB CFF FFS Bern 29.09.2026, 08:15, Karten-Nr. 123456xxxxxx1234",
      "",
      "-4.20",
    ],
    // Interest of 0: kept as written, YNAB imports it as 0.00.
    ["2026-09-30", "Zins", "", "0.00"],
  ]);
});
