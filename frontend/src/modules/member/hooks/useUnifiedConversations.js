import { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Socket Updates
  const { isConnected, isUserOnline } = useChatSocket({
    onNewMessage: (msg) => {
      setConversations(prev => {
        const idx = prev.findIndex(c => c.conversationId === msg.conversationId?.toString());
        if (idx === -1) {
          fetchAll(); // Refresh if unknown conversation
          return prev;
        }
        const current = prev[idx];
        const updated = {
          ...current,
          lastMessageAt: msg.createdAt,
          lastMessagePreview: msg.message || '📷',
          unreadCount: msg.senderId?._id !== (user?.id || user?._id) ? (current.unreadCount + 1) : current.unreadCount,
          metadata: {
            ...current.metadata,
            lastMessageSender: msg.senderId?._id
          }
        };
        const rest = prev.filter((_, i) => i !== idx);
        return [updated, ...rest]; // Move to top
      });
    },
    onMessagesSeen: ({ conversationId }) => {
      setConversations(prev => prev.map(c => 
        c.conversationId === conversationId 
          ? { ...c, unreadCount: 0 }
          : c
      ));
    }
  });

  const markConversationRead = useCallback((conversationId) => {
    setConversations(prev => prev.map(c => 
      c.conversationId === conversationId ? { ...c, unreadCount: 0 } : c
    ));
    if (refreshUnreadChatCount) {
      refreshUnreadChatCount();
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
