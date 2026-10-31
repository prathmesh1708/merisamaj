import React, { useState, useEffect, useCallback } from 'react';
import {
  Gift, Users, Crown, Award, Heart, Save, CheckCircle2, Search, Sliders, RefreshCw, Power,
  TrendingUp, Calendar, Wallet, IndianRupee, FileBarChart, Download, X, Copy, Clock,
  BadgeCheck, XCircle, Ban, AlertCircle, Smartphone, Building2
} from 'lucide-react';
import { adminReferralService } from '../../../../core/api/referralService';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const inr = (n) => `₹${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN')}`;
const num = (n) => (Number(n) || 0).toLocaleString('en-IN');
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const downloadCsv = (filename, headers, rows) => {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const EVENT_STYLE = {
  REGISTRATION: 'bg-blue-50 text-blue-700 border-blue-200',
  SUBSCRIPTION: 'bg-purple-50 text-purple-700 border-purple-200',
  MEMBERSHIP: 'bg-amber-50 text-amber-700 border-amber-200',
  DONATION: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  WELCOME: 'bg-pink-50 text-pink-700 border-pink-200',
};

const PAYOUT_STATUS = {
  pending:   { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: Clock },
  approved:  { label: 'Approved', cls: 'bg-blue-50 text-blue-700 border-blue-200', Icon: BadgeCheck },
  paid:      { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 },
  rejected:  { label: 'Rejected', cls: 'bg-rose-50 text-rose-700 border-rose-200', Icon: XCircle },
  cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500 border-gray-200', Icon: Ban },
};

const card = 'bg-white border border-gray-100 rounded-2xl shadow-sm';
const fieldCls = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-brand-primary focus:bg-white';

const StatusPill = ({ status }) => {
  const st = PAYOUT_STATUS[status] || PAYOUT_STATUS.pending;
  const Icon = st.Icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold ${st.cls}`}>
      <Icon size={12} /> {st.label}
    </span>
  );
};

const EventBadge = ({ item }) => {
  const key = item.isWelcomeBonus ? 'WELCOME' : item.eventType;
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${EVENT_STYLE[key] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {item.isWelcomeBonus ? 'WELCOME BONUS' : item.eventType}
    </span>
  );
};

const Metric = ({ icon: Icon, tone, label, value, sub }) => (
  <div className={`${card} p-4 flex items-center gap-3.5`}>
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${tone}`}>
      <Icon size={22} />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
      <h3 className="text-xl font-black text-gray-900 mt-0.5 truncate">{value}</h3>
      {sub && <p className="text-[11px] text-gray-400 font-medium">{sub}</p>}
    </div>
  </div>
);

const Pager = ({ page, pages, onChange }) => pages > 1 && (
  <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-xs font-bold text-gray-500">
    <span>Page {page} of {pages}</span>
    <div className="flex gap-2">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Previous</button>
      <button disabled={page >= pages} onClick={() => onChange(page + 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Next</button>
    </div>
  </div>
);

// ─── Overview & Settings tab ─────────────────────────────────────────────────
const SETTINGS_FIELDS = [
  { key: 'registrationReferrerPoints', label: 'New sign-up — points to referrer', unit: 'pts' },
  { key: 'registrationReferredPoints', label: 'New sign-up — welcome points to new member', unit: 'pts' },
  { key: 'subscriptionPoints', label: 'Subscription purchase — points to referrer', unit: 'pts' },
  { key: 'membershipPoints', label: 'Membership upgrade — points to referrer', unit: 'pts' },
  { key: 'donationPoints', label: 'Donation — points to referrer', unit: 'pts' },
];

const OverviewTab = ({ stats, config, setConfig, onSave, saving }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Metric icon={Users} tone="bg-purple-50 text-purple-600" label="Referred sign-ups" value={num(stats?.breakdown?.REGISTRATION?.count)} sub={`${num(stats?.totalReferrals)} total events`} />
      <Metric icon={TrendingUp} tone="bg-emerald-50 text-emerald-600" label="Points awarded" value={`${num(stats?.totalPointsAwarded)} pts`} />
      <Metric icon={Wallet} tone="bg-amber-50 text-amber-600" label="Pending payouts" value={num((stats?.payouts?.pending?.count || 0) + (stats?.payouts?.approved?.count || 0))} sub={inr((stats?.payouts?.pending?.amount || 0) + (stats?.payouts?.approved?.amount || 0))} />
      <Metric icon={IndianRupee} tone="bg-blue-50 text-blue-600" label="Total paid out" value={inr(stats?.payouts?.paid?.amount)} sub={`${num(stats?.payouts?.paid?.count)} payments`} />
      <Metric icon={Crown} tone="bg-violet-50 text-violet-600" label="First subscriptions rewarded" value={num(stats?.breakdown?.SUBSCRIPTION?.count)} />
      <Metric icon={Heart} tone="bg-rose-50 text-rose-600" label="Donations rewarded" value={num(stats?.breakdown?.DONATION?.count)} />
      <Metric icon={Gift} tone="bg-pink-50 text-pink-600" label="Unredeemed points (liability)" value={`${num(stats?.outstandingPoints)} pts`} sub={`worth ${inr(stats?.outstandingAmount)}`} />
      <Metric icon={Award} tone="bg-teal-50 text-teal-600" label="Memberships rewarded" value={num(stats?.breakdown?.MEMBERSHIP?.count)} />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form onSubmit={onSave} className={`${card} p-6 lg:col-span-2 space-y-5`}>
        <h2 className="text-base font-black text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-4">
          <Sliders size={18} className="text-brand-primary" /> Points Settings
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SETTINGS_FIELDS.map(f => (
            <label key={f.key} className="space-y-1.5 block">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">{f.label}</span>
              <div className="relative">
                <input type="number" min="0" required value={config[f.key] ?? ''} onChange={e => setConfig({ ...config, [f.key]: e.target.value })} className={`${fieldCls} pr-12`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{f.unit}</span>
              </div>
            </label>
          ))}
        </div>

        <label className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer">
          <input type="checkbox" checked={config.rewardFirstPurchaseOnly !== false} onChange={e => setConfig({ ...config, rewardFirstPurchaseOnly: e.target.checked })} className="w-4 h-4 mt-0.5 accent-purple-600" />
          <span className="text-sm text-gray-700">
            <b>Subscription / membership points only on the first purchase</b>
            <span className="block text-xs text-gray-500">The referrer is rewarded once per referred member, not for every renewal.</span>
          </span>
        </label>

        <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 pt-2">
          <IndianRupee size={16} className="text-emerald-600" /> Cash Redemption
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="space-y-1.5 block">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">₹ value of 1 point</span>
            <input type="number" min="0" step="0.01" required value={config.rupeesPerPoint ?? ''} onChange={e => setConfig({ ...config, rupeesPerPoint: e.target.value })} className={fieldCls} />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Minimum points to redeem</span>
            <input type="number" min="1" required value={config.minRedeemPoints ?? ''} onChange={e => setConfig({ ...config, minRedeemPoints: e.target.value })} className={fieldCls} />
          </label>
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer self-end">
            <input type="checkbox" checked={config.redemptionEnabled !== false} onChange={e => setConfig({ ...config, redemptionEnabled: e.target.checked })} className="w-4 h-4 accent-purple-600" />
            <span className="text-sm font-bold text-gray-700">Members can request payouts</span>
          </label>
        </div>

        <div className="pt-2 flex justify-end">
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow hover:bg-brand-primary/90 transition-all disabled:opacity-50">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Save Settings
          </button>
        </div>
      </form>

      <div className={`${card} p-6 space-y-4`}>
        <h2 className="text-base font-black text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-4">
          <Award size={18} className="text-amber-500" /> Top Referrers
        </h2>
        {stats?.topReferrers?.length ? (
          <div className="space-y-2.5">
            {stats.topReferrers.map((u, idx) => (
              <div key={u._id} className="flex items-center justify-between gap-2 p-2.5 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-gray-200 text-gray-700' : 'bg-orange-100 text-orange-700'
                  }`}>#{idx + 1}</div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-gray-800 truncate">{u.name}</h4>
                    <p className="text-[11px] text-gray-500">{u.referralCode} · {u.signups} sign-ups</p>
                  </div>
                </div>
                <span className="text-xs font-black text-emerald-600 whitespace-nowrap">{num(u.totalPointsEarned)} pts</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">No referrals yet.</p>
        )}
      </div>
    </div>
  </div>
);

// ─── Payout request detail modal ─────────────────────────────────────────────
const PayoutModal = ({ id, onClose, onChanged, showToast }) => {
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState(null); // 'pay' | 'reject'
  const [payForm, setPayForm] = useState({ transactionRef: '', paymentMode: '', note: '' });
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    adminReferralService.getRedemptionDetail(id)
      .then(res => {
        setDetail(res.data.data);
        setPayForm(f => ({ ...f, paymentMode: res.data.data.request.method === 'UPI' ? 'UPI' : 'NEFT/IMPS' }));
      })
      .catch(err => setError(err.response?.data?.message || 'Could not load request'));
  }, [id]);

  const run = async (fn, okMsg) => {
    setBusy(true);
    setError('');
    try {
      const res = await fn();
      showToast(res.data?.message || okMsg);
      onChanged();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const copy = (text) => { navigator.clipboard?.writeText(text); showToast('Copied'); };

  const r = detail?.request;
  const u = r?.user || {};
  const open = r && ['pending', 'approved'].includes(r.status);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-black text-gray-900">Payout Request</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"><X size={18} /></button>
        </div>

        {!detail ? (
          <div className="p-10 text-center text-gray-400">{error || <RefreshCw className="animate-spin inline" />}</div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Amount + status */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-white border border-emerald-100">
              <div>
                <p className="text-3xl font-black text-emerald-700">{inr(r.amount)}</p>
                <p className="text-xs font-semibold text-gray-500">{num(r.points)} points × ₹{r.rupeesPerPoint} · requested {fmtDateTime(r.createdAt)}</p>
              </div>
              <StatusPill status={r.status} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Member */}
              <div className="p-4 rounded-2xl border border-gray-100 space-y-1.5 text-sm">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1">Member</p>
                <p className="font-black text-gray-900">{u.name}</p>
                <p className="text-gray-600">{u.phone}{u.email ? ` · ${u.email}` : ''}</p>
                <p className="text-gray-600">Code: <b>{u.referralCode}</b>{u.city ? ` · ${u.city}` : ''}</p>
                <p className="text-gray-600">Account: <b className="capitalize">{u.accountStatus}</b> · Verification: <b className="capitalize">{u.verificationStatus}</b></p>
                <p className="text-gray-600">Joined {fmtDate(u.createdAt)}</p>
              </div>

              {/* Pay to */}
              <div className="p-4 rounded-2xl border border-gray-100 space-y-1.5 text-sm">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  {r.method === 'UPI' ? <Smartphone size={12} /> : <Building2 size={12} />} Pay to ({r.method === 'UPI' ? 'UPI' : 'Bank'})
                </p>
                <p className="font-black text-gray-900">{r.accountHolderName}</p>
                {r.method === 'UPI' ? (
                  <p className="flex items-center gap-2 text-gray-700 font-mono">{r.upiId} <button onClick={() => copy(r.upiId)} className="text-brand-primary"><Copy size={14} /></button></p>
                ) : (
                  <>
                    <p className="text-gray-700">{r.bankName || 'Bank'}</p>
                    <p className="flex items-center gap-2 text-gray-700 font-mono">A/c {r.accountNumber} <button onClick={() => copy(r.accountNumber)} className="text-brand-primary"><Copy size={14} /></button></p>
                    <p className="flex items-center gap-2 text-gray-700 font-mono">IFSC {r.ifscCode} <button onClick={() => copy(r.ifscCode)} className="text-brand-primary"><Copy size={14} /></button></p>
                  </>
                )}
                {r.transactionRef && <p className="text-emerald-700 font-semibold">Paid · Ref {r.transactionRef} · {fmtDate(r.paidAt)}</p>}
                {r.rejectionReason && <p className="text-rose-600 font-semibold">Rejected: {r.rejectionReason}</p>}
              </div>
            </div>

            {/* Verification: where the points came from */}
            <div className="p-4 rounded-2xl border border-gray-100">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-3">Points check</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-2.5 rounded-xl bg-gray-50"><p className="text-lg font-black text-gray-900">{num(detail.totalPointsEarned)}</p><p className="text-[10px] font-bold text-gray-500 uppercase">Earned (lifetime)</p></div>
                <div className="p-2.5 rounded-xl bg-gray-50"><p className="text-lg font-black text-gray-900">{num(u.pointsRedeemed)}</p><p className="text-[10px] font-bold text-gray-500 uppercase">Already paid</p></div>
                <div className="p-2.5 rounded-xl bg-gray-50"><p className="text-lg font-black text-gray-900">{num(u.pointsBalance)}</p><p className="text-[10px] font-bold text-gray-500 uppercase">Balance left</p></div>
                <div className="p-2.5 rounded-xl bg-gray-50"><p className="text-lg font-black text-gray-900">{num(detail.referredUsers.length)}</p><p className="text-[10px] font-bold text-gray-500 uppercase">Members referred</p></div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {detail.earnings.map(e => (
                  <span key={e._id} className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${EVENT_STYLE[e._id] || ''}`}>
                    {e._id}: {e.count} × → {num(e.points)} pts
                  </span>
                ))}
              </div>
              {detail.totalPointsEarned < (u.pointsRedeemed || 0) + r.points && (
                <p className="mt-3 text-xs font-bold text-rose-600 flex items-center gap-1">
                  <AlertCircle size={14} /> Paid + requested points are more than the points earned — check before paying.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-gray-100">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Members they referred</p>
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-50 text-sm">
                  {detail.referredUsers.length === 0 && <p className="text-gray-400 text-xs py-2">None</p>}
                  {detail.referredUsers.map(m => (
                    <div key={m._id} className="py-1.5 flex justify-between gap-2">
                      <span className="font-semibold text-gray-800 truncate">{m.name} <span className="text-gray-400 font-normal">{m.phone}</span></span>
                      <span className="text-[11px] text-gray-500 capitalize whitespace-nowrap">{m.verificationStatus} · {fmtDate(m.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 rounded-2xl border border-gray-100">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Earlier payouts</p>
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-50 text-sm">
                  {detail.previousPayouts.length === 0 && <p className="text-gray-400 text-xs py-2">None</p>}
                  {detail.previousPayouts.map(p => (
                    <div key={p._id} className="py-1.5 flex justify-between items-center gap-2">
                      <span className="font-semibold text-gray-800">{inr(p.amount)} <span className="text-gray-400 font-normal text-xs">{fmtDate(p.createdAt)}</span></span>
                      <StatusPill status={p.status} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* History */}
            {r.history?.length > 0 && (
              <div className="p-4 rounded-2xl border border-gray-100">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">History</p>
                <ol className="space-y-1.5 text-xs text-gray-600">
                  {r.history.map((h, i) => (
                    <li key={i}><b className="capitalize">{h.status}</b> — {h.note} <span className="text-gray-400">({h.by?.name || 'system'}, {fmtDateTime(h.at)})</span></li>
                  ))}
                </ol>
              </div>
            )}

            {error && <p className="text-sm font-bold text-rose-600">{error}</p>}

            {/* Actions */}
            {open && (
              <div className="space-y-3 border-t border-gray-100 pt-4">
                {action === 'pay' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input placeholder="Transaction / UTR no. *" value={payForm.transactionRef} onChange={e => setPayForm({ ...payForm, transactionRef: e.target.value })} className={fieldCls} />
                    <input placeholder="Payment mode (UPI, NEFT...)" value={payForm.paymentMode} onChange={e => setPayForm({ ...payForm, paymentMode: e.target.value })} className={fieldCls} />
                    <input placeholder="Note (optional)" value={payForm.note} onChange={e => setPayForm({ ...payForm, note: e.target.value })} className={fieldCls} />
                  </div>
                ) : action === 'reject' ? (
                  <input placeholder="Reason for rejecting (shown to member) *" value={reason} onChange={e => setReason(e.target.value)} className={fieldCls} />
                ) : null}

                <div className="flex flex-wrap justify-end gap-2">
                  {action ? (
                    <>
                      <button onClick={() => setAction(null)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600">Back</button>
                      {action === 'pay' ? (
                        <button disabled={busy || !payForm.transactionRef.trim()} onClick={() => run(() => adminReferralService.markRedemptionPaid(id, payForm), 'Marked as paid')} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50">
                          Confirm Paid {inr(r.amount)}
                        </button>
                      ) : (
                        <button disabled={busy || !reason.trim()} onClick={() => run(() => adminReferralService.rejectRedemption(id, { reason }), 'Rejected')} className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold disabled:opacity-50">
                          Confirm Reject (points go back)
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button onClick={() => setAction('reject')} className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 text-sm font-bold hover:bg-rose-50">Reject</button>
                      {r.status === 'pending' && (
                        <button disabled={busy} onClick={() => run(() => adminReferralService.approveRedemption(id, {}), 'Approved')} className="px-4 py-2.5 rounded-xl border border-blue-200 text-blue-700 text-sm font-bold hover:bg-blue-50 disabled:opacity-50">Approve</button>
                      )}
                      <button onClick={() => setAction('pay')} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700">Mark as Paid</button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Payout requests tab ─────────────────────────────────────────────────────
const PayoutsTab = ({ showToast, onChanged }) => {
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ list: [], counts: {}, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminReferralService.getRedemptions({ status, search, method, page, limit: 20 });
      setData({ list: res.data.data || [], counts: res.data.counts || {}, pages: res.data.pagination?.pages || 1 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [status, search, method, page]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const exportCsv = async () => {
    const res = await adminReferralService.getRedemptions({ status, search, method, page: 1, limit: 5000 });
    downloadCsv(`payout-requests-${status}.csv`,
      ['Requested', 'Member', 'Phone', 'Referral Code', 'Points', 'Amount (₹)', 'Method', 'Account Holder', 'UPI ID', 'Bank', 'Account No', 'IFSC', 'Status', 'Transaction Ref', 'Paid On', 'Rejection Reason'],
      (res.data.data || []).map(r => [fmtDateTime(r.createdAt), r.user?.name, r.user?.phone, r.user?.referralCode, r.points, r.amount, r.method,
        r.accountHolderName, r.upiId, r.bankName, r.accountNumber, r.ifscCode, r.status, r.transactionRef, r.paidAt ? fmtDate(r.paidAt) : '', r.rejectionReason]));
  };

  const tabs = ['pending', 'approved', 'paid', 'rejected', 'cancelled', 'all'];

  return (
    <div className={`${card} p-6 space-y-5`}>
      <div className="flex flex-wrap gap-2">
        {tabs.map(t => (
          <button key={t} onClick={() => { setStatus(t); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold capitalize border transition-all ${
              status === t ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>
            {t}{t !== 'all' && data.counts[t] ? ` (${data.counts[t]})` : ''}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search member name, phone, code, UPI, account no., UTR..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className={`${fieldCls} pl-9`} />
        </div>
        <select value={method} onChange={e => { setMethod(e.target.value); setPage(1); }} className={`${fieldCls} md:w-44`}>
          <option value="all">All methods</option>
          <option value="UPI">UPI</option>
          <option value="BANK">Bank</option>
        </select>
        <button onClick={exportCsv} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50">
          <Download size={15} /> Export
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-500">
              <th className="py-3 px-4">Member</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Pay To</th>
              <th className="py-3 px-4">Requested</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan="6" className="py-10 text-center text-gray-400"><RefreshCw size={18} className="animate-spin inline mr-2" />Loading...</td></tr>
            ) : data.list.length === 0 ? (
              <tr><td colSpan="6" className="py-10 text-center text-gray-400">No {status !== 'all' ? status : ''} payout requests.</td></tr>
            ) : data.list.map(r => (
              <tr key={r._id} className="hover:bg-gray-50/60">
                <td className="py-3 px-4">
                  <div className="font-bold text-gray-800">{r.user?.name || '—'}</div>
                  <div className="text-[11px] text-gray-500">{r.user?.phone} · {r.user?.referralCode}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-black text-emerald-700">{inr(r.amount)}</div>
                  <div className="text-[11px] text-gray-500">{num(r.points)} pts</div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-gray-700">{r.method === 'UPI' ? r.upiId : `${r.bankName || 'Bank'} ••${String(r.accountNumber).slice(-4)}`}</div>
                  <div className="text-[11px] text-gray-500">{r.accountHolderName}</div>
                </td>
                <td className="py-3 px-4 text-xs text-gray-500">{fmtDateTime(r.createdAt)}</td>
                <td className="py-3 px-4"><StatusPill status={r.status} /></td>
                <td className="py-3 px-4 text-right">
                  <button onClick={() => setOpenId(r._id)} className={`px-3.5 py-1.5 rounded-lg text-xs font-bold ${
                    ['pending', 'approved'].includes(r.status) ? 'bg-brand-primary text-white hover:bg-brand-primary/90' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                    {['pending', 'approved'].includes(r.status) ? 'Review & Pay' : 'View'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pager page={page} pages={data.pages} onChange={setPage} />

      {openId && <PayoutModal id={openId} onClose={() => setOpenId(null)} onChanged={() => { load(); onChanged(); }} showToast={showToast} />}
    </div>
  );
};

// ─── Event log tab ───────────────────────────────────────────────────────────
const EventsTab = () => {
  const [events, setEvents] = useState([]);
  const [eventType, setEventType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const params = { eventType, search, startDate, endDate };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminReferralService.getAllReferrals({ eventType, search, startDate, endDate, page, limit: 20 });
      setEvents(res.data.data || []);
      setPages(res.data.pagination?.pages || 1);
      setTotal(res.data.pagination?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [eventType, search, startDate, endDate, page]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const exportCsv = async () => {
    const res = await adminReferralService.getAllReferrals({ ...params, page: 1, limit: 5000 });
    downloadCsv('referral-events.csv',
      ['Date', 'Event', 'Referrer', 'Referrer Phone', 'Referrer Code', 'Referred Member', 'Referred Phone', 'Points'],
      (res.data.data || []).map(e => [fmtDateTime(e.createdAt), e.isWelcomeBonus ? 'WELCOME BONUS' : e.eventType,
        e.isWelcomeBonus ? '—' : e.referrer?.name, e.isWelcomeBonus ? '' : e.referrer?.phone, e.isWelcomeBonus ? '' : e.referrer?.referralCode,
        e.referredUser?.name, e.referredUser?.phone, e.pointsAwarded]));
  };

  const reset = (fn) => (e) => { fn(e.target.value); setPage(1); };

  return (
    <div className={`${card} p-6 space-y-5`}>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="relative md:col-span-2">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search name, phone or referral code..." value={search} onChange={reset(setSearch)} className={`${fieldCls} pl-9`} />
        </div>
        <select value={eventType} onChange={reset(setEventType)} className={fieldCls}>
          <option value="ALL">All event types</option>
          <option value="REGISTRATION">Registration</option>
          <option value="SUBSCRIPTION">Subscription</option>
          <option value="MEMBERSHIP">Membership</option>
          <option value="DONATION">Donation</option>
        </select>
        <input type="date" value={startDate} onChange={reset(setStartDate)} className={fieldCls} title="From" />
        <input type="date" value={endDate} onChange={reset(setEndDate)} className={fieldCls} title="To" />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-500">{num(total)} events</p>
        <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50">
          <Download size={15} /> Export
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-500">
              <th className="py-3 px-4">Event</th>
              <th className="py-3 px-4">Referrer (code owner)</th>
              <th className="py-3 px-4">Referred member</th>
              <th className="py-3 px-4">Points</th>
              <th className="py-3 px-4">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan="5" className="py-10 text-center text-gray-400"><RefreshCw size={18} className="animate-spin inline mr-2" />Loading...</td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan="5" className="py-10 text-center text-gray-400">No referral events found.</td></tr>
            ) : events.map(item => (
              <tr key={item._id} className="hover:bg-gray-50/60">
                <td className="py-3 px-4"><EventBadge item={item} /></td>
                <td className="py-3 px-4">
                  {item.isWelcomeBonus ? (
                    <span className="text-xs text-gray-400">— (new member's own bonus)</span>
                  ) : (
                    <>
                      <div className="font-bold text-gray-800">{item.referrer?.name || 'Unknown'}</div>
                      <div className="text-[11px] text-gray-500">{item.referrer?.phone} · {item.referrer?.referralCode}</div>
                    </>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="font-bold text-gray-800">{item.referredUser?.name || 'Member'}</div>
                  <div className="text-[11px] text-gray-500">{item.referredUser?.phone}</div>
                </td>
                <td className="py-3 px-4 font-black text-emerald-600">+{num(item.pointsAwarded)} pts</td>
                <td className="py-3 px-4 text-xs text-gray-500">{fmtDateTime(item.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pager page={page} pages={pages} onChange={setPage} />
    </div>
  );
};

// ─── Reports tab ─────────────────────────────────────────────────────────────
const Bars = ({ rows, valueKey, color, format = num }) => {
  const max = Math.max(1, ...rows.map(r => r[valueKey] || 0));
  return (
    <div className="flex items-end gap-1.5 h-40 pt-4">
      {rows.map(r => (
        <div key={r.month} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${r.month}: ${format(r[valueKey])}`}>
          <span className="text-[9px] font-bold text-gray-500 truncate">{r[valueKey] ? format(r[valueKey]) : ''}</span>
          <div className={`w-full rounded-t-md ${color}`} style={{ height: `${((r[valueKey] || 0) / max) * 100}%`, minHeight: r[valueKey] ? 4 : 1 }} />
          <span className="text-[9px] font-semibold text-gray-400 truncate">{r.month}</span>
        </div>
      ))}
    </div>
  );
};

const ReportsTab = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminReferralService.getReports({ startDate, endDate });
      setReport(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const s = report?.summary;
  const rangeLabel = startDate || endDate ? `${startDate || 'start'} to ${endDate || 'today'}` : 'all time';

  const exportMonthly = () => downloadCsv('referral-monthly-report.csv',
    ['Month', 'Referral events', 'New sign-ups', 'Points awarded', 'Payouts (count)', 'Payouts (₹)'],
    report.monthly.map(m => [m.month, m.events, m.signups, m.pointsAwarded, m.payoutCount, m.payoutAmount]));

  const exportTop = () => downloadCsv('top-referrers.csv',
    ['Rank', 'Name', 'Phone', 'Referral Code', 'Sign-ups', 'Subscriptions', 'Donations', 'Points earned', 'Points paid out', 'Balance'],
    report.topReferrers.map((u, i) => [i + 1, u.name, u.phone, u.referralCode, u.signups, u.subscriptions, u.donations, u.totalPointsEarned, u.pointsRedeemed, u.pointsBalance]));

  const exportSummary = () => downloadCsv('referral-summary.csv', ['Metric', 'Value'], [
    ['Period', rangeLabel],
    ['Referred sign-ups', s.referredSignups],
    ['Active referrers', s.uniqueReferrers],
    ['Referred members who bought a subscription', s.convertedToPaid],
    ['Conversion rate %', s.conversionRate],
    ['Points to referrers', s.pointsToReferrers],
    ['Welcome bonus points', s.welcomeBonusPoints],
    ...Object.entries(report.events).map(([k, v]) => [`${k} events / points`, `${v.count} / ${v.points}`]),
    ...Object.entries(report.payouts).map(([k, v]) => [`Payouts ${k} (count / ₹)`, `${v.count} / ${v.amount}`]),
    ['Unredeemed points (all members)', s.outstandingPoints],
    ['Unredeemed value ₹', s.outstandingAmount],
  ]);

  return (
    <div className="space-y-6">
      <div className={`${card} p-4 flex flex-col md:flex-row md:items-end gap-3`}>
        <label className="flex-1 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">From</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={fieldCls} />
        </label>
        <label className="flex-1 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">To</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={fieldCls} />
        </label>
        {(startDate || endDate) && (
          <button onClick={() => { setStartDate(''); setEndDate(''); }} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">All time</button>
        )}
        {report && (
          <button onClick={exportSummary} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-bold">
            <Download size={15} /> Summary CSV
          </button>
        )}
      </div>

      {loading || !report ? (
        <div className="py-16 text-center text-gray-400"><RefreshCw className="animate-spin inline mr-2" />Loading report...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Metric icon={Users} tone="bg-purple-50 text-purple-600" label="Referred sign-ups" value={num(s.referredSignups)} sub={rangeLabel} />
            <Metric icon={Award} tone="bg-amber-50 text-amber-600" label="Active referrers" value={num(s.uniqueReferrers)} />
            <Metric icon={Crown} tone="bg-violet-50 text-violet-600" label="Became paid subscribers" value={num(s.convertedToPaid)} sub={`${s.conversionRate}% of referred sign-ups`} />
            <Metric icon={TrendingUp} tone="bg-emerald-50 text-emerald-600" label="Points to referrers" value={`${num(s.pointsToReferrers)} pts`} sub={`+ ${num(s.welcomeBonusPoints)} welcome bonus pts`} />
            <Metric icon={IndianRupee} tone="bg-blue-50 text-blue-600" label="Paid out" value={inr(report.payouts.paid.amount)} sub={`${num(report.payouts.paid.count)} payments`} />
            <Metric icon={Clock} tone="bg-amber-50 text-amber-600" label="Awaiting payment" value={inr(report.payouts.pending.amount + report.payouts.approved.amount)} sub={`${num(report.payouts.pending.count + report.payouts.approved.count)} requests`} />
            <Metric icon={XCircle} tone="bg-rose-50 text-rose-600" label="Rejected" value={inr(report.payouts.rejected.amount)} sub={`${num(report.payouts.rejected.count)} requests`} />
            <Metric icon={Gift} tone="bg-pink-50 text-pink-600" label="Unredeemed (liability)" value={inr(s.outstandingAmount)} sub={`${num(s.outstandingPoints)} pts held by members`} />
          </div>

          <div className={`${card} p-6`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-black text-gray-900">Monthly Trend</h3>
              <button onClick={exportMonthly} className="flex items-center gap-1.5 text-xs font-bold text-brand-primary"><Download size={14} /> CSV</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div><p className="text-xs font-bold text-gray-500">New referred sign-ups</p><Bars rows={report.monthly} valueKey="signups" color="bg-purple-400" /></div>
              <div><p className="text-xs font-bold text-gray-500">Points awarded</p><Bars rows={report.monthly} valueKey="pointsAwarded" color="bg-emerald-400" /></div>
              <div><p className="text-xs font-bold text-gray-500">Paid out (₹)</p><Bars rows={report.monthly} valueKey="payoutAmount" color="bg-blue-400" format={inr} /></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`${card} p-6`}>
              <h3 className="text-base font-black text-gray-900 mb-4">Points by Event Type</h3>
              <table className="w-full text-sm">
                <thead><tr className="text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100"><th className="py-2 text-left">Event</th><th className="py-2 text-right">Count</th><th className="py-2 text-right">Points</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {Object.entries(report.events).map(([k, v]) => (
                    <tr key={k}><td className="py-2.5"><span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${EVENT_STYLE[k]}`}>{k}</span></td><td className="py-2.5 text-right font-bold">{num(v.count)}</td><td className="py-2.5 text-right font-black text-emerald-600">{num(v.points)}</td></tr>
                  ))}
                  <tr><td className="py-2.5"><span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${EVENT_STYLE.WELCOME}`}>WELCOME BONUS</span></td><td className="py-2.5 text-right font-bold">{num(s.welcomeBonusCount)}</td><td className="py-2.5 text-right font-black text-emerald-600">{num(s.welcomeBonusPoints)}</td></tr>
                </tbody>
              </table>
            </div>
            <div className={`${card} p-6`}>
              <h3 className="text-base font-black text-gray-900 mb-4">Payouts</h3>
              <table className="w-full text-sm">
                <thead><tr className="text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100"><th className="py-2 text-left">Status</th><th className="py-2 text-right">Requests</th><th className="py-2 text-right">Points</th><th className="py-2 text-right">Amount</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {Object.entries(report.payouts).map(([k, v]) => (
                    <tr key={k}><td className="py-2.5"><StatusPill status={k} /></td><td className="py-2.5 text-right font-bold">{num(v.count)}</td><td className="py-2.5 text-right">{num(v.points)}</td><td className="py-2.5 text-right font-black">{inr(v.amount)}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-500 mt-3">
                Paid by UPI: <b>{inr(report.payoutsByMethod.UPI?.amount)}</b> ({num(report.payoutsByMethod.UPI?.count)}) · Bank: <b>{inr(report.payoutsByMethod.BANK?.amount)}</b> ({num(report.payoutsByMethod.BANK?.count)})
              </p>
            </div>
          </div>

          <div className={`${card} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-gray-900">Top Referrers</h3>
              <button onClick={exportTop} className="flex items-center gap-1.5 text-xs font-bold text-brand-primary"><Download size={14} /> CSV</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead><tr className="text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <th className="py-2 px-3 text-left">#</th><th className="py-2 px-3 text-left">Member</th><th className="py-2 px-3 text-right">Sign-ups</th><th className="py-2 px-3 text-right">Subscriptions</th><th className="py-2 px-3 text-right">Donations</th><th className="py-2 px-3 text-right">Earned</th><th className="py-2 px-3 text-right">Paid out</th><th className="py-2 px-3 text-right">Balance</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {report.topReferrers.length === 0 && <tr><td colSpan="8" className="py-8 text-center text-gray-400">No referrals in this period.</td></tr>}
                  {report.topReferrers.map((u, i) => (
                    <tr key={u._id}>
                      <td className="py-2.5 px-3 font-bold text-gray-400">{i + 1}</td>
                      <td className="py-2.5 px-3"><div className="font-bold text-gray-800">{u.name}</div><div className="text-[11px] text-gray-500">{u.phone} · {u.referralCode}</div></td>
                      <td className="py-2.5 px-3 text-right">{num(u.signups)}</td>
                      <td className="py-2.5 px-3 text-right">{num(u.subscriptions)}</td>
                      <td className="py-2.5 px-3 text-right">{num(u.donations)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-600">{num(u.totalPointsEarned)}</td>
                      <td className="py-2.5 px-3 text-right">{num(u.pointsRedeemed)}</td>
                      <td className="py-2.5 px-3 text-right">{num(u.pointsBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview', label: 'Overview & Settings', icon: Sliders },
  { id: 'payouts', label: 'Payout Requests', icon: Wallet },
  { id: 'events', label: 'Event Log', icon: Calendar },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
];

export const AdminReferralManagement = () => {
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStatsAndConfig = useCallback(async () => {
    try {
      const [statsRes, configRes] = await Promise.all([
        adminReferralService.getReferralStats(),
        adminReferralService.getReferralConfig()
      ]);
      if (statsRes.data?.success) setStats(statsRes.data.data);
      if (configRes.data?.success) setConfig(configRes.data.data);
    } catch (err) {
      console.error('Error fetching admin referral config/stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatsAndConfig(); }, [fetchStatsAndConfig]);

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const res = await adminReferralService.updateReferralConfig(config);
      setConfig(res.data.data);
      showToast('Referral settings saved.');
      fetchStatsAndConfig();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleProgram = async () => {
    const next = !config.isActive;
    setConfig(prev => ({ ...prev, isActive: next }));
    try {
      await adminReferralService.updateReferralConfig({ isActive: next });
      showToast(`Referral program ${next ? 'turned ON' : 'turned OFF'}.`);
    } catch {
      setConfig(prev => ({ ...prev, isActive: !next }));
      showToast('Failed to change program status', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-gray-500 font-bold">
        <RefreshCw className="animate-spin text-brand-primary mr-2" size={22} /> Loading Referrals & Rewards...
      </div>
    );
  }

  const pendingCount = (stats?.payouts?.pending?.count || 0) + (stats?.payouts?.approved?.count || 0);

  return (
    <div className="space-y-6 pb-12">
      {toast && (
        <div className={`fixed top-6 right-6 z-[70] flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl border text-sm font-bold ${
          toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} {toast.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
            <Gift className="text-brand-primary" size={26} /> Referrals & Rewards
          </h1>
          <p className="text-sm text-gray-500 mt-1">Set point rewards, pay out redemption requests and see every referral report.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchStatsAndConfig} className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50" title="Refresh"><RefreshCw size={16} /></button>
          <button onClick={handleToggleProgram} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 border ${
            config.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            <Power size={14} /> Program {config.isActive ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div className="flex overflow-x-auto no-scrollbar border-b border-gray-100">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-5 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-all ${
              active ? 'text-brand-primary border-brand-primary' : 'text-gray-500 border-transparent hover:text-gray-800'
            }`}>
              <Icon size={16} /> {t.label}
              {t.id === 'payouts' && pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">{pendingCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && <OverviewTab stats={stats} config={config} setConfig={setConfig} onSave={handleSave} saving={saving} />}
      {tab === 'payouts' && <PayoutsTab showToast={showToast} onChanged={fetchStatsAndConfig} />}
      {tab === 'events' && <EventsTab />}
      {tab === 'reports' && <ReportsTab />}
    </div>
  );
};

export default AdminReferralManagement;
