import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataProvider';
import { 
  Calendar, 
  CheckCircle2, 
  ShieldCheck, 
  AlertTriangle, 
  Menu, 
  Bell,
  ClipboardList,
  ChevronRight,
  Clock
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { useVoting } from './VotingContext';
import { votingInstructions, votingGuidelines, securityFeatures } from './mockVotingData';

const VotingPage = () => {
  const navigate = useNavigate();
  const { setMobileMenuOpen, getUnreadCountForModule, markModuleAsVisited } = useData();
  const { elections, votedElections, loading, error, refresh } = useVoting();

  useEffect(() => {
    if (markModuleAsVisited) {
      markModuleAsVisited('voting');
    }
  }, [markModuleAsVisited]);

  const activeElections = elections.filter(e => e.status === 'Active');
  const upcomingElections = elections.filter(e => e.status === 'Upcoming');
  const liveOrUpcomingElections = [...activeElections, ...upcomingElections];
  const firstActiveElection = activeElections[0] || upcomingElections[0];
  const pastElections = elections.filter(e => e.status === 'Completed' || e.status === 'Closed');

  const [timeLeft, setTimeLeft] = useState(15); // 15 seconds countdown
  const [isVotingEnded, setIsVotingEnded] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsVotingEnded(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  // Translated names for simulated results
  const simulatedResults = [
    { name: "Rajesh Sharma", votes: "1,253", percentage: 28, color: "bg-emerald-500", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face", initials: "RS" },
    { name: "Suresh Yadav", votes: "2,145", percentage: 48, color: "bg-purple-600", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&crop=face", initials: "SY" },
    { name: "Manish Gupta", votes: "876", percentage: 19, color: "bg-amber-500", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face", initials: "MG" },
    { name: "Ajay Singh", votes: "266", percentage: 5, color: "bg-rose-500", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face", initials: "AS" }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h2 className="text-lg font-bold text-text-primary mb-2">Failed to load elections</h2>
        <p className="text-sm text-text-secondary mb-4">{error}</p>
        <button onClick={refresh} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold">Try Again</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20 font-sans select-none">
      {/* Header Bar — Glass morphism */}
      <div className="bg-white/85 backdrop-blur-xl border-b border-purple-100/30 flex items-center justify-between px-4 h-14 sticky top-0 z-30 shadow-[0_2px_12px_rgba(124,58,237,0.03)]">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileMenuOpen(true)} className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-purple-50 transition-colors press-scale">
            <Menu size={20} strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <ClipboardList size={18} strokeWidth={2.2} />
            </div>
            <div className="text-left">
              <h1 className="text-[17px] font-extrabold text-slate-800 tracking-tight leading-tight">Samaj Voting</h1>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Elections & Polls</p>
            </div>
          </div>
        </div>
        <button onClick={() => navigate('/member/notifications?module=voting')} className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 relative hover:bg-purple-50 transition-all press-scale">
          <Bell size={18} />
          {getUnreadCountForModule('voting') > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-600 rounded-full" />
          )}
        </button>
      </div>

      <div className="px-4 pt-4 max-w-5xl mx-auto space-y-5 text-left">
        
        {/* Purple Hero Banner — Compact Royal Gradient */}
        <div className="bg-gradient-to-br from-[#2A0E5C] via-[#3B1578] to-[#5B21B6] text-white rounded-[24px] p-4.5 sm:p-6 relative overflow-hidden shadow-[0_8px_25px_rgba(59,21,120,0.2)] border border-purple-400/20">
          <div className="absolute top-0 right-0 w-36 h-36 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-28 h-28 bg-purple-300/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between gap-4 relative z-10">
            <div className="space-y-2 max-w-[70%]">
              <h2 className="text-[18px] sm:text-xl font-extrabold text-white tracking-tight leading-tight">Samaj Elections</h2>
              <p className="text-[11px] sm:text-xs text-purple-100/90 leading-relaxed font-medium">
                Vote for the bright future and transparent leadership of your community
              </p>
              <button 
                onClick={() => {
                  if (firstActiveElection) {
                    navigate(`/member/voting/${firstActiveElection.id}`);
                  } else {
                    document.getElementById('election-list-section')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="bg-white text-purple-950 text-[11.5px] font-extrabold px-4 py-2 rounded-xl shadow-md press-scale hover:bg-purple-50 transition-all hover:shadow-lg mt-1"
              >
                {firstActiveElection ? (firstActiveElection.status === 'Active' ? 'Vote Now' : 'View Election') : 'View Elections'}
              </button>
            </div>
            
            {/* Ballot Placement Illustration SVG */}
            <div className="shrink-0 relative z-10">
              <svg viewBox="0 0 100 100" className="w-20 h-20 text-white opacity-95" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="25" y="55" width="50" height="35" rx="3" fill="rgba(255,255,255,0.08)" className="stroke-white" />
                <path d="M35 55V42h30v13" />
                <line x1="42" y1="42" x2="58" y2="42" strokeWidth="4" className="stroke-amber-400" />
                <g className="animate-pulse">
                  <rect x="44" y="22" width="12" height="18" rx="1" fill="white" className="stroke-purple-900" />
                  <line x1="47" y1="27" x2="53" y2="27" stroke="gray" strokeWidth="0.8" />
                  <line x1="47" y1="32" x2="53" y2="32" stroke="gray" strokeWidth="0.8" />
                </g>
                <path d="M82 25c-4-4-11-4-15 0L52 38l3 6 10-10c1.5-1.5 4-1.5 5 0s1.5 4 0 5L58 51" className="stroke-white" />
              </svg>
            </div>
          </div>
        </div>

        {/* 3. Upcoming/Active Election Section */}
        {liveOrUpcomingElections.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[14.5px] font-extrabold text-slate-800 tracking-tight">Active & Upcoming Elections</h3>
              <button 
                onClick={() => navigate('/member/voting/list')}
                className="text-[11.5px] font-extrabold text-purple-600 hover:text-purple-800 flex items-center gap-0.5 cursor-pointer"
              >
                View All <ChevronRight size={13} />
              </button>
            </div>
            
            <div className="space-y-3">
              {liveOrUpcomingElections.slice(0, 2).map(elec => (
                <div 
                  key={elec.id}
                  onClick={() => navigate(`/member/voting/${elec.id}`)}
                  className="bg-white rounded-[24px] p-4 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_28px_rgba(124,58,237,0.08)] hover:border-purple-200 flex items-center justify-between cursor-pointer transition-all duration-300 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0 border border-purple-100">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <h4 className="text-[13.5px] font-extrabold text-slate-800 group-hover:text-purple-700 transition-colors tracking-tight">{elec.title}</h4>
                      <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                        {elec.startDate} - {elec.endDate}
                      </p>
                    </div>
                  </div>
                  <span className={`border text-[9.5px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${
                    elec.status === 'Active' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' 
                      : 'bg-amber-50 text-amber-700 border-amber-200/60'
                  }`}>
                    {elec.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Horizontal Candidates Section — Clean Neutral Avatars */}
        {firstActiveElection && (
          <div className="space-y-3">
            <h3 className="text-[14.5px] font-extrabold text-slate-800 tracking-tight">Candidates ({firstActiveElection.title})</h3>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {firstActiveElection.candidates.map(candidate => (
                <div 
                  key={candidate.id}
                  onClick={() => navigate(`/member/voting/${firstActiveElection.id}`)}
                  className="flex flex-col items-center text-center shrink-0 w-20 cursor-pointer group"
                >
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 text-slate-700 font-black text-[15px] flex items-center justify-center border-2 border-slate-200 group-hover:border-purple-600 transition-all duration-200 shadow-2xs">
                      {candidate.avatar ? (
                        <img src={candidate.avatar} alt={candidate.name} className="w-full h-full object-cover" />
                      ) : (
                        candidate.initials || candidate.name?.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-purple-600 rounded-full flex items-center justify-center text-white border-2 border-white shadow-2xs">
                      <CheckCircle2 size={10} strokeWidth={3} />
                    </div>
                  </div>
                  <span className="text-[11px] font-extrabold text-slate-800 mt-2 truncate w-full group-hover:text-purple-700 tracking-tight">
                    {candidate.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Process Flow Section */}
        <div className="bg-white rounded-[26px] p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-[14.5px] font-extrabold text-slate-800 tracking-tight">Voting Process</h3>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">Contribute to community elections in simple steps.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1">
            {votingInstructions.map((inst) => (
              <div 
                key={inst.id} 
                className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-100 text-center flex flex-col items-center justify-start space-y-1.5 hover:shadow-xs transition-all"
              >
                <div className="w-7 h-7 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full flex items-center justify-center text-[11px] font-black shadow-2xs">
                  {inst.step}
                </div>
                <h4 className="text-[11.5px] font-extrabold text-slate-800 tracking-tight">{inst.title}</h4>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed text-center">{inst.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 6. List of Elections */}
        <div className="space-y-3">
          <h3 id="election-list-section" className="text-[14.5px] font-extrabold text-slate-800 tracking-tight pt-1 scroll-mt-4">Election List</h3>
          
          {/* Active & Upcoming List */}
          {liveOrUpcomingElections.map(elec => (
            <div 
              key={elec.id}
              onClick={() => navigate(`/member/voting/${elec.id}`)}
              className="bg-white rounded-[24px] p-4 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_28px_rgba(124,58,237,0.08)] hover:border-purple-200 cursor-pointer relative overflow-hidden group transition-all duration-300"
            >
              {votedElections[elec.id] && (
                <div className="absolute right-0 top-0 bg-emerald-600 text-white text-[9px] font-black uppercase py-0.5 px-3 rounded-bl-xl flex items-center gap-0.5">
                  Voted ✓
                </div>
              )}
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-[13.5px] font-extrabold text-slate-800 group-hover:text-purple-700 transition-colors tracking-tight">{elec.title}</h4>
                <span className={`border text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  elec.status === 'Active' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' 
                    : 'bg-amber-50 text-amber-700 border-amber-200/60'
                }`}>
                  {elec.status}
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-400">
                {elec.startDate} - {elec.endDate}
              </p>
            </div>
          ))}

          {/* Past Elections */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pt-2">Past Elections</h4>
            {pastElections.map(past => (
              <div 
                key={past.id}
                onClick={() => navigate(`/member/voting/${past.id}`)}
                className="bg-white/80 rounded-[22px] p-4 border border-slate-200/80 hover:border-slate-300 cursor-pointer flex justify-between items-center transition-colors"
              >
                <div>
                  <h4 className="text-[13px] font-extrabold text-slate-800">{past.title}</h4>
                  <p className="text-[10.5px] font-semibold text-slate-400 mt-0.5">
                    {past.startDate} - {past.endDate}
                  </p>
                </div>
                <span className="text-[9.5px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Completed
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 7. Bottom Sections Grid: Guidelines, Results & Security */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Important Information */}
          <div className="bg-white rounded-[26px] p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4 flex flex-col justify-between">
            <div className="border-b border-slate-100 pb-2.5">
              <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Important Information</h3>
            </div>
            
            <div className="space-y-3 my-2">
              {votingGuidelines.map((guide, idx) => (
                <div key={idx} className="flex gap-2.5 items-start">
                  <div className="w-5 h-5 bg-purple-50 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-purple-100">
                    <CheckCircle2 size={12} className="text-purple-600" />
                  </div>
                  <span className="text-[11.5px] font-semibold text-slate-600 leading-relaxed">
                    {guide.title}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="bg-amber-50/70 rounded-2xl p-3 border border-amber-100 text-[10.5px] font-bold text-amber-800 flex gap-2 items-start mt-2">
              <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <span>All rules are approved by the Social Welfare Council.</span>
            </div>
          </div>

          {/* Real-time Results */}
          <div className="bg-white rounded-[26px] p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
            <div className="border-b border-slate-100 pb-2.5 flex justify-between items-center">
              <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Real-time Results</h3>
              <span className={`text-[9.5px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${isVotingEnded ? 'bg-rose-50 text-rose-700 border border-rose-200/60' : 'bg-purple-50 text-purple-700 border border-purple-100'}`}>
                {isVotingEnded ? 'Ended' : 'Live'}
              </span>
            </div>

            {/* Countdown Banner */}
            {!isVotingEnded ? (
              <div className="bg-purple-50/60 border border-purple-100/70 rounded-2xl p-3 flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-[9.5px] text-purple-600 font-extrabold uppercase tracking-wider flex items-center gap-1.5 justify-center">
                  <Clock size={12} className="animate-pulse text-purple-600" /> Time remaining until results
                </span>
                <span className="text-[15px] font-black text-purple-900 font-mono tracking-widest">
                  {formatTime(timeLeft)}
                </span>
              </div>
            ) : (
              <div className="bg-emerald-50/60 border border-emerald-100/80 rounded-2xl p-2.5 flex items-center justify-center gap-1.5 text-center text-[10.5px] text-emerald-800 font-bold">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>Voting has ended. Results are completed.</span>
              </div>
            )}

            <div className="space-y-3 my-2">
              {simulatedResults.map((candidate, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-100 text-slate-700 font-extrabold text-[9px] flex items-center justify-center border border-slate-200 shrink-0">
                        {candidate.avatar ? (
                          <img src={candidate.avatar} alt={candidate.name} className="w-full h-full object-cover" />
                        ) : (
                          candidate.initials
                        )}
                      </div>
                      <span className="font-extrabold text-slate-800">{candidate.name}</span>
                    </div>
                    {isVotingEnded ? (
                      <span className="text-slate-500 font-bold">Ended</span>
                    ) : (
                      <span className="text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-[6px] text-[10px]">Secret</span>
                    )}
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${candidate.color} rounded-full transition-all duration-1000 ease-out`} 
                      style={{ width: `0%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security Features */}
          <div className="bg-white rounded-[26px] p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
            <div className="border-b border-slate-100 pb-2.5">
              <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Security Features</h3>
            </div>

            <div className="space-y-3.5 my-2">
              {securityFeatures.map(feat => (
                <div key={feat.id} className="flex gap-2.5 items-start">
                  <div className="w-5 h-5 bg-emerald-50 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100">
                    <ShieldCheck size={12} className="text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-[11.5px] font-extrabold text-slate-800">{feat.title}</h4>
                    <p className="text-[9.5px] text-slate-400 font-medium leading-normal mt-0.5">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default VotingPage;
