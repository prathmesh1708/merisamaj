const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const Conversation = require('../models/Conversation');
const { findOrCreateConversation, pairKeyOf } = require('../services/conversationService');

// Stand-in for the conversations collection: slow inserts + a unique pairKey, like MongoDB
let rows;
let creates;
const saved = {};
const query = (fn) => {
  const p = Promise.resolve().then(fn);
  return { sort: () => p, then: (a, b) => p.then(a, b) };
};

beforeEach(() => {
  rows = [];
  creates = 0;
  saved.findOne = Conversation.findOne;
  saved.create = Conversation.create;
  Conversation.findOne = (q) => query(() => {
    if (q.pairKey) return rows.find(r => r.pairKey === q.pairKey) || null;
    const ids = q.participants.$all.map(String);
    return rows.find(r => r.type === q.type && ids.every(id => r.participants.map(String).includes(id))) || null;
  });
  Conversation.create = async (doc) => {
    creates++;
    await new Promise(r => setTimeout(r, 15)); // a slow insert widens the race window
    if (rows.some(r => r.pairKey === doc.pairKey)) throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
    const row = { _id: `c${rows.length + 1}`, ...doc };
    rows.push(row);
    return row;
  };
});

afterEach(() => {
  Conversation.findOne = saved.findOne;
  Conversation.create = saved.create;
});

test('the pair key is the same whichever person opens the chat', () => {
  assert.strictEqual(pairKeyOf('member', 'b', 'a'), pairKeyOf('member', 'a', 'b'));
  assert.notStrictEqual(pairKeyOf('member', 'a', 'b'), pairKeyOf('matrimonial', 'a', 'b'));
});

test('five "open chat" requests at the same moment create one chat', async () => {
  const results = await Promise.all([1, 2, 3, 4, 5].map((i) =>
    findOrCreateConversation(i % 2 ? 'userA' : 'userB', i % 2 ? 'userB' : 'userA', 'member')));
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(new Set(results.map(r => r.conversation._id)).size, 1);
  assert.strictEqual(results.filter(r => r.isNew).length, 1);
});

test('an existing chat is reused, and other pairs or chat types get their own', async () => {
  const first = await findOrCreateConversation('userA', 'userB', 'member');
  const again = await findOrCreateConversation('userB', 'userA', 'member');
  const other = await findOrCreateConversation('userA', 'userC', 'member');
  const mat = await findOrCreateConversation('userA', 'userB', 'matrimonial');
  assert.strictEqual(again.conversation._id, first.conversation._id);
  assert.strictEqual(again.isNew, false);
  assert.notStrictEqual(other.conversation._id, first.conversation._id);
  assert.notStrictEqual(mat.conversation._id, first.conversation._id);
  assert.strictEqual(rows.length, 3);
});
