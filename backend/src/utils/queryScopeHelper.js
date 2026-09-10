const mongoose = require('mongoose');

/**
 * Centralized Two-Level Data Scope Filter Builder
 * 
 * CORE RULES:
 * 1. CommunityId is the MANDATORY PRIMARY scope for 'member' and 'head' roles.
 *    Derived strictly from req.communityId (or req.user.communityId).
 *    Client requests CANNOT override or bypass this scope.
 * 2. City is a SECONDARY OPTIONAL filter applied strictly WITHIN the same community.
 *    City filter will NEVER pull records across community boundaries.
 * 3. Admin role bypasses mandatory community restriction (global view by default),
 *    but can pass optional req.query.communityId or req.query.city to filter.
 * 
 * @param {Object} req - Express request object (containing req.user & req.communityId)
 * @param {Object} baseFilter - Existing Mongoose filter object to modify/extend
 * @param {Object} options - Custom options:
 *   @param {string} options.cityField - Field name for city in schema ('city' or 'cityId'). Default: 'city'
 *   @param {string} options.overrideCity - Custom city string if passed outside req.query.city
 *   @param {boolean} options.forceCommunityId - Force community restriction even if role is admin
 * @returns {Object} Updated Mongoose query filter object
 */
const adminRoles = ['admin', 'super_admin', 'master_admin', 'master', 'head_admin'];

const applyScopeFilter = (req, baseFilter = {}, options = {}) => {
  const filter = { ...baseFilter };
  const user = req?.user;
  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = adminRoles.includes(userRole);

  const cityField = options.cityField || 'city';

  if (isAdmin && !options.forceCommunityId) {
    // Admin Role: Global access by default
    // Optional filters via query parameters
    if (req?.query?.communityId && mongoose.Types.ObjectId.isValid(req.query.communityId)) {
      filter.communityId = new mongoose.Types.ObjectId(req.query.communityId);
    }
    if (req?.query?.city && req.query.city !== 'all' && req.query.city !== 'All') {
      filter[cityField] = req.query.city.trim();
    }
    return filter;
  }

  // Member & Head Roles: MANDATORY Level 1 Community Scope
  const rawCommunityId = req?.communityId || (user?.communityId?._id || user?.communityId);
  const targetCommId = (rawCommunityId && mongoose.Types.ObjectId.isValid(rawCommunityId))
    ? new mongoose.Types.ObjectId(rawCommunityId.toString())
    : null;

  const commIds = (Array.isArray(user?.assignedCommunityIds) && user.assignedCommunityIds.length > 0)
    ? user.assignedCommunityIds.map(c => new mongoose.Types.ObjectId(c._id || c)).filter(id => mongoose.Types.ObjectId.isValid(id))
    : (targetCommId ? [targetCommId] : []);

  if (options.includeGlobalScope && targetCommId) {
    const globalScopeCondition = [
      { scope: 'GLOBAL' },
      { scope: 'COMMUNITY', communityId: targetCommId }
    ];
    if (filter.$or) {
      const existingOr = filter.$or;
      delete filter.$or;
      filter.$and = filter.$and || [];
      filter.$and.push({ $or: existingOr }, { $or: globalScopeCondition });
    } else if (filter.$and) {
      filter.$and.push({ $or: globalScopeCondition });
    } else {
      filter.$or = globalScopeCondition;
    }
  } else if (options.includeCampaignTargeting && targetCommId) {
    const campaignTargetingCondition = [
      { communityId: targetCommId },
      { isGlobalCampaign: true },
      { visibility: { $in: ['All Members', 'All Communities', 'Global', 'All Locations'] } },
      { targetedCommunities: targetCommId },
      { communityId: null },
      { communityId: { $exists: false } }
    ];
    if (filter.$or) {
      const existingOr = filter.$or;
      delete filter.$or;
      filter.$and = filter.$and || [];
      filter.$and.push({ $or: existingOr }, { $or: campaignTargetingCondition });
    } else if (filter.$and) {
      filter.$and.push({ $or: campaignTargetingCondition });
    } else {
      filter.$or = campaignTargetingCondition;
    }
  } else if (commIds.length > 0) {
    const communityCondition = [
      { communityId: { $in: commIds } },
      { assignedCommunityIds: { $in: commIds } }
    ];

    if (filter.$or) {
      const existingOr = filter.$or;
      delete filter.$or;
      filter.$and = filter.$and || [];
      filter.$and.push({ $or: existingOr }, { $or: communityCondition });
    } else if (filter.$and) {
      filter.$and.push({ $or: communityCondition });
    } else {
      filter.$or = communityCondition;
    }
  }

  // OPTIONAL Level 2 City Scope (strict AND condition WITHIN community)
  // For Local Head (role === 'sub_head' or accountType === 'local_head'), automatically scope to their assigned city
  const isLocalHead = (userRole === 'sub_head' || user?.accountType === 'local_head') && user?.city;
  const activeCity = options.overrideCity || req?.query?.city || (isLocalHead ? user.city : null);
  if (activeCity && typeof activeCity === 'string' && activeCity !== 'all' && activeCity !== 'All') {
    filter[cityField] = new RegExp(`^${activeCity.trim()}$`, 'i');
  }

  return filter;
};

/**
 * Inherit Community & City Payload Utility for Document Creation
 * Automatically attaches server-verified communityId and user's city onto payload.
 * Prevents client payload spoofing.
 * 
 * @param {Object} req - Express request object
 * @param {Object} payload - Body/Data object for document creation
 * @param {Object} options - Custom options:
 *   @param {boolean} options.includeCity - Whether to automatically attach user's city (default: true)
 * @returns {Object} Payload with attached tenant properties
 */
const inheritTenantPayload = (req, payload = {}, options = {}) => {
  const includeCity = options.includeCity !== false;
  const user = req?.user;
  const rawCommunityId = req?.communityId || (user?.communityId?._id || user?.communityId);

  const updatedPayload = { ...payload };

  if (rawCommunityId) {
    updatedPayload.communityId = rawCommunityId;
  }

  if (includeCity && user?.city && !updatedPayload.city) {
    updatedPayload.city = user.city;
  }

  return updatedPayload;
};

module.exports = {
  applyScopeFilter,
  inheritTenantPayload,
  adminRoles
};
