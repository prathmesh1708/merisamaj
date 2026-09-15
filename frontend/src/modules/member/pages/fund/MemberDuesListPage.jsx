import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Search, Filter, CheckCircle2, Clock, AlertTriangle, AlertCircle, HeartHandshake } from 'lucide-react';
import { useFund } from '../../context/FundContext';

export default function MemberDuesListPage() {
  const { fundId } = useParams();
  const navigate = useNavigate();
  const { getFundById, getContributionsByFund, mockUsers } = useFund();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('All'); // 'All', 'Paid', 'Partial', 'Pending'
  
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

  const fundContribs = getContributionsByFund(fundId);
  const isLocalFund = fund.scope === 'LOCAL' || fund.creatorType === 'LOCAL_HEAD';
  
  // Combine all member IDs from both assignedMembers and fundContribs
  const memberIdSet = new Set([
    ...(fund.assignedMembers || []),
    ...fundContribs.map(c => c.memberId)
  ]);
  const allMemberIds = Array.from(memberIdSet);

  // Merge user data with contributions
  const membersList = allMemberIds.map(memberId => {
    const user = mockUsers.find(u => u.id === memberId || u._id === memberId) || {};
    const contrib = fundContribs.find(c => c.memberId === memberId) || { 
      name: user.name, 
      phone: user.phone, 
      avatar: user.avatar, 
      assignedAmount: fund.contributionPerMember, 
      paidAmount: 0, 
      lastPaymentDate: '-' 
    };
    const due = Math.max(0, (contrib.assignedAmount || fund.contributionPerMember) - (contrib.paidAmount || 0));
    
    let status = 'Pending';
    if (contrib.paidAmount >= contrib.assignedAmount && contrib.assignedAmount > 0) status = 'Paid';
    else if (contrib.paidAmount > 0) status = 'Partial';

    return {
      id: memberId,
      name: contrib.name || user.name || 'Community Member',
      phone: contrib.phone || user.phone || '',
      avatar: contrib.avatar || user.avatar || user.profilePic || '',
      city: contrib.city || user.city || '',
      assignedAmount: contrib.assignedAmount || fund.contributionPerMember,
      paidAmount: contrib.paidAmount || 0,
      lastPaymentDate: contrib.lastPaymentDate || '-',
      due,
      status
    };
  });

  // Calculate stats
  const totalMembers = membersList.length;
  const paidMembers = membersList.filter(m => m.status === 'Paid').length;
  const partialMembers = membersList.filter(m => m.status === 'Partial').length;
  const pendingMembers = membersList.filter(m => m.status === 'Pending').length;
  
  const totalDueAmount = membersList.reduce((acc, curr) => acc + curr.due, 0);
  const totalCollectedAmount = membersList.reduce((acc, curr) => acc + curr.paidAmount, 0);

  const filtered = membersList.filter(m => {
    const matchesSearch = m.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.phone?.includes(searchQuery) ||
                          (m.city && m.city.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filter === 'All' ? true : m.status === filter;
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    const statusWeight = { 'Paid': 3, 'Partial': 2, 'Pending': 1 };
    if (statusWeight[a.status] !== statusWeight[b.status]) {
      return statusWeight[b.status] - statusWeight[a.status];
    }
    return b.paidAmount - a.paidAmount;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'Paid': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Partial': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Pending': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Paid': return <CheckCircle2 size={12} className="mr-1 inline" />;
      case 'Partial': return <Clock size={12} className="mr-1 inline" />;
      case 'Pending': return <AlertTriangle size={12} className="mr-1 inline" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans pb-16 select-none">
      {/* Header — Glassmorphism */}
      <div className="bg-white/85 backdrop-blur-xl border-b border-purple-100/30 px-4 h-14 flex items-center justify-between sticky top-0 z-30 shadow-[0_2px_12px_rgba(124,58,237,0.03)] shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors press-scale"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <div className="flex flex-col text-left">
            <h1 className="text-[16px] font-extrabold text-slate-800 leading-tight tracking-tight">All Donors & Contributions</h1>
            <p className="text-[10px] text-purple-600 font-extrabold leading-none uppercase tracking-wider">
              {fund.name} {isLocalFund ? `• Local (${fund.city || 'Chapter'})` : '• Community'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Search Bar & Filters */}
        <div className="p-4 bg-white/80 backdrop-blur-md border-b border-purple-100/20 sticky top-0 z-20 space-y-3 shadow-xs">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search donor by name, city, or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-11 pr-4 py-3 text-[13.5px] font-bold outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 transition-all text-slate-800 placeholder-slate-400"
            />
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500" />
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            {['All', 'Paid', 'Partial', 'Pending'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-xl text-[11.5px] font-bold whitespace-nowrap transition-all press-scale border ${
                  filter === f 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-600 shadow-md shadow-purple-500/20' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-purple-50/50 hover:border-purple-200'
                }`}
              >
                {f} {f === 'Paid' ? `(${paidMembers})` : f === 'Partial' ? `(${partialMembers})` : f === 'Pending' ? `(${pendingMembers})` : `(${totalMembers})`}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-4 max-w-4xl mx-auto w-full">
          {/* Banner Summary */}
          <div className="flex bg-white rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-200/80 overflow-hidden text-slate-800 divide-x divide-slate-100">
            <div className="flex-1 py-3.5 px-4 text-center bg-emerald-50/40">
              <p className="text-[9.5px] font-extrabold text-emerald-600 uppercase tracking-wider mb-1">Total Collected</p>
              <p className="text-[17px] font-black text-emerald-700 leading-none">₹{totalCollectedAmount.toLocaleString('en-IN')}</p>
            </div>
            <div className="flex-1 py-3.5 px-4 text-center bg-rose-50/40">
              <p className="text-[9.5px] font-extrabold text-rose-500 uppercase tracking-wider mb-1">Total Pending</p>
              <p className="text-[17px] font-black text-rose-600 leading-none">₹{totalDueAmount.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Members List */}
          <div className="space-y-3">
            {filtered.map((member) => (
              <div 
                key={member.id}
                onClick={() => navigate(`/member/fund/${fundId}/member/${member.id}`)}
                className="bg-white rounded-[24px] p-4.5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_26px_rgba(124,58,237,0.07)] hover:border-purple-200 transition-all duration-300 cursor-pointer relative overflow-hidden group"
              >
                <div className="flex items-center gap-3 mb-3.5 relative z-10">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-purple-100 text-purple-800 font-black text-[13px] flex items-center justify-center border border-purple-200/80 shrink-0 shadow-2xs">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      member.name?.substring(0, 2).toUpperCase() || 'M'
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h3 className="text-[15px] font-extrabold text-slate-800 leading-tight mb-0.5 truncate group-hover:text-purple-700 transition-colors tracking-tight">{member.name}</h3>
                    <p className="text-[11px] font-semibold text-slate-400 truncate">
                      {member.city ? `${member.city} • ` : ''}{member.phone || 'Samaj Member'}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center shrink-0 ${getStatusColor(member.status)}`}>
                    {getStatusIcon(member.status)}
                    {member.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-3 px-3 bg-slate-50/70 border border-slate-100 rounded-2xl relative z-10 text-left">
                  <div>
                    <p className="text-[9.5px] font-extrabold text-slate-400 mb-0.5 uppercase tracking-wider">Target</p>
                    <p className="text-[13px] font-black text-slate-800">₹{member.assignedAmount}</p>
                  </div>
                  <div>
                    <p className="text-[9.5px] font-extrabold text-slate-400 mb-0.5 uppercase tracking-wider">Donated / Paid</p>
                    <p className="text-[13px] font-black text-emerald-600">₹{member.paidAmount}</p>
                  </div>
                  <div>
                    <p className="text-[9.5px] font-extrabold text-slate-400 mb-0.5 uppercase tracking-wider">Balance</p>
                    <p className={`text-[13px] font-black ${member.due > 0 ? 'text-rose-600' : 'text-slate-800'}`}>₹{member.due}</p>
                  </div>
                </div>

                {member.status !== 'Pending' && member.lastPaymentDate && (
                  <p className="text-[10px] font-bold text-slate-400 mt-2.5 relative z-10 text-right">
                    Last Verified Contribution: {member.lastPaymentDate}
                  </p>
                )}
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="bg-white rounded-[28px] border border-slate-200/80 p-8 text-center shadow-xs">
                <AlertCircle size={32} className="mx-auto text-purple-400 mb-2" />
                <p className="text-[14px] font-extrabold text-slate-700">No contributors found matching your search</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
