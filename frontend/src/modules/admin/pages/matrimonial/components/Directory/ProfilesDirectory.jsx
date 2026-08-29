import React, { useState } from 'react';
import { Search, Filter, ShieldCheck, Eye, CheckCircle, XCircle, Loader2, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { matrimonialService } from '../../services/matrimonialService';

const STATUS_COLORS = {
  active:   'bg-emerald-500/20 text-emerald-400',
  inactive: 'bg-gray-500/20 text-gray-400',
  hidden:   'bg-amber-500/20 text-amber-400',
  banned:   'bg-red-500/20 text-red-400',
  married:  'bg-pink-500/20 text-pink-400',
};

const VERIFY_COLORS = {
  verified:   'text-emerald-400',
  pending:    'text-amber-400',
  rejected:   'text-red-400',
  unverified: 'text-gray-400',
};

export const ProfilesDirectory = ({ data }) => {
  const { profiles = [], refreshProfiles } = data;
  const [search, setSearch]       = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [verifyFilter, setVerify] = useState('');
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  const [actionId, setActionId]   = useState(null);
  const [toast, setToast]         = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // Debounce search
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch data when filters or page changes
  React.useEffect(() => {
    const fetchData = async () => {
      const res = await refreshProfiles({ 
        page, 
        limit, 
        search: debouncedSearch, 
        verificationStatus: verifyFilter 
      });
      if (res) {
        setTotalPages(res.pages || 1);
        setTotalCount(res.total || 0);
      }
    };
    fetchData();
  }, [page, debouncedSearch, verifyFilter, refreshProfiles]);

  const handleVerify = async (id, status) => {
    setActionId(id);
    try {
      await matrimonialService.verifyProfile(id, { status, adminNote: '' });
      showToast(`Profile ${status} ✅`);
      const res = await refreshProfiles({ page, limit, search: debouncedSearch, verificationStatus: verifyFilter });
      if (res) {
        setTotalPages(res.pages || 1);
        setTotalCount(res.total || 0);
      }
    } catch (err) {
      showToast(err?.message || 'Action failed');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text" placeholder="Search by name or city..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500 shadow-2xs"
          />
        </div>
        <select value={verifyFilter} onChange={e => { setVerify(e.target.value); setPage(1); }}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-rose-500 shadow-2xs">
          <option value="">All Verification</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="unverified">Unverified</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <p className="text-xs text-slate-500 font-semibold">{totalCount} profiles found</p>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75">
                {['Profile', 'Location', 'Status', 'Verification', 'Subscription', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profiles.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400 font-semibold">No profiles found.</td></tr>
              ) : profiles.map(p => {
                const name = p.personal?.fullName || p.userId?.name || 'Unknown';
                const age  = p.age;
                const photo = p.photos?.find(ph => ph.isPrimary)?.url;
                const isLoading = actionId === p._id;

                return (
                  <tr key={p._id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                    {/* Profile */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/10 to-pink-500/20 text-rose-600 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-rose-100">
                          {photo ? <img src={photo} alt={name} className="w-full h-full object-cover" /> : name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{name}{age ? `, ${age}` : ''}</p>
                          <p className="text-[10px] text-slate-500">{p.personal?.gender || ''} · {p.personal?.community || ''}</p>
                        </div>
                      </div>
                    </td>
                    {/* Location */}
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {[p.location?.city, p.location?.state].filter(Boolean).join(', ') || '—'}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[p.status] || STATUS_COLORS.inactive}`}>
                        {p.status}
                      </span>
                      {p.isClosed && (
                        <span className="ml-2 px-2 py-0.5 rounded text-[9px] font-bold bg-pink-500/10 text-pink-500 uppercase border border-pink-500/20">
                          Closed
                        </span>
                      )}
                    </td>
                    {/* Verification */}
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold flex items-center gap-1 ${VERIFY_COLORS[p.verificationStatus] || VERIFY_COLORS.unverified}`}>
                        {p.verificationStatus === 'verified' ? <ShieldCheck size={12} /> : null}
                        {p.verificationStatus || 'unverified'}
                      </span>
                    </td>
                    {/* Subscription */}
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {p.subscription?.isActive ? (
                        <span className="text-purple-600 font-bold">Premium</span>
                      ) : 'Free'}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {p.verificationStatus !== 'verified' && !p.isClosed && (
                          <button onClick={() => handleVerify(p._id, 'verified')} disabled={isLoading}
                            className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 disabled:opacity-40 transition-colors border border-emerald-200"
                            title="Verify Profile">
                            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                          </button>
                        )}
                        {p.verificationStatus !== 'rejected' && !p.isClosed && (
                          <button onClick={() => handleVerify(p._id, 'rejected')} disabled={isLoading}
                            className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 disabled:opacity-40 transition-colors border border-rose-200"
                            title="Reject Profile">
                            <XCircle size={13} />
                          </button>
                        )}
                        {!p.isClosed && (
                          <button onClick={async () => {
                            if (!window.confirm('Force close this profile as married?')) return;
                            setActionId(p._id);
                            try {
                              await matrimonialService.closeProfile(p._id);
                              showToast('Profile Closed');
                              const res = await refreshProfiles({ page, limit, search: debouncedSearch, verificationStatus: verifyFilter });
                              if (res) { setTotalPages(res.pages || 1); setTotalCount(res.total || 0); }
                            } catch(e) { showToast('Action failed'); }
                            finally { setActionId(null); }
                          }} disabled={isLoading}
                            className="p-1.5 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 disabled:opacity-40 transition-colors border border-pink-200"
                            title="Force Close Profile (Married)">
                            <span style={{fontSize:'12px'}}>💍</span>
                          </button>
                        )}
                        {p.isClosed && (
                          <button onClick={async () => {
                            if (!window.confirm('Reopen this profile to Pending status?')) return;
                            setActionId(p._id);
                            try {
                              await matrimonialService.reopenProfile(p._id);
                              showToast('Profile Reopened (Pending)');
                              const res = await refreshProfiles({ page, limit, search: debouncedSearch, verificationStatus: verifyFilter });
                              if (res) { setTotalPages(res.pages || 1); setTotalCount(res.total || 0); }
                            } catch(e) { showToast('Action failed'); }
                            finally { setActionId(null); }
                          }} disabled={isLoading}
                            className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold hover:bg-amber-100 disabled:opacity-40 transition-colors border border-amber-200"
                            title="Reopen Profile">
                            Reopen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span className="text-xs font-bold text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilesDirectory;
