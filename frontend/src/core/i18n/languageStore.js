/**
 * Language storage helpers (no React). English is the default for new users.
 */
import { axiosPrivate } from '../api/axiosPrivate';

export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'hi', label: 'हिंदी', short: 'हिं' }
];

const KEY = 'apnisamaj_lang';
const LEGACY_KEY = 'merisamaj_v6_language';      // old Home page HI/EN toggle
const PENDING_KEY = 'apnisamaj_lang_unsaved';     // chosen while signed out

export const isSupported = (code) => LANGUAGES.some(l => l.code === code);

export const readStoredLanguage = () => {
  try {
    const v = localStorage.getItem(KEY);
    if (isSupported(v)) return v;
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
    if (isSupported(legacy)) return legacy;
  } catch { /* storage blocked */ }
  return 'en';
};

export const storeLanguage = (code) => {
  try {
    localStorage.setItem(KEY, code);
    localStorage.setItem(LEGACY_KEY, JSON.stringify(code));
  } catch { /* storage blocked */ }
};

export const hasAnyToken = () => {
  try {
    return !!(localStorage.getItem('merisamaj_token') || localStorage.getItem('head_auth_token') ||
      localStorage.getItem('admin_auth_token') || localStorage.getItem('merisamaj_admin_token'));
  } catch { return false; }
};

export const markUnsaved = (flag) => {
  try { if (flag) localStorage.setItem(PENDING_KEY, '1'); else localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
};

export const isUnsaved = () => {
  try { return localStorage.getItem(PENDING_KEY) === '1'; } catch { return false; }
};

/** Save to the signed-in account (restored on the next login) */
export const saveLanguageToAccount = (code) =>
  axiosPrivate.put('/i18n/preference', { language: code })
    .then(() => markUnsaved(false))
    .catch(() => markUnsaved(true));
