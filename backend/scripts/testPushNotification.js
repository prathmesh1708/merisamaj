/**
 * Push notification health check + real test send.
 *
 *   npm run test:push                      → status only (Firebase login, registered devices)
 *   npm run test:push -- 9876543210        → also sends a test push to that user (phone or email)
 *
 * Prints Firebase's reply for every device so a failure shows exactly why.
 * Dead tokens are switched off automatically, same as normal sends.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const User = require('../src/models/User');
const UserPushToken = require('../src/models/UserPushToken');

const initFirebase = () => {
  const { FCM_PROJECT_ID, FCM_CLIENT_EMAIL } = process.env;
  let key = process.env.FCM_PRIVATE_KEY;
  if (!FCM_PROJECT_ID || !FCM_CLIENT_EMAIL || !key) throw new Error('FCM_* values missing in .env');
  key = key.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
  admin.initializeApp({ credential: admin.credential.cert({ projectId: FCM_PROJECT_ID, clientEmail: FCM_CLIENT_EMAIL, privateKey: key }) });
};

(async () => {
  const target = process.argv[2];
  initFirebase();

  // 1. Firebase login (validate-only send, reaches no device)
  await admin.messaging().send({ topic: 'health-check', notification: { title: 'x', body: 'y' } }, true);
  console.log('✅ Firebase credentials accepted by Google');

  await mongoose.connect(process.env.MONGO_URI);

  // 2. Registered devices
  const all = await UserPushToken.find({}).populate('userId', 'name phone email').lean();
  const active = all.filter(t => t.isActive);
  console.log(`📱 Registered devices: ${all.length} (${active.length} active)`);
  ['web', 'android', 'ios'].forEach(type => {
    const n = active.filter(t => t.deviceType === type).length;
    if (n) console.log(`   ${type}: ${n}`);
  });

  if (!target) {
    console.log('\nTo send a test push: npm run test:push -- <phone or email>');
    return;
  }

  // 3. Real send to one user
  const user = await User.findOne({ $or: [{ phone: target }, { email: target.toLowerCase() }] }).select('name').lean();
  if (!user) throw new Error(`No user with phone/email "${target}"`);
  const tokens = active.filter(t => t.userId && t.userId._id.toString() === user._id.toString());
  if (tokens.length === 0) {
    console.log(`\n⚠️  ${user.name} has no active device. Log in on the app, allow notifications, then run again.`);
    return;
  }

  console.log(`\n🚀 Sending test push to ${user.name} (${tokens.length} device(s))…`);
  const res = await admin.messaging().sendEachForMulticast({
    tokens: tokens.map(t => t.fcmToken),
    notification: { title: 'ApniSamaj test 🔔', body: `Push notifications are working, ${user.name}!` },
    data: { type: 'test', actionUrl: '/member/notifications', icon: '🔔', notificationId: '' }
  });

  for (const [i, r] of res.responses.entries()) {
    const t = tokens[i];
    if (r.success) {
      console.log(`   ✅ ${t.deviceType} device: delivered to Firebase (${r.messageId})`);
    } else {
      console.log(`   ❌ ${t.deviceType} device: ${r.error.code} — ${r.error.message}`);
      if (['messaging/invalid-registration-token', 'messaging/registration-token-not-registered', 'messaging/invalid-argument'].includes(r.error.code)) {
        await UserPushToken.updateOne({ _id: t._id }, { $set: { isActive: false } });
        console.log('      (token is dead — switched off)');
      }
    }
  }
  console.log(`\nResult: ${res.successCount} sent, ${res.failureCount} failed. Check the device now.`);
})()
  .catch(err => { console.error('❌', err.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
