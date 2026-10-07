const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const donationController = require('../controllers/member/donationController');
const fundController = require('../controllers/member/fundController');

/**
 * POST /api/v1/webhooks/razorpay — the single URL to register in the Razorpay
 * dashboard (Settings → Webhooks, event "payment.captured", secret =
 * RAZORPAY_WEBHOOK_SECRET). Public (Razorpay has no user token), so the HMAC
 * signature over the exact raw body is mandatory. Routes the event by the
 * notes we attached when creating the order.
 */
const isValidSignature = (req) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  if (!secret || !signature || !req.rawBody) return false;
  const digest = crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');
  return digest.length === signature.length && crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
};

router.post('/', (req, res) => {
  if (!isValidSignature(req)) {
    return res.status(400).json({ status: 'error', message: 'Invalid webhook signature' });
  }
  req.razorpayVerified = true;
  const notes = req.body?.payload?.payment?.entity?.notes || {};
  if (notes.fundId) return fundController.handleFundWebhook(req, res);
  if (notes.campaignId) return donationController.handleRazorpayWebhook(req, res);
  // Dharmashala bookings and matrimonial plans are confirmed by the in-app verify step.
  return res.status(200).json({ status: 'ignored' });
});

module.exports = router;
