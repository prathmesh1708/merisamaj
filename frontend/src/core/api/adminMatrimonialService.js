import { axiosPrivate } from './axiosPrivate';

const BASE = '/admin/matrimonial';

export const adminMatrimonialService = {
  // Stats
  getStats: () => axiosPrivate.get(`${BASE}/stats`),

  // Success Stories
  getSuccessStories: (params) => axiosPrivate.get(`${BASE}/success-stories`, { params }),
  getEligibleCouples: () => axiosPrivate.get(`${BASE}/success-stories/eligible`),
  createSuccessStory: (data) => axiosPrivate.post(`${BASE}/success-stories`, data),
  uploadSuccessStoryImage: (formData) => axiosPrivate.post(`${BASE}/success-stories/upload-image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateSuccessStory: (id, data) => axiosPrivate.put(`${BASE}/success-stories/${id}`, data),
  deleteSuccessStory: (id) => axiosPrivate.delete(`${BASE}/success-stories/${id}`),
  publishSuccessStory: (id) => axiosPrivate.put(`${BASE}/success-stories/${id}/publish`),
  archiveSuccessStory: (id) => axiosPrivate.put(`${BASE}/success-stories/${id}/archive`),
  toggleFeatureSuccessStory: (id, featured) => axiosPrivate.put(`${BASE}/success-stories/${id}/feature`, { featured }),
};
