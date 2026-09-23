const mongoose = require('mongoose');

/**
 * UserNotification — Centralized notification system for ALL modules.
 * Events, Donations, Voting, Matrimonial, Chat, Referrals, etc. all use this.
 */
const userNotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      index: true
    },

    // ─── Categorization ──────────────────────────────────────────────────────
    module: {
      type: String,
      enum: [
        'census',
        'leadership',
        'matrimonial',
        'events',
        'donations',
        'funds',
        'dharmashala',
        'obituary',
        'social',
        'announcement',
        'community',
        'chat',
        'professional',
        'voting',
        'invitations',
        'account',
        'members'
      ],
      required: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      index: true
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },

    // ─── Content ─────────────────────────────────────────────────────────────
    icon:      { type: String, default: '🔔' },
    title:     { type: String, required: true },
    message:   { type: String, required: true },
    actionUrl: { type: String },          // Deep link or URL for navigation

    // ─── Reference (for navigation / detail lookup) ───────────────────────────
    referenceId:   { type: mongoose.Schema.Types.ObjectId },
    referenceType: { type: String },      // 'InterestRequest', 'Event', 'Donation', 'Post'...

    // ─── Aggregation / Debounce Tracking ────────────────────────────────────
    aggregateCount: { type: Number, default: 1 },
    lastActorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ─── In-App State ────────────────────────────────────────────────────────
    isRead:    { type: Boolean, default: false, index: true },
    readAt:    { type: Date },

    // ─── Push Notification Delivery Tracking (FCM - Phase 3) ─────────────────
    pushSent:   { type: Boolean, default: false },
    pushStatus: { type: String, enum: ['none', 'pending', 'sent', 'failed'], default: 'none' }
  },
  { timestamps: true }
);

// ─── Compound Indexes for Query Performance ───────────────────────────────────
userNotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
userNotificationSchema.index({ userId: 1, createdAt: -1 });
userNotificationSchema.index({ userId: 1, module: 1 });
userNotificationSchema.index({ userId: 1, referenceId: 1, type: 1 }); // For fast lookup during aggregation/debounce

// ─── TTL Indexes for Auto-Cleanup ─────────────────────────────────────────────
// 30 Days TTL for READ notifications (uses readAt timestamp)
userNotificationSchema.index(
  { readAt: 1 },
  { expireAfterSeconds: 2592000, partialFilterExpression: { isRead: true } }
);

// 90 Days TTL for UNREAD notifications (uses createdAt timestamp)
userNotificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7776000, partialFilterExpression: { isRead: false } }
);

module.exports = mongoose.model('UserNotification', userNotificationSchema);
