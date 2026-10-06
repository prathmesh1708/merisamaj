import { axiosPrivate } from './axiosPrivate';

const BASE_URL = '/head/dharmashala';

const headDharmashalaService = {
  getDashboardStats: async () => {
    const response = await axiosPrivate.get(`${BASE_URL}/dashboard-stats`);
    return response.data;
  },

  getProperties: async () => {
    const response = await axiosPrivate.get(`${BASE_URL}/properties`);
    return response.data;
  },

  createProperty: async (formData) => {
    const response = await axiosPrivate.post(`${BASE_URL}/properties`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  updateProperty: async (id, formData) => {
    const response = await axiosPrivate.put(`${BASE_URL}/properties/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  deleteProperty: async (id) => {
    const response = await axiosPrivate.delete(`${BASE_URL}/properties/${id}`);
    return response.data;
  },

  getRooms: async (propertyId) => {
    const response = await axiosPrivate.get(`${BASE_URL}/properties/${propertyId}/rooms`);
    return response.data;
  },

  createRoom: async (formData) => {
    const response = await axiosPrivate.post(`${BASE_URL}/rooms`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  updateRoom: async (roomId, formData) => {
    const response = await axiosPrivate.put(`${BASE_URL}/rooms/${roomId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  deleteRoom: async (roomId) => {
    const response = await axiosPrivate.delete(`${BASE_URL}/rooms/${roomId}`);
    return response.data;
  },

  getBookings: async (params = {}) => {
    const response = await axiosPrivate.get(`${BASE_URL}/bookings`, { params });
    return response.data;
  },

  updateBookingStatus: async (id, data) => {
    const response = await axiosPrivate.patch(`${BASE_URL}/bookings/${id}/status`, data);
    return response.data;
  },

  createManualBooking: async (data) => {
    const response = await axiosPrivate.post(`${BASE_URL}/bookings/manual`, data);
    return response.data;
  },

  recordBookingPayment: async (bookingId, data) => {
    const response = await axiosPrivate.post(`${BASE_URL}/bookings/${bookingId}/payment`, data);
    return response.data;
  },

  logMaintenance: async (data) => {
    const response = await axiosPrivate.post(`${BASE_URL}/maintenance`, data);
    return response.data;
  },

  getMaintenanceLogs: async (propertyId) => {
    const response = await axiosPrivate.get(`${BASE_URL}/maintenance`, {
      params: { dharmashalaId: propertyId }
    });
    return response.data;
  }
};

export default headDharmashalaService;
