import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Users, Settings, Building, Search, Phone, ChevronRight } from 'lucide-react';
import { cityService } from '../../services/cityService';

const StatusBadge = ({ active, label }) => (
  <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
    active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  }`}>
    {label || (active ? 'Active' : 'Inactive')}
  </span>
);

const FilterPills = ({ value, onChange }) => (
  <div className="flex gap-1">
    {['All', 'Active', 'Inactive'].map(f => (
      <button
        key={f}
        onClick={() => onChange(f)}
        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${
          value === f ? 'bg-brand-primary text-white' : 'bg-white/5 text-gray-400 hover:text-white'
        }`}
      >
        {f}
      </button>
    ))}
  </div>
);

const applyFilter = (list, filter, query, fields) => list.filter(item => {
  if (filter === 'Active' && !item.isActive) return false;
  if (filter === 'Inactive' && item.isActive) return false;
  if (!query) return true;
  const q = query.toLowerCase();
  return fields.some(f => (item[f] || '').toString().toLowerCase().includes(q));
});

export const CityProfileDrawer = ({ city, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  // { cityId, data, error } of the last finished fetch
  const [result, setResult] = useState(null);
  const [communityFilter, setCommunityFilter] = useState('All');
  const [memberFilter, setMemberFilter] = useState('All');
  const [memberQuery, setMemberQuery] = useState('');

  useEffect(() => {
    if (!isOpen || !city?.id) return;
    let cancelled = false;
    cityService.fetchCityDetails(city.id)
      .then(data => { if (!cancelled) setResult({ cityId: city.id, data, error: null }); })
      .catch(err => { if (!cancelled) setResult({ cityId: city.id, data: null, error: err.message }); });
    return () => { cancelled = true; };
  }, [isOpen, city?.id]);

  const isCurrent = !!result && result.cityId === city?.id;
  const details = isCurrent ? result.data : null;
  const error = isCurrent ? result.error : null;
  const loading = isOpen && !isCurrent;

  const communities = useMemo(
    () => applyFilter(details?.communities || [], communityFilter, '', []),
    [details, communityFilter]
  );
  // Community picked from the Communities tab — narrows the Members tab to it
  const [memberCommunity, setMemberCommunity] = useState(null);
  const members = useMemo(
    () => applyFilter(
      (details?.members || []).filter(m => !memberCommunity || String(m.communityId) === String(memberCommunity._id)),
      memberFilter, memberQuery, ['name', 'phone', 'community', 'subCommunity']
    ),
    [details, memberFilter, memberQuery, memberCommunity]
  );

  const openCommunityMembers = (community) => {
    setMemberCommunity(community);
    setMemberFilter('All');
    setMemberQuery('');
    setActiveTab('members');
  };

  if (!city) return null;

  const summary = details?.summary;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: MapPin },
    { id: 'communities', label: `Communities${summary ? ` (${summary.totalCommunities})` : ''}`, icon: Building },
    { id: 'members', label: `Members${summary ? ` (${summary.totalMembers})` : ''}`, icon: Users },
    { id: 'admin', label: 'Administration', icon: Settings },
  ];

  const loadingOrError = (loading || error) ? (
    <div className="p-8 text-center bg-white/5 border border-white/5 rounded-2xl">
      {loading
        ? <div className="w-6 h-6 mx-auto border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
        : <p className="text-sm text-rose-400">{error}</p>}
    </div>
  ) : null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000]"
          />

          {/* Centered modal */}
          <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="pointer-events-auto w-full max-w-2xl h-[85vh] bg-[#1e1e2d] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="shrink-0 p-6 border-b border-white/10 bg-white/5 relative overflow-hidden">
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
                      onClick={() => { setActiveTab(tab.id); if (tab.id === 'members') setMemberCommunity(null); }}
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
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
              
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
                        <span className="text-2xl font-black text-white">{(summary?.totalMembers ?? city.membersCount).toLocaleString()}</span>
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-1">Total Members</span>
                        {summary && <span className="text-[11px] text-emerald-400 font-bold mt-1">{summary.activeMembers} active</span>}
                      </div>
                      <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between">
                        <Building size={16} className="text-emerald-400 mb-2" />
                        <span className="text-2xl font-black text-white">{summary?.totalCommunities ?? city.communitiesCount}</span>
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-1">Communities</span>
                        {summary && <span className="text-[11px] text-emerald-400 font-bold mt-1">{summary.activeCommunities} active</span>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'communities' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  {loadingOrError || (
                    <>
                      <FilterPills value={communityFilter} onChange={setCommunityFilter} />
                      {communities.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-8">No communities found in {city.name}.</p>
                      ) : (
                        <ul className="space-y-2">
                          {communities.map(c => (
                            <li
                              key={c._id}
                              onClick={() => openCommunityMembers(c)}
                              title="View members of this community"
                              className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3 cursor-pointer hover:bg-white/10 hover:border-brand-primary/40 transition-colors"
                            >
                              {c.logoUrl
                                ? <img src={c.logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                                : <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 font-black shrink-0">{c.name.charAt(0)}</div>}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate flex items-center gap-2">
                                  <span className="truncate">{c.name}</span>
                                  {c.mapped === false && (
                                    <span
                                      title={`${city.name} is not added as a location in this community, but its members live here`}
                                      className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    >
                                      Not mapped
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] text-gray-400 truncate">
                                  Head: {c.head?.name || 'Not assigned'} · {c.membersCount} members ({c.activeMembersCount} active)
                                </p>
                              </div>
                              <StatusBadge active={c.isActive} />
                              <ChevronRight size={16} className="text-gray-500 shrink-0" />
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {activeTab === 'members' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  {loadingOrError || (
                    <>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          value={memberQuery}
                          onChange={e => setMemberQuery(e.target.value)}
                          placeholder="Search name, phone, community..."
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-primary"
                        />
                      </div>
                      {memberCommunity && (
                        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-brand-primary/10 border border-brand-primary/30">
                          <span className="text-xs text-white font-bold truncate">
                            <Building size={12} className="inline mr-1.5 -mt-0.5" />
                            {memberCommunity.name} — {members.length} member{members.length === 1 ? '' : 's'}
                          </span>
                          <button
                            onClick={() => setMemberCommunity(null)}
                            className="text-[11px] font-bold text-gray-300 hover:text-white flex items-center gap-1 shrink-0"
                          >
                            <X size={12} /> Show all
                          </button>
                        </div>
                      )}
                      <FilterPills value={memberFilter} onChange={setMemberFilter} />
                      {members.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-8">No members found.</p>
                      ) : (
                        <ul className="space-y-2">
                          {members.map(m => (
                            <li key={m._id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                              {m.avatar
                                ? <img src={m.avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                                : <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 font-bold shrink-0">{(m.name || '?').charAt(0)}</div>}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{m.name}</p>
                                <p className="text-[11px] text-gray-400 truncate flex items-center gap-1">
                                  <Phone size={10} /> {m.phone}
                                  {m.community && <span className="truncate"> · {m.community}{m.subCommunity ? ` / ${m.subCommunity}` : ''}</span>}
                                </p>
                              </div>
                              <StatusBadge active={m.isActive} label={m.accountStatus} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
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
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};
