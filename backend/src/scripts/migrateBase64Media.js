/**
 * One-off: move base64 media out of Mongo and fix broken image links.
 *
 *  1. stories.media        data: URI  → Cloudinary URL
 *  2. highlights.coverImage data: URI → Cloudinary URL
 *  3. appcontents: clear image fields that point at Bing search pages
 *     (HTML pages, not images — they can never render and cost ~800 KB each)
 *
 * Usage (from backend/):
 *   node src/scripts/migrateBase64Media.js           # dry run, changes nothing
 *   node src/scripts/migrateBase64Media.js --apply   # write changes
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { uploadDataUri, isVideoDataUri } = require('../utils/uploadDataUri');

const APPLY = process.argv.includes('--apply');
const isBrokenImageLink = (v) => typeof v === 'string' && /bing\.com\/images\/search/i.test(v);

(async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  console.log(APPLY ? '*** APPLY MODE ***' : '--- dry run (pass --apply to write) ---');

  // 1. Stories
  const stories = db.collection('stories');
  const storyCursor = stories.find({ media: /^data:/ }, { projection: { media: 1, mediaType: 1 } });
  let storyCount = 0, storyBytes = 0, storyFailed = 0;
  for await (const s of storyCursor) {
    storyCount++; storyBytes += s.media.length;
    if (!APPLY) continue;
    try {
      const url = await uploadDataUri(s.media, 'merisamaj/stories', s.mediaType === 'video' ? 'video' : 'image');
      const fix = isVideoDataUri(s.media) ? { mediaType: 'video' } : {};
      await stories.updateOne({ _id: s._id }, { $set: { media: url, ...fix } });
      process.stdout.write('.');
    } catch (e) {
      storyFailed++;
      console.warn(`\n  story ${s._id} failed: ${e.message}`);
    }
  }
  console.log(`\nstories: ${storyCount} base64 (${(storyBytes / 1e6).toFixed(1)} MB)${APPLY ? `, ${storyFailed} failed` : ''}`);

  // 2. Highlights — reuse the story's new URL when the cover was a copy of it
  const highlights = db.collection('highlights');
  let hlCount = 0, hlFailed = 0;
  for await (const h of highlights.find({ coverImage: /^data:/ }, { projection: { coverImage: 1 } })) {
    hlCount++;
    if (!APPLY) continue;
    try {
      const url = await uploadDataUri(h.coverImage, 'merisamaj/highlights', 'auto');
      await highlights.updateOne({ _id: h._id }, { $set: { coverImage: url } });
    } catch (e) {
      hlFailed++;
      console.warn(`  highlight ${h._id} failed: ${e.message}`);
    }
  }
  console.log(`highlights: ${hlCount} base64 covers${APPLY ? `, ${hlFailed} failed` : ''}`);

  // 3. Broken Bing links in app content
  const appcontents = db.collection('appcontents');
  for (const doc of await appcontents.find({}).toArray()) {
    const unset = {};
    const walk = (v, path) => {
      if (isBrokenImageLink(v)) unset[path] = v;
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
    };
    walk(doc, '');
    const paths = Object.keys(unset);
    if (!paths.length) continue;
    paths.forEach(p => console.log(`appcontents ${doc._id} ${p}  (was ${unset[p].slice(0, 80)}...)`));
    if (APPLY) {
      await appcontents.updateOne({ _id: doc._id }, { $set: Object.fromEntries(paths.map(p => [p, ''])) });
    }
  }

  await mongoose.disconnect();
  console.log('done');
})().catch((e) => { console.error(e); process.exit(1); });
