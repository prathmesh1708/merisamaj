const express = require('express');
const router = express.Router();
const {
  createInvitation,
  getInvitations,
  getInvitationById,
  updateRSVP,
  deleteInvitation,
  updateInvitation,
  trackInvitationOpened
} = require('../../controllers/member/invitationController');
// Routes are protected at the parent level in routes/index.js
const upload = require('../../middleware/uploadMiddleware');

router.route('/')
  .get(getInvitations)
  // Accept multiple images with the field name 'images'
  .post(upload.array('images', 5), createInvitation);

router.route('/:id')
  .get(getInvitationById)
  .put(upload.array('images', 5), updateInvitation)
  .delete(deleteInvitation);

router.route('/:id/rsvp')
  .put(updateRSVP);

router.route('/:id/open')
  .post(trackInvitationOpened);

module.exports = router;
