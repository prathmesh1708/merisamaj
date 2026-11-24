const test = require('node:test');
const assert = require('node:assert');
const { ageOn, MIN_ACCOUNT_AGE, minMarriageAge } = require('../utils/age');

const today = new Date(2026, 10, 24); // 24 Nov 2026

test('age counts whole years and respects the birthday', () => {
  assert.strictEqual(ageOn(new Date(2008, 10, 25), today), 17); // birthday tomorrow
  assert.strictEqual(ageOn(new Date(2008, 10, 24), today), 18); // 18th birthday today
  assert.strictEqual(ageOn(new Date(2000, 0, 1), today), 26);
  assert.strictEqual(ageOn(null, today), null);
  assert.strictEqual(ageOn('not a date', today), null);
});

test('account and marriage age limits follow the Child Safety Standards Policy', () => {
  assert.strictEqual(MIN_ACCOUNT_AGE, 18);
  assert.strictEqual(minMarriageAge('female'), 18);
  assert.strictEqual(minMarriageAge('male'), 21);
  assert.strictEqual(minMarriageAge('Male'), 21);
  assert.strictEqual(minMarriageAge(undefined), 18);
});
