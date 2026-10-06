const express = require('express');
const router = express.Router();
const adminFundController = require('../../controllers/admin/adminFundController');
const { protect, authorize } = require('../../middleware/authMiddleware');

// Require Admin authorization
router.use(protect, authorize('admin'));

// Admin Fund Operations
router.get('/', adminFundController.getAllFunds);
router.post('/', adminFundController.createFund);
router.get('/stats', adminFundController.getFundStats);
router.get('/income-sources', adminFundController.getIncomeSources);

router.get('/:id', adminFundController.getFundById);
router.put('/:id', adminFundController.updateFund);
router.delete('/:id', adminFundController.deleteFund);

router.get('/:id/contributions', adminFundController.getFundContributions);
router.get('/:id/expenses', adminFundController.getFundExpenses);
router.get('/:id/transactions', adminFundController.getFundTransactions);

module.exports = router;
