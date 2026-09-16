const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/head/eventController');
const { authorizeModule } = require('../../middleware/authorizeModule');

router.get('/', authorizeModule('canViewEvents'), ctrl.getHeadEvents);
router.post('/', authorizeModule('canCreateEvents'), ctrl.createEvent);
router.get('/analytics', authorizeModule('canViewEvents'), ctrl.getAnalytics);

router.put('/:eventId', authorizeModule('canEditEvents'), ctrl.updateEvent);
router.delete('/:eventId', authorizeModule('canDeleteEvents'), ctrl.deleteEvent);
router.patch('/:eventId/cancel', authorizeModule('canEditEvents'), ctrl.cancelEvent);
router.get('/:eventId/responses', authorizeModule('canManageBookings'), ctrl.getMemberResponses);

// Event Gallery Management
router.post('/:eventId/gallery', authorizeModule('canEditEvents'), ctrl.addEventGalleryPhoto);
router.delete('/:eventId/gallery/:photoId', authorizeModule('canEditEvents'), ctrl.removeEventGalleryPhoto);

module.exports = router;

