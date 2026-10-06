const express = require('express');
const router = express.Router();
const c = require('../../controllers/head/fundAccountController');

// Auth/permission middleware is applied by the parent router
// (head: authorizeModule, admin: protect + authorizeAdminModule).
router.get('/', c.getAccounts);
router.post('/', c.createAccount);
router.get('/ledger', c.getLedger);
router.post('/entries', c.addEntry);
router.post('/transfer', c.transfer);
router.patch('/entries/:id/cancel', c.cancelEntry);
router.put('/:id', c.updateAccount);

module.exports = router;
