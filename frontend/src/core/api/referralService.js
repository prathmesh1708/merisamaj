import { axiosPrivate } from './axiosPrivate';

export const memberReferralService = {
  getMyReferralInfo: () => axiosPrivate.get('/member/referral/info'),
  getMyReferralHistory: () => axiosPrivate.get('/member/referral/history'),
  getMyReferredUsers: () => axiosPrivate.get('/member/referral/referred-users'),
  getLeaderboard: () => axiosPrivate.get('/member/referral/leaderboard'),
  validateReferralCode: (code) => axiosPrivate.post('/member/referral/validate', { code })
};

export const adminReferralService = {
  getAllReferrals: (params) => axiosPrivate.get('/admin/referrals', { params }),
  getReferralStats: () => axiosPrivate.get('/admin/referrals/stats'),
  getReferralConfig: () => axiosPrivate.get('/admin/referrals/config'),
  updateReferralConfig: (data) => axiosPrivate.put('/admin/referrals/config', data)
};

export default memberReferralService;
