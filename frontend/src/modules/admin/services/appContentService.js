import { axiosPrivate } from '../../../core/api/axiosPrivate';

const BASE_URL = '/admin/user-app-edits';

export const appContentService = {
  // Get all app content customization
  getAppContent: async (communityId, subCommunity = '') => {
    const params = { ...(communityId ? { communityId } : {}), ...(subCommunity ? { subCommunity } : {}) };
    const res = await axiosPrivate.get(BASE_URL, { params });
    return res.data;
  },

  // Update Hero Banner
  updateHeroBanner: async (data, communityId, subCommunity = '') => {
    let payload = { ...data, communityId, subCommunity };
    if (typeof data.backgroundImage === 'string' && data.backgroundImage.startsWith('data:image/')) {
      let imageBlob = await fetch(data.backgroundImage).then((response) => response.blob());
      if (typeof createImageBitmap === 'function') {
        try {
          const bitmap = await createImageBitmap(imageBlob);
          const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(bitmap.width * scale));
          canvas.height = Math.max(1, Math.round(bitmap.height * scale));
          canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          bitmap.close();
          const compressed = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
          if (compressed && compressed.size < imageBlob.size) imageBlob = compressed;
        } catch {
          // Keep the original file if this browser cannot decode or re-encode it.
        }
      }
      payload = new FormData();
      const extension = imageBlob.type === 'image/webp' ? 'webp' : imageBlob.type.split('/')[1] || 'jpg';
      payload.append('bannerImage', imageBlob, `hero-banner.${extension}`);
      Object.entries({ ...data, communityId, subCommunity }).forEach(([key, value]) => {
        if (key !== 'backgroundImage' && value !== undefined && value !== null) payload.append(key, String(value));
      });
    }
    const res = await axiosPrivate.put(`${BASE_URL}/hero`, payload);
    return res.data;
  },

  // Update Community Census Banner
  updateCensusBanner: async (data, communityId, subCommunity = '') => {
    const payload = { ...data, communityId, subCommunity };
    const res = await axiosPrivate.put(`${BASE_URL}/census`, payload);
    return res.data;
  },

  // Exclusive Features CRUD
  createFeature: async (data, communityId, subCommunity = '') => {
    const payload = { ...data, communityId, subCommunity };
    const res = await axiosPrivate.post(`${BASE_URL}/features`, payload);
    return res.data;
  },

  updateFeature: async (id, data, communityId, subCommunity = '') => {
    const payload = { ...data, communityId, subCommunity };
    const res = await axiosPrivate.put(`${BASE_URL}/features/${id}`, payload);
    return res.data;
  },

  deleteFeature: async (id, communityId, subCommunity = '') => {
    const params = { ...(communityId ? { communityId } : {}), ...(subCommunity ? { subCommunity } : {}) };
    const res = await axiosPrivate.delete(`${BASE_URL}/features/${id}`, { params });
    return res.data;
  },

  // Success Stories CRUD
  createSuccessStory: async (data, communityId, subCommunity = '') => {
    const payload = { ...data, communityId, subCommunity };
    const res = await axiosPrivate.post(`${BASE_URL}/success-stories`, payload);
    return res.data;
  },

  updateSuccessStory: async (id, data, communityId, subCommunity = '') => {
    const payload = { ...data, communityId, subCommunity };
    const res = await axiosPrivate.put(`${BASE_URL}/success-stories/${id}`, payload);
    return res.data;
  },

  deleteSuccessStory: async (id, communityId, subCommunity = '') => {
    const params = { ...(communityId ? { communityId } : {}), ...(subCommunity ? { subCommunity } : {}) };
    const res = await axiosPrivate.delete(`${BASE_URL}/success-stories/${id}`, { params });
    return res.data;
  },

  // Core Members & Leadership CRUD
  updateCommunityHead: async (data, communityId, subCommunity = '') => {
    const payload = { ...data, communityId, subCommunity };
    const res = await axiosPrivate.put(`${BASE_URL}/core-members/head`, payload);
    return res.data;
  },

  createCommitteeMember: async (data, communityId, subCommunity = '') => {
    const payload = { ...data, communityId, subCommunity };
    const res = await axiosPrivate.post(`${BASE_URL}/core-members/committee`, payload);
    return res.data;
  },

  updateCommitteeMember: async (id, data, communityId, subCommunity = '') => {
    const payload = { ...data, communityId, subCommunity };
    const res = await axiosPrivate.put(`${BASE_URL}/core-members/committee/${id}`, payload);
    return res.data;
  },

  deleteCommitteeMember: async (id, communityId, subCommunity = '') => {
    const params = { ...(communityId ? { communityId } : {}), ...(subCommunity ? { subCommunity } : {}) };
    const res = await axiosPrivate.delete(`${BASE_URL}/core-members/committee/${id}`, { params });
    return res.data;
  },

  // End of Feed / Footer Artwork
  updateFooterArtwork: async (data, communityId, subCommunity = '') => {
    const payload = { ...data, communityId, subCommunity };
    const res = await axiosPrivate.put(`${BASE_URL}/footer-artwork`, payload);
    return res.data;
  },

  // Promotional Sliding Banners CRUD
  createPromotionalBanner: async (data, communityId, subCommunity = '') => {
    const payload = { ...data, communityId, subCommunity };
    const res = await axiosPrivate.post(`${BASE_URL}/promotional-banners`, payload);
    return res.data;
  },

  updatePromotionalBanner: async (id, data, communityId, subCommunity = '') => {
    const payload = { ...data, communityId, subCommunity };
    const res = await axiosPrivate.put(`${BASE_URL}/promotional-banners/${id}`, payload);
    return res.data;
  },

  deletePromotionalBanner: async (id, communityId, subCommunity = '') => {
    const params = { ...(communityId ? { communityId } : {}), ...(subCommunity ? { subCommunity } : {}) };
    const res = await axiosPrivate.delete(`${BASE_URL}/promotional-banners/${id}`, { params });
    return res.data;
  }
};

export default appContentService;
