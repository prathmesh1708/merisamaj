/**
 * matrimonialSubscriptionController.js
 * Manages subscription plans, purchases, and verification.
 */
const SubscriptionPlan   = require('../../models/SubscriptionPlan');
const UserSubscription   = require('../../models/UserSubscription');
const { initiatePayment, verifyPayment, processManualPayment } = require('../../services/paymentService');
const { notifySubscriptionActivated, notifySubscriptionExpired } = require('../../services/notificationService');
const { getEffectiveFeatures } = require('../../middleware/subscriptionMiddleware');
const { getUsage } = require('../../services/matrimonialUsageService');

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

// ─── Subscription Overview ("My Subscription" screen) ──────────────────────────
// Current plan with days left, usage against each limit, and every plan bought.
// @route GET /api/v1/member/matrimonial/subscription/overview
exports.getSubscriptionOverview = async (req, res) => {
  try {
    const now = new Date();
    const DAY = 24 * 60 * 60 * 1000;

    const [{ features, subscription }, usage, purchases] = await Promise.all([
      getEffectiveFeatures(req.user._id),
      getUsage(req.user._id),
      UserSubscription.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean()
    ]);

    let current = null;
    if (subscription) {
      const start = new Date(subscription.startDate);
      const end = new Date(subscription.endDate);
      const totalDays = Math.max(1, Math.round((end - start) / DAY));
      const daysLeft = Math.max(0, Math.ceil((end - now) / DAY));
      current = {
        _id: subscription._id,
        planName: subscription.planName,
        status: subscription.status,
        pricePaid: subscription.pricePaid,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        totalDays,
        daysLeft,
        daysUsed: Math.max(0, totalDays - daysLeft),
        cancelledAt: subscription.cancelledAt || null,
        paymentId: subscription.paymentId || null,
        paymentGateway: subscription.paymentGateway || null
      };
    }

    // How each past purchase stands today
    const history = purchases.map(p => {
      let state = p.status;
      if (p.paymentStatus === 'pending') state = 'payment_pending';
      else if (p.paymentStatus === 'failed') state = 'payment_failed';
      else if (new Date(p.startDate) > now) state = 'upcoming';
      else if (new Date(p.endDate) < now) state = 'expired';
      return {
        _id: p._id,
        planName: p.planName,
        pricePaid: p.pricePaid,
        durationInDays: p.durationInDays,
        startDate: p.startDate,
        endDate: p.endDate,
        purchasedAt: p.createdAt,
        paymentId: p.paymentId || null,
        paymentGateway: p.paymentGateway || null,
        isCurrent: Boolean(current && String(p._id) === String(current._id)),
        state
      };
    });

    const limit = (v) => (typeof v === 'number' ? v : null);
    res.json({
      status: 'success',
      data: {
        isPremium: Boolean(subscription),
        current,
        limits: {
          profileViewsPerDay: limit(features.profileViewsPerDay),
          interestLimit: limit(features.interestLimit),
          messageLimit: limit(features.messageLimit)
        },
        usage,
        features,
        history,
        totalSpent: purchases
          .filter(p => p.paymentStatus === 'success')
          .reduce((sum, p) => sum + (p.pricePaid || 0), 0)
      }
    });
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
