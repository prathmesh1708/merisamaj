import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Phone, Video, MoreVertical, Send, Paperclip, Mic,
  Smile, Camera, CheckCheck, Search, X, FileText, Check,
  Square, CornerUpLeft, Star, BellOff, Trash2, Pin, Play,
  MapPin, UserSquare, Reply, Forward, Info, MessageCircle, Image as ImageIcon,
  Headphones, AlertTriangle, Loader2, RefreshCcw, Pencil, Copy, ChevronDown, Plus, ExternalLink
} from 'lucide-react';
import { useAuth } from '../../../../core/auth/useAuth';
import { Avatar } from '../../components/common/Avatar';
import { useMemberChat } from '../../hooks/useMemberChat';
import { memberChatService } from '../../../../core/api/memberChatService';

import { authService } from '../../../../core/auth/authService';

// WhatsApp modular chat components
import { WhatsAppEmojiPicker } from './components/WhatsAppEmojiPicker';
import { WhatsAppVoiceRecorder } from './components/WhatsAppVoiceRecorder';
import { VoiceMessagePlayer } from './components/VoiceMessagePlayer';
import { LiveCameraModal } from './components/LiveCameraModal';
import { WhatsAppAttachmentMenu } from './components/WhatsAppAttachmentMenu';
import { MediaLightboxModal } from './components/MediaLightboxModal';
import { WhatsAppContactProfileModal } from './components/WhatsAppContactProfileModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatMsgTime = (isoString) => {
  try { return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥'];

// ─── Typing Indicator ─────────────────────────────────────────────────────────
const TypingIndicator = () => (
  <div className="flex justify-start items-end gap-2 py-1">
    <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-gray-400"
            style={{ animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
    </div>
  </div>
);

// ─── Message Status ───────────────────────────────────────────────────────────
const MessageStatusIcon = ({ status, seenBy, myId }) => {
  const isSeen = Array.isArray(seenBy) && seenBy.some(s => (s.userId || s) !== myId);
  if (isSeen) return <CheckCheck size={14} className="text-[#53bdeb]" />;
  if (status === 'sending')   return <Check size={14} className="text-gray-400" />;
  if (status === 'sent')      return <Check size={14} className="text-gray-500" />;
  if (status === 'delivered') return <CheckCheck size={14} className="text-gray-500" />;
  if (status === 'failed')    return <span className="text-red-500 text-[10px]">Failed</span>;
  return <CheckCheck size={14} className="text-gray-500" />;
};

// ─── Main Chat Room Page ──────────────────────────────────────────────────────
const ChatRoomPage = ({ chatType = 'member', openByUserId = false }) => {
  const params   = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setAuth } = useAuth();

  const handleBack = () => {
    if (location.state?.from) {
      navigate(location.state.from, { state: { tab: location.state.tab || 'chat' } });
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/member/social', { state: { tab: 'chat' } });
    }
  };

  const [conversationId, setConversationId] = useState(params.conversationId || null);
  const [otherUser, setOtherUser]           = useState(null);
  const [initLoading, setInitLoading]       = useState(false);
  const [initError, setInitError]           = useState(null);

  // ── Auto open conversation by userId (Route B) ───────────────────────────
  useEffect(() => {
    if (openByUserId && !conversationId) {
      const targetId = params.targetUserId;
      if (!targetId || targetId === 'undefined' || targetId === 'null' || targetId === 'me' || targetId.length < 12) {
        setInitError('Member profile is not available for direct chat.');
        return;
      }
      setInitLoading(true);
      memberChatService.openConversation(targetId)
        .then(res => {
          const data = res.data?.data;
          setConversationId(data?.conversation?._id);
          setOtherUser(data?.otherUser);
        })
        .catch(err => setInitError(err.response?.data?.message || 'Failed to open conversation.'))
        .finally(() => setInitLoading(false));
    }
  }, [openByUserId, params.targetUserId, conversationId]);

  // ── Chat hook ─────────────────────────────────────────────────────────────
  const {
    messages, loading, sending, error, hasMore, typingUsers,
    otherUser: hookOtherUser,
    isConnected, isUserOnline,
    loadOlderMessages, sendMessage, editMessage, deleteMessage, clearChat, deleteConversation,
    startTyping, stopTyping, markSeen
  } = useMemberChat(conversationId);

  // ── UI State ──────────────────────────────────────────────────────────────
  const [newMessage, setNewMessage]                   = useState('');
  const [showMenu, setShowMenu]                       = useState(false);
  const [showMoreMenu, setShowMoreMenu]               = useState(false);
  const [showEmojiPicker, setShowEmojiPicker]         = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu]   = useState(false);
  const [showLiveCamera, setShowLiveCamera]           = useState(false);
  const [isRecordingVoice, setIsRecordingVoice]       = useState(false);
  const [lightboxMedia, setLightboxMedia]             = useState(null);
  const [showContactProfile, setShowContactProfile]   = useState(false);
  const [showMuteDialog, setShowMuteDialog]           = useState(false);
  const [showWallpaperDialog, setShowWallpaperDialog] = useState(false);
  const [wallpaperTheme, setWallpaperTheme]           = useState('default');
  const [isSearchOpen, setIsSearchOpen]               = useState(false);
  const [searchQuery, setSearchQuery]                 = useState('');
  const [selectedMessages, setSelectedMessages]       = useState([]);
  const [editingMessage, setEditingMessage]           = useState(null);
  const [showDeleteModal, setShowDeleteModal]         = useState(false);
  const [reactionTarget, setReactionTarget]           = useState(null);
  const [replyTarget, setReplyTarget]                 = useState(null);
  const [reactionPosition, setReactionPosition]       = useState('top');
  const [pendingAttachment, setPendingAttachment]     = useState(null);
  const [confirmDialog, setConfirmDialog]             = useState(null);
  const [sendError, setSendError]                     = useState(null);

  // Profile update handler for current user
  const handleUpdateOwnProfile = async (updateData) => {
    let payload = updateData;
    if (updateData.avatarFile) {
      const formData = new FormData();
      formData.append('avatarFile', updateData.avatarFile);
      if (updateData.about) formData.append('about', updateData.about);
      if (updateData.name) formData.append('name', updateData.name);
      payload = formData;
    }
    const res = await authService.updateProfile(payload);
    if (res) {
      const updatedUser = res.user || res;
      setAuth(prev => ({
        ...prev,
        user: { ...prev.user, ...updatedUser }
      }));
      try {
        const stored = localStorage.getItem('merisamaj_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          localStorage.setItem('merisamaj_user', JSON.stringify({ ...parsed, ...updatedUser }));
        }
      } catch(e){}
    }
    return res;
  };

  const messagesEndRef   = useRef(null);
  const inputRef         = useRef(null);
  const galleryInputRef  = useRef(null);
  const cameraInputRef   = useRef(null);
  const docInputRef      = useRef(null);
  const audioInputRef    = useRef(null);
  const touchStartX      = useRef(null);
  const touchStartY      = useRef(null);
  const longPressTimerRef = useRef(null);
  const hasMountedRef    = useRef(false);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: hasMountedRef.current ? 'smooth' : 'instant' });
    hasMountedRef.current = true;
  }, [messages, typingUsers]);

  // Immediately mark conversation as seen
  useEffect(() => {
    if (!conversationId) return;
    memberChatService.markSeen(conversationId).catch(() => {});
  }, [conversationId]);

  // Mark messages as seen when new unseen messages arrive
  const lastMarkedIdsRef = useRef(new Set());
  useEffect(() => {
    if (!conversationId || messages.length === 0) return;
    const myId = (user?.id || user?._id)?.toString();
    const unseenIds = messages
      .filter(m => {
        if (!m._id || lastMarkedIdsRef.current.has(m._id.toString())) return false;
        const senderId = (m.senderId?._id || m.senderId)?.toString();
        const alreadySeen = m.seenBy?.some(s => (s.userId?._id || s.userId || s)?.toString() === myId);
        return senderId && senderId !== myId && !alreadySeen;
      })
      .map(m => m._id);

    if (unseenIds.length > 0) {
      unseenIds.forEach(id => lastMarkedIdsRef.current.add(id.toString()));
      markSeen(unseenIds);
    }
  }, [messages, conversationId, user, markSeen]);

  // Derive display info
  const myId = (user?.id || user?._id)?.toString();

  const getOtherUser = useCallback(() => {
    if (otherUser) return otherUser;
    if (hookOtherUser) return hookOtherUser;
    const firstMsg = messages.find(m => (m.senderId?._id || m.senderId)?.toString() !== myId);
    if (firstMsg) return { name: firstMsg.senderId?.name || 'Member', avatar: firstMsg.senderId?.avatar, _id: firstMsg.senderId?._id || firstMsg.senderId };
    return { name: 'Member', avatar: null };
  }, [otherUser, hookOtherUser, messages, myId]);

  const other      = getOtherUser();
  const targetId   = otherUser?._id || hookOtherUser?._id || other?._id;
  const isOnline   = targetId ? isUserOnline(targetId) : false;
  const isTyping   = typingUsers.length > 0;
  const chatName   = other?.name || 'Chat';
  const chatAvatar = other?.avatar;
  const initials   = chatName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  // ── Filtered Messages ─────────────────────────────────────────────────────
  const filteredMessages = isSearchOpen && searchQuery.trim()
    ? messages.filter(m => (m.message || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const pinnedMessage = messages.find(m => m.isPinned);

  // ── Group messages by date ─────────────────────────────────────────────────
  const groupedMessages = [];
  let lastDateStr = null;
  filteredMessages.forEach((msg) => {
    const d = new Date(msg.createdAt || msg.timestamp);
    const dateStr = d.toLocaleDateString();
    if (dateStr !== lastDateStr) {
      const today     = new Date().toLocaleDateString();
      const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
      let badgeText = dateStr === today ? 'Today'
        : dateStr === yesterday ? 'Yesterday'
        : d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
      groupedMessages.push({ type: 'date', id: `date_${dateStr}`, text: badgeText });
      lastDateStr = dateStr;
    }
    groupedMessages.push({ type: 'message', ...msg });
  });

  // ── Send / Edit ───────────────────────────────────────────────────────────
  const handleSend = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = newMessage.trim();
    if (!trimmed && !pendingAttachment) return;

    const textToSend = trimmed;
    const attachmentToSend = pendingAttachment;
    const replyToSend = replyTarget;
    const editingToSend = editingMessage;

    // Instant clear & preserve keyboard focus like WhatsApp
    setNewMessage('');
    setPendingAttachment(null);
    setReplyTarget(null);
    setEditingMessage(null);
    setSendError(null);
    stopTyping();

    // Maintain keyboard focus continuously
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    try {
      if (editingToSend) {
        await editMessage(editingToSend._id, textToSend);
      } else {
        await sendMessage({
          text: textToSend || (attachmentToSend?.caption || undefined),
          imageFile: attachmentToSend?.type === 'image' ? attachmentToSend.file : undefined,
          file: attachmentToSend?.type === 'document' || attachmentToSend?.type === 'audio_file' ? attachmentToSend.file : undefined,
          metadata: attachmentToSend?.metadata || undefined,
          replyTo: replyToSend?._id || undefined
        });
      }
    } catch (err) {
      setSendError(err.response?.data?.message || 'Failed to process message.');
    } finally {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [newMessage, pendingAttachment, replyTarget, editingMessage, editMessage, sendMessage, stopTyping]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      handleSend(e); 
    }
  }, [handleSend]);

  const handleInputChange = useCallback((e) => {
    setNewMessage(e.target.value);
    startTyping();
  }, [startTyping]);

  // ── Voice Message Handler ─────────────────────────────────────────────────
  const handleSendVoice = async (audioBlob, durationSec) => {
    setIsRecordingVoice(false);
    try {
      await sendMessage({
        audioBlob,
        metadata: { duration: durationSec },
        replyTo: replyTarget?._id || undefined
      });
      setReplyTarget(null);
    } catch (err) {
      setSendError('Failed to send voice note.');
    }
  };

  // ── Camera capture handler ────────────────────────────────────────────────
  const handleCameraCapture = async (photoFile, caption) => {
    setShowLiveCamera(false);
    try {
      await sendMessage({
        text: caption || undefined,
        imageFile: photoFile,
        replyTo: replyTarget?._id || undefined
      });
      setReplyTarget(null);
    } catch (err) {
      setSendError('Failed to send camera photo.');
    }
  };

  // ── Location sharing handler ──────────────────────────────────────────────
  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          await sendMessage({
            text: `📍 Location: https://maps.google.com/?q=${latitude},${longitude}`,
            metadata: {
              type: 'location',
              latitude,
              longitude,
              mapUrl: `https://maps.google.com/?q=${latitude},${longitude}`
            },
            replyTo: replyTarget?._id || undefined
          });
          setReplyTarget(null);
        } catch (err) {
          setSendError('Failed to share location.');
        }
      },
      (err) => {
        alert('Could not retrieve your location. Please check browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── File Pickers handlers ─────────────────────────────────────────────────
  const handleGalleryChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPendingAttachment({ type: 'image', url: ev.target.result, name: file.name, file });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDocChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingAttachment({
      type: 'document',
      name: file.name,
      file,
      size: `${(file.size / 1024).toFixed(0)} KB`
    });
    e.target.value = '';
  };

  const handleAudioFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingAttachment({
      type: 'audio_file',
      name: file.name,
      file,
      size: `${(file.size / 1024).toFixed(0)} KB`
    });
    e.target.value = '';
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  // ── Selection & Delete ────────────────────────────────────────────────────
  const toggleSelection = (msgId) => {
    setSelectedMessages(prev => prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId]);
  };

  const showConfirm = (message, onConfirm) => setConfirmDialog({ message, onConfirm });

  const handleDeleteSelected = useCallback(async (deleteFor = 'me') => {
    for (const msgId of selectedMessages) {
      await deleteMessage(msgId, deleteFor).catch(() => {});
    }
    setSelectedMessages([]);
    setConfirmDialog(null);
  }, [selectedMessages, deleteMessage]);

  // ── Press handlers ────────────────────────────────────────────────────────
  const handlePressStart = (e, msgId) => {
    if (e.type === 'mousedown' && e.button !== 0) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    touchStartX.current = clientX; touchStartY.current = clientY;
    longPressTimerRef.current = setTimeout(() => {
      if (selectedMessages.length === 0) {
        if (window.navigator.vibrate) window.navigator.vibrate(50);
        toggleSelection(msgId);
      }
    }, 500);
  };

  const handlePressMove = (e) => {
    if (touchStartX.current === null) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    if (Math.abs(clientX - touchStartX.current) > 10 || Math.abs(clientY - touchStartY.current) > 10) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const handlePressEnd = (e, msgId) => {
    clearTimeout(longPressTimerRef.current);
    if (e.changedTouches) {
      if (e.changedTouches[0].clientX - touchStartX.current > 60 && selectedMessages.length === 0) {
        setReplyTarget(messages.find(m => m._id === msgId));
      }
    }
  };

  const handleMessageClick = (e, msgId) => {
    e.stopPropagation();
    if (selectedMessages.length > 0) { toggleSelection(msgId); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setReactionPosition(rect.top < 150 ? 'bottom' : 'top');
    setReactionTarget(reactionTarget === msgId ? null : msgId);
  };

  // ── Init Loading / Error ──────────────────────────────────────────────────
  if (initLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#EFEAE2]">
        <Loader2 size={36} className="animate-spin text-brand-primary mb-3" />
        <p className="text-gray-600 font-medium">Opening conversation...</p>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white gap-4 p-8 text-center">
        <AlertTriangle size={40} className="text-red-400" />
        <p className="text-gray-800 font-bold text-lg">{initError}</p>
        <button onClick={handleBack} className="px-5 py-2.5 bg-brand-primary text-white rounded-xl font-semibold">
          Go Back
        </button>
      </div>
    );
  }

  if (!conversationId) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white gap-4">
        <MessageCircle size={40} className="text-gray-300" />
        <p className="text-gray-500">Conversation not found.</p>
        <button onClick={handleBack} className="px-4 py-2 text-brand-primary font-semibold">Go Back</button>
      </div>
    );
  }

  const isSelectionMode = selectedMessages.length > 0;
  const hasInputContent = !!newMessage.trim() || !!pendingAttachment;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      onClick={() => {
        setReactionTarget(null); setShowMenu(false); setShowMoreMenu(false);
        setShowEmojiPicker(false); setShowAttachmentMenu(false); setShowMuteDialog(false); setShowWallpaperDialog(false);
      }}
    >
      {/* Hidden File Inputs */}
      <input type="file" ref={galleryInputRef} accept="image/*" onChange={handleGalleryChange} className="hidden" />
      <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" onChange={handleGalleryChange} className="hidden" />
      <input type="file" ref={docInputRef} accept=".pdf,.doc,.docx,.txt" onChange={handleDocChange} className="hidden" />
      <input type="file" ref={audioInputRef} accept="audio/*" onChange={handleAudioFileChange} className="hidden" />

      {/* Modals */}
      {showLiveCamera && (
        <LiveCameraModal
          onCapture={handleCameraCapture}
          onClose={() => setShowLiveCamera(false)}
        />
      )}

      {lightboxMedia && (
        <MediaLightboxModal
          url={lightboxMedia.url}
          caption={lightboxMedia.caption}
          onClose={() => setLightboxMedia(null)}
        />
      )}

      {showContactProfile && (
        <WhatsAppContactProfileModal
          contact={other}
          messages={messages}
          isMuted={false}
          onToggleMute={() => setShowMuteDialog(true)}
          onClearChat={async () => { await clearChat(); }}
          onDeleteChat={async () => { await deleteConversation(); navigate('/member/social', { state: { tab: 'chat' } }); }}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenWallpaper={() => setShowWallpaperDialog(true)}
          onImageClick={(url, caption) => setLightboxMedia({ url, caption })}
          onClose={() => setShowContactProfile(false)}
          currentUser={user}
          onUpdateOwnProfile={handleUpdateOwnProfile}
        />
      )}

      {/* Background Wallpaper */}
      <div
        className={`absolute inset-0 z-0 ${
          wallpaperTheme === 'dark' ? 'bg-[#0b141a]'
          : wallpaperTheme === 'solid-blue' ? 'bg-blue-100'
          : wallpaperTheme === 'solid-pink' ? 'bg-pink-100'
          : 'bg-[#EFEAE2]'
        }`}
        style={{ backgroundImage: 'radial-gradient(#cfc6b8 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.7 }}
      />

      {/* ── HEADER ── */}
      {isSelectionMode ? (
        <div className="bg-white/85 backdrop-blur-xl border-b border-purple-100/30 text-slate-800 pb-3 px-4 flex items-center justify-between shrink-0 shadow-[0_2px_12px_rgba(124,58,237,0.03)] z-30"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 12px, 12px)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedMessages([])} className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-purple-50 transition-colors press-scale">
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <span className="font-extrabold text-[16px] text-slate-800">{selectedMessages.length} selected</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const txt = messages.filter(m => selectedMessages.includes(m._id)).map(m => m.message || '').filter(Boolean).join('\n');
                if (txt) navigator.clipboard.writeText(txt);
                setSelectedMessages([]);
              }}
              title="Copy Message"
              className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-purple-50 transition-colors press-scale"
            >
              <Copy size={17} />
            </button>
            {selectedMessages.length === 1 && (() => {
              const selectedMsg = messages.find(m => m._id === selectedMessages[0]);
              const isMyMsg = (selectedMsg?.senderId?._id || selectedMsg?.senderId)?.toString() === myId;
              if (isMyMsg && !selectedMsg?.isDeleted && selectedMsg?.type === 'text') {
                return (
                  <button
                    onClick={() => {
                      setEditingMessage(selectedMsg);
                      setNewMessage(selectedMsg.message || '');
                      setSelectedMessages([]);
                    }}
                    title="Edit Message"
                    className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-purple-50 transition-colors press-scale"
                  >
                    <Pencil size={17} />
                  </button>
                );
              }
              return null;
            })()}
            {selectedMessages.length === 1 && (
              <button onClick={() => { setReplyTarget(messages.find(m => m._id === selectedMessages[0])); setSelectedMessages([]); }}
                className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-purple-50 transition-colors press-scale">
                <Reply size={18} />
              </button>
            )}
            <button onClick={() => setShowDeleteModal(true)}
              className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-600 hover:bg-rose-100 transition-colors press-scale">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white/85 backdrop-blur-xl border-b border-purple-100/30 text-slate-800 pb-3 px-4 flex items-center justify-between shrink-0 shadow-[0_2px_12px_rgba(124,58,237,0.03)] z-30"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 12px, 12px)' }}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button onClick={handleBack} className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-purple-50 transition-colors press-scale shrink-0">
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <div 
              onClick={() => setShowContactProfile(true)}
              className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 hover:bg-purple-50/40 p-1 rounded-2xl transition-colors"
            >
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 text-slate-700 font-black text-sm flex items-center justify-center border border-slate-200/70 shadow-2xs">
                  {chatAvatar ? (
                    <img src={chatAvatar} alt={chatName} className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                {isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-xs" />}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h2 className="text-[15px] font-extrabold text-slate-800 truncate leading-tight">{chatName}</h2>
                <p className="text-slate-400 text-[11px] truncate font-semibold">
                  {isTyping
                    ? <span className="text-purple-600 font-extrabold animate-pulse">typing...</span>
                    : isOnline ? 'Online' : isConnected ? 'Available' : 'Last seen recently'
                  }
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="relative">
              <button onClick={(e) => { e.stopPropagation(); setShowMenu(p => !p); }}
                className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-purple-50 transition-colors press-scale">
                <MoreVertical size={18} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => { setShowMenu(false); setShowMoreMenu(false); }} />
                  <div className="absolute top-11 right-0 bg-white text-slate-800 rounded-3xl shadow-2xl py-2 w-[220px] z-50 border border-slate-200/80 overflow-hidden animate-scale-in text-left">
                    {!showMoreMenu ? (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); setShowContactProfile(true); setShowMenu(false); }}
                          className="w-full text-left px-4 py-2.5 text-[13px] font-extrabold text-slate-700 hover:bg-purple-50/50 transition-colors">
                          View Contact Info
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setIsSearchOpen(true); setShowMenu(false); }}
                          className="w-full text-left px-4 py-2.5 text-[13px] font-extrabold text-slate-700 hover:bg-purple-50/50 transition-colors">
                          Search Messages
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowMuteDialog(true); setShowMenu(false); }}
                          className="w-full text-left px-4 py-2.5 text-[13px] font-extrabold text-slate-700 hover:bg-purple-50/50 transition-colors">
                          Mute Notifications
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowWallpaperDialog(true); setShowMenu(false); }}
                          className="w-full text-left px-4 py-2.5 text-[13px] font-extrabold text-slate-700 hover:bg-purple-50/50 transition-colors">
                          Wallpaper Theme
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowMoreMenu(true); }}
                          className="w-full text-left px-4 py-2.5 text-[13px] font-extrabold text-slate-700 hover:bg-purple-50/50 transition-colors border-t border-slate-100 mt-1 flex items-center justify-between">
                          <span>More</span><span className="text-slate-400">→</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); setShowMoreMenu(false); }}
                          className="w-full text-left px-4 py-2.5 text-[13px] font-extrabold text-purple-600 flex items-center gap-2 hover:bg-purple-50/50 transition-colors border-b border-slate-100 mb-1">
                          <ArrowLeft size={16} /> Back
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); showConfirm('Clear all messages in this chat?', async () => { await clearChat(); }); }}
                          className="w-full text-left px-4 py-2.5 text-[13px] font-extrabold text-rose-600 hover:bg-rose-50/50 transition-colors">
                          Clear Chat
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); showConfirm('Delete this conversation?', async () => { await deleteConversation(); navigate('/member/social', { state: { tab: 'chat' } }); }); }}
                          className="w-full text-left px-4 py-2.5 text-[13px] font-extrabold text-rose-600 hover:bg-rose-50/50 transition-colors border-t border-slate-100">
                          Delete Conversation
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pinned Message */}
      {!isSelectionMode && pinnedMessage && (
        <div className="bg-white/95 backdrop-blur-md px-4 py-2 flex items-center justify-between border-b border-gray-200 z-20 shadow-sm">
          <div className="flex items-start gap-2.5 overflow-hidden">
            <Pin size={14} className="text-brand-primary mt-1 shrink-0 fill-brand-primary" />
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-brand-primary mb-0.5">Pinned Message</p>
              <p className="text-[13px] text-gray-600 truncate">{pinnedMessage.message || 'Photo/Document'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search bar */}
      {isSearchOpen && (
        <div className="bg-brand-primary px-3 pb-2.5 flex items-center gap-2 shrink-0 z-20">
          <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
            <Search size={15} className="text-white/70" />
            <input autoFocus type="text" placeholder="Search..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-white/60 outline-none text-[14px]" />
          </div>
          <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="text-white/80 text-[14px] font-semibold">Cancel</button>
        </div>
      )}

      {/* ── MESSAGES CONTAINER ── */}
      <div 
        className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 z-10 relative"
        onClick={() => {
          // Tap on chat screen dismisses keyboard and popups just like WhatsApp
          inputRef.current?.blur();
          setShowEmojiPicker(false);
          setShowAttachmentMenu(false);
          setReactionTarget(null);
          setShowMenu(false);
        }}
      >
        {/* Load older button */}
        {hasMore && (
          <div className="flex justify-center mb-2">
            <button onClick={loadOlderMessages} disabled={loading}
              className="bg-white/90 text-brand-primary text-[12px] font-bold px-4 py-1.5 rounded-full shadow-sm border border-brand-primary/20 hover:bg-brand-primary hover:text-white transition-colors flex items-center gap-1.5">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={13} />}
              Load older messages
            </button>
          </div>
        )}

        {/* Initial loading skeleton */}
        {loading && messages.length === 0 && (
          <div className="space-y-3 py-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div className={`h-10 w-48 rounded-2xl animate-pulse ${i % 2 === 0 ? 'bg-white/70' : 'bg-purple-200/70'}`} />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex justify-center my-4">
            <div className="bg-red-50 text-red-600 text-[13px] font-medium px-4 py-2 rounded-xl shadow-sm border border-red-100">
              {error}
            </div>
          </div>
        )}

        {/* Send error */}
        {sendError && (
          <div className="flex justify-center my-2">
            <div className="bg-red-50 text-red-500 text-[12px] px-3 py-1.5 rounded-lg border border-red-100">
              {sendError}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-70">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <MessageCircle size={26} className="text-brand-primary" />
            </div>
            <p className="text-gray-600 font-medium text-[14px]">No messages yet</p>
            <p className="text-gray-400 text-[13px]">Say hello! 👋</p>
          </div>
        )}

        {/* Messages List */}
        {groupedMessages.map((item) => {
          if (item.type === 'date') {
            return (
              <div key={item.id} className="flex justify-center my-4 sticky top-2 z-10">
                <span className="bg-white/90 backdrop-blur text-gray-600 text-[12px] font-bold px-3 py-1 rounded-full shadow-sm border border-gray-100">
                  {item.text}
                </span>
              </div>
            );
          }

          const msg        = item;
          const sender     = msg.senderId;
          const sId        = (sender?._id || sender?.id || sender || '').toString();
          const isMine     = !!(sId && myId && sId === myId);
          const isSelected = selectedMessages.includes(msg._id);
          const repliedMsg = msg.replyTo ? messages.find(m => m._id === (msg.replyTo?._id || msg.replyTo)) : null;

          if (msg.type === 'system') {
            return (
              <div key={msg._id} className="flex justify-center my-2">
                <span className="bg-white/80 text-gray-500 text-[12px] font-medium px-3 py-1 rounded-full shadow-sm border border-gray-100">
                  {msg.message}
                </span>
              </div>
            );
          }

          if (msg.isDeleted || msg.type === 'deleted') {
            return (
              <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} py-0.5`}>
                <div className={`px-3 py-2 rounded-2xl shadow-sm text-gray-400 italic text-[14px] border ${
                  isMine ? 'bg-[#d9fdd3]/60 rounded-tr-sm border-[#c8e6c9]/40' : 'bg-white/70 rounded-tl-sm border-gray-100'
                }`}>
                  🚫 This message was deleted
                </div>
              </div>
            );
          }

          const isVoiceOrAudio = msg.type === 'audio' || msg.type === 'voice';

          return (
            <div key={msg._id}
              className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} pb-1 group/msg ${isSelected ? 'bg-purple-100/50 rounded-lg p-1 transition-colors' : 'transition-colors'}`}
              onMouseDown={e => handlePressStart(e, msg._id)}
              onTouchStart={e => handlePressStart(e, msg._id)}
              onMouseMove={handlePressMove}
              onTouchMove={handlePressMove}
              onMouseUp={e => handlePressEnd(e, msg._id)}
              onTouchEnd={e => handlePressEnd(e, msg._id)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setReactionPosition(rect.top < 220 ? 'bottom' : 'top');
                setReactionTarget(msg._id);
              }}
            >
              <div className="relative max-w-[85%] sm:max-w-[75%]">
                {msg.type === 'image' && msg.mediaUrl ? (
                  /* ── WHATSAPP EDGE-TO-EDGE PHOTO BUBBLE ── */
                  <div 
                    onClick={e => handleMessageClick(e, msg._id)}
                    className={`relative cursor-pointer select-none text-left rounded-2xl overflow-hidden shadow-sm transition-all ${
                      isMine 
                        ? (msg.message ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-xs p-1.5 border border-purple-500/30' : 'p-0.5 rounded-tr-xs') 
                        : (msg.message ? 'bg-white text-slate-800 rounded-tl-xs p-1.5 border border-slate-200/80' : 'p-0.5 rounded-tl-xs')
                    }`}
                  >
                    {/* Reply preview */}
                    {repliedMsg && (
                      <div className={`rounded-xl p-2 mb-1 border-l-4 ${isMine ? 'bg-white/15 border-white text-white' : 'bg-purple-50 border-purple-600 text-slate-800'}`}>
                        <p className={`text-[11px] font-extrabold mb-0.5 ${isMine ? 'text-purple-200' : 'text-purple-700'}`}>
                          {(repliedMsg.senderId?._id || repliedMsg.senderId)?.toString() === myId ? 'You' : repliedMsg.senderId?.name || 'Member'}
                        </p>
                        <p className="text-[12px] truncate opacity-90">{repliedMsg.message || 'Attachment'}</p>
                      </div>
                    )}

                    {/* Edge-to-edge Photo */}
                    <div className="relative rounded-xl overflow-hidden max-w-[280px] sm:max-w-[340px]">
                      <img
                        src={msg.mediaUrl}
                        alt="Photo"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxMedia({ url: msg.mediaUrl, caption: msg.message });
                        }}
                        className="rounded-xl w-full max-h-[340px] object-cover cursor-pointer hover:opacity-95 transition-opacity block"
                      />

                      {/* Floating WhatsApp Timestamp badge over photo when no caption */}
                      {!msg.message && (
                        <div className="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1 text-white shadow-md select-none pointer-events-none z-10">
                          <span className="text-[10px] font-bold leading-none text-white/95">
                            {formatMsgTime(msg.createdAt || msg.timestamp)}
                          </span>
                          {isMine && (
                            <MessageStatusIcon
                              status={msg.status}
                              seenBy={msg.seenBy}
                              myId={myId}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Photo Caption if present */}
                    {msg.message && (
                      <div className="px-2 pt-1.5 pb-0.5 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                        <span className="text-[14px] leading-relaxed font-medium whitespace-pre-wrap break-words min-w-0 pr-1 flex-1">
                          {msg.message}
                        </span>
                        <div className="flex items-center gap-1 shrink-0 ml-auto select-none pt-0.5 self-end">
                          <span className={`text-[10px] font-semibold leading-none ${isMine ? 'text-purple-200' : 'text-slate-400'}`}>
                            {formatMsgTime(msg.createdAt || msg.timestamp)}
                            {msg.isEdited && ' • edited'}
                          </span>
                          {isMine && (
                            <MessageStatusIcon
                              status={msg.status}
                              seenBy={msg.seenBy}
                              myId={myId}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── REGULAR MESSAGE BUBBLE (Text, Audio, Files, Location) ── */
                  <div onClick={e => handleMessageClick(e, msg._id)}
                    className={`px-3.5 py-2.5 rounded-2xl shadow-2xs relative cursor-pointer select-none border text-left min-w-[105px] ${
                      isMine ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-xs border-purple-500/30' : 'bg-white rounded-tl-xs border-slate-200/80 text-slate-800'
                    }`}
                  >
                    {/* Reply preview */}
                    {repliedMsg && (
                      <div className={`rounded-xl p-2 mb-1.5 border-l-4 ${isMine ? 'bg-white/15 border-white text-white' : 'bg-purple-50 border-purple-600 text-slate-800'}`}>
                        <p className={`text-[11px] font-extrabold mb-0.5 ${isMine ? 'text-purple-200' : 'text-purple-700'}`}>
                          {(repliedMsg.senderId?._id || repliedMsg.senderId)?.toString() === myId ? 'You' : repliedMsg.senderId?.name || 'Member'}
                        </p>
                        <p className="text-[12px] truncate opacity-90">{repliedMsg.message || (repliedMsg.type === 'audio' ? '🎤 Voice note' : 'Attachment')}</p>
                      </div>
                    )}

                    {/* Voice Note Audio Player */}
                    {isVoiceOrAudio && msg.mediaUrl && (
                      <VoiceMessagePlayer
                        src={msg.mediaUrl}
                        isMine={isMine}
                        duration={msg.metadata?.duration}
                      />
                    )}

                    {/* File / Document Attachment */}
                    {msg.type === 'file' && (
                      <div className={`flex items-center gap-2.5 p-2 rounded-xl mb-1.5 border ${isMine ? 'bg-white/15 border-white/20 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isMine ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'}`}>
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-extrabold truncate">{msg.message || 'Document'}</p>
                          {msg.mediaUrl && (
                            <a href={msg.mediaUrl} target="_blank" rel="noreferrer" download className="text-[10px] underline font-bold opacity-80 flex items-center gap-0.5">
                              Download file <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Location Card */}
                    {msg.metadata?.type === 'location' && (
                      <a
                        href={msg.metadata.mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`block mb-1.5 p-2 rounded-xl border ${isMine ? 'bg-white/15 border-white/20 text-white' : 'bg-purple-50 border-purple-200 text-slate-800'}`}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin size={18} className={isMine ? 'text-purple-200' : 'text-purple-600'} />
                          <div>
                            <p className="text-[12px] font-black">Shared Location</p>
                            <p className="text-[10px] opacity-80">Tap to open in Google Maps</p>
                          </div>
                        </div>
                      </a>
                    )}

                    {/* Shared Post Preview Card */}
                    {msg.metadata?.sharedPostId && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/member/social/${msg.metadata.sharedPostId}`);
                        }}
                        className={`mb-2 p-2.5 rounded-xl cursor-pointer transition-all flex items-center gap-2.5 border ${
                          isMine 
                            ? 'bg-white/15 hover:bg-white/20 border-white/20 text-white' 
                            : 'bg-purple-50/80 hover:bg-purple-100/70 border-purple-100 text-slate-800'
                        }`}
                      >
                        {msg.metadata.postMedia ? (
                          <img src={msg.metadata.postMedia} alt="Post" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-black/10" />
                        ) : (
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isMine ? 'bg-white/20 text-white' : 'bg-purple-100 text-brand-primary'}`}>
                            <MessageCircle size={16} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1 text-left">
                          <p className={`text-[10px] font-extrabold uppercase tracking-wider ${isMine ? 'text-purple-200' : 'text-purple-600'}`}>
                            Shared Post • {msg.metadata.authorName || 'Member'}
                          </p>
                          <p className="text-[11.5px] font-bold truncate">
                            {msg.metadata.postTitle || msg.metadata.postSnippet || 'View post'}
                          </p>
                          <span className={`text-[10px] font-bold underline flex items-center gap-0.5 mt-0.5 ${isMine ? 'text-white' : 'text-brand-primary'}`}>
                            View full post →
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Text Message with Inline Flowing Timestamp */}
                    {msg.message && msg.type !== 'file' ? (
                      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                        <span className="text-[14px] leading-relaxed font-medium whitespace-pre-wrap break-words min-w-0 pr-1 flex-1">
                          {msg.message}
                        </span>
                        <div className="flex items-center gap-1 shrink-0 ml-auto select-none pt-0.5 self-end">
                          <span className={`text-[10px] font-semibold leading-none ${isMine ? 'text-purple-200' : 'text-slate-400'}`}>
                            {formatMsgTime(msg.createdAt || msg.timestamp)}
                            {msg.isEdited && ' • edited'}
                          </span>
                          {isMine && (
                            <MessageStatusIcon
                              status={msg.status}
                              seenBy={msg.seenBy}
                              myId={myId}
                            />
                          )}
                        </div>
                      </div>
                    ) : (
                      /* For media/voice without text, bottom-right timestamp badge */
                      <div className="flex justify-end items-center gap-1 mt-1 select-none">
                        <span className={`text-[10px] font-semibold leading-none ${isMine ? 'text-purple-200' : 'text-slate-400'}`}>
                          {formatMsgTime(msg.createdAt || msg.timestamp)}
                          {msg.isEdited && ' • edited'}
                        </span>
                        {isMine && (
                          <MessageStatusIcon
                            status={msg.status}
                            seenBy={msg.seenBy}
                            myId={myId}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Direct Message Action & Reaction Popover Menu */}
                {reactionTarget === msg._id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); setReactionTarget(null); }} />
                    <div className={`absolute z-50 ${isMine ? 'right-0' : 'left-0'} bg-white text-slate-800 border border-slate-200/90 rounded-2xl shadow-2xl py-2 w-[210px] animate-scale-in text-left ${
                      reactionPosition === 'bottom' ? 'top-full mt-1.5' : '-top-48'
                    }`}>
                      {/* Emoji Quick Reactions */}
                      <div className="flex items-center justify-around px-2 pb-2 border-b border-slate-100">
                        {EMOJI_REACTIONS.map(emoji => (
                          <button key={emoji} onClick={e => { e.stopPropagation(); setReactionTarget(null); }}
                            className="text-[18px] hover:scale-125 transition-transform press-scale">
                            {emoji}
                          </button>
                        ))}
                      </div>

                      {/* Menu Options */}
                      <div className="pt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyTarget(msg);
                            setReactionTarget(null);
                            inputRef.current?.focus();
                          }}
                          className="w-full text-left px-3.5 py-2 text-[12.5px] font-extrabold text-slate-700 hover:bg-purple-50/60 transition-colors flex items-center gap-2.5 cursor-pointer"
                        >
                          <Reply size={15} className="text-purple-600" />
                          <span>Reply</span>
                        </button>

                        {isMine && msg.type === 'text' && !msg.isDeleted && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingMessage(msg);
                              setNewMessage(msg.message || '');
                              setReactionTarget(null);
                              inputRef.current?.focus();
                            }}
                            className="w-full text-left px-3.5 py-2 text-[12.5px] font-extrabold text-slate-700 hover:bg-purple-50/60 transition-colors flex items-center gap-2.5 cursor-pointer"
                          >
                            <Pencil size={15} className="text-indigo-600" />
                            <span>Edit Message</span>
                          </button>
                        )}

                        {msg.message && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(msg.message);
                              setReactionTarget(null);
                            }}
                            className="w-full text-left px-3.5 py-2 text-[12.5px] font-extrabold text-slate-700 hover:bg-purple-50/60 transition-colors flex items-center gap-2.5 cursor-pointer"
                          >
                            <Copy size={15} className="text-slate-500" />
                            <span>Copy Text</span>
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMessage(msg._id, 'me');
                            setReactionTarget(null);
                          }}
                          className="w-full text-left px-3.5 py-2 text-[12.5px] font-extrabold text-slate-700 hover:bg-purple-50/60 transition-colors flex items-center gap-2.5 cursor-pointer"
                        >
                          <Trash2 size={15} className="text-slate-400" />
                          <span>Delete for Me</span>
                        </button>

                        {isMine && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMessage(msg._id, 'everyone');
                              setReactionTarget(null);
                            }}
                            className="w-full text-left px-3.5 py-2 text-[12.5px] font-extrabold text-rose-600 hover:bg-rose-50/60 transition-colors flex items-center gap-2.5 cursor-pointer border-t border-slate-100 mt-1 pt-2"
                          >
                            <Trash2 size={15} className="text-rose-500" />
                            <span>Delete for Everyone</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* ── INPUT AREA (WhatsApp Layout) ── */}
      <div className="bg-white/90 backdrop-blur-xl border-t border-purple-100/40 px-3 py-2 flex flex-col gap-1.5 z-20 shrink-0 select-none shadow-[0_-2px_12px_rgba(124,58,237,0.03)]" onClick={e => e.stopPropagation()}>

        {/* Editing message preview banner */}
        {editingMessage && (
          <div className="mx-1 flex items-center justify-between bg-purple-50/90 border-l-4 border-purple-600 rounded-xl px-3 py-2 shadow-2xs">
            <div className="flex items-center gap-2 text-purple-700 font-extrabold text-[12px] truncate min-w-0">
              <Pencil size={14} className="shrink-0" />
              <span>Editing message:</span>
              <span className="text-slate-600 font-medium truncate font-sans font-semibold">"{editingMessage.message}"</span>
            </div>
            <button
              onClick={() => {
                setEditingMessage(null);
                setNewMessage('');
              }}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-purple-100 text-slate-400 press-scale shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Reply preview */}
        {replyTarget && (
          <div className="mx-1 flex items-center gap-3 bg-purple-50/70 rounded-xl px-3 py-2 border-l-4 border-purple-600 shadow-2xs">
            <CornerUpLeft size={16} className="text-purple-600 shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[11px] font-extrabold text-purple-700 mb-0.5">
                {(replyTarget.senderId?._id || replyTarget.senderId)?.toString() === myId ? 'You' : replyTarget.senderId?.name || 'Member'}
              </p>
              <p className="text-[12px] font-medium text-slate-600 truncate">{replyTarget.message || (replyTarget.type === 'audio' ? '🎤 Voice note' : 'Attachment')}</p>
            </div>
            <button onClick={() => setReplyTarget(null)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-purple-100 text-slate-400 press-scale">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Attachment preview banner */}
        {pendingAttachment && (
          <div className="mx-1 flex items-center gap-3 bg-purple-50/70 rounded-xl px-3 py-2 shadow-2xs border border-purple-100/60">
            {pendingAttachment.type === 'image' ? (
              <img src={pendingAttachment.url} alt="" className="w-11 h-11 rounded-lg object-cover border border-purple-100 shrink-0" />
            ) : pendingAttachment.type === 'audio_file' ? (
              <div className="w-11 h-11 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                <Headphones size={20} className="text-purple-600" />
              </div>
            ) : (
              <div className="w-11 h-11 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                <FileText size={20} className="text-purple-600" />
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[13px] font-extrabold text-slate-800 truncate">{pendingAttachment.name}</p>
              <p className="text-[11px] font-medium text-purple-600">Ready to send {pendingAttachment.size ? `(${pendingAttachment.size})` : ''}</p>
            </div>
            <button onClick={() => setPendingAttachment(null)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-purple-100 text-slate-400 press-scale">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Popover Attachment Tray Sheet */}
        {showAttachmentMenu && (
          <div className="mx-1 mb-2">
            <WhatsAppAttachmentMenu
              onSelectGallery={() => galleryInputRef.current?.click()}
              onSelectCamera={() => setShowLiveCamera(true)}
              onSelectDocument={() => docInputRef.current?.click()}
              onSelectAudio={() => audioInputRef.current?.click()}
              onSelectLocation={handleShareLocation}
              onClose={() => setShowAttachmentMenu(false)}
            />
          </div>
        )}

        {/* Full WhatsApp Emoji Picker */}
        {showEmojiPicker && (
          <div className="mx-1 mb-2">
            <WhatsAppEmojiPicker
              onSelectEmoji={handleEmojiSelect}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}

        {/* Voice Note Recording Bar OR Normal Input Bar */}
        {isRecordingVoice ? (
          <WhatsAppVoiceRecorder
            onSendVoice={handleSendVoice}
            onCancel={() => setIsRecordingVoice(false)}
          />
        ) : (
          <div className="flex items-center gap-2">
            {/* Input Capsule with Emoji, Paperclip, Textarea & Camera */}
            <div className="flex-1 bg-slate-100/90 border border-slate-200/80 rounded-2xl min-h-[46px] flex items-center py-1 px-2.5 focus-within:bg-white focus-within:border-purple-500/50 transition-all shadow-2xs">
              {/* Emoji button */}
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setShowEmojiPicker(p => !p);
                  setShowAttachmentMenu(false);
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 hover:bg-purple-50 transition-colors ${showEmojiPicker ? 'text-purple-600' : 'text-slate-400'}`}
                title="Emojis"
              >
                <Smile size={20} />
              </button>

              {/* Text message input */}
              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                autoComplete="off"
                autoCorrect="on"
                className="flex-1 bg-transparent py-2 px-2 text-[14px] font-medium focus:outline-none text-slate-800 placeholder-slate-400 resize-none max-h-20"
              />

              {/* Attachment Paperclip button */}
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setShowAttachmentMenu(p => !p);
                  setShowEmojiPicker(false);
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 hover:bg-purple-50 transition-colors ${showAttachmentMenu ? 'text-purple-600' : 'text-slate-400'}`}
                title="Attach photos, camera or files"
              >
                <Paperclip size={19} className="rotate-45" />
              </button>

              {/* Quick Camera Trigger */}
              <button
                type="button"
                onClick={() => setShowLiveCamera(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 shrink-0 hover:bg-purple-50 hover:text-purple-600 transition-colors ml-0.5"
                title="Camera"
              >
                <Camera size={19} />
              </button>
            </div>

            {/* Dynamic Send / Mic Action Button */}
            {hasInputContent ? (
              <button 
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleSend}
                disabled={sending && !newMessage.trim()}
                className="w-11 h-11 rounded-2xl text-white flex items-center justify-center shadow-md shrink-0 press-scale transition-all bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95"
                title="Send"
              >
                {sending && !newMessage.trim() ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" strokeWidth={2.5} />}
              </button>
            ) : (
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setIsRecordingVoice(true)}
                className="w-11 h-11 rounded-2xl text-white flex items-center justify-center shadow-md shrink-0 press-scale transition-all bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95"
                title="Record voice note"
              >
                <Mic size={20} strokeWidth={2.4} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── MUTE DIALOG ── */}
      {showMuteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowMuteDialog(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h3 className="text-[18px] font-bold text-gray-900 mb-4">Mute notifications for...</h3>
            <div className="space-y-4 mb-6">
              {['8 hours', '1 week', 'Always'].map(opt => (
                <label key={opt} className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="mute" className="w-5 h-5 accent-brand-primary" />
                  <span className="text-[16px] text-gray-700 font-medium">{opt}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowMuteDialog(false)} className="px-4 py-2 text-brand-primary font-bold hover:bg-brand-primary/10 rounded-lg">Cancel</button>
              <button onClick={() => setShowMuteDialog(false)} className="px-4 py-2 text-brand-primary font-bold hover:bg-brand-primary/10 rounded-lg">OK</button>
            </div>
          </div>
        </div>
      )}

      {/* ── WALLPAPER DIALOG ── */}
      {showWallpaperDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowWallpaperDialog(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h3 className="text-[18px] font-bold text-gray-900 mb-4">Chat Wallpaper</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { id: 'default', label: 'Default', bg: 'bg-[#EFEAE2]' },
                { id: 'dark',    label: 'Dark',    bg: 'bg-[#0b141a]' },
                { id: 'solid-blue', label: 'Solid Blue', bg: 'bg-blue-100' },
                { id: 'solid-pink', label: 'Solid Pink', bg: 'bg-pink-100' }
              ].map(w => (
                <button key={w.id} onClick={() => setWallpaperTheme(w.id)}
                  className={`h-24 rounded-xl border-4 ${wallpaperTheme === w.id ? 'border-brand-primary' : 'border-transparent'} ${w.bg} flex items-center justify-center transition-all`}>
                  <span className="bg-black/40 text-white text-[12px] px-2 py-1 rounded-md font-semibold">{w.label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowWallpaperDialog(false)}
              className="px-4 py-3 bg-brand-primary text-white font-bold rounded-xl w-full active:scale-95 transition-transform">
              Apply Wallpaper
            </button>
          </div>
        </div>
      )}

      {/* ── DELETE CHOICE MODAL ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl p-5 space-y-3 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-extrabold text-slate-900">Delete Message</h3>
            <p className="text-[12px] text-slate-500 font-semibold">Choose how you want to delete the selected message(s):</p>
            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  handleDeleteSelected('me');
                  setShowDeleteModal(false);
                }}
                className="w-full py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[13px] font-extrabold transition-all text-left flex items-center justify-between cursor-pointer"
              >
                <span>Delete for Me</span>
                <Trash2 size={15} className="text-slate-400" />
              </button>
              {selectedMessages.every(id => {
                const m = messages.find(msg => msg._id === id);
                return (m?.senderId?._id || m?.senderId)?.toString() === myId;
              }) && (
                <button
                  onClick={() => {
                    handleDeleteSelected('everyone');
                    setShowDeleteModal(false);
                  }}
                  className="w-full py-2.5 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[13px] font-extrabold border border-rose-200 transition-all text-left flex items-center justify-between cursor-pointer"
                >
                  <span>Delete for Everyone</span>
                  <Trash2 size={15} className="text-rose-500" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowDeleteModal(false)}
              className="w-full py-2 text-center text-[12px] font-bold text-slate-400 hover:text-slate-600 pt-1 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── CONFIRM DIALOG ── */}
      {confirmDialog && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmDialog(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <p className="text-[16px] font-bold text-gray-800 text-center">{confirmDialog.message}</p>
            </div>
            <div className="flex border-t border-gray-100">
              <button onClick={() => setConfirmDialog(null)} className="flex-1 py-3.5 text-[15px] font-semibold text-gray-500 hover:bg-gray-50 transition-colors">Cancel</button>
              <div className="w-px bg-gray-100" />
              <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
                className="flex-1 py-3.5 text-[15px] font-bold text-red-500 hover:bg-red-50 transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatRoomPage;
