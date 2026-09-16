import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Send, Image as ImageIcon, Smile, Loader2,
  Check, CheckCheck, Clock, MoreVertical, Phone, Video,
  Trash2, Reply, X, Info, Copy, MoreHorizontal
} from 'lucide-react';
import { useMatrimonialChat } from '../../../../hooks/useMatrimonialChat';
import { matrimonialChatService } from '../../../../core/api/matrimonialService';

// ─── Get current user ID from localStorage ────────────────────────────────────
const getCurrentUserId = () => {
  try {
    const raw = localStorage.getItem('merisamaj_user');
    const user = raw ? JSON.parse(raw) : null;
    return user?._id || user?.id || null;
  } catch { return null; }
};

// ─── Message Status Icon ───────────────────────────────────────────────────────
const MsgStatus = ({ msg, currentUserId }) => {
  if (msg.senderId?._id !== currentUserId && msg.senderId !== currentUserId) return null;
  if (msg.seenBy?.length > 0) return <CheckCheck size={12} className="text-blue-400" />;
  if (msg.deliveredAt)        return <CheckCheck size={12} className="text-slate-400" />;
  return <Check size={12} className="text-slate-400" />;
};

// ─── Lightweight Toast ───────────────────────────────────────────────────────
const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full text-[13px] font-semibold shadow-lg z-50 animate-fade-in-up">
      {message}
    </div>
  );
};

// ─── Image Modal ──────────────────────────────────────────────────────────────
const ImageModal = ({ url, onClose }) => {
  useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
        <X size={20} />
      </button>
      <img src={url} alt="Full view" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
    </div>
  );
};

// ─── Message Bubble ───────────────────────────────────────────────────────────
const MessageBubble = ({ msg, currentUserId, onReply, onDelete, onCopy, onImageClick }) => {
  const isMine = msg.senderId?._id === currentUserId || msg.senderId === currentUserId;
  const time   = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
  const isDeleted = msg.deletedFor?.includes(currentUserId) || msg.isDeleted || msg.type === 'deleted';

  if (isDeleted) {
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
        <div className="px-3 py-2 rounded-2xl bg-slate-100 text-slate-400 text-[12px] italic font-semibold max-w-[75%] border border-slate-200">
          🗑️ This message was deleted
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1 group`}>
      <div className={`relative max-w-[78%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Reply context */}
        {msg.replyTo && (
          <div className={`mb-1 px-3 py-1.5 rounded-xl border-l-4 ${isMine ? 'bg-rose-50 border-rose-300' : 'bg-slate-100 border-slate-300'} max-w-full`}>
            <p className="text-[10px] text-slate-500 font-bold truncate">{msg.replyTo.message || '[Media]'}</p>
          </div>
        )}

        <div
          className={`px-3.5 py-2.5 rounded-2xl text-[13.5px] font-semibold shadow-sm leading-relaxed ${
            isMine
              ? 'bg-gradient-to-br from-rose-500 to-pink-500 text-white rounded-br-md'
              : 'bg-white text-slate-800 rounded-bl-md border border-slate-100'
          }`}
        >
          {/* Image message */}
          {msg.type === 'image' && msg.mediaUrl ? (
            <img 
              src={msg.mediaUrl} 
              alt="sent" 
              className="max-w-full rounded-xl max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity" 
              onClick={() => onImageClick(msg.mediaUrl)} 
            />
          ) : (
            <p>{msg.message}</p>
          )}

          <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
            <span className={`text-[10px] font-semibold ${isMine ? 'text-white/60' : 'text-slate-400'}`}>{time}</span>
            <MsgStatus msg={msg} currentUserId={currentUserId} />
          </div>
        </div>

        {/* Hover actions */}
        <div className={`absolute top-0 ${isMine ? 'right-full mr-1' : 'left-full ml-1'} hidden group-hover:flex items-center gap-1`}>
          {msg.type !== 'image' && (
            <button onClick={() => onCopy(msg.message)} title="Copy"
              className="w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-700 active:scale-90">
              <Copy size={13} />
            </button>
          )}
          <button onClick={() => onReply(msg)} title="Reply"
            className="w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 active:scale-90">
            <Reply size={13} />
          </button>
          {isMine && (
            <button onClick={() => onDelete(msg)} title="Delete"
              className="w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-red-500 active:scale-90">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Typing Indicator ─────────────────────────────────────────────────────────
const TypingIndicator = () => (
  <div className="flex justify-start mb-2">
    <div className="bg-white border border-slate-100 px-4 py-2.5 rounded-2xl rounded-bl-md shadow-sm">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  </div>
);

// ─── Main Chat Page ───────────────────────────────────────────────────────────
const MatrimonialChatPage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const currentUserId = getCurrentUserId();

  const handleBack = () => {
    navigate(-1);
  };

  const {
    messages, loading, sending,
    fetchMessages, sendMessage, deleteMessage,
    emitTyping, stopTyping, markSeen, isOnline, typingUsers
  } = useMatrimonialChat(currentUserId);

  const [conversation, setConversation] = useState(null);
  const [text, setText]                 = useState('');
  const [replyTo, setReplyTo]           = useState(null);
  const [imgFile, setImgFile]           = useState(null);
  const [imgPreview, setImgPreview]     = useState(null);
  const [imgError, setImgError]         = useState('');
  
  const [toastMsg, setToastMsg]                 = useState('');
  const [viewImage, setViewImage]               = useState(null);
  const [messageToDelete, setMessageToDelete]   = useState(null);
  const [isDeleting, setIsDeleting]             = useState(false);

  const msgEndRef   = useRef(null);
  const inputRef    = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimer = useRef(null);

  // Load conversation info + messages
  const loadConversation = useCallback(async () => {
    try {
      const res = await matrimonialChatService.getConversations();
      const convs = res.data.data.conversations || [];
      const conv  = convs.find(c => c._id === conversationId);
      setConversation(conv || null);
    } catch {}
  }, [conversationId]);

  useEffect(() => {
    loadConversation();
    fetchMessages(conversationId);
    if (conversationId) {
      matrimonialChatService.markSeen(conversationId).catch(() => {});
      window.dispatchEvent(new Event('app:refresh_unread_counts'));
    }
  }, [conversationId, fetchMessages, loadConversation]);

  // Mark messages as seen
  useEffect(() => {
    if (messages.length > 0) {
      const myId = currentUserId?.toString();
      const unseenIds = messages
        .filter(m => {
          const senderId = (m.senderId?._id || m.senderId)?.toString();
          return senderId && senderId !== myId && !m.seenBy?.some(s => (s.userId?._id || s.userId || s)?.toString() === myId);
        })
        .map(m => m._id);
      if (unseenIds.length > 0) markSeen(conversationId, unseenIds);
      matrimonialChatService.markSeen(conversationId).catch(() => {});
      window.dispatchEvent(new Event('app:refresh_unread_counts'));
    }
  }, [messages, conversationId, currentUserId, markSeen]);

  // Scroll to bottom on new message
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typing handler
  const handleTextChange = (e) => {
    setText(e.target.value);
    emitTyping(conversationId);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => stopTyping(conversationId), 1500);
  };

  // Image select & Validate
  const handleImageSelect = (e) => {
    setImgError('');
    const file = e.target.files[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setImgError('Only JPG, JPEG, PNG and WEBP images are allowed.');
      return;
    }

    // Validate size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setImgError('Maximum image size is 5 MB.');
      return;
    }

    setImgFile(file);
    setImgPreview(URL.createObjectURL(file));
  };

  const handleSend = async () => {
    const msgText = text.trim();
    if (!msgText && !imgFile) return;

    stopTyping(conversationId);
    clearTimeout(typingTimer.current);

    const payload = {
      message:     msgText,
      messageType: imgFile ? 'image' : 'text',
      replyToId:   replyTo?._id
    };

    let res;
    if (imgFile) {
      const formData = new FormData();
      formData.append('photo', imgFile);
      formData.append('message', msgText || '');
      formData.append('messageType', 'image');
      if (replyTo) formData.append('replyToId', replyTo._id);
      res = await sendMessage(conversationId, formData);
    } else {
      res = await sendMessage(conversationId, payload);
    }

    if (res && !res.success) {
      setToastMsg(res.error || 'Failed to send message.');
      return;
    }

    setText('');
    setReplyTo(null);
    setImgFile(null);
    setImgPreview(null);
    inputRef.current?.focus();
  };

  const handleCopy = async (msgText) => {
    try {
      await navigator.clipboard.writeText(msgText);
      setToastMsg('Message copied.');
    } catch {
      setToastMsg('Unable to copy message.');
    }
  };

  const confirmDelete = async () => {
    if (!messageToDelete) return;
    setIsDeleting(true);
    // Hard delete for everyone as per new requirements
    const res = await deleteMessage(messageToDelete._id, 'everyone');
    setIsDeleting(false);
    setMessageToDelete(null);
    if (!res.success) setToastMsg('Unable to delete message. Please try again.');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Partner info
  const partner = conversation?.participants?.find(p => (p._id || p) !== currentUserId);
  const partnerName = partner?.name || conversation?.partnerName || 'Chat';
  const partnerOnline = isOnline(partner?._id);
  const isTyping = typingUsers[conversationId];

  return (
    <div className="flex flex-col h-screen bg-slate-50 relative">
      {/* Toast Notification */}
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg('')} />}

      {/* Image Modal */}
      {viewImage && <ImageModal url={viewImage} onClose={() => setViewImage(null)} />}

      {/* Delete Confirmation Modal */}
      {messageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl text-center animate-fade-in-up">
            <h3 className="text-[16px] font-black text-slate-800 mb-2">Delete Message</h3>
            <p className="text-[14px] text-slate-500 font-semibold mb-6">Delete this message?</p>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setMessageToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors disabled:opacity-50 flex justify-center"
              >
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 h-14 flex items-center gap-3 sticky top-0 z-30 shadow-sm shrink-0">
        <button onClick={handleBack} className="p-1 active:opacity-60">
          <ArrowLeft size={22} className="text-slate-800" />
        </button>
        <div
          className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-100 to-pink-200 flex items-center justify-center font-black text-rose-500 text-[14px] shrink-0 cursor-pointer"
          onClick={() => conversation?.partnerProfileId && navigate(`/member/matrimonial/${conversation.partnerProfileId}`)}
        >
          {partnerName[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-black text-slate-800 truncate leading-tight">{partnerName}</p>
          <p className={`text-[10px] font-bold ${partnerOnline ? 'text-emerald-500' : 'text-slate-400'}`}>
            {isTyping ? 'typing...' : partnerOnline ? 'Online' : 'Last seen recently'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => conversation?.partnerProfileId && navigate(`/member/matrimonial/${conversation.partnerProfileId}`)}
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 active:scale-90"
            title="View Profile"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading && messages.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 size={28} className="text-rose-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4 border border-rose-100">
              <MessageCircleIcon />
            </div>
            <p className="text-[14px] font-extrabold text-slate-800 mb-1">Start the conversation</p>
            <p className="text-[12px] text-slate-400 font-semibold max-w-[220px]">
              You're now connected. Say hello! 👋
            </p>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <MessageBubble
                key={msg._id}
                msg={msg}
                currentUserId={currentUserId}
                onReply={setReplyTo}
                onDelete={setMessageToDelete}
                onCopy={handleCopy}
                onImageClick={setViewImage}
              />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={msgEndRef} />
          </>
        )}
      </div>

      {/* Error preview */}
      {imgError && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex items-center justify-between">
          <p className="text-[12px] text-red-600 font-semibold">{imgError}</p>
          <button onClick={() => setImgError('')} className="text-red-400 active:scale-90"><X size={14} /></button>
        </div>
      )}

      {/* Image preview */}
      {imgPreview && (
        <div className="px-4 py-2 bg-white border-t border-slate-100">
          <div className="relative w-20 h-20">
            <img src={imgPreview} alt="preview" className="w-full h-full rounded-xl object-cover border border-slate-200" />
            <button onClick={() => { setImgFile(null); setImgPreview(null); setImgError(''); }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white">
              <X size={11} />
            </button>
          </div>
        </div>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div className="px-4 py-2 bg-rose-50 border-t border-rose-100 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-rose-500 mb-0.5">Replying to</p>
            <p className="text-[11.5px] text-slate-700 font-semibold truncate">{replyTo.message || '[Image]'}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-slate-400 active:scale-90"><X size={16} /></button>
        </div>
      )}

      {/* Input Bar or Read-Only Banner */}
      {conversation?.isReadOnly ? (
        <div className="bg-slate-100 border-t border-slate-200 px-4 py-4 text-center shrink-0">
          <p className="text-[13px] font-bold text-slate-500 flex items-center justify-center gap-2">
            <Info size={16} /> This conversation has been archived after marriage confirmation.
          </p>
        </div>
      ) : (
        <div className="bg-white border-t border-slate-100 px-3 py-2.5 shrink-0"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 10px)' }}>
          
          {/* Upload Progress Banner */}
          {sending && imgFile && (
            <div className="absolute bottom-full left-0 right-0 bg-slate-800 text-white text-[12px] font-bold px-4 py-2 flex items-center justify-between z-10 animate-fade-in-up">
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Uploading image...
              </span>
            </div>
          )}

          <div className="flex items-end gap-2">
            <button onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 active:scale-90 shrink-0 disabled:opacity-40 disabled:active:scale-100">
              <ImageIcon size={18} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg, image/jpg, image/png, image/webp" className="hidden" onChange={handleImageSelect} disabled={sending} />

            <div className="flex-1 bg-slate-100 rounded-2xl px-4 py-2.5 flex items-end gap-2 min-h-[44px]">
              <textarea
                ref={inputRef}
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                disabled={sending && imgFile}
                placeholder={sending && imgFile ? "Uploading..." : "Type a message..."}
                rows={1}
                className="flex-1 bg-transparent text-[13.5px] font-semibold text-slate-800 resize-none outline-none max-h-24 placeholder-slate-400 leading-relaxed disabled:opacity-50"
                style={{ minHeight: '20px' }}
              />
            </div>

            <button
              onClick={handleSend}
              disabled={(!text.trim() && !imgFile) || sending}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-rose-200 active:scale-90 transition-all disabled:opacity-40 shrink-0"
            >
              {sending && !imgFile ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Mini icon for empty state
const MessageCircleIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-400">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export default MatrimonialChatPage;
