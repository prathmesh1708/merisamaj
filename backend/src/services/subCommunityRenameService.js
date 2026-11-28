/**
 * Renaming a sub-community must rename it everywhere it is stored as text.
 *
 * Accounts (members, Heads, Local Heads) and the per-sub-community / per-location app
 * content store the sub-community by NAME. Renaming only the entry in
 * Community.subCommunities left every account on the old name, so the renamed
 * sub-community looked new and empty (0 Heads, 1 user) while the old name lived on.
 *
 * Matching is case-insensitive and ignores surrounding spaces, within one community.
 */
const User = require('../models/User');
const { SubCommunityAppContent, LocationAppContent } = require('../models/AppContent');

const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nameMatcher = (name) => new RegExp(`^\\s*${esc(String(name).trim())}\\s*$`, 'i');

/**
 * @param {ObjectId|string} communityId
 * @param {string} oldName
 * @param {string} newName
 * @param {{ dryRun?: boolean }} [options] dryRun = count only, change nothing
 * @returns {Promise<{ users: number, subContent: number, locationContent: number }>}
 */
const cascadeSubCommunityRename = async (communityId, oldName, newName, { dryRun = false } = {}) => {
  const from = String(oldName || '').trim();
  const to = String(newName || '').trim();
  const result = { users: 0, subContent: 0, locationContent: 0 };
  if (!communityId || !from || !to || from === to) return result;
  const match = nameMatcher(from);

  // 1. Accounts in this community: members, Community Heads, Local Heads, Sub-Heads
  const userFilter = {
    $or: [{ communityId }, { assignedCommunityIds: communityId }],
    subCommunity: match
  };
  if (dryRun) result.users = await User.countDocuments(userFilter);
  else result.users = (await User.updateMany(userFilter, { $set: { subCommunity: to } })).modifiedCount || 0;

  // 2. App content saved for this sub-community (unique per community + name)
  const subDocs = SubCommunityAppContent ? await SubCommunityAppContent.find({ communityId, subCommunity: match }).select('_id').lean() : [];
  result.subContent = subDocs.length;
  if (!dryRun && subDocs.length) {
    const clash = await SubCommunityAppContent.exists({ communityId, subCommunity: nameMatcher(to) });
    if (!clash) await SubCommunityAppContent.updateMany({ _id: { $in: subDocs.map(d => d._id) } }, { $set: { subCommunity: to } });
    else result.subContent = 0; // content already exists under the new name: keep it
  }

  // 3. Location content under this sub-community (unique per community + name + city)
  const locDocs = LocationAppContent ? await LocationAppContent.find({ communityId, subCommunity: match }).select('_id cityKey').lean() : [];
  if (dryRun) {
    result.locationContent = locDocs.length;
  } else {
    for (const d of locDocs) {
      const clash = await LocationAppContent.exists({ communityId, subCommunity: nameMatcher(to), cityKey: d.cityKey });
      if (clash) continue;
      await LocationAppContent.updateOne({ _id: d._id }, { $set: { subCommunity: to } });
      result.locationContent++;
    }
  }
  return result;
};

module.exports = { cascadeSubCommunityRename };
