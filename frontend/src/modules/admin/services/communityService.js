/**
 * communityService.js
 * Admin Panel — Community Management API Service
 *
 * All API calls go through the authenticated Axios instance.
 * These endpoints are restricted to Master Admin only.
 */

import { axiosPrivate } from '../../../core/api/axiosPrivate';

const API_BASE = '/admin/communities';

// ─────────────────────────────────────────────
// GET /admin/communities → All communities with member counts
// ─────────────────────────────────────────────
export const getAllCommunities = async () => {
  const response = await axiosPrivate.get(API_BASE);
  return response.data;
};

// ─────────────────────────────────────────────
// GET /admin/communities/:id → Single community
// ─────────────────────────────────────────────
export const getCommunityById = async (id) => {
  const response = await axiosPrivate.get(`${API_BASE}/${id}`);
  return response.data;
};

// ─────────────────────────────────────────────
// POST /admin/communities → Create community
// ─────────────────────────────────────────────
export const createCommunity = async (data) => {
  const response = await axiosPrivate.post(API_BASE, data);
  return response.data;
};

// ─────────────────────────────────────────────
// PUT /admin/communities/:id → Update community info / settings
// ─────────────────────────────────────────────
export const updateCommunity = async (id, data) => {
  const response = await axiosPrivate.put(`${API_BASE}/${id}`, data);
  return response.data;
};

// ─────────────────────────────────────────────
// PATCH /admin/communities/:id/toggle-status → Toggle active/inactive
// ─────────────────────────────────────────────
export const toggleCommunityStatus = async (id) => {
  const response = await axiosPrivate.patch(`${API_BASE}/${id}/toggle-status`);
  return response.data;
};

// ─────────────────────────────────────────────
// DELETE /admin/communities/:id → Permanently delete community
// ─────────────────────────────────────────────
export const deleteCommunity = async (id) => {
  const response = await axiosPrivate.delete(`${API_BASE}/${id}`);
  return response.data;
};

// ─────────────────────────────────────────────
// PUT /admin/communities/:id/assign-head → Assign head (atomic)
// ─────────────────────────────────────────────
export const assignHeadToCommunity = async (communityId, userId) => {
  const response = await axiosPrivate.put(
    `${API_BASE}/${communityId}/assign-head`,
    { userId }
  );
  return response.data;
};

// ─────────────────────────────────────────────
// DELETE /admin/communities/:id/assign-head → Remove head
// ─────────────────────────────────────────────
export const removeHeadFromCommunity = async (communityId) => {
  const response = await axiosPrivate.delete(
    `${API_BASE}/${communityId}/assign-head`
  );
  return response.data;
};

// ─────────────────────────────────────────────
// PUT /admin/communities/:id → Update module settings only
// ─────────────────────────────────────────────
export const updateCommunitySettings = async (communityId, settings) => {
  const response = await axiosPrivate.put(
    `${API_BASE}/${communityId}`,
    { settings }
  );
  return response.data;
};

// ─────────────────────────────────────────────
// Sub-Communities (drill-down under a Community)
// ─────────────────────────────────────────────

// GET /admin/communities/:id/sub-communities → list with real member/location stats
export const getSubCommunityStats = async (communityId) => {
  const response = await axiosPrivate.get(`${API_BASE}/${communityId}/sub-communities`);
  return response.data;
};

// POST /admin/communities/:id/sub-communities → add one
export const addSubCommunity = async (communityId, name) => {
  const response = await axiosPrivate.post(`${API_BASE}/${communityId}/sub-communities`, { name });
  return response.data;
};

// PATCH /admin/communities/:id/sub-communities/:subId → rename one
export const renameSubCommunity = async (communityId, subId, name) => {
  const response = await axiosPrivate.patch(`${API_BASE}/${communityId}/sub-communities/${subId}`, { name });
  return response.data;
};

// PATCH /admin/communities/:id/sub-communities/:subId/toggle → activate/deactivate one
export const toggleSubCommunityStatus = async (communityId, subId) => {
  const response = await axiosPrivate.patch(`${API_BASE}/${communityId}/sub-communities/${subId}/toggle`);
  return response.data;
};

export const updateSubCommunityModules = async (communityId, subId, settings) => {
  const response = await axiosPrivate.patch(`${API_BASE}/${communityId}/sub-communities/${subId}/modules`, { settings });
  return response.data;
};

// DELETE /admin/communities/:id/sub-communities/:subId → delete one
export const deleteSubCommunity = async (communityId, subId) => {
  const response = await axiosPrivate.delete(`${API_BASE}/${communityId}/sub-communities/${subId}`);
  return response.data;
};

// Communities members asked for under "Other" at registration (they don't exist yet)
export const getCommunityRequests = async (status = 'pending') => {
  const response = await axiosPrivate.get(`${API_BASE}/requests`, { params: { status } });
  return response.data;
};
// action: 'create' (optional name) | 'merge' (communityId) | 'dismiss' (optional note)
export const resolveCommunityRequest = async (requestId, body) => {
  const response = await axiosPrivate.put(`${API_BASE}/requests/${requestId}`, body);
  return response.data;
};

// GET /admin/communities/:id/deletion-impact → how many people a delete affects (changes nothing)
export const getDeletionImpact = async (communityId, subCommunity = '') => {
  const response = await axiosPrivate.get(`${API_BASE}/${communityId}/deletion-impact`, { params: subCommunity ? { subCommunity } : {} });
  return response.data?.data || {};
};

// Confirmation before a permanent delete, with the real numbers. A whole community
// also needs its name typed, so it can't be deleted by a stray click.
export const confirmCommunityDeletion = async (communityId, name) => {
  let n = {};
  try { n = await getDeletionImpact(communityId); } catch { /* still ask, without numbers */ }
  const lines = [
    `PERMANENTLY DELETE "${name}"?`,
    '',
    `• ${n.members ?? 'All'} member(s) will be logged out and removed from this community. When they log in again they choose a new community (and need approval again).`,
    `• ${n.staff ?? 'Its'} head / sub-head account(s) lose this community (deactivated if it was their only one).`,
    `• Deleted: posts${n.posts !== undefined ? ` (${n.posts})` : ''}, stories, events, groups, family trees, invitations, obituaries, votes, leadership and home-screen content.`,
    `• Hidden: matrimonial profiles${n.matrimonialProfiles !== undefined ? ` (${n.matrimonialProfiles})` : ''}.`,
    '• Kept (required by law): donations, funds, payments, bookings and audit records.',
    '',
    'This cannot be undone.'
  ];
  if (!window.confirm(lines.join('\n'))) return false;
  const typed = window.prompt(`Type the community name to confirm:\n${name}`);
  if ((typed || '').trim() !== String(name).trim()) {
    if (typed !== null) window.alert('The name did not match. Nothing was deleted.');
    return false;
  }
  return true;
};

export const confirmSubCommunityDeletion = async (communityId, subName) => {
  let n = {};
  try { n = await getDeletionImpact(communityId, subName); } catch { /* still ask */ }
  return window.confirm([
    `Delete the sub-community "${subName}"?`,
    '',
    `• ${n.members ?? 'Its'} member(s) will be logged out. They stay in the community and must choose a sub-community again when they log in.`,
    `• ${n.staff ?? 'Its'} head / sub-head account(s) assigned to it will be deactivated.`,
    `• Its own home-screen content (and its location copies) is deleted.`,
    '',
    'This cannot be undone.'
  ].join('\n'));
};

// GET /admin/communities/:id/sub-communities/:subName/locations → real location breakdown with Local Heads
export const getSubCommunityLocationBreakdown = async (communityId, subName) => {
  const encoded = encodeURIComponent(subName);
  const response = await axiosPrivate.get(`${API_BASE}/${communityId}/sub-communities/${encoded}/locations`);
  return response.data;
};

// POST /admin/communities/:id/sub-communities/:subName/assign-head → assign or create local head/sub-head
export const assignLocalHeadToLocationGroup = async (communityId, subName, data) => {
  const encoded = encodeURIComponent(subName);
  const response = await axiosPrivate.post(`${API_BASE}/${communityId}/sub-communities/${encoded}/assign-head`, data);
  return response.data;
};

// ── Mantri Mandal ────────────────────────────────────────────────────────────
export const searchMantriMandalCandidates = async (communityId, q) => {
  const response = await axiosPrivate.get(`${API_BASE}/${communityId}/mantri-mandal/search`, { params: { q } });
  return response.data;
};

export const addMantriMandalMember = async (headId, userId, designation) => {
  const response = await axiosPrivate.post(`${API_BASE}/heads/${headId}/mantri-mandal`, { userId, designation });
  return response.data;
};

export const removeMantriMandalMember = async (headId, userId) => {
  const response = await axiosPrivate.delete(`${API_BASE}/heads/${headId}/mantri-mandal/${userId}`);
  return response.data;
};

