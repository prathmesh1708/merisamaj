const express = require('express');
const router = express.Router();
const adminDonationController = require('../controllers/adminDonationController');

router.get('/categories', adminDonationController.getCategories);
router.post('/categories', adminDonationController.createCategory);
router.delete('/categories/:id', adminDonationController.deleteCategory);

router.get('/', adminDonationController.getAllDonations);
router.post('/', adminDonationController.createDonation);
router.put('/:id', adminDonationController.updateDonation);
router.patch('/:id/close', adminDonationController.closeDonation);
router.delete('/:id', adminDonationController.deleteDonation);

module.exports = router;
