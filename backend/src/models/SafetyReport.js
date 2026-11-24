const mongoose = require('mongoose');

/**
 * A member's report about a post, comment, story, chat message or member
 * (Child Safety Standards Policy, section 5). Child-safety reports are marked
 * `priority: 'urgent'`, hide the content at once and sit at the top of the
 * admin queue (Admin → Social → Safety reports).
 */
const REASONS = ['child_safety', 'underage', 'sexual_content', 'harassment', 'hate', 'violence', 'spam', 'fake_profile', 'other'];
const URGENT_REASONS = ['child_safety', 'underage'];

const safetyReportSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: { type: String, enum: ['post', 'comment', 'story', 'message', 'user'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    // The member who wrote / owns the reported content (or the reported member)
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', default: null, index: true },
    reason: { type: String, enum: REASONS, required: true },
    details: { type: String, trim: true, maxlength: 1000, default: '' },
    priority: { type: String, enum: ['urgent', 'normal'], default: 'normal', index: true },
    // Short copy of what was reported, so the admin sees it even if it is later deleted
    snapshot: { type: String, default: '' },
    contentHidden: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'actioned', 'dismissed'], default: 'pending', index: true },
    resolution: { type: String, default: '' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// One open report per member per item
safetyReportSchema.index({ reporterId: 1, targetType: 1, targetId: 1 }, { unique: true });
safetyReportSchema.index({ status: 1, priority: 1, createdAt: -1 });

const SafetyReport = mongoose.model('SafetyReport', safetyReportSchema);
SafetyReport.REASONS = REASONS;
SafetyReport.URGENT_REASONS = URGENT_REASONS;
module.exports = SafetyReport;
