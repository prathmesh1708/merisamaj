const express = require('express');
const router = express.Router();
const headSubHeadController = require('../../controllers/head/headSubHeadController');
const { authorizeModule } = require('../../middleware/authorizeModule');
const { authorize } = require('../../middleware/authMiddleware');

router.use(authorize('head', 'sub_head', 'admin'));
router.use(authorizeModule('canManageSubHeads'));

router.route('/')
  .get(headSubHeadController.getSubHeads)
  .post(headSubHeadController.createSubHead);

router.route('/:id')
  .put(headSubHeadController.updateSubHead)
  .delete(headSubHeadController.deleteSubHead);

router.patch('/:id/status', headSubHeadController.toggleSubHeadStatus);

module.exports = router;
