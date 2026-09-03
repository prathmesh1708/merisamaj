import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Search, CheckCircle, XCircle, AlertTriangle, Eye, Download,
  Users, MapPin, Briefcase, GraduationCap, X, ShieldCheck, FileText,
  Image as ImageIcon, TrendingUp, Grid, List, ChevronDown, ChevronLeft,
  ChevronRight, UserPlus, FileSearch, Sparkles, Loader2, RefreshCw, Trash2, Check
} from 'lucide-react';
import { headMatrimonialService } from './headMatrimonialService';

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ title, val, sub, icon: Icon, color }) => (
  <div className={`card-neo bg-gradient-to-br ${color} border-white/5 p-4 flex flex-col justify-between h-[110px] transition-all hover:scale-[1.02] duration-300`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-black mt-1 text-white">{val ?? '—'}</h3>
      </div>
      <Icon size={18} className="opacity-70 text-white" />
    </div>
    <span className="text-[9px] text-white/70 font-bold uppercase">{sub}</span>
  </div>
);

// ─── Profile Detail Drawer ────────────────────────────────────────────────────
const ProfileDrawer = ({ profile, onClose, onVerify, onReject, loading }) => {
  const [tab, setTab] = useState('personal');
  const tabs = [
    { id: 'personal',  label: 'Personal',  icon: UserPlus },
    { id: 'education', label: 'Career',    icon: GraduationCap },
    { id: 'family',    label: 'Family',    icon: Users },
    { id: 'partner',   label: 'Preferences',icon: Heart },
    { id: 'audit',     label: 'Audit',     icon: ShieldCheck },
  ];
  const p = profile;
  const name = p.personal?.fullName || p.userId?.name || 'Unknown';
  const photo = p.photos?.find(ph => ph.isPrimary)?.url;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black z-40" />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 right-0 w-full max-w-2xl bg-[#0c0533] border-l border-white/10 z-50 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-[#120739]/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-purple-500/30 overflow-hidden bg-white/5">
              {photo ? <img src={photo} alt={name} className="w-full h-full object-cover" /> : (
                <div className="w-full h-full flex items-center justify-center text-purple-300 font-black">{name[0]}</div>
              )}
            </div>
            <div>
              <h3 className="text-sm font-black text-white">{name}, {p.age || '—'}</h3>
              <div className="text-[9px] text-purple-300 font-bold uppercase tracking-wider mt-0.5">
                {p.status} · {p.verificationStatus || 'unverified'}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"><X size={16} /></button>
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-white/5 bg-[#120739]/30 overflow-x-auto shrink-0 px-2 pt-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all border-b-2 ${
                tab === t.id ? 'border-purple-500 text-purple-300 bg-purple-500/5 rounded-t-xl' : 'border-transparent text-white/40 hover:text-white'
              }`}>
              <t.icon size={12} />{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
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
                <div key={label}>
                  <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">{label}</p>
                  <p className="text-xs font-bold text-white mt-0.5">{val || '—'}</p>
                </div>
              ))}
              {p.about?.biography && (
                <div className="col-span-2 mt-2 pt-4 border-t border-white/5">
                  <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider mb-1">About</p>
                  <p className="text-[11px] text-purple-200 italic leading-relaxed">"{p.about.biography}"</p>
                </div>
              )}
            </div>
          )}
          {tab === 'education' && (
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Qualification', p.education?.highestQualification],
                ['College', p.education?.college],
                ['Profession', p.education?.profession || p.education?.occupation],
                ['Company', p.education?.company],
                ['Annual Income', p.education?.annualIncome],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">{label}</p>
                  <p className="text-xs font-bold text-white mt-0.5">{val || '—'}</p>
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
                <div key={label}>
                  <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">{label}</p>
                  <p className="text-xs font-bold text-white mt-0.5">{val ?? '—'}</p>
                </div>
              ))}
            </div>
          )}
          {tab === 'partner' && (
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Age Range', p.preferences?.ageMin && p.preferences?.ageMax ? `${p.preferences.ageMin}–${p.preferences.ageMax} yrs` : ''],
                ['Education', p.preferences?.education],
                ['Occupation', p.preferences?.occupation],
                ['Community', p.preferences?.community],
                ['City', p.preferences?.city],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">{label}</p>
                  <p className="text-xs font-bold text-white mt-0.5">{val || '—'}</p>
                </div>
              ))}
              {p.about?.partnerExpectations && (
                <div className="col-span-2">
                  <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider mb-1">Expectations</p>
                  <p className="text-[11px] text-purple-200 italic">{p.about.partnerExpectations}</p>
                </div>
              )}
            </div>
          )}
          {tab === 'audit' && (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2">Profile Photos</p>
                <div className="flex gap-3 flex-wrap">
                  {p.photos?.filter(ph => ph.status === 'approved').map(ph => (
                    <img key={ph._id} src={ph.url} alt="profile" className="w-20 h-24 rounded-xl object-cover border border-white/10" />
                  ))}
                  {!p.photos?.length && <p className="text-xs text-white/30 font-semibold">No approved photos.</p>}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2">Status Timeline</p>
                <div className="text-xs text-white/50 space-y-1">
                  <p>Created: {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '—'}</p>
                  <p>Updated: {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('en-IN') : '—'}</p>
                  <p>Verification: <span className="text-purple-300 font-bold">{p.verificationStatus || 'Not verified'}</span></p>
                  {p.verificationNote && <p className="text-amber-300 font-semibold">Note: {p.verificationNote}</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-white/10 bg-[#120739]/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => onVerify(p._id)} disabled={loading || p.verificationStatus === 'verified'}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5">
              {loading ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
              Verify
            </button>
            <button onClick={() => onReject(p._id)} disabled={loading}
              className="px-3 py-2 bg-white/5 border border-white/10 hover:border-rose-500/30 text-white/60 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors">
              Request Corrections
            </button>
          </div>
          <button onClick={() => { onReject(p._id, 'rejected'); }}
            className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-colors border border-rose-500/20" title="Reject">
            <Trash2 size={15} />
          </button>
        </div>
      </motion.div>
    </>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MatrimonialManagement() {
  const [profiles, setProfiles]         = useState([]);
  const [stats,    setStats]            = useState(null);
  const [reports,  setReports]          = useState([]);
  const [loading,  setLoading]          = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verifyFilter, setVerifyFilter] = useState('all');
  const [viewMode, setViewMode]         = useState('grid');
  const [currentPage, setCurrentPage]   = useState(1);
  const [toast, setToast]               = useState(null);
  const itemsPerPage = 8;

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [profRes, statsRes, repRes] = await Promise.allSettled([
        headMatrimonialService.getCommunityProfiles({ limit: 100 }),
        headMatrimonialService.getCommunityStats(),
        headMatrimonialService.getCommunityReports({ limit: 50 }),
      ]);
      if (profRes.status  === 'fulfilled') setProfiles(profRes.value.data.data.profiles || []);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data || {});
      if (repRes.status   === 'fulfilled') setReports(repRes.value.data.data.reports || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── Socket.IO Auto-Refresh ───────────────────────────────────────────────
  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
      || (import.meta.env.VITE_API_URL?.replace(/\/api\/v1\/?$/, ''))
      || 'http://localhost:5000';
    const token = localStorage.getItem('head_auth_token');
    
    const socket = io(SOCKET_URL, {
      auth: { token, role: 'head' },
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.on('head:matrimonial_update', () => {
      loadAll(); // Auto refresh all stats and lists
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
    const married    = profiles.filter(p => p.status === 'married' || p.isClosed).length;
    return { total, grooms, brides, pendingVer, reported, married };
  }, [profiles, reports]);

  // Filter pipeline
  const filteredProfiles = useMemo(() => {
    let result = [...profiles];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => {
        const name = p.personal?.fullName || p.userId?.name || '';
        return name.toLowerCase().includes(q) || p.location?.city?.toLowerCase().includes(q);
      });
    }
    if (statusFilter !== 'all') result = result.filter(p => p.status === statusFilter);
    if (verifyFilter !== 'all') result = result.filter(p => p.verificationStatus === verifyFilter);
    return result;
  }, [profiles, searchQuery, statusFilter, verifyFilter]);

  const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage);
  const paginated  = filteredProfiles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleVerify = async (id, action = 'verified') => {
    setActionLoading(true);
    try {
      await headMatrimonialService.verifyProfile(id, { status: action });
      showToast(`Profile ${action} ✅`);
      setSelectedProfile(null);
      await loadAll();
    } catch { showToast('Action failed', 'error'); }
    finally { setActionLoading(false); }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Gender', 'Age', 'City', 'Status', 'Verification'];
    const rows = filteredProfiles.map(p => [
      `"${p.personal?.fullName || ''}"`, p.personal?.gender, p.age,
      `"${p.location?.city || ''}"`, p.status, p.verificationStatus
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `MatrimonialExport_${new Date().toISOString().split('T')[0]}.csv`
    });
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showToast('Exported to CSV.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 relative">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl flex items-center gap-2.5 font-bold text-xs ${
              toast.type === 'error' ? 'bg-rose-500/25 border-rose-500/40 text-rose-200' : 'bg-emerald-500/25 border-emerald-500/40 text-emerald-200'
            }`}>
            {toast.type === 'error' ? <XCircle size={16} /> : <CheckCircle size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header (Web View Only) */}
      <header className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-2.5">
            <Heart className="text-rose-500" size={24} /> Matrimonial Management
          </h1>
          <p className="text-[10px] text-white/40 mt-1 uppercase font-bold tracking-widest">Community Profile Oversight</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadAll} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2">
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={exportCSV} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2">
            <Download size={13} /> Export CSV
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Profiles"   val={derivedStats.total}    sub={`${derivedStats.grooms} Grooms · ${derivedStats.brides} Brides`} icon={Users}       color="from-purple-500/20 to-indigo-500/20" />
        <StatCard title="Pending Verify"   val={derivedStats.pendingVer} sub="Needs verification"     icon={FileSearch} color="from-sky-500/20 to-blue-500/20" />
        <StatCard title="Open Reports"     val={derivedStats.reported} sub="Pending resolution"       icon={AlertTriangle} color="from-rose-500/20 to-red-500/20" />
        <StatCard title="Community Subs"   val={stats?.activeSubscriptions ?? '—'} sub="Active memberships" icon={Sparkles} color="from-amber-500/20 to-orange-500/20" />
        <StatCard title="Total Marriages"  val={derivedStats.married} sub="Closed profiles"          icon={Heart} color="from-pink-500/20 to-rose-500/20" />
      </div>

      {/* Filters */}
      <div className="card-neo p-4 space-y-4 bg-white/2">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name or city..."
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white/70 focus:outline-none">
            <option value="all">All Status</option>
            {['active', 'inactive', 'hidden', 'banned'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={verifyFilter} onChange={e => setVerifyFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white/70 focus:outline-none">
            <option value="all">All Verification</option>
            {['verified', 'pending', 'unverified', 'rejected'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
            {[{ id: 'grid', icon: Grid }, { id: 'list', icon: List }].map(m => (
              <button key={m.id} onClick={() => setViewMode(m.id)}
                className={`p-2 rounded-lg transition-all ${viewMode === m.id ? 'bg-purple-500 text-white' : 'text-white/40 hover:bg-white/5'}`}>
                <m.icon size={13} />
              </button>
            ))}
          </div>
        </div>
        <p className="text-[10px] text-white/30 font-semibold">{filteredProfiles.length} profiles</p>
      </div>

      {/* Grid / List */}
      {paginated.length === 0 ? (
        <div className="card-neo p-12 text-center text-white/30 font-semibold">No profiles match your filters.</div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {paginated.map(p => {
            const name  = p.personal?.fullName || p.userId?.name || 'Unknown';
            const photo = p.photos?.find(ph => ph.isPrimary)?.url;
            return (
              <div key={p._id} className="card-neo overflow-hidden group hover:border-purple-500/30 transition-all">
                <div className="relative h-44 bg-white/5">
                  {photo ? (
                    <img src={photo} alt={name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl font-black text-purple-400/30">{name[0]}</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#120739] via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <h4 className="text-sm font-black text-white truncate">{name}, {p.age || '—'}</h4>
                    <p className="text-[10px] text-white/60 mt-0.5">{p.location?.city || ''}</p>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                      p.verificationStatus === 'verified' ? 'bg-emerald-500/80 text-white' : 'bg-amber-500/80 text-white'
                    }`}>{p.verificationStatus || 'unverified'}</span>
                  </div>
                </div>
                <div className="p-3 bg-white/2">
                  {p.isClosed && (
                    <div className="mb-2 w-full text-center">
                      <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-pink-500/20 text-pink-400 border border-pink-500/30">
                        Closed (Married)
                      </span>
                    </div>
                  )}
                  <button onClick={() => setSelectedProfile(p)}
                    className="w-full py-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1.5">
                    <Eye size={12} /> Review
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card-neo overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-white/2">
                {['Profile', 'Location', 'Status', 'Verification', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(p => {
                const name  = p.personal?.fullName || p.userId?.name || 'Unknown';
                const photo = p.photos?.find(ph => ph.isPrimary)?.url;
                return (
                  <tr key={p._id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0">
                          {photo ? <img src={photo} alt={name} className="w-full h-full object-cover" /> : (
                            <div className="w-full h-full flex items-center justify-center text-purple-300 font-black text-sm">{name[0]}</div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white">{name}</p>
                          <p className="text-[9px] text-white/30 mt-0.5">{p.age ? `${p.age} yrs` : ''} · {p.personal?.gender || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/50">{p.location?.city || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-white/5 text-white/60">{p.status}</span>
                        {p.isClosed && (
                          <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-pink-500/20 text-pink-400 border border-pink-500/30">
                            Closed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                        p.verificationStatus === 'verified' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                      }`}>{p.verificationStatus || 'unverified'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedProfile(p)}
                        className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-[9px] font-bold uppercase hover:bg-purple-500/40 transition-colors">
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
        <div className="flex items-center justify-between border-t border-white/5 pt-4">
          <span className="text-[10px] text-white/30 font-bold">Page {currentPage} of {totalPages}</span>
          <div className="flex gap-1">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30"><ChevronLeft size={14} /></button>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30"><ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      {/* Profile Drawer */}
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
    </div>
  );
}
