const express = require('express');
const router  = express.Router();

const chatCtrl = require('../../../controllers/matrimonial/matrimonialChatController');
const { checkFeature } = require('../../../middleware/subscriptionMiddleware');
const { uploadChatImage } = require('../../../middleware/uploadMiddleware');
const rateLimit = require('express-rate-limit');

// Limit image uploads to 10 per minute per user
const imageUploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: { status: 'error', message: 'Upload limit exceeded. Maximum 10 image uploads per minute allowed.' }
});

// Chat is a Premium-only feature
router.get('/conversations',                            checkFeature('chat'), chatCtrl.getConversations);
router.post('/conversations',                           checkFeature('chat'), chatCtrl.openConversation);  // Open/find conversation by profileId
router.get('/conversations/:conversationId/messages',   checkFeature('chat'), chatCtrl.getMessages);
router.post('/conversations/:conversationId/messages',  checkFeature('chat'), imageUploadLimiter, uploadChatImage, chatCtrl.sendMessage);
router.post('/conversations/:conversationId/seen',      checkFeature('chat'), chatCtrl.markSeen);
router.delete('/messages/:messageId',                  checkFeature('chat'), chatCtrl.deleteMessage);

module.exports = router;
