/**
 * Head Matrimonial Service — wired to real backend API.
 * Base URL: /api/v1/head/matrimonial
 */
import { axiosPrivate } from '../../../../core/api/axiosPrivate';

const BASE = '/head/matrimonial';

export const headMatrimonialService = {
  // Community profiles
  getCommunityProfiles: (params) => axiosPrivate.get(`${BASE}/profiles`, { params }),
  getCommunityStats:    ()       => axiosPrivate.get(`${BASE}/stats`),
  verifyProfile:        (id, body) => axiosPrivate.put(`${BASE}/profiles/${id}/verify`, body),
  updateProfileStatus:  (id, body) => axiosPrivate.put(`${BASE}/profiles/${id}/status`, body),

  // Reports from community
  getCommunityReports:  (params) => axiosPrivate.get(`${BASE}/reports`, { params }),
  resolveReport:        (id, body) => axiosPrivate.put(`${BASE}/reports/${id}`, body),

  // Marriages & Requests
  getMarriedMembers:    (params) => axiosPrivate.get(`${BASE}/profiles/married`, { params }),
  getCommunityMarriageRequests: (params) => axiosPrivate.get(`${BASE}/marriage-requests`, { params }),
};
