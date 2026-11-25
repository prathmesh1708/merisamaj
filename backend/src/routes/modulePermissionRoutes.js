const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ctrl = require('../controllers/modulePermissionController');

const validUserId = (req, res, next) =>
  mongoose.Types.ObjectId.isValid(req.params.userId)
    ? next()
    : res.status(400).json({ status: 'error', message: 'Invalid user id.' });

// /me stays open: every Head-panel screen uses it to know which modules it may show.
// Managing others' modules needs the "Module Permissions" module (the admin can
// switch it off per account; Master Admin always passes).
const { requireHeadModule } = require('../middleware/requireHeadModule');
const canManageModules = requireHeadModule('modulePermissions');

router.get('/me', ctrl.getMyModules);
router.get('/assignable', canManageModules, ctrl.getAssignable);
router.get('/subordinates', canManageModules, ctrl.getSubordinates);
router.put('/users/:userId', canManageModules, validUserId, ctrl.assignModules);
router.get('/audit', canManageModules, ctrl.getAuditLog);

module.exports = router;
