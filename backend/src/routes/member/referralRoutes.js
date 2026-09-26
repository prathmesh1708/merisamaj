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

module.exports = router;
