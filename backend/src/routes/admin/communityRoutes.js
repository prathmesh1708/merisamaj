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
} = require('../../controllers/admin/communityController');

// Secure all endpoints under /admin/communities with Admin Auth
router.use(protect);
router.use(authorize('admin'));

// GET  /api/v1/admin/communities
router.get('/', getCommunities);

// POST /api/v1/admin/communities
router.post('/', createCommunity);

// GET  /api/v1/admin/communities/:id
router.get('/:id', getCommunityById);

// PUT  /api/v1/admin/communities/:id
router.put('/:id', updateCommunity);

// PATCH /api/v1/admin/communities/:id/toggle-status
router.patch('/:id/toggle-status', toggleCommunityStatus);

// DELETE /api/v1/admin/communities/:id
router.delete('/:id', deleteCommunity);

// PUT    /api/v1/admin/communities/:id/assign-head  → Assign head (atomic)
router.put('/:id/assign-head', assignHead);

// DELETE /api/v1/admin/communities/:id/assign-head  → Remove head (atomic)
router.delete('/:id/assign-head', removeHead);

// ── Sub-Communities (drill-down under a Community) ──────────────────────────
// GET    /api/v1/admin/communities/:id/sub-communities            → list with real member/location stats
router.get('/:id/sub-communities', getSubCommunityStats);
// POST   /api/v1/admin/communities/:id/sub-communities            → add one
router.post('/:id/sub-communities', addSubCommunity);
// PATCH  /api/v1/admin/communities/:id/sub-communities/:subId     → rename one
router.patch('/:id/sub-communities/:subId', renameSubCommunity);
// PATCH  /api/v1/admin/communities/:id/sub-communities/:subId/toggle → activate/deactivate one
router.patch('/:id/sub-communities/:subId/toggle', toggleSubCommunityStatus);
// DELETE /api/v1/admin/communities/:id/sub-communities/:subId     → delete one
router.delete('/:id/sub-communities/:subId', deleteSubCommunity);

module.exports = router;
