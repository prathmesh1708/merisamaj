/**
 * Moves base64 images embedded in home app content (community and sub-community)
 * to Cloudinary and stores only the URL. One sub-community's content was 3 MB
 * because of this, and every member downloaded it on each home page load.
 * New saves are handled in adminAppContentController (hostEmbeddedImages).
 *
 *   Dry run:  npm run host:app-content-images
 *   Apply:    npm run host:app-content-images -- --apply
 */
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');
const { uploadDataUri } = require('../utils/uploadDataUri');

const APPLY = process.argv.includes('--apply');

const findDataUris = (value, path, out) => {
  if (typeof value === 'string') {
    if (value.startsWith('data:image/')) out.push([path, value]);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => findDataUris(v, `${path}.${i}`, out));
  } else if (value && typeof value === 'object' && !(value instanceof Date) && !(value instanceof mongoose.Types.ObjectId) && value._bsontype !== 'ObjectId') {
    Object.entries(value).forEach(([k, v]) => findDataUris(v, path ? `${path}.${k}` : k, out));
  }
  return out;
};

async function main() {
  if (!config.mongoUri) throw new Error('MONGO_URI is not configured.');
  mongoose.set('autoIndex', false);
  await mongoose.connect(config.mongoUri);
  const db = mongoose.connection.db;

  let docsAffected = 0; let images = 0; let bytes = 0;
  for (const coll of ['appcontents', 'subcommunityappcontents']) {
    const docs = await db.collection(coll).find({}).toArray();
    for (const doc of docs) {
      const found = findDataUris(doc, '', []);
      if (!found.length) continue;
      docsAffected += 1;
      images += found.length;
      bytes += found.reduce((n, [, v]) => n + v.length, 0);
      if (!APPLY) continue;
      const $set = {};
      for (const [path, dataUri] of found) $set[path] = await uploadDataUri(dataUri, 'merisamaj/app-content', 'image');
      await db.collection(coll).updateOne({ _id: doc._id }, { $set });
      console.log(`${coll} ${doc._id}: moved ${found.length} image(s) to Cloudinary`);
    }
  }
  console.log(`${docsAffected} document(s) with ${images} embedded image(s), ${(bytes / 1024 / 1024).toFixed(2)} MB of base64.`);
  if (!APPLY) console.log('Dry run — nothing uploaded or written. Re-run with --apply.');
}

main().catch(error => { console.error('App content image hosting failed:', error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
