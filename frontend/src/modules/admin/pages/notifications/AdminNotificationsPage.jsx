import React, { useState, useEffect } from 'react';
import { 
  Send, BarChart3, ShieldCheck, AlertTriangle, CheckCircle2, Clock, 
  Filter, RefreshCw, Megaphone, Loader2, Sparkles, Building2, Layers,
  Users, Check, History, X, Lock
} from 'lucide-react';
import { axiosPrivate } from '../../../../core/api/axiosPrivate';
import { useAdminAuth } from '../../auth/useAdminAuth';

export const AdminNotificationsPage = () => {
  const { adminAuth } = useAdminAuth();
  const adminRole = (adminAuth?.adminUser?.role || '').toLowerCase();
  const isSuperOrMasterAdmin = ['super_admin', 'master_admin'].includes(adminRole);

  const [analytics, setAnalytics] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [selectedModule, setSelectedModule] = useState('');

  // ── Compose Broadcast State ──────────────────────────────────────────────
  const [broadcastId, setBroadcastId] = useState(() => 'bc_' + Math.random().toString(36).substring(2, 9));
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetCommunity, setTargetCommunity] = useState(''); // '' = All
  const [targetRole, setTargetRole] = useState('ALL'); // 'ALL' | 'HEAD' | 'MEMBER'
  const [channel, setChannel] = useState('in_app'); // 'in_app' | 'in_app_push'
  const [actionUrl, setActionUrl] = useState('/member/notifications');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [broadcastSuccessMsg, setBroadcastSuccessMsg] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCommunity) params.communityId = selectedCommunity;
      if (selectedModule) params.module = selectedModule;

      const res = await axiosPrivate.get('/admin/notifications/push-analytics', { params });
      setAnalytics(res.data?.data || null);
    } catch (err) {
      console.error('[AdminNotificationsPage] Analytics fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await axiosPrivate.get('/admin/notifications/broadcast-history');
      setHistory(res.data?.data || []);
    } catch (err) {
      console.error('[AdminNotificationsPage] History fetch error:', err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchHistory();
  }, [selectedCommunity, selectedModule]);

  // ── Handle Broadcast Submit ──────────────────────────────────────────────
  const handleOpenConfirm = (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    if (sending) return;
    setSending(true);
    setBroadcastSuccessMsg('');

    try {
      const payload = {
        broadcastId,
        title: title.trim(),
        message: message.trim(),
        communityId: targetCommunity || null,
        targetRole,
        channel,
        actionUrl
      };

      const res = await axiosPrivate.post('/admin/notifications/broadcast', payload);

      setBroadcastSuccessMsg(res.data?.message || 'Broadcast message dispatched successfully!');

      // Reset form & generate new broadcastId
      setTitle('');
      setMessage('');
      setBroadcastId('bc_' + Math.random().toString(36).substring(2, 9));
      setShowConfirmModal(false);

      // Refresh Analytics & History
      fetchAnalytics();
      fetchHistory();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to dispatch broadcast');
    } finally {
      setSending(false);
    }
  };

  const summary = analytics?.summary || { total: 0, sent: 0, failed: 0, pending: 0, successRate: 100 };
  const moduleBreakdown = analytics?.moduleBreakdown || [];
  const communities = analytics?.communities || [];

  return (
    <div className="space-y-8">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2.5 tracking-tight">
            <Send className="text-brand-primary" size={28} />
            Notifications & Platform Communication Console
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Monitor real-time push delivery rates and compose targeted platform-wide announcements.
          </p>
        </div>

        <button
          onClick={() => { fetchAnalytics(); fetchHistory(); }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:text-brand-primary hover:border-purple-300 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Stats
        </button>
      </div>

      {/* ── Section 1: Push Delivery Analytics Dashboard ───────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={20} className="text-brand-primary" />
            Push Delivery Performance Analytics
          </h2>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <Filter size={15} className="text-brand-primary" />
            Filter Metrics:
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Community Filter */}
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200/70">
              <Building2 size={14} className="text-gray-400" />
              <select
                value={selectedCommunity}
                onChange={(e) => setSelectedCommunity(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="">All Communities</option>
                {communities.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Module Filter */}
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200/70">
              <Layers size={14} className="text-gray-400" />
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="">All Modules</option>
                <option value="census">Census & Family</option>
                <option value="leadership">Leadership Governance</option>
                <option value="matrimonial">Matrimonial</option>
                <option value="events">Events & Reminders</option>
                <option value="donations">Donations & Crowdfunding</option>
                <option value="funds">Community Funds</option>
                <option value="dharmashala">Dharmashala Bookings</option>
                <option value="social">Social Feed & Announcements</option>
                <option value="chat">Chat & Groups</option>
                <option value="professional">Professional Directory</option>
                <option value="voting">Elections & Voting</option>
                <option value="invitations">Digital Invitations</option>
                <option value="account">Account & Security</option>
              </select>
            </div>
          </div>
        </div>

        {/* Delivery Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Dispatched</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1">{summary.total}</h3>
              <p className="text-[11px] text-gray-500 font-medium mt-1">In-app & Push logs</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-brand-primary flex items-center justify-center font-bold">
              <BarChart3 size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Successful Push</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">{summary.sent}</h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">{summary.successRate}% Delivery Rate</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Failed Push</p>
              <h3 className="text-2xl font-black text-rose-600 mt-1">{summary.failed}</h3>
              <p className="text-[11px] text-rose-500 font-medium mt-1">Expired FCM tokens</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <AlertTriangle size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending / In-App</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1">{summary.pending}</h3>
              <p className="text-[11px] text-amber-600 font-medium mt-1">Non-push alerts</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock size={24} />
            </div>
          </div>
        </div>

        {/* Module Breakdown Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 overflow-hidden">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Module Delivery Rates</h3>
          {loading ? (
            <div className="p-6 text-center text-gray-400 flex items-center justify-center gap-2">
              <Loader2 size={20} className="animate-spin text-brand-primary" />
              <span className="text-xs">Loading analytics...</span>
            </div>
          ) : moduleBreakdown.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No notification data matching filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    <th className="py-2.5 px-3">Module</th>
                    <th className="py-2.5 px-3">Dispatched</th>
                    <th className="py-2.5 px-3">Sent</th>
                    <th className="py-2.5 px-3">Failed</th>
                    <th className="py-2.5 px-3">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                  {moduleBreakdown.map(m => {
                    const totalCount = m.total || 0;
                    const sentCount = m.sent || 0;
                    const rate = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 100;
                    return (
                      <tr key={m._id} className="hover:bg-purple-50/20">
                        <td className="py-2.5 px-3 font-bold text-gray-900 uppercase text-[11px]">{m._id}</td>
                        <td className="py-2.5 px-3">{totalCount}</td>
                        <td className="py-2.5 px-3 text-emerald-600">{sentCount}</td>
                        <td className="py-2.5 px-3 text-rose-600">{m.failed || 0}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${rate}%` }} />
                            </div>
                            <span className="text-[11px] font-bold text-gray-600">{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: Platform Broadcast Composition Console ───────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center font-bold shadow-sm">
              <Megaphone size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Broadcast Message Console</h2>
              <p className="text-xs text-gray-500 font-medium">Compose and publish official platform-wide announcements</p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 flex items-center gap-1">
            <Lock size={12} /> Super / Master Admin Only
          </span>
        </div>

        {!isSuperOrMasterAdmin && (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl flex items-center gap-2">
            <Lock size={16} className="text-amber-600 shrink-0" />
            <span>Broadcast message composition requires Super Admin or Master Admin privileges. Your account has read-only access to analytics and audit history.</span>
          </div>
        )}

        {broadcastSuccessMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{broadcastSuccessMsg}</span>
          </div>
        )}

        <form onSubmit={handleOpenConfirm} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Target Community Scope */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Target Community Scope
              </label>
              <select
                disabled={!isSuperOrMasterAdmin}
                value={targetCommunity}
                onChange={(e) => setTargetCommunity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:bg-white focus:border-brand-primary focus:outline-none transition-all disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                <option value="">🌐 All Communities (Platform-wide)</option>
                {communities.map(c => (
                  <option key={c._id} value={c._id}>🏛️ {c.name}</option>
                ))}
              </select>
            </div>

            {/* Target Role Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Target Role Scope
              </label>
              <select
                disabled={!isSuperOrMasterAdmin}
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:bg-white focus:border-brand-primary focus:outline-none transition-all disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                <option value="ALL">👥 All Active Users (Heads + Members)</option>
                <option value="HEAD">👑 Community Heads Only</option>
                <option value="MEMBER">👤 Standard Members Only</option>
              </select>
            </div>

            {/* Delivery Channel */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Delivery Channel
              </label>
              <select
                disabled={!isSuperOrMasterAdmin}
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:bg-white focus:border-brand-primary focus:outline-none transition-all disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                <option value="in_app">🔔 In-App Notification Only</option>
                <option value="in_app_push">📲 In-App + FCM Push Notification</option>
              </select>
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Broadcast Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={!isSuperOrMasterAdmin}
              placeholder="e.g. Important Platform Security Maintenance Notice"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:bg-white focus:border-brand-primary focus:outline-none transition-all disabled:opacity-60 cursor-text disabled:cursor-not-allowed"
            />
          </div>

          {/* Message Input */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Message Content <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              disabled={!isSuperOrMasterAdmin}
              placeholder="Write the full broadcast message content to be delivered to targeted members..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:bg-white focus:border-brand-primary focus:outline-none transition-all disabled:opacity-60 cursor-text disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={!isSuperOrMasterAdmin || !title.trim() || !message.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send size={15} />
              <span>Review & Dispatch Broadcast</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── Section 3: Broadcast Audit Trail History Table ──────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={18} className="text-brand-primary" />
            <h3 className="text-base font-bold text-gray-900">Broadcast Audit Log History</h3>
          </div>
          <span className="text-xs font-semibold text-gray-400">Accountability & Verification Log</span>
        </div>

        {historyLoading ? (
          <div className="p-6 text-center text-gray-400 flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin text-brand-primary" />
            <span className="text-xs font-medium">Fetching broadcast audit trail...</span>
          </div>
        ) : history.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No broadcast messages dispatched yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Sender Admin</th>
                  <th className="py-2.5 px-3">Title & Message</th>
                  <th className="py-2.5 px-3">Target Scope</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Recipients</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                {history.map(item => (
                  <tr key={item._id} className="hover:bg-purple-50/20">
                    <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-gray-900">{item.senderName}</p>
                      <span className="text-[9px] uppercase tracking-wider text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-bold">
                        {item.senderRole}
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-xs">
                      <p className="font-bold text-gray-900 truncate">{item.title}</p>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">{item.message}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-[11px] font-semibold text-gray-700">
                        {item.communityName} ({item.targetRole})
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.channel === 'in_app_push' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.channel === 'in_app_push' ? 'In-App + Push' : 'In-App Only'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-extrabold text-emerald-600">
                      {item.recipientCount} users
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 2-Step Confirmation Modal ────────────────────────────────────── */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl font-bold shrink-0">
                <Megaphone size={22} />
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-gray-900">Confirm Broadcast Dispatch</h3>
              <p className="text-xs text-gray-500 mt-1">
                You are about to dispatch an official platform broadcast to all active members matching your selected scope:
              </p>
            </div>

            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs space-y-1.5">
              <p><strong className="text-gray-700">Target Community:</strong> {targetCommunity ? communities.find(c=>c._id===targetCommunity)?.name : 'All Communities (Platform-wide)'}</p>
              <p><strong className="text-gray-700">Target Role:</strong> {targetRole}</p>
              <p><strong className="text-gray-700">Delivery Channel:</strong> {channel === 'in_app_push' ? 'In-App + FCM Push' : 'In-App Only'}</p>
              <p><strong className="text-gray-700">Title:</strong> "{title}"</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSend}
                disabled={sending}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>{sending ? 'Dispatching...' : 'Confirm & Dispatch Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotificationsPage;
