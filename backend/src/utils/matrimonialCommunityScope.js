const mongoose = require('mongoose');
const User = require('../models/User');
const Community = require('../models/Community');

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
 *     plan (viewAllSubCommunityProfiles) or the sub-community's CommunityPlan.
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
  const communityId = viewerCommunityId(viewer, reqCommunityId);
  const mySub = String(viewer?.subCommunity || '').trim().toLowerCase();
  if (!communityId || !mySub) return false;
  const community = await Community.findById(communityId).select('subCommunities').lean();
  const sub = (community?.subCommunities || []).find(s => String(s.name || '').trim().toLowerCase() === mySub);
  if (!sub?.planId) return false;
  const plan = await require('../models/CommunityPlan').findById(sub.planId).select('features.crossSubCommunityVisibility').lean();
  return !!plan?.features?.crossSubCommunityVisibility;
};

/**
 * Mongo condition on MatrimonialProfile for the viewer.
 * scope: 'all' (default) | 'my' | 'other'
 * Returns { condition, blocked } — blocked=true means "plan does not allow this".
 */
const profileScopeCondition = async ({ user, reqCommunityId, canSeeOtherCommunities, canSeeSiblingSubCommunities: planSiblings = false, scope = 'all' }) => {
  const communityId = viewerCommunityId(user, reqCommunityId);
  const community = communityId ? await Community.findById(communityId).select('subCommunities').lean() : null;
  const mySub = String(user?.subCommunity || '').trim().toLowerCase();
  const subDoc = (community?.subCommunities || []).find(s => String(s.name || '').trim().toLowerCase() === mySub);
  const canSeeSiblings = !!canSeeOtherCommunities || !!planSiblings || !!(subDoc?.planId && (await require('../models/CommunityPlan').findById(subDoc.planId).select('features.crossSubCommunityVisibility').lean())?.features?.crossSubCommunityVisibility);
  let ownIds = await communityUserIds(communityId);
  if (!canSeeSiblings && mySub) {
    const escapedSub = mySub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    ownIds = await User.find({ _id: { $in: ownIds }, subCommunity: new RegExp('^' + escapedSub + '$', 'i') }).distinct('_id');
  }
  const communityIds = await communityUserIds(communityId);
  const otherCommunityIds = communityIds.filter(id => !ownIds.some(own => String(own) === String(id)));
  const shareable = { visibility: { $in: ['all_members', 'public'] } };

  if (scope === 'my') return { condition: { userId: { $in: ownIds } }, blocked: false };
  if (scope === 'other') {
    if (!canSeeOtherCommunities && !canSeeSiblings) return { condition: { _id: null }, blocked: true };
    return { condition: { $or: [
      ...(canSeeSiblings ? [{ userId: { $in: otherCommunityIds } }] : []),
      ...(canSeeOtherCommunities ? [{ userId: { $nin: communityIds }, ...shareable }] : [])
    ] }, blocked: false };
  }
  if (!canSeeOtherCommunities && !canSeeSiblings) return { condition: { userId: { $in: ownIds } }, blocked: false };
  return {
    condition: { $or: [
      { userId: { $in: ownIds } },
      ...(canSeeSiblings ? [{ userId: { $in: otherCommunityIds } }] : []),
      ...(canSeeOtherCommunities ? [{ userId: { $nin: communityIds }, ...shareable }] : [])
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

module.exports = { viewerCommunityId, communityUserIds, profileScopeCondition, sameCommunity, canSeeSiblingSubCommunities };
