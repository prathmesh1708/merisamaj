const express = require('express');
const router = express.Router();
const professionalController = require('../../controllers/member/professionalController');
const { protect } = require('../../middleware/authMiddleware');
const { requireAppPermission } = require('../../middleware/subscriptionMiddleware');

// Public/Protected Read Queries
router.get('/categories', professionalController.getActiveCategories);
router.get('/', protect, professionalController.getProfessionals);
router.get('/:id', protect, professionalController.getProfessionalById);

// Protected Write Operations (adding a listing needs the App plan's professionalListing;
// members can still edit or remove a listing they already have)
router.post('/', protect, requireAppPermission('professionalListing'), professionalController.createProfessional);
router.put('/:id', protect, professionalController.updateProfessional);
router.delete('/:id', protect, professionalController.deleteProfessional);

module.exports = router;
