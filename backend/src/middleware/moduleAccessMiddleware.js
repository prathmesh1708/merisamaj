/**
 * moduleAccessMiddleware.js
 * Blocks access to a whole module (e.g. Matrimonial) when the requesting
 * user's community has it switched off via Community.settings.<key>Enabled —
 * the flag a CommunityPlan writes when an admin assigns that plan.
 */
const Community = require('../models/Community');

const checkModuleEnabled = (settingKey) => async (req, res, next) => {
  try {
    const communityRef = req.communityId || req.user?.communityId;
    const communityId = communityRef?._id || communityRef;
    if (!communityId) return next(); // no community context — nothing to gate

    const community = await Community.findById(communityId).select('settings subCommunities.name subCommunities.settings').lean();
    const memberSubCommunity = String(req.user?.subCommunity || '').trim().toLowerCase();
    const subCommunity = memberSubCommunity
      ? community?.subCommunities?.find(sub => String(sub.name || '').trim().toLowerCase() === memberSubCommunity)
      : null;
    const disabledAtCommunity = community?.settings?.[settingKey] === false;
    const disabledAtSubCommunity = subCommunity?.settings?.[settingKey] === false;
    if (disabledAtCommunity || disabledAtSubCommunity) {
      return res.status(403).json({
        status: 'error',
        code: 'MODULE_DISABLED',
        message: disabledAtSubCommunity
          ? 'This feature is currently disabled for your sub-community.'
          : 'This feature is currently disabled for your community.'
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { checkModuleEnabled };
