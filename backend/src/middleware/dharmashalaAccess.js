const DharmashalaAccessPolicy = require('../models/DharmashalaAccessPolicy');
const { adminRoles } = require('../utils/queryScopeHelper');

const ACTIONS = ['createProperty', 'manualBooking'];
const ROLE_KEYS = ['community_head', 'community_sub_head', 'local_head', 'local_sub_head'];

// Maps a head-panel user to one of the four policy role keys.
const roleKeyFor = (user) => {
  const role = (user?.role || '').toLowerCase();
  if (role === 'head') return user.accountType === 'local_head' ? 'local_head' : 'community_head';
  if (role === 'sub_head') {
    if (user.accountType === 'local_head') return 'local_head';
    if (user.accountType === 'local_sub_head' || user.subHeadType === 'local') return 'local_sub_head';
    return 'community_sub_head';
  }
  return null;
};

// Effective access for a user: community-wide policy, overridden per action by
// the user's own city policy where that policy sets a value.
const resolveAccess = async (user, reqCommunityId) => {
  const access = { createProperty: false, manualBooking: false };
  if (!user) return access;
  const role = (user.role || '').toLowerCase();
  if (adminRoles.includes(role)) return { createProperty: true, manualBooking: true };

  const key = roleKeyFor(user);
  const rawCommunity = reqCommunityId || user.communityId?._id || user.communityId
    || user.assignedCommunityIds?.[0]?._id || user.assignedCommunityIds?.[0];
  if (!key || !rawCommunity) return access;

  const policies = await DharmashalaAccessPolicy.find({ communityId: rawCommunity }).lean();
  const userCity = (user.city || '').trim().toLowerCase();
  const communityWide = policies.find(p => !p.city);
  const cityPolicy = userCity ? policies.find(p => p.city && p.city.trim().toLowerCase() === userCity) : null;
  ACTIONS.forEach(a => {
    const fromCity = cityPolicy?.roles?.[key]?.[a];
    const fromCommunity = communityWide?.roles?.[key]?.[a];
    access[a] = typeof fromCity === 'boolean' ? fromCity : !!fromCommunity;
  });
  return access;
};

const requireDharmashalaAccess = (action) => async (req, res, next) => {
  try {
    const access = await resolveAccess(req.user, req.communityId);
    if (access[action]) return next();
    return res.status(403).json({
      status: 'error',
      message: 'Access denied. The Admin has not given your role permission for this Dharmashala action.'
    });
  } catch (error) {
    console.error('requireDharmashalaAccess error:', error);
    res.status(500).json({ status: 'error', message: 'Internal authorization error' });
  }
};

// View access: the normal canViewDharmashala permission, OR any Admin grant
// (a head allowed to create properties / make manual bookings must be able to
// see the properties, rooms and bookings they manage).
const canViewDharmashala = (req, res, next) => {
  const { authorizeModule } = require('./authorizeModule');
  const viaPermission = authorizeModule('canViewDharmashala');
  const denied = { status: (code) => ({ json: async () => {
    try {
      const access = await resolveAccess(req.user, req.communityId);
      if (access.createProperty || access.manualBooking) return next();
    } catch (e) { /* fall through to the original denial */ }
    return res.status(code).json({ status: 'error', message: "Access denied. You do not have permission for 'canViewDharmashala'." });
  } }) };
  return viaPermission(req, denied, next);
};

module.exports = { canViewDharmashala, requireDharmashalaAccess, resolveAccess, ACTIONS, ROLE_KEYS };
