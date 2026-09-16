/**
 * memberChatController.js
 * REST endpoints for 1-to-1 Community Member Chat.
 *
 * Rules:
 *  - Both users must belong to the same community
 *  - Both must be verified members
 *  - Find or create a Conversation{type:'member'} automatically
 *  - Real-time messages via chatSocketService (chat:* events)
 */
const User    = require('../../models/User');
const Conversation = require('../../models/Conversation');
const { findOrCreateConversation, getUserConversations } = require('../../services/conversationService');
const { createMessage, getMessages, markMessagesSeen, markConversationSeen, deleteMessageForMe, deleteMessageForEveryone, editMessage: editMessageService, clearConversationMessages } = require('../../services/messageService');
const { notifyNewMessage } = require('../../services/notificationService');

// ─── Open or Find Conversation ────────────────────────────────────────────────
exports.openConversation = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ status: 'error', message: 'targetUserId is required.' });
    }

    const myId = req.user._id;
    if (myId.toString() === targetUserId.toString()) {
      return res.status(400).json({ status: 'error', message: 'You cannot chat with yourself.' });
    }

    // Fetch target user and verify same community
    const targetUser = await User.findOne({
      _id: targetUserId,
      accountStatus: { $ne: 'deleted' }
    }).select('name avatar communityId verificationStatus role accountStatus accountType');

    if (!targetUser) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    // req.user.communityId may be a populated Community object
    const myCommId    = req.user.communityId?._id || req.user.communityId;
    const theirCommId = targetUser.communityId?._id || targetUser.communityId;

    if (!myCommId || !theirCommId) {
      return res.status(403).json({ status: 'error', message: 'Both users must belong to a community to chat.' });
    }

    if (myCommId.toString() !== theirCommId.toString()) {
      return res.status(403).json({ status: 'error', message: 'You can only chat with members of your own community.' });
    }

    const headRoles = ['head', 'sub_head', 'admin', 'super_admin', 'master_admin'];
    const isHeadInteraction = headRoles.includes(targetUser?.role) ||
                              headRoles.includes(req.user?.role) ||
                              req.user?.accountType === 'local_head' ||
                              targetUser?.accountType === 'local_head';

    if (req.user.verificationStatus !== 'verified' && !isHeadInteraction) {
      // Allow if conversation already exists (e.g. member received a message from another member or head)
      const existing = await Conversation.findOne({
        type: 'member',
        participants: { $all: [myId, targetUserId], $size: 2 },
        isDeleted: false
      });
      if (!existing) {
        return res.status(403).json({ status: 'error', message: 'Direct member chat is available once approved by your Community Head or Local Head. You can chat with your Community leadership anytime.' });
      }
    }

    const { conversation, isNew } = await findOrCreateConversation(myId, targetUserId, 'member');

    res.json({
      status: 'success',
      data: {
        conversation,
        isNew,
        otherUser: {
          _id: targetUser._id,
          name: targetUser.name,
          avatar: targetUser.avatar
        }
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Get All Conversations ────────────────────────────────────────────────────
exports.getConversations = async (req, res) => {
  try {
    const conversations = await getUserConversations(req.user._id, 'member', 50);

    // Attach "other user" info for 1-to-1 display
    const myId = req.user._id.toString();
    const enriched = conversations.map(conv => {
      const other = conv.participants.find(p => p._id.toString() !== myId);
      const baseConv = typeof conv.toObject === 'function' ? conv.toObject() : conv;
      return {
        ...baseConv,
        otherUser: other || null
      };
    });

    res.json({ status: 'success', data: { conversations: enriched } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Get Messages ─────────────────────────────────────────────────────────────
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user._id;

    // Verify participant
    const conv = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
      type: 'member',
      isDeleted: false
    });
    if (!conv) return res.status(403).json({ status: 'error', message: 'Access denied.' });

    // Mark messages as seen in DB immediately
    await markConversationSeen(conversationId, userId);

    // Emit seen event via socket to both conversation room & user personal rooms
    const io = req.app.get('io');
    if (io) {
      io.to(`conv:${conversationId}`).emit('chat:messages_seen', {
        conversationId,
        seenBy: userId,
        userId
      });
      for (const p of conv.participants) {
        io.to(`user:${p.toString()}`).emit('chat:messages_seen', {
          conversationId,
          seenBy: userId,
          userId
        });
      }
    }

    const { messages, total } = await getMessages(conversationId, userId, Number(page), Number(limit));

    res.json({ status: 'success', data: { messages, total, page: Number(page) } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Send Message (REST fallback; prefer socket) ──────────────────────────────
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message, type = 'text', replyTo, mentionedUsers } = req.body;
    const userId = req.user._id;

    const conv = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
      type: 'member',
      isDeleted: false
    });
    if (!conv) return res.status(403).json({ status: 'error', message: 'Access denied.' });

    let mediaUrl = null, mediaPublicId = null, msgType = type;
    if (req.file) {
      mediaUrl = req.file.path || null;
      mediaPublicId = req.file.filename || req.file.public_id || null;
      msgType = 'image';
    }

    const populatedMsg = await createMessage({
      conversationId,
      senderId: userId,
      type: msgType,
      message: message || '',
      mediaUrl,
      mediaPublicId,
      replyTo: replyTo || null,
      mentionedUsers: mentionedUsers ? JSON.parse(mentionedUsers) : []
    });

    // Emit via socket
    const io = req.app.get('io');
    const otherParticipants = conv.participants.filter(p => p.toString() !== userId.toString());
    if (io) {
      io.to(`conv:${conversationId}`).emit('chat:new_message', populatedMsg);
      for (const pid of otherParticipants) {
        io.to(`user:${pid.toString()}`).emit('chat:new_message', populatedMsg);
      }
    }

    // Notify offline participants
    for (const pid of otherParticipants) {
      notifyNewMessage(pid, req.user.name, conversationId, 'chat');
    }

    res.status(201).json({ status: 'success', data: { message: populatedMsg } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Mark Messages as Seen ───────────────────────────────────────────────────
exports.markSeen = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { messageIds } = req.body;
    const userId = req.user._id;

    const conv = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
      isDeleted: false
    });
    if (!conv) return res.status(403).json({ status: 'error', message: 'Access denied.' });

    if (Array.isArray(messageIds) && messageIds.length > 0) {
      await markMessagesSeen(messageIds, userId);
    } else {
      await markConversationSeen(conversationId, userId);
    }

    // Emit seen event via socket to conv room and all participant user rooms
    const io = req.app.get('io');
    if (io) {
      io.to(`conv:${conversationId}`).emit('chat:messages_seen', {
        conversationId,
        seenBy: userId,
        userId,
        messageIds
      });
      for (const p of conv.participants) {
        io.to(`user:${p.toString()}`).emit('chat:messages_seen', {
          conversationId,
          seenBy: userId,
          userId,
          messageIds
        });
      }
    }

    res.json({ status: 'success', message: 'Messages marked as seen.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Delete Message ───────────────────────────────────────────────────────────
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    // Accept deleteFor from query string OR body
    const { deleteFor = 'me' } = { ...req.query, ...req.body };
    const userId = req.user._id;

    const Message = require('../../models/Message');
    const msg = await Message.findOne({ _id: messageId, isDeleted: false });
    if (!msg) return res.status(404).json({ status: 'error', message: 'Message not found.' });

    if (deleteFor === 'everyone') {
      await deleteMessageForEveryone(messageId, userId);

      const io = req.app.get('io');
      if (io) {
        io.to(`conv:${msg.conversationId}`).emit('chat:message_deleted', {
          messageId,
          conversationId: msg.conversationId
        });
      }
    } else {
      await deleteMessageForMe(messageId, userId);
    }

    res.json({ status: 'success', message: 'Message deleted.' });
  } catch (err) {
    if (err.message?.includes('own messages')) {
      return res.status(403).json({ status: 'error', message: err.message });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Edit Message ─────────────────────────────────────────────────────────────
exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;
    const userId = req.user._id;

    if (!message || !message.trim()) {
      return res.status(400).json({ status: 'error', message: 'Message content is required.' });
    }

    const updatedMsg = await editMessageService(messageId, userId, message.trim());

    // Emit via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`conv:${updatedMsg.conversationId}`).emit('chat:message_edited', updatedMsg);
    }

    res.json({ status: 'success', data: { message: updatedMsg } });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
};

// ─── Clear Chat ───────────────────────────────────────────────────────────────
exports.clearChat = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conv = await Conversation.findOne({ _id: conversationId, participants: userId });
    if (!conv) return res.status(403).json({ status: 'error', message: 'Access denied.' });

    await clearConversationMessages(conversationId, userId);

    res.json({ status: 'success', message: 'Chat cleared successfully.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Delete Conversation ─────────────────────────────────────────────────────
exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conv = await Conversation.findOne({ _id: conversationId, participants: userId });
    if (!conv) return res.status(403).json({ status: 'error', message: 'Access denied.' });

    await clearConversationMessages(conversationId, userId);

    res.json({ status: 'success', message: 'Conversation deleted.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
