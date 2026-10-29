/**
 * matrimonialUsageService.js
 * How much of each plan limit a member has used. The limit checks (profile view,
 * interest and message) and the "My Subscription" screen both use these counts,
 * so what the member sees is exactly what is enforced.
 */
const ProfileVisitor  = require('../models/ProfileVisitor');
const InterestRequest = require('../models/InterestRequest');
const Conversation    = require('../models/Conversation');
const Message         = require('../models/Message');

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

/** Distinct matrimonial profiles opened today (re-opening one doesn't count twice). */
const countProfileViewsToday = (userId) =>
  ProfileVisitor.countDocuments({ visitorId: userId, lastVisited: { $gte: startOfToday() } });

/** Interest requests sent since the 1st of this month. */
const countInterestsThisMonth = (userId) =>
  InterestRequest.countDocuments({ senderId: userId, createdAt: { $gte: startOfMonth() } });

/** Super Interests sent (or upgraded to Super) since the 1st of this month. */
const countSuperInterestsThisMonth = (userId) =>
  InterestRequest.countDocuments({ senderId: userId, isSuper: true, superAt: { $gte: startOfMonth() } });

/** Matrimonial chat messages sent since the 1st of this month. */
const countMessagesThisMonth = async (userId) => {
  const conversations = await Conversation.find({ participants: userId, type: 'matrimonial' }).distinct('_id');
  if (!conversations.length) return 0;
  return Message.countDocuments({ senderId: userId, conversationId: { $in: conversations }, createdAt: { $gte: startOfMonth() } });
};

const getUsage = async (userId) => {
  const [profileViewsToday, interestsThisMonth, messagesThisMonth, superInterestsThisMonth] = await Promise.all([
    countProfileViewsToday(userId),
    countInterestsThisMonth(userId),
    countMessagesThisMonth(userId),
    countSuperInterestsThisMonth(userId)
  ]);

  const nextDay = startOfToday();
  nextDay.setDate(nextDay.getDate() + 1);
  const nextMonth = startOfMonth();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  return {
    profileViewsToday,
    interestsThisMonth,
    messagesThisMonth,
    superInterestsThisMonth,
    dailyResetAt: nextDay,     // profile views reset at midnight
    monthlyResetAt: nextMonth  // interests & messages reset on the 1st
  };
};

module.exports = {
  startOfToday,
  startOfMonth,
  countProfileViewsToday,
  countInterestsThisMonth,
  countMessagesThisMonth,
  countSuperInterestsThisMonth,
  getUsage
};
