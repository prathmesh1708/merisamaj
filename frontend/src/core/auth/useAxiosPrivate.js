import { axiosPrivate } from '../api/axiosPrivate';
import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useHeadAuth } from '../../modules/head/auth/useHeadAuth';
import { useAdminAuth } from '../../modules/admin/auth/useAdminAuth';
import { authService } from './authService';

export const useAxiosPrivate = () => {
  const { auth, setAuth } = useAuth();
  const { headAuth, setHeadAuth } = useHeadAuth();
  const { adminAuth, setAdminAuth } = useAdminAuth();

  useEffect(() => {
    const requestIntercept = axiosPrivate.interceptors.request.use(
      config => {
        if (!config.headers['Authorization']) {
          const url = config.url || '';
          const isHeadApi = url.includes('/head/') || url.includes('/head');
          const isAdminApi = url.includes('/admin/') || url.includes('/admin');
          const isMemberApi = url.includes('/member/') || url.includes('/auth/');

          let token = null;
          if (isHeadApi) {
            token = localStorage.getItem('head_auth_token');
          } else if (isAdminApi) {
            token = localStorage.getItem('admin_auth_token');
          } else if (isMemberApi) {
            token = localStorage.getItem('merisamaj_token');
          } else {
            // Fallback for non-prefixed generic URLs
            if (window.location.pathname.startsWith('/head')) {
              token = localStorage.getItem('head_auth_token');
            } else if (window.location.pathname.startsWith('/admin')) {
              token = localStorage.getItem('admin_auth_token');
            } else {
              token = localStorage.getItem('merisamaj_token');
            }
          }

          if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
          }
        }
        return config;
      },
      error => Promise.reject(error)
    );

    const responseIntercept = axiosPrivate.interceptors.response.use(
      response => response,
      async (error) => {
        const prevRequest = error?.config;
        const requestUrl = prevRequest?.url || '';
        const isHeadTarget = requestUrl.includes('/head/') || (!requestUrl.includes('/member/') && !requestUrl.includes('/admin/') && window.location.pathname.startsWith('/head'));
        const isAdminTarget = requestUrl.includes('/admin/') || (!requestUrl.includes('/member/') && !requestUrl.includes('/head/') && window.location.pathname.startsWith('/admin'));

        if (error?.response?.status === 401 && !prevRequest?.sent) {
          prevRequest.sent = true;
          try {
            if (isHeadTarget) {
              // Attempt to get a new access token using the Head HTTP-only refresh token cookie
              const response = await authService.refreshHead();
              const newAccessToken = response.accessToken;
              localStorage.setItem('head_auth_token', newAccessToken);
              prevRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
              return axiosPrivate(prevRequest);
            } else if (isAdminTarget) {
              // Attempt to get a new access token using the Admin HTTP-only refresh token cookie
              const response = await authService.refreshAdmin();
              const newAccessToken = response.accessToken;
              localStorage.setItem('admin_auth_token', newAccessToken);
              
              setAdminAuth(prev => ({
                ...prev,
                adminUser: response.user,
                isAuthenticated: true
              }));
              
              prevRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
              return axiosPrivate(prevRequest);
            } else {
              // Attempt to get a new access token using the Member HTTP-only refresh token cookie
              const response = await authService.refresh();
              const newAccessToken = response.accessToken;
              
              setAuth(prev => {
                localStorage.setItem('merisamaj_token', newAccessToken);
                if (response.refreshToken) {
                  localStorage.setItem('merisamaj_refresh_token', response.refreshToken);
                }
                return { ...prev, user: response.user, accessToken: newAccessToken, isAuthenticated: true };
              });
              
              prevRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
              return axiosPrivate(prevRequest);
            }
          } catch (refreshError) {
            // Refresh token expired or invalid, clear only the current panel's session
            if (isHeadTarget) {
              localStorage.removeItem('head_auth_user');
              localStorage.removeItem('head_auth_token');
              localStorage.removeItem('head_has_session');
              
              setHeadAuth({
                headUser: null,
                isAuthenticated: false,
                isInitialized: true,
              });
            } else if (isAdminTarget) {
              localStorage.removeItem('admin_auth_user');
              localStorage.removeItem('admin_auth_token');
              localStorage.removeItem('admin_has_session');
              
              setAdminAuth({
                adminUser: null,
                isAuthenticated: false,
                isInitialized: true,
              });
            } else {
              localStorage.removeItem('merisamaj_user');
              localStorage.removeItem('merisamaj_token');
              localStorage.removeItem('merisamaj_refresh_token');
              localStorage.removeItem('merisamaj_has_session');
              
              setAuth({
                user: null,
                accessToken: null,
                isAuthenticated: false,
                isInitialized: true,
              });
            }
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axiosPrivate.interceptors.request.eject(requestIntercept);
      axiosPrivate.interceptors.response.eject(responseIntercept);
    };
  }, [auth, setAuth, headAuth, setHeadAuth, adminAuth, setAdminAuth]);

  return axiosPrivate;
};
