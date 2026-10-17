import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Crown, Loader2, BadgeCheck, Pin, X, CalendarDays } from 'lucide-react';
import { appSubscriptionService } from '../../../../core/api/matrimonialService';
import { loadRazorpayScript } from '../../../../core/utils/razorpayLoader';
import { authService } from '../../../../core/auth/authService';
import { useAuth } from '../../../../core/auth/useAuth';

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

// Perks of an App plan, in the words members see
const perksOf = (features = {}, customFeatures = []) => {
  const perks = [];
  if (features.proBadge !== false) perks.push({ icon: BadgeCheck, text: '✓ PRO badge on your profile & posts' });
  if (features.pinPostsPerMonth === -1) perks.push({ icon: Pin, text: 'Pin unlimited posts to the top of the feed' });
  else if (features.pinPostsPerMonth > 0) perks.push({ icon: Pin, text: `Pin ${features.pinPostsPerMonth} post${features.pinPostsPerMonth === 1 ? '' : 's'} a month to the top of the feed (24 h)` });
  (customFeatures || []).forEach(text => perks.push({ icon: Check, text }));
  return perks;
};

const STATE_LABEL = {
  active: 'Active', grace: 'Active', cancelled: 'Cancelled', expired: 'Expired',
  upcoming: 'Upcoming', payment_pending: 'Payment pending', payment_failed: 'Payment failed'
};

const AppMembershipPage = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const [plans, setPlans]         = useState([]);
  const [overview, setOverview]   = useState({ current: null, history: [] });
  const [loading, setLoading]     = useState(true);
  const [buyingId, setBuyingId]   = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [toast, setToast]         = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  // Pull the fresh profile so the PRO badge appears/disappears everywhere at once
  const refreshMe = useCallback(async () => {
    try {
      const res = await authService.getMe();
      if (res?.user) {
        try { localStorage.setItem('merisamaj_user', JSON.stringify(res.user)); } catch { /* storage full */ }
        setAuth?.(prev => ({ ...prev, user: res.user }));
      }
    } catch { /* keep the current profile */ }
  }, [setAuth]);

  const loadData = useCallback(async () => {
    try {
      const [plansRes, overviewRes] = await Promise.all([
        appSubscriptionService.listPlans(),
        appSubscriptionService.getOverview()
      ]);
      setPlans((plansRes.data?.data?.plans || []).filter(p => p.price > 0));
      setOverview(overviewRes.data?.data || { current: null, history: [] });
    } catch {
      showToast('Could not load membership plans.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleBuy = async (plan) => {
    setBuyingId(plan._id);
    try {
      const order = (await appSubscriptionService.initiatePurchase({ planId: plan._id })).data.data;
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded || !window.Razorpay || !order.razorpayOrderId) {
        // Never activate without a real payment
        showToast(sdkLoaded ? 'Could not start the payment. Please try again.' : 'Payment window failed to load. Check your internet connection.');
        setBuyingId(null);
        return;
      }
      new window.Razorpay({
        key: order.razorpayKeyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Apni Samaj Membership',
        description: plan.name,
        order_id: order.razorpayOrderId,
        handler: async (response) => {
          try {
            await appSubscriptionService.verifyAndActivate({
              gateway: 'razorpay',
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              planId: plan._id
            });
            showToast(`${plan.name} is active 🎉`);
            await Promise.all([loadData(), refreshMe()]);
          } catch (err) {
            showToast(err.response?.data?.message || 'Payment could not be verified.');
          } finally {
            setBuyingId(null);
          }
        },
        modal: { ondismiss: () => setBuyingId(null) },
        theme: { color: plan.themeColor || '#f43f5e' }
      }).open();
    } catch (err) {
      showToast(err.response?.data?.message || 'Payment failed. Please try again.');
      setBuyingId(null);
    }
  };

  const handleCancel = async () => {
    try {
      await appSubscriptionService.cancelSubscription({ reason: 'User requested cancellation' });
      setConfirmCancel(false);
      showToast('Membership cancelled. Your perks stay until the end date.');
      await Promise.all([loadData(), refreshMe()]);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel.');
    }
  };

  const { current, history } = overview;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg max-w-[90vw] text-center">{toast}</div>}

      <header className="sticky top-0 z-20 bg-white border-b border-slate-100 flex items-center gap-2 px-3 py-2.5">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100" aria-label="Back">
          <ArrowLeft size={19} className="text-slate-700" />
        </button>
        <h1 className="text-[15px] font-extrabold text-slate-900">Membership</h1>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-rose-500 animate-spin" /></div>
      ) : (
        <div className="px-4 pt-4 space-y-5 max-w-xl mx-auto">
          {/* Current plan */}
          {current ? (
            <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Crown size={18} className="shrink-0" />
                  <h2 className="text-sm font-extrabold truncate">{current.planName}</h2>
                </div>
                <span className="text-[10px] font-black uppercase bg-white/20 px-2 py-0.5 rounded-full shrink-0">
                  {current.status === 'cancelled' ? 'Cancelled' : 'Active'}
                </span>
              </div>
              <p className="text-[11px] text-white/90 mt-1.5 flex items-center gap-1">
                <CalendarDays size={12} /> {current.status === 'cancelled' ? 'Perks until' : 'Valid until'} {formatDate(current.endDate)} · {current.daysLeft} day{current.daysLeft === 1 ? '' : 's'} left
              </p>
              <div className="h-1.5 bg-white/25 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: `${Math.min(100, Math.round((current.daysLeft / current.totalDays) * 100))}%` }} />
              </div>
              <ul className="mt-3 space-y-1">
                {perksOf(current.features, current.features?.customFeatures).map(({ icon: Icon, text }, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11.5px] font-semibold"><Icon size={13} className="mt-0.5 shrink-0" /> {text}</li>
                ))}
              </ul>
              {current.features?.pinPostsPerMonth > 0 && (
                <p className="text-[10.5px] text-white/85 mt-2">Pins used this month: {current.pinsUsedThisMonth} of {current.features.pinPostsPerMonth}</p>
              )}
              {current.status !== 'cancelled' && (
                <button onClick={() => setConfirmCancel(true)} className="mt-3 text-[11px] font-bold underline text-white/90">Cancel membership</button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl p-4 bg-white border border-slate-200">
              <h2 className="text-sm font-extrabold text-slate-900">Become a PRO member</h2>
              <p className="text-[11.5px] text-slate-500 mt-1">Pick a plan from your Samaj to get a ✓ PRO badge and more.</p>
            </div>
          )}

          {/* Plans published by the Admin */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500">Plans</h3>
            {plans.length === 0 && (
              <p className="text-xs text-slate-500 bg-white border border-dashed border-slate-300 rounded-2xl p-5 text-center">
                No membership plans are available right now.
              </p>
            )}
            {plans.map(plan => {
              const color = plan.themeColor || '#f43f5e';
              return (
                <div key={plan._id} className="bg-white rounded-2xl border p-4 relative overflow-hidden" style={{ borderColor: plan.isFeatured ? color : '#e2e8f0' }}>
                  {(plan.badge || plan.isFeatured) && (
                    <span className="absolute top-0 right-0 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-bl-xl" style={{ backgroundColor: color }}>
                      {plan.badge || 'Popular'}
                    </span>
                  )}
                  <h4 className="text-sm font-extrabold text-slate-900 pr-16">{plan.name}</h4>
                  {plan.description && <p className="text-[11px] text-slate-500 mt-0.5">{plan.description}</p>}
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-xl font-black" style={{ color }}>₹{plan.price.toLocaleString('en-IN')}</span>
                    {plan.originalPrice > plan.price && <span className="text-xs text-slate-400 line-through">₹{plan.originalPrice.toLocaleString('en-IN')}</span>}
                    <span className="text-[11px] text-slate-500">/ {plan.durationInDays} days</span>
                  </div>
                  <ul className="mt-2.5 space-y-1">
                    {perksOf(plan.appFeatures, plan.customFeatures).map(({ icon: Icon, text }, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11.5px] text-slate-600 font-medium">
                        <Icon size={13} className="mt-0.5 shrink-0" style={{ color }} /> {text}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleBuy(plan)}
                    disabled={Boolean(buyingId) || Boolean(current)}
                    className="w-full mt-3 py-2.5 rounded-xl text-white text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50"
                    style={{ backgroundColor: color }}
                  >
                    {buyingId === plan._id && <Loader2 size={14} className="animate-spin" />}
                    {current ? 'You already have a plan' : `Get ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </section>

          {/* Purchase history */}
          {history.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500">History</h3>
              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
                {history.map(h => (
                  <div key={h._id} className="flex items-center justify-between gap-2 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{h.planName}</p>
                      <p className="text-[10.5px] text-slate-500">{formatDate(h.startDate)} – {formatDate(h.endDate)} · {h.pricePaid ? `₹${h.pricePaid.toLocaleString('en-IN')}` : 'Free (by Admin)'}</p>
                    </div>
                    <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${h.isCurrent ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      {STATE_LABEL[h.state] || h.state}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {confirmCancel && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmCancel(false)} />
          <div className="relative bg-white rounded-2xl p-5 w-full max-w-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">Cancel membership?</h3>
              <button onClick={() => setConfirmCancel(false)} aria-label="Close"><X size={17} className="text-slate-400" /></button>
            </div>
            <p className="text-xs text-slate-500">You keep your perks until {formatDate(current?.endDate)}. There is no refund.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmCancel(false)} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">Keep it</button>
              <button onClick={handleCancel} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold">Cancel membership</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppMembershipPage;
