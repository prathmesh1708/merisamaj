const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/head/eventController');

router.get('/', ctrl.getHeadEvents);
router.post('/', ctrl.createEvent);
router.get('/analytics', ctrl.getAnalytics);

router.put('/:eventId', ctrl.updateEvent);
router.delete('/:eventId', ctrl.deleteEvent);
router.patch('/:eventId/cancel', ctrl.cancelEvent);
router.get('/:eventId/responses', ctrl.getMemberResponses);

// Event Gallery Management
router.post('/:eventId/gallery', ctrl.addEventGalleryPhoto);
router.delete('/:eventId/gallery/:photoId', ctrl.removeEventGalleryPhoto);

module.exports = router;
