import assert from "node:assert/strict";
import { test } from "node:test";
import { convert, detect } from "../src/index.ts";
import { ynabRows } from "./helpers.ts";

test("mt940", () => {
  // German savings bank MT940 (.sta): Windows-1252, CRLF, every line at most 65 characters, so
  // :86: wraps mid-word. Two statements of the same account (:25: as BLZ/account number), one per
  // booking day (31.12.2026 and 04.01.2027), each :20:STARTUMSE, :25:, :28C:, :60F: opening
  // balance, :61:/:86: pairs, :62F: closing balance and a "-" line; they are merged. :61: is the
  // value date (YYMMDD), the booking date (MMDD), D/C/RD, the funds code R (third letter of
  // EUR), the amount with a decimal comma, the type (NMSC…) and NONREF. :86: is the German
  // format: 3-digit transaction code, ?00 booking text, ?10 primanota, ?20-?29 purpose cut into
  // 27-character parts (one SEPA label per part), ?30 BIC, ?31 IBAN, ?32-?33 name. Payee is ?32
  // + ?33, else ?00; memo is the SVWZ+ text, else ?00. Balances and the BIC/IBAN are ignored.
  assert.deepEqual(ynabRows("mt940"), [
    // Card payment (D): dated by the booking date (31.12), not the value date (30.12). The
    // memo is the SVWZ+ text, which spans ?21 and ?22 ("Debit" + "k.1"); EREF+ is dropped.
    ["2026-12-31", "REWE Markt GmbH", "2026-12-30T17:45 Debitk.1 2029-12", "-42.17"],
    // Salary (C): money in. The SVWZ+ text is split mid-word across a line break and ?21/?22.
    ["2026-12-31", "Example GmbH", "Lohn/Gehalt Dezember 2026 Personalnr. 4711", "2750.00"],
    // Direct debit: only SVWZ+ of EREF+/MREF+/CRED+/SVWZ+ is kept. The name is cut into ?32
    // ("…Verso") and ?33 ("rgung GmbH"), and "?32" itself is cut by a line break.
    [
      "2026-12-31",
      "Grüne Energie Example Versorgung GmbH",
      "Abschlag Dezember 2026 Musterstraße 12",
      "-89.00",
    ],
    // Account fee in the second statement, with only ?00 (and ?10): payee and memo are the
    // booking text. Value date 31.12.2026, booking date 0104 of the next year: 2027-01-04.
    ["2027-01-04", "ENTGELTABSCHLUSS", "ENTGELTABSCHLUSS", "-7.50"],
    // Reversed card payment (RD, "Storno Soll"): money back, positive.
    ["2027-01-04", "Bäckerei Schön", "2026-12-29T08:12 Debitk.1 2029-12", "15.00"],
  ]);
});

test("mt940-ing", () => {
  // ING Netherlands MT940 (structured): UTF-8 (ASCII only), LF. Each statement is a SWIFT
  // message, a {1:…}{2:…}{4: line before it and -} after: here 05.10.2026 and the statement
  // without bookings that ING also sends for 06.10. :20:, :25: (IBAN + currency), :28C:,
  // :60F:, :61:, :62F:, :64:, :65: and a :86:/SUM/ about the whole statement, all ignored but
  // :61: and the :86: after it. :61: has the value and booking date (both 05.10), C/D, the
  // amount, the type (NTRF…), the reference, //ING's reference and a second line /TRCD/…/
  // (ignored). :86: is /KEY/value/ fields in a fixed order, wrapped every 65 characters in
  // the middle of words: payee is the name in /CNTP/account/BIC/name/city/, memo the text of
  // /REMI/USTD//text/ or the payment reference of /REMI/STRD/CUR/reference/.
  assert.deepEqual(ynabRows("mt940-ing"), [
    // Transfer in (C): the name "Jane Must" + "er" is joined across the line break.
    ["2026-10-05", "Jane Muster", "Factuur 2026-118", "1250.00"],
    // iDEAL payment (D): /EREF/ holds date, time and the iDEAL transaction id.
    ["2026-10-05", "bol.com", "0050001234567890 Bestelling 1234567890", "-24.99"],
    // Direct debit: /MARF/ (mandate) and /CSID/ (creditor id) before /CNTP/ are ignored.
    ["2026-10-05", "Example BV", "Contributie oktober 2026", "-35.00"],
    // Acceptgiro: the memo is the payment reference after STRD/CUR/; the city is ignored.
    ["2026-10-05", "Example Verzekeringen NV", "1234567890123456", "-89.95"],
    // the 06.10 statement has no :61:, and :86:/SUM/ totals the statement: nothing to import
  ]);
});

test("mt940-abnamro", () => {
  // ABN AMRO MT940: ASCII, CRLF. One statement per booking day (05.10 and 06.10.2026), each
  // after the lines ABNANL2A, 940, ABNANL2A (ignored) and ending in "-": :20:ABN AMRO BANK NV,
  // :25: (account number), :28:, :60F:, :61:/:86: pairs and :62F:. :61: has the value and the
  // booking date, D/C, the amount, the type N + 3 digits and NONREF. :86: is free text in
  // fixed-width columns for card payments (BEA): payee and memo are the whole text, lines
  // joined with a space. SEPA transactions use /KEY/value/ fields wrapped after 65 characters,
  // in the middle of values but not of keys: payee is /NAME/, memo is /REMI/.
  assert.deepEqual(ynabRows("mt940-abnamro"), [
    // Card payment on Saturday 03.10 (value date), dated by the booking date, Monday 05.10.
    [
      "2026-10-05",
      "BEA, Betaalpas Albert Heijn 1234,PAS123 NR:4KA7G6, 03.10.26/14:23 AMSTERDAM",
      "BEA, Betaalpas Albert Heijn 1234,PAS123 NR:4KA7G6, 03.10.26/14:23 AMSTERDAM",
      "-23.45",
    ],
    // Transfer in (C): /NAME/ ends the first line, its value starts the second.
    ["2026-10-05", "JANE MUSTER", "Factuur 2026-118", "1250.00"],
    // Direct debit: /REMI/ holds a structured reference (/INV/ invoice number and date), cut by
    // a line break. /INV/ is no key, so it stays in the memo. /CSID/, /MARF/, /IBAN/, /BIC/ and
    // /EREF/ are ignored.
    ["2026-10-06", "EXAMPLE ENERGIE B.V.", "/INV/2026100612 6.10.2026", "-62.63"],
  ]);
});

test("mt940 with several accounts asks for one file per account", () => {
  const statement = (account: string) =>
    `:20:STARTUMSE\n:25:${account}\n:28C:00001/001\n:60F:C261231EUR10,00\n` +
    ":61:2701040104DR7,50NCHGNONREF\n:86:805?00ENTGELTABSCHLUSS\n:62F:C270104EUR2,50\n-\n";
  const text = statement("00000000/0000000001") + statement("00000000/0000000002");
  assert.throws(() => convert(text, "mt940"), /2 accounts.*one account per file/);
});

test("mt940 copes with a value date of 30 February and a blank booking date", () => {
  // German banks value-date month-end fees on 30 February; ASN Bank and Citi leave the booking
  // date blank (4 spaces), so the value date is used.
  const text =
    ":20:STARTUMSE\n:25:00000000/0000000000\n:28C:00002/001\n:60F:C270226EUR20,00\n" +
    ":61:2702300301DR6,00NMSCNONREF\n:86:805?00ENTGELTABSCHLUSS\n" +
    ":61:270301    CR5,00NTRFNONREF\n:86:166?00GUTSCHRIFT?32Jane Muster\n" +
    ":62F:C270301EUR19,00\n-\n";
  assert.deepEqual(
    convert(text, "mt940").map(({ date, amount }) => [date, amount]),
    [
      ["2027-03-01", -6000],
      ["2027-03-01", 5000],
    ],
  );
});

test("mt940 without bookings has no transactions", () => {
  const text =
    ":20:STARTUMSE\n:25:00000000/0000000000\n:28C:00003/001\n:60F:C270302EUR19,00\n" +
    ":62F:C270302EUR19,00\n-\n";
  assert.equal(detect(text), "mt940");
  assert.deepEqual(convert(text, "mt940"), []);
});
