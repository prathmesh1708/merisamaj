import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle2, Clock, MapPin, Trophy, X } from 'lucide-react';
import { useVoting } from './VotingContext';
import useCountdown, { formatDateTime } from './useCountdown';

const pad = (n) => String(n).padStart(2, '0');

const CountdownBox = ({ target, label, onDone }) => {
  const c = useCountdown(target, onDone);
  return (
    <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 text-center">
      <p className="text-[11px] font-black text-purple-700 uppercase tracking-wider">{label}</p>
      <div className="mt-2 flex justify-center gap-2">
        {[['Days', c.days], ['Hours', c.hours], ['Minutes', c.minutes], ['Seconds', c.seconds]].map(([t, v]) => (
          <div key={t} className="bg-white border border-purple-100 rounded-xl px-3 py-2 min-w-[58px]">
            <div className="text-xl font-black text-slate-900 tabular-nums">{pad(v)}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase">{t}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Avatar = ({ c, size = 44 }) => (
  c.avatar
    ? <img src={c.avatar} alt="" style={{ width: size, height: size }} className="rounded-full object-cover shrink-0" />
    : <div style={{ width: size, height: size }} className="rounded-full bg-purple-100 text-purple-700 font-black flex items-center justify-center shrink-0 text-sm">{c.initials || c.name?.[0]}</div>
);

const PollDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { elections, castVote, loading, error, refresh } = useVoting();

  const [selectedId, setSelectedId] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [justVoted, setJustVoted] = useState(false);

  const election = elections.find(e => e.id === id);

  if (loading && !election) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!election) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-semibold text-slate-600">{error || 'This election is not available for you.'}</p>
        <button onClick={() => navigate('/member/voting')} className="mt-4 px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl">Back to Voting</button>
      </div>
    );
  }

  const { status, hasVoted, viewOnly } = election;
  const selected = election.candidates.find(c => c.id === selectedId);
  const refreshSoon = () => refresh(true);

  const submitVote = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      await castVote(election.id, selectedId);
      setConfirming(false);
      setJustVoted(true);
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Could not record your vote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const winnerIds = election.result?.winners || [];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white border-b border-slate-100 px-4 h-14 sticky top-0 z-30 flex items-center gap-3">
        <button onClick={() => navigate('/member/voting')} className="p-1 -ml-1 text-slate-700"><ArrowLeft size={22} /></button>
        <h1 className="text-base font-extrabold text-slate-800 truncate">{election.title}</h1>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {election.bannerImage && <img src={election.bannerImage} alt="" className="w-full h-40 object-cover rounded-2xl" />}

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
          <p className="text-sm text-slate-600">{election.description}</p>
          <div className="text-[11px] font-semibold text-slate-500 space-y-1 pt-1">
            <div className="flex items-center gap-1.5"><Calendar size={12} /> Voting: {formatDateTime(election.startDate)} → {formatDateTime(election.endDate)}</div>
            <div className="flex items-center gap-1.5"><Clock size={12} /> Result: {formatDateTime(election.resultDate)}</div>
            {(election.location || election.communityName) && <div className="flex items-center gap-1.5"><MapPin size={12} /> {election.location || election.communityName}</div>}
          </div>
        </div>

        {/* Creator who is not a voter: read-only view */}
        {viewOnly && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-[12px] font-semibold text-amber-800">
            You created this election, but you are not in its voter list (check "Who can vote" and "Locations"), so you can view it but not vote.
          </div>
        )}
        {viewOnly && status !== 'ResultDeclared' && (
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Candidates</h3>
            {election.candidates.map(c => (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-3">
                <Avatar c={c} />
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-slate-900 truncate">{c.name}</p>
                  {(c.position || c.profession) && <p className="text-[11px] font-semibold text-slate-500 truncate">{c.position || c.profession}</p>}
                  {(c.shortIntro || c.bio) && <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{c.shortIntro || c.bio}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Candidates are visible before voting opens and while the result is pending */}
        {!viewOnly && (status === 'Upcoming' || (status === 'ResultPending' && !hasVoted) || (hasVoted && status !== 'ResultDeclared')) && election.candidates?.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Candidates ({election.candidates.length})</h3>
            {election.candidates.map(c => (
              <div key={c.id} className={`bg-white rounded-2xl border p-3 flex items-center gap-3 ${election.userVotedCandidateId === c.id ? 'border-emerald-300' : 'border-slate-200'}`}>
                <Avatar c={c} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-slate-900 truncate">{c.name}{c.age ? <span className="text-slate-400 font-semibold">, {c.age}</span> : null}</p>
                  {(c.position || c.profession) && <p className="text-[11px] font-semibold text-slate-500 truncate">{c.position || c.profession}</p>}
                  {(c.shortIntro || c.bio) && <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{c.shortIntro || c.bio}</p>}
                </div>
                {election.userVotedCandidateId === c.id && <span className="text-[10px] font-black text-emerald-600 shrink-0">Your vote</span>}
              </div>
            ))}
          </div>
        )}

        {/* Upcoming */}
        {status === 'Upcoming' && <CountdownBox target={election.startDate} label="Voting starts in" onDone={refreshSoon} />}

        {/* Vote submitted (just now, or earlier) -> result countdown */}
        {hasVoted && status !== 'ResultDeclared' && (
          <div className="space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
              <CheckCircle2 className="mx-auto text-emerald-600" size={30} />
              <p className="mt-2 text-sm font-extrabold text-emerald-800">
                {justVoted ? 'Your vote has been successfully recorded.' : 'Vote Submitted'}
              </p>
            </div>
            <CountdownBox target={election.resultDate} label="Result will be available in" onDone={refreshSoon} />
          </div>
        )}

        {/* Voting closed and the user did not vote */}
        {!hasVoted && !viewOnly && status === 'ResultPending' && (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center text-sm font-bold text-slate-600">Voting has closed.</div>
            <CountdownBox target={election.resultDate} label="Result will be available in" onDone={refreshSoon} />
          </>
        )}

        {/* Voting open */}
        {status === 'Active' && !hasVoted && !viewOnly && (
          <>
            <CountdownBox target={election.endDate} label="Voting closes in" onDone={refreshSoon} />
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider pt-1">Select a candidate</h3>
            <div className="space-y-2">
              {election.candidates.map(c => (
                <button key={c.id} onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left bg-white rounded-2xl border-2 p-3 flex items-center gap-3 transition-all ${selectedId === c.id ? 'border-purple-600 bg-purple-50' : 'border-slate-200 hover:border-purple-300'}`}>
                  <Avatar c={c} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-slate-900 truncate">{c.name}{c.age ? <span className="text-slate-400 font-semibold">, {c.age}</span> : null}</p>
                    {(c.position || c.profession) && <p className="text-[11px] font-semibold text-slate-500 truncate">{c.position || c.profession}</p>}
                    {(c.shortIntro || c.bio) && <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{c.shortIntro || c.bio}</p>}
                  </div>
                  <span className={`w-5 h-5 rounded-full border-2 shrink-0 ${selectedId === c.id ? 'border-purple-600 bg-purple-600' : 'border-slate-300'}`} />
                </button>
              ))}
            </div>
            <button disabled={!selectedId} onClick={() => { setSubmitError(''); setConfirming(true); }}
              className="w-full py-3 bg-purple-600 disabled:bg-slate-300 text-white font-extrabold text-sm rounded-2xl">
              Vote
            </button>
          </>
        )}

        {/* Result */}
        {status === 'ResultDeclared' && election.result && (
          <div className="space-y-3">
            {winnerIds.length > 0 && (
              <div className="bg-gradient-to-br from-purple-700 to-purple-900 text-white rounded-2xl p-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-purple-200 flex items-center gap-1.5"><Trophy size={13} /> {winnerIds.length > 1 ? 'Tie - winners' : 'Winner'}</p>
                {election.candidates.filter(c => winnerIds.includes(c.id)).map(c => (
                  <div key={c.id} className="flex items-center gap-3 mt-2">
                    <Avatar c={c} size={48} />
                    <div>
                      <p className="text-base font-extrabold">{c.name}</p>
                      <p className="text-xs text-purple-200">{c.position || c.profession} · {c.votes} votes ({c.percentage}%)</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {winnerIds.length === 0 && <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center text-sm font-bold text-slate-600">No votes were cast in this election.</div>}

            <div className="grid grid-cols-3 gap-2 text-center">
              {[['Total votes', election.result.totalVotes], ['Eligible voters', election.result.eligibleVoters], ['Turnout', `${election.result.turnoutPercentage}%`]].map(([t, v]) => (
                <div key={t} className="bg-white border border-slate-200 rounded-xl p-3">
                  <div className="text-lg font-black text-slate-900">{v}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">{t}</div>
                </div>
              ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
              {[...election.candidates].sort((a, b) => b.votes - a.votes).map(c => (
                <div key={c.id}>
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">{c.name}{election.userVotedCandidateId === c.id && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Your vote</span>}</span>
                    <span>{c.votes} · {c.percentage}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full mt-1 overflow-hidden"><div className="h-full bg-purple-600 rounded-full" style={{ width: `${c.percentage}%` }} /></div>
                </div>
              ))}
              <p className="text-[10px] text-slate-400 font-semibold pt-1">Declared on {formatDateTime(election.result.declaredAt)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Confirm vote */}
      {confirming && selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm">
            <div className="flex justify-between items-start">
              <h3 className="text-base font-extrabold text-slate-900">Confirm your vote</h3>
              <button onClick={() => setConfirming(false)} className="text-slate-400"><X size={18} /></button>
            </div>
            <p className="text-sm text-slate-600 mt-2">Are you sure you want to vote for <b>{selected.name}</b>? You cannot change your vote afterwards.</p>
            {submitError && <p className="text-xs font-bold text-rose-600 mt-2">{submitError}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setConfirming(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600">Cancel</button>
              <button disabled={submitting} onClick={submitVote} className="flex-1 py-2.5 bg-purple-600 disabled:opacity-60 text-white rounded-xl text-sm font-extrabold">
                {submitting ? 'Submitting...' : 'Confirm Vote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PollDetailPage;
