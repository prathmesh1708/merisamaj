const express = require('express');
const router = express.Router();
const adminAppContentController = require('../../controllers/admin/adminAppContentController');
const { protect, authorize } = require('../../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin', 'super_admin', 'master_admin'));

// GET all app content configuration
router.get('/', adminAppContentController.getAppContent);

// Hero banner update
router.put('/hero', adminAppContentController.updateHeroBanner);

// Community Census banner update
router.put('/census', adminAppContentController.updateCensusBanner);

// End of Feed / Footer Artwork update
router.put('/footer-artwork', adminAppContentController.updateFooterArtwork);

// Exclusive Features CRUD
router.post('/features', adminAppContentController.createFeature);
router.put('/features/:id', adminAppContentController.updateFeature);
router.delete('/features/:id', adminAppContentController.deleteFeature);

// Success Stories CRUD
router.post('/success-stories', adminAppContentController.createSuccessStory);
router.put('/success-stories/:id', adminAppContentController.updateSuccessStory);
router.delete('/success-stories/:id', adminAppContentController.deleteSuccessStory);

// Core Members & Leadership CRUD
router.put('/core-members/head', adminAppContentController.updateCommunityHead);
router.post('/core-members/committee', adminAppContentController.createCommitteeMember);
router.put('/core-members/committee/:id', adminAppContentController.updateCommitteeMember);
router.delete('/core-members/committee/:id', adminAppContentController.deleteCommitteeMember);

module.exports = router;
