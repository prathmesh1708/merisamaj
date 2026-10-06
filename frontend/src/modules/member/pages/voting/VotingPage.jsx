import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, Calendar, Users, MapPin, CheckCircle2, Clock, Trophy } from 'lucide-react';
import { useData } from '../../context/DataProvider';
import { useVoting } from './VotingContext';
import { formatDateTime } from './useCountdown';

const STATUS = {
  Active: { label: 'Voting Open', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Upcoming: { label: 'Upcoming', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  ResultPending: { label: 'Result Pending', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  ResultDeclared: { label: 'Result Declared', cls: 'bg-purple-50 text-purple-700 border-purple-200' }
};
const ORDER = { Active: 0, Upcoming: 1, ResultPending: 2, ResultDeclared: 3 };

const actionLabel = (e) => {
  if (e.status === 'Active') return e.hasVoted ? 'Vote Submitted' : 'Vote Now';
  if (e.status === 'ResultDeclared') return 'View Result';
  if (e.status === 'ResultPending') return e.hasVoted ? 'Result Countdown' : 'Voting Closed';
  return 'View Election';
};

const VotingPage = () => {
  const navigate = useNavigate();
  const { setMobileMenuOpen, getUnreadCountForModule, markModuleAsVisited } = useData();
  const { elections, loading, error, refresh } = useVoting();

  useEffect(() => {
    if (markModuleAsVisited) markModuleAsVisited('voting');
  }, [markModuleAsVisited]);

  const sorted = [...elections].sort((a, b) => (ORDER[a.status] - ORDER[b.status]) || (new Date(b.startDate) - new Date(a.startDate)));

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white border-b border-slate-100 px-4 h-14 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileMenuOpen && setMobileMenuOpen(true)} className="p-1 -ml-1 text-slate-700 lg:hidden"><Menu size={22} /></button>
          <div>
            <h1 className="text-[17px] font-extrabold text-slate-800 leading-tight">Voting</h1>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Your elections</p>
          </div>
        </div>
        <button onClick={() => navigate('/member/notifications?module=voting')} className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 relative">
          <Bell size={18} />
          {getUnreadCountForModule && getUnreadCountForModule('voting') > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-600 rounded-full" />}
        </button>
      </div>

      <div className="px-4 pt-4 max-w-3xl mx-auto space-y-3">
        {loading && <div className="py-16 flex justify-center"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>}

        {!loading && error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-center">
            <p className="text-sm font-bold text-rose-700">{error}</p>
            <button onClick={() => refresh()} className="mt-3 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl">Retry</button>
          </div>
        )}

        {!loading && !error && sorted.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
            <Trophy size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-extrabold text-slate-700">No elections for you right now</p>
            <p className="text-xs text-slate-400 mt-1">When an election is published for your role and location, it will appear here and you'll get a notification.</p>
          </div>
        )}

        {sorted.map(e => {
          const st = STATUS[e.status] || STATUS.Upcoming;
          return (
            <div key={e.id} onClick={() => navigate(`/member/voting/${e.id}`)}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer hover:border-purple-300 hover:shadow-md transition-all">
              {e.bannerImage && <img src={e.bannerImage} alt="" className="w-full h-32 object-cover" />}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900 leading-snug">{e.title}</h3>
                  <span className={`shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                </div>
                {e.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{e.description}</p>}

                <div className="mt-3 space-y-1 text-[11px] font-semibold text-slate-500">
                  <div className="flex items-center gap-1.5"><Calendar size={12} /> {formatDateTime(e.startDate)} → {formatDateTime(e.endDate)}</div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1.5"><Users size={12} /> {e.candidateCount} candidates</span>
                    {(e.location || e.communityName) && <span className="flex items-center gap-1.5"><MapPin size={12} /> {e.location || e.communityName}</span>}
                    <span className="flex items-center gap-1.5"><Clock size={12} /> Result: {formatDateTime(e.resultDate)}</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  {e.hasVoted
                    ? <span className="text-[11px] font-black text-emerald-600 flex items-center gap-1"><CheckCircle2 size={13} /> Vote submitted</span>
                    : <span />}
                  <span className={`text-xs font-extrabold px-4 py-2 rounded-xl ${e.status === 'Active' && !e.hasVoted ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {actionLabel(e)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VotingPage;
