import { axiosPrivate } from './axiosPrivate';

export const headEventService = {
  getEvents: async (params) => {
    const response = await axiosPrivate.get('/head/events', { params });
    return response.data;
  },

  createEvent: async (eventData) => {
    const response = await axiosPrivate.post('/head/events', eventData);
    return response.data;
  },

  updateEvent: async (id, eventData) => {
    const response = await axiosPrivate.put(`/head/events/${id}`, eventData);
    return response.data;
  },

  deleteEvent: async (id) => {
    const response = await axiosPrivate.delete(`/head/events/${id}`);
    return response.data;
  },

  cancelEvent: async (id) => {
    const response = await axiosPrivate.patch(`/head/events/${id}/cancel`);
    return response.data;
  },

  getAnalytics: async () => {
    const response = await axiosPrivate.get('/head/events/analytics');
    return response.data;
  },

  getMemberResponses: async (eventId) => {
    const response = await axiosPrivate.get(`/head/events/${eventId}/responses`);
    return response.data;
  },

  addGalleryPhoto: async (eventId, photoData) => {
    const response = await axiosPrivate.post(`/head/events/${eventId}/gallery`, photoData);
    return response.data;
  },

  removeGalleryPhoto: async (eventId, photoId) => {
    const response = await axiosPrivate.delete(`/head/events/${eventId}/gallery/${photoId}`);
    return response.data;
  }
};

export default headEventService;
