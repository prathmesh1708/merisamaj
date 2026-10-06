const mongoose = require('mongoose');
const User = require('../models/User');

const ADMIN_ROLES = ['admin', 'super_admin', 'master_admin', 'master'];
const ROLE_KEYS = ['community_head', 'community_sub_head', 'local_head', 'local_sub_head', 'member'];
const NULL_ID = '000000000000000000000000';

const idOf = (v) => (v ? String(v._id || v) : null);
const norm = (s) => (s || '').toString().trim().toLowerCase();

// One role key per user, matching the Samaj hierarchy.
const roleKeyOf = (user) => {
  const role = norm(user?.role);
  if (role === 'head') return user.accountType === 'local_head' ? 'local_head' : 'community_head';
  if (role === 'sub_head') {
    if (user.accountType === 'local_head') return 'local_head';
    if (user.accountType === 'local_sub_head' || user.subHeadType === 'local') return 'local_sub_head';
    return 'community_sub_head';
  }
  return 'member';
};

const userCommunityIds = (user, reqCommunityId) => {
  const ids = new Set();
  [reqCommunityId, user?.communityId, ...(user?.assignedCommunityIds || [])].forEach(c => {
    const i = idOf(c);
    if (i) ids.add(i);
  });
  return [...ids];
};

// Elections created before the structured fields existed use targetAudience.
const legacyEligible = (election, user) => {
  const audience = election.targetAudience || 'ALL_MEMBERS';
  const key = roleKeyOf(user);
  const isHead = key === 'community_head';
  const isLocalHead = key === 'local_head';
  const isSubHead = key === 'community_sub_head' || key === 'local_sub_head' || isLocalHead;
  const userCity = norm(user?.city);
  const docCity = norm(election.targetCity || election.city);
  const cityOk = !docCity || docCity === 'all' || docCity === userCity;

  if (['ALL_MEMBERS', 'ALL', 'SPECIFIC_COMMUNITY'].includes(audience)) return true;
  if (audience === 'COMMUNITY_HEADS') return isHead;
  if (audience === 'LOCAL_HEADS') return isLocalHead;
  if (audience === 'LOCAL_HEADS_BY_LOCATION') return isLocalHead && cityOk;
  if (audience === 'LOCAL_AND_SUB_HEADS') return isHead || isSubHead;
  if (audience === 'LOCAL_AND_SUB_HEADS_BY_LOCATION' || audience === 'LOCAL_SUB_HEADS') return (isHead || isSubHead) && cityOk;
  if (['USERS_BY_LOCATION', 'ALL_LOCAL_USERS', 'COMMUNITY_LOCATION'].includes(audience)) return cityOk;
  if (audience === 'SPECIFIC_USERS') return (election.targetUsers || []).some(u => idOf(u) === idOf(user._id));
  return true;
};

/**
 * Single source of truth for "may this user see/vote in this election?".
 * Used by the member list, the vote endpoint, notifications and voter counts.
 */
const isEligible = (election, user, reqCommunityId) => {
  if (!election || !user) return false;
  if (ADMIN_ROLES.includes(norm(user.role))) return true;

  // 1. Community
  const electionCommunity = idOf(election.communityId);
  const targetCommunities = (election.targetCommunityIds || []).map(idOf);
  const mine = userCommunityIds(user, reqCommunityId);
  if (targetCommunities.length) {
    if (!targetCommunities.some(c => mine.includes(c))) return false;
  } else if (electionCommunity && electionCommunity !== NULL_ID) {
    if (!mine.includes(electionCommunity)) return false;
  }

  // 2. Individually selected members are always in.
  const selected = (election.targetUsers || []).map(idOf);
  if (selected.includes(idOf(user._id))) return true;

  // 3. Structured roles / locations (new elections)
  const roles = election.allowedRoles || [];
  const cities = (election.targetCities || []).map(norm);
  if (roles.length > 0 || cities.length > 0) {
    if (roles.length && !roles.includes(roleKeyOf(user))) return false;
    if (cities.length && !cities.includes(norm(user.city))) return false;
    return true;
  }

  // 4. Legacy audience (older elections)
  return legacyEligible(election, user);
};

/**
 * Lifecycle, computed from the clock so nothing needs a manual status flip:
 * Draft -> Upcoming -> Active -> ResultPending -> ResultDeclared (or Cancelled).
 */
const deriveStatus = (election, now = new Date()) => {
  if (!election) return 'Upcoming';
  if (election.status === 'Cancelled') return 'Cancelled';
  if (election.isPublished === false) return 'Draft';
  const start = new Date(election.startDate);
  const end = new Date(election.endDate);
  const manuallyClosed = election.status === 'Closed';
  if (now < start) return 'Upcoming';
  if (now <= end && !manuallyClosed) return 'Active';
  const resultAt = election.resultDate ? new Date(election.resultDate) : end;
  if (election.resultsPublished || now >= resultAt) return 'ResultDeclared';
  return 'ResultPending';
};

const resultAtOf = (election) => new Date(election.resultDate || election.endDate);

// Every user who is eligible: used for notifications and the eligible-voter count.
const findEligibleUsers = async (election) => {
  const filter = {
    accountStatus: 'active',
    role: { $in: ['user', 'member', 'head', 'sub_head'] }
  };
  const commIds = (election.targetCommunityIds || []).length
    ? election.targetCommunityIds
    : (election.communityId && idOf(election.communityId) !== NULL_ID ? [election.communityId] : []);
  if (commIds.length) {
    const oids = commIds.map(c => new mongoose.Types.ObjectId(idOf(c)));
    filter.$or = [{ communityId: { $in: oids } }, { assignedCommunityIds: { $in: oids } }];
  }
  const users = await User.find(filter)
    .select('_id name role accountType subHeadType city communityId assignedCommunityIds').lean();
  return users.filter(u => isEligible(election, u));
};

module.exports = { ADMIN_ROLES, ROLE_KEYS, roleKeyOf, isEligible, deriveStatus, resultAtOf, findEligibleUsers, idOf };
