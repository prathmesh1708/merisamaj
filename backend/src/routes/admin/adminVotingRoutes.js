const express = require('express');
const router = express.Router();
const adminVotingController = require('../../controllers/admin/adminVotingController');
const { protect, authorize } = require('../../middleware/authMiddleware');

// Require Admin authorization
router.use(protect, authorize('admin'));

// Admin Voting & Elections Operations
router.get('/target-options', adminVotingController.getTargetOptions);
router.get('/', adminVotingController.getAllElections);
router.post('/', adminVotingController.createElection);
router.get('/stats', adminVotingController.getVotingStats);
router.get('/:id', adminVotingController.getElectionById);
router.patch('/:id/status', adminVotingController.updateElectionStatus);
router.put('/:id', adminVotingController.updateElection);
router.delete('/:id', adminVotingController.deleteElection);

module.exports = router;
