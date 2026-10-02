/**
 * moduleAccessMiddleware.js
 * Blocks access to a whole module (e.g. Matrimonial) when the requesting
 * user's community has it switched off via Community.settings.<key>Enabled —
 * the flag a CommunityPlan writes when an admin assigns that plan.
 */
const Community = require('../models/Community');

const checkModuleEnabled = (settingKey) => async (req, res, next) => {
  try {
    const communityId = req.communityId || req.user?.communityId;
    if (!communityId) return next(); // no community context — nothing to gate

    const community = await Community.findById(communityId).select('settings').lean();
    if (community && community.settings && community.settings[settingKey] === false) {
      return res.status(403).json({
        status: 'error',
        code: 'MODULE_DISABLED',
        message: 'This feature is not included in your community\'s current plan.'
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { checkModuleEnabled };
