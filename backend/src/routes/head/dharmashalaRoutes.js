const express = require('express');
const router = express.Router();
const dharmashalaController = require('../../controllers/head/dharmashalaController');
const upload = require('../../middleware/uploadMiddleware');
const { authorize } = require('../../middleware/authMiddleware');
const { authorizeModule } = require('../../middleware/authorizeModule');

// Role-eligibility only — WHO can even reach these routes. Local Head /
// Local Sub-Head / Community Sub-Head are all 'sub_head' role, differentiated
// by accountType; they, Community Head, and Admin are all eligible here.
// The actual "have they been granted this power" check is authorizeModule
// below, and "which properties can they see/touch" is applyScopeFilter
// inside each controller function (community + city scoping).
const headOrSubHead = authorize('head', 'sub_head', 'admin', 'super_admin', 'master_admin');

const { canViewDharmashala } = require('../../middleware/dharmashalaAccess');
const canView = canViewDharmashala;
const canManage = authorizeModule('canManageDharmashala');
// Creating properties/rooms and making manual bookings are NOT granted by
// canManageDharmashala — only by the Admin-set access policy (per role, per location).
const { requireDharmashalaAccess } = require('../../middleware/dharmashalaAccess');
const dharmashalaAccessController = require('../../controllers/admin/dharmashalaAccessController');
const canCreateProperty = requireDharmashalaAccess('createProperty');
const canManualBook = requireDharmashalaAccess('manualBooking');

router.get('/my-access', headOrSubHead, dharmashalaAccessController.getMyAccess);

// READ: Dashboard Stats & Property Listings
router.get('/dashboard-stats', headOrSubHead, canView, dharmashalaController.getDashboardStats);
router.get('/properties', headOrSubHead, canView, dharmashalaController.getProperties);
router.get('/bookings', headOrSubHead, canView, dharmashalaController.getAllBookings);
router.get('/maintenance', headOrSubHead, canView, dharmashalaController.getMaintenanceLogs);

// WRITE/MUTATING: Property, Room, Booking & Maintenance management — any Head
// or Sub-Head (Local Head, Local Sub-Head, Community Head) who holds
// canManageDharmashala, scoped to their own community/city.
router.post('/properties', headOrSubHead, canCreateProperty, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'galleryImages', maxCount: 10 }
]), dharmashalaController.createProperty);

router.put('/properties/:id', headOrSubHead, canCreateProperty, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'galleryImages', maxCount: 10 }
]), dharmashalaController.updateProperty);

router.delete('/properties/:id', headOrSubHead, canCreateProperty, dharmashalaController.deleteProperty);


// Online booking management — accept/reject/confirm/complete/cancel
router.patch('/bookings/:id/status', headOrSubHead, canManage, dharmashalaController.updateBookingStatus);

// Offline/manual booking — create directly for a walk-in/phone guest, and
// record later payments (e.g. collecting the remaining balance) against it.
router.post('/bookings/manual', headOrSubHead, canManualBook, dharmashalaController.createManualBooking);
router.post('/bookings/:id/payment', headOrSubHead, canManualBook, dharmashalaController.recordBookingPayment);

router.post('/maintenance', headOrSubHead, canManage, dharmashalaController.logMaintenance);

module.exports = router;
