const express = require('express');
const router = express.Router();
const adminDharmashalaController = require('../../controllers/admin/adminDharmashalaController');

// GET /api/v1/admin/dharmashala/properties   → Global Dharmashala listing across all communities
router.get('/properties', adminDharmashalaController.getAllGlobalDharmashalas);

// GET /api/v1/admin/dharmashala/analytics    → System-wide Dharmashala analytics & revenue stats
router.get('/analytics', adminDharmashalaController.getGlobalDharmashalaAnalytics);

// GET /api/v1/admin/dharmashala/bookings     → All bookings across all communities
router.get('/bookings', adminDharmashalaController.getGlobalBookings);

// PATCH /api/v1/admin/dharmashala/bookings/:id/override → Admin emergency override
router.patch('/bookings/:id/override', adminDharmashalaController.adminOverrideBookingStatus);

// PATCH /api/v1/admin/dharmashala/properties/:id/toggle-status → Enable / Disable property
router.patch('/properties/:id/toggle-status', adminDharmashalaController.toggleDharmashalaStatus);

module.exports = router;
