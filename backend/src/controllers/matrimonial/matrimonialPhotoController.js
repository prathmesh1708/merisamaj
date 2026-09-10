/**
 * matrimonialPhotoController.js
 * Handles photo upload, deletion, set primary, and moderation.
 */
const MatrimonialProfile = require('../../models/MatrimonialProfile');
const MatrimonialSettings = require('../../models/MatrimonialSettings');

// ─── Upload Photos ────────────────────────────────────────────────────────────
exports.uploadPhotos = async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id, isDeleted: false });
    if (!profile) {
      return res.status(404).json({ status: 'error', message: 'Profile not found. Create your profile first.' });
    }

    const settings = await MatrimonialSettings.findOne().lean();
    const maxPhotos = settings?.maxPhotoUpload || 6;

    const existingApproved = profile.photos.filter(p => !p.isDeleted);
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No photos provided.' });
    }

    if (existingApproved.length + req.files.length > maxPhotos) {
      return res.status(400).json({
        status: 'error',
        message: `You can upload a maximum of ${maxPhotos} photos. Currently have ${existingApproved.length}.`
      });
    }

    const newPhotos = req.files.map((file, i) => {
      let url, publicId;

      if (file.path) {
        // Cloudinary upload — file.path is the secure_url
        url = file.path;
        publicId = file.filename;
      } else if (file.buffer) {
        // Memory storage fallback — convert to base64 data URL
        const base64 = file.buffer.toString('base64');
        url = `data:${file.mimetype};base64,${base64}`;
        publicId = null;
      } else {
        url = file.path || '';
        publicId = null;
      }

      return {
        url,
        publicId,
        isPrimary: existingApproved.length === 0 && i === 0, // First photo is primary if no photos exist
        isVerified: true,
        status: 'approved',
        uploadedAt: new Date()
      };
    });

    profile.photos.push(...newPhotos);
    profile.updatedBy = req.user._id;
    await profile.save();

    res.status(201).json({
      status: 'success',
      message: `${newPhotos.length} photo(s) uploaded successfully.`,
      data: { photos: profile.photos }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Set Primary Photo ────────────────────────────────────────────────────────
exports.setPrimaryPhoto = async (req, res) => {
  try {
    const { photoId } = req.params;
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id, isDeleted: false });
    if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found.' });

    const photo = profile.photos.id(photoId);
    if (!photo) return res.status(404).json({ status: 'error', message: 'Photo not found.' });

    if (photo.status !== 'approved') {
      return res.status(400).json({ status: 'error', message: 'Only approved photos can be set as primary.' });
    }

    // Unset all primaries, then set selected
    profile.photos.forEach(p => { p.isPrimary = false; });
    photo.isPrimary = true;
    profile.updatedBy = req.user._id;
    await profile.save();

    res.json({ status: 'success', message: 'Primary photo updated.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Delete Photo ─────────────────────────────────────────────────────────────
exports.deletePhoto = async (req, res) => {
  try {
    const { photoId } = req.params;
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id, isDeleted: false });
    if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found.' });

    const photoIndex = profile.photos.findIndex(p => p._id.toString() === photoId);
    if (photoIndex === -1) return res.status(404).json({ status: 'error', message: 'Photo not found.' });

    const wasDeleted = profile.photos[photoIndex];

    // If primary, make next photo primary
    if (wasDeleted.isPrimary) {
      const nextPhoto = profile.photos.find((p, i) => i !== photoIndex && p.status === 'approved');
      if (nextPhoto) nextPhoto.isPrimary = true;
    }

    profile.photos.splice(photoIndex, 1);
    profile.updatedBy = req.user._id;

    // Optionally delete from Cloudinary if publicId exists
    if (wasDeleted.publicId && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        const cloudinary = require('cloudinary').v2;
        await cloudinary.uploader.destroy(wasDeleted.publicId);
      } catch (cloudErr) {
        console.error('[Photo Delete] Cloudinary deletion failed:', cloudErr.message);
      }
    }

    await profile.save();
    res.json({ status: 'success', message: 'Photo deleted.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Get Photos ───────────────────────────────────────────────────────────────
exports.getPhotos = async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id, isDeleted: false }).select('photos');
    if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found.' });
    res.json({ status: 'success', data: { photos: profile.photos } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
