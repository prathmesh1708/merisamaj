/**
 * messageService.js
 * Reusable service layer for Message CRUD.
 * Decouples message logic from controllers; callable from socket handlers too.
 */
const Message = require('../models/Message');
const { updateLastMessage } = require('./conversationService');

// ─── Create Message ───────────────────────────────────────────────────────────
/**
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.senderId
 * @param {string} [params.type='text']
 * @param {string} [params.message]
 * @param {string} [params.mediaUrl]
 * @param {string} [params.mediaPublicId]
 * @param {string} [params.replyTo]
 * @param {string[]} [params.mentionedUsers]
 * @param {Object}  [params.metadata]
 * @returns {Promise<Message>} Populated message document
 */
const createMessage = async ({
  conversationId,
  senderId,
  type = 'text',
  message = '',
  mediaUrl = null,
  mediaPublicId = null,
  replyTo = null,
  mentionedUsers = [],
  metadata = null
}) => {
  const newMsg = await Message.create({
    conversationId,
    senderId,
    type,
    message,
    mediaUrl,
    mediaPublicId,
    replyTo,
    mentionedUsers,
    metadata,
    deliveredTo: [senderId]
  });

  // Update conversation's last message cache
  await updateLastMessage(conversationId, newMsg);

  // Return populated
  return Message.findById(newMsg._id)
    .populate('senderId', 'name avatar _id')
    .populate('replyTo', 'message type senderId')
    .lean();
};

// ─── Get Messages (Paginated) ─────────────────────────────────────────────────
/**
 * @param {string} conversationId
 * @param {string} requestingUserId - Used to filter deletedFor
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<{messages: Message[], total: number}>}
 */
const getMessages = async (conversationId, requestingUserId, page = 1, limit = 50) => {
  const filter = {
    conversationId,
    isDeleted: false,
    deletedFor: { $ne: requestingUserId }
  };

  const total = await Message.countDocuments(filter);
  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('senderId', 'name avatar _id')
    .populate('replyTo', 'message type senderId mediaUrl')
    .lean();

  return { messages: messages.reverse(), total, page };
};

// ─── Mark Messages as Seen ───────────────────────────────────────────────────
/**
 * @param {string[]} messageIds
 * @param {string} userId
 */
const markMessagesSeen = async (messageIds, userId) => {
  await Message.updateMany(
    {
      _id: { $in: messageIds },
      'seenBy.userId': { $ne: userId },
      isDeleted: false
    },
    {
      $push: { seenBy: { userId, seenAt: new Date() } },
      $addToSet: { deliveredTo: userId }
    }
  );
};

// ─── Mark Messages as Delivered ──────────────────────────────────────────────
const markMessagesDelivered = async (conversationId, userId) => {
  await Message.updateMany(
    {
      conversationId,
      deliveredTo: { $ne: userId },
      senderId: { $ne: userId },
      isDeleted: false
    },
    { $addToSet: { deliveredTo: userId } }
  );
};

// ─── Delete Message for Me ────────────────────────────────────────────────────
const deleteMessageForMe = async (messageId, userId) => {
  return Message.findByIdAndUpdate(
    messageId,
    { $addToSet: { deletedFor: userId } },
    { new: true }
  );
};

// ─── Delete Message for Everyone ─────────────────────────────────────────────
/**
 * Soft-delete: clears content, marks type='deleted'.
 * Also triggers Cloudinary cleanup if mediaPublicId exists.
 */
const deleteMessageForEveryone = async (messageId, senderId) => {
  const msg = await Message.findOne({ _id: messageId, isDeleted: false });
  if (!msg) return null;
  if (msg.senderId.toString() !== senderId.toString()) {
    throw new Error('You can only delete your own messages for everyone.');
  }

  // Cloudinary cleanup
  if (msg.mediaPublicId && (msg.type === 'image' || msg.type === 'file')) {
    try {
      const cloudinary = require('cloudinary').v2;
      await cloudinary.uploader.destroy(msg.mediaPublicId);
    } catch (err) {
      console.warn('[MessageService] Cloudinary deletion failed:', err.message);
    }
  }

  msg.isDeleted  = true;
  msg.deletedAt  = new Date();
  msg.type       = 'deleted';
  msg.message    = 'This message was deleted';
  msg.mediaUrl   = null;
  msg.mediaPublicId = null;

  await msg.save();
  return msg;
};

// ─── Pin / Unpin Message ──────────────────────────────────────────────────────
const pinMessage = async (messageId, pinnedBy) => {
  return Message.findByIdAndUpdate(
    messageId,
    { isPinned: true, pinnedBy, pinnedAt: new Date() },
    { new: true }
  );
};

const unpinMessage = async (messageId) => {
  return Message.findByIdAndUpdate(
    messageId,
    { isPinned: false, pinnedBy: null, pinnedAt: null },
    { new: true }
  );
};

// ─── Get Pinned Messages ──────────────────────────────────────────────────────
const getPinnedMessages = async (conversationId) => {
  return Message.find({ conversationId, isPinned: true, isDeleted: false })
    .sort({ pinnedAt: -1 })
    .populate('senderId', 'name avatar')
    .populate('pinnedBy', 'name');
};
const editMessage = async (messageId, senderId, newText) => {
  const msg = await Message.findOne({ _id: messageId, isDeleted: false });
  if (!msg) throw new Error('Message not found.');
  if (msg.senderId.toString() !== senderId.toString()) {
    throw new Error('You can only edit your own messages.');
  }
  msg.message = newText;
  msg.isEdited = true;
  msg.editedAt = new Date();
  await msg.save();

  return Message.findById(msg._id)
    .populate('senderId', 'name avatar _id')
    .populate('replyTo', 'message type senderId')
    .lean();
};

// ─── Clear Conversation Messages For User ────────────────────────────────────
const clearConversationMessages = async (conversationId, userId) => {
  await Message.updateMany(
    { conversationId, deletedFor: { $ne: userId } },
    { $addToSet: { deletedFor: userId } }
  );
};

module.exports = {
  createMessage,
  getMessages,
  markMessagesSeen,
  markMessagesDelivered,
  deleteMessageForMe,
  deleteMessageForEveryone,
  editMessage,
  clearConversationMessages,
  pinMessage,
  unpinMessage,
  getPinnedMessages
};
