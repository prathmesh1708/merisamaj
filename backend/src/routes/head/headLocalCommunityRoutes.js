const express = require('express');
const router = express.Router();
const headLocalCommunityController = require('../../controllers/head/headLocalCommunityController');
const headLocationGroupController = require('../../controllers/head/headLocationGroupController');
const { authorize } = require('../../middleware/authMiddleware');
const upload = require('../../middleware/uploadMiddleware');

// Local Head accounts are managed exclusively by the Community Head (and Admin) —
// Local Heads themselves cannot create/view other Local Head accounts.
const headOrAdmin = authorize('head', 'admin', 'super_admin', 'master_admin');

router.get('/community-users', headOrAdmin, headLocalCommunityController.getCommunityUsers);
router.get('/local-heads', headOrAdmin, headLocalCommunityController.getLocalHeads);
router.post('/local-heads', headOrAdmin, upload.uploadProfileMedia, headLocalCommunityController.createLocalHead);
router.put('/local-heads/:id', headOrAdmin, headLocalCommunityController.updateLocalHead);
router.patch('/local-heads/:id/status', headOrAdmin, headLocalCommunityController.toggleLocalHeadStatus);
router.delete('/local-heads/:id', headOrAdmin, headLocalCommunityController.deleteLocalHead);

// Location → Group matrix for the head panel (pinned to the caller's own community;
// Local Heads only see their city and can only edit their own group)
const headOrLocalHead = authorize('head', 'sub_head', 'admin', 'super_admin', 'master_admin');
router.get('/structure', headOrLocalHead, headLocationGroupController.getStructure);
router.get('/sub-communities/:subName/locations', headOrLocalHead, headLocationGroupController.getLocations);
router.post('/sub-communities/:subName/assign-head', headOrLocalHead, upload.uploadProfileMedia, headLocationGroupController.assignHead);
router.patch('/groups/:groupName', headOrLocalHead, headLocationGroupController.updateGroup);

module.exports = router;
