const express = require('express');
const router  = express.Router();
const chatCtrl = require('../../controllers/member/memberChatController');
const { uploadChatImage } = require('../../middleware/uploadMiddleware');
const rateLimit = require('express-rate-limit');

const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: { status: 'error', message: 'Upload limit exceeded.' }
});
// Only file uploads count towards the limit — plain text messages are never throttled
const imageLimiter = (req, res, next) => (req.is('multipart/form-data') ? uploadRateLimiter(req, res, next) : next());

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
