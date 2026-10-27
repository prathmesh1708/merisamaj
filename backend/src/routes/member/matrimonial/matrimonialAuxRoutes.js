const express = require('express');
const router  = express.Router();

const dashboardCtrl = require('../../../controllers/matrimonial/matrimonialDashboardController');
const modCtrl        = require('../../../controllers/matrimonial/matrimonialModerationController');
const successStoryCtrl   = require('../../../controllers/matrimonial/successStoryController');
const marriageCtrl   = require('../../../controllers/matrimonial/matrimonialMarriageController');
const { checkFeature, attachSubscription } = require('../../../middleware/subscriptionMiddleware');

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', attachSubscription, dashboardCtrl.getDashboard);

// ─── Shortlist ────────────────────────────────────────────────────────────────
router.post('/shortlist',              modCtrl.addToShortlist);
router.delete('/shortlist/:profileId', modCtrl.removeFromShortlist);
router.get('/shortlist',               modCtrl.getShortlist);

// ─── Visitors (Premium Only) ─────────────────────────────────────────────────
router.get('/visitors', checkFeature('visitorHistory'), modCtrl.getMyVisitors);
router.get('/visited',  modCtrl.getMyVisited);   // profiles I visited (my own history)

// ─── Block/Unblock ────────────────────────────────────────────────────────────
router.post('/block',            modCtrl.blockUser);
router.delete('/block/:userId',  modCtrl.unblockUser);
router.get('/blocked',           modCtrl.getBlockedUsers);

// ─── Reports ─────────────────────────────────────────────────────────────────
router.post('/report', modCtrl.reportProfile);

// ─── Marriage Lifecycle ─────────────────────────────────────────────────────────
router.post('/marriage/request',          marriageCtrl.sendMarriageRequest);
router.post('/marriage/respond/:id',      marriageCtrl.respondToMarriageRequest);
router.get('/marriage/requests',          marriageCtrl.getMyMarriageRequests);
router.get('/marriage/status',            marriageCtrl.getMarriageStatus);

// ─── Success Stories ────────────────────────────────────────────────────────
router.get('/success-stories',              successStoryCtrl.getPublishedStories);
router.get('/success-stories/:id',          successStoryCtrl.getStoryDetails);
router.put('/success-stories/request',      successStoryCtrl.updateConsent);

module.exports = router;
