const express = require('express');
const router = express.Router();
const headSubHeadController = require('../../controllers/head/headSubHeadController');
const { authorizeModule } = require('../../middleware/authorizeModule');
const { authorize } = require('../../middleware/authMiddleware');
const upload = require('../../middleware/uploadMiddleware');

router.use(authorize('head', 'sub_head', 'admin'));
router.use(authorizeModule('canManageSubHeads'));

router.route('/')
  .get(headSubHeadController.getSubHeads)
  .post(upload.uploadProfileMedia, headSubHeadController.createSubHead);

// ── Mantri Mandal (must come before /:id so it isn't captured as an id) ──────
router.get('/mantri-mandal', headSubHeadController.getMyMantriMandal);
router.get('/mantri-mandal/search', headSubHeadController.searchMantriMandalCandidates);
router.post('/mantri-mandal', headSubHeadController.addMantriMandalMember);
router.delete('/mantri-mandal/:userId', headSubHeadController.removeMantriMandalMember);

router.route('/:id')
  .put(upload.uploadProfileMedia, headSubHeadController.updateSubHead)
  .delete(headSubHeadController.deleteSubHead);

router.patch('/:id/status', headSubHeadController.toggleSubHeadStatus);

module.exports = router;
