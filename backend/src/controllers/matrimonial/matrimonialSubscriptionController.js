/**
 * matrimonialSubscriptionController.js
 * Manages subscription plans, purchases, and verification.
 */
const SubscriptionPlan   = require('../../models/SubscriptionPlan');
const UserSubscription   = require('../../models/UserSubscription');
const { initiatePayment, verifyPayment, processManualPayment } = require('../../services/paymentService');
const { notifySubscriptionActivated, notifySubscriptionExpired } = require('../../services/notificationService');

// ─── List All Active Plans ────────────────────────────────────────────────────
exports.listPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ displayOrder: 1, price: 1 });
    res.json({ status: 'success', data: { plans } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Get Current User Subscription ───────────────────────────────────────────
exports.getMySubscription = async (req, res) => {
  try {
    const now = new Date();
    // A cancelled plan stays usable until its end date (that is what the user is told).
    const sub = await UserSubscription.findOne({
      userId:  req.user._id,
      status:  { $in: ['active', 'grace', 'cancelled'] },
      endDate: { $gte: now }
    }).sort({ endDate: -1 }).populate('planId', 'name price');

    res.json({
      status: 'success',
      data:   {
        subscription: sub,
        isPremium:    !!sub,
        planName:     sub?.planName || 'Free'
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Get Subscription History ─────────────────────────────────────────────────
exports.getSubscriptionHistory = async (req, res) => {
  try {
    const history = await UserSubscription.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    res.json({ status: 'success', data: { history } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Initiate Purchase ────────────────────────────────────────────────────────
exports.initiatePurchase = async (req, res) => {
  try {
    const { planId, gateway = 'razorpay' } = req.body;

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ status: 'error', message: 'Plan not found or not available.' });
    }

    if (plan.price === 0) {
      return res.status(400).json({ status: 'error', message: 'This is a free plan and does not require payment.' });
    }

    const order = await initiatePayment({
      gateway,
      amount:  plan.price,
      currency:'INR',
      receipt: `rct_${req.user._id.toString().slice(-6)}_${Date.now()}`,
      notes:   { userId: req.user._id.toString(), planId: plan._id.toString() }
    });

    // The checkout needs the order id, amount and public key at the top level.
    res.json({
      status: 'success',
      data:   {
        order,
        plan: { name: plan.name, price: plan.price },
        gateway,
        razorpayOrderId: order?.id,
        amount:          order?.amount,
        currency:        order?.currency || 'INR',
        razorpayKeyId:   process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (err) {
    const errorMsg = err.error ? (err.error.description || err.error.message) : err.message;
    res.status(400).json({ status: 'error', message: errorMsg || 'Payment initiation failed.' });
  }
};

// ─── Verify Payment & Activate Subscription ───────────────────────────────────
exports.verifyAndActivate = async (req, res) => {
  try {
    const {
      planId, gateway = 'razorpay', razorpayOrderId,
      razorpayPaymentId, razorpaySignature, simulatedPayment
    } = req.body;

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ status: 'error', message: 'Plan not found.' });
    }

    // ─── Verify Payment Signature ───────────────────────────────────────────
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ status: 'error', message: 'Payment details are missing. Please pay through the secure checkout.' });
    }
    const isValid = verifyPayment({
      gateway:   'razorpay',
      orderId:   razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature
    });

    // The money actually captured must match this plan (stops paying for a cheap
    // plan and activating an expensive one). Also blocks reusing a payment twice.
    if (isValid) {
      const { fetchRazorpayPaymentDetails } = require('../../services/paymentService');
      const paid = await fetchRazorpayPaymentDetails(razorpayPaymentId).catch(() => null);
      if (!paid || Math.round(Number(paid.amount)) !== Math.round(plan.price * 100) || paid.order_id !== razorpayOrderId) {
        return res.status(400).json({ status: 'error', message: 'The payment does not match this plan.' });
      }
      if (await UserSubscription.exists({ paymentId: razorpayPaymentId })) {
        return res.status(400).json({ status: 'error', message: 'This payment has already been used.' });
      }
    }

    if (!isValid) {
      return res.status(400).json({ status: 'error', message: 'Payment verification failed. Signature mismatch.' });
    }

    // ─── Create Subscription with Snapshot ──────────────────────────────────
    const startDate = new Date();
    const endDate   = new Date();
    endDate.setDate(endDate.getDate() + plan.durationInDays);

    const sub = await UserSubscription.create({
      userId:           req.user._id,
      planId:           plan._id,
      planName:         plan.name,
      pricePaid:        plan.price,
      durationInDays:   plan.durationInDays,
      featuresSnapshot: plan.features.toObject ? plan.features.toObject() : plan.features,
      paymentId:        razorpayPaymentId,
      paymentGateway:   'razorpay',
      paymentStatus:    'success',
      startDate,
      endDate,
      status:           'active',
      createdBy:        req.user._id
    });

    // Notify user
    notifySubscriptionActivated(req.user._id, plan.name);

    // Process Referral Side-Effect (Non-blocking)
    const { processReferralEvent } = require('../../services/referralService');
    processReferralEvent('SUBSCRIPTION', req.user._id, sub._id).catch(err => console.error('[SubReferralError]', err.message));

    res.json({ status: 'success', message: 'Subscription activated!', data: { subscription: sub } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Cancel Subscription ──────────────────────────────────────────────────────
exports.cancelSubscription = async (req, res) => {
  try {
    const now = new Date();
    const sub = await UserSubscription.findOne({
      userId: req.user._id,
      status: { $in: ['active', 'grace'] },
      endDate:{ $gte: now }
    });
    if (!sub) {
      return res.status(404).json({ status: 'error', message: 'No active subscription found.' });
    }
    sub.status       = 'cancelled';
    sub.cancelledAt  = now;
    sub.cancelReason = req.body.reason || 'User requested cancellation';
    sub.updatedBy    = req.user._id;
    await sub.save();
    res.json({ status: 'success', message: 'Subscription cancelled. You can still use features until the billing period ends.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
