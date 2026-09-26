/**
 * uploadMiddleware.js
 * Centralized file upload middleware using multer + cloudinary.
 * Falls back to memoryStorage (base64 encode) if Cloudinary isn't configured.
 */
const multer = require('multer');
const path   = require('path');

// ─── Allowed File Types ───────────────────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const imageFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, JPG, PNG, and WEBP images are allowed.'), false);
  }
};

// ─── Storage ──────────────────────────────────────────────────────────────────
let storage;

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  try {
    const cloudinary = require('cloudinary').v2;
    const { CloudinaryStorage } = require('multer-storage-cloudinary');

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key:    process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    storage = new CloudinaryStorage({
      cloudinary,
      params: async (req, file) => ({
        folder: `merisamaj/matrimonial/${req.user?._id || 'unknown'}`,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
          { width: 800, height: 1000, crop: 'limit', quality: 'auto:good' }
        ],
        public_id: `photo_${Date.now()}_${Math.round(Math.random() * 1e9)}`
      })
    });

    console.log('[Upload] Cloudinary storage configured');
  } catch (err) {
    console.warn('[Upload] Cloudinary setup failed, falling back to memory:', err.message);
    storage = multer.memoryStorage();
  }
} else {
  // Memory storage — photo stored as buffer, controller must handle base64 encoding
  storage = multer.memoryStorage();
  console.warn('[Upload] No Cloudinary config found — using memory storage (base64 fallback)');
}

// ─── Multer Instances ─────────────────────────────────────────────────────────
const uploadSingle = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_FILE_SIZE }
}).single('photo');

const uploadMultiple = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 6 }
}).array('photos', 6);

// ─── Error Wrapper Middleware ─────────────────────────────────────────────────
const handleUploadError = (uploadFn) => (req, res, next) => {
  uploadFn(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('[Multer Error]:', err.code, err.message);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ status: 'error', message: 'File size must not exceed 15MB.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ status: 'error', message: 'Too many files uploaded.' });
      }
      return res.status(400).json({ status: 'error', message: err.message });
    }
    if (err) {
      console.error('[Upload Middleware Error]:', err.message || err);
      return res.status(400).json({ status: 'error', message: err.message || 'Upload failed.' });
    }
    next();
  });
};

// ─── Raw multer instance (backward-compatible for routes using upload.single()) ──
const rawUpload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});

// Named convenience middleware
const uploadSinglePhoto    = handleUploadError(uploadSingle);
const uploadMultiplePhotos = handleUploadError(uploadMultiple);

const uploadProfileMedia = handleUploadError(
  multer({
    storage,
    fileFilter: imageFilter,
    limits: { fileSize: MAX_FILE_SIZE }
  }).fields([
    { name: 'avatarFile', maxCount: 1 },
    { name: 'avatar', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'coverFile', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ])
);

// ─── Chat Media Upload ────────────────────────────────────────────────────────
// Dedicated storage for chat message images, audio, voice notes & files
let chatStorage = storage;

const chatMediaFilter = (req, file, cb) => {
  // Allow all standard image, audio, video, pdf, doc formats
  if (
    file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('audio/') ||
    file.mimetype.startsWith('video/') ||
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'application/msword' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.mimetype === 'text/plain'
  ) {
    cb(null, true);
  } else {
    // If unknown mimetype, still allow reasonable chat files
    cb(null, true);
  }
};

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  try {
    const cloudinary = require('cloudinary').v2;
    const { CloudinaryStorage } = require('multer-storage-cloudinary');

    chatStorage = new CloudinaryStorage({
      cloudinary,
      params: async (req, file) => ({
        folder: `merisamaj/chat_messages/${req.params.conversationId || 'general'}`,
        resource_type: 'auto',
        public_id: `chat_${Date.now()}_${Math.round(Math.random() * 1e9)}`
      })
    });
  } catch (err) {
    console.warn('[Upload] Chat Cloudinary storage fallback to memory:', err.message);
  }
}

const CHAT_MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const uploadChatImageFn = multer({
  storage: chatStorage,
  fileFilter: chatMediaFilter,
  limits: { fileSize: CHAT_MAX_FILE_SIZE }
}).single('photo');

const uploadChatImage = handleUploadError(uploadChatImageFn);
const uploadChatMedia = uploadChatImage;

// Make module callable as upload.single('field') for backward compat (authRoutes etc.)
module.exports = Object.assign(rawUpload, {
  uploadSinglePhoto,
  uploadMultiplePhotos,
  uploadProfileMedia,
  uploadChatImage,
  uploadChatMedia,
  handleUploadError
});
