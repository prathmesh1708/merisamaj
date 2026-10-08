const express = require('express');
const router = express.Router();
const {
  createInvitation,
  getInvitations,
  getInvitationById,
  updateRSVP,
  deleteInvitation,
  updateInvitation,
  cancelInvitation,
  trackInvitationOpened
} = require('../../controllers/member/invitationController');
// Routes are protected at the parent level in routes/index.js
const upload = require('../../middleware/uploadMiddleware');
const multer = require('multer');

// Invitation photos: up to 5 images (JPG / PNG / WEBP, 5MB each), with clear errors.
const MAX_INVITATION_PHOTOS = 5;
const invitationPhotos = (req, res, next) => {
  upload.array('images', MAX_INVITATION_PHOTOS)(req, res, (err) => {
    if (!err) return next();
    let message = err.message || 'Photo upload failed.';
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') message = `You can upload up to ${MAX_INVITATION_PHOTOS} photos per invitation.`;
      else if (err.code === 'LIMIT_FILE_SIZE') message = 'Each photo must be smaller than 5MB.';
    }
    console.error('[Invitation upload]', err.code || '', err.message);
    return res.status(400).json({ status: 'error', message });
  });
};

router.route('/')
  .get(getInvitations)
  // Accept multiple images with the field name 'images'
  .post(invitationPhotos, createInvitation);

router.route('/:id')
  .get(getInvitationById)
  .put(invitationPhotos, updateInvitation)
  .delete(deleteInvitation);

router.route('/:id/cancel')
  .put(cancelInvitation);

router.route('/:id/rsvp')
  .put(updateRSVP);

router.route('/:id/open')
  .post(trackInvitationOpened);

module.exports = router;
