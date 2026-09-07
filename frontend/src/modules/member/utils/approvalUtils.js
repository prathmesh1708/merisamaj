/**
 * Check if a user/member account is fully approved by Community Head or Admin.
 * Privileged roles ('head', 'sub_head', 'admin') are automatically treated as approved.
 */
export const isMemberApproved = (user) => {
  if (!user) return false;
  
  // Community heads, sub-heads, and admins have administrative access
  if (['head', 'sub_head', 'admin'].includes(user.role)) {
    return true;
  }

  // Account must be verified and not blocked/inactive
  const isVerifiedStatus = user.verificationStatus === 'verified';
  const isExplicitVerified = user.isVerified === true;
  const isNotBlocked = user.accountStatus !== 'blocked' && user.accountStatus !== 'inactive' && user.accountStatus !== 'deleted';

  return (isVerifiedStatus || isExplicitVerified) && isNotBlocked;
};

/**
 * Dispatch a custom event to open the ApprovalRequiredModal globally
 * @param {string} [featureName] - Optional name of the restricted feature
 */
export const showApprovalRequiredNotice = (featureName = '') => {
  window.dispatchEvent(
    new CustomEvent('merisamaj_show_approval_modal', {
      detail: { featureName }
    })
  );
};
