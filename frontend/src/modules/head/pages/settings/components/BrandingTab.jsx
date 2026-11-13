import React from 'react';
import { Image, Palette } from 'lucide-react';

export const BrandingTab = ({ settings = {}, updateDraft }) => {
  const branding = settings.branding || {};
  const control = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100';
  const update = (key, value) => updateDraft?.('branding', key, value);
  return (
    <div className="space-y-6 p-5 sm:p-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Image size={19} className="text-purple-600" /> Community branding</h2>
        <p className="mt-1 text-sm text-slate-500">Set the logo, banner and primary brand colors for your community.</p>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[
          ['logoUrl', 'Logo image URL', 'The logo appears in community navigation and identity cards.'],
          ['bannerUrl', 'Banner image URL', 'The banner appears on community profile and home surfaces.']
        ].map(([key, label, help]) => (
          <label key={key} className="space-y-2">
            <span className="text-xs font-bold text-slate-600">{label}</span>
            <input type="url" value={branding[key] || ''} onChange={e => update(key, e.target.value)} placeholder="https://…" className={control} />
            <span className="block text-xs text-slate-400">{help}</span>
            {branding[key] && <img src={branding[key]} alt={`${label} preview`} className={`w-full rounded-xl border border-slate-200 bg-slate-50 object-contain ${key === 'logoUrl' ? 'h-36 p-4' : 'h-44'}`} />}
          </label>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800"><Palette size={16} className="text-purple-600" /> Brand colors</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[['primaryColor', 'Primary color'], ['accentColor', 'Accent color']].map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <input aria-label={label} type="color" value={branding[key] || '#6f42c1'} onChange={e => update(key, e.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border-0 p-0" />
              <span className="min-w-0 flex-1 text-sm font-semibold text-slate-700">{label}</span>
              <code className="text-xs text-slate-500">{branding[key] || '#6f42c1'}</code>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BrandingTab;
