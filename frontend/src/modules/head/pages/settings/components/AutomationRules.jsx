import React from 'react';
import { Plus, Trash2, Zap } from 'lucide-react';

const ruleTypes = [
  ['memberApproval', 'New member approval'],
  ['eventReminder', 'Event reminder'],
  ['donationReceipt', 'Donation receipt'],
  ['profileReview', 'Incomplete profile follow-up']
];

export const AutomationRules = ({ settings = {}, updateDraft }) => {
  const rules = settings.automationRules || [];
  const update = next => updateDraft?.('automationRules', undefined, next);
  return (
    <div className="space-y-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Zap size={19} className="text-purple-600" /> Automation rules</h2><p className="mt-1 text-sm text-slate-500">Configure the community workflows that should be enabled.</p></div>
        <button type="button" onClick={() => update([...rules, { id: `rule-${Date.now()}`, type: 'memberApproval', enabled: true, notes: '' }])} className="inline-flex items-center gap-1 rounded-xl bg-purple-600 px-3.5 py-2.5 text-xs font-bold text-white"><Plus size={15} /> Add rule</button>
      </div>
      {rules.map((rule, index) => <div key={rule.id || index} className="grid grid-cols-1 items-center gap-3 rounded-2xl border border-slate-200 p-4 sm:grid-cols-[1fr_auto_auto]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1"><span className="text-[11px] font-bold text-slate-500">Workflow</span><select value={rule.type || 'memberApproval'} onChange={e => update(rules.map((item, i) => i === index ? { ...item, type: e.target.value } : item))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">{ruleTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="space-y-1"><span className="text-[11px] font-bold text-slate-500">Admin note</span><input value={rule.notes || ''} onChange={e => update(rules.map((item, i) => i === index ? { ...item, notes: e.target.value } : item))} placeholder="Optional internal note" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /></label>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={rule.enabled !== false} onChange={e => update(rules.map((item, i) => i === index ? { ...item, enabled: e.target.checked } : item))} />Enabled</label>
        <button type="button" onClick={() => update(rules.filter((_, i) => i !== index))} aria-label="Delete rule" className="justify-self-end rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={16} /></button>
      </div>)}
      {rules.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No automation rules yet. Add a workflow to configure it for this community.</div>}
      <p className="text-xs text-slate-400">Rules are saved with the community configuration. Actual automated delivery depends on the corresponding module being enabled.</p>
    </div>
  );
};

export default AutomationRules;
