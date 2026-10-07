import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Check, CreditCard, ShieldCheck, CheckCircle2,
  QrCode, Landmark, Sparkles, X, Heart, RefreshCw,
  Star, ShieldAlert, FileText, Loader2, Crown, Download,
  ChevronRight, Info, HelpCircle
} from 'lucide-react';
import { matrimonialSubscriptionService } from '../../../../core/api/matrimonialService';
import { loadRazorpayScript } from '../../../../core/utils/razorpayLoader';

// ─── Feature Keys for Matrix ──────────────────────────────────────────────────
const FEATURE_ROWS = [
  { label: 'Profile Views / Day', key: 'profileViewsPerDay', type: 'value', tooltip: 'Number of member profiles you can view daily (-1 for unlimited).' },
  { label: 'Interests / Month', key: 'interestLimit', type: 'value', tooltip: 'Number of interests you can send monthly (-1 for unlimited).' },
  { label: 'Chat Access', key: 'chat', type: 'boolean', tooltip: 'Enables real-time messaging with your accepted matches.' },
  { label: 'Advanced Filters', key: 'advancedFilters', type: 'boolean', tooltip: 'Search with more detailed filters.' },
  { label: 'Visitor History', key: 'visitorHistory', type: 'boolean', tooltip: 'See who viewed your profile.' },
  { label: 'Contact Details Access', key: 'contactDetailsAccess', type: 'boolean', tooltip: 'View phone/email after a match accepts.' },
  { label: 'Other-Community Profiles', key: 'crossCommunityVisibility', type: 'boolean', tooltip: 'See and be matched with profiles outside your own community.' },
];

// ─── Main Component ───────────────────────────────────────────────────────────
const MatrimonialSubscriptionPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedPlanId = searchParams.get('plan');

  const [plans, setPlans]               = useState([]);
  const [mySubscription, setMySubscription] = useState(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [activeTab, setActiveTab]       = useState('self-service'); // 'self-service' | 'premier'
  const [isUpgrading, setIsUpgrading]   = useState(false);
  
  // Modals / Checkout State
  const [infoModalContent, setInfoModalContent] = useState(null);
  const [showPremierSuccess, setShowPremierSuccess] = useState(false);
  
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('select-method');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [upiId, setUpiId]               = useState('');
  const [selectedUpiApp, setSelectedUpiApp] = useState('GPay');
  const [cardName, setCardName]         = useState('');
  const [cardNumber, setCardNumber]     = useState('');
  const [cardExpiry, setCardExpiry]     = useState('');
  const [cardCvv, setCardCvv]           = useState('');
  const [selectedBank, setSelectedBank] = useState('SBI');
  const [processing, setProcessing]     = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [invoices, setInvoices]         = useState([]);
  const [showInvoices, setShowInvoices] = useState(false);
  const [toast, setToast]               = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  // ─── Load plans & subscription ───────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const [plansRes, subRes] = await Promise.allSettled([
        matrimonialSubscriptionService.listPlans(),
        matrimonialSubscriptionService.getMySubscription()
      ]);
      if (plansRes.status === 'fulfilled') {
        const planList = plansRes.value.data.data.plans || [];
        setPlans(planList);
        if (planList.length > 0 && !selectedPlan) {
          // Select the first popular plan, or just the first plan
          const requested = requestedPlanId && planList.find(p => p._id === requestedPlanId);
          const popular = planList.find(p => (p.isFeatured || p.badge) && p.price > 0);
          setSelectedPlan(requested || popular || planList.find(p => p.price > 0) || planList[0]);
        }
      }
      if (subRes.status === 'fulfilled') {
        setMySubscription(subRes.value.data.data.subscription || null);
      }
    } catch (err) {
      console.error('Failed to load subscription data:', err);
    } finally {
      setLoadingPlans(false);
    }
  }, [selectedPlan]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await matrimonialSubscriptionService.getHistory();
      setInvoices(res.data.data.history || []);
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    document.body.style.overflow = showCheckout || showCancelModal || infoModalContent ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showCheckout, showCancelModal, infoModalContent]);

  // ─── Payment flow ─────────────────────────────────────────────────────────
  const handleConfirmPayment = async () => {
    if (!selectedPlan) return;
    setProcessing(true);
    setCheckoutStep('processing');

    try {
      const initiateRes = await matrimonialSubscriptionService.initiatePurchase({ planId: selectedPlan._id });
      const order = initiateRes.data.data;
      const sdkLoaded = await loadRazorpayScript();

      if (sdkLoaded && window.Razorpay && order.razorpayOrderId) {
        const options = {
          key: order.razorpayKeyId,
          amount: order.amount,
          currency: order.currency || 'INR',
          name: 'Meri Samaj Matrimonial',
          description: selectedPlan.name,
          order_id: order.razorpayOrderId,
          handler: async (response) => {
            try {
              await matrimonialSubscriptionService.verifyAndActivate({
                gateway: 'razorpay',
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                planId: selectedPlan._id
              });
              setCheckoutStep('success');
              loadData();
            } catch (verifyErr) {
              showToast(verifyErr.response?.data?.message || 'Payment could not be verified.');
              setCheckoutStep('select-method');
            }
          },
          modal: { ondismiss: () => setCheckoutStep('select-method') },
          prefill: {},
          theme: { color: selectedPlan.themeColor || '#f43f5e' }
        };
        new window.Razorpay(options).open();
        setProcessing(false);
        return;
      }

      // Razorpay could not be opened: never activate without a real payment.
      showToast(sdkLoaded ? 'Could not start the payment. Please try again.' : 'Payment window failed to load. Check your internet connection.');
      setCheckoutStep('select-method');
    } catch (err) {
      showToast(err.response?.data?.message || 'Payment failed. Please try again.');
      setCheckoutStep('select-method');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await matrimonialSubscriptionService.cancelSubscription({ reason: 'User requested cancellation' });
      setShowCancelModal(false);
      setMySubscription(null);
      showToast('Subscription cancelled.');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel.');
    }
  };

  const isActive = mySubscription?.status === 'active';

  if (loadingPlans) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-28 relative font-sans text-slate-800 w-full max-w-full overflow-x-hidden">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[70] bg-slate-900 text-white font-extrabold text-[12px] px-5 py-3 rounded-full shadow-xl flex items-center gap-2">
          <Sparkles size={13} className="text-amber-400" />{toast}
        </div>
      )}

      {/* ─── HEADER ─── */}
      <div className="bg-white border-b border-gray-100 flex items-center justify-between px-4 h-14 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center active:scale-90">
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-[15px] font-black text-slate-900 leading-none">Upgrade Membership</h1>
            <p className="text-[9.5px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">विवाह प्रीमियम सदस्यता</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 max-w-md mx-auto space-y-5">
        
        {/* ─── ACTIVE SUBSCRIPTION VIEW ─── */}
        {isActive && !isUpgrading ? (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-3xl p-6 shadow-lg shadow-rose-500/20 relative overflow-hidden">
              <div className="absolute -right-5 -bottom-5 opacity-10"><Heart size={130} fill="white" /></div>
              <span className="bg-white/20 text-white text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-widest border border-white/15">
                ✨ Active Member
              </span>
              <h2 className="text-[24px] font-black mt-4 leading-none tracking-tight">{mySubscription.planName}</h2>
              <p className="text-rose-100 text-[11.5px] font-semibold mt-1.5">
                Active until {mySubscription.endDate ? new Date(mySubscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
              </p>

              <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-3 gap-4 text-center">
                {[
                  { label: 'Profile Views', value: mySubscription.featuresSnapshot?.profileViewsPerDay === -1 ? '∞' : mySubscription.featuresSnapshot?.profileViewsPerDay ?? '–' },
                  { label: 'Interests', value: mySubscription.featuresSnapshot?.interestLimit === -1 ? '∞' : mySubscription.featuresSnapshot?.interestLimit ?? '–' },
                  { label: 'Other Communities', value: mySubscription.featuresSnapshot?.crossCommunityVisibility ? 'Yes' : 'No' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[9px] text-rose-200 uppercase tracking-wider font-bold">{label}</p>
                    <p className="text-[18px] font-black text-white mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2.5">
              <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Subscription Controls</h4>
              <button onClick={() => setIsUpgrading(true)}
                className="w-full py-3 bg-slate-50 text-slate-700 text-[12.5px] font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-2 active:scale-95">
                <RefreshCw size={14} /> Upgrade / Renew Plan
              </button>
              <button onClick={async () => { await loadHistory(); setShowInvoices(!showInvoices); }}
                className="w-full py-3 bg-slate-50 text-slate-700 text-[12.5px] font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-2 active:scale-95">
                <FileText size={14} /> Billing History
              </button>
              <button onClick={() => setShowCancelModal(true)}
                className="w-full py-3 bg-red-50 text-red-500 text-[12.5px] font-bold rounded-xl border border-red-100 flex items-center justify-center gap-2 active:scale-95">
                Cancel Membership
              </button>
              {showInvoices && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  {invoices.length === 0
                    ? <p className="text-[11px] text-slate-400 text-center font-semibold py-2">No billing records yet.</p>
                    : invoices.map(inv => (
                        <div key={inv._id} className="flex justify-between items-center px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            <p className="text-[12px] font-bold text-slate-800">{inv.planName}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">{new Date(inv.startDate).toLocaleDateString('en-IN')} · {inv.paymentStatus}</p>
                          </div>
                          <span className="text-[13px] font-black text-slate-800">₹{inv.pricePaid}</span>
                        </div>
                      ))
                  }
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ─── DYNAMIC PLAN SELECTION (MATRIX UI) ─── */
          <div className="space-y-4">
            
            {isActive && isUpgrading && (
              <button onClick={() => setIsUpgrading(false)} className="text-rose-500 text-[12px] font-bold flex items-center gap-1 active:scale-95 mb-2">
                <ArrowLeft size={14} /> Back to Dashboard
              </button>
            )}

            {/* Tab Switcher */}
            <div className="bg-white border border-slate-200 p-1.5 rounded-2xl flex gap-1.5 shadow-sm">
              <button
                onClick={() => setActiveTab('self-service')}
                className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-200 ${
                  activeTab === 'self-service'
                    ? 'bg-rose-50 text-rose-600 shadow-sm border border-rose-100'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Self-Service
              </button>
              <button
                onClick={() => setActiveTab('premier')}
                className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-200 ${
                  activeTab === 'premier'
                    ? 'bg-rose-50 text-rose-600 shadow-sm border border-rose-100'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Premier <Crown size={12} className="inline ml-1" />
              </button>
            </div>

            {activeTab === 'premier' ? (
              /* ─── PREMIER CONTENT ─── */
              <div className="bg-white border border-rose-100 rounded-3xl p-6 shadow-sm space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500 shadow-sm border border-rose-100">
                    <Sparkles size={24} className="fill-rose-500/10" />
                  </div>
                  <h2 className="text-lg font-black text-rose-950">Premier Matchmaking</h2>
                  <p className="text-xs text-slate-500 leading-relaxed px-4">
                    Enjoy customized, handpicked matching handled by expert relationship managers. No effort required on your part.
                  </p>
                </div>
                <div className="space-y-4 pt-2">
                  {[
                    { title: 'Personal Relationship Manager', desc: 'Expert guides who search, verify, and filter partners based on your custom criteria.' },
                    { title: 'Handpicked Match Profiles', desc: 'Receive periodic curated lists of matching profiles directly over WhatsApp & Call.' },
                    { title: 'Coordinated Communication', desc: 'We initiate talks, carry out family checks, and arrange initial meetings.' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex gap-3.5 items-start">
                      <div className="w-5 h-5 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 border border-rose-100">
                        <Check size={12} className="stroke-[3px]" />
                      </div>
                      <div className="text-left">
                        <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowPremierSuccess(true)}
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-rose-200 active:scale-95 transition-transform">
                  Request Premier Callback
                </button>
              </div>
            ) : (
              /* ─── SELF-SERVICE MATRIX ─── */
              <div className="space-y-4">

                {plans.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 bg-white rounded-3xl border border-slate-200">
                    <p className="font-semibold">No plans currently available.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden min-w-0">
                    {/* ─── PHONE: plan cards (tap to select) ─── */}
                    <div id="mobile-plan-list" className="sm:hidden p-3 space-y-3 scroll-mt-4">
                      {[...plans]
                        .sort((a, b) => (b._id === selectedPlan?._id) - (a._id === selectedPlan?._id))
                        .map(plan => {
                        const isSel = selectedPlan?._id === plan._id;
                        return (
                          <div
                            key={plan._id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              if (isSel) return;
                              setSelectedPlan(plan);
                              document.getElementById('mobile-plan-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className={`w-full text-left rounded-2xl border-2 p-4 transition-all relative cursor-pointer ${isSel ? 'border-rose-500 bg-rose-50/40 shadow-md' : 'border-slate-200 bg-white'}`}
                          >
                            {(plan.badge || plan.isFeatured) && (
                              <span className="absolute -top-2.5 right-4 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider"
                                style={{ backgroundColor: plan.themeColor || '#10b981' }}>
                                {plan.badge || 'Popular'}
                              </span>
                            )}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5 min-w-0">
                                <span className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSel ? 'border-rose-600' : 'border-slate-300'}`}>
                                  {isSel && <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-[15px] font-black text-slate-900 break-words">{plan.name}</p>
                                  <p className="text-[11px] font-semibold text-slate-500">
                                    {plan.price > 0 ? `${plan.durationInDays} days` : 'Free for everyone'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-[18px] font-black text-rose-600 leading-none">₹{plan.price}</p>
                                {plan.originalPrice > plan.price && (
                                  <p className="text-[11px] text-slate-400 font-bold line-through mt-1">₹{plan.originalPrice}</p>
                                )}
                              </div>
                            </div>
                            <ul className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 gap-1.5">
                              {FEATURE_ROWS.map(feature => {
                                const val = plan.features?.[feature.key];
                                const on = feature.type === 'value' ? !!val : !!val;
                                return (
                                  <li key={feature.key} className={`flex items-center justify-between gap-2 text-[12px] ${on ? 'text-slate-700' : 'text-slate-400'}`}>
                                    <span className="font-semibold">{feature.label}</span>
                                    {feature.type === 'value' ? (
                                      <span className="font-extrabold text-slate-800 shrink-0">{val === -1 ? 'Unlimited' : (val || '—')}</span>
                                    ) : val ? (
                                      <Check size={15} className="text-emerald-600 stroke-[3px] shrink-0" />
                                    ) : (
                                      <X size={14} className="text-slate-300 shrink-0" />
                                    )}
                                  </li>
                                );
                              })}
                            </ul>

                            {isSel && (
                              <div className="mt-4">
                                {plan.price > 0 ? (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setPaymentMethod(paymentMethod || 'upi'); setShowCheckout(true); setCheckoutStep('select-method'); }}
                                    className="w-full py-3.5 text-white rounded-xl text-[14px] font-extrabold shadow-md active:scale-95 transition-transform"
                                    style={{ backgroundColor: plan.themeColor || '#f43f5e' }}
                                  >
                                    {isActive ? 'Confirm Upgrade' : 'Upgrade Now'} · Pay ₹{plan.price}
                                  </button>
                                ) : (
                                  <div className="w-full py-3 rounded-xl text-[13px] font-extrabold text-center bg-slate-100 text-slate-500">
                                    {isActive ? 'Included free with every account' : 'This is your current free plan'}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* ─── WIDER SCREENS: comparison table ─── */}
                    <div className="hidden sm:block overflow-x-auto no-scrollbar pt-4">
                      <div style={{ minWidth: `${Math.max(500, 150 + plans.length * 110)}px` }}>
                        
                        {/* ─── MATRIX HEADER ─── */}
                        <div className="grid pb-2 border-b border-slate-100 text-center items-end"
                             style={{ gridTemplateColumns: `1fr repeat(${plans.length}, 1fr)` }}>
                          <div className="text-left pl-4 pb-1 text-[10px] font-bold text-slate-400 uppercase">Benefit</div>
                          
                          {plans.map(plan => (
                            <div key={plan._id} onClick={() => setSelectedPlan(plan)}
                              className={`flex flex-col items-center pb-2 cursor-pointer transition-all relative ${
                                selectedPlan?._id === plan._id ? 'bg-rose-50/50 rounded-t-xl' : ''
                              }`}
                            >
                              {(plan.badge || plan.isFeatured) && (
                                <span className="absolute -top-3.5 bg-emerald-500 text-white text-[7px] font-black uppercase px-1.5 py-0.5 rounded-md tracking-wider shadow-sm"
                                      style={{ backgroundColor: plan.themeColor || '#10b981' }}>
                                  {plan.badge || 'Popular'}
                                </span>
                              )}
                              <span className="text-xs font-extrabold text-slate-800 block mb-1 px-1 line-clamp-1" title={plan.name}>{plan.name}</span>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                selectedPlan?._id === plan._id ? 'border-rose-600 bg-rose-600/10' : 'border-slate-300'
                              }`}>
                                {selectedPlan?._id === plan._id && <div className="w-2.5 h-2.5 rounded-full bg-rose-600" />}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* ─── MATRIX BODY ─── */}
                        <div className="divide-y divide-slate-100 bg-white">
                          {FEATURE_ROWS.map((feature, fIdx) => (
                            <div key={fIdx} className="grid py-3.5 items-center text-center text-xs font-semibold"
                                 style={{ gridTemplateColumns: `1fr repeat(${plans.length}, 1fr)` }}>
                              
                              {/* Label */}
                              <div className="flex items-center gap-1 text-left pl-4 pr-1">
                                <span className="text-[11px] leading-tight font-bold text-slate-700">{feature.label}</span>
                                <button onClick={() => setInfoModalContent({ title: feature.label, desc: feature.tooltip })}
                                  className="text-slate-300 hover:text-slate-500 p-0.5 shrink-0">
                                  <HelpCircle size={11} />
                                </button>
                              </div>

                              {/* Values per plan */}
                              {plans.map(plan => {
                                const val = plan.features?.[feature.key];
                                const isSelected = selectedPlan?._id === plan._id;
                                return (
                                  <div key={plan._id} className={`py-1 ${isSelected ? 'bg-rose-50/50' : ''}`}>
                                    {feature.type === 'value' ? (
                                      <span className="font-extrabold text-slate-800">{val === -1 ? '∞' : (val || '—')}</span>
                                    ) : val ? (
                                      <Check size={14} className="mx-auto text-emerald-600 stroke-[3px]" />
                                    ) : (
                                      <span className="text-slate-300 font-bold">—</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* ─── MATRIX FOOTER (Checkout Button) ─── */}
                    {selectedPlan && (
                      <div className="hidden sm:block p-4 bg-rose-50/30 border-t border-rose-100">
                        <div className="flex justify-between items-center mb-3 px-1">
                          <div className="flex flex-col">
                            <span className="text-xl font-black text-rose-600">₹{selectedPlan.price}</span>
                            {selectedPlan.originalPrice > selectedPlan.price && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-400 font-bold line-through">₹{selectedPlan.originalPrice}</span>
                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-1.5 rounded-full">
                                  {Math.round(((selectedPlan.originalPrice - selectedPlan.price) / selectedPlan.originalPrice) * 100)}% OFF
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-black uppercase text-slate-400 block">{selectedPlan.durationInDays} days</span>
                            <span className="text-[9px] text-slate-500 font-semibold">{selectedPlan.name} Plan</span>
                          </div>
                        </div>
                        {selectedPlan.price > 0 ? (
                          <button onClick={() => { setPaymentMethod(paymentMethod || 'upi'); setShowCheckout(true); setCheckoutStep('select-method'); }}
                            className="w-full py-3.5 text-white rounded-xl text-[13.5px] font-extrabold shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"
                            style={{ backgroundColor: selectedPlan.themeColor || '#f43f5e' }}>
                            {isActive ? 'Confirm Upgrade' : 'Upgrade Now'}
                          </button>
                        ) : (
                          <div className="w-full py-3.5 rounded-xl text-[13px] font-extrabold text-center bg-slate-100 text-slate-500">
                            {isActive ? 'Included free with every account' : 'This is your current free plan'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── CHECKOUT MODAL ─── */}
      {showCheckout && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !processing && setShowCheckout(false)} />
          <div className="bg-white w-full rounded-t-[28px] sm:rounded-[28px] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] relative shadow-2xl max-w-md max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />

            {checkoutStep === 'select-method' && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-[15px] font-black text-slate-800">Secure Checkout</h3>
                  <p className="text-[11px] text-slate-500 font-bold mt-0.5">Pay via UPI, Cards or Net Banking</p>
                </div>

                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex justify-between items-center">
                  <div>
                    <p className="text-[12px] font-black text-rose-900">{selectedPlan?.name}</p>
                    <p className="text-[10px] text-rose-500 font-bold mt-0.5">{selectedPlan?.durationInDays} days access</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[18px] font-black text-rose-600 block leading-none">₹{selectedPlan?.price}</span>
                    {selectedPlan?.originalPrice > selectedPlan?.price && (
                      <span className="text-[10px] text-rose-400 font-bold line-through">₹{selectedPlan.originalPrice}</span>
                    )}
                  </div>
                </div>

                {/* Payment methods */}
                <div className="space-y-2">
                  {[
                    { id: 'upi',        label: 'UPI / QR Code (GPay, PhonePe)',  Icon: QrCode },
                    { id: 'card',       label: 'Debit / Credit Card',              Icon: CreditCard },
                    { id: 'netbanking', label: 'Net Banking',                      Icon: Landmark },
                  ].map(({ id, label, Icon }) => (
                    <label key={id} className={`flex items-center gap-3.5 p-4 border rounded-2xl cursor-pointer transition-all ${paymentMethod === id ? 'bg-rose-50 border-rose-400' : 'bg-white border-slate-200'}`}>
                      <input type="radio" name="paymethod" value={id} checked={paymentMethod === id} onChange={() => setPaymentMethod(id)} className="accent-rose-500" />
                      <Icon size={18} className={paymentMethod === id ? 'text-rose-500' : 'text-slate-500'} />
                      <span className="text-[13px] font-bold text-slate-800">{label}</span>
                    </label>
                  ))}
                </div>

                {/* Method fields (omitted for brevity, same as before) */}
                {paymentMethod === 'upi' && (
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">UPI ID</p>
                    <input type="text" placeholder="name@bank" value={upiId} onChange={e => setUpiId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[12.5px] font-bold focus:outline-none" />
                  </div>
                )}
                {paymentMethod === 'card' && (
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                    <input type="text" placeholder="Card Number" value={cardNumber} onChange={e => setCardNumber(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[12.5px] font-bold focus:outline-none" />
                  </div>
                )}

                <div className="flex gap-2.5 pb-4">
                  <button onClick={() => setShowCheckout(false)}
                    className="flex-1 py-3.5 bg-slate-100 text-slate-700 rounded-xl text-[13px] font-black">Cancel</button>
                  <button onClick={handleConfirmPayment} disabled={!paymentMethod || processing}
                    className={`flex-1 py-3.5 text-white rounded-xl text-[13px] font-black shadow-sm flex items-center justify-center gap-2 ${paymentMethod ? 'bg-rose-500' : 'bg-rose-300 cursor-not-allowed'}`}
                    style={{ backgroundColor: paymentMethod ? (selectedPlan?.themeColor || '#f43f5e') : undefined }}>
                    {processing && <Loader2 size={14} className="animate-spin" />}
                    {paymentMethod ? `Pay ₹${selectedPlan?.price}` : 'Select a method'}
                  </button>
                </div>
              </div>
            )}

            {checkoutStep === 'processing' && (
              <div className="py-16 flex flex-col items-center justify-center gap-5">
                <div className="w-14 h-14 rounded-full border-4 border-rose-500 border-t-transparent animate-spin" />
                <h3 className="text-[15px] font-black text-slate-800">Processing Payment...</h3>
              </div>
            )}

            {checkoutStep === 'success' && (
              <div className="py-10 flex flex-col items-center gap-5 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100">
                  <CheckCircle2 size={34} className="text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-[17px] font-black text-slate-900">Subscription Activated! 🎉</h3>
                  <p className="text-[12px] text-slate-400 mt-1.5 font-semibold px-4">Your Premium Matrimonial plan is now active.</p>
                </div>
                <button onClick={() => { setShowCheckout(false); navigate('/member/matrimonial'); }}
                  className="px-8 py-3 bg-rose-500 text-white rounded-xl text-[13px] font-black shadow-sm active:scale-95">
                  Start Matching →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── INFO MODAL ─── */}
      {infoModalContent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/60" onClick={() => setInfoModalContent(null)} />
          <div className="bg-white rounded-3xl p-6 z-10 shadow-2xl max-w-xs w-full text-center space-y-3 relative animate-scale-up">
            <button onClick={() => setInfoModalContent(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={16} /></button>
            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-500 mb-2">
              <Info size={20} />
            </div>
            <h3 className="text-[14px] font-black text-slate-900">{infoModalContent.title}</h3>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">{infoModalContent.desc}</p>
          </div>
        </div>
      )}

      {/* ─── PREMIER SUCCESS MODAL ─── */}
      {showPremierSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowPremierSuccess(false)} />
          <div className="bg-white rounded-3xl p-6 z-10 shadow-2xl max-w-sm w-full text-center space-y-4 relative animate-scale-up border border-rose-100">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 border border-emerald-100">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-base font-black text-slate-900">Request Received</h3>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
              Our Premier Matchmaking team will contact you shortly to understand your preferences.
            </p>
            <button onClick={() => setShowPremierSuccess(false)} className="w-full py-3 bg-rose-600 text-white rounded-xl text-xs font-bold active:scale-95">
              Got it
            </button>
          </div>
        </div>
      )}

      {/* ─── CANCEL SUBSCRIPTION MODAL ─── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCancelModal(false)} />
          <div className="bg-white rounded-3xl p-6 z-10 shadow-2xl max-w-sm w-full text-center space-y-4 border border-slate-100">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto border border-red-100">
              <ShieldAlert size={22} className="text-red-500" />
            </div>
            <h3 className="text-[15px] font-black text-slate-800">Cancel Membership?</h3>
            <p className="text-[12px] text-slate-400 font-semibold leading-relaxed">
              You'll immediately lose access to premium profiles, match recommendations, and unlocked contacts.
            </p>
            <div className="flex gap-2.5 pt-1">
              <button onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[12.5px] font-black">Keep Plan</button>
              <button onClick={handleCancelSubscription}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl text-[12.5px] font-black shadow-sm">Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatrimonialSubscriptionPage;
