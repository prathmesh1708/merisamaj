/**
 * socialVisibilityService.js
 * Who can see whom on Social (posts, stories, search, profiles).
 *
 * Rules:
 *  1. Only MARRIED members are visible on Social to other people. Anyone marked
 *     Single — or who never set a marital status — is hidden from everyone else.
 *     Community leaders (head / sub-head / admin) are always visible, so official
 *     posts and announcements still reach members.
 *  2. A PRIVATE account's posts and stories are visible only to followers whose
 *     follow request it accepted. A PUBLIC account's content is visible to everyone.
 *  3. People always see their own content. Admins see everything (moderation).
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const Follower = require('../models/Follower');
const { adminRoles } = require('../utils/queryScopeHelper');

// Roles that stay visible regardless of marital status
const ALWAYS_VISIBLE_ROLES = ['head', 'sub_head', 'admin_sub_head', ...adminRoles];

const MARRIED = /^married$/i;

/** Mongo filter matching users who are hidden on Social because they are not married. */
const notMarriedFilter = {
  role: { $nin: ALWAYS_VISIBLE_ROLES },
  maritalStatus: { $not: MARRIED } // also matches users with no status saved
};

/** True when this user must not be shown to other people on Social. */
const isHiddenOnSocial = (user) => {
  if (!user) return true;
  if (ALWAYS_VISIBLE_ROLES.includes(user.role)) return false;
  return !MARRIED.test(user.maritalStatus || '');
};

const isAdminViewer = (viewer) => adminRoles.includes((viewer?.role || '').toLowerCase());

/** True when `viewerId` has an accepted follow on `targetId`. */
const isAcceptedFollower = async (viewerId, targetId) => {
  if (!viewerId || !targetId) return false;
  const rel = await Follower.findOne({ followerId: viewerId, followingId: targetId, status: 'accepted' })
    .select('_id').lean();
  return Boolean(rel);
};

/**
 * Can `viewer` see `target`'s posts / stories?
 * `target` needs at least { _id, role, maritalStatus, isPrivate }.
 */
const canViewContentOf = async (viewer, target) => {
  if (!target) return false;
  if (String(viewer?._id) === String(target._id)) return true;
  if (isAdminViewer(viewer)) return true;
  if (isHiddenOnSocial(target)) return false;
  if (target.isPrivate === true) return isAcceptedFollower(viewer?._id, target._id);
  return true;
};

/**
 * IDs of authors whose content `viewer` must not see in feeds, stories and search:
 * non-married members, plus private accounts the viewer doesn't follow.
 * Returns [] for admins. The viewer's own id is never included.
 */
const getHiddenAuthorIds = async (viewer) => {
  if (!viewer || isAdminViewer(viewer)) return [];

  const [notMarried, privateUsers, following] = await Promise.all([
    User.find(notMarriedFilter).select('_id').lean(),
    User.find({ isPrivate: true }).select('_id').lean(),
    Follower.find({ followerId: viewer._id, status: 'accepted' }).select('followingId').lean()
  ]);

  const followed = new Set(following.map(f => String(f.followingId)));
  const hidden = new Set(notMarried.map(u => String(u._id)));
  privateUsers.forEach(u => {
    if (!followed.has(String(u._id))) hidden.add(String(u._id));
  });
  hidden.delete(String(viewer._id));

  return [...hidden].map(id => new mongoose.Types.ObjectId(id));
};

module.exports = {
  ALWAYS_VISIBLE_ROLES,
  notMarriedFilter,
  isHiddenOnSocial,
  canViewContentOf,
  getHiddenAuthorIds
};
