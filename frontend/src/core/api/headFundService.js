import { axiosPrivate } from './axiosPrivate';

const API_BASE = '/head/funds';

export const headFundService = {
  getFunds: async () => {
    const res = await axiosPrivate.get(API_BASE);
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

  addExpense: async (id, expenseData) => {
    const res = await axiosPrivate.post(`${API_BASE}/${id}/expenses`, expenseData);
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

  recordCashPayment: async (fundId, paymentData) => {
    const res = await axiosPrivate.post(`${API_BASE}/${fundId}/record-cash-payment`, paymentData);
    return res.data;
  }
};

export default headFundService;
