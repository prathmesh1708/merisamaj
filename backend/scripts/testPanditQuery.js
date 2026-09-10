const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../src/models/User');

function applyScopeFilterNew(req, baseFilter = {}, options = {}) {
  const filter = { ...baseFilter };
  const user = req?.user;
  const userRole = (user?.role || '').toLowerCase();
  const cityField = options.cityField || 'city';

  const rawCommunityId = req?.communityId || (user?.communityId?._id || user?.communityId);
  const targetCommId = (rawCommunityId && mongoose.Types.ObjectId.isValid(rawCommunityId))
    ? new mongoose.Types.ObjectId(rawCommunityId.toString())
    : null;

  const commIds = (Array.isArray(user?.assignedCommunityIds) && user.assignedCommunityIds.length > 0)
    ? user.assignedCommunityIds.map(c => new mongoose.Types.ObjectId(c._id || c)).filter(id => mongoose.Types.ObjectId.isValid(id))
    : (targetCommId ? [targetCommId] : []);

  if (commIds.length > 0) {
    const communityCondition = [
      { communityId: { $in: commIds } },
      { assignedCommunityIds: { $in: commIds } }
    ];

    if (filter.$or) {
      const existingOr = filter.$or;
      delete filter.$or;
      filter.$and = filter.$and || [];
      filter.$and.push({ $or: existingOr }, { $or: communityCondition });
    } else if (filter.$and) {
      filter.$and.push({ $or: communityCondition });
    } else {
      filter.$or = communityCondition;
    }
  }

  // City Scope
  const isLocalHead = (userRole === 'sub_head' || user?.accountType === 'local_head') && user?.city;
  const activeCity = options.overrideCity || req?.query?.city || (isLocalHead ? user.city : null);
  if (activeCity && typeof activeCity === 'string' && activeCity !== 'all' && activeCity !== 'All') {
    filter[cityField] = new RegExp(`^${activeCity.trim()}$`, 'i');
  }

  return filter;
}

async function test() {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/merisamaj';
    await mongoose.connect(uri);

    const pandit = await User.findOne({ name: /pandit/i }).lean();
    console.log('Testing as Pandit ji (Local Head Indore):');
    const mockReq = {
      user: pandit,
      communityId: pandit.communityId
    };

    const filter = applyScopeFilterNew(mockReq, { role: { $in: ['user', 'member'] }, accountStatus: { $ne: 'deleted' } });
    console.log('Generated filter:', JSON.stringify(filter, null, 2));

    const matchedUsers = await User.find(filter).lean();
    console.log(`Matched ${matchedUsers.length} users:`);
    console.log(matchedUsers.map(u => ({ id: u._id, name: u.name, city: u.city, verificationStatus: u.verificationStatus, accountStatus: u.accountStatus, community: u.community })));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
test();
