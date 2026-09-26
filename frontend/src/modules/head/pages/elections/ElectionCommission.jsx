import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Vote, Plus, CheckCircle2, Award, Trash2, X, BarChart3, Clock, Lock, AlertCircle,
  Users, MapPin, Shield, Search, Check, Edit3, Filter, Building2, UserCheck, ChevronRight
} from 'lucide-react';
import headVotingService from '../../../../core/api/headVotingService';

export const ElectionCommission = () => {
  const [activeModal, setActiveModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);
  
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  // Target options from backend (cities, local heads, sub heads, community members)
  const [targetOptions, setTargetOptions] = useState({
    isLocalHead: false,
    userCity: '',
    communityName: '',
    communityId: null,
    cities: [],
    localHeads: [],
    subHeads: [],
    members: []
  });
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUserFilterCity, setSelectedUserFilterCity] = useState('all');

  // Form State
  const initialForm = {
    title: '', 
    description: '', 
    type: 'Community Election',
    category: 'General',
    startDate: '', 
    endDate: '', 
    targetAudience: 'ALL_MEMBERS',
    targetCity: '',
    targetUsers: [],
    candidates: [
      { name: '', age: '', profession: '', shortIntro: '' },
      { name: '', age: '', profession: '', shortIntro: '' }
    ]
  };
  const [formData, setFormData] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchElections = async () => {
    try {
      setLoading(true);
      const res = await headVotingService.getElections();
      if (res.status === 'success') {
        setElections(res.data);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTargetOptions = async () => {
    try {
      const res = await headVotingService.getTargetOptions();
      if (res.status === 'success') {
        setTargetOptions(res.data);
        if (res.data.isLocalHead && !isEditing) {
          setFormData(prev => ({
            ...prev,
            targetAudience: 'ALL_LOCAL_USERS',
            targetCity: res.data.userCity || ''
          }));
        }
      }
    } catch (err) {
      console.warn('Failed to load target options:', err.message);
    }
  };

  useEffect(() => {
    fetchElections();
    fetchTargetOptions();
  }, []);

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3500);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      ...initialForm,
      targetAudience: targetOptions.isLocalHead ? 'ALL_LOCAL_USERS' : 'ALL_MEMBERS',
      targetCity: targetOptions.isLocalHead ? targetOptions.userCity : ''
    });
    fetchTargetOptions();
    setActiveModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (el) => {
    setIsEditing(true);
    setEditingId(el.id || el._id);

    // Format dates for datetime-local input
    const formatForInput = (d) => {
      if (!d) return '';
      const date = new Date(d);
      const pad = (n) => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    setFormData({
      title: el.title || '',
      description: el.description || '',
      type: el.type || 'Community Election',
      category: el.category || 'General',
      startDate: formatForInput(el.startDate),
      endDate: formatForInput(el.endDate),
      targetAudience: el.targetAudience || (targetOptions.isLocalHead ? 'ALL_LOCAL_USERS' : 'ALL_MEMBERS'),
      targetCity: el.targetCity || el.city || '',
      targetUsers: Array.isArray(el.targetUsers) ? el.targetUsers.map(u => u._id || u.id || u) : [],
      candidates: Array.isArray(el.candidates) && el.candidates.length >= 2 
        ? el.candidates.map(c => ({
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
    setActiveModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.startDate || !formData.endDate || formData.candidates.some(c => !c.name.trim())) {
      showToast('Please fill in all required fields (including candidate names)', true);
      return;
    }

    const needsCity = [
      'USERS_BY_LOCATION', 
      'LOCAL_HEADS_BY_LOCATION', 
      'LOCAL_AND_SUB_HEADS_BY_LOCATION',
      'LOCAL_SUB_HEADS'
    ].includes(formData.targetAudience);

    if (needsCity && !formData.targetCity && !targetOptions.isLocalHead) {
      showToast('Please select a target city/location for this election', true);
      return;
    }

    if (formData.targetAudience === 'SPECIFIC_USERS' && (!formData.targetUsers || formData.targetUsers.length === 0)) {
      showToast('Please select at least 1 specific member for this election', true);
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditing && editingId) {
        const res = await headVotingService.updateElection(editingId, formData);
        if (res.status === 'success') {
          showToast(`Successfully updated election: "${formData.title}"!`);
          setActiveModal(false);
          fetchElections();
        }
      } else {
        const res = await headVotingService.createElection(formData);
        if (res.status === 'success') {
          showToast(`Successfully launched election: "${formData.title}"!`);
          setActiveModal(false);
          fetchElections();
        }
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || err.message || 'Failed to save election', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this election? This can only be done if there are no votes.")) return;
    try {
      await headVotingService.deleteElection(id);
      showToast('Election deleted successfully');
      fetchElections();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete', true);
    }
  };

  const handleCloseElection = async (id) => {
    if (!window.confirm("Are you sure you want to manually close this election and publish final results?")) return;
    try {
      await headVotingService.closeElection(id);
      showToast('Election closed and results published successfully');
      fetchElections();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to close', true);
    }
  };

  const handleAddCandidateInput = () => {
    setFormData({ 
      ...formData, 
      candidates: [...formData.candidates, { name: '', age: '', profession: '', shortIntro: '' }] 
    });
  };

  const handleRemoveCandidateInput = (idx) => {
    if (formData.candidates.length <= 2) return;
    const updated = [...formData.candidates];
    updated.splice(idx, 1);
    setFormData({ ...formData, candidates: updated });
  };

  const handleCandidateChange = (idx, field, value) => {
    const updated = [...formData.candidates];
    updated[idx][field] = value;
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

  // Filter members for picker
  const filteredMembers = useMemo(() => {
    return (targetOptions.members || []).filter(m => {
      const matchesSearch = !userSearchQuery || 
        (m.name && m.name.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
        (m.phone && m.phone.includes(userSearchQuery));
      const matchesCity = selectedUserFilterCity === 'all' || m.city?.toLowerCase() === selectedUserFilterCity.toLowerCase();
      return matchesSearch && matchesCity;
    });
  }, [targetOptions.members, userSearchQuery, selectedUserFilterCity]);

  const formatAudienceLabel = (el) => {
    const aud = el.targetAudience || 'ALL_MEMBERS';
    const city = el.targetCity || el.city;
    if (aud === 'ALL_MEMBERS') return `🏢 Entire Samaj (${el.communityName || 'Community'})`;
    if (aud === 'LOCAL_HEADS') return '🛡️ All Local Heads';
    if (aud === 'LOCAL_HEADS_BY_LOCATION') return `📍 Local Heads (${city || 'City'})`;
    if (aud === 'LOCAL_AND_SUB_HEADS') return '👥 Local & Sub-Heads';
    if (aud === 'LOCAL_AND_SUB_HEADS_BY_LOCATION' || aud === 'LOCAL_SUB_HEADS') return `📌 Local Sub-Heads (${city || 'City'})`;
    if (aud === 'USERS_BY_LOCATION' || aud === 'ALL_LOCAL_USERS' || aud === 'COMMUNITY_LOCATION') return `🏙️ Location (${city || 'City'})`;
    if (aud === 'SPECIFIC_USERS') return `🎯 Specific Members (${el.targetUsers?.length || 'Selected'})`;
    return '🏢 Community';
  };

  // Filtered elections list
  const filteredElections = useMemo(() => {
    return elections.filter(el => {
      const matchesStatus = statusFilter === 'ALL' || el.status?.toUpperCase() === statusFilter;
      const matchesSearch = !searchFilter.trim() || 
        el.title?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        el.description?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (el.targetCity && el.targetCity.toLowerCase().includes(searchFilter.toLowerCase()));
      return matchesStatus && matchesSearch;
    });
  }, [elections, statusFilter, searchFilter]);

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 font-sans space-y-6 pb-12">
      
      {/* ─── TOAST ─── */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border backdrop-blur-md ${
          toast.isError ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
        }`}>
          {toast.isError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span className="text-sm font-bold tracking-wide">{toast.msg}</span>
        </div>
      )}

      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-100 p-6 rounded-3xl shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Vote size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                Election Commission
                {targetOptions.communityName && (
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                    {targetOptions.communityName}
                  </span>
                )}
              </h2>
              <p className="text-slate-500 text-xs font-semibold mt-0.5">
                {targetOptions.isLocalHead 
                  ? `Local Head jurisdiction: ${targetOptions.userCity || 'Assigned Area'} • Create & administer local elections`
                  : `Community Head Portal • Create elections targeted to all members, specific cities, or local heads`}
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={handleOpenCreateModal}
          className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-95 text-white font-bold rounded-2xl text-[12.5px] transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 whitespace-nowrap"
        >
          <Plus size={16} /> Create Election
        </button>
      </div>

      {/* ─── CONTROLS & FILTER BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
          {['ALL', 'ACTIVE', 'UPCOMING', 'COMPLETED', 'CLOSED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === tab 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab === 'ALL' ? 'All Elections' : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search elections or city..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* ─── LOADER / ERROR ─── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-9 h-9 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="text-center py-10 text-rose-600 bg-rose-50 rounded-2xl border border-rose-200">
          {error}
        </div>
      ) : filteredElections.length === 0 ? (
        <div className="text-center py-20 text-slate-400 bg-white border border-slate-200 border-dashed rounded-3xl space-y-3">
          <Vote size={48} className="mx-auto text-slate-300" />
          <p className="font-bold text-slate-600 text-sm">No elections found.</p>
          <p className="text-xs text-slate-400">Click "Create Election" to launch a community ballot or location-targeted election.</p>
        </div>
      ) : (
        /* ─── ELECTION CARDS GRID ─── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredElections.map((el) => {
            const hasVotes = el.totalVotes > 0;
            return (
              <div key={el.id || el._id} className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-all space-y-4">
                <div className="space-y-2.5">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 leading-tight pr-2">{el.title}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          {el.type}
                        </span>
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {formatAudienceLabel(el)}
                        </span>
                        {el.category && el.category !== 'General' && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                            {el.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider shrink-0 border ${
                      el.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 animate-pulse' : 
                      el.status === 'Upcoming' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                      'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {el.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{el.description}</p>
                </div>

                {/* Candidates & Votes mapping */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 size={12} className="text-indigo-600" /> Live Ballot Tally
                    </h4>
                    <span className="text-[10.5px] font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                      {el.totalVotes} Total Votes
                    </span>
                  </div>
                  
                  <div className="space-y-2.5">
                    {(el.candidates || []).map((c, idx) => {
                      const percent = el.totalVotes > 0 ? Math.round((c.votes / el.totalVotes) * 100) : 0;
                      return (
                        <div key={idx} className="space-y-1 bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                          <div className="flex justify-between text-[11px] text-slate-700 font-semibold">
                            <span className="truncate pr-2">{c.name} {c.profession ? `(${c.profession})` : ''}</span>
                            <span className="font-bold text-indigo-600 shrink-0">{c.votes || 0} votes ({percent}%)</span>
                          </div>
                          <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card Footer with actions */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[10.5px] font-semibold text-slate-500 gap-2">
                  <span className="flex items-center gap-1">
                    <Clock size={12} className="text-amber-500" /> {el.startDateFormatted} - {el.endDateFormatted}
                  </span>
                  
                  <div className="flex items-center gap-2.5">
                    {/* Edit Button */}
                    <button 
                      onClick={() => handleOpenEditModal(el)}
                      className="text-indigo-600 hover:text-indigo-800 font-bold transition-colors flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100"
                    >
                      <Edit3 size={12} /> Edit
                    </button>

                    {/* Delete Button */}
                    {(el.status === 'Upcoming' || el.status === 'Draft' || !hasVotes) && (
                      <button 
                        onClick={() => handleDelete(el.id || el._id)} 
                        className="text-rose-500 hover:text-rose-700 font-bold transition-colors flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    )}

                    {/* Force Close Button */}
                    {el.status === 'Active' && (
                      <button 
                        onClick={() => handleCloseElection(el.id || el._id)} 
                        className="text-amber-600 hover:text-amber-800 font-bold transition-colors flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200"
                      >
                        <Lock size={12} /> Close & Publish
                      </button>
                    )}

                    {(el.status === 'Completed' || el.status === 'Closed') && (
                      <span className="text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                        <CheckCircle2 size={12} /> Results Published
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── CREATE / EDIT BALLOT MODAL ─── */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setActiveModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl relative z-10 p-6 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Vote size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">
                      {isEditing ? 'Edit Election Details' : 'Configure New Election'}
                    </h3>
                    <p className="text-[10.5px] text-slate-400 font-semibold">
                      {targetOptions.communityName ? `Samaj: ${targetOptions.communityName}` : 'Community Election'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveModal(false)} 
                  disabled={isSubmitting}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="overflow-y-auto pr-2 space-y-6 scrollbar-hide text-slate-800">
                
                {/* Section 1: Basic Details */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider border-b border-slate-100 pb-1 flex items-center gap-1.5">
                    1. Basic Election Information
                  </h4>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Election Title *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g., Rajput Samaj Executive President Election 2026" 
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs text-slate-800 transition-all font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Election Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-semibold text-slate-800"
                      >
                        <option value="Community Election">Community Election</option>
                        <option value="Committee Election">Committee Election</option>
                        <option value="Presidential Election">Presidential Election</option>
                        <option value="Executive Council">Executive Council</option>
                        <option value="Local Chapter Election">Local Chapter Election</option>
                        <option value="Youth Wing Election">Youth Wing Election</option>
                        <option value="Women Wing Election">Women Wing Election</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</label>
                      <input 
                        type="text" 
                        placeholder="e.g., General, Executive, Regional"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-semibold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description & Voting Instructions *</label>
                    <textarea 
                      rows="2"
                      required
                      placeholder="Explain the eligibility, agenda, and voting instructions for members..."
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs text-slate-800 resize-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Date & Time *</label>
                      <input 
                        type="datetime-local" 
                        required
                        value={formData.startDate}
                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs text-slate-800 transition-all font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">End Date & Time *</label>
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

                {/* Section 2: Target Audience / Whom to Send */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider border-b border-slate-100 pb-1 flex items-center gap-1.5">
                    2. Target Audience & Eligibility (Whom to show/send this election to)
                  </h4>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Recipient Target *</label>
                    <select
                      value={formData.targetAudience}
                      onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-semibold text-slate-800"
                    >
                      {targetOptions.isLocalHead ? (
                        <>
                          <option value="ALL_LOCAL_USERS">🏙️ All Samaj Members in My Jurisdiction ({targetOptions.userCity || 'City'})</option>
                          <option value="LOCAL_SUB_HEADS">👥 Local Sub-Heads in My Jurisdiction</option>
                          <option value="SPECIFIC_USERS">🎯 Specific Selected Members in My City</option>
                        </>
                      ) : (
                        <>
                          <option value="ALL_MEMBERS">🏢 All Community Members (Entire {targetOptions.communityName || 'Samaj'})</option>
                          <option value="USERS_BY_LOCATION">🏙️ Community Members by Location / City</option>
                          <option value="LOCAL_HEADS">🛡️ All Local Heads in Community</option>
                          <option value="LOCAL_HEADS_BY_LOCATION">📍 Local Heads by Location / City</option>
                          <option value="LOCAL_AND_SUB_HEADS">👥 All Local Heads & Sub-Heads in Community</option>
                          <option value="LOCAL_AND_SUB_HEADS_BY_LOCATION">📌 Local Heads & Sub-Heads by Location / City</option>
                          <option value="SPECIFIC_USERS">🎯 Specific Selected Members</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Location Selector (when location-based targeting is chosen) */}
                  {[
                    'USERS_BY_LOCATION', 
                    'LOCAL_HEADS_BY_LOCATION', 
                    'LOCAL_AND_SUB_HEADS_BY_LOCATION',
                    'LOCAL_SUB_HEADS'
                  ].includes(formData.targetAudience) && (
                    <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2">
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

                  {/* Specific Users Multi-Select (when SPECIFIC_USERS is chosen) */}
                  {formData.targetAudience === 'SPECIFIC_USERS' && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Users size={13} className="text-indigo-600" /> Select Specific Members ({formData.targetUsers?.length || 0} selected)
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

                      {/* Search & City Filter Bar */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search by member name or phone..."
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
                          />
                        </div>
                        {!targetOptions.isLocalHead && targetOptions.cities.length > 0 && (
                          <select
                            value={selectedUserFilterCity}
                            onChange={(e) => setSelectedUserFilterCity(e.target.value)}
                            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 outline-none"
                          >
                            <option value="all">All Cities</option>
                            {targetOptions.cities.map((c, i) => (
                              <option key={i} value={c}>{c}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Member List with Checkboxes */}
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-slate-200/80 rounded-xl p-2 bg-white scrollbar-hide">
                        {filteredMembers.length === 0 ? (
                          <p className="text-[11px] text-slate-400 text-center py-4">No matching members found</p>
                        ) : (
                          filteredMembers.map(m => {
                            const isSelected = (formData.targetUsers || []).includes(m.id || m._id);
                            return (
                              <div
                                key={m.id || m._id}
                                onClick={() => toggleUserSelection(m.id || m._id)}
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
                                    <p className="text-xs font-bold leading-snug truncate">{m.name}</p>
                                    <p className="text-[10px] text-slate-400">
                                      {m.city ? `${m.city} • ` : ''}{m.role === 'sub_head' ? 'Local Head' : 'Member'}
                                    </p>
                                  </div>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-400 shrink-0">{m.phone}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 3: Candidates */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                    <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                      3. Candidates / Contestants (Min. 2)
                    </h4>
                    <button 
                      type="button"
                      onClick={handleAddCandidateInput}
                      className="text-[9.5px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1 transition-colors"
                    >
                      <Plus size={12} /> Add Candidate
                    </button>
                  </div>
                  
                  <div className="space-y-3.5">
                    {formData.candidates.map((cand, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 relative">
                        {formData.candidates.length > 2 && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveCandidateInput(idx)}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md transition-colors"
                          >
                            <X size={13} />
                          </button>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">Candidate #{idx + 1} Name *</label>
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
                            <label className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">Age (Optional)</label>
                            <input 
                              type="number" 
                              placeholder="Age"
                              value={cand.age}
                              onChange={(e) => handleCandidateChange(idx, 'age', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs text-slate-800 transition-colors"
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">Profession / Designation</label>
                            <input 
                              type="text" 
                              placeholder="e.g., Social Worker, Entrepreneur, Advocate"
                              value={cand.profession}
                              onChange={(e) => handleCandidateChange(idx, 'profession', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs text-slate-800 transition-colors"
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">Short Bio / Manifesto</label>
                            <textarea 
                              rows="1"
                              placeholder="Brief background or vision of candidate..."
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
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold uppercase tracking-wider text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                  >
                    {isSubmitting ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Saving Election...</>
                    ) : (
                      isEditing ? 'Save Changes' : 'Publish Election'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ElectionCommission;
