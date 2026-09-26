/**
 * matrimonialChatController.js
 * REST endpoints for Conversation listing and Message fetching.
 * Real-time events handled via Socket.io (matrimonialSocket.js).
 */
const Conversation = require('../../models/Conversation');
const Message      = require('../../models/Message');
const InterestRequest = require('../../models/InterestRequest');
const { checkFeature } = require('../../middleware/subscriptionMiddleware');
const { notifyNewMessage } = require('../../services/notificationService');
const { markConversationSeen, markMessagesSeen } = require('../../services/messageService');

// ─── Open or Find Conversation by Profile ID ──────────────────────────────────
exports.openConversation = async (req, res) => {
  try {
    const { profileId } = req.body;
    if (!profileId) {
      return res.status(400).json({ status: 'error', message: 'profileId is required.' });
    }

    const MatrimonialProfile = require('../../models/MatrimonialProfile');
    let profile = await MatrimonialProfile.findOne({ _id: profileId, isDeleted: false });
    if (!profile) {
      // It's possible the frontend passed the User ID instead of the MatrimonialProfile ID
      profile = await MatrimonialProfile.findOne({ userId: profileId, isDeleted: false });
    }
    
    if (!profile) {
      return res.status(404).json({ status: 'error', message: 'Profile not found.' });
    }

    const otherUserId = profile.userId;

    // Verify accepted interest between the two users
    const interest = await InterestRequest.findOne({
      $or: [
        { senderId: req.user._id, receiverId: otherUserId, status: 'accepted' },
        { senderId: otherUserId, receiverId: req.user._id, status: 'accepted' }
      ]
    });
    if (!interest) {
      return res.status(403).json({ status: 'error', message: 'Chat is only available after an interest is accepted.' });
    }

    // Find existing conversation or create one
    let conversation = await Conversation.findOne({
      type: 'matrimonial',
      participants: { $all: [req.user._id, otherUserId] },
      isDeleted: false
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, otherUserId],
        type: 'matrimonial',
        referenceId: interest._id,
        createdBy: req.user._id,
        isActive: true
      });
      // Link conversation to interest
      interest.conversationId = conversation._id;
      await interest.save();
    }

    res.json({ status: 'success', data: { conversation } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Get All Conversations for User ──────────────────────────────────────────
exports.getConversations = async (req, res) => {
  try {
    const { getUserConversations } = require('../../services/conversationService');
    let conversations = await getUserConversations(req.user._id, 'matrimonial', 50);

    // Inject partnerProfileId so the frontend can navigate to the partner's profile
    const MatrimonialProfile = require('../../models/MatrimonialProfile');
    conversations = await Promise.all(conversations.map(async (conv) => {
      const convObj = conv.toObject ? conv.toObject() : conv;
      const partner = convObj.participants?.find(p => p._id.toString() !== req.user._id.toString());
      if (partner) {
        const partnerProfile = await MatrimonialProfile.findOne({ userId: partner._id, isDeleted: false }).select('_id').lean();
        if (partnerProfile) {
          convObj.partnerProfileId = partnerProfile._id;
        }
      }
      return convObj;
    }));

    res.json({ status: 'success', data: { conversations } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Get Messages in a Conversation ──────────────────────────────────────────
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
      isDeleted: false
    });
    if (!conversation) {
      return res.status(403).json({ status: 'error', message: 'Access denied to this conversation.' });
    }

    // Check chat is backed by accepted interest
    const interest = await InterestRequest.findOne({
      _id: conversation.referenceId,
      status: 'accepted'
    });
    if (!interest) {
      return res.status(403).json({ status: 'error', message: 'Chat is only available after an interest is accepted.' });
    }

    // Mark messages as seen immediately
    await markConversationSeen(conversationId, req.user._id);

    // Safely emit to socket rooms
    const io = req.app.get('io');
    if (io) {
      io.to(`conv:${conversationId}`).emit('matrimonial:messages_seen', { conversationId, userId: req.user._id });
      io.to(`conv:${conversationId}`).emit('chat:messages_seen', { conversationId, seenBy: req.user._id, userId: req.user._id });
      for (const p of conversation.participants) {
        io.to(`user:${p.toString()}`).emit('chat:messages_seen', { conversationId, seenBy: req.user._id, userId: req.user._id });
        io.to(`user:${p.toString()}`).emit('matrimonial:messages_seen', { conversationId, userId: req.user._id });
      }
    }

    const total = await Message.countDocuments({ conversationId, isDeleted: false });
    const messages = await Message.find({ conversationId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('senderId', 'name avatar')
      .populate('replyTo', 'message type senderId');

    res.json({
      status: 'success',
      data: { messages: messages.reverse(), total, page: Number(page) } // Oldest first
    });
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

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
      isDeleted: false
    });
    if (!conversation) return res.status(403).json({ status: 'error', message: 'Access denied.' });

    if (Array.isArray(messageIds) && messageIds.length > 0) {
      await markMessagesSeen(messageIds, userId);
    } else {
      await markConversationSeen(conversationId, userId);
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`conv:${conversationId}`).emit('matrimonial:messages_seen', { conversationId, userId, messageIds });
      io.to(`conv:${conversationId}`).emit('chat:messages_seen', { conversationId, seenBy: userId, userId, messageIds });
      for (const p of conversation.participants) {
        io.to(`user:${p.toString()}`).emit('chat:messages_seen', { conversationId, seenBy: userId, userId, messageIds });
        io.to(`user:${p.toString()}`).emit('matrimonial:messages_seen', { conversationId, userId, messageIds });
      }
    }

    res.json({ status: 'success', message: 'Messages marked as seen.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Send Message via REST (Socket.io is preferred, this is a fallback) ───────
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    let { message, type = 'text', mediaUrl, replyTo } = req.body;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
      isDeleted: false
    });
    if (!conversation) {
      return res.status(403).json({ status: 'error', message: 'Access denied.' });
    }

    // ─── Block messages in archived (post-marriage) conversations ─────────────────
    if (conversation.isReadOnly) {
      return res.status(403).json({
        status:  'error',
        message: 'This matrimonial conversation has been archived after marriage confirmation. Messages are read-only.',
        code:    'CONVERSATION_ARCHIVED'
      });
    }

    // ─── Verify accepted interest ──────────────────────────────────────────────────────
    const interest = await InterestRequest.findOne({ _id: conversation.referenceId, status: 'accepted' });
    if (!interest) {
      return res.status(403).json({ status: 'error', message: 'Chat requires an accepted interest request.' });
    }

    let finalMediaUrl = mediaUrl || null;
    let finalPublicId = null;

    if (req.file) {
      if (req.file.path) {
        finalMediaUrl = req.file.path; // Cloudinary secure_url
        finalPublicId = req.file.filename || req.file.public_id; // Cloudinary public_id
      } else if (req.file.buffer) {
        // Fallback to base64 if memory storage is used (no Cloudinary config)
        const base64Str = req.file.buffer.toString('base64');
        finalMediaUrl = `data:${req.file.mimetype};base64,${base64Str}`;
      }
      if (req.file.mimetype && req.file.mimetype.startsWith('audio/')) {
        type = 'audio';
      } else if (req.file.mimetype && req.file.mimetype.startsWith('image/')) {
        type = 'image';
      } else {
        type = req.body.type || 'file';
      }
    }

    const newMsg = await Message.create({
      conversationId,
      senderId: req.user._id,
      type,
      message: message || '',
      mediaUrl: finalMediaUrl,
      mediaPublicId: finalPublicId,
      replyTo:  replyTo  || null,
      deliveredTo: [req.user._id]
    });

    const populatedMsg = await Message.findById(newMsg._id)
      .populate('senderId', 'name avatar _id')
      .populate('replyTo', 'message type senderId')
      .lean();

    // Update conversation last message cache
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessageId:      newMsg._id,
      lastMessageAt:      newMsg.createdAt,
      lastMessagePreview: type === 'text' ? (message || '').substring(0, 80) : '📷 Photo'
    });

    // Safely emit to socket room if io is attached
    const io = req.app.get('io');
    if (io) {
      io.to(`conv:${conversationId}`).emit('matrimonial:new_message', populatedMsg);
    }

    // Notify other participants
    const otherParticipants = conversation.participants.filter(p => !p.equals(req.user._id));
    for (const participantId of otherParticipants) {
      notifyNewMessage(participantId, req.user.name, conversationId);
    }

    res.status(201).json({ status: 'success', data: { message: populatedMsg } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Delete Message (for sender) ─────────────────────────────────────────────
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { deleteFor = 'me' } = req.body; // 'me' or 'everyone'

    const msg = await Message.findOne({ _id: messageId });
    if (!msg) return res.status(404).json({ status: 'error', message: 'Message not found.' });

    if (deleteFor === 'everyone') {
      if (!msg.senderId.equals(req.user._id)) {
        return res.status(403).json({ status: 'error', message: 'You can only delete your own messages for everyone.' });
      }

      // Cleanup Cloudinary asset if it exists
      if (msg.type === 'image' && msg.mediaPublicId) {
        try {
          const cloudinary = require('cloudinary').v2;
          await cloudinary.uploader.destroy(msg.mediaPublicId);
        } catch (cloudErr) {
          console.warn('[Delete Message] Cloudinary deletion failed for', msg.mediaPublicId, cloudErr.message);
        }
      }

      msg.isDeleted = true;
      msg.deletedAt = new Date();
      msg.message   = 'This message was deleted';
      msg.type      = 'deleted';
      msg.mediaUrl  = null;
      msg.mediaPublicId = null;

      // Broadcast socket event
      const io = req.app.get('io');
      if (io) {
        io.to(`conv:${msg.conversationId}`).emit('matrimonial:message_deleted', {
          conversationId: msg.conversationId,
          messageId: msg._id
        });
      }
    } else {
      if (!msg.deletedFor.includes(req.user._id)) {
        msg.deletedFor.push(req.user._id);
      }
    }
    
    await msg.save();

    // Update conversation preview if deleted for everyone
    if (deleteFor === 'everyone') {
      const actualLast = await Message.findOne({ conversationId: msg.conversationId }).sort({ createdAt: -1 });
      let preview = 'No messages yet';
      
      if (actualLast) {
         if (actualLast.type === 'deleted') preview = 'This message was deleted';
         else if (actualLast.type === 'image') preview = '📷 Photo';
         else preview = (actualLast.message || '').substring(0, 80);
      }

      await Conversation.findByIdAndUpdate(msg.conversationId, {
        lastMessagePreview: preview,
        updatedAt: new Date()
      });
    }

    res.json({ status: 'success', message: 'Message deleted.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
