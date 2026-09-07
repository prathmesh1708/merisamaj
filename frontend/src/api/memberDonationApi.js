import { axiosPrivate } from '../core/api/axiosPrivate';

const API_BASE = '/member/donations';

export const memberDonationApi = {
  getActiveDonations: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await axiosPrivate.get(`${API_BASE}${query ? `?${query}` : ''}`);
    return res.data;
  },

  getDonationById: async (id) => {
    const res = await axiosPrivate.get(`${API_BASE}/${id}`);
    return res.data;
  },

  handleDonationPayment: async (id, donationPayload) => {
    const res = await axiosPrivate.post(`${API_BASE}/${id}/donate`, donationPayload);
    return res.data;
  },

  createRazorpayOrder: async (id, payload) => {
    const res = await axiosPrivate.post(`${API_BASE}/${id}/create-order`, payload);
    return res.data;
  },

  verifyRazorpayPayment: async (payload) => {
    const res = await axiosPrivate.post(`${API_BASE}/verify-payment`, payload);
    return res.data;
  },

  getCategories: async () => {
    const res = await axiosPrivate.get(`${API_BASE}/categories`);
    return res.data;
  }
};

export default memberDonationApi;
