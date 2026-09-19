import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Download, TrendingUp, RefreshCw, Shield
} from 'lucide-react';
import { useUserManagement } from '../../hooks/useUserManagement';
import { UserAnalytics } from './components/UserAnalytics';
import { UserFilters } from './components/UserFilters';
import { UserTable } from './components/UserTable';
import { UserProfileDrawer } from './components/UserProfileDrawer';

const TABS = [
  { id: 'list', label: 'All Members', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
];

export const UserManagement = () => {
  const {
    users, stats, loading, actionLoading, error,
    filters, setFilters,
    page, setPage, pagination,
    handleVerifyUser, handleSuspendUser, handleBlockUser,
    handleActivateUser, handleDeleteUser,
    refreshData,
  } = useUserManagement();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'list';
  const setActiveTab = (tabId) => setSearchParams({ tab: tabId });

  const [drawerUserId, setDrawerUserId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleViewProfile = (user) => {
    setDrawerUserId(user.id);
    setIsDrawerOpen(true);
  };

  if (loading && !users.length) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-brand-primary/10 border-t-brand-primary rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="w-6 h-6 text-brand-primary animate-pulse" />
            </div>
          </div>
          <p className="text-gray-500 font-medium text-sm tracking-wide">Loading User Management...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-center bg-white border border-rose-100 shadow-sm rounded-2xl max-w-lg p-8">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield size={32} />
          </div>
          <h3 className="text-gray-900 font-bold mb-2 text-xl">Connection Error</h3>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button onClick={refreshData} className="px-6 py-2.5 bg-brand-primary text-white font-medium rounded-xl hover:bg-brand-primary/90 transition-all flex items-center gap-2 mx-auto">
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      {/* ─── HEADER ─── */}
      <div className="relative bg-white border-b border-gray-100 -mt-6 -mx-6 px-8 py-10 shadow-sm overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
                <Users size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">User Administration</h1>
                <p className="text-gray-500 font-medium text-sm mt-0.5">
                  Manage all platform members — verify, suspend, block, and view activity.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refreshData}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-gray-700 hover:bg-gray-50 transition-all text-sm font-semibold border border-gray-200 shadow-sm"
            >
              <RefreshCw size={16} /> Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-gray-700 hover:bg-gray-50 transition-all text-sm font-semibold border border-gray-200 shadow-sm">
              <Download size={16} /> Export
            </button>
          </div>
        </div>
      </div>

      {/* ─── STATS CARDS ─── */}
      <div className="px-2">
        <UserAnalytics stats={stats} />
      </div>

      {/* ─── TABS ─── */}
      <div className="px-2">
        <div className="flex overflow-x-auto no-scrollbar border-b border-gray-100">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold transition-all relative ${
                  isActive ? 'text-brand-primary' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Icon size={16} />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="userTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── TAB CONTENT ─── */}
      <div className="px-2 min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'list' && (
              <div className="space-y-5">
                <UserFilters filters={filters} setFilters={setFilters} />
                <UserTable
                  users={users}
                  pagination={pagination}
                  page={page}
                  onPageChange={setPage}
                  actionLoading={actionLoading}
                  onViewProfile={handleViewProfile}
                  onVerify={handleVerifyUser}
                  onSuspend={handleSuspendUser}
                  onBlock={handleBlockUser}
                  onActivate={handleActivateUser}
                  onDelete={handleDeleteUser}
                  onRefresh={refreshData}
                />
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <h2 className="text-lg font-black text-gray-900">Platform User Analytics</h2>
                <UserAnalytics stats={stats} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── PROFILE DRAWER ─── */}
      <UserProfileDrawer
        userId={drawerUserId}
        isOpen={isDrawerOpen}
        onClose={() => { setIsDrawerOpen(false); setDrawerUserId(null); }}
        onActionComplete={refreshData}
      />
    </div>
  );
};

export default UserManagement;
