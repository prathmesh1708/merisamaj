const mongoose = require('mongoose');

const userSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true
    },

    // ─── Snapshot (Historical Record) ─────────────────────────────────────────
    // Store these at purchase time so admin plan edits never corrupt old records.
    planName:        { type: String, required: true },
    // Copied from the plan: 'matrimonial' (older records have none = matrimonial) or 'app'
    planType:        { type: String, enum: ['matrimonial', 'app'], default: 'matrimonial', index: true },
    pricePaid:       { type: Number, required: true },
    durationInDays:  { type: Number, required: true },
    featuresSnapshot:{ type: mongoose.Schema.Types.Mixed, required: true }, // features object copy

    // ─── Payment Info ─────────────────────────────────────────────────────────
    paymentId:       { type: String },           // Razorpay / Stripe transaction ID
    paymentGateway:  { type: String },           // 'razorpay' | 'stripe' | 'manual'
    paymentStatus:   { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },

    // ─── Subscription Lifecycle ───────────────────────────────────────────────
    startDate:   { type: Date, required: true },
    endDate:     { type: Date, required: true, index: true },
    gracePeriodDays: { type: Number, default: 3 },  // Extra days before hard downgrade
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'grace'],
      default: 'active',
      index: true
    },

    // ─── Usage Tracking (reset monthly) ───────────────────────────────────────
    usage: {
      interestsSentThisMonth: { type: Number, default: 0 },
      profileViewsToday:      { type: Number, default: 0 },
      boostsUsed:             { type: Number, default: 0 },
      usageResetAt:           { type: Date, default: Date.now }
    },

    // ─── Audit ───────────────────────────────────────────────────────────────
    cancelledAt: { type: Date },
    cancelReason:{ type: String },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

// ─── Index for finding active subscription of a user ─────────────────────────
userSubscriptionSchema.index({ userId: 1, status: 1, endDate: -1 });

module.exports = mongoose.model('UserSubscription', userSubscriptionSchema);
