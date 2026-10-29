// Role checks for Heads using the member app. They mirror the backend's
// authorize() / reviewerLevel() rules; the server still enforces every request.

const rolesOf = (user) => [user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])]
  .filter(Boolean)
  .map(r => String(r).toLowerCase());

const lower = (value) => String(value || '').toLowerCase();

export const isLocalHead = (user) => {
  if (!user) return false;
  const roles = rolesOf(user);
  const accType = lower(user.accountType);
  const subHeadType = lower(user.subHeadType);
  return (
    roles.includes('local_head') ||
    accType === 'local_head' ||
    accType === 'local_sub_head' ||
    subHeadType === 'local' ||
    lower(user.designation) === 'local head' ||
    (roles.includes('sub_head') && subHeadType !== 'admin' && accType !== 'community_head')
  );
};

export const isCommunityHead = (user) => {
  if (!user) return false;
  const roles = rolesOf(user);
  const accType = lower(user.accountType);
  const des = lower(user.designation);
  return (
    roles.includes('head') ||
    roles.includes('community_head') ||
    accType === 'community_head' ||
    accType === 'head' ||
    lower(user.subHeadType) === 'community' ||
    des === 'community head' ||
    des === 'president'
  );
};

const ADMIN_ROLES = ['admin', 'super_admin', 'master_admin', 'master', 'admin_sub_head'];

export const isAdminReviewer = (user) => {
  if (!user) return false;
  return rolesOf(user).some(r => ADMIN_ROLES.includes(r)) || ADMIN_ROLES.includes(lower(user.accountType));
};

// Who sees Community Member / Family requests from their Member Profile
export const canReviewRequests = (user) =>
  isLocalHead(user) || isCommunityHead(user) || isAdminReviewer(user) || user?.headPermissions?.canManageCensus === true;
