const express = require('express');
const router  = express.Router();
const adminMatCtrl = require('../../controllers/admin/adminMatrimonialController');
const adminSuccessStoryCtrl = require('../../controllers/admin/adminSuccessStoryController');

// ─── Stats & Analytics ────────────────────────────────────────────────────────
router.get('/stats',      adminMatCtrl.getStats);
router.get('/analytics',  adminMatCtrl.getAnalytics);

// ─── Profile Management ───────────────────────────────────────────────────────
router.get('/profiles',                    adminMatCtrl.listProfiles);
router.put('/profiles/:id/verify',         adminMatCtrl.verifyProfile);

// ─── Photo Moderation ─────────────────────────────────────────────────────────
router.get('/photos/pending',              adminMatCtrl.listPendingPhotos);
router.put('/photos/:profileId/:photoId',  adminMatCtrl.moderatePhoto);

// ─── Reports ─────────────────────────────────────────────────────────────────
router.get('/reports',         adminMatCtrl.listReports);
router.put('/reports/:id',     adminMatCtrl.actionReport);

// ─── Subscription Plans ───────────────────────────────────────────────────────
router.get('/subscriptions',   adminMatCtrl.listSubscriptions);
router.get('/plans',           adminMatCtrl.listPlans);
router.post('/plans',          adminMatCtrl.createPlan);
router.post('/plans/grant',    adminMatCtrl.grantSubscription);  // Static must come before /:id
router.put('/plans/:id',       adminMatCtrl.updatePlan);
router.delete('/plans/:id',    adminMatCtrl.deletePlan);

// ─── Settings ─────────────────────────────────────────────────────────────────
router.get('/settings',        adminMatCtrl.getSettings);
router.put('/settings',        adminMatCtrl.updateSettings);

// ─── Success Stories ──────────────────────────────────────────────────────────
router.get('/success-stories',              adminSuccessStoryCtrl.getAllStories);
router.get('/success-stories/eligible',     adminSuccessStoryCtrl.getEligibleCouples);
router.post('/success-stories',             adminSuccessStoryCtrl.createStory);
router.post('/success-stories/upload-image', require('../../middleware/uploadMiddleware').single('image'), adminSuccessStoryCtrl.uploadStoryImage);
router.put('/success-stories/:id',          adminSuccessStoryCtrl.updateStory);
router.delete('/success-stories/:id',       adminSuccessStoryCtrl.deleteStory);
router.put('/success-stories/:id/publish',  adminSuccessStoryCtrl.publishStory);
router.put('/success-stories/:id/archive',  adminSuccessStoryCtrl.archiveStory);
router.put('/success-stories/:id/feature',  adminSuccessStoryCtrl.toggleFeature);

// ─── Marriage Lifecycle ────────────────────────────────────────────────────────
router.get('/marriage-requests',            adminMatCtrl.listMarriageRequests);
router.put('/profiles/:id/close',           adminMatCtrl.adminCloseProfile);
router.put('/profiles/:id/reopen',          adminMatCtrl.adminReopenProfile);

module.exports = router;
