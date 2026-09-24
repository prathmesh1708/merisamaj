import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Search, CheckCircle, XCircle, AlertTriangle, Eye, Download,
  Users, MapPin, Briefcase, GraduationCap, X, ShieldCheck, FileText,
  TrendingUp, Grid, List, ChevronDown, ChevronLeft,
  ChevronRight, UserPlus, FileSearch, Sparkles, Loader2, RefreshCw, Trash2, Check,
  Flag, MessageCircle, Clock, ShieldAlert, CheckCircle2, AlertCircle, Calendar
} from 'lucide-react';
import { headMatrimonialService } from './headMatrimonialService';

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ title, val, sub, icon: Icon, color, onClick, active }) => (
  <button
    onClick={onClick}
    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between h-[115px] ${
      active
        ? 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white border-transparent shadow-lg shadow-purple-500/20 scale-[1.01]'
        : 'bg-white text-slate-800 border-slate-200 hover:border-purple-300 hover:shadow-xs'
    }`}
  >
    <div className="flex items-start justify-between w-full">
      <div>
        <p className={`text-xs font-bold uppercase tracking-wider ${active ? 'text-purple-100' : 'text-slate-500'}`}>
          {title}
        </p>
        <h3 className={`text-2xl font-black mt-1 ${active ? 'text-white' : 'text-slate-900'}`}>
          {val ?? '—'}
        </h3>
      </div>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        active ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-600 border border-purple-100'
      }`}>
        <Icon size={18} />
      </div>
    </div>
    <span className={`text-xs font-semibold truncate ${active ? 'text-purple-100' : 'text-slate-600'}`}>
      {sub}
    </span>
  </button>
);

// ─── Profile Detail Drawer ────────────────────────────────────────────────────
const ProfileDrawer = ({ profile, onClose, onVerify, onReject, loading }) => {
  const [tab, setTab] = useState('personal');
  const tabs = [
    { id: 'personal',  label: 'Personal Info',  icon: UserPlus },
    { id: 'education', label: 'Career & Education', icon: GraduationCap },
    { id: 'family',    label: 'Family Details',    icon: Users },
    { id: 'partner',   label: 'Preferences', icon: Heart },
    { id: 'audit',     label: 'Audit & Photos', icon: ShieldCheck },
  ];
  const p = profile;
  const name = p.personal?.fullName || p.userId?.name || 'Unknown';
  const photo = p.photos?.find(ph => ph.isPrimary)?.url || (p.photos && p.photos[0]?.url);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-slate-900/60 z-40 backdrop-blur-xs" />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white border-l border-slate-200 z-50 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-purple-200 overflow-hidden bg-slate-100 shrink-0">
              {photo ? <img src={photo} alt={name} className="w-full h-full object-cover" /> : (
                <div className="w-full h-full flex items-center justify-center text-purple-700 font-black text-lg">{name[0]}</div>
              )}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">{name}, {p.age ? `${p.age} yrs` : ''}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`px-2 py-0.5 rounded-md text-xs font-bold uppercase ${
                  p.verificationStatus === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {p.verificationStatus || 'unverified'}
                </span>
                <span className="text-xs font-semibold text-slate-500 capitalize">• Status: {p.status}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors border border-slate-200 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-slate-200 bg-white overflow-x-auto shrink-0 px-3 pt-2 scrollbar-none gap-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer shrink-0 ${
                tab === t.id
                  ? 'border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-xl font-extrabold'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {tab === 'personal' && (
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Full Name', p.personal?.fullName],
                ['Gender', p.personal?.gender],
                ['Date of Birth', p.personal?.dateOfBirth ? new Date(p.personal.dateOfBirth).toLocaleDateString('en-IN') : ''],
                ['Height', p.personal?.height ? `${p.personal.height} cm` : ''],
                ['Marital Status', p.personal?.maritalStatus],
                ['Community', p.personal?.community],
                ['Gotra', p.personal?.gotra],
                ['Religion', p.personal?.religion],
              ].map(([label, val]) => (
                <div key={label} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-xs font-bold text-slate-500 uppercase">{label}</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{val || '—'}</p>
                </div>
              ))}
              {p.about?.biography && (
                <div className="col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">About Candidate</p>
                  <p className="text-sm text-slate-800 leading-relaxed font-medium">"{p.about.biography}"</p>
                </div>
              )}
            </div>
          )}
          {tab === 'education' && (
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Qualification', p.education?.highestQualification],
                ['College / University', p.education?.college],
                ['Profession / Title', p.education?.profession || p.education?.occupation],
                ['Company Name', p.education?.company],
                ['Annual Income', p.education?.annualIncome],
                ['Work Location', p.location?.city],
              ].map(([label, val]) => (
                <div key={label} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-xs font-bold text-slate-500 uppercase">{label}</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{val || '—'}</p>
                </div>
              ))}
            </div>
          )}
          {tab === 'family' && (
            <div className="grid grid-cols-2 gap-4">
              {[
                ["Father's Occupation", p.family?.fatherOccupation],
                ["Mother's Occupation", p.family?.motherOccupation],
                ['Brothers', p.family?.brothers],
                ['Sisters', p.family?.sisters],
                ['Family Type', p.family?.familyType],
                ['Family Values', p.family?.familyValues],
              ].map(([label, val]) => (
                <div key={label} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-xs font-bold text-slate-500 uppercase">{label}</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{val ?? '—'}</p>
                </div>
              ))}
            </div>
          )}
          {tab === 'partner' && (
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Age Range Preference', p.preferences?.ageMin && p.preferences?.ageMax ? `${p.preferences.ageMin} – ${p.preferences.ageMax} yrs` : ''],
                ['Education Requirement', p.preferences?.education],
                ['Occupation Preference', p.preferences?.occupation],
                ['Community Preference', p.preferences?.community],
                ['City Preference', p.preferences?.city],
              ].map(([label, val]) => (
                <div key={label} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-xs font-bold text-slate-500 uppercase">{label}</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{val || '—'}</p>
                </div>
              ))}
              {p.about?.partnerExpectations && (
                <div className="col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Partner Expectations</p>
                  <p className="text-sm text-slate-800 leading-relaxed font-medium">{p.about.partnerExpectations}</p>
                </div>
              )}
            </div>
          )}
          {tab === 'audit' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Uploaded Profile Photos</p>
                <div className="flex gap-3 flex-wrap">
                  {p.photos?.map((ph, idx) => (
                    <div key={ph._id || idx} className="w-24 h-28 rounded-xl overflow-hidden border border-slate-300 bg-slate-100 shadow-xs">
                      <img src={ph.url} alt="profile" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {(!p.photos || p.photos.length === 0) && (
                    <p className="text-xs text-slate-400 font-semibold py-4">No photos uploaded yet.</p>
                  )}
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                <p className="font-bold text-slate-700 uppercase tracking-wider">Account Audit Log</p>
                <p className="text-slate-600">Created Date: <strong className="text-slate-900">{p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '—'}</strong></p>
                <p className="text-slate-600">Last Modified: <strong className="text-slate-900">{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('en-IN') : '—'}</strong></p>
                <p className="text-slate-600">Verification Status: <strong className="text-purple-700 capitalize">{p.verificationStatus || 'Not verified'}</strong></p>
                {p.verificationNote && <p className="text-amber-700 font-semibold">Note: {p.verificationNote}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <button onClick={() => onVerify(p._id)} disabled={loading || p.verificationStatus === 'verified'}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm">
              {loading ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={14} />}
              Approve & Verify Profile
            </button>
            <button onClick={() => onReject(p._id, 'rejected')} disabled={loading}
              className="px-4 py-2.5 bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer">
              Reject / Request Fix
            </button>
          </div>
          <button onClick={() => onReject(p._id, 'hidden')}
            className="p-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors border border-rose-200 cursor-pointer" title="Hide Profile from Public Search">
            <Trash2 size={16} />
          </button>
        </div>
      </motion.div>
    </>
  );
};

// ─── Main Matrimonial Management Desk ─────────────────────────────────────────
export default function MatrimonialManagement() {
  const [activeTab, setActiveTab]       = useState('profiles'); // 'profiles' | 'marriage_requests' | 'reports' | 'married'
  const [profiles, setProfiles]         = useState([]);
  const [stats,    setStats]            = useState(null);
  const [reports,  setReports]          = useState([]);
  const [marriageRequests, setMarriageRequests] = useState([]);
  const [marriedMembers, setMarriedMembers] = useState([]);

  const [loading,  setLoading]          = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedReport, setSelectedReport]   = useState(null);
  const [reportActionNotes, setReportActionNotes] = useState('');
  const [reportSuspendProfile, setReportSuspendProfile] = useState(false);

  const [searchQuery, setSearchQuery]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verifyFilter, setVerifyFilter] = useState('all');
  const [reportStatusFilter, setReportStatusFilter] = useState('all');
  const [requestStatusFilter, setRequestStatusFilter] = useState('all');
  const [viewMode, setViewMode]         = useState('grid');
  const [currentPage, setCurrentPage]   = useState(1);
  const [toast, setToast]               = useState(null);
  const itemsPerPage = 8;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [profRes, statsRes, repRes, reqRes, marRes] = await Promise.allSettled([
        headMatrimonialService.getCommunityProfiles({ limit: 100 }),
        headMatrimonialService.getCommunityStats(),
        headMatrimonialService.getCommunityReports({ limit: 50 }),
        headMatrimonialService.getCommunityMarriageRequests({ limit: 50 }),
        headMatrimonialService.getMarriedMembers({ limit: 50 })
      ]);
      if (profRes.status  === 'fulfilled') setProfiles(profRes.value.data?.data?.profiles || []);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data?.data || {});
      if (repRes.status   === 'fulfilled') setReports(repRes.value.data?.data?.reports || []);
      if (reqRes.status   === 'fulfilled') setMarriageRequests(reqRes.value.data?.data?.requests || []);
      if (marRes.status   === 'fulfilled') setMarriedMembers(marRes.value.data?.data?.profiles || []);
    } catch (err) {
      console.error('Failed to load matrimonial data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const envSocketUrl = import.meta.env.VITE_SOCKET_URL;
    const envApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
    let SOCKET_URL = envSocketUrl
      || (envApiUrl ? envApiUrl.replace(/\/api\/v1\/?$/, '') : '')
      || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5001');

    if (typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      if (!envSocketUrl || envSocketUrl === '/' || envSocketUrl.includes('localhost') || envSocketUrl.includes('127.0.0.1')) {
        SOCKET_URL = window.location.origin;
      }
    }
    const token = localStorage.getItem('head_auth_token');
    
    const socket = io(SOCKET_URL, {
      auth: { token, role: 'head' },
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.on('head:matrimonial_update', () => {
      loadAll();
    });

    return () => socket.disconnect();
  }, [loadAll]);

  // Derived stats
  const derivedStats = useMemo(() => {
    const total      = profiles.length;
    const grooms     = profiles.filter(p => p.personal?.gender === 'male').length;
    const brides     = profiles.filter(p => p.personal?.gender === 'female').length;
    const pendingVer = profiles.filter(p => p.verificationStatus === 'pending' || p.verificationStatus === 'unverified').length;
    const reported   = reports.filter(r => r.status === 'pending').length;
    const married    = marriedMembers.length || profiles.filter(p => p.status === 'married' || p.isClosed).length;
    const pendingReqs = marriageRequests.filter(r => r.status === 'pending').length;
    return { total, grooms, brides, pendingVer, reported, married, pendingReqs };
  }, [profiles, reports, marriedMembers, marriageRequests]);

  // Filtered Profiles
  const filteredProfiles = useMemo(() => {
    let result = [...profiles];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => {
        const name = p.personal?.fullName || p.userId?.name || '';
        return name.toLowerCase().includes(q) || (p.location?.city || '').toLowerCase().includes(q);
      });
    }
    if (statusFilter !== 'all') result = result.filter(p => p.status === statusFilter);
    if (verifyFilter !== 'all') result = result.filter(p => p.verificationStatus === verifyFilter);
    return result;
  }, [profiles, searchQuery, statusFilter, verifyFilter]);

  // Filtered Reports
  const filteredReports = useMemo(() => {
    let list = [...reports];
    if (reportStatusFilter !== 'all') {
      list = list.filter(r => r.status === reportStatusFilter);
    }
    return list;
  }, [reports, reportStatusFilter]);

  // Filtered Marriage Requests
  const filteredRequests = useMemo(() => {
    let list = [...marriageRequests];
    if (requestStatusFilter !== 'all') {
      list = list.filter(r => r.status === requestStatusFilter);
    }
    return list;
  }, [marriageRequests, requestStatusFilter]);

  const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage);
  const paginated  = filteredProfiles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Profile Verification Action
  const handleVerify = async (id, action = 'verified') => {
    setActionLoading(true);
    try {
      await headMatrimonialService.verifyProfile(id, { status: action });
      showToast(`Profile verification set to: ${action} ✅`);
      setSelectedProfile(null);
      await loadAll();
    } catch {
      showToast('Action failed. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Report Resolution Action
  const handleResolveReport = async (reportId, action) => {
    setActionLoading(true);
    try {
      await headMatrimonialService.resolveReport(reportId, {
        action,
        adminNotes: reportActionNotes,
        suspendUser: reportSuspendProfile
      });
      showToast(`Report ${action === 'actioned' ? 'Actioned & Enforced' : 'Dismissed'} successfully!`);
      setSelectedReport(null);
      setReportActionNotes('');
      setReportSuspendProfile(false);
      await loadAll();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to resolve report', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Gender', 'Age', 'City', 'Status', 'Verification'];
    const rows = filteredProfiles.map(p => [
      `"${p.personal?.fullName || p.userId?.name || ''}"`, p.personal?.gender || '', p.age || '',
      `"${p.location?.city || ''}"`, p.status || '', p.verificationStatus || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `MatrimonialExport_${new Date().toISOString().split('T')[0]}.csv`
    });
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showToast('Exported matrimonial directory to CSV.');
  };

  if (loading && profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
        <p className="text-sm text-slate-600 font-bold uppercase tracking-wider">Loading Community Matrimonial Desk...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl border shadow-xl flex items-center gap-2.5 font-bold text-xs ${
              toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
            {toast.type === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <Heart size={22} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">
              Matrimonial Management
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Community Matrimonial Governance, Profile Approvals & Moderation Desk
            </p>
          </div>
        </div>
        <div className="flex gap-2.5 items-center">
          <button onClick={loadAll} className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold hover:bg-slate-100 text-slate-700 transition-all flex items-center gap-2 cursor-pointer">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={exportCSV} className="px-3.5 py-2 rounded-xl bg-purple-50 border border-purple-200 text-xs font-bold hover:bg-purple-100 text-purple-700 transition-all flex items-center gap-2 cursor-pointer">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </header>

      {/* 5 Quick Stats Navigation Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard
          title="Total Profiles"
          val={derivedStats.total}
          sub={`${derivedStats.grooms} Grooms · ${derivedStats.brides} Brides`}
          icon={Users}
          color="from-purple-50 to-indigo-50"
          active={activeTab === 'profiles'}
          onClick={() => setActiveTab('profiles')}
        />
        <StatCard
          title="Pending Verify"
          val={derivedStats.pendingVer}
          sub="Requires Approval"
          icon={FileSearch}
          color="from-sky-50 to-blue-50"
          active={activeTab === 'profiles' && verifyFilter === 'pending'}
          onClick={() => { setActiveTab('profiles'); setVerifyFilter('pending'); }}
        />
        <StatCard
          title="Reports & Issues"
          val={derivedStats.reported}
          sub="Open Complaints"
          icon={AlertTriangle}
          color="from-rose-50 to-red-50"
          active={activeTab === 'reports'}
          onClick={() => setActiveTab('reports')}
        />
        <StatCard
          title="Marriage Requests"
          val={derivedStats.pendingReqs}
          sub="Active Proposals"
          icon={Sparkles}
          color="from-amber-50 to-orange-50"
          active={activeTab === 'marriage_requests'}
          onClick={() => setActiveTab('marriage_requests')}
        />
        <StatCard
          title="Married Couples"
          val={derivedStats.married}
          sub="Closed / Success"
          icon={Heart}
          color="from-pink-50 to-rose-50"
          active={activeTab === 'married'}
          onClick={() => setActiveTab('married')}
        />
      </div>

      {/* Desk Switcher Navigation Tabs */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'profiles', label: 'Profiles Directory & Verification', icon: Users, count: derivedStats.total },
          { id: 'reports', label: 'Reports & Complaints Desk', icon: Flag, count: derivedStats.reported, badgeColor: 'bg-rose-600' },
          { id: 'marriage_requests', label: 'Marriage Requests', icon: MessageCircle, count: derivedStats.pendingReqs, badgeColor: 'bg-amber-600' },
          { id: 'married', label: 'Married Couples Archive', icon: Heart, count: derivedStats.married, badgeColor: 'bg-pink-600' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shrink-0 border ${
              activeTab === t.id
                ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
            }`}
          >
            <t.icon size={15} />
            <span>{t.label}</span>
            {t.count !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === t.id ? 'bg-white text-purple-900' : `${t.badgeColor || 'bg-slate-200'} text-white`
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── TAB 1: PROFILES DIRECTORY & VERIFICATION ─── */}
      {activeTab === 'profiles' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by candidate name or city..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white" />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer">
                <option value="all">All Status</option>
                {['active', 'inactive', 'hidden', 'suspended'].map(s => (
                  <option key={s} value={s}>{s.toUpperCase()}</option>
                ))}
              </select>
              <select value={verifyFilter} onChange={e => setVerifyFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer">
                <option value="all">All Verification</option>
                {['verified', 'pending', 'unverified', 'rejected'].map(s => (
                  <option key={s} value={s}>{s.toUpperCase()}</option>
                ))}
              </select>
              <div className="flex gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1 shrink-0">
                {[{ id: 'grid', icon: Grid }, { id: 'list', icon: List }].map(m => (
                  <button key={m.id} onClick={() => setViewMode(m.id)}
                    className={`p-2 rounded-lg transition-all cursor-pointer ${viewMode === m.id ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-200'}`}>
                    <m.icon size={15} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Showing <strong>{filteredProfiles.length}</strong> of {profiles.length} community matrimonial profiles</span>
              {(statusFilter !== 'all' || verifyFilter !== 'all' || searchQuery) && (
                <button
                  onClick={() => { setStatusFilter('all'); setVerifyFilter('all'); setSearchQuery(''); }}
                  className="text-purple-600 hover:underline cursor-pointer font-bold"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Profiles Cards / Table */}
          {paginated.length === 0 ? (
            <div className="bg-white p-12 text-center text-slate-500 font-bold rounded-2xl border border-slate-200">
              No matrimonial profiles match your current search/filter.
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {paginated.map(p => {
                const name  = p.personal?.fullName || p.userId?.name || 'Unknown';
                const photo = p.photos?.find(ph => ph.isPrimary)?.url || (p.photos && p.photos[0]?.url);
                return (
                  <div key={p._id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="relative h-48 bg-slate-100">
                      {photo ? (
                        <img src={photo} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl font-black text-purple-300">{name[0]}</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                      <div className="absolute bottom-2.5 left-3 right-3">
                        <h4 className="text-sm font-black text-white truncate">{name}, {p.age ? `${p.age} yrs` : ''}</h4>
                        <p className="text-xs text-slate-200 font-medium mt-0.5 flex items-center gap-1">
                          <MapPin size={12} /> {p.location?.city || 'Community'}
                        </p>
                      </div>
                      <div className="absolute top-2.5 right-2.5">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase shadow-xs ${
                          p.verificationStatus === 'verified' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                        }`}>{p.verificationStatus || 'unverified'}</span>
                      </div>
                    </div>
                    <div className="p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
                        <span className="truncate max-w-[140px]">{p.education?.profession || p.education?.highestQualification || 'Professional'}</span>
                        <span className="capitalize">{p.personal?.maritalStatus || 'Single'}</span>
                      </div>
                      <button onClick={() => setSelectedProfile(p)}
                        className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
                        <Eye size={14} /> Review Profile
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {['Candidate', 'Location & Gotra', 'Status', 'Verification', 'Action'].map(h => (
                      <th key={h} className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map(p => {
                    const name  = p.personal?.fullName || p.userId?.name || 'Unknown';
                    const photo = p.photos?.find(ph => ph.isPrimary)?.url || (p.photos && p.photos[0]?.url);
                    return (
                      <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                              {photo ? <img src={photo} alt={name} className="w-full h-full object-cover" /> : (
                                <div className="w-full h-full flex items-center justify-center text-purple-700 font-black text-sm">{name[0]}</div>
                              )}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-900 text-xs">{name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{p.age ? `${p.age} yrs` : ''} · {p.personal?.gender || ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 font-medium">
                          <p className="font-bold text-slate-900">{p.location?.city || '—'}</p>
                          <p className="text-xs text-slate-500">{p.personal?.gotra ? `Gotra: ${p.personal.gotra}` : ''}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">{p.status}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-extrabold uppercase ${
                            p.verificationStatus === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>{p.verificationStatus || 'unverified'}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <button onClick={() => setSelectedProfile(p)}
                            className="px-3.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border border-purple-200">
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 bg-white p-4 rounded-2xl">
              <span className="text-xs text-slate-600 font-bold">Page {currentPage} of {totalPages}</span>
              <div className="flex gap-1.5">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 cursor-pointer"><ChevronLeft size={16} /></button>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 cursor-pointer"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: REPORTS & COMPLAINTS MODERATION DESK ─── */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Flag size={18} className="text-rose-600" /> Member Reports & Moderation Queue
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Complaints filed by community members regarding profile validity or behavior</p>
            </div>
            <select
              value={reportStatusFilter}
              onChange={e => setReportStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">All Reports</option>
              <option value="pending">Pending Review</option>
              <option value="actioned">Actioned / Enforced</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          {filteredReports.length === 0 ? (
            <div className="bg-white p-12 text-center text-slate-500 font-semibold rounded-2xl border border-slate-200 space-y-2">
              <ShieldCheck size={40} className="mx-auto text-emerald-600 mb-2" />
              <p className="text-sm font-bold text-slate-900">No reports found</p>
              <p className="text-xs text-slate-500">The matrimonial community has no pending complaints matching this filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredReports.map(rep => {
                const reporterName = rep.reporterId?.name || 'Community Member';
                const reportedName = rep.reportedUserId?.name || 'Reported Candidate';
                const isPending = rep.status === 'pending';

                return (
                  <div key={rep._id} className={`p-5 rounded-2xl border transition-all ${
                    isPending ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200 bg-white shadow-xs'
                  }`}>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                            isPending ? 'bg-rose-600 text-white' :
                            rep.status === 'actioned' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {rep.status}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs font-bold uppercase">
                            Reason: {rep.reason?.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                            <Clock size={13} /> {rep.createdAt ? new Date(rep.createdAt).toLocaleString('en-IN') : '—'}
                          </span>
                        </div>

                        <div className="text-xs font-extrabold text-slate-900 mt-1">
                          <span className="text-rose-700">Reported Candidate: {reportedName}</span>
                          <span className="text-slate-300 mx-2">•</span>
                          <span className="text-slate-600">Reported by: {reporterName}</span>
                        </div>

                        {rep.description && (
                          <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 mt-2 italic font-medium">
                            "{rep.description}"
                          </p>
                        )}

                        {rep.adminNotes && (
                          <p className="text-xs text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-1">
                            <strong>Head Note:</strong> {rep.adminNotes} (Reviewed by {rep.reviewedBy?.name || 'Head'})
                          </p>
                        )}
                      </div>

                      {isPending && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setSelectedReport(rep)}
                            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                          >
                            <ShieldAlert size={15} /> Resolve Report
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: MARRIAGE REQUESTS DESK ─── */}
      {activeTab === 'marriage_requests' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Heart size={18} className="text-pink-600" /> Community Marriage Confirmation Requests
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Member-to-member marriage confirmation milestones in your community</p>
            </div>
            <select
              value={requestStatusFilter}
              onChange={e => setRequestStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">All Requests</option>
              <option value="pending">Pending Confirmation</option>
              <option value="accepted">Accepted / Matched</option>
              <option value="rejected">Declined</option>
            </select>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="bg-white p-12 text-center text-slate-500 font-semibold rounded-2xl border border-slate-200 space-y-2">
              <Heart size={40} className="mx-auto text-pink-500 mb-2" />
              <p className="text-sm font-bold text-slate-900">No marriage requests recorded</p>
              <p className="text-xs text-slate-500">Connected members will appear here once marriage confirmations are initiated.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRequests.map(req => {
                const reqName = req.requesterId?.name || 'Requester';
                const recName = req.receiverId?.name || 'Receiver';

                return (
                  <div key={req._id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-black uppercase ${
                        req.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                        req.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {req.status}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {req.requestedAt ? new Date(req.requestedAt).toLocaleDateString('en-IN') : '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 py-2">
                      <div className="flex-1 text-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-xs font-black text-slate-900">{reqName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{req.requesterId?.city || 'Candidate'}</p>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center shrink-0 border border-pink-200">
                        <Heart size={16} />
                      </div>
                      <div className="flex-1 text-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-xs font-black text-slate-900">{recName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{req.receiverId?.city || 'Candidate'}</p>
                      </div>
                    </div>

                    {req.message && (
                      <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                        "{req.message}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: MARRIED COUPLES ARCHIVE ─── */}
      {activeTab === 'married' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Heart size={18} className="text-rose-600" /> Community Successful Marriages Archive
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Official community records of successfully matched and married members</p>
            </div>
            <span className="px-3.5 py-1 rounded-xl bg-pink-50 text-pink-700 text-xs font-bold border border-pink-200">
              {marriedMembers.length} Marriages
            </span>
          </div>

          {marriedMembers.length === 0 ? (
            <div className="bg-white p-12 text-center text-slate-500 font-semibold rounded-2xl border border-slate-200 space-y-2">
              <Sparkles size={40} className="mx-auto text-amber-500 mb-2" />
              <p className="text-sm font-bold text-slate-900">No closed marriages in records yet</p>
              <p className="text-xs text-slate-500">Matched couples will appear here once profiles are marked closed as married.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {marriedMembers.map(m => {
                const name = m.personal?.fullName || m.userId?.name || 'Community Member';
                const partnerName = m.marriageConfirmedWith?.name || 'Spouse';
                const photo = m.photos?.find(ph => ph.isPrimary)?.url || (m.photos && m.photos[0]?.url);

                return (
                  <div key={m._id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between gap-3 hover:border-pink-300 transition-all">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 border-2 border-pink-200 shrink-0">
                        {photo ? <img src={photo} alt={name} className="w-full h-full object-cover" /> : (
                          <div className="w-full h-full flex items-center justify-center text-pink-700 font-black text-lg">{name[0]}</div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{name} & {partnerName}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{m.location?.city || 'Community'}</p>
                      </div>
                    </div>
                    <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between text-xs text-slate-500 font-bold">
                      <span className="text-emerald-700">Status: Married ✅</span>
                      <span>{m.closedAt ? new Date(m.closedAt).toLocaleDateString('en-IN') : 'Registered'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Profile Detail Drawer */}
      <AnimatePresence>
        {selectedProfile && (
          <ProfileDrawer
            profile={selectedProfile}
            onClose={() => setSelectedProfile(null)}
            onVerify={(id) => handleVerify(id, 'verified')}
            onReject={(id, action = 'rejected') => handleVerify(id, action)}
            loading={actionLoading}
          />
        )}
      </AnimatePresence>

      {/* Report Resolution Modal */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedReport(null)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl z-10 space-y-4 border border-slate-200">
              
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="text-rose-600" size={18} /> Resolve Community Report
                </h3>
                <button onClick={() => setSelectedReport(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"><X size={18} /></button>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-slate-700">
                  <strong>Reported Member:</strong> <span className="text-slate-900 font-extrabold">{selectedReport.reportedUserId?.name}</span>
                </p>
                <p className="text-slate-700">
                  <strong>Reason:</strong> <span className="text-rose-700 font-extrabold uppercase">{selectedReport.reason?.replace(/_/g, ' ')}</span>
                </p>
                {selectedReport.description && (
                  <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 italic font-medium">
                    "{selectedReport.description}"
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Head Resolution Notes</label>
                <textarea
                  value={reportActionNotes}
                  onChange={e => setReportActionNotes(e.target.value)}
                  placeholder="Enter notes on actions taken or reasons for decision..."
                  className="w-full h-24 p-3 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 resize-none font-medium"
                />
              </div>

              <div className="flex items-center gap-2.5 p-3 bg-rose-50 rounded-xl border border-rose-200">
                <input
                  type="checkbox"
                  id="suspendUser"
                  checked={reportSuspendProfile}
                  onChange={e => setReportSuspendProfile(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer w-4 h-4"
                />
                <label htmlFor="suspendUser" className="text-xs font-bold text-rose-900 cursor-pointer">
                  Suspend candidate's matrimonial profile visibility
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
                <button
                  onClick={() => handleResolveReport(selectedReport._id, 'dismissed')}
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase cursor-pointer"
                >
                  Dismiss Report
                </button>
                <button
                  onClick={() => handleResolveReport(selectedReport._id, 'actioned')}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
                  Enforce Action
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
