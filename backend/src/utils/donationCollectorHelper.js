/**
 * donationCollectorHelper.js
 * Resolves which Heads/Sub-Heads are eligible to collect a CASH donation made
 * by a given donor, and checks whether a specific requesting user is one of them.
 *
 * Eligibility has TWO layers:
 *   1. CAMPAIGN-LEVEL: The campaign creator always has access. They may also
 *      explicitly grant access to specific sub-heads (stored in campaign.cashCollectors).
 *   2. HIERARCHY-LEVEL (legacy, for non-campaign / general cash pledges): Being
 *      somewhere in the donor's own hierarchy AND holding
 *      headPermissions.canCollectCashDonations.
 *
 * Admin bypasses this entirely via authorizeModule, so this helper is never
 * consulted for an admin requester.
 */
const User = require('../models/User');

// Every Head/Sub-Head user doc that sits in `donor`'s hierarchy chain —
// regardless of whether they hold the cash-collection permission (that's
// checked separately so callers can show "in your area but not permitted").
const getHierarchyChain = async (donor) => {
  if (!donor || !donor.communityId) return [];

  const communityHeads = await User.find({
    communityId: donor.communityId,
    role: 'head',
    accountStatus: { $ne: 'deleted' }
  }).select('_id name designation role accountType headPermissions').lean();

  const communityHeadIds = communityHeads.map(h => h._id);

  const communitySubHeads = communityHeadIds.length
    ? await User.find({
        accountType: 'community_sub_head',
        parentHeadId: { $in: communityHeadIds },
        accountStatus: { $ne: 'deleted' }
      }).select('_id name designation role accountType headPermissions').lean()
    : [];

  const localHeadQuery = {
    communityId: donor.communityId,
    accountType: 'local_head',
    accountStatus: { $ne: 'deleted' }
  };
  if (donor.city) localHeadQuery.city = donor.city;

  const localHeads = await User.find(localHeadQuery)
    .select('_id name designation role accountType headPermissions').lean();

  const localHeadIds = localHeads.map(h => h._id);

  const localSubHeads = localHeadIds.length
    ? await User.find({
        accountType: 'local_sub_head',
        parentHeadId: { $in: localHeadIds },
        accountStatus: { $ne: 'deleted' }
      }).select('_id name designation role accountType headPermissions').lean()
    : [];

  return [...communityHeads, ...communitySubHeads, ...localHeads, ...localSubHeads];
};

// The subset of the chain that actually holds the cash-collection permission.
const getEligibleCollectors = async (donor) => {
  const chain = await getHierarchyChain(donor);
  return chain.filter(u => u.headPermissions?.canCollectCashDonations === true);
};

// Is `requestingUser` (plain object with _id/role/accountType/headPermissions)
// allowed to collect cash for a donation made by `donor`?
// Optionally pass `campaign` (the campaign doc) for campaign-level access check.
const isEligibleCollector = async (requestingUser, donor, campaign = null) => {
  if (!requestingUser || !donor) return false;

  // ─── Campaign-level access (creator or explicitly granted collector) ──────
  if (campaign) {
    const requesterId = requestingUser._id.toString();

    // Campaign creator always has access
    if (campaign.creatorCanCollect !== false && campaign.createdBy) {
      if (campaign.createdBy.toString() === requesterId) return true;
    }

    // Explicitly granted sub-heads
    if (Array.isArray(campaign.cashCollectors)) {
      const granted = campaign.cashCollectors.some(id => id.toString() === requesterId);
      if (granted) return true;
    }
  }

  // ─── Legacy: hierarchy + headPermissions.canCollectCashDonations ──────────
  if (requestingUser.headPermissions?.canCollectCashDonations !== true) return false;
  const chain = await getHierarchyChain(donor);
  return chain.some(u => u._id.toString() === requestingUser._id.toString());
};

const describeRole = (u) => {
  if (u.designation && u.designation.toLowerCase() !== 'member') return u.designation;
  if (u.role === 'head') return 'Community Head';
  if (u.accountType === 'community_sub_head') return 'Sub-Community Head';
  if (u.accountType === 'local_head') return 'Local Head';
  if (u.accountType === 'local_sub_head') return 'Local Sub-Head';
  return 'Head';
};

module.exports = { getHierarchyChain, getEligibleCollectors, isEligibleCollector, describeRole };
