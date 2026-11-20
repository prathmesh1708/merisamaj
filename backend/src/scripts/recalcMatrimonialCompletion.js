/**
 * Recalculates profileCompletion for every matrimonial profile with the shared
 * calculator (services/matrimonialCompletion.js). The stored percentage gates feed /
 * search visibility, so the dry run reports who would newly appear or disappear.
 *
 *   Dry run:  npm run recalc:matrimonial-completion
 *   Apply:    npm run recalc:matrimonial-completion -- --apply
 */
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');
const { calculateCompletion } = require('../services/matrimonialCompletion');

const APPLY = process.argv.includes('--apply');

async function main() {
  if (!config.mongoUri) throw new Error('MONGO_URI is not configured.');
  mongoose.set('autoIndex', false);
  await mongoose.connect(config.mongoUri);
  const db = mongoose.connection.db;
  const settings = await db.collection('matrimonialsettings').findOne({});
  const envMin = parseInt(process.env.MATRIMONIAL_MIN_COMPLETION, 10);
  const threshold = !isNaN(envMin) && envMin > 0 ? envMin : (settings?.profileCompletionRequired ?? 50);

  const profiles = await db.collection('matrimonialprofiles').find({ isDeleted: { $ne: true } }).toArray();
  let changed = 0; let nowVisible = 0; let nowHidden = 0;
  const ops = [];
  for (const p of profiles) {
    const next = calculateCompletion(p);
    const before = p.profileCompletion?.percentage ?? 0;
    if (before !== next.percentage || JSON.stringify(p.profileCompletion?.missing || []) !== JSON.stringify(next.missing)) {
      changed += 1;
      ops.push({ updateOne: { filter: { _id: p._id }, update: { $set: { profileCompletion: next } } } });
    }
    if (before < threshold && next.percentage >= threshold) nowVisible += 1;
    if (before >= threshold && next.percentage < threshold) nowHidden += 1;
  }

  console.log(`${profiles.length} profile(s); ${changed} would change. Feed threshold: ${threshold}%.`);
  console.log(`Visibility: ${nowVisible} would newly appear in feed/search, ${nowHidden} would drop out.`);
  if (!APPLY) { console.log('Dry run — nothing written. Re-run with --apply.'); return; }
  if (ops.length) await db.collection('matrimonialprofiles').bulkWrite(ops);
  console.log(`Updated ${ops.length} profile(s).`);
}

main().catch(error => { console.error('Completion recalculation failed:', error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
