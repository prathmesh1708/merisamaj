const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../src/models/User');
const Community = require('../src/models/Community');

async function check() {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/merisamaj';
    await mongoose.connect(uri);

    console.log('=== HEAD / ADMIN USERS ===');
    const heads = await User.find({ role: { $in: ['head', 'admin'] } }).lean();
    console.log(JSON.stringify(heads.map(h => ({
      id: h._id.toString(),
      name: h.name,
      role: h.role,
      community: h.community,
      communityId: h.communityId?.toString(),
      assignedCommunityIds: h.assignedCommunityIds?.map(c => c.toString())
    })), null, 2));

    console.log('=== PANDIT JI FULL DOC ===');
    const pandit = await User.findOne({ name: /pandit/i }).lean();
    console.log(JSON.stringify(pandit, null, 2));

    console.log('=== MOHIT FULL DOC ===');
    const mohit = await User.findOne({ name: /mohit/i }).lean();
    console.log(JSON.stringify(mohit, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}
check();
