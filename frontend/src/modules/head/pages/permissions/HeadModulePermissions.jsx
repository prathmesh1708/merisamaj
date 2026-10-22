import React from 'react';
import ModulePermissionManager from '../../../../core/permissions/ModulePermissionManager';
import ModuleAccessDenied from '../../../../core/permissions/ModuleAccessDenied';
import { useModuleAccess } from '../../../../core/permissions/ModuleAccessContext';

// Community Head → Local Heads / Sub-Heads; Local Head → their Sub-Heads
const HeadModulePermissions = () => {
  const { loaded, me } = useModuleAccess();
  if (loaded && me && !me.canDelegate) {
    return <ModuleAccessDenied moduleName="Module Permissions" grantedBy={me.parent?.name} />;
  }
  return (
    <ModulePermissionManager
      subtitle="Give the people directly under you only the modules they need. You can only give modules you have received yourself."
    />
  );
};

export default HeadModulePermissions;
