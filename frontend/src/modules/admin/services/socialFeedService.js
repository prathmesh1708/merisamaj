import { axiosPrivate } from '../../../core/api/axiosPrivate';
import { getApiUrl } from '../../../core/api/axiosConfig';

const API_BASE = `${getApiUrl()}/admin/social`;

const mapPost = (post) => ({
  id: post._id,
  _id: post._id,
  content: post.content,
  images: post.images && post.images.length > 0 ? post.images : (post.media?.map(m => m.url) || []),
  media: post.media || [],
  author: {
    id: post.authorId?._id || post.userId?._id,
    name: post.authorId?.name || post.userId?.name || 'Unknown Member',
    avatar: post.authorId?.avatar || post.userId?.avatar,
    city: post.authorId?.city || post.userId?.city,
  },
  authorId: post.authorId || post.userId,
  userId: post.userId || post.authorId,
  community: {
    id: post.communityId?._id || post.communityId,
    name: post.communityId?.name || 'Unknown Community',
    city: post.communityId?.city,
  },
  communityId: post.communityId,
  city: post.resolvedCity || post.authorId?.city || post.userId?.city || post.communityId?.city || 'Unknown',
  resolvedCity: post.resolvedCity || post.authorId?.city || post.userId?.city || post.communityId?.city || 'Unknown',
  likesCount: post.likesCount ?? post.likes?.length ?? 0,
  commentsCount: post.commentsCount ?? post.comments?.length ?? 0,
  status: post.status || 'published',
  isPinned: post.isPinned || false,
  isDeleted: post.isDeleted || false,
  createdAt: post.createdAt,
});

export const socialFeedService = {
  // City Feed — platform-wide posts, optionally filtered by author's city
  fetchCityFeed: async ({ city = '', status = 'active', search = '', page = 1, limit = 20 } = {}) => {
    try {
      const params = new URLSearchParams();
      if (city) params.append('city', city);
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      params.append('page', page);
      params.append('limit', limit);

      const response = await axiosPrivate.get(`${API_BASE}/city-feed?${params.toString()}`);
      return {
        posts: (response.data.data || []).map(mapPost),
        total: response.data.total || 0,
        totalPages: response.data.totalPages || 1,
        page: response.data.page || 1,
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch city feed');
    }
  },

  // Community Feed — platform-wide posts, optionally filtered by communityId
  fetchCommunityFeed: async ({ communityId = '', status = 'active', search = '', page = 1, limit = 20 } = {}) => {
    try {
      const params = new URLSearchParams();
      if (communityId) params.append('communityId', communityId);
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      params.append('page', page);
      params.append('limit', limit);

      const response = await axiosPrivate.get(`${API_BASE}/community-feed?${params.toString()}`);
      return {
        posts: (response.data.data || []).map(mapPost),
        total: response.data.total || 0,
        totalPages: response.data.totalPages || 1,
        page: response.data.page || 1,
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch community feed');
    }
  },

  // List of communities, used to populate the Community Feed filter dropdown
  fetchCommunitiesForFilter: async () => {
    try {
      const response = await axiosPrivate.get(`${API_BASE}/communities`);
      return (response.data.data || []).map((c) => ({ id: c._id, name: c.name, city: c.city, slug: c.slug }));
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch communities');
    }
  },

  // Moderation: delete a post (spam / inappropriate content)
  deletePost: async (postId) => {
    try {
      await axiosPrivate.delete(`${API_BASE}/posts/${postId}`);
      return true;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete post');
    }
  },

  // Get rich post details for Moderation Drawer/Modal
  getPostDetails: async (postId) => {
    try {
      const response = await axiosPrivate.get(`${API_BASE}/posts/${postId}`);
      return response.data.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch post details');
    }
  },
};

export default socialFeedService;
