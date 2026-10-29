const mongoose = require('mongoose');

const interestRequestSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled', 'withdrawn'],
      default: 'pending',
      index: true
    },

    // ─── Optional message from sender ────────────────────────────────────────
    message: { type: String, maxlength: 300 },

    // ─── Super Interest (plan feature superInterestsPerMonth) ─────────────────
    // Highlighted for the receiver and listed first; superAt counts toward the monthly quota
    isSuper: { type: Boolean, default: false },
    superAt: { type: Date },

    // ─── Status Timestamps (for audit trail) ─────────────────────────────────
    acceptedAt:   { type: Date },
    rejectedAt:   { type: Date },
    cancelledAt:  { type: Date },
    withdrawnAt:  { type: Date },

    // ─── Linked Conversation (set when accepted) ──────────────────────────────
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation'
    }
  },
  { timestamps: true }
);

// ─── Partial Unique Index ─────────────────────────────────────────────────────
// Prevents duplicate interests ONLY when status is 'pending' or 'accepted'.
// Allows re-sending interest after rejected or cancelled.
// Note: MongoDB partial indexes with $in are not directly supported,
// so we enforce this in the controller sendInterest logic instead.
interestRequestSchema.index({ receiverId: 1, status: 1 });
interestRequestSchema.index({ senderId: 1, status: 1 });
interestRequestSchema.index({ senderId: 1, receiverId: 1 });

module.exports = mongoose.model('InterestRequest', interestRequestSchema);

