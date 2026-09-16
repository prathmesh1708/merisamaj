import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { memberReferralService } from '../../../../core/api/referralService';
import { useAuth } from '../../../../core/auth/useAuth';

const ReferralContext = createContext();

export const useReferral = () => {
  const context = useContext(ReferralContext);
  if (!context) {
    throw new Error('useReferral must be used within a ReferralProvider');
  }
  return context;
};

export const LEVELS = [
  { name: 'Bronze', minReferrals: 0, color: 'text-orange-400', bg: 'bg-orange-100' },
  { name: 'Silver', minReferrals: 5, color: 'text-slate-400', bg: 'bg-slate-100' },
  { name: 'Gold', minReferrals: 15, color: 'text-yellow-500', bg: 'bg-yellow-100' },
  { name: 'Platinum', minReferrals: 50, color: 'text-teal-400', bg: 'bg-teal-100' },
  { name: 'Diamond', minReferrals: 100, color: 'text-blue-500', bg: 'bg-blue-100' }
];

export const ReferralProvider = ({ children }) => {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState(auth?.user?.referralCode || '');
  const [totalPoints, setTotalPoints] = useState(auth?.user?.pointsBalance || 0);
  const [totalEarned, setTotalEarned] = useState(auth?.user?.totalPointsEarned || 0);
  const [pendingPoints] = useState(0); // 0 per requirements: points credited immediately
  const [redeemedPoints] = useState(0); // Phase 2
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [eventBreakdown, setEventBreakdown] = useState({
    REGISTRATION: { count: 0, points: 0 },
    SUBSCRIPTION: { count: 0, points: 0 },
    MEMBERSHIP: { count: 0, points: 0 },
    DONATION: { count: 0, points: 0 }
  });

  const [referralHistory, setReferralHistory] = useState([]);
  const [referredUsers, setReferredUsers] = useState([]);
  const [topEarners, setTopEarners] = useState([]);

  // Sync with auth user if available
  useEffect(() => {
    if (auth?.user?.referralCode && !referralCode) {
      setReferralCode(auth.user.referralCode);
    }
  }, [auth?.user?.referralCode, referralCode]);

  const fetchReferralData = useCallback(async () => {
    setLoading(true);
    try {
      const [infoRes, historyRes, usersRes, leaderboardRes] = await Promise.allSettled([
        memberReferralService.getMyReferralInfo(),
        memberReferralService.getMyReferralHistory(),
        memberReferralService.getMyReferredUsers(),
        memberReferralService.getLeaderboard()
      ]);

      if (infoRes.status === 'fulfilled' && infoRes.value.data?.data) {
        const d = infoRes.value.data.data;
        const code = d.referralCode || auth?.user?.referralCode || '';
        if (code) setReferralCode(code);
        setTotalPoints(d.pointsBalance || 0);
        setTotalEarned(d.totalPointsEarned || 0);
        setTotalReferrals(d.totalReferrals || 0);
        if (d.eventBreakdown) setEventBreakdown(d.eventBreakdown);
      } else if (auth?.user?.referralCode) {
        setReferralCode(auth.user.referralCode);
      }

      if (historyRes.status === 'fulfilled' && historyRes.value.data?.data) {
        const hist = historyRes.value.data.data.map(h => ({
          id: h._id,
          name: h.referredUser?.name || 'Member',
          avatar: h.referredUser?.avatar || null,
          date: new Date(h.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          action: h.eventType === 'REGISTRATION' ? 'Joined using your code' 
                : h.eventType === 'SUBSCRIPTION' ? 'Subscription Purchase' 
                : h.eventType === 'MEMBERSHIP' ? 'Membership Upgrade' 
                : 'Donation Contribution',
          points: h.pointsAwarded,
          status: 'earned',
          type: h.eventType.toLowerCase()
        }));
        setReferralHistory(hist);
      }

      if (usersRes.status === 'fulfilled' && usersRes.value.data?.data) {
        setReferredUsers(usersRes.value.data.data);
      }

      if (leaderboardRes.status === 'fulfilled' && leaderboardRes.value.data?.data) {
        setTopEarners(leaderboardRes.value.data.data);
      }

    } catch (err) {
      console.error('Error loading referral context data:', err);
    } finally {
      setLoading(false);
    }
  }, [auth?.user?.referralCode]);

  useEffect(() => {
    if (auth?.isAuthenticated) {
      fetchReferralData();
    }
  }, [auth?.isAuthenticated, fetchReferralData]);

  // Real backend validation function
  const validateReferralCode = async (code) => {
    try {
      const res = await memberReferralService.validateReferralCode(code);
      if (res.data?.valid) {
        return { valid: true, message: res.data.message };
      }
      return { valid: false, message: res.data?.message || 'Invalid code.' };
    } catch (err) {
      return { valid: false, message: err.response?.data?.message || 'Code validation failed.' };
    }
  };

  const calculateCheckoutDiscount = (originalPrice, applyPoints = false, appliedCode = null) => {
    let codeDiscount = appliedCode ? 100 : 0;
    let subtotal = originalPrice - codeDiscount;
    let pointsRedeemed = applyPoints ? Math.min(totalPoints, subtotal) : 0;
    return {
      originalPrice,
      codeDiscount,
      pointsRedeemed,
      finalAmount: Math.max(0, subtotal - pointsRedeemed)
    };
  };

  const currentLevel = LEVELS.slice().reverse().find(l => totalReferrals >= l.minReferrals) || LEVELS[0];
  const nextLevel = LEVELS.find(l => l.minReferrals > totalReferrals) || null;

  // Earnings Summary per event breakdown
  const earningsSummary = [
    { title: 'Registration Reward', count: `${eventBreakdown.REGISTRATION?.count || 0} Referrals`, amount: eventBreakdown.REGISTRATION?.points || 0, icon: 'Users' },
    { title: 'Subscription Reward', count: `${eventBreakdown.SUBSCRIPTION?.count || 0} Subscribers`, amount: eventBreakdown.SUBSCRIPTION?.points || 0, icon: 'Crown' },
    { title: 'Membership Reward', count: `${eventBreakdown.MEMBERSHIP?.count || 0} Upgrades`, amount: eventBreakdown.MEMBERSHIP?.points || 0, icon: 'Award' },
    { title: 'Donation Reward', count: `${eventBreakdown.DONATION?.count || 0} Donations`, amount: eventBreakdown.DONATION?.points || 0, icon: 'Heart' }
  ];

  const recentActivity = referralHistory.slice(0, 5);

  const value = {
    loading,
    referralCode,
    totalPoints,
    pendingPoints,
    totalEarned,
    redeemedPoints,
    availablePoints: totalPoints,
    totalReferrals,
    eventBreakdown,
    unlockedBadges: [],
    currentLevel,
    nextLevel,
    earningsOverview: [],
    earningsSummary,
    topEarners,
    recentActivity,
    referralHistory,
    referredUsers,
    validateReferralCode,
    calculateCheckoutDiscount,
    refreshReferralData: fetchReferralData
  };

  return (
    <ReferralContext.Provider value={value}>
      {children}
    </ReferralContext.Provider>
  );
};
