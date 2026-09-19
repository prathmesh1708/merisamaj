import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, Search, Filter, CheckCircle, XCircle, Eye, Download, Users, 
  MapPin, Calendar, Clock, Sparkles, X, ChevronDown, Trash2, Globe, Flame
} from 'lucide-react';
import { axiosPrivate } from '../../../../core/api/axiosPrivate';

export const AdminObituaryManagement = () => {
  const [obituaries, setObituaries] = useState([]);
  const [obituariesLoading, setObituariesLoading] = useState(true);
  const [obituariesError, setObituariesError] = useState(null);

  const [communities, setCommunities] = useState([]);
  const [selectedObituary, setSelectedObituary] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid | table
  const [searchQuery, setSearchQuery] = useState('');
  const [communityFilter, setCommunityFilter] = useState('all');
  const [ceremonyFilter, setCeremonyFilter] = useState('all');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAdminObituaries = async () => {
    setObituariesLoading(true);
    setObituariesError(null);
    try {
      const res = await axiosPrivate.get('/admin/obituaries');
      setObituaries(res.data.data || []);
    } catch (err) {
      console.error('Failed to load admin obituaries:', err);
      setObituariesError(err.response?.data?.message || err.message || 'Failed to load obituaries');
    } finally {
      setObituariesLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminObituaries();
  }, []);

  // Lock background scroll when detail modal popup is active
  useEffect(() => {
    if (selectedObituary) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedObituary]);

  // Fetch Communities for filtering
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const res = await axiosPrivate.get('/admin/communities');
        setCommunities(res.data.data || []);
      } catch (err) {
        console.error('Failed to load communities for obituary management', err);
      }
    };
    fetchCommunities();
  }, []);

  // Filter Obituaries
  const filteredObituaries = useMemo(() => {
    return obituaries.filter((ob) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = ob.deceasedName?.toLowerCase().includes(q) || ob.deceasedNameEn?.toLowerCase().includes(q);
        const matchAuthor = ob.author?.name?.toLowerCase().includes(q);
        const matchCommunity = ob.community?.toLowerCase().includes(q);
        if (!matchName && !matchAuthor && !matchCommunity) return false;
      }

      // 2. Community Filter
      if (communityFilter !== 'all') {
        const selectedComm = communities.find(c => (c._id || c.id) === communityFilter || c.name?.toLowerCase() === communityFilter.toLowerCase());
        const targetId = (communityFilter || '').toString().toLowerCase();
        const targetName = (selectedComm?.name || communityFilter || '').toString().toLowerCase();

        const obCommId = (ob.communityId?._id || ob.communityId || '').toString().toLowerCase();
        const obCommName = (ob.communityId?.name || ob.community || ob.communityName || ob.author?.community || '').toString().toLowerCase();

        // 1. Direct ID match
        const isIdMatch = obCommId && obCommId === targetId;

        // 2. Name Match (Substring or exact)
        const cleanStr = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetClean = cleanStr(targetName);
        const obClean = cleanStr(obCommName);

        const isNameMatch = targetClean && obClean && (
          obClean.includes(targetClean) || 
          targetClean.includes(obClean)
        );

        if (!isIdMatch && !isNameMatch) return false;
      }

      // 3. Ceremony Filter
      if (ceremonyFilter !== 'all') {
        const cleanVal = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetTypeClean = cleanVal(ceremonyFilter);

        const isCeremonyMatch = (c) => {
          if (!c?.type) return false;
          const cTypeClean = cleanVal(c.type);
          return cTypeClean.includes(targetTypeClean) || targetTypeClean.includes(cTypeClean);
        };

        const hasMatchingCeremony = ob.ceremonies && ob.ceremonies.length > 0
          ? ob.ceremonies.some(isCeremonyMatch)
          : isCeremonyMatch(ob.funeralDetails);

        if (!hasMatchingCeremony) return false;
      }

      return true;
    });
  }, [obituaries, searchQuery, communityFilter, ceremonyFilter]);

  // Stats Metrics Calculation
  const stats = useMemo(() => {
    const total = obituaries.length;
    const activeCommIds = new Set(obituaries.map(o => (o.communityId?._id || o.communityId || o.community)).filter(Boolean));
    const totalViews = obituaries.reduce((sum, o) => sum + (o.views || 0), 0);
    const totalEngagement = obituaries.reduce((sum, o) => sum + (o.haathJodeCount || o.shraddhanjaliCount || 0) + (o.malaArpanCount || 0), 0);

    return {
      total,
      activeCommunitiesCount: activeCommIds.size,
      totalViews,
      totalEngagement
    };
  }, [obituaries]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this obituary post permanently across the platform?')) {
      try {
        await axiosPrivate.delete(`/admin/obituaries/${id}`);
        setObituaries(prev => prev.filter(ob => (ob.id || ob._id) !== id));
        if (selectedObituary?.id === id || selectedObituary?._id === id) setSelectedObituary(null);
        showToast('Obituary post deleted successfully');
      } catch (err) {
        showToast(err.response?.data?.message || err.message, 'error');
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-white font-bold text-xs flex items-center gap-2 ${
              toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
            }`}
          >
            <Sparkles size={16} />
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700">
            <Flame size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Global Obituary (Shradhanjali) Desk</h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Platform-wide memorial posts supervision & community activity analytics</p>
          </div>
        </div>

        <button 
          onClick={fetchAdminObituaries}
          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shrink-0 cursor-pointer"
        >
          Refresh Listing
        </button>
      </div>

      {/* ─── SUMMARY METRICS ─── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Obituary Posts', val: stats.total, sub: 'Platform Memorial Posts', icon: Users, gradient: 'from-amber-500 to-orange-600' },
          { title: 'Active Communities', val: stats.activeCommunitiesCount, sub: 'Communities with activity', icon: Globe, gradient: 'from-blue-500 to-indigo-600' },
          { title: 'Total Engagement', val: stats.totalEngagement, sub: 'Folded Hands & Garlands', icon: Award, gradient: 'from-rose-500 to-pink-600' },
          { title: 'Total Views', val: stats.totalViews, sub: 'Unique member views', icon: Eye, gradient: 'from-emerald-500 to-teal-600' }
        ].map((w, idx) => (
          <div 
            key={idx} 
            className="relative overflow-hidden bg-white rounded-3xl border border-slate-200/80 p-5 flex flex-col justify-between h-[115px] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className={`absolute top-0 right-0 -mr-6 -mt-6 w-16 h-16 bg-gradient-to-br ${w.gradient} rounded-full opacity-10 group-hover:scale-125 transition-transform duration-300`} />
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{w.title}</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{w.val}</h3>
              </div>
              <div className={`p-2.5 rounded-2xl bg-gradient-to-br ${w.gradient} text-white shadow-md shrink-0`}>
                <w.icon size={16} />
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 relative z-10">{w.sub}</p>
          </div>
        ))}
      </section>

      {/* ─── FILTERS TOOLBAR ─── */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Search size={15} />
            </span>
            <input 
              type="text" 
              placeholder="Search by deceased name, submitter name or community..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 focus:border-amber-500 rounded-2xl py-3 pl-11 pr-4 text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
            />
          </div>

          {/* Community Filter Dropdown */}
          <div className="relative shrink-0 min-w-[200px]">
            <select 
              value={communityFilter} 
              onChange={(e) => setCommunityFilter(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-100 focus:border-amber-500 rounded-2xl px-4 py-3 text-[12px] font-bold focus:outline-none appearance-none cursor-pointer text-slate-700 pr-9"
            >
              <option value="all">All Communities</option>
              {communities.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
              {/* Fallback for communities present in posts */}
              {Array.from(new Set(obituaries.map(o => o.community || o.communityId?.name || o.author?.community).filter(Boolean)))
                .filter(cName => !communities.some(c => c.name?.toLowerCase() === cName.toLowerCase()))
                .map(cName => (
                  <option key={cName} value={cName}>{cName}</option>
                ))
              }
            </select>
            <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Ceremony Filter Dropdown */}
          <div className="relative shrink-0 min-w-[200px]">
            <select 
              value={ceremonyFilter} 
              onChange={(e) => setCeremonyFilter(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-100 focus:border-amber-500 rounded-2xl px-4 py-3 text-[12px] font-bold focus:outline-none appearance-none cursor-pointer text-slate-700 pr-9"
            >
              <option value="all">All Ceremony Types</option>
              <option value="Funeral / Last Rites">Funeral / Last Rites</option>
              <option value="Uthawna / Chautha">Uthawna / Chautha</option>
              <option value="Tehravi / Prayers">Tehravi / Prayers</option>
              <option value="Pagri Rasam">Pagri Rasam / Memorial</option>
              <option value="Besna">Besna</option>
              <option value="Shradh">Shradh</option>
            </select>
            <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shrink-0">
            {[{ id: 'grid', label: 'Grid View' }, { id: 'table', label: 'Table View' }].map(m => (
              <button 
                key={m.id} onClick={() => setViewMode(m.id)}
                className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase transition-all cursor-pointer ${
                  viewMode === m.id ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
                }`}
              >{m.label}</button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── OBITUARIES GRID / TABLE DATA ─── */}
      <section>
        {obituariesLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-[12px] text-slate-400 font-medium">Loading obituary posts...</p>
          </div>
        ) : obituariesError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <span className="text-4xl">⚠️</span>
            <p className="text-xs font-bold text-rose-500">{obituariesError}</p>
          </div>
        ) : filteredObituaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center bg-white rounded-3xl border border-slate-200/80">
            <span className="text-5xl">🕊️</span>
            <h3 className="text-base font-bold text-slate-700">No obituary posts found</h3>
            <p className="text-xs text-slate-400 max-w-sm">No obituary posts match your current search query or community filter.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredObituaries.map((ob) => (
              <div 
                key={ob.id || ob._id} 
                className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                {/* Header Image & Badge */}
                <div className="relative h-64 bg-slate-900 overflow-hidden flex items-center justify-center">
                  <img 
                    src={ob.image || 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400'} 
                    alt={ob.deceasedName}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-amber-300 border border-amber-300/30">
                    🪔 {ob.community || 'Samaj Member'}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 space-y-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-tight">{ob.deceasedName}</h3>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      {ob.age > 0 ? `Age: ${ob.age} Years` : ''} {ob.dateOfPassing ? `• Passing: ${ob.dateOfPassing}` : ''}
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 italic leading-relaxed bg-amber-50/50 p-3 rounded-2xl border border-amber-100">
                    "{ob.message}"
                  </p>

                  {/* Rites & Ceremony info */}
                  {ob.funeralDetails && (
                    <div className="text-[11px] font-semibold text-slate-600 space-y-1 border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                        <Calendar size={12} /> {ob.funeralDetails.type}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock size={12} /> {ob.funeralDetails.date} {ob.funeralDetails.time && `• ${ob.funeralDetails.time}`}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 line-clamp-1">
                        <MapPin size={12} /> {ob.funeralDetails.venue}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                    <span>🙏 {ob.haathJodeCount || ob.shraddhanjaliCount || 0}</span>
                    <span>🪷 {ob.malaArpanCount || 0}</span>
                    <span>👁️ {ob.views || 0}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setSelectedObituary(ob)} 
                      className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 text-xs font-bold transition-all cursor-pointer"
                    >
                      View Details
                    </button>
                    <button 
                      onClick={() => handleDelete(ob.id || ob._id)} 
                      className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all cursor-pointer"
                      title="Delete Post"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-5">Deceased Person</th>
                    <th className="py-4 px-5">Community</th>
                    <th className="py-4 px-5">Ceremony</th>
                    <th className="py-4 px-5">Submitter</th>
                    <th className="py-4 px-5">Engagement</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredObituaries.map((ob) => (
                    <tr key={ob.id || ob._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <img src={ob.image || 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=100'} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 border" />
                          <div>
                            <p className="font-bold text-slate-900">{ob.deceasedName}</p>
                            <p className="text-[11px] text-slate-400">Passing: {ob.dateOfPassing}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200/50">
                          {ob.community || 'Samaj'}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <p className="font-bold text-slate-800">{ob.funeralDetails?.type}</p>
                        <p className="text-[11px] text-slate-400">{ob.funeralDetails?.date}</p>
                      </td>
                      <td className="py-4 px-5">
                        <p className="font-bold text-slate-800">{ob.author?.name || 'Member'}</p>
                        <p className="text-[11px] text-slate-400">{ob.author?.relation}</p>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2 font-bold text-slate-600">
                          <span>🙏 {ob.haathJodeCount || ob.shraddhanjaliCount || 0}</span>
                          <span>🪷 {ob.malaArpanCount || 0}</span>
                          <span>👁️ {ob.views || 0}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setSelectedObituary(ob)} 
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                            title="View Details"
                          >
                            <Eye size={15} />
                          </button>
                          <button 
                            onClick={() => handleDelete(ob.id || ob._id)} 
                            className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={15} />
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
      </section>

      {/* ─── REVIEW MODAL POPUP (CENTERED WITH SCROLL LOCK) ─── */}
      <AnimatePresence>
        {selectedObituary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedObituary(null)} 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" 
            />

            {/* Centered Modal */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 1, y: 0 }} 
              transition={{ type: 'spring', damping: 26, stiffness: 280 }} 
              className="relative w-full max-w-xl max-h-[85vh] bg-white rounded-3xl z-50 flex flex-col shadow-2xl overflow-hidden border border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full border border-slate-200 overflow-hidden bg-slate-100 shadow-sm shrink-0">
                    <img src={selectedObituary.image || 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=100'} alt="" className="w-full h-full object-cover object-top" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 leading-tight">{selectedObituary.deceasedName}</h3>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mt-1 flex items-center gap-1.5">
                      <span>{selectedObituary.community || 'Samaj Member'}</span>
                      <span>•</span>
                      <span>{selectedObituary.views || 0} Views</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedObituary(null)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"><X size={16} /></button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Date of Passing</span>
                    <p className="text-xs font-bold text-slate-800 mt-1">{selectedObituary.dateOfPassing}</p>
                  </div>
                  <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Age at Passing</span>
                    <p className="text-xs font-bold text-slate-800 mt-1">{selectedObituary.age} Years</p>
                  </div>
                  <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Author Relation</span>
                    <p className="text-xs font-bold text-slate-800 mt-1">{selectedObituary.author?.relation || 'Family'}</p>
                  </div>
                  <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Submitted By</span>
                    <p className="text-xs font-bold text-slate-800 mt-1">{selectedObituary.author?.name}</p>
                  </div>
                </div>

                {/* Ceremony Details */}
                {(() => {
                  const displayCeremonies = (selectedObituary.ceremonies && selectedObituary.ceremonies.length > 0)
                    ? selectedObituary.ceremonies
                    : (selectedObituary.funeralDetails ? [selectedObituary.funeralDetails] : []);

                  if (displayCeremonies.length === 0) return null;

                  return (
                    <div className="space-y-3">
                      {displayCeremonies.map((c, idx) => (
                        <div key={idx} className="p-4 bg-amber-50/50 border border-amber-100/50 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-amber-800 border-b border-amber-100 pb-1.5">
                            <span className="flex items-center gap-1.5"><Clock size={12} /> {c.type || 'Ceremony'}</span>
                            {displayCeremonies.length > 1 && <span className="bg-amber-100 px-2 py-0.5 rounded-full text-amber-900 text-[9px]">Program #{idx + 1}</span>}
                          </div>
                          <div className="grid grid-cols-1 gap-1 text-[12px] font-medium text-slate-650">
                            <div>Date & Time: <span className="text-slate-800 font-bold">{c.date || '—'} {c.time && `• ${c.time}`}</span></div>
                            <div>Venue Address: <span className="text-slate-800 font-bold">{c.venue || '—'}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Submitter Details */}
                <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200/80 pb-2">
                    <Users size={12} /> Submitter Member Details
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[12px] font-medium text-slate-650">
                    <div>Name: <span className="text-slate-800 font-bold">{selectedObituary.author?.name || 'Unknown'}</span></div>
                    <div>Relation: <span className="text-slate-800 font-bold">{selectedObituary.author?.relation || 'Not specified'}</span></div>
                    {selectedObituary.author?.email && (
                      <div className="col-span-2">Email: <span className="text-slate-850 font-bold">{selectedObituary.author?.email}</span></div>
                    )}
                    {selectedObituary.author?.phone && (
                      <div className="col-span-2">Phone: <span className="text-slate-850 font-bold">{selectedObituary.author?.phone}</span></div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Condolence Message</span>
                  <p className="text-[12px] text-slate-700 leading-relaxed italic bg-amber-50/30 p-4 rounded-2xl border border-amber-100">
                    "{selectedObituary.message}"
                  </p>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                  <span>🙏 {selectedObituary.haathJodeCount || selectedObituary.shraddhanjaliCount || 0}</span>
                  <span>🪷 {selectedObituary.malaArpanCount || 0}</span>
                  <span>👁️ {selectedObituary.views || 0}</span>
                </div>
                <button 
                  onClick={() => handleDelete(selectedObituary.id || selectedObituary._id)}
                  className="px-4 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all border border-rose-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={16} /> Delete Post
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminObituaryManagement;
