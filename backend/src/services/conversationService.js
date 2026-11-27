/**
 * conversationService.js
 * Reusable service layer for Conversation CRUD operations.
 * Used by: memberChatController, groupChatController, announcementController, matrimonialChatController
 */
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// ─── Find or Create a 1-to-1 Conversation ────────────────────────────────────
/**
 * @param {string} userAId - First participant's userId
 * @param {string} userBId - Second participant's userId
 * @param {string} type    - 'member' | 'matrimonial' | 'support'
 * @param {string|null} referenceId - Optional linked document ID
 * @returns {Promise<{conversation: Conversation, isNew: boolean}>}
 */
const pairKeyOf = (type, a, b) => type + ':' + [String(a), String(b)].sort().join(':');
const pairLocks = new Map(); // requests for the same pair on this server run one after another

const findOrCreateConversation = (userAId, userBId, type = 'member', referenceId = null) => {
  const pairKey = pairKeyOf(type, userAId, userBId);
  const run = async () => {
    // Existing chat between these two (older chats have no pairKey). With duplicates
    // from before this fix, use the one most recently active.
    const existing = await Conversation.findOne({
      type,
      participants: { $all: [userAId, userBId], $size: 2 },
      isDeleted: false
    }).sort({ lastMessageAt: -1, createdAt: 1 });
    if (existing) return { conversation: existing, isNew: false };

    try {
      const conversation = await Conversation.create({
        participants: [userAId, userBId],
        type,
        referenceId,
        createdBy: userAId,
        isActive: true,
        pairKey
      });
      return { conversation, isNew: true };
    } catch (err) {
      // Another request created it first (unique pairKey): use that one
      if (err && err.code === 11000) {
        const conversation = await Conversation.findOne({ pairKey });
        if (conversation) return { conversation, isNew: false };
      }
      throw err;
    }
  };
  const prev = pairLocks.get(pairKey) || Promise.resolve();
  const next = prev.catch(() => {}).then(run);
  pairLocks.set(pairKey, next);
  next.finally(() => { if (pairLocks.get(pairKey) === next) pairLocks.delete(pairKey); }).catch(() => {});
  return next;
};

// ─── Get or Create a Group/Channel Conversation ───────────────────────────────
/**
 * @param {string} referenceId   - groupId or channelId
 * @param {string[]} participants - Array of participant user IDs
 * @param {'group'|'community'} type
 * @param {string} createdBy
 * @returns {Promise<{conversation: Conversation, isNew: boolean}>}
 */
const findOrCreateGroupConversation = async (referenceId, participants, type = 'group', createdBy) => {
  let conversation = await Conversation.findOne({
    type,
    referenceId,
    isDeleted: false
  });

  const isNew = !conversation;

  if (!conversation) {
    conversation = await Conversation.create({
      participants,
      type,
      referenceId,
      createdBy,
      isActive: true
    });
  }

  return { conversation, isNew };
};

// ─── Add Participant to Conversation ─────────────────────────────────────────
const addParticipant = async (conversationId, userId) => {
  return Conversation.findByIdAndUpdate(
    conversationId,
    { $addToSet: { participants: userId } },
    { new: true }
  );
};

// ─── Remove Participant from Conversation ─────────────────────────────────────
const removeParticipant = async (conversationId, userId) => {
  return Conversation.findByIdAndUpdate(
    conversationId,
    { $pull: { participants: userId } },
    { new: true }
  );
};

// ─── Update Last Message Cache ─────────────────────────────────────────────────
const updateLastMessage = async (conversationId, message) => {
  const preview =
    message.type === 'text' ? (message.message || '').substring(0, 80) :
    message.type === 'image' ? '📷 Photo' :
    message.type === 'video' ? '🎥 Video' :
    (message.type === 'audio' || message.type === 'voice') ? '🎤 Voice message' :
    message.type === 'file'  ? '📎 File' :
    message.type === 'announcement' ? '📢 Announcement' :
    message.type === 'system' ? message.message :
    '💬 Message';

  return Conversation.findByIdAndUpdate(conversationId, {
    lastMessageId:      message._id,
    lastMessageAt:      message.createdAt,
    lastMessagePreview: preview
  });
};

const getUserConversations = async (userId, type, limit = 30) => {
  const mongoose = require('mongoose');
  const userObjId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  const typeQuery = Array.isArray(type) ? { $in: type } : type;

  const conversations = await Conversation.aggregate([
    {
      $match: {
        participants: userObjId,
        type: typeQuery,
        isDeleted: false
      }
    },
    { $sort: { lastMessageAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'messages',
        let: { convId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$conversationId', '$$convId'] },
              isDeleted: false,
              deletedFor: { $ne: userObjId },
              senderId: { $ne: userObjId },
              'seenBy.userId': { $ne: userObjId }
            }
          },
          { $count: 'unread' }
        ],
        as: 'unreadData'
      }
    },
    {
      $addFields: {
        unreadCount: { $ifNull: [{ $arrayElemAt: ['$unreadData.unread', 0] }, 0] }
      }
    },
    { $project: { unreadData: 0 } }
  ]);

  const populated = await Conversation.populate(conversations, [
    { path: 'lastMessageId', select: 'message type senderId createdAt' }
  ]);

  if (typeQuery !== 'group' && (!Array.isArray(typeQuery) || !typeQuery.includes('group'))) {
    return Conversation.populate(populated, [
      { path: 'participants', select: 'name avatar communityId verificationStatus' }
    ]);
  }

  return populated;
};

/**
 * Total unread chat messages for the app badge, across member, group and
 * matrimonial conversations — the same "unread" rule as getUserConversations,
 * but counted in the database instead of downloading three conversation lists.
 */
const getUnreadChatTotal = async (userId) => {
  const mongoose = require('mongoose');
  const userObjId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  const conversationIds = await Conversation.find({
    participants: userObjId,
    type: { $in: ['member', 'group', 'matrimonial'] },
    isDeleted: false
  }).distinct('_id');
  if (!conversationIds.length) return 0;
  return Message.countDocuments({
    conversationId: { $in: conversationIds },
    isDeleted: false,
    deletedFor: { $ne: userObjId },
    senderId: { $ne: userObjId },
    'seenBy.userId': { $ne: userObjId }
  });
};

module.exports = {
  pairKeyOf,
  getUnreadChatTotal,
  findOrCreateConversation,
  findOrCreateGroupConversation,
  addParticipant,
  removeParticipant,
  updateLastMessage,
  getUserConversations
};
