import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, Building2, Smartphone, Coins, Lock } from 'lucide-react';
import { useReferral } from './ReferralContext';

const RedeemPointsPage = () => {
  const navigate = useNavigate();
  const { availablePoints } = useReferral();
  
  const [method, setMethod] = useState('UPI');
  const [details, setDetails] = useState('');
  const [amount, setAmount] = useState('');

  return (
    <div className="bg-[#F8F7FC] min-h-screen pb-24 font-sans">
      {/* Header */}
      <div className="bg-white px-5 h-16 flex items-center border-b border-gray-150/40 sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-slate-800 active:scale-95 transition-transform">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-[17px] font-black text-slate-800 ml-3">Redeem Points</h1>
      </div>

      <div className="p-5 space-y-6 max-w-xl mx-auto">
        
        {/* Phase 2 Coming Soon Alert Banner */}
        <div className="bg-amber-50 border-2 border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-amber-900 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <Lock size={20} className="text-amber-700" />
          </div>
          <div>
            <h4 className="text-[13px] font-black text-amber-900">Cash Payouts & Redemption Opening Soon (Phase 2)</h4>
            <p className="text-[11px] font-medium text-amber-700 mt-1 leading-snug">
              Your points are safely being accumulated in real time with every referral event! Cash withdrawals via UPI and Bank transfer will be unlocked in Phase 2.
            </p>
          </div>
        </div>

        {/* Available Points Card */}
        <div className="relative rounded-[24px] overflow-hidden shadow-[0_8px_24px_rgba(16,185,129,0.15)] bg-gradient-to-br from-[#065F46] via-[#047857] to-[#059669]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2" />
          
          <div className="relative z-10 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Coins size={16} className="text-emerald-200" />
              <p className="text-emerald-100 text-[12px] font-bold uppercase tracking-wider">Available Points Balance</p>
            </div>
            
            <div className="flex flex-col">
              <h2 className="text-white text-4xl font-black leading-none">{availablePoints.toLocaleString()}</h2>
              <div className="mt-4 pt-4 border-t border-emerald-500/30 flex justify-between items-center">
                <span className="text-emerald-200/80 text-[12px] font-semibold uppercase tracking-wider">Equivalent Cash Value</span>
                <span className="text-white text-xl font-black">₹{availablePoints.toLocaleString()}.00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Disabled Form Preview */}
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6 opacity-75">
          
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100/50">
            <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider block mb-3">Points to Redeem</label>
            <div className="relative">
              <Coins size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary" />
              <input
                type="number"
                disabled
                placeholder="Enter points (Min 500)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 text-[15px] font-bold text-slate-500 outline-none cursor-not-allowed"
              />
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100/50">
            <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider block mb-3">Withdrawal Method</label>
            <div className="space-y-2.5">
              {[
                { id: 'UPI', icon: Smartphone, label: 'UPI Transfer' },
                { id: 'Bank Transfer', icon: Building2, label: 'Bank Transfer' },
                { id: 'Wallet', icon: Wallet, label: 'Wallet Balance' }
              ].map(opt => {
                const Icon = opt.icon;
                const isSelected = method === opt.id;
                return (
                  <label key={opt.id} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-not-allowed ${
                    isSelected ? 'border-brand-primary bg-brand-primary/5' : 'border-slate-100 bg-white'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSelected ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Icon size={16} />
                      </div>
                      <span className={`text-[14px] font-bold ${isSelected ? 'text-brand-primary' : 'text-slate-700'}`}>{opt.label}</span>
                    </div>
                    <input type="radio" disabled className="hidden" name="method" value={opt.id} checked={isSelected} onChange={() => setMethod(opt.id)} />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100/50">
            <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider block mb-3">
              Payment Details
            </label>
            <input
              type="text"
              disabled
              placeholder="e.g. yourname@upi or Account Number"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full bg-slate-100 border border-slate-200 rounded-xl py-3.5 px-4 text-[14px] font-bold text-slate-500 outline-none cursor-not-allowed"
            />
          </div>

          <button 
            type="button"
            disabled
            className="w-full py-4 bg-slate-300 text-slate-600 rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2 cursor-not-allowed shadow-none"
          >
            <Lock size={16} /> Coming Soon (Phase 2)
          </button>
        </form>
      </div>
    </div>
  );
};

export default RedeemPointsPage;
