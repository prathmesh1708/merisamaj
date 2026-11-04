/**
 * matrimonialSubscriptionController.js
 * Manages subscription plans, purchases, and verification.
 */
const SubscriptionPlan   = require('../../models/SubscriptionPlan');
const UserSubscription   = require('../../models/UserSubscription');
const { initiatePayment, verifyPayment, processManualPayment } = require('../../services/paymentService');
const { notifySubscriptionActivated, notifySubscriptionExpired } = require('../../services/notificationService');
const { getEffectiveFeatures, getActiveSubscription, planTypeFilter } = require('../../middleware/subscriptionMiddleware');

// These handlers serve both plan types: the App plan routes set req.planType = 'app'
const typeOf = (req) => (req.planType === 'app' ? 'app' : 'matrimonial');
const planMatches = (plan, req) => (plan.planType || 'matrimonial') === typeOf(req);
// What a subscription keeps from its plan: matrimonial limits, or the App perks
const snapshotOf = (plan) => {
  const plain = (v) => (v && v.toObject ? v.toObject() : v) || {};
  return (plan.planType === 'app')
    ? { ...plain(plan.appFeatures), customFeatures: plan.customFeatures || [] }
    : plain(plan.features);
};

const { getUsage } = require('../../services/matrimonialUsageService');
const { syncMembership } = require('../../services/membershipService');
const { quoteSubscription } = require('../../services/subscriptionPricingService');

exports.quotePurchase = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.body.planId);
    if (!plan || !plan.isActive || !planMatches(plan, req) || plan.price <= 0) return res.status(404).json({ status: 'error', message: 'Plan not found or not available.' });
    const quote = await quoteSubscription({ userId: req.user._id, plan, code: req.body.code || req.body.discountCode, pointsToRedeem: req.body.pointsToRedeem, planType: typeOf(req) });
    res.json({ status: 'success', data: { quote, plan: { name: plan.name, rewardPoints: plan.rewardPoints || 0 } } });
  } catch (err) { res.status(400).json({ status: 'error', message: err.message }); }
};

// ─── List All Active Plans ────────────────────────────────────────────────────
exports.listPlans = async (req, res) => {
  try {
    // A ₹0 App plan only sets what members without a plan may do; it is not for sale
    const priceFilter = typeOf(req) === 'app' ? { price: { $gt: 0 } } : {};
    const plans = await SubscriptionPlan.find({ isActive: true, ...planTypeFilter(typeOf(req)), ...priceFilter }).sort({ displayOrder: 1, price: 1 });
    res.json({ status: 'success', data: { plans } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── What the member may create (posts, stories, professional listing) ──────────
// @route GET /api/v1/member/app-subscription/permissions
exports.getAppPermissions = async (req, res) => {
  try {
    const { getAppPermissions } = require('../../services/planFeatureDefaults');
    res.json({ status: 'success', data: await getAppPermissions(req.user) });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Get Current User Subscription ───────────────────────────────────────────
exports.getMySubscription = async (req, res) => {
  try {
    // A cancelled plan stays usable until its end date (that is what the user is told).
    const active = await getActiveSubscription(req.user._id, typeOf(req));
    const sub = active && await UserSubscription.populate(active, { path: 'planId', select: 'name price' });

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
    const history = await UserSubscription.find({ userId: req.user._id, ...planTypeFilter(typeOf(req)) })
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
      UserSubscription.find({ userId: req.user._id, planType: { $ne: 'app' } }).sort({ createdAt: -1 }).lean()
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
          messageLimit: limit(features.messageLimit),
          superInterestsPerMonth: limit(features.superInterestsPerMonth)
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
    if (!plan || !plan.isActive || !planMatches(plan, req)) {
      return res.status(404).json({ status: 'error', message: 'Plan not found or not available.' });
    }

    if (plan.price === 0) {
      return res.status(400).json({ status: 'error', message: 'This is a free plan and does not require payment.' });
    }

    const quote = await quoteSubscription({ userId: req.user._id, plan, code: req.body.code || req.body.discountCode, pointsToRedeem: req.body.pointsToRedeem, planType: typeOf(req) });
    const order = await initiatePayment({
      gateway,
      amount:  quote.finalAmount,
      currency:'INR',
      receipt: `rct_${req.user._id.toString().slice(-6)}_${Date.now()}`,
      notes:   { userId: req.user._id.toString(), planId: plan._id.toString() }
    });

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    let pointsReserved = false;
    let couponReserved = false;
    try {
      const User = require('../../models/User');
      if (quote.pointsRedeemed) {
        const reserved = await User.updateOne({ _id: req.user._id, $expr: { $gte: [{ $subtract: ['$pointsBalance', { $ifNull: ['$pointsReserved', 0] }] }, quote.pointsRedeemed] } }, { $inc: { pointsReserved: quote.pointsRedeemed } });
        if (!reserved.modifiedCount) throw new Error('Your points balance changed. Please review checkout again.');
        pointsReserved = true;
      }
      if (quote.discountCodeId) {
        const DiscountCode = require('../../models/DiscountCode');
        const reserved = await DiscountCode.updateOne({ _id: quote.discountCodeId, isActive: true, $expr: { $or: [{ $eq: ['$maxUses', 0] }, { $lt: [{ $add: ['$usedCount', '$reservedCount'] }, '$maxUses'] }] } }, { $inc: { reservedCount: 1 } });
        if (!reserved.modifiedCount) throw new Error('This discount code has just reached its usage limit.');
        couponReserved = true;
      }
      const starts = new Date();
      const ends = new Date(starts.getTime() + Number(plan.durationInDays || 0) * 86400000);
      await UserSubscription.create({ userId: req.user._id, planId: plan._id, planName: plan.name, planType: plan.planType || 'matrimonial', pricePaid: quote.finalAmount, durationInDays: plan.durationInDays, featuresSnapshot: snapshotOf(plan), planRewardPoints: plan.rewardPoints || 0, paymentId: undefined, razorpayOrderId: order?.id, paymentGateway: gateway, paymentStatus: 'pending', listPrice: quote.listPrice, discountAmount: quote.codeDiscount + quote.pointsDiscount, discountCode: quote.code, referralCode: quote.codeType === 'referral' ? quote.code : '', couponCodeId: quote.discountCodeId, couponReserved: Boolean(quote.discountCodeId), pointsRedeemed: quote.pointsRedeemed, checkoutExpiresAt: expiresAt, startDate: starts, endDate: ends, status: 'pending', createdBy: req.user._id });
    } catch (reservationError) {
      if (pointsReserved) await require('../../models/User').updateOne({ _id: req.user._id, pointsReserved: { $gte: quote.pointsRedeemed } }, { $inc: { pointsReserved: -quote.pointsRedeemed } });
      if (couponReserved) await require('../../models/DiscountCode').updateOne({ _id: quote.discountCodeId, reservedCount: { $gt: 0 } }, { $inc: { reservedCount: -1 } });
      throw reservationError;
    }
    // The server calculated the amount and saved its quote with this order.
    res.json({
      status: 'success',
      data:   {
        order,
        plan: { name: plan.name, price: plan.price, rewardPoints: plan.rewardPoints || 0 },
        quote,
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
      razorpayPaymentId, razorpaySignature
    } = req.body;

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !planMatches(plan, req)) return res.status(404).json({ status: 'error', message: 'Plan not found.' });
    const pendingSub = await UserSubscription.findOne({ userId: req.user._id, planId, razorpayOrderId, planType: typeOf(req), status: 'pending', paymentStatus: 'pending', checkoutExpiresAt: { $gt: new Date() } });
    if (!pendingSub) return res.status(400).json({ status: 'error', message: 'Checkout expired or could not be found. Please start checkout again.' });

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
      if (!paid || paid.status !== 'captured' || paid.currency !== 'INR' || Math.round(Number(paid.amount)) !== Math.round(pendingSub.pricePaid * 100) || paid.order_id !== razorpayOrderId) {
        return res.status(400).json({ status: 'error', message: 'The payment does not match this plan.' });
      }
      if (await UserSubscription.exists({ paymentId: razorpayPaymentId })) {
        return res.status(400).json({ status: 'error', message: 'This payment has already been used.' });
      }
      if (pendingSub.pointsRedeemed) {
        const consumed = await require('../../models/User').updateOne(
          { _id: req.user._id, pointsReserved: { $gte: pendingSub.pointsRedeemed }, pointsBalance: { $gte: pendingSub.pointsRedeemed } },
          { $inc: { pointsReserved: -pendingSub.pointsRedeemed, pointsBalance: -pendingSub.pointsRedeemed, pointsRedeemed: pendingSub.pointsRedeemed } }
        );
        if (!consumed.modifiedCount) return res.status(409).json({ status: 'error', message: 'Reserved points could not be confirmed. Please contact support with your payment ID.' });
      }
    }

    if (!isValid) {
      return res.status(400).json({ status: 'error', message: 'Payment verification failed. Signature mismatch.' });
    }

    // ─── Create Subscription with Snapshot ──────────────────────────────────
    const sub = await UserSubscription.findOneAndUpdate({ _id: pendingSub._id, status: 'pending', paymentStatus: 'pending' }, { $set: { paymentId: razorpayPaymentId, paymentStatus: 'success', status: 'active', startDate: new Date(), endDate: new Date(Date.now() + Number(pendingSub.durationInDays || 0) * 86400000), couponReserved: false } }, { new: true });
    if (!sub) return res.status(409).json({ status: 'error', message: 'This checkout has already been completed or cancelled.' });
    if (pendingSub.couponCodeId) {
      const DiscountCode = require('../../models/DiscountCode');
      const DiscountCodeUsage = require('../../models/DiscountCodeUsage');
      await DiscountCode.updateOne({ _id: pendingSub.couponCodeId, reservedCount: { $gt: 0 } }, { $inc: { reservedCount: -1, usedCount: 1 } });
      await DiscountCodeUsage.create({ discountCodeId: pendingSub.couponCodeId, userId: req.user._id, subscriptionId: sub._id, code: pendingSub.discountCode, discountAmount: pendingSub.discountAmount });
    }
    if (pendingSub.pointsRedeemed) {
      await require('../../models/RewardTransaction').findOneAndUpdate({ idempotencyKey: `subscription:redeem:${sub._id}` }, { $setOnInsert: { userId: req.user._id, kind: 'debit', eventType: 'SUBSCRIPTION_REDEMPTION', points: pendingSub.pointsRedeemed, status: 'posted', idempotencyKey: `subscription:redeem:${sub._id}`, sourceReference: sub._id, description: `Redeemed for ${plan.name}`, postedAt: new Date() } }, { upsert: true, new: true });
    }
    if ((sub.planRewardPoints || 0) > 0) await require('../../services/referralService').awardPoints({ userId: req.user._id, points: sub.planRewardPoints, eventKey: `subscription:plan-reward:${sub._id}`, eventType: 'SUBSCRIPTION_PLAN_REWARD', sourceReference: sub._id, subscriptionId: sub._id, description: `${plan.name} subscription reward` });

    // Notify user
    notifySubscriptionActivated(req.user._id, plan.name);

    // Process Referral Side-Effect (Non-blocking)
    const { processReferralEvent } = require('../../services/referralService');
    await processReferralEvent('SUBSCRIPTION', req.user._id, sub._id).catch(err => console.error('[SubReferralError]', err.message));

    await syncMembership(req.user._id).catch(err => console.warn('[MembershipSync] activate:', err.message));
    res.json({ status: 'success', message: 'Subscription activated!', data: { subscription: sub } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.cancelPendingPurchase = async (req, res) => {
  try {
    const sub = await UserSubscription.findOneAndUpdate({ userId: req.user._id, razorpayOrderId: req.body.razorpayOrderId, planType: typeOf(req), status: 'pending', paymentStatus: 'pending', reservationReleasedAt: null }, { $set: { status: 'cancelled', paymentStatus: 'cancelled', reservationReleasedAt: new Date(), couponReserved: false } }, { new: true });
    if (!sub) return res.json({ status: 'success', message: 'Checkout was already closed.' });
    if (sub.pointsRedeemed) await require('../../models/User').updateOne({ _id: req.user._id, pointsReserved: { $gte: sub.pointsRedeemed } }, { $inc: { pointsReserved: -sub.pointsRedeemed } });
    if (sub.couponCodeId) await require('../../models/DiscountCode').updateOne({ _id: sub.couponCodeId, reservedCount: { $gt: 0 } }, { $inc: { reservedCount: -1 } });
    res.json({ status: 'success', message: 'Checkout cancelled and reserved rewards restored.' });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
};

// ─── Cancel Subscription ──────────────────────────────────────────────────────
exports.cancelSubscription = async (req, res) => {
  try {
    const now = new Date();
    const sub = await UserSubscription.findOne({
      userId: req.user._id,
      ...planTypeFilter(typeOf(req)),
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
    await require('../../services/referralService').cancelSubscriptionRewardSchedules(sub._id).catch(err => console.warn('[RewardSchedule] cancel:', err.message));
    await syncMembership(req.user._id).catch(err => console.warn('[MembershipSync] cancel:', err.message));
    res.json({ status: 'success', message: 'Subscription cancelled. You can still use features until the billing period ends.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};


// ─── App membership overview ("My membership" screen) ─────────────────────────
// @route GET /api/v1/member/app-subscription/overview
exports.getAppOverview = async (req, res) => {
  try {
    const now = new Date();
    const DAY = 24 * 60 * 60 * 1000;
    const [sub, purchases] = await Promise.all([
      getActiveSubscription(req.user._id, 'app'),
      UserSubscription.find({ userId: req.user._id, planType: 'app' }).sort({ createdAt: -1 }).lean()
    ]);

    let current = null;
    if (sub) {
      const totalDays = Math.max(1, Math.round((new Date(sub.endDate) - new Date(sub.startDate)) / DAY));
      const daysLeft = Math.max(0, Math.ceil((new Date(sub.endDate) - now) / DAY));
      const monthKey = now.toISOString().slice(0, 7);
      const usage = req.user.appPinUsage?.month === monthKey ? (req.user.appPinUsage.count || 0) : 0;
      current = {
        _id: sub._id,
        planName: sub.planName,
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        totalDays,
        daysLeft,
        features: sub.featuresSnapshot || {},
        pinsUsedThisMonth: usage
      };
    }

    const history = purchases.map(p => {
      let state = p.status;
      if (p.paymentStatus === 'pending') state = 'payment_pending';
      else if (p.paymentStatus === 'failed') state = 'payment_failed';
      else if (new Date(p.startDate) > now) state = 'upcoming';
      else if (new Date(p.endDate) < now) state = 'expired';
      return {
        _id: p._id, planName: p.planName, pricePaid: p.pricePaid, durationInDays: p.durationInDays,
        startDate: p.startDate, endDate: p.endDate, purchasedAt: p.createdAt,
        paymentId: p.paymentId || null, isCurrent: Boolean(sub && String(sub._id) === String(p._id)), state
      };
    });

    res.json({ status: 'success', data: { current, history } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.snapshotOf = snapshotOf;
