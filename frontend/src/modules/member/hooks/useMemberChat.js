/**
 * useMemberChat.js
 * State management hook for 1-to-1 Community Member Chat.
 * Handles conversation list, messages, and real-time socket updates.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { memberChatService } from '../../../core/api/memberChatService';
import { useChatSocket } from './useChatSocket';
import { useAuth } from '../../../core/auth/useAuth';

/**
 * For the conversation list (ChatListPage)
 */
export const useMemberConversations = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const { user } = useAuth();

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await memberChatService.getConversations();
      setConversations(res.data?.data?.conversations || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load chats.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  // Socket: update conversation list when a new message arrives (bring to top)
  const { isConnected } = useChatSocket({
    onNewMessage: (msg) => {
      setConversations(prev => {
        const convId = msg.conversationId?.toString();
        const idx = prev.findIndex(c => c._id === convId);
        const preview = msg.message || (msg.type === 'image' ? '📷 Photo' : msg.type === 'file' ? '📎 File' : '💬 Message');
        const msgTime = msg.createdAt || new Date().toISOString();

        if (idx === -1) {
          // Construct new conversation entry locally from socket payload
          const sender = typeof msg.senderId === 'object' && msg.senderId?.name ? msg.senderId : null;
          const myProfile = user ? { _id: user.id || user._id, name: user.name, avatar: user.avatar } : null;
          const participants = [];
          if (sender) participants.push(sender);
          if (myProfile && (!sender || sender._id?.toString() !== myProfile._id?.toString())) {
            participants.push(myProfile);
          }

          const newConversation = {
            _id: convId,
            lastMessageAt: msgTime,
            lastMessagePreview: preview,
            unreadCount: msg.senderId?._id?.toString() !== (user?.id || user?._id)?.toString() ? 1 : 0,
            participants,
            createdAt: msgTime,
            updatedAt: msgTime
          };
          return [newConversation, ...prev];
        }

        const updated = {
          ...prev[idx],
          lastMessageAt: msgTime,
          lastMessagePreview: preview,
          unreadCount: msg.senderId?._id?.toString() !== (user?.id || user?._id)?.toString() 
            ? (prev[idx].unreadCount || 0) + 1 
            : prev[idx].unreadCount || 0
        };
        const rest = prev.filter((_, i) => i !== idx);
        return [updated, ...rest];
      });
    }
  });

  const openConversation = useCallback(async (targetUserId) => {
    const res = await memberChatService.openConversation(targetUserId);
    return res.data?.data;
  }, []);

  return { conversations, loading, error, refresh: fetch, openConversation, isConnected };
};

/**
 * For the chat room (ChatRoomPage) — loads and manages messages for one conversation
 */
export const useMemberChat = (conversationId) => {
  const [messages, setMessages]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [sending, setSending]       = useState(false);
  const [error, setError]           = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [hasMore, setHasMore]       = useState(false);
  const [page, setPage]             = useState(1);
  const { user } = useAuth();
  const LIMIT = 50;

  // ── Load messages ──────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (pageNum = 1, prepend = false) => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const res = await memberChatService.getMessages(conversationId, { page: pageNum, limit: LIMIT });
      const fetched = res.data?.data?.messages || [];
      const total   = res.data?.data?.total || 0;
      setMessages(prev => prepend ? [...fetched, ...prev] : fetched);
      setHasMore(total > pageNum * LIMIT);
      setPage(pageNum);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load messages.');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    setMessages([]);
    setPage(1);
    fetchMessages(1);
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadOlderMessages = useCallback(() => {
    if (hasMore && !loading) fetchMessages(page + 1, true);
  }, [fetchMessages, hasMore, loading, page]);

  // ── Socket integration ────────────────────────────────────────────────────
  const { startTyping, stopTyping, markSeen, isConnected, isUserOnline } = useChatSocket({
    conversationId,

    onNewMessage: (msg) => {
      if (msg.conversationId !== conversationId) return;
      const currentUserId = (user?.id || user?._id)?.toString();

      setMessages(prev => {
        // Direct deduplication check by _id
        if (prev.some(m => m._id === msg._id)) return prev;

        // If the socket message is from the current user, check if there's a pending optimistic temp_ message to replace
        const msgSenderId = (msg.senderId?._id || msg.senderId?.id || msg.senderId)?.toString();
        if (msgSenderId && currentUserId && msgSenderId === currentUserId) {
          const tempIndex = prev.findIndex(m => typeof m._id === 'string' && m._id.startsWith('temp_'));
          if (tempIndex !== -1) {
            const updated = [...prev];
            updated[tempIndex] = { ...msg, status: 'sent' };
            return updated;
          }
        }

        return [...prev, msg];
      });

      // Auto mark as seen if message is from another user
      const msgSenderId = (msg.senderId?._id || msg.senderId?.id || msg.senderId)?.toString();
      if (msgSenderId && currentUserId && msgSenderId !== currentUserId) {
        markSeen([msg._id]);
      }
    },

    onUserTyping: ({ userId: typingUserId, conversationId: cId }) => {
      if (cId !== conversationId) return;
      setTypingUsers(prev =>
        prev.includes(typingUserId) ? prev : [...prev, typingUserId]
      );
    },

    onUserStoppedTyping: ({ userId: typingUserId, conversationId: cId }) => {
      if (cId !== conversationId) return;
      setTypingUsers(prev => prev.filter(id => id !== typingUserId));
    },

    onMessageDeleted: ({ messageId, conversationId: cId }) => {
      if (cId !== conversationId) return;
      setMessages(prev => prev.map(m =>
        m._id === messageId
          ? { ...m, isDeleted: true, type: 'deleted', message: 'This message was deleted' }
          : m
      ));
    },

    onMessageEdited: (updatedMsg) => {
      const cId = updatedMsg.conversationId?._id || updatedMsg.conversationId;
      if (cId?.toString() !== conversationId?.toString()) return;
      setMessages(prev => prev.map(m =>
        m._id === updatedMsg._id ? { ...m, ...updatedMsg } : m
      ));
    },

    onMessagesSeen: ({ userId: seenByUserId, messageIds }) => {
      setMessages(prev => prev.map(m =>
        messageIds.includes(m._id)
          ? { ...m, seenBy: [...(m.seenBy || []), { userId: seenByUserId, seenAt: new Date().toISOString() }] }
          : m
      ));
    },

    onMessagesDelivered: ({ userId: deliveredTo }) => {
      setMessages(prev => prev.map(m => ({
        ...m,
        deliveredTo: [...new Set([...(m.deliveredTo || []), deliveredTo])]
      })));
    }
  });

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async ({ text, imageFile, replyTo }) => {
    if (!conversationId) return;
    setSending(true);

    // Optimistic update
    const tempId = `temp_${Date.now()}`;
    const userId = user?.id || user?._id;
    if (!userId) return;

    const optimistic = {
      _id: tempId,
      conversationId,
      senderId: { _id: userId, name: user.name, avatar: user.avatar },
      message: text || '',
      type: imageFile ? 'image' : 'text',
      mediaUrl: imageFile ? URL.createObjectURL(imageFile) : null,
      replyTo: replyTo || null,
      createdAt: new Date().toISOString(),
      status: 'sending',
      seenBy: [],
      deliveredTo: []
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      let res;
      if (imageFile) {
        const formData = new FormData();
        if (text) formData.append('message', text);
        formData.append('photo', imageFile);
        if (replyTo) formData.append('replyTo', replyTo);
        res = await memberChatService.sendImageMessage(conversationId, formData);
      } else {
        res = await memberChatService.sendMessage(conversationId, {
          message: text,
          type: 'text',
          replyTo: replyTo || undefined
        });
      }

      const saved = res.data?.data?.message;
      if (saved && saved._id) {
        setMessages(prev => {
          const alreadyHasReal = prev.some(m => m._id === saved._id);
          if (alreadyHasReal) {
            return prev.filter(m => m._id !== tempId);
          } else {
            return prev.map(m => m._id === tempId ? { ...saved, status: 'sent' } : m);
          }
        });
      }
    } catch (err) {
      // Mark as failed
      setMessages(prev => prev.map(m => m._id === tempId ? { ...m, status: 'failed' } : m));
      throw err;
    } finally {
      setSending(false);
    }
  }, [conversationId, user]);

  // ── Edit message ───────────────────────────────────────────────────────────
  const editMessage = useCallback(async (messageId, newText) => {
    const res = await memberChatService.editMessage(messageId, newText);
    const updated = res.data?.data?.message;
    if (updated) {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, ...updated } : m));
    }
    return updated;
  }, []);

  // ── Delete message ─────────────────────────────────────────────────────────
  const deleteMessage = useCallback(async (messageId, deleteFor = 'me') => {
    await memberChatService.deleteMessage(messageId, deleteFor);
    if (deleteFor === 'everyone') {
      setMessages(prev => prev.map(m =>
        m._id === messageId
          ? { ...m, isDeleted: true, type: 'deleted', message: 'This message was deleted' }
          : m
      ));
    } else {
      setMessages(prev => prev.filter(m => m._id !== messageId));
    }
  }, []);

  // ── Clear chat ─────────────────────────────────────────────────────────────
  const clearChat = useCallback(async () => {
    if (!conversationId) return;
    await memberChatService.clearChat(conversationId);
    setMessages([]);
  }, [conversationId]);

  // ── Delete conversation ────────────────────────────────────────────────────
  const deleteConversation = useCallback(async () => {
    if (!conversationId) return;
    await memberChatService.deleteConversation(conversationId);
    setMessages([]);
  }, [conversationId]);

  return {
    messages,
    loading,
    sending,
    error,
    hasMore,
    typingUsers,
    isConnected,
    isUserOnline,
    loadOlderMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    clearChat,
    deleteConversation,
    startTyping,
    stopTyping,
    markSeen
  };
};

export default useMemberChat;
