import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Crown, Check, Loader2, X, Gift } from 'lucide-react';
import { matrimonialService } from '../../services/matrimonialService';

const EMPTY_PLAN = {
  name: '', price: 0, originalPrice: 0, durationInDays: 30,
  description: '', isActive: true, isFeatured: false,
  badge: '', themeColor: '#f43f5e',
  features: {
    profileViewsPerDay: 10,
    interestLimit: 5,
    messageLimit: -1,
    profileBoosts: 0,
    advancedFilters: false,
    visitorHistory: false,
    chat: false,
    highlightProfile: false,
    priorityListing: false,
    contactDetailsAccess: false,
    unlimitedShortlist: false,
    readReceipts: false,
    profileBadge: false,
    crossCommunityVisibility: false
  }
};

const PlanModal = ({ plan, onClose, onSaved }) => {
  const [form, setForm]       = useState(plan || EMPTY_PLAN);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setFeature = (key, val) => setForm(f => ({ ...f, features: { ...f.features, [key]: val } }));

  const handleSave = async () => {
    if (!form.name || !form.price) { setErr('Name and price are required.'); return; }
    setSaving(true);
    try {
      if (plan?._id) await matrimonialService.updatePlan(plan._id, form);
      else            await matrimonialService.createPlan(form);
      onSaved();
      onClose();
    } catch (e) {
      setErr(e?.message || 'Save failed.');
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
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500/50" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Price (₹) *</label>
            <input type="number" value={form.price} onChange={e => set('price', Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500/50" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Original Price (₹)</label>
            <input type="number" value={form.originalPrice} onChange={e => set('originalPrice', Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500/50" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Duration (days)</label>
            <input type="number" value={form.durationInDays} onChange={e => set('durationInDays', Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500/50" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Badge</label>
            <input type="text" placeholder="e.g. Most Popular" value={form.badge || ''} onChange={e => set('badge', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500/50" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Theme Color</label>
            <div className="flex gap-2">
              <input type="color" value={form.themeColor || '#f43f5e'} onChange={e => set('themeColor', e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0 p-0" />
              <input type="text" value={form.themeColor || '#f43f5e'} onChange={e => set('themeColor', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500/50" />
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Description</label>
            <textarea value={form.description} rows={2} onChange={e => set('description', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500/50 resize-none" />
          </div>
        </div>

        <div className="border-t border-white/5 pt-4 space-y-3">
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider">Features</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 font-bold block mb-1">Profile Views/Day (-1 = ∞)</label>
              <input type="number" value={form.features.profileViewsPerDay}
                onChange={e => setFeature('profileViewsPerDay', Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold block mb-1">Interests/Month (-1 = ∞)</label>
              <input type="number" value={form.features.interestLimit}
                onChange={e => setFeature('interestLimit', Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold block mb-1">Messages (-1 = ∞)</label>
              <input type="number" value={form.features.messageLimit}
                onChange={e => setFeature('messageLimit', Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold block mb-1">Profile Boosts/Month</label>
              <input type="number" value={form.features.profileBoosts}
                onChange={e => setFeature('profileBoosts', Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            {[
              { key: 'chat', label: 'Chat Enabled' },
              { key: 'advancedFilters', label: 'Advanced Filters' },
              { key: 'visitorHistory', label: 'Visitor History' },
              { key: 'highlightProfile', label: 'Highlight Profile' },
              { key: 'priorityListing', label: 'Priority Listing' },
              { key: 'contactDetailsAccess', label: 'Contact Details Access' },
              { key: 'unlimitedShortlist', label: 'Unlimited Shortlist' },
              { key: 'readReceipts', label: 'Read Receipts' },
              { key: 'profileBadge', label: 'Premium Badge' },
              { key: 'crossCommunityVisibility', label: 'See Other-Community Profiles' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setFeature(key, !form.features[key])}
                  className={`w-9 h-5 rounded-full relative transition-all cursor-pointer ${form.features[key] ? 'bg-rose-500' : 'bg-white/10'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${form.features[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs text-gray-400 font-semibold">{label}</span>
              </label>
            ))}
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => set('isFeatured', !form.isFeatured)}
                className={`w-9 h-5 rounded-full relative transition-all cursor-pointer ${form.isFeatured ? 'bg-amber-500' : 'bg-white/10'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${form.isFeatured ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs text-gray-400 font-semibold">Most Popular Badge</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => set('isActive', !form.isActive)}
                className={`w-9 h-5 rounded-full relative transition-all cursor-pointer ${form.isActive ? 'bg-emerald-500' : 'bg-white/10'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs text-gray-400 font-semibold">Active</span>
            </label>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 bg-rose-500 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-rose-600 transition-colors">
          {saving && <Loader2 size={15} className="animate-spin" />}
          {plan?._id ? 'Save Changes' : 'Create Plan'}
        </button>
      </div>
    </div>
  );
};

// Grant subscription modal
const GrantModal = ({ plans, onClose }) => {
  const [userId,   setUserId]  = useState('');
  const [planId,   setPlanId]  = useState(plans[0]?._id || '');
  const [saving,   setSaving]  = useState(false);
  const [msg,      setMsg]     = useState('');

  const handleGrant = async () => {
    if (!userId || !planId) return;
    setSaving(true);
    try {
      await matrimonialService.grantSubscription({ userId, planId });
      setMsg('Subscription granted ✅');
      setTimeout(onClose, 1500);
    } catch (e) {
      setMsg(e?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="dark-modal-form bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 z-10 w-full max-w-md shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white flex items-center gap-2"><Gift size={16} className="text-amber-400" /> Grant Subscription</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>
        {msg && <p className="text-emerald-400 text-sm font-bold">{msg}</p>}
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">User ID or Email</label>
            <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="User ID"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Plan</label>
            <select value={planId} onChange={e => setPlanId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
              {plans.map(p => <option key={p._id} value={p._id}>{p.name} — ₹{p.price}</option>)}
            </select>
          </div>
        </div>
        <button onClick={handleGrant} disabled={saving || !userId}
          className="w-full py-3 bg-amber-500 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          {saving && <Loader2 size={14} className="animate-spin" />}
          Grant Free Subscription
        </button>
      </div>
    </div>
  );
};

export const SubscriptionPlans = ({ data }) => {
  const { plans = [], refreshPlans } = data;
  const [modal, setModal]     = useState(null); // null | 'new' | plan_obj
  const [grantModal, setGrantModal] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast]     = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this plan?')) return;
    setDeleting(id);
    try {
      await matrimonialService.deletePlan(id);
      showToast('Plan deleted.');
      refreshPlans?.();
    } catch { showToast('Delete failed.'); }
    finally { setDeleting(null); }
  };

  return (
    <div className="space-y-4">
      {toast && <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg">{toast}</div>}
      {modal !== null && <PlanModal plan={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={refreshPlans} />}
      {grantModal && <GrantModal plans={plans} onClose={() => setGrantModal(false)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-black text-white">Subscription Plans</h3>
          <p className="text-xs text-gray-500 mt-0.5">{plans.length} active plans</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setGrantModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500/10 text-amber-400 rounded-xl text-xs font-bold hover:bg-amber-500/20 border border-amber-500/20 transition-colors">
            <Gift size={13} /> Grant Free
          </button>
          <button onClick={() => setModal('new')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 transition-colors">
            <Plus size={13} /> New Plan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map(plan => (
          <div key={plan._id} className="card-neo p-5 space-y-3 relative overflow-hidden">
            {plan.isFeatured && (
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase">
                Popular
              </div>
            )}
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-black text-white text-sm">{plan.name}</h4>
                <p className="text-[10px] text-gray-500 mt-0.5">{plan.durationInDays} days</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${plan.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                {plan.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-400">₹{plan.price}</span>
              {plan.originalPrice > plan.price && (
                <span className="text-sm text-gray-600 line-through">₹{plan.originalPrice}</span>
              )}
            </div>

            <div className="space-y-1.5 text-[11px] text-gray-400">
              <p>• {plan.features?.profileViewsPerDay === -1 ? 'Unlimited' : plan.features?.profileViewsPerDay} profile views/day</p>
              <p>• {plan.features?.interestLimit === -1 ? 'Unlimited' : plan.features?.interestLimit} interests/month</p>
              {plan.features?.chat && <p>• Chat enabled</p>}
              {plan.features?.advancedFilters && <p>• Advanced filters</p>}
              {plan.features?.visitorHistory && <p>• Visitor history</p>}
              {plan.features?.contactDetailsAccess && <p>• Contact details access</p>}
              {plan.features?.crossCommunityVisibility && <p>• Sees other-community profiles</p>}
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/5">
              <button onClick={() => setModal(plan)}
                className="flex-1 py-2 bg-white/5 text-gray-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-white/10 transition-colors">
                <Edit3 size={12} /> Edit
              </button>
              <button onClick={() => handleDelete(plan._id)} disabled={deleting === plan._id}
                className="py-2 px-3 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold flex items-center justify-center hover:bg-red-500/20 disabled:opacity-40 transition-colors">
                {deleting === plan._id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPlans;
