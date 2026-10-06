const express = require('express');
const router = express.Router();
const adminDharmashalaController = require('../../controllers/admin/adminDharmashalaController');
// Reused directly — these already handle an Admin requester correctly via
// applyScopeFilter's admin bypass (unrestricted), so there's no need for a
// separate admin-side copy of this logic.
const headDharmashalaController = require('../../controllers/head/dharmashalaController');

// Who may create Dharmashalas / make manual bookings (per role, per location)
const accessController = require('../../controllers/admin/dharmashalaAccessController');
router.get('/access-policy', accessController.getPolicies);
router.put('/access-policy', accessController.savePolicy);
router.delete('/access-policy', accessController.deleteLocationPolicy);

// GET /api/v1/admin/dharmashala/properties   → Global Dharmashala listing across all communities
router.get('/properties', adminDharmashalaController.getAllGlobalDharmashalas);

// Offline/manual booking creation + payment recording (Admin, any community)
router.post('/bookings/manual', headDharmashalaController.createManualBooking);
router.post('/bookings/:id/payment', headDharmashalaController.recordBookingPayment);

// GET /api/v1/admin/dharmashala/analytics    → System-wide Dharmashala analytics & revenue stats
router.get('/analytics', adminDharmashalaController.getGlobalDharmashalaAnalytics);

// GET /api/v1/admin/dharmashala/bookings     → All bookings across all communities
router.get('/bookings', adminDharmashalaController.getGlobalBookings);

// PATCH /api/v1/admin/dharmashala/bookings/:id/override → Admin emergency override
router.patch('/bookings/:id/override', adminDharmashalaController.adminOverrideBookingStatus);

// PATCH /api/v1/admin/dharmashala/properties/:id/toggle-status → Enable / Disable property
router.patch('/properties/:id/toggle-status', adminDharmashalaController.toggleDharmashalaStatus);

module.exports = router;
