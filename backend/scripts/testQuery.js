require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { applyScopeFilter } = require('../src/utils/queryScopeHelper');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const pandit = await User.findOne({ name: /Pandit/i });
  console.log('Pandit user:', {
    _id: pandit._id,
    name: pandit.name,
    role: pandit.role,
    accountType: pandit.accountType,
    city: pandit.city,
    communityId: pandit.communityId,
    assignedCommunityIds: pandit.assignedCommunityIds
  });

  const fakeReq = {
    user: pandit,
    communityId: pandit.communityId,
    query: {}
  };

  const filter = applyScopeFilter(fakeReq, { accountStatus: { $ne: 'deleted' } });
  console.log('Generated filter:', JSON.stringify(filter, null, 2));

  const members = await User.find(filter).select('name phone city community verificationStatus accountStatus');
  console.log('Found members for Pandit count:', members.length);
  members.forEach(m => console.log(`- ${m.name} (${m.community}, ${m.city}) Status: ${m.verificationStatus} / ${m.accountStatus}`));

  await mongoose.disconnect();
}
test().catch(console.error);
