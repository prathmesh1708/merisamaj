import React, { useState, useEffect, useCallback } from 'react';
import { Heart, Plus, Search, Filter, ShieldCheck, Lock, RefreshCw, AlertCircle } from 'lucide-react';
import adminDonationApi from '../../api/adminDonationApi';
import DonationTable from '../../components/admin/DonationTable';
import DonationFormModal from '../../components/admin/DonationFormModal';
import ViewDonationModal from '../../components/admin/ViewDonationModal';

export const DonationManagement = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Communities list for filter
  const [communities, setCommunities] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [communityFilter, setCommunityFilter] = useState('all');

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available communities list on mount
  useEffect(() => {
    adminDonationApi.getCommunities()
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setCommunities(res.data);
        } else if (Array.isArray(res)) {
          setCommunities(res);
        }
      })
      .catch(err => console.warn('Failed to load communities:', err));
  }, []);

  const fetchDonations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (communityFilter !== 'all') params.communityId = communityFilter;

      const res = await adminDonationApi.getAllDonations(params);
      if (res.success) {
        setDonations(res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch donations');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, communityFilter]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const handleCreateSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      if (selectedDonation) {
        await adminDonationApi.updateDonation(selectedDonation._id, formData, selectedDonation.source);
      } else {
        await adminDonationApi.createDonation(formData);
      }
      setIsFormModalOpen(false);
      setSelectedDonation(null);
      fetchDonations();
    } catch (err) {
      alert(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = async (id, source) => {
    if (!window.confirm('Are you sure you want to close this donation drive? Members will no longer be able to donate.')) return;
    try {
      await adminDonationApi.closeDonation(id, source);
      fetchDonations();
    } catch (err) {
      alert(err.message || 'Failed to close donation');
    }
  };

  const handleDelete = async (id, source) => {
    if (!window.confirm('Are you sure you want to delete this donation record?')) return;
    try {
      await adminDonationApi.deleteDonation(id, source);
      fetchDonations();
    } catch (err) {
      alert(err.message || 'Failed to delete donation');
    }
  };

  const handleOpenCreate = () => {
    setSelectedDonation(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (donation) => {
    setSelectedDonation(donation);
    setIsFormModalOpen(true);
  };

  const handleOpenView = (donation) => {
    setSelectedDonation(donation);
    setIsViewModalOpen(true);
  };

  // Client-side search filter
  const filteredDonations = donations.filter(d => {
    if (!search.trim()) return true;
    const matchText = search.trim().toLowerCase();
    return (
      (d.title && d.title.toLowerCase().includes(matchText)) ||
      (d.category && d.category.toLowerCase().includes(matchText)) ||
      (d.description && d.description.toLowerCase().includes(matchText))
    );
  });

  // Calculate top-level stats
  const totalRaised = donations.reduce((sum, d) => sum + (d.raisedAmount || 0), 0);
  const totalDonors = donations.reduce((sum, d) => sum + (d.donorCount || 0), 0);
  const activeCount = donations.filter(d => d.status === 'Active' || d.status === 'Published').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100">
            <Heart className="w-7 h-7 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Global Donation Governance</h1>
            <p className="text-slate-500 text-xs mt-1 font-semibold">Single Source of Truth Donation Management & Campaign Controls</p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white text-xs font-bold rounded-xl shadow-md shadow-brand-primary/20 transition-all active:scale-95 flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus size={16} /> Create New Campaign
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Campaigns</span>
          <h3 className="text-2xl font-black text-slate-800 mt-1">{donations.length}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Active Drives</span>
          <h3 className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider">Total Funds Raised</span>
          <h3 className="text-2xl font-black text-brand-primary mt-1">₹{totalRaised.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">Total Donors</span>
          <h3 className="text-2xl font-black text-purple-600 mt-1">{totalDonors}</h3>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Box with explicit padding fix */}
          <div className="md:col-span-3 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="Search by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
              className="w-full pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Community Filter */}
          <div className="md:col-span-3">
            <select
              value={communityFilter}
              onChange={(e) => setCommunityFilter(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="all">All Communities</option>
              <option value="global">Global Only (All Members)</option>
              {communities.map((c) => (
                <option key={c._id || c.id} value={c._id || c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Closed">Closed Only</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="General">General Relief</option>
              <option value="Health">Health & Medical</option>
              <option value="Education">Education</option>
              <option value="Temple">Temple</option>
              <option value="Social">Social</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      {error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-600">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p className="font-bold text-sm">{error}</p>
          <button
            onClick={fetchDonations}
            className="mt-3 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <DonationTable
          donations={filteredDonations}
          loading={loading}
          onView={handleOpenView}
          onEdit={handleOpenEdit}
          onClose={handleClose}
          onDelete={handleDelete}
        />
      )}

      {/* Modals */}
      <DonationFormModal
        isOpen={isFormModalOpen}
        onClose={() => { setIsFormModalOpen(false); setSelectedDonation(null); }}
        onSubmit={handleCreateSubmit}
        donation={selectedDonation}
        isSubmitting={isSubmitting}
      />

      <ViewDonationModal
        isOpen={isViewModalOpen}
        onClose={() => { setIsViewModalOpen(false); setSelectedDonation(null); }}
        donation={selectedDonation}
      />
    </div>
  );
};

export default DonationManagement;
