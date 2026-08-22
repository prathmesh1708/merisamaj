const express = require('express');
const router = express.Router();
const headLocalCommunityController = require('../../controllers/head/headLocalCommunityController');
const { authorize } = require('../../middleware/authMiddleware');

// Local Head accounts are managed exclusively by the Community Head (and Admin) —
// Local Heads themselves cannot create/view other Local Head accounts.
const headOrAdmin = authorize('head', 'admin', 'super_admin', 'master_admin');

router.get('/community-users', headOrAdmin, headLocalCommunityController.getCommunityUsers);
router.get('/local-heads', headOrAdmin, headLocalCommunityController.getLocalHeads);
router.post('/local-heads', headOrAdmin, headLocalCommunityController.createLocalHead);
router.put('/local-heads/:id', headOrAdmin, headLocalCommunityController.updateLocalHead);
router.patch('/local-heads/:id/status', headOrAdmin, headLocalCommunityController.toggleLocalHeadStatus);
router.delete('/local-heads/:id', headOrAdmin, headLocalCommunityController.deleteLocalHead);

module.exports = router;
