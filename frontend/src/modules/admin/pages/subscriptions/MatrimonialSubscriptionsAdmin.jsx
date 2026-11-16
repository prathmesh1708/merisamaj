import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Crown, Users, Loader2, RefreshCw, PhoneCall, Save } from 'lucide-react';
import { matrimonialService } from '../matrimonial/services/matrimonialService';
import SubscriptionPlans from '../matrimonial/components/Plans/SubscriptionPlans';

const inr = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const STATUS_CLS = {
  active: 'bg-emerald-50 text-emerald-600',
  grace: 'bg-amber-50 text-amber-600',
  cancelled: 'bg-orange-50 text-orange-600',
  expired: 'bg-slate-100 text-slate-500'
};

/**
 * Admin → Subscriptions. Matrimonial is the only paid product, so this page manages
 * exactly that: the plans members can buy (including the Free plan, which decides what
 * every member gets without paying) and who has subscribed.
 */
export default function MatrimonialSubscriptionsAdmin() {
  const [params, setParams] = useSearchParams();
  const tab = ['subscribers', 'premier-requests'].includes(params.get('tab')) ? params.get('tab') : 'plans';

  const [plans, setPlans] = useState([]);
  const [subs, setSubs] = useState({ summary: null, subscriptions: [] });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshPlans = useCallback(async () => {
    try {
      const data = await matrimonialService.getPlans();
      setPlans(data?.plans || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load plans');
    }
  }, []);

  const refreshSubs = useCallback(async () => {
    try {
      const data = await matrimonialService.getSubscriptions(statusFilter ? { status: statusFilter } : {});
      setSubs(data || { summary: null, subscriptions: [] });
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load subscribers');
    }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    Promise.all([refreshPlans(), refreshSubs()]).finally(() => setLoading(false));
  }, [refreshPlans, refreshSubs]);

  const tabBtn = (key, label, Icon) => (
    <button onClick={() => setParams({ tab: key })}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${tab === key ? 'bg-rose-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
      <Icon size={13} /> {label}
    </button>
  );

  return (
    <div className="bg-slate-50 min-h-full rounded-2xl p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Matrimonial Subscriptions</h1>
          <p className="text-xs text-gray-500 mt-0.5">Set what is free for every member and what each paid plan unlocks.</p>
        </div>
        <div className="flex gap-2">
          {tabBtn('plans', 'Plans', Crown)}
          {tabBtn('subscribers', 'Subscribers', Users)}
          {tabBtn('premier-requests', 'Premier Requests', PhoneCall)}
        </div>
      </div>

      {error && <p className="text-red-600 text-xs font-bold bg-red-50 p-3 rounded-xl">{error}</p>}
      {loading && <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-rose-600" /></div>}

      {!loading && tab === 'plans' && <SubscriptionPlans data={{ plans, refreshPlans }} />}

      {!loading && tab === 'premier-requests' && <PremierRequestsPanel />}

      {!loading && tab === 'subscribers' && (
        <div className="space-y-4">
          {subs.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[['Total subscriptions', subs.summary.total], ['Active now', subs.summary.active], ['Paid revenue', inr(subs.summary.paidRevenue)],
                ['Most bought', Object.entries(subs.summary.byPlan || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || '—']].map(([t, v]) => (
                <div key={t} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{t}</p>
                  <p className="text-lg font-black text-slate-900 mt-1">{v}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
            <button onClick={refreshSubs} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"><RefreshCw size={14} /></button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full text-xs text-slate-700">
              <thead className="text-[10px] uppercase tracking-wider text-gray-500">
                <tr>{['Member', 'Plan', 'Paid', 'Via', 'Start', 'Ends', 'Status'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody>
                {subs.subscriptions.length === 0 && <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">No subscriptions.</td></tr>}
                {subs.subscriptions.map(s => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-4 py-3"><p className="font-bold text-slate-900">{s.user?.name || 'Deleted user'}</p><p className="text-[10px] text-gray-500">{s.user?.phone} {s.user?.city ? `· ${s.user.city}` : ''}</p></td>
                    <td className="px-4 py-3 font-bold">{s.planName}</td>
                    <td className="px-4 py-3">{inr(s.pricePaid)}</td>
                    <td className="px-4 py-3">{s.gateway === 'manual' ? 'Admin grant' : s.gateway}</td>
                    <td className="px-4 py-3">{day(s.startDate)}</td>
                    <td className="px-4 py-3">{day(s.endDate)}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${STATUS_CLS[s.status] || STATUS_CLS.expired}`}>{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PremierRequestsPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await matrimonialService.getPremierCallbacks();
      const rows = data?.requests || [];
      setRequests(rows);
      setDrafts(Object.fromEntries(rows.map(r => [r._id, { status: r.status, adminNote: r.adminNote || '' }])));
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load Premier callback requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (id) => {
    setSavingId(id);
    setError('');
    try {
      await matrimonialService.updatePremierCallback(id, drafts[id]);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not update this request.');
    } finally {
      setSavingId('');
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-900">Premier callback requests</h2>
          <p className="text-xs text-slate-500 mt-0.5">{pendingCount} pending · members asking for Premier Matchmaking follow-up</p>
        </div>
        <button onClick={load} disabled={loading} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50" aria-label="Refresh Premier requests">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      {error && <p className="text-red-600 text-xs font-bold bg-red-50 p-3 rounded-xl">{error}</p>}
      {loading ? <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-rose-600" /></div> : requests.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-sm text-slate-500">No Premier callback requests yet.</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {requests.map(request => {
            const member = request.userId || {};
            const draft = drafts[request._id] || { status: request.status, adminNote: request.adminNote || '' };
            return (
              <article key={request._id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-black text-sm text-slate-900 [overflow-wrap:anywhere]">{member.name || request.name || 'Member'}</h3>
                    <p className="text-xs text-slate-600">{member.phone || request.phone || 'No phone'}{(member.email || request.email) ? ` · ${member.email || request.email}` : ''}</p>
                    <p className="text-[11px] text-slate-500">{[member.city || request.city, member.community || request.community].filter(Boolean).join(' · ') || 'Location not provided'}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-rose-50 text-rose-700 px-2 py-1 text-[10px] font-black uppercase">{request.status}</span>
                </div>
                <div className="text-xs text-slate-600">Current plan: <strong className="text-slate-800">{request.currentPlanName || 'Free'}</strong>{request.currentPlanEndDate ? ` · Ends ${new Date(request.currentPlanEndDate).toLocaleDateString('en-IN')}` : ''}</div>
                <div className="text-[11px] text-slate-400">Requested {new Date(request.createdAt).toLocaleString('en-IN')}</div>
                <div className="grid grid-cols-1 sm:grid-cols-[150px_minmax(0,1fr)_auto] gap-2 items-start">
                  <select value={draft.status} onChange={e => setDrafts(prev => ({ ...prev, [request._id]: { ...draft, status: e.target.value } }))} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-800">
                    <option value="pending">Pending</option><option value="contacted">Contacted</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                  </select>
                  <textarea value={draft.adminNote} onChange={e => setDrafts(prev => ({ ...prev, [request._id]: { ...draft, adminNote: e.target.value } }))} rows={2} maxLength={2000} placeholder="Admin note (optional)" className="w-full min-w-0 resize-y bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-800" />
                  <button onClick={() => save(request._id)} disabled={savingId === request._id} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 text-white px-3 py-2 text-xs font-bold disabled:opacity-50">
                    {savingId === request._id ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
