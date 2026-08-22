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
    let savedUser = localStorage.getItem(STORAGE_KEYS.USER);
    let savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);

    // Fallback to member auth session ONLY if logged in member is a Community Head, Local Head, or Admin
    if (!savedUser || !savedToken) {
      const memberUserStr = localStorage.getItem('merisamaj_user');
      const memberTokenStr = localStorage.getItem('merisamaj_token');
      if (memberUserStr && memberTokenStr) {
        try {
          const parsed = JSON.parse(memberUserStr);
          if (['head', 'sub_head', 'admin'].includes(parsed.role)) {
            savedUser = memberUserStr;
            savedToken = memberTokenStr;
            localStorage.setItem(STORAGE_KEYS.USER, memberUserStr);
            localStorage.setItem(STORAGE_KEYS.TOKEN, memberTokenStr);
            localStorage.setItem(STORAGE_KEYS.SESSION, '1');
          }
        } catch (e) {}
      }
    }

    if (savedUser && savedToken) {
      try {
        const parsed = JSON.parse(savedUser);
        if (['head', 'sub_head', 'admin'].includes(parsed.role)) {
          setHeadAuth({
            headUser: parsed,
            isAuthenticated: true,
            isInitialized: true,
          });
        } else {
          // If stored user is not a head role, do NOT grant head auth
          localStorage.removeItem(STORAGE_KEYS.USER);
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
          localStorage.removeItem(STORAGE_KEYS.SESSION);
          setHeadAuth({ headUser: null, isAuthenticated: false, isInitialized: true });
        }
      } catch {
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

      // Verify the user actually has Head Panel access (Community Head, Admin,
      // or a Sub-Head/Local Head account created by a Head)
      if (!['head', 'admin', 'sub_head'].includes(user.role)) {
        throw new Error('Access denied. You do not have Head Panel permissions.');
      }

      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
      localStorage.setItem(STORAGE_KEYS.SESSION, '1');

      // Also set member session so user can switch seamlessly to member app
      try {
        localStorage.setItem('merisamaj_user', JSON.stringify(user));
        localStorage.setItem('merisamaj_token', accessToken);
        localStorage.setItem('merisamaj_has_session', '1');
      } catch (e) {}

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
