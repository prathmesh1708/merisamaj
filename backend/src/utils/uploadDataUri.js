const cloudinary = require('cloudinary').v2;
const config = require('../config/config');

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret
});

/**
 * Upload a base64 `data:` URI to Cloudinary and return the hosted URL.
 * Anything that isn't a data URI (already a URL) is returned unchanged.
 * Storing raw base64 in Mongo makes every list response megabytes large,
 * so callers should always pass media through this before saving.
 */
const uploadDataUri = async (value, folder, resourceType = 'auto') => {
  if (typeof value !== 'string' || !value.startsWith('data:')) return value;
  // Trust the file's own MIME type over the caller's label (videos have been saved as 'image')
  if (value.startsWith('data:video/')) resourceType = 'video';
  const res = await cloudinary.uploader.upload(value, {
    folder,
    resource_type: resourceType,
    ...(resourceType === 'video' ? {} : { quality: 'auto:good' })
  });
  return res.secure_url;
};

const isVideoDataUri = (value) => typeof value === 'string' && value.startsWith('data:video/');

module.exports = { uploadDataUri, isVideoDataUri };
