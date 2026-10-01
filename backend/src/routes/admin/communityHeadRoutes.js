const express = require('express');
const { protect, authorize } = require('../../middleware/authMiddleware');
const upload = require('../../middleware/uploadMiddleware');
const communityHeadController = require('../../controllers/admin/communityHeadController');

const router = express.Router();

// Apply middleware to all routes
router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(communityHeadController.getCommunityHeads)
  .post(upload.uploadProfileMedia, communityHeadController.createCommunityHead);

router.route('/stats')
  .get(communityHeadController.getHeadStats);

router.route('/activities')
  .get(communityHeadController.getActivityLogs);

router.route('/:id')
  .get(communityHeadController.getCommunityHeadById)
  .put(upload.uploadProfileMedia, communityHeadController.updateCommunityHead)
  .delete(communityHeadController.deleteCommunityHead);

router.route('/:id/status')
  .patch(communityHeadController.updateHeadStatus);

router.get('/:headId/sub-leaders', communityHeadController.getHeadSubLeaders);

module.exports = router;
