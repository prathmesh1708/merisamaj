import { useState, useEffect, useCallback, useRef } from 'react';
import { userService } from '../services/userService';

export const DEFAULT_USER_FILTERS = {
  search: '',
  status: 'All',
  verificationStatus: 'All',
  communityId: 'all',
  city: 'All',
  headStatus: 'all',
  communityName: 'all',
  subCommunity: '',
  state: 'all',
  district: '',
  location: '',
  verifiedBy: '',
  customerId: '',
  name: '',
  gender: 'all',
  hasPhoto: 'all',
  dateFrom: '',
  dateTo: '',
};

export const useUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Filters
  const [filters, setFilters] = useState(DEFAULT_USER_FILTERS);

  // Debounce search to avoid rapid API calls
  const searchTimer = useRef(null);
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedFilters(filters);
      setPage(1); // reset to page 1 on filter change
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [filters]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await userService.getUsers(debouncedFilters, page);
      setUsers(res.data || []);
      setPagination(res.pagination || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, page]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await userService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ─── Optimistic update helper ───────────────────────────────────────────────
  const updateUserInList = (userId, changes) => {
    setUsers(prev => prev.map(u => u.id === userId || u.id?.toString() === userId?.toString()
      ? { ...u, ...changes }
      : u
    ));
  };

  // ─── Actions ────────────────────────────────────────────────────────────────
  const handleVerifyUser = async (userId) => {
    setActionLoading(true);
    try {
      await userService.verifyUser(userId);
      updateUserInList(userId, { verificationStatus: 'verified', isVerified: true, accountStatus: 'active' });
      fetchStats();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to verify' };
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendUser = async (userId, reason) => {
    setActionLoading(true);
    try {
      await userService.suspendUser(userId, reason);
      updateUserInList(userId, { accountStatus: 'inactive' });
      fetchStats();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to suspend' };
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockUser = async (userId, reason) => {
    setActionLoading(true);
    try {
      await userService.blockUser(userId, reason);
      updateUserInList(userId, { accountStatus: 'blocked' });
      fetchStats();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to block' };
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateUser = async (userId) => {
    setActionLoading(true);
    try {
      await userService.activateUser(userId);
      updateUserInList(userId, { accountStatus: 'active' });
      fetchStats();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to activate' };
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    setActionLoading(true);
    try {
      await userService.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId && u.id?.toString() !== userId?.toString()));
      fetchStats();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to delete' };
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async (userId, data) => {
    setActionLoading(true);
    try {
      const updated = await userService.updateUser(userId, data);
      updateUserInList(userId, updated);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to update' };
    } finally {
      setActionLoading(false);
    }
  };

  return {
    users,
    stats,
    loading,
    actionLoading,
    error,
    filters,
    setFilters,
    page,
    setPage,
    pagination,
    handleVerifyUser,
    handleSuspendUser,
    handleBlockUser,
    handleActivateUser,
    handleDeleteUser,
    handleUpdateUser,
    refreshData: fetchUsers,
    refreshStats: fetchStats,
    // All rows matching the current filters (no pagination) — used by Export
    fetchAllFiltered: async () => (await userService.getUsers({ ...debouncedFilters, all: true }, 1)).data || [],
  };
};
