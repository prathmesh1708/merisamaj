import { axiosPrivate } from '../../../core/api/axiosPrivate';

const BASE_URL = '/admin/user-app-edits';

// Decode a base64 data URL into a Blob locally. `fetch(dataUrl)` must not be
// used here: the app's Content-Security-Policy `connect-src` does not allow
// the `data:` scheme, so the browser blocks it ("Failed to fetch").
const dataUrlToBlob = (dataUrl) => {
  const [header, base64 = ''] = dataUrl.split(',');
  const mimeType = header.match(/^data:([^;]+)/)?.[1] || 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
};

// Which content is edited. `scope` is a sub-community name (older callers) or
// { subCommunity, locationCity }; empty values mean "community-wide" / "all locations".
// `locationCity` (not `city`) so it never clashes with the forms' own city fields.
const scopeFields = (scope = '') => {
  const { subCommunity = '', locationCity = '' } = typeof scope === 'string' ? { subCommunity: scope } : (scope || {});
  return { subCommunity, ...(locationCity ? { locationCity } : {}) };
};
const scopeParams = (communityId, scope) => {
  const { subCommunity, locationCity } = scopeFields(scope);
  return { ...(communityId ? { communityId } : {}), ...(subCommunity ? { subCommunity } : {}), ...(locationCity ? { locationCity } : {}) };
};

export const appContentService = {
  // Get all app content customization
  getAppContent: async (communityId, scope = '') => {
    const res = await axiosPrivate.get(BASE_URL, { params: scopeParams(communityId, scope) });
    return res.data;
  },

  // Cities of the selected community / sub-community, and which have their own content
  getLocations: async (communityId, subCommunity = '') => {
    const res = await axiosPrivate.get(`${BASE_URL}/locations`, { params: scopeParams(communityId, subCommunity) });
    return res.data;
  },

  // Drop a location's own content: it shows the sub-community / community content again
  resetLocation: async (communityId, scope) => {
    const res = await axiosPrivate.delete(`${BASE_URL}/locations`, { params: scopeParams(communityId, scope) });
    return res.data;
  },

  // Hand one section back to the level above: target 'self' (this sub-community /
  // location follows it again) or 'below' (everything under this scope follows this one)
  inheritSection: async (communityId, scope, section, target) => {
    const res = await axiosPrivate.post(`${BASE_URL}/inherit`, { communityId, ...scopeFields(scope), section, target });
    return res.data;
  },

  // Update Hero Banner
  updateHeroBanner: async (data, communityId, scope = '') => {
    let payload = { ...data, communityId, ...scopeFields(scope) };
    if (typeof data.backgroundImage === 'string' && data.backgroundImage.startsWith('data:image/')) {
      let imageBlob = dataUrlToBlob(data.backgroundImage);
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
      Object.entries({ ...data, communityId, ...scopeFields(scope) }).forEach(([key, value]) => {
        if (key !== 'backgroundImage' && value !== undefined && value !== null) payload.append(key, String(value));
      });
    }
    const res = await axiosPrivate.put(`${BASE_URL}/hero`, payload);
    return res.data;
  },

  // Update Community Census Banner
  updateCensusBanner: async (data, communityId, scope = '') => {
    const res = await axiosPrivate.put(`${BASE_URL}/census`, { ...data, communityId, ...scopeFields(scope) });
    return res.data;
  },

  // Exclusive Features CRUD
  createFeature: async (data, communityId, scope = '') => {
    const res = await axiosPrivate.post(`${BASE_URL}/features`, { ...data, communityId, ...scopeFields(scope) });
    return res.data;
  },

  updateFeature: async (id, data, communityId, scope = '') => {
    const res = await axiosPrivate.put(`${BASE_URL}/features/${id}`, { ...data, communityId, ...scopeFields(scope) });
    return res.data;
  },

  deleteFeature: async (id, communityId, scope = '') => {
    const res = await axiosPrivate.delete(`${BASE_URL}/features/${id}`, { params: scopeParams(communityId, scope) });
    return res.data;
  },

  // Success Stories CRUD
  createSuccessStory: async (data, communityId, scope = '') => {
    const res = await axiosPrivate.post(`${BASE_URL}/success-stories`, { ...data, communityId, ...scopeFields(scope) });
    return res.data;
  },

  updateSuccessStory: async (id, data, communityId, scope = '') => {
    const res = await axiosPrivate.put(`${BASE_URL}/success-stories/${id}`, { ...data, communityId, ...scopeFields(scope) });
    return res.data;
  },

  deleteSuccessStory: async (id, communityId, scope = '') => {
    const res = await axiosPrivate.delete(`${BASE_URL}/success-stories/${id}`, { params: scopeParams(communityId, scope) });
    return res.data;
  },

  // Core Members & Leadership CRUD
  updateCommunityHead: async (data, communityId, scope = '') => {
    const res = await axiosPrivate.put(`${BASE_URL}/core-members/head`, { ...data, communityId, ...scopeFields(scope) });
    return res.data;
  },

  createCommitteeMember: async (data, communityId, scope = '') => {
    const res = await axiosPrivate.post(`${BASE_URL}/core-members/committee`, { ...data, communityId, ...scopeFields(scope) });
    return res.data;
  },

  updateCommitteeMember: async (id, data, communityId, scope = '') => {
    const res = await axiosPrivate.put(`${BASE_URL}/core-members/committee/${id}`, { ...data, communityId, ...scopeFields(scope) });
    return res.data;
  },

  deleteCommitteeMember: async (id, communityId, scope = '') => {
    const res = await axiosPrivate.delete(`${BASE_URL}/core-members/committee/${id}`, { params: scopeParams(communityId, scope) });
    return res.data;
  },

  // End of Feed / Footer Artwork
  updateFooterArtwork: async (data, communityId, scope = '') => {
    const res = await axiosPrivate.put(`${BASE_URL}/footer-artwork`, { ...data, communityId, ...scopeFields(scope) });
    return res.data;
  },

  // Promotional Sliding Banners CRUD
  createPromotionalBanner: async (data, communityId, scope = '') => {
    const res = await axiosPrivate.post(`${BASE_URL}/promotional-banners`, { ...data, communityId, ...scopeFields(scope) });
    return res.data;
  },

  updatePromotionalBanner: async (id, data, communityId, scope = '') => {
    const res = await axiosPrivate.put(`${BASE_URL}/promotional-banners/${id}`, { ...data, communityId, ...scopeFields(scope) });
    return res.data;
  },

  deletePromotionalBanner: async (id, communityId, scope = '') => {
    const res = await axiosPrivate.delete(`${BASE_URL}/promotional-banners/${id}`, { params: scopeParams(communityId, scope) });
    return res.data;
  }
};

export default appContentService;
