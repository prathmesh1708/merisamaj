import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../../../core/auth/useAuth';
import {
  matrimonialDashboardService,
  matrimonialShortlistService,
  matrimonialModerationService,
  matrimonialProfileService,
  matrimonialInterestService,
  matrimonialVisitorService
} from '../../../../core/api/matrimonialService';

const MatrimonialContext = createContext(null);

/**
 * MatrimonialProvider — Root context for the Matrimonial module.
 * Single source of truth for all matrimonial data.
 * All pages read from here, not from DataProvider or mock data.
 */
export const MatrimonialProvider = () => {
  const { auth } = useAuth();
  const userId = auth.user?._id || auth.user?.id;
  // ─── My Own Profile ──────────────────────────────────────────────────────
  const [myProfile, setMyProfile]           = useState(null);
  const [myProfileLoading, setMyProfileLoading] = useState(false);

  // ─── Dashboard Data ───────────────────────────────────────────────────────
  const [dashboard, setDashboard]           = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // ─── Interests (from dashboard) ───────────────────────────────────────────
  const [receivedInterests, setReceivedInterests] = useState([]);
  const [sentInterests, setSentInterests]         = useState([]);
  const [acceptedInterests, setAcceptedInterests] = useState([]);
  const [interestsLoading, setInterestsLoading]   = useState(false);

  // ─── Visitors ─────────────────────────────────────────────────────────────
  const [visitors, setVisitors]             = useState([]);
  const [visitorsLoading, setVisitorsLoading] = useState(false);

  // ─── UI State ─────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState(() => {
    try { return JSON.parse(localStorage.getItem('merisamaj_matri_viewMode')) || 'grid'; } catch { return 'grid'; }
  });
  const [activeDiscoveryTab, setActiveDiscoveryTab] = useState('recommended');
  const [searchFilters, setSearchFilters]           = useState(null);

  // ─── Shortlist (synced from API) ──────────────────────────────────────────
  const [shortlistedIds, setShortlistedIds] = useState([]);

  // ─── Blocked (local, backed by API) ──────────────────────────────────────
  const [blockedIds, setBlockedIds]         = useState([]);

  // Persist view mode
  useEffect(() => {
    localStorage.setItem('merisamaj_matri_viewMode', JSON.stringify(viewMode));
  }, [viewMode]);

  // ─── Fetch My Profile ─────────────────────────────────────────────────────
  const fetchMyProfile = useCallback(async () => {
    setMyProfileLoading(true);
    try {
      const res = await matrimonialProfileService.getMyProfile();
      setMyProfile(res.data.data.profile || null);
    } catch (err) {
      console.error('[MatrimonialContext] My profile fetch failed:', err.response?.data?.message);
    } finally {
      setMyProfileLoading(false);
    }
  }, []);

  // ─── Fetch Dashboard ──────────────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const res = await matrimonialDashboardService.getDashboard();
      setDashboard(res.data.data.dashboard);
    } catch (err) {
      console.error('[MatrimonialContext] Dashboard fetch failed:', err.response?.data?.message);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  // ─── Fetch Interest Lists ─────────────────────────────────────────────────
  const fetchInterests = useCallback(async () => {
    setInterestsLoading(true);
    try {
      const [receivedRes, sentRes] = await Promise.all([
        matrimonialInterestService.getReceivedInterests({ limit: 50 }),
        matrimonialInterestService.getSentInterests({ limit: 50 })
      ]);

      const received = receivedRes.data.data.interests || [];
      const sent     = sentRes.data.data.interests || [];

      setReceivedInterests(received.filter(i => i.status === 'pending'));
      setSentInterests(sent.filter(i => i.status === 'pending'));
      setAcceptedInterests([
        ...received.filter(i => i.status === 'accepted'),
        ...sent.filter(i => i.status === 'accepted')
      ]);
    } catch (err) {
      console.error('[MatrimonialContext] Interests fetch failed:', err.response?.data?.message);
    } finally {
      setInterestsLoading(false);
    }
  }, []);

  // ─── Fetch Visitors ───────────────────────────────────────────────────────
  const fetchVisitors = useCallback(async () => {
    setVisitorsLoading(true);
    try {
      const res = await matrimonialVisitorService.getMyVisitors({ limit: 20 });
      setVisitors(res.data.data?.visitors || []);
    } catch (err) {
      console.error('[MatrimonialContext] Visitors fetch failed:', err.response?.data?.message);
    } finally {
      setVisitorsLoading(false);
    }
  }, []);

  // ─── Fetch Shortlisted IDs on mount ──────────────────────────────────────
  const fetchShortlistIds = useCallback(async () => {
    try {
      const res = await matrimonialShortlistService.getShortlist({ limit: 200 });
      const ids = (res.data.data?.items || []).map(i => i.profileId?._id || i.profileId);
      setShortlistedIds(ids.filter(Boolean));
    } catch (err) {
      // Silently ignore — user may not have any shortlisted profiles
    }
  }, []);

  // ─── Fetch Blocked IDs on mount ───────────────────────────────────────────
  const fetchBlockedIds = useCallback(async () => {
    try {
      const res = await matrimonialModerationService.getBlockedUsers();
      const ids = (res.data.data?.blockedUsers || []).map(b => b.blockedUserId?._id || b.blockedUserId);
      setBlockedIds(ids.filter(Boolean));
    } catch (err) {
      // Silently ignore
    }
  }, []);

  // ─── Bootstrap on user change / reset on logout ───────────────────────────────────
  useEffect(() => {
    if (auth.isAuthenticated && userId) {
      fetchMyProfile();
      fetchDashboard();
      fetchInterests();
      fetchVisitors();
      fetchShortlistIds();
      fetchBlockedIds();
    } else {
      setMyProfile(null);
      setDashboard(null);
      setReceivedInterests([]);
      setSentInterests([]);
      setAcceptedInterests([]);
      setVisitors([]);
      setShortlistedIds([]);
      setBlockedIds([]);
    }
  }, [auth.isAuthenticated, userId, fetchMyProfile, fetchDashboard, fetchInterests, fetchVisitors, fetchShortlistIds, fetchBlockedIds]);

  // ─── Interest Actions (real API) ──────────────────────────────────────────
  const sendInterest = useCallback(async (receiverProfileId, message = '') => {
    try {
      const res = await matrimonialInterestService.sendInterest({ receiverProfileId, message });
      await fetchInterests(); // Refresh interest counts
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to send interest' };
    }
  }, [fetchInterests]);

  const acceptInterest = useCallback(async (interestId) => {
    try {
      const res = await matrimonialInterestService.acceptInterest(interestId);
      await fetchInterests();
      await fetchMyProfile(); // Refresh maritalLifecycle
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to accept interest' };
    }
  }, [fetchInterests, fetchMyProfile]);

  const rejectInterest = useCallback(async (interestId) => {
    try {
      await matrimonialInterestService.rejectInterest(interestId);
      setReceivedInterests(prev => prev.filter(i => i._id !== interestId));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to reject interest' };
    }
  }, []);

  const cancelInterest = useCallback(async (interestId) => {
    try {
      await matrimonialInterestService.cancelInterest(interestId);
      setSentInterests(prev => prev.filter(i => i._id !== interestId));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to cancel interest' };
    }
  }, []);

  // ─── Shortlist Actions (API-backed) ──────────────────────────────────────
  const addToShortlist = useCallback(async (profileId, notes = '') => {
    try {
      await matrimonialShortlistService.addToShortlist({ profileId, notes });
      setShortlistedIds(prev => [...new Set([...prev, profileId])]);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message };
    }
  }, []);

  const removeFromShortlist = useCallback(async (profileId) => {
    try {
      await matrimonialShortlistService.removeFromShortlist(profileId);
      setShortlistedIds(prev => prev.filter(id => id !== profileId));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message };
    }
  }, []);

  const toggleShortlist = useCallback(async (profileId, notes = '') => {
    if (shortlistedIds.includes(profileId)) return removeFromShortlist(profileId);
    return addToShortlist(profileId, notes);
  }, [shortlistedIds, addToShortlist, removeFromShortlist]);

  const isShortlisted = useCallback((profileId) => shortlistedIds.includes(profileId), [shortlistedIds]);

  // ─── Block Actions (API-backed) ───────────────────────────────────────────
  const blockUser = useCallback(async (userId, reason = '') => {
    try {
      await matrimonialModerationService.blockUser({ userId, reason });
      setBlockedIds(prev => [...new Set([...prev, userId])]);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message };
    }
  }, []);

  const unblockUser = useCallback(async (userId) => {
    try {
      await matrimonialModerationService.unblockUser(userId);
      setBlockedIds(prev => prev.filter(id => id !== userId));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message };
    }
  }, []);

  const isBlocked = useCallback((userId) => blockedIds.includes(userId), [blockedIds]);

  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
  }, []);

  const getInterestStatus = useCallback((profile) => {
    if (!profile) return 'none';
    const profileId = (profile._id || profile.id)?.toString();
    const targetUserId = (profile.userId?._id || profile.userId)?.toString();

    // 1. Check if Accepted / Connected
    if (profile.isConnected || profile.connectionStatus === 'connected' || profile.connectionStatus === 'accepted') {
      return 'accepted';
    }
    const isAccepted = acceptedInterests?.some(item => {
      const recProfileId = (item.receiverProfile?._id || item.receiverProfileId || item.receiverProfile)?.toString();
      const recUserId = (item.receiverId?._id || item.receiverId || item.receiver?._id || item.receiver)?.toString();
      const sndUserId = (item.senderId?._id || item.senderId || item.sender?._id || item.sender)?.toString();

      return (
        (profileId && (recProfileId === profileId || recUserId === profileId || sndUserId === profileId)) ||
        (targetUserId && (recUserId === targetUserId || recProfileId === targetUserId || sndUserId === targetUserId))
      );
    });
    if (isAccepted) return 'accepted';

    // 2. Check if Sent (pending)
    if (profile.hasSentInterest || profile.interestStatus === 'sent' || profile.interestStatus === 'pending') {
      return 'sent';
    }
    const isPendingSent = sentInterests?.some(item => {
      const recProfileId = (item.receiverProfile?._id || item.receiverProfileId || item.receiverProfile)?.toString();
      const recUserId = (item.receiverId?._id || item.receiverId || item.receiver?._id || item.receiver)?.toString();

      return (
        (profileId && (recProfileId === profileId || recUserId === profileId)) ||
        (targetUserId && (recUserId === targetUserId || recProfileId === targetUserId))
      );
    });
    if (isPendingSent) return 'sent';

    return 'none';
  }, [acceptedInterests, sentInterests]);

  const value = {
    // My profile
    myProfile,
    myProfileLoading,
    fetchMyProfile,

    // Dashboard
    dashboard,
    dashboardLoading,
    fetchDashboard,

    // Interests
    receivedInterests,
    sentInterests,
    acceptedInterests,
    interestsLoading,
    fetchInterests,
    sendInterest,
    acceptInterest,
    rejectInterest,
    cancelInterest,
    getInterestStatus,

    // Visitors
    visitors,
    visitorsLoading,
    fetchVisitors,

    // UI
    viewMode,
    activeDiscoveryTab,
    setActiveDiscoveryTab,
    searchFilters,
    setSearchFilters,
    toggleViewMode,

    // Shortlist
    shortlistedIds,
    setShortlistedIds,
    toggleShortlist,
    addToShortlist,
    removeFromShortlist,
    isShortlisted,

    // Block
    blockedIds,
    blockUser,
    unblockUser,
    isBlocked,
  };

  return (
    <MatrimonialContext.Provider value={value}>
      <Outlet />
    </MatrimonialContext.Provider>
  );
};

export const useMatrimonial = () => {
  const context = useContext(MatrimonialContext);
  if (!context) {
    throw new Error('useMatrimonial must be used within a MatrimonialProvider');
  }
  return context;
};
