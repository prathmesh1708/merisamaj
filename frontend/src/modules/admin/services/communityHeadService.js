import { axiosPrivate } from '../../../core/api/axiosPrivate';
import { getApiUrl } from '../../../core/api/axiosConfig';

const API_BASE = `${getApiUrl()}/admin/community-heads`;

export const communityHeadService = {
  getHeads: async () => {
    try {
      const response = await axiosPrivate.get(API_BASE);
      // Map _id to id for frontend
      return response.data.data.map(head => ({
        ...head,
        id: head._id,
        status: head.accountStatus === 'active' ? 'Active' : (head.accountStatus === 'inactive' ? 'Suspended' : head.accountStatus),
        // Map assignedCommunityIds into a simpler format for display
        community: head.assignedCommunityIds && head.assignedCommunityIds.length > 0 
          ? head.assignedCommunityIds.map(c => c.name).join(', ') 
          : 'None'
      }));
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch community heads');
    }
  },
  
  getHeadById: async (id) => {
    try {
      const response = await axiosPrivate.get(`${API_BASE}/${id}`);
      const head = response.data.data;
      return {
        ...head,
        id: head._id,
        status: head.accountStatus === 'active' ? 'Active' : (head.accountStatus === 'inactive' ? 'Suspended' : head.accountStatus),
        community: head.assignedCommunityIds && head.assignedCommunityIds.length > 0 
          ? head.assignedCommunityIds.map(c => c.name).join(', ') 
          : 'None'
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch community head details');
    }
  },

  updateHead: async (id, data) => {
    try {
      const response = await axiosPrivate.put(`${API_BASE}/${id}`, data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update community head');
    }
  },

  createHead: async (data) => {
    try {
      const response = await axiosPrivate.post(API_BASE, data);
      const head = response.data.data;
      return {
        ...head,
        id: head._id,
        status: head.accountStatus === 'active' ? 'Active' : (head.accountStatus === 'inactive' ? 'Suspended' : head.accountStatus),
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create community head');
    }
  },

  getHeadSubLeaders: async (headId) => {
    try {
      const response = await axiosPrivate.get(`${API_BASE}/${headId}/sub-leaders`);
      return response.data.data;
    } catch (error) {
      console.error('getHeadSubLeaders error:', error);
      return [];
    }
  },

  updateHead: async (id, data) => {
    try {
      const response = await axiosPrivate.put(`${API_BASE}/${id}`, data);
      const head = response.data.data;
      return {
        ...head,
        id: head._id,
        status: head.accountStatus === 'active' ? 'Active' : (head.accountStatus === 'inactive' ? 'Suspended' : head.accountStatus),
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update community head');
    }
  },

  updateStatus: async (id, status) => {
    try {
      const response = await axiosPrivate.patch(`${API_BASE}/${id}/status`, { status: status === 'Active' ? 'active' : 'inactive' });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update community head status');
    }
  },

  deleteHead: async (id) => {
    try {
      const response = await axiosPrivate.delete(`${API_BASE}/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete community head');
    }
  },

  getAuditLogs: async (page = 1, limit = 20) => {
    try {
      const response = await axiosPrivate.get(`${API_BASE}/activities?page=${page}&limit=${limit}`);
      return response.data.data.map(log => ({
        ...log,
        id: log._id,
        target: log.communityId?.name || 'Unknown',
        performedBy: log.headId?.name || 'Unknown',
        details: log.description
      }));
    } catch (error) {
      console.warn('Failed to fetch audit logs', error);
      return []; // Return empty array to not break the UI if no logs exist yet
    }
  },

  getStats: async () => {
    try {
      const response = await axiosPrivate.get(`${API_BASE}/stats`);
      const { totalHeads, activeHeads, inactiveHeads, unassignedHeads, totalManagedCommunities } = response.data.data;
      return {
        totalHeads,
        activeHeads,
        suspendedHeads: inactiveHeads,
        pendingInvitations: unassignedHeads,
        communitiesAssigned: totalManagedCommunities,
        communitiesWithoutHead: 0,
        averagePerformance: 0
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch head stats');
    }
  }
};
