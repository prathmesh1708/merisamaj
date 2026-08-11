import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '../../../core/api/axiosConfig';

export const HeadAuthContext = createContext({});

const STORAGE_KEYS = {
  USER: 'head_auth_user',
  TOKEN: 'head_auth_token',
  SESSION: 'head_has_session',
};

export const HeadAuthProvider = ({ children }) => {
  const [headAuth, setHeadAuth] = useState({
    headUser: null,
    isAuthenticated: false,
    isInitialized: false,
  });

  // Restore persisted session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
    const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);

    if (savedUser && savedToken) {
      try {
        setHeadAuth({
          headUser: JSON.parse(savedUser),
          isAuthenticated: true,
          isInitialized: true,
        });
      } catch {
        // Corrupted storage — clear and proceed as guest
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.SESSION);
        setHeadAuth({ headUser: null, isAuthenticated: false, isInitialized: true });
      }
    } else {
      setHeadAuth(prev => ({ ...prev, isInitialized: true }));
    }
  }, []);

  const headLogin = async (loginId, password) => {
    const normalizedIdentifier = loginId.trim();
    const API_URL = getApiUrl();

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        identifier: normalizedIdentifier,
        password: password
      });

      const { user, accessToken } = response.data;

      // Verify the user actually has the Head role to access this panel
      if (!['head', 'admin'].includes(user.role)) {
        throw new Error('Access denied. You do not have Head Panel permissions.');
      }

      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
      localStorage.setItem(STORAGE_KEYS.SESSION, '1');

      setHeadAuth({
        headUser: user,
        isAuthenticated: true,
        isInitialized: true,
      });

      return { success: true, user };

    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        throw new Error(err.response.data.message);
      }
      if (err.message && err.message.includes('Access denied')) {
        throw err;
      }
      throw new Error('Login failed. Please try again.');
    }
  };

  /**
   * Clear Head session — does NOT touch Member auth.
   */
  const headLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.SESSION);

    setHeadAuth({
      headUser: null,
      isAuthenticated: false,
      isInitialized: true,
    });
  };

  const updateHeadUser = (updatedUserFields) => {
    setHeadAuth(prev => {
      const merged = { ...(prev.headUser || {}), ...updatedUserFields };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(merged));
      return {
        ...prev,
        headUser: merged
      };
    });
  };

  return (
    <HeadAuthContext.Provider value={{ headAuth, headLogin, headLogout, updateHeadUser }}>
      {children}
    </HeadAuthContext.Provider>
  );
};
