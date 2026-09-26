import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, ArrowRight, CheckCircle2, Clock, 
  Briefcase, GraduationCap, User, Award, Check, X 
} from 'lucide-react';
import { useVoting } from './VotingContext';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

const PollDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    elections, 
    votedElections, 
    castVote, 
    getElectionResult 
  } = useVoting();

  const election = elections.find(e => e.id === id);

  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [candidateToShowDetails, setCandidateToShowDetails] = useState(null);

  useEffect(() => {
    if (candidateToShowDetails || showConfirmModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [candidateToShowDetails, showConfirmModal]);
  
  // Timer countdown
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

  const { loading, error } = useVoting();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !election) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-semibold text-text-secondary">{error || 'Election not found'}</p>
        <button 
          onClick={() => navigate('/member/voting')}
          className="mt-4 px-4 py-2 bg-[#7C3AED] text-white text-xs font-bold rounded-xl"
        >
          Back to Voting Dashboard
        </button>
      </div>
    );
  }

  const isAlreadyVoted = !!votedElections[election.id];
  const userChoiceId = votedElections[election.id];
  const selectedCandidate = election.candidates.find(c => c.id === selectedCandidateId);

  // Determine current view state: 'details' | 'vote' | 'success' | 'results'
  // If already voted, go straight to results view
  const getInitialViewState = () => {
    if (isAlreadyVoted) return 'results';
    return 'details';
  };

  const [viewState, setViewState] = useState(getInitialViewState);

  // Sync state if already voted
  useEffect(() => {
    if (isAlreadyVoted && viewState !== 'results') {
      setViewState('results');
    }
  }, [isAlreadyVoted]);

  const handleVoteSubmit = () => {
    if (selectedCandidateId) {
      castVote(election.id, selectedCandidateId);
      setShowConfirmModal(false);
      setViewState('success');
    }
  };

  const results = getElectionResult(election.id);

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-16">
      
      {/* 1. Top Header Navigation */}
      <div className="bg-card border-b border-gray-100 flex items-center justify-between px-4 h-14 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (viewState === 'vote') {
                setViewState('details');
              } else {
                navigate('/member/voting');
              }
            }} 
            className="p-1 -ml-1 press-scale"
          >
            <ArrowLeft size={22} className="text-text-primary" />
          </button>
          <h1 className="text-base font-bold text-text-primary">
            {viewState === 'details' && 'Election Details'}
            {viewState === 'vote' && 'Cast Vote'}
            {viewState === 'success' && 'Thank You!'}
            {viewState === 'results' && 'Election Results'}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-secondary bg-gray-100 px-3 py-1 rounded-full font-bold">
          <span className={`w-2 h-2 rounded-full ${
            election.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 
            election.status === 'Upcoming' ? 'bg-amber-500' : 'bg-gray-400'
          }`} />
          {election.status === 'Active' ? 'Active' : (election.status === 'Upcoming' ? 'Upcoming' : 'Ended')}
        </div>
      </div>

      <div className="flex-1 px-4 pt-6 max-w-xl mx-auto w-full space-y-6">
        
        {/* ==========================================================
            SCREEN 2 & 4: ELECTION DETAILS VIEW
           ========================================================== */}
        {viewState === 'details' && (
          <div className="space-y-6">
            {/* Banner Section */}
            <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white rounded-3xl p-5 border border-purple-700/20 shadow-md">
              <div className="flex justify-between items-center mb-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  election.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' :
                  election.status === 'Upcoming' ? 'bg-amber-500/20 text-amber-300 border-amber-400/40' :
                  'bg-white/20 text-white border-white/30'
                }`}>
                  {election.status}
                </span>
              </div>
              <h2 className="text-base font-bold text-white">{election.title}</h2>
              
              {/* Date Card Grid inside Banner */}
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10 text-center text-xs">
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <div className="text-purple-200 text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center justify-center gap-1">
                    <Calendar size={11} className="text-amber-400" /> Start Date
                  </div>
                  <div className="font-bold text-white">{election.startDate}</div>
                  <div className="text-[9px] text-purple-300 mt-0.5">
                    {election.status === 'Upcoming' ? 'Starts' : 'Active'}
                  </div>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <div className="text-purple-200 text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center justify-center gap-1">
                    <Calendar size={11} className="text-amber-400" /> End Date
                  </div>
                  <div className="font-bold text-white">{election.endDate}</div>
                  <div className="text-[9px] text-purple-300 mt-0.5">Deadline</div>
                </div>
              </div>

              <p className="text-xs text-purple-100/90 leading-relaxed mt-4 pt-1.5 text-center font-medium">
                {election.description}
              </p>
            </div>

            {/* Candidates Vertically List */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-text-primary">Candidates ({election.candidates.length})</h3>
              
              <div className="space-y-3.5">
                {election.candidates.map(candidate => (
                  <div 
                    key={candidate.id} 
                    className="bg-card rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar initials={candidate.initials} src={candidate.avatar} size="lg" />
                      <div>
                        <h4 className="text-xs font-bold text-text-primary">{candidate.name}</h4>
                        {candidate.age && (
                          <div className="text-[10px] text-text-secondary mt-1 space-y-0.5">
                            <p>Age: {candidate.age} Years</p>
                            <p>Profession: {candidate.profession}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setCandidateToShowDetails(candidate)}
                      className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/50 py-2 px-3.5 rounded-xl press-scale shrink-0"
                    >
                      View Profile
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Information Box */}
            {election.status === 'Upcoming' && (
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 text-center space-y-1">
                <span className="text-xs font-bold text-amber-800 flex items-center justify-center gap-1.5">
                  <Clock size={14} className="text-amber-600" /> Voting Starts on {election.startDate}
                </span>
                <p className="text-[11px] text-amber-700 font-medium">
                  Voting will open automatically on the start date. You can review candidate profiles above in advance.
                </p>
              </div>
            )}

            {/* Next Action: Proceed to Vote screen */}
            {election.status === 'Active' && (
              <button 
                onClick={() => setViewState('vote')}
                className="w-full py-4 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-2xl press-scale shadow-md flex items-center justify-center gap-1.5"
              >
                Proceed to Vote
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        )}

        {/* ==========================================================
            SCREEN 5: VOTE SCREEN WITH RADIO BUTTONS
           ========================================================== */}
        {viewState === 'vote' && (
          <div className="space-y-5">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-sm font-bold text-text-primary">Who do you want to vote for?</h2>
              <p className="text-[10px] text-text-secondary mt-0.5">Select any one of the candidates below.</p>
            </div>

            {/* Candidates with Radio Controls */}
            <div className="space-y-3">
              {election.candidates.map(candidate => {
                const isSelected = selectedCandidateId === candidate.id;
                return (
                  <div 
                    key={candidate.id}
                    onClick={() => setSelectedCandidateId(candidate.id)}
                    className="bg-card rounded-2xl border p-4.5 flex items-center justify-between cursor-pointer transition-all border-gray-100 hover:border-purple-200"
                    style={{
                      borderColor: isSelected ? '#7C3AED' : '',
                      boxShadow: isSelected ? '0 1px 3px rgba(124,58,237,0.05)' : ''
                    }}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Radio dot */}
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{
                          borderColor: isSelected ? '#7C3AED' : '#D1D5DB',
                          backgroundColor: isSelected ? '#7C3AED' : 'transparent'
                        }}
                      >
                        {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      
                      <Avatar initials={candidate.initials} src={candidate.avatar} size="md" />
                      <span className="text-xs font-bold text-text-primary">{candidate.name}</span>
                    </div>

                    {candidate.age && (
                      <span className="text-[10px] text-text-secondary bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                        {candidate.profession}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Submit Selection Button */}
            <button 
              onClick={() => {
                if (selectedCandidateId) {
                  setShowConfirmModal(true);
                }
              }}
              disabled={!selectedCandidateId}
              className={`w-full py-4 rounded-2xl text-xs font-bold press-scale shadow-md flex items-center justify-center gap-1.5 transition-colors ${
                selectedCandidateId 
                  ? 'bg-purple-700 hover:bg-purple-800 text-white' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Submit Vote
            </button>
          </div>
        )}

        {/* ==========================================================
            SCREEN 7: SUCCESS SCREEN
           ========================================================== */}
        {viewState === 'success' && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6 max-w-sm mx-auto animate-fade-in">
            {/* Green Circle Checkmark */}
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-100">
              <Check size={36} strokeWidth={3} />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-text-primary">Thank You!</h2>
              <p className="text-xs text-text-secondary leading-relaxed px-4">
                Your vote has been submitted successfully.
              </p>
            </div>

            <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100 w-full text-left space-y-2">
              <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Vote Receipt Details</p>
              <div className="text-[11px] text-text-secondary space-y-1">
                <p><strong>Election:</strong> {election.title}</p>
                <p><strong>Status:</strong> Secure & Confidential (Aggregate)</p>
                <p><strong>Time:</strong> Just now</p>
              </div>
            </div>

            <button 
              onClick={() => setViewState('results')}
              className="w-full py-3.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-2xl press-scale shadow-md"
            >
              Done
            </button>
          </div>
        )}

        {/* ==========================================================
            RESULTS SCREEN: SIMULATED STANDINGS
           ========================================================== */}
        {viewState === 'results' && (
          <div className="space-y-5 animate-fade-in">
            <div className="bg-card rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <Badge variant="success" className="text-[9px] uppercase font-bold">Results</Badge>
              </div>
              <h3 className="text-base font-bold text-text-primary leading-snug">{election.title}</h3>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Real-time progress and standings of the election.
              </p>
            </div>

            {/* Countdown Banner */}
            {!isVotingEnded ? (
              <div className="bg-purple-50/50 border border-purple-100/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-1 shadow-xs">
                <span className="text-[10px] text-purple-750 font-extrabold uppercase tracking-wider flex items-center gap-1.5 justify-center">
                  <Clock size={12} className="animate-pulse" /> Time remaining until results
                </span>
                <span className="text-[16px] font-black text-purple-950 font-mono tracking-widest">
                  {formatTime(timeLeft)}
                </span>
              </div>
            ) : (
              <div className="bg-emerald-50/50 border border-emerald-100/40 rounded-2xl p-3 flex items-center justify-center gap-1.5 text-center text-[10px] text-emerald-700 font-bold shadow-xs">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>Voting has ended. Results are completed.</span>
              </div>
            )}

            {/* Results List */}
            <div className="space-y-3">
              {results.map((candidate) => {
                const isUserChoice = userChoiceId === candidate.id;
                return (
                  <div 
                    key={candidate.id} 
                    className="bg-card rounded-2xl border p-4.5 relative overflow-hidden transition-all border-gray-100"
                    style={{ borderColor: isUserChoice ? '#10B981' : '' }}
                  >
                    {/* Fill - set to 0% to completely hide vote progress overlays */}
                    <div 
                      className={`absolute top-0 bottom-0 left-0 ${
                        isUserChoice ? 'bg-emerald-500/10' : 'bg-purple-600/5'
                      } z-0 pointer-events-none transition-all duration-1000 ease-out`}
                      style={{ width: `0%` }}
                    />
                    
                    <div className="relative z-10 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar initials={candidate.initials} src={candidate.avatar} size="md" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-text-primary">{candidate.name}</h4>
                            {isUserChoice && (
                              <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Check size={10} /> Your Choice
                              </span>
                            )}
                          </div>
                          {candidate.age && (
                            <p className="text-[10px] text-text-secondary mt-0.5">Age: {candidate.age} Years | {candidate.profession}</p>
                          )}
                        </div>
                      </div>

                      {/* Hiding percentage values and counts next to candidate names */}
                      <div className="text-right shrink-0">
                        {isUserChoice && (
                          <span className="text-emerald-600 font-extrabold text-xs">Voted</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Return Button */}
            <button 
              onClick={() => navigate('/member/voting')}
              className="w-full py-4 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-2xl press-scale"
            >
              Back to Voting Dashboard
            </button>
          </div>
        )}

      </div>

      {/* ==========================================================
          MODAL 1: CANDIDATE DETAIL OVERLAY
         ========================================================== */}
      {createPortal(
        <AnimatePresence>
          {candidateToShowDetails && (
            <motion.div 
              key="modal-candidate" 
              className="fixed inset-0 z-[9999]" 
              style={{ touchAction: 'none' }} 
              onWheel={e => e.stopPropagation()} 
              onTouchMove={e => e.stopPropagation()}
            >
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setCandidateToShowDetails(null)}
                className="absolute inset-0 bg-black"
              />
              {/* Modal Drawer */}
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-card rounded-t-[32px] border-t border-gray-100 shadow-2xl overflow-y-auto max-h-[80vh] scrollbar-hide"
                style={{ touchAction: 'auto' }}
              >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Candidate Profile Card</span>
                  <button 
                    onClick={() => setCandidateToShowDetails(null)}
                    className="p-1 bg-gray-100 hover:bg-gray-200 rounded-full text-text-secondary transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <Avatar initials={candidateToShowDetails.initials} src={candidateToShowDetails.avatar} size="xl" />
                  <div>
                    <h3 className="text-base font-bold text-text-primary">{candidateToShowDetails.name}</h3>
                    {candidateToShowDetails.age && (
                      <p className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-bold mt-1">
                        Age: {candidateToShowDetails.age} Years • {candidateToShowDetails.profession}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {candidateToShowDetails.experience && (
                    <div className="bg-surface p-3 rounded-xl border border-gray-100">
                      <div className="text-[9px] text-text-secondary uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                        <Briefcase size={11} className="text-purple-600" /> Experience
                      </div>
                      <div className="font-bold text-text-primary leading-snug">{candidateToShowDetails.experience}</div>
                    </div>
                  )}
                  {candidateToShowDetails.education && (
                    <div className="bg-surface p-3 rounded-xl border border-gray-100">
                      <div className="text-[9px] text-text-secondary uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                        <GraduationCap size={11} className="text-purple-600" /> Education
                      </div>
                      <div className="font-bold text-text-primary leading-snug">{candidateToShowDetails.education}</div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-text-primary uppercase tracking-wider flex items-center gap-1">
                    <User size={12} className="text-amber-500" /> Biography
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed bg-surface rounded-xl p-3 border border-gray-100">
                    {candidateToShowDetails.bio}
                  </p>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-bold text-text-primary uppercase tracking-wider flex items-center gap-1">
                    <Award size={12} className="text-amber-500" /> Election Manifesto
                  </h4>
                  <div className="space-y-2">
                    {candidateToShowDetails.manifesto.map((point, index) => (
                      <div key={index} className="flex gap-2 text-xs leading-normal bg-purple-50/20 p-2.5 rounded-xl border border-purple-100/30">
                        <Check size={12} className="text-purple-700 shrink-0 mt-0.5" />
                        <span className="text-text-primary">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {election.status === 'Active' && !isAlreadyVoted && (
                  <button 
                    onClick={() => {
                      setSelectedCandidateId(candidateToShowDetails.id);
                      setCandidateToShowDetails(null);
                      setViewState('vote');
                    }}
                    className="w-full py-3.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl press-scale flex items-center justify-center gap-1.5"
                  >
                    Select to Vote
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ==========================================================
          MODAL 2: VOTE CONFIRMATION POPUP
         ========================================================== */}
      {createPortal(
        <AnimatePresence>
          {showConfirmModal && selectedCandidate && (
            <motion.div 
              key="modal-confirm" 
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4" 
              style={{ touchAction: 'none' }} 
              onWheel={e => e.stopPropagation()} 
              onTouchMove={e => e.stopPropagation()}
            >
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.55 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60"
              />
              {/* Confirmation Dialog Box */}
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card w-full max-w-sm rounded-[28px] border border-gray-100 p-6 shadow-2xl space-y-5 text-center relative z-10"
                style={{ touchAction: 'auto' }}
              >
                {/* Green check shield circle */}
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 size={24} className="text-emerald-600" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-text-primary">Confirm Vote</h3>
                  <p className="text-xs text-text-secondary leading-normal">
                    Are you sure you want to vote for <strong className="text-purple-900">{selectedCandidate.name}</strong>?
                  </p>
                </div>

                {/* Candidate Summary card */}
                <div className="bg-surface p-3.5 rounded-2xl border border-gray-100 flex items-center gap-3 text-left">
                  <Avatar initials={selectedCandidate.initials} src={selectedCandidate.avatar} size="md" />
                  <div>
                    <h4 className="text-xs font-bold text-text-primary">{selectedCandidate.name}</h4>
                    <p className="text-[10px] text-text-secondary mt-0.5">{selectedCandidate.profession}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button 
                    onClick={handleVoteSubmit}
                    className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl press-scale shadow-sm"
                  >
                    Yes, Confirm
                  </button>
                  <button 
                    onClick={() => {
                      setShowConfirmModal(false);
                    }}
                    className="w-full py-3 bg-white hover:bg-gray-50 text-purple-700 text-xs font-bold rounded-xl border border-purple-200 press-scale"
                  >
                    No, Go Back
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
};

export default PollDetailPage;
