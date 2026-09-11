const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const HeadBroadcastLog = require('../../models/HeadBroadcastLog');
const NotificationTemplate = require('../../models/NotificationTemplate');
const User = require('../../models/User');
const Community = require('../../models/Community');
const { createBroadcastNotification } = require('../../services/notificationService');
const { sendPushNotification } = require('../../services/pushNotificationService');
const { applyScopeFilter } = require('../../utils/queryScopeHelper');

// Default initial system templates
const DEFAULT_TEMPLATES = [
  {
    name: 'General Community Announcement',
    category: 'General',
    titleTemplate: '📢 Community Notice: {{title}}',
    bodyTemplate: 'Dear Members, please note: {{message}}. Best regards, {{community}} Samaj Head Office.',
    isSystemDefault: true
  },
  {
    name: 'Upcoming Community Sammelan / Event',
    category: 'Event',
    titleTemplate: '🎉 Upcoming Event: {{title}}',
    bodyTemplate: 'All community members are cordially invited to participate in {{title}} scheduled on {{date}} at {{venue}}.',
    isSystemDefault: true
  },
  {
    name: 'Matrimonial Meet Invitation',
    category: 'Matrimonial',
    titleTemplate: '💍 Community Matrimonial Sammelan Registration',
    bodyTemplate: 'Registrations are now open for the upcoming {{community}} Matrimonial Meet. Verified candidates please register.',
    isSystemDefault: true
  },
  {
    name: 'Urgent Samaj Alert',
    category: 'Emergency',
    titleTemplate: '🚨 Urgent Notice from Community Leadership',
    bodyTemplate: 'Important Alert for all {{community}} members: {{message}}. Please contact Samaj helpline for any support.',
    isSystemDefault: true
  },
  {
    name: 'Community Executive Meeting Notice',
    category: 'Meeting',
    titleTemplate: '📋 Samaj Executive Council Meeting',
    bodyTemplate: 'An Executive Council Meeting will be held on {{date}} at {{time}}. All registered local members are requested to attend.',
    isSystemDefault: true
  }
];

/**
 * @desc    Send community broadcast message or schedule for future delivery
 * @route   POST /api/v1/head/notifications/broadcast
 * @access  Private (Head/Admin)
 */
exports.sendHeadBroadcast = async (req, res) => {
  try {
    const communityId = req.communityId || req.user?.communityId;
    if (!communityId) {
      return res.status(400).json({ status: 'fail', message: 'No community associated with this head account.' });
    }

    const {
      title,
      message,
      category = 'General',
      priority = 'normal',
      audienceFilter = {},
      scheduledFor,
      actionUrl
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ status: 'fail', message: 'Title and message are required.' });
    }

    const broadcastId = `hbc_${uuidv4().substring(0, 8)}_${Date.now()}`;
    const isScheduled = scheduledFor && new Date(scheduledFor) > new Date();

    // Query target members within Head's community scope
    const memberQuery = {
      communityId,
      accountStatus: { $ne: 'deleted' },
      role: { $in: ['user', 'member', 'head', 'sub_head'] }
    };

    if (audienceFilter.city && audienceFilter.city !== 'all') {
      memberQuery.city = audienceFilter.city;
    }
    if (audienceFilter.gender && audienceFilter.gender !== 'all') {
      memberQuery.gender = audienceFilter.gender;
    }
    if (audienceFilter.verificationStatus && audienceFilter.verificationStatus !== 'all') {
      memberQuery.verificationStatus = audienceFilter.verificationStatus;
    }

    const targetMembers = await User.find(memberQuery).select('_id name phone email').lean();
    const recipientCount = targetMembers.length;

    // Create Broadcast Log
    const broadcastLog = new HeadBroadcastLog({
      broadcastId,
      title,
      message,
      category,
      priority,
      communityId,
      sentBy: req.user._id,
      audienceFilter: {
        city: audienceFilter.city || 'all',
        verificationStatus: audienceFilter.verificationStatus || 'all',
        gender: audienceFilter.gender || 'all'
      },
      recipientCount,
      status: isScheduled ? 'scheduled' : 'sent',
      scheduledFor: isScheduled ? new Date(scheduledFor) : undefined,
      sentAt: isScheduled ? undefined : new Date()
    });

    await broadcastLog.save();

    // If immediate dispatch, fan-out broadcast in-app and push
    if (!isScheduled) {
      const communityDoc = await Community.findById(communityId).select('name').lean();
      const communityName = communityDoc ? communityDoc.name : 'Community';

      try {
        await createBroadcastNotification({
          communityId,
          title: `[${communityName}] ${title}`,
          message,
          module: 'social',
          type: 'head_broadcast',
          icon: '📢',
          priority: priority === 'urgent' ? 'high' : priority,
          actionUrl: actionUrl || '/member/announcements'
        });
      } catch (broadcastErr) {
        console.warn('[HeadBroadcast] in-app dispatch warning:', broadcastErr.message);
      }

      // Socket.io real-time broadcast notification
      const io = req.app.get('io');
      if (io) {
        io.emit('head:broadcast_notification', {
          broadcastId,
          communityId: communityId.toString(),
          title,
          message,
          category,
          priority,
          sentAt: new Date()
        });
      }
    }

    res.status(200).json({
      status: 'success',
      message: isScheduled
        ? `Alert scheduled successfully for ${new Date(scheduledFor).toLocaleString('en-IN')}`
        : `Broadcast alert dispatched successfully to ${recipientCount} community members!`,
      data: broadcastLog
    });
  } catch (error) {
    console.error('Head Broadcast Error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to dispatch broadcast' });
  }
};

/**
 * @desc    Get broadcast alert history
 * @route   GET /api/v1/head/notifications/broadcasts
 */
exports.getBroadcastHistory = async (req, res) => {
  try {
    const communityId = req.communityId || req.user?.communityId;
    const { page = 1, limit = 20, status } = req.query;

    const query = { communityId };
    if (status && status !== 'all') query.status = status;

    const total = await HeadBroadcastLog.countDocuments(query);
    const history = await HeadBroadcastLog.find(query)
      .populate('sentBy', 'name role')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    res.status(200).json({
      status: 'success',
      total,
      page: Number(page),
      data: history
    });
  } catch (error) {
    console.error('Get Broadcast History Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch broadcast history' });
  }
};

/**
 * @desc    Get scheduled alerts queue
 * @route   GET /api/v1/head/notifications/scheduled
 */
exports.getScheduledAlerts = async (req, res) => {
  try {
    const communityId = req.communityId || req.user?.communityId;
    const scheduled = await HeadBroadcastLog.find({
      communityId,
      status: 'scheduled'
    })
      .populate('sentBy', 'name')
      .sort({ scheduledFor: 1 })
      .lean();

    res.status(200).json({
      status: 'success',
      data: scheduled
    });
  } catch (error) {
    console.error('Get Scheduled Alerts Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch scheduled alerts' });
  }
};

/**
 * @desc    Cancel a pending scheduled alert
 * @route   DELETE /api/v1/head/notifications/scheduled/:id
 */
exports.cancelScheduledAlert = async (req, res) => {
  try {
    const communityId = req.communityId || req.user?.communityId;
    const alert = await HeadBroadcastLog.findOne({
      _id: req.params.id,
      communityId,
      status: 'scheduled'
    });

    if (!alert) {
      return res.status(404).json({ status: 'fail', message: 'Scheduled alert not found or already dispatched.' });
    }

    alert.status = 'cancelled';
    await alert.save();

    res.status(200).json({
      status: 'success',
      message: 'Scheduled alert cancelled successfully.'
    });
  } catch (error) {
    console.error('Cancel Scheduled Alert Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to cancel scheduled alert' });
  }
};

/**
 * @desc    Get notification templates for head community
 * @route   GET /api/v1/head/notifications/templates
 */
exports.getTemplates = async (req, res) => {
  try {
    const communityId = req.communityId || req.user?.communityId;

    // Seed defaults in database if no system templates exist
    const systemCount = await NotificationTemplate.countDocuments({ isSystemDefault: true });
    if (systemCount === 0) {
      await NotificationTemplate.insertMany(DEFAULT_TEMPLATES).catch(() => {});
    }

    const templates = await NotificationTemplate.find({
      $or: [
        { isSystemDefault: true },
        { communityId }
      ]
    })
      .sort({ isSystemDefault: -1, createdAt: -1 })
      .lean();

    res.status(200).json({
      status: 'success',
      data: templates
    });
  } catch (error) {
    console.error('Get Templates Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch templates' });
  }
};

/**
 * @desc    Create custom notification template
 * @route   POST /api/v1/head/notifications/templates
 */
exports.createTemplate = async (req, res) => {
  try {
    const communityId = req.communityId || req.user?.communityId;
    const { name, category, titleTemplate, bodyTemplate } = req.body;

    if (!name || !titleTemplate || !bodyTemplate) {
      return res.status(400).json({ status: 'fail', message: 'Name, title template, and body template are required.' });
    }

    const template = new NotificationTemplate({
      name,
      category: category || 'General',
      titleTemplate,
      bodyTemplate,
      communityId,
      isSystemDefault: false,
      createdBy: req.user._id
    });

    await template.save();

    res.status(201).json({
      status: 'success',
      message: 'Custom notification template created successfully.',
      data: template
    });
  } catch (error) {
    console.error('Create Template Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create template' });
  }
};

/**
 * @desc    Update custom notification template
 * @route   PUT /api/v1/head/notifications/templates/:id
 */
exports.updateTemplate = async (req, res) => {
  try {
    const communityId = req.communityId || req.user?.communityId;
    const { name, category, titleTemplate, bodyTemplate } = req.body;

    const template = await NotificationTemplate.findOne({
      _id: req.params.id,
      $or: [{ communityId }, { isSystemDefault: false }]
    });

    if (!template) {
      return res.status(404).json({ status: 'fail', message: 'Template not found or cannot be modified.' });
    }

    if (name) template.name = name;
    if (category) template.category = category;
    if (titleTemplate) template.titleTemplate = titleTemplate;
    if (bodyTemplate) template.bodyTemplate = bodyTemplate;

    await template.save();

    res.status(200).json({
      status: 'success',
      message: 'Template updated successfully.',
      data: template
    });
  } catch (error) {
    console.error('Update Template Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update template' });
  }
};

/**
 * @desc    Delete custom notification template
 * @route   DELETE /api/v1/head/notifications/templates/:id
 */
exports.deleteTemplate = async (req, res) => {
  try {
    const communityId = req.communityId || req.user?.communityId;
    const template = await NotificationTemplate.findOneAndDelete({
      _id: req.params.id,
      communityId,
      isSystemDefault: { $ne: true }
    });

    if (!template) {
      return res.status(404).json({ status: 'fail', message: 'Custom template not found or system templates cannot be deleted.' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Template deleted successfully.'
    });
  } catch (error) {
    console.error('Delete Template Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete template' });
  }
};
