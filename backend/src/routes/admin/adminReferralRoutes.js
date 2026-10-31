const express = require('express');
const router = express.Router();
const adminReferralCtrl = require('../../controllers/admin/adminReferralController');

router.get('/', adminReferralCtrl.getAllReferrals);
router.get('/stats', adminReferralCtrl.getReferralStats);
router.get('/reports', adminReferralCtrl.getReports);
router.get('/config', adminReferralCtrl.getReferralConfig);
router.put('/config', adminReferralCtrl.updateReferralConfig);

// Cash payout requests
router.get('/redemptions', adminReferralCtrl.getRedemptions);
router.get('/redemptions/:id', adminReferralCtrl.getRedemptionDetail);
router.put('/redemptions/:id/approve', adminReferralCtrl.approveRedemption);
router.put('/redemptions/:id/pay', adminReferralCtrl.markRedemptionPaid);
router.put('/redemptions/:id/reject', adminReferralCtrl.rejectRedemption);

module.exports = router;
