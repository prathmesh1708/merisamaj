/**
 * Keeps the language in step with the signed-in account (member, Head or admin):
 * - on login (or app start while signed in) the account's saved language is applied
 * - a language picked while signed out (e.g. on the login screen) is saved to the
 *   account instead of being overwritten
 * Renders nothing.
 */
import { useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../auth/AuthContext';
import { HeadAuthContext } from '../../modules/head/auth/HeadAuthContext';
import { AdminAuthContext } from '../../modules/admin/auth/AdminAuthContext';
import { axiosPrivate } from '../api/axiosPrivate';
import { useLanguage } from './languageContext';
import { isSupported, isUnsaved, saveLanguageToAccount } from './languageStore';

const idOf = (u) => (u ? String(u._id || u.id || '') : '');

const LanguageSync = () => {
  const { user } = useContext(AuthContext);
  const { headAuth } = useContext(HeadAuthContext);
  const { adminAuth } = useContext(AdminAuthContext);
  const { language, setLanguage } = useLanguage();
  const languageRef = useRef(language);
  const syncedFor = useRef('');

  useEffect(() => { languageRef.current = language; }, [language]);

  const accounts = [idOf(user), idOf(headAuth?.user), idOf(adminAuth?.user)].filter(Boolean).join(',');

  useEffect(() => {
    if (!accounts) { syncedFor.current = ''; return; }
    if (accounts === syncedFor.current) return;
    syncedFor.current = accounts;
    if (isUnsaved()) { saveLanguageToAccount(languageRef.current); return; }
    axiosPrivate.get('/i18n/preference')
      .then(res => {
        const saved = res.data?.data?.language;
        if (isSupported(saved)) {
          if (saved !== languageRef.current) setLanguage(saved, { remote: false });
        } else if (languageRef.current !== 'en') {
          saveLanguageToAccount(languageRef.current);
        }
      })
      .catch(() => { /* offline or older backend — keep the local choice */ });
  }, [accounts, setLanguage]);

  return null;
};

export default LanguageSync;
