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


// Test Route
router.get('/test', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Member routes working fine!'
  });
});

// Invitation routes
router.use('/invitations', invitationRoutes);

// Donation routes
router.use('/donations', donationRoutes);

// Obituary routes
router.use('/obituaries', obituaryRoutes);

// Dharmashala routes
router.use('/dharmashala', dharmashalaRoutes);

// Community Social Feed (Posts & Stories)
const socialRoutes = require('./socialRoutes');
router.use('/social', socialRoutes);
router.use('/posts', postRoutes);

// Community Member Listing
router.use('/members', memberListingRoutes);

// Voting
router.use('/voting', votingRoutes);

// Events
router.use('/events', eventRoutes);

// Samaj Fund Module
router.use('/fund', fundRoutes);

// Professional Directory
const professionalRoutes = require('./professionalRoutes');
router.use('/professional', professionalRoutes);

// ─── Community Chat ──────────────────────────────────────────────────────────
router.use('/chat',           memberChatRoutes);
router.use('/groups',         groupRoutes);


// ─── Matrimonial Module ───────────────────────────────────────────────────────
const matrimonialProfileRoutes      = require('./matrimonial/matrimonialProfileRoutes');
const matrimonialSubscriptionRoutes = require('./matrimonial/matrimonialSubscriptionRoutes');
const matrimonialInterestRoutes     = require('./matrimonial/matrimonialInterestRoutes');
const matrimonialChatRoutes         = require('./matrimonial/matrimonialChatRoutes');
const matrimonialAuxRoutes          = require('./matrimonial/matrimonialAuxRoutes');

router.use('/matrimonial/profile',       matrimonialProfileRoutes);
router.use('/matrimonial/subscription',  matrimonialSubscriptionRoutes);
router.use('/matrimonial/interests',     matrimonialInterestRoutes);
router.use('/matrimonial/chat',          matrimonialChatRoutes);
router.use('/matrimonial',               matrimonialAuxRoutes); // dashboard, shortlist, visitors, block, report

// ─── Notifications (centralized for all modules) ─────────────────────────────
const notificationRoutes = require('./notificationRoutes');
router.use('/notifications', notificationRoutes);

// ─── Leadership Directory ────────────────────────────────────────────────────
const leadershipRoutes = require('./leadershipRoutes');
router.use('/leadership', leadershipRoutes);

// ─── Community Census Module ──────────────────────────────────────────────────
const censusRoutes = require('./censusRoutes');
router.use('/census', censusRoutes);

// ─── Referral & Rewards Module ──────────────────────────────────────────────
const referralRoutes = require('./referralRoutes');
router.use('/referral', referralRoutes);

// ─── Dynamic Home & User App Customization ──────────────────────────────────
const memberAppContentRoutes = require('./memberAppContentRoutes');
router.use('/app-content', memberAppContentRoutes);

module.exports = router;
