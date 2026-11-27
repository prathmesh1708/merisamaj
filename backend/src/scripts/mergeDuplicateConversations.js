/**
 * Merge duplicate one-to-one chats (member / matrimonial / support).
 *
 * Before 2026-11-27 two "open chat" requests at the same moment, or two accepted
 * interests between the same people, could create two chats for one pair. The app now
 * lists one row per person, but messages in the other chat stay hidden. This moves
 * them into one chat per pair and retires the extra chat.
 *
 * For each pair: keep the chat with the most recent message (else the oldest); move
 * the other chats' messages into it; point interests at it; refresh its "last message"
 * fields; mark the others isDeleted. A JSON backup of every changed document is written
 * to backend/backups first.
 *
 *   Dry run:  node src/scripts/mergeDuplicateConversations.js
 *   Apply:    node src/scripts/mergeDuplicateConversations.js --apply
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../config/config');

const APPLY = process.argv.includes('--apply');
const TYPES = ['member', 'matrimonial', 'support'];
const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups');

async function main() {
  if (!config.mongoUri) throw new Error('MONGO_URI is not configured.');
  mongoose.set('autoIndex', false);
  await mongoose.connect(config.mongoUri);
  const db = mongoose.connection.db;
  const convs = db.collection('conversations');
  const messages = db.collection('messages');
  const interests = db.collection('interestrequests');
  const users = db.collection('users');

  const groups = await convs.aggregate([
    { $match: { type: { $in: TYPES }, isDeleted: { $ne: true }, $expr: { $eq: [{ $size: '$participants' }, 2] } } },
    { $group: { _id: { type: '$type', pair: { $sortArray: { input: '$participants', sortBy: 1 } } }, ids: { $push: '$_id' }, n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } }
  ]).toArray();

  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'}: ${groups.length} pair(s) with more than one chat`);
  const backup = { at: new Date().toISOString(), conversations: [], interests: [], movedMessageIds: [] };

  for (const g of groups) {
    const docs = await convs.find({ _id: { $in: g.ids } }).toArray();
    const counts = Object.fromEntries(await Promise.all(docs.map(async d => [String(d._id), await messages.countDocuments({ conversationId: d._id })])));
    docs.sort((a, b) => (new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)) || (new Date(a.createdAt) - new Date(b.createdAt)));
    const keep = docs[0];
    const extra = docs.slice(1);
    const names = (await users.find({ _id: { $in: g._id.pair } }).project({ name: 1 }).toArray()).map(u => u.name).join(' + ');
    console.log(`\n[${g._id.type}] ${names}`);
    console.log(`  keep   ${keep._id} (${counts[String(keep._id)]} messages)`);
    extra.forEach(d => console.log(`  merge  ${d._id} (${counts[String(d._id)]} messages) -> keep`));
    if (!APPLY) continue;

    backup.conversations.push(...docs);
    const extraIds = extra.map(d => d._id);
    const moved = await messages.find({ conversationId: { $in: extraIds } }).project({ _id: 1, conversationId: 1 }).toArray();
    backup.movedMessageIds.push(...moved);
    const linked = await interests.find({ conversationId: { $in: extraIds } }).project({ _id: 1, conversationId: 1 }).toArray();
    backup.interests.push(...linked);
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    fs.writeFileSync(path.join(BACKUP_DIR, `duplicate-conversations-${backup.at.replace(/[:.]/g, '-')}.json`), JSON.stringify(backup, null, 1));

    await messages.updateMany({ conversationId: { $in: extraIds } }, { $set: { conversationId: keep._id } });
    await interests.updateMany({ conversationId: { $in: extraIds } }, { $set: { conversationId: keep._id } });
    const last = await messages.find({ conversationId: keep._id }).sort({ createdAt: -1 }).limit(1).toArray();
    const set = {};
    if (last[0]) {
      set.lastMessageId = last[0]._id;
      set.lastMessageAt = last[0].createdAt;
      set.lastMessagePreview = last[0].type === 'image' ? '📷 Photo' : String(last[0].message || '').slice(0, 120);
    }
    if (Object.keys(set).length) await convs.updateOne({ _id: keep._id }, { $set: set });
    await convs.updateMany({ _id: { $in: extraIds } }, { $set: { isDeleted: true, deletedAt: new Date() } });
    console.log(`  done: moved ${moved.length} message(s), relinked ${linked.length} interest(s)`);
  }

  if (!APPLY && groups.length) console.log('\nNothing changed. Run with --apply to merge.');
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
