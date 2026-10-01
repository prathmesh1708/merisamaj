const fs = require('fs');
const path = require('path');

/**
 * Resolves an uploaded avatar file on `req` (post-multer, via `upload.uploadProfileMedia`)
 * into a stored URL — Cloudinary if configured, otherwise local disk under /uploads/avatars.
 *
 * Accepts either `req.file` (single-field upload) or `req.files.{avatarFile|avatar|photo|image}`
 * (multi-field upload), matching the same field names the self-service profile update
 * endpoint (`authController.updateProfile`) already accepts — kept in sync with that logic
 * so every "create a leadership account" form and the self-service profile page behave the
 * same way for a client uploading a photo.
 *
 * @param {Object} req - Express request object (after multer middleware has run)
 * @param {String} userId - Mongo _id (string) of the user the avatar belongs to — used for
 *   the Cloudinary folder / local filename so photos don't collide between users
 * @returns {Promise<String|null>} the resolved avatar URL, or null if no file was uploaded
 */
const resolveAvatarUpload = async (req, userId) => {
  const avatarFile = req.file
    || req.files?.avatarFile?.[0]
    || req.files?.avatar?.[0]
    || req.files?.photo?.[0]
    || req.files?.image?.[0];

  if (!avatarFile) return null;

  // Cloudinary storage already resolved the file to a hosted URL
  if (avatarFile.path && avatarFile.path.startsWith('http')) {
    return avatarFile.path;
  }

  if (avatarFile.buffer) {
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      try {
        const cloudinary = require('cloudinary').v2;
        const b64 = Buffer.from(avatarFile.buffer).toString('base64');
        const dataURI = `data:${avatarFile.mimetype || 'image/jpeg'};base64,${b64}`;
        const uploadRes = await cloudinary.uploader.upload(dataURI, {
          folder: `merisamaj/avatars/${userId}`,
          transformation: [{ width: 500, height: 500, crop: 'limit', quality: 'auto:good' }]
        });
        return uploadRes.secure_url;
      } catch (cErr) {
        console.warn('[Avatar Cloudinary Error]:', cErr.message);
      }
    }

    // Fallback: local disk storage
    const uploadDir = path.join(__dirname, '../../uploads/avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const ext = avatarFile.mimetype ? (avatarFile.mimetype.split('/')[1] || 'png') : 'png';
    const filename = `avatar_${userId}_${Date.now()}.${ext}`;
    fs.writeFileSync(path.join(uploadDir, filename), avatarFile.buffer);
    return `/uploads/avatars/${filename}`;
  }

  return avatarFile.path || null;
};

module.exports = { resolveAvatarUpload };
