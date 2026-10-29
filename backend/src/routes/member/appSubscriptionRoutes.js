const express = require('express');
const router  = express.Router();
const subCtrl = require('../../controllers/matrimonial/matrimonialSubscriptionController');

// App-wide membership plans (Social & more). Same purchase flow as matrimonial plans,
// limited to plans of type 'app'.
router.use((req, res, next) => { req.planType = 'app'; next(); });

router.get('/plans',     subCtrl.listPlans);
router.get('/me',        subCtrl.getMySubscription);
router.get('/overview',  subCtrl.getAppOverview);
router.get('/permissions', subCtrl.getAppPermissions);
router.post('/purchase', subCtrl.initiatePurchase);
router.post('/verify',   subCtrl.verifyAndActivate);
router.post('/cancel',   subCtrl.cancelSubscription);

module.exports = router;
