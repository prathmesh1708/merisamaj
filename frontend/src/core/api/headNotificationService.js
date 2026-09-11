import { axiosPrivate } from './axiosPrivate';

const BASE = '/head/notifications';

export const headNotificationService = {
  // Broadcasts
  sendBroadcast: (data) => axiosPrivate.post(`${BASE}/broadcast`, data),
  getBroadcastHistory: (params) => axiosPrivate.get(`${BASE}/broadcasts`, { params }),
  getScheduledAlerts: () => axiosPrivate.get(`${BASE}/scheduled`),
  cancelScheduledAlert: (id) => axiosPrivate.delete(`${BASE}/scheduled/${id}`),

  // Templates
  getTemplates: () => axiosPrivate.get(`${BASE}/templates`),
  createTemplate: (data) => axiosPrivate.post(`${BASE}/templates`, data),
  updateTemplate: (id, data) => axiosPrivate.put(`${BASE}/templates/${id}`, data),
  deleteTemplate: (id) => axiosPrivate.delete(`${BASE}/templates/${id}`)
};

export default headNotificationService;
