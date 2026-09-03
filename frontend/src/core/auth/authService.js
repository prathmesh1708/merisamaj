import { axiosPublic } from '../api/axiosConfig';
import { axiosPrivate } from '../api/axiosPrivate';

export const authService = {
  getMe: async () => {
    const response = await axiosPrivate.get('/auth/me', {
      withCredentials: true
    });
    return response.data;
  },

  login: async (credentials) => {
    const response = await axiosPublic.post('/auth/login', credentials, {
      withCredentials: true
    });
    return response.data;
  },

  register: async (userData) => {
    const response = await axiosPublic.post('/auth/register', userData, {
      withCredentials: true
    });
    return response.data;
  },

  sendOtp: async (data) => {
    // data: { phone, type }
    const response = await axiosPublic.post('/auth/send-otp', data);
    return response.data;
  },

  verifyOtp: async (data) => {
    // data: { phone, otp, type }
    const response = await axiosPublic.post('/auth/verify-otp', data);
    return response.data;
  },

  resetPassword: async (resetData) => {
    // resetData: { phone, otp, newPassword }
    const response = await axiosPublic.post('/auth/reset-password', resetData);
    return response.data;
  },

  refresh: async () => {
    const token = localStorage.getItem('merisamaj_token');
    const response = await axiosPublic.post('/auth/refresh', {}, {
      withCredentials: true,
      headers: token ? { 'x-refresh-token': token } : {}
    });
    return response.data;
  },

  refreshAdmin: async () => {
    const token = localStorage.getItem('admin_auth_token');
    const response = await axiosPublic.post('/auth/refresh/admin', {}, {
      withCredentials: true,
      headers: token ? { 'x-refresh-token': token } : {}
    });
    return response.data;
  },

  refreshHead: async () => {
    const token = localStorage.getItem('head_auth_token');
    const response = await axiosPublic.post('/auth/refresh/head', {}, {
      withCredentials: true,
      headers: token ? { 'x-refresh-token': token } : {}
    });
    return response.data;
  },

  updateProfile: async (profileData) => {
    // Determine if data is FormData (for file uploads) or normal object
    const isFormData = profileData instanceof FormData;
    const response = await axiosPrivate.put('/auth/update-profile', profileData, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
      withCredentials: true
    });
    return response.data;
  },

  logout: async () => {
    const response = await axiosPublic.post('/auth/logout', {}, {
      withCredentials: true
    });
    return response.data;
  },

  logoutAdmin: async () => {
    const response = await axiosPublic.post('/auth/logout/admin', {}, {
      withCredentials: true
    });
    return response.data;
  },

  logoutHead: async () => {
    const response = await axiosPublic.post('/auth/logout/head', {}, {
      withCredentials: true
    });
    return response.data;
  }
};

/**
 * Clear all persisted client-side user state & caches to prevent stale data when switching accounts
 */
export const clearAllUserData = (preserveRegistrationKeys = false) => {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('merisamaj_') || 
        key.startsWith('messagesHub_') || 
        key.startsWith('community_') ||
        key.startsWith('matrimonial_') ||
        key.startsWith('theme')
      )) {
        if (preserveRegistrationKeys && (
          key === 'merisamaj_just_registered' || 
          key === 'merisamaj_register_phone' || 
          key === 'merisamaj_register_email'
        )) {
          continue;
        }
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  } catch (err) {
    console.warn('Error clearing user storage data:', err);
  }
};

export default authService;

