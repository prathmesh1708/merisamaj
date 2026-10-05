import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, UserPlus, ShoppingBag, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { useReferral } from './ReferralContext';

const MyEarningsPage = () => {
  const navigate = useNavigate();
  const { totalPoints, pendingPoints, redeemedPoints, referralHistory } = useReferral();
  const [activeTab, setActiveTab] = useState('ALL');

  const filteredHistory = referralHistory.filter(item => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'REGISTRATION') return item.type === 'registration';
    if (activeTab === 'SUBSCRIPTION') return item.type === 'subscription';
    if (activeTab === 'MEMBERSHIP') return item.type === 'membership';
    if (activeTab === 'PENDING') return item.status === 'pending';
    return true;
  });

  const getIcon = (type, action) => {
    if (type === 'subscription') return <ShoppingBag size={14} className="text-purple-500" />;
    if (type === 'membership') return <ShoppingBag size={14} className="text-amber-500" />;
    return <UserPlus size={14} className="text-emerald-500" />;
  };

  const getStatusBadge = (status) => {
    if (status === 'earned') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">
          <CheckCircle2 size={10} /> Earned
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded uppercase">
        <Clock size={10} /> Pending
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-[#F8F7FC] min-h-screen pb-24">
      {/* Header */}
      <div className="bg-white px-5 h-16 flex items-center justify-between border-b border-gray-150/40 sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-slate-800 active:scale-95 transition-transform">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-[17px] font-black text-slate-800 ml-3">My Earnings</h1>
        </div>
      </div>

      <div className="p-5 space-y-6">
        
        {/* Earnings Overview Card */}
        <div className="relative rounded-[24px] overflow-hidden shadow-[0_8px_24px_rgba(16,185,129,0.15)] bg-gradient-to-br from-[#065F46] via-[#047857] to-[#059669]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2" />
          
          <div className="relative z-10 p-6">
            <p className="text-emerald-100 text-[12px] font-bold uppercase tracking-wider mb-1">Total Earnings</p>
            <div className="flex items-end gap-2">
              <h2 className="text-white text-4xl font-black leading-none">{totalPoints.toLocaleString()}</h2>
              <span className="text-emerald-200 text-lg font-bold pb-1">Points</span>
            </div>
            <p className="text-emerald-200/80 text-[13px] font-semibold mt-1">≈ ₹{totalPoints.toLocaleString()}.00</p>
            
            <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-emerald-500/30">
              <div>
                <p className="text-emerald-200/70 text-[10px] font-bold uppercase tracking-wider">Pending Points</p>
                <p className="text-white text-lg font-bold mt-0.5">{pendingPoints.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-emerald-200/70 text-[10px] font-bold uppercase tracking-wider">Redeemed Points</p>
                <p className="text-white text-lg font-bold mt-0.5">{redeemedPoints.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Redeem Button */}
        <button 
          onClick={() => navigate('/member/referral/redeem')}
          className="w-full bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-emerald-100/50 active:scale-[0.98] transition-transform"
        >
          <div className="text-left">
            <h4 className="text-[14.5px] font-black text-slate-800">Redeem Points</h4>
            <p className="text-[11.5px] font-semibold text-slate-500 mt-0.5">Withdraw to UPI, Bank or Wallet</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm border border-white">
            <ArrowRight size={18} />
          </div>
        </button>

        {/* History Section */}
        <div className="bg-white rounded-[24px] shadow-sm border border-gray-100/50 overflow-hidden">
          
          {/* Tabs */}
          <div className="flex items-center px-4 pt-4 border-b border-gray-100 overflow-x-auto hide-scrollbar">
            {['ALL', 'REGISTRATION', 'SUBSCRIPTION', 'MEMBERSHIP', 'PENDING'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-[11px] font-black uppercase tracking-wider border-b-2 transition-all shrink-0 ${
                  activeTab === tab 
                    ? 'border-brand-primary text-brand-primary' 
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="divide-y divide-gray-50">
            {filteredHistory.length > 0 ? (
              filteredHistory.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                      {getIcon(item.type, item.action)}
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-slate-800">{item.name}</h4>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">{item.action}</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-1">{formatDate(item.date)}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-[14px] font-black text-brand-primary">+{item.points}</span>
                    {getStatusBadge(item.status)}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400 text-sm font-medium">
                No history found in this category.
              </div>
            )}
          </div>
          
        </div>

      </div>
    </div>
  );
};

export default MyEarningsPage;
