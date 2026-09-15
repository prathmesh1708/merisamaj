import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ChevronLeft, Info, FileText, X, CheckCircle2, 
  HeartHandshake, TrendingUp, Users, ShieldAlert, 
  Wallet, Banknote, ShieldCheck, ArrowRight, UserCheck
} from 'lucide-react';
import { useFund } from '../../context/FundContext';

export default function FundDashboardPage() {
  const { fundId } = useParams();
  const navigate = useNavigate();
  const { getFundById, getContributionsByFund, getExpensesByFund, currentUserId, isAdmin, razorpayMakePayment, mockUsers } = useFund();

  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState(0);

  // Payment flow states
  const [checkoutStep, setCheckoutStep] = useState('pay'); // 'pay' | 'processing' | 'success'
  const [isPayingNow, setIsPayingNow] = useState(false);   // Disables button during payment
  const [lastPaymentResult, setLastPaymentResult] = useState(null);

  const fund = getFundById(fundId);
  
  if (!fund) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-800">Fund Not Found</h2>
          <button onClick={() => navigate('/member/fund')} className="mt-4 text-purple-600 font-bold">Go Back</button>
        </div>
      </div>
    );
  }

  const isLocalFund = fund.scope === 'LOCAL' || fund.creatorType === 'LOCAL_HEAD';
  const fundContribs = getContributionsByFund(fundId);
  const fundExpenses = getExpensesByFund(fundId);

  // My Contribution
  const myContrib = fundContribs.find(c => c.memberId === currentUserId) || { assignedAmount: 0, paidAmount: 0 };
  const myDue = myContrib.assignedAmount - myContrib.paidAmount;
  const isPaid = myContrib.paidAmount > 0 && myDue <= 0;

  // Community Calculations
  const totalMembers = fund.assignedMembers?.length || fundContribs.length || 0;
  let targetCollection = 0;
  let totalCollected = 0;
  let fullyPaidMembers = 0;

  fundContribs.forEach(c => {
    targetCollection += c.assignedAmount || 0;
    totalCollected += c.paidAmount || 0;
    if (c.paidAmount >= c.assignedAmount) fullyPaidMembers++;
  });
  
  const percentage = targetCollection > 0 ? Math.min(100, Math.round((totalCollected / targetCollection) * 100)) : 0;
  const remaining = Math.max(0, targetCollection - totalCollected);

  // Financial Dashboard (Expenses)
  const totalExpenses = fundExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const availableBalance = totalCollected - totalExpenses;

  // Recent Contributors with donations
  const contributorsList = fundContribs
    .filter(c => c.paidAmount > 0)
    .sort((a, b) => (b.paidAmount || 0) - (a.paidAmount || 0))
    .slice(0, 6);

  const handleRazorpayPayment = async () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid contribution amount.');
      return;
    }

    setIsPayingNow(true);
    setCheckoutStep('processing');

    const result = await razorpayMakePayment(fundId, amount, {
      onSuccess: (data) => {
        setLastPaymentResult(data);
        setCheckoutStep('success');
      },
      onCancel: () => {
        setCheckoutStep('pay');
        alert('Payment cancelled.');
      },
      onFailure: (msg) => {
        setCheckoutStep('pay');
        alert(msg || 'Payment failed. Please try again.');
      }
    });

    setIsPayingNow(false);
    if (result?.cancelled || !result?.success) {
      setCheckoutStep('pay');
    }
  };

  const openPaymentModal = () => {
    setPayAmount(myDue > 0 ? myDue : fund.contributionPerMember);
    setCheckoutStep('pay');
    setLastPaymentResult(null);
    setShowPayModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans pb-16 select-none">
      {/* Header Bar — Glass morphism */}
      <div className="bg-white/85 backdrop-blur-xl border-b border-purple-100/30 px-4 h-14 flex items-center justify-between sticky top-0 z-30 shadow-[0_2px_12px_rgba(124,58,237,0.03)] shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-purple-50 transition-colors press-scale"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <div className="flex flex-col text-left">
            <h1 className="text-base font-extrabold text-slate-800 tracking-tight leading-tight line-clamp-1 pr-2">{fund.name}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`px-2 py-0.2 rounded-full text-[8.5px] font-black uppercase tracking-wider ${
                isLocalFund ? 'bg-amber-50 text-amber-700' : 'bg-purple-50 text-purple-700'
              }`}>
                {isLocalFund ? `Local Chapter (${fund.city || 'Chapter'})` : 'Community Master Fund'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-4xl mx-auto w-full">
        
        {/* MY CONTRIBUTION WIDGET */}
        <div className="bg-white rounded-[26px] border border-slate-200/80 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-left relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100/60">
                <HeartHandshake size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-[15px] text-slate-800 tracking-tight">My Contribution</h3>
                <p className="text-[10px] text-slate-400 font-bold">Created by {fund.createdBy}</p>
              </div>
            </div>
            {isPaid && (
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-3 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={13} /> Paid in Full
              </span>
            )}
          </div>
          
          <div className="flex items-end justify-between pt-1">
            <div>
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Assigned Target Fee</p>
              <p className="text-[20px] font-black text-slate-900 leading-none">₹{myContrib.assignedAmount.toLocaleString('en-IN')}</p>
              
              <div className="flex items-center gap-3 mt-3.5">
                <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Paid</p>
                  <p className="text-[13px] font-black text-emerald-600">₹{myContrib.paidAmount.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Remaining Due</p>
                  <p className={`text-[13px] font-black ${myDue > 0 ? 'text-rose-600' : 'text-slate-700'}`}>₹{myDue.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
            
            {myDue > 0 ? (
              <button 
                onClick={openPaymentModal}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-[13px] font-black uppercase tracking-wider px-5 py-3 rounded-2xl shadow-lg shadow-purple-500/25 active:scale-95 transition-all cursor-pointer"
              >
                Pay Online
              </button>
            ) : (
              <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-2.5 rounded-2xl flex items-center gap-1.5 font-bold shadow-xs">
                <CheckCircle2 size={16} />
                <span className="text-xs">Ledger Clear</span>
              </div>
            )}
          </div>
        </div>

        {/* COMMUNITY COLLECTION BANNER */}
        <div className="bg-gradient-to-br from-[#2A0E5C] via-[#3B1578] to-[#5B21B6] rounded-[28px] p-5.5 text-white shadow-[0_10px_30px_rgba(59,21,120,0.25)] relative overflow-hidden text-left">
          <div className="absolute top-0 right-0 w-36 h-36 bg-purple-400/10 rounded-full blur-2xl" />
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-extrabold text-purple-200 uppercase tracking-wider">Community Collection Pool</span>
            <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase ${
              isLocalFund ? 'bg-amber-400/20 text-amber-300' : 'bg-white/15 text-purple-200'
            }`}>
              {isLocalFund ? `Local Chapter (${fund.city || 'Area'})` : 'Community Master'}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-4">
            <h2 className="text-3xl font-black leading-none">₹ {totalCollected.toLocaleString('en-IN')}</h2>
            <span className="text-[12px] font-bold text-purple-200/80">/ ₹{targetCollection.toLocaleString('en-IN')} Target</span>
          </div>
          
          <div>
            <div className="flex justify-between text-[11px] font-bold text-purple-200 mb-1.5">
              <span>Collection Progress</span>
              <span className="text-amber-300 font-black">{percentage}%</span>
            </div>
            <div className="h-2.5 w-full bg-white/15 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-1000" 
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* FINANCIAL DASHBOARD */}
        <div className="bg-white rounded-[26px] border border-slate-200/80 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-left space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Wallet size={18} className="text-slate-700" />
              <h3 className="font-extrabold text-[15px] text-slate-800 tracking-tight">Fund Financial Overview</h3>
            </div>
            <button 
              onClick={() => navigate(`/member/fund/${fundId}/report`)}
              className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
            >
              Full Audit <ArrowRight size={13} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-purple-50/50 p-3.5 rounded-2xl border border-purple-100/40">
              <p className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider mb-1">Available Net Bal.</p>
              <p className="text-[16px] font-black text-purple-950">₹ {availableBalance.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-rose-50/40 p-3.5 rounded-2xl border border-rose-100/40">
              <p className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wider mb-1">Total Expenses</p>
              <p className="text-[16px] font-black text-rose-600">₹ {totalExpenses.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* RECENT DONORS & CONTRIBUTORS TRANSPARENCY SECTION */}
        <div className="bg-white rounded-[26px] border border-slate-200/80 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-left space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-[15px] text-slate-800 tracking-tight">Community Contributors</h3>
              <p className="text-[10.5px] font-semibold text-slate-400">All member contributions and donations are audited and transparent</p>
            </div>
            <button 
              onClick={() => navigate(`/member/fund/${fundId}/dues`)}
              className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
            >
              View All ({fundContribs.length}) <ArrowRight size={13} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {contributorsList.map(c => (
              <div 
                key={c.memberId}
                onClick={() => navigate(`/member/fund/${fundId}/member/${c.memberId}`)}
                className="flex items-center justify-between p-3 bg-slate-50/70 hover:bg-purple-50/40 rounded-2xl border border-slate-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center shrink-0">
                    {c.avatar ? (
                      <img src={c.avatar} alt={c.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      c.name?.substring(0, 2).toUpperCase() || 'M'
                    )}
                  </div>
                  <div className="min-w-0 truncate">
                    <p className="font-bold text-slate-800 text-xs truncate">{c.name}</p>
                    <p className="text-[9.5px] text-slate-400 font-medium truncate">{c.lastPaymentDate || 'Paid'}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className="text-xs font-black text-emerald-600">₹{c.paidAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}

            {contributorsList.length === 0 && (
              <div className="col-span-2 text-center py-6 text-slate-400 text-xs font-bold">
                No contributions recorded yet. Be the first to donate!
              </div>
            )}
          </div>
        </div>

        {/* QUICK STATS */}
        <div className="grid grid-cols-2 gap-3">
          <div 
            onClick={() => navigate(`/member/fund/${fundId}/dues`)}
            className="bg-white p-4 rounded-[22px] shadow-xs border border-slate-200/80 flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-all"
          >
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-2">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-[16px] font-black text-slate-800">{fullyPaidMembers} / {totalMembers}</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">Fully Paid Members</p>
          </div>
          
          <div 
            onClick={() => navigate(`/member/fund/${fundId}/dues`)}
            className="bg-white p-4 rounded-[22px] shadow-xs border border-slate-200/80 flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-all"
          >
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-2">
              <ShieldAlert size={20} />
            </div>
            <h3 className="text-[16px] font-black text-slate-800">₹ {remaining.toLocaleString('en-IN')}</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">Pending Collection</p>
          </div>
        </div>

        {/* NAVIGATIONS */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-200/80 shadow-xs mt-2">
          <h3 className="font-extrabold text-[14px] text-slate-800 mb-4 text-left">Fund Governance & Ledger</h3>
          
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => navigate(`/member/fund/${fundId}/dues`)} className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-100 active:scale-95 transition-all">
                <Users size={22} />
              </div>
              <span className="text-[10.5px] font-bold text-slate-600 text-center leading-tight">All Donors</span>
            </button>
            <button onClick={() => navigate(`/member/fund/${fundId}/expense`)} className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-100 active:scale-95 transition-all">
                <FileText size={22} />
              </div>
              <span className="text-[10.5px] font-bold text-slate-600 text-center leading-tight">Expenses</span>
            </button>
            <button onClick={() => navigate(`/member/fund/${fundId}/report`)} className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-100 active:scale-95 transition-all">
                <Info size={22} />
              </div>
              <span className="text-[10.5px] font-bold text-slate-600 text-center leading-tight">Reports</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── CHECKOUT / PAYMENT FLOW MODAL ─── */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scale-up text-left max-h-[85vh]"
          >
            {/* Checkout Header */}
            <div className="bg-purple-50/60 px-5 py-4 border-b border-purple-100/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center border border-purple-200">
                  <Wallet size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-purple-950">Online Samaj Fund Contribution</h3>
                  <p className="text-[9px] font-bold text-slate-500 tracking-wide uppercase">UPI / NetBanking / Cards</p>
                </div>
              </div>
              {checkoutStep !== 'processing' && (
                <button 
                  onClick={() => setShowPayModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-full text-slate-500 cursor-pointer"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Checkout Body Content */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">

              {checkoutStep === 'pay' ? (
                <>
                  {/* Summary Box */}
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex justify-between items-center text-xs font-bold text-slate-800">
                    <div className="text-left">
                      <span className="text-[10px] text-slate-500 font-bold block">{fund.name}</span>
                      <span className="text-purple-950 text-sm mt-0.5 block">Remaining Due: ₹{myDue.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase tracking-wider">Amount to Pay Online (₹)</label>
                    <input 
                      type="number" 
                      value={payAmount}
                      min="1"
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[14px] font-black text-slate-900 outline-none focus:border-purple-600 transition-colors"
                    />
                  </div>

                  {/* Cash Info Notice */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-2xl flex items-start gap-2.5 text-[11px] text-amber-900 font-medium">
                    <Banknote size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Prefer to pay in Cash?</span>
                      Please hand over cash directly to your Local Head or Community Head. They will immediately issue your verified digital receipt.
                    </div>
                  </div>

                  {/* Pay Button */}
                  <div className="pt-1">
                    <button
                      onClick={handleRazorpayPayment}
                      disabled={isPayingNow || Number(payAmount) <= 0}
                      className={`w-full py-3.5 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl active:scale-95 transition-all shadow-md ${
                        !isPayingNow && Number(payAmount) > 0
                          ? 'bg-purple-600 hover:bg-purple-700 cursor-pointer shadow-purple-200'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      }`}
                    >
                      {isPayingNow ? 'Processing...' : `Pay Online ₹${Number(payAmount).toLocaleString('en-IN')}`}
                    </button>
                    <p className="text-[9px] text-center text-slate-500 mt-2.5">
                      🔒 Secured with 256-bit SSL encryption via Razorpay.
                    </p>
                  </div>
                </>
              ) : checkoutStep === 'processing' ? (
                /* ─── PAYMENT PROCESSING SPIN STATE ─── */
                <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                  <div className="relative flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
                    <Wallet size={20} className="text-purple-600 absolute animate-pulse" />
                  </div>
                  <div className="text-center space-y-1.5">
                    <h4 className="text-xs font-extrabold text-purple-950">Opening Razorpay Checkout...</h4>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
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
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed px-4">
                      Thank you! Your contribution to <strong>{fund.name}</strong> has been successfully recorded.
                    </p>
                  </div>

                  {/* Receipt Box */}
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl w-full text-left space-y-2.5 text-[10px] font-bold text-slate-800">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-slate-500 uppercase">Receipt details</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">Paid</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Fund Name:</span>
                      <span className="text-right truncate ml-4">{fund.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Amount Paid:</span>
                      <span className="text-emerald-700 font-extrabold">₹{Number(payAmount).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Trans ID:</span>
                      <span className="font-mono text-slate-400 text-[9px]">{lastPaymentResult?.txnId || lastPaymentResult?.paymentId || `TXN${Math.floor(Date.now() / 1000)}`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Date:</span>
                      <span>{new Date().toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowPayModal(false)}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold active:scale-95 shadow-lg shadow-emerald-100 transition-all animate-scale-up cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
