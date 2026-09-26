import axios from 'axios';
import { getApiUrl } from './axiosConfig';

const BASE_URL = getApiUrl();

export const axiosPrivate = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Important for refresh tokens stored in HTTP-only cookies
});

// ─── Default token interceptor ────────────────────────────────────────────────
// Automatically attach the stored token from localStorage on every request.
// This ensures service files that import axiosPrivate directly (outside of React
// components, so they can't use the useAxiosPrivate hook) always send the correct
// Authorization header — especially important on page refresh before the React
// auth context fully re-initializes.
axiosPrivate.interceptors.request.use(
  (config) => {
    // If sending FormData, delete 'Content-Type' so the browser/Axios automatically sets multipart/form-data with proper boundary
    if (config.data instanceof FormData) {
      if (config.headers) {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
        if (typeof config.headers.delete === 'function') {
          config.headers.delete('Content-Type');
          config.headers.delete('content-type');
        }
      }
    }

    // Safely check for Authorization header
    const hasAuth = config.headers.has ? config.headers.has('Authorization') : !!config.headers['Authorization'];
    
    if (!hasAuth) {
      const isHeadPanel = typeof window !== 'undefined' && window.location.pathname.startsWith('/head');
      const isAdminPanel = typeof window !== 'undefined' && (window.location.pathname.startsWith('/admin') || (config.url && config.url.includes('/admin')));
      
      const adminToken = localStorage.getItem('admin_auth_token') || localStorage.getItem('merisamaj_admin_token');
      const headToken = localStorage.getItem('head_auth_token');
      const memberToken = localStorage.getItem('merisamaj_token');

      let token;
      if (isAdminPanel) {
        token = adminToken || headToken || memberToken;
      } else if (isHeadPanel) {
        token = headToken || adminToken || memberToken;
      } else {
        token = memberToken || adminToken || headToken;
      }

      if (token) {
        if (config.headers.set) {
          config.headers.set('Authorization', `Bearer ${token}`);
        } else {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

