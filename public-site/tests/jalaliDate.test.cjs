const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const ts = require('typescript');
const source = readFileSync(new URL('../src/utils/jalaliDate.ts', `file://${__filename}`), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const loaded = { exports: {} };
new Function('module', 'exports', compiled)(loaded, loaded.exports);
const { jalaliToISO, toJalali, formatJalaliDate, jalaliMonthLength, parseISODate } = loaded.exports;

test('Nowruz and year boundaries convert correctly', () => {
  assert.equal(jalaliToISO(1403, 1, 1), '2024-03-20');
  assert.equal(jalaliToISO(1404, 1, 1), '2025-03-21');
  assert.equal(jalaliToISO(1399, 12, 30), '2021-03-20');
  assert.equal(jalaliToISO(1400, 1, 1), '2021-03-21');
  assert.equal(formatJalaliDate('2026-10-25'), '۱۴۰۵/۰۸/۰۳');
});
test('Leap years and month lengths reject impossible dates', () => {
  assert.equal(jalaliMonthLength(1399, 12), 30);
  assert.equal(jalaliMonthLength(1400, 12), 29);
  assert.equal(jalaliToISO(1400, 12, 30), null);
  assert.equal(jalaliToISO(1405, 7, 31), null);
  assert.equal(jalaliMonthLength(1405, 6), 31);
  assert.equal(jalaliMonthLength(1405, 7), 30);
  assert.equal(jalaliToISO(1405, 0, 1), null);
});
test('Empty and invalid values never display a false date', () => {
  for (const value of ['', undefined, 'invalid', '2025-02-30']) {
    assert.equal(formatJalaliDate(value), '');
    assert.equal(parseISODate(value), null);
  }
});
test('Calendar days round-trip across months without timezone shifts', () => {
  for (let year = 1402; year <= 1406; year++) {
    for (let month = 1; month <= 12; month++) {
      for (const day of [1, 15, jalaliMonthLength(year, month)]) {
        const iso = jalaliToISO(year, month, day);
        assert.deepEqual(toJalali(parseISODate(iso)), { year, month, day });
      }
    }
  }
});
