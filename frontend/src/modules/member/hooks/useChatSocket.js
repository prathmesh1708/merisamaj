/**
 * useChatSocket.js
 * Generic Socket.io hook for Community Chat (member, group, community types).
 * Handles connection, room joining, message events, typing, read receipts.
 *
 * Does NOT handle matrimonial chat — that uses its own socket handling.
 *
 * Usage:
 *  const { sendMessage, startTyping, stopTyping, markSeen, onlineUsers, isConnected }
 *    = useChatSocket({ conversationId, onNewMessage, onUserTyping, onMessageDeleted, onMessagesSeen });
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../../core/auth/useAuth';

// ─── Singleton socket instance (shared across components in same session) ──────
let socketInstance = null;
let currentSocketUserId = null;

export const getResolvedSocketUrl = () => {
  const envSocketUrl = import.meta.env.VITE_SOCKET_URL;
  const envApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';

  // In production (running on live domain/IP, not localhost/127.0.0.1)
  if (typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    // If env variable is missing, relative '/', or mistakenly points to localhost
    if (!envSocketUrl || envSocketUrl === '/' || envSocketUrl.includes('localhost') || envSocketUrl.includes('127.0.0.1')) {
      return window.location.origin;
    }
    return envSocketUrl;
  }

  return envSocketUrl
    || (envApiUrl ? envApiUrl.replace(/\/api\/v1\/?$/, '') : '')
    || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5001');
};

export const getSocket = (userId) => {
  if (!userId) return null;
  const targetUserId = userId.toString();

  // Reuse existing socket instance if already assigned to this user
  if (socketInstance && currentSocketUserId === targetUserId) {
    if (socketInstance.disconnected && !socketInstance.connecting) {
      socketInstance.connect();
    }
    return socketInstance;
  }

  // If user changed or socket doesn't exist, cleanup previous instance
  if (socketInstance) {
    try {
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
    } catch (e) {
      console.warn('[ChatSocket] Error cleaning up previous socket instance:', e);
    }
    socketInstance = null;
  }

  currentSocketUserId = targetUserId;

  const backendUrl = getResolvedSocketUrl();

  const token = typeof localStorage !== 'undefined'
    ? (localStorage.getItem('merisamaj_token') || localStorage.getItem('admin_auth_token') || localStorage.getItem('head_auth_token'))
    : null;

  socketInstance = io(backendUrl, {
    auth: { userId: targetUserId, token },
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10
  });

  socketInstance.on('connect_error', (err) => {
    console.warn('[ChatSocket] Connection error to', backendUrl, ':', err?.message || err);
  });

  return socketInstance;
};

/**
 * @param {Object} options
 * @param {string}   [options.conversationId]   - Join this conversation room on mount
 * @param {Function} [options.onNewMessage]      - Called when a new message arrives
 * @param {Function} [options.onUserTyping]      - Called when someone starts typing
 * @param {Function} [options.onUserStoppedTyping]
 * @param {Function} [options.onMessageDeleted]  - Called when a message is deleted
 * @param {Function} [options.onMessagesSeen]    - Called when messages are seen by a user
 * @param {Function} [options.onMessagesDelivered]
 * @param {Function} [options.onMemberJoined]    - Group events
 * @param {Function} [options.onMemberLeft]
 * @param {Function} [options.onMemberAdded]
 * @param {Function} [options.onMemberRemoved]
 * @param {Function} [options.onMemberPromoted]
 * @param {Function} [options.onMemberDemoted]
 */
export const useChatSocket = ({
  conversationId,
  onNewMessage,
  onUserTyping,
  onUserStoppedTyping,
  onMessageDeleted,
  onMessageEdited,
  onMessagesSeen,
  onMessagesDelivered,
  onMemberJoined,
  onMemberLeft,
  onMemberAdded,
  onMemberRemoved,
  onMemberPromoted,
  onMemberDemoted
} = {}) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected]   = useState(false);
  const [onlineUsers, setOnlineUsers]   = useState([]);
  const typingTimeoutRef = useRef(null);
  const socketRef        = useRef(null);

  // Store active callbacks in ref so listeners always call the latest functions without stale closures
  const callbacksRef = useRef({});
  callbacksRef.current = {
    onNewMessage,
    onUserTyping,
    onUserStoppedTyping,
    onMessageDeleted,
    onMessageEdited,
    onMessagesSeen,
    onMessagesDelivered,
    onMemberJoined,
    onMemberLeft,
    onMemberAdded,
    onMemberRemoved,
    onMemberPromoted,
    onMemberDemoted
  };

  const convIdRef = useRef(conversationId);
  convIdRef.current = conversationId;

  useEffect(() => {
    const userId = user?.id || user?._id;
    if (!userId) return;

    const socket = getSocket(userId);
    if (!socket) return;
    socketRef.current = socket;

    setIsConnected(socket.connected);

    // ── Connection events ──────────────────────────────────────────────────
    const onConnect = () => {
      setIsConnected(true);
      const activeConvId = convIdRef.current;
      if (activeConvId) {
        socket.emit('chat:join_conversation', { conversationId: activeConvId });
      }
    };

    const onDisconnect = () => setIsConnected(false);

    // Dynamic callback wrappers
    const handleNewMessage        = (msg) => callbacksRef.current.onNewMessage?.(msg);
    const handleUserTyping        = (data) => callbacksRef.current.onUserTyping?.(data);
    const handleUserStoppedTyping = (data) => callbacksRef.current.onUserStoppedTyping?.(data);
    const handleMessageDeleted    = (data) => callbacksRef.current.onMessageDeleted?.(data);
    const handleMessageEdited     = (data) => callbacksRef.current.onMessageEdited?.(data);
    const handleMessagesSeen      = (data) => callbacksRef.current.onMessagesSeen?.(data);
    const handleMessagesDelivered = (data) => callbacksRef.current.onMessagesDelivered?.(data);
    const handleMemberJoined      = (data) => callbacksRef.current.onMemberJoined?.(data);
    const handleMemberLeft        = (data) => callbacksRef.current.onMemberLeft?.(data);
    const handleMemberAdded       = (data) => callbacksRef.current.onMemberAdded?.(data);
    const handleMemberRemoved     = (data) => callbacksRef.current.onMemberRemoved?.(data);
    const handleMemberPromoted    = (data) => callbacksRef.current.onMemberPromoted?.(data);
    const handleMemberDemoted     = (data) => callbacksRef.current.onMemberDemoted?.(data);
    const handleOnlineUsers       = (users) => setOnlineUsers(users || []);

    // ── Register listeners ─────────────────────────────────────────────────
    socket.on('connect',                  onConnect);
    socket.on('disconnect',               onDisconnect);
    socket.on('chat:new_message',          handleNewMessage);
    socket.on('chat:user_typing',          handleUserTyping);
    socket.on('chat:user_stopped_typing',  handleUserStoppedTyping);
    socket.on('chat:message_deleted',      handleMessageDeleted);
    socket.on('chat:message_edited',       handleMessageEdited);
    socket.on('chat:messages_seen',        handleMessagesSeen);
    socket.on('chat:messages_delivered',   handleMessagesDelivered);
    socket.on('chat:member_joined',        handleMemberJoined);
    socket.on('chat:member_left',          handleMemberLeft);
    socket.on('chat:member_added',         handleMemberAdded);
    socket.on('chat:member_removed',       handleMemberRemoved);
    socket.on('chat:member_promoted',      handleMemberPromoted);
    socket.on('chat:member_demoted',       handleMemberDemoted);
    socket.on('chat:online_users',         handleOnlineUsers);

    if (socket.connected) {
      setIsConnected(true);
      if (conversationId) {
        socket.emit('chat:join_conversation', { conversationId });
      }
    }

    return () => {
      socket.off('connect',                  onConnect);
      socket.off('disconnect',               onDisconnect);
      socket.off('chat:new_message',          handleNewMessage);
      socket.off('chat:user_typing',          handleUserTyping);
      socket.off('chat:user_stopped_typing',  handleUserStoppedTyping);
      socket.off('chat:message_deleted',      handleMessageDeleted);
      socket.off('chat:message_edited',       handleMessageEdited);
      socket.off('chat:messages_seen',        handleMessagesSeen);
      socket.off('chat:messages_delivered',   handleMessagesDelivered);
      socket.off('chat:member_joined',        handleMemberJoined);
      socket.off('chat:member_left',          handleMemberLeft);
      socket.off('chat:member_added',         handleMemberAdded);
      socket.off('chat:member_removed',       handleMemberRemoved);
      socket.off('chat:member_promoted',      handleMemberPromoted);
      socket.off('chat:member_demoted',       handleMemberDemoted);
      socket.off('chat:online_users',         handleOnlineUsers);
    };
  }, [user?.id, user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Dynamically join room whenever conversationId updates ────────────────
  useEffect(() => {
    if (!conversationId) return;
    const socket = socketRef.current || (user && getSocket(user.id || user._id));
    if (socket && socket.connected) {
      socket.emit('chat:join_conversation', { conversationId });
    }
  }, [conversationId, user]);

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Emit a message via socket.
   * Falls back silently; REST endpoint is always the source of truth for storage.
   */
  const sendSocketMessage = useCallback((payload) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat:send_message', { conversationId, ...payload });
    }
  }, [conversationId]);

  /** Emit typing start with debounced stop */
  const startTyping = useCallback(() => {
    if (!conversationId || !socketRef.current?.connected) return;
    socketRef.current.emit('chat:typing_start', { conversationId });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('chat:typing_stop', { conversationId });
    }, 3000);
  }, [conversationId]);

  const stopTyping = useCallback(() => {
    if (!conversationId || !socketRef.current?.connected) return;
    clearTimeout(typingTimeoutRef.current);
    socketRef.current.emit('chat:typing_stop', { conversationId });
  }, [conversationId]);

  /** Mark messages as seen */
  const markSeen = useCallback((messageIds) => {
    if (!conversationId || !socketRef.current?.connected) return;
    socketRef.current.emit('chat:mark_seen', { conversationId, messageIds });
  }, [conversationId]);

  /** Join a new conversation room (if changed dynamically) */
  const joinConversation = useCallback((convId) => {
    if (socketRef.current?.connected && convId) {
      socketRef.current.emit('chat:join_conversation', { conversationId: convId });
    }
  }, []);

  const isUserOnline = useCallback((userId) => {
    return onlineUsers.includes(userId?.toString());
  }, [onlineUsers]);

  return {
    isConnected,
    onlineUsers,
    sendSocketMessage,
    startTyping,
    stopTyping,
    markSeen,
    joinConversation,
    isUserOnline
  };
};

export default useChatSocket;

