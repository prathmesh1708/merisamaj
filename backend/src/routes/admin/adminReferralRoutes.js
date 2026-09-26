const express = require('express');
const router = express.Router();
const adminReferralCtrl = require('../../controllers/admin/adminReferralController');

router.get('/', adminReferralCtrl.getAllReferrals);
router.get('/stats', adminReferralCtrl.getReferralStats);
router.get('/config', adminReferralCtrl.getReferralConfig);
router.put('/config', adminReferralCtrl.updateReferralConfig);

module.exports = router;
