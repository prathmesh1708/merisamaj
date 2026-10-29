/**
 * planFeatureDefaults.js
 * Plans and subscriptions saved before a feature existed don't have that key, so this
 * decides what "missing" means. The admin plan editor shows the same defaults.
 *
 *   Matrimonial: viewProfilePhotos missing = ON for a paid subscription, OFF for the
 *                Free plan; the sub-community and Super Interest features = off.
 *   App:         socialPosts / socialStories / professionalListing missing = ON,
 *                so nobody loses access until the admin switches one off.
 */
const SubscriptionPlan = require('../models/SubscriptionPlan');

const withMatrimonialDefaults = (features = {}, { paid = false } = {}) => ({
  ...features,
  viewOtherSubCommunityProfile: features.viewOtherSubCommunityProfile ?? false,
  viewAllSubCommunityProfiles:  features.viewAllSubCommunityProfiles ?? false,
  superInterestsPerMonth:       features.superInterestsPerMonth ?? 0,
  viewProfilePhotos:            features.viewProfilePhotos ?? paid
});

const APP_PERMISSION_KEYS = ['socialPosts', 'socialStories', 'professionalListing'];

const withAppDefaults = (appFeatures = {}) => {
  const out = { ...appFeatures };
  APP_PERMISSION_KEYS.forEach(key => { out[key] = appFeatures[key] ?? true; });
  return out;
};

// Community leadership and admins post announcements and manage listings, so the
// member plan never blocks them.
const LEADER_ROLES = ['head', 'sub_head', 'local_head', 'community_head', 'admin', 'super_admin', 'master_admin', 'master'];
const LEADER_ACCOUNT_TYPES = ['head', 'community_head', 'local_head', 'local_sub_head', 'admin_sub_head'];
const isLeader = (user) => {
  const roles = [user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])].filter(Boolean).map(r => String(r).toLowerCase());
  return roles.some(r => LEADER_ROLES.includes(r)) || LEADER_ACCOUNT_TYPES.includes(String(user?.accountType || '').toLowerCase());
};

/**
 * What the member may create in the app: their App plan's switches, else the
 * Free (₹0) App plan's, else everything (as before App plans had these switches).
 */
const getAppPermissions = async (user) => {
  if (isLeader(user)) return { socialPosts: true, socialStories: true, professionalListing: true, leader: true };
  const { getActiveSubscription } = require('../middleware/subscriptionMiddleware');
  const sub = await getActiveSubscription(user._id, 'app');
  let source = sub?.featuresSnapshot;
  if (!sub) {
    const freePlan = await SubscriptionPlan.findOne({ planType: 'app', isActive: true, price: 0 }).sort({ displayOrder: 1 }).lean();
    source = freePlan?.appFeatures;
  }
  const features = withAppDefaults(source || {});
  return Object.fromEntries(APP_PERMISSION_KEYS.map(key => [key, features[key]]));
};

module.exports = { withMatrimonialDefaults, withAppDefaults, getAppPermissions, APP_PERMISSION_KEYS, isLeader };
