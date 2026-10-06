import { axiosPrivate } from '../../../core/api/axiosPrivate';

const API_BASE = '/admin/funds';

export const adminFundService = {
  getFunds: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.communityId) params.append('communityId', filters.communityId);
    if (filters.scope) params.append('scope', filters.scope);
    if (filters.status) params.append('status', filters.status);
    const res = await axiosPrivate.get(`${API_BASE}?${params.toString()}`);
    return res.data;
  },

  getFundById: async (id) => {
    const res = await axiosPrivate.get(`${API_BASE}/${id}`);
    return res.data;
  },

  createFund: async (fundData) => {
    const res = await axiosPrivate.post(API_BASE, fundData);
    return res.data;
  },

  updateFund: async (id, fundData) => {
    const res = await axiosPrivate.put(`${API_BASE}/${id}`, fundData);
    return res.data;
  },

  deleteFund: async (id) => {
    const res = await axiosPrivate.delete(`${API_BASE}/${id}`);
    return res.data;
  },

  getFundContributions: async (id) => {
    const res = await axiosPrivate.get(`${API_BASE}/${id}/contributions`);
    return res.data;
  },

  getFundExpenses: async (id) => {
    const res = await axiosPrivate.get(`${API_BASE}/${id}/expenses`);
    return res.data;
  },

  getFundTransactions: async (id) => {
    const res = await axiosPrivate.get(`${API_BASE}/${id}/transactions`);
    return res.data;
  },

  getStats: async () => {
    const res = await axiosPrivate.get(`${API_BASE}/stats`);
    return res.data;
  },

  getIncomeSources: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.communityId) params.append('communityId', filters.communityId);
    if (filters.city) params.append('city', filters.city);
    const res = await axiosPrivate.get(`${API_BASE}/income-sources?${params.toString()}`);
    return res.data;
  }
};
