import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Plus, Download, Upload, MapPin, AlertCircle, CheckCircle2, TrendingUp, Users, Activity
} from 'lucide-react';
import { useCities } from '../../hooks/useCities';
import { CityFilters } from '../../components/cities/CityFilters';
import { CityTable } from '../../components/cities/CityTable';
import { CityProfileDrawer } from '../../components/cities/CityProfileDrawer';
import { AddEditCityModal, ConfirmationModal } from '../../components/cities/CityModals';

export const CityManagement = () => {
  const { 
    cities, loading, addCity, updateCity, toggleCityStatus
  } = useCities();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  
  // UI States
  const [toast, setToast] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [actionCity, setActionCity] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredCities = useMemo(() => {
    return cities.filter(city => {
      const matchesSearch = 
        city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        city.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        city.state.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'All' || city.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [cities, searchQuery, filterStatus]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const activeCount = cities.filter(c => c.status === 'Active').length;
    const communitiesCount = cities.reduce((sum, c) => sum + c.communitiesCount, 0);
    const membersCount = cities.reduce((sum, c) => sum + c.membersCount, 0);
    return { activeCount, communitiesCount, membersCount };
  }, [cities]);

  // Handlers
  const handleViewCity = (city) => {
    setSelectedCity(city);
    setIsDrawerOpen(true);
  };

  const handleEditCity = (city) => {
    setSelectedCity(city);
    setIsAddEditModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedCity(null);
    setIsAddEditModalOpen(true);
  };

  const handleSaveCity = async (formData) => {
    if (selectedCity) {
      const res = await updateCity(selectedCity.id, formData);
      if (res.success) {
        showToast(`Successfully updated ${formData.name}`);
      } else {
        showToast(res.error, 'error');
      }
    } else {
      const res = await addCity(formData);
      if (res.success) {
        showToast(`Successfully registered ${formData.name}`);
      } else {
        showToast(res.error, 'error');
      }
    }
    setIsAddEditModalOpen(false);
  };

  const handlePromptToggleStatus = (city) => {
    setActionCity(city);
    setIsConfirmModalOpen(true);
  };

  const confirmToggleStatus = async () => {
    if (!actionCity) return;
    const res = await toggleCityStatus(actionCity.id, actionCity.status);
    if (res.success) {
      showToast(`City status updated to ${actionCity.status === 'Active' ? 'Disabled' : 'Active'}`);
    } else {
      showToast('Failed to update status', 'error');
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-55 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border backdrop-blur-md ${
              toast.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-bold tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <section className="card-neo p-6 relative overflow-hidden flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full filter blur-3xl pointer-events-none" />
        
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-brand-secondary tracking-widest uppercase">Global Control Center</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight mt-1 flex items-center gap-3">
            <Building2 size={24} className="text-purple-600" />
            City Management
          </h2>
          <p className="text-xs text-gray-600 mt-1 font-medium max-w-lg">
            Manage all regional city hubs, map communities, and view global performance analytics.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-black border border-gray-300 text-xs font-bold transition-all flex items-center gap-2 shadow-sm">
            <Upload size={14} className="text-black" /> <span className="text-black">Import</span>
          </button>
          <button className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-black border border-gray-300 text-xs font-bold transition-all flex items-center gap-2 shadow-sm">
            <Download size={14} className="text-black" /> <span className="text-black">Export</span>
          </button>
          <button 
            onClick={handleAddNew}
            className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-purple-600 text-white text-xs font-bold transition-all shadow-lg shadow-brand-primary/25 flex items-center gap-2"
          >
            <Plus size={14} /> Register City
          </button>
        </div>
      </section>

      {/* Summary Dashboard Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="card-neo p-5 relative overflow-hidden group hover:border-purple-500/30 transition-all bg-white border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <MapPin size={20} />
            </div>
            <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
              {stats.activeCount} Active
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-[11px] font-bold text-black uppercase tracking-wider">Total Registered Cities</h4>
            <h3 className="text-3xl font-black text-black mt-1 tracking-tight">{cities.length}</h3>
          </div>
        </div>

        <div className="card-neo p-5 relative overflow-hidden group hover:border-blue-500/30 transition-all bg-white border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Building2 size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-[11px] font-bold text-black uppercase tracking-wider">Mapped Communities</h4>
            <h3 className="text-3xl font-black text-black mt-1 tracking-tight">{stats.communitiesCount}</h3>
          </div>
        </div>

        <div className="card-neo p-5 relative overflow-hidden group hover:border-emerald-500/30 transition-all bg-white border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Users size={20} />
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
              <TrendingUp size={12} /> +12%
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-[11px] font-bold text-black uppercase tracking-wider">Global Members</h4>
            <h3 className="text-3xl font-black text-black mt-1 tracking-tight">{(stats.membersCount/1000).toFixed(1)}k</h3>
          </div>
        </div>

        <div className="card-neo p-5 relative overflow-hidden group hover:border-pink-500/30 transition-all bg-white border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600">
              <Activity size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-[11px] font-bold text-black uppercase tracking-wider">System Health</h4>
            <h3 className="text-3xl font-black text-black mt-1 tracking-tight">98.5%</h3>
          </div>
        </div>
      </section>

      {/* Directory Section */}
      <section className="space-y-4">
        {/* Filters */}
        <div className="flex items-center justify-between">
          <CityFilters 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            onReset={() => { setSearchQuery(''); setFilterStatus('All'); }}
          />
        </div>

        {/* Data Table */}
        <CityTable 
          cities={filteredCities} 
          loading={loading}
          onViewCity={handleViewCity}
          onEditCity={handleEditCity}
          onToggleStatus={handlePromptToggleStatus}
        />
      </section>

      {/* Profile Drawer */}
      <CityProfileDrawer
        key={selectedCity?.id}
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        city={selectedCity} 
      />

      {/* Add / Edit Modal */}
      <AddEditCityModal 
        isOpen={isAddEditModalOpen} 
        onClose={() => setIsAddEditModalOpen(false)} 
        city={selectedCity} 
        onSave={handleSaveCity} 
      />

      {/* Confirmation Modal */}
      <ConfirmationModal 
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title={actionCity?.status === 'Active' ? 'Disable City' : 'Enable City'}
        message={`Are you sure you want to ${actionCity?.status === 'Active' ? 'disable' : 'enable'} ${actionCity?.name}? This will affect all associated communities and members.`}
        type={actionCity?.status === 'Active' ? 'danger' : 'warning'}
        onConfirm={confirmToggleStatus}
      />
    </div>
  );
};

export default CityManagement;
