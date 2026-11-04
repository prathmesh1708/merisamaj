import React, { useCallback, useEffect, useState } from 'react';
import { matrimonialService } from '../matrimonial/services/matrimonialService';
import { Plus, Edit3, Power, RefreshCw, Tag, X } from 'lucide-react';
import { adminReferralService } from '../../../../core/api/referralService';

const EMPTY = { code: '', description: '', discountType: 'percentage', discountValue: 10, maxDiscountAmount: 0, minOrderAmount: 0, startsAt: '', expiresAt: '', maxUses: 0, maxUsesPerUser: 1, planType: 'all', planIds: [], isActive: true };
const card = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm';
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800';

const toLocalInput = value => value ? new Date(value).toISOString().slice(0, 16) : '';

export default function DiscountCodesTab({ showToast }) {
  const [codes, setCodes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [codesRes, plansRes] = await Promise.all([
        adminReferralService.getDiscountCodes(),
        matrimonialService.getPlans()
      ]);
      setCodes(codesRes.data?.data || []);
      setPlans(plansRes?.plans || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load discount codes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEditor = code => {
    setError('');
    setEditing(code || null);
    setForm(code ? {
      ...EMPTY, ...code, startsAt: toLocalInput(code.startsAt), expiresAt: toLocalInput(code.expiresAt),
      planIds: (code.planIds || []).map(id => id?._id || id)
    } : { ...EMPTY });
  };

  const save = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = { ...form, startsAt: form.startsAt || null, expiresAt: form.expiresAt || null, discountValue: Number(form.discountValue), maxDiscountAmount: Number(form.maxDiscountAmount), minOrderAmount: Number(form.minOrderAmount), maxUses: Number(form.maxUses), maxUsesPerUser: Number(form.maxUsesPerUser) };
    try {
      if (editing?._id) await adminReferralService.updateDiscountCode(editing._id, payload);
      else await adminReferralService.createDiscountCode(payload);
      setEditing(null);
      showToast?.(editing ? 'Discount code updated.' : 'Discount code created.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save discount code.');
    } finally {
      setSaving(false);
    }
  };

  const disable = async code => {
    if (!window.confirm(`Disable ${code.code}?`)) return;
    try {
      await adminReferralService.disableDiscountCode(code._id);
      showToast?.(`${code.code} disabled.`);
      load();
    } catch (err) {
      showToast?.(err.response?.data?.message || 'Could not disable code.', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-lg font-black text-slate-900"><Tag size={19} className="text-purple-600" /> Discount codes</h2><p className="mt-1 text-sm text-slate-500">Create server-validated offers with date, plan and usage limits.</p></div>
        <div className="flex gap-2"><button type="button" onClick={load} className="rounded-xl border border-slate-200 p-2.5 text-slate-500" title="Refresh"><RefreshCw size={16} /></button><button type="button" onClick={() => openEditor(null)} className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white"><Plus size={16} /> Create code</button></div>
      </div>
      {error && !editing && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      <div className={card}>
        {loading ? <div className="py-10 text-center text-slate-400"><RefreshCw size={18} className="mr-2 inline animate-spin" />Loading codes…</div> : codes.length === 0 ? <div className="py-10 text-center text-sm text-slate-500">No discount codes yet.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-500"><th className="p-3">Code</th><th className="p-3">Discount</th><th className="p-3">Validity</th><th className="p-3">Uses</th><th className="p-3">Plans</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead><tbody>{codes.map(code => <tr key={code._id} className="border-b border-slate-50 last:border-0"><td className="p-3"><b>{code.code}</b><div className="text-xs text-slate-500">{code.description || '—'}</div></td><td className="p-3">{code.discountType === 'percentage' ? `${code.discountValue}%` : `₹${code.discountValue}`}{code.maxDiscountAmount > 0 && <div className="text-xs text-slate-500">up to ₹{code.maxDiscountAmount}</div>}</td><td className="p-3 text-xs text-slate-600">{code.startsAt ? new Date(code.startsAt).toLocaleDateString() : 'Now'} – {code.expiresAt ? new Date(code.expiresAt).toLocaleDateString() : 'No expiry'}</td><td className="p-3">{code.usedCount || 0}{code.maxUses ? ` / ${code.maxUses}` : ' / ∞'}<div className="text-xs text-slate-500">{code.reservedCount || 0} pending</div></td><td className="p-3 capitalize">{code.planType === 'all' ? 'All plans' : code.planType}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${code.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{code.isActive ? 'Active' : 'Disabled'}</span></td><td className="p-3"><div className="flex gap-1"><button onClick={() => openEditor(code)} className="rounded-lg bg-purple-50 p-2 text-purple-700" title="Edit"><Edit3 size={15} /></button>{code.isActive && <button onClick={() => disable(code)} className="rounded-lg bg-rose-50 p-2 text-rose-600" title="Disable"><Power size={15} /></button>}</div></td></tr>)}</tbody></table></div>}
      </div>

      {editing !== null && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4"><button aria-label="Close editor" onClick={() => setEditing(null)} className="absolute inset-0 bg-slate-950/50" /><form onSubmit={save} className="relative z-10 max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
          <div className="flex items-center justify-between"><h3 className="text-lg font-black text-slate-900">{editing ? 'Edit discount code' : 'Create discount code'}</h3><button type="button" onClick={() => setEditing(null)} className="rounded-lg p-2 text-slate-500"><X size={18} /></button></div>
          {error && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-bold text-slate-600">Code<input required maxLength={40} value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className={input} placeholder="WELCOME10" /></label>
            <label className="space-y-1 text-xs font-bold text-slate-600">Applies to<select value={form.planType} onChange={e => setForm({ ...form, planType: e.target.value, planIds: [] })} className={input}><option value="all">All subscription plans</option><option value="matrimonial">Matrimonial plans</option><option value="app">App plans</option></select></label>
            <label className="space-y-1 text-xs font-bold text-slate-600">Discount type<select value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value })} className={input}><option value="percentage">Percentage</option><option value="fixed">Fixed amount (₹)</option></select></label>
            <label className="space-y-1 text-xs font-bold text-slate-600">Value<input required type="number" min="0.01" max={form.discountType === 'percentage' ? 100 : undefined} step="0.01" value={form.discountValue} onChange={e => setForm({ ...form, discountValue: e.target.value })} className={input} /></label>
            <label className="space-y-1 text-xs font-bold text-slate-600">Maximum discount (₹, 0 = no cap)<input type="number" min="0" step="0.01" value={form.maxDiscountAmount} onChange={e => setForm({ ...form, maxDiscountAmount: e.target.value })} className={input} /></label>
            <label className="space-y-1 text-xs font-bold text-slate-600">Minimum order (₹)<input type="number" min="0" step="0.01" value={form.minOrderAmount} onChange={e => setForm({ ...form, minOrderAmount: e.target.value })} className={input} /></label>
            <label className="space-y-1 text-xs font-bold text-slate-600">Starts at<input type="datetime-local" value={form.startsAt} onChange={e => setForm({ ...form, startsAt: e.target.value })} className={input} /></label>
            <label className="space-y-1 text-xs font-bold text-slate-600">Expires at<input type="datetime-local" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} className={input} /></label>
            <label className="space-y-1 text-xs font-bold text-slate-600">Maximum total uses (0 = unlimited)<input type="number" min="0" step="1" value={form.maxUses} onChange={e => setForm({ ...form, maxUses: e.target.value })} className={input} /></label>
            <label className="space-y-1 text-xs font-bold text-slate-600">Uses per member<input required type="number" min="1" step="1" value={form.maxUsesPerUser} onChange={e => setForm({ ...form, maxUsesPerUser: e.target.value })} className={input} /></label>
            <label className="space-y-1 text-xs font-bold text-slate-600 sm:col-span-2">Description<input maxLength={250} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={input} placeholder="Optional internal / checkout description" /></label>
            {form.planType !== 'all' && <label className="space-y-1 text-xs font-bold text-slate-600 sm:col-span-2">Limit to selected plans<select multiple value={form.planIds} onChange={e => setForm({ ...form, planIds: Array.from(e.target.selectedOptions, option => option.value) })} className={`${input} min-h-28`}>{plans.filter(plan => (plan.planType || 'matrimonial') === form.planType).map(plan => <option key={plan._id} value={plan._id}>{plan.name}</option>)}</select></label>}
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />Enabled</label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button><button disabled={saving} className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save code'}</button></div>
        </form></div>
      )}
    </div>
  );
}
