import { axiosPrivate } from './axiosPrivate';

// Member reports about posts, comments, stories, chat messages and members
// (Child Safety Standards Policy). Admins review them in Admin → Social → Safety reports.
export const safetyReportService = {
  report: async ({ targetType, targetId, reason, details = '' }) => {
    const res = await axiosPrivate.post('/member/safety-reports', { targetType, targetId, reason, details });
    return res.data;
  },
  // Admin
  list: async (status = 'pending') => {
    const res = await axiosPrivate.get('/admin/social/safety-reports', { params: { status } });
    return res.data;
  },
  resolve: async (id, action, note = '') => {
    const res = await axiosPrivate.put(`/admin/social/safety-reports/${id}`, { action, note });
    return res.data;
  }
};

export default safetyReportService;
