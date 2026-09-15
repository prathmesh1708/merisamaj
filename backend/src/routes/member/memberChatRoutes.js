const express = require('express');
const router  = express.Router();
const chatCtrl = require('../../controllers/member/memberChatController');
const { uploadChatImage } = require('../../middleware/uploadMiddleware');
const rateLimit = require('express-rate-limit');

const imageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: { status: 'error', message: 'Upload limit exceeded.' }
});

// ─── Conversations ────────────────────────────────────────────────────────────
router.post('/conversations',                                    chatCtrl.openConversation);
router.get('/conversations',                                     chatCtrl.getConversations);
router.get('/conversations/:conversationId/messages',            chatCtrl.getMessages);
router.post('/conversations/:conversationId/messages',           imageLimiter, uploadChatImage, chatCtrl.sendMessage);
router.post('/conversations/:conversationId/seen',               chatCtrl.markSeen);
router.post('/conversations/:conversationId/clear',              chatCtrl.clearChat);
router.delete('/conversations/:conversationId',                chatCtrl.deleteConversation);

// ─── Messages ─────────────────────────────────────────────────────────────────
router.patch('/messages/:messageId',  chatCtrl.editMessage);
router.delete('/messages/:messageId', chatCtrl.deleteMessage);

module.exports = router;
