/**
 * useMatrimonialChat.js
 * Hook for matrimonial chat with Socket.io real-time integration.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { matrimonialChatService } from '../core/api/matrimonialService';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
  || (import.meta.env.VITE_API_URL?.replace(/\/api\/v1\/?$/, ''))
  || 'http://localhost:5000';

export const useMatrimonialChat = (userId) => {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages]           = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [onlineUsers, setOnlineUsers]     = useState([]);
  const [typingUsers, setTypingUsers]     = useState({});
  const [loading, setLoading]             = useState(false);
  const [sending, setSending]             = useState(false);
  const socketRef = useRef(null);

  // ─── Socket Connection ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const token = localStorage.getItem('merisamaj_token');
    socketRef.current = io(SOCKET_URL, {
      auth: { userId, token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5
    });

    const socket = socketRef.current;

    socket.on('connect', () => console.log('[Socket] Connected for matrimonial chat'));
    socket.on('disconnect', () => console.log('[Socket] Disconnected'));

    socket.on('matrimonial:online_users', (users) => setOnlineUsers(users));

    socket.on('matrimonial:new_message', (msg) => {
      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      // Update conversation preview
      setConversations(prev =>
        prev.map(c =>
          c._id === msg.conversationId
            ? { ...c, lastMessagePreview: msg.type === 'image' ? '📷 Photo' : msg.message, lastMessageAt: msg.createdAt }
            : c
        ).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
      );
    });

    socket.on('matrimonial:user_typing', ({ userId: tid, conversationId }) => {
      setTypingUsers(prev => ({ ...prev, [conversationId]: tid }));
    });

    socket.on('matrimonial:user_stopped_typing', ({ conversationId }) => {
      setTypingUsers(prev => {
        const next = { ...prev };
        delete next[conversationId];
        return next;
      });
    });

    socket.on('matrimonial:messages_seen', ({ userId: sid, messageIds }) => {
      setMessages(prev => prev.map(m =>
        messageIds.includes(m._id)
          ? { ...m, seenBy: [...(m.seenBy || []), { userId: sid, seenAt: new Date() }] }
          : m
      ));
    });

    socket.on('matrimonial:message_deleted', ({ conversationId, messageId }) => {
      setMessages(prev => prev.map(m => 
        m._id === messageId 
          ? { ...m, isDeleted: true, message: 'This message was deleted', type: 'deleted', mediaUrl: null, mediaPublicId: null }
          : m
      ));
      
      setConversations(prev => {
        return prev.map(c => {
          if (c._id !== conversationId) return c;
          
          if (c.lastMessageId === messageId || c.lastMessageId?._id === messageId) {
            return { ...c, lastMessagePreview: 'This message was deleted' };
          }
          return c;
        });
      });
    });

    socket.on('matrimonial:marriageAccepted', () => {
      setConversations(prev => prev.map(c => ({ ...c, isReadOnly: true, isArchived: true })));
    });

    return () => socket.disconnect();
  }, [userId]);

  // ─── Join a conversation room ──────────────────────────────────────────────
  const joinConversation = useCallback((conversationId) => {
    socketRef.current?.emit('matrimonial:join_conversation', { conversationId });
  }, []);

  // ─── Fetch Conversations (REST) ────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await matrimonialChatService.getConversations();
      setConversations(res.data.data.conversations);
    } catch (err) {
      console.error('Failed to fetch conversations:', err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Fetch Messages (REST) ─────────────────────────────────────────────────
  const fetchMessages = useCallback(async (conversationId, params) => {
    setLoading(true);
    try {
      const res = await matrimonialChatService.getMessages(conversationId, params);
      setMessages(res.data.data.messages);
      setActiveConversation(conversationId);
      joinConversation(conversationId);
    } catch (err) {
      console.error('Failed to fetch messages:', err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  }, [joinConversation]);

  // ─── Send Message (Socket.io — with REST fallback) ─────────────────────────
  const sendMessage = useCallback(async (conversationId, data) => {
    setSending(true);
    try {
      // If data is FormData (image upload), we MUST use REST
      if (socketRef.current?.connected && !(data instanceof FormData)) {
        // Map frontend fields to backend socket expectations
        const socketPayload = {
          conversationId,
          message: data.message,
          type: data.messageType || 'text',
          replyTo: data.replyToId || null
        };
        socketRef.current.emit('matrimonial:send_message', socketPayload);
      } else {
        let res;
        if (data instanceof FormData) {
          res = await matrimonialChatService.sendImageMessage(conversationId, data);
        } else {
          res = await matrimonialChatService.sendMessage(conversationId, data);
        }
        setMessages(prev => {
          if (prev.some(m => m._id === res.data.data.message._id)) return prev;
          return [...prev, res.data.data.message];
        });
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message };
    } finally {
      setSending(false);
    }
  }, []);

  // ─── Delete Message ────────────────────────────────────────────────────────
  const deleteMessage = useCallback(async (msgId, deleteFor = 'me') => {
    try {
      await matrimonialChatService.deleteMessage(msgId, { deleteFor });
      if (deleteFor === 'everyone') {
        setMessages(prev => prev.map(m =>
          m._id === msgId ? { ...m, isDeleted: true, message: 'This message was deleted', type: 'deleted', mediaUrl: null, mediaPublicId: null } : m
        ));
      } else {
        // Mark as deleted for current user — filter from list
        setMessages(prev => prev.filter(m => m._id !== msgId));
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message };
    }
  }, []);

  // ─── Typing Indicators ─────────────────────────────────────────────────────
  const emitTyping = useCallback((conversationId) => {
    socketRef.current?.emit('matrimonial:typing_start', { conversationId });
  }, []);

  const stopTyping = useCallback((conversationId) => {
    socketRef.current?.emit('matrimonial:typing_stop', { conversationId });
  }, []);

  // ─── Mark Seen ────────────────────────────────────────────────────────────
  const markSeen = useCallback((conversationId, messageIds) => {
    socketRef.current?.emit('matrimonial:mark_seen', { conversationId, messageIds });
  }, []);

  const isOnline = useCallback((uid) => onlineUsers.includes(uid?.toString()), [onlineUsers]);

  return {
    conversations, messages, onlineUsers, typingUsers, loading, sending, activeConversation,
    fetchConversations, fetchMessages, sendMessage, deleteMessage, emitTyping, stopTyping, markSeen, isOnline
  };
};
