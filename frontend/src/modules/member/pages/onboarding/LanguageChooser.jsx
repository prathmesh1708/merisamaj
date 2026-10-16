import React from 'react';
import { Globe, AlertCircle, ArrowRight, Lock } from 'lucide-react';
import { useData } from '../../context/DataProvider';

// Set once the user has picked a language, so the chooser only opens the app the first time
export const LANGUAGE_CHOSEN_KEY = 'merisamaj_language_chosen';

export const hasChosenLanguage = () => {
  try { return localStorage.getItem(LANGUAGE_CHOSEN_KEY) === '1'; } catch { return false; }
};

export const markLanguageChosen = () => {
  try { localStorage.setItem(LANGUAGE_CHOSEN_KEY, '1'); } catch { /* storage unavailable */ }
};

/** "Choose your language" screen — the first screen when the app is opened. */
export const LanguageChooser = ({ onContinue }) => {
  const { setLanguage, language } = useData();

  return (
    <div className="h-screen bg-surface flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 aura-bg z-0 animate-aura-pulse" />

      <div className="flex-1 px-6 pt-16 pb-6 overflow-y-auto z-10 space-y-6 font-sans">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-violet-50 text-brand-primary rounded-[22px] flex items-center justify-center mx-auto shadow-md border border-purple-200/40">
          <Globe size={30} />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Choose your language</h1>
          <p className="text-xs text-text-secondary mt-1.5 leading-relaxed font-semibold">
            Select your preferred language to continue.
          </p>
        </div>

        <div className="space-y-4 pt-6 max-w-sm mx-auto w-full">
          {[
            { key: 'en', label: 'English', desc: 'Continue in English', badge: 'EN' },
            { key: 'hi', label: 'हिंदी', desc: 'हिंदी में जारी रखें', badge: 'HI' }
          ].map(langOpt => {
            const isSelected = language === langOpt.key;
            return (
              <button
                key={langOpt.key}
                onClick={() => setLanguage(langOpt.key)}
                className={`w-full p-4.5 rounded-[22px] border-2 flex items-center justify-between text-left transition-all ${
                  isSelected ? 'border-[#6D28D9] bg-purple-50/20 shadow-sm' : 'border-purple-100/30 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-[#6D28D9]' : 'border-slate-300'}`}>
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#6D28D9]" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{langOpt.label}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{langOpt.desc}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-brand-primary bg-purple-50 px-2 py-0.5 rounded">{langOpt.badge}</span>
              </button>
            );
          })}
        </div>

        <div className="bg-slate-50 border border-slate-100/60 p-3.5 rounded-2xl flex gap-2 items-center text-left text-[11px] text-slate-500 font-semibold max-w-sm mx-auto w-full">
          <AlertCircle size={15} className="text-[#6D28D9] shrink-0" />
          <p>You can change the language later from app settings.</p>
        </div>
      </div>

      <div className="px-6 pb-8 pt-4 shrink-0 bg-white/50 backdrop-blur-md border-t border-purple-100/30 z-10 max-w-sm mx-auto w-full">
        <button
          onClick={() => { markLanguageChosen(); onContinue?.(); }}
          className="w-full py-3.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 press-scale shadow-md"
        >
          Continue <ArrowRight size={16} />
        </button>
        <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <Lock size={12} /> Your information is safe and secure
        </div>
      </div>
    </div>
  );
};

export default LanguageChooser;
