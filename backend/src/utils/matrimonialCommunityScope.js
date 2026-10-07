const mongoose = require('mongoose');
const User = require('../models/User');

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

/**
 * Mongo condition on MatrimonialProfile for the viewer.
 * scope: 'all' (default) | 'my' | 'other'
 * Returns { condition, blocked } — blocked=true means "plan does not allow this".
 */
const profileScopeCondition = async ({ user, reqCommunityId, canSeeOtherCommunities, scope = 'all' }) => {
  const ownIds = await communityUserIds(viewerCommunityId(user, reqCommunityId));
  const shareable = { visibility: { $in: ['all_members', 'public'] } };

  if (scope === 'my') return { condition: { userId: { $in: ownIds } }, blocked: false };
  if (scope === 'other') {
    if (!canSeeOtherCommunities) return { condition: { _id: null }, blocked: true };
    return { condition: { userId: { $nin: ownIds }, ...shareable }, blocked: false };
  }
  if (!canSeeOtherCommunities) return { condition: { userId: { $in: ownIds } }, blocked: false };
  return {
    condition: { $or: [{ userId: { $in: ownIds } }, { userId: { $nin: ownIds }, ...shareable }] },
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

module.exports = { viewerCommunityId, communityUserIds, profileScopeCondition, sameCommunity };
