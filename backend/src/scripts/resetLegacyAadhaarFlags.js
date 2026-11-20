/**
 * "Aadhaar Verified" now means a real UIDAI OTP verification only (decided 2026-11-19).
 *
 * Clears isAadharVerified on members who got the flag without one — from Head
 * approval or the old test flow. They have no aadhaarHash and no Aadhaar name.
 * Their membership approval (verificationStatus) is untouched, and they can now
 * verify through the Aadhaar OTP in the app.
 *
 *   Dry run:  npm run reset:legacy-aadhaar
 *   Apply:    npm run reset:legacy-aadhaar -- --apply
 *             (writes backups/aadhaar-flag-reset-<timestamp>.json with the user ids)
 *   Undo:     npm run reset:legacy-aadhaar -- --restore backups/aadhaar-flag-reset-<timestamp>.json
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../config/config');

const APPLY = process.argv.includes('--apply');
const restoreIdx = process.argv.indexOf('--restore');
const RESTORE_FILE = restoreIdx > -1 ? process.argv[restoreIdx + 1] : null;
const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups');

const LEGACY_FILTER = {
  isAadharVerified: true,
  $or: [{ aadhaarHash: { $exists: false } }, { aadhaarHash: null }, { aadhaarHash: '' }]
};

async function main() {
  if (!config.mongoUri) throw new Error('MONGO_URI is not configured.');
  mongoose.set('autoIndex', false);
  await mongoose.connect(config.mongoUri);
  const users = mongoose.connection.db.collection('users');

  if (RESTORE_FILE) {
    const { userIds = [] } = JSON.parse(fs.readFileSync(path.resolve(RESTORE_FILE), 'utf8'));
    const ids = userIds.map(id => new mongoose.Types.ObjectId(id));
    const res = await users.updateMany(
      { _id: { $in: ids } },
      { $set: { isAadharVerified: true }, $unset: { legacyAadhaarFlagClearedAt: '' } }
    );
    console.log(`Restored the Aadhaar flag on ${res.modifiedCount} of ${ids.length} member(s).`);
    return;
  }

  const affected = await users.find(LEGACY_FILTER).project({ _id: 1 }).toArray();
  const real = await users.countDocuments({ isAadharVerified: true, aadhaarHash: { $type: 'string', $gt: '' } });
  console.log(`${affected.length} member(s) have the Aadhaar flag without a UIDAI OTP; ${real} real verification(s) stay as they are.`);

  if (!APPLY) {
    console.log('Dry run — nothing was written. Re-run with --apply to clear those flags.');
    return;
  }
  if (!affected.length) return;

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backupFile = path.join(BACKUP_DIR, `aadhaar-flag-reset-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(backupFile, JSON.stringify({ clearedAt: new Date().toISOString(), userIds: affected.map(u => String(u._id)) }, null, 2));

  const res = await users.updateMany(
    { _id: { $in: affected.map(u => u._id) }, ...LEGACY_FILTER },
    { $set: { isAadharVerified: false, legacyAadhaarFlagClearedAt: new Date() } }
  );
  console.log(`Cleared the Aadhaar flag on ${res.modifiedCount} member(s). Backup of their ids: ${backupFile}`);
}

main().catch(error => { console.error('Aadhaar flag reset failed:', error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
