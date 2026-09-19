import { axiosPrivate } from '../../../core/api/axiosPrivate';

const API = '/admin/users';

export const userService = {
  // ─── List users with server-side filter + pagination ───────────────────────
  getUsers: async (filters = {}, page = 1) => {
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('limit', 20);

    if (filters.search) params.set('search', filters.search);
    if (filters.status && filters.status !== 'All') params.set('status', filters.status.toLowerCase());
    if (filters.verificationStatus && filters.verificationStatus !== 'All') {
      params.set('verificationStatus', filters.verificationStatus.toLowerCase());
    }
    if (filters.communityId && filters.communityId !== 'all') params.set('communityId', filters.communityId);
    if (filters.city && filters.city !== 'All') params.set('city', filters.city);
    if (filters.headStatus && filters.headStatus !== 'all') params.set('headStatus', filters.headStatus);

    const res = await axiosPrivate.get(`${API}?${params.toString()}`);
    return res.data; // { status, data, pagination }
  },

  // ─── Dashboard stats ────────────────────────────────────────────────────────
  getStats: async () => {
    const res = await axiosPrivate.get(`${API}/stats`);
    return res.data.data;
  },

  // ─── Single user full detail ────────────────────────────────────────────────
  getUserById: async (id) => {
    const res = await axiosPrivate.get(`${API}/${id}`);
    return res.data.data;
  },

  // ─── Update user profile ────────────────────────────────────────────────────
  updateUser: async (id, data) => {
    const res = await axiosPrivate.put(`${API}/${id}`, data);
    return res.data.data;
  },

  // ─── Status actions ─────────────────────────────────────────────────────────
  verifyUser: async (id) => {
    const res = await axiosPrivate.patch(`${API}/${id}/verify`);
    return res.data.data;
  },

  suspendUser: async (id, reason) => {
    const res = await axiosPrivate.patch(`${API}/${id}/suspend`, { reason });
    return res.data.data;
  },

  blockUser: async (id, reason) => {
    const res = await axiosPrivate.patch(`${API}/${id}/block`, { reason });
    return res.data.data;
  },

  activateUser: async (id) => {
    const res = await axiosPrivate.patch(`${API}/${id}/activate`);
    return res.data.data;
  },

  deleteUser: async (id) => {
    const res = await axiosPrivate.delete(`${API}/${id}`);
    return res.data;
  },

  // ─── Assign / Promote Head for Member's Community ──────────────────────────
  assignHead: async (userId, data) => {
    const res = await axiosPrivate.post(`${API}/${userId}/assign-head`, data);
    return res.data;
  },
};
