const mongoose = require('mongoose');

const profileReportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    reason: {
      type: String,
      enum: ['child_safety', 'underage', 'fake_profile', 'inappropriate_photos', 'harassment', 'spam', 'fraud', 'other'],
      required: true
    },
    description: { type: String, maxlength: 1000 },
    // child_safety / underage reports are urgent: listed first for admins (Child Safety Standards Policy)
    priority: { type: String, enum: ['urgent', 'normal'], default: 'normal', index: true },

    // ─── Moderation ──────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'actioned', 'dismissed'],
      default: 'pending',
      index: true
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    adminNotes: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProfileReport', profileReportSchema);
