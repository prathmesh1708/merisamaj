const express = require('express');
const router  = express.Router();

const interestCtrl = require('../../../controllers/matrimonial/matrimonialInterestController');
const { checkInterestLimit, attachSubscription } = require('../../../middleware/subscriptionMiddleware');

// Super Interests use their own monthly quota (checked in the controller), not the regular limit
const interestLimitUnlessSuper = (req, res, next) =>
  (req.body?.superInterest === true || req.body?.superInterest === 'true' ? attachSubscription : checkInterestLimit)(req, res, next);

router.post('/send',              interestLimitUnlessSuper, interestCtrl.sendInterest);
router.post('/accept/:id',        interestCtrl.acceptInterest);
router.post('/reject/:id',        interestCtrl.rejectInterest);
router.post('/cancel/:id',        interestCtrl.cancelInterest);
router.get('/sent',               interestCtrl.getSentInterests);
router.get('/received',           interestCtrl.getReceivedInterests);
router.get('/declined',           interestCtrl.getDeclinedInterests);

module.exports = router;
