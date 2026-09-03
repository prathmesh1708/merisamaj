import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { matrimonialService } from '../services/matrimonialService';

export const useGlobalMatrimonial = () => {
  const [stats,    setStats]    = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [reports,  setReports]  = useState([]);
  const [photos,   setPhotos]   = useState([]);
  const [plans,    setPlans]    = useState([]);
  const [settings, setSettings] = useState(null);
  const [analytics,setAnalytics]= useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, profilesData, reportsData, photosData, plansData, settingsData, analyticsData] =
        await Promise.allSettled([
          matrimonialService.getDashboardStats(),
          matrimonialService.getProfiles({ limit: 50 }),
          matrimonialService.getReports({ limit: 50 }),
          matrimonialService.getPendingPhotos(),
          matrimonialService.getPlans(),
          matrimonialService.getSettings(),
          matrimonialService.getAnalytics({ days: 30 }),
        ]);

      if (statsData.status    === 'fulfilled') setStats(statsData.value);
      if (profilesData.status === 'fulfilled') setProfiles(profilesData.value.profiles || []);
      if (reportsData.status  === 'fulfilled') setReports(reportsData.value.reports  || []);
      if (photosData.status   === 'fulfilled') setPhotos(photosData.value.photos    || []);
      if (plansData.status    === 'fulfilled') setPlans(plansData.value.plans       || []);
      if (settingsData.status === 'fulfilled') setSettings(settingsData.value.settings);
      if (analyticsData.status=== 'fulfilled') setAnalytics(analyticsData.value);
    } catch (err) {
      console.error('Failed to load matrimonial data:', err);
      setError('Failed to load platform-wide matrimonial data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // ─── Socket.IO Auto-Refresh ───────────────────────────────────────────────
  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
      || (import.meta.env.VITE_API_URL?.replace(/\/api\/v1\/?$/, ''))
      || 'http://localhost:5000';
    const token = localStorage.getItem('admin_auth_token');
    
    const socket = io(SOCKET_URL, {
      auth: { token, role: 'admin' },
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.on('admin:matrimonial_update', () => {
      fetchAllData(); // Auto refresh all stats and lists
    });

    return () => socket.disconnect();
  }, [fetchAllData]);

  const refreshData = () => fetchAllData();

  // Individual refresh helpers
  const refreshProfiles = useCallback(async (params) => {
    const data = await matrimonialService.getProfiles(params || { limit: 50 });
    setProfiles(data.profiles || []);
    return data;
  }, []);

  const refreshReports = useCallback(async (params) => {
    const data = await matrimonialService.getReports(params || { limit: 50 });
    setReports(data.reports || []);
  }, []);

  const refreshPhotos = useCallback(async () => {
    const data = await matrimonialService.getPendingPhotos();
    setPhotos(data.photos || []);
  }, []);

  const refreshPlans = useCallback(async () => {
    const data = await matrimonialService.getPlans();
    setPlans(data.plans || []);
  }, []);

  return {
    stats, profiles, reports, photos, plans, settings, analytics,
    loading, error,
    refreshData, refreshProfiles, refreshReports, refreshPhotos, refreshPlans,
    setPlans, setSettings
  };
};
