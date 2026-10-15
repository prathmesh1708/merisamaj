const express = require('express');
const router  = express.Router();

const subCtrl = require('../../../controllers/matrimonial/matrimonialSubscriptionController');

router.get('/plans',         subCtrl.listPlans);
router.get('/me',            subCtrl.getMySubscription);
router.get('/history',       subCtrl.getSubscriptionHistory);
router.get('/overview',      subCtrl.getSubscriptionOverview);
router.post('/purchase',     subCtrl.initiatePurchase);
router.post('/verify',       subCtrl.verifyAndActivate);
router.post('/cancel',       subCtrl.cancelSubscription);

module.exports = router;
