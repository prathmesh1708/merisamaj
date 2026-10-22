const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ctrl = require('../controllers/modulePermissionController');

const validUserId = (req, res, next) =>
  mongoose.Types.ObjectId.isValid(req.params.userId)
    ? next()
    : res.status(400).json({ status: 'error', message: 'Invalid user id.' });

router.get('/me', ctrl.getMyModules);
router.get('/assignable', ctrl.getAssignable);
router.get('/subordinates', ctrl.getSubordinates);
router.put('/users/:userId', validUserId, ctrl.assignModules);
router.get('/audit', ctrl.getAuditLog);

module.exports = router;
