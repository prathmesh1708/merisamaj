const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const AppContent = require('../models/AppContent');

const saveBase64ToFile = (dataUri, prefix, communityId) => {
  if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:')) return null;
  const matches = dataUri.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return null;

  const mime = matches[1];
  const ext = mime.split('/')[1] || 'jpg';
  const buffer = Buffer.from(matches[2], 'base64');

  const uploadDir = path.join(__dirname, '../../uploads/banners');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filename = `${prefix}_${communityId}_${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
  return `/uploads/banners/${filename}`;
};

async function cleanAppContent() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.');

  const docs = await AppContent.find({});
  console.log(`Found ${docs.length} AppContent documents.`);

  let totalFreed = 0;

  for (const doc of docs) {
    let modified = false;
    const commId = doc.communityId ? doc.communityId.toString() : doc._id.toString();

    // 1. Hero banner
    if (doc.heroBanner?.backgroundImage && doc.heroBanner.backgroundImage.startsWith('data:') && doc.heroBanner.backgroundImage.length > 1000) {
      const oldLen = doc.heroBanner.backgroundImage.length;
      const fileUrl = saveBase64ToFile(doc.heroBanner.backgroundImage, 'hero', commId);
      if (fileUrl) {
        console.log(`Saved hero banner for community ${commId} to ${fileUrl} (was ${oldLen} chars)`);
        doc.heroBanner.backgroundImage = fileUrl;
        totalFreed += oldLen - fileUrl.length;
        modified = true;
      }
    }

    // 2. Footer artwork
    if (doc.footerArtwork?.backgroundImage && doc.footerArtwork.backgroundImage.startsWith('data:') && doc.footerArtwork.backgroundImage.length > 1000) {
      const oldLen = doc.footerArtwork.backgroundImage.length;
      const fileUrl = saveBase64ToFile(doc.footerArtwork.backgroundImage, 'footer', commId);
      if (fileUrl) {
        console.log(`Saved footer artwork for community ${commId} to ${fileUrl} (was ${oldLen} chars)`);
        doc.footerArtwork.backgroundImage = fileUrl;
        totalFreed += oldLen - fileUrl.length;
        modified = true;
      }
    }

    if (modified) {
      doc.markModified('heroBanner');
      doc.markModified('footerArtwork');
      await doc.save();
      console.log(`Updated AppContent doc ${doc._id}`);
    }
  }

  console.log(`\nCleanup complete! Total freed from MongoDB AppContent: ${(totalFreed / 1024).toFixed(2)} KB (${totalFreed} bytes)`);
  await mongoose.disconnect();
}

cleanAppContent().catch(err => {
  console.error('Error cleaning AppContent:', err);
  process.exit(1);
});
