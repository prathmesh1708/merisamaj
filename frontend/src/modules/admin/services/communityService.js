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

// DELETE /admin/communities/:id/sub-communities/:subId → delete one
export const deleteSubCommunity = async (communityId, subId) => {
  const response = await axiosPrivate.delete(`${API_BASE}/${communityId}/sub-communities/${subId}`);
  return response.data;
};
