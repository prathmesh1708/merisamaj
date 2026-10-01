import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCommunityHeads } from '../../hooks/useCommunityHeads';
import { DashboardCards } from './components/DashboardCards';
import { CommunityHeadTable } from './components/CommunityHeadTable';
import { Users, Plus, Shield, Activity, BarChart2, ShieldCheck, Database, SlidersHorizontal, Sliders } from 'lucide-react';
import { CommunityHeadForm } from './components/CommunityHeadForm';

const CommunityHeadManagement = () => {
  const navigate = useNavigate();
  const { heads, stats, loading, error, handleStatusChange, handleDeleteHead, handleUpdateHead, createHead, refreshData } = useCommunityHeads();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHead, setEditingHead] = useState(null);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-brand-primary/10 border-t-brand-primary rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield className="w-6 h-6 text-brand-primary animate-pulse" />
          </div>
        </div>
        <p className="text-gray-500 font-medium mt-4 tracking-wide text-sm">Loading Administration Center...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-center bg-white border border-rose-100 shadow-sm rounded-2xl max-w-lg p-8">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <h3 className="text-gray-900 font-bold mb-2 text-xl">Connection Error</h3>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button onClick={refreshData} className="px-6 py-2.5 bg-brand-primary text-white font-medium rounded-xl hover:bg-brand-primary/90 transition-all">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      {/* ─── PREMIUM HEADER ─── */}
      <div className="relative bg-white border-b border-gray-100 -mt-6 -mx-6 px-8 py-10 shadow-sm overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-indigo-500/5 rounded-full blur-2xl translate-y-1/3"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
                <Users size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Community Head Administration</h1>
                <p className="text-gray-500 font-medium text-sm mt-1">
                  Centralized command center for managing head roles, permissions, and activities.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/admin/community-heads/activity')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-gray-700 hover:bg-gray-50 hover:text-brand-primary transition-all text-sm font-semibold border border-gray-200 shadow-sm"
            >
              <Activity size={18} /> Monitor Activity
            </button>
            <button 
              onClick={() => navigate('/admin/community-heads/reports')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-gray-700 hover:bg-gray-50 hover:text-brand-primary transition-all text-sm font-semibold border border-gray-200 shadow-sm"
            >
              <BarChart2 size={18} /> Reports
            </button>
            <button 
              onClick={() => { setEditingHead(null); setIsFormOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-sm font-bold rounded-xl hover:bg-brand-primary/90 transition-all shadow-lg shadow-brand-primary/20"
            >
              <Plus size={18} /> Create New Head
            </button>
          </div>
        </div>
      </div>

      {/* ─── DASHBOARD CARDS ─── */}
      <div className="px-2">
        <DashboardCards stats={stats} />
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="px-2">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-brand-primary" />
                Active Roster
              </h2>
              <p className="text-xs text-gray-500 mt-1">Manage and assign communities to registered heads.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search by name, email, or community..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full md:w-80 pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all outline-none text-gray-700 font-medium placeholder-gray-400"
                />
                <Sliders className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </div>
          </div>
          
          <div className="p-0">
            <CommunityHeadTable 
              heads={heads} 
              searchQuery={searchQuery}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteHead}
              onEdit={(head) => { setEditingHead(head); setIsFormOpen(true); }}
              onRowClick={(id) => navigate(`/admin/community-heads/${id}`)}
            />
          </div>
        </div>
      </div>

      <CommunityHeadForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingHead(null); }}
        initialData={editingHead}
        existingGroups={Array.from(new Set((heads || []).map(h => h.group).filter(Boolean)))}
        onSubmit={async (data) => {
          let result;
          if (editingHead) {
            result = await handleUpdateHead(editingHead.id, data);
          } else {
            result = await createHead(data);
          }
          if (result.success) {
            setIsFormOpen(false);
            setEditingHead(null);
          }
          return result;
        }}
      />
    </div>
  );
};

export default CommunityHeadManagement;
