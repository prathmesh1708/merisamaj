import React from 'react';
import { LayoutTemplate, Palette } from 'lucide-react';

export const ThemeSettings = ({ settings = {}, updateDraft }) => {
  const theme = settings.theme || {};
  const update = (key, value) => updateDraft?.('theme', key, value);
  const selectClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100';
  return (
    <div className="space-y-6 p-5 sm:p-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><LayoutTemplate size={19} className="text-purple-600" /> Theme customization</h2>
        <p className="mt-1 text-sm text-slate-500">Preview and tune the look of your community member experience.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          ['primaryColor', 'Primary color'], ['secondaryColor', 'Secondary color'], ['accentColor', 'Accent color']
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
            <input aria-label={label} type="color" value={theme[key] || '#6f42c1'} onChange={e => update(key, e.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border-0 p-0" />
            <span className="flex-1 text-sm font-semibold text-slate-700">{label}</span>
            <code className="text-xs text-slate-500">{theme[key] || '#6f42c1'}</code>
          </label>
        ))}
        {[
          ['background', 'Page background', [['light', 'Light'], ['warm', 'Warm'], ['soft', 'Soft gray']]],
          ['cardRadius', 'Card corners', [['small', 'Compact'], ['medium', 'Medium'], ['large', 'Rounded']]],
          ['shadowStyle', 'Card shadows', [['none', 'None'], ['soft', 'Soft'], ['strong', 'Strong']]],
          ['buttonStyle', 'Button shape', [['rounded', 'Rounded'], ['pill', 'Pill'], ['square', 'Square']]],
          ['glassIntensity', 'Glass effects', [['none', 'Off'], ['low', 'Subtle'], ['medium', 'Medium'], ['high', 'Strong']]],
          ['typographyScale', 'Text size', [['compact', 'Compact'], ['normal', 'Normal'], ['large', 'Large']]]
        ].map(([key, label, options]) => (
          <label key={key} className="space-y-1.5">
            <span className="text-xs font-bold text-slate-600">{label}</span>
            <select value={theme[key] || options[0][0]} onChange={e => update(key, e.target.value)} className={selectClass}>
              {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700"><Palette size={16} /> Preview</h3>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-white" style={{ background: `linear-gradient(120deg, ${theme.primaryColor || '#6f42c1'}, ${theme.secondaryColor || '#db2777'})`, borderRadius: theme.cardRadius === 'small' ? 8 : theme.cardRadius === 'medium' ? 16 : 24 }}>
          <div><p className="text-sm font-bold">Your community</p><p className="text-xs opacity-80">Theme preview</p></div>
          <button type="button" className="rounded-full px-4 py-2 text-xs font-bold text-slate-900" style={{ backgroundColor: theme.accentColor || '#fbbf24' }}>Example button</button>
        </div>
      </div>
    </div>
  );
};

export default ThemeSettings;
