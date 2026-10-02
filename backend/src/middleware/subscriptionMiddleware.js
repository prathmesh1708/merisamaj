/**
 * subscriptionMiddleware.js
 * Centralized middleware for checking user subscription tier and feature access.
 * Usage:
 *   router.post('/send', protect, checkFeature('chat'), controller);
 */
const UserSubscription = require('../models/UserSubscription');
const MatrimonialSettings = require('../models/MatrimonialSettings');

// ─── Load Active Subscription for a User ─────────────────────────────────────
const getActiveSubscription = async (userId) => {
  const now = new Date();
  // Includes 'grace' status (within grace period)
  const sub = await UserSubscription.findOne({
    userId,
    status:  { $in: ['active', 'grace'] },
    endDate: { $gte: now }
  }).sort({ endDate: -1 }).lean();
  return sub;
};

// ─── Get effective features (subscription snapshot or free defaults) ──────────
const getEffectiveFeatures = async (userId) => {
  const sub = await getActiveSubscription(userId);
  if (sub) return { features: sub.featuresSnapshot, subscription: sub };

  // Fall back to free-plan defaults from settings
  const settings = await MatrimonialSettings.findOne().lean();
  return {
    features: {
      profileViewsPerDay:   10,
      interestLimit:        settings?.freeInterestLimit ?? 5,
      messageLimit:         -1,
      advancedFilters:      false,
      visitorHistory:       false,
      chat:                 true, // TEMPORARY: Enabled for testing until subscription module is released
      profileBoosts:        0,
      highlightProfile:     false,
      priorityListing:      false,
      contactDetailsAccess: false,
      unlimitedShortlist:   false,
      readReceipts:         false,
      profileBadge:         false,
      crossCommunityVisibility: false
    },
    subscription: null
  };
};

/**
 * checkFeature(featureName)
 * Middleware factory — blocks access if the user's plan doesn't support the feature.
 *
 * @param {string} featureName - Key from the features object (e.g., 'chat', 'advancedFilters')
 */
const checkFeature = (featureName) => async (req, res, next) => {
  try {
    const { features } = await getEffectiveFeatures(req.user._id);
    const value = features[featureName];

    // Boolean feature: must be true
    if (typeof value === 'boolean') {
      if (!value) {
        return res.status(403).json({
          status:  'error',
          code:    'PREMIUM_REQUIRED',
          feature: featureName,
          message: `This feature requires a Premium subscription. Please upgrade your plan.`
        });
      }
    }

    // Numeric feature: 0 means disabled; -1 means unlimited
    if (typeof value === 'number' && value === 0) {
      return res.status(403).json({
        status:  'error',
        code:    'PREMIUM_REQUIRED',
        feature: featureName,
        message: `This feature requires a Premium subscription. Please upgrade your plan.`
      });
    }

    // Attach to req for downstream usage tracking
    req.userFeatures = features;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * checkInterestLimit
 * Checks if user has not exceeded their monthly interest limit.
 */
const checkInterestLimit = async (req, res, next) => {
  try {
    const { features, subscription } = await getEffectiveFeatures(req.user._id);
    const limit = features.interestLimit;

    if (limit === -1) {
      req.userFeatures = features;
      return next(); // Unlimited
    }

    const used = subscription?.usage?.interestsSentThisMonth ?? 0;
    if (used >= limit) {
      return res.status(403).json({
        status:  'error',
        code:    'INTEREST_LIMIT_REACHED',
        message: `You've reached your monthly interest limit of ${limit}. Upgrade to Premium for unlimited interests.`,
        used,
        limit
      });
    }

    req.userFeatures    = features;
    req.userSubscription = subscription;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * attachSubscription
 * Non-blocking middleware — attaches subscription info to req for use in controllers.
 */
const attachSubscription = async (req, res, next) => {
  try {
    const result = await getEffectiveFeatures(req.user._id);
    req.userFeatures     = result.features;
    req.userSubscription = result.subscription;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { checkFeature, checkInterestLimit, attachSubscription, getActiveSubscription, getEffectiveFeatures };
