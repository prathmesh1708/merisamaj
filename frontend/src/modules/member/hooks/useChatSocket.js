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

export const getSocket = (userId) => {
  if (!socketInstance || !socketInstance.connected) {
    const apiEnvUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
    const backendUrl = import.meta.env.VITE_SOCKET_URL
      || (apiEnvUrl ? apiEnvUrl.replace(/\/api\/v1\/?$/, '') : '')
      || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5001');

    const token = typeof localStorage !== 'undefined'
      ? (localStorage.getItem('merisamaj_token') || localStorage.getItem('admin_auth_token') || localStorage.getItem('head_auth_token'))
      : null;

    socketInstance = io(backendUrl, {
      auth: { userId, token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
  }
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

  useEffect(() => {
    const userId = user?.id || user?._id;
    if (!userId) return;

    const socket = getSocket(userId);
    socketRef.current = socket;

    // ── Connection events ──────────────────────────────────────────────────
    const onConnect = () => {
      setIsConnected(true);
      // Join conversation room if provided
      if (conversationId) {
        socket.emit('chat:join_conversation', { conversationId });
      }
    };

    const onDisconnect = () => setIsConnected(false);

    // ── Register listeners ─────────────────────────────────────────────────
    socket.on('connect',    onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) {
      setIsConnected(true);
      if (conversationId) {
        socket.emit('chat:join_conversation', { conversationId });
      }
    }

    // Chat events
    if (onNewMessage)        socket.on('chat:new_message',          onNewMessage);
    if (onUserTyping)        socket.on('chat:user_typing',          onUserTyping);
    if (onUserStoppedTyping) socket.on('chat:user_stopped_typing',  onUserStoppedTyping);
    if (onMessageDeleted)    socket.on('chat:message_deleted',      onMessageDeleted);
    if (onMessagesSeen)      socket.on('chat:messages_seen',        onMessagesSeen);
    if (onMessagesDelivered) socket.on('chat:messages_delivered',   onMessagesDelivered);

    // Group events
    if (onMemberJoined)   socket.on('chat:member_joined',   onMemberJoined);
    if (onMemberLeft)     socket.on('chat:member_left',     onMemberLeft);
    if (onMemberAdded)    socket.on('chat:member_added',    onMemberAdded);
    if (onMemberRemoved)  socket.on('chat:member_removed',  onMemberRemoved);
    if (onMemberPromoted) socket.on('chat:member_promoted', onMemberPromoted);
    if (onMemberDemoted)  socket.on('chat:member_demoted',  onMemberDemoted);

    // Online presence
    socket.on('chat:online_users', (users) => setOnlineUsers(users || []));

    return () => {
      socket.off('connect',    onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat:new_message',          onNewMessage);
      socket.off('chat:user_typing',          onUserTyping);
      socket.off('chat:user_stopped_typing',  onUserStoppedTyping);
      socket.off('chat:message_deleted',      onMessageDeleted);
      socket.off('chat:messages_seen',        onMessagesSeen);
      socket.off('chat:messages_delivered',   onMessagesDelivered);
      socket.off('chat:member_joined',        onMemberJoined);
      socket.off('chat:member_left',          onMemberLeft);
      socket.off('chat:member_added',         onMemberAdded);
      socket.off('chat:member_removed',       onMemberRemoved);
      socket.off('chat:member_promoted',      onMemberPromoted);
      socket.off('chat:member_demoted',       onMemberDemoted);
      socket.off('chat:online_users');
    };
  }, [user?.id, user?._id, conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (socketRef.current?.connected) {
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
