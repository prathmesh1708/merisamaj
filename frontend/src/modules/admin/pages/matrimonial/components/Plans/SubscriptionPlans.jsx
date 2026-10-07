import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Crown, Check, Loader2, X, Gift } from 'lucide-react';
import { matrimonialService } from '../../services/matrimonialService';

const EMPTY_PLAN = {
  name: '', price: 0, originalPrice: 0, durationInDays: 30, displayOrder: 10,
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
    crossCommunityVisibility: false,
    communityFilter: false
  }
};

const PlanModal = ({ plan, onClose, onSaved }) => {
  const [form, setForm]       = useState(plan || EMPTY_PLAN);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setFeature = (key, val) => setForm(f => ({ ...f, features: { ...f.features, [key]: val } }));

  const handleSave = async () => {
    if (!form.name || !form.name.trim()) { setErr('Plan name is required.'); return; }
    if (form.price < 0) { setErr('Price cannot be negative.'); return; }
    if (form.price > 0 && !(form.durationInDays > 0)) { setErr('A paid plan needs a duration in days.'); return; }
    setSaving(true);
    try {
      if (plan?._id) await matrimonialService.updatePlan(plan._id, form);
      else            await matrimonialService.createPlan(form);
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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="bg-white border border-slate-200 rounded-2xl p-6 z-10 w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-black text-slate-900">{plan?._id ? 'Edit Plan' : 'New Plan'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        {err && <p className="text-red-600 text-xs font-bold bg-red-50 p-3 rounded-xl">{err}</p>}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Plan Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-rose-500/50" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Price (₹) *</label>
            <input type="number" value={form.price} onChange={e => set('price', Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-rose-500/50" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Original Price (₹)</label>
            <input type="number" value={form.originalPrice} onChange={e => set('originalPrice', Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-rose-500/50" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Duration (days)</label>
            <input type="number" value={form.durationInDays} onChange={e => set('durationInDays', Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-rose-500/50" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Display Order</label>
            <input type="number" value={form.displayOrder ?? 0} onChange={e => set('displayOrder', Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-rose-500/50" />
          </div>
          <div className="col-span-2">
            <p className="text-[10.5px] text-gray-500 font-semibold">
              Price ₹0 makes this the <span className="text-emerald-600">Free plan</span>: it applies to every member who has not bought a plan. Anything you switch on here is free for everyone.
            </p>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Badge</label>
            <input type="text" placeholder="e.g. Most Popular" value={form.badge || ''} onChange={e => set('badge', e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-rose-500/50" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Theme Color</label>
            <div className="flex gap-2">
              <input type="color" value={form.themeColor || '#f43f5e'} onChange={e => set('themeColor', e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0 p-0" />
              <input type="text" value={form.themeColor || '#f43f5e'} onChange={e => set('themeColor', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-rose-500/50" />
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Description</label>
            <textarea value={form.description} rows={2} onChange={e => set('description', e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-rose-500/50 resize-none" />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-3">
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider">Features</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Profile Views/Day (-1 = ∞)</label>
              <input type="number" value={form.features.profileViewsPerDay}
                onChange={e => setFeature('profileViewsPerDay', Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Interests/Month (-1 = ∞)</label>
              <input type="number" value={form.features.interestLimit}
                onChange={e => setFeature('interestLimit', Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Messages (-1 = ∞)</label>
              <input type="number" value={form.features.messageLimit}
                onChange={e => setFeature('messageLimit', Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none" />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            {[
              { key: 'chat', label: 'Chat Enabled' },
              { key: 'advancedFilters', label: 'Advanced Filters' },
              { key: 'visitorHistory', label: 'Visitor History' },
              { key: 'contactDetailsAccess', label: 'Contact Details Access' },
              { key: 'crossCommunityVisibility', label: 'See Other-Community Profiles' },
              { key: 'communityFilter', label: 'Community & Sub-community Filter' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setFeature(key, !form.features[key])}
                  className={`w-9 h-5 rounded-full relative transition-all cursor-pointer ${form.features[key] ? 'bg-rose-500' : 'bg-slate-200'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${form.features[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs text-slate-500 font-semibold">{label}</span>
              </label>
            ))}
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => set('isFeatured', !form.isFeatured)}
                className={`w-9 h-5 rounded-full relative transition-all cursor-pointer ${form.isFeatured ? 'bg-amber-500' : 'bg-slate-200'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${form.isFeatured ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs text-slate-500 font-semibold">Most Popular Badge</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => set('isActive', !form.isActive)}
                className={`w-9 h-5 rounded-full relative transition-all cursor-pointer ${form.isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs text-slate-500 font-semibold">Active</span>
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
  const [planId,   setPlanId]  = useState(plans.find(p => p.price > 0)?._id || '');
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
      setMsg(e?.response?.data?.message || e?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="bg-white border border-slate-200 rounded-2xl p-6 z-10 w-full max-w-md shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2"><Gift size={16} className="text-amber-600" /> Grant Subscription</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        {msg && <p className="text-emerald-600 text-sm font-bold">{msg}</p>}
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">User ID, email or phone</label>
            <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="e.g. 9876543210"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Plan</label>
            <select value={planId} onChange={e => setPlanId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none">
              {plans.filter(p => p.price > 0).map(p => <option key={p._id} value={p._id}>{p.name} — ₹{p.price}</option>)}
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
    if (!window.confirm('Delete this plan permanently? Members will no longer see it. Anyone who already bought it keeps it until it ends. (To hide it temporarily, edit it and switch off Active instead.)')) return;
    setDeleting(id);
    try {
      await matrimonialService.deletePlan(id);
      showToast('Plan deleted.');
      refreshPlans?.();
    } catch (e) { showToast(e?.response?.data?.message || 'Delete failed.'); }
    finally { setDeleting(null); }
  };

  return (
    <div className="space-y-4">
      {toast && <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg">{toast}</div>}
      {modal !== null && <PlanModal plan={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={refreshPlans} />}
      {grantModal && <GrantModal plans={plans} onClose={() => setGrantModal(false)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-black text-slate-900">Subscription Plans</h3>
          <p className="text-xs text-gray-500 mt-0.5">{plans.filter(p => p.isActive).length} active of {plans.length} plans · changes show to members immediately</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setGrantModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-100 border border-amber-200 transition-colors">
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
          <div key={plan._id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-3 relative overflow-hidden">
            {plan.isFeatured && (
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase">
                Popular
              </div>
            )}
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-black text-slate-900 text-sm">{plan.name}</h4>
                <p className="text-[10px] text-gray-500 mt-0.5">{plan.price === 0 ? 'Free plan · applies to everyone' : `${plan.durationInDays} days`}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${plan.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                {plan.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-600">₹{plan.price}</span>
              {plan.originalPrice > plan.price && (
                <span className="text-sm text-slate-400 line-through">₹{plan.originalPrice}</span>
              )}
            </div>

            <div className="space-y-1.5 text-[11px] text-slate-500">
              <p>• {plan.features?.profileViewsPerDay === -1 ? 'Unlimited' : plan.features?.profileViewsPerDay} profile views/day</p>
              <p>• {plan.features?.interestLimit === -1 ? 'Unlimited' : plan.features?.interestLimit} interests/month</p>
              <p>• {plan.features?.messageLimit === -1 ? 'Unlimited' : plan.features?.messageLimit} messages/month</p>
              {plan.features?.chat && <p>• Chat enabled</p>}
              {plan.features?.advancedFilters && <p>• Advanced filters</p>}
              {plan.features?.visitorHistory && <p>• Visitor history</p>}
              {plan.features?.contactDetailsAccess && <p>• Contact details access</p>}
              {plan.features?.crossCommunityVisibility && <p>• Sees other-community profiles</p>}
              {plan.features?.communityFilter && <p>• Community & sub-community filter</p>}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setModal(plan)}
                className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-200 transition-colors">
                <Edit3 size={12} /> Edit
              </button>
              <button onClick={() => handleDelete(plan._id)} disabled={deleting === plan._id}
                className="py-2 px-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center justify-center hover:bg-red-100 disabled:opacity-40 transition-colors">
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
