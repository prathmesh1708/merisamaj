import { createContext, useContext } from 'react';

export const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {}
});

/** `{ language: 'en' | 'hi', setLanguage(code, { remote? }) }` */
export const useLanguage = () => useContext(LanguageContext);
