/**
 * useInterests.js
 * Hook for managing matrimonial interest requests (send, accept, reject, list).
 */
import { useState, useCallback } from 'react';
import { matrimonialInterestService } from '../core/api/matrimonialService';

export const useInterests = () => {
  const [sent, setSent]         = useState([]);
  const [received, setReceived] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError]       = useState(null);

  const fetchSentInterests = useCallback(async (params) => {
    setLoading(true);
    try {
      const res = await matrimonialInterestService.getSentInterests(params);
      setSent(res.data.data.interests);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sent interests');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReceivedInterests = useCallback(async (params) => {
    setLoading(true);
    try {
      const res = await matrimonialInterestService.getReceivedInterests(params);
      setReceived(res.data.data.interests);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load received interests');
    } finally {
      setLoading(false);
    }
  }, []);

  // superInterest: send a Super Interest (or upgrade a pending interest to one)
  const sendInterest = useCallback(async (receiverProfileId, message = '', { superInterest = false } = {}) => {
    setActionLoading(true);
    try {
      const res = await matrimonialInterestService.sendInterest({ receiverProfileId, message, ...(superInterest ? { superInterest: true } : {}) });
      return { success: true, interest: res.data.data.interest };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to send interest', code: err.response?.data?.code };
    } finally {
      setActionLoading(false);
    }
  }, []);

  const acceptInterest = useCallback(async (id) => {
    setActionLoading(true);
    try {
      const res = await matrimonialInterestService.acceptInterest(id);
      setReceived(prev => prev.map(i => i._id === id ? { ...i, status: 'accepted' } : i));
      return { success: true, conversationId: res.data.data.conversationId };
    } catch (err) {
      return { success: false, error: err.response?.data?.message };
    } finally {
      setActionLoading(false);
    }
  }, []);

  const rejectInterest = useCallback(async (id) => {
    setActionLoading(true);
    try {
      await matrimonialInterestService.rejectInterest(id);
      setReceived(prev => prev.map(i => i._id === id ? { ...i, status: 'rejected' } : i));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message };
    } finally {
      setActionLoading(false);
    }
  }, []);

  const cancelInterest = useCallback(async (id) => {
    setActionLoading(true);
    try {
      await matrimonialInterestService.cancelInterest(id);
      setSent(prev => prev.map(i => i._id === id ? { ...i, status: 'cancelled' } : i));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message };
    } finally {
      setActionLoading(false);
    }
  }, []);

  return {
    sent, received, loading, actionLoading, error,
    fetchSentInterests, fetchReceivedInterests,
    sendInterest, acceptInterest, rejectInterest, cancelInterest
  };
};
