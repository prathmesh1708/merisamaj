const express = require('express');
const router = express.Router();
const headFamilyController = require('../../controllers/head/headFamilyController');
const { authorize } = require('../../middleware/authMiddleware');

// Local Heads review their city's family additions first, then the Community Head gives final approval
const reviewers = authorize('head', 'sub_head', 'admin', 'super_admin', 'master_admin');

// GET /api/v1/head/family-requests/stats — Families, Active / Inactive / Dummy members, Jangana count
router.get('/stats', reviewers, headFamilyController.getStats);

// GET /api/v1/head/family-requests?status=pending|approved|rejected|all
router.get('/', reviewers, headFamilyController.getRequests);

// PATCH /api/v1/head/family-requests/:id  { action: 'approve' | 'reject', note }
router.patch('/:id', reviewers, headFamilyController.reviewRequest);

module.exports = router;
