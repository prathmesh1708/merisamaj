import React from 'react';
import { Check, Loader2, X } from 'lucide-react';

const PlanFeaturesModal = ({ planName, features = [], loading = false, error = '', onClose }) => (
  <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="plan-features-title" className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Plan features</p><h2 id="plan-features-title" className="truncate text-lg font-black text-slate-900">{planName}</h2></div>
        <button type="button" onClick={onClose} aria-label="Close features" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"><X size={18} /></button>
      </div>
      {loading ? <div className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-slate-500"><Loader2 size={18} className="animate-spin" />Loading features…</div> : error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : features.length ? (
        <ul className="space-y-2">
          {features.map(feature => (
            <li key={feature.key} className="flex items-start gap-3 rounded-xl bg-slate-50 px-3.5 py-3">
              {feature.included ? <Check size={18} className="mt-0.5 shrink-0 text-emerald-600" strokeWidth={3} /> : <X size={17} className="mt-0.5 shrink-0 text-slate-400" strokeWidth={2.5} />}
              <span className={`min-w-0 flex-1 text-sm font-semibold ${feature.included ? 'text-slate-800' : 'text-slate-400'}`}>{feature.label}</span>
              {feature.value && <span className="shrink-0 text-xs font-bold text-slate-600">{feature.value}</span>}
            </li>
          ))}
        </ul>
      ) : <p className="py-8 text-center text-sm text-slate-500">No features have been configured for this plan.</p>}
      <button type="button" onClick={onClose} className="mt-5 w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white">Done</button>
    </section>
  </div>
);

export default PlanFeaturesModal;
