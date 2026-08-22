const express = require('express');
const router = express.Router();
const appShortcutController = require('../../controllers/appShortcutController');
const upload = require('../../middleware/uploadMiddleware');

// Admin CRUD & Icon upload routes
router.get('/', appShortcutController.getAllAdminShortcuts);
router.put('/:id', appShortcutController.updateShortcut);
router.post('/:id/icon', upload.single('icon'), appShortcutController.uploadShortcutIcon);
router.post('/:id/reset', appShortcutController.resetShortcutToPreset);

module.exports = router;
