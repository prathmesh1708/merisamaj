const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../middleware/authMiddleware');
const {
  getCommunities,
  getCommunityById,
  createCommunity,
  updateCommunity,
  assignHead,
  removeHead,
  deleteCommunity,
  toggleCommunityStatus,
  getSubCommunityStats,
  addSubCommunity,
  renameSubCommunity,
  toggleSubCommunityStatus,
  deleteSubCommunity,
  getSubCommunityLocationBreakdown,
  assignLocalHeadToLocationGroup,
} = require('../../controllers/admin/communityController');

// Secure admin endpoints, allowing 'admin' and 'head' roles where appropriate
router.use(protect);

// GET  /api/v1/admin/communities
router.get('/', authorize('admin', 'head'), getCommunities);

// POST /api/v1/admin/communities
router.post('/', authorize('admin'), createCommunity);

// GET  /api/v1/admin/communities/:id
router.get('/:id', authorize('admin', 'head'), getCommunityById);

// PUT  /api/v1/admin/communities/:id
router.put('/:id', authorize('admin'), updateCommunity);

// PATCH /api/v1/admin/communities/:id/toggle-status
router.patch('/:id/toggle-status', authorize('admin'), toggleCommunityStatus);

// DELETE /api/v1/admin/communities/:id
router.delete('/:id', authorize('admin'), deleteCommunity);

// PUT    /api/v1/admin/communities/:id/assign-head  → Assign head (atomic)
router.put('/:id/assign-head', authorize('admin'), assignHead);

// DELETE /api/v1/admin/communities/:id/assign-head  → Remove head (atomic)
router.delete('/:id/assign-head', authorize('admin'), removeHead);

// ── Sub-Communities (drill-down under a Community) ──────────────────────────
// GET    /api/v1/admin/communities/:id/sub-communities            → list with real member/location stats
router.get('/:id/sub-communities', authorize('admin', 'head'), getSubCommunityStats);
// POST   /api/v1/admin/communities/:id/sub-communities            → add one
router.post('/:id/sub-communities', authorize('admin', 'head'), addSubCommunity);
// PATCH  /api/v1/admin/communities/:id/sub-communities/:subId     → rename one
router.patch('/:id/sub-communities/:subId', authorize('admin', 'head'), renameSubCommunity);
// PATCH  /api/v1/admin/communities/:id/sub-communities/:subId/toggle → activate/deactivate one
router.patch('/:id/sub-communities/:subId/toggle', authorize('admin', 'head'), toggleSubCommunityStatus);
// DELETE /api/v1/admin/communities/:id/sub-communities/:subId     → delete one
router.delete('/:id/sub-communities/:subId', authorize('admin'), deleteSubCommunity);

// GET    /api/v1/admin/communities/:id/sub-communities/:subName/locations → detailed location breakdown with real Local Heads
router.get('/:id/sub-communities/:subName/locations', authorize('admin', 'head'), getSubCommunityLocationBreakdown);
// POST   /api/v1/admin/communities/:id/sub-communities/:subName/assign-head → assign/create local head or sub-head
router.post('/:id/sub-communities/:subName/assign-head', authorize('admin', 'head'), assignLocalHeadToLocationGroup);

module.exports = router;

