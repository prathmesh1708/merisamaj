import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { memberChatService } from '../../../core/api/memberChatService';
import { groupService } from '../../../core/api/groupService';
import { matrimonialChatService } from '../../../core/api/matrimonialService';
import { useChatSocket } from './useChatSocket';
import { useAuth } from '../../../core/auth/useAuth';
import { useNotifications } from '../context/NotificationContext';

export const useUnifiedConversations = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { refreshUnreadChatCount } = useNotifications();

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [memberRes, groupRes, matRes] = await Promise.allSettled([
        memberChatService.getConversations(),
        groupService.getMyGroups(),
        matrimonialChatService.getConversations()
      ]);

      const myId = (user?.id || user?._id || '').toString();
      const normalized = [];

      // 1. Direct Chats (Member)
      if (memberRes.status === 'fulfilled') {
        const memberChats = memberRes.value.data?.data?.conversations || [];
        memberChats.forEach(c => {
          const otherUser = c.otherUser || c.participants?.find(p => {
            const pid = (p?._id?._id || p?._id || p?.id || p || '').toString();
            return pid && pid !== myId;
          });
          normalized.push({
            id: c._id,
            conversationId: c._id,
            type: 'direct',
            title: otherUser?.name || 'Community Member',
            avatar: otherUser?.avatar || null,
            lastMessagePreview: c.lastMessagePreview || c.lastMessageId?.message || '',
            lastMessageAt: c.lastMessageAt || c.createdAt,
            unreadCount: c.unreadCount || 0,
            route: `/member/chat/conv/${c._id}`,
            lastMessageStatus: c.lastMessageStatus || null,
            isOnline: false, // Updated by socket if needed
            isPinned: false,
            metadata: {
              targetUserId: otherUser?._id || otherUser?.id,
              verificationStatus: otherUser?.verificationStatus
            }
          });
        });
      }

      // 2. Group Chats
      if (groupRes.status === 'fulfilled') {
        const groups = groupRes.value.data?.data?.groups || [];
        groups.forEach(g => {
          if (!g.conversationId) return; // Skip if group has no conversation
          normalized.push({
            id: g.conversationId.toString(),
            conversationId: g.conversationId,
            groupId: g._id,
            type: 'group',
            title: g.name,
            avatar: g.avatar || null,
            lastMessagePreview: g.lastMessagePreview || '',
            lastMessageAt: g.lastMessageAt || g.updatedAt,
            unreadCount: g.unreadCount || 0,
            route: `/member/groups/${g._id}`,
            isOnline: false,
            isPinned: false,
            metadata: {
              memberCount: g.memberCount,
              myRole: g.myRole,
              category: g.category,
              lastMessageSender: g.lastMessageSender
            }
          });
        });
      }

      // 3. Matrimonial Chats
      if (matRes.status === 'fulfilled') {
        const matChats = matRes.value.data?.data?.conversations || [];
        matChats.forEach(c => {
          const otherUser = c.otherUser || c.participants?.find(p => {
            const pid = (p?._id?._id || p?._id || p?.id || p || '').toString();
            return pid && pid !== myId;
          });
          normalized.push({
            id: c._id,
            conversationId: c._id,
            type: 'matrimonial',
            title: otherUser?.name || 'Match',
            avatar: otherUser?.avatar || null,
            lastMessagePreview: c.lastMessagePreview || c.lastMessageId?.message || '',
            lastMessageAt: c.lastMessageAt || c.createdAt,
            unreadCount: c.unreadCount || 0,
            route: `/member/matrimonial/chat/${c._id}`,
            lastMessageStatus: c.lastMessageStatus || null,
            readReceipts: c.readReceipts !== false,
            isOnline: false,
            isPinned: false,
            metadata: {
              targetUserId: otherUser?._id || otherUser?.id,
              referenceId: c.referenceId
            }
          });
        });
      }

      // Sort by lastMessageAt descending
      normalized.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

      setConversations(normalized);
    } catch (err) {
      setError('Failed to load conversations.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // The server sends each new message twice (to the chat room and to my personal
  // room), so remember which ones were already counted — otherwise unread doubles.
  const countedMessageIdsRef = useRef(new Set());

  // Socket Updates
  const { isConnected, isUserOnline } = useChatSocket({
    // The other person's phone received my messages (they came online): ✓ → ✓✓
    onMessagesDelivered: ({ conversationId, userId: deliveredTo }) => {
      const myId = (user?.id || user?._id)?.toString();
      if (!deliveredTo || deliveredTo.toString() === myId) return;
      setConversations(prev => prev.map(c =>
        c.conversationId?.toString() === conversationId?.toString() && c.lastMessageStatus === 'sent'
          ? { ...c, lastMessageStatus: 'delivered' }
          : c
      ));
    },
    onNewMessage: (msg) => {
      const msgId = msg._id?.toString();
      if (msgId) {
        if (countedMessageIdsRef.current.has(msgId)) return; // second copy of the same message
        countedMessageIdsRef.current.add(msgId);
        if (countedMessageIdsRef.current.size > 500) {
          countedMessageIdsRef.current = new Set([...countedMessageIdsRef.current].slice(-250));
        }
      }
      setConversations(prev => {
        const idx = prev.findIndex(c => c.conversationId?.toString() === msg.conversationId?.toString());
        if (idx === -1) {
          fetchAll(); // Refresh if unknown conversation
          return prev;
        }
        const myId = (user?.id || user?._id)?.toString();
        const senderId = (msg.senderId?._id || msg.senderId)?.toString();
        const isFromOther = senderId && senderId !== myId;

        const current = prev[idx];
        // My own message: ✓, or ✓✓ if it already reached the other phone
        const deliveredToOther = (msg.deliveredTo || []).some(d => String(d?._id || d) !== myId && String(d?._id || d) !== senderId);
        const updated = {
          ...current,
          lastMessageAt: msg.createdAt,
          lastMessagePreview: msg.message || '📷',
          lastMessageStatus: isFromOther ? null : (deliveredToOther ? 'delivered' : 'sent'),
          unreadCount: isFromOther ? (current.unreadCount + 1) : current.unreadCount,
          metadata: {
            ...current.metadata,
            lastMessageSender: msg.senderId?._id || msg.senderId
          }
        };
        const rest = prev.filter((_, i) => i !== idx);
        return [updated, ...rest]; // Move to top
      });

      if (refreshUnreadChatCount) {
        refreshUnreadChatCount();
      }
    },
    onMessagesSeen: ({ conversationId, userId: seenBy }) => {
      // Only *my* reading clears my unread count (not the other person reading my messages)
      const myId = (user?.id || user?._id)?.toString();
      if (seenBy && seenBy.toString() !== myId) {
        // The other person read the chat: my last message there turns blue
        setConversations(prev => prev.map(c =>
          c.conversationId?.toString() === conversationId?.toString() && c.lastMessageStatus
            ? { ...c, lastMessageStatus: c.readReceipts === false ? 'delivered' : 'seen' }
            : c
        ));
        return;
      }
      setConversations(prev => prev.map(c =>  
        c.conversationId?.toString() === conversationId?.toString()
          ? { ...c, unreadCount: 0 }
          : c
      ));
      if (refreshUnreadChatCount) {
        refreshUnreadChatCount();
      }
    }
  });

  // `opening`: the chat is being opened — its screen marks it seen itself (see below)
  const markConversationRead = useCallback((conversationId, type = 'direct', { opening = false } = {}) => {
    if (!conversationId) return;
    setConversations(prev => prev.map(c => 
      c.conversationId?.toString() === conversationId?.toString() ? { ...c, unreadCount: 0 } : c
    ));
    if (type === 'group') {
      groupService.markGroupSeen(conversationId).catch(() => {});
    } else if (type === 'matrimonial') {
      matrimonialChatService.markSeen(conversationId).catch(() => {});
    } else if (!opening) {
      memberChatService.markSeen(conversationId).catch(() => {});
    }
    // When opening a one-to-one chat we don't mark it seen here: the chat screen does it
    // right after finding the first unread message (so it can open there, like WhatsApp).
    window.dispatchEvent(new Event('app:refresh_unread_counts'));
    if (refreshUnreadChatCount) {
      setTimeout(() => refreshUnreadChatCount(), 300);
    }
  }, [refreshUnreadChatCount]);

  const sortedAndOnline = useMemo(() => {
    return conversations.map(c => ({
      ...c,
      isOnline: c.metadata?.targetUserId ? isUserOnline(c.metadata.targetUserId) : false
    }));
  }, [conversations, isUserOnline]);

  return {
    conversations: sortedAndOnline,
    loading,
    error,
    refreshConversations: fetchAll,
    markConversationRead,
    isConnected
  };
};
