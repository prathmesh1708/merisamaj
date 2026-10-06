import { axiosPrivate } from './axiosPrivate';

const BASE_URL = '/admin/dharmashala';

const adminDharmashalaService = {
  getProperties: async (params = {}) => {
    const response = await axiosPrivate.get(`${BASE_URL}/properties`, { params });
    return response.data;
  },

  getAnalytics: async () => {
    const response = await axiosPrivate.get(`${BASE_URL}/analytics`);
    return response.data;
  },

  getBookings: async (params = {}) => {
    const response = await axiosPrivate.get(`${BASE_URL}/bookings`, { params });
    return response.data;
  },

  overrideBookingStatus: async (bookingId, data) => {
    const response = await axiosPrivate.patch(`${BASE_URL}/bookings/${bookingId}/override`, data);
    return response.data;
  },

  togglePropertyStatus: async (propertyId) => {
    const response = await axiosPrivate.patch(`${BASE_URL}/properties/${propertyId}/toggle-status`);
    return response.data;
  },

  createManualBooking: async (data) => {
    const response = await axiosPrivate.post(`${BASE_URL}/bookings/manual`, data);
    return response.data;
  },

  recordBookingPayment: async (bookingId, data) => {
    const response = await axiosPrivate.post(`${BASE_URL}/bookings/${bookingId}/payment`, data);
    return response.data;
  }
};

export default adminDharmashalaService;
