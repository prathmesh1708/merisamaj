const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const svc = require('../services/translationService');

// In-memory stand-in for the TranslationCache model
const makeFakeModel = () => {
  const rows = new Map();
  return {
    rows,
    find: (q) => ({ select: () => ({ lean: async () => q.hash.$in.filter(h => rows.has(h)).map(h => rows.get(h)) }) }),
    updateMany: async () => ({}),
    bulkWrite: async (ops) => {
      ops.forEach(o => { const d = o.updateOne.update.$setOnInsert; rows.set(d.hash, { ...d, lastUsedAt: new Date() }); });
    }
  };
};

let calls;
let model;
beforeEach(() => {
  svc._resetForTests();
  calls = [];
  model = makeFakeModel();
  svc.setCacheModel(() => model);
  svc.setEngine(async (texts) => { calls.push(texts); return texts.map(t => `HI(${t})`); });
});

test('skips numbers, emails, phones, codes, URLs and Hindi text', () => {
  for (const t of ['42', '₹2,000', '9876543210', 'a@b.com', 'https://apnisamaj.com', 'SAMAJ-YYFU', 'अशोक मालाकार', ' ', 'x']) {
    assert.strictEqual(svc.isTranslatable(t), false, t);
  }
  for (const t of ['Save changes', 'Your profile was viewed', '12 members']) {
    assert.strictEqual(svc.isTranslatable(t), true, t);
  }
});

test('uses the glossary for common UI words instead of the machine', async () => {
  const out = await svc.translateTexts(['Home', 'View All', 'Save Changes'], 'hi');
  assert.deepStrictEqual(out, ['होम', 'सभी देखें', 'बदलाव सेव करें']);
  assert.strictEqual(calls.length, 0);
});

test('keeps order, returns null for untranslatable text, translates each text once', async () => {
  const out = await svc.translateTexts(['Hello there', '9876543210', 'Hello   there', 'Good morning'], 'hi');
  assert.deepStrictEqual(out, ['HI(Hello there)', null, 'HI(Hello there)', 'HI(Good morning)']);
  assert.deepStrictEqual(calls, [['Hello there', 'Good morning']]);
  await svc.translateTexts(['Hello there'], 'hi');
  assert.strictEqual(calls.length, 1, 'second request is served from cache');
});

test('reads the database cache before calling the machine', async () => {
  await svc.translateTexts(['Welcome back'], 'hi');
  svc._resetForTests(); // memory cleared, database rows kept
  const out = await svc.translateTexts(['Welcome back'], 'hi');
  assert.deepStrictEqual(out, ['HI(Welcome back)']);
  assert.strictEqual(calls.length, 1);
});

test('a failing translation service returns null (English shown) and pauses retries', async () => {
  svc.setEngine(async () => { calls.push('x'); throw new Error('429'); });
  const out = await svc.translateTexts(['Please try later'], 'hi');
  assert.deepStrictEqual(out, [null]);
  await svc.translateTexts(['Another text'], 'hi');
  assert.strictEqual(calls.length, 1, 'no new calls while paused');
});

test('validates request size and language', () => {
  assert.ok(svc.validateBatch({ lang: 'fr', texts: ['a'] }));
  assert.ok(svc.validateBatch({ lang: 'hi', texts: [] }));
  assert.ok(svc.validateBatch({ lang: 'hi', texts: new Array(101).fill('a') }));
  assert.ok(svc.validateBatch({ lang: 'hi', texts: [5] }));
  assert.strictEqual(svc.validateBatch({ lang: 'hi', texts: ['Hello'] }), null);
  return assert.rejects(svc.translateTexts(['Hi'], 'fr'));
});
