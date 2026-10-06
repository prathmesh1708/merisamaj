/**
 * Middleware to check granular module permissions for Head and Sub-Head users
 * @param {string} permissionKey - e.g. 'canViewEvents', 'canManageLeadership', 'canViewDharmashala'
 */
const authorizeModule = (permissionKey) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Not authorized' });
      }

      const userRole = (req.user.role || '').toLowerCase();

      // 1. Master Admin has full access to everything
      if (['admin', 'super_admin', 'master_admin', 'master'].includes(userRole)) {
        return next();
      }

      // 2. Head and Sub-Head role validation
      if (userRole === 'head' || userRole === 'sub_head') {
        const permissions = req.user.headPermissions || {};
        const isLocalHead = req.user.accountType === 'local_head' || req.user.subHeadType === 'local';
        
        // Community Head with role 'head' has full head access by default unless specific restriction applies
        if (userRole === 'head') {
          if (!permissionKey || permissions[permissionKey] !== false) {
            return next();
          }
        }

        // Local Head leader has access to manage sub-heads and local community by default
        if (isLocalHead && (permissionKey === 'canManageSubHeads' || permissionKey === 'canManageLocalCommunity')) {
          return next();
        }

        // Every Local Head can view and run Samaj Funds for their own location
        // (what they can reach is still limited to that location by the controllers).
        if (req.user.accountType === 'local_head' && (permissionKey === 'canViewFunds' || permissionKey === 'canManageFunds')) {
          return next();
        }

        // Sub-Head requires explicitly granted permission
        if (permissionKey) {
          if (permissions[permissionKey] === true) {
            return next();
          }
          return res.status(403).json({
            status: 'error',
            message: `Access denied. You do not have permission for '${permissionKey}'.`
          });
        }
        
        return next();
      }

      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Authorized head privileges required.'
      });
    } catch (error) {
      console.error('authorizeModule middleware error:', error);
      res.status(500).json({ status: 'error', message: 'Internal authorization error' });
    }
  };
};

/**
 * Middleware to check granular module permissions for Admin and Admin Sub-Head users
 * @param {string} permissionKey - e.g. 'canViewUsers', 'canManageEvents', 'canManageFunds'
 */
const authorizeAdminModule = (permissionKey) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Not authorized' });
      }

      const userRole = (req.user.role || '').toLowerCase();

      // 1. Master Platform Admin has unrestricted access to all admin modules
      if (['admin', 'super_admin', 'master_admin', 'master'].includes(userRole)) {
        return next();
      }

      // 2. Admin Sub-Head role validation
      if (userRole === 'admin_sub_head' || (userRole === 'sub_head' && req.user.subHeadType === 'admin')) {
        const adminPerms = req.user.adminPermissions || {};

        if (permissionKey) {
          if (adminPerms[permissionKey] === true) {
            return next();
          }
          return res.status(403).json({
            status: 'error',
            message: `Access denied. You do not have permission for '${permissionKey}'.`
          });
        }

        return next();
      }

      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Authorized platform admin privileges required.'
      });
    } catch (error) {
      console.error('authorizeAdminModule middleware error:', error);
      res.status(500).json({ status: 'error', message: 'Internal authorization error' });
    }
  };
};

module.exports = authorizeModule;
module.exports.authorizeModule = authorizeModule;
module.exports.authorizeAdminModule = authorizeAdminModule;

