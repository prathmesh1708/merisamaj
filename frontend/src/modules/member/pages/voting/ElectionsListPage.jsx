import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle2, Building2, MapPin, Users, Vote } from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { useVoting } from './VotingContext';

const ElectionsListPage = () => {
  const navigate = useNavigate();
  const { elections, votedElections, loading } = useVoting();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const activeElections = elections.filter(e => e.status === 'Active');
  const upcomingElections = elections.filter(e => e.status === 'Upcoming');
  const pastElections = elections.filter(e => e.status === 'Completed' || e.status === 'Closed');

  const formatAudienceTag = (e) => {
    const aud = e.targetAudience || 'ALL_MEMBERS';
    const city = e.targetCity || e.city;
    if (city) return `📍 ${city}`;
    if (aud === 'LOCAL_HEADS') return '🛡️ Local Heads';
    if (aud === 'LOCAL_AND_SUB_HEADS') return '👥 Sub-Heads & Local Heads';
    if (aud === 'COMMUNITY_HEADS') return '👑 Community Heads';
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16 animate-fade-in">
      {/* Header Bar */}
      <div className="bg-white border-b border-slate-100 flex items-center justify-between px-4 h-14 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/member/voting')} className="p-1 -ml-1 press-scale text-slate-700 hover:text-purple-700 transition-colors">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-base font-extrabold text-slate-800 tracking-tight">Samaj Elections</h1>
        </div>
        <div className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
          {elections.length} Elections
        </div>
      </div>

      <div className="px-4 pt-5 max-w-xl mx-auto space-y-6">
        {/* Active Elections Section */}
        {activeElections.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Active Elections
            </h3>
            
            <div className="space-y-3">
              {activeElections.map(active => {
                const hasVoted = !!votedElections[active.id];
                const audienceTag = formatAudienceTag(active);
                return (
                  <div 
                    key={active.id}
                    onClick={() => navigate(`/member/voting/${active.id}`)}
                    className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-purple-300 cursor-pointer relative overflow-hidden transition-all duration-200 shadow-xs hover:shadow-md"
                  >
                    {hasVoted && (
                      <div className="absolute right-0 top-0 bg-emerald-600 text-white text-[9.5px] font-black uppercase py-0.5 px-3 rounded-bl-xl flex items-center gap-1">
                        <CheckCircle2 size={11} /> Voted
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-2 pr-12">
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 leading-snug">{active.title}</h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {active.communityName && (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 flex items-center gap-1">
                              <Building2 size={10} /> {active.communityName}
                            </span>
                          )}
                          {audienceTag && (
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              {audienceTag}
                            </span>
                          )}
                          <span className="text-[10px] font-semibold text-slate-400">
                            {active.candidates?.length || 0} Candidates
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10.5px] text-slate-400 font-semibold flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
                      <Calendar size={12} className="text-amber-500" /> {active.startDate} - {active.endDate}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming Elections Section */}
        {upcomingElections.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Upcoming Elections
            </h3>
            
            <div className="space-y-3">
              {upcomingElections.map(upcoming => {
                const audienceTag = formatAudienceTag(upcoming);
                return (
                  <div 
                    key={upcoming.id}
                    onClick={() => navigate(`/member/voting/${upcoming.id}`)}
                    className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-amber-300 cursor-pointer relative overflow-hidden transition-all duration-200 shadow-xs hover:shadow-md"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 leading-snug">{upcoming.title}</h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {upcoming.communityName && (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 flex items-center gap-1">
                              <Building2 size={10} /> {upcoming.communityName}
                            </span>
                          )}
                          {audienceTag && (
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              {audienceTag}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[9.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                        Upcoming
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-400 font-semibold flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
                      <Calendar size={12} className="text-amber-500" /> {upcoming.startDate} - {upcoming.endDate}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Past Completed Elections Section */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
            Past Elections & Results
          </h3>
          
          <div className="space-y-3">
            {pastElections.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4 bg-white rounded-2xl border border-dashed">No past election records yet</p>
            ) : (
              pastElections.map(past => (
                <div 
                  key={past.id}
                  onClick={() => navigate(`/member/voting/${past.id}`)}
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-slate-300 cursor-pointer flex justify-between items-center transition-all duration-150 shadow-xs"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 leading-snug">{past.title}</h4>
                    {past.communityName && (
                      <p className="text-[10px] text-purple-600 font-semibold mt-0.5">{past.communityName}</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <Calendar size={11} className="text-slate-400" /> {past.startDate} - {past.endDate}
                    </p>
                  </div>
                  <span className="text-[9.5px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full shrink-0">
                    Results Locked
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElectionsListPage;
