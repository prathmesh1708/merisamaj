import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '../../../core/api/axiosConfig';

export const AdminAuthContext = createContext({});

const STORAGE_KEYS = {
  USER: 'admin_auth_user',
  TOKEN: 'admin_auth_token',
  SESSION: 'admin_has_session',
};

export const AdminAuthProvider = ({ children }) => {
  const [adminAuth, setAdminAuth] = useState({
    adminUser: null,
    isAuthenticated: false,
    isInitialized: false,
  });

  // Restore persisted session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
    const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);

    if (savedUser && savedToken) {
      try {
        setAdminAuth({
          adminUser: JSON.parse(savedUser),
          isAuthenticated: true,
          isInitialized: true,
        });
      } catch {
        // Clear corrupt state
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.SESSION);
        setAdminAuth({ adminUser: null, isAuthenticated: false, isInitialized: true });
      }
    } else {
      setAdminAuth(prev => ({ ...prev, isInitialized: true }));
    }
  }, []);

  const adminLogin = async (identifier, password) => {
    const API_URL = getApiUrl();

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        identifier: identifier.trim(),
        password: password
      }, { withCredentials: true });

      const { user, accessToken } = response.data;

      // Verify the user actually has the Admin role
      if (user.role !== 'admin') {
        throw new Error('Access denied. You do not have Admin permissions.');
      }

      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
      localStorage.setItem(STORAGE_KEYS.SESSION, '1');

      setAdminAuth({
        adminUser: user,
        isAuthenticated: true,
        isInitialized: true,
      });

      return { success: true, user };

    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        throw new Error(err.response.data.message);
      }
      throw err;
    }
  };

  const adminLogout = async () => {
    const API_URL = getApiUrl();
    try {
      await axios.post(`${API_URL}/auth/logout/admin`, {}, { withCredentials: true });
    } catch (err) {
      console.error('Admin logout endpoint error', err);
    } finally {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.SESSION);

      setAdminAuth({
        adminUser: null,
        isAuthenticated: false,
        isInitialized: true,
      });
    }
  };

  return (
    <AdminAuthContext.Provider value={{ adminAuth, setAdminAuth, adminLogin, adminLogout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};
