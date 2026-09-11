import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Search, Send, Check, UserPlus, Users, Link2, 
  Loader2, CheckCircle, MessageCircle, MapPin, ExternalLink 
} from 'lucide-react';
import { Avatar } from '../../../components/common/Avatar';
import socialService from '../../../../../core/api/socialService';

export const SharePostModal = ({ isOpen, onClose, post, onPostShared }) => {
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'connected' | 'unconnected'
  const [customNote, setCustomNote] = useState('');
  
  // Tracking state per member
  const [sharingMemberId, setSharingMemberId] = useState(null);
  const [sentMemberIds, setSentMemberIds] = useState(new Set());
  const [connectingMemberId, setConnectingMemberId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2600);
  };

  // Fetch share recipients when modal opens
  useEffect(() => {
    if (!isOpen) {
      setSentMemberIds(new Set());
      setCustomNote('');
      setSearchQuery('');
      setActiveFilter('all');
      return;
    }

    let isMounted = true;
    setLoading(true);

    socialService.getShareRecipients()
      .then((res) => {
        if (isMounted && res && res.data) {
          setRecipients(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load share recipients:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Filtered members list
  const filteredRecipients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return recipients.filter((m) => {
      const matchesSearch = 
        !query ||
        m.name?.toLowerCase().includes(query) ||
        m.city?.toLowerCase().includes(query) ||
        m.profession?.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (activeFilter === 'connected') return m.isConnected;
      if (activeFilter === 'unconnected') return !m.isConnected;
      return true;
    });
  }, [recipients, searchQuery, activeFilter]);

  const connectedCount = useMemo(() => recipients.filter(r => r.isConnected).length, [recipients]);
  const unconnectedCount = recipients.length - connectedCount;

  // Handler: Share post to connected member
  const handleShareToMember = async (member) => {
    if (!post || sharingMemberId) return;
    const memberId = member._id || member.id;
    setSharingMemberId(memberId);

    try {
      const postId = post._id || post.id;
      const res = await socialService.sharePostToUser(postId, memberId, customNote);
      if (res && res.success) {
        setSentMemberIds((prev) => new Set([...prev, memberId]));
        triggerToast(`Shared with ${member.name.split(' ')[0]}!`);
        if (typeof onPostShared === 'function') {
          onPostShared(postId);
        }
      }
    } catch (err) {
      console.error('Failed to share post:', err);
      triggerToast(err.response?.data?.message || 'Failed to share post');
    } finally {
      setSharingMemberId(null);
    }
  };

  // Handler: Send connect/follow request to unconnected member
  const handleConnect = async (member) => {
    const memberId = member._id || member.id;
    if (connectingMemberId) return;
    setConnectingMemberId(memberId);

    try {
      const res = await socialService.toggleFollow(memberId);
      if (res && res.success) {
        const isNowFollowing = res.isFollowing;
        const isPending = res.status === 'pending';

        setRecipients((prev) =>
          prev.map((m) => {
            const mId = m._id || m.id;
            if (mId === memberId) {
              return {
                ...m,
                isFollowing: isNowFollowing,
                isPending: isPending,
                isConnected: isNowFollowing && !isPending
              };
            }
            return m;
          })
        );

        if (isPending) {
          triggerToast(`Connection request sent to ${member.name.split(' ')[0]}!`);
        } else if (isNowFollowing) {
          triggerToast(`Connected with ${member.name.split(' ')[0]}! You can now share.`);
        }
      }
    } catch (err) {
      console.error('Failed to connect:', err);
      triggerToast('Failed to send connection request');
    } finally {
      setConnectingMemberId(null);
    }
  };

  // External Action: Copy Link
  const handleCopyLink = async () => {
    const postId = post?._id || post?.id;
    const clientUrl = import.meta.env.VITE_CLIENT_URL || window.location.origin;
    const url = `${clientUrl}/member/social/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      await socialService.recordShare(postId, 'copy_link');
      if (typeof onPostShared === 'function') onPostShared(postId);
      triggerToast('Link copied to clipboard!');
    } catch (err) {
      console.error('Copy link failed:', err);
    }
  };

  // External Action: Native Web Share API
  const handleNativeShare = async () => {
    const postId = post?._id || post?.id;
    const clientUrl = import.meta.env.VITE_CLIENT_URL || window.location.origin;
    const url = `${clientUrl}/member/social/${postId}`;
    const title = post?.title || 'Shared Community Post';

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: post?.content ? post.content.substring(0, 100) : '',
          url
        });
        await socialService.recordShare(postId, 'copy_link');
        if (typeof onPostShared === 'function') onPostShared(postId);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Native share failed:', err);
        }
      }
    } else {
      handleCopyLink();
    }
  };

  if (!isOpen) return null;

  // Post preview thumbnail
  const postThumbnail = post?.media?.[0]?.url || post?.images?.[0] || post?.image || null;
  const postSnippet = post?.title || (post?.content ? post.content.substring(0, 75) : 'Community Post');

  return createPortal(
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-3xl shadow-2xl flex flex-col max-h-[88vh] border border-purple-100/30 overflow-hidden relative"
        >
          {/* Toast Alert Inside Modal */}
          {toastMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-[11.5px] font-bold px-4 py-1.5 rounded-full shadow-lg backdrop-blur-md flex items-center gap-1.5"
            >
              <Check size={13} className="text-emerald-400" />
              <span>{toastMessage}</span>
            </motion.div>
          )}

          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-[15px] font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5">
                <span>Share Post</span>
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary"></span>
              </h3>
              <p className="text-[11px] font-medium text-slate-400">Share with connected members or external apps</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition-all press-scale"
            >
              <X size={16} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-5 space-y-4">
            {/* Post Snippet Card */}
            <div className="bg-slate-50/90 border border-slate-200/60 rounded-2xl p-3 flex items-center gap-3">
              {postThumbnail ? (
                <img 
                  src={postThumbnail} 
                  alt="Post thumbnail" 
                  className="w-11 h-11 rounded-xl object-cover shrink-0 border border-slate-200/50 shadow-xs" 
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-purple-100/60 flex items-center justify-center shrink-0 text-brand-primary">
                  <MessageCircle size={18} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11.5px] font-bold text-slate-800 truncate">
                    {post?.author?.name || post?.userId?.name || 'Member'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">• Post</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  {postSnippet}...
                </p>
              </div>
            </div>

            {/* Optional Personal Note Input */}
            <div>
              <input
                type="text"
                placeholder="Add a message... (optional)"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                maxLength={200}
                className="w-full bg-slate-50/80 border border-slate-200/80 rounded-2xl px-3.5 py-2 text-[12px] font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/10 transition-all"
              />
            </div>

            {/* Quick External Actions Row */}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200/70 text-slate-700 rounded-2xl text-[11.5px] font-bold transition-colors press-scale border border-slate-200/40"
              >
                <Link2 size={14} className="text-slate-500" />
                <span>Copy Link</span>
              </button>

              <button
                onClick={handleNativeShare}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-purple-50 hover:bg-purple-100 text-brand-primary rounded-2xl text-[11.5px] font-bold transition-colors press-scale border border-purple-200/40"
              >
                <ExternalLink size={14} />
                <span>More Options</span>
              </button>
            </div>

            {/* Member Search Bar */}
            <div className="relative pt-1">
              <input
                type="text"
                placeholder="Search member by name or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-9 pr-8 py-2.5 text-[12px] font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/10 transition-all shadow-inner"
              />
              <Search size={14} className="absolute left-3 top-4 text-slate-400" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100/70 p-1 rounded-2xl">
              <button
                onClick={() => setActiveFilter('all')}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded-xl transition-all ${
                  activeFilter === 'all'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                All ({recipients.length})
              </button>
              <button
                onClick={() => setActiveFilter('connected')}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded-xl transition-all ${
                  activeFilter === 'connected'
                    ? 'bg-white text-brand-primary shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Connected ({connectedCount})
              </button>
              <button
                onClick={() => setActiveFilter('unconnected')}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded-xl transition-all ${
                  activeFilter === 'unconnected'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Connect ({unconnectedCount})
              </button>
            </div>

            {/* Recipients List */}
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
                  <Loader2 size={22} className="animate-spin text-brand-primary" />
                  <span className="text-[11.5px] font-semibold">Loading members...</span>
                </div>
              ) : filteredRecipients.length > 0 ? (
                filteredRecipients.map((member) => {
                  const mId = member._id || member.id;
                  const isSent = sentMemberIds.has(mId);
                  const isSharing = sharingMemberId === mId;
                  const isConnecting = connectingMemberId === mId;
                  const isConnected = member.isConnected;

                  return (
                    <div
                      key={mId}
                      className="flex items-center justify-between p-2.5 bg-slate-50/60 hover:bg-slate-100/50 border border-slate-100 rounded-2xl transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar
                          src={member.avatar}
                          initials={member.name ? member.name.charAt(0) : '?'}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[12.5px] font-bold text-slate-800 truncate leading-tight">
                              {member.name}
                            </span>
                            {member.verificationStatus === 'verified' && (
                              <CheckCircle size={12} className="text-emerald-500 fill-emerald-50 shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] font-medium text-slate-400 truncate mt-0.5 flex items-center gap-1">
                            {member.city && (
                              <>
                                <MapPin size={9} className="text-slate-400 shrink-0" />
                                <span>{member.city}</span>
                              </>
                            )}
                            {member.profession && (
                              <span>• {member.profession}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="shrink-0 pl-2">
                        {isConnected ? (
                          isSent ? (
                            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-[11px] font-extrabold rounded-xl flex items-center gap-1 border border-emerald-100/60">
                              <Check size={12} strokeWidth={3} />
                              <span>Sent</span>
                            </span>
                          ) : isSharing ? (
                            <button
                              disabled
                              className="px-3 py-1.5 bg-purple-100 text-brand-primary text-[11px] font-bold rounded-xl flex items-center gap-1 cursor-not-allowed"
                            >
                              <Loader2 size={12} className="animate-spin" />
                              <span>Sending...</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleShareToMember(member)}
                              className="px-3.5 py-1.5 bg-brand-primary hover:bg-brand-secondary text-white text-[11px] font-bold rounded-xl press-scale shadow-sm shadow-purple-500/20 flex items-center gap-1 transition-all"
                            >
                              <Send size={11} />
                              <span>Share</span>
                            </button>
                          )
                        ) : member.isPending ? (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-600 text-[10.5px] font-bold rounded-xl border border-amber-100/70">
                            Requested
                          </span>
                        ) : isConnecting ? (
                          <button
                            disabled
                            className="px-3 py-1.5 bg-slate-100 text-slate-400 text-[11px] font-bold rounded-xl flex items-center gap-1 cursor-not-allowed"
                          >
                            <Loader2 size={12} className="animate-spin" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConnect(member)}
                            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100/80 text-brand-primary text-[11px] font-bold rounded-xl press-scale border border-purple-200/50 flex items-center gap-1 transition-all"
                          >
                            <UserPlus size={11} />
                            <span>Connect</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-400 space-y-1">
                  <Users size={24} className="mx-auto text-slate-300 mb-1" />
                  <p className="text-[12px] font-semibold text-slate-500">
                    {searchQuery ? 'No matching members found.' : 'No members found in this list.'}
                  </p>
                  <p className="text-[10.5px] text-slate-400">
                    {activeFilter === 'connected' ? 'Try connecting with more members first.' : 'Check search spelling or reset filter.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default SharePostModal;
