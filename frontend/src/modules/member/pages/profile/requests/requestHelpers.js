import { useCallback, useEffect, useRef, useState } from 'react';
import { axiosPrivate } from '../../../../../core/api/axiosPrivate';

// Helpers for the Community Member / Family request screens a Head opens from
// their Member Profile. The backend scopes and authorizes every call.

export const STATUS_TABS = [
  { key: 'all', label: 'All Requests' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' }
];

export const STATUS_BADGES = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', className: 'bg-rose-50 text-rose-700 border-rose-200' }
};

// Same buckets as the backend's REQUEST_STATUS_FILTERS
export const memberRequestStatus = (member) => {
  if (member?.verificationStatus === 'rejected') return 'rejected';
  if (member?.verificationStatus === 'pending' || member?.accountStatus === 'pending verification') return 'pending';
  return 'approved';
};

// A Local Head acts only while the Local Head stage is open; everyone above can act while pending
export const canActOnFamilyRequest = (request, level) =>
  request.approvalStatus === 'pending' && !(level === 'local' && request.approvals?.localHead?.status !== 'pending');

export const familyStageNote = (request) => {
  if (request.approvalStatus !== 'pending') return '';
  return request.approvals?.localHead?.status === 'approved'
    ? 'Local Head approved · awaiting Community Head'
    : 'Awaiting Local Head review';
};

export const timeAgo = (date) => {
  if (!date) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
  const [unit, size] = units.find(([, s]) => seconds >= s);
  const n = Math.floor(seconds / size);
  return `${n} ${unit}${n === 1 ? '' : 's'} ago`;
};

// Age in years from a date of birth, else the stored age text
export const ageFrom = (dob, fallback = '') => {
  const d = dob ? new Date(dob) : null;
  if (!d || Number.isNaN(d.getTime())) return fallback ? String(fallback) : '';
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age -= 1;
  return age >= 0 ? String(age) : '';
};

export const formatDate = (date) => (date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export const initialsOf = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?';

export const useToast = () => {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback((message, type = 'success') => {
    clearTimeout(timer.current);
    setToast({ message, type });
    timer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [toast, show];
};

// GETs `url` (with `params`) whenever they change or reload() is called.
// Older responses are dropped, so switching tabs quickly never shows stale data.
export const useHeadApi = (url, params) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const paramsKey = JSON.stringify(params || {});

  useEffect(() => {
    let cancelled = false;
    axiosPrivate.get(url, { params: JSON.parse(paramsKey) })
      .then(res => {
        if (cancelled) return;
        setData(res.data);
        setError('');
      })
      .catch(err => {
        if (!cancelled) setError(err.response?.data?.message || 'Could not load requests.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [url, paramsKey, reloadKey]);

  // showSpinner = true replaces the content with the loader (tab switch / retry)
  const reload = useCallback((showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setReloadKey(k => k + 1);
  }, []);

  return { data, loading, error, reload };
};
