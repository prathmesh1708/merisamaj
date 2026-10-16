const express = require('express');
const router  = express.Router();

const interestCtrl = require('../../../controllers/matrimonial/matrimonialInterestController');
const { checkInterestLimit } = require('../../../middleware/subscriptionMiddleware');

router.post('/send',              checkInterestLimit, interestCtrl.sendInterest);
router.post('/accept/:id',        interestCtrl.acceptInterest);
router.post('/reject/:id',        interestCtrl.rejectInterest);
router.post('/cancel/:id',        interestCtrl.cancelInterest);
router.get('/sent',               interestCtrl.getSentInterests);
router.get('/received',           interestCtrl.getReceivedInterests);
router.get('/declined',           interestCtrl.getDeclinedInterests);

module.exports = router;
