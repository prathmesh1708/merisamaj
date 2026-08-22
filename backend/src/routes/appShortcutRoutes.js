const express = require('express');
const router = express.Router();
const appShortcutController = require('../controllers/appShortcutController');

// Public route for Member App
router.get('/', appShortcutController.getPublicShortcuts);

module.exports = router;
