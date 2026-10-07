/**
 * Admin Matrimonial Service — wired to real backend API.
 * Base URL: /api/v1/admin/matrimonial
 */
import { axiosPrivate } from '../../../../../core/api/axiosPrivate';

const BASE = '/admin/matrimonial';

export const matrimonialService = {
  // Dashboard
  getDashboardStats:  ()           => axiosPrivate.get(`${BASE}/stats`).then(r => r.data.data),
  getAnalytics:       (params)     => axiosPrivate.get(`${BASE}/analytics`, { params }).then(r => r.data.data),

  // Profiles
  getProfiles:        (params)     => axiosPrivate.get(`${BASE}/profiles`, { params }).then(r => r.data.data),
  verifyProfile:      (id, body)   => axiosPrivate.put(`${BASE}/profiles/${id}/verify`, body).then(r => r.data),
  closeProfile:       (id)         => axiosPrivate.put(`${BASE}/profiles/${id}/close`).then(r => r.data),
  reopenProfile:      (id)         => axiosPrivate.put(`${BASE}/profiles/${id}/reopen`).then(r => r.data),

  // Photo Moderation
  getPendingPhotos:   ()           => axiosPrivate.get(`${BASE}/photos/pending`).then(r => r.data.data),
  moderatePhoto:      (profileId, photoId, action) =>
    axiosPrivate.put(`${BASE}/photos/${profileId}/${photoId}`, { action }).then(r => r.data),

  // Reports
  getReports:         (params)     => axiosPrivate.get(`${BASE}/reports`, { params }).then(r => r.data.data),
  actionReport:       (id, body)   => axiosPrivate.put(`${BASE}/reports/${id}`, body).then(r => r.data),

  // Subscription Plans
  getPlans:           ()           => axiosPrivate.get(`${BASE}/plans`).then(r => r.data.data),
  getSubscriptions:   (params)     => axiosPrivate.get(`${BASE}/subscriptions`, { params }).then(r => r.data.data),
  createPlan:         (body)       => axiosPrivate.post(`${BASE}/plans`, body).then(r => r.data),
  updatePlan:         (id, body)   => axiosPrivate.put(`${BASE}/plans/${id}`, body).then(r => r.data),
  deletePlan:         (id)         => axiosPrivate.delete(`${BASE}/plans/${id}`).then(r => r.data),
  grantSubscription:  (body)       => axiosPrivate.post(`${BASE}/plans/grant`, body).then(r => r.data),

  // Settings
  getSettings:        ()           => axiosPrivate.get(`${BASE}/settings`).then(r => r.data.data),
  updateSettings:     (body)       => axiosPrivate.put(`${BASE}/settings`, body).then(r => r.data),

  // Audit logs stub (from profiles endpoint)
  getAuditLogs:       ()           => Promise.resolve([]),
};
