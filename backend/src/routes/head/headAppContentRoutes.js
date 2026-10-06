const express = require('express');
const router = express.Router();
const adminAppContentController = require('../../controllers/admin/adminAppContentController');
const upload = require('../../middleware/uploadMiddleware');
const { authorizeModule } = require('../../middleware/authorizeModule');

// Mounted under /api/v1/head — already gated to authorize('head', 'sub_head', 'admin', ...)
// by routes/index.js, so both the Community Head and any Local/Sub-Head can reach this.
// Reuses the admin controller's logic, which scopes to req.user.communityId whenever
// the request body doesn't explicitly send a communityId (which this panel never does).

// GET current app content for my own community (to prefill the editor)
router.get('/', adminAppContentController.getAppContent);

// Donations page banner — supports bannerImage file upload
router.put('/donation-banner', upload.single('bannerImage'), adminAppContentController.updateDonationBanner);

// Community-wide home hero banner (Community Head) — real file upload, never
// a base64 string (see note in updateHeroBanner for why that matters).
router.put('/hero', authorizeModule('canManageHomeContent'), upload.single('bannerImage'), adminAppContentController.updateHeroBanner);

// Home page hero banner, scoped to the requesting Local Head's own city — a
// member only ever sees their own Local Head's banner, never another
// location's. Enforced inside the controller via req.user.city (not the
// request body), so there's nothing a Local Head can tamper with here. No
// extra permission gate: the endpoint is already self-limited to your own
// city, so every Local Head can manage it out of the box, with no admin
// grant step required (unlike the community-wide /hero endpoint above).
router.get('/location-hero', adminAppContentController.getLocationHeroBanner);
router.put('/location-hero', upload.single('bannerImage'), adminAppContentController.updateLocationHeroBanner);

module.exports = router;
