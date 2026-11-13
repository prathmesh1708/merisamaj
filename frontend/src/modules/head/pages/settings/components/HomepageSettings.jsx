import React from 'react';
import { Link, Plus, Trash2 } from 'lucide-react';

export const HomepageSettings = ({ settings = {}, updateDraft }) => {
  const content = settings.homepageContent || {};
  const hero = content.hero || {};
  const features = content.exclusiveFeatures || [];
  const promotions = content.promotions || [];
  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100';
  const setHero = (key, value) => updateDraft?.('homepageContent', 'hero', { ...hero, [key]: value });
  const setFeatures = (next) => updateDraft?.('homepageContent', 'exclusiveFeatures', next);
  const setPromotions = (next) => updateDraft?.('homepageContent', 'promotions', next);

  return (
    <div className="space-y-7 p-5 sm:p-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Link size={19} className="text-purple-600" /> Homepage content</h2>
        <p className="mt-1 text-sm text-slate-500">Edit the welcome banner and the content cards shown on the member home screen.</p>
      </div>
      <section className="space-y-4 rounded-2xl border border-slate-200 p-4 sm:p-5">
        <h3 className="text-sm font-bold text-slate-800">Welcome banner</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            ['title', 'Title', 'text'], ['subtitle', 'Subtitle', 'textarea'],
            ['buttonText', 'Button label', 'text'], ['buttonLink', 'Button destination', 'text'],
            ['backgroundImage', 'Background image URL', 'url']
          ].map(([key, label, type]) => (
            <label key={key} className={`space-y-1.5 ${type === 'textarea' ? 'sm:col-span-2' : ''}`}>
              <span className="text-xs font-bold text-slate-600">{label}</span>
              {type === 'textarea' ? <textarea rows={3} value={hero[key] || ''} onChange={e => setHero(key, e.target.value)} className={inputClass} /> : <input type={type} value={hero[key] || ''} onChange={e => setHero(key, e.target.value)} className={inputClass} />}
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={hero.enabled !== false} onChange={e => setHero('enabled', e.target.checked)} /> Show welcome banner</label>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-800">Homepage feature cards</h3><button type="button" onClick={() => setFeatures([...features, { id: `feature-${Date.now()}`, label: '', desc: '', path: '/member', icon: 'Users', displayOrder: features.length + 1, enabled: true }])} className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700"><Plus size={14} /> Add card</button></div>
        {features.map((feature, index) => <div key={feature.id || index} className="grid grid-cols-1 items-end gap-2 rounded-xl bg-slate-50 p-3 md:grid-cols-[1fr_1.3fr_1fr_auto_auto]">
          <label className="space-y-1"><span className="text-[11px] font-bold text-slate-500">Label</span><input value={feature.label || ''} onChange={e => setFeatures(features.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} className={inputClass} /></label>
          <label className="space-y-1"><span className="text-[11px] font-bold text-slate-500">Description</span><input value={feature.desc || ''} onChange={e => setFeatures(features.map((item, i) => i === index ? { ...item, desc: e.target.value } : item))} className={inputClass} /></label>
          <label className="space-y-1"><span className="text-[11px] font-bold text-slate-500">Destination</span><input value={feature.path || ''} onChange={e => setFeatures(features.map((item, i) => i === index ? { ...item, path: e.target.value } : item))} className={inputClass} /></label>
          <label className="flex h-10 items-center gap-2 px-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={feature.enabled !== false} onChange={e => setFeatures(features.map((item, i) => i === index ? { ...item, enabled: e.target.checked } : item))} />Visible</label>
          <button type="button" aria-label="Remove feature card" onClick={() => setFeatures(features.filter((_, i) => i !== index))} className="mb-1 rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={16} /></button>
        </div>)}
        {features.length === 0 && <p className="text-sm text-slate-500">No feature cards. Add one to show it on the member home screen.</p>}
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-800">Promotional cards</h3><button type="button" onClick={() => setPromotions([...promotions, { id: `promotion-${Date.now()}`, title: '', desc: '', image: '', buttonText: '', buttonLink: '', enabled: true }])} className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700"><Plus size={14} /> Add promotion</button></div>
        {promotions.map((promotion, index) => <div key={promotion.id || index} className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
          {[['title', 'Title'], ['desc', 'Description'], ['image', 'Image URL'], ['buttonText', 'Button label'], ['buttonLink', 'Button destination']].map(([key, label]) => <label key={key} className="space-y-1"><span className="text-[11px] font-bold text-slate-500">{label}</span><input value={promotion[key] || ''} onChange={e => setPromotions(promotions.map((item, i) => i === index ? { ...item, [key]: e.target.value } : item))} className={inputClass} /></label>)}
          <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={promotion.enabled !== false} onChange={e => setPromotions(promotions.map((item, i) => i === index ? { ...item, enabled: e.target.checked } : item))} />Visible</label><button type="button" onClick={() => setPromotions(promotions.filter((_, i) => i !== index))} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={16} /></button></div>
        </div>)}
      </section>
    </div>
  );
};

export default HomepageSettings;
