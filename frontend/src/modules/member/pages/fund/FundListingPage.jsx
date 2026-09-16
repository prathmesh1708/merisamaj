import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Wallet, IndianRupee, Users, TrendingUp, AlertCircle, Menu, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';
import { useFund } from '../../context/FundContext';
import { useData } from '../../context/DataProvider';

export default function FundListingPage() {
  const navigate = useNavigate();
  const { funds, currentUserId, isAdmin, contributions, loading, error } = useFund();
  const { setMobileMenuOpen, markModuleAsVisited } = useData();
  const [selectedScope, setSelectedScope] = useState('ALL'); // 'ALL' | 'COMMUNITY' | 'LOCAL'

  useEffect(() => {
    if (markModuleAsVisited) {
      markModuleAsVisited('fund');
    }
  }, [markModuleAsVisited]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans justify-center items-center">
        <div className="w-12 h-12 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin mb-4" />
        <p className="text-sm font-extrabold text-slate-700">Loading Community Funds...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans justify-center items-center p-6 text-center">
        <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-3">
          <AlertCircle size={24} />
        </div>
        <h3 className="text-base font-extrabold text-slate-800 mb-1">{error}</h3>
        <p className="text-xs text-slate-500 max-w-xs font-medium">Please verify your connection and try again.</p>
      </div>
    );
  }

  // Filter funds by selected scope
  const displayFunds = funds.filter(f => {
    const isLocal = f.scope === 'LOCAL' || f.creatorType === 'LOCAL_HEAD' || f.creatorRole === 'sub_head';
    if (selectedScope === 'COMMUNITY') return !isLocal;
    if (selectedScope === 'LOCAL') return isLocal;
    return true;
  });

  const communityFundsCount = funds.filter(f => f.scope !== 'LOCAL' && f.creatorType !== 'LOCAL_HEAD' && f.creatorRole !== 'sub_head').length;
  const localFundsCount = funds.filter(f => f.scope === 'LOCAL' || f.creatorType === 'LOCAL_HEAD' || f.creatorRole === 'sub_head').length;

  // Calculate overall statistics
  const totalFunds = funds.length;
  let overallExpected = 0;
  let overallCollected = 0;
  let overallContributors = new Set();

  funds.forEach(fund => {
    const fundContribs = contributions[fund.id] || [];
    fundContribs.forEach(c => {
      overallExpected += c.assignedAmount || 0;
      overallCollected += c.paidAmount || 0;
      if (c.paidAmount > 0) {
        overallContributors.add(c.memberId);
      }
    });
  });

  const overallPending = Math.max(0, overallExpected - overallCollected);
  const overallPercentage = overallExpected > 0 ? Math.min(100, Math.round((overallCollected / overallExpected) * 100)) : 0;

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans pb-24 select-none">
      {/* Header Bar — Glass morphism */}
      <div className="bg-white/85 backdrop-blur-xl border-b border-purple-100/30 px-4 h-14 flex items-center justify-between sticky top-0 z-30 shadow-[0_2px_12px_rgba(124,58,237,0.03)] shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMobileMenuOpen(true)} 
            className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-purple-50 transition-colors press-scale"
          >
            <Menu size={20} strokeWidth={2.5} />
          </button>
          <h1 className="text-[17px] font-extrabold text-slate-800 tracking-tight">Samaj Funds & Dues</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-4xl mx-auto w-full">
        
        {/* Overall Statistics Dashboard — Royal Glass Gradient Card */}
        <div className="bg-gradient-to-br from-[#2A0E5C] via-[#3B1578] to-[#5B21B6] rounded-[28px] p-5.5 text-white shadow-[0_10px_30px_rgba(59,21,120,0.25)] relative overflow-hidden">
          {/* Ambient Glow Effects */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-purple-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center">
                <Wallet size={16} className="text-purple-200" />
              </div>
              <h2 className="text-[15px] font-extrabold text-white tracking-tight">Total Funds Overview</h2>
            </div>
            <button 
              onClick={() => navigate('/member/fund/total-report')}
              className="px-3.5 py-1.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white rounded-xl text-[11px] font-bold transition-all press-scale backdrop-blur-md flex items-center gap-1 cursor-pointer"
            >
              View Audit <ArrowRight size={12} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3.5 relative z-10 mb-4">
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 relative overflow-hidden text-left">
              <p className="text-[9.5px] font-extrabold text-emerald-300 mb-1 uppercase tracking-wider">Total Collected</p>
              <p className="text-[19px] font-black text-white leading-none tracking-tight">₹{overallCollected.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 relative overflow-hidden text-left">
              <p className="text-[9.5px] font-extrabold text-purple-200 mb-1 uppercase tracking-wider">Total Target</p>
              <p className="text-[19px] font-black text-white leading-none tracking-tight">₹{overallExpected.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="flex justify-between items-center bg-white/8 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 relative z-10 mb-4">
            <div className="flex items-center gap-2.5 text-left">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-300/30 text-rose-300 flex items-center justify-center">
                <AlertCircle size={16} />
              </div>
              <div>
                <p className="text-[9.5px] font-extrabold text-purple-200 uppercase tracking-wider leading-tight">Total Remaining Dues</p>
                <p className="text-[13.5px] font-black text-rose-300 mt-0.5">₹{overallPending.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9.5px] font-extrabold text-purple-200 uppercase tracking-wider leading-tight mb-0.5">Donors</p>
              <p className="text-[13px] font-black text-white">{overallContributors.size} Active</p>
            </div>
          </div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10.5px] font-bold text-purple-200">Overall Community Progress</span>
              <span className="text-[12px] font-black text-amber-300">{overallPercentage}%</span>
            </div>
            <div className="h-2 w-full bg-white/15 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${overallPercentage}%` }} />
            </div>
          </div>
        </div>

        {/* Funds List */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 px-1">
            <h3 className="text-[15px] font-extrabold text-slate-800 tracking-tight">Available Samaj Funds</h3>
            
            {/* Scope Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setSelectedScope('ALL')}
                className={`px-3 py-1 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
                  selectedScope === 'ALL'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({funds.length})
              </button>
              <button
                onClick={() => setSelectedScope('COMMUNITY')}
                className={`px-3 py-1 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                  selectedScope === 'COMMUNITY'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                👑 Community ({communityFundsCount})
              </button>
              <button
                onClick={() => setSelectedScope('LOCAL')}
                className={`px-3 py-1 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                  selectedScope === 'LOCAL'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📍 Local Chapters ({localFundsCount})
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {displayFunds.map(fund => {
              const fContribs = contributions[fund.id] || [];
              let fExpected = 0;
              let fCollected = 0;
              let fDonorsCount = 0;
              fContribs.forEach(c => {
                fExpected += c.assignedAmount || 0;
                fCollected += c.paidAmount || 0;
                if (c.paidAmount > 0) fDonorsCount++;
              });
              const fPercentage = fExpected > 0 ? Math.min(100, Math.round((fCollected / fExpected) * 100)) : 0;
              const isLocalFund = fund.scope === 'LOCAL' || fund.creatorType === 'LOCAL_HEAD' || fund.creatorRole === 'sub_head';
              
              // Personal status for logged-in user
              const myContrib = fContribs.find(c => c.memberId === currentUserId);
              const isPaid = myContrib && myContrib.paidAmount >= myContrib.assignedAmount;
              const myDue = myContrib ? Math.max(0, myContrib.assignedAmount - myContrib.paidAmount) : fund.contributionPerMember;

              return (
                <div 
                  key={fund.id}
                  onClick={() => navigate(`/member/fund/${fund.id}`)}
                  className="bg-white rounded-[26px] border border-slate-200/80 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_28px_rgba(124,58,237,0.08)] hover:border-purple-200 transition-all duration-300 cursor-pointer relative overflow-hidden group text-left"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="pr-12">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border ${
                          isLocalFund 
                            ? 'bg-amber-50 text-amber-900 border-amber-200' 
                            : 'bg-purple-50 text-purple-900 border-purple-200'
                        }`}>
                          {isLocalFund ? `📍 Local Chapter (${fund.city || 'Local Area'})` : '👑 Community Master Fund'}
                        </span>
                        <span className="text-[10.5px] text-slate-500 font-bold">
                          Created by: <strong className="text-slate-700">{fund.createdBy}</strong>
                        </span>
                      </div>
                      <h4 className="text-[16px] font-extrabold text-slate-800 leading-tight mb-1 group-hover:text-purple-700 transition-colors tracking-tight">{fund.name}</h4>
                      <p className="text-[12px] text-slate-500 font-medium line-clamp-1">{fund.purpose}</p>
                    </div>
                    {/* Status Badge */}
                    <span className={`absolute top-5 right-5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      fund.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {fund.status}
                    </span>
                  </div>

                  {myContrib && (
                    <div className="mb-3.5 bg-purple-50/60 p-3 rounded-2xl border border-purple-100/70 flex items-center justify-between">
                      <div>
                        <p className="text-[9.5px] font-extrabold text-purple-500 uppercase tracking-wider mb-0.5">My Contribution Status</p>
                        <p className="text-[13.5px] font-black text-slate-800">
                          ₹{myContrib.paidAmount.toLocaleString('en-IN')} <span className="text-slate-400 font-bold text-[11px]">/ ₹{myContrib.assignedAmount}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                          isPaid ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : myContrib.paidAmount > 0 ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-rose-100 text-rose-700 border border-rose-200'
                        }`}>
                          {isPaid ? 'Fully Paid' : myContrib.paidAmount > 0 ? 'Partial' : 'Pending'}
                        </span>
                        {!isPaid && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/member/fund/${fund.id}`);
                            }}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[11px] font-extrabold transition-all shadow-xs press-scale cursor-pointer"
                          >
                            Pay Online
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-end mb-1.5">
                      <div>
                        <p className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Community Collection</p>
                        <p className="text-[13px] font-extrabold text-slate-800">₹{fCollected.toLocaleString('en-IN')} <span className="text-[11px] font-medium text-slate-400">/ ₹{fExpected.toLocaleString('en-IN')}</span></p>
                      </div>
                      <span className="text-[13px] font-black text-purple-700">{fPercentage}%</span>
                    </div>
                    <div className="h-2 w-full bg-purple-50 rounded-full overflow-hidden border border-purple-100/50">
                      <div className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-700" style={{ width: `${fPercentage}%` }} />
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/member/fund/${fund.id}/dues`);
                        }}
                        className="flex items-center gap-1.5 text-purple-700 hover:text-purple-900 font-bold text-[11.5px] bg-purple-50/80 hover:bg-purple-100/80 px-2.5 py-1 rounded-xl transition-colors cursor-pointer"
                      >
                        <Users size={13} />
                        <span>{fDonorsCount} Donors • View List ↗</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400">Due: {fund.dueDate ? new Date(fund.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Ongoing'}</span>
                      <div className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all">
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {displayFunds.length === 0 && (
              <div className="bg-white rounded-[28px] p-8 border border-slate-200/80 text-center shadow-xs">
                <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Wallet size={26} />
                </div>
                <h3 className="text-[15px] font-extrabold text-slate-800 mb-1">No Funds Available in this View</h3>
                <p className="text-[12px] font-medium text-slate-400">Switch tabs above to view all active community or local funds.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
