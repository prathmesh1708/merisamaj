import React, { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { matrimonialService } from '../../services/matrimonialService';

const Field = ({ label, type = 'text', value, onChange, min, max }) => (
  <div>
    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">{label}</label>
    <input type={type} value={value} onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
      min={min} max={max}
      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-rose-500 shadow-2xs" />
  </div>
);

const Toggle = ({ label, sub, value, onChange }) => (
  <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
    <div>
      <p className="text-sm font-bold text-slate-900">{label}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
    <div onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${value ? 'bg-rose-500' : 'bg-slate-200'}`}>
      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </div>
  </div>
);

export const MatrimonialSettings = ({ data }) => {
  const { settings: serverSettings, setSettings } = data;
  const [form, setForm]   = useState(serverSettings || {
    profileCompletionRequired: 60,
    maxPhotoUpload: 6,
    freeInterestLimit: 3,
    allowProfileBoost: false,
    autoVerifyAfterDays: 7,
    matchWeights: { community: 20, age: 20, education: 15, profession: 15, location: 10, height: 5, diet: 5, maritalStatus: 10 },
    privacyDefaults: { defaultVisibility: 'community', requireSubscriptionForContact: true },
    moderation: { autoHideFlaggedProfiles: true, flagThreshold: 3 }
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setWeight = (k, v) => setForm(f => ({ ...f, matchWeights: { ...f.matchWeights, [k]: Number(v) } }));
  const setMod    = (k, v) => setForm(f => ({ ...f, moderation: { ...f.moderation, [k]: v } }));
  const setPrivacy= (k, v) => setForm(f => ({ ...f, privacyDefaults: { ...f.privacyDefaults, [k]: v } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await matrimonialService.updateSettings(form);
      setSettings?.(form);
      showToast('Settings saved ✅');
    } catch { showToast('Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* General */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">General Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Profile Completion Required (%)" type="number" value={form.profileCompletionRequired}
            onChange={v => set('profileCompletionRequired', v)} min={0} max={100} />
          <Field label="Max Photos Per Profile" type="number" value={form.maxPhotoUpload}
            onChange={v => set('maxPhotoUpload', v)} min={1} max={20} />
          <Field label="Free Interest Limit / Day" type="number" value={form.freeInterestLimit}
            onChange={v => set('freeInterestLimit', v)} min={0} max={100} />
          <Field label="Auto-Verify After (days)" type="number" value={form.autoVerifyAfterDays}
            onChange={v => set('autoVerifyAfterDays', v)} min={0} max={365} />
        </div>
        <Toggle label="Allow Profile Boost" sub="Premium members can boost their profile visibility"
          value={form.allowProfileBoost} onChange={v => set('allowProfileBoost', v)} />
      </div>

      {/* Match Weights */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Match Score Weights</h3>
        <p className="text-xs text-slate-500">Weights must sum to 100. Adjust how much each factor affects compatibility score.</p>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(form.matchWeights || {}).map(([key, val]) => (
            <div key={key}>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                {key.replace(/([A-Z])/g, ' $1').trim()} ({val}%)
              </label>
              <input type="range" min={0} max={50} value={val}
                onChange={e => setWeight(key, e.target.value)}
                className="w-full accent-rose-500" />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-amber-700 font-bold">
          Total: {Object.values(form.matchWeights || {}).reduce((a, b) => a + Number(b), 0)}%
          {Object.values(form.matchWeights || {}).reduce((a, b) => a + Number(b), 0) !== 100 ? ' ⚠ Should be 100%' : ' ✓'}
        </p>
      </div>

      {/* Moderation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Moderation</h3>
        <Toggle label="Auto-Hide Flagged Profiles" sub="Automatically hide profiles after threshold reports"
          value={form.moderation?.autoHideFlaggedProfiles} onChange={v => setMod('autoHideFlaggedProfiles', v)} />
        <Field label="Report Flag Threshold" type="number" value={form.moderation?.flagThreshold}
          onChange={v => setMod('flagThreshold', v)} min={1} max={50} />
      </div>

      {/* Privacy Defaults */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Privacy Defaults</h3>
        <div>
          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Default Visibility</label>
          <select value={form.privacyDefaults?.defaultVisibility}
            onChange={e => setPrivacy('defaultVisibility', e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-rose-500 shadow-2xs">
            <option value="public">Public</option>
            <option value="community">Community Only</option>
            <option value="private">Private (Interest Required)</option>
          </select>
        </div>
        <Toggle label="Require Subscription for Contact"
          sub="Users must have active subscription to view contact details"
          value={form.privacyDefaults?.requireSubscriptionForContact}
          onChange={v => setPrivacy('requireSubscriptionForContact', v)} />
      </div>

      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 px-6 py-3 bg-rose-500 text-white rounded-xl font-black text-sm hover:bg-rose-600 disabled:opacity-50 transition-colors shadow-sm">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Save Settings
      </button>
    </div>
  );
};

export default MatrimonialSettings;
