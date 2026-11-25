/**
 * What happens to people and data when an admin permanently deletes a community or
 * a sub-community (decided with the product owner on 2026-11-24):
 *
 * Community deleted
 *  - Members (role 'user') leave it: community, sub-community and family links are
 *    cleared, membership goes back to pending, and every login ends (sessionVersion).
 *    On their next login the app sends them to onboarding to pick a new community.
 *  - Heads / sub-heads / local heads lose the community; if it was their only one the
 *    account is deactivated. Their logins end too.
 *  - The community's content is deleted (posts, stories, events, groups, family trees,
 *    home content, ...). Matrimonial profiles are soft-deleted (hidden everywhere).
 *  - Money and audit records are KEPT (donations, funds, payments, bookings, logs,
 *    safety reports): Indian tax / accounting law and the Child Safety policy need them.
 *
 * Sub-community deleted
 *  - Members of it stay in the community, lose the sub-community, are logged out and
 *    must choose a sub-community again (User.mustChooseSubCommunity).
 *  - Heads / sub-heads assigned to it are deactivated and logged out.
 *  - Its own home content (sub-community and location copies) is deleted.
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const cacheService = require('../utils/cacheService');

const STAFF_ROLES = ['head', 'sub_head'];
const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const model = (name) => mongoose.models[name] || require(`../models/${name}`);

// Collections whose documents belong to one community and are simply deleted with it
const COMMUNITY_OWNED = [
  'AnnouncementChannel', 'CensusUpdateRequest', 'Family', 'FamilyMember', 'Group', 'GroupAuditLog',
  'GroupInvitation', 'GroupJoinRequest', 'GroupReport', 'Highlight', 'Invitation', 'Leadership',
  'NotificationTemplate', 'Obituary', 'Professional', 'SuccessStory', 'UserNotification',
  'Vote', 'Voting', 'DharmashalaAccessPolicy'
];

/** Ends the memberships of a deleted community. Runs inside the delete transaction. */
const endCommunityMemberships = async (communityId, session) => {
  const cid = new mongoose.Types.ObjectId(String(communityId));
  const inCommunity = { $or: [{ communityId: cid }, { assignedCommunityId: cid }, { assignedCommunityIds: cid }] };

  const members = await User.updateMany(
    { ...inCommunity, role: 'user' },
    {
      $set: {
        communityId: null, assignedCommunityId: null, assignedCommunityIds: [],
        community: '', subCommunity: '', familyId: null, familyMembers: [],
        verificationStatus: 'pending', accountStatus: 'pending verification',
        mustChooseSubCommunity: false
      },
      $unset: { membershipReview: '' },
      $inc: { sessionVersion: 1 }
    },
    { session }
  );

  // Staff: drop this community; deactivate those left with no community at all
  const staff = await User.find({ ...inCommunity, role: { $in: STAFF_ROLES } })
    .select('communityId assignedCommunityIds').session(session).lean();
  let staffDeactivated = 0;
  for (const s of staff) {
    const remaining = (s.assignedCommunityIds || []).filter(id => String(id) !== String(cid));
    const keepsCommunity = s.communityId && String(s.communityId) !== String(cid);
    const nextCommunity = keepsCommunity ? s.communityId : (remaining[0] || null);
    const update = {
      $set: { assignedCommunityIds: remaining, communityId: nextCommunity, assignedCommunityId: null },
      $inc: { sessionVersion: 1 }
    };
    if (!nextCommunity) { update.$set.accountStatus = 'inactive'; staffDeactivated += 1; }
    await User.updateOne({ _id: s._id }, update, { session });
  }
  return { membersRemoved: members.modifiedCount || 0, staffUpdated: staff.length, staffDeactivated };
};

/** Deletes a deleted community's content. Runs after the delete is committed. */
const deleteCommunityContent = async (communityId) => {
  const cid = new mongoose.Types.ObjectId(String(communityId));
  const counts = {};
  const run = async (label, fn) => {
    try { counts[label] = await fn(); } catch (err) { counts[label] = `error: ${err.message}`; console.error(`[communityDeletion] ${label}:`, err.message); }
  };

  // Posts and stories with everything hanging off them
  await run('posts', async () => {
    const ids = await model('Post').distinct('_id', { communityId: cid });
    if (ids.length) {
      await Promise.all(['Comment', 'PostLike', 'PostShare', 'PostView', 'SavedPost'].map(m => model(m).deleteMany({ postId: { $in: ids } })));
    }
    return (await model('Post').deleteMany({ _id: { $in: ids } })).deletedCount;
  });
  await run('stories', async () => {
    const ids = await model('Story').distinct('_id', { communityId: cid });
    if (ids.length) await Promise.all(['StoryLike', 'StoryView'].map(m => model(m).deleteMany({ storyId: { $in: ids } })));
    return (await model('Story').deleteMany({ _id: { $in: ids } })).deletedCount;
  });
  await run('events', async () => {
    const ids = await model('Event').distinct('_id', { communityId: cid });
    if (ids.length) await model('EventResponse').deleteMany({ eventId: { $in: ids } });
    return (await model('Event').deleteMany({ _id: { $in: ids } })).deletedCount;
  });
  // Matrimonial: hidden everywhere (interests / chats point at the profile)
  await run('matrimonialProfiles', async () => (await model('MatrimonialProfile').updateMany(
    { communityId: cid, isDeleted: { $ne: true } },
    { $set: { isDeleted: true, deletedAt: new Date() } }
  )).modifiedCount);
  // Member home content at every level
  await run('homeContent', async () => {
    const AppContent = require('../models/AppContent');
    const r = await Promise.all([
      AppContent.deleteMany({ communityId: cid }),
      AppContent.SubCommunityAppContent.deleteMany({ communityId: cid }),
      AppContent.LocationAppContent.deleteMany({ communityId: cid })
    ]);
    return r.reduce((n, x) => n + (x.deletedCount || 0), 0);
  });
  for (const name of COMMUNITY_OWNED) {
    await run(name, async () => (await model(name).deleteMany({ communityId: cid })).deletedCount);
  }

  cacheService.invalidate('app_content_');
  cacheService.invalidate('auth_user_');
  return counts;
};

/** Everything that follows from deleting one sub-community. */
const deleteSubCommunityData = async (communityId, subName) => {
  const cid = new mongoose.Types.ObjectId(String(communityId));
  const subMatch = new RegExp(`^\\s*${escapeRe(String(subName).trim())}\\s*$`, 'i');

  // Ask members to pick again only if there is still something to pick (with no
  // sub-communities left they would be sent to onboarding with nothing to choose)
  const community = await model('Community').findById(cid).select('subCommunities.isActive').lean();
  const subsLeft = (community?.subCommunities || []).some(s => s.isActive !== false);
  const members = await User.updateMany(
    { communityId: cid, role: 'user', subCommunity: subMatch },
    { $set: { subCommunity: '', mustChooseSubCommunity: subsLeft }, $inc: { sessionVersion: 1 } }
  );
  const staff = await User.updateMany(
    { $or: [{ communityId: cid }, { assignedCommunityIds: cid }], role: { $in: STAFF_ROLES }, subCommunity: subMatch },
    { $set: { accountStatus: 'inactive' }, $inc: { sessionVersion: 1 } }
  );

  const AppContent = require('../models/AppContent');
  const [subContent, locationContent] = await Promise.all([
    AppContent.SubCommunityAppContent.deleteMany({ communityId: cid, subCommunity: subMatch }),
    AppContent.LocationAppContent.deleteMany({ communityId: cid, subCommunity: subMatch })
  ]);

  cacheService.invalidate('app_content_');
  cacheService.invalidate('auth_user_');
  return {
    membersLoggedOut: members.modifiedCount || 0,
    staffDeactivated: staff.modifiedCount || 0,
    homeContentDeleted: (subContent.deletedCount || 0) + (locationContent.deletedCount || 0)
  };
};

/** Read-only counts for the admin's confirmation dialog. */
const deletionImpact = async (communityId, subName = '') => {
  const cid = new mongoose.Types.ObjectId(String(communityId));
  if (subName) {
    const subMatch = new RegExp(`^\\s*${escapeRe(String(subName).trim())}\\s*$`, 'i');
    const [members, staff] = await Promise.all([
      User.countDocuments({ communityId: cid, role: 'user', subCommunity: subMatch }),
      User.countDocuments({ $or: [{ communityId: cid }, { assignedCommunityIds: cid }], role: { $in: STAFF_ROLES }, subCommunity: subMatch })
    ]);
    return { members, staff };
  }
  const inCommunity = { $or: [{ communityId: cid }, { assignedCommunityId: cid }, { assignedCommunityIds: cid }] };
  const [members, staff, posts, matrimonialProfiles] = await Promise.all([
    User.countDocuments({ ...inCommunity, role: 'user' }),
    User.countDocuments({ ...inCommunity, role: { $in: STAFF_ROLES } }),
    model('Post').countDocuments({ communityId: cid }),
    model('MatrimonialProfile').countDocuments({ communityId: cid, isDeleted: { $ne: true } })
  ]);
  return { members, staff, posts, matrimonialProfiles };
};

module.exports = { endCommunityMemberships, deleteCommunityContent, deleteSubCommunityData, deletionImpact };
