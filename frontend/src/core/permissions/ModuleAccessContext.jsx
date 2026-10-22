/**
 * ModuleAccessContext
 * The logged-in Head's effective modules (hierarchical module access), used to
 * hide menu items and to block direct-URL access to Head-panel pages.
 *
 * This is UX only — the server blocks every module API on its own
 * (backend/src/middleware/requireHeadModule.js).
 *
 * Refreshes: on load, when the tab regains focus, every minute, after a
 * permission save ('module-access:changed' event), and whenever the server
 * answers MODULE_NOT_GRANTED (access was just taken away).
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { axiosPrivate } from '../api/axiosPrivate';
import { modulePermissionApi } from './modulePermissionApi';
import ModuleAccessDenied from './ModuleAccessDenied';

const ModuleAccessContext = createContext(null);
const REFRESH_MS = 60 * 1000;

export const ModuleAccessProvider = ({ children }) => {
  const [state, setState] = useState({ loaded: false, failed: false, catalog: [], modules: [], me: null });

  const refresh = useCallback(async () => {
    try {
      const res = await modulePermissionApi.getMyAccess();
      const { catalog = [], modules = [], ...me } = res.data?.data || {};
      setState({ loaded: true, failed: false, catalog, modules, me });
    } catch {
      // Fail open in the UI only — the server still enforces access
      setState(prev => ({ ...prev, loaded: true, failed: true }));
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    window.addEventListener('module-access:changed', onFocus);

    // The server revoked something mid-session → refresh menus straight away
    const interceptor = axiosPrivate.interceptors.response.use(
      (r) => r,
      (error) => {
        if (error?.response?.status === 403 && error.response.data?.code === 'MODULE_NOT_GRANTED') refresh();
        return Promise.reject(error);
      }
    );
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('module-access:changed', onFocus);
      axiosPrivate.interceptors.response.eject(interceptor);
    };
  }, [refresh]);

  const value = useMemo(() => {
    // Longest matching catalog path wins (e.g. /head/funds/accounts → funds)
    const pathIndex = state.catalog
      .flatMap(m => (m.headPaths || []).map(p => ({ path: p, key: m.key })))
      .sort((a, b) => b.path.length - a.path.length);

    const moduleForPath = (pathname = '') => {
      const hit = pathIndex.find(({ path }) => pathname === path || pathname.startsWith(`${path}/`));
      return hit ? hit.key : null;
    };
    const hasModule = (key) => !key || !state.loaded || state.failed || state.modules.includes(key);
    const isPathAllowed = (pathname) => hasModule(moduleForPath(pathname));
    const moduleLabel = (key) => state.catalog.find(m => m.key === key)?.label || key;

    return { ...state, refresh, moduleForPath, hasModule, isPathAllowed, moduleLabel };
  }, [state, refresh]);

  return <ModuleAccessContext.Provider value={value}>{children}</ModuleAccessContext.Provider>;
};

/** Outside a provider (e.g. Master Admin pages) everything is allowed */
export const useModuleAccess = () => useContext(ModuleAccessContext) || {
  loaded: true, failed: false, catalog: [], modules: [], me: null,
  refresh: () => {}, moduleForPath: () => null, hasModule: () => true, isPathAllowed: () => true, moduleLabel: (k) => k
};

/** Renders the page only if its module is granted; otherwise a clear message */
export const ModuleRouteGuard = ({ children }) => {
  const location = useLocation();
  const { moduleForPath, hasModule, moduleLabel, me } = useModuleAccess();
  const moduleKey = moduleForPath(location.pathname);
  if (moduleKey && !hasModule(moduleKey)) {
    return <ModuleAccessDenied moduleName={moduleLabel(moduleKey)} grantedBy={me?.parent?.name} />;
  }
  return children;
};

export default ModuleAccessContext;
