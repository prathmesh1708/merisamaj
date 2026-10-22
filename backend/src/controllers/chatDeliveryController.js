const Conversation = require('../models/Conversation');
const { markMessagesDelivered } = require('../services/messageService');
const { verifyDeliveryReceipt, emitDelivered } = require('../services/deliveryReceiptService');

// ─── Chat Delivery Receipt ────────────────────────────────────────────────────
// @route POST /api/v1/chat/delivery-ack   body: { ack }
// Called by the service worker the moment a chat push reaches the phone (even
// with the app closed). No login token there — the signed receipt is the proof.
exports.deliveryAck = async (req, res) => {
  try {
    const receipt = verifyDeliveryReceipt(req.body?.ack);
    if (!receipt) {
      return res.status(400).json({ status: 'error', message: 'Invalid or expired delivery receipt.' });
    }

    const { userId, conversationId } = receipt;
    const isParticipant = await Conversation.exists({ _id: conversationId, participants: userId, isDeleted: false });
    if (!isParticipant) {
      return res.status(403).json({ status: 'error', message: 'Not a participant of this conversation.' });
    }

    const result = await markMessagesDelivered(conversationId, userId);
    const delivered = result?.modifiedCount || 0;
    if (delivered > 0) await emitDelivered([conversationId], userId);

    res.json({ status: 'success', delivered });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
