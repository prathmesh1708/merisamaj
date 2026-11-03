const express = require('express');
const router = express.Router();

const invitationRoutes = require('./invitationRoutes');
const donationRoutes = require('./donationRoutes');
const obituaryRoutes = require('./obituaryRoutes');
const dharmashalaRoutes = require('./dharmashalaRoutes');
const postRoutes = require('./postRoutes');
const memberListingRoutes = require('./memberListingRoutes');
const votingRoutes = require('./votingRoutes');
const eventRoutes = require('./eventRoutes');
const fundRoutes = require('./fundRoutes');

// ─── Community Chat, Groups & Announcements ────────────────────────────────────
const memberChatRoutes = require('./memberChatRoutes');
const groupRoutes      = require('./groupRoutes');

const { checkModuleEnabled } = require('../../middleware/moduleAccessMiddleware');


// Test Route
router.get('/test', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Member routes working fine!'
  });
});

// Invitation routes
router.use('/invitations', checkModuleEnabled('invitationEnabled'), invitationRoutes);

// Donation routes
router.use('/donations', checkModuleEnabled('donationEnabled'), donationRoutes);

// Obituary routes
router.use('/obituaries', checkModuleEnabled('obituaryEnabled'), obituaryRoutes);

// Dharmashala routes
router.use('/dharmashala', checkModuleEnabled('dharmashalaEnabled'), dharmashalaRoutes);

// Community Social Feed (Posts & Stories)
const socialRoutes = require('./socialRoutes');
router.use('/social', checkModuleEnabled('socialFeedEnabled'), socialRoutes);
router.use('/posts', checkModuleEnabled('socialFeedEnabled'), postRoutes);

// Community Member Listing
router.use('/members', checkModuleEnabled('memberDirectoryEnabled'), memberListingRoutes);

// Voting
router.use('/voting', checkModuleEnabled('votingEnabled'), votingRoutes);

// Events
router.use('/events', checkModuleEnabled('eventEnabled'), eventRoutes);

// Samaj Fund Module
router.use('/fund', checkModuleEnabled('fundEnabled'), fundRoutes);

// Professional Directory (gated by the community's assigned plan)
const professionalRoutes = require('./professionalRoutes');
router.use('/professional', checkModuleEnabled('directoryEnabled'), professionalRoutes);

// ─── Community Chat ──────────────────────────────────────────────────────────
router.use('/chat',           checkModuleEnabled('chatEnabled'), memberChatRoutes);
router.use('/groups',         checkModuleEnabled('chatEnabled'), groupRoutes);


// ─── Matrimonial Module (gated by the community's assigned plan) ─────────────
const matrimonialProfileRoutes      = require('./matrimonial/matrimonialProfileRoutes');
const matrimonialSubscriptionRoutes = require('./matrimonial/matrimonialSubscriptionRoutes');
const matrimonialInterestRoutes     = require('./matrimonial/matrimonialInterestRoutes');
const matrimonialChatRoutes         = require('./matrimonial/matrimonialChatRoutes');
const matrimonialAuxRoutes          = require('./matrimonial/matrimonialAuxRoutes');

// Matrimonial is open to every member of every community (not gated by the community plan);
// what members see inside it (plans, settings, content) is managed by the Admin.
// App-wide membership plans (Social & more) — open to every member, married or not
router.use('/app-subscription', require('./appSubscriptionRoutes'));

// Married members can't use Matrimony on their own account (same rule as the app's poster)
const { blockMarriedMembers } = require('../../middleware/matrimonialEligibility');
router.use('/matrimonial', blockMarriedMembers);

router.use('/matrimonial/profile',       checkModuleEnabled('matrimonialEnabled'), matrimonialProfileRoutes);
router.use('/matrimonial/subscription',  checkModuleEnabled('matrimonialEnabled'), matrimonialSubscriptionRoutes);
router.use('/matrimonial/interests',     checkModuleEnabled('matrimonialEnabled'), matrimonialInterestRoutes);
router.use('/matrimonial/chat',          checkModuleEnabled('matrimonialEnabled'), matrimonialChatRoutes);
router.use('/matrimonial/success-stories', checkModuleEnabled('successStoriesEnabled'));
router.use('/matrimonial',               checkModuleEnabled('matrimonialEnabled'), matrimonialAuxRoutes); // dashboard, shortlist, visitors, block, report

// ─── Notifications (centralized for all modules) ─────────────────────────────
const notificationRoutes = require('./notificationRoutes');
router.use('/notifications', notificationRoutes);

// ─── Leadership Directory ────────────────────────────────────────────────────
const leadershipRoutes = require('./leadershipRoutes');
router.use('/leadership', checkModuleEnabled('leadershipEnabled'), leadershipRoutes);

// ─── Community Census Module ──────────────────────────────────────────────────
const censusRoutes = require('./censusRoutes');
router.use('/census', checkModuleEnabled('censusEnabled'), censusRoutes);

// ─── Family Tree (Family ID + Member IDs, invitations) ───────────────────────
router.use('/family', checkModuleEnabled('familyEnabled'), require('./familyRoutes'));

// ─── Referral & Rewards Module ──────────────────────────────────────────────
const referralRoutes = require('./referralRoutes');
router.use('/referral', checkModuleEnabled('referralEnabled'), referralRoutes);

// ─── Dynamic Home & User App Customization ──────────────────────────────────
const memberAppContentRoutes = require('./memberAppContentRoutes');
router.use('/app-content', memberAppContentRoutes);

module.exports = router;
