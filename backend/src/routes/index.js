const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');

// Import Panel Routes
const authRoutes = require('./authRoutes');
const adminRoutes = require('./admin/adminRoutes');
const headRoutes = require('./head/headRoutes');
const memberRoutes = require('./member/memberRoutes');

// Mount Routes
router.use('/auth', authRoutes);
router.use('/app-shortcuts', require('./appShortcutRoutes'));
router.use('/admin', protect, authorize('admin', 'super_admin', 'master_admin', 'admin_sub_head'), adminRoutes);
router.use('/head', protect, authorize('head', 'sub_head', 'admin', 'super_admin', 'master_admin'), headRoutes);
router.use('/webhooks/razorpay', require('./razorpayWebhookRoutes'));
// Chat "delivered" receipt from the service worker — public, verified by a signed receipt
router.post('/chat/delivery-ack', require('../controllers/chatDeliveryController').deliveryAck);
router.use('/member', protect, memberRoutes);
// Hierarchical module access (Master Admin → Community Head → Local Head → Sub-Head)
router.use('/permissions', protect, authorize('head', 'sub_head', 'admin'), require('./modulePermissionRoutes'));

module.exports = router;
