const mongoose = require('mongoose');
const User = require('../models/User');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const UserSubscription = require('../models/UserSubscription');

/**
 * Which matrimonial profiles a member may see, by community.
 *
 * The community comes from each member's own account (User.communityId), never from
 * the free-text "community" typed on a matrimonial profile, which is often missing or
 * wrong. Rule:
 *   - Without the plan feature `crossCommunityVisibility`: only members of the
 *     viewer's own community.
 *   - With it: own community, plus other communities' members whose profile
 *     visibility is "all_members" / "public" (their own privacy choice still applies).
 *   - Other sub-communities of the viewer's own community: allowed by the member's
 *     active matrimonial subscription with allSubCommunitiesAccess.
 */
const idOf = (v) => (v ? String(v._id || v) : null);

const viewerCommunityId = (user, reqCommunityId) =>
  idOf(reqCommunityId) || idOf(user?.communityId) || idOf(user?.assignedCommunityIds?.[0]) || null;

// All user ids that belong to a community.
const communityUserIds = async (communityId) => {
  if (!communityId || !mongoose.Types.ObjectId.isValid(communityId)) return [];
  const oid = new mongoose.Types.ObjectId(communityId);
  return User.find({ $or: [{ communityId: oid }, { assignedCommunityIds: oid }] }).distinct('_id');
};

const canSeeSiblingSubCommunities = async (viewer, reqCommunityId) => {
  if (!viewer?._id) return false;
  const { features } = await require('../middleware/subscriptionMiddleware').getEffectiveFeatures(viewer._id);
  return !!features?.allSubCommunitiesAccess;
};

const eligibleSiblingProfileUserIds = async (ids, targetSubCommunity = '') => {
  if (!ids.length) return [];
  const now = new Date();
  const activePlans = await UserSubscription.find({
    userId: { $in: ids }, planType: { $ne: 'app' }, status: { $in: ['active', 'grace'] }, endDate: { $gte: now },
    'featuresSnapshot.allSubCommunitiesAccess': true
  }).distinct('userId');
  if (!activePlans.length) return [];
  const targetSub = String(targetSubCommunity || '').trim();
  const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const selectedScope = targetSub
    ? [
        { 'visibilitySettings.allSubCommunities.scope': { $ne: 'selected' } },
        { 'visibilitySettings.allSubCommunities.selectedSubCommunities': new RegExp(`^${escapeRegex(targetSub)}$`, 'i') }
      ]
    : [{ 'visibilitySettings.allSubCommunities.scope': { $ne: 'selected' } }];
  return MatrimonialProfile.find({
    userId: { $in: activePlans }, isDeleted: false,
    visibility: { $in: ['all_members', 'public'] },
    'visibilitySettings.allSubCommunities.enabled': true,
    $or: selectedScope
  }).distinct('userId');
};

const canAccessSiblingProfile = async (viewer, reqCommunityId, ownerId) => {
  const canBrowse = await canSeeSiblingSubCommunities(viewer, reqCommunityId);
  if (!canBrowse) return false;
  return (await eligibleSiblingProfileUserIds([ownerId], viewer?.subCommunity)).some(id => String(id) === String(ownerId));
};

/**
 * Mongo condition on MatrimonialProfile for the viewer.
 * scope: 'all' (default) | 'my' | 'other'
 * Returns { condition, blocked } — blocked=true means "plan does not allow this".
 */
const profileScopeCondition = async ({ user, reqCommunityId, canSeeOtherCommunities, canSeeSiblingSubCommunities: planSiblings = false, scope = 'all' }) => {
  const communityId = viewerCommunityId(user, reqCommunityId);
  const mySub = String(user?.subCommunity || '').trim().toLowerCase();
  const canSeeSiblings = !!planSiblings;
  const communityIds = await communityUserIds(communityId);
  let ownIds = communityIds;
  if (mySub) {
    const escapedSub = mySub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    ownIds = await User.find({ _id: { $in: communityIds }, subCommunity: new RegExp('^' + escapedSub + '$', 'i') }).distinct('_id');
  }
  const otherCommunityIds = communityIds.filter(id => !ownIds.some(own => String(own) === String(id)));
  const visibleSiblingIds = canSeeSiblings ? await eligibleSiblingProfileUserIds(otherCommunityIds, mySub) : [];
  const shareable = { visibility: { $in: ['all_members', 'public'] } };
  const ownProfiles = {
    userId: { $in: ownIds },
    'visibilitySettings.myCommunity.enabled': { $ne: false },
    ...(mySub ? { 'visibilitySettings.mySubCommunity.enabled': { $ne: false } } : {})
  };

  let viewerCommunityName = '';
  if (communityId) {
    const community = await require('../models/Community').findById(communityId).select('name').lean();
    viewerCommunityName = String(community?.name || '').trim();
  }
  const communityNames = viewerCommunityName
    ? [viewerCommunityName, /samaj/i.test(viewerCommunityName) ? viewerCommunityName : `${viewerCommunityName} Samaj`]
    : [];
  const otherCommunityExposure = [
    { 'visibilitySettings.otherCommunities.enabled': { $ne: false } },
    { $or: [
      { 'visibilitySettings.otherCommunities.scope': { $ne: 'selected' } },
      ...(communityNames.length ? [{ 'visibilitySettings.otherCommunities.selectedCommunities': { $in: communityNames } }] : [])
    ] }
  ];

  if (scope === 'my') return { condition: ownProfiles, blocked: false };
  if (scope === 'other') {
    if (!canSeeOtherCommunities && !canSeeSiblings) return { condition: { _id: null }, blocked: true };
    return { condition: { $or: [
      ...(canSeeSiblings ? [{ userId: { $in: visibleSiblingIds } }] : []),
      ...(canSeeOtherCommunities ? [{ userId: { $nin: communityIds }, ...shareable, $and: otherCommunityExposure }] : [])
    ] }, blocked: false };
  }
  if (!canSeeOtherCommunities && !canSeeSiblings) return { condition: ownProfiles, blocked: false };
  return {
    condition: { $or: [
      ownProfiles,
      ...(canSeeSiblings ? [{ userId: { $in: visibleSiblingIds } }] : []),
      ...(canSeeOtherCommunities ? [{ userId: { $nin: communityIds }, ...shareable, $and: otherCommunityExposure }] : [])
    ] },
    blocked: false
  };
};

// Are two users in the same community (by account)?
const sameCommunity = async (viewer, reqCommunityId, ownerUserId) => {
  const mine = viewerCommunityId(viewer, reqCommunityId);
  if (!mine) return false;
  const owner = await User.findById(ownerUserId).select('communityId assignedCommunityIds').lean();
  const theirs = [owner?.communityId, ...(owner?.assignedCommunityIds || [])].map(idOf).filter(Boolean);
  return theirs.includes(mine);
};

module.exports = { viewerCommunityId, communityUserIds, profileScopeCondition, sameCommunity, canSeeSiblingSubCommunities, canAccessSiblingProfile, eligibleSiblingProfileUserIds };
