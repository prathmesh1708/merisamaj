/**
 * English | हिंदी switch, used in every panel's header and on the login screens.
 *   size="sm"  compact pill for headers (EN | हिं)
 *   size="md"  full labels (English | हिंदी) for login screens and Settings
 * Marked translate="no" so the translator never rewrites the labels.
 */
import { Languages } from 'lucide-react';
import { useLanguage } from './languageContext';
import { LANGUAGES } from './languageStore';

const LanguageSwitcher = ({ size = 'sm', showIcon = false, className = '' }) => {
  const { language, setLanguage } = useLanguage();
  const full = size === 'md';
  return (
    <div
      translate="no"
      role="radiogroup"
      aria-label="Language / भाषा"
      className={`notranslate inline-flex items-center shrink-0 rounded-xl border border-slate-200/80 bg-slate-100/90 p-0.5 shadow-2xs ${className}`}
    >
      {showIcon && <Languages size={full ? 16 : 14} className="mx-1.5 text-slate-500" aria-hidden="true" />}
      {LANGUAGES.map(l => {
        const on = language === l.code;
        return (
          <button
            key={l.code}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => { if (!on) setLanguage(l.code); }}
            className={`${full ? 'h-9 px-3.5 text-[13px]' : 'h-8 min-w-[34px] px-2 text-[11.5px]'} rounded-[10px] font-black transition-all press-scale cursor-pointer ${
              on ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-purple-700'
            }`}
          >
            {full ? l.label : l.short}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitcher;
