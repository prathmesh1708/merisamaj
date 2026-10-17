/**
 * membershipService.js
 * Keeps the member's membership fields in step with their REAL subscriptions
 * (bought through Razorpay or granted by the Admin). Never set from a profile update.
 *
 *   App plan        → isPremium, membershipPlan, membershipStartDate, membershipExpiry,
 *                     proBadge, appFeatures   (the "Pro" badge & Social perks)
 *   Matrimonial plan→ matrimonySubscription
 */
const User = require('../models/User');
const { getActiveSubscription } = require('../middleware/subscriptionMiddleware');

const toDay = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

const syncMembership = async (userId) => {
  if (!userId) return null;
  const [appSub, matSub] = await Promise.all([
    getActiveSubscription(userId, 'app'),
    getActiveSubscription(userId, 'matrimonial')
  ]);

  const appFeatures = appSub ? (appSub.featuresSnapshot || {}) : null;
  const fields = {
    isPremium: Boolean(appSub),
    membershipPlan: appSub?.planName || '',
    membershipStartDate: toDay(appSub?.startDate),
    membershipExpiry: toDay(appSub?.endDate),
    proBadge: Boolean(appSub && appFeatures.proBadge !== false),
    appFeatures,
    matrimonySubscription: matSub
      ? {
          status: matSub.status === 'cancelled' ? 'cancelled' : 'active',
          plan: matSub.planName || '',
          startDate: matSub.startDate,
          validUntil: matSub.endDate,
          subscriptionId: matSub._id
        }
      : null
  };

  const current = await User.findById(userId)
    .select('isPremium membershipPlan membershipStartDate membershipExpiry proBadge appFeatures matrimonySubscription')
    .lean();
  if (!current) return null;

  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const changed =
    Boolean(current.isPremium) !== fields.isPremium ||
    (current.membershipPlan || '') !== fields.membershipPlan ||
    (current.membershipStartDate || '') !== fields.membershipStartDate ||
    (current.membershipExpiry || '') !== fields.membershipExpiry ||
    Boolean(current.proBadge) !== fields.proBadge ||
    !same(current.appFeatures, fields.appFeatures) ||
    (current.matrimonySubscription?.status || null) !== (fields.matrimonySubscription?.status || null) ||
    (current.matrimonySubscription?.plan || null) !== (fields.matrimonySubscription?.plan || null);

  if (changed) await User.updateOne({ _id: userId }, { $set: fields });
  return fields;
};

module.exports = { syncMembership };
