/**
 * matrimonialService.js
 * All Axios calls for the Matrimonial module.
 */
import { axiosPrivate } from './axiosPrivate';

const BASE  = '/member/matrimonial';
const NOTIF = '/member/notifications';

// ─── Profile ──────────────────────────────────────────────────────────────────
export const matrimonialProfileService = {
  createProfile:   (data)       => axiosPrivate.post(`${BASE}/profile`, data),
  updateProfile:   (data)       => axiosPrivate.put(`${BASE}/profile`, data),
  getMyProfile:    ()           => axiosPrivate.get(`${BASE}/profile/me`),
  getUserProfile:  (id)         => axiosPrivate.get(`${BASE}/profile/${id}`),
  searchProfiles:  (params)     => axiosPrivate.get(`${BASE}/profile/search`, { params }),
  // Visibility & Privacy Settings
  getVisibilitySettings: ()           => axiosPrivate.get(`${BASE}/profile/visibility`),
  updateVisibilitySettings: (data)   => axiosPrivate.put(`${BASE}/profile/visibility`, data),
  getAvailableCommunities: ()        => axiosPrivate.get(`${BASE}/profile/communities`),
  // Photos
  uploadPhotos:    (formData)   => axiosPrivate.post(`${BASE}/profile/photos/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getPhotos:       ()           => axiosPrivate.get(`${BASE}/profile/photos/all`),
  setPrimaryPhoto: (photoId)    => axiosPrivate.put(`${BASE}/profile/photos/${photoId}/primary`),
  deletePhoto:     (photoId)    => axiosPrivate.delete(`${BASE}/profile/photos/${photoId}`),
};

// ─── Subscription ─────────────────────────────────────────────────────────────
export const matrimonialSubscriptionService = {
  listPlans:          ()     => axiosPrivate.get(`${BASE}/subscription/plans`),
  getMySubscription:  ()     => axiosPrivate.get(`${BASE}/subscription/me`),
  getHistory:         ()     => axiosPrivate.get(`${BASE}/subscription/history`),
  initiatePurchase:   (data) => axiosPrivate.post(`${BASE}/subscription/purchase`, data),
  verifyAndActivate:  (data) => axiosPrivate.post(`${BASE}/subscription/verify`, data),
  cancelSubscription: (data) => axiosPrivate.post(`${BASE}/subscription/cancel`, data),
};

// ─── Interests ────────────────────────────────────────────────────────────────
export const matrimonialInterestService = {
  sendInterest:         (data)   => axiosPrivate.post(`${BASE}/interests/send`, data),
  acceptInterest:       (id)     => axiosPrivate.post(`${BASE}/interests/accept/${id}`),
  rejectInterest:       (id)     => axiosPrivate.post(`${BASE}/interests/reject/${id}`),
  cancelInterest:       (id)     => axiosPrivate.post(`${BASE}/interests/cancel/${id}`),
  withdrawInterest:     (id)     => axiosPrivate.post(`${BASE}/interests/cancel/${id}`),
  getSentInterests:     (params) => axiosPrivate.get(`${BASE}/interests/sent`, { params }),
  getReceivedInterests: (params) => axiosPrivate.get(`${BASE}/interests/received`, { params }),
};

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const matrimonialChatService = {
  getConversations:     ()              => axiosPrivate.get(`${BASE}/chat/conversations`).catch(err => {
    if (err.response?.status === 403) return { data: { data: { conversations: [] } } };
    throw err;
  }),
  openConversation:     (profileId)     => axiosPrivate.post(`${BASE}/chat/conversations`, { profileId }),
  getMessages:          (cId, params)   => axiosPrivate.get(`${BASE}/chat/conversations/${cId}/messages`, { params }),
  sendMessage:          (cId, data)     => axiosPrivate.post(`${BASE}/chat/conversations/${cId}/messages`, data),
  sendImageMessage:     (cId, formData) => axiosPrivate.post(`${BASE}/chat/conversations/${cId}/messages`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  markSeen:             (cId, messageIds = []) => axiosPrivate.post(`${BASE}/chat/conversations/${cId}/seen`, { messageIds }),
  deleteMessage:        (msgId, data)   => axiosPrivate.delete(`${BASE}/chat/messages/${msgId}`, { data }),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const matrimonialDashboardService = {
  getDashboard: () => axiosPrivate.get(`${BASE}/dashboard`),
};

// ─── Shortlist ────────────────────────────────────────────────────────────────
export const matrimonialShortlistService = {
  addToShortlist:     (data)      => axiosPrivate.post(`${BASE}/shortlist`, data),
  removeFromShortlist:(profileId) => axiosPrivate.delete(`${BASE}/shortlist/${profileId}`),
  getShortlist:       (params)    => axiosPrivate.get(`${BASE}/shortlist`, { params }),
  updateNotes:        (profileId, notes) => axiosPrivate.put(`${BASE}/shortlist/${profileId}`, { notes }),
};

// ─── Visitors ────────────────────────────────────────────────────────────────
export const matrimonialVisitorService = {
  getMyVisitors: (params) => axiosPrivate.get(`${BASE}/visitors`, { params }),
};

// ─── Block / Report ───────────────────────────────────────────────────────────
export const matrimonialModerationService = {
  blockUser:       (data)   => axiosPrivate.post(`${BASE}/block`, data),
  unblockUser:     (userId) => axiosPrivate.delete(`${BASE}/block/${userId}`),
  getBlockedUsers: ()       => axiosPrivate.get(`${BASE}/blocked`),
  reportProfile:   (data)   => axiosPrivate.post(`${BASE}/report`, data),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationService = {
  getAll:       (params) => axiosPrivate.get(NOTIF, { params }),
  getUnread:    ()       => axiosPrivate.get(`${NOTIF}/unread`),
  markRead:     (id)     => axiosPrivate.put(`${NOTIF}/${id}/read`),
  markAllRead:  (data)   => axiosPrivate.put(`${NOTIF}/read-all`, data),
  deleteOne:    (id)     => axiosPrivate.delete(`${NOTIF}/${id}`),
  clearAll:     (data)   => axiosPrivate.delete(NOTIF, { data }),
};

// ─── Marriage Lifecycle ───────────────────────────────────────────────────────
export const matrimonialMarriageService = {
  sendRequest:    (data) => axiosPrivate.post(`${BASE}/marriage/request`, data),
  respond:        (id, data) => axiosPrivate.post(`${BASE}/marriage/respond/${id}`, data),
  getRequests:    () => axiosPrivate.get(`${BASE}/marriage/requests`),
  getStatus:      () => axiosPrivate.get(`${BASE}/marriage/status`),
};

// ─── Success Stories ──────────────────────────────────────────────────────────
export const successStoryService = {
  getPublishedStories: ()     => axiosPrivate.get(`${BASE}/success-stories`),
  getStoryDetails:     (id)   => axiosPrivate.get(`${BASE}/success-stories/${id}`),
  updateConsent:       (data) => axiosPrivate.put(`${BASE}/success-stories/request`, data),
};


