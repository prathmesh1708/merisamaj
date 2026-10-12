const UserNotification = require('../../models/UserNotification');
const Community = require('../../models/Community');

/**
 * GET /api/v1/admin/notifications/push-analytics
 * Computes push delivery stats: total, sent, failed, pending, module breakdown, community breakdown
 */
exports.getPushDeliveryAnalytics = async (req, res) => {
  try {
    const { communityId, module } = req.query;
    const matchQuery = {};

    if (communityId) matchQuery.communityId = communityId;
    if (module) matchQuery.module = module;

    // Aggregation for delivery status summary
    const statusStats = await UserNotification.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $ifNull: ['$pushStatus', 'pending'] },
          count: { $sum: 1 }
        }
      }
    ]);

    let sent = 0;
    let failed = 0;
    let pending = 0;
    let total = 0;

    statusStats.forEach(item => {
      total += item.count;
      if (item._id === 'sent') sent += item.count;
      else if (item._id === 'failed') failed += item.count;
      else pending += item.count;
    });

    // Module breakdown
    const moduleBreakdown = await UserNotification.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$module',
          total: { $sum: 1 },
          sent: {
            $sum: { $cond: [{ $eq: ['$pushStatus', 'sent'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$pushStatus', 'failed'] }, 1, 0] }
          }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Fetch communities list for filter dropdown
    const communities = await Community.find({ isActive: true }).select('name').lean();

    res.json({
      status: 'success',
      data: {
        summary: {
          total,
          sent,
          failed,
          pending,
          successRate: total > 0 ? Math.round((sent / total) * 100) : 100
        },
        moduleBreakdown,
        communities
      }
    });
  } catch (error) {
    console.error('getPushDeliveryAnalytics error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const AdminBroadcastLog = require('../../models/AdminBroadcastLog');
const User = require('../../models/User');
const { createNotification } = require('../../services/notificationService');
const { sendPushToUsers } = require('../../services/pushNotificationService');

/**
 * POST /api/v1/admin/notifications/broadcast
 * Send Platform-Wide or Targeted Custom Broadcast Message
 */
exports.sendAdminBroadcast = async (req, res) => {
  try {
    const { 
      broadcastId, 
      title, 
      message, 
      communityId, 
      targetRole = 'ALL', 
      channel = 'in_app',
      actionUrl = '/member/notifications'
    } = req.body;

    if (!broadcastId || !title || !message) {
      return res.status(400).json({ status: 'error', message: 'broadcastId, title, and message are required.' });
    }

    // Role Guard: Only Super Admin or Master Admin can send broadcast notifications
    const userRole = (req.user?.role || '').toLowerCase();
    const isAllowed = ['super_admin', 'master_admin'].includes(userRole);
    if (!isAllowed) {
      return res.status(403).json({ status: 'error', message: 'Unauthorized: Only highest-privilege administrators (Super Admin / Master Admin) can send platform broadcast notifications.' });
    }

    // Idempotency Check: Guard against duplicate form submissions
    const existingLog = await AdminBroadcastLog.findOne({ broadcastId });
    if (existingLog) {
      return res.status(200).json({
        status: 'success',
        message: 'Broadcast already processed (idempotent submission).',
        data: existingLog
      });
    }

    // Build Recipient User Filter Query
    const userQuery = { accountStatus: 'active' };
    if (communityId) userQuery.communityId = communityId;

    if (targetRole === 'HEAD') {
      userQuery.role = { $in: ['head', 'community_head', 'HEAD', 'COMMUNITY_HEAD'] };
    } else if (targetRole === 'MEMBER') {
      userQuery.role = { $in: ['member', 'user', 'MEMBER', 'USER'] };
    }

    const recipientUsers = await User.find(userQuery).select('_id communityId name role').lean();
    if (recipientUsers.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No active users match the selected target criteria.' });
    }

    const communityDoc = communityId ? await Community.findById(communityId).select('name').lean() : null;
    const communityName = communityDoc?.name || 'All Communities';

    // Bulk Fan-out Notifications
    const now = new Date();
    const notificationsToInsert = recipientUsers.map(u => ({
      userId: u._id,
      communityId: u.communityId || communityId,
      module: 'announcement',
      type: 'admin_broadcast',
      title: title.trim(),
      message: message.trim(),
      icon: '📢',
      priority: 'high',
      isRead: false,
      pushStatus: channel === 'in_app_push' ? 'pending' : 'none',
      actionUrl,
      createdAt: now,
      updatedAt: now
    }));

    await UserNotification.insertMany(notificationsToInsert);

    // Socket Broadcast Notification
    try {
      const io = req.app.get('io');
      if (io) {
        if (communityId) {
          io.to(`community:${communityId}`).emit('notification:new', {
            title, message, icon: '📢', module: 'announcement', actionUrl
          });
        } else {
          io.emit('notification:new', {
            title, message, icon: '📢', module: 'announcement', actionUrl
          });
        }
      }
    } catch (sErr) {
      console.warn('[BroadcastSocketNotice]', sErr.message);
    }

    // Optional FCM Push Dispatch
    if (channel === 'in_app_push') {
      // One batched multicast to every recipient device (non-blocking)
      sendPushToUsers({
        userIds: recipientUsers.map(u => u._id),
        type: 'admin_broadcast',
        title: `📢 ${title}`,
        message,
        icon: '📢',
        actionUrl
      }).then(result => {
        const pushStatus = result.status === 'success' && result.successCount > 0 ? 'sent' : 'failed';
        return UserNotification.updateMany(
          { type: 'admin_broadcast', pushStatus: 'pending', createdAt: now },
          { $set: { pushStatus, pushSent: pushStatus === 'sent' } }
        );
      }).catch(err => console.warn('[BroadcastPushError]', err.message));
    }

    // Create Audit Log Record
    const auditLog = await AdminBroadcastLog.create({
      broadcastId,
      senderId: req.user._id,
      senderName: req.user.name || 'System Admin',
      senderRole: req.user.role,
      title,
      message,
      communityId: communityId || null,
      communityName,
      targetRole,
      channel,
      recipientCount: recipientUsers.length
    });

    res.status(201).json({
      status: 'success',
      message: `Broadcast message dispatched successfully to ${recipientUsers.length} members.`,
      data: auditLog
    });
  } catch (error) {
    console.error('sendAdminBroadcast error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * GET /api/v1/admin/notifications/broadcast-history
 * Fetch audit logs of previous broadcast messages
 */
exports.getBroadcastHistory = async (req, res) => {
  try {
    const logs = await AdminBroadcastLog.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ status: 'success', data: logs });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

