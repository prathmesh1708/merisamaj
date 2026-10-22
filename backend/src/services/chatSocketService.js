/**
 * chatSocketService.js
 * Unified Socket.io handler for ALL chat types:
 *   - member    (1-to-1 community chat)
 *   - group     (group chat)
 *   - community (announcement channels)
 *   - support
 *
 * Matrimonial chat events (matrimonial:*) are preserved in matrimonialSocket.js
 * and run in parallel — NO breaking changes.
 *
 * Event Namespace: chat:*
 */

const User         = require('../models/User');
const Conversation = require('../models/Conversation');
const Group        = require('../models/Group');
const Message      = require('../models/Message');
const { emitDelivered } = require('./deliveryReceiptService');
const { createMessage, markMessagesSeen, markConversationSeen, markMessagesDelivered, markAllPendingDelivered } = require('./messageService');
const { notifyNewMessage, notifyMention, notifyGroupMessage, pushChatMessage, chatMessagePreview } = require('./notificationService');

// ─── Online Users Registry ────────────────────────────────────────────────────
// Shared with matrimonialSocket via module scope on app.set('onlineUsers', map)
// Each: { userId: Set<socketId> } (multi-device support)
const onlineUsers = new Map(); // userId → Set<socketId>

const getSocketId = (userId) => {
  const sockets = onlineUsers.get(userId.toString());
  return sockets && sockets.size > 0 ? [...sockets][0] : null;
};

const isOnline = (userId) => {
  const sockets = onlineUsers.get(userId.toString());
  return !!(sockets && sockets.size > 0);
};

const addOnlineUser = (userId, socketId) => {
  const existing = onlineUsers.get(userId.toString()) || new Set();
  existing.add(socketId);
  onlineUsers.set(userId.toString(), existing);
};

const removeOnlineUser = (userId, socketId) => {
  const existing = onlineUsers.get(userId.toString());
  if (existing) {
    existing.delete(socketId);
    if (existing.size === 0) onlineUsers.delete(userId.toString());
  }
};

// ─── Main Handler ─────────────────────────────────────────────────────────────
const chatSocketService = (io) => {
  // We use a dedicated namespace or the default namespace
  io.on('connection', async (socket) => {
    const userId = socket.handshake.auth?.userId;
    if (!userId) return socket.disconnect(true);

    // ── Online presence & Room Scoping ────────────────────────────────────────
    addOnlineUser(userId, socket.id);
    socket.join(`user:${userId}`);

    // Join role & community-scoped rooms (head:<communityId>, admin:global, community:<communityId>)
    try {
      const dbUser = await User.findById(userId).select('role communityId').lean();
      if (dbUser) {
        if (dbUser.communityId) {
          socket.join(`community:${dbUser.communityId}`);
        }
        if (dbUser.role === 'head' && dbUser.communityId) {
          socket.join(`head:${dbUser.communityId}`);
        }
        if (dbUser.role === 'admin') {
          socket.join('admin:global');
        }
      }
    } catch (err) {
      console.error('[ChatSocket] Error joining scoped rooms:', err.message);
    }

    // Broadcast updated online list to all connected clients
    io.emit('chat:online_users', Array.from(onlineUsers.keys()));

    // Their device is online now: messages sent while they were offline are delivered
    markAllPendingDelivered(userId)
      .then((convIds) => emitDelivered(convIds, userId))
      .catch(err => console.warn('[ChatSocket] Delivered-on-connect failed:', err.message));
    console.log(`[ChatSocket] ${userId} connected (${socket.id}). Online: ${onlineUsers.size}`);

    // ── Join a conversation room ─────────────────────────────────────────────
    socket.on('chat:join_conversation', async ({ conversationId, visible }) => {
      try {
        let conversation = await Conversation.findOne({
          _id: conversationId,
          isDeleted: false
        });

        if (!conversation) {
          return socket.emit('chat:error', { message: 'Conversation not found.' });
        }

        // Authorization Check
        if (conversation.type === 'community') {
          // Announcement Channels: Check if user belongs to the community and can view
          const AnnouncementChannel = require('../models/AnnouncementChannel');
          const User = require('../models/User');
          const channel = await AnnouncementChannel.findOne({ conversationId, isDeleted: false });
          const user = await User.findById(userId).select('communityId role');
          
          if (!channel || !user) {
            return socket.emit('chat:error', { message: 'Channel or user not found.' });
          }
          if (user.role !== 'admin' && channel.communityId.toString() !== user.communityId.toString()) {
            return socket.emit('chat:error', { message: 'Access denied: Community isolation enforced.' });
          }
          
          // Basic visibility check
          const canViewChannel = (ch, role) => {
            if (role === 'admin') return true;
            if (ch.whoCanView === 'everyone') return true;
            if (ch.whoCanView === 'verified_members' && ['verified', 'head', 'admin'].includes(role)) return true;
            if (ch.whoCanView === 'moderators' && ['head', 'admin', 'moderator'].includes(role)) return true;
            if (ch.whoCanView === 'head_and_admins' && ['head', 'admin'].includes(role)) return true;
            if (ch.whoCanView === 'head_only') return role === 'head';
            return false;
          };

          if (!canViewChannel(channel, user.role)) {
            return socket.emit('chat:error', { message: 'Access denied: You do not have permission to view this channel.' });
          }
        } else {
          // Normal Chat: Check if user is a participant
          const isParticipant = Array.isArray(conversation.participants) && conversation.participants.some(p => {
            const pId = (p?._id || p)?.toString();
            return pId && pId === userId.toString();
          });
          if (!isParticipant) {
            return socket.emit('chat:error', { message: 'Access denied to this conversation.' });
          }
        }

        socket.join(`conv:${conversationId}`);
        socket.emit('chat:joined', { conversationId, type: conversation.type });

        // Joining delivers everything; it only counts as "seen" (blue ticks) when the
        // chat is actually on screen — not when the app is in the background.
        await markMessagesDelivered(conversationId, userId);
        socket.to(`conv:${conversationId}`).emit('chat:messages_delivered', {
          conversationId,
          userId
        });
        if (visible === false) return;

        await markConversationSeen(conversationId, userId);
        io.to(`conv:${conversationId}`).emit('chat:messages_seen', {
          conversationId,
          seenBy: userId,
          userId
        });
        io.to(`user:${userId}`).emit('chat:messages_seen', {
          conversationId,
          seenBy: userId,
          userId
        });
      } catch (err) {
        socket.emit('chat:error', { message: err.message });
      }
    });

    // ── Send Message ─────────────────────────────────────────────────────────
    socket.on('chat:send_message', async (data) => {
      try {
        const {
          conversationId,
          message = '',
          type = 'text',
          mediaUrl = null,
          mediaPublicId = null,
          replyTo = null,
          mentionedUsers = [],
          metadata = null
        } = data;

        // Verify participant
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
          isDeleted: false
        });
        if (!conversation) {
          return socket.emit('chat:error', { message: 'Conversation not found or access denied.' });
        }

        // For group conversations, check chatPermissions
        let group = null;
        if (conversation.type === 'group' && conversation.referenceId) {
          group = await Group.findById(conversation.referenceId);
          if (group) {
            const msgType = type === 'image' || type === 'file' ? 'Media' : 'Messages';
            const permKey = msgType === 'Media' ? 'canSendMedia' : 'canSendMessages';
            if (!group.canPerform(userId, permKey)) {
              return socket.emit('chat:error', { message: 'You do not have permission to send messages in this group.' });
            }
          }
        }

        // Create message via service
        const populatedMsg = await createMessage({
          conversationId,
          senderId: userId,
          type,
          message,
          mediaUrl,
          mediaPublicId,
          replyTo,
          mentionedUsers,
          metadata
        });

        // Recipients whose app is connected right now have it → delivered (grey double
        // tick) straight away. Must be saved before broadcasting so the sender sees it.
        const onlineRecipients = conversation.participants.filter(
          p => p.toString() !== userId.toString() && isOnline(p.toString())
        );
        if (onlineRecipients.length) {
          await Message.updateOne({ _id: populatedMsg._id }, { $addToSet: { deliveredTo: { $each: onlineRecipients } } });
          onlineRecipients.forEach(p => {
            if (!populatedMsg.deliveredTo.some(d => d.toString() === p.toString())) populatedMsg.deliveredTo.push(p);
          });
        }

        // Broadcast to conversation room
        io.to(`conv:${conversationId}`).emit('chat:new_message', populatedMsg);

        // Handle delivery and notifications for each participant
        const senderName = populatedMsg.senderId?.name || 'Someone';
        const preview = chatMessagePreview(type, message);
        for (const participantId of conversation.participants) {
          const pid = participantId.toString();
          if (pid === userId.toString()) continue;

          // Always emit chat:new_message to user personal room so unread counts & toast alerts update live
          io.to(`user:${pid}`).emit('chat:new_message', populatedMsg);

          if (isOnline(pid)) {
            // Online (already marked delivered above) → push in case the app is in the background
            pushChatMessage({ userId: pid, senderName, preview, groupName: group?.name, groupId: group?._id, conversationId });
          } else if (group) {
            // Offline → bell notification + push (sent by createNotification)
            notifyGroupMessage([pid], senderName, group._id, group.name, preview, conversationId);
          } else {
            notifyNewMessage(pid, senderName, conversationId, 'chat', preview);
          }
        }

        // Handle @mentions (push is sent by createNotification)
        for (const mentionedId of mentionedUsers) {
          if (mentionedId.toString() !== userId.toString()) {
            notifyMention(mentionedId, senderName, conversationId);
          }
        }
      } catch (err) {
        console.error('[ChatSocket] send_message error:', err.message);
        socket.emit('chat:error', { message: err.message });
      }
    });

    // ── Typing Indicators ─────────────────────────────────────────────────────
    socket.on('chat:typing_start', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('chat:user_typing', {
        userId,
        conversationId
      });
    });

    socket.on('chat:typing_stop', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('chat:user_stopped_typing', {
        userId,
        conversationId
      });
    });

    // ── Read Receipts ─────────────────────────────────────────────────────────
    socket.on('chat:mark_seen', async ({ conversationId, messageIds }) => {
      try {
        if (Array.isArray(messageIds) && messageIds.length > 0) {
          await markMessagesSeen(messageIds, userId);
        } else if (conversationId) {
          await markConversationSeen(conversationId, userId);
        }

        const payload = {
          userId,
          seenBy: userId,
          messageIds,
          conversationId
        };

        io.to(`conv:${conversationId}`).emit('chat:messages_seen', payload);
        io.to(`user:${userId}`).emit('chat:messages_seen', payload);

        const conv = await Conversation.findById(conversationId).select('participants').lean();
        if (conv && conv.participants) {
          for (const pid of conv.participants) {
            const pStr = pid.toString();
            if (pStr !== userId.toString()) {
              io.to(`user:${pStr}`).emit('chat:messages_seen', payload);
            }
          }
        }
      } catch (err) {
        socket.emit('chat:error', { message: err.message });
      }
    });

    // ── Message Deleted broadcast ─────────────────────────────────────────────
    // Called from REST controller after successful DB update
    socket.on('chat:broadcast_delete', ({ conversationId, messageId }) => {
      io.to(`conv:${conversationId}`).emit('chat:message_deleted', {
        conversationId,
        messageId
      });
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      removeOnlineUser(userId, socket.id);
      io.emit('chat:online_users', Array.from(onlineUsers.keys()));
      io.emit('chat:user_offline', { userId, lastSeen: new Date() });
      console.log(`[ChatSocket] ${userId} disconnected. Online: ${onlineUsers.size}`);
    });
  });
};

module.exports = { chatSocketService, onlineUsers, isOnline };
