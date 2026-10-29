/**
 * matrimonialPhotoBlur.js
 * Private profiles show a BLURRED photo to members who aren't connected yet. A CSS blur
 * is not enough (the clear image URL would still be in the API response), so we store a
 * separate, already-blurred copy on Cloudinary under its own random id. Only that copy's
 * URL is sent; the clear photo's URL never reaches those members.
 *
 * Copies are made the first time they're needed and saved on the photo (blurredUrl,
 * blurLevel). Changing BLUR_STRENGTH re-makes older copies the next time they're shown.
 */
const MatrimonialProfile = require('../models/MatrimonialProfile');
const { isPhotoPrivate, primaryPhotoOf } = require('../middleware/matrimonialPrivacy');

const cloudinaryReady = () =>
  !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

// Cloudinary blur strength, 1–2000. 400 = a soft blur (20% of the maximum).
const BLUR_STRENGTH = 400;

const inFlight = new Map(); // photoId -> Promise<{ url, publicId } | null>

const getCloudinary = () => {
  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  return cloudinary;
};

const makeBlurredCopy = async (photoUrl) => {
  const cloudinary = getCloudinary();
  const res = await cloudinary.uploader.upload(photoUrl, {
    folder: 'merisamaj/matrimonial_blurred',
    transformation: [
      { width: 600, height: 800, crop: 'limit' },
      { effect: `blur:${BLUR_STRENGTH}` },
      { quality: 'auto:low' }
    ]
  });
  return { url: res.secure_url, publicId: res.public_id };
};

/**
 * Make sure every PRIVATE profile in `profiles` has a blurred copy of its primary photo
 * (public ones too with includePublic, for viewers whose plan has no photo access).
 * Mutates the given objects (so the privacy builders see blurredUrl) and saves new copies.
 * Never throws: a profile whose copy can't be made simply shows no photo.
 */
const ensureBlurredPhotos = async (profiles, { includePublic = false } = {}) => {
  if (!cloudinaryReady()) return;
  const jobs = [];
  for (const profile of profiles || []) {
    if (!profile || (!includePublic && !isPhotoPrivate(profile))) continue;
    const photo = primaryPhotoOf(profile);
    if (!photo || !photo.url || !/^https?:\/\//.test(photo.url)) continue;
    if (photo.blurredUrl && photo.blurLevel === BLUR_STRENGTH) continue;
    const outdated = photo.blurredUrl ? { blurredPublicId: photo.blurredPublicId } : null;

    const key = String(photo._id);
    if (!inFlight.has(key)) {
      inFlight.set(key, (async () => {
        try {
          const copy = await makeBlurredCopy(photo.url);
          await MatrimonialProfile.updateOne(
            { _id: profile._id, 'photos._id': photo._id },
            { $set: { 'photos.$.blurredUrl': copy.url, 'photos.$.blurredPublicId': copy.publicId, 'photos.$.blurLevel': BLUR_STRENGTH } }
          );
          if (outdated) deleteBlurredCopy(outdated); // the copy made at the old strength
          return copy;
        } catch (err) {
          console.warn('[PhotoBlur] could not blur photo', key, err.message);
          return null;
        } finally {
          setTimeout(() => inFlight.delete(key), 60 * 1000);
        }
      })());
    }
    jobs.push(inFlight.get(key).then(copy => {
      if (copy) { photo.blurredUrl = copy.url; photo.blurredPublicId = copy.publicId; photo.blurLevel = BLUR_STRENGTH; }
    }));
  }
  await Promise.all(jobs);
};

/** Delete a photo's blurred copy from Cloudinary (when the photo itself is deleted). */
const deleteBlurredCopy = async (photo) => {
  if (!photo?.blurredPublicId || !cloudinaryReady()) return;
  try {
    await getCloudinary().uploader.destroy(photo.blurredPublicId, { invalidate: true });
  } catch (err) {
    console.warn('[PhotoBlur] could not delete blurred copy', err.message);
  }
};

module.exports = { ensureBlurredPhotos, deleteBlurredCopy };
