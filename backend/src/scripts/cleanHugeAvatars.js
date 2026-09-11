require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');
const User = require('../models/User');
const Post = require('../models/Post');

async function cleanData() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.mongoUri);
  console.log('Connected.');

  // 1. Clean Users with huge base64 avatars or covers
  const users = await User.find({
    $or: [
      { avatar: { $regex: '^data:' } },
      { cover: { $regex: '^data:' } }
    ]
  });

  console.log(`Found ${users.length} users with data URI avatar/cover.`);
  let totalBytesFreed = 0;

  for (const user of users) {
    let modified = false;

    if (user.avatar && user.avatar.startsWith('data:') && user.avatar.length > 2048) {
      totalBytesFreed += user.avatar.length;
      user.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'Member')}&background=7C3AED&color=fff&size=200&bold=true`;
      modified = true;
      console.log(`  Cleaned avatar for user: ${user.name} (${user._id})`);
    }

    if (user.cover && user.cover.startsWith('data:') && user.cover.length > 2048) {
      totalBytesFreed += user.cover.length;
      user.cover = '';
      modified = true;
      console.log(`  Cleaned cover for user: ${user.name} (${user._id})`);
    }

    if (modified) {
      await user.save();
    }
  }

  // 2. Clean Posts with huge base64 media
  const posts = await Post.find({
    $or: [
      { 'media.url': { $regex: '^data:' } },
      { images: { $regex: '^data:' } }
    ]
  });

  console.log(`Found ${posts.length} posts with data URI media.`);
  for (const post of posts) {
    let postModified = false;
    if (Array.isArray(post.media)) {
      post.media = post.media.filter(m => {
        if (m.url && m.url.startsWith('data:') && m.url.length > 50000) {
          totalBytesFreed += m.url.length;
          postModified = true;
          return false;
        }
        return true;
      });
    }
    if (Array.isArray(post.images)) {
      post.images = post.images.filter(img => {
        if (img && img.startsWith('data:') && img.length > 50000) {
          totalBytesFreed += img.length;
          postModified = true;
          return false;
        }
        return true;
      });
    }
    if (postModified) {
      await post.save();
      console.log(`  Cleaned post: ${post._id}`);
    }
  }

  console.log(`\nCleanup complete! Total freed: ${(totalBytesFreed / (1024 * 1024)).toFixed(2)} MB (${totalBytesFreed} bytes).`);
  process.exit(0);
}

cleanData().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
