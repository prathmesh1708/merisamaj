const express = require('express');
const router = express.Router();
const donationController = require('../../controllers/head/donationController');
const upload = require('../../middleware/uploadMiddleware');
const { authorize } = require('../../middleware/authMiddleware');

const headOrAdmin = authorize('head', 'admin', 'super_admin', 'master_admin');
const headOrSubHead = authorize('head', 'sub_head', 'admin', 'super_admin', 'master_admin');

// READ: Dashboard Stats, Campaigns, Donors & Ledger (Head, Sub-Head, Admins)
router.get('/dashboard-stats', headOrSubHead, donationController.getDashboardStats);
router.get('/campaigns', headOrSubHead, donationController.getAllCampaigns);
router.get('/campaigns/:id', headOrSubHead, donationController.getCampaignById);
router.get('/campaigns/:id/donors', headOrSubHead, donationController.getCampaignDonors);
router.get('/campaigns/:id/expenses', headOrSubHead, donationController.getCampaignExpenses);
router.get('/ledger', headOrSubHead, donationController.getLedger);

// WRITE/MUTATING: Campaign & Expense Creation/Editing/Status (Main Head and Admins only)
router.post('/campaigns', headOrAdmin, upload.single('bannerImage'), donationController.createCampaign);
router.put('/campaigns/:id', headOrAdmin, upload.single('bannerImage'), donationController.updateCampaign);
router.delete('/campaigns/:id', headOrAdmin, donationController.deleteCampaign);
router.patch('/campaigns/:id/status', headOrAdmin, donationController.updateCampaignStatus);
router.post('/campaigns/:id/expenses', headOrAdmin, donationController.addExpense);

// Categories
router.get('/categories', headOrSubHead, donationController.getCategories);
router.post('/categories', headOrAdmin, donationController.createCategory);
router.delete('/categories/:id', headOrAdmin, donationController.deleteCategory);

module.exports = router;
