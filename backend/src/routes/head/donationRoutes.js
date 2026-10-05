const express = require('express');
const router = express.Router();
const donationController = require('../../controllers/head/donationController');
const upload = require('../../middleware/uploadMiddleware');
const { authorize } = require('../../middleware/authMiddleware');
const { authorizeModule } = require('../../middleware/authorizeModule');

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

// Cash Payment Collection — list is visible to any Head/Sub-Head (naturally
// empty if they have no hierarchy match or lack the permission); the actual
// collect action is additionally gated by the canCollectCashDonations flag,
// then re-verified against the donor's hierarchy inside the controller.
router.get('/cash-pending', headOrSubHead, donationController.getPendingCashDonations);
router.put('/:id/collect-cash', headOrSubHead, donationController.collectCashDonation);

// Campaign-level Cash Collector Management — only the campaign creator or admin
// can view/edit who is granted per-campaign cash collection access.
router.get('/campaigns/:id/collectors', headOrSubHead, donationController.getCampaignCollectors);
router.put('/campaigns/:id/collectors', headOrAdmin, donationController.updateCampaignCollectors);


// Categories
router.get('/categories', headOrSubHead, donationController.getCategories);
router.post('/categories', headOrAdmin, donationController.createCategory);
router.delete('/categories/:id', headOrAdmin, donationController.deleteCategory);

module.exports = router;
