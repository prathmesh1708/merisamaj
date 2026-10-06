import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import votingService from '../../../../core/api/votingService';
import { useAuth } from '../../../../core/auth/useAuth';
import { getSocket } from '../../hooks/useChatSocket';

const VotingContext = createContext(null);

export const VotingProvider = ({ children }) => {
  const { auth, user } = useAuth();
  const userId = user?._id || user?.id || auth.user?._id || auth.user?.id;
  const [elections, setElections] = useState([]);
  const [votedElections, setVotedElections] = useState({}); // { electionId: candidateId }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVotings = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await votingService.getVotings();
      if (res.status === 'success') {
        setElections(res.data || []);
        // build votedElections from data
        const votedMap = {};
        (res.data || []).forEach(v => {
          if (v.userVotedCandidateId) {
            votedMap[v.id] = v.userVotedCandidateId;
          }
        });
        setVotedElections(votedMap);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching votings:', err);
      if (!isBackground) {
        setError(err.message || 'Failed to load votings');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auth.isAuthenticated && userId) {
      fetchVotings();

      // Listen for realtime socket updates for elections
      const socket = getSocket(userId);
      if (socket) {
        const handleElectionEvent = () => {
          fetchVotings(true);
        };
        socket.on('election:created', handleElectionEvent);
        socket.on('election:updated', handleElectionEvent);
        socket.on('election:deleted', handleElectionEvent);
        socket.on('vote:cast', handleElectionEvent);

        return () => {
          socket.off('election:created', handleElectionEvent);
          socket.off('election:updated', handleElectionEvent);
          socket.off('election:deleted', handleElectionEvent);
          socket.off('vote:cast', handleElectionEvent);
        };
      }
    } else {
      setElections([]);
      setVotedElections({});
    }
  }, [auth.isAuthenticated, userId, fetchVotings]);

  // The server enforces eligibility, the open window and one-vote-per-user; the
  // UI only reflects the outcome. Errors are rethrown so the confirm dialog can show them.
  const castVote = async (electionId, candidateId) => {
    const res = await votingService.castVote(electionId, candidateId);
    if (res.status === 'success') {
      setVotedElections(prev => ({ ...prev, [electionId]: candidateId }));
      setElections(prev => prev.map(e => (
        e.id === electionId ? { ...e, hasVoted: true, userVotedCandidateId: candidateId } : e
      )));
    }
    return res;
  };

  return (
    <VotingContext.Provider value={{ 
      elections, 
      votedElections, 
      castVote, 
      loading,
      error,
      refresh: fetchVotings
    }}>
      {children || <Outlet />}
    </VotingContext.Provider>
  );
};

export const useVoting = () => {
  const context = useContext(VotingContext);
  if (!context) {
    throw new Error('useVoting must be used within a VotingProvider');
  }
  return context;
};
