import { axiosPrivate } from './axiosPrivate';

const BASE_URL = '/head/local-community';

const headLocalCommunityService = {
  getLocalHeads: async () => {
    const response = await axiosPrivate.get(`${BASE_URL}/local-heads`);
    return response.data;
  },

  createLocalHead: async (data) => {
    const response = await axiosPrivate.post(`${BASE_URL}/local-heads`, data);
    return response.data;
  },

  updateLocalHead: async (id, data) => {
    const response = await axiosPrivate.put(`${BASE_URL}/local-heads/${id}`, data);
    return response.data;
  },

  toggleLocalHeadStatus: async (id) => {
    const response = await axiosPrivate.patch(`${BASE_URL}/local-heads/${id}/status`);
    return response.data;
  },

  deleteLocalHead: async (id) => {
    const response = await axiosPrivate.delete(`${BASE_URL}/local-heads/${id}`);
    return response.data;
  }
};

export default headLocalCommunityService;
