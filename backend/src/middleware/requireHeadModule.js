/**
 * requireHeadModule — server-side gate for the hierarchical module access system.
 * Blocks a Head / Local Head / Sub-Head from a module's APIs unless the module was
 * granted to them down the hierarchy (services/modulePermissionService.js).
 * Typing a URL or calling the API directly gets the same 403 as the UI.
 *
 * Master Admin always passes. Users outside the Head hierarchy (e.g. Admin
 * Sub-Heads) are left to the existing role checks, as before.
 */
const { MODULE_BY_KEY } = require('../config/moduleCatalog');
const { isMasterAdmin, isHierarchyUser, getEffectiveModules } = require('../services/modulePermissionService');

const requireHeadModule = (moduleKey) => async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ status: 'error', message: 'Not authorized' });
    if (isMasterAdmin(req.user) || !isHierarchyUser(req.user)) return next();

    const modules = await getEffectiveModules(req.user._id);
    if (modules.includes(moduleKey)) return next();

    const label = MODULE_BY_KEY.get(moduleKey)?.label || moduleKey;
    return res.status(403).json({
      status: 'error',
      code: 'MODULE_NOT_GRANTED',
      module: moduleKey,
      message: `You don't have access to the ${label} module. Ask the administrator above you to grant it.`
    });
  } catch (err) {
    console.error('[requireHeadModule]', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal authorization error' });
  }
};

module.exports = { requireHeadModule };
