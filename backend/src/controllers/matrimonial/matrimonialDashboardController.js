/**
 * matrimonialDashboardController.js
 * Returns all dashboard stats in a single API call + recommendation engine.
 */
const MatrimonialProfile  = require('../../models/MatrimonialProfile');
const InterestRequest     = require('../../models/InterestRequest');
const Shortlist           = require('../../models/Shortlist');
const ProfileVisitor      = require('../../models/ProfileVisitor');
const Conversation        = require('../../models/Conversation');
const MatrimonialSettings = require('../../models/MatrimonialSettings');
const UserSubscription    = require('../../models/UserSubscription');
const UserBlock           = require('../../models/UserBlock');
const User                = require('../../models/User');
const { calculateMatchPercentage, passesHardPreferences } = require('../../services/matchService');
const { buildRestrictedProfile, buildFullProfile } = require('../../middleware/matrimonialPrivacy');

// ─── Dashboard ────────────────────────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const now    = new Date();

    // Run all in parallel for performance — duplicate MatrimonialProfile.findOne removed
    const [
      myProfile,
      subscription,
      interestStats,
      shortlistCount,
      recentChatsCount
    ] = await Promise.all([
      MatrimonialProfile.findOne({ userId, isDeleted: false }),
      UserSubscription.findOne({ userId, status: { $in: ['active', 'grace', 'cancelled'] }, endDate: { $gte: now } }).sort({ endDate: -1 }),
      InterestRequest.aggregate([
        { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
        {
          $group: {
            _id: null,
            sent:     { $sum: { $cond: [{ $eq: ['$senderId', userId] }, 1, 0] } },
            received: { $sum: { $cond: [{ $eq: ['$receiverId', userId] }, 1, 0] } },
            accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
            pending:  { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }
          }
        }
      ]),
      Shortlist.countDocuments({ userId }),
      Conversation.countDocuments({ participants: userId, type: 'matrimonial', isActive: true, isDeleted: false })
    ]);

    const interests = interestStats[0] || { sent: 0, received: 0, accepted: 0, pending: 0, rejected: 0 };

    // ─── Build Response ────────────────────────────────────────────────────────
    const dashboard = {
      profileCompletion: myProfile?.profileCompletion || { percentage: 0, completedSections: [] },
      profileStatus:     myProfile?.status || null,
      maritalLifecycle:  myProfile?.maritalLifecycle || 'single',
      subscription: {
        isPremium:  !!subscription,
        plan:       subscription?.planName || 'Free',
        expiresOn:  subscription?.endDate || null,
        status:     subscription?.status  || 'free',
        daysLeft:   subscription ? Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24)) : 0,
        // What the member's current plan (paid or Free) unlocks; the app hides anything not included.
        features: (await require('../../middleware/subscriptionMiddleware').getEffectiveFeatures(userId)).features || {},
        canSeeOtherCommunities: !!(await require('../../middleware/subscriptionMiddleware').getEffectiveFeatures(userId)).features?.crossCommunityVisibility
      },
      interests: {
        sent:     interests.sent,
        received: interests.received,
        accepted: interests.accepted,
        pending:  interests.pending,
        rejected: interests.rejected
      },
      visitors: {
        total:   myProfile?.totalProfileViews   || 0,
        monthly: myProfile?.monthlyProfileViews || 0,
        weekly:  myProfile?.weeklyProfileViews  || 0
      },
      shortlist:    shortlistCount,
      recentChats:  recentChatsCount
    };

    // ─── Recommendations (categorized) ────────────────────────────────────────
    const recommendations = await getRecommendations(userId, myProfile, subscription);
    dashboard.recommendations = recommendations;

    res.json({ status: 'success', data: { dashboard } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Recommendation Engine ────────────────────────────────────────────────────
const getRecommendations = async (userId, myProfile, subscription) => {
  // ─── If married/closed, return empty recommendations ──────────────────────
  if (myProfile && (myProfile.isClosed || myProfile.status === 'married')) {
    return { recommendedMatches: [], newMembers: [], recentlyActive: [], premiumMembers: [], nearYou: [] };
  }

  // Pre-fetch settings, user doc, and blocks in a single parallel step
  const [settings, userDoc, blocks] = await Promise.all([
    MatrimonialSettings.findOne().lean(),
    User.findById(userId).select('gender communityId assignedCommunityIds').lean(),
    UserBlock.find({ $or: [{ userId }, { blockedUserId: userId }] }).lean()
  ]);

  const matchWeights = settings?.matchWeights;
  const limit = settings?.maxRecommendationsPerCategory || 10;
  const completionRequired = parseInt(process.env.MATRIMONIAL_MIN_COMPLETION) ||
    (settings?.profileCompletionRequired ?? 50);

  // Consolidate block list cleanly
  const excludeUsers = blocks.map(b =>
    b.userId.toString() === userId.toString() ? b.blockedUserId : b.userId
  );

  const mongoose = require('mongoose');
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const userExclusion = excludeUsers.length > 0
    ? { $ne: userObjectId, $nin: excludeUsers }
    : { $ne: userObjectId };

  const userCommunity = (myProfile?.personal?.community || userDoc?.community || '').trim();

  const baseQuery = {
    userId:   userExclusion,
    status:   'active',      // Only active profiles appear in matchmaking
    isClosed: { $ne: true }, // Exclude married/closed profiles
    isDeleted: false,
    'profileCompletion.percentage': { $gte: completionRequired }
  };

  // Community scope by the members' real accounts (not the typed profile text):
  // own community only, unless the plan includes other communities.
  const { getEffectiveFeatures } = require('../../middleware/subscriptionMiddleware');
  const { profileScopeCondition } = require('../../utils/matrimonialCommunityScope');
  const { features: planFeatures } = await getEffectiveFeatures(userId);
  const { condition: communityCondition } = await profileScopeCondition({
    user: userDoc,
    canSeeOtherCommunities: !!planFeatures?.crossCommunityVisibility
  });
  baseQuery.$and = [communityCondition];

  // ─── Apply opposite gender filter (Strictly Enforce) ────────────────────
  let myGender = null;
  if (myProfile?.personal?.gender) {
    myGender = myProfile.personal.gender.toLowerCase();
  } else if (userDoc?.gender) {
    myGender = userDoc.gender.toLowerCase();
  }

  if (myGender === 'male') {
    baseQuery['personal.gender'] = 'female';
  } else if (myGender === 'female') {
    baseQuery['personal.gender'] = 'male';
  }

  // Fetch a wider pool for each list, then drop profiles that break the user's
  // must-match partner preferences (age range, marital status) before trimming.
  const pool = limit * 4;
  const [candidatePool, newMembers, recentlyActive, premiumMembers, nearYou] = await Promise.all([
    // Candidates for "Recommended Matches": ranked by partner-preference match below
    MatrimonialProfile.find(baseQuery).sort({ lastActiveAt: -1 }).limit(200).populate('userId', 'name avatar').lean({ virtuals: true }),

    // New Members
    MatrimonialProfile.find(baseQuery).sort({ createdAt: -1 }).limit(pool).populate('userId', 'name avatar').lean({ virtuals: true }),

    // Recently Active
    MatrimonialProfile.find(baseQuery).sort({ lastActiveAt: -1 }).limit(pool).populate('userId', 'name avatar').lean({ virtuals: true }),

    // Verified Members first
    MatrimonialProfile.find({ ...baseQuery, verificationStatus: 'verified' })
      .sort({ createdAt: -1 }).limit(pool).populate('userId', 'name avatar').lean({ virtuals: true }),

    // Near You (same city or state)
    MatrimonialProfile.find({
      ...baseQuery,
      $and: [
        ...baseQuery.$and,
        { $or: [
          { 'location.city':  myProfile?.location?.city  || '__none__' },
          { 'location.state': myProfile?.location?.state || '__none__' }
        ] }
      ]
    }).sort({ createdAt: -1 }).limit(pool).populate('userId', 'name avatar').lean({ virtuals: true })
  ]);

  const fits = (list) => (myProfile ? list.filter(p => passesHardPreferences(myProfile, p)) : list).slice(0, limit);

  // Recommended Matches: only profiles that fit the must-match preferences,
  // ranked by how many of the user's partner preferences they satisfy.
  const scored = await Promise.all(
    candidatePool
      .filter(p => !myProfile || passesHardPreferences(myProfile, p))
      .map(async (profile) => {
        const result = myProfile
          ? await calculateMatchPercentage(myProfile, profile, matchWeights)
          : { matchPercentage: 0, matchedCriteria: [] };
        return { profile, result };
      })
  );
  scored.sort((a, b) => (b.result.matchPercentage - a.result.matchPercentage)
    || (new Date(b.profile.lastActiveAt || 0) - new Date(a.profile.lastActiveAt || 0)));
  const enriched = scored.slice(0, limit).map(({ profile, result }) => ({ ...buildRestrictedProfile(profile), ...result }));

  return {
    recommendedMatches: enriched,
    newMembers:    fits(newMembers).map(buildRestrictedProfile),
    recentlyActive:fits(recentlyActive).map(buildRestrictedProfile),
    premiumMembers:fits(premiumMembers).map(buildRestrictedProfile),
    nearYou:       fits(nearYou).map(buildRestrictedProfile)
  };
};
