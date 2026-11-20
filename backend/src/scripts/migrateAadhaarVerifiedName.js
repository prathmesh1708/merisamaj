/**
 * Aadhaar visibility migration (additive — nothing is deleted).
 *
 *  1. Copies the legacy `aadhaarName` into `aadhaarVerifiedName` for members who
 *     verified before this change (the old field is left in place).
 *  2. Creates the admin-only AadhaarKycRecord for UIDAI-verified members that
 *     don't have one, with the reference ID from their verified OTP session when
 *     it still exists. DOB/gender/address/photo were never stored before, so
 *     those stay empty for old verifications.
 *
 * Members marked verified without a UIDAI check (Head approval / old test flow)
 * are left as they are; they have no Aadhaar name.
 *
 *   Dry run:  npm run migrate:aadhaar-name
 *   Apply:    npm run migrate:aadhaar-name -- --apply
 */
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');

const APPLY = process.argv.includes('--apply');

async function main() {
  if (!config.mongoUri) throw new Error('MONGO_URI is not configured.');
  mongoose.set('autoIndex', false);
  await mongoose.connect(config.mongoUri);
  const db = mongoose.connection.db;
  const users = db.collection('users');
  const AadhaarKycRecord = require('../models/AadhaarKycRecord');
  const AadhaarVerification = require('../models/AadhaarVerification');

  // 1. aadhaarName → aadhaarVerifiedName
  const nameFilter = {
    aadhaarName: { $type: 'string', $gt: '' },
    $or: [{ aadhaarVerifiedName: { $exists: false } }, { aadhaarVerifiedName: '' }, { aadhaarVerifiedName: null }]
  };
  const toCopy = await users.countDocuments(nameFilter);
  if (APPLY && toCopy) {
    await users.updateMany(nameFilter, [{ $set: { aadhaarVerifiedName: '$aadhaarName' } }]);
  }

  // 2. KYC records for UIDAI-verified members (they have an Aadhaar hash)
  const verified = await users
    .find({ isAadharVerified: true, aadhaarHash: { $type: 'string', $gt: '' } })
    .project({ aadhaarName: 1, aadhaarVerifiedName: 1, aadhaarLast4: 1, aadhaarVerifiedAt: 1 })
    .toArray();
  let recordsCreated = 0;
  for (const u of verified) {
    if (await AadhaarKycRecord.exists({ userId: u._id })) continue;
    const session = await AadhaarVerification.findOne({ userId: u._id, verifiedAt: { $ne: null } })
      .sort({ verifiedAt: -1 }).lean();
    recordsCreated += 1;
    if (!APPLY) continue;
    await AadhaarKycRecord.create({
      userId: u._id,
      provider: session?.provider || 'quickekyc',
      method: 'aadhaar_otp',
      mode: session?.mode || 'live',
      referenceId: session?.requestId || '',
      verifiedName: u.aadhaarVerifiedName || u.aadhaarName || '',
      aadhaarLast4: u.aadhaarLast4 || session?.aadhaarLast4 || '',
      verifiedAt: u.aadhaarVerifiedAt || session?.verifiedAt || new Date(),
      detailsStored: false
    });
  }

  const manual = await users.countDocuments({ isAadharVerified: true, $or: [{ aadhaarHash: null }, { aadhaarHash: { $exists: false } }] });
  console.log(`${APPLY ? 'Applied' : 'Dry run'}: ${toCopy} verified name(s) to copy, ${recordsCreated} KYC record(s) to create.`);
  console.log(`${manual} member(s) are marked verified without a UIDAI check (left unchanged).`);
  if (!APPLY) console.log('Nothing was written. Re-run with --apply to write these changes.');
}

main().catch(error => { console.error('Aadhaar migration failed:', error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
