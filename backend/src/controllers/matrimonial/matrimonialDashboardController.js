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
const { buildProfileForViewer, connectedUserIds } = require('../../middleware/matrimonialPrivacy');
const { ensureBlurredPhotos } = require('../../services/matrimonialPhotoBlur');

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
      require('../../middleware/subscriptionMiddleware').getActiveSubscription(userId),
      InterestRequest.aggregate([
        { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
        {
          $group: {
            _id: null,
            // The dashboard badges represent actionable pending requests.
            // Accepted requests are shown separately in the Accepted tab.
            sent:     { $sum: { $cond: [{ $and: [{ $eq: ['$senderId', userId] }, { $eq: ['$status', 'pending'] }] }, 1, 0] } },
            received: { $sum: { $cond: [{ $and: [{ $eq: ['$receiverId', userId] }, { $eq: ['$status', 'pending'] }] }, 1, 0] } },
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
    const { features: effectiveFeatures } = await require('../../middleware/subscriptionMiddleware').getEffectiveFeatures(userId);

    // ─── Build Response ────────────────────────────────────────────────────────
    const dashboard = {
      profileCompletion: myProfile ? require('../../services/matrimonialCompletion').calculateCompletion(myProfile) : { percentage: 0, completedSections: [], missing: [] },
      profileStatus:     myProfile?.status || null,
      maritalLifecycle:  myProfile?.maritalLifecycle || 'single',
      subscription: {
        isPremium:  !!subscription,
        plan:       subscription?.planName || 'Free',
        expiresOn:  subscription?.endDate || null,
        status:     subscription?.status  || 'free',
        daysLeft:   subscription ? Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24)) : 0,
        // What the member's current plan (paid or Free) unlocks; the app hides anything not included.
        features: effectiveFeatures || {},
        canSeeOtherCommunities: !!effectiveFeatures?.crossCommunityVisibility,
        canSeeAllSubCommunities: !!effectiveFeatures?.allSubCommunitiesAccess
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

    // ─── My community + its sub-communities (for the sub-community filter) ─────
    try {
      const Community = require('../../models/Community');
      const meDoc = await User.findById(userId).select('communityId subCommunity').lean();
      const commDoc = meDoc?.communityId ? await Community.findById(meDoc.communityId).select('name subCommunities').lean() : null;
      dashboard.community = {
        name: commDoc?.name || '',
        mySubCommunity: meDoc?.subCommunity || '',
        subCommunities: (commDoc?.subCommunities || []).filter(sc => sc.isActive !== false).map(sc => sc.name).filter(Boolean)
      };
    } catch (e) { dashboard.community = { name: '', mySubCommunity: '', subCommunities: [] }; }

    // ─── Recommendations (categorized) ────────────────────────────────────────
    // Filters on details members can't see (marital status, diet, city, sub-community)
    // run here, so those values never have to be sent to the app.
    const { maritalStatus, diet, nearby, subCommunity, manglikStatus, ageMin, ageMax, disability, verified, withPhoto, joined, communityScope, q } = req.query;
    const recommendations = await getRecommendations(userId, myProfile, subscription, { maritalStatus, diet, nearby, subCommunity, manglikStatus, ageMin, ageMax, disability, verified, withPhoto, joined, communityScope, q });
    dashboard.recommendations = recommendations;

    res.json({ status: 'success', data: { dashboard } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Recommendation Engine ────────────────────────────────────────────────────
const getRecommendations = async (userId, myProfile, subscription, filters = {}) => {
  // ─── If married/closed, return empty recommendations ──────────────────────
  if (myProfile && (myProfile.isClosed || myProfile.status === 'married')) {
    return { recommendedMatches: [], newMembers: [], recentlyActive: [], premiumMembers: [], nearYou: [] };
  }

  // Pre-fetch settings, user doc, and blocks in a single parallel step
  const [settings, userDoc, blocks] = await Promise.all([
    MatrimonialSettings.findOne().lean(),
    User.findById(userId).select('gender communityId assignedCommunityIds subCommunity city').lean(),
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
  const { profileScopeCondition, communityUserIds, viewerCommunityId } = require('../../utils/matrimonialCommunityScope');
  const { features: planFeatures } = await getEffectiveFeatures(userId);
  // "My Community" / "Other Communities" pills: filtered here, not on the few
  // profiles already loaded in the app.
  const scope = ['my', 'other'].includes(filters.communityScope) ? filters.communityScope : 'all';
  const { condition: communityCondition, blocked: scopeBlocked } = await profileScopeCondition({
    user: userDoc,
    canSeeOtherCommunities: !!planFeatures?.crossCommunityVisibility,
    canSeeSiblingSubCommunities: !!planFeatures?.allSubCommunitiesAccess,
    scope
  });
  if (scopeBlocked) return { recommendedMatches: [], newMembers: [], recentlyActive: [], premiumMembers: [], nearYou: [] };
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

  // ─── Feed filters on hidden details ──────────────────────────────────────
  const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exact = (v) => new RegExp('^' + escapeRegex(String(v).trim()) + '$', 'i');
  // Profiles store several spellings ("Single" from older forms, "Jain" diet, ...)
  const MARITAL_ALIASES = {
    'never married': /^(never married|single|unmarried)$/i,
    separated: /^(separated|awaiting divorce)$/i
  };
  const DIET_ALIASES = {
    vegetarian: /^(vegetarian|veg|pure veg|jain|vegan)$/i,
    'non-vegetarian': /^(non[- ]?vegetarian|non[- ]?veg)$/i
  };
  const aliasOrExact = (aliases, value) => aliases[String(value).trim().toLowerCase()] || exact(value);
  if (filters.maritalStatus && filters.maritalStatus !== 'All') baseQuery['personal.maritalStatus'] = aliasOrExact(MARITAL_ALIASES, filters.maritalStatus);
  if (filters.diet && filters.diet !== 'All') baseQuery['lifestyle.diet'] = aliasOrExact(DIET_ALIASES, filters.diet);
  if (String(filters.withPhoto) === '1') baseQuery.photos = { $elemMatch: { isDeleted: { $ne: true } } };
  if (String(filters.joined) === '1') baseQuery.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 3600000) };
  // Verified = approved by the community head or Aadhaar verified (the account's badges)
  if (String(filters.verified) === '1') {
    const verifiedIds = await User.find({ $or: [{ verificationStatus: 'verified' }, { isAadharVerified: true }] }).distinct('_id');
    baseQuery.$and.push({ userId: { $in: verifiedIds } });
  }
  // Search box: location, gotra, profession, education; the name only where the
  // viewer may already see it (private profiles show the name, public ones don't).
  const q = String(filters.q || '').trim().slice(0, 60);
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    baseQuery.$and.push({ $or: [
      { 'location.city': re }, { 'location.state': re }, { 'personal.gotra': re },
      { 'education.profession': re }, { 'education.occupation': re }, { 'education.highestQualification': re },
      { 'personal.fullName': re, 'visibilitySettings.visibleOnlyAfterAccept': { $ne: false } }
    ] });
  }
  if (filters.disability === 'yes') baseQuery['personal.hasDisability'] = true;
  else if (filters.disability === 'no') baseQuery['personal.hasDisability'] = { $ne: true };
  if (filters.manglikStatus === 'manglik') {
    baseQuery['horoscope.manglik'] = /^(yes|manglik|anshik)$/i;
  }
  // Age range (other members' age is never sent, so it's filtered here via the DOB)
  const ageMin = Number(filters.ageMin);
  const ageMax = Number(filters.ageMax);
  if ((ageMin > 0 && ageMin < 120) || (ageMax > 0 && ageMax < 120)) {
    const today = new Date();
    const dobRange = {};
    if (ageMax > 0 && ageMax < 120) dobRange.$gt = new Date(today.getFullYear() - ageMax - 1, today.getMonth(), today.getDate());
    if (ageMin > 0 && ageMin < 120) dobRange.$lte = new Date(today.getFullYear() - ageMin, today.getMonth(), today.getDate());
    baseQuery['personal.dateOfBirth'] = dobRange;
  }
  const myCity = myProfile?.location?.city || userDoc?.city;
  if (String(filters.nearby) === '1' && myCity) baseQuery['location.city'] = exact(myCity);
  if (filters.subCommunity) {
    const subIds = await User.find({ subCommunity: exact(filters.subCommunity) }).distinct('_id');
    baseQuery.$and.push({ userId: { $in: subIds } });
  }

  // Fetch a wider pool for each list, then drop profiles that break the user's
  // must-match partner preferences (age range, marital status) before trimming.
  const pool = limit * 4;
  const [candidatePool, newMembers, recentlyActive, premiumMembers, nearYou] = await Promise.all([
    // Candidates for "Recommended Matches": ranked by partner-preference match below
    MatrimonialProfile.find(baseQuery).sort({ lastActiveAt: -1 }).limit(200).populate('userId', 'name avatar subCommunity verificationStatus isAadharVerified aadhaarVerifiedName').lean({ virtuals: true }),

    // New Members
    MatrimonialProfile.find(baseQuery).sort({ createdAt: -1 }).limit(pool).populate('userId', 'name avatar subCommunity verificationStatus isAadharVerified aadhaarVerifiedName').lean({ virtuals: true }),

    // Recently Active
    MatrimonialProfile.find(baseQuery).sort({ lastActiveAt: -1 }).limit(pool).populate('userId', 'name avatar subCommunity verificationStatus isAadharVerified aadhaarVerifiedName').lean({ virtuals: true }),

    // Verified Members first
    MatrimonialProfile.find({ ...baseQuery, verificationStatus: 'verified' })
      .sort({ createdAt: -1 }).limit(pool).populate('userId', 'name avatar subCommunity verificationStatus isAadharVerified aadhaarVerifiedName').lean({ virtuals: true }),

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
    }).sort({ createdAt: -1 }).limit(pool).populate('userId', 'name avatar subCommunity verificationStatus isAadharVerified aadhaarVerifiedName').lean({ virtuals: true })
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
  // Premium badge: each shown profile's active matrimonial plan. Kept separate from
  // `membershipTier`, which the app uses to lock profiles by plan rank.
  const shownUserIds = [...candidatePool, ...newMembers, ...recentlyActive, ...premiumMembers, ...nearYou]
    .map(p => p.userId?._id || p.userId)
    .filter(Boolean);
  const activeSubs = shownUserIds.length
    ? await UserSubscription.find({
        userId: { $in: shownUserIds },
        planType: { $ne: 'app' },
        status: { $in: ['active', 'grace', 'cancelled'] },
        endDate: { $gte: new Date() }
      }).select('userId planName').lean()
    : [];
  const planByUser = new Map(activeSubs.map(s => [String(s.userId), s.planName]));
  // Same community by account, so the app's "My Community" / "Other Communities"
  // pills don't depend on the community name typed on the profile.
  const ownCommunityUsers = new Set((await communityUserIds(viewerCommunityId(userDoc))).map(String));
  const withTier = (profile, built) => {
    const ownerId = String(profile.userId?._id || profile.userId);
    const planName = planByUser.get(ownerId);
    return { ...built, isPremium: !!planName, premiumPlan: planName || null, fromMyCommunity: ownCommunityUsers.has(ownerId) };
  };
  // Privacy: full profile only for members already connected (accepted interest);
  // everyone else gets the restricted view (blurred photo for private profiles).
  const lists = {
    newMembers: fits(newMembers), recentlyActive: fits(recentlyActive),
    premiumMembers: fits(premiumMembers), nearYou: fits(nearYou)
  };
  const top = scored.slice(0, limit);
  const shown = [...top.map(s => s.profile), ...Object.values(lists).flat()];
  const connected = await connectedUserIds(userId, shown.map(p => p.userId?._id || p.userId));
  const isConnectedTo = (p) => connected.has(String(p.userId?._id || p.userId));
  // Without the plan's photo access, public profiles' photos are blurred too
  const canViewPhotos = !!planFeatures?.viewProfilePhotos;
  await ensureBlurredPhotos(shown.filter(p => !isConnectedTo(p)), { includePublic: !canViewPhotos });
  const build = (p) => withTier(p, buildProfileForViewer(p, { isConnected: isConnectedTo(p), canViewPhotos }));

  return {
    recommendedMatches: top.map(({ profile, result }) => ({ ...build(profile), ...result })),
    newMembers:     lists.newMembers.map(build),
    recentlyActive: lists.recentlyActive.map(build),
    premiumMembers: lists.premiumMembers.map(build),
    nearYou:        lists.nearYou.map(build)
  };
};
