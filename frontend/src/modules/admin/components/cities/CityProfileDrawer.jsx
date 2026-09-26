import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Users, Activity, Settings, TrendingUp, BarChart3, Building } from 'lucide-react';

export const CityProfileDrawer = ({ city, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!city) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: MapPin },
    { id: 'communities', label: 'Communities', icon: Building },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'admin', label: 'Administration', icon: Settings },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Drawer */}
          <motion.div 
            initial={{ x: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0)' }}
            animate={{ x: 0, boxShadow: '-10px 0 30px rgba(0,0,0,0.5)' }}
            exit={{ x: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#1e1e2d] border-l border-white/10 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 bg-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full filter blur-2xl pointer-events-none" />
              
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center text-2xl text-purple-300 font-black shadow-inner">
                    {city.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white leading-none">{city.name}</h2>
                    <p className="text-xs text-text-muted mt-1 font-medium">{city.state}, {city.country}</p>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      city.status === 'Active' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {city.status}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mt-6 border-b border-white/5 pb-0 overflow-x-auto no-scrollbar">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-bold whitespace-nowrap transition-colors ${
                        activeTab === tab.id 
                          ? 'border-brand-primary text-white' 
                          : 'border-transparent text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      <Icon size={14} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {activeTab === 'overview' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">City Profile</h3>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {city.description || 'No description provided for this city node.'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Vital Stats</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between">
                        <Users size={16} className="text-blue-400 mb-2" />
                        <span className="text-2xl font-black text-white">{city.membersCount.toLocaleString()}</span>
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-1">Total Members</span>
                      </div>
                      <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between">
                        <Building size={16} className="text-emerald-400 mb-2" />
                        <span className="text-2xl font-black text-white">{city.communitiesCount}</span>
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-1">Communities</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'communities' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="p-8 text-center bg-white/5 border border-white/5 rounded-2xl">
                    <Building size={32} className="mx-auto text-gray-500 mb-3" />
                    <h4 className="text-white font-bold text-sm">Community Mapping</h4>
                    <p className="text-xs text-gray-400 mt-2">Displaying the list of communities under {city.name} will be available here when connected to the backend.</p>
                  </div>
                </motion.div>
              )}

              {activeTab === 'analytics' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="p-8 text-center bg-white/5 border border-white/5 rounded-2xl">
                    <BarChart3 size={32} className="mx-auto text-brand-primary mb-3" />
                    <h4 className="text-white font-bold text-sm">City Analytics</h4>
                    <p className="text-xs text-gray-400 mt-2">Charts showing member growth, revenue trends, and matrimonial activity for {city.name}.</p>
                  </div>
                </motion.div>
              )}

              {activeTab === 'admin' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">System Information</h3>
                    <ul className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/5">
                      <li className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Internal ID</span>
                        <span className="text-white font-mono text-xs">{city.id}</span>
                      </li>
                      <li className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Created At</span>
                        <span className="text-white">{new Date(city.createdAt).toLocaleDateString()}</span>
                      </li>
                      <li className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Last Updated</span>
                        <span className="text-white">{new Date(city.updatedAt).toLocaleDateString()}</span>
                      </li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
