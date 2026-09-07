const express = require('express');
const router = express.Router();
const donationController = require('../../controllers/member/donationController');

// Define routes for member donations
router.get('/campaigns', donationController.getCampaigns);
router.get('/campaigns/:id', donationController.getCampaignById);
router.get('/campaigns/:id/donors', donationController.getRecentDonors);
router.get('/history', donationController.getHistory);
router.post('/submit', donationController.createDonation);
router.post('/donate', donationController.createDonation);
router.post('/:id/donate', donationController.createDonation);
router.get('/stats', donationController.getStats);
router.get('/all-donors', donationController.getAllDonors);
router.get('/categories', donationController.getCategories);

// Razorpay Gateway Endpoints
router.post('/create-order', donationController.createRazorpayOrder);
router.post('/:id/create-order', donationController.createRazorpayOrder);
router.post('/verify-payment', donationController.verifyRazorpayPayment);
router.post('/webhook', donationController.handleRazorpayWebhook);

// Aliases for root endpoint compatibility
router.get('/', donationController.getCampaigns);
router.get('/:id', donationController.getCampaignById);
router.post('/', donationController.createDonation);

module.exports = router;
