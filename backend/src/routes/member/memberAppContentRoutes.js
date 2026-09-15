const express = require('express');
const router = express.Router();
const memberAppContentController = require('../../controllers/member/memberAppContentController');
const { optionalProtect } = require('../../middleware/authMiddleware');

// GET /api/v1/member/app-content — Get active dynamic home page customization
router.get('/', optionalProtect, memberAppContentController.getMemberAppContent);

module.exports = router;

