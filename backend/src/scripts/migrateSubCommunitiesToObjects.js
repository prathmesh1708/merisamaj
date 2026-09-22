/**
 * migrateSubCommunitiesToObjects.js
 *
 * Community.subCommunities used to be a plain array of strings, e.g.
 *   ["Sharma", "Dwivedi"]
 * It is now an array of sub-documents so each sub-community can be toggled
 * active/inactive and have real stats attached:
 *   [{ name: "Sharma", isActive: true }, { name: "Dwivedi", isActive: true }]
 *
 * This script converts any existing string-shaped entries in place, using the
 * raw MongoDB driver (bypassing Mongoose casting, which would reject the old
 * shape against the new schema). Safe to re-run — already-migrated documents
 * (array of objects) are skipped.
 *
 * Usage:  node src/scripts/migrateSubCommunitiesToObjects.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set in backend/.env — aborting.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('[Migration] Connected to MongoDB.');

  const collection = mongoose.connection.collection('communities');
  const communities = await collection.find({}).toArray();

  let migrated = 0;
  let skipped = 0;

  for (const comm of communities) {
    const subs = comm.subCommunities;
    if (!Array.isArray(subs) || subs.length === 0) {
      skipped++;
      continue;
    }

    const alreadyMigrated = subs.every(s => s && typeof s === 'object' && !Array.isArray(s) && s.createdAt);
    if (alreadyMigrated) {
      skipped++;
      continue;
    }

    // Convert strings (and tolerate any stray non-string/non-object junk) to
    // {name, isActive, createdAt, updatedAt}. Also backfills createdAt on entries
    // that were already object-shaped from an earlier partial run of this script.
    const seen = new Set();
    const converted = [];
    const now = new Date();
    for (const s of subs) {
      const name = typeof s === 'string' ? s.trim() : (s && s.name ? String(s.name).trim() : '');
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      converted.push({
        _id: (typeof s === 'object' && s._id) ? s._id : new mongoose.Types.ObjectId(),
        name,
        isActive: typeof s === 'object' && s.isActive !== undefined ? Boolean(s.isActive) : true,
        createdAt: (typeof s === 'object' && s.createdAt) ? s.createdAt : now,
        updatedAt: now
      });
    }

    await collection.updateOne({ _id: comm._id }, { $set: { subCommunities: converted } });
    console.log(`[Migration] "${comm.name}" — converted ${converted.length} sub-communities.`);
    migrated++;
  }

  console.log(`[Migration] Done. Migrated: ${migrated}, Skipped (already fine or empty): ${skipped}.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('[Migration] Failed:', err);
  process.exit(1);
});
