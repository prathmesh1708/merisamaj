const express = require('express');
const router = express.Router();
const familyController = require('../../controllers/member/familyController');

// GET /api/v1/member/family — my family tree (Family ID, Member IDs, approval status)
router.get('/', familyController.getMyFamily);

// Family members (each addition is approved by Local Head → Community Head)
router.post('/members', familyController.addMember);
router.put('/members/:id', familyController.updateMember);
router.delete('/members/:id', familyController.removeMember);

// Invitations: someone added my mobile number to their family tree
router.get('/invitations', familyController.getInvitations);
router.post('/invitations/:id/accept', familyController.respondToInvitation(true));
router.post('/invitations/:id/reject', familyController.respondToInvitation(false));

module.exports = router;
