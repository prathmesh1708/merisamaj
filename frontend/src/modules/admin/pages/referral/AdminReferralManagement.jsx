import React, { useState, useEffect, useCallback } from 'react';
import { 
  Gift, Users, Crown, Award, Heart, Save, CheckCircle2, 
  Search, Sliders, ShieldCheck, RefreshCw, Power, Filter, 
  TrendingUp, Calendar, AlertCircle
} from 'lucide-react';
import { adminReferralService } from '../../../../core/api/referralService';

export const AdminReferralManagement = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState({
    registrationReferrerPoints: 100,
    registrationReferredPoints: 50,
    subscriptionPoints: 100,
    membershipPoints: 150,
    donationPoints: 75,
    isActive: true
  });

  const [savingConfig, setSavingConfig] = useState(false);
  const [toast, setToast] = useState(null);

  // Referral Events Table State
  const [events, setEvents] = useState([]);
  const [eventFilter, setEventFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fetchingEvents, setFetchingEvents] = useState(false);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStatsAndConfig = useCallback(async () => {
    try {
      const [statsRes, configRes] = await Promise.all([
        adminReferralService.getReferralStats(),
        adminReferralService.getReferralConfig()
      ]);

      if (statsRes.data?.success) setStats(statsRes.data.data);
      if (configRes.data?.success) setConfig(configRes.data.data);
    } catch (err) {
      console.error('Error fetching admin referral config/stats:', err);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setFetchingEvents(true);
    try {
      const res = await adminReferralService.getAllReferrals({
        eventType: eventFilter,
        search: searchQuery,
        page,
        limit: 20
      });
      if (res.data?.success) {
        setEvents(res.data.data || []);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.pages || 1);
        }
      }
    } catch (err) {
      console.error('Error fetching referral events log:', err);
    } finally {
      setFetchingEvents(false);
    }
  }, [eventFilter, searchQuery, page]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchStatsAndConfig();
      await fetchEvents();
      setLoading(false);
    };
    init();
  }, [fetchStatsAndConfig, fetchEvents]);

  const handleSaveConfig = async (e) => {
    if (e) e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await adminReferralService.updateReferralConfig(config);
      if (res.data?.success) {
        setConfig(res.data.data);
        showToast('Referral program settings saved successfully!');
        fetchStatsAndConfig();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleToggleProgram = async () => {
    const nextState = !config.isActive;
    setConfig(prev => ({ ...prev, isActive: nextState }));
    try {
      const res = await adminReferralService.updateReferralConfig({ isActive: nextState });
      if (res.data?.success) {
        showToast(`Referral program ${nextState ? 'ACTIVATED' : 'DEACTIVATED'} platform-wide.`);
        fetchStatsAndConfig();
      }
    } catch (err) {
      showToast('Failed to toggle program status');
    }
  };

  const getEventBadge = (type) => {
    switch (type) {
      case 'REGISTRATION':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20">REGISTRATION</span>;
      case 'SUBSCRIPTION':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/20">SUBSCRIPTION</span>;
      case 'MEMBERSHIP':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20">MEMBERSHIP</span>;
      case 'DONATION':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">DONATION</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-500/10 text-slate-400">{type}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-white font-bold">
        <RefreshCw className="animate-spin text-purple-400 mr-2" size={24} />
        Loading Referral Management Desk...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 backdrop-blur-md">
          <CheckCircle2 size={18} />
          <span className="text-sm font-bold tracking-wide">{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Gift className="text-purple-400" size={28} />
            Refer & Earn Global Management Desk
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Configure point rewards, master toggle, and monitor platform-wide referral events across all 4 triggers.
          </p>
        </div>

        {/* Master Program ON/OFF Toggle */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2.5 px-4 rounded-2xl">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Program Status:
          </span>
          <button
            onClick={handleToggleProgram}
            className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
              config.isActive 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
            }`}
          >
            <Power size={14} />
            {config.isActive ? 'Active (ON)' : 'Disabled (OFF)'}
          </button>
        </div>
      </div>

      {/* Top 4 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-neo p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Total Referral Events</p>
            <h3 className="text-2xl font-black text-white mt-0.5">{stats?.totalReferrals?.toLocaleString() || 0}</h3>
          </div>
        </div>

        <div className="card-neo p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Total Points Awarded</p>
            <h3 className="text-2xl font-black text-white mt-0.5">{stats?.totalPointsAwarded?.toLocaleString() || 0} pts</h3>
          </div>
        </div>

        <div className="card-neo p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Crown size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Subscribers Rewarded</p>
            <h3 className="text-2xl font-black text-white mt-0.5">{stats?.breakdown?.SUBSCRIPTION?.count || 0}</h3>
          </div>
        </div>

        <div className="card-neo p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Heart size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Donations Rewarded</p>
            <h3 className="text-2xl font-black text-white mt-0.5">{stats?.breakdown?.DONATION?.count || 0}</h3>
          </div>
        </div>
      </div>

      {/* Main Grid: Config Panel (Left) & Top Referrers (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Config Panel */}
        <div className="card-neo p-6 lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Sliders size={18} className="text-purple-400" />
              Adjustable Points Settings
            </h2>
            <span className="text-[11px] font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
              Immediate Credit Engine
            </span>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                  Registration — Referrer Points
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    value={config.registrationReferrerPoints}
                    onChange={(e) => setConfig({ ...config, registrationReferrerPoints: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-brand-primary"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-text-muted">pts</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                  Registration — Referred User Welcome Points
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    value={config.registrationReferredPoints}
                    onChange={(e) => setConfig({ ...config, registrationReferredPoints: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-brand-primary"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-text-muted">pts</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                  Subscription — Referrer Points
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    value={config.subscriptionPoints}
                    onChange={(e) => setConfig({ ...config, subscriptionPoints: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-brand-primary"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-text-muted">pts</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                  Membership Upgrade — Referrer Points
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    value={config.membershipPoints}
                    onChange={(e) => setConfig({ ...config, membershipPoints: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-brand-primary"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-text-muted">pts</span>
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                  Donation Contribution — Referrer Points
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    value={config.donationPoints}
                    onChange={(e) => setConfig({ ...config, donationPoints: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-brand-primary"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-text-muted">pts</span>
                </div>
              </div>

            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingConfig}
                className="px-6 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow hover:bg-brand-primary/90 transition-all disabled:opacity-50"
              >
                {savingConfig ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                Save Configuration
              </button>
            </div>
          </form>
        </div>

        {/* Top Referrers Leaderboard */}
        <div className="card-neo p-6 space-y-4">
          <h2 className="text-base font-black text-white flex items-center gap-2 border-b border-white/10 pb-4">
            <Award size={18} className="text-amber-400" />
            Top Referrers
          </h2>

          <div className="space-y-3">
            {stats?.topReferrers && stats.topReferrers.length > 0 ? (
              stats.topReferrers.map((user, idx) => (
                <div key={user._id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                      idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      idx === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/30' :
                      'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    }`}>
                      #{idx + 1}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white leading-tight">{user.name}</h4>
                      <p className="text-[10px] text-text-muted mt-0.5">{user.referralCode || 'No Code'}</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-emerald-400">
                    +{user.totalPointsEarned} pts
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-text-muted text-center py-6">No referral leaders yet.</p>
            )}
          </div>
        </div>

      </div>

      {/* Platform Referral Events Log Table */}
      <div className="card-neo p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Calendar size={18} className="text-purple-400" />
              Platform Referral Event Logs
            </h2>
            <p className="text-xs text-text-muted mt-0.5">Real-time log of every point-awarding action</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search member name or phone..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-brand-primary"
              />
            </div>

            {/* Event Filter Tabs */}
            <select
              value={eventFilter}
              onChange={(e) => { setEventFilter(e.target.value); setPage(1); }}
              className="bg-white/5 border border-white/10 text-white text-xs font-bold rounded-xl px-3 py-1.5 outline-none"
            >
              <option value="ALL">All Event Types</option>
              <option value="REGISTRATION">Registration</option>
              <option value="SUBSCRIPTION">Subscription</option>
              <option value="MEMBERSHIP">Membership</option>
              <option value="DONATION">Donation</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-text-muted">
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Referrer (Code Owner)</th>
                <th className="py-3 px-4">Referred Member</th>
                <th className="py-3 px-4">Points Awarded</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-medium">
              {fetchingEvents ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-text-muted">
                    <RefreshCw size={18} className="animate-spin inline-block mr-2" /> Loading referral events...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-text-muted">
                    No referral events found.
                  </td>
                </tr>
              ) : (
                events.map(item => (
                  <tr key={item._id} className="hover:bg-white/3 transition-colors">
                    <td className="py-3 px-4">{getEventBadge(item.eventType)}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{item.referrer?.name || 'Unknown User'}</div>
                      <div className="text-[10px] text-text-muted">{item.referrer?.phone || item.referrer?.referralCode}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-200">{item.referredUser?.name || 'Member'}</div>
                      <div className="text-[10px] text-text-muted">{item.referredUser?.phone}</div>
                    </td>
                    <td className="py-3 px-4 font-black text-emerald-400">
                      +{item.pointsAwarded} pts
                    </td>
                    <td className="py-3 px-4 text-text-muted text-[11px]">
                      {new Date(item.createdAt).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs font-bold text-text-muted">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

export default AdminReferralManagement;
