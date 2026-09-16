const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../src/models/User');

async function seedAdmin() {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/merisamaj';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const email = 'admin@gmail.com';
    const password = 'Admin!@#123';

    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = new User({
        name: 'System Admin',
        phone: '7777777777',
        role: 'admin',
        accountStatus: 'active',
        verificationStatus: 'verified',
      });
    }

    admin.email = email;
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(password, salt);
    admin.plainPassword = password;
    admin.accountStatus = 'active';
    admin.verificationStatus = 'verified';

    await admin.save();
    console.log(`Admin user configured successfully: ${admin.email} (Password: ${password})`);
    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin:', err);
    process.exit(1);
  }
}

seedAdmin();
