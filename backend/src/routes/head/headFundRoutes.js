const express = require('express');
const router = express.Router();
const headFundController = require('../../controllers/head/headFundController');
const { authorizeModule } = require('../../middleware/authorizeModule');

// Head Panel Fund Operations
router.get('/', authorizeModule('canViewFunds'), headFundController.getFunds);
router.post('/', authorizeModule('canManageFunds'), headFundController.createFund);
router.get('/stats', authorizeModule('canViewFunds'), headFundController.getStats);
router.get('/income-sources', authorizeModule('canViewFunds'), headFundController.getIncomeSources);

// Manual (generic) collection — not tied to any specific Fund/Donation/
// Dharmashala entity. Must be registered before the /:id routes below.
router.get('/manual-collections', authorizeModule('canViewFunds'), headFundController.getManualCollections);
router.post('/manual-collections', authorizeModule('canManageFunds'), headFundController.createManualCollection);
router.patch('/manual-collections/:id/cancel', authorizeModule('canManageFunds'), headFundController.cancelManualCollection);

// Accountability reports
router.get('/reports/who-gave', authorizeModule('canViewFunds'), headFundController.getWhoGaveReport);
router.get('/reports/who-collected', authorizeModule('canViewFunds'), headFundController.getWhoCollectedReport);

router.get('/:id', authorizeModule('canViewFunds'), headFundController.getFundById);
router.put('/:id', authorizeModule('canManageFunds'), headFundController.updateFund);
router.delete('/:id', authorizeModule('canManageFunds'), headFundController.deleteFund);

router.get('/:id/contributions', authorizeModule('canViewFunds'), headFundController.getFundContributions);
router.get('/:id/expenses', authorizeModule('canViewFunds'), headFundController.getFundExpenses);
router.post('/:id/expenses', authorizeModule('canManageFunds'), headFundController.addExpense);
router.get('/:id/transactions', authorizeModule('canViewFunds'), headFundController.getFundTransactions);
router.post('/:id/record-cash-payment', authorizeModule('canManageFunds'), headFundController.recordCashPayment);

module.exports = router;

