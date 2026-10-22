/**
 * deliveryReceiptService.js
 * WhatsApp-style "delivered" (second grey tick) for chat messages.
 *
 * A message counts as delivered when the recipient's device has it:
 *   1. their app connects to the socket, or
 *   2. a chat push notification reaches their phone — even with the app closed.
 *
 * For (2) every chat push carries a signed receipt. The service worker on the
 * phone posts it back to POST /api/v1/chat/delivery-ack as soon as the push
 * arrives. The service worker has no login token, so the receipt itself is the
 * proof: an HMAC over (recipient, conversation, expiry) that only this server
 * can create.
 */
const crypto       = require('crypto');
const mongoose     = require('mongoose');
const Conversation = require('../models/Conversation');
const config       = require('../config/config');
const { getIO }    = require('./socketRegistry');

// Pushes can sit in FCM's queue while the phone is off — accept receipts for a week
const RECEIPT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const hmac = (payload) =>
  crypto.createHmac('sha256', `${config.jwtSecret}:delivery-receipt`).update(payload).digest('base64url');

/** Receipt string for one recipient + conversation, embedded in the chat push data */
const signDeliveryReceipt = (userId, conversationId) => {
  if (!userId || !conversationId) return '';
  const payload = Buffer.from(JSON.stringify({
    u: userId.toString(),
    c: conversationId.toString(),
    e: Date.now() + RECEIPT_TTL_MS
  })).toString('base64url');
  return `${payload}.${hmac(payload)}`;
};

/** Returns { userId, conversationId } for a genuine, unexpired receipt, otherwise null */
const verifyDeliveryReceipt = (receipt) => {
  if (typeof receipt !== 'string' || receipt.length > 1024) return null;
  const [payload, signature] = receipt.split('.');
  if (!payload || !signature) return null;

  const expected = Buffer.from(hmac(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;

  try {
    const { u, c, e } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!e || Date.now() > e) return null;
    if (!mongoose.Types.ObjectId.isValid(u) || !mongoose.Types.ObjectId.isValid(c)) return null;
    return { userId: u, conversationId: c };
  } catch {
    return null;
  }
};

/**
 * Tell the other participants of each conversation that `userId` has received
 * their messages, so their single tick turns into a grey double tick live.
 */
const emitDelivered = async (conversationIds, userId) => {
  const io = getIO();
  if (!io || !conversationIds?.length) return;
  const convs = await Conversation.find({ _id: { $in: conversationIds } }).select('participants').lean();
  for (const conv of convs) {
    for (const p of conv.participants || []) {
      if (p.toString() !== userId.toString()) {
        io.to(`user:${p.toString()}`).emit('chat:messages_delivered', { conversationId: conv._id.toString(), userId: userId.toString() });
      }
    }
  }
};

module.exports = {
  signDeliveryReceipt,
  verifyDeliveryReceipt,
  emitDelivered
};
