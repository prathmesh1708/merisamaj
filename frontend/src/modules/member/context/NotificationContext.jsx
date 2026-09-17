import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Bell, X, ExternalLink, MessageCircle } from 'lucide-react';
import { useAuth } from '../../../core/auth/useAuth';
import { useHeadAuth } from '../../../modules/head/auth/useHeadAuth';
import { useAdminAuth } from '../../../modules/admin/auth/useAdminAuth';
import { notificationService, matrimonialChatService } from '../../../core/api/matrimonialService';
import { memberChatService } from '../../../core/api/memberChatService';
import { groupService } from '../../../core/api/groupService';
import { getSocket } from '../hooks/useChatSocket';
import { PushPermissionModal } from '../components/layout/PushPermissionModal';

// ─── Context ──────────────────────────────────────────────────────────────────
const NotificationContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { headAuth } = useHeadAuth();
  const { adminAuth } = useAdminAuth();
  const activeUser = user || headAuth?.headUser || adminAuth?.adminUser;

  const [unreadCount, setUnreadCount]               = useState(0);
  const [unreadChatCount, setUnreadChatCount]       = useState(0);
  const [latestNotification, setLatestNotification] = useState(null);
  const [toastNotif, setToastNotif]                 = useState(null);
  const toastTimeoutRef = useRef(null);

  const isFetchingRef = useRef(false);
  const debounceTimerRef = useRef(null);

  // ── Fetch initial unread counts on mount / when user changes ───────────────
  const fetchUnreadCounts = useCallback(async () => {
    const userId = activeUser?._id || activeUser?.id;
    if (!userId) {
      setUnreadCount(0);
      setUnreadChatCount(0);
      setLatestNotification(null);
      setToastNotif(null);
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      // 1. System Notifications Unread
      const notifPromise = notificationService.getUnread().catch(() => null);

      // 2. Chat Messages Unread across member, group, and matrimonial conversations
      const chatPromises = Promise.allSettled([
        memberChatService.getConversations(),
        groupService.getMyGroups(),
        matrimonialChatService.getConversations()
      ]);

      const [notifRes, chatSettled] = await Promise.all([notifPromise, chatPromises]);

      if (notifRes?.data?.data) {
        setUnreadCount(notifRes.data.data.count || notifRes.data.data.unreadCount || 0);
      }

      const [memberRes, groupRes, matRes] = chatSettled;
      let totalChatUnread = 0;
      if (memberRes.status === 'fulfilled') {
        const memberConvs = memberRes.value.data?.data?.conversations || [];
        totalChatUnread += memberConvs.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
      }
      if (groupRes.status === 'fulfilled') {
        const groups = groupRes.value.data?.data?.groups || [];
        totalChatUnread += groups.reduce((acc, g) => acc + (g.unreadCount || 0), 0);
      }
      if (matRes.status === 'fulfilled') {
        const matConvs = matRes.value.data?.data?.conversations || [];
        totalChatUnread += matConvs.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
      }
      setUnreadChatCount(totalChatUnread);
    } catch {
      // Non-critical background fetch
    } finally {
      isFetchingRef.current = false;
    }
  }, [activeUser?._id, activeUser?.id]);

  const debouncedFetchUnreadCounts = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchUnreadCounts();
    }, 1500);
  }, [fetchUnreadCounts]);

  useEffect(() => {
    fetchUnreadCounts();
    const handleFocus = () => debouncedFetchUnreadCounts();
    const handleCustomRefresh = () => debouncedFetchUnreadCounts();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('app:refresh_unread_counts', handleCustomRefresh);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('app:refresh_unread_counts', handleCustomRefresh);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [fetchUnreadCounts, debouncedFetchUnreadCounts]);

  // ── Socket listener for real-time notifications & incoming messages ─────────
  useEffect(() => {
    const userId = activeUser?._id || activeUser?.id;
    if (!userId) return;

    const socket = getSocket(userId);
    if (!socket) return;

    // Standard notifications
    const newHandler = (notification) => {
      setUnreadCount(c => c + 1);
      setLatestNotification(notification);
      setToastNotif(notification);

      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToastNotif(null);
      }, 6000);
    };

    const updateHandler = (notification) => {
      setLatestNotification(notification);
      setToastNotif(notification);

      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToastNotif(null);
      }, 6000);
    };

    // Chat Message Socket Handlers
    const newChatMessageHandler = (msg) => {
      const myId = (activeUser?._id || activeUser?.id)?.toString();
      const senderId = (msg.senderId?._id || msg.senderId)?.toString();

      // Only count and alert if the message was sent by someone else
      if (senderId && senderId !== myId) {
        debouncedFetchUnreadCounts();

        const senderName = msg.senderId?.name || 'Community Member';
        const preview = msg.message || (msg.type === 'image' ? '📷 Sent a photo' : '💬 Sent a message');

        setToastNotif({
          id: `chat-${Date.now()}`,
          title: `Message from ${senderName}`,
          message: preview,
          actionUrl: `/member/chat/conv/${msg.conversationId || ''}`,
          icon: '💬',
          isChat: true
        });

        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => {
          setToastNotif(null);
        }, 6000);
      }
    };

    const messagesSeenHandler = () => {
      debouncedFetchUnreadCounts();
    };

    socket.on('notification:new', newHandler);
    socket.on('notification:update', updateHandler);
    socket.on('chat:new_message', newChatMessageHandler);
    socket.on('matrimonial:new_message', newChatMessageHandler);
    socket.on('chat:messages_seen', messagesSeenHandler);
    socket.on('matrimonial:messages_seen', messagesSeenHandler);

    return () => {
      socket.off('notification:new', newHandler);
      socket.off('notification:update', updateHandler);
      socket.off('chat:new_message', newChatMessageHandler);
      socket.off('matrimonial:new_message', newChatMessageHandler);
      socket.off('chat:messages_seen', messagesSeenHandler);
      socket.off('matrimonial:messages_seen', messagesSeenHandler);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [activeUser?._id, activeUser?.id, debouncedFetchUnreadCounts]);


  // ── Actions ────────────────────────────────────────────────────────────────
  const resetUnreadCount        = useCallback(() => setUnreadCount(0), []);
  const decrementUnreadCount    = useCallback(() => setUnreadCount(c => Math.max(0, c - 1)), []);
  const resetUnreadChatCount    = useCallback(() => setUnreadChatCount(0), []);
  const decrementUnreadChatCount = useCallback((amt = 1) => setUnreadChatCount(c => Math.max(0, c - amt)), []);

  const handleToastClick = () => {
    if (!toastNotif) return;
    const url = toastNotif.actionUrl || (toastNotif.isChat ? '/member/chat' : '/member/notifications');
    setToastNotif(null);
    window.location.href = url;
  };

  return (
    <NotificationContext.Provider value={{
      unreadCount,
      unreadChatCount,
      latestNotification,
      resetUnreadCount,
      decrementUnreadCount,
      resetUnreadChatCount,
      decrementUnreadChatCount,
      refreshUnreadChatCount: fetchUnreadCounts
    }}>
      {children}

      {/* ── Live Toast Notification Popup Banner ──────────────────────────── */}
      {toastNotif && (
        <div
          onClick={handleToastClick}
          className="fixed top-4 right-4 left-4 sm:left-auto sm:max-w-md z-[9999] bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/50 flex items-start gap-3.5 cursor-pointer transform transition-all duration-300 hover:scale-[1.02] active:scale-95 animate-in fade-in slide-in-from-top-4"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-md ${
            toastNotif.isChat ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white' : 'bg-gradient-to-tr from-rose-500 to-amber-500 text-white'
          }`}>
            {toastNotif.isChat ? <MessageCircle size={22} className="text-white" /> : (toastNotif.icon || '🔔')}
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                toastNotif.isChat ? 'text-emerald-400 bg-emerald-500/20' : 'text-rose-400 bg-rose-500/20'
              }`}>
                {toastNotif.isChat ? 'New Message' : 'Live Alert'}
              </span>
              <span className="text-[11px] text-slate-400">Just now</span>
            </div>
            <h4 className="text-sm font-bold text-white mt-1 truncate">
              {toastNotif.title || (toastNotif.isChat ? 'New Chat Message' : 'New Notification')}
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-snug">
              {toastNotif.message}
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setToastNotif(null); }}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Non-Intrusive Push Permission Prompt Modal ────────────────────── */}
      <PushPermissionModal />
    </NotificationContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationProvider>');
  return ctx;
};

export default NotificationContext;
