import React, { createContext, useState, useEffect } from 'react';
import { authService, clearAllUserData } from './authService';

export const AuthContext = createContext({});

// Lightweight flag written to localStorage on login/register and cleared on logout.
// Its presence means a refresh-token cookie *might* still be valid, making the
// silent-refresh attempt worthwhile. Without it we skip the network call entirely,
// eliminating the spurious POST /auth/refresh 401 on first-ever app visits.
const SESSION_FLAG_KEY = 'merisamaj_has_session';

const cleanUserForStorage = (userObj) => {
  if (!userObj || typeof userObj !== 'object') return userObj;
  const safeObj = { ...userObj };
  if (typeof safeObj.avatar === 'string' && safeObj.avatar.startsWith('data:')) {
    delete safeObj.avatar;
  }
  if (Array.isArray(safeObj.photos)) {
    safeObj.photos = safeObj.photos.filter(p => typeof p === 'string' && !p.startsWith('data:'));
  }
  return safeObj;
};

const safeSetUserItem = (user) => {
  try {
    const cleaned = cleanUserForStorage(user);
    localStorage.setItem('merisamaj_user', JSON.stringify(cleaned));
  } catch (err) {
    console.warn('LocalStorage quota warning for merisamaj_user:', err);
  }
};

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isInitialized: false,
  });

  // Restore auth state on initial load
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const savedUser  = localStorage.getItem('merisamaj_user');
      const savedToken = localStorage.getItem('merisamaj_token');
      const hasSession = localStorage.getItem(SESSION_FLAG_KEY);

      if (savedUser && savedToken) {
        // Fast path: credentials already in localStorage
        if (isMounted) {
          try {
            const parsedUser = JSON.parse(savedUser);
            setAuth({
              user: parsedUser,
              accessToken: savedToken,
              isAuthenticated: true,
              isInitialized: true,
            });
            // Fetch fresh user profile from DB to eliminate any stale/cached data
            authService.getMe()
              .then(res => {
                if (isMounted && res && res.user) {
                  safeSetUserItem(res.user);
                  setAuth(prev => ({ ...prev, user: res.user }));
                }
              })
              .catch(() => {});
          } catch {
            setAuth(prev => ({ ...prev, isInitialized: true }));
          }
        }
      } else if (hasSession) {
        // Session flag exists but localStorage was cleared (e.g. different tab logout).
        // Try to silently restore via the HTTP-only refresh-token cookie.
        try {
          const response = await authService.refresh();
          if (isMounted) {
            safeSetUserItem(response.user);
            try { localStorage.setItem('merisamaj_token', response.accessToken); } catch(e){}
            setAuth({
              user: response.user,
              accessToken: response.accessToken,
              isAuthenticated: true,
              isInitialized: true,
            });
          }
        } catch {
          // Refresh token expired or invalid — clear the stale flag and proceed as guest
          try { localStorage.removeItem(SESSION_FLAG_KEY); } catch(e){}
          if (isMounted) {
            setAuth(prev => ({ ...prev, isInitialized: true }));
          }
        }
      } else {
        // No prior session at all — skip the network call and mark as initialized
        if (isMounted) {
          setAuth(prev => ({ ...prev, isInitialized: true }));
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials) => {
    clearAllUserData(false);
    const response = await authService.login(credentials);
    safeSetUserItem(response.user);
    try {
      localStorage.setItem('merisamaj_token', response.accessToken);
      localStorage.setItem(SESSION_FLAG_KEY, '1');

      if (['head', 'sub_head', 'admin'].includes(response.user.role)) {
        localStorage.setItem('head_auth_user', JSON.stringify(response.user));
        localStorage.setItem('head_auth_token', response.accessToken);
        localStorage.setItem('head_has_session', '1');
      } else {
        // Normal user logging in — ensure any stale head session is cleared
        localStorage.removeItem('head_auth_user');
        localStorage.removeItem('head_auth_token');
        localStorage.removeItem('head_has_session');
      }
    } catch(e){}
    setAuth({
      user: response.user,
      accessToken: response.accessToken,
      isAuthenticated: true,
      isInitialized: true,
    });
    return response;
  };

  const register = async (userData) => {
    clearAllUserData(true);
    const response = await authService.register(userData);
    safeSetUserItem(response.user);
    try {
      localStorage.setItem('merisamaj_token', response.accessToken);
      localStorage.setItem('merisamaj_just_registered', 'true');
      localStorage.setItem(SESSION_FLAG_KEY, '1');
    } catch(e){}
    setAuth({
      user: response.user,
      accessToken: response.accessToken,
      isAuthenticated: true,
      isInitialized: true,
    });
    return response;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      clearAllUserData(false);
      setAuth({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isInitialized: true,
      });
      if (typeof window !== 'undefined') {
        window.location.href = '/member/login';
      }
    }
  };

  return (
    <AuthContext.Provider value={{ auth, user: auth.user, setAuth, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
