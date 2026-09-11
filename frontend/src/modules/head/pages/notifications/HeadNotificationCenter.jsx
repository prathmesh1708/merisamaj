import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, CheckCheck, Sparkles, Filter, ChevronRight, Loader2, 
  Trash2, ShieldCheck, Heart, Calendar, Wallet, Users, MessageSquare, Vote, Megaphone,
  Send, Clock, Plus, Edit2, AlertTriangle, FileText, CheckCircle2, XCircle, RefreshCw, X, Radio
} from 'lucide-react';
import { HeadPanelPageHeader, HeadPanelCard } from '../../components/shared/HeadUI';
import { notificationService } from '../../../../core/api/matrimonialService';
import { headNotificationService } from '../../../../core/api/headNotificationService';
import { useNotifications } from '../../../member/context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const INBOX_MODULE_TABS = [
  { key: 'all', label: 'All Alerts', icon: Bell },
  { key: 'announcements', label: 'Announcements', modules: ['social', 'obituary', 'chat', 'system'], icon: Megaphone },
  { key: 'matrimonial', label: 'Matrimonial Updates', modules: ['matrimonial'], icon: Heart },
  { key: 'events', label: 'Event Reminders', modules: ['events', 'invitations'], icon: Calendar },
  { key: 'voting', label: 'Voting & Elections', modules: ['voting'], icon: Vote },
];

export const HeadNotificationCenter = () => {
  const navigate = useNavigate();
  const { unreadCount, latestNotification, decrementUnreadCount, resetUnreadCount } = useNotifications();

  // Top Workspace Desk Mode
  const [workspaceDesk, setWorkspaceDesk] = useState('inbox'); // 'inbox' | 'broadcast' | 'templates' | 'scheduled'

  // Inbox Data States
  const [activeInboxTab, setActiveInboxTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Broadcast Form State
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    category: 'General',
    priority: 'normal',
    city: 'all',
    verificationStatus: 'all',
    gender: 'all',
    sendTiming: 'now', // 'now' | 'scheduled'
    scheduledFor: ''
  });
  const [broadcastSending, setBroadcastSending] = useState(false);

  // Templates State
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [selectedTemplateForEdit, setSelectedTemplateForEdit] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: '', category: 'General', titleTemplate: '', bodyTemplate: ''
  });

  // Scheduled & Broadcast History States
  const [scheduledAlerts, setScheduledAlerts] = useState([]);
  const [broadcastHistory, setBroadcastHistory] = useState([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── 1. Fetch Incoming Notification Feed ──
  const fetchNotifications = useCallback(async (pageNum = 1, tabKey = activeInboxTab) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const selectedTab = INBOX_MODULE_TABS.find(t => t.key === tabKey);
      const params = { page: pageNum, limit: 20 };

      if (selectedTab?.modules && selectedTab.modules.length === 1) {
        params.module = selectedTab.modules[0];
      }

      const res = await notificationService.getAll(params);
      const data = res.data?.data || res.data || {};
      let list = data.notifications || data.list || [];
      const totalPages = data.pages || Math.ceil((data.total || 0) / 20);

      if (selectedTab?.modules && selectedTab.modules.length > 1) {
        list = list.filter(n => selectedTab.modules.includes(n.module));
      }

      setNotifications(prev => pageNum === 1 ? list : [...prev, ...list]);
      setHasMore(pageNum < totalPages);
      setPage(pageNum);
    } catch (err) {
      console.error('[HeadNotificationCenter] Error fetching notifications:', err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeInboxTab]);

  useEffect(() => {
    if (workspaceDesk === 'inbox') {
      fetchNotifications(1, activeInboxTab);
    }
  }, [workspaceDesk, activeInboxTab, fetchNotifications]);

  // Live socket notification listener
  useEffect(() => {
    if (!latestNotification) return;
    setNotifications(prev => [latestNotification, ...prev]);
  }, [latestNotification]);

  // ── 2. Fetch Templates ──
  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await headNotificationService.getTemplates();
      setTemplates(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  // ── 3. Fetch Scheduled Alerts & History ──
  const fetchScheduledAndHistory = useCallback(async () => {
    setScheduledLoading(true);
    try {
      const [schedRes, histRes] = await Promise.allSettled([
        headNotificationService.getScheduledAlerts(),
        headNotificationService.getBroadcastHistory({ limit: 50 })
      ]);
      if (schedRes.status === 'fulfilled') setScheduledAlerts(schedRes.value.data?.data || []);
      if (histRes.status  === 'fulfilled') setBroadcastHistory(histRes.value.data?.data || []);
    } catch (err) {
      console.error('Failed to load scheduled alerts/history:', err);
    } finally {
      setScheduledLoading(false);
    }
  }, []);

  useEffect(() => {
    if (workspaceDesk === 'templates') {
      fetchTemplates();
    } else if (workspaceDesk === 'scheduled') {
      fetchScheduledAndHistory();
    }
  }, [workspaceDesk, fetchTemplates, fetchScheduledAndHistory]);

  // ── 4. Broadcast Form Submit ──
  const handleBroadcastSubmit = async (e) => {
    e.preventDefault();
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
      showToast('Please enter both broadcast title and message', 'error');
      return;
    }
    if (broadcastForm.sendTiming === 'scheduled' && !broadcastForm.scheduledFor) {
      showToast('Please select a scheduled date and time for delivery', 'error');
      return;
    }

    setBroadcastSending(true);
    try {
      const payload = {
        title: broadcastForm.title,
        message: broadcastForm.message,
        category: broadcastForm.category,
        priority: broadcastForm.priority,
        audienceFilter: {
          city: broadcastForm.city,
          verificationStatus: broadcastForm.verificationStatus,
          gender: broadcastForm.gender
        },
        scheduledFor: broadcastForm.sendTiming === 'scheduled' ? broadcastForm.scheduledFor : undefined
      };

      const res = await headNotificationService.sendBroadcast(payload);
      showToast(res.data?.message || 'Broadcast alert dispatched successfully!');
      setBroadcastForm({
        title: '',
        message: '',
        category: 'General',
        priority: 'normal',
        city: 'all',
        verificationStatus: 'all',
        gender: 'all',
        sendTiming: 'now',
        scheduledFor: ''
      });
      if (broadcastForm.sendTiming === 'scheduled') {
        setWorkspaceDesk('scheduled');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to dispatch broadcast alert', 'error');
    } finally {
      setBroadcastSending(false);
    }
  };

  // ── 5. Template Actions ──
  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!templateForm.name || !templateForm.titleTemplate || !templateForm.bodyTemplate) {
      showToast('Please fill all template fields', 'error');
      return;
    }

    try {
      if (selectedTemplateForEdit) {
        await headNotificationService.updateTemplate(selectedTemplateForEdit._id, templateForm);
        showToast('Template updated successfully!');
      } else {
        await headNotificationService.createTemplate(templateForm);
        showToast('Custom template created successfully!');
      }
      setTemplateModalOpen(false);
      setSelectedTemplateForEdit(null);
      setTemplateForm({ name: '', category: 'General', titleTemplate: '', bodyTemplate: '' });
      fetchTemplates();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save template', 'error');
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Are you sure you want to delete this custom template?')) return;
    try {
      await headNotificationService.deleteTemplate(id);
      showToast('Template deleted successfully.');
      fetchTemplates();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete template', 'error');
    }
  };

  const applyTemplateToBroadcast = (tpl) => {
    setBroadcastForm(prev => ({
      ...prev,
      title: tpl.titleTemplate.replace(/\{\{[^}]+\}\}/g, '').trim(),
      message: tpl.bodyTemplate.replace(/\{\{[^}]+\}\}/g, '').trim(),
      category: tpl.category || 'General'
    }));
    setWorkspaceDesk('broadcast');
    showToast(`Applied template: "${tpl.name}" into Broadcast Composer!`);
  };

  // ── 6. Cancel Scheduled Alert ──
  const handleCancelScheduled = async (id) => {
    if (!window.confirm('Cancel this scheduled broadcast alert?')) return;
    try {
      await headNotificationService.cancelScheduledAlert(id);
      showToast('Scheduled alert cancelled successfully.');
      fetchScheduledAndHistory();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel scheduled alert', 'error');
    }
  };

  const handleMarkAsRead = async (id, isRead) => {
    if (!isRead) {
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      decrementUnreadCount();
      await notificationService.markRead(id).catch(() => {});
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      resetUnreadCount();
      await notificationService.markAllRead();
      showToast('All notifications marked as read.');
    } catch (err) {
      console.error('[MarkAllReadError]', err.message);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl flex items-center gap-2.5 font-bold text-xs ${
              toast.type === 'error' ? 'bg-rose-500/25 border-rose-500/40 text-rose-200' : 'bg-emerald-500/25 border-emerald-500/40 text-emerald-200'
            }`}>
            {toast.type === 'error' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <HeadPanelPageHeader
        title="Council Communication & Notification Center"
        description="Community broadcasts, push notices, notification templates, scheduled alerts, and real-time governance alerts."
        icon={Bell}
        actionLabel={workspaceDesk === 'inbox' && unreadCount > 0 ? "Mark All as Read" : null}
        onActionClick={handleMarkAllAsRead}
        actionIcon={CheckCheck}
      />

      {/* 4 Workspace Navigation Desks */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { id: 'inbox', label: 'Alerts Inbox', icon: Bell, desc: 'Real-time council notifications', badge: unreadCount },
          { id: 'broadcast', label: 'Broadcast Alert', icon: Send, desc: 'Send or schedule community messages' },
          { id: 'templates', label: 'Notification Templates', icon: FileText, desc: 'Reusable community alert templates' },
          { id: 'scheduled', label: 'Scheduled & History', icon: Clock, desc: 'Scheduled queue & delivery log' },
        ].map(desk => (
          <button
            key={desk.id}
            onClick={() => setWorkspaceDesk(desk.id)}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              workspaceDesk === desk.id
                ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-transparent shadow-lg shadow-indigo-500/20 scale-[1.01]'
                : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <desk.icon size={18} className={workspaceDesk === desk.id ? 'text-indigo-200' : 'text-indigo-600'} />
              {desk.badge > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse">
                  {desk.badge} NEW
                </span>
              )}
            </div>
            <div className="mt-3">
              <h4 className="text-xs font-black uppercase tracking-wider">{desk.label}</h4>
              <p className={`text-[10px] mt-0.5 ${workspaceDesk === desk.id ? 'text-indigo-100/70' : 'text-slate-400'}`}>{desk.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ─── WORKSPACE 1: INCOMING NOTIFICATION INBOX ─── */}
      {workspaceDesk === 'inbox' && (
        <div className="space-y-4">
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {INBOX_MODULE_TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeInboxTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveInboxTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent shadow-md shadow-violet-500/20 scale-[1.02]'
                      : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <HeadPanelCard className="p-0 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
                <Loader2 size={32} className="animate-spin text-violet-600" />
                <p className="text-sm font-semibold">Loading governance notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-2">
                <Bell size={40} className="mx-auto opacity-30 text-violet-600" />
                <p className="text-sm font-bold text-slate-600">No Notifications in this Category</p>
                <p className="text-xs text-slate-400">All council tasks and approvals are up to date.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map(item => (
                  <div
                    key={item._id}
                    onClick={() => {
                      handleMarkAsRead(item._id, item.isRead);
                      if (item.actionUrl) navigate(item.actionUrl);
                    }}
                    className={`p-4 flex items-start gap-4 hover:bg-slate-50/80 transition-colors cursor-pointer ${
                      !item.isRead ? 'bg-violet-50/40 border-l-4 border-l-violet-600' : ''
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0 mt-0.5 text-base shadow-xs">
                      {item.icon || '🔔'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`text-xs font-bold truncate ${!item.isRead ? 'text-slate-900 font-extrabold' : 'text-slate-700'}`}>
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                          {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{item.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </HeadPanelCard>
        </div>
      )}

      {/* ─── WORKSPACE 2: BROADCAST COMMUNITY ALERT COMPOSER ─── */}
      {workspaceDesk === 'broadcast' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Send size={18} className="text-indigo-600" /> Broadcast Community Announcement & Push Alert
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Deliver immediate or scheduled multi-channel alerts (In-App, Push Notifications & Social Announcement) to your community.
            </p>
          </div>

          <form onSubmit={handleBroadcastSubmit} className="space-y-5">
            {/* Title & Category */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Alert Title *</label>
                <input
                  type="text"
                  value={broadcastForm.title}
                  onChange={e => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                  placeholder="e.g. Annual Community General Meeting / Blood Donation Drive"
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Category</label>
                <select
                  value={broadcastForm.category}
                  onChange={e => setBroadcastForm({ ...broadcastForm, category: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  {['General', 'Event', 'Matrimonial', 'Emergency', 'Meeting', 'Festival', 'Census', 'Donation'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Broadcast Message Body */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase">Message Content *</label>
                <button
                  type="button"
                  onClick={() => setWorkspaceDesk('templates')}
                  className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <FileText size={12} /> Choose from Templates
                </button>
              </div>
              <textarea
                value={broadcastForm.message}
                onChange={e => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                placeholder="Enter the full message to broadcast to all members in your community..."
                rows={4}
                className="w-full p-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 leading-relaxed resize-none"
                required
              />
            </div>

            {/* Audience Targeting Filters */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Filter size={13} className="text-indigo-600" /> Target Audience Filters
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">City Scope</label>
                  <input
                    type="text"
                    value={broadcastForm.city}
                    onChange={e => setBroadcastForm({ ...broadcastForm, city: e.target.value })}
                    placeholder="all (or specific city name)"
                    className="w-full p-2 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-800 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Verification Status</label>
                  <select
                    value={broadcastForm.verificationStatus}
                    onChange={e => setBroadcastForm({ ...broadcastForm, verificationStatus: e.target.value })}
                    className="w-full p-2 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-800 mt-1 cursor-pointer"
                  >
                    <option value="all">All Members</option>
                    <option value="verified">Verified Only</option>
                    <option value="pending">Pending Verification</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Priority Level</label>
                  <select
                    value={broadcastForm.priority}
                    onChange={e => setBroadcastForm({ ...broadcastForm, priority: e.target.value })}
                    className="w-full p-2 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-800 mt-1 cursor-pointer"
                  >
                    <option value="normal">Normal Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">🚨 Urgent (Immediate Push)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Delivery Timing: Immediate vs Scheduled */}
            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
              <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={13} className="text-indigo-600" /> Delivery Timing
              </h4>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="sendTiming"
                    value="now"
                    checked={broadcastForm.sendTiming === 'now'}
                    onChange={() => setBroadcastForm({ ...broadcastForm, sendTiming: 'now' })}
                    className="text-indigo-600"
                  />
                  <span>Send Immediately (Now)</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="sendTiming"
                    value="scheduled"
                    checked={broadcastForm.sendTiming === 'scheduled'}
                    onChange={() => setBroadcastForm({ ...broadcastForm, sendTiming: 'scheduled' })}
                    className="text-indigo-600"
                  />
                  <span>Schedule for Future Date & Time</span>
                </label>
              </div>

              {broadcastForm.sendTiming === 'scheduled' && (
                <div className="pt-2">
                  <label className="text-[11px] font-bold text-slate-700">Select Date & Time for Scheduled Broadcast:</label>
                  <input
                    type="datetime-local"
                    value={broadcastForm.scheduledFor}
                    onChange={e => setBroadcastForm({ ...broadcastForm, scheduledFor: e.target.value })}
                    className="mt-1 p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                    required
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={broadcastSending}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {broadcastSending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Dispatching...
                  </>
                ) : broadcastForm.sendTiming === 'scheduled' ? (
                  <>
                    <Clock size={15} /> Schedule Community Alert
                  </>
                ) : (
                  <>
                    <Send size={15} /> Broadcast Alert Now
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── WORKSPACE 3: NOTIFICATION TEMPLATES DESK ─── */}
      {workspaceDesk === 'templates' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <FileText size={16} className="text-indigo-600" /> Reusable Notification Templates
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Quickly dispatch standard announcements, festival greetings, and meeting notices</p>
            </div>
            <button
              onClick={() => {
                setSelectedTemplateForEdit(null);
                setTemplateForm({ name: '', category: 'General', titleTemplate: '', bodyTemplate: '' });
                setTemplateModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus size={14} /> Create Custom Template
            </button>
          </div>

          {templatesLoading ? (
            <div className="p-12 text-center text-slate-400 font-bold flex flex-col items-center gap-2">
              <Loader2 size={24} className="animate-spin text-indigo-600" /> Loading templates library...
            </div>
          ) : templates.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              No templates available.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(tpl => (
                <div key={tpl._id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between gap-3 hover:border-indigo-200 transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {tpl.category}
                      </span>
                      {tpl.isSystemDefault && (
                        <span className="text-[9px] font-bold text-slate-400">System Preset</span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{tpl.name}</h4>
                    <p className="text-xs font-bold text-slate-700">{tpl.titleTemplate}</p>
                    <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-3">
                      "{tpl.bodyTemplate}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
                    <button
                      onClick={() => applyTemplateToBroadcast(tpl)}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send size={12} /> Use in Broadcast
                    </button>
                    {!tpl.isSystemDefault && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedTemplateForEdit(tpl);
                            setTemplateForm({
                              name: tpl.name,
                              category: tpl.category,
                              titleTemplate: tpl.titleTemplate,
                              bodyTemplate: tpl.bodyTemplate
                            });
                            setTemplateModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                          title="Edit Template"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(tpl._id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete Template"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── WORKSPACE 4: SCHEDULED ALERTS & BROADCAST HISTORY ─── */}
      {workspaceDesk === 'scheduled' && (
        <div className="space-y-6">
          {/* Active Scheduled Alerts */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Clock size={16} className="text-amber-500" /> Pending Scheduled Alerts Queue ({scheduledAlerts.length})
            </h3>

            {scheduledAlerts.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 font-semibold text-xs">
                No alerts currently scheduled. Use the Broadcast tab to schedule alerts for upcoming events or meetings.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scheduledAlerts.map(alert => (
                  <div key={alert._id} className="bg-white p-4 rounded-2xl border border-amber-200/70 bg-amber-50/20 shadow-xs flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800">
                          ⏰ Scheduled for: {new Date(alert.scheduledFor).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{alert.priority}</span>
                      </div>
                      <h4 className="text-xs font-black text-slate-900 mt-2">{alert.title}</h4>
                      <p className="text-xs text-slate-600 line-clamp-2">{alert.message}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-amber-100 pt-2 text-[10px] text-slate-400">
                      <span>Recipients: {alert.recipientCount || 'All'} members</span>
                      <button
                        onClick={() => handleCancelScheduled(alert._id)}
                        className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold uppercase cursor-pointer"
                      >
                        Cancel Alert
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Broadcast History */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Megaphone size={16} className="text-indigo-600" /> Broadcast History & Delivery Logs
            </h3>

            {broadcastHistory.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 font-semibold text-xs">
                No broadcast history recorded yet.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="text-left px-4 py-3">Alert Title</th>
                      <th className="text-left px-4 py-3">Category</th>
                      <th className="text-left px-4 py-3">Recipients</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3">Dispatched Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {broadcastHistory.map(item => (
                      <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900">{item.title}</td>
                        <td className="px-4 py-3 text-slate-500">{item.category || 'General'}</td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{item.recipientCount || 'All'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            item.status === 'sent' ? 'bg-emerald-50 text-emerald-700' :
                            item.status === 'scheduled' ? 'bg-amber-50 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {item.sentAt ? new Date(item.sentAt).toLocaleString('en-IN') : item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Template Create / Edit Modal */}
      <AnimatePresence>
        {templateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
              onClick={() => setTemplateModalOpen(false)} className="fixed inset-0 bg-black" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl z-10 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <FileText size={18} className="text-indigo-600" />
                  {selectedTemplateForEdit ? 'Edit Template' : 'Create Custom Notification Template'}
                </h3>
                <button onClick={() => setTemplateModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"><X size={16} /></button>
              </div>

              <form onSubmit={handleSaveTemplate} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Template Name *</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="e.g. Festival Greetings or Blood Donation Call"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Category</label>
                  <select
                    value={templateForm.category}
                    onChange={e => setTemplateForm({ ...templateForm, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 cursor-pointer"
                  >
                    {['General', 'Event', 'Matrimonial', 'Emergency', 'Meeting', 'Festival', 'Census', 'Donation'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Title Template *</label>
                  <input
                    type="text"
                    value={templateForm.titleTemplate}
                    onChange={e => setTemplateForm({ ...templateForm, titleTemplate: e.target.value })}
                    placeholder="e.g. 🌟 Happy Diwali to all {{community}} Families"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Body Template *</label>
                  <textarea
                    value={templateForm.bodyTemplate}
                    onChange={e => setTemplateForm({ ...templateForm, bodyTemplate: e.target.value })}
                    placeholder="e.g. Wishing you and your family peace and prosperity this festive season. Warm regards from {{community}} Head Council."
                    rows={3}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 resize-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setTemplateModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-md shadow-indigo-500/20"
                  >
                    Save Template
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

export default HeadNotificationCenter;
