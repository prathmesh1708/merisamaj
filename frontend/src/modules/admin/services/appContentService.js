import { axiosPrivate } from '../../../core/api/axiosPrivate';

const BASE_URL = '/admin/user-app-edits';

export const appContentService = {
  // Get all app content customization
  getAppContent: async (communityId) => {
    const params = communityId ? { communityId } : {};
    const res = await axiosPrivate.get(BASE_URL, { params });
    return res.data;
  },

  // Update Hero Banner
  updateHeroBanner: async (data, communityId) => {
    const payload = { ...data, communityId };
    const res = await axiosPrivate.put(`${BASE_URL}/hero`, payload);
    return res.data;
  },

  // Exclusive Features CRUD
  createFeature: async (data, communityId) => {
    const payload = { ...data, communityId };
    const res = await axiosPrivate.post(`${BASE_URL}/features`, payload);
    return res.data;
  },

  updateFeature: async (id, data, communityId) => {
    const payload = { ...data, communityId };
    const res = await axiosPrivate.put(`${BASE_URL}/features/${id}`, payload);
    return res.data;
  },

  deleteFeature: async (id, communityId) => {
    const params = communityId ? { communityId } : {};
    const res = await axiosPrivate.delete(`${BASE_URL}/features/${id}`, { params });
    return res.data;
  },

  // Success Stories CRUD
  createSuccessStory: async (data, communityId) => {
    const payload = { ...data, communityId };
    const res = await axiosPrivate.post(`${BASE_URL}/success-stories`, payload);
    return res.data;
  },

  updateSuccessStory: async (id, data, communityId) => {
    const payload = { ...data, communityId };
    const res = await axiosPrivate.put(`${BASE_URL}/success-stories/${id}`, payload);
    return res.data;
  },

  deleteSuccessStory: async (id, communityId) => {
    const params = communityId ? { communityId } : {};
    const res = await axiosPrivate.delete(`${BASE_URL}/success-stories/${id}`, { params });
    return res.data;
  },

  // Core Members & Leadership CRUD
  updateCommunityHead: async (data, communityId) => {
    const payload = { ...data, communityId };
    const res = await axiosPrivate.put(`${BASE_URL}/core-members/head`, payload);
    return res.data;
  },

  createCommitteeMember: async (data, communityId) => {
    const payload = { ...data, communityId };
    const res = await axiosPrivate.post(`${BASE_URL}/core-members/committee`, payload);
    return res.data;
  },

  updateCommitteeMember: async (id, data, communityId) => {
    const payload = { ...data, communityId };
    const res = await axiosPrivate.put(`${BASE_URL}/core-members/committee/${id}`, payload);
    return res.data;
  },

  deleteCommitteeMember: async (id, communityId) => {
    const params = communityId ? { communityId } : {};
    const res = await axiosPrivate.delete(`${BASE_URL}/core-members/committee/${id}`, { params });
    return res.data;
  }
};

export default appContentService;
