import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckSquare, Search, Filter, CheckCircle, XCircle, Eye, Download, Users, 
  MapPin, Calendar, Clock, Sparkles, X, ChevronDown, Trash2, Globe, Award,
  AlertCircle, RefreshCw, Layers, BarChart3, User, Plus, Check, Edit3, Building2
} from 'lucide-react';
import { adminVotingService } from '../../services/adminVotingService';
import { axiosPrivate } from '../../../../core/api/axiosPrivate';

export const AdminVotingManagement = () => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalElections: 0,
    activeElections: 0,
    upcomingElections: 0,
    completedElections: 0,
    closedElections: 0,
    totalCandidates: 0,
    totalVotesCast: 0
  });

  const [communities, setCommunities] = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [electionDetails, setElectionDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [communityFilter, setCommunityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Create / Edit modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [targetOptions, setTargetOptions] = useState({
    communities: [],
    cities: [],
    communityHeads: [],
    localHeads: [],
    subHeads: [],
    users: []
  });
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUserFilterComm, setSelectedUserFilterComm] = useState('all');

  const initialForm = {
    title: '',
    description: '',
    type: 'Platform Election',
    category: 'General',
    startDate: '',
    endDate: '',
    targetAudience: 'ALL',
    communityId: '',
    targetCity: '',
    targetUsers: [],
    candidates: [
      { name: '', age: '', profession: '', shortIntro: '' },
      { name: '', age: '', profession: '', shortIntro: '' }
    ]
  };
  const [formData, setFormData] = useState(initialForm);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (communityFilter !== 'all') params.communityId = communityFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [elecRes, statsRes] = await Promise.all([
        adminVotingService.getAllElections(params),
        adminVotingService.getStats(params)
      ]);

      if (elecRes.success) setElections(elecRes.data || []);
      if (statsRes.success) setStats(statsRes.data || {});
    } catch (err) {
      console.error('Failed to load admin elections:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load voting & elections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [communityFilter, statusFilter]);

  // Fetch Communities for filter
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const res = await axiosPrivate.get('/admin/communities');
        setCommunities(res.data.data || []);
      } catch (err) {
        console.error('Failed to load communities for election filter', err);
      }
    };
    fetchCommunities();
  }, []);

  const fetchTargetOptions = async () => {
    try {
      const res = await adminVotingService.getTargetOptions();
      if (res.success) {
        setTargetOptions(res.data);
      }
    } catch (err) {
      console.warn('Failed to load admin target options:', err.message);
    }
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData(initialForm);
    fetchTargetOptions();
    setCreateModalOpen(true);
  };

  const handleOpenEditModal = (elec) => {
    setIsEditing(true);
    setEditingId(elec._id || elec.id);

    const formatForInput = (d) => {
      if (!d) return '';
      const date = new Date(d);
      const pad = (n) => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    setFormData({
      title: elec.title || '',
      description: elec.description || '',
      type: elec.type || 'Platform Election',
      category: elec.category || 'General',
      startDate: formatForInput(elec.startDate),
      endDate: formatForInput(elec.endDate),
      targetAudience: elec.targetAudience || 'ALL',
      communityId: elec.communityId?._id || elec.communityId || '',
      targetCity: elec.targetCity || elec.city || '',
      targetUsers: Array.isArray(elec.targetUsers) ? elec.targetUsers.map(u => u._id || u.id || u) : [],
      candidates: Array.isArray(elec.candidates) && elec.candidates.length >= 2
        ? elec.candidates.map(c => ({
            _id: c._id || c.id,
            id: c._id || c.id,
            name: c.name || '',
            age: c.age || '',
            profession: c.profession || '',
            shortIntro: c.shortIntro || '',
            votes: c.votes || 0
          }))
        : [
            { name: '', age: '', profession: '', shortIntro: '' },
            { name: '', age: '', profession: '', shortIntro: '' }
          ]
    });
    fetchTargetOptions();
    setCreateModalOpen(true);
  };

  const handleViewDetails = async (election) => {
    setSelectedElection(election);
    setDetailsLoading(true);
    try {
      const res = await adminVotingService.getElectionById(election._id);
      if (res.success) {
        setElectionDetails(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load election details', 'error');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    setActionLoading(true);
    try {
      await adminVotingService.updateStatus(id, newStatus);
      showToast(`Election status updated to ${newStatus}`);
      fetchData();
      if (selectedElection && selectedElection._id === id) {
        setSelectedElection(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      showToast(err.message || 'Failed to update election status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this election and all cast votes? This action cannot be undone.')) return;
    setActionLoading(true);
    try {
      await adminVotingService.deleteElection(id);
      showToast('Election deleted successfully');
      setSelectedElection(null);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete election', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCandidateChange = (idx, field, value) => {
    const updated = [...formData.candidates];
    updated[idx][field] = value;
    setFormData({ ...formData, candidates: updated });
  };

  const handleAddCandidate = () => {
    setFormData({
      ...formData,
      candidates: [...formData.candidates, { name: '', age: '', profession: '', shortIntro: '' }]
    });
  };

  const handleRemoveCandidate = (idx) => {
    if (formData.candidates.length <= 2) return;
    const updated = [...formData.candidates];
    updated.splice(idx, 1);
    setFormData({ ...formData, candidates: updated });
  };

  const toggleUserSelection = (userId) => {
    const current = formData.targetUsers || [];
    if (current.includes(userId)) {
      setFormData({
        ...formData,
        targetUsers: current.filter(id => id !== userId)
      });
    } else {
      setFormData({
        ...formData,
        targetUsers: [...current, userId]
      });
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.startDate || !formData.endDate || formData.candidates.some(c => !c.name.trim())) {
      showToast('Please fill in all required fields (including candidate names)', 'error');
      return;
    }

    if (formData.targetAudience === 'SPECIFIC_COMMUNITY' && !formData.communityId) {
      showToast('Please select a specific community', 'error');
      return;
    }

    if (formData.targetAudience === 'COMMUNITY_LOCATION' && (!formData.communityId || !formData.targetCity)) {
      showToast('Please select both community and target location', 'error');
      return;
    }

    if (formData.targetAudience === 'SPECIFIC_USERS' && (!formData.targetUsers || formData.targetUsers.length === 0)) {
      showToast('Please select at least 1 specific user', 'error');
      return;
    }

    setCreateSubmitting(true);
    try {
      if (isEditing && editingId) {
        const res = await adminVotingService.updateElection(editingId, formData);
        if (res.success) {
          showToast(`Successfully updated election "${formData.title}"`);
          setFormData(initialForm);
          setCreateModalOpen(false);
          fetchData();
        }
      } else {
        const res = await adminVotingService.createElection(formData);
        if (res.success) {
          showToast(`Successfully launched election "${formData.title}"`);
          setFormData(initialForm);
          setCreateModalOpen(false);
          fetchData();
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to save election', 'error');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const filteredUsers = (targetOptions.users || []).filter(u => {
    const matchesSearch = !userSearchQuery ||
      (u.name && u.name.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
      (u.phone && u.phone.includes(userSearchQuery));
    const matchesComm = selectedUserFilterComm === 'all' || 
      (u.communityId?._id ? u.communityId._id.toString() : u.communityId?.toString()) === selectedUserFilterComm;
    return matchesSearch && matchesComm;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 ${
              toast.type === 'error' ? 'bg-rose-500/90 text-white border-rose-600' : 'bg-emerald-500/90 text-white border-emerald-600'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-950 via-indigo-900 to-purple-950 p-6 rounded-3xl border border-indigo-500/20 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-1">
            <CheckSquare size={14} className="text-indigo-400" /> Platform Governance Desk
          </div>
          <h1 className="text-2xl font-black tracking-tight">Voting & Elections Oversight</h1>
          <p className="text-xs text-indigo-200/75 mt-1">Platform-wide visibility, role-based targeting, candidate profiles, and live tally moderation.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button 
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-950/40 active:scale-95 transition-all"
          >
            <Plus size={15} /> Create Election
          </button>
          <button 
            onClick={fetchData} 
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh List
          </button>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Elections</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.totalElections || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Active Polls</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats.activeElections || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Upcoming</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{stats.upcomingElections || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm">
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{stats.completedElections || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Closed</p>
          <p className="text-2xl font-black text-slate-600 mt-1">{stats.closedElections || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm">
          <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Candidates</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">{stats.totalCandidates || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm">
          <p className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Total Votes</p>
          <p className="text-2xl font-black text-purple-600 mt-1">{stats.totalVotesCast || 0}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Search election title, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchData()}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Community Filter */}
          <select
            value={communityFilter}
            onChange={(e) => setCommunityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Communities</option>
            {communities.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Completed">Completed</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Table Data Container */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 flex flex-col items-center justify-center min-h-[300px]">
          <RefreshCw size={24} className="text-indigo-600 animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-500">Loading election records...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 p-8 rounded-2xl text-center">
          <AlertCircle size={24} className="text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-rose-800">{error}</p>
          <button onClick={fetchData} className="mt-3 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold">Try Again</button>
        </div>
      ) : elections.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center">
          <CheckSquare size={32} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No elections or polls found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting search query or community filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3.5 px-4">Election Title</th>
                  <th className="py-3.5 px-4">Community / Scope</th>
                  <th className="py-3.5 px-4">Candidates</th>
                  <th className="py-3.5 px-4">Total Votes</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {elections.map((elec) => (
                  <tr key={elec._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-slate-900">{elec.title}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{elec.description}</p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                        {elec.community}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-700">
                      {elec.candidatesCount} Candidates
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                        {elec.totalVotesCast} votes
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                        elec.status === 'Active' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                        elec.status === 'Upcoming' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                        elec.status === 'Completed' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {elec.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewDetails(elec)}
                          className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                          title="View Vote Breakdown"
                        >
                          <BarChart3 size={14} />
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(elec)}
                          className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                          title="Edit Election"
                        >
                          <Edit3 size={14} />
                        </button>

                        {elec.status !== 'Closed' && (
                          <button
                            onClick={() => handleStatusChange(elec._id, 'Closed')}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            title="Close Poll"
                          >
                            <XCircle size={14} />
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(elec._id)}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                          title="Delete Election"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT ELECTION MODAL FOR ADMIN */}
      <AnimatePresence>
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !createSubmitting && setCreateModalOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl relative z-10 p-6 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0 mb-4">
                <h3 className="text-md font-black text-slate-800 flex items-center gap-2">
                  <CheckSquare size={18} className="text-indigo-600" />
                  {isEditing ? 'Edit Platform Election' : 'Create Platform Election / Poll'}
                </h3>
                <button 
                  onClick={() => setCreateModalOpen(false)} 
                  disabled={createSubmitting}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="overflow-y-auto pr-2 space-y-6 scrollbar-hide text-slate-800">
                {/* 1. Basic Details */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider border-b border-slate-100 pb-1">1. Basic Details</h4>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Election Title *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g., National Samaj Council Election 2026" 
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs text-slate-800 transition-all font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-semibold text-slate-800"
                      >
                        <option value="Platform Election">Platform Election</option>
                        <option value="Community Election">Community Election</option>
                        <option value="National Election">National Election</option>
                        <option value="Executive Council">Executive Council</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</label>
                      <input 
                        type="text" 
                        placeholder="e.g., General, Executive"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-semibold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description & Rules *</label>
                    <textarea 
                      rows="2"
                      required
                      placeholder="Explain the election purpose..."
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs text-slate-800 resize-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Date *</label>
                      <input 
                        type="datetime-local" 
                        required
                        value={formData.startDate}
                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs text-slate-800 transition-all font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">End Date *</label>
                      <input 
                        type="datetime-local" 
                        required
                        value={formData.endDate}
                        onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs text-slate-800 transition-all font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Target Audience / Whom to Send */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider border-b border-slate-100 pb-1">
                    2. Target Audience & Community Selection (Whom to send this election to)
                  </h4>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Audience Scope *</label>
                    <select
                      value={formData.targetAudience}
                      onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-semibold text-slate-800"
                    >
                      <option value="ALL">🌐 All (Global - Across All Communities)</option>
                      <option value="SPECIFIC_COMMUNITY">🏢 Specific Community (All Members of Selected Samaj)</option>
                      <option value="COMMUNITY_LOCATION">📍 Specific Community at Specific Location / City</option>
                      <option value="USERS_BY_LOCATION">🏙️ Location-Wise (All Samajs in Selected City)</option>
                      <option value="COMMUNITY_HEADS">👑 All Community Heads</option>
                      <option value="LOCAL_HEADS">🛡️ All Local Heads</option>
                      <option value="LOCAL_AND_SUB_HEADS">👥 Local Heads & Sub-Heads</option>
                      <option value="SPECIFIC_USERS">🎯 Specific Selected Users / Members</option>
                    </select>
                  </div>

                  {/* Specific Community Selector */}
                  {(formData.targetAudience === 'SPECIFIC_COMMUNITY' || formData.targetAudience === 'COMMUNITY_LOCATION') && (
                    <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Building2 size={13} className="text-indigo-600" /> Select Community *
                        </label>
                        <select
                          value={formData.communityId}
                          onChange={(e) => setFormData({ ...formData, communityId: e.target.value })}
                          required
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-semibold text-slate-800 mt-1"
                        >
                          <option value="">-- Choose Community --</option>
                          {targetOptions.communities.map((c) => (
                            <option key={c._id} value={c._id}>{c.name} {c.city ? `(${c.city})` : ''}</option>
                          ))}
                        </select>
                      </div>

                      {formData.targetAudience === 'COMMUNITY_LOCATION' && (
                        <div>
                          <label className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                            <MapPin size={13} className="text-indigo-600" /> Select Target City / Location *
                          </label>
                          <select
                            value={formData.targetCity}
                            onChange={(e) => setFormData({ ...formData, targetCity: e.target.value })}
                            required
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-semibold text-slate-800 mt-1"
                          >
                            <option value="">-- Choose City --</option>
                            {targetOptions.cities.map((city, idx) => (
                              <option key={idx} value={city}>{city}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Location-Wise across all communities */}
                  {formData.targetAudience === 'USERS_BY_LOCATION' && (
                    <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-2">
                      <label className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin size={13} className="text-indigo-600" /> Select Target City / Location *
                      </label>
                      <select
                        value={formData.targetCity}
                        onChange={(e) => setFormData({ ...formData, targetCity: e.target.value })}
                        required
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-semibold text-slate-800"
                      >
                        <option value="">-- Choose City --</option>
                        {targetOptions.cities.map((city, idx) => (
                          <option key={idx} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Specific Users Multi-Select */}
                  {formData.targetAudience === 'SPECIFIC_USERS' && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Users size={13} className="text-indigo-600" /> Select Specific Users ({formData.targetUsers?.length || 0} selected)
                        </label>
                        {formData.targetUsers?.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, targetUsers: [] })}
                            className="text-[10px] text-rose-600 font-bold hover:underline"
                          >
                            Clear All
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search user name or phone..."
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
                          />
                        </div>
                        <select
                          value={selectedUserFilterComm}
                          onChange={(e) => setSelectedUserFilterComm(e.target.value)}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 outline-none"
                        >
                          <option value="all">All Communities</option>
                          {targetOptions.communities.map((c) => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-slate-200/80 rounded-xl p-2 bg-white scrollbar-hide">
                        {filteredUsers.length === 0 ? (
                          <p className="text-[11px] text-slate-400 text-center py-4">No matching users found</p>
                        ) : (
                          filteredUsers.map(u => {
                            const isSelected = (formData.targetUsers || []).includes(u.id || u._id);
                            return (
                              <div
                                key={u.id || u._id}
                                onClick={() => toggleUserSelection(u.id || u._id)}
                                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${
                                  isSelected 
                                    ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900' 
                                    : 'hover:bg-slate-50 border-transparent text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                    isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                                  }`}>
                                    {isSelected && <Check size={11} strokeWidth={3} />}
                                  </div>
                                  <div className="truncate">
                                    <p className="text-xs font-bold leading-snug truncate">{u.name}</p>
                                    <p className="text-[10px] text-slate-400">
                                      {u.community ? `${u.community} • ` : ''}{u.role} {u.city ? `(${u.city})` : ''}
                                    </p>
                                  </div>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-400 shrink-0">{u.phone}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Candidates */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                    <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">3. Candidates (Min. 2)</h4>
                    <button 
                      type="button"
                      onClick={handleAddCandidate}
                      className="text-[9px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-2 py-1 rounded-md uppercase tracking-wider flex items-center gap-1 transition-colors"
                    >
                      <Plus size={12} /> Add Candidate
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {formData.candidates.map((cand, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 relative">
                        {formData.candidates.length > 2 && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveCandidate(idx)}
                            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg transition-colors"
                          >
                            <X size={14} />
                          </button>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Candidate #{idx + 1} Name *</label>
                            <input 
                              type="text" 
                              required
                              placeholder="Full Name"
                              value={cand.name}
                              onChange={(e) => handleCandidateChange(idx, 'name', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-semibold text-slate-800 transition-colors"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Age (Optional)</label>
                            <input 
                              type="number" 
                              placeholder="Age"
                              value={cand.age}
                              onChange={(e) => handleCandidateChange(idx, 'age', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs text-slate-800 transition-colors"
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Profession / Designation</label>
                            <input 
                              type="text" 
                              placeholder="e.g., Social Worker, Businessman, Advocate"
                              value={cand.profession}
                              onChange={(e) => handleCandidateChange(idx, 'profession', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs text-slate-800 transition-colors"
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Short Bio (Optional)</label>
                            <textarea 
                              rows="1"
                              placeholder="Brief description about candidate..."
                              value={cand.shortIntro}
                              onChange={(e) => handleCandidateChange(idx, 'shortIntro', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs text-slate-800 resize-none transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 shrink-0">
                  <button 
                    type="submit"
                    disabled={createSubmitting}
                    className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                  >
                    {createSubmitting ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Saving Election...</>
                    ) : (
                      isEditing ? 'Save Changes' : 'Publish Platform Election'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Election Detail Modal */}
      {selectedElection && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Election Audit & Vote Tally</p>
                <h3 className="text-lg font-black">{selectedElection.title}</h3>
              </div>
              <button 
                onClick={() => { setSelectedElection(null); setElectionDetails(null); }}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Description</p>
                <p className="font-semibold text-slate-800 leading-relaxed">{selectedElection.description}</p>
                <div className="pt-2 flex flex-wrap gap-4 text-[11px] text-slate-500 font-medium">
                  <span>Start: {new Date(selectedElection.startDate).toLocaleDateString()}</span>
                  <span>End: {new Date(selectedElection.endDate).toLocaleDateString()}</span>
                  <span>Community: {selectedElection.community}</span>
                </div>
              </div>

              {/* Candidate Vote Tally Breakdown */}
              <div>
                <h4 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-2">
                  <Award size={16} className="text-indigo-600" /> Candidate Vote Breakdown
                </h4>

                {detailsLoading ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border">
                    <RefreshCw size={20} className="text-indigo-600 animate-spin mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-500">Calculating vote tallies...</p>
                  </div>
                ) : electionDetails && electionDetails.candidates ? (
                  <div className="space-y-3">
                    {electionDetails.candidates.map((cand, idx) => {
                      const totalCast = electionDetails.totalVotesCast || 1;
                      const percentage = Math.round(((cand.votesCount || 0) / totalCast) * 100);

                      return (
                        <div key={cand._id || idx} className="p-3 bg-white border border-slate-200 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-xs">
                                {cand.initials || cand.name?.[0] || 'C'}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{cand.name}</p>
                                <p className="text-[10px] text-slate-400">{cand.profession || 'Candidate'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-indigo-700 text-sm">{cand.votesCount || 0} votes</p>
                              <p className="text-[10px] font-bold text-slate-400">{percentage}%</p>
                            </div>
                          </div>

                          {/* Vote Progress Bar */}
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No candidate details available.</p>
                )}
              </div>

              {/* Moderation Status Controls */}
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-indigo-900">Change Election Status</p>
                  <p className="text-[10px] text-indigo-700 font-semibold uppercase">{selectedElection.status}</p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {['Active', 'Upcoming', 'Completed', 'Closed'].map(st => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(selectedElection._id, st)}
                      disabled={selectedElection.status === st || actionLoading}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        selectedElection.status === st 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'bg-white text-slate-700 hover:bg-indigo-100 border border-indigo-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminVotingManagement;
