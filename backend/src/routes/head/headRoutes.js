const express = require('express');
const router = express.Router();
const donationRoutes = require('./donationRoutes');
const dharmashalaRoutes = require('./dharmashalaRoutes');
const votingRoutes = require('./votingRoutes');
const eventRoutes = require('./eventRoutes');
const headFundRoutes = require('./headFundRoutes');
const headAppContentRoutes = require('./headAppContentRoutes');

// Test Route
router.get('/test', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Head routes working fine!'
  });
});

// ─── Hierarchical module access ───────────────────────────────────────────────
// Every module's API is blocked unless the module was granted to this user down the
// hierarchy (Master Admin → Community Head → Local Head → Sub-Head). Registered
// before the module routers below; config/moduleCatalog.js lists the paths.
const { MODULE_CATALOG } = require('../../config/moduleCatalog');
const { requireHeadModule } = require('../../middleware/requireHeadModule');
MODULE_CATALOG.forEach(mod => {
  mod.apiMounts.forEach(mount => router.use(mount, requireHeadModule(mod.key)));
});

router.use('/donations', donationRoutes);
router.use('/app-content', headAppContentRoutes);
router.use('/dharmashala', dharmashalaRoutes);
router.use('/voting', votingRoutes);
router.use('/events', eventRoutes);
router.use('/funds', headFundRoutes);
router.use('/fund-accounts', require('../../middleware/authorizeModule').authorizeModule('canManageFunds'), require('./fundAccountRoutes'));

// Social Moderation Routes
const headSocialRoutes = require('./headSocialRoutes');
router.use('/social', headSocialRoutes);



// Group Management Routes
const headGroupRoutes = require('./headGroupRoutes');
router.use('/groups', headGroupRoutes);

// Professional Directory Approval Routes
const headProfessionalRoutes = require('./headProfessionalRoutes');
router.use('/professional', headProfessionalRoutes);

// Matrimonial Community Routes
const headMatrimonialRoutes = require('./headMatrimonialRoutes');
router.use('/matrimonial', headMatrimonialRoutes);

// Leadership & Sub-Leader Management Routes
const headLeadershipRoutes = require('./headLeadershipRoutes');
router.use('/leadership', headLeadershipRoutes);

// Local Community — Local Head account management Routes
const headLocalCommunityRoutes = require('./headLocalCommunityRoutes');
router.use('/local-community', headLocalCommunityRoutes);

// Census Management Routes
const headCensusRoutes = require('./censusRoutes');
router.use('/census', headCensusRoutes);

// Family Tree approval requests (Local Head → Community Head)
router.use('/family-requests', require('./headFamilyRoutes'));

// Head Dashboard Stats Routes
const headDashboardRoutes = require('./headDashboardRoutes');
router.use('/dashboard', headDashboardRoutes);

// Digital Invitations Routes
const headInvitationRoutes = require('./headInvitationRoutes');
router.use('/invitations', headInvitationRoutes);

// Obituary Community Routes
const headObituaryRoutes = require('./headObituaryRoutes');
router.use('/obituaries', headObituaryRoutes);

// Head Broadcast & Notification Management Routes
const headNotificationRoutes = require('./headNotificationRoutes');
router.use('/notifications', headNotificationRoutes);

// Sub-Head Management Routes (Community & Local Sub-Heads)
const headSubHeadRoutes = require('./headSubHeadRoutes');
router.use('/sub-heads', headSubHeadRoutes);

module.exports = router;
