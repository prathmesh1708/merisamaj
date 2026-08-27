/**
 * Seeds mock data for the Member Profile page tabs: Posts / Liked / Saved.
 *
 * Usage:
 *   node src/scripts/seedProfileMockData.js            # defaults to phone 9999999999
 *   node src/scripts/seedProfileMockData.js 9826100001 # seed for a specific member
 *
 * Re-running is safe: previously seeded posts (matched by content) and the
 * target user's likes/saves are wiped before re-creating.
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const City = require('../models/City');
const Post = require('../models/Post');
const PostLike = require('../models/PostLike');
const SavedPost = require('../models/SavedPost');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/merisamaj';
const TARGET_PHONE = process.argv[2] || '9999999999';

const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

const mediaFor = (photoId) => [
  { type: 'image', url: img(photoId), provider: 'external' }
];

// ─── Posts authored by the profile owner (Posts tab) ──────────────────────────
const OWN_POSTS = [
  {
    content: '🙏 Ganesh Chaturthi celebrations at our samaj bhavan were absolutely divine this year. Thank you to every volunteer who made it happen!',
    category: 'Event',
    media: mediaFor('photo-1567591414240-e9c1ff1f8e0e'),
    likesCount: 128, commentsCount: 24, viewsCount: 940
  },
  {
    content: 'Completed my 12th blood donation today at the community camp. If you are healthy and above 18, please consider donating — it costs nothing and saves a life. 🩸',
    category: 'Blood Donation',
    media: mediaFor('photo-1615461066841-6116e61058f4'),
    likesCount: 96, commentsCount: 18, viewsCount: 720
  },
  {
    content: 'Proud moment for the family — my daughter secured AIR 412 in NEET 2026. All blessings of our samaj elders. 🎓',
    category: 'Achievement',
    media: mediaFor('photo-1523050854058-8df90110c9f1'),
    likesCount: 214, commentsCount: 57, viewsCount: 1580
  },
  {
    content: 'Reminder: the monthly satsang is this Sunday at 6 PM. Prasad arrangement has been made for around 200 members. Please confirm your attendance so we can plan.',
    category: 'Notice',
    likesCount: 41, commentsCount: 9, viewsCount: 380
  },
  {
    content: 'Our youth wing cricket tournament finals — what an evening! 🏏 Congratulations to team Indore Warriors on lifting the trophy.',
    category: 'Youth',
    media: mediaFor('photo-1531415074968-036ba1b575da'),
    likesCount: 87, commentsCount: 15, viewsCount: 640
  },
  {
    content: 'Opened my second store near Rajwada this week. Grateful to everyone from the samaj who has supported the business from day one. 🪔',
    category: 'Business',
    media: mediaFor('photo-1441986300917-64674bd600d8'),
    likesCount: 152, commentsCount: 31, viewsCount: 1120
  },
  {
    content: 'Looking for recommendations — a reliable CA in Indore for a small trading firm. Preferably someone from within our community. Please DM.',
    category: 'General',
    likesCount: 12, commentsCount: 22, viewsCount: 260
  },
  {
    content: 'Morning walk at the lake, 6 AM. Some habits are worth keeping. 🌅',
    category: 'Normal',
    media: mediaFor('photo-1506905925346-21bda4d32df4'),
    likesCount: 64, commentsCount: 7, viewsCount: 410
  },
  {
    content: 'Thank you to the samaj for the warm felicitation yesterday. Serving this community for 15 years has been the honour of my life. 🙏',
    category: 'Normal',
    likesCount: 178, commentsCount: 44, viewsCount: 1310
  }
];

// ─── Posts by other members — used for the Liked / Saved tabs ─────────────────
const PEER_POSTS = [
  {
    content: 'Free health check-up camp this Saturday, 9 AM to 2 PM at the community hall. Sugar, BP and ECG tests at no cost for all samaj members.',
    category: 'Announcement',
    media: mediaFor('photo-1576091160399-112ba8d25d1d'),
    likesCount: 203, commentsCount: 38, viewsCount: 1640
  },
  {
    content: 'URGENT: B-negative blood required at Bombay Hospital, Indore. Patient is a samaj member. Please contact immediately if you can help. 🩸',
    category: 'Emergency',
    likesCount: 311, commentsCount: 72, viewsCount: 2890
  },
  {
    content: 'Registration for the annual samaj Snehmilan is now open. Early bird passes available till the end of the month. Family packages included.',
    category: 'Event',
    media: mediaFor('photo-1511578314322-379afb476865'),
    likesCount: 145, commentsCount: 29, viewsCount: 1180
  },
  {
    content: 'Scholarship applications for samaj students appearing in class 10 and 12 are open. Last date is next Friday. Documents list is in the comments.',
    category: 'Notice',
    likesCount: 98, commentsCount: 41, viewsCount: 870
  },
  {
    content: 'Beautiful evening at the Diwali milan samaroh. Over 600 families joined us this year — a new record! 🪔✨',
    category: 'Event',
    media: mediaFor('photo-1604608672516-f1b9b1a0a1e5'),
    likesCount: 267, commentsCount: 53, viewsCount: 2140
  },
  {
    content: 'New matrimonial listings have been added to the samaj directory this week. Verified profiles only. Please reach out to the committee for details.',
    category: 'Matrimony',
    likesCount: 76, commentsCount: 19, viewsCount: 990
  },
  {
    content: 'Our samaj library now has over 4,000 titles including a full competitive exam section. Open daily 8 AM to 8 PM, free for all members. 📚',
    category: 'Announcement',
    media: mediaFor('photo-1507842217343-583bb7270b66'),
    likesCount: 134, commentsCount: 21, viewsCount: 1020
  },
  {
    content: 'Sharing a detailed guide on GST filing for small family businesses — prepared by our CA members. Save this for reference.',
    category: 'Business',
    media: mediaFor('photo-1454165804606-c3d57bc86b40'),
    likesCount: 189, commentsCount: 34, viewsCount: 1450
  },
  {
    content: 'Skill development workshop for samaj youth — digital marketing, spoken English and interview preparation. 6 weekends, completely free.',
    category: 'Youth',
    media: mediaFor('photo-1524178232363-1fb2b075b655'),
    likesCount: 156, commentsCount: 27, viewsCount: 1290
  },
  {
    content: 'With deep sorrow we inform the passing of Shri Kanhaiyalal ji at the age of 89. Shraddhanjali sabha on Thursday at 4 PM. Om Shanti. 🙏',
    category: 'Obituary',
    likesCount: 224, commentsCount: 88, viewsCount: 1970
  },
  {
    content: 'Winter blanket distribution drive — we covered 12 bastis and reached 850 families. Thank you to every donor who contributed. 🧣',
    category: 'Announcement',
    media: mediaFor('photo-1488521787991-ed7bbaae773c'),
    likesCount: 198, commentsCount: 36, viewsCount: 1520
  },
  {
    content: 'Dharmashala booking is now available online for samaj members at a subsidised rate. Rooms fill up fast during wedding season — book early.',
    category: 'Notice',
    likesCount: 87, commentsCount: 16, viewsCount: 760
  }
];

// Which peer posts land in which tab (indices into PEER_POSTS, some overlap).
const LIKED_INDICES = [0, 1, 2, 3, 4, 5, 6];
const SAVED_INDICES = [5, 6, 7, 8, 9, 10, 11];

const ALL_SEED_CONTENT = [...OWN_POSTS, ...PEER_POSTS].map(p => p.content);

// Spread createdAt backwards so the feed ordering looks natural.
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function seed() {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected.');

  const target = await User.findOne({ phone: TARGET_PHONE });
  if (!target) {
    throw new Error(`No user found with phone ${TARGET_PHONE}. Pass a valid phone as the first argument.`);
  }

  const communityId = target.communityId?._id || target.communityId;
  if (!communityId) {
    throw new Error(`User ${target.name} has no communityId — profile tabs filter by community and would show nothing.`);
  }

  const cityDoc = target.city
    ? await City.findOne({ name: new RegExp(`^${target.city}$`, 'i') })
    : null;
  const cityId = cityDoc?._id || null;

  console.log(`👤 Target: ${target.name} (${target.phone}) | community: ${communityId} | city: ${target.city || '—'}`);

  // Peers from the same community to author the liked/saved posts.
  const peers = await User.find({
    communityId,
    _id: { $ne: target._id }
  }).select('name').limit(12);

  if (peers.length === 0) {
    throw new Error('No other members found in this community to author the liked/saved posts.');
  }
  console.log(`👥 Using ${peers.length} peer author(s) from the same community.`);

  // ─── Clean previous run ───
  const removedPosts = await Post.deleteMany({ content: { $in: ALL_SEED_CONTENT } });
  const removedLikes = await PostLike.deleteMany({ userId: target._id });
  const removedSaves = await SavedPost.deleteMany({ userId: target._id });
  console.log(`🧹 Cleaned: ${removedPosts.deletedCount} posts, ${removedLikes.deletedCount} likes, ${removedSaves.deletedCount} saves.`);

  // ─── Own posts (Posts tab) ───
  const ownDocs = OWN_POSTS.map((p, i) => ({
    userId: target._id,
    authorId: target._id,
    communityId,
    cityId,
    content: p.content,
    category: p.category,
    feedType: 'both',
    media: p.media || [],
    images: (p.media || []).map(m => m.url),
    likesCount: p.likesCount,
    commentsCount: p.commentsCount,
    sharesCount: Math.floor(p.likesCount / 12),
    viewsCount: p.viewsCount,
    status: 'published',
    isDeleted: false,
    createdAt: daysAgo(i * 3 + 1),
    updatedAt: daysAgo(i * 3 + 1)
  }));
  const createdOwn = await Post.insertMany(ownDocs);
  console.log(`📝 Created ${createdOwn.length} posts authored by ${target.name}.`);

  // ─── Peer posts ───
  const peerDocs = PEER_POSTS.map((p, i) => {
    const author = peers[i % peers.length];
    return {
      userId: author._id,
      authorId: author._id,
      communityId,
      cityId,
      content: p.content,
      category: p.category,
      feedType: 'both',
      media: p.media || [],
      images: (p.media || []).map(m => m.url),
      likesCount: p.likesCount,
      commentsCount: p.commentsCount,
      sharesCount: Math.floor(p.likesCount / 10),
      viewsCount: p.viewsCount,
      status: 'published',
      isDeleted: false,
      createdAt: daysAgo(i * 2 + 2),
      updatedAt: daysAgo(i * 2 + 2)
    };
  });
  const createdPeer = await Post.insertMany(peerDocs);
  console.log(`📝 Created ${createdPeer.length} posts by other community members.`);

  // ─── Likes (Liked tab) ───
  const likeDocs = LIKED_INDICES.map((idx, n) => ({
    postId: createdPeer[idx]._id,
    userId: target._id,
    createdAt: daysAgo(n),
    updatedAt: daysAgo(n)
  }));
  await PostLike.insertMany(likeDocs);
  await Post.updateMany(
    { _id: { $in: LIKED_INDICES.map(i => createdPeer[i]._id) } },
    { $inc: { likesCount: 1 } }
  );
  console.log(`❤️  Liked ${likeDocs.length} posts as ${target.name}.`);

  // ─── Saves (Saved tab) ───
  const saveDocs = SAVED_INDICES.map((idx, n) => ({
    postId: createdPeer[idx]._id,
    userId: target._id,
    createdAt: daysAgo(n),
    updatedAt: daysAgo(n)
  }));
  await SavedPost.insertMany(saveDocs);
  console.log(`🔖 Saved ${saveDocs.length} posts as ${target.name}.`);

  console.log('\n✅ Done. Open http://localhost:5173/member/profile logged in as:');
  console.log(`   ${target.name} — phone ${target.phone}`);
  console.log(`   Posts: ${createdOwn.length} | Liked: ${likeDocs.length} | Saved: ${saveDocs.length}`);
}

seed()
  .then(() => mongoose.disconnect().then(() => process.exit(0)))
  .catch(async (err) => {
    console.error('❌ Seed failed:', err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
