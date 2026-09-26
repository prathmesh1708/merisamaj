const express = require('express');
const router = express.Router();
const dharmashalaController = require('../../controllers/head/dharmashalaController');
const upload = require('../../middleware/uploadMiddleware');
const { authorize } = require('../../middleware/authMiddleware');

const headOrAdmin = authorize('head', 'admin', 'super_admin', 'master_admin');
const headOrSubHead = authorize('head', 'sub_head', 'admin', 'super_admin', 'master_admin');

// READ: Dashboard Stats & Property Listings (Head, Sub-Head, Admins)
router.get('/dashboard-stats', headOrSubHead, dharmashalaController.getDashboardStats);
router.get('/properties', headOrSubHead, dharmashalaController.getProperties);
router.get('/properties/:id/rooms', headOrSubHead, dharmashalaController.getDharmashalaRooms);
router.get('/bookings', headOrSubHead, dharmashalaController.getAllBookings);
router.get('/maintenance', headOrSubHead, dharmashalaController.getMaintenanceLogs);

// WRITE/MUTATING: Property, Room & Booking Moderation (Main Head and Admins only)
router.post('/properties', headOrAdmin, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'galleryImages', maxCount: 10 }
]), dharmashalaController.createProperty);

router.put('/properties/:id', headOrAdmin, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'galleryImages', maxCount: 10 }
]), dharmashalaController.updateProperty);

router.delete('/properties/:id', headOrAdmin, dharmashalaController.deleteProperty);

router.post('/rooms', headOrAdmin, upload.fields([{ name: 'images', maxCount: 5 }]), dharmashalaController.createRoom);
router.put('/rooms/:roomId', headOrAdmin, upload.fields([{ name: 'images', maxCount: 5 }]), dharmashalaController.updateRoom);
router.delete('/rooms/:roomId', headOrAdmin, dharmashalaController.deleteRoom);

router.patch('/bookings/:id/status', headOrAdmin, dharmashalaController.updateBookingStatus);
router.post('/maintenance', headOrAdmin, dharmashalaController.logMaintenance);

module.exports = router;
