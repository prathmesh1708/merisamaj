import { axiosPrivate } from './axiosPrivate';
import { axiosPublic } from './axiosConfig';

export const memberReferralService = {
  getMyReferralInfo: () => axiosPrivate.get('/member/referral/info'),
  getMyReferralHistory: () => axiosPrivate.get('/member/referral/history'),
  getMyReferredUsers: () => axiosPrivate.get('/member/referral/referred-users'),
  getLeaderboard: () => axiosPrivate.get('/member/referral/leaderboard'),
  // Public endpoint — works on the register screen before login
  validateReferralCode: (code) => axiosPublic.post('/auth/referral/validate', { code }),

  // Cash redemption
  getRedeemInfo: () => axiosPrivate.get('/member/referral/redeem-info'),
  getMyRedemptions: () => axiosPrivate.get('/member/referral/redemptions'),
  createRedemption: (data) => axiosPrivate.post('/member/referral/redemptions', data),
  cancelRedemption: (id) => axiosPrivate.put(`/member/referral/redemptions/${id}/cancel`)
};

export const adminReferralService = {
  getAllReferrals: (params) => axiosPrivate.get('/admin/referrals', { params }),
  getReferralStats: () => axiosPrivate.get('/admin/referrals/stats'),
  getReferralConfig: () => axiosPrivate.get('/admin/referrals/config'),
  updateReferralConfig: (data) => axiosPrivate.put('/admin/referrals/config', data),
  getReports: (params) => axiosPrivate.get('/admin/referrals/reports', { params }),

  getRedemptions: (params) => axiosPrivate.get('/admin/referrals/redemptions', { params }),
  getRedemptionDetail: (id) => axiosPrivate.get(`/admin/referrals/redemptions/${id}`),
  approveRedemption: (id, data) => axiosPrivate.put(`/admin/referrals/redemptions/${id}/approve`, data),
  markRedemptionPaid: (id, data) => axiosPrivate.put(`/admin/referrals/redemptions/${id}/pay`, data),
  rejectRedemption: (id, data) => axiosPrivate.put(`/admin/referrals/redemptions/${id}/reject`, data)
};

export default memberReferralService;
