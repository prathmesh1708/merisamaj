import { useEffect, useState } from 'react';
import { axiosPrivate } from '../../../core/api/axiosPrivate';

const ALL_ALLOWED = { socialPosts: true, socialStories: true, professionalListing: true };

/**
 * What the member's App plan (or the Free App plan) lets them create:
 * { socialPosts, socialStories, professionalListing }. null while loading.
 * If the check itself fails everything is shown; the server still enforces the plan.
 */
export const useAppPermissions = () => {
  const [permissions, setPermissions] = useState(null);

  useEffect(() => {
    let cancelled = false;
    axiosPrivate.get('/member/app-subscription/permissions')
      .then(res => { if (!cancelled) setPermissions({ ...ALL_ALLOWED, ...(res.data?.data || {}) }); })
      .catch(() => { if (!cancelled) setPermissions(ALL_ALLOWED); });
    return () => { cancelled = true; };
  }, []);

  return permissions;
};
