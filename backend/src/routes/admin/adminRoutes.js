const express = require('express');
const router = express.Router();
const communityRoutes = require('./communityRoutes');
const cityRoutes = require('./cityRoutes');
const communityHeadRoutes = require('./communityHeadRoutes');
const userRoutes = require('./userRoutes');
const adminEventRoutes = require('./adminEventRoutes');
const adminFundRoutes = require('./adminFundRoutes');

const adminController = require('../../controllers/admin/adminController');

// Test Route
router.get('/test', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Admin routes working fine!'
  });
});

// Dashboard Overview Route
router.get('/dashboard/overview', adminController.getDashboardOverview);

// Community Management Routes
// All routes: /api/v1/admin/communities/*
router.use('/communities', communityRoutes);



// City Management Routes
router.use('/cities', cityRoutes);
router.use('/community-heads', communityHeadRoutes);
router.use('/users', userRoutes);
router.use('/events', adminEventRoutes);
router.use('/funds', adminFundRoutes);

// Professional Directory Management Routes
const adminProfessionalRoutes = require('./adminProfessionalRoutes');
router.use('/professional', adminProfessionalRoutes);

// Matrimonial Management Routes
const adminMatrimonialRoutes = require('./adminMatrimonialRoutes');
router.use('/matrimonial', adminMatrimonialRoutes);

// Group Management Routes
const adminGroupRoutes = require('./adminGroupRoutes');
router.use('/groups', adminGroupRoutes);

// Social / Feed Management Routes
const adminSocialRoutes = require('./adminSocialRoutes');
router.use('/social', adminSocialRoutes);

// Donation Management Routes
const adminDonationRoutes = require('../adminDonationRoutes');
router.use('/donations', adminDonationRoutes);

// Dharmashala Management Routes
const adminDharmashalaRoutes = require('./adminDharmashalaRoutes');
router.use('/dharmashala', adminDharmashalaRoutes);

// Obituary Management Routes
const adminObituaryRoutes = require('./adminObituaryRoutes');
router.use('/obituaries', adminObituaryRoutes);

// Census Management Routes
const adminCensusRoutes = require('./adminCensusRoutes');
router.use('/census', adminCensusRoutes);

// Leadership Governance Routes
const adminLeadershipRoutes = require('./adminLeadershipRoutes');
router.use('/leadership', adminLeadershipRoutes);

// Digital Invitations Routes
const adminInvitationRoutes = require('./adminInvitationRoutes');
router.use('/invitations', adminInvitationRoutes);

// Voting & Elections Routes
const adminVotingRoutes = require('./adminVotingRoutes');
router.use('/voting', adminVotingRoutes);

// Notification & Broadcast Routes
const adminNotificationController = require('../../controllers/admin/adminNotificationController');
router.get('/notifications/push-analytics', adminNotificationController.getPushDeliveryAnalytics);
router.post('/notifications/broadcast', adminNotificationController.sendAdminBroadcast);
// Reports & Analytics Routes
const adminReportsRoutes = require('./adminReportsRoutes');
router.use('/reports', adminReportsRoutes);

// Referral & Rewards Management Routes
const adminReferralRoutes = require('./adminReferralRoutes');
router.use('/referrals', adminReferralRoutes);

// App Shortcuts & Icon Management Routes
const adminShortcutRoutes = require('./adminShortcutRoutes');
router.use('/shortcuts', adminShortcutRoutes);

// User App Edits & Customization Routes
const adminAppContentRoutes = require('./adminAppContentRoutes');
router.use('/user-app-edits', adminAppContentRoutes);

module.exports = router;

