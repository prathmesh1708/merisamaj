import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Send, Paperclip, Image as ImageIcon, X, FileText, Link2, Phone, Info, Users, Bell, BellOff, Settings, Search, Check, CheckCheck, Shield, Mic, Plus, LogOut, Star, ChevronRight, Video, Trash, Camera, Edit, Smile, Square, MapPin, UserSquare, Headphones, Copy, Forward, Trash2, CornerUpLeft, Loader2, AlertCircle } from 'lucide-react';
import { Avatar } from '../../components/common/Avatar';
import { useData } from '../../context/DataProvider';
import { useGroupChat } from '../../hooks/useGroupChat';
import { useGroups } from '../../hooks/useGroups';
import { groupService } from '../../../../core/api/groupService';
import { useAuth } from '../../../../core/auth/useAuth';
import AddMemberSheet from './components/AddMemberSheet';
import JoinRequestsSheet from './components/JoinRequestsSheet';

const groupColors = {
  General: 'bg-indigo-100 text-indigo-700',
  Youth: 'bg-blue-100 text-blue-700',
  Women: 'bg-pink-100 text-pink-700',
  Business: 'bg-amber-100 text-amber-700',
  Service: 'bg-emerald-100 text-emerald-700',
  Education: 'bg-purple-100 text-purple-700',
  Religious: 'bg-orange-100 text-orange-700'
};

const getSenderColor = (senderName, role) => {
  if (role === 'Admin') return 'text-orange-600';
  const colors = [
    'text-rose-500',
    'text-emerald-600',
    'text-blue-500',
    'text-purple-600',
    'text-teal-600',
    'text-indigo-500',
    'text-amber-600',
    'text-pink-500'
  ];
  let hash = 0;
  for (let i = 0; i < senderName.length; i++) {
    hash = senderName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const GroupDetailPage = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();

  // ─── Real data from backend ────────────────────────────────────────────────
  const { groups, loading: groupsLoading, refreshGroups, leaveGroupById, muteGroup } = useGroups();
  const group = groups.find(g => (g._id || g.id) === groupId);

  // Once we have the group, we know its conversationId to init chat
  const [
    groupConversationId,
    setGroupConversationId
  ] = useState(null);

  useEffect(() => {
    // Fetch the group's conversation ID if not embedded
    if (group?.conversationId) {
      setGroupConversationId(group.conversationId?._id || group.conversationId);
    } else if (group && !groupConversationId) {
      groupService.getGroupConversation(groupId).then(res => {
        setGroupConversationId(res.data?.data?.conversation?._id);
      }).catch(() => {});
    }
  }, [group, groupId]);

  // Immediately mark group conversation as seen when conversationId is active
  useEffect(() => {
    if (!groupConversationId) return;
    groupService.markGroupSeen(groupConversationId).catch(() => {});
    window.dispatchEvent(new Event('app:refresh_unread_counts'));
  }, [groupConversationId]);

  const {
    messages: realMessages,
    loading: chatLoading,
    sending,
    error: chatError,
    typingUsers,
    members: realMembers,
    myRole,
    sendMessage: sendGroupMsg,
    deleteMessage: deleteGroupMsg,
    pinMessage: pinGroupMsg,
    startTyping,
    stopTyping
  } = useGroupChat(groupConversationId, group);

  // Keep legacy useData for any remaining shared state (notifications etc.)
  const { clearChatMessages } = useData();

  const isGroupCreator = group?.creator?._id === currentUser?.id || group?.creator === currentUser?.id;
  
  // View State: chat | info | members | settings
  const [viewState, setViewState] = useState('chat');
  const [prevViewState, setPrevViewState] = useState('chat');
  const [infoActiveTab, setInfoActiveTab] = useState('media');
  const [newMessage, setNewMessage] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  // joinedMemberIds is now driven by realMembers from useGroupChat hook
  // Keep a local display count derived from realMembers for UI
  const joinedMemberIds = (realMembers || []).map(m => m.userId?._id || m.userId);

  // Chat dropdown, search and reactions states
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMuteDialog, setShowMuteDialog] = useState(false);
  const [showWallpaperDialog, setShowWallpaperDialog] = useState(false);
  const [wallpaperTheme, setWallpaperTheme] = useState('default');
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [replyTarget, setReplyTarget] = useState(null);

  const [isSearchingChat, setIsSearchingChat] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);
  // isGroupTyping is now derived from socket typingUsers
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [reactionPosition, setReactionPosition] = useState('top');

  const showToast = (msg) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage('');
    }, 2500);
  };

  const showConfirm = (message, onConfirm) => {
    setConfirmDialog({ message, onConfirm });
  };
  
  const longPressTimerRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  const handlePressStart = (msgId) => {
    if (selectedMessages.length > 0) return;
    longPressTimerRef.current = setTimeout(() => {
      setSelectedMessages([msgId]);
      window.navigator?.vibrate?.(50);
    }, 500);
  };
  const handlePressEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };
  const toggleSelection = (msgId) => {
    if (selectedMessages.length === 0) return;
    setSelectedMessages(prev => prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId]);
  };

  // Edit Group Info Modal state
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [editGroupAvatar, setEditGroupAvatar] = useState('');

  // Call, Media & Starred states
  const [activeCall, setActiveCall] = useState(null); // null | 'voice' | 'video'
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showStarredModal, setShowStarredModal] = useState(false);
  const [activeDropdownField, setActiveDropdownField] = useState(null); // null | 'groupType' | 'addMembers' | 'seeMembers' | 'sendMessages' | 'shareMedia' | 'shareLinks'

  const groupAvatarInputRef = useRef(null);
  const [isEditingNameInline, setIsEditingNameInline] = useState(false);
  const [inlineGroupName, setInlineGroupName] = useState('');
  
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [activeMemberActionId, setActiveMemberActionId] = useState(null);

  const handleMemberAction = async (action, memberId) => {
    setActiveMemberActionId(null);
    try {
      if (action === 'remove') {
        await groupService.removeMember(groupId, memberId);
        showToast('Member removed');
      } else if (action === 'promote') {
        await groupService.promoteAdmin(groupId, memberId);
        showToast('Promoted to Admin');
      } else if (action === 'demote') {
        await groupService.demoteAdmin(groupId, memberId);
        showToast('Demoted to Member');
      }
      await refreshGroups();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to perform action');
    }
  };

  const currentUserRole = (realMembers || []).find(m => (m.userId?._id || m.userId)?.toString() === currentUser?._id?.toString())?.role;
  const iAmAdmin = currentUserRole === 'admin' || currentUserRole === 'head';

  const handleAddMember = async (targetUserIds) => {
    try {
      await groupService.addGroupMembers(groupId, targetUserIds);
      await refreshGroups();
      showToast('Members added successfully');
    } catch (err) {
      showToast('Failed to add members');
    }
  };

  const handleGroupAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      await groupService.updateGroup(groupId, formData);
      await refreshGroups();
    } catch {
      showToast('Failed to update avatar');
    }
  };

  const handleSaveGroupNameInline = async () => {
    if (!inlineGroupName.trim()) return;
    try {
      await groupService.updateGroup(groupId, { name: inlineGroupName.trim() });
      await refreshGroups();
      setIsEditingNameInline(false);
    } catch {
      showToast('Failed to save name');
    }
  };

  const handleUpdateGroupSettings = async (patch) => {
    try {
      await groupService.updateGroupSettings(groupId, patch);
      await refreshGroups();
    } catch {
      showToast('Failed to save settings');
    }
  };

  const displayMemberCount = joinedMemberIds.length || group?.memberCount || realMembers?.length || 0;
  
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const [localMessages, setLocalMessages] = useState([]);
  const [starredMessageIds, setStarredMessageIds] = useState([]);

  useEffect(() => {
    setLocalMessages(realMessages);
  }, [realMessages, groupId]);

  const messages = localMessages;

  // Group settings state (local copy for toggle interaction)
  const [privacySettings, setPrivacySettings] = useState({
    type: group?.type || group?.privacy?.type || 'Public',
    canAdd: group?.chatPermissions?.canAddMembers || group?.privacy?.canAddMembers || 'all',
    canSee: group?.privacy?.canSeeMembers || 'all'
  });

  const [chatPermissions, setChatPermissions] = useState({
    canSend: group?.chatPermissions?.canSendMessages || 'All Members',
    canMedia: group?.chatPermissions?.canShareMedia || 'All Members',
    canLinks: group?.chatPermissions?.canShareLinks || 'All Members'
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (viewState === 'chat') {
      scrollToBottom();
    }
  }, [messages, viewState]);

  useEffect(() => {
    if (group && !group.isJoined && !myRole) {
      navigate('/member/groups', { state: { showJoinAlert: true } });
    }
  }, [group, navigate, myRole]);

  useEffect(() => {
    if (group) {
      setPrivacySettings({
        type: group.type || group.privacy?.type || 'Public',
        canAdd: group.chatPermissions?.canAddMembers || group.privacy?.canAddMembers || 'all',
        canSee: group.privacy?.canSeeMembers || 'all'
      });
      setChatPermissions({
        canSend: group.chatPermissions?.canSendMessages || 'All Members',
        canMedia: group.chatPermissions?.canShareMedia || 'All Members',
        canLinks: group.chatPermissions?.canShareLinks || 'All Members'
      });
    }
  }, [group?._id || group?.id]);

  // Loading state for groups
  if (groupsLoading && !group) {
    return (
      <div className="fixed inset-0 z-50 bg-[#F5F6FA] flex items-center justify-center">
        <Loader2 size={32} className="text-brand-primary animate-spin" />
      </div>
    );
  }

  if (!group) return null;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPendingAttachment({
          type: 'image',
          name: file.name,
          url: event.target.result,
          file: file
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPendingAttachment({
        type: 'file',
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      });
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() && !pendingAttachment) return;
    try {
      await sendGroupMsg({
        text: newMessage,
        imageFile: pendingAttachment?.type === 'image' ? pendingAttachment.file : null,
        replyTo: replyTarget?._id
      });
    } catch {
      // optimistic update already handles error state in hook
    }
    setNewMessage('');
    setPendingAttachment(null);
    setReplyTarget(null);
    stopTyping();
  };

  // ─── Message normalizer ─────────────────────────────────────────────────────
  // Adapts backend shape → UI shape so the existing rendering logic works unchanged
  const normalizeMessage = (msg) => {
    if (!msg) return msg;
    const senderId = msg.senderId?._id || msg.senderId;
    const myId = currentUser?.id || currentUser?._id;
    const isMe = senderId?.toString() === myId?.toString();
    const senderName = msg.senderId?.name || msg.senderName || 'Unknown';
    const senderRole = (realMembers || []).find(m => (m.userId?._id || m.userId)?.toString() === senderId?.toString())?.role;

    // Parse time
    const d = new Date(msg.createdAt || msg.timestamp || Date.now());
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    return {
      ...msg,
      id: msg._id || msg.id,
      isMe,
      isSelf: isMe,
      senderName,
      role: senderRole === 'admin' ? 'Admin' : senderRole === 'head' ? 'Admin' : '',
      text: msg.message || msg.text || '',
      time,
      attachment: msg.mediaUrl
        ? { type: msg.type === 'image' ? 'image' : 'file', url: msg.mediaUrl, name: msg.mediaUrl.split('/').pop() }
        : msg.attachment || null,
      reactions: msg.reactions || [],
      replyTo: msg.replyTo?._id || msg.replyTo || null,
      isDeleted: msg.isDeleted || msg.type === 'deleted',
    };
  };

  const normalizedMessages = (localMessages || []).map(normalizeMessage);

  const isSelectionMode = selectedMessages.length > 0;
  const groupedMessages = [];
  let lastDateStr = null;

  normalizedMessages
    .filter(msg => {
      if (!chatSearchQuery.trim()) return true;
      return (msg.message || msg.text || '') && (msg.message || msg.text || '').toLowerCase().includes(chatSearchQuery.toLowerCase());
    })
    .forEach((msg) => {
      const d = new Date(msg.createdAt || msg.timestamp || Date.now());
      const dateStr = d.toLocaleDateString();
      
      if (dateStr !== lastDateStr) {
        const today = new Date().toLocaleDateString();
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
        
        let badgeText = dateStr;
        if (dateStr === today) badgeText = 'Today';
        else if (dateStr === yesterday) badgeText = 'Yesterday';
        else badgeText = d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

        groupedMessages.push({ type: 'date', id: `date_${dateStr}`, text: badgeText });
        lastDateStr = dateStr;
      }
      groupedMessages.push({ type: 'message', ...msg });
    });

  return (
    <div className="fixed inset-0 z-50 bg-[#F5F6FA] flex flex-col overflow-hidden pb-0">
      
      {/* ─── VIEW 1: CHAT INTERFACE ─── */}
      {viewState === 'chat' && (
        <div className="flex flex-col h-full relative overflow-hidden flex-1" onClick={() => { setActiveReactionMsgId(null); setShowChatMenu(false); setShowMoreMenu(false); setShowEmojiPicker(false); setShowMuteDialog(false); setShowWallpaperDialog(false); }}>
          {/* Background with WhatsApp-like pattern effect */}
          <div className={`absolute inset-0 z-0 ${wallpaperTheme === 'dark' ? 'bg-[#0b141a]' : wallpaperTheme === 'solid-blue' ? 'bg-blue-100' : wallpaperTheme === 'solid-pink' ? 'bg-pink-100' : 'bg-[#EFEAE2]'}`} style={{ opacity: wallpaperTheme === 'dark' ? 0.9 : 0.7, backgroundImage: 'radial-gradient(#cfc6b8 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

          {isSelectionMode ? (
            <div className="bg-brand-primary text-white pb-3 px-3 flex items-center justify-between shrink-0 shadow-md z-30 transition-all sticky top-0" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 12px, 12px)' }}>
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedMessages([])} className="w-10 h-10 rounded-full flex items-center justify-center active:bg-white/10 -ml-2 shrink-0">
                  <ArrowLeft size={22} />
                </button>
                <span className="font-bold text-[18px]">{selectedMessages.length}</span>
              </div>
              <div className="flex items-center gap-1">
                {selectedMessages.length === 1 && (
                  <button 
                    onClick={() => {
                      const selectedMsg = messages.find(m => m.id === selectedMessages[0]);
                      if (selectedMsg) {
                        setReplyTarget(selectedMsg);
                        setSelectedMessages([]);
                      }
                    }} 
                    className="w-10 h-10 rounded-full flex items-center justify-center active:bg-white/10"
                  >
                    <CornerUpLeft size={20} />
                  </button>
                )}
                <button 
                  onClick={() => {
                    let starredCount = 0;
                    selectedMessages.forEach(msgId => {
                      if (starredMessageIds.includes(msgId)) {
                        setStarredMessageIds(prev => prev.filter(id => id !== msgId));
                      } else {
                        setStarredMessageIds(prev => [...prev, msgId]);
                        starredCount++;
                      }
                    });
                    showToast(starredCount > 0 ? `${starredCount} messages starred` : 'Messages unstarred');
                    setSelectedMessages([]);
                  }} 
                  className="w-10 h-10 rounded-full flex items-center justify-center active:bg-white/10"
                >
                  <Star size={20} className={selectedMessages.every(id => starredMessageIds.includes(id)) ? 'fill-white text-white' : ''} />
                </button>
                <button onClick={() => {
                  showConfirm('Delete selected messages?', () => {
                    setLocalMessages(prev => prev.filter(m => !selectedMessages.includes(m.id)));
                    setSelectedMessages([]);
                    showToast('Messages deleted');
                  });
                }} className="w-10 h-10 rounded-full flex items-center justify-center active:bg-white/10">
                  <Trash2 size={20} />
                </button>
                <button 
                  onClick={() => {
                    const texts = selectedMessages.map(msgId => {
                      const msg = messages.find(m => m.id === msgId);
                      return msg ? msg.text || '[Attachment]' : '';
                    }).filter(t => t);
                    if (texts.length > 0) {
                      navigator.clipboard.writeText(texts.join('\n'));
                      showToast(texts.length === 1 ? 'Message copied' : 'Messages copied');
                    }
                    setSelectedMessages([]);
                  }} 
                  className="w-10 h-10 rounded-full flex items-center justify-center active:bg-white/10"
                >
                  <Copy size={20} />
                </button>
                <button 
                  onClick={() => {
                    showToast('Forwarding message...');
                    setSelectedMessages([]);
                  }} 
                  className="w-10 h-10 rounded-full flex items-center justify-center active:bg-white/10"
                >
                  <Forward size={20} />
                </button>
              </div>
            </div>
          ) : (
          <div className="bg-brand-primary text-white pb-3 px-3 flex items-center justify-between shrink-0 shadow-md z-30 transition-all sticky top-0" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 12px, 12px)' }}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button 
                onClick={() => {
                  if (location.state?.from) {
                    navigate(location.state.from, { state: { tab: location.state.tab || 'groups' } });
                  } else if (window.history.length > 1) {
                    navigate(-1);
                  } else {
                    navigate('/member/social', { state: { tab: 'groups' } });
                  }
                }} 
                className="w-10 h-10 rounded-full flex items-center justify-center active:bg-white/10 -ml-2 shrink-0"
              >
                <ArrowLeft size={22} className="text-white" />
              </button>
              <div 
                onClick={() => {
                  setPrevViewState('chat');
                  setViewState('info');
                }}
                className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 hover:bg-white/5 p-1 rounded-xl transition-colors"
              >
                <div className="relative shrink-0">
                  <Avatar initials={group.initials} src={group.avatarUrl} size="md" color={groupColors[group.category] || 'bg-white/20 text-white'} />
                  {group.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-[2.5px] border-brand-primary rounded-full" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[17px] font-bold truncate leading-tight">{group.name}</h2>
                  <p className="text-white/80 text-[13px] truncate font-medium">
                    {typingUsers.length > 0 ? (
                      <span className="text-green-300 font-bold animate-pulse">Vikas Jain is typing...</span>
                    ) : (
                      `${displayMemberCount} members`
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0 relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowChatMenu(!showChatMenu); }}
                className={`w-10 h-10 rounded-full flex items-center justify-center active:bg-white/10 ${
                  showChatMenu ? 'bg-white/10' : ''
                }`}
              >
                <MoreVertical size={20} className="text-white" />
              </button>

              {/* WhatsApp-style Dropdown Menu */}
              {showChatMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => { setShowChatMenu(false); setShowMoreMenu(false); }} />
                  <div className="absolute right-0 top-11 w-[220px] bg-white text-gray-800 rounded-3xl shadow-2xl py-2 z-50 border border-gray-100 overflow-hidden animate-scale-up">
                    {!showMoreMenu ? (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); setShowChatMenu(false); setPrevViewState('chat'); setViewState('info'); }} className="w-full text-left px-5 py-3 text-[14.5px] font-bold text-slate-700 hover:bg-purple-50/40 active:bg-purple-50 transition-colors">
                          Group Info
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowChatMenu(false); setShowMediaModal(true); }} className="w-full text-left px-5 py-3 text-[14.5px] font-bold text-slate-700 hover:bg-purple-50/40 active:bg-purple-50 transition-colors leading-tight">
                          Shared Media
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setIsSearchingChat(true); setShowChatMenu(false); }} className="w-full text-left px-5 py-3 text-[14.5px] font-bold text-slate-700 hover:bg-purple-50/40 active:bg-purple-50 transition-colors">
                          Search
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowMuteDialog(true); setShowChatMenu(false); }} className="w-full text-left px-5 py-3 text-[14.5px] font-bold text-slate-700 hover:bg-purple-50/40 active:bg-purple-50 transition-colors">
                          Mute notifications
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowWallpaperDialog(true); setShowChatMenu(false); }} className="w-full text-left px-5 py-3 text-[14.5px] font-bold text-slate-700 hover:bg-purple-50/40 active:bg-purple-50 transition-colors">
                          Wallpaper
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowMoreMenu(true); }} className="w-full text-left px-5 py-3 text-[14.5px] font-bold text-slate-700 hover:bg-purple-50/40 active:bg-purple-50 transition-colors border-t border-gray-100 mt-1 flex items-center justify-between">
                          <span>More</span>
                          <span className="text-slate-400 font-normal">→</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); setShowMoreMenu(false); }} className="w-full text-left px-5 py-3 text-[14.5px] font-bold text-brand-primary flex items-center gap-2 hover:bg-purple-50/40 active:bg-purple-50 transition-colors border-b border-gray-100 mb-1">
                          <ArrowLeft size={18} /> Back
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowChatMenu(false); }} className="w-full text-left px-5 py-3 text-[14.5px] font-bold text-red-500 hover:bg-red-50/40 active:bg-red-50 transition-colors">
                          Report
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowChatMenu(false); }} className="w-full text-left px-5 py-3 text-[14.5px] font-bold text-red-500 hover:bg-red-50/40 active:bg-red-50 transition-colors">
                          Block
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowChatMenu(false); setShowMoreMenu(false); showConfirm("Clear all messages in this group?", () => clearChatMessages(group.id)); }} className="w-full text-left px-5 py-3 text-[14.5px] font-bold text-red-500 hover:bg-red-50/40 active:bg-red-50 transition-colors">
                          Clear chat
                        </button>

                        <button onClick={(e) => { e.stopPropagation(); setShowChatMenu(false); showConfirm("Are you sure you want to exit this group?", () => { navigate('/member/groups'); leaveGroup(group.id); }); }} className="w-full text-left px-5 py-3 text-[14.5px] font-bold text-[#FF3B30] hover:bg-red-50/30 flex items-center gap-2.5 border-t border-slate-100 mt-1 pt-2.5 transition-colors">
                          Exit Group
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          )}

          {/* Chat Search Overlay */}
          {isSearchingChat && (
            <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-3 border-b border-gray-150 shrink-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.02)] animate-fade-in">
              <div className="flex-1 bg-white rounded-xl flex items-center px-3 py-1.5 border border-gray-200 shadow-sm focus-within:border-brand-primary/20 transition-all">
                <Search size={15} className="text-gray-400 mr-2 shrink-0" />
                <input 
                  type="text"
                  placeholder="Search messages..."
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  className="bg-transparent outline-none w-full text-[13px] text-slate-800 font-medium placeholder:text-gray-400"
                  autoFocus
                />
                {chatSearchQuery && (
                  <button onClick={() => setChatSearchQuery('')}>
                    <X size={14} className="text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              <button 
                onClick={() => {
                  setIsSearchingChat(false);
                  setChatSearchQuery('');
                }}
                className="text-[12.5px] font-bold text-slate-500 hover:text-slate-700 px-1 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-4 relative z-10">
            {groupedMessages.map((item, index) => {
              if (item.type === 'date') {
                return (
                  <div key={item.id} className="flex justify-center my-4 sticky top-2 z-10">
                    <span className="bg-white/90 backdrop-blur text-gray-600 text-[12px] font-bold px-3 py-1 rounded-full shadow-sm border border-gray-100">
                      {item.text}
                    </span>
                  </div>
                );
              }

              const msg = item;
              const isMine = msg.isMe;
              const isSelected = selectedMessages.includes(msg.id);
              const showSenderName = !isMine && (!groupedMessages[index - 1] || groupedMessages[index - 1].senderId !== msg.senderId || groupedMessages[index - 1].type === 'date');
              
              const hasImageOnly = msg.attachment && msg.attachment.type === 'image' && !msg.text;
              const isOnlyEmojis = msg.text && !msg.attachment && /^\p{Extended_Pictographic}{1,3}$/u.test(msg.text.replace(/\s/g, ''));
              
              const isFirstInGroup = index === 0 || groupedMessages[index - 1].type === 'date' || groupedMessages[index - 1].senderId !== msg.senderId;
              const marginTopClass = index === 0 ? '' : (isFirstInGroup ? 'mt-4' : 'mt-1');
              
              return (
                <div key={msg.id}
                  className={`flex flex-col ${marginTopClass} ${isMine ? 'items-end' : 'items-start'} ${isSelected ? 'bg-brand-primary/10 rounded-lg p-1 transition-colors' : 'transition-colors'}`}
                  onMouseDown={() => handlePressStart(msg.id)}
                  onTouchStart={() => handlePressStart(msg.id)}
                  onMouseUp={handlePressEnd}
                  onTouchEnd={handlePressEnd}>

                  <div className="relative max-w-[85%]">
                    {showSenderName && (
                      <p className={`text-[11.5px] font-bold mb-0.5 ml-1.5 ${getSenderColor(msg.senderName, msg.role)}`}>
                        {msg.senderName} {msg.role === 'Admin' && <span className="opacity-75 font-normal text-[9.5px] bg-orange-50 text-orange-600 px-1 py-0.2 rounded-md">Admin</span>}
                      </p>
                    )}

                    <div onClick={(e) => {
                        if (isSelectionMode) return toggleSelection(msg.id);
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        if (rect.top < 150) {
                          setReactionPosition('bottom');
                        } else {
                          setReactionPosition('top');
                        }
                        setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id);
                      }}
                      className={`relative cursor-pointer select-none transition-all ${
                        isOnlyEmojis 
                          ? 'bg-transparent border-none shadow-none px-1 py-1' 
                          : hasImageOnly 
                            ? 'p-[3.5px] rounded-2xl bg-white border border-gray-150/40 shadow-sm' 
                            : isMine 
                              ? 'bg-[#d9fdd3] rounded-2xl rounded-tr-sm px-3 py-2 text-gray-900 border-none shadow-sm' 
                              : 'bg-white rounded-2xl rounded-tl-sm px-3 py-2 text-gray-900 border-none shadow-sm'
                      }`}>

                      {/* Replied Message Preview inside bubble */}
                      {msg.replyTo && (
                        (() => {
                          const repliedMsg = messages.find(m => m.id === msg.replyTo);
                          if (!repliedMsg) return null;
                          return (
                            <div className="bg-black/5 rounded-lg p-2 mb-1.5 border-l-4 border-brand-primary text-left">
                              <p className="text-[12px] font-bold text-brand-primary mb-0.5">{repliedMsg.isMe ? 'You' : repliedMsg.senderName}</p>
                              <p className="text-[13px] text-gray-600 truncate">{repliedMsg.text || 'Attachment'}</p>
                            </div>
                          );
                        })()
                      )}

                      {/* File Attachment */}
                      {msg.attachment && msg.attachment.type === 'file' && (
                        <div className="flex items-center gap-3 bg-black/5 rounded-lg px-3 py-2 mb-1">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                            <FileText size={20} className="text-brand-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[14px] font-bold truncate block">{msg.attachment.name}</span>
                            <span className="text-[11px] text-gray-500 uppercase">{msg.attachment.size || 'DOCUMENT'}</span>
                          </div>
                        </div>
                      )}

                      {/* Image Attachment */}
                      {msg.attachment && msg.attachment.type === 'image' && (
                        <img src={msg.attachment.url} alt="Attachment" className="rounded-xl max-w-[220px] max-h-[220px] mb-1 object-cover" />
                      )}

                      {/* Text */}
                      {msg.text && (
                        <div className={`${
                          isOnlyEmojis 
                            ? 'text-[38px] leading-normal' 
                            : 'text-[15px] leading-[22px] font-normal'
                        } whitespace-pre-wrap`}>
                          {msg.text}
                          {!isOnlyEmojis && <span className="inline-block w-[76px]" />}
                        </div>
                      )}

                      {/* Info Row (Time & Read Receipts) */}
                      {isOnlyEmojis ? (
                        <div className="flex items-center gap-1.5 mt-1 ml-1 select-none">
                          <span className="text-[10px] text-gray-400 font-medium">{msg.time}</span>
                          {isMine && <CheckCheck size={13} className="text-[#53bdeb]" />}
                        </div>
                      ) : (
                        <div className={`absolute bottom-1 right-2 flex items-center gap-1 ${
                          hasImageOnly 
                            ? 'bg-black/45 backdrop-blur-[2px] px-1.5 py-0.5 rounded-full z-10 text-white' 
                            : ''
                        }`}>
                          <span className={`text-[10px] font-medium ${
                            hasImageOnly ? 'text-white/90' : 'text-gray-400'
                          }`}>{msg.time}</span>
                          {isMine && <CheckCheck size={14} className={hasImageOnly ? 'text-cyan-300' : 'text-[#53bdeb]'} />}
                        </div>
                      )}

                      {/* Reactions */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className={`absolute -bottom-3 ${isMine ? 'right-2' : 'left-2'} bg-white rounded-full px-1.5 py-0.5 shadow-sm border border-gray-100 flex items-center gap-0.5 z-20`}>
                          {msg.reactions.map((r, ri) => <span key={ri} className="text-[12px]">{r}</span>)}
                        </div>
                      )}

                    </div>

                    {/* Floating Reactions Bar Overlay */}
                    {activeReactionMsgId === msg.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveReactionMsgId(null); }} />
                        <div className={`absolute z-50 bg-white border border-slate-150 rounded-full px-2.5 py-1.5 shadow-xl flex items-center gap-2 animate-scale-up ${
                          isMine ? 'right-0' : 'left-0'
                        } ${
                          reactionPosition === 'bottom' ? 'top-full mt-1.5' : 'top-[-44px]'
                        }`}>
                          {['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥'].map(emoji => (
                            <button 
                              key={emoji}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Reactions will be handled via Socket.io in production;
                                // For now do optimistic local update
                                setLocalMessages(prev => prev.map(m =>
                                  (m._id || m.id) === (msg._id || msg.id)
                                    ? { ...m, reactions: [...(m.reactions || []), { emoji, userId: currentUser?.id }] }
                                    : m
                                ));
                                setActiveReactionMsgId(null);
                              }}
                              className="text-[18px] hover:scale-125 transition-transform press-scale outline-none"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* ─── INPUT AREA ─── */}
          <div className="bg-transparent px-2 pb-4 pt-1 flex flex-col gap-1.5 z-10 shrink-0" onClick={e => e.stopPropagation()}>
            <input type="file" ref={imageInputRef} accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />

            {/* Reply preview */}
            {replyTarget && (
              <div className="mx-1 flex items-center gap-3 bg-white/95 backdrop-blur rounded-xl px-3 py-2.5 border-l-4 border-brand-primary shadow-sm">
                <CornerUpLeft size={16} className="text-brand-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-brand-primary mb-0.5">{replyTarget.isMe ? 'You' : replyTarget.senderName}</p>
                  <p className="text-[13px] font-medium text-gray-600 truncate">{replyTarget.text || 'Attachment'}</p>
                </div>
                <button onClick={() => setReplyTarget(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16} /></button>
              </div>
            )}

            {/* Pending Attachment Preview */}
            {pendingAttachment && (
              <div className="mx-1 flex items-center gap-3 bg-white/95 backdrop-blur rounded-xl px-3 py-2 shadow-sm border border-gray-100">
                {pendingAttachment.type === 'image'
                  ? <img src={pendingAttachment.url} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-100 shrink-0" />
                  : <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0"><FileText size={20} className="text-indigo-500" /></div>}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-gray-800 truncate">{pendingAttachment.name}</p>
                  <p className="text-[12px] text-gray-500">Ready to send</p>
                </div>
                <button onClick={() => setPendingAttachment(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16} /></button>
              </div>
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="mx-2 mb-2 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 overflow-y-auto max-h-[200px]">
                <div className="grid grid-cols-8 gap-2">
                  {['😀','😃','😄','😁','😅','😂','🤣','🥲','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓'].map(emoji => (
                    <button key={emoji} onClick={() => setNewMessage(p => p + emoji)} className="text-[22px] hover:bg-gray-100 rounded-lg flex justify-center items-center h-10 w-10 transition-colors">
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input bar */}
            <div className="flex items-end gap-2">
              <div className="flex-1 bg-white rounded-3xl min-h-[50px] flex items-end py-1 px-2 shadow-sm border border-gray-200">
                <button onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(p => !p); }} className={`w-10 h-[42px] rounded-full flex items-center justify-center shrink-0 hover:bg-gray-50 transition-colors ${showEmojiPicker ? 'text-brand-primary' : 'text-gray-500'}`}>
                  <Smile size={24} />
                </button>
                <textarea 
                  value={newMessage} 
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Message"
                  rows={1}
                  className="flex-1 bg-transparent py-2.5 px-1.5 text-[15px] focus:outline-none text-gray-900 placeholder-gray-400 resize-none max-h-24" 
                />
                <button onClick={() => imageInputRef.current?.click()} className="w-[38px] h-[42px] rounded-full flex items-center justify-center text-gray-500 shrink-0 hover:bg-gray-50 mr-1">
                  <Camera size={22} />
                </button>
              </div>

              <button 
                onClick={handleSend} 
                disabled={!newMessage.trim() && !pendingAttachment} 
                className={`w-[50px] h-[50px] rounded-full text-white flex items-center justify-center shadow-md shrink-0 active:scale-95 transition-colors ${newMessage.trim() || pendingAttachment ? 'bg-brand-primary' : 'bg-gray-300 cursor-not-allowed'}`}
              >
                <Send size={20} className="ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── VIEW 2: GROUP INFO SCREEN ─── */}
      {viewState === 'info' && (
        <div className="flex flex-col flex-1 h-full overflow-hidden bg-gray-55">
          {/* Header */}
          <div className="bg-white px-3 flex items-center justify-between sticky top-0 z-20 shadow-sm border-b border-gray-100 pb-3"
               style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 12px, 12px)' }}>
            <div className="flex items-center gap-3">
              <button onClick={() => setViewState('chat')} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 -ml-2">
                <ArrowLeft size={22} className="text-gray-800" />
              </button>
              <span className="font-bold text-[18px] text-gray-900">Group Info</span>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto pb-8">
            {/* PROFILE HEADER */}
            <div className="bg-white flex flex-col items-center pt-8 pb-6 px-6 shadow-sm mb-2 text-center relative">
              <div className={`relative mb-4 ${isGroupCreator ? 'cursor-pointer' : ''}`} onClick={() => { if (isGroupCreator) groupAvatarInputRef.current?.click(); }}>
                <Avatar 
                  initials={group.initials} 
                  src={group.avatarUrl} 
                  size="xl" 
                  className="w-32 h-32 text-4xl shadow-lg border-4 border-white"
                  color={groupColors[group.category] || 'bg-violet-100 text-violet-600'} 
                />
                {isGroupCreator && (
                  <>
                    <button className="absolute bottom-0 right-0 w-10 h-10 bg-brand-primary text-white rounded-full flex items-center justify-center border-[3px] border-white shadow-sm active:scale-95">
                      <Camera size={18} />
                    </button>
                    <input 
                      type="file" 
                      ref={groupAvatarInputRef} 
                      accept="image/*" 
                      onChange={handleGroupAvatarChange} 
                      className="hidden" 
                      onClick={(e) => e.stopPropagation()}
                    />
                  </>
                )}
              </div>

              {isEditingNameInline ? (
                <div className="flex items-center gap-2 mt-1 max-w-sm w-full px-4 justify-center">
                  <input
                    type="text"
                    value={inlineGroupName}
                    onChange={(e) => setInlineGroupName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveGroupNameInline();
                      if (e.key === 'Escape') setIsEditingNameInline(false);
                    }}
                    className="border-b-2 border-brand-primary outline-none text-[22px] font-bold text-slate-800 bg-transparent py-0.5 text-center flex-1 max-w-[240px]"
                    autoFocus
                  />
                  <button 
                    onClick={handleSaveGroupNameInline}
                    className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-sm active:scale-90 transition-transform shrink-0"
                  >
                    <Check size={13} />
                  </button>
                  <button 
                    onClick={() => setIsEditingNameInline(false)}
                    className="p-1.5 bg-gray-400 hover:bg-gray-500 text-white rounded-full shadow-sm active:scale-90 transition-transform shrink-0"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 group/name mt-1">
                  <h1 className="text-[22px] font-bold text-gray-900 mb-1 leading-snug tracking-tight">
                    {group.name}
                  </h1>
                  {isGroupCreator && (
                    <button 
                      onClick={() => {
                        setInlineGroupName(group.name);
                        setIsEditingNameInline(true);
                      }}
                      className="p-1 text-slate-400 hover:text-brand-primary active:scale-90 transition-all opacity-100"
                    >
                      <Edit size={14} className="cursor-pointer" />
                    </button>
                  )}
                </div>
              )}

              <p className="text-gray-500 text-[14px]">
                Group • {displayMemberCount} members
              </p>

              <div className="flex items-center gap-6 mt-6">
                <button onClick={() => { setViewState('chat'); setIsSearchingChat(true); }} className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-brand-primary active:bg-gray-50 transition-colors">
                    <Search size={22} />
                  </div>
                  <span className="text-[12px] font-semibold text-gray-600">Search</span>
                </button>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div className="bg-white px-5 py-4 shadow-sm mb-2 text-left">
              <p className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Description
              </p>
              <p className="text-[15px] text-gray-900 leading-relaxed">
                {group.description || 'General discussion and announcement group for all community members.'}
              </p>
              {group.createdAt && (
                <p className="text-[12px] text-gray-400 mt-2">
                  Created on {new Date(group.createdAt).toLocaleDateString()}
                </p>
              )}
            </div>

        {/* MEDIA */}
            <div className="bg-white shadow-sm mb-2 text-left">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 cursor-pointer active:bg-gray-50" onClick={() => setShowMediaModal(true)}>
                <p className="text-[15px] font-bold text-gray-900">Shared Media</p>
                <div className="flex items-center gap-1 text-gray-400">
                  <span className="text-[14px]">
                    {messages.filter(msg => msg.attachment && msg.attachment.type === 'image').length}
                  </span>
                  <ChevronRight size={20} />
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-4 gap-1.5">
                  {messages.filter(msg => msg.attachment && msg.attachment.type === 'image').length > 0 ? (
                    messages.filter(msg => msg.attachment && msg.attachment.type === 'image').map((msg, i) => (
                      <div key={i} className="aspect-square bg-gray-200 rounded-md overflow-hidden">
                        <img src={msg.attachment.url} alt="media" className="w-full h-full object-cover" />
                      </div>
                    ))
                  ) : (
                    <div className="col-span-4 text-center py-6 text-[13px] text-gray-400 font-semibold">No media shared yet</div>
                  )}
                </div>
              </div>
            </div>

            {/* SETTINGS & NOTIFICATIONS */}
            <div className="bg-white shadow-sm mb-2 text-left">
              {/* Mute Notifications */}
              <div 
                onClick={async () => { await muteGroup(groupId); }}
                className="flex items-center justify-between px-5 py-4 border-b border-gray-100 cursor-pointer active:bg-gray-50"
              >
                <p className="text-[15px] font-bold text-gray-900">Mute Notifications</p>
                <button 
                  onClick={async (e) => { e.stopPropagation(); await muteGroup(groupId); }}
                  className={`w-11 h-6 rounded-full transition-colors duration-200 relative focus:outline-none shrink-0 ${
                    group.isMuted ? 'bg-[#4CD964]' : 'bg-[#E5E5EA]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 shadow-sm transition-all duration-200 ${
                    group.isMuted ? 'left-[22px]' : 'left-0.5'
                  }`} />
                </button>
              </div>

              {/* Custom Alert */}
              <div 
                onClick={() => showToast("Custom Notifications: default ringtone active.")}
                className="flex items-center justify-between px-5 py-4 border-b border-gray-100 cursor-pointer active:bg-gray-50"
              >
                <p className="text-[15px] font-bold text-gray-900">Custom Notifications</p>
                <ChevronRight size={20} className="text-gray-400" />
              </div>

              {/* Members list */}
              <div 
                onClick={() => {
                  setPrevViewState('info');
                  setViewState('members');
                }}
                className="flex items-center justify-between px-5 py-4 border-b border-gray-100 cursor-pointer active:bg-gray-50"
              >
                <p className="text-[15px] font-bold text-gray-900">Members List ({displayMemberCount})</p>
                <ChevronRight size={20} className="text-gray-400" />
              </div>

              {/* Pending Join Requests */}
              {group.type === 'private' && iAmAdmin && (
                <div 
                  onClick={() => setShowJoinRequests(true)}
                  className="flex items-center justify-between px-5 py-4 border-b border-gray-100 cursor-pointer active:bg-gray-50"
                >
                  <p className="text-[15px] font-bold text-gray-900">Pending Join Requests</p>
                  <ChevronRight size={20} className="text-gray-400" />
                </div>
              )}

              {/* Group Settings */}
              {isGroupCreator && (
                <div 
                  onClick={() => {
                    setPrevViewState('info');
                    setViewState('settings');
                  }}
                  className="flex items-center justify-between px-5 py-4 cursor-pointer active:bg-gray-50 border-t border-gray-100"
                >
                  <p className="text-[15px] font-bold text-gray-900">Group Settings</p>
                  <ChevronRight size={20} className="text-gray-400" />
                </div>
              )}
            </div>

            {/* EXIT GROUP */}
            <div className="bg-white shadow-sm mb-2 text-left">
              <button 
                onClick={() => {
                  showConfirm("Are you sure you want to exit this group?", () => {
                    navigate('/member/groups');
                    leaveGroup(group.id);
                  });
                }}
                className="w-full text-left px-5 py-4 text-[15px] font-bold text-red-500 hover:bg-red-50/20 active:bg-red-50 transition-colors flex items-center gap-2"
              >
                <LogOut size={20} className="text-red-500" />
                <span>Exit Group</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── VIEW 3: MEMBERS LIST SCREEN ─── */}
      {viewState === 'members' && (
        <div className="flex flex-col flex-1 h-screen overflow-hidden bg-slate-50">
          {/* Header */}
          <div className="bg-white px-4 h-16 flex items-center gap-3 border-b border-gray-100 shrink-0 sticky top-0 z-30 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <button onClick={() => setViewState(prevViewState)} className="p-1 -ml-1 press-scale">
              <ArrowLeft size={20} className="text-gray-700" />
            </button>
            <div>
              <h3 className="text-[15.5px] font-black text-gray-900 leading-tight">Group Members</h3>
              <p className="text-[11px] text-gray-400 font-bold mt-0.5">{displayMemberCount} members</p>
            </div>
          </div>

          {/* Search bar & Add button wrapper */}
          <div className="p-4 bg-white border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-[#F5F6FA] rounded-2xl flex items-center px-4 py-2.5 border border-transparent focus-within:border-brand-primary/20 focus-within:bg-white transition-all">
                <Search size={16} className="text-gray-400 shrink-0 mr-2" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="bg-transparent outline-none w-full text-[13px] text-text-primary placeholder:text-gray-400 font-medium"
                />
              </div>
              <button 
                onClick={() => setShowAddMemberModal(true)}
                className="w-10 h-10 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center press-scale shrink-0 hover:bg-brand-primary/20 transition-all"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Members list */}
          <div className="flex-1 overflow-y-auto bg-white divide-y divide-gray-50 pb-10">
            {(realMembers || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Users size={40} className="mb-3 opacity-30" />
                <p className="text-[13px] font-semibold">No members yet</p>
              </div>
            ) : (
              (realMembers || [])
                .filter(m => {
                  const name = m.userId?.name || m.name || '';
                  return name.toLowerCase().includes(memberSearch.toLowerCase());
                })
                .map((m) => {
                  const memberId = m.userId?._id || m.userId;
                  const memberName = m.userId?.name || m.name || 'Unknown';
                  const memberAvatar = m.userId?.avatar || m.avatar || null;
                  const memberRole = m.role || 'member';
                  const initials = memberName.slice(0, 2).toUpperCase();
                  const isMe = memberId?.toString() === (currentUser?.id || currentUser?._id)?.toString();

                  return (
                    <div
                      key={memberId}
                      onClick={() => navigate(`/member/directory/${memberId}`)}
                      className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors animate-fade-in cursor-pointer press-scale-slight"
                    >
                      <div className="flex items-center gap-3.5">
                        <Avatar initials={initials} src={memberAvatar} size="md" color="bg-indigo-50 text-indigo-700" />
                        <div>
                          <h4 className="text-[13.5px] font-extrabold text-gray-900 leading-tight">{memberName} {isMe && <span className="text-gray-400 text-[11px] font-normal">(You)</span>}</h4>
                          <p className="text-[10px] text-gray-400 font-semibold mt-1">{memberRole === 'admin' || memberRole === 'head' ? 'Admin' : 'Member'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 relative">
                        <span className={`text-[11.5px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          memberRole === 'admin' || memberRole === 'head' ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-50'
                        }`}>
                          {memberRole === 'admin' || memberRole === 'head' ? 'Admin' : 'Member'}
                        </span>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeMemberActionId === memberId) setActiveMemberActionId(null);
                            else setActiveMemberActionId(memberId);
                          }}
                          className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-gray-500"
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        {activeMemberActionId === memberId && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveMemberActionId(null); }} />
                            <div className="absolute right-0 top-10 w-48 bg-white border border-slate-150 rounded-2xl shadow-xl py-1.5 z-50 animate-scale-up">
                              <button onClick={(e) => { e.stopPropagation(); navigate(`/member/directory/${memberId}`); }} className="w-full text-left px-4 py-2 text-[13px] font-semibold text-gray-700 hover:bg-slate-50">
                                View Profile
                              </button>
                              {iAmAdmin && !isMe && (
                                <>
                                  {memberRole !== 'admin' && memberRole !== 'head' && (
                                    <button onClick={(e) => { e.stopPropagation(); handleMemberAction('promote', memberId); }} className="w-full text-left px-4 py-2 text-[13px] font-semibold text-brand-primary hover:bg-slate-50 border-t border-slate-50">
                                      Promote to Admin
                                    </button>
                                  )}
                                  {memberRole === 'admin' && currentUserRole === 'head' && (
                                    <button onClick={(e) => { e.stopPropagation(); handleMemberAction('demote', memberId); }} className="w-full text-left px-4 py-2 text-[13px] font-semibold text-orange-600 hover:bg-slate-50 border-t border-slate-50">
                                      Demote to Member
                                    </button>
                                  )}
                                  <button onClick={(e) => { e.stopPropagation(); handleMemberAction('remove', memberId); }} className="w-full text-left px-4 py-2 text-[13px] font-semibold text-red-600 hover:bg-slate-50 border-t border-slate-50">
                                    Remove Member
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* ─── VIEW 4: GROUP SETTINGS SCREEN ─── */}
      {viewState === 'settings' && (
        <div className="flex flex-col flex-1 h-full overflow-hidden bg-[#F5F6FA]">
          {/* Header */}
          <div className="bg-white px-4 h-16 flex items-center justify-between border-b border-gray-150/40 shrink-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
            <button onClick={() => setViewState('info')} className="p-1 -ml-1 press-scale">
              <ArrowLeft size={22} className="text-slate-800" />
            </button>
            <h3 className="text-[15.5px] font-bold text-slate-800 absolute left-1/2 -translate-x-1/2">Group Settings</h3>
            <div className="w-8" />
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-12">
            {/* SECTION 1: PRIVACY */}
            <div>
              <h4 className="text-[12px] font-black text-brand-primary uppercase tracking-wider mb-2.5 px-1">Privacy</h4>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] divide-y divide-gray-50 overflow-hidden">
                {/* Group Type */}
                <div className="relative">
                  <div 
                    onClick={() => setActiveDropdownField(activeDropdownField === 'groupType' ? null : 'groupType')}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 active:bg-gray-100 transition-colors"
                  >
                    <span className="text-[13px] font-bold text-gray-800">Group Type</span>
                    <span className="text-[12px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">{privacySettings.type}</span>
                  </div>

                  {activeDropdownField === 'groupType' && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setActiveDropdownField(null)} />
                      <div className="absolute right-4 top-12 w-48 bg-white border border-slate-150 rounded-2xl shadow-xl py-1.5 z-40 animate-scale-up">
                        {['Public', 'Private', 'Admin Only'].map(opt => (
                          <button
                            key={opt}
                            onClick={() => {
                              setPrivacySettings(prev => ({ ...prev, type: opt }));
                              handleUpdateGroupSettings({ privacy: { type: opt } });
                              setActiveDropdownField(null);
                            }}
                            className="w-full text-left px-4 py-2 text-[13px] font-semibold text-gray-700 hover:bg-slate-50 flex items-center justify-between"
                          >
                            <span>{opt}</span>
                            {privacySettings.type === opt && <Check size={14} className="text-brand-primary" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Add Members Permission */}
                <div className="relative">
                  <div 
                    onClick={() => setActiveDropdownField(activeDropdownField === 'addMembers' ? null : 'addMembers')}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 active:bg-gray-100 transition-colors"
                  >
                    <span className="text-[13px] font-bold text-gray-800">Permission to Add Members</span>
                    <span className="text-[12px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">
                      {privacySettings.canAdd === 'all' ? 'All Members' : 'Only Admin'}
                    </span>
                  </div>

                  {activeDropdownField === 'addMembers' && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setActiveDropdownField(null)} />
                      <div className="absolute right-4 top-12 w-48 bg-white border border-slate-150 rounded-2xl shadow-xl py-1.5 z-40 animate-scale-up">
                        {[
                          { label: 'All Members', value: 'all' },
                          { label: 'Only Admin', value: 'admin' }
                        ].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setPrivacySettings(prev => ({ ...prev, canAdd: opt.value }));
                              handleUpdateGroupSettings({ privacy: { canAddMembers: opt.value } });
                              setActiveDropdownField(null);
                            }}
                            className="w-full text-left px-4 py-2 text-[13px] font-semibold text-gray-700 hover:bg-slate-50 flex items-center justify-between"
                          >
                            <span>{opt.label}</span>
                            {privacySettings.canAdd === opt.value && <Check size={14} className="text-brand-primary" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* See Members Permission */}
                <div className="relative">
                  <div 
                    onClick={() => setActiveDropdownField(activeDropdownField === 'seeMembers' ? null : 'seeMembers')}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 active:bg-gray-100 transition-colors"
                  >
                    <span className="text-[13px] font-bold text-gray-800">Permission to See Members</span>
                    <span className="text-[12px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">
                      {privacySettings.canSee === 'all' ? 'All Members' : 'Only Admin'}
                    </span>
                  </div>

                  {activeDropdownField === 'seeMembers' && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setActiveDropdownField(null)} />
                      <div className="absolute right-4 top-12 w-48 bg-white border border-slate-150 rounded-2xl shadow-xl py-1.5 z-40 animate-scale-up">
                        {[
                          { label: 'All Members', value: 'all' },
                          { label: 'Only Admin', value: 'admin' }
                        ].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setPrivacySettings(prev => ({ ...prev, canSee: opt.value }));
                              handleUpdateGroupSettings({ privacy: { canSeeMembers: opt.value } });
                              setActiveDropdownField(null);
                            }}
                            className="w-full text-left px-4 py-2 text-[13px] font-semibold text-gray-700 hover:bg-slate-50 flex items-center justify-between"
                          >
                            <span>{opt.label}</span>
                            {privacySettings.canSee === opt.value && <Check size={14} className="text-brand-primary" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2: CHAT SETTINGS */}
            <div>
              <h4 className="text-[12px] font-black text-brand-primary uppercase tracking-wider mb-2.5 px-1">Chat Settings</h4>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] divide-y divide-gray-50 overflow-hidden">
                {/* Send Messages */}
                <div className="relative">
                  <div 
                    onClick={() => setActiveDropdownField(activeDropdownField === 'sendMessages' ? null : 'sendMessages')}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 active:bg-gray-100 transition-colors"
                  >
                    <span className="text-[13px] font-bold text-gray-800">Permission to Send Messages</span>
                    <span className="text-[12px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">{chatPermissions.canSend}</span>
                  </div>

                  {activeDropdownField === 'sendMessages' && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setActiveDropdownField(null)} />
                      <div className="absolute right-4 top-12 w-48 bg-white border border-slate-150 rounded-2xl shadow-xl py-1.5 z-40 animate-scale-up">
                        {['All Members', 'Only Admin'].map(opt => (
                          <button
                            key={opt}
                            onClick={() => {
                              setChatPermissions(prev => ({ ...prev, canSend: opt }));
                              handleUpdateGroupSettings({ chatPermissions: { canSendMessages: opt } });
                              setActiveDropdownField(null);
                            }}
                            className="w-full text-left px-4 py-2 text-[13px] font-semibold text-gray-700 hover:bg-slate-50 flex items-center justify-between"
                          >
                            <span>{opt}</span>
                            {chatPermissions.canSend === opt && <Check size={14} className="text-brand-primary" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Share Media */}
                <div className="relative">
                  <div 
                    onClick={() => setActiveDropdownField(activeDropdownField === 'shareMedia' ? null : 'shareMedia')}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 active:bg-gray-100 transition-colors"
                  >
                    <span className="text-[13px] font-bold text-gray-800">Permission to Share Media</span>
                    <span className="text-[12px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">{chatPermissions.canMedia}</span>
                  </div>

                  {activeDropdownField === 'shareMedia' && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setActiveDropdownField(null)} />
                      <div className="absolute right-4 top-12 w-48 bg-white border border-slate-150 rounded-2xl shadow-xl py-1.5 z-40 animate-scale-up">
                        {['All Members', 'Only Admin'].map(opt => (
                          <button
                            key={opt}
                            onClick={() => {
                              setChatPermissions(prev => ({ ...prev, canMedia: opt }));
                              handleUpdateGroupSettings({ chatPermissions: { canShareMedia: opt } });
                              setActiveDropdownField(null);
                            }}
                            className="w-full text-left px-4 py-2 text-[13px] font-semibold text-gray-700 hover:bg-slate-50 flex items-center justify-between"
                          >
                            <span>{opt}</span>
                            {chatPermissions.canMedia === opt && <Check size={14} className="text-brand-primary" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Share Links */}
                <div className="relative">
                  <div 
                    onClick={() => setActiveDropdownField(activeDropdownField === 'shareLinks' ? null : 'shareLinks')}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 active:bg-gray-100 transition-colors"
                  >
                    <span className="text-[13px] font-bold text-gray-800">Permission to Share Links</span>
                    <span className="text-[12px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">{chatPermissions.canLinks}</span>
                  </div>

                  {activeDropdownField === 'shareLinks' && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setActiveDropdownField(null)} />
                      <div className="absolute right-4 top-12 w-48 bg-white border border-slate-150 rounded-2xl shadow-xl py-1.5 z-40 animate-scale-up">
                        {['All Members', 'Only Admin'].map(opt => (
                          <button
                            key={opt}
                            onClick={() => {
                              setChatPermissions(prev => ({ ...prev, canLinks: opt }));
                              handleUpdateGroupSettings({ chatPermissions: { canShareLinks: opt } });
                              setActiveDropdownField(null);
                            }}
                            className="w-full text-left px-4 py-2 text-[13px] font-semibold text-gray-700 hover:bg-slate-50 flex items-center justify-between"
                          >
                            <span>{opt}</span>
                            {chatPermissions.canLinks === opt && <Check size={14} className="text-brand-primary" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 3: OTHER SETTINGS */}
            <div>
              <h4 className="text-[12px] font-black text-brand-primary uppercase tracking-wider mb-2.5 px-1">Other Settings</h4>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
                {/* Edit Group Info */}
                <div 
                  onClick={() => {
                    setEditGroupName(group.name);
                    setEditGroupDesc(group.description || '');
                    setEditGroupAvatar(group.avatarUrl || '');
                    setIsEditingInfo(true);
                  }}
                  className="p-4 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-gray-400" />
                    <span className="text-[13px] font-bold text-gray-800">Edit Group Info</span>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT GROUP INFO MODAL ─── */}
      {isEditingInfo && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-white rounded-[32px] max-w-sm w-full p-6 shadow-2xl flex flex-col animate-scale-up border border-gray-100 relative">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-[16px] font-bold text-gray-900">Edit Group Info</h3>
              <button 
                onClick={() => setIsEditingInfo(false)} 
                className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-gray-500 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            {/* Avatar picker */}
            <div className="flex flex-col items-center mb-5">
              <div className="relative w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center border border-gray-200 shadow-sm overflow-hidden group/avatar">
                {editGroupAvatar ? (
                  <img src={editGroupAvatar} alt="Group Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Avatar initials={group.initials} size="xl" color={groupColors[group.category] || 'bg-gray-100 text-gray-700'} />
                )}
                <label className="absolute inset-0 bg-black/45 flex items-center justify-center cursor-pointer opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                  <Camera size={22} className="text-white animate-pulse" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setEditGroupAvatar(event.target.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }} 
                  />
                </label>
              </div>
              <span className="text-[11px] text-gray-400 font-bold mt-1.5">Change Group Profile Photo</span>
            </div>

            {/* Fields */}
            <div className="space-y-4">
              <div>
                <label className="text-[11.5px] font-bold text-slate-500">Group Name</label>
                <input 
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-gray-150 focus:border-brand-primary focus:bg-white outline-none text-[13.5px] font-semibold transition-all text-slate-800"
                />
              </div>
              <div>
                <label className="text-[11.5px] font-bold text-slate-500">Group Description</label>
                <textarea 
                  value={editGroupDesc}
                  onChange={(e) => setEditGroupDesc(e.target.value)}
                  rows={3}
                  className="w-full mt-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-gray-150 focus:border-brand-primary focus:bg-white outline-none text-[13.5px] font-semibold resize-none transition-all text-slate-800"
                />
              </div>
            </div>

            {/* Save */}
            <button 
              onClick={async () => {
                if (!editGroupName.trim()) return;
                try {
                  await groupService.updateGroup(groupId, {
                    name: editGroupName,
                    description: editGroupDesc
                  });
                  await refreshGroups();
                  setIsEditingInfo(false);
                  showToast('Group updated!');
                } catch {
                  showToast('Failed to save changes');
                }
              }}
              className="mt-6 w-full py-3.5 bg-brand-primary text-white rounded-2xl text-[13.5px] font-bold shadow-md shadow-brand-primary/20 press-scale"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* ─── SIMULATED CALL MODAL ─── */}
      {activeCall && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-between py-16 px-6 animate-fade-in text-white">
          <div className="flex flex-col items-center mt-12 text-center">
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center border border-white/20 mb-6 shadow-xl relative overflow-hidden">
              <Avatar initials={group.initials} src={group.avatarUrl} size="xl" color={groupColors[group.category]} />
            </div>
            <h2 className="text-[20px] font-black tracking-tight">{group.name}</h2>
            <p className="text-[12px] text-slate-400 font-extrabold mt-3 uppercase tracking-widest animate-pulse">
              Simulated {activeCall === 'video' ? 'Video' : 'Voice'} Call...
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-6 w-full max-w-xs">
            {activeCall === 'video' && (
              <div className="w-full aspect-[4/3] rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden relative shadow-inner mb-4 flex items-center justify-center text-slate-500 text-[11px] font-bold">
                [ Local Camera Stream ]
                <div className="absolute bottom-3 right-3 w-16 h-20 rounded-xl bg-slate-800 border border-slate-700 shadow flex items-center justify-center text-[8px] text-slate-400 font-bold">
                  Self
                </div>
              </div>
            )}
            
            <button 
              onClick={() => setActiveCall(null)}
              className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-650/30 hover:bg-red-700 active:scale-90 transition-transform cursor-pointer"
            >
              <Phone size={24} className="rotate-[135deg]" />
            </button>
            <span className="text-[11px] text-slate-450 font-bold uppercase tracking-wider">End Call</span>
          </div>
        </div>
      )}

      {/* ─── GROUP MEDIA VIEW MODAL ─── */}
      {showMediaModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center animate-fade-in" onClick={() => setShowMediaModal(false)}>
          <div className="bg-white rounded-t-[28px] max-w-lg w-full h-[65vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 shrink-0" />
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
              <h3 className="text-[15.5px] font-black text-gray-900">Shared Media</h3>
              <button onClick={() => setShowMediaModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <div className="grid grid-cols-3 gap-2">
                  {messages.filter(msg => msg.attachment && msg.attachment.type === 'image').length > 0 ? (
                    messages.filter(msg => msg.attachment && msg.attachment.type === 'image').map((msg, i) => (
                      <div key={i} className="aspect-square rounded-xl overflow-hidden border border-gray-100 bg-slate-50 shadow-sm">
                        <img src={msg.attachment.url} alt="Media" className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 text-center py-6 text-[13px] text-gray-400 font-semibold">No media shared yet</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── STARRED MESSAGES MODAL ─── */}
      {showStarredModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center animate-fade-in" onClick={() => setShowStarredModal(false)}>
          <div className="bg-white rounded-t-[28px] max-w-lg w-full h-[60vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 shrink-0" />
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
              <h3 className="text-[15.5px] font-black text-gray-900">Starred Messages</h3>
              <button onClick={() => setShowStarredModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.filter(m => starredMessageIds.includes(m.id)).length > 0 ? (
                messages.filter(m => starredMessageIds.includes(m.id)).map((msg, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-gray-150 rounded-2xl relative shadow-sm text-left">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar initials={msg.initials} size="xs" />
                        <span className="text-[11px] font-extrabold text-gray-800">{msg.senderName}</span>
                      </div>
                      <Star size={12} className="text-amber-400" fill="currentColor" />
                    </div>
                    <p className="text-[12.5px] text-gray-700 leading-relaxed font-semibold">{msg.text || '[Attachment]'}</p>
                    <span className="absolute bottom-2.5 right-3 text-[9px] text-gray-400 font-semibold">{msg.time}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-16">
                  <Star size={36} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-[14px] font-bold text-gray-400">No starred messages yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ─── MODALS ─── */}
      {showMuteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowMuteDialog(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-[17px] font-extrabold text-gray-900">Mute notifications</h3>
              <p className="text-[13px] text-gray-500 font-medium mt-1">Other members will not see that you muted this chat. You will still be notified if you are mentioned.</p>
            </div>
            <div className="p-2">
              <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors">
                <input type="radio" name="mute" className="w-4 h-4 text-brand-primary border-gray-300 focus:ring-brand-primary" defaultChecked />
                <span className="text-[15px] font-semibold text-gray-800">8 hours</span>
              </label>
              <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors">
                <input type="radio" name="mute" className="w-4 h-4 text-brand-primary border-gray-300 focus:ring-brand-primary" />
                <span className="text-[15px] font-semibold text-gray-800">1 week</span>
              </label>
              <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors">
                <input type="radio" name="mute" className="w-4 h-4 text-brand-primary border-gray-300 focus:ring-brand-primary" />
                <span className="text-[15px] font-semibold text-gray-800">Always</span>
              </label>
            </div>
            <div className="p-4 flex gap-3 bg-gray-50/50 rounded-b-2xl">
              <button onClick={() => setShowMuteDialog(false)} className="flex-1 py-2.5 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition-colors">Cancel</button>
              <button onClick={async () => { await muteGroup(group.id); setShowMuteDialog(false); }} className="flex-1 py-2.5 rounded-xl bg-brand-primary text-white font-bold hover:bg-brand-primary-dark transition-colors shadow-sm">OK</button>
            </div>
          </div>
        </div>
      )}

      {showWallpaperDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowWallpaperDialog(false)}>
          <div className="bg-white rounded-2xl w-full max-w-[320px] overflow-hidden animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-[16px] font-extrabold text-gray-900">Set Wallpaper</h3>
              <button onClick={() => setShowWallpaperDialog(false)} className="p-1 rounded-full hover:bg-gray-200 text-gray-500"><X size={18} /></button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <button onClick={() => { setWallpaperTheme('default'); setShowWallpaperDialog(false); }} className={`aspect-square rounded-xl flex flex-col items-center justify-center border-2 transition-all ${wallpaperTheme === 'default' ? 'border-brand-primary scale-95 shadow-sm' : 'border-gray-100 hover:border-gray-200'} bg-[#EFEAE2] relative overflow-hidden`}>
                <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'radial-gradient(#cfc6b8 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
                <span className="relative z-10 text-[11px] font-bold text-gray-600 bg-white/80 px-2 py-0.5 rounded-full mt-2">Default</span>
              </button>
              <button onClick={() => { setWallpaperTheme('dark'); setShowWallpaperDialog(false); }} className={`aspect-square rounded-xl flex flex-col items-center justify-center border-2 transition-all ${wallpaperTheme === 'dark' ? 'border-brand-primary scale-95 shadow-sm' : 'border-gray-100 hover:border-gray-200'} bg-[#0b141a] relative overflow-hidden`}>
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
                <span className="relative z-10 text-[11px] font-bold text-white bg-black/50 px-2 py-0.5 rounded-full mt-2">Dark</span>
              </button>
              <button onClick={() => { setWallpaperTheme('solid-blue'); setShowWallpaperDialog(false); }} className={`aspect-square rounded-xl flex flex-col items-center justify-center border-2 transition-all ${wallpaperTheme === 'solid-blue' ? 'border-brand-primary scale-95 shadow-sm' : 'border-gray-100 hover:border-gray-200'} bg-blue-100`}>
                <span className="text-[11px] font-bold text-blue-800 bg-white/80 px-2 py-0.5 rounded-full">Solid Blue</span>
              </button>
              <button onClick={() => { setWallpaperTheme('solid-pink'); setShowWallpaperDialog(false); }} className={`aspect-square rounded-xl flex flex-col items-center justify-center border-2 transition-all ${wallpaperTheme === 'solid-pink' ? 'border-brand-primary scale-95 shadow-sm' : 'border-gray-100 hover:border-gray-200'} bg-pink-100`}>
                <span className="text-[11px] font-bold text-pink-800 bg-white/80 px-2 py-0.5 rounded-full">Solid Pink</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[13.5px] font-bold py-2.5 px-5 rounded-full z-[100] shadow-xl flex items-center gap-2 animate-scale-up whitespace-nowrap">
          <span>{toastMessage}</span>
        </div>
      )}

      {confirmDialog && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmDialog(null)}>
          <div className="bg-white rounded-3xl w-full max-w-[320px] overflow-hidden animate-scale-up shadow-2xl border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <h3 className="text-[15.5px] font-bold text-gray-900 leading-snug">{confirmDialog.message}</h3>
            </div>
            <div className="p-4 flex gap-3 bg-gray-50 border-t border-gray-100">
              <button 
                onClick={() => setConfirmDialog(null)} 
                className="flex-1 py-2 rounded-xl text-[13px] font-bold text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }} 
                className="flex-1 py-2 rounded-xl text-[13px] font-bold bg-red-500 hover:bg-red-600 text-white transition-colors shadow-sm"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddMemberModal && (
        <AddMemberSheet 
          groupId={groupId}
          onClose={() => setShowAddMemberModal(false)}
          onAddMembers={handleAddMember}
        />
      )}

      {showJoinRequests && (
        <JoinRequestsSheet
          groupId={groupId}
          onClose={() => setShowJoinRequests(false)}
        />
      )}

      <style>{`
        @keyframes typingBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default GroupDetailPage;
