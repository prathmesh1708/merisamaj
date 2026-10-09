/**
 * Head-panel access to the Location → Group matrix (Local Community page).
 *
 * The admin versions of these endpoints live under /admin/communities/:id/..., which
 * Head / Local Head accounts cannot reach (the /admin mount only admits admins), so the
 * head panel used to fall back to placeholder data. These wrappers reuse the same
 * controller logic but pin every call to the caller's OWN community, and for a
 * Local Head additionally to their own city — and, for edits, their own group.
 */
const mongoose = require('mongoose');
const User = require('../../models/User');
const Community = require('../../models/Community');
const communityController = require('../admin/communityController');

const idOf = (v) => (v && v._id ? v._id : v);
const sameText = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

const resolveCommunityId = (req) => {
  const raw = req.communityId || idOf(req.user?.communityId) || idOf(req.user?.assignedCommunityIds?.[0]);
  return raw && mongoose.Types.ObjectId.isValid(raw) ? String(raw) : null;
};

// community = Community Head (or admin); local = Local Head; local_sub = Local Sub-Head (read-only)
const levelOf = (user) => {
  const role = (user.role || '').toLowerCase();
  if (['admin', 'super_admin', 'master_admin'].includes(role) || role === 'head') return 'community';
  if (user.accountType === 'local_head') return 'local';
  if (user.accountType === 'local_sub_head' || user.subHeadType === 'local') return 'local_sub';
  return 'community_sub';
};

const myGroupOf = (user) => (user.group && user.group.trim()) || 'Group 1';

// Run an admin controller with the caller's community injected and its JSON response transformed
const runScoped = (handler, req, res, transform) => {
  const communityId = resolveCommunityId(req);
  if (!communityId) {
    return res.status(400).json({ status: 'error', message: 'No community is assigned to your account.' });
  }
  Object.assign(req.params, { id: communityId });
  if (transform) {
    const originalJson = res.json.bind(res);
    res.json = (body) => originalJson(res.statusCode < 400 && body ? transform(body) : body);
  }
  return handler(req, res);
};

// GET /api/v1/head/local-community/structure
exports.getStructure = async (req, res) => {
  try {
    const communityId = resolveCommunityId(req);
    if (!communityId) {
      return res.status(400).json({ status: 'error', message: 'No community is assigned to your account.' });
    }
    const community = await Community.findById(communityId).select('name createdAt subCommunities isActive').lean();
    if (!community) return res.status(404).json({ status: 'error', message: 'Community not found.' });

    res.status(200).json({
      success: true,
      data: {
        community: { _id: community._id, name: community.name, createdAt: community.createdAt, isActive: community.isActive !== false },
        subCommunities: (community.subCommunities || []).map(s => ({ _id: s._id, name: s.name, isActive: s.isActive !== false })),
        viewer: {
          id: req.user._id,
          level: levelOf(req.user),
          city: req.user.city || '',
          group: myGroupOf(req.user),
          subCommunity: req.user.subCommunity || ''
        }
      }
    });
  } catch (error) {
    console.error('head getStructure error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// GET /api/v1/head/local-community/sub-communities/:subName/locations
exports.getLocations = (req, res) => {
  const level = levelOf(req.user);
  if (level === 'community_sub') {
    return res.status(403).json({ status: 'error', message: 'Only Community Heads and Local Heads can view the location matrix.' });
  }
  if (level === 'community') return runScoped(communityController.getSubCommunityLocationBreakdown, req, res);

  // Local Head / Local Sub-Head: only their own city; login passwords only for people they manage
  const myCity = req.user.city || '';
  const myId = String(req.user._id);
  const isLocalHead = level === 'local';
  const maskHead = (h) => (String(h.id) === myId ? h : { ...h, plainPassword: undefined });
  const maskSub = (h) => (isLocalHead ? h : { ...h, plainPassword: undefined });

  return runScoped(communityController.getSubCommunityLocationBreakdown, req, res, (body) => {
    const data = body.data || {};
    const locations = (data.locations || [])
      .filter(l => sameText(l.name, myCity))
      .map(l => ({
        ...l,
        localHeadsList: (l.localHeadsList || []).map(maskHead),
        groups: (l.groups || []).map(g => ({
          ...g,
          isMine: sameText(g.name, myGroupOf(req.user)),
          localHeadsList: (g.localHeadsList || []).map(maskHead),
          subHeadsList: (g.subHeadsList || []).map(maskSub)
        }))
      }));
    const allLocalHeads = (data.allLocalHeads || []).filter(h => sameText(h.city, myCity)).map(maskHead);
    const allSubHeads = (data.allSubHeads || []).filter(h => sameText(h.city, myCity)).map(maskSub);
    return {
      ...body,
      data: {
        ...data,
        locations,
        allLocalHeads,
        allSubHeads,
        stats: {
          ...(data.stats || {}),
          activeLocationsCount: locations.filter(l => l.isActive).length,
          totalLocalCommunityHeadsCount: allLocalHeads.length,
          totalLocalSubCommunityHeadsCount: allSubHeads.length,
          totalUsersCount: locations.reduce((sum, l) => sum + (l.userCount || 0), 0)
        }
      }
    };
  });
};

// POST /api/v1/head/local-community/sub-communities/:subName/assign-head
exports.assignHead = async (req, res) => {
  try {
    const level = levelOf(req.user);
    const communityId = resolveCommunityId(req);
    if (!['community', 'local'].includes(level)) {
      return res.status(403).json({ status: 'error', message: 'You are not allowed to appoint heads.' });
    }

    if (level === 'local') {
      // A Local Head can only appoint Local Sub-Heads into their own city & group
      req.body.accountType = 'local_sub_head';
      req.body.city = req.user.city || req.body.city;
      req.body.group = myGroupOf(req.user);
    } else if (!['local_head', 'local_sub_head'].includes(req.body.accountType)) {
      req.body.accountType = 'local_head';
    }

    // Promoting an existing user: they must belong to this community and must not already be a Head
    if (req.body.userId) {
      if (!mongoose.Types.ObjectId.isValid(req.body.userId)) {
        return res.status(400).json({ status: 'error', message: 'Invalid user selected.' });
      }
      const target = await User.findById(req.body.userId).select('communityId assignedCommunityIds role accountType').lean();
      const inCommunity = target && [idOf(target.communityId), ...(target.assignedCommunityIds || []).map(idOf)]
        .some(c => c && String(c) === communityId);
      if (!inCommunity) {
        return res.status(403).json({ status: 'error', message: 'This member does not belong to your community.' });
      }
      if (target.role === 'head' || (level === 'local' && target.accountType === 'local_head')) {
        return res.status(403).json({ status: 'error', message: 'This member already holds a higher role.' });
      }
    }

    return runScoped(communityController.assignLocalHeadToLocationGroup, req, res);
  } catch (error) {
    console.error('head assignHead error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// PATCH /api/v1/head/local-community/groups/:groupName  { city, newName?, isVisibleOnHome? }
exports.updateGroup = (req, res) => {
  const level = levelOf(req.user);
  const groupName = decodeURIComponent(req.params.groupName || '').trim();
  const city = (req.body.city || '').trim();

  if (!['community', 'local'].includes(level)) {
    return res.status(403).json({ status: 'error', message: 'You are not allowed to edit groups.' });
  }
  if (!city) {
    return res.status(400).json({ status: 'error', message: 'City is required to identify the group.' });
  }
  if (level === 'local' && (!sameText(city, req.user.city) || !sameText(groupName, myGroupOf(req.user)))) {
    return res.status(403).json({ status: 'error', message: 'You can only edit your own group.' });
  }
  if (req.body.newName !== undefined) {
    const newName = String(req.body.newName).trim();
    if (!newName || newName.length > 40) {
      return res.status(400).json({ status: 'error', message: 'Group name must be 1–40 characters.' });
    }
    req.body.newName = newName;
  }

  // Local Head groups are always matched by city + Local Head/Local Sub-Head accounts
  req.body.scope = 'local_head';
  req.body.city = city;
  req.params.groupName = encodeURIComponent(groupName);
  return runScoped(communityController.updateGroupMeta, req, res);
};

