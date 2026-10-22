import { axiosPrivate } from '../api/axiosPrivate';

// Hierarchical module access (Master Admin → Community Head → Local Head → Sub-Head).
// The server enforces every rule; these calls only read and request changes.
export const modulePermissionApi = {
  getMyAccess: () => axiosPrivate.get('/permissions/me'),
  getSubordinates: (search = '') => axiosPrivate.get('/permissions/subordinates', { params: search ? { search } : {} }),
  assignModules: (userId, modules) => axiosPrivate.put(`/permissions/users/${userId}`, { modules }),
  inheritAll: (userId) => axiosPrivate.put(`/permissions/users/${userId}`, { inheritAll: true }),
  getAuditLog: (params = {}) => axiosPrivate.get('/permissions/audit', { params })
};

export default modulePermissionApi;
