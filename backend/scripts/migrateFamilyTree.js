/**
 * Migration Script: legacy User.familyMembers[] → Family / FamilyMember records
 *
 * What it does, for every user who has family members but no Family yet:
 *   1. Creates a Family (MSF-xxxxxx) with the user as head + their own Member ID (MSM-xxxxxx)
 *   2. Creates a FamilyMember (MSM-xxxxxx) for every legacy entry, marked APPROVED
 *      (they are already part of today's Jangana)
 *   3. If an entry's mobile number belongs to a registered user, that user receives
 *      an accept/reject invitation (nothing is auto-linked)
 *   4. Prints possible duplicate families (relatives who registered and listed each other)
 *      for an admin to review
 *
 * Usage:
 *   node backend/scripts/migrateFamilyTree.js --dry   (report only, writes nothing)
 *   node backend/scripts/migrateFamilyTree.js
 *
 * Safe to re-run — users who already have a familyId are skipped.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const User = require('../src/models/User');
const FamilyMember = require('../src/models/FamilyMember');
const familyService = require('../src/services/familyService');

const DRY_RUN = process.argv.includes('--dry');

const run = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGO_URI / MONGODB_URI is not set in backend/.env');
  await mongoose.connect(mongoUri);
  console.log(`Connected. ${DRY_RUN ? 'DRY RUN — no changes will be written.' : ''}`);

  const users = await User.find({
    familyId: null,
    accountStatus: { $ne: 'deleted' },
    'familyMembers.0': { $exists: true }
  });
  console.log(`Users with legacy family members and no Family: ${users.length}`);

  let familiesCreated = 0;
  let membersCreated = 0;
  const skipped = [];

  for (const user of users) {
    const entries = (user.familyMembers || []).map(m => m.toObject());
    if (DRY_RUN) {
      console.log(`  would migrate ${user.name} (${user.phone}) with ${entries.length} member(s)`);
      continue;
    }

    await familyService.ensureFamily(user);
    familiesCreated++;

    for (const entry of entries) {
      if (!entry.name) continue;
      try {
        await familyService.addMember(user, entry, { preApproved: true, skipRefresh: true });
        membersCreated++;
      } catch (err) {
        skipped.push(`${user.name} → ${entry.name}: ${err.message}`);
      }
    }
    await familyService.refreshLegacyArrays(user.familyId);
  }

  console.log(`\nFamilies created: ${familiesCreated}`);
  console.log(`Family members created: ${membersCreated}`);
  if (skipped.length) {
    console.log(`\nSkipped entries (${skipped.length}):`);
    skipped.forEach(s => console.log(`  - ${s}`));
  }

  // Relatives who registered separately: a record in one family points (by phone) to a
  // user who heads a different family. These are candidates for an admin merge.
  const invited = await FamilyMember.find({ linkStatus: 'invited', userId: null, isRemoved: false })
    .populate('familyId', 'familyCode').lean();
  const possibleDuplicates = [];
  for (const record of invited) {
    const registered = await User.findOne({ phone: record.phone, familyId: { $ne: null } })
      .populate('familyId', 'familyCode').select('name familyId').lean();
    if (registered && registered.familyId && registered.familyId._id.toString() !== record.familyId._id.toString()) {
      possibleDuplicates.push(`${record.familyId.familyCode} lists ${record.name} (${record.phone}), who is in ${registered.familyId.familyCode}`);
    }
  }
  if (possibleDuplicates.length) {
    console.log(`\nPossible duplicate families to review (${possibleDuplicates.length}):`);
    possibleDuplicates.forEach(d => console.log(`  - ${d}`));
  }

  await mongoose.disconnect();
  console.log('\nDone.');
};

run().catch(async (err) => {
  console.error('Migration failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
