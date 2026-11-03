const express = require('express');
const router = express.Router();
const adminReferralCtrl = require('../../controllers/admin/adminReferralController');
const adminDiscountCodeCtrl = require('../../controllers/admin/adminDiscountCodeController');

router.get('/', adminReferralCtrl.getAllReferrals);
router.get('/stats', adminReferralCtrl.getReferralStats);
router.get('/reports', adminReferralCtrl.getReports);
router.get('/reward-transactions', adminReferralCtrl.getRewardTransactions);
router.get('/config', adminReferralCtrl.getReferralConfig);
router.put('/config', adminReferralCtrl.updateReferralConfig);
router.get('/discount-codes', adminDiscountCodeCtrl.listDiscountCodes);
router.post('/discount-codes', adminDiscountCodeCtrl.createDiscountCode);
router.put('/discount-codes/:id', adminDiscountCodeCtrl.updateDiscountCode);
router.delete('/discount-codes/:id', adminDiscountCodeCtrl.disableDiscountCode);

// Cash payout requests
router.get('/redemptions', adminReferralCtrl.getRedemptions);
router.get('/redemptions/:id', adminReferralCtrl.getRedemptionDetail);
router.put('/redemptions/:id/approve', adminReferralCtrl.approveRedemption);
router.put('/redemptions/:id/pay', adminReferralCtrl.markRedemptionPaid);
router.put('/redemptions/:id/reject', adminReferralCtrl.rejectRedemption);

module.exports = router;
