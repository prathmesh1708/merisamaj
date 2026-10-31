const express = require('express');
const router = express.Router();
const referralCtrl = require('../../controllers/member/referralController');
const { protect } = require('../../middleware/authMiddleware');

// Protect all member referral routes
router.use(protect);

router.get('/info', referralCtrl.getMyReferralInfo);
router.get('/history', referralCtrl.getMyReferralHistory);
router.get('/referred-users', referralCtrl.getMyReferredUsers);
router.get('/leaderboard', referralCtrl.getLeaderboard);
router.post('/validate', referralCtrl.validateReferralCode);

// Cash redemption
router.get('/redeem-info', referralCtrl.getRedeemInfo);
router.get('/redemptions', referralCtrl.getMyRedemptions);
router.post('/redemptions', referralCtrl.createRedemption);
router.put('/redemptions/:id/cancel', referralCtrl.cancelRedemption);

module.exports = router;
