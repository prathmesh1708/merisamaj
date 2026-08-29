import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, HelpCircle, Info, CreditCard, ShieldCheck, CheckCircle2, QrCode, Landmark, Sparkles, X, Heart, Gift, Loader2 } from 'lucide-react';
import { useData } from '../../context/DataProvider';
import { useReferral } from '../referral/ReferralContext';

const UpgradeMembershipPage = () => {
  const navigate = useNavigate();
  const { currentUser, updateProfile } = useData();
  const { validateReferralCode, calculateCheckoutDiscount, availablePoints, redeemPoints } = useReferral();

  // Selected State
  const [activeTab, setActiveTab] = useState('self-service'); // 'self-service' | 'premier'
  const [selectedPlan, setSelectedPlan] = useState('Pro Max'); // 'Pro' | 'Pro Max' | 'Pro Supreme'
  const [selectedDuration, setSelectedDuration] = useState('1 month'); // '1 month' | '3 months' | 'Till Marriage'
  
  // Modals / Tooltips State
  const [infoModalContent, setInfoModalContent] = useState(null); // { title, desc } or null
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showConditionsModal, setShowConditionsModal] = useState(false);

  // Payment Flow State
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('select-method'); // 'select-method' | 'processing' | 'success'
  const [paymentMethod, setPaymentMethod] = useState(''); // 'upi' | 'card' | 'netbanking'
  const [upiMethod, setUpiMethod] = useState('apps'); // 'apps' | 'id'
  const [selectedUpiApp, setSelectedUpiApp] = useState('GPay');
  const [upiId, setUpiId] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [selectedBank, setSelectedBank] = useState('SBI');
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const [showPremierSuccess, setShowPremierSuccess] = useState(false);

  // Referral / Points State in Checkout
  const [checkoutReferralCode, setCheckoutReferralCode] = useState('');
  const [checkoutReferralStatus, setCheckoutReferralStatus] = useState(null); // null, 'loading', 'success', 'error'
  const [checkoutReferralMessage, setCheckoutReferralMessage] = useState('');
  const [usePoints, setUsePoints] = useState(false);

  const banksList = [
    { id: 'SBI', name: 'State Bank of India (SBI)' },
    { id: 'HDFC', name: 'HDFC Bank' },
    { id: 'ICICI', name: 'ICICI Bank' },
    { id: 'AXIS', name: 'Axis Bank' },
    { id: 'KOTAK', name: 'Kotak Mahindra Bank' }
  ];

  // Pricing Matrix Config
  const pricingData = {
    'Pro': {
      '1 month': { final: 299, original: 999 },
      '3 months': { final: 749, original: 2499 },
      'Till Marriage': { final: 2249, original: 7499 }
    },
    'Pro Max': {
      '1 month': { final: 458, original: 1525 },
      '3 months': { final: 1145, original: 3814 },
      'Till Marriage': { final: 3494, original: 11644 }
    },
    'Pro Supreme': {
      '1 month': { final: 699, original: 2330 },
      '3 months': { final: 1749, original: 5830 },
      'Till Marriage': { final: 5299, original: 17660 }
    }
  };

  const planFeatures = {
    features: [
      { name: 'Other Community Access', key: 'otherCommunityAccess', tooltip: 'Browse, search, and connect with verified matrimonial profiles from other community chapters across the platform.' },
      { name: 'Contact Sharing', key: 'contactSharing', tooltip: 'Ability to share your own contact details with accepted profiles.' },
      { name: 'Engage+', key: 'engage', tooltip: 'Access to advanced conversational helpers, automated Icebreakers, and chat recommendations.' },
      { name: 'Contact Details', key: 'contactDetails', type: 'value', tooltip: 'Number of verified direct phone numbers/emails you can unlock.' },
      { name: 'Super Interest', key: 'superInterest', type: 'value', tooltip: 'Stand out from other interests by notifying matches with high-priority notifications.' },
      { name: 'Spotlights', key: 'spotlights', type: 'value', tooltip: 'Feature your profile at the top of partner search results for daily matching.' },
      { name: 'Gold Badge', key: 'goldBadge', tooltip: 'A distinct premium profile badge shown to other members to signal trust and commitment.' }
    ],
    values: {
      'Pro': {
        otherCommunityAccess: true,
        contactSharing: true,
        engage: true,
        contactDetails: 25,
        superInterest: 0,
        spotlights: 0,
        goldBadge: true
      },
      'Pro Max': {
        otherCommunityAccess: true,
        contactSharing: true,
        engage: true,
        contactDetails: 50,
        superInterest: 50,
        spotlights: 1,
        goldBadge: true
      },
      'Pro Supreme': {
        otherCommunityAccess: true,
        contactSharing: true,
        engage: true,
        contactDetails: 80,
        superInterest: 80,
        spotlights: 3,
        goldBadge: true
      }
    }
  };

  const currentPriceObj = pricingData[selectedPlan][selectedDuration];
  const pricing = calculateCheckoutDiscount(currentPriceObj.final, usePoints, checkoutReferralStatus === 'success' ? checkoutReferralCode : null);

  const handleOpenInfo = (featureName, tooltipText) => {
    setInfoModalContent({ title: featureName, desc: tooltipText });
  };

  const handleStartPayment = () => {
    setShowCheckout(true);
    setCheckoutStep('select-method');
  };

  const handleValidateCheckoutReferral = async () => {
    if (!checkoutReferralCode.trim()) return;
    setCheckoutReferralStatus('loading');
    const result = await validateReferralCode(checkoutReferralCode);
    if (result.valid) {
      setCheckoutReferralStatus('success');
      setCheckoutReferralMessage(result.message);
    } else {
      setCheckoutReferralStatus('error');
      setCheckoutReferralMessage(result.message);
    }
  };

  const handleConfirmPayment = () => {
    setCheckoutStep('processing');
    setTimeout(async () => {
      // Complete payment and update user profile in local context and backend
      await updateProfile({
        isPremium: true,
        membershipPlan: selectedPlan,
        membershipExpiry: selectedDuration,
        membershipStartDate: new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }),
        matrimonySubscription: {
          status: 'active',
          plan: selectedPlan,
          duration: selectedDuration,
          validUntil: selectedDuration === 'Till Marriage' ? 'Till Marriage' : `${selectedDuration} from purchase`,
          startDate: new Date().toISOString()
        },
        isVerified: true // automatically verifies as trust factor
      });
      setCheckoutStep('success');
    }, 1500);
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
    }
    return v;
  };

  return (
    <div className="min-h-screen bg-surface pb-28 relative text-text-primary">
      {/* ─── HEADER ─── */}
      <div className="bg-card border-b border-gray-100 flex items-center justify-between px-4 h-14 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 press-scale">
            <ArrowLeft size={22} className="text-text-primary" />
          </button>
          <h1 className="text-base font-bold text-text-primary">Upgrade Membership</h1>
        </div>
        <button 
          onClick={() => setShowHelpModal(true)} 
          className="text-rose-600 hover:text-rose-700 text-xs font-bold transition-colors press-scale"
        >
          Need help?
        </button>
      </div>

      <div className="max-w-xl mx-auto pt-4 px-4 space-y-4">
        
        {/* ─── TAB SWITCHER ─── */}
        <div className="bg-gray-100 p-1.5 rounded-2xl flex gap-1.5">
          <button
            onClick={() => setActiveTab('self-service')}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'self-service'
                ? 'bg-white text-rose-600 shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Self-Service
          </button>
          <button
            onClick={() => setActiveTab('premier')}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'premier'
                ? 'bg-white text-rose-600 shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Premier
          </button>
        </div>

        {activeTab === 'premier' ? (
          /* ─── PREMIER SERVICE CONTENT ─── */
          <div className="bg-card border border-rose-100 rounded-3xl p-6 shadow-sm space-y-6 animate-fade-in-up">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500 shadow-sm border border-rose-100">
                <Sparkles size={24} className="fill-rose-500/10" />
              </div>
              <h2 className="text-lg font-black text-rose-950">MeriSamaj Premier Matchmaking</h2>
              <p className="text-xs text-text-secondary leading-relaxed px-4">
                Enjoy customized, handpicked matching handled by expert relationship managers. No effort required on your part.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {[
                { title: 'Personal Relationship Manager', desc: 'Expert guides who search, verify, and filter partners based on your custom criteria.' },
                { title: 'Cross-Community Matchmaking', desc: 'Find suitable matches beyond your primary community chapter with verified family backgrounds.' },
                { title: 'Handpicked Match Profiles', desc: 'Receive periodic curated lists of matching profiles directly over WhatsApp & Call.' },
                { title: 'Coordinated Communication', desc: 'We initiate talks, carry out family checks, and arrange initial meetings.' },
                { title: 'Absolute Confidentiality', desc: 'Your details are shared selectively and only with your explicit consent.' }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-3.5 items-start">
                  <div className="w-5.5 h-5.5 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 border border-rose-100">
                    <Check size={12} className="stroke-[3px]" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-bold text-text-primary">{item.title}</h4>
                    <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 items-center">
              <span className="text-lg">👑</span>
              <div className="text-left">
                <p className="text-xs font-bold text-amber-950">Concierge Premium Setup</p>
                <p className="text-[10px] text-amber-900 leading-normal">Requires separate offline verification and profiling sessions.</p>
              </div>
            </div>

            <button 
              onClick={() => {
                setShowPremierSuccess(true);
              }}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-extrabold press-scale shadow-lg shadow-rose-200"
            >
              Request Premier Callback
            </button>
          </div>
        ) : (
          /* ─── SELF-SERVICE SECTION ─── */
          <div className="space-y-4 animate-fade-in-up">
            
            {/* 30-Day refund guarantee banner */}
            <div className="bg-[#eaf9f2] border border-[#d2f3e4] rounded-2xl px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Guarantee circle badge */}
                <div className="bg-[#12b76a] text-white p-1.5 rounded-full flex flex-col items-center justify-center text-[6px] font-black w-10 h-10 tracking-tighter leading-none shrink-0 border border-white">
                  <span className="scale-[0.8] origin-center text-center">30-DAY<br/>MONEY<br/>BACK</span>
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-black text-[#0f5b3a] flex items-center gap-1 leading-none">
                    30-day full refund guarantee*
                  </h4>
                  <button 
                    onClick={() => setShowConditionsModal(true)} 
                    className="text-[10px] font-semibold text-emerald-700 hover:underline mt-1 block leading-none"
                  >
                    *Conditions apply
                  </button>
                </div>
              </div>
              <button onClick={() => handleOpenInfo('Refund Policy', 'We offer a 30-day full refund if you do not unlock any contact details and are unsatisfied with match quality. Refund requests can be raised via help desk.')} className="text-emerald-700 p-1 press-scale">
                <Info size={18} />
              </button>
            </div>

            {/* Plan Selector Grid */}
            <div className="bg-card border border-gray-150 rounded-3xl shadow-sm overflow-hidden pt-4">
              
              {/* Feature Matrix Table Header */}
              <div className="grid grid-cols-4 pb-2 border-b border-gray-100 text-center items-end">
                <div className="text-left pl-4 pb-1 text-[10px] font-bold text-text-secondary uppercase">Benefit</div>
                
                {/* Column: Pro */}
                <div 
                  onClick={() => setSelectedPlan('Pro')}
                  className={`flex flex-col items-center pb-2 cursor-pointer transition-all ${
                    selectedPlan === 'Pro' ? 'bg-rose-50/30 rounded-t-xl' : ''
                  }`}
                >
                  <span className="text-xs font-extrabold text-text-primary block mb-1">Pro</span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                    selectedPlan === 'Pro' ? 'border-rose-600 bg-rose-600/10' : 'border-gray-300'
                  }`}>
                    {selectedPlan === 'Pro' && <div className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-scale-up" />}
                  </div>
                </div>

                {/* Column: Pro Max */}
                <div 
                  onClick={() => setSelectedPlan('Pro Max')}
                  className={`flex flex-col items-center pb-2 cursor-pointer transition-all relative ${
                    selectedPlan === 'Pro Max' ? 'bg-rose-50/30 rounded-t-xl' : ''
                  }`}
                >
                  <span className="text-xs font-extrabold text-text-primary block mb-1">Pro Max</span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                    selectedPlan === 'Pro Max' ? 'border-rose-600 bg-rose-600/10' : 'border-gray-300'
                  }`}>
                    {selectedPlan === 'Pro Max' && <div className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-scale-up" />}
                  </div>
                </div>

                {/* Column: Pro Supreme */}
                <div 
                  onClick={() => setSelectedPlan('Pro Supreme')}
                  className={`flex flex-col items-center pb-2 cursor-pointer transition-all relative ${
                    selectedPlan === 'Pro Supreme' ? 'bg-rose-50/30 rounded-t-xl' : ''
                  }`}
                >
                  {/* Top Seller Tag */}
                  <span className="absolute -top-3.5 bg-emerald-500 text-white text-[7px] font-black uppercase px-1.5 py-0.5 rounded-md tracking-wider shadow-sm">
                    Top Seller
                  </span>
                  <span className="text-xs font-extrabold text-text-primary block mb-1">Pro Supreme</span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                    selectedPlan === 'Pro Supreme' ? 'border-rose-600 bg-rose-600/10' : 'border-gray-300'
                  }`}>
                    {selectedPlan === 'Pro Supreme' && <div className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-scale-up" />}
                  </div>
                </div>
              </div>

              {/* Feature Matrix Body */}
              <div className="divide-y divide-gray-100 bg-white">
                {planFeatures.features.map((feature, fIdx) => (
                  <div 
                    key={fIdx} 
                    className="grid grid-cols-4 py-3.5 items-center text-center text-xs font-semibold"
                  >
                    {/* Feature Label */}
                    <div className="flex items-center gap-1 text-left pl-4 text-text-primary">
                      <span className="text-[11px] leading-tight font-bold text-text-primary">{feature.name}</span>
                      <button 
                        onClick={() => handleOpenInfo(feature.name, feature.tooltip)}
                        className="text-text-secondary hover:text-text-primary p-0.5 shrink-0"
                      >
                        <HelpCircle size={11} className="text-gray-400" />
                      </button>
                    </div>

                    {/* Pro Value */}
                    <div className={`py-1 ${selectedPlan === 'Pro' ? 'bg-rose-50/30' : ''}`}>
                      {feature.type === 'value' ? (
                        <span className="font-extrabold text-text-primary">{planFeatures.values['Pro'][feature.key]}</span>
                      ) : planFeatures.values['Pro'][feature.key] ? (
                        <Check size={14} className="mx-auto text-emerald-600 stroke-[3px]" />
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </div>

                    {/* Pro Max Value */}
                    <div className={`py-1 ${selectedPlan === 'Pro Max' ? 'bg-rose-50/30 border-x border-rose-100/50' : ''}`}>
                      {feature.type === 'value' ? (
                        <span className="font-extrabold text-text-primary">{planFeatures.values['Pro Max'][feature.key]}</span>
                      ) : planFeatures.values['Pro Max'][feature.key] ? (
                        <Check size={14} className="mx-auto text-emerald-600 stroke-[3px]" />
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </div>

                    {/* Pro Supreme Value */}
                    <div className={`py-1 ${selectedPlan === 'Pro Supreme' ? 'bg-rose-50/30' : ''}`}>
                      {feature.type === 'value' ? (
                        <span className="font-extrabold text-text-primary">{planFeatures.values['Pro Supreme'][feature.key]}</span>
                      ) : planFeatures.values['Pro Supreme'][feature.key] ? (
                        <Check size={14} className="mx-auto text-emerald-600 stroke-[3px]" />
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discount Callout */}
            <div className="flex items-center gap-3 py-1">
              <div className="h-[1px] bg-dashed border-t border-rose-300 flex-1" />
              <span className="text-[10px] font-black tracking-widest text-rose-600 uppercase">
                Flat 70% OFF on all plans
              </span>
              <div className="h-[1px] bg-dashed border-t border-rose-300 flex-1" />
            </div>

            {/* Pricing / Duration Grid Cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: '1 month', label: '1 month' },
                { id: '3 months', label: '3 months' },
                { id: 'Till Marriage', label: 'Till Marriage' }
              ].map((d) => {
                const pricing = pricingData[selectedPlan][d.id];
                const isSelected = selectedDuration === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDuration(d.id)}
                    className={`border-2 rounded-2xl p-3 flex flex-col justify-between cursor-pointer transition-all relative text-left ${
                      isSelected
                        ? 'border-rose-600 bg-rose-50/10'
                        : 'border-gray-200 bg-card hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-bold text-text-secondary block">{d.label}</span>
                      <div className="mt-1">
                        <span className="text-xs font-black text-text-primary block">₹{pricing.final}</span>
                        <span className="text-[9px] font-bold text-text-secondary line-through block mt-0.5">
                          ₹{pricing.original}
                        </span>
                      </div>
                    </div>
                    {/* Radio placement */}
                    <div className="absolute top-3 right-3">
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                        isSelected ? 'border-rose-600 bg-rose-600' : 'border-gray-300'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action CTA Button */}
            <div className="pt-2">
              <button
                onClick={handleStartPayment}
                className="w-full py-4 bg-[#e62e52] hover:bg-[#d62045] text-white rounded-2xl text-xs font-extrabold press-scale shadow-lg shadow-rose-200 flex justify-center items-center gap-1.5 transition-all"
              >
                Get {selectedPlan} now
              </button>
              <p className="text-[10px] text-center text-text-secondary mt-3">
                Recurring payment, cancel anytime
              </p>
            </div>

          </div>
        )}
      </div>

      {/* ─── INFO MODAL ─── */}
      {infoModalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-card w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-up text-left">
            <div className="flex justify-between items-start border-b border-gray-100 pb-2">
              <h3 className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                <Info size={16} className="text-rose-600" />
                {infoModalContent.title}
              </h3>
              <button 
                onClick={() => setInfoModalContent(null)}
                className="p-1 hover:bg-gray-50 rounded-full text-text-secondary"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-[11px] text-text-secondary font-medium leading-relaxed">
              {infoModalContent.desc}
            </p>
            <button
              onClick={() => setInfoModalContent(null)}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ─── CONDITIONS MODAL ─── */}
      {showConditionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-card w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-up text-left">
            <div className="flex justify-between items-start border-b border-gray-100 pb-2">
              <h3 className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-emerald-600" />
                Refund Conditions
              </h3>
              <button 
                onClick={() => setShowConditionsModal(false)}
                className="p-1 hover:bg-gray-50 rounded-full text-text-secondary"
              >
                <X size={16} />
              </button>
            </div>
            <div className="text-[10px] text-text-secondary font-medium space-y-2 leading-relaxed max-h-48 overflow-y-auto">
              <p>1. The request must be raised within 30 days of upgrading.</p>
              <p>2. The user must not have unlocked/viewed more than 2 contact phone numbers or profiles.</p>
              <p>3. If any premium Interest or Matchmaking has been manually fulfilled by our support manager, refund is void.</p>
              <p>4. Refund processes take 5-7 working days back to original payment channel.</p>
            </div>
            <button
              onClick={() => setShowConditionsModal(false)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* ─── NEED HELP MODAL ─── */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-card w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-up text-left">
            <div className="flex justify-between items-start border-b border-gray-100 pb-2">
              <h3 className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                <HelpCircle size={16} className="text-rose-600" />
                Matrimonial Support Help
              </h3>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="p-1 hover:bg-gray-50 rounded-full text-text-secondary"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-[11px] text-text-secondary font-medium leading-relaxed">
              Facing issues with upgrade or want customization options? Contact our dedicated matrimonial helpline directly.
            </p>
            <div className="bg-gray-50 border border-gray-150 p-3 rounded-xl space-y-1 text-[11px] font-bold text-text-primary text-left">
              <p>📞 Phone: +91 99999 88888</p>
              <p>📧 Email: matrimony@merisamaj.com</p>
              <p>🕒 Hours: 10:00 AM - 7:00 PM</p>
            </div>
            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ─── CHECKOUT / PAYMENT FLOW MODAL ─── */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div 
            onClick={() => setIsBankDropdownOpen(false)}
            className="bg-card w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scale-up text-left"
          >
            
            {/* Checkout Header */}
            <div className="bg-rose-50/50 px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                  <Heart size={16} className="fill-rose-600/10" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-rose-950">MeriSamaj Matrimony Pay</h3>
                  <p className="text-[9px] font-bold text-text-secondary tracking-wide uppercase">Secure checkout</p>
                </div>
              </div>
              {checkoutStep !== 'processing' && (
                <button 
                  onClick={() => setShowCheckout(false)}
                  className="p-1 hover:bg-gray-100 rounded-full text-text-secondary"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Checkout Body Content */}
            <div className="flex-1 p-5 overflow-y-auto max-h-[70vh] space-y-4">
              
              {checkoutStep === 'select-method' ? (
                <>
                  {/* Summary Box with Referral calculations */}
                  {(() => {
                    return (
                      <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex flex-col gap-3 text-xs font-bold text-text-primary">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                          <div className="text-left">
                            <span className="text-[10px] text-text-secondary font-bold block">{selectedPlan} · {selectedDuration}</span>
                            <span className="text-rose-950 text-sm mt-0.5 block">Access Premium Features</span>
                          </div>
                          <span className="text-text-primary text-sm font-black">₹{pricing.originalPrice}</span>
                        </div>
                        
                        {pricing.codeDiscount > 0 && (
                          <div className="flex justify-between items-center text-emerald-600">
                            <span>Referral Discount</span>
                            <span>-₹{pricing.codeDiscount}</span>
                          </div>
                        )}
                        
                        {pricing.pointsRedeemed > 0 && (
                          <div className="flex justify-between items-center text-brand-primary">
                            <span>Points Redeemed</span>
                            <span>-₹{pricing.pointsRedeemed}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-sm font-black text-rose-950">Final Amount</span>
                          <span className="text-rose-600 text-lg font-black">₹{pricing.finalAmount}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Gamification / Referral Entry in Checkout */}
                  <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-2xl space-y-4">
                    <label className="text-[10px] font-black text-brand-primary uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <Gift size={14} /> Refer & Earn Benefits
                    </label>
                    
                    {/* Enter Code */}
                    {!checkoutReferralStatus || checkoutReferralStatus === 'error' ? (
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Have a Referral Code?"
                          value={checkoutReferralCode}
                          onChange={(e) => {
                            setCheckoutReferralCode(e.target.value.toUpperCase());
                            setCheckoutReferralStatus(null);
                            setCheckoutReferralMessage('');
                          }}
                          className={`flex-1 bg-white border ${checkoutReferralStatus === 'error' ? 'border-red-300' : 'border-purple-200'} rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none uppercase tracking-wider shadow-sm`}
                        />
                        <button 
                          type="button"
                          onClick={handleValidateCheckoutReferral}
                          disabled={!checkoutReferralCode || checkoutReferralStatus === 'loading'}
                          className="bg-brand-primary text-white text-[11px] font-bold px-4 py-2 rounded-xl disabled:opacity-50 w-[70px] flex justify-center items-center shadow-sm"
                        >
                          {checkoutReferralStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
                        </button>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 flex items-start gap-2 shadow-sm">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-[11px] font-bold text-emerald-800">{checkoutReferralMessage}</h4>
                          <p className="text-[9px] font-bold text-emerald-600/80 mt-0.5">Applied: {checkoutReferralCode}</p>
                        </div>
                      </div>
                    )}
                    {checkoutReferralStatus === 'error' && (
                      <p className="text-[9px] text-red-500 font-bold ml-1">{checkoutReferralMessage}</p>
                    )}

                    {/* Use Points Toggle */}
                    {availablePoints > 0 && (
                      <div className="flex items-center justify-between bg-white border border-purple-100 rounded-xl p-3 shadow-sm mt-3">
                        <div>
                          <p className="text-[11px] font-bold text-text-primary">Redeem Points Balance</p>
                          <p className="text-[9px] text-text-secondary mt-0.5">Available: <span className="font-bold text-brand-primary">{availablePoints} Points</span></p>
                        </div>
                        <button
                          onClick={() => setUsePoints(!usePoints)}
                          className={`w-10 h-5 rounded-full flex items-center transition-colors p-0.5 ${usePoints ? 'bg-brand-primary' : 'bg-gray-200'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${usePoints ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Payment Channel Options */}
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-text-secondary uppercase tracking-wider block text-left">Choose Payment Method</label>
                    
                    {/* Method 1: UPI */}
                    <div 
                      onClick={() => setPaymentMethod('upi')}
                      className={`border rounded-2xl p-3 cursor-pointer transition-all flex items-start gap-3 text-left ${
                        paymentMethod === 'upi' ? 'border-rose-600 bg-rose-50/5' : 'border-gray-200 bg-card hover:border-gray-250'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="payment_method" 
                        checked={paymentMethod === 'upi'}
                        onChange={() => setPaymentMethod('upi')}
                        className="mt-0.5 accent-rose-600 text-rose-600 border-gray-300"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-extrabold text-text-primary">UPI (Google Pay, PhonePe, UPI ID)</span>
                          <QrCode size={16} className="text-text-secondary" />
                        </div>
                        
                        {paymentMethod === 'upi' && (
                          <div className="mt-3.5 space-y-3 pt-3.5 border-t border-gray-100 animate-fade-in-up">
                            <div className="flex gap-2 text-[10px] font-bold">
                              {['GPay', 'PhonePe', 'Paytm'].map((app) => (
                                <button
                                  key={app}
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setUpiMethod('apps'); setSelectedUpiApp(app); }}
                                  className={`flex-1 py-2 border rounded-xl transition-all ${
                                    upiMethod === 'apps' && selectedUpiApp === app
                                      ? 'border-rose-600 bg-rose-50/20 text-rose-700 font-extrabold'
                                      : 'border-gray-200 text-text-secondary hover:border-gray-300 font-bold'
                                  }`}
                                >
                                  {app}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setUpiMethod('id'); }}
                                className={`flex-1 py-2 border rounded-xl transition-all ${
                                  upiMethod === 'id'
                                    ? 'border-rose-600 bg-rose-50/20 text-rose-700 font-extrabold'
                                    : 'border-gray-200 text-text-secondary hover:border-gray-300 font-bold'
                                }`}
                              >
                                Enter UPI ID
                              </button>
                            </div>

                            {upiMethod === 'id' && (
                              <input 
                                type="text"
                                placeholder="example@upi"
                                value={upiId}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setUpiId(e.target.value)}
                                className="w-full bg-surface border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-text-primary outline-none focus:border-rose-600"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Method 2: Cards */}
                    <div 
                      onClick={() => setPaymentMethod('card')}
                      className={`border rounded-2xl p-3 cursor-pointer transition-all flex items-start gap-3 text-left ${
                        paymentMethod === 'card' ? 'border-rose-600 bg-rose-50/5' : 'border-gray-200 bg-card hover:border-gray-250'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="payment_method" 
                        checked={paymentMethod === 'card'}
                        onChange={() => setPaymentMethod('card')}
                        className="mt-0.5 accent-rose-600 text-rose-600 border-gray-300"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-extrabold text-text-primary">Credit / Debit Card</span>
                          <CreditCard size={16} className="text-text-secondary" />
                        </div>

                        {paymentMethod === 'card' && (
                          <div className="mt-3.5 space-y-3 pt-3.5 border-t border-gray-100 animate-fade-in-up text-left" onClick={(e) => e.stopPropagation()}>
                            <div>
                              <label className="text-[9px] font-bold text-text-secondary uppercase block mb-1">Card Holder Name</label>
                              <input 
                                type="text"
                                placeholder="Enter holder name"
                                value={cardName}
                                onChange={(e) => setCardName(e.target.value)}
                                className="w-full bg-surface border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-text-primary outline-none focus:border-rose-600"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-text-secondary uppercase block mb-1">Card Number</label>
                              <input 
                                type="text"
                                maxLength="19"
                                placeholder="XXXX XXXX XXXX XXXX"
                                value={cardNumber}
                                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                className="w-full bg-surface border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-text-primary outline-none focus:border-rose-600"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[9px] font-bold text-text-secondary uppercase block mb-1">Expiry Date</label>
                                <input 
                                  type="text"
                                  maxLength="5"
                                  placeholder="MM/YY"
                                  value={cardExpiry}
                                  onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                                  className="w-full bg-surface border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-text-primary outline-none focus:border-rose-600"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-text-secondary uppercase block mb-1">CVV</label>
                                <input 
                                  type="password"
                                  maxLength="3"
                                  placeholder="XXX"
                                  value={cardCvv}
                                  onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                                  className="w-full bg-surface border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-text-primary outline-none focus:border-rose-600"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Method 3: Netbanking */}
                    <div 
                      onClick={() => setPaymentMethod('netbanking')}
                      className={`border rounded-2xl p-3 cursor-pointer transition-all flex items-start gap-3 text-left ${
                        paymentMethod === 'netbanking' ? 'border-rose-600 bg-rose-50/5' : 'border-gray-200 bg-card hover:border-gray-250'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="payment_method" 
                        checked={paymentMethod === 'netbanking'}
                        onChange={() => setPaymentMethod('netbanking')}
                        className="mt-0.5 accent-rose-600 text-rose-600 border-gray-300"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-extrabold text-text-primary">Net Banking</span>
                          <Landmark size={16} className="text-text-secondary" />
                        </div>

                        {paymentMethod === 'netbanking' && (
                          <div className="mt-3.5 pt-3.5 border-t border-gray-100 animate-fade-in-up text-left" onClick={(e) => e.stopPropagation()}>
                            <label className="text-[9px] font-bold text-text-secondary uppercase block mb-1">Select Bank</label>
                            <div className="relative">
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setIsBankDropdownOpen(!isBankDropdownOpen); }}
                                className="w-full bg-surface border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-text-primary outline-none text-left flex justify-between items-center pr-8 font-bold focus:border-rose-600 cursor-pointer"
                              >
                                <span>{banksList.find(b => b.id === selectedBank)?.name || selectedBank}</span>
                                <span className="text-[8px] text-text-secondary">▼</span>
                              </button>

                              {isBankDropdownOpen && (
                                <div className="absolute left-0 right-0 mt-1 bg-card border border-gray-200 rounded-xl shadow-lg z-50 max-h-40 overflow-y-auto divide-y divide-gray-150/50 py-1">
                                  {banksList.map((bank) => (
                                    <div
                                      key={bank.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedBank(bank.id);
                                        setIsBankDropdownOpen(false);
                                      }}
                                      className={`px-3.5 py-2.5 text-xs font-semibold cursor-pointer hover:bg-rose-50/50 transition-colors text-left ${
                                        selectedBank === bank.id ? 'text-rose-600 bg-rose-50/20 font-bold' : 'text-text-primary'
                                      }`}
                                    >
                                      {bank.name}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pay button */}
                  <div className="pt-3">
                    <button
                      onClick={handleConfirmPayment}
                      disabled={
                        !paymentMethod ||
                        (paymentMethod === 'upi' && upiMethod === 'id' && !upiId.includes('@')) ||
                        (paymentMethod === 'card' && (!cardName || cardNumber.length < 15 || cardExpiry.length < 5 || cardCvv.length < 3))
                      }
                      className={`w-full py-3.5 text-white font-extrabold text-xs rounded-2xl press-scale shadow-md ${
                        (paymentMethod && 
                        (paymentMethod !== 'upi' || upiMethod !== 'id' || upiId.includes('@')) && 
                        (paymentMethod !== 'card' || (cardName && cardNumber.length >= 15 && cardExpiry.length === 5 && cardCvv.length === 3)))
                          ? 'bg-rose-600 hover:bg-rose-700 cursor-pointer shadow-rose-200'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                      }`}
                    >
                      Pay ₹{pricing.finalAmount} securely
                    </button>
                    <p className="text-[9px] text-center text-text-secondary mt-2.5">
                      🔒 Your transaction is secured with 256-bit SSL encryption.
                    </p>
                  </div>
                </>
              ) : checkoutStep === 'processing' ? (
                /* ─── PAYMENT PROCESSING SPIN STATE ─── */
                <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                  <div className="relative flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-4 border-rose-100 border-t-rose-600 animate-spin" />
                    <Heart size={20} className="text-rose-600 absolute animate-pulse fill-rose-600/10" />
                  </div>
                  <div className="text-center space-y-1.5">
                    <h4 className="text-xs font-extrabold text-rose-950">Authorizing Payment...</h4>
                    <p className="text-[10px] text-text-secondary font-medium leading-relaxed">
                      Please do not refresh the page or press the back button.
                    </p>
                  </div>
                </div>
              ) : (
                /* ─── SUCCESS screen ─── */
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-5 animate-fade-in-up">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-md animate-scale-up mx-auto">
                    <CheckCircle2 size={36} className="stroke-[2.5]" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-black text-emerald-950">Payment Successful!</h3>
                    <p className="text-[11px] text-text-secondary font-medium leading-relaxed px-4">
                      Congratulations! Your profile has been upgraded to <strong>{selectedPlan}</strong> successfully.
                    </p>
                  </div>

                  {/* Receipt Box */}
                  <div className="bg-gray-50 border border-gray-150 p-4.5 rounded-2xl w-full text-left space-y-2.5 text-[10px] font-bold text-text-primary">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                      <span className="text-text-secondary uppercase">Receipt details</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">Paid</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Plan Level:</span>
                      <span>{selectedPlan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Duration Plan:</span>
                      <span>{selectedDuration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Amount Paid:</span>
                      <span className="text-emerald-700 font-extrabold">₹{currentPriceObj.final}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Trans ID:</span>
                      <span className="font-mono text-gray-500">TXN{Math.floor(Date.now() / 1000)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Active Since:</span>
                      <span>{new Date().toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowCheckout(false);
                      navigate('/member/profile');
                    }}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold press-scale shadow-lg shadow-emerald-100 transition-all animate-scale-up"
                  >
                    Go back to Profile
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ─── PREMIER SUCCESS MODAL ─── */}
      {showPremierSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-up text-left">
            <div className="flex justify-between items-start border-b border-gray-150/50 pb-2">
              <h3 className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" />
                Request Submitted
              </h3>
              <button 
                onClick={() => setShowPremierSuccess(false)}
                className="p-1 hover:bg-gray-50 rounded-full text-text-secondary"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-[11px] text-text-secondary font-medium leading-relaxed">
              Thank you! A MeriSamaj Premier Relationship Manager will call you within 24 hours to discuss options and guide you on offline verification.
            </p>
            <button
              onClick={() => setShowPremierSuccess(false)}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs"
            >
              Understood
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default UpgradeMembershipPage;
