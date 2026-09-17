/**
 * groupChatController.js
 * REST endpoints for Group Chat messages.
 * Group membership and management: groupController.js
 * Real-time: chatSocketService.js
 */
const Group        = require('../../models/Group');
const Conversation = require('../../models/Conversation');
const Message      = require('../../models/Message');
const {
  createMessage,
  getMessages,
  markMessagesSeen,
  markConversationSeen,
  deleteMessageForMe,
  deleteMessageForEveryone,
  pinMessage,
  unpinMessage,
  getPinnedMessages
} = require('../../services/messageService');
const { notifyGroupMessage } = require('../../services/notificationService');
const { isOnline } = require('../../services/chatSocketService');
const { getIO } = require('../../services/socketRegistry');

const getSocketIO = (req) => req?.app?.get('io') || getIO();


// ─── Get Group Conversation (creates it if missing) ───────────────────────────
exports.getGroupConversation = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findOne({ _id: groupId, isDeleted: false })
      .populate('creator', 'name avatar');
    if (!group) return res.status(404).json({ status: 'error', message: 'Group not found.' });

    if (!group.isMember(userId)) {
      return res.status(403).json({ status: 'error', message: 'You are not a member of this group.' });
    }

    let conv = group.conversationId
      ? await Conversation.findById(group.conversationId)
      : null;

    // If conversation missing, recreate
    if (!conv) {
      const { findOrCreateGroupConversation } = require('../../services/conversationService');
      const memberIds = group.members.map(m => m.userId);
      const { conversation } = await findOrCreateGroupConversation(group._id, memberIds, 'group', group.creator);
      group.conversationId = conversation._id;
      await group.save();
      conv = conversation;
    }

    res.json({
      status: 'success',
      data: {
        conversation: conv,
        group: {
          _id: group._id,
          name: group.name,
          avatar: group.avatar,
          memberCount: group.members.length,
          myRole: group.getMemberRole(userId),
          chatPermissions: group.chatPermissions
        }
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Get Group Messages ───────────────────────────────────────────────────────
exports.getGroupMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user._id;

    // Verify participant
    const conv = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
      type: 'group',
      isDeleted: false
    });
    if (!conv) return res.status(403).json({ status: 'error', message: 'Access denied.' });

    // Mark messages as seen in DB immediately
    await markConversationSeen(conversationId, userId);

    // Emit seen event via socket to conv room and user room
    const io = getSocketIO(req);
    if (io) {
      io.to(`conv:${conversationId}`).emit('chat:messages_seen', {
        conversationId,
        seenBy: userId,
        userId
      });
      io.to(`user:${userId.toString()}`).emit('chat:messages_seen', {
        conversationId,
        seenBy: userId,
        userId
      });
    }

    const { messages, total } = await getMessages(conversationId, userId, Number(page), Number(limit));

    res.json({ status: 'success', data: { messages, total, page: Number(page) } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Send Group Message (REST fallback; prefer socket) ─────────────────────────
exports.sendGroupMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message, type = 'text', replyTo, mentionedUsers } = req.body;
    const userId = req.user._id;

    const conv = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
      type: 'group',
      isDeleted: false
    });
    if (!conv) return res.status(403).json({ status: 'error', message: 'Access denied.' });

    // Check group chat permissions
    const group = await Group.findOne({ _id: conv.referenceId });
    if (group) {
      const permKey = (type === 'image' || type === 'file') ? 'canSendMedia' : 'canSendMessages';
      if (!group.canPerform(userId, permKey)) {
        return res.status(403).json({ status: 'error', message: 'You do not have permission to send messages in this group.' });
      }
    }

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

    // Emit to room and members
    const io = getSocketIO(req);
    if (io) {
      io.to(`conv:${conversationId}`).emit('chat:new_message', populatedMsg);
      if (group && group.members) {
        group.members.forEach(m => {
          const mUserId = m.userId?.toString();
          if (mUserId && mUserId !== userId.toString()) {
            io.to(`user:${mUserId}`).emit('chat:new_message', populatedMsg);
          }
        });
      }
    }

    // Notify offline members
    if (group) {
      const offlineMembers = group.members
        .filter(m => m.userId.toString() !== userId.toString() && !isOnline(m.userId.toString()))
        .map(m => m.userId);
      if (offlineMembers.length > 0) {
        notifyGroupMessage(offlineMembers, req.user.name, group._id, group.name);
      }
    }

    res.status(201).json({ status: 'success', data: { message: populatedMsg } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Delete Group Message ─────────────────────────────────────────────────────
exports.deleteGroupMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { deleteFor = 'me' } = { ...req.query, ...req.body };
    const userId = req.user._id;

    const msg = await Message.findOne({ _id: messageId, isDeleted: false });
    if (!msg) return res.status(404).json({ status: 'error', message: 'Message not found.' });

    const conv = await Conversation.findById(msg.conversationId);
    if (!conv || !conv.participants.includes(userId)) {
      return res.status(403).json({ status: 'error', message: 'Access denied.' });
    }

    if (deleteFor === 'everyone') {
      // Sender OR group admin can delete for everyone
      const isSender = msg.senderId.toString() === userId.toString();
      let canDelete  = isSender;

      if (!canDelete && conv.referenceId) {
        const group = await Group.findById(conv.referenceId);
        if (group) canDelete = group.canPerform(userId, 'canDeleteOthersMessages');
      }

      if (!canDelete) {
        return res.status(403).json({ status: 'error', message: 'You cannot delete this message for everyone.' });
      }

      await deleteMessageForEveryone(messageId, msg.senderId); // bypass senderId check

      const io = getSocketIO(req);
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
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Pin Message ──────────────────────────────────────────────────────────────
exports.pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ status: 'error', message: 'Message not found.' });

    const conv = await Conversation.findById(msg.conversationId);
    if (!conv) return res.status(404).json({ status: 'error', message: 'Conversation not found.' });

    // Check permission
    const group = conv.referenceId ? await Group.findById(conv.referenceId) : null;
    if (group && !group.canPerform(userId, 'canPinMessages')) {
      return res.status(403).json({ status: 'error', message: 'You do not have permission to pin messages.' });
    }

    await pinMessage(messageId, userId);

    // Update group pinnedMessages array
    if (group) {
      group.pinnedMessages = group.pinnedMessages.filter(p => p.messageId.toString() !== messageId);
      group.pinnedMessages.unshift({ messageId, pinnedBy: userId, pinnedAt: new Date() });
      await group.save();
    }

    const io = getSocketIO(req);
    if (io) {
      io.to(`conv:${msg.conversationId}`).emit('chat:message_pinned', { messageId, conversationId: msg.conversationId });
    }

    res.json({ status: 'success', message: 'Message pinned.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Unpin Message ────────────────────────────────────────────────────────────
exports.unpinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ status: 'error', message: 'Message not found.' });

    const conv = await Conversation.findById(msg.conversationId);
    const group = conv?.referenceId ? await Group.findById(conv.referenceId) : null;

    if (group && !group.canPerform(userId, 'canPinMessages')) {
      return res.status(403).json({ status: 'error', message: 'You do not have permission to unpin messages.' });
    }

    await unpinMessage(messageId);

    if (group) {
      group.pinnedMessages = group.pinnedMessages.filter(p => p.messageId.toString() !== messageId);
      await group.save();
    }

    const io = getSocketIO(req);
    if (io) {
      io.to(`conv:${msg.conversationId}`).emit('chat:message_unpinned', { messageId, conversationId: msg.conversationId });
    }

    res.json({ status: 'success', message: 'Message unpinned.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Get Pinned Messages ──────────────────────────────────────────────────────
exports.getPinnedMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conv = await Conversation.findOne({ _id: conversationId, participants: userId });
    if (!conv) return res.status(403).json({ status: 'error', message: 'Access denied.' });

    const pinned = await getPinnedMessages(conversationId);
    res.json({ status: 'success', data: { pinned } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Mark Group Messages as Seen ─────────────────────────────────────────────
exports.markGroupSeen = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { messageIds } = req.body;
    const userId = req.user._id;

    const conv = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
      type: 'group',
      isDeleted: false
    });
    if (!conv) return res.status(403).json({ status: 'error', message: 'Access denied.' });

    if (Array.isArray(messageIds) && messageIds.length > 0) {
      await markMessagesSeen(messageIds, userId);
    } else {
      await markConversationSeen(conversationId, userId);
    }

    const io = getSocketIO(req);
    if (io) {
      io.to(`conv:${conversationId}`).emit('chat:messages_seen', {
        conversationId,
        seenBy: userId,
        userId,
        messageIds
      });
      io.to(`user:${userId.toString()}`).emit('chat:messages_seen', {
        conversationId,
        seenBy: userId,
        userId,
        messageIds
      });
    }

    res.json({ status: 'success', message: 'Messages marked as seen.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
