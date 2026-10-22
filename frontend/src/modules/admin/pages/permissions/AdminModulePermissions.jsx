import React from 'react';
import ModulePermissionManager from '../../../../core/permissions/ModulePermissionManager';
import ModuleAccessDenied from '../../../../core/permissions/ModuleAccessDenied';
import { useAdminAuth } from '../../auth/useAdminAuth';

const MASTER_ROLES = ['admin', 'super_admin', 'master_admin'];

// Master Admin → Community Heads (the top of the module hierarchy)
const AdminModulePermissions = () => {
  const { adminAuth } = useAdminAuth();
  if (!MASTER_ROLES.includes(adminAuth?.adminUser?.role)) {
    return <ModuleAccessDenied moduleName="Module Permissions" homePath="/admin/dashboard" />;
  }
  return (
    <ModulePermissionManager
      subtitle="Choose which modules each Community Head receives. They can pass on only these modules to their Local Heads and Sub-Heads."
    />
  );
};

export default AdminModulePermissions;
