import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, ShieldAlert, Flag,
  BarChart2, CreditCard, Settings, Image as ImageIcon, Loader2
} from 'lucide-react';
import { useGlobalMatrimonial } from './hooks/useGlobalMatrimonial';
import OverviewDashboard  from './components/Dashboard/OverviewDashboard';
import ProfilesDirectory  from './components/Directory/ProfilesDirectory';
import ModerationQueue    from './components/Moderation/ModerationQueue';
import ReportsComplaints  from './components/Reports/ReportsComplaints';
import MatchAnalytics     from './components/Analytics/MatchAnalytics';
import MatrimonialSettings from './components/Settings/MatrimonialSettings';

const TABS = [
  { id: 'overview',     label: 'Overview',      icon: LayoutDashboard },
  { id: 'directory',    label: 'Profiles',       icon: Users },
  { id: 'moderation',   label: 'Moderation',     icon: ImageIcon },
  { id: 'reports',      label: 'Reports',        icon: Flag },
  { id: 'analytics',    label: 'Analytics',      icon: BarChart2 },
  { id: 'settings',     label: 'Settings',       icon: Settings },
];

const COMPONENTS = {
  overview:   OverviewDashboard,
  directory:  ProfilesDirectory,
  moderation: ModerationQueue,
  reports:    ReportsComplaints,
  analytics:  MatchAnalytics,
  settings:   MatrimonialSettings,
};

export const PlatformMatrimonialManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (id) => setSearchParams({ tab: id });

  const matrimonialData = useGlobalMatrimonial();
  const { loading, error } = matrimonialData;

  const ActiveComponent = COMPONENTS[activeTab] || OverviewDashboard;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
          <p className="text-gray-400 font-bold animate-pulse">Loading Matrimonial Registry...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-xl max-w-lg mx-auto mt-20">
        <h3 className="text-rose-400 font-bold mb-2">System Error</h3>
        <p className="text-gray-400 text-sm">{error}</p>
        <button onClick={matrimonialData.refreshData}
          className="mt-4 px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-bold">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Platform Matrimonial Management</h1>
        <p className="text-sm text-slate-500 mt-1">Global oversight and moderation of all community matrimonial profiles.</p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-slate-200">
        <div className="flex space-x-1 p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-bold rounded-t-xl transition-all relative ${
                  isActive ? 'text-rose-600 font-bold' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                }`}>
                <Icon size={16} className={isActive ? 'text-rose-600' : 'text-slate-400'} />
                <span className="whitespace-nowrap">{tab.label}</span>
                {isActive && (
                  <motion.div layoutId="matrimonialTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600"
                    initial={false} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}>
            <ActiveComponent data={matrimonialData} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PlatformMatrimonialManagement;
