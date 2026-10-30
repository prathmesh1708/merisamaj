const mongoose = require('mongoose');
const User = require('../models/User');
const Referral = require('../models/Referral');
const ReferralConfig = require('../models/ReferralConfig');
const { createNotification } = require('./notificationService');

/**
 * Get or initialize global ReferralConfig singleton
 */
const getOrCreateConfig = async () => {
  let config = await ReferralConfig.findOne({});
  if (!config) {
    config = await ReferralConfig.create({});
  }
  return config;
};

/**
 * Generate a unique referral code for a new user (e.g., SAMAJ-A492)
 */
const generateUniqueReferralCode = async () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let isUnique = false;
  let code = '';

  while (!isUnique) {
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code = `SAMAJ-${suffix}`;
    const existing = await User.findOne({ referralCode: code }).select('_id').lean();
    if (!existing) {
      isUnique = true;
    }
  }
  return code;
};

/**
 * The member who owns a referral code (or phone number / user id typed instead).
 * Older registrations could copy the inviter's code onto the new account, so when
 * a code is shared the earliest account — the real owner — wins.
 */
const findCodeOwner = async (rawCode) => {
  if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) return null;
  const code = rawCode.trim();
  const byCode = await User.findOne({ referralCode: code.toUpperCase() })
    .sort({ createdAt: 1 }).select('_id name referralCode').lean()
    || await User.findOne({ referralCode: code }).sort({ createdAt: 1 }).select('_id name referralCode').lean();
  if (byCode) return byCode;
  const or = [{ phone: code.replace(/\D/g, '') || code }];
  if (mongoose.isValidObjectId(code)) or.push({ _id: code });
  return User.findOne({ $or: or }).sort({ createdAt: 1 }).select('_id name referralCode').lean();
};

/**
 * Accounts that ended up sharing a referral code (old registration bug copied the
 * inviter's code onto the new account): the earliest account keeps the code, the
 * others get a fresh one. Safe to run any number of times.
 */
const repairDuplicateCodes = async () => {
  const dups = await User.aggregate([
    { $match: { referralCode: { $type: 'string', $ne: '' } } },
    { $sort: { createdAt: 1 } },
    { $group: { _id: '$referralCode', ids: { $push: '$_id' }, n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } }
  ]);
  let fixed = 0;
  for (const d of dups) {
    for (const id of d.ids.slice(1)) {
      await User.updateOne({ _id: id }, { referralCode: await generateUniqueReferralCode() });
      fixed++;
    }
  }
  if (fixed) console.log(`[Referral] Gave ${fixed} account(s) their own referral code (were sharing one).`);
  return fixed;
};

// In-app + push notification about points (push is sent by createNotification
// because referral_bonus_earned is push-eligible)
const notifyPoints = (userId, title, message) =>
  createNotification({
    userId,
    module: 'referral',
    type: 'referral_bonus_earned',
    title,
    message,
    icon: '🎁',
    actionUrl: '/member/referral'
  });

const creditPoints = (userId, points) =>
  User.findByIdAndUpdate(userId, { $inc: { pointsBalance: points, totalPointsEarned: points } });

/**
 * Process referral logic upon new user registration
 */
const processRegistrationReferral = async (newUser, enteredReferralCode) => {
  try {
    const config = await getOrCreateConfig();

    // Ensure newUser has a unique referral code if missing
    if (!newUser.referralCode) {
      const code = await generateUniqueReferralCode();
      newUser.referralCode = code;
      await User.findByIdAndUpdate(newUser._id, { referralCode: code }).catch(() => {});
    }

    const inviter = await findCodeOwner(enteredReferralCode);
    if (!inviter || inviter._id.toString() === newUser._id.toString()) {
      return;
    }

    // Set permanent referredBy link on new user
    await User.findByIdAndUpdate(newUser._id, { referredBy: inviter._id });
    newUser.referredBy = inviter._id;

    if (!config.isActive) {
      return;
    }

    const referrerPts = Number(config.registrationReferrerPoints || 0);
    const referredPts = Number(config.registrationReferredPoints || 0);

    // 1. Award points to Referrer
    if (referrerPts > 0) {
      await Referral.create({
        referrer: inviter._id,
        referredUser: newUser._id,
        eventType: 'REGISTRATION',
        pointsAwarded: referrerPts
      });
      await creditPoints(inviter._id, referrerPts);
      notifyPoints(
        inviter._id,
        'Referral Points Earned 🎁',
        `You earned ${referrerPts} referral points because ${newUser.name || 'a member'} registered using your referral code!`
      ).catch(err => console.warn('[ReferralNotifyWarn]', err.message));
    }

    // 2. Award welcome points to Referred User (logged with referrer = the member
    //    themself; sourceReference marks it as the welcome bonus)
    if (referredPts > 0) {
      await Referral.create({
        referrer: newUser._id,
        referredUser: newUser._id,
        eventType: 'REGISTRATION',
        pointsAwarded: referredPts,
        sourceReference: { kind: 'welcome', invitedBy: inviter._id }
      });
      await creditPoints(newUser._id, referredPts);
      notifyPoints(
        newUser._id,
        'Welcome Bonus 🎉',
        `You got ${referredPts} welcome points for joining with ${inviter.name || 'a member'}'s referral code.`
      ).catch(err => console.warn('[ReferralNotifyWarn]', err.message));
    }

  } catch (error) {
    console.error('[ProcessRegistrationReferralError]', error);
  }
};

/**
 * Process referral side-effect for SUBSCRIPTION, MEMBERSHIP, DONATION
 * Lightweight & Non-blocking
 */
const processReferralEvent = async (eventType, actingUserId, sourceReference = null) => {
  try {
    if (!actingUserId) return;

    const config = await getOrCreateConfig();
    if (!config.isActive) return;

    const actingUser = await User.findById(actingUserId).select('_id name referredBy').lean();
    if (!actingUser || !actingUser.referredBy) return;

    let pointsToAward = 0;
    if (eventType === 'SUBSCRIPTION') pointsToAward = Number(config.subscriptionPoints || 0);
    // Note: MEMBERSHIP is not triggered anywhere yet — there is no backend Membership upgrade/payment endpoint (UpgradeMembershipPage.jsx is frontend-only). Call processReferralEvent('MEMBERSHIP', ...) from that handler once it exists.
    else if (eventType === 'MEMBERSHIP') pointsToAward = Number(config.membershipPoints || 0);
    else if (eventType === 'DONATION') pointsToAward = Number(config.donationPoints || 0);

    if (pointsToAward <= 0) return;

    // Purchases earn the referrer points only once per referred member (their first one)
    if (config.rewardFirstPurchaseOnly !== false && (eventType === 'SUBSCRIPTION' || eventType === 'MEMBERSHIP')) {
      const already = await Referral.exists({ referredUser: actingUserId, eventType });
      if (already) return;
    }

    const inviterId = actingUser.referredBy;

    await Referral.create({
      referrer: inviterId,
      referredUser: actingUserId,
      eventType,
      pointsAwarded: pointsToAward,
      sourceReference
    });
    await creditPoints(inviterId, pointsToAward);

    const eventNameMap = {
      SUBSCRIPTION: 'purchased their first subscription',
      MEMBERSHIP: 'upgraded membership',
      DONATION: 'made a donation'
    };
    notifyPoints(
      inviterId,
      'Referral Reward 💰',
      `You earned ${pointsToAward} points because your referred member ${actingUser.name || 'a member'} ${eventNameMap[eventType] || 'completed an action'}!`
    ).catch(err => console.warn('[ReferralNotifyWarn]', err.message));

  } catch (error) {
    console.error(`[ProcessReferralEventError:${eventType}]`, error);
  }
};

// A welcome-bonus row (member credited for joining) rather than a real referral
const isWelcomeRow = { $expr: { $eq: ['$referrer', '$referredUser'] } };

/**
 * Lifetime points per referrer, from the referral log itself (works for old data
 * too, before totalPointsEarned was stored on the user). Welcome bonuses excluded.
 */
const topReferrers = async ({ limit = 10, match = {} } = {}) => {
  const rows = await Referral.aggregate([
    { $match: { ...match, $expr: { $ne: ['$referrer', '$referredUser'] } } },
    { $group: {
      _id: '$referrer',
      points: { $sum: '$pointsAwarded' },
      events: { $sum: 1 },
      signups: { $sum: { $cond: [{ $eq: ['$eventType', 'REGISTRATION'] }, 1, 0] } },
      subscriptions: { $sum: { $cond: [{ $eq: ['$eventType', 'SUBSCRIPTION'] }, 1, 0] } },
      donations: { $sum: { $cond: [{ $eq: ['$eventType', 'DONATION'] }, 1, 0] } }
    } },
    { $sort: { points: -1 } },
    { $limit: limit },
  ]);
  const users = await User.find({ _id: { $in: rows.map(r => r._id) } })
    .select('name phone avatar referralCode pointsBalance pointsRedeemed').lean();
  const byId = new Map(users.map(u => [String(u._id), u]));
  rows.forEach(r => { r.user = byId.get(String(r._id)); });
  return rows.map(r => ({
    _id: r._id,
    name: r.user?.name || 'Member',
    phone: r.user?.phone || '',
    avatar: r.user?.avatar || null,
    referralCode: r.user?.referralCode || '',
    pointsBalance: r.user?.pointsBalance || 0,
    pointsRedeemed: r.user?.pointsRedeemed || 0,
    totalPointsEarned: r.points,
    events: r.events,
    signups: r.signups,
    subscriptions: r.subscriptions,
    donations: r.donations
  }));
};

module.exports = {
  getOrCreateConfig,
  generateUniqueReferralCode,
  findCodeOwner,
  repairDuplicateCodes,
  processRegistrationReferral,
  processReferralEvent,
  notifyPoints,
  topReferrers,
  isWelcomeRow
};
