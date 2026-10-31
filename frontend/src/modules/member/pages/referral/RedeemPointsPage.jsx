import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Smartphone, Coins, Loader2, CheckCircle2, Clock, XCircle, BadgeCheck, Ban } from 'lucide-react';
import { useReferral } from './ReferralContext';
import { memberReferralService } from '../../../../core/api/referralService';

const STATUS_STYLE = {
  pending:   { label: 'Pending review', cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: Clock },
  approved:  { label: 'Approved — payment soon', cls: 'bg-blue-50 text-blue-700 border-blue-200', Icon: BadgeCheck },
  paid:      { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 },
  rejected:  { label: 'Rejected', cls: 'bg-rose-50 text-rose-700 border-rose-200', Icon: XCircle },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500 border-slate-200', Icon: Ban },
};

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-[14px] font-semibold text-slate-800 outline-none focus:border-brand-primary focus:bg-white transition-all';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

const RedeemPointsPage = () => {
  const navigate = useNavigate();
  const { refreshReferralData } = useReferral();

  const [info, setInfo] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  const [points, setPoints] = useState('');
  const [method, setMethod] = useState('UPI');
  const [form, setForm] = useState({ accountHolderName: '', upiId: '', bankName: '', accountNumber: '', ifscCode: '' });

  const load = useCallback(async () => {
    try {
      const [infoRes, listRes] = await Promise.all([
        memberReferralService.getRedeemInfo(),
        memberReferralService.getMyRedemptions()
      ]);
      const data = infoRes.data?.data;
      setInfo(data);
      setRequests(listRes.data?.data || []);
      // Pre-fill the payout details used last time
      const last = data?.lastPayoutDetails || {};
      setForm(prev => ({
        accountHolderName: prev.accountHolderName || last.accountHolderName || '',
        upiId: prev.upiId || last.upiId || '',
        bankName: prev.bankName || last.bankName || '',
        accountNumber: prev.accountNumber || last.accountNumber || '',
        ifscCode: prev.ifscCode || last.ifscCode || ''
      }));
      if (last.method) setMethod(last.method);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Could not load your points. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const balance = info?.pointsBalance || 0;
  const rate = info?.rupeesPerPoint ?? 1;
  const minPoints = info?.minRedeemPoints ?? 500;
  const pointsNum = Math.floor(Number(points) || 0);
  const amount = Math.round(pointsNum * rate * 100) / 100;
  const canRequest = info?.redemptionEnabled && !info?.hasOpenRequest && balance >= minPoints;

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (pointsNum < minPoints) return setMessage({ type: 'error', text: `Minimum ${minPoints} points can be redeemed.` });
    if (pointsNum > balance) return setMessage({ type: 'error', text: 'You do not have enough points.' });

    setSubmitting(true);
    try {
      const res = await memberReferralService.createRedemption({ points: pointsNum, method, ...form });
      setMessage({ type: 'success', text: res.data?.message || 'Request sent!' });
      setPoints('');
      await load();
      refreshReferralData?.();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Could not send the request.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this request? The points will come back to your balance.')) return;
    try {
      const res = await memberReferralService.cancelRedemption(id);
      setMessage({ type: 'success', text: res.data?.message || 'Request cancelled.' });
      await load();
      refreshReferralData?.();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Could not cancel.' });
    }
  };

  return (
    <div className="bg-[#F8F7FC] min-h-screen pb-24 font-sans">
      {/* Header */}
      <div className="bg-white px-5 h-16 flex items-center border-b border-gray-150/40 sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-slate-800 active:scale-95 transition-transform">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-[17px] font-black text-slate-800 ml-3">Redeem Points</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-primary" size={28} /></div>
      ) : (
        <div className="p-5 space-y-5 max-w-xl mx-auto">

          {/* Balance */}
          <div className="relative rounded-[24px] overflow-hidden shadow-[0_8px_24px_rgba(16,185,129,0.15)] bg-gradient-to-br from-[#065F46] via-[#047857] to-[#059669]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2" />
            <div className="relative z-10 p-6">
              <div className="flex items-center gap-2 mb-2">
                <Coins size={16} className="text-emerald-200" />
                <p className="text-emerald-100 text-[12px] font-bold uppercase tracking-wider">Available Points</p>
              </div>
              <h2 className="text-white text-4xl font-black leading-none">{balance.toLocaleString('en-IN')}</h2>
              <div className="mt-4 pt-4 border-t border-emerald-500/30 flex justify-between items-center">
                <span className="text-emerald-200/80 text-[12px] font-semibold uppercase tracking-wider">Cash value</span>
                <span className="text-white text-xl font-black">₹{(Math.round(balance * rate * 100) / 100).toLocaleString('en-IN')}</span>
              </div>
              <p className="text-emerald-100/80 text-[11px] font-semibold mt-2">
                1 point = ₹{rate} · Minimum {minPoints.toLocaleString('en-IN')} points · Paid out so far: {(info?.pointsRedeemed || 0).toLocaleString('en-IN')} pts
              </p>
            </div>
          </div>

          {message && (
            <div className={`rounded-2xl px-4 py-3 text-[13px] font-semibold border ${
              message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              {message.text}
            </div>
          )}

          {/* Why the form is unavailable */}
          {!info?.redemptionEnabled ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-[13px] font-semibold text-amber-800">
              Redemption is paused by the admin right now. Your points are safe — please check back later.
            </div>
          ) : info?.hasOpenRequest ? (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-[13px] font-semibold text-blue-800">
              Your redemption request is being processed. You can send a new one after it's completed.
            </div>
          ) : balance < minPoints ? (
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 text-[13px] font-semibold text-slate-600">
              You need at least {minPoints.toLocaleString('en-IN')} points to redeem. Earn {(minPoints - balance).toLocaleString('en-IN')} more by inviting members with your referral code!
            </div>
          ) : null}

          {/* Request form */}
          {canRequest && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100/50">
                <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider block mb-3">Points to Redeem</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={minPoints}
                  max={balance}
                  required
                  placeholder={`Min ${minPoints}, max ${balance}`}
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  className={inputCls}
                />
                <div className="flex items-center justify-between mt-2">
                  <button type="button" onClick={() => setPoints(String(balance))} className="text-[12px] font-bold text-brand-primary">
                    Use all {balance.toLocaleString('en-IN')} points
                  </button>
                  {pointsNum > 0 && <span className="text-[13px] font-black text-emerald-700">You get ₹{amount.toLocaleString('en-IN')}</span>}
                </div>
              </div>

              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100/50 space-y-3">
                <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider block">Receive payment by</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'UPI', icon: Smartphone, label: 'UPI' },
                    { id: 'BANK', icon: Building2, label: 'Bank Transfer' }
                  ].map(opt => {
                    const Icon = opt.icon;
                    const active = method === opt.id;
                    return (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => setMethod(opt.id)}
                        className={`flex items-center gap-2 p-3.5 rounded-xl border-2 text-[14px] font-bold transition-all ${
                          active ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-slate-100 text-slate-600'
                        }`}
                      >
                        <Icon size={16} /> {opt.label}
                      </button>
                    );
                  })}
                </div>

                <input required placeholder="Account holder name" value={form.accountHolderName} onChange={set('accountHolderName')} className={inputCls} />
                {method === 'UPI' ? (
                  <input required placeholder="UPI ID (e.g. name@okaxis)" value={form.upiId} onChange={set('upiId')} className={inputCls} autoCapitalize="none" />
                ) : (
                  <>
                    <input placeholder="Bank name" value={form.bankName} onChange={set('bankName')} className={inputCls} />
                    <input required inputMode="numeric" placeholder="Account number" value={form.accountNumber} onChange={set('accountNumber')} className={inputCls} />
                    <input required placeholder="IFSC code (e.g. SBIN0001234)" value={form.ifscCode} onChange={e => setForm(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))} className={`${inputCls} uppercase`} />
                  </>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-brand-primary text-white rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Coins size={16} />}
                {submitting ? 'Sending…' : `Request ₹${amount.toLocaleString('en-IN')} payout`}
              </button>
              <p className="text-[11px] text-slate-400 text-center">
                The points are held now. The admin verifies your request and sends the money; if it's rejected, the points come back.
              </p>
            </form>
          )}

          {/* My requests */}
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100/50">
            <h3 className="text-[14px] font-black text-slate-800 mb-3">My Redemption Requests</h3>
            {requests.length === 0 ? (
              <p className="text-[12px] text-slate-400 py-4 text-center">No requests yet.</p>
            ) : (
              <div className="space-y-3">
                {requests.map(r => {
                  const st = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
                  const StIcon = st.Icon;
                  return (
                    <div key={r._id} className="border border-slate-100 rounded-2xl p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[15px] font-black text-slate-800">₹{Number(r.amount).toLocaleString('en-IN')}</p>
                          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                            {r.points.toLocaleString('en-IN')} pts · {r.method === 'UPI' ? r.upiId : `A/c ••••${String(r.accountNumber).slice(-4)}`} · {fmtDate(r.createdAt)}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10.5px] font-bold whitespace-nowrap ${st.cls}`}>
                          <StIcon size={12} /> {st.label}
                        </span>
                      </div>
                      {r.status === 'paid' && (
                        <p className="text-[11.5px] text-emerald-700 font-semibold mt-2">
                          Paid on {fmtDate(r.paidAt)}{r.transactionRef ? ` · Ref: ${r.transactionRef}` : ''}
                        </p>
                      )}
                      {r.status === 'rejected' && r.rejectionReason && (
                        <p className="text-[11.5px] text-rose-600 font-semibold mt-2">Reason: {r.rejectionReason}</p>
                      )}
                      {r.status === 'pending' && (
                        <button onClick={() => handleCancel(r._id)} className="text-[12px] font-bold text-rose-500 mt-2">
                          Cancel request
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RedeemPointsPage;
