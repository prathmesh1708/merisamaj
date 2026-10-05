const express = require('express');
const router = express.Router();
const professionalController = require('../../controllers/member/professionalController');
const { protect } = require('../../middleware/authMiddleware');

// Public/Protected Read Queries
router.get('/categories', professionalController.getActiveCategories);
router.get('/', protect, professionalController.getProfessionals);
router.get('/:id', protect, professionalController.getProfessionalById);

// Protected Write Operations
router.post('/', protect, professionalController.createProfessional);
router.put('/:id', protect, professionalController.updateProfessional);
router.delete('/:id', protect, professionalController.deleteProfessional);

module.exports = router;
