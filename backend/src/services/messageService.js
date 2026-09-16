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
 * @param {string|mongoose.Types.ObjectId} userId
 */
const markMessagesSeen = async (messageIds, userId) => {
  if (!Array.isArray(messageIds) || messageIds.length === 0 || !userId) return;
  const mongoose = require('mongoose');
  const userObjId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  const validIds = messageIds.map(id => typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id);

  return Message.updateMany(
    {
      _id: { $in: validIds },
      'seenBy.userId': { $ne: userObjId },
      isDeleted: false
    },
    {
      $push: { seenBy: { userId: userObjId, seenAt: new Date() } },
      $addToSet: { deliveredTo: userObjId }
    }
  );
};

// ─── Mark Entire Conversation as Seen ─────────────────────────────────────────
/**
 * @param {string|mongoose.Types.ObjectId} conversationId
 * @param {string|mongoose.Types.ObjectId} userId
 */
const markConversationSeen = async (conversationId, userId) => {
  if (!conversationId || !userId) return;
  const mongoose = require('mongoose');
  const userObjId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  const convObjId = typeof conversationId === 'string' ? new mongoose.Types.ObjectId(conversationId) : conversationId;

  return Message.updateMany(
    {
      conversationId: convObjId,
      senderId: { $ne: userObjId },
      'seenBy.userId': { $ne: userObjId },
      isDeleted: false
    },
    {
      $push: { seenBy: { userId: userObjId, seenAt: new Date() } },
      $addToSet: { deliveredTo: userObjId }
    }
  );
};

// ─── Mark Messages as Delivered ──────────────────────────────────────────────
const markMessagesDelivered = async (conversationId, userId) => {
  if (!conversationId || !userId) return;
  const mongoose = require('mongoose');
  const userObjId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  const convObjId = typeof conversationId === 'string' ? new mongoose.Types.ObjectId(conversationId) : conversationId;

  return Message.updateMany(
    {
      conversationId: convObjId,
      deliveredTo: { $ne: userObjId },
      senderId: { $ne: userObjId },
      isDeleted: false
    },
    { $addToSet: { deliveredTo: userObjId } }
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
  markConversationSeen,
  markMessagesDelivered,
  deleteMessageForMe,
  deleteMessageForEveryone,
  editMessage,
  clearConversationMessages,
  pinMessage,
  unpinMessage,
  getPinnedMessages
};
