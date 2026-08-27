const express = require('express');
const router = express.Router();
const memberAppContentController = require('../../controllers/member/memberAppContentController');
const { protect } = require('../../middleware/authMiddleware');

// GET /api/v1/member/app-content — Get active dynamic home page customization
router.get('/', protect, memberAppContentController.getMemberAppContent);

module.exports = router;
