/**
 * matrimonialUsageService.js
 * How much of each plan limit a member has used. The limit checks (profile view,
 * interest, Super Interest and message) and the "My Subscription" screen all use
 * these counts, so what the member sees is exactly what is enforced.
 *
 * Each limit resets per 'day' (at midnight) or per 'month' (on the 1st), as the
 * admin chose on the plan (features.profileViewsPeriod / interestPeriod /
 * messagePeriod / superInterestPeriod; see planFeatureDefaults for missing values).
 */
const ProfileVisitor  = require('../models/ProfileVisitor');
const InterestRequest = require('../models/InterestRequest');
const Conversation    = require('../models/Conversation');
const Message         = require('../models/Message');
const { LIMIT_PERIOD_DEFAULTS } = require('./planFeatureDefaults');

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfMonth = () => {
  const d = startOfToday();
  d.setDate(1);
  return d;
};

const periodStart = (period) => (period === 'day' ? startOfToday() : startOfMonth());

/** When the current day / month window ends (the limit resets then). */
const periodResetAt = (period) => {
  const d = periodStart(period);
  if (period === 'day') d.setDate(d.getDate() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
};

const periodsOf = (features = {}) => ({
  profileViews: features.profileViewsPeriod || LIMIT_PERIOD_DEFAULTS.profileViewsPeriod,
  interests: features.interestPeriod || LIMIT_PERIOD_DEFAULTS.interestPeriod,
  messages: features.messagePeriod || LIMIT_PERIOD_DEFAULTS.messagePeriod,
  superInterests: features.superInterestPeriod || LIMIT_PERIOD_DEFAULTS.superInterestPeriod
});

/** Distinct matrimonial profiles opened in the period (re-opening one doesn't count twice). */
const countProfileViews = (userId, period = 'day') =>
  ProfileVisitor.countDocuments({ visitorId: userId, lastVisited: { $gte: periodStart(period) } });

/** Interest requests sent in the period. */
const countInterests = (userId, period = 'month') =>
  InterestRequest.countDocuments({ senderId: userId, createdAt: { $gte: periodStart(period) } });

/** Super Interests sent (or upgraded to Super) in the period. */
const countSuperInterests = (userId, period = 'month') =>
  InterestRequest.countDocuments({ senderId: userId, isSuper: true, superAt: { $gte: periodStart(period) } });

/** Matrimonial chat messages sent in the period. */
const countMessages = async (userId, period = 'month') => {
  const conversations = await Conversation.find({ participants: userId, type: 'matrimonial' }).distinct('_id');
  if (!conversations.length) return 0;
  return Message.countDocuments({ senderId: userId, conversationId: { $in: conversations }, createdAt: { $gte: periodStart(period) } });
};

// Older names (fixed periods), kept for existing callers
const countProfileViewsToday = (userId) => countProfileViews(userId, 'day');
const countInterestsThisMonth = (userId) => countInterests(userId, 'month');
const countSuperInterestsThisMonth = (userId) => countSuperInterests(userId, 'month');
const countMessagesThisMonth = (userId) => countMessages(userId, 'month');

/**
 * Usage for the "My Subscription" screen, counted over each limit's own period.
 * The old keys (profileViewsToday, interestsThisMonth, …) now hold the count for the
 * plan's chosen period; `periods` and `resets` say which period and when it resets.
 */
const getUsage = async (userId, features = {}) => {
  const periods = periodsOf(features);
  const [profileViews, interests, messages, superInterests] = await Promise.all([
    countProfileViews(userId, periods.profileViews),
    countInterests(userId, periods.interests),
    countMessages(userId, periods.messages),
    countSuperInterests(userId, periods.superInterests)
  ]);

  return {
    profileViewsToday: profileViews,
    interestsThisMonth: interests,
    messagesThisMonth: messages,
    superInterestsThisMonth: superInterests,
    periods,
    resets: {
      profileViews: periodResetAt(periods.profileViews),
      interests: periodResetAt(periods.interests),
      messages: periodResetAt(periods.messages),
      superInterests: periodResetAt(periods.superInterests)
    },
    dailyResetAt: periodResetAt('day'),
    monthlyResetAt: periodResetAt('month')
  };
};

module.exports = {
  startOfToday,
  startOfMonth,
  periodStart,
  periodResetAt,
  periodsOf,
  countProfileViews,
  countInterests,
  countSuperInterests,
  countMessages,
  countProfileViewsToday,
  countInterestsThisMonth,
  countMessagesThisMonth,
  countSuperInterestsThisMonth,
  getUsage
};
