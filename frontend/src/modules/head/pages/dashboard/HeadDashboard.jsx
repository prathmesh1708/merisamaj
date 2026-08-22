import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, CheckCircle2, Heart, Calendar, Briefcase, Award, TrendingUp, 
  Search, ShieldAlert, Sparkles, Send, Plus, ChevronRight, X, Eye, 
  MapPin, Clock, ArrowUpRight, BarChart3, FileText, Check, AlertCircle, RefreshCw,
  Settings, Loader, ThumbsUp, DollarSign, UserCheck, Shield
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useHeadAuth } from '../../auth/useHeadAuth';
import { axiosPrivate } from '../../../../core/api/axiosPrivate';

export const HeadDashboard = () => {
  const navigate = useNavigate();
  const { headAuth } = useHeadAuth();
  const headUser = headAuth?.headUser;

  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [activeModal, setActiveModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);
  const [selectedProofMember, setSelectedProofMember] = useState(null);

  const [eventForm, setEventForm] = useState({
    title: '', date: '', time: '', venue: '', description: '', category: 'General'
  });
  const [announcementText, setAnnouncementText] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── 1. Fetch Consolidated Head Dashboard Stats ──
  const fetchDashboardStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosPrivate.get('/head/dashboard/stats');
      if (res.data?.status === 'success' && res.data?.data) {
        setStatsData(res.data.data);
      } else {
        setError('Unexpected response format from server');
      }
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
      setError(err.response?.data?.message || 'Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // ── 2. Member Verification Actions ──
  const handleApproveMember = async (id, name) => {
    setActionLoadingId(id);
    try {
      await axiosPrivate.patch(`/head/dashboard/members/${id}/approve`);
      showToast(`Approved membership for ${name}!`, 'success');
      if (selectedProofMember?._id === id || selectedProofMember?.id === id) {
        setSelectedProofMember(null);
      }
      fetchDashboardStats();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to approve member', 'warning');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectMember = async (id, name) => {
    setActionLoadingId(id);
    try {
      await axiosPrivate.patch(`/head/dashboard/members/${id}/reject`);
      showToast(`Rejected membership for ${name}`, 'warning');
      if (selectedProofMember?._id === id || selectedProofMember?.id === id) {
        setSelectedProofMember(null);
      }
      fetchDashboardStats();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject member', 'warning');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevokeMember = async (id, name) => {
    setActionLoadingId(id);
    try {
      await axiosPrivate.patch(`/head/dashboard/members/${id}/revoke`);
      showToast(`Revoked verification for ${name}`, 'success');
      fetchDashboardStats();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to revoke member verification', 'warning');
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── 3. Create Event Handler ──
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.date || !eventForm.venue) {
      showToast('Please fill in all required fields', 'warning');
      return;
    }
    try {
      await axiosPrivate.post('/head/events', {
        title: eventForm.title,
        date: eventForm.date,
        time: eventForm.time || '06:00 PM',
        venue: eventForm.venue,
        description: eventForm.description,
        category: eventForm.category
      });
      showToast(`Successfully created event: "${eventForm.title}"!`);
      setEventForm({ title: '', date: '', time: '', venue: '', description: '', category: 'General' });
      setActiveModal(null);
      fetchDashboardStats();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create event', 'warning');
    }
  };

  // ── 4. Broadcast Announcement Handler ──
  const handleSendAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementText.trim()) {
      showToast('Announcement content cannot be empty', 'warning');
      return;
    }
    try {
      await axiosPrivate.post('/head/social/posts', {
        content: announcementText,
        isAnnouncement: true
      });
      showToast('Global Announcement broadcasted successfully!');
      setAnnouncementText('');
      setActiveModal(null);
      fetchDashboardStats();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to broadcast announcement', 'warning');
    }
  };

  // Destructure safe defaults from backend payload
  const summary = statsData?.summary || {};
  const pendingList = statsData?.pendingMembersList || [];
  const recentRegistrations = statsData?.recentRegistrations || [];
  const upcomingEvents = statsData?.upcomingEventsList || [];
  const growthTrend = statsData?.memberGrowthTrend || [];
  const profCategories = statsData?.professionalCategoryBreakdown || [];
  const topContributors = statsData?.topContributors || [];

  // Client search filter for Recent Registrations Table
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return recentRegistrations;
    const query = searchQuery.toLowerCase();
    return recentRegistrations.filter(m => 
      (m.name && m.name.toLowerCase().includes(query)) ||
      (m.city && m.city.toLowerCase().includes(query)) ||
      (m.profession && m.profession.toLowerCase().includes(query))
    );
  }, [recentRegistrations, searchQuery]);

  // Max value calculation for growth chart bars
  const maxGrowthValue = useMemo(() => {
    if (growthTrend.length === 0) return 10;
    const max = Math.max(...growthTrend.map(g => g.count));
    return max > 0 ? max : 10;
  }, [growthTrend]);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative min-h-screen">

      {/* ─── TOAST NOTIFICATION ─── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border text-sm font-bold backdrop-blur-xl ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── STICKY HEADER BAR (WEB VIEW ONLY) ─── */}
      <div className="hidden md:flex px-5 py-3.5 bg-white/95 backdrop-blur-md border-b border-slate-200 flex-row items-center justify-between gap-3 sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100/60">
            <LayoutDashboardIcon size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] sm:text-base font-bold text-slate-900 tracking-tight truncate">
              President Dashboard
            </h1>
            <p className="text-[11px] sm:text-[12px] text-slate-500 font-medium mt-0.5 truncate flex items-center gap-1.5">
              <span className="truncate">{headUser?.community || 'Community Governance'}</span>
              <span>•</span>
              <span className="text-indigo-600 font-semibold shrink-0">Active Council Session</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide -mx-3.5 px-3.5 sm:mx-0 sm:px-0 pb-0.5 sm:pb-0">
          <button
            onClick={() => setActiveModal('approve')}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] sm:text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Check size={13} className="text-emerald-600" />
            <span>Approve Members</span>
            {pendingList.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 min-w-[16px] text-center rounded-full bg-rose-500 text-white text-[9px] font-extrabold leading-none animate-pulse">
                {pendingList.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveModal('event')}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] sm:text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Plus size={13} className="text-indigo-600" />
            <span>Create Event</span>
          </button>
          <button
            onClick={() => setActiveModal('announce')}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] sm:text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Send size={12} className="text-purple-600" />
            <span>Broadcast Announcement</span>
          </button>
          <button
            onClick={fetchDashboardStats}
            title="Refresh Data"
            disabled={loading}
            className="p-1.5 sm:p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ─── MAIN CONTENT BODY ─── */}
      <div className="p-3.5 sm:p-6 flex-1 overflow-y-auto space-y-4 sm:space-y-6">

        {loading && !statsData ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Loader size={32} className="text-indigo-600 animate-spin mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Loading Community Dashboard...</h3>
            <p className="text-xs text-slate-400 mt-1">Fetching dynamic statistics and community metrics</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-rose-50 border border-rose-100 text-center text-rose-700 my-6">
            <AlertCircle size={28} className="mx-auto mb-2 text-rose-500" />
            <h3 className="text-sm font-bold">Failed to load dashboard statistics</h3>
            <p className="text-xs mt-1 text-rose-600/90">{error}</p>
            <button onClick={fetchDashboardStats} className="mt-4 px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold shadow-sm active:scale-95">
              Retry Load
            </button>
          </div>
        ) : (
          <>
            {/* ─── 8 REQUIRED METRICS CARDS GRID ─── */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">

              {/* 1. Total Members */}
              <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <Users size={18} className="sm:w-5.5 sm:h-5.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Total Members</p>
                  <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">{summary.totalMembers || 0}</h3>
                  <p className="text-[10px] sm:text-[11px] text-emerald-600 font-semibold mt-0.5 truncate">Active: {summary.activeMembersCount || 0}</p>
                </div>
              </div>

              {/* 2. Pending Member Approvals */}
              <div className={`bg-white p-3.5 sm:p-5 rounded-2xl border shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4 transition-all ${pendingList.length > 0 ? 'border-rose-200 bg-rose-50/20' : 'border-slate-100'}`}>
                <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${pendingList.length > 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                  <UserCheck size={18} className="sm:w-5.5 sm:h-5.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Pending</p>
                    {pendingList.length > 0 ? (
                      <span className="text-[8px] sm:text-[9px] font-extrabold text-rose-600 bg-rose-100/70 px-1.5 py-0.2 rounded-full uppercase tracking-wider shrink-0">Action</span>
                    ) : (
                      <span className="text-[8px] sm:text-[9px] font-extrabold text-emerald-600 bg-emerald-100/70 px-1.5 py-0.2 rounded-full uppercase tracking-wider shrink-0">Clear</span>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">{summary.pendingMembersCount || 0}</h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 truncate">Verification</p>
                </div>
              </div>

              {/* 3. Active Matrimonial Profiles */}
              <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0 border border-pink-100">
                  <Heart size={18} className="sm:w-5.5 sm:h-5.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Matrimonial</p>
                  <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">{summary.activeMatrimonialCount || 0}</h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 truncate">Verified Match</p>
                </div>
              </div>

              {/* 4. Upcoming Events */}
              <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                  <Calendar size={18} className="sm:w-5.5 sm:h-5.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Events</p>
                  <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">{summary.upcomingEventsCount || 0}</h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 truncate">{summary.totalEventRSVPs || 0} RSVPs</p>
                </div>
              </div>

              {/* 5. Professional Listings Overview */}
              <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <Briefcase size={18} className="sm:w-5.5 sm:h-5.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Professionals</p>
                  <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">{summary.totalProfessionalsCount || 0}</h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 truncate">Directory</p>
                </div>
              </div>

              {/* 6. Community Posts & Likes (Engagement) */}
              <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <ThumbsUp size={18} className="sm:w-5.5 sm:h-5.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Posts & Likes</p>
                  <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">{summary.totalCommunityPosts || 0}</h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 truncate">{summary.totalCommunityLikes || 0} Likes</p>
                </div>
              </div>

              {/* 7. Total Community Funds Raised */}
              <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <DollarSign size={18} className="sm:w-5.5 sm:h-5.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Funds Raised</p>
                  <h3 className="text-base sm:text-xl font-black text-slate-900 tracking-tight mt-0.5 truncate">₹{(summary.totalFundsRaised || 0).toLocaleString('en-IN')}</h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 truncate">Total Raised</p>
                </div>
              </div>

              {/* 8. Active Member Ratio */}
              <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
                  <Award size={18} className="sm:w-5.5 sm:h-5.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Active Ratio</p>
                  <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                    {summary.totalMembers > 0 ? Math.round((summary.activeMembersCount / summary.totalMembers) * 100) : 100}%
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-emerald-600 font-semibold mt-0.5 truncate">Health</p>
                </div>
              </div>

            </section>

            {/* ─── REAL DATA DYNAMIC CHARTS SECTION ─── */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Chart 1: Member Growth Trend (Real Database Aggregation) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <BarChart3 size={16} className="text-indigo-600" />
                      Monthly Member Registration Growth
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Real community registration trajectory over recent months</p>
                  </div>
                </div>
                
                {growthTrend.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center bg-slate-50/50 rounded-xl border border-slate-100 text-center">
                    <p className="text-xs text-slate-400 font-semibold">No member registration data recorded yet.</p>
                  </div>
                ) : (
                  <div className="h-48 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
                    {growthTrend.map((item, idx) => {
                      const barHeight = Math.max(12, Math.round((item.count / maxGrowthValue) * 140));
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                          {/* Tooltip on hover */}
                          <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap z-10 pointer-events-none">
                            {item.count} Registered ({item.month} {item.year})
                          </div>
                          <span className="text-[10px] font-bold text-indigo-600">{item.count}</span>
                          <div 
                            style={{ height: `${barHeight}px` }} 
                            className="w-full max-w-[36px] bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg transition-all duration-500 group-hover:from-indigo-700 group-hover:to-indigo-500 shadow-sm"
                          />
                          <span className="text-[10px] font-bold text-slate-500">{item.month}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Chart 2: Professional Directory Breakdown */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Briefcase size={16} className="text-amber-500" />
                    Professional Categories
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Real distribution across directory domains</p>
                </div>

                {profCategories.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center bg-slate-50/50 rounded-xl border border-slate-100 text-center my-4">
                    <p className="text-xs text-slate-400 font-semibold">No professional listings added yet.</p>
                  </div>
                ) : (
                  <div className="my-4 space-y-2.5 max-h-44 overflow-y-auto pr-1">
                    {profCategories.map((cat, idx) => {
                      const totalProf = summary.totalProfessionalsCount || 1;
                      const percentage = Math.round((cat.count / totalProf) * 100);
                      const colors = ['bg-indigo-600', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500'];
                      const barColor = colors[idx % colors.length];

                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                            <span className="truncate max-w-[140px]">{cat.category}</span>
                            <span>{cat.count} ({percentage}%)</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </section>

            {/* ─── PENDING APPROVALS & QUICK NAV ─── */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Pending Approvals Widget */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-2">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <ShieldAlert size={16} className="text-amber-500" />
                      Pending Verification Requests
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Approve new member profiles to grant portal access</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                    {pendingList.length} Pending
                  </span>
                </div>

                <div className="p-4 space-y-3 overflow-y-auto max-h-[300px]">
                  {pendingList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center bg-slate-50/50 border border-slate-100 border-dashed rounded-2xl">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                        <Check size={18} />
                      </div>
                      <h4 className="text-xs font-bold text-slate-700">All Clear!</h4>
                      <p className="text-xs text-slate-400 mt-1">No pending verification requests in your community.</p>
                    </div>
                  ) : (
                    pendingList.map((member) => {
                      const memberId = member._id || member.id;
                      const isActing = actionLoadingId === memberId;

                      return (
                        <div key={memberId} className="p-3 rounded-xl bg-slate-50/50 border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-sm">
                              {member.name ? member.name.substring(0, 2).toUpperCase() : 'MB'}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800">{member.name}</h4>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {member.city || 'City N/A'} • {member.profession || 'Member'} • <span className="text-indigo-600 font-semibold">{member.phone}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => setSelectedProofMember(member)}
                              className="px-2.5 py-1 rounded-md text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Eye size={12} /> Verification Info
                            </button>
                            <button
                              disabled={isActing}
                              onClick={() => handleRejectMember(memberId, member.name)}
                              className="px-2.5 py-1 rounded-md text-rose-600 bg-rose-50 hover:bg-rose-100 text-xs font-bold border border-rose-100 transition-all cursor-pointer disabled:opacity-50"
                            >
                              Reject
                            </button>
                            <button
                              disabled={isActing}
                              onClick={() => handleApproveMember(memberId, member.name)}
                              className="px-2.5 py-1 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1"
                            >
                              {isActing ? <Loader size={12} className="animate-spin" /> : null}
                              Approve
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Streamlined Quick Navigation Tiles */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-500" />
                    Quick Shortcuts
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Streamlined portal navigation</p>
                </div>
                <div className="p-4 grid grid-cols-2 gap-3">
                  {[
                    { icon: Users, label: 'Members', color: 'text-purple-600', bg: 'bg-purple-50/50 hover:bg-purple-50 border-purple-100', path: '/head/census' },
                    { icon: Heart, label: 'Matrimonial', color: 'text-pink-600', bg: 'bg-pink-50/50 hover:bg-pink-50 border-pink-100', path: '/head/matrimonial' },
                    { icon: Calendar, label: 'Events', color: 'text-indigo-600', bg: 'bg-indigo-50/50 hover:bg-indigo-50 border-indigo-100', path: '/head/events' },
                    { icon: Briefcase, label: 'Professionals', color: 'text-amber-600', bg: 'bg-amber-50/50 hover:bg-amber-50 border-amber-100', path: '/head/professional' },
                    { icon: DollarSign, label: 'Funds & Donations', color: 'text-emerald-600', bg: 'bg-emerald-50/50 hover:bg-emerald-50 border-emerald-100', path: '/head/funds' },
                    { icon: Settings, label: 'Settings', color: 'text-slate-600', bg: 'bg-slate-50/50 hover:bg-slate-100 border-slate-200', path: '/head/profile/settings' },
                  ].map(({ icon: Icon, label, color, bg, path }) => (
                    <button 
                      key={label} 
                      onClick={() => navigate(path)} 
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all group duration-200 cursor-pointer ${bg}`}
                    >
                      <Icon size={16} className={`${color} group-hover:scale-110 duration-200`} />
                      <span className="text-xs font-bold text-slate-800 mt-3 block">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

            </section>

            {/* ─── RECENT REGISTRATIONS TABLE (REAL DB DATA) ─── */}
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Users size={16} className="text-indigo-600" />
                    Recent Registrations
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Chronological database registry of community accounts</p>
                </div>
                <div className="relative w-full sm:w-60">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name or city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      <th className="px-5 py-3">Member</th>
                      <th className="px-5 py-3">City</th>
                      <th className="px-5 py-3">Profession</th>
                      <th className="px-5 py-3">Registered</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-xs text-slate-400">No community account matches search query.</td>
                      </tr>
                    ) : (
                      filteredMembers.map((member) => {
                        const memberId = member._id || member.id;
                        const isVerified = member.verificationStatus === 'verified' || member.accountStatus === 'active';
                        const timeAgo = member.createdAt ? formatDistanceToNow(new Date(member.createdAt), { addSuffix: true }) : 'Recently';

                        return (
                          <tr key={memberId} className="hover:bg-slate-50/40 transition-colors group">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                                  {member.name ? member.name.substring(0, 2).toUpperCase() : 'MB'}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 text-sm">{member.name}</p>
                                  <p className="text-[10px] text-slate-400">{member.phone}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-slate-600 text-xs font-semibold">{member.city || 'Indore'}</td>
                            <td className="px-5 py-3.5 font-semibold text-indigo-600 text-xs">{member.profession || 'Registered Member'}</td>
                            <td className="px-5 py-3.5 text-slate-400 text-xs font-medium">{timeAgo}</td>
                            <td className="px-5 py-3.5">
                              {isVerified ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                  <Check size={10} /> Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                                  <AlertCircle size={10} /> Pending
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {isVerified ? (
                                  <button
                                    onClick={() => handleRevokeMember(memberId, member.name)}
                                    className="px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold border border-rose-100 transition-all cursor-pointer"
                                  >
                                    Revoke
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleApproveMember(memberId, member.name)}
                                    className="px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[10px] font-bold border border-emerald-100 transition-all cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                )}
                                <button
                                  onClick={() => setSelectedProofMember(member)}
                                  className="px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200 transition-all cursor-pointer"
                                >
                                  Details
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ─── EVENTS & TOP CONTRIBUTORS (REAL DB AGGREGATION) ─── */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Upcoming Events Desk */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-2">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Calendar size={16} className="text-indigo-600" />
                      Community Events Desk
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Upcoming assemblies and programs</p>
                  </div>
                  <button
                    onClick={() => setActiveModal('event')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Plus size={12} /> Add Event
                  </button>
                </div>

                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto max-h-[340px]">
                  {upcomingEvents.length === 0 ? (
                    <div className="col-span-2 flex flex-col items-center justify-center py-10 bg-slate-50 border border-slate-200 border-dashed rounded-2xl text-center">
                      <Calendar size={24} className="text-slate-300 mb-2" />
                      <p className="text-xs text-slate-500 font-bold">No upcoming events scheduled.</p>
                    </div>
                  ) : (
                    upcomingEvents.map((evt) => (
                      <div key={evt._id || evt.id} className="rounded-2xl border border-slate-100 bg-white p-4 flex flex-col justify-between shadow-sm hover:border-indigo-100 transition-all">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-indigo-50 text-indigo-600 border border-indigo-100">
                              {evt.category || 'General'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {evt.date ? new Date(evt.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'Upcoming'}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{evt.title}</h4>
                          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1"><MapPin size={10} /> {evt.venue || 'Samaj Bhawan'}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Real Top Contributors (Aggregated from Donation DB) */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Award size={16} className="text-amber-500" />
                    Top Donors & Supporters
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Real community fund contribution leaders</p>
                </div>

                <div className="p-4 space-y-3">
                  {topContributors.length === 0 ? (
                    <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-400 font-semibold">No recorded contribution transactions yet.</p>
                    </div>
                  ) : (
                    topContributors.map((c, idx) => (
                      <div key={c._id || idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-100 hover:bg-slate-50 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-xs shrink-0">
                            #{idx + 1}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">{c.name}</h4>
                            <p className="text-[10px] text-slate-400 font-medium">{c.city || 'Community Donor'} • {c.txnCount || 1} Txns</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                          ₹{(c.totalPaid || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </section>
          </>
        )}

      </div>

      {/* ─── ACTION MODALS ─── */}
      <AnimatePresence>

        {/* Modal 1: Approve Members */}
        {activeModal === 'approve' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 15 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 15 }} className="w-full max-w-2xl bg-white rounded-2xl border border-slate-100 shadow-xl relative z-10 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><ShieldAlert size={16} className="text-amber-500" /> Pending Account Verification</h3>
                <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"><X size={16} /></button>
              </div>
              <div className="p-5 space-y-3 overflow-y-auto max-h-[380px]">
                {pendingList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-10">No pending accounts require verification.</p>
                ) : (
                  pendingList.map((member) => {
                    const memberId = member._id || member.id;
                    return (
                      <div key={memberId} className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                            {member.name ? member.name.substring(0, 2).toUpperCase() : 'MB'}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">{member.name}</h4>
                            <p className="text-[10px] text-slate-400">{member.city} • {member.phone}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => handleRejectMember(memberId, member.name)} className="px-2.5 py-1.5 rounded-md bg-rose-50 text-rose-600 text-[10px] font-bold border border-rose-100 hover:bg-rose-100 transition-all cursor-pointer">Reject</button>
                          <button onClick={() => handleApproveMember(memberId, member.name)} className="px-2.5 py-1.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700 transition-all shadow-sm cursor-pointer">Approve</button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal 2: Create Event */}
        {activeModal === 'event' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 15 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 15 }} className="w-full max-w-lg bg-white rounded-2xl border border-slate-100 shadow-xl relative z-10 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Calendar size={16} className="text-indigo-600" /> Schedule Community Event</h3>
                <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"><X size={16} /></button>
              </div>
              <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Event Title *</label>
                  <input type="text" required placeholder="e.g., Annual Sneh Milan" value={eventForm.title} onChange={(e) => setEventForm({...eventForm, title: e.target.value})} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 text-sm text-slate-800" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date *</label>
                    <input type="date" required value={eventForm.date} onChange={(e) => setEventForm({...eventForm, date: e.target.value})} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 text-sm text-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time</label>
                    <input type="text" placeholder="e.g., 07:00 PM" value={eventForm.time} onChange={(e) => setEventForm({...eventForm, time: e.target.value})} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 text-sm text-slate-800" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Venue Location *</label>
                  <input type="text" required placeholder="e.g., Samaj Bhawan, Indore" value={eventForm.venue} onChange={(e) => setEventForm({...eventForm, venue: e.target.value})} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 text-sm text-slate-800" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
                  <select value={eventForm.category} onChange={(e) => setEventForm({...eventForm, category: e.target.value})} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 text-sm text-slate-800">
                    <option value="General">General Gatherings</option>
                    <option value="Festival">Festival & Satsang</option>
                    <option value="Youth">Youth Careers & Seminars</option>
                    <option value="Education">Education Awards</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm cursor-pointer active:scale-95 transition-all">
                  Publish Event
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal 3: Announcement */}
        {activeModal === 'announce' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 15 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 15 }} className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-xl relative z-10 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Send size={16} className="text-purple-600" /> Broadcast Announcement</h3>
                <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"><X size={16} /></button>
              </div>
              <form onSubmit={handleSendAnnouncement} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Announcement Text</label>
                  <textarea rows="4" required placeholder="Write official circular text here..." value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 text-sm text-slate-800 resize-none" />
                </div>
                <button type="submit" className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm cursor-pointer active:scale-95 transition-all">
                  Broadcast Announcement
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal 4: Member Verification Details / Proof Viewer */}
        {selectedProofMember && (
          <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedProofMember(null)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 15 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 15 }} className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-xl relative z-10 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Member Credential Summary</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Profile audit for {selectedProofMember.name}</p>
                </div>
                <button onClick={() => setSelectedProofMember(null)} className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"><X size={16} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Full Name:</span>
                    <span className="font-bold text-slate-900">{selectedProofMember.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Phone:</span>
                    <span className="font-bold text-slate-900">{selectedProofMember.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">City / Location:</span>
                    <span className="font-bold text-slate-900">{selectedProofMember.city || 'Indore'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Profession:</span>
                    <span className="font-bold text-slate-900">{selectedProofMember.profession || 'Member'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Aadhaar Status:</span>
                    <span className={`font-bold ${selectedProofMember.isAadharVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {selectedProofMember.isAadharVerified ? 'Aadhaar Verified' : 'Aadhaar Pending'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-center text-xs text-indigo-700">
                  <Shield size={16} className="mx-auto mb-1 text-indigo-600" />
                  <p className="font-medium">
                    {selectedProofMember.isAadharVerified 
                      ? 'Identity verified through government credential check.' 
                      : 'No document image uploaded yet. Verification pending manual head approval.'}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => handleRejectMember(selectedProofMember._id || selectedProofMember.id, selectedProofMember.name)} 
                    className="flex-1 py-2 rounded-lg bg-rose-50 text-rose-600 text-xs font-bold border border-rose-100 hover:bg-rose-100 transition-all text-center cursor-pointer"
                  >
                    Reject Account
                  </button>
                  <button 
                    onClick={() => handleApproveMember(selectedProofMember._id || selectedProofMember.id, selectedProofMember.name)} 
                    className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all text-center shadow-sm cursor-pointer"
                  >
                    Approve Account
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>
    </div>
  );
};

// Inline Icon Component
const LayoutDashboardIcon = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>
  </svg>
);

export default HeadDashboard;
