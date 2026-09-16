/**
 * matrimonialSocket.js
 * Socket.io handler for Matrimonial real-time chat.
 * Features: Online status, typing indicator, delivered/read receipts, message events.
 */
const Conversation  = require('../models/Conversation');
const Message       = require('../models/Message');
const InterestRequest = require('../models/InterestRequest');
const { notifyNewMessage } = require('../services/notificationService');
const { markConversationSeen, markMessagesSeen } = require('../services/messageService');

// Track online users: { userId: socketId }
const onlineUsers = new Map();

const matrimonialSocket = (io) => {
  io.on('connection', (socket) => {
    const userId = socket.handshake.auth?.userId;
    if (!userId) return socket.disconnect();

    // ─── Online Presence ─────────────────────────────────────────────────────
    onlineUsers.set(userId, socket.id);
    io.emit('matrimonial:online_users', Array.from(onlineUsers.keys()));
    console.log(`[Socket.io] ${userId} connected. Online: ${onlineUsers.size}`);

    // ─── Join own user room ──────────────────────────────────────────────────
    socket.join(`user:${userId}`);

    // ─── Join a conversation room ────────────────────────────────────────────
    socket.on('matrimonial:join_conversation', async ({ conversationId }) => {
      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
          type: 'matrimonial',
          isDeleted: false
        });
        if (!conversation) return socket.emit('error', { message: 'Access denied.' });

        // Validate active interest backing this chat
        const interest = await InterestRequest.findOne({
          _id: conversation.referenceId,
          status: 'accepted'
        });
        if (!interest) return socket.emit('error', { message: 'Chat requires an accepted interest.' });

        socket.join(`conv:${conversationId}`);
        socket.emit('matrimonial:joined', { conversationId });

        // Mark messages as seen when user joins
        await markConversationSeen(conversationId, userId);
        io.to(`conv:${conversationId}`).emit('matrimonial:messages_seen', { conversationId, userId });
        io.to(`conv:${conversationId}`).emit('chat:messages_seen', { conversationId, seenBy: userId, userId });
        io.to(`user:${userId}`).emit('chat:messages_seen', { conversationId, seenBy: userId, userId });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ─── Send Message ────────────────────────────────────────────────────────
    socket.on('matrimonial:send_message', async (data) => {
      try {
        const { conversationId, message, type = 'text', mediaUrl, replyTo } = data;

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
          isDeleted: false
        });
        if (!conversation) return socket.emit('error', { message: 'Conversation not found.' });

        if (conversation.isReadOnly) {
          return socket.emit('error', { message: 'This matrimonial conversation has been archived after marriage confirmation. Messages are read-only.', code: 'CONVERSATION_ARCHIVED' });
        }

        const newMsg = await Message.create({
          conversationId,
          senderId:    userId,
          type,
          message:     message || '',
          mediaUrl:    mediaUrl || null,
          replyTo:     replyTo  || null,
          deliveredTo: [userId]
        });

        // Populate senderId before broadcasting so receiver gets avatar/name in real-time
        const populatedMsg = await Message.findById(newMsg._id)
          .populate('senderId', 'name avatar _id')
          .lean();

        // Update conversation cache
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessageId:      newMsg._id,
          lastMessageAt:      newMsg.createdAt,
          lastMessagePreview: type === 'text' ? (message || '').substring(0, 80) : '📷 Photo'
        });

        // Broadcast to room
        io.to(`conv:${conversationId}`).emit('matrimonial:new_message', populatedMsg);

        // Mark as delivered to other participants currently online
        for (const participantId of conversation.participants) {
          if (participantId.toString() !== userId) {
            const pSocketId = onlineUsers.get(participantId.toString());
            if (pSocketId) {
              // Participant is online — mark delivered
              await Message.findByIdAndUpdate(newMsg._id, {
                $addToSet: { deliveredTo: participantId }
              });
              io.to(`user:${participantId}`).emit('matrimonial:message_delivered', {
                messageId: newMsg._id, conversationId
              });
            } else {
              // Participant is offline — send push notification
              notifyNewMessage(participantId, 'Someone', conversationId);
            }
          }
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ─── Typing Indicator ─────────────────────────────────────────────────────
    socket.on('matrimonial:typing_start', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('matrimonial:user_typing', { userId, conversationId });
    });

    socket.on('matrimonial:typing_stop', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('matrimonial:user_stopped_typing', { userId, conversationId });
    });

    // ─── Read Receipts ────────────────────────────────────────────────────────
    socket.on('matrimonial:mark_seen', async ({ conversationId, messageIds }) => {
      try {
        if (Array.isArray(messageIds) && messageIds.length > 0) {
          await markMessagesSeen(messageIds, userId);
        } else if (conversationId) {
          await markConversationSeen(conversationId, userId);
        }

        const payload = { userId, messageIds, conversationId, seenBy: userId };
        io.to(`conv:${conversationId}`).emit('matrimonial:messages_seen', payload);
        io.to(`conv:${conversationId}`).emit('chat:messages_seen', payload);
        io.to(`user:${userId}`).emit('chat:messages_seen', payload);

        const conv = await Conversation.findById(conversationId).select('participants').lean();
        if (conv && conv.participants) {
          for (const pid of conv.participants) {
            io.to(`user:${pid.toString()}`).emit('matrimonial:messages_seen', payload);
            io.to(`user:${pid.toString()}`).emit('chat:messages_seen', payload);
          }
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ─── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('matrimonial:online_users', Array.from(onlineUsers.keys()));
      io.emit('matrimonial:user_offline', { userId, lastSeen: new Date() });
      console.log(`[Socket.io] ${userId} disconnected. Online: ${onlineUsers.size}`);
    });
  });
};

module.exports = matrimonialSocket;
