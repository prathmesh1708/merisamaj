/**
 * Forced-logout helpers.
 * When the server revokes a session (e.g. Admin deleted the user's community),
 * we remember why so the Login screen can explain it to the user.
 */
export const FORCE_LOGOUT_EVENT = 'merisamaj_force_logout';

const STORAGE_KEY = 'merisamaj_logout_reason';

export const saveLogoutReason = ({ reason, communityName, transferredTo } = {}) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ reason: reason || 'session_revoked', communityName: communityName || '', transferredTo: transferredTo || null })
    );
  } catch {
    // storage unavailable — message simply won't show
  }
};

export const readLogoutReason = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearLogoutReason = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};

/** Human-readable message for the login screen */
export const getLogoutReasonMessage = (info) => {
  if (!info) return '';
  if (info.reason === 'community_deleted') {
    const name = info.communityName ? `"${info.communityName}"` : 'Your community';
    if (info.transferredTo) {
      return `${name} has been removed by the Admin and your account was moved to "${info.transferredTo}". Please log in again — your request is pending approval from your Community Head and Local Head.`;
    }
    return `${name} has been removed by the Admin. Please log in and select your community — your request will be sent to your Community Head and Local Head for approval.`;
  }
  return 'Your session has ended. Please log in again.';
};
