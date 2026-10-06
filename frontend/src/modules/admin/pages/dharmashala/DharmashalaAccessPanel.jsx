import React, { useState, useEffect, useCallback } from 'react';
import { axiosPrivate } from '../../../../core/api/axiosPrivate';
import { getAllCommunities } from '../../services/communityService';

const ROLES = [
  ['community_head', 'Community Head'],
  ['community_sub_head', 'Community Sub-Head'],
  ['local_head', 'Local Head'],
  ['local_sub_head', 'Local Sub-Head']
];
const ACTIONS = [
  ['createProperty', 'Create / edit Dharmashala'],
  ['manualBooking', 'Manual / offline booking']
];

/**
 * Admin decides which head roles can create Dharmashalas and make manual
 * bookings — for a whole community, or overridden for one location.
 * Location values: Allow / Deny / Inherit (use the community-wide setting).
 */
export default function DharmashalaAccessPanel({ cities = [] }) {
  const [communities, setCommunities] = useState([]);
  const [communityId, setCommunityId] = useState('');
  const [city, setCity] = useState(''); // '' = whole community
  const [policy, setPolicy] = useState(null);
  const [roles, setRoles] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const flash = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); };

  useEffect(() => {
    getAllCommunities().then(r => {
      const list = r?.data || [];
      setCommunities(list);
      if (list[0]) setCommunityId(list[0]._id);
    }).catch(() => flash('Failed to load communities', false));
  }, []);

  const load = useCallback(async () => {
    if (!communityId) return;
    try {
      const res = await axiosPrivate.get('/admin/dharmashala/access-policy', { params: { communityId } });
      setPolicy(res.data.data);
    } catch (e) {
      flash(e.response?.data?.message || 'Failed to load policy', false);
    }
  }, [communityId]);

  useEffect(() => { load(); }, [load]);

  // Load the editable roles for the selected scope.
  useEffect(() => {
    if (!policy) return;
    if (!city) setRoles(policy.communityWide.roles);
    else setRoles(policy.byLocation.find(l => l.city === city)?.roles || {});
  }, [policy, city]);

  const valueOf = (r, a) => {
    const v = roles?.[r]?.[a];
    return typeof v === 'boolean' ? (v ? 'allow' : 'deny') : (city ? 'inherit' : 'deny');
  };
  const setValue = (r, a, v) => setRoles(prev => {
    const row = { ...(prev?.[r] || {}) };
    if (v === 'inherit') delete row[a]; else row[a] = v === 'allow';
    return { ...prev, [r]: row };
  });

  const save = async () => {
    setSaving(true);
    try {
      await axiosPrivate.put('/admin/dharmashala/access-policy', { communityId, city: city || null, roles });
      flash('Access saved');
      load();
    } catch (e) {
      flash(e.response?.data?.message || 'Failed to save', false);
    } finally { setSaving(false); }
  };

  const removeOverride = async () => {
    try {
      await axiosPrivate.delete('/admin/dharmashala/access-policy', { params: { communityId, city } });
      setCity('');
      load();
    } catch (e) { flash(e.response?.data?.message || 'Failed to remove', false); }
  };

  const overrideCities = policy?.byLocation.map(l => l.city) || [];
  const allCities = [...new Set([...cities, ...overrideCities])].filter(Boolean).sort();
  const sel = 'border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold';

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
      {msg && <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white text-sm font-bold ${msg.ok ? 'bg-emerald-600' : 'bg-rose-600'}`}>{msg.text}</div>}
      <div>
        <h3 className="text-sm font-black text-slate-800">Who can create Dharmashalas &amp; make manual bookings</h3>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Nobody except Admin has these powers until you grant them. Set it for the whole community, then override for a specific location if needed.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select className={sel} value={communityId} onChange={(e) => { setCommunityId(e.target.value); setCity(''); }}>
          {communities.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select className={sel} value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">Whole community (default)</option>
          {allCities.map(c => <option key={c} value={c}>{c}{overrideCities.includes(c) ? ' • override' : ''}</option>)}
        </select>
        {city && !overrideCities.includes(city) && (
          <span className="text-xs text-slate-400 font-semibold self-center">No override yet — everything inherits. Change a value and save to create one.</span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="text-left py-2">Role</th>
              {ACTIONS.map(([k, t]) => <th key={k} className="text-left py-2 px-2">{t}</th>)}
            </tr>
          </thead>
          <tbody>
            {ROLES.map(([r, rl]) => (
              <tr key={r} className="border-t border-slate-100">
                <td className="py-2 font-bold text-slate-700">{rl}</td>
                {ACTIONS.map(([a]) => (
                  <td key={a} className="py-2 px-2">
                    <select className={sel} value={valueOf(r, a)} onChange={(e) => setValue(r, a, e.target.value)}>
                      <option value="allow">Allowed</option>
                      <option value="deny">Not allowed</option>
                      {city && <option value="inherit">Inherit community setting</option>}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button onClick={save} disabled={saving || !communityId} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold disabled:opacity-50">
          {saving ? 'Saving…' : city ? `Save for ${city}` : 'Save community-wide'}
        </button>
        {city && overrideCities.includes(city) && (
          <button onClick={removeOverride} className="px-5 py-2.5 bg-white border border-slate-200 text-rose-600 rounded-xl text-xs font-bold">Remove override</button>
        )}
      </div>
    </div>
  );
}
