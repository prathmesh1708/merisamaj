const express = require('express');
const router = express.Router();
const votingController = require('../../controllers/head/votingController');

router.get('/target-options', votingController.getTargetOptions);
router.get('/', votingController.getElections);
router.post('/', votingController.createElection);
router.put('/:id', votingController.updateElection);
router.delete('/:id', votingController.deleteElection);
router.put('/:id/close', votingController.closeElection);
const manage = require('../../controllers/head/electionManageController');
router.get('/:id/analytics', manage.getAnalytics);
router.post('/:id/declare-result', manage.declareResult);
router.post('/:id/cancel', manage.cancelElection);
router.post('/:id/reopen', manage.reopenElection);

module.exports = router;
