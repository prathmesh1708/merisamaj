import { axiosPrivate } from './axiosPrivate';

const API_URL = '/member/social';

const getPosts = async (feedType, category, limit = 10, cursor = '') => {
  const params = { feed: feedType, limit };
  if (category) params.category = category;
  if (cursor) params.cursor = cursor;
  
  const response = await axiosPrivate.get(`${API_URL}/posts`, { params });
  return response.data;
};

const getPostById = async (id) => {
  const response = await axiosPrivate.get(`${API_URL}/posts/${id}`);
  return response.data;
};

const createPost = async (postData) => {
  const response = await axiosPrivate.post(`${API_URL}/posts`, postData);
  return response.data;
};

const toggleLike = async (id) => {
  const response = await axiosPrivate.post(`${API_URL}/posts/${id}/like`);
  return response.data;
};

const getComments = async (id, parentCommentId = '') => {
  const params = {};
  if (parentCommentId) params.parentCommentId = parentCommentId;
  const response = await axiosPrivate.get(`${API_URL}/posts/${id}/comments`, { params });
  return response.data;
};

const addComment = async (id, commentData) => {
  const response = await axiosPrivate.post(`${API_URL}/posts/${id}/comments`, commentData);
  return response.data;
};

const toggleCommentLike = async (commentId) => {
  const response = await axiosPrivate.post(`${API_URL}/comments/${commentId}/like`);
  return response.data;
};

const toggleSave = async (id) => {
  const response = await axiosPrivate.post(`${API_URL}/posts/${id}/save`);
  return response.data;
};

const recordView = async (id, duration = 0) => {
  const response = await axiosPrivate.post(`${API_URL}/posts/${id}/view`, { duration });
  return response.data;
};

const recordShare = async (id, platform = 'copy_link') => {
  const response = await axiosPrivate.post(`${API_URL}/posts/${id}/share`, { platform });
  return response.data;
};

const getShareRecipients = async (search = '') => {
  const params = {};
  if (search) params.search = search;
  const response = await axiosPrivate.get(`${API_URL}/share-recipients`, { params });
  return response.data;
};

const sharePostToUser = async (postId, recipientId, note = '') => {
  const response = await axiosPrivate.post(`${API_URL}/posts/${postId}/share-to-user`, { recipientId, note });
  return response.data;
};

const searchSocial = async (query) => {
  const response = await axiosPrivate.get(`${API_URL}/search`, { params: { query } });
  return response.data;
};

// Stories APIs
const getStories = async () => {
  const response = await axiosPrivate.get(`${API_URL}/stories`);
  return response.data;
};

const createStory = async (storyData) => {
  const response = await axiosPrivate.post(`${API_URL}/stories`, storyData);
  return response.data;
};

const deleteStory = async (id) => {
  const response = await axiosPrivate.delete(`${API_URL}/stories/${id}`);
  return response.data;
};

const viewStory = async (id) => {
  const response = await axiosPrivate.post(`${API_URL}/stories/${id}/view`);
  return response.data;
};

const likeStory = async (id) => {
  const response = await axiosPrivate.post(`${API_URL}/stories/${id}/like`);
  return response.data;
};

// Follower APIs
const toggleFollow = async (userId) => {
  if (!userId || userId === 'undefined' || userId === 'null') {
    return { success: false, message: 'Invalid user ID' };
  }
  const response = await axiosPrivate.post(`${API_URL}/follow/${userId}`);
  return response.data;
};

const getFollowers = async (userId) => {
  if (!userId || userId === 'undefined' || userId === 'null') {
    return { success: true, data: [] };
  }
  const response = await axiosPrivate.get(`${API_URL}/users/${userId}/followers`);
  return response.data;
};

const getFollowing = async (userId) => {
  if (!userId || userId === 'undefined' || userId === 'null') {
    return { success: true, data: [] };
  }
  const response = await axiosPrivate.get(`${API_URL}/users/${userId}/following`);
  return response.data;
};

// Profile Stats & Tab APIs
const getProfileStats = async (userId = '') => {
  const params = userId ? { userId } : {};
  const response = await axiosPrivate.get(`${API_URL}/profile-stats`, { params });
  return response.data;
};

const getUserPosts = async (userId, limit = 10, cursor = '') => {
  const params = { limit };
  if (cursor) params.cursor = cursor;
  const response = await axiosPrivate.get(`${API_URL}/posts/user/${userId}`, { params });
  return response.data;
};

const getSavedPosts = async () => {
  const response = await axiosPrivate.get(`${API_URL}/posts/saved`);
  return response.data;
};

const getLikedPosts = async () => {
  const response = await axiosPrivate.get(`${API_URL}/posts/liked`);
  return response.data;
};

// Highlights APIs
const getUserHighlights = async (userId = '') => {
  const params = userId ? { userId } : {};
  const response = await axiosPrivate.get(`${API_URL}/highlights`, { params });
  return response.data;
};

const getPastStories = async () => {
  const response = await axiosPrivate.get(`${API_URL}/highlights/past-stories`);
  return response.data;
};

const createHighlight = async (highlightData) => {
  const response = await axiosPrivate.post(`${API_URL}/highlights`, highlightData);
  return response.data;
};

const deleteHighlight = async (id) => {
  const response = await axiosPrivate.delete(`${API_URL}/highlights/${id}`);
  return response.data;
};

const updateUserProfile = async (payload) => {
  const response = await axiosPrivate.put(`/auth/update-profile`, payload);
  return response.data;
};

const updatePost = async (id, postData) => {
  const response = await axiosPrivate.put(`${API_URL}/posts/${id}`, postData);
  return response.data;
};

const deletePost = async (id) => {
  const response = await axiosPrivate.delete(`${API_URL}/posts/${id}`);
  return response.data;
};

const updateComment = async (commentId, commentData) => {
  const response = await axiosPrivate.put(`${API_URL}/comments/${commentId}`, commentData);
  return response.data;
};

const deleteComment = async (commentId) => {
  const response = await axiosPrivate.delete(`${API_URL}/comments/${commentId}`);
  return response.data;
};

const getAnnouncementFollowStatus = async () => {
  const response = await axiosPrivate.get(`${API_URL}/announcements/follow-status`);
  return response.data;
};

const toggleFollowAnnouncements = async () => {
  const response = await axiosPrivate.post(`${API_URL}/announcements/toggle-follow`);
  return response.data;
};

const socialService = {
  getAnnouncementFollowStatus,
  toggleFollowAnnouncements,
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  getComments,
  addComment,
  updateComment,
  deleteComment,
  toggleCommentLike,
  toggleSave,
  recordView,
  recordShare,
  getShareRecipients,
  sharePostToUser,
  searchSocial,
  getStories,
  createStory,
  deleteStory,
  viewStory,
  likeStory,
  toggleFollow,
  getFollowers,
  getFollowing,
  getProfileStats,
  getSavedPosts,
  getLikedPosts,
  getUserHighlights,
  getPastStories,
  createHighlight,
  deleteHighlight,
  updateUserProfile,
  getUserPosts
};

export default socialService;
