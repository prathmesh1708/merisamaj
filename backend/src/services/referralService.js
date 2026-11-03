const mongoose = require('mongoose');
const User = require('../models/User');
const Referral = require('../models/Referral');
const ReferralConfig = require('../models/ReferralConfig');
const RewardTransaction = require('../models/RewardTransaction');
const RewardSchedule = require('../models/RewardSchedule');
const UserSubscription = require('../models/UserSubscription');
const { createNotification } = require('./notificationService');

const getOrCreateConfig = async () => {
  let config = await ReferralConfig.findOne({});
  if (!config) config = await ReferralConfig.create({});
  return config;
};

const generateUniqueReferralCode = async () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 20; attempt++) {
    let suffix = '';
    for (let i = 0; i < 6; i++) suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    const code = `SAMAJ-${suffix}`;
    if (!(await User.exists({ referralCode: code }))) return code;
  }
  throw new Error('Could not allocate a unique referral code. Please retry.');
};

const findCodeOwner = async (rawCode) => {
  if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) return null;
  const code = rawCode.trim();
  const byCode = await User.findOne({ referralCode: code.toUpperCase() }).select('_id name referralCode').lean()
    || await User.findOne({ referralCode: code }).select('_id name referralCode').lean();
  return byCode || null;
};

const repairDuplicateCodes = async () => {
  const dups = await User.aggregate([
    { $match: { referralCode: { $type: 'string', $ne: '' } } },
    { $sort: { createdAt: 1, _id: 1 } },
    { $group: { _id: '$referralCode', ids: { $push: '$_id' }, n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } }
  ]);
  let fixed = 0;
  for (const duplicate of dups) {
    for (const id of duplicate.ids.slice(1)) {
      await User.updateOne({ _id: id }, { $set: { referralCode: await generateUniqueReferralCode() } });
      fixed++;
    }
  }
  if (fixed) console.log(`[Referral] Repaired ${fixed} duplicate referral code(s).`);
  return fixed;
};

const notifyPoints = (userId, title, message) => createNotification({
  userId,
  module: 'referral',
  type: 'referral_bonus_earned',
  title,
  message,
  icon: '🎁',
  actionUrl: '/member/referral'
});

// The event key is stored both in the ledger and on the wallet update. The wallet
// predicate makes the balance increment atomic and exactly-once across retries.
const postCredit = async ({ userId, points, eventKey, eventType, sourceReference = null, description = '' }) => {
  if (!userId || !Number.isInteger(points) || points <= 0 || !eventKey) return false;
  let transaction = await RewardTransaction.findOneAndUpdate(
    { idempotencyKey: eventKey },
    { $setOnInsert: { userId, kind: 'credit', eventType, points, status: 'pending', idempotencyKey: eventKey, sourceReference, description } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  if (transaction.status === 'posted') return false;

  const walletUpdate = await User.updateOne(
    { _id: userId, processedRewardEventKeys: { $ne: eventKey } },
    { $inc: { pointsBalance: points, totalPointsEarned: points }, $addToSet: { processedRewardEventKeys: eventKey } }
  );
  if (!walletUpdate.modifiedCount) {
    const wallet = await User.findById(userId).select('processedRewardEventKeys').lean();
    if (!wallet?.processedRewardEventKeys?.includes(eventKey)) {
      throw new Error('Reward wallet update could not be applied.');
    }
  }

  await RewardTransaction.updateOne({ _id: transaction._id, status: 'pending' }, { $set: { status: 'posted', postedAt: new Date() } });
  return walletUpdate.modifiedCount > 0;
};

const scheduleOrPost = async ({ userId, points, eventKey, eventType, referralId = null, sourceSubscriptionId = null, description = '' }, config) => {
  if (!points || points <= 0) return { status: 'SUCCESSFUL', pointsAwarded: 0 };
  if (config.rewardAllocation === 'daily') {
    const days = Math.max(1, Math.min(Math.floor(points), 365, Math.floor(Number(config.dailyRewardDays) || 1)));
    await RewardSchedule.findOneAndUpdate(
      { eventKey },
      { $setOnInsert: { userId, referralId, eventKey, eventType, totalPoints: points, totalDays: days, sourceSubscriptionId, status: 'pending', nextRewardAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return { status: 'PENDING', pointsAwarded: 0 };
  }

  await postCredit({ userId, points, eventKey, eventType, sourceReference: { referralId, subscriptionId: sourceSubscriptionId }, description });
  return { status: 'REWARDED', pointsAwarded: points };
};

const awardPoints = async ({ userId, points, eventKey, eventType, sourceReference = null, description = '', subscriptionId = null }) => {
  const config = await getOrCreateConfig();
  if (!config.isActive || !(Number(points) > 0)) return { status: 'SUCCESSFUL', pointsAwarded: 0 };
  return scheduleOrPost({ userId, points: Math.floor(Number(points)), eventKey, eventType, sourceReference, sourceSubscriptionId: subscriptionId, description }, config);
};

const processRegistrationReferral = async (newUser, enteredReferralCode) => {
  if (!newUser?._id) return;
  const config = await getOrCreateConfig();
  if (!newUser.referralCode) {
    newUser.referralCode = await generateUniqueReferralCode();
    await User.updateOne({ _id: newUser._id, $or: [{ referralCode: null }, { referralCode: { $exists: false } }] }, { $set: { referralCode: newUser.referralCode } });
  }

  const inviter = await findCodeOwner(enteredReferralCode);
  if (!inviter || String(inviter._id) === String(newUser._id)) return;

  const linked = await User.findOneAndUpdate(
    { _id: newUser._id, $or: [{ referredBy: null }, { referredBy: { $exists: false } }] },
    { $set: { referredBy: inviter._id } },
    { new: true }
  ).select('_id referredBy');
  if (!linked || String(linked.referredBy) !== String(inviter._id)) return;
  newUser.referredBy = inviter._id;

  const relationshipKey = `referral:registration:${newUser._id}`;
  const referrerPoints = config.isActive ? Math.max(0, Math.floor(Number(config.registrationReferrerPoints) || 0)) : 0;
  const relationship = await Referral.findOneAndUpdate(
    { eventKey: relationshipKey },
    { $setOnInsert: {
      referrer: inviter._id, referredUser: newUser._id, eventType: 'REGISTRATION', pointsAwarded: 0,
      scheduledPoints: referrerPoints, sourceReference: { kind: 'registration' }, eventKey: relationshipKey,
      status: referrerPoints ? 'PENDING' : 'SUCCESSFUL'
    } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (referrerPoints > 0) {
    const result = await scheduleOrPost({
      userId: inviter._id, points: referrerPoints, eventKey: relationshipKey,
      eventType: 'REFERRAL_REGISTRATION', referralId: relationship._id,
      description: `Registration referral for ${newUser.name || 'a member'}`
    }, config);
    await Referral.updateOne({ _id: relationship._id }, { $set: { status: result.status, pointsAwarded: result.pointsAwarded } });
    if (result.pointsAwarded) notifyPoints(inviter._id, 'Referral points earned', `${result.pointsAwarded} points earned because ${newUser.name || 'a member'} registered with your code.`).catch(() => {});
  }

  const referredPoints = config.isActive ? Math.max(0, Math.floor(Number(config.registrationReferredPoints) || 0)) : 0;
  if (referredPoints > 0) {
    const welcomeKey = `referral:welcome:${newUser._id}`;
    const welcome = await Referral.findOneAndUpdate(
      { eventKey: welcomeKey },
      { $setOnInsert: {
        referrer: newUser._id, referredUser: newUser._id, eventType: 'REGISTRATION', pointsAwarded: 0,
        scheduledPoints: referredPoints, sourceReference: { kind: 'welcome', invitedBy: inviter._id },
        eventKey: welcomeKey, status: 'PENDING'
      } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const result = await scheduleOrPost({
      userId: newUser._id, points: referredPoints, eventKey: welcomeKey,
      eventType: 'REFERRAL_WELCOME', referralId: welcome._id,
      description: 'Referral registration welcome reward'
    }, config);
    await Referral.updateOne({ _id: welcome._id }, { $set: { status: result.status, pointsAwarded: result.pointsAwarded } });
    if (result.pointsAwarded) notifyPoints(newUser._id, 'Welcome reward earned', `You received ${result.pointsAwarded} points for joining with a referral code.`).catch(() => {});
  }
};

const processReferralEvent = async (eventType, actingUserId, sourceReference = null) => {
  if (!actingUserId) return;
  const config = await getOrCreateConfig();
  if (!config.isActive) return;
  const actingUser = await User.findById(actingUserId).select('_id name referredBy').lean();
  if (!actingUser?.referredBy || String(actingUser.referredBy) === String(actingUserId)) return;

  const basePoints = eventType === 'SUBSCRIPTION' ? Number(config.subscriptionPoints || 0)
    : eventType === 'MEMBERSHIP' ? Number(config.membershipPoints || 0)
      : eventType === 'DONATION' ? Number(config.donationPoints || 0) : 0;
  const points = Math.max(0, Math.floor(basePoints));
  if (!points) return;
  const sourceId = sourceReference?._id || sourceReference || null;
  const purchaseKey = sourceId ? String(sourceId) : `${actingUserId}:${eventType}`;

  if (config.rewardFirstPurchaseOnly !== false && ['SUBSCRIPTION', 'MEMBERSHIP'].includes(eventType)) {
    const firstReward = await Referral.exists({ referredUser: actingUserId, eventType, status: { $in: ['PENDING', 'SUCCESSFUL', 'REWARDED'] } });
    if (firstReward) return;
  }

  const eventKey = `referral:${eventType.toLowerCase()}:${actingUserId}:${purchaseKey}`;
  const referral = await Referral.findOneAndUpdate(
    { eventKey },
    { $setOnInsert: {
      referrer: actingUser.referredBy, referredUser: actingUserId, eventType, pointsAwarded: 0,
      scheduledPoints: points, sourceReference: sourceId, eventKey, status: 'PENDING'
    } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  if (referral.status === 'REWARDED' || referral.status === 'CANCELLED') return;

  const result = await scheduleOrPost({
    userId: actingUser.referredBy, points, eventKey, eventType: `REFERRAL_${eventType}`,
    referralId: referral._id, sourceSubscriptionId: eventType === 'SUBSCRIPTION' ? sourceId : null,
    description: `${eventType.toLowerCase()} referral reward for ${actingUser.name || 'a member'}`
  }, config);
  await Referral.updateOne({ _id: referral._id }, { $set: { status: result.status, pointsAwarded: result.pointsAwarded } });
  if (result.pointsAwarded) notifyPoints(actingUser.referredBy, 'Referral reward earned', `You earned ${result.pointsAwarded} points from a referred member's ${eventType.toLowerCase()}.`).catch(() => {});
};

const processDueRewardSchedules = async (now = new Date(), limit = 100) => {
  const schedules = await RewardSchedule.find({ status: 'pending', nextRewardAt: { $lte: now } }).sort({ nextRewardAt: 1 }).limit(limit);
  let posted = 0;
  for (const schedule of schedules) {
    if (schedule.sourceSubscriptionId) {
      const subscription = await UserSubscription.findById(schedule.sourceSubscriptionId).select('status paymentStatus endDate').lean();
      if (!subscription || subscription.status !== 'active' || subscription.paymentStatus !== 'success' || new Date(subscription.endDate) <= now) {
        await RewardSchedule.updateOne({ _id: schedule._id, status: 'pending' }, { $set: { status: 'cancelled', cancelledAt: now } });
        if (schedule.referralId) await Referral.updateOne({ _id: schedule.referralId, status: 'PENDING' }, { $set: { status: 'CANCELLED' } });
        continue;
      }
    }

    const day = schedule.issuedDays + 1;
    const base = Math.floor(schedule.totalPoints / schedule.totalDays);
    const installment = day === schedule.totalDays ? schedule.totalPoints - base * (schedule.totalDays - 1) : base;
    if (installment > 0) {
      await postCredit({
        userId: schedule.userId, points: installment,
        eventKey: `${schedule.eventKey}:day:${day}`, eventType: `${schedule.eventType}_DAILY`,
        sourceReference: { scheduleId: schedule._id, referralId: schedule.referralId, subscriptionId: schedule.sourceSubscriptionId },
        description: `Daily reward ${day} of ${schedule.totalDays}`
      });
    }

    const updated = await RewardSchedule.findOneAndUpdate(
      { _id: schedule._id, status: 'pending', issuedDays: day - 1 },
      { $set: {
        issuedDays: day,
        nextRewardAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        ...(day >= schedule.totalDays ? { status: 'complete' } : {})
      } },
      { new: true }
    );
    if (updated) {
      posted++;
      if (schedule.referralId) {
        await Referral.updateOne(
          { _id: schedule.referralId },
          { $inc: { pointsAwarded: installment }, $set: day >= schedule.totalDays ? { status: 'REWARDED', rewardedAt: now } : { status: 'PENDING' } }
        );
      }
    }
  }
  return posted;
};

const reconcilePendingCredits = async (limit = 100) => {
  const pending = await RewardTransaction.find({ status: 'pending', eventType: { $not: /_DAILY$/ } }).sort({ createdAt: 1 }).limit(limit);
  for (const transaction of pending) {
    await postCredit({
      userId: transaction.userId, points: transaction.points, eventKey: transaction.idempotencyKey,
      eventType: transaction.eventType, sourceReference: transaction.sourceReference, description: transaction.description
    });
    const referralId = transaction.sourceReference?.referralId;
    if (referralId) await Referral.updateOne({ _id: referralId, status: { $ne: 'REWARDED' } }, { $set: { pointsAwarded: transaction.points, scheduledPoints: transaction.points, status: 'REWARDED', rewardedAt: new Date() } });
  }
  return pending.length;
};

const cancelSubscriptionRewardSchedules = async (subscriptionId) => {
  const schedules = await RewardSchedule.find({ sourceSubscriptionId: subscriptionId, status: 'pending' }).select('_id referralId');
  if (!schedules.length) return 0;
  await RewardSchedule.updateMany({ _id: { $in: schedules.map(s => s._id) }, status: 'pending' }, { $set: { status: 'cancelled', cancelledAt: new Date() } });
  await Referral.updateMany({ _id: { $in: schedules.map(s => s.referralId).filter(Boolean) }, status: 'PENDING' }, { $set: { status: 'CANCELLED' } });
  return schedules.length;
};

const isWelcomeRow = { $expr: { $eq: ['$referrer', '$referredUser'] } };

const topReferrers = async ({ limit = 10, match = {} } = {}) => {
  const rows = await Referral.aggregate([
    { $match: { ...match, $expr: { $ne: ['$referrer', '$referredUser'] } } },
    { $group: {
      _id: '$referrer', points: { $sum: '$pointsAwarded' }, events: { $sum: 1 },
      signups: { $sum: { $cond: [{ $eq: ['$eventType', 'REGISTRATION'] }, 1, 0] } },
      subscriptions: { $sum: { $cond: [{ $eq: ['$eventType', 'SUBSCRIPTION'] }, 1, 0] } },
      donations: { $sum: { $cond: [{ $eq: ['$eventType', 'DONATION'] }, 1, 0] } }
    } },
    { $sort: { points: -1 } }, { $limit: limit }
  ]);
  const users = await User.find({ _id: { $in: rows.map(r => r._id) } }).select('name phone avatar referralCode pointsBalance pointsRedeemed').lean();
  const byId = new Map(users.map(user => [String(user._id), user]));
  return rows.map(row => ({
    _id: row._id, name: byId.get(String(row._id))?.name || 'Member', phone: byId.get(String(row._id))?.phone || '',
    avatar: byId.get(String(row._id))?.avatar || null, referralCode: byId.get(String(row._id))?.referralCode || '',
    pointsBalance: byId.get(String(row._id))?.pointsBalance || 0, pointsRedeemed: byId.get(String(row._id))?.pointsRedeemed || 0,
    totalPointsEarned: row.points, events: row.events, signups: row.signups, subscriptions: row.subscriptions, donations: row.donations
  }));
};

const creditPoints = ({ userId, points, eventKey, eventType, sourceReference = null, description = '' }) =>
  postCredit({ userId, points: Math.floor(Number(points) || 0), eventKey, eventType, sourceReference, description });

module.exports = {
  getOrCreateConfig, generateUniqueReferralCode, findCodeOwner, repairDuplicateCodes,
  processRegistrationReferral, processReferralEvent, processDueRewardSchedules,
  reconcilePendingCredits, cancelSubscriptionRewardSchedules, postCredit, creditPoints, awardPoints,
  notifyPoints, topReferrers, isWelcomeRow
};
