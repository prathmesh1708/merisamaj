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
const { createMessage, markMessagesSeen, markMessagesDelivered } = require('./messageService');
const { notifyNewMessage, notifyMention } = require('./notificationService');
const { sendPushNotification } = require('./pushNotificationService');

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
    console.log(`[ChatSocket] ${userId} connected (${socket.id}). Online: ${onlineUsers.size}`);

    // ── Join a conversation room ─────────────────────────────────────────────
    socket.on('chat:join_conversation', async ({ conversationId }) => {
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
          if (!conversation.participants.includes(userId)) {
            return socket.emit('chat:error', { message: 'Access denied to this conversation.' });
          }
        }

        socket.join(`conv:${conversationId}`);
        socket.emit('chat:joined', { conversationId, type: conversation.type });

        // Mark messages as delivered when user joins
        await markMessagesDelivered(conversationId, userId);
        socket.to(`conv:${conversationId}`).emit('chat:messages_delivered', {
          conversationId,
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
        if (conversation.type === 'group' && conversation.referenceId) {
          const group = await Group.findById(conversation.referenceId);
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

        // Broadcast to conversation room
        io.to(`conv:${conversationId}`).emit('chat:new_message', populatedMsg);

        // Handle delivery and notifications for each participant
        for (const participantId of conversation.participants) {
          const pid = participantId.toString();
          if (pid === userId.toString()) continue;

          // Always emit chat:new_message to user personal room so unread counts & toast alerts update live
          io.to(`user:${pid}`).emit('chat:new_message', populatedMsg);

          if (isOnline(pid)) {
            // Participant is online → mark delivered
            io.to(`user:${pid}`).emit('chat:message_delivered', {
              messageId: populatedMsg._id,
              conversationId
            });
          } else {
            // Participant is offline → push notification
            const notifMsg = await notifyNewMessage(pid, populatedMsg.senderId?.name || 'Someone', conversationId);
            if (notifMsg) {
              sendPushNotification({
                userId: pid,
                notificationId: notifMsg._id,
                type: 'chat_new_message',
                title: `New message from ${populatedMsg.senderId?.name || 'A member'} 💬`,
                message: message ? (message.length > 80 ? message.substring(0, 80) + '...' : message) : 'Sent you a media attachment',
                icon: '💬',
                actionUrl: '/member/chat'
              }).catch(err => console.error('[ChatPushError]', err.message));
            }
          }
        }

        // Handle @mentions
        for (const mentionedId of mentionedUsers) {
          if (mentionedId.toString() !== userId.toString()) {
            const notifMention = await notifyMention(mentionedId, populatedMsg.senderId?.name || 'Someone', conversationId);
            if (notifMention) {
              sendPushNotification({
                userId: mentionedId,
                notificationId: notifMention._id,
                type: 'chat_mention',
                title: 'You were mentioned in chat 🏷️',
                message: `${populatedMsg.senderId?.name || 'Someone'} mentioned you in a message.`,
                icon: '🏷️',
                actionUrl: '/member/chat'
              }).catch(err => console.error('[MentionPushError]', err.message));
            }
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
        if (!Array.isArray(messageIds) || messageIds.length === 0) return;
        await markMessagesSeen(messageIds, userId);
        io.to(`conv:${conversationId}`).emit('chat:messages_seen', {
          userId,
          messageIds,
          conversationId
        });
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
