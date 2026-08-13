import { axiosPrivate } from './axiosPrivate';

const API_URL = '/member/invitations';

// Create new invitation
const createInvitation = async (invitationData) => {
  // Uses FormData since there are files
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  };
  const response = await axiosPrivate.post(API_URL, invitationData, config);
  return response.data;
};

// Get all invitations
const getInvitations = async () => {
  const response = await axiosPrivate.get(API_URL);
  return response.data;
};

// Get single invitation
const getInvitationById = async (id) => {
  const response = await axiosPrivate.get(`${API_URL}/${id}`);
  return response.data;
};

// Update RSVP
const updateRSVP = async (id, status) => {
  const response = await axiosPrivate.put(`${API_URL}/${id}/rsvp`, { status });
  return response.data;
};

// Record that the logged-in member opened this invitation
const trackOpened = async (id) => {
  const response = await axiosPrivate.post(`${API_URL}/${id}/open`);
  return response.data;
};

// Delete invitation
const deleteInvitation = async (id) => {
  const response = await axiosPrivate.delete(`${API_URL}/${id}`);
  return response.data;
};

// Update invitation
const updateInvitation = async (id, invitationData) => {
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  };
  const response = await axiosPrivate.put(`${API_URL}/${id}`, invitationData, config);
  return response.data;
};

const invitationService = {
  createInvitation,
  getInvitations,
  getInvitationById,
  updateRSVP,
  trackOpened,
  deleteInvitation,
  updateInvitation
};

export default invitationService;
