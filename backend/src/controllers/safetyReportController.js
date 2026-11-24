const mongoose = require('mongoose');
const SafetyReport = require('../models/SafetyReport');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Story = require('../models/Story');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const SocialAuditLog = require('../models/SocialAuditLog');

const isId = (v) => mongoose.Types.ObjectId.isValid(String(v || ''));
const short = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 280);

// Loads what is being reported: who owns it, its community, a short copy, and
// how to hide it while it is reviewed (only content shown to many people is hidden).
const loadTarget = async (targetType, targetId, reporterId) => {
  switch (targetType) {
    case 'post': {
      const p = await Post.findOne({ _id: targetId, isDeleted: { $ne: true } }).select('authorId userId communityId title content media').lean();
      if (!p) return null;
      return { ownerId: p.authorId || p.userId, communityId: p.communityId, snapshot: short(p.title ? `${p.title} — ${p.content || ''}` : p.content) || '[media post]', hide: () => Post.updateOne({ _id: targetId }, { status: 'reported' }) };
    }
    case 'comment': {
      const c = await Comment.findOne({ _id: targetId, isDeleted: { $ne: true } }).select('userId text').lean();
      if (!c) return null;
      return { ownerId: c.userId, snapshot: short(c.text), hide: () => Comment.updateOne({ _id: targetId }, { status: 'reported' }) };
    }
    case 'story': {
      const s = await Story.findOne({ _id: targetId, isDeleted: { $ne: true } }).select('userId communityId text media').lean();
      if (!s) return null;
      return { ownerId: s.userId, communityId: s.communityId, snapshot: short(s.text) || '[story media]', hide: () => Story.updateOne({ _id: targetId }, { status: 'reported' }) };
    }
    case 'message': {
      const m = await Message.findOne({ _id: targetId }).select('senderId conversationId message type mediaUrl').lean();
      if (!m) return null;
      // Only someone in the conversation can report one of its messages
      const conv = m.conversationId ? await Conversation.findById(m.conversationId).select('participants').lean() : null;
      if (conv && !(conv.participants || []).some(p => String(p) === String(reporterId))) return { forbidden: true };
      return { ownerId: m.senderId, snapshot: short(m.message) || `[${m.type || 'media'} message]` };
    }
    case 'user': {
      const u = await User.findById(targetId).select('name communityId').lean();
      if (!u) return null;
      return { ownerId: u._id, communityId: u.communityId, snapshot: short(u.name) };
    }
    default:
      return null;
  }
};

// @desc    Report a post, comment, story, chat message or member
// @route   POST /api/v1/member/safety-reports
// @access  Member
exports.createReport = async (req, res) => {
  try {
    const { targetType, targetId, reason } = req.body || {};
    const details = String(req.body?.details || '').trim().slice(0, 1000);
    if (!['post', 'comment', 'story', 'message', 'user'].includes(targetType) || !isId(targetId)) {
      return res.status(400).json({ success: false, message: 'Choose what you are reporting.' });
    }
    if (!SafetyReport.REASONS.includes(reason)) {
      return res.status(400).json({ success: false, message: 'Choose a reason for the report.' });
    }

    const target = await loadTarget(targetType, targetId, req.user._id);
    if (!target) return res.status(404).json({ success: false, message: 'This content is no longer available.' });
    if (target.forbidden) return res.status(403).json({ success: false, message: 'You can only report messages sent to you.' });
    if (target.ownerId && String(target.ownerId) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot report your own content.' });
    }

    const urgent = SafetyReport.URGENT_REASONS.includes(reason);
    const existing = await SafetyReport.findOne({ reporterId: req.user._id, targetType, targetId });
    if (existing && existing.status === 'pending') {
      // A second report from the same member can only raise the priority
      if (urgent && existing.priority !== 'urgent') {
        existing.reason = reason;
        existing.priority = 'urgent';
        if (details) existing.details = details;
        await existing.save();
      } else {
        return res.status(200).json({ success: true, message: 'You have already reported this. Our team is reviewing it.' });
      }
    }

    let contentHidden = false;
    if (urgent && target.hide) {
      await target.hide();
      contentHidden = true;
    }

    if (!existing || existing.status !== 'pending') {
      await SafetyReport.findOneAndUpdate(
        { reporterId: req.user._id, targetType, targetId },
        {
          $set: {
            targetUserId: target.ownerId || null,
            communityId: target.communityId || null,
            reason, details, priority: urgent ? 'urgent' : 'normal',
            snapshot: target.snapshot || '', contentHidden,
            status: 'pending', resolution: '', resolvedBy: null, resolvedAt: null
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } else if (contentHidden) {
      await SafetyReport.updateOne({ _id: existing._id }, { contentHidden: true });
    }

    if (urgent) console.warn(`[SafetyReport] URGENT ${reason} report on ${targetType} ${targetId}`);
    return res.status(201).json({
      success: true,
      message: urgent
        ? 'Thank you. This has been hidden and sent to our child safety team. If a child is in danger, call 112 or 1098 now.'
        : 'Thank you. Our team will review this report.'
    });
  } catch (error) {
    console.error('createReport error:', error);
    return res.status(500).json({ success: false, message: 'Could not send the report. Please try again.' });
  }
};

// @desc    Reports queue — urgent (child safety) first, then newest
// @route   GET /api/v1/admin/social/safety-reports?status=pending
// @access  Admin
exports.listReports = async (req, res) => {
  try {
    const status = ['pending', 'actioned', 'dismissed', 'all'].includes(req.query.status) ? req.query.status : 'pending';
    const filter = status === 'all' ? {} : { status };
    const [reports, urgentPending] = await Promise.all([
      SafetyReport.find(filter)
        .sort({ priority: -1, createdAt: -1 }) // 'urgent' > 'normal'
        .limit(200)
        .populate('reporterId', 'name phone avatar')
        .populate('targetUserId', 'name phone avatar accountStatus')
        .populate('resolvedBy', 'name')
        .lean(),
      SafetyReport.countDocuments({ status: 'pending', priority: 'urgent' })
    ]);
    return res.status(200).json({ success: true, data: reports, urgentPending });
  } catch (error) {
    console.error('listReports error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Act on a report: remove the content, also block the account, or dismiss
// @route   PUT /api/v1/admin/social/safety-reports/:id   { action: 'remove' | 'remove_and_block' | 'dismiss', note }
// @access  Admin
exports.resolveReport = async (req, res) => {
  try {
    const { action } = req.body || {};
    const note = String(req.body?.note || '').trim().slice(0, 500);
    if (!['remove', 'remove_and_block', 'dismiss'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Unknown action.' });
    }
    const report = await SafetyReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

    const { targetType, targetId } = report;
    const models = { post: Post, comment: Comment, story: Story };
    if (action === 'dismiss') {
      // Put back content that was hidden only because of this report
      if (report.contentHidden && models[targetType]) {
        const stillReported = await SafetyReport.exists({ _id: { $ne: report._id }, targetType, targetId, status: 'pending', priority: 'urgent' });
        if (!stillReported) await models[targetType].updateOne({ _id: targetId, status: 'reported' }, { status: 'published' });
      }
    } else {
      if (models[targetType]) await models[targetType].updateOne({ _id: targetId }, { isDeleted: true });
      if (targetType === 'message') await Message.updateOne({ _id: targetId }, { isDeleted: true, type: 'deleted', message: '' });
      if (action === 'remove_and_block' && report.targetUserId) {
        await User.updateOne({ _id: report.targetUserId }, { accountStatus: 'blocked' });
      }
    }

    const resolution = action === 'dismiss' ? 'dismissed' : 'actioned';
    // Close every open report about the same item
    await SafetyReport.updateMany(
      { targetType, targetId, status: 'pending' },
      { status: resolution, resolution: [action, note].filter(Boolean).join(' — '), resolvedBy: req.user._id, resolvedAt: new Date() }
    );

    const auditType = { post: 'Post', comment: 'Comment', story: 'Story' }[targetType] || 'Settings';
    await SocialAuditLog.create({
      adminId: req.user._id, adminName: req.user.name || 'Admin',
      action: `safety_report_${action}`, targetType: auditType, targetId,
      details: `${report.reason} report on ${targetType} ${targetId}: ${action}${note ? ` (${note})` : ''}`
    }).catch(err => console.error('Audit Log Error:', err.message));

    return res.status(200).json({ success: true, message: action === 'dismiss' ? 'Report dismissed.' : 'Action taken.' });
  } catch (error) {
    console.error('resolveReport error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
