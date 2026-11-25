const { withAppDefaults, withMatrimonialDefaults } = require('./planFeatureDefaults');

// Limits whose reset period the admin chooses per plan: [limit key, period key, name]
const PERIOD_LIMITS = {
  profileViewsPerDay: ['profileViewsPeriod', 'Profile views'],
  interestLimit: ['interestPeriod', 'Interests'],
  messageLimit: ['messagePeriod', 'Messages'],
  superInterestsPerMonth: ['superInterestPeriod', 'Super interests']
};

const MATRIMONIAL_FEATURES = [
  ['profileViewsPerDay', 'Profile views per day', 'limit'],
  ['interestLimit', 'Interests per month', 'limit'],
  ['messageLimit', 'Messages per month', 'limit'],
  ['superInterestsPerMonth', 'Super interests per month', 'limit'],
  ['profileBoosts', 'Profile boosts per month', 'limit'],
  ['chat', 'Chat access', 'boolean'],
  ['advancedFilters', 'Advanced filters', 'boolean'],
  ['visitorHistory', 'Visitor history', 'boolean'],
  ['contactDetailsAccess', 'Contact details access', 'boolean'],
  ['crossCommunityVisibility', 'Other community profiles', 'boolean'],
  ['communityFilter', 'Community filter', 'boolean'],
  ['allSubCommunitiesAccess', 'All sub-communities access', 'boolean'],
  ['viewOtherSubCommunityProfile', 'View other sub-community profiles', 'boolean'],
  ['viewAllSubCommunityProfiles', 'Browse all sub-community profiles', 'boolean'],
  ['viewProfilePhotos', 'View profile photos', 'boolean'],
  ['highlightProfile', 'Highlight profile', 'boolean'],
  ['priorityListing', 'Priority listing', 'boolean'],
  ['unlimitedShortlist', 'Unlimited shortlist', 'boolean'],
  ['readReceipts', 'Read receipts', 'boolean'],
  ['profileBadge', 'Premium profile badge', 'boolean']
];

const APP_FEATURES = [
  ['proBadge', 'PRO badge', 'boolean'],
  ['pinPostsPerMonth', 'Pinned posts per month', 'limit'],
  ['socialPosts', 'Create social posts', 'boolean'],
  ['socialStories', 'Share social stories', 'boolean'],
  ['professionalListing', 'Professional listing', 'boolean']
];

const formatLimit = (value, label) => {
  if (value === -1) return 'Unlimited';
  if (value === 0) return 'Not included';
  if (label.includes('per day')) return `${value} per day`;
  if (label.includes('per month')) return `${value} per month`;
  return String(value);
};

const buildPlanFeatures = (plan) => {
  const isApp = plan.planType === 'app';
  const source = isApp
    ? withAppDefaults(plan.appFeatures || {})
    : withMatrimonialDefaults(plan.features || {}, { paid: Number(plan.price) > 0 });
  if (isApp) source.proBadge = source.proBadge !== false;
  const rows = (isApp ? APP_FEATURES : MATRIMONIAL_FEATURES).map(([key, baseLabel, type]) => {
    // "Profile views per day" / "… per month" follows the period chosen on this plan
    const label = !isApp && PERIOD_LIMITS[key]
      ? `${PERIOD_LIMITS[key][1]} per ${source[PERIOD_LIMITS[key][0]] === 'day' ? 'day' : 'month'}`
      : baseLabel;
    const value = source[key];
    const numericValue = Number(value ?? 0);
    const included = type === 'boolean' ? value === true : Number.isFinite(numericValue) && numericValue !== 0;
    return {
      key,
      label,
      included,
      value: type === 'limit' && included ? formatLimit(numericValue, label) : undefined
    };
  });

  (plan.customFeatures || []).forEach((label, index) => {
    if (String(label).trim()) rows.push({ key: `custom-${index}`, label: String(label).trim(), included: true });
  });

  return rows.filter(feature => feature.included || plan.showExcludedFeatures === true);
};

module.exports = { buildPlanFeatures };
