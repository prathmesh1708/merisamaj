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
const findOrCreateConversation = async (userAId, userBId, type = 'member', referenceId = null) => {
  // Look for existing conversation between these two users
  let conversation = await Conversation.findOne({
    type,
    participants: { $all: [userAId, userBId], $size: 2 },
    isDeleted: false
  });

  const isNew = !conversation;

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [userAId, userBId],
      type,
      referenceId,
      createdBy: userAId,
      isActive: true
    });
  }

  return { conversation, isNew };
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

module.exports = {
  findOrCreateConversation,
  findOrCreateGroupConversation,
  addParticipant,
  removeParticipant,
  updateLastMessage,
  getUserConversations
};
