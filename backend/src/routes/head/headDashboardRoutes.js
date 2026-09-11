const express = require('express');
const router = express.Router();
const headDashboardCtrl = require('../../controllers/head/headDashboardController');
const { protect, authorize } = require('../../middleware/authMiddleware');

router.use(protect);

// GET /api/v1/head/dashboard/stats — View stats (Head, Sub-Head, Admins)
router.get('/stats', authorize('head', 'sub_head', 'admin', 'super_admin', 'master_admin'), headDashboardCtrl.getDashboardStats);

// Member verification actions — Available to Head, Sub-Head (Local Head), and Admins
router.patch('/members/:id/approve', authorize('head', 'sub_head', 'admin', 'super_admin', 'master_admin'), headDashboardCtrl.approveMember);
router.patch('/members/:id/reject', authorize('head', 'sub_head', 'admin', 'super_admin', 'master_admin'), headDashboardCtrl.rejectMember);
router.patch('/members/:id/revoke', authorize('head', 'sub_head', 'admin', 'super_admin', 'master_admin'), headDashboardCtrl.revokeMember);
router.post('/members/bulk-action', authorize('head', 'sub_head', 'admin', 'super_admin', 'master_admin'), headDashboardCtrl.bulkMemberAction);

// Community Banner Update — Scoped to req.communityId
router.put('/community/banner', authorize('head', 'sub_head', 'admin', 'super_admin', 'master_admin'), headDashboardCtrl.updateCommunityBanner);

// Community Profile details (including accountDetails) — Scoped to req.communityId
router.get('/community/details', authorize('head', 'sub_head', 'admin', 'super_admin', 'master_admin'), headDashboardCtrl.getCommunityDetails);
router.put('/community/account-details', authorize('head', 'admin', 'super_admin', 'master_admin'), headDashboardCtrl.updateCommunityAccountDetails);

module.exports = router;
