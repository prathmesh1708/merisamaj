/**
 * App-wide language (English default, Hindi). One place for the whole app:
 * - remembers the choice in localStorage (survives refresh and navigation)
 * - saves it to the signed-in account (restored on the next login, see LanguageSync)
 * - turns the page translator on/off and sets <html lang>
 *
 * Only `language` changes when switching — components don't re-render for it unless
 * they read it, so switching is cheap.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LanguageContext } from './languageContext';
import { readStoredLanguage, storeLanguage, isSupported, hasAnyToken, markUnsaved, saveLanguageToAccount } from './languageStore';
import { startTranslating, stopTranslating } from './domTranslator';

const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(readStoredLanguage);

  const setLanguage = useCallback((code, { remote = true } = {}) => {
    if (!isSupported(code)) return;
    setLanguageState(code);
    storeLanguage(code);
    if (!remote) return;
    if (hasAnyToken()) saveLanguageToAccount(code);
    else markUnsaved(true); // saved to the account after the next login
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    if (language === 'hi') startTranslating();
    else stopTranslating();
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export default LanguageProvider;
