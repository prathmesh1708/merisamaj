const mongoose = require('mongoose');

/**
 * Conversation — Shared Chat Module
 * Supports multiple chat types: matrimonial, member, community, group, support.
 * This avoids creating separate ChatRoom models per module.
 */
const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],

    // ─── Context ─────────────────────────────────────────────────────────────
    type: {
      type: String,
      enum: ['matrimonial', 'member', 'community', 'group', 'support'],
      default: 'member',
      index: true
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
      // For matrimonial: interestId; for group: groupId; etc.
    },

    // ─── Last Message Cache (avoids querying Message collection on list) ──────
    lastMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    },
    lastMessageAt: { type: Date, default: null, index: true },
    lastMessagePreview: { type: String, default: '' }, // Plain text preview

    // ─── State ───────────────────────────────────────────────────────────────
    isActive:   { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },  // Read-only after marriage confirmed
    isReadOnly: { type: Boolean, default: false },  // Blocks new messages when true
    archivedAt: { type: Date },
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // One-to-one chats (member / matrimonial / support): "<type>:<idA>:<idB>" with the
    // two user ids sorted. A unique index on it makes the database refuse a second chat
    // for the same pair, even when two "open chat" requests arrive at the same moment.
    pairKey:    { type: String },

    // ─── Soft Delete ─────────────────────────────────────────────────────────
    isDeleted:  { type: Boolean, default: false },
    deletedAt:  { type: Date }
  },
  { timestamps: true }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
conversationSchema.index({ participants: 1 });
conversationSchema.index({ type: 1, referenceId: 1 });
conversationSchema.index({ lastMessageAt: -1, isDeleted: 1 });
conversationSchema.index({ pairKey: 1 }, { unique: true, partialFilterExpression: { pairKey: { $type: 'string' } } });

module.exports = mongoose.model('Conversation', conversationSchema);
