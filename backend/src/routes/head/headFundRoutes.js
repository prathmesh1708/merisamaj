const express = require('express');
const router = express.Router();
const headFundController = require('../../controllers/head/headFundController');

// Head Panel Fund Operations
router.get('/', headFundController.getFunds);
router.post('/', headFundController.createFund);
router.get('/stats', headFundController.getStats);

router.get('/:id', headFundController.getFundById);
router.put('/:id', headFundController.updateFund);
router.delete('/:id', headFundController.deleteFund);

router.get('/:id/contributions', headFundController.getFundContributions);
router.get('/:id/expenses', headFundController.getFundExpenses);
router.post('/:id/expenses', headFundController.addExpense);
router.get('/:id/transactions', headFundController.getFundTransactions);
router.post('/:id/record-cash-payment', headFundController.recordCashPayment);

module.exports = router;
