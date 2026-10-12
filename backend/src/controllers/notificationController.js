/**
 * notificationController.js
 * Centralized notification management for all modules.
 */
const UserNotification = require('../models/UserNotification');

// ─── List Notifications ───────────────────────────────────────────────────────
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, module, isRead } = req.query;
    const query = { userId: req.user._id };
    if (module) query.module = module;
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const total = await UserNotification.countDocuments(query);
    const notifications = await UserNotification.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    const unreadCount = await UserNotification.countDocuments({ userId: req.user._id, isRead: false });

    res.json({
      status: 'success',
      data: {
        notifications,
        unreadCount,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Unread Count ─────────────────────────────────────────────────────────────
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await UserNotification.countDocuments({ userId: req.user._id, isRead: false });
    // Return both 'count' and 'unreadCount' for compatibility with all consumers
    res.json({ status: 'success', data: { count, unreadCount: count } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Mark One as Read ─────────────────────────────────────────────────────────
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await UserNotification.findOne({ _id: id, userId: req.user._id });
    if (!notification) return res.status(404).json({ status: 'error', message: 'Notification not found.' });

    notification.isRead = true;
    notification.readAt  = new Date();
    await notification.save();

    res.json({ status: 'success', message: 'Marked as read.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Mark All as Read ─────────────────────────────────────────────────────────
exports.markAllAsRead = async (req, res) => {
  try {
    const { module } = req.body;
    const query = { userId: req.user._id, isRead: false };
    if (module) query.module = module;

    await UserNotification.updateMany(query, { $set: { isRead: true, readAt: new Date() } });
    res.json({ status: 'success', message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Delete Notification ──────────────────────────────────────────────────────
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await UserNotification.findOneAndDelete({ _id: id, userId: req.user._id });
    res.json({ status: 'success', message: 'Notification deleted.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

const { registerPushToken, unregisterPushToken, isPushConfigured } = require('../services/pushNotificationService');

// Mobile apps send the token / platform under different names — accept the common ones
const readFcmToken = (body = {}) => body.fcmToken || body.fcm_token || body.token || null;
const readDeviceType = (body = {}) => {
  const raw = String(body.deviceType || body.device_type || body.platform || 'web').toLowerCase();
  return ['web', 'android', 'ios'].includes(raw) ? raw : 'web';
};

// ─── Push Endpoint Status (public, for checking in a browser) ─────────────────
// GET /api/v1/auth/fcm-token — reports whether the endpoint is live and FCM is set up.
exports.getPushTokenEndpointStatus = (req, res) => {
  const firebaseConfigured = isPushConfigured();
  res.json({
    status: 'success',
    message: 'FCM token endpoint is live. Use POST to save a device token and DELETE to remove it.',
    firebaseConfigured,
    usage: {
      method: 'POST | DELETE',
      headers: { Authorization: 'Bearer <accessToken>', 'Content-Type': 'application/json' },
      body: { fcmToken: '<device FCM token>', deviceType: 'android | ios | web' }
    }
  });
};

// ─── Register Push Token ──────────────────────────────────────────────────────
// Also served at POST /api/v1/auth/fcm-token for the mobile apps.
exports.registerPushToken = async (req, res) => {
  try {
    const fcmToken = readFcmToken(req.body);
    const deviceType = readDeviceType(req.body);
    if (!fcmToken) {
      return res.status(400).json({ status: 'error', message: 'fcmToken is required.' });
    }

    const tokenDoc = await registerPushToken({
      userId: req.user._id,
      fcmToken,
      deviceType
    });

    res.json({ status: 'success', message: 'Push token registered successfully.', data: tokenDoc });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Unregister Push Token ────────────────────────────────────────────────────
// Also served at DELETE /api/v1/auth/fcm-token for the mobile apps.
exports.unregisterPushToken = async (req, res) => {
  try {
    const fcmToken = readFcmToken(req.body);
    if (fcmToken) {
      await unregisterPushToken({ userId: req.user._id, fcmToken });
    }
    res.json({ status: 'success', message: 'Push token unregistered successfully.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
