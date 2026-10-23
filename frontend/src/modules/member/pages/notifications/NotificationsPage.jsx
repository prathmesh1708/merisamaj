import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Megaphone, Heart, Calendar, Users, Check, Vote, Mail, HeartHandshake,
  Flame, Loader2, RefreshCw, Trash2, BellOff, CheckCheck, Bell, ArrowLeft,
  ShieldCheck, Crown, Eye, MessageCircle, UserPlus, UserMinus, AtSign
} from 'lucide-react';
import { notificationService } from '../../../../core/api/matrimonialService';
import { useNotifications } from '../../context/NotificationContext';

const TYPE_CONFIG = {
  // Matrimonial types
  matrimonial_interest_received:     { icon: Heart,         color: 'bg-rose-100 text-rose-500',    label: 'Interest',   module: 'matrimonial' },
  matrimonial_interest_accepted:     { icon: Heart,         color: 'bg-emerald-100 text-emerald-600', label: 'Match',    module: 'matrimonial' },
  matrimonial_interest_rejected:     { icon: Heart,         color: 'bg-slate-100 text-slate-400',  label: 'Matrimonial', module: 'matrimonial' },
  matrimonial_profile_verified:      { icon: ShieldCheck,   color: 'bg-emerald-100 text-emerald-600', label: 'Verified', module: 'matrimonial' },
  matrimonial_profile_rejected:      { icon: ShieldCheck,   color: 'bg-red-100 text-red-500',     label: 'Rejected',   module: 'matrimonial' },
  matrimonial_photo_moderated:       { icon: CheckCheck,    color: 'bg-blue-100 text-blue-500',   label: 'Photo',      module: 'matrimonial' },
  matrimonial_subscription_activated:{ icon: Crown,         color: 'bg-amber-100 text-amber-600', label: 'Premium',    module: 'matrimonial' },
  matrimonial_subscription_expired:  { icon: Bell,          color: 'bg-orange-100 text-orange-600',label: 'Expired',   module: 'matrimonial' },
  matrimonial_profile_viewed:        { icon: Eye,           color: 'bg-purple-100 text-purple-600',label: 'Viewed',     module: 'matrimonial' },
  // Legacy matrimonial aliases
  matrimonial_interest:              { icon: Heart,         color: 'bg-rose-100 text-rose-500',   label: 'Matrimonial', module: 'matrimonial' },
  matrimonial_accepted:              { icon: Heart,         color: 'bg-rose-100 text-rose-500',   label: 'Match',       module: 'matrimonial' },
  matrimonial_rejected:              { icon: Heart,         color: 'bg-slate-100 text-slate-400', label: 'Matrimonial', module: 'matrimonial' },
  matrimonial_chat:                  { icon: Mail,          color: 'bg-blue-100 text-blue-500',   label: 'Chat',        module: 'matrimonial' },
  // ── Community Chat types (new) ──────────────────────────────────────────────
  new_message:                       { icon: MessageCircle, color: 'bg-blue-100 text-blue-600',   label: 'Message',     module: 'chat' },
  chat_new_message:                  { icon: MessageCircle, color: 'bg-blue-100 text-blue-600',   label: 'Message',     module: 'chat' },
  group_message:                     { icon: MessageCircle, color: 'bg-violet-100 text-violet-600',label: 'Group Msg',   module: 'group' },
  group_invite:                      { icon: UserPlus,      color: 'bg-indigo-100 text-indigo-600',label: 'Invited',     module: 'group' },
  group_join_request:                { icon: Users,         color: 'bg-amber-100 text-amber-600', label: 'Join Req',    module: 'group' },
  group_join_approved:               { icon: UserPlus,      color: 'bg-green-100 text-green-600', label: 'Approved',    module: 'group' },
  group_removed:                     { icon: UserMinus,     color: 'bg-red-100 text-red-500',     label: 'Removed',     module: 'group' },
  mention:                           { icon: AtSign,        color: 'bg-pink-100 text-pink-600',   label: 'Mention',     module: 'chat' },
  // ── Announcement (new) ──────────────────────────────────────────────────────
  community_announcement:            { icon: Megaphone,     color: 'bg-purple-100 text-purple-600',label: 'Announcement', module: 'announcement' },
  // ── General community types ─────────────────────────────────────────────────
  announcement:                      { icon: Megaphone,     color: 'bg-purple-100 text-purple-600',label: 'Announcement', module: 'announcement' },
  event:                             { icon: Calendar,      color: 'bg-indigo-100 text-indigo-600',label: 'Event',       module: 'event' },
  voting:                            { icon: Vote,          color: 'bg-amber-100 text-amber-600', label: 'Voting',      module: 'community' },
  donation:                          { icon: HeartHandshake,color: 'bg-rose-100 text-rose-600',   label: 'Donation',    module: 'community' },
  community:                         { icon: Users,         color: 'bg-emerald-100 text-emerald-600',label:'Community',  module: 'community' },
  general:                           { icon: Bell,          color: 'bg-slate-100 text-slate-500', label: 'General',     module: 'all' },
};

const getConfig = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.general;

const TABS = ['all', 'chat', 'group', 'announcement', 'matrimonial', 'event', 'community'];

const timeAgo = (date) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)    return 'Just now';
  if (mins < 60)   return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days < 7)    return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const MODULE_ALIASES = {
  home: 'all',
  nimantran: 'announcement',
  shradhanjali: 'community',
  donation: 'community',
  voting: 'community',
  events: 'event',
  groups: 'group',
  announcements: 'announcement'
};

const NotificationsPage = () => {
  const navigate     = useNavigate();
  const [searchParams] = useSearchParams();
  const rawModuleFilter = searchParams.get('module') || 'all';
  const initialTab = MODULE_ALIASES[rawModuleFilter] || (TABS.includes(rawModuleFilter) ? rawModuleFilter : 'all');

  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState(initialTab);

  useEffect(() => {
    const raw = searchParams.get('module') || 'all';
    const resolved = MODULE_ALIASES[raw] || (TABS.includes(raw) ? raw : 'all');
    setActiveTab(resolved);
  }, [searchParams]);

  const { latestNotification, resetUnreadCount } = useNotifications();

  // Reset the bell badge whenever the user opens this page
  useEffect(() => { resetUnreadCount(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Prepend real-time notifications (deduplicate by _id)
  useEffect(() => {
    if (!latestNotification) return;
    setNotifications(prev => {
      const alreadyExists = prev.some(n => n._id === latestNotification._id);
      if (alreadyExists) return prev;
      return [latestNotification, ...prev];
    });
  }, [latestNotification]);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [allRes, unreadRes] = await Promise.allSettled([
        notificationService.getAll({ limit: 100 }),
        notificationService.getUnread(),
      ]);
      if (allRes.status    === 'fulfilled') setNotifications(allRes.value.data.data.notifications || []);
      if (unreadRes.status === 'fulfilled') setUnreadCount(unreadRes.value.data.data.count || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead({ module: activeTab !== 'all' ? activeTab : undefined });
      setNotifications(prev => prev.map(n =>
        (activeTab === 'all' || n.module === activeTab || n.type?.startsWith(activeTab)) ? { ...n, isRead: true } : n
      ));
      setUnreadCount(0);
    } catch {}
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationService.deleteOne(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch {}
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) await handleMarkRead(notif._id);

    // Use actionUrl from notification if available
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
      return;
    }

    // Navigation by type — Community Chat types
    if (notif.type === 'new_message' || notif.type === 'chat_new_message') {
      // For matrimonial chat
      if (notif.module === 'matrimonial') {
        navigate('/member/matrimonial/interests');
      } else if (notif.referenceId) {
        navigate(`/member/chat/conv/${notif.referenceId}`);
      } else {
        navigate('/member/chat');
      }
    } else if (notif.type === 'group_message' || notif.type === 'group_invite' || notif.type === 'group_join_approved') {
      if (notif.referenceId) navigate(`/member/groups/${notif.referenceId}`);
      else navigate('/member/groups');
    } else if (notif.type === 'group_join_request') {
      if (notif.referenceId) navigate(`/member/groups/${notif.referenceId}`);
      else navigate('/member/groups');
    } else if (notif.type === 'group_removed') {
      navigate('/member/groups');
    } else if (notif.type === 'mention') {
      if (notif.referenceId) navigate(`/member/chat/conv/${notif.referenceId}`);
      else navigate('/member/chat');
    } else if (notif.type === 'community_announcement' || notif.type === 'announcement') {
      navigate('/member/announcements');
    } else if (notif.type?.startsWith('matrimonial_interest')) {
      navigate('/member/matrimonial/interests');
    } else if (notif.module === 'matrimonial') {
      navigate('/member/matrimonial');
    } else if (notif.type === 'event') {
      navigate('/member/events');
    } else if (notif.type === 'voting') {
      navigate('/member/voting');
    }
  };

  const filtered = notifications.filter(n => {
    if (activeTab === 'all') return true;
    const cfg = getConfig(n.type);
    // Match by module field, type prefix, or config-derived module
    return n.module === activeTab
      || n.type?.startsWith(activeTab)
      || cfg.module === activeTab;
  });

  const unreadFiltered = filtered.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-surface pb-28">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 h-14 flex items-center gap-3 sticky top-0 z-30 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-1 active:opacity-60">
          <ArrowLeft size={22} className="text-slate-800" />
        </button>
        <div className="flex-1">
          <h1 className="text-[17px] font-black text-slate-800 leading-none">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-[10px] font-bold text-rose-500 mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadNotifications} className="p-2 text-slate-400 active:scale-90">
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
          {unreadFiltered > 0 && (
            <button onClick={handleMarkAllRead} className="text-[11px] font-bold text-rose-500 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-100 active:scale-95">
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Tab pills */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95 shrink-0 capitalize ${
                activeTab === tab ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-100'
              }`}>
              {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="text-rose-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 px-6">
            <BellOff size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-[14px] font-black text-slate-600 mb-1">All caught up!</p>
            <p className="text-[12px] text-slate-400 font-semibold">No {activeTab === 'all' ? '' : activeTab} notifications yet.</p>
          </div>
        ) : (
          <div>
            {filtered.map((n, i) => {
              const cfg = getConfig(n.type);
              const Icon = cfg.icon;
              return (
                <div
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full flex items-start gap-4 px-5 py-4 border-b border-slate-100/50 text-left transition-colors ${
                    !n.isRead ? 'bg-rose-50/40 hover:bg-rose-50/60' : 'bg-white hover:bg-slate-50'
                  }`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl ${cfg.color} flex items-center justify-center shrink-0 mt-0.5 border border-slate-100`}>
                    <Icon size={16} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`text-[14px] leading-snug ${!n.isRead ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-700'}`}>
                        {n.title}
                      </h4>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!n.isRead && <div className="w-2 h-2 bg-rose-500 rounded-full mt-1" />}
                        <button onClick={(e) => handleDelete(n._id, e)}
                          className="p-1 text-slate-300 hover:text-red-400 transition-colors active:scale-90 rounded-lg hover:bg-red-50">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <p className="text-[12.5px] text-slate-500 mt-0.5 leading-relaxed font-semibold">{n.message}</p>
                    {n.imageUrl && (
                      <img src={n.imageUrl} alt="" loading="lazy"
                        className="mt-2 w-full max-h-64 object-cover rounded-xl border border-slate-100" />
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{timeAgo(n.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
