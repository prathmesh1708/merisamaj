const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/admin/userManagementController');

// Stats endpoint first (before /:id to avoid conflict)
router.get('/stats', ctrl.getUserStats);

// CRUD
router.get('/', ctrl.getUsers);
router.get('/:id', ctrl.getUserById);
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
