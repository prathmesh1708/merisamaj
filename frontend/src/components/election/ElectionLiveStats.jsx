/**
 * ElectionLiveStats
 * Aggregate-only election numbers for Heads / Admin while voting is open:
 * total votes, eligible voters, participation %, message views and Samaj Nagar
 * (city)-wise turnout. Never shows candidate-wise numbers — the API doesn't send them.
 * Refreshes every 10 seconds while visible.
 *
 * Props: electionId, fetchStats(id) → { data } (headVotingService / adminVotingService)
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Vote, Users, Percent, Eye, MapPin, Lock, RefreshCw } from 'lucide-react';
import { formatElectionTime } from './ElectionEligibilityFields';

const REFRESH_MS = 10 * 1000;

const Card = ({ icon: Icon, label, value, sub, tone }) => (
  <div className={`rounded-2xl border p-3 ${tone}`}>
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-80">
      <Icon size={13} /> {label}
    </div>
    <p className="text-2xl font-black mt-1 leading-none">{value}</p>
    {sub && <p className="text-[10.5px] font-semibold opacity-70 mt-1">{sub}</p>}
  </div>
);

const ElectionLiveStats = ({ electionId, fetchStats }) => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetchStats(electionId);
      setStats(res?.data || null);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load live statistics.');
    } finally {
      setRefreshing(false);
    }
  }, [electionId, fetchStats]);

  useEffect(() => {
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  if (!stats && !error) {
    return <div className="py-8 flex justify-center"><RefreshCw size={18} className="animate-spin text-indigo-600" /></div>;
  }
  if (!stats) {
    return <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3">{error}</p>;
  }

  const isLive = stats.status === 'Active';
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${isLive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
          {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
          {isLive ? 'Voting in progress' : stats.status === 'ResultPending' ? 'Voting closed' : stats.status}
        </span>
        <button type="button" onClick={load} className="text-[10.5px] font-bold text-indigo-600 flex items-center gap-1">
          <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} /> Updated {new Date(stats.generatedAt).toLocaleTimeString()}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card icon={Vote} label="Total Votes Cast" value={stats.totalVotes} tone="bg-indigo-50 border-indigo-100 text-indigo-800" />
        <Card icon={Users} label="Eligible Voters" value={stats.eligibleVoters} sub={`${stats.notVoted} yet to vote`} tone="bg-white border-slate-200 text-slate-800" />
        <Card icon={Percent} label="Participation" value={`${stats.participationPercentage}%`} tone="bg-emerald-50 border-emerald-100 text-emerald-800" />
        <Card icon={Eye} label="Message Views" value={stats.messageViews.viewed} sub={`of ${stats.messageViews.notified} notified`} tone="bg-amber-50 border-amber-100 text-amber-800" />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 flex items-center gap-1.5">
          <MapPin size={12} /> Votes by Samaj Nagar
        </p>
        {stats.bySamajNagar.length === 0 ? (
          <p className="px-3 py-4 text-xs text-slate-400">No voters yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {stats.bySamajNagar.map(n => (
              <div key={n.name} className="px-3 py-2">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span className="truncate pr-2">{n.name}</span>
                  <span className="shrink-0"><b className="text-slate-900">{n.voted}</b> / {n.eligible} voted · {n.participationPercentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, n.participationPercentage)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!stats.resultsAvailable && (
        <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
          <Lock size={12} className="shrink-0 mt-0.5" />
          Candidate-wise results stay hidden until {formatElectionTime(stats.resultDate)}. Individual votes are never shown.
        </p>
      )}
    </div>
  );
};

export default ElectionLiveStats;
