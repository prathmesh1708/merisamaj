import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Check, Edit2, Trash2, Loader2, X, Link2 } from 'lucide-react';
import { subscriptionService } from '../../../../services/subscriptionService';

const EMPTY_PLAN = {
  name: '', description: '', monthlyPrice: 0, badge: '', displayOrder: 0, isActive: true,
  customFeatures: [],
  features: {
    maxMembers: 500, maxHeads: 3, maxEvents: 5,
    professionalDirectory: false, matrimonial: false, broadcast: false,
    analytics: false, apiAccess: false, prioritySupport: false, customBranding: false
  }
};

const BOOLEAN_FEATURES = [
  { key: 'professionalDirectory', label: 'Professional Directory' },
  { key: 'broadcast', label: 'Broadcast Messaging' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'apiAccess', label: 'API Access' },
  { key: 'prioritySupport', label: 'Priority Support' },
  { key: 'customBranding', label: 'Custom Branding' },
];

const PlanModal = ({ plan, onClose, onSaved }) => {
  const [form, setForm]     = useState(plan
    ? { ...EMPTY_PLAN, ...plan, features: { ...EMPTY_PLAN.features, ...plan.features }, customFeatures: plan.customFeatures || [] }
    : EMPTY_PLAN);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');
  const [newFeatureText, setNewFeatureText] = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setFeature = (key, val) => setForm(f => ({ ...f, features: { ...f.features, [key]: val } }));

  const addCustomFeature = () => {
    const text = newFeatureText.trim();
    if (!text) return;
    setForm(f => ({ ...f, customFeatures: [...(f.customFeatures || []), text] }));
    setNewFeatureText('');
  };
  const removeCustomFeature = (idx) => {
    setForm(f => ({ ...f, customFeatures: f.customFeatures.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    if (!form.name) { setErr('Plan name is required.'); return; }
    setSaving(true);
    setErr('');
    try {
      if (plan?._id) await subscriptionService.updatePlan(plan._id, form);
      else            await subscriptionService.createPlan(form);
      onSaved();
      onClose();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="dark-modal-form bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 z-10 w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-black text-white">{plan?._id ? 'Edit Plan' : 'New Plan'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>
        {err && <p className="text-red-400 text-xs font-bold bg-red-500/10 p-3 rounded-xl">{err}</p>}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Plan Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-primary/50" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Monthly Price (₹)</label>
            <input type="number" value={form.monthlyPrice} onChange={e => set('monthlyPrice', Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-primary/50" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Badge</label>
            <input type="text" placeholder="e.g. Popular" value={form.badge || ''} onChange={e => set('badge', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-primary/50" />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Description</label>
            <textarea value={form.description} rows={2} onChange={e => set('description', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-primary/50 resize-none" />
          </div>
        </div>

        <div className="border-t border-white/5 pt-4 space-y-3">
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider">Limits</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 font-bold block mb-1">Max Members (-1 = ∞)</label>
              <input type="number" value={form.features.maxMembers}
                onChange={e => setFeature('maxMembers', Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold block mb-1">Max Heads (-1 = ∞)</label>
              <input type="number" value={form.features.maxHeads}
                onChange={e => setFeature('maxHeads', Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold block mb-1">Max Events (-1 = ∞)</label>
              <input type="number" value={form.features.maxEvents}
                onChange={e => setFeature('maxEvents', Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
          </div>

          <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider pt-2">Modules & Features</p>
          <div className="flex flex-wrap gap-4">
            {BOOLEAN_FEATURES.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setFeature(key, !form.features[key])}
                  className={`w-9 h-5 rounded-full relative transition-all cursor-pointer ${form.features[key] ? 'bg-brand-primary' : 'bg-white/10'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${form.features[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs text-gray-400 font-semibold">{label}</span>
              </label>
            ))}
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => set('isActive', !form.isActive)}
                className={`w-9 h-5 rounded-full relative transition-all cursor-pointer ${form.isActive ? 'bg-emerald-500' : 'bg-white/10'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs text-gray-400 font-semibold">Active</span>
            </label>
          </div>
          <p className="text-[10px] text-gray-500 italic">Matrimonial Module &amp; Professional Directory take effect immediately for every community this plan is assigned to. Other toggles are stored but not yet enforced.</p>
        </div>

        <div className="border-t border-white/5 pt-4 space-y-3">
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider">Custom Access for This Price</p>
          <p className="text-[10px] text-gray-500">Write any access or benefit you want to promise at this price — shown to the community, not auto-enforced like the toggles above.</p>

          <div className="flex gap-2">
            <input
              type="text"
              value={newFeatureText}
              onChange={e => setNewFeatureText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomFeature(); } }}
              placeholder="e.g. Free onboarding call with our team"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary/50"
            />
            <button type="button" onClick={addCustomFeature}
              className="px-4 py-2 bg-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/20 transition-colors shrink-0">
              Add
            </button>
          </div>

          {form.customFeatures?.length > 0 && (
            <ul className="space-y-1.5">
              {form.customFeatures.map((feat, idx) => (
                <li key={idx} className="flex items-center justify-between gap-2 bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-300">• {feat}</span>
                  <button type="button" onClick={() => removeCustomFeature(idx)}
                    className="text-gray-500 hover:text-red-400 shrink-0">
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 bg-brand-primary text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity">
          {saving && <Loader2 size={15} className="animate-spin" />}
          {plan?._id ? 'Save Changes' : 'Create Plan'}
        </button>
      </div>
    </div>
  );
};

const AssignModal = ({ plans, onClose }) => {
  const [communities, setCommunities] = useState(null);
  const [communityId, setCommunityId] = useState('');
  const [planId, setPlanId]           = useState(plans[0]?._id || '');
  const [saving, setSaving]           = useState(false);
  const [msg, setMsg]                 = useState('');

  React.useEffect(() => {
    subscriptionService.getCommunities()
      .then(list => { setCommunities(list); if (list[0]) setCommunityId(list[0]._id); })
      .catch(() => setCommunities([]));
  }, []);

  const handleAssign = async () => {
    if (!communityId || !planId) return;
    setSaving(true);
    try {
      await subscriptionService.assignPlan(communityId, planId);
      setMsg('Plan assigned ✅');
      setTimeout(onClose, 1200);
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Failed to assign plan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="dark-modal-form bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 z-10 w-full max-w-md shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white flex items-center gap-2"><Link2 size={16} className="text-brand-primary" /> Assign Plan to Community</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>
        {msg && <p className="text-emerald-400 text-sm font-bold">{msg}</p>}
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Community</label>
            {communities === null ? (
              <div className="flex items-center gap-2 text-gray-500 text-xs py-2"><Loader2 size={14} className="animate-spin" /> Loading communities...</div>
            ) : (
              <select value={communityId} onChange={e => setCommunityId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
                {communities.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.name}{c.city ? ` — ${c.city}` : ''}{c.planId?.name ? ` (currently: ${c.planId.name})` : ' (no plan)'}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Plan</label>
            <select value={planId} onChange={e => setPlanId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
              {plans.map(p => <option key={p._id} value={p._id}>{p.name} — ₹{p.monthlyPrice}/mo</option>)}
            </select>
          </div>
        </div>
        <button onClick={handleAssign} disabled={saving || !communityId || !planId}
          className="w-full py-3 bg-brand-primary text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          {saving && <Loader2 size={14} className="animate-spin" />}
          Assign Plan
        </button>
      </div>
    </div>
  );
};

export const PlanList = ({ data }) => {
  const { plans, refreshData } = data;
  const [modal, setModal]         = useState(null); // null | 'new' | plan_obj
  const [assignModal, setAssignModal] = useState(false);
  const [deleting, setDeleting]   = useState(null);
  const [toast, setToast]         = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this plan?')) return;
    setDeleting(id);
    try {
      await subscriptionService.deletePlan(id);
      showToast('Plan deleted.');
      refreshData?.();
    } catch {
      showToast('Delete failed.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg">{toast}</div>}
      {modal !== null && <PlanModal plan={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={refreshData} />}
      {assignModal && plans.length > 0 && <AssignModal plans={plans} onClose={() => setAssignModal(false)} />}

      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Subscription Plans</h2>
          <p className="text-xs text-gray-400">Manage available plans and feature matrices</p>
        </div>
        <div className="flex gap-2">
          {plans.length > 0 && (
            <button onClick={() => setAssignModal(true)}
              className="btn-secondary py-2 px-4 flex items-center gap-2 text-sm">
              <Link2 size={16} /> Assign to Community
            </button>
          )}
          <button onClick={() => setModal('new')} className="btn-primary py-2 px-4 flex items-center gap-2 text-sm">
            <Plus size={16} /> Create Plan
          </button>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="card-neo p-10 text-center text-gray-400 text-sm">
          No plans yet. Click "Create Plan" to add your first one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card-neo p-6 relative overflow-hidden"
            >
              {plan.badge && (
                <div className="absolute -top-3 -right-3 px-3 py-1 bg-brand-primary text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-lg shadow-brand-primary/30">
                  {plan.badge}
                </div>
              )}

              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${plan.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {plan.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-6 min-h-[32px]">{plan.description}</p>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-black text-white">₹{plan.monthlyPrice}</span>
                <span className="text-xs text-gray-500 font-medium">/month</span>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3">
                  <Check size={14} className="text-brand-primary" />
                  <span className="text-sm text-gray-300">Max Members: <strong className="text-white">{plan.features?.maxMembers === -1 ? 'Unlimited' : plan.features?.maxMembers}</strong></span>
                </div>
                {plan.features?.professionalDirectory && (
                  <div className="flex items-center gap-3">
                    <Check size={14} className="text-brand-primary" />
                    <span className="text-sm text-gray-300">Professional Directory</span>
                  </div>
                )}
                {plan.features?.matrimonial && (
                  <div className="flex items-center gap-3">
                    <Check size={14} className="text-brand-primary" />
                    <span className="text-sm text-gray-300">Matrimonial Module</span>
                  </div>
                )}
                {plan.customFeatures?.map((feat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Check size={14} className="text-brand-primary" />
                    <span className="text-sm text-gray-300">{feat}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                <button onClick={() => setModal(plan)}
                  className="flex-1 btn-secondary py-2 text-xs flex items-center justify-center gap-2">
                  <Edit2 size={14} /> Edit Plan
                </button>
                <button onClick={() => handleDelete(plan._id)} disabled={deleting === plan._id}
                  className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors disabled:opacity-40">
                  {deleting === plan._id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlanList;
