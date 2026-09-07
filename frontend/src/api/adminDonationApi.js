import { axiosPrivate } from '../core/api/axiosPrivate';

const API_BASE = '/admin/donations';

export const adminDonationApi = {
  getAllDonations: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await axiosPrivate.get(`${API_BASE}${query ? `?${query}` : ''}`);
    return res.data;
  },

  getCommunities: async () => {
    const res = await axiosPrivate.get('/admin/communities');
    return res.data;
  },

  createDonation: async (donationData) => {
    const res = await axiosPrivate.post(API_BASE, donationData);
    return res.data;
  },

  updateDonation: async (id, donationData, source) => {
    const payload = source ? { ...donationData, source } : donationData;
    const res = await axiosPrivate.put(`${API_BASE}/${id}`, payload);
    return res.data;
  },

  closeDonation: async (id, source) => {
    const res = await axiosPrivate.patch(`${API_BASE}/${id}/close`, { source });
    return res.data;
  },

  deleteDonation: async (id, source) => {
    const query = source ? `?source=${source}` : '';
    const res = await axiosPrivate.delete(`${API_BASE}/${id}${query}`);
    return res.data;
  },

  getCategories: async () => {
    const res = await axiosPrivate.get(`${API_BASE}/categories`);
    return res.data;
  },

  createCategory: async (categoryData) => {
    const res = await axiosPrivate.post(`${API_BASE}/categories`, categoryData);
    return res.data;
  },

  deleteCategory: async (id) => {
    const res = await axiosPrivate.delete(`${API_BASE}/categories/${id}`);
    return res.data;
  }
};

export default adminDonationApi;
