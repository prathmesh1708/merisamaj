const HeadBroadcastLog = require('../models/HeadBroadcastLog');
const Community = require('../models/Community');
const { createBroadcastNotification } = require('./notificationService');

/**
 * Check and process any scheduled community broadcasts that are due
 */
const processScheduledBroadcasts = async (io) => {
  try {
    const now = new Date();
    const pendingAlerts = await HeadBroadcastLog.find({
      status: 'scheduled',
      scheduledFor: { $lte: now }
    }).limit(10);

    for (const alert of pendingAlerts) {
      try {
        const communityDoc = await Community.findById(alert.communityId).select('name').lean();
        const communityName = communityDoc ? communityDoc.name : 'Community';

        await createBroadcastNotification({
          communityId: alert.communityId,
          title: `[${communityName}] ${alert.title}`,
          message: alert.message,
          module: 'social',
          type: 'head_broadcast',
          icon: '📢',
          priority: alert.priority === 'urgent' ? 'high' : alert.priority,
          actionUrl: '/member/announcements'
        });

        alert.status = 'sent';
        alert.sentAt = new Date();
        await alert.save();

        if (io) {
          io.emit('head:broadcast_notification', {
            broadcastId: alert.broadcastId,
            communityId: alert.communityId.toString(),
            title: alert.title,
            message: alert.message,
            category: alert.category,
            priority: alert.priority,
            sentAt: alert.sentAt
          });
        }
      } catch (alertErr) {
        console.error(`[Scheduler] Failed to dispatch alert ${alert._id}:`, alertErr.message);
      }
    }
  } catch (err) {
    // Non-blocking log
  }
};

let schedulerInterval = null;

const startNotificationScheduler = (io) => {
  if (schedulerInterval) return;
  // Run every 20 seconds
  schedulerInterval = setInterval(() => {
    processScheduledBroadcasts(io);
  }, 20000);
};

module.exports = {
  startNotificationScheduler,
  processScheduledBroadcasts
};
