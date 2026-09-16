const express = require('express');
const router = express.Router();
const communityRoutes = require('./communityRoutes');
const cityRoutes = require('./cityRoutes');
const communityHeadRoutes = require('./communityHeadRoutes');
const userRoutes = require('./userRoutes');
const adminEventRoutes = require('./adminEventRoutes');
const adminFundRoutes = require('./adminFundRoutes');
const adminSubHeadRoutes = require('./adminSubHeadRoutes');
const { authorizeAdminModule } = require('../../middleware/authorizeModule');

const adminController = require('../../controllers/admin/adminController');

// Test Route
router.get('/test', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Admin routes working fine!'
  });
});

// Dashboard Overview Route
router.get('/dashboard/overview', authorizeAdminModule('canViewDashboard'), adminController.getDashboardOverview);

// Admin Sub-Heads Management Routes
router.use('/sub-heads', adminSubHeadRoutes);

// Community Management Routes
router.use('/communities', authorizeAdminModule('canManageCommunities'), communityRoutes);

// City Management Routes
router.use('/cities', authorizeAdminModule('canManageCities'), cityRoutes);
router.use('/community-heads', authorizeAdminModule('canManageCommunityHeads'), communityHeadRoutes);
router.use('/users', authorizeAdminModule('canViewUsers'), userRoutes);
router.use('/events', authorizeAdminModule('canManageEvents'), adminEventRoutes);
router.use('/funds', authorizeAdminModule('canManageFunds'), adminFundRoutes);

// Professional Directory Management Routes
const adminProfessionalRoutes = require('./adminProfessionalRoutes');
router.use('/professional', authorizeAdminModule('canManageProfessionals'), adminProfessionalRoutes);

// Matrimonial Management Routes
const adminMatrimonialRoutes = require('./adminMatrimonialRoutes');
router.use('/matrimonial', authorizeAdminModule('canManageMatrimonial'), adminMatrimonialRoutes);

// Group Management Routes
const adminGroupRoutes = require('./adminGroupRoutes');
router.use('/groups', authorizeAdminModule('canManageSocial'), adminGroupRoutes);

// Social / Feed Management Routes
const adminSocialRoutes = require('./adminSocialRoutes');
router.use('/social', authorizeAdminModule('canManageSocial'), adminSocialRoutes);

// Donation Management Routes
const adminDonationRoutes = require('../adminDonationRoutes');
router.use('/donations', authorizeAdminModule('canManageDonations'), adminDonationRoutes);

// Dharmashala Management Routes
const adminDharmashalaRoutes = require('./adminDharmashalaRoutes');
router.use('/dharmashala', authorizeAdminModule('canManageDharmashala'), adminDharmashalaRoutes);

// Obituary Management Routes
const adminObituaryRoutes = require('./adminObituaryRoutes');
router.use('/obituaries', authorizeAdminModule('canManageObituaries'), adminObituaryRoutes);

// Census Management Routes
const adminCensusRoutes = require('./adminCensusRoutes');
router.use('/census', authorizeAdminModule('canManageCensus'), adminCensusRoutes);

// Leadership Governance Routes
const adminLeadershipRoutes = require('./adminLeadershipRoutes');
router.use('/leadership', authorizeAdminModule('canManageLeadership'), adminLeadershipRoutes);

// Digital Invitations Routes
const adminInvitationRoutes = require('./adminInvitationRoutes');
router.use('/invitations', authorizeAdminModule('canManageInvitations'), adminInvitationRoutes);

// Voting & Elections Routes
const adminVotingRoutes = require('./adminVotingRoutes');
router.use('/voting', authorizeAdminModule('canManageVoting'), adminVotingRoutes);

// Notification & Broadcast Routes
const adminNotificationController = require('../../controllers/admin/adminNotificationController');
router.get('/notifications/push-analytics', authorizeAdminModule('canSendNotifications'), adminNotificationController.getPushDeliveryAnalytics);
router.post('/notifications/broadcast', authorizeAdminModule('canSendNotifications'), adminNotificationController.sendAdminBroadcast);

// Reports & Analytics Routes
const adminReportsRoutes = require('./adminReportsRoutes');
router.use('/reports', authorizeAdminModule('canViewReports'), adminReportsRoutes);

// Referral & Rewards Management Routes
const adminReferralRoutes = require('./adminReferralRoutes');
router.use('/referrals', authorizeAdminModule('canManageReferrals'), adminReferralRoutes);

// App Shortcuts & Icon Management Routes
const adminShortcutRoutes = require('./adminShortcutRoutes');
router.use('/shortcuts', authorizeAdminModule('canManageShortcuts'), adminShortcutRoutes);

// User App Edits & Customization Routes
const adminAppContentRoutes = require('./adminAppContentRoutes');
router.use('/user-app-edits', authorizeAdminModule('canManageAppContent'), adminAppContentRoutes);

module.exports = router;


