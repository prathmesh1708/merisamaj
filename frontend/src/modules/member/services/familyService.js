import { axiosPrivate } from '../../../core/api/axiosPrivate';

// Family Tree (Family ID + per-person Member IDs). Every mutation returns the
// refreshed family view: { family, self, members, invitations? }
export const familyService = {
  getMyFamily: async () => {
    const response = await axiosPrivate.get('/member/family');
    return response.data.data;
  },

  addMember: async (member) => {
    const response = await axiosPrivate.post('/member/family/members', member);
    return response.data;
  },

  updateMember: async (id, member) => {
    const response = await axiosPrivate.put(`/member/family/members/${id}`, member);
    return response.data;
  },

  removeMember: async (id) => {
    const response = await axiosPrivate.delete(`/member/family/members/${id}`);
    return response.data;
  },

  getInvitations: async () => {
    const response = await axiosPrivate.get('/member/family/invitations');
    return response.data.data;
  },

  respondToInvitation: async (id, accept) => {
    const response = await axiosPrivate.post(`/member/family/invitations/${id}/${accept ? 'accept' : 'reject'}`);
    return response.data;
  }
};
