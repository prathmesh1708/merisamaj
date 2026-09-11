const express = require('express');
const router = express.Router();
const headNotificationCtrl = require('../../controllers/head/headNotificationController');
const { authorize } = require('../../middleware/authMiddleware');

const headOrAdmin = authorize('head', 'sub_head', 'admin', 'super_admin', 'master_admin');

// Broadcasts & Alerts
router.post('/broadcast', headOrAdmin, headNotificationCtrl.sendHeadBroadcast);
router.get('/broadcasts', headOrAdmin, headNotificationCtrl.getBroadcastHistory);
router.get('/scheduled', headOrAdmin, headNotificationCtrl.getScheduledAlerts);
router.delete('/scheduled/:id', headOrAdmin, headNotificationCtrl.cancelScheduledAlert);

// Notification Templates
router.get('/templates', headOrAdmin, headNotificationCtrl.getTemplates);
router.post('/templates', headOrAdmin, headNotificationCtrl.createTemplate);
router.put('/templates/:id', headOrAdmin, headNotificationCtrl.updateTemplate);
router.delete('/templates/:id', headOrAdmin, headNotificationCtrl.deleteTemplate);

module.exports = router;
