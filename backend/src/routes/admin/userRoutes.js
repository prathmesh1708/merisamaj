const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/admin/userManagementController');
const aadhaarCtrl = require('../../controllers/admin/adminAadhaarController');
const { authorize } = require('../../middleware/authMiddleware');

// Stats endpoint first (before /:id to avoid conflict)
router.get('/stats', ctrl.getUserStats);
router.get('/filter-options', ctrl.getUserFilterOptions);

// CRUD
router.get('/', ctrl.getUsers);
router.get('/:id', ctrl.getUserById);

// Full Aadhaar details + photo: Admins only — admin sub-heads get 403. Every read is audit-logged.
router.get('/:id/aadhaar', authorize('admin_only'), aadhaarCtrl.getUserAadhaar);
router.get('/:id/aadhaar/photo', authorize('admin_only'), aadhaarCtrl.getUserAadhaarPhoto);
router.put('/:id', ctrl.updateUser);
router.delete('/:id', ctrl.deleteUser);

// Status actions
router.patch('/:id/verify', ctrl.verifyUser);
router.patch('/:id/suspend', ctrl.suspendUser);
router.patch('/:id/block', ctrl.blockUser);
router.patch('/:id/activate', ctrl.activateUser);

// Head assignment action
router.post('/:id/assign-head', ctrl.assignHeadToUserCommunity);

module.exports = router;
