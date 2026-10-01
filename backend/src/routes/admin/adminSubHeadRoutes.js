const express = require('express');
const router = express.Router();
const adminSubHeadController = require('../../controllers/admin/adminSubHeadController');
const { authorizeAdminModule } = require('../../middleware/authorizeModule');
const upload = require('../../middleware/uploadMiddleware');

// All routes require canManageSubHeads (or master admin)
router.use(authorizeAdminModule('canManageSubHeads'));

router.route('/')
  .get(adminSubHeadController.getAdminSubHeads)
  .post(upload.uploadProfileMedia, adminSubHeadController.createAdminSubHead);

router.route('/:id')
  .put(upload.uploadProfileMedia, adminSubHeadController.updateAdminSubHead)
  .delete(adminSubHeadController.deleteAdminSubHead);

router.patch('/:id/status', adminSubHeadController.toggleAdminSubHeadStatus);

module.exports = router;
