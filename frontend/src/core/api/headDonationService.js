import { axiosPrivate } from './axiosPrivate';

const headDonationService = {
  getDashboardStats: async () => {
    const response = await axiosPrivate.get('/head/donations/dashboard-stats');
    return response.data.data;
  },

  getAllCampaigns: async () => {
    const response = await axiosPrivate.get('/head/donations/campaigns');
    return response.data.data;
  },

  getCampaignById: async (id) => {
    const response = await axiosPrivate.get(`/head/donations/campaigns/${id}`);
    return response.data.data;
  },

  createCampaign: async (campaignData) => {
    const response = await axiosPrivate.post('/head/donations/campaigns', campaignData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
  },

  updateCampaign: async (id, campaignData) => {
    const response = await axiosPrivate.put(`/head/donations/campaigns/${id}`, campaignData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
  },

  deleteCampaign: async (id) => {
    const response = await axiosPrivate.delete(`/head/donations/campaigns/${id}`);
    return response.data; // Usually 204 No Content
  },

  updateCampaignStatus: async (id, status) => {
    const response = await axiosPrivate.patch(`/head/donations/campaigns/${id}/status`, { status });
    return response.data.data;
  },

  getCampaignDonors: async (id) => {
    const response = await axiosPrivate.get(`/head/donations/campaigns/${id}/donors`);
    return response.data.data;
  },

  addExpense: async (id, expenseData) => {
    const response = await axiosPrivate.post(`/head/donations/campaigns/${id}/expenses`, expenseData);
    return response.data.data;
  },

  getCampaignExpenses: async (id) => {
    const response = await axiosPrivate.get(`/head/donations/campaigns/${id}/expenses`);
    return response.data.data;
  },

  getLedger: async () => {
    const response = await axiosPrivate.get('/head/donations/ledger');
    return response.data.data;
  },

  getCategories: async () => {
    const response = await axiosPrivate.get('/head/donations/categories');
    return response.data.data || response.data;
  },

  createCategory: async (categoryData) => {
    const response = await axiosPrivate.post('/head/donations/categories', categoryData);
    return response.data.data || response.data;
  },

  deleteCategory: async (id) => {
    const response = await axiosPrivate.delete(`/head/donations/categories/${id}`);
    return response.data;
  }
};

export default headDonationService;
