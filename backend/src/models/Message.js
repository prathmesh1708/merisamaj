const mongoose = require('mongoose');

/**
 * Message — Shared Chat Message Model
 * Used across all conversation types: matrimonial, community, group, support, member, announcement.
 *
 * Message Types:
 *  text        — Plain text message
 *  image       — Image uploaded to Cloudinary
 *  file        — Document/file upload
 *  system      — System-generated event message (e.g. "User joined the group")
 *  announcement — Announcement channel post (read-only for members)
 *  poll        — Future: poll message
 *  event       — Future: event card message
 *  deleted     — Soft-deleted for everyone placeholder
 */
const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // ─── Content ─────────────────────────────────────────────────────────────
    type: {
      type: String,
      enum: ['text', 'image', 'audio', 'voice', 'file', 'system', 'announcement', 'poll', 'event', 'deleted'],
      default: 'text'
    },
    message:  { type: String, default: '' },
    mediaUrl: { type: String, default: null },         // Cloudinary URL for images/files
    mediaPublicId: { type: String, default: null },    // For deletion from Cloudinary

    // ─── Metadata (for poll/event messages) ──────────────────────────────────
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },

    // ─── Threading ───────────────────────────────────────────────────────────
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    },

    // ─── @Mentions ────────────────────────────────────────────────────────────
    mentionedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // ─── Pinned ──────────────────────────────────────────────────────────────
    isPinned: { type: Boolean, default: false },
    pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    pinnedAt: { type: Date, default: null },

    // ─── Delivery & Read Tracking ─────────────────────────────────────────────
    deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    seenBy: [
      {
        userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        seenAt:  { type: Date }
      }
    ],

    // ─── Soft Delete ("Delete for me" support) ────────────────────────────────
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isDeleted:  { type: Boolean, default: false },   // Deleted for everyone (sender)
    deletedAt:  { type: Date }
  },
  { timestamps: true }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, conversationId: 1 });
messageSchema.index({ isPinned: 1, conversationId: 1 });

module.exports = mongoose.model('Message', messageSchema);

