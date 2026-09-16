/**
 * memberChatService.js
 * API service for 1-to-1 Community Member Chat.
 * Mirrors matrimonialChatService structure for consistency.
 */
import { axiosPrivate } from './axiosPrivate';

const BASE = '/member/chat';

export const memberChatService = {
  // ─── Conversations ──────────────────────────────────────────────────────────
  /** Open or find a 1-to-1 conversation with another member */
  openConversation: (targetUserId) =>
    axiosPrivate.post(`${BASE}/conversations`, { targetUserId }),

  /** List all active conversations for current user */
  getConversations: () =>
    axiosPrivate.get(`${BASE}/conversations`),

  // ─── Messages ───────────────────────────────────────────────────────────────
  /** Get paginated messages for a conversation */
  getMessages: (conversationId, params = {}) =>
    axiosPrivate.get(`${BASE}/conversations/${conversationId}/messages`, { params }),

  /** Send a text/reply message */
  sendMessage: (conversationId, data) =>
    axiosPrivate.post(`${BASE}/conversations/${conversationId}/messages`, data),

  /** Send an image message (multipart) */
  sendImageMessage: (conversationId, formData) =>
    axiosPrivate.post(`${BASE}/conversations/${conversationId}/messages`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  /** Delete a message (deleteFor: 'me' | 'everyone') */
  deleteMessage: (messageId, deleteFor = 'me') =>
    axiosPrivate.delete(`${BASE}/messages/${messageId}`, {
      data: { deleteFor }
    }),

  /** Mark messages or conversation as seen */
  markSeen: (conversationId, messageIds = []) =>
    axiosPrivate.post(`${BASE}/conversations/${conversationId}/seen`, { messageIds }),

  /** Edit a sent message */
  editMessage: (messageId, message) =>
    axiosPrivate.patch(`${BASE}/messages/${messageId}`, { message }),

  /** Clear all messages in a conversation for current user */
  clearChat: (conversationId) =>
    axiosPrivate.post(`${BASE}/conversations/${conversationId}/clear`),

  /** Delete/remove a conversation for current user */
  deleteConversation: (conversationId) =>
    axiosPrivate.delete(`${BASE}/conversations/${conversationId}`)
};
