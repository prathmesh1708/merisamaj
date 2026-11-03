require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');

async function main() {
  if (!config.mongoUri) throw new Error('MONGO_URI is not configured.');
  mongoose.set('autoIndex', false);
  await mongoose.connect(config.mongoUri);
  const User = require('../models/User');
  const referralService = require('../services/referralService');
  const repaired = await referralService.repairDuplicateCodes();
  await User.collection.createIndex(
    { referralCode: 1 },
    { unique: true, name: 'uniq_user_referral_code', partialFilterExpression: { referralCode: { $type: 'string', $gt: '' } } }
  );
  console.log(`Referral code migration complete (${repaired} duplicate code(s) repaired).`);
}

main().catch(error => { console.error('Referral code migration failed:', error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
