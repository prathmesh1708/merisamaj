import { axiosPrivate } from '../../../core/api/axiosPrivate';

const API_BASE = '/admin/voting';

export const adminVotingService = {
  getAllElections: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await axiosPrivate.get(`${API_BASE}${query ? `?${query}` : ''}`);
    return res.data;
  },

  getStats: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await axiosPrivate.get(`${API_BASE}/stats${query ? `?${query}` : ''}`);
    return res.data;
  },

  getElectionById: async (id) => {
    const res = await axiosPrivate.get(`${API_BASE}/${id}`);
    return res.data;
  },

  updateStatus: async (id, status) => {
    const res = await axiosPrivate.patch(`${API_BASE}/${id}/status`, { status });
    return res.data;
  },

  createElection: async (electionData) => {
    const res = await axiosPrivate.post(API_BASE, electionData);
    return res.data;
  },

  updateElection: async (id, electionData) => {
    const res = await axiosPrivate.put(`${API_BASE}/${id}`, electionData);
    return res.data;
  },

  getTargetOptions: async () => {
    const res = await axiosPrivate.get(`${API_BASE}/target-options`);
    return res.data;
  },

  deleteElection: async (id) => {
    const res = await axiosPrivate.delete(`${API_BASE}/${id}`);
    return res.data;
  }
};

export default adminVotingService;
