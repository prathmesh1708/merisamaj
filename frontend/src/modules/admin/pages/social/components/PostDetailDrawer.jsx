import React, { useState, useEffect } from 'react';
import { 
  X, Heart, MessageCircle, Eye, EyeOff, Pin, Trash2, RotateCcw, 
  MapPin, Users, Calendar, Clock, User, ShieldAlert, Award, FileText, 
  Image as ImageIcon, Video, ExternalLink, Share2, Bookmark, Copy, Check
} from 'lucide-react';
import { axiosPrivate } from '../../../../../core/api/axiosPrivate';

export const PostDetailDrawer = ({ postId, isOpen, onClose, onPostUpdated }) => {
  const [post, setPost] = useState(null);
  const [likes, setLikes] = useState([]);
  const [comments, setComments] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'likes' | 'comments' | 'reports'
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchDetails = async () => {
    if (!postId) return;
    try {
      setLoading(true);
      const [postRes, likesRes, commentsRes] = await Promise.all([
        axiosPrivate.get(`/admin/social/posts/${postId}`),
        axiosPrivate.get(`/admin/social/likes?postId=${postId}`),
        axiosPrivate.get(`/admin/social/comments?postId=${postId}`)
      ]);

      const postData = postRes.data?.data || postRes.data;
      if (postData) {
        setPost(postData);
        setLikes(postData.likesList || likesRes.data?.data || []);
        setComments(postData.commentsList || commentsRes.data?.data || []);
        setReports(postData.reportsList || []);
      }
    } catch (err) {
      console.error('Failed to load post drawer details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && postId) {
      fetchDetails();
    } else {
      setPost(null);
      setLikes([]);
      setComments([]);
      setReports([]);
      setActiveTab('overview');
    }
  }, [isOpen, postId]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleCopyLink = () => {
    if (!postId) return;
    const shareUrl = `${window.location.origin}/member/social/${postId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    showToast('Post link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Moderation Actions
  const handleToggleSoftDelete = async () => {
    if (!post) return;
    try {
      setActionLoading(true);
      if (post.isDeleted) {
        await axiosPrivate.post(`/admin/social/posts/${post._id}/restore`);
        showToast('Post restored successfully');
      } else {
        await axiosPrivate.delete(`/admin/social/posts/${post._id}`);
        showToast('Post soft-deleted successfully');
      }
      await fetchDetails();
      if (onPostUpdated) onPostUpdated();
    } catch (err) {
      alert('Failed to update post deletion status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePin = async () => {
    if (!post) return;
    try {
      setActionLoading(true);
      const res = await axiosPrivate.post(`/admin/social/posts/${post._id}/pin`);
      if (res.data.success || res.data.status === 'success') {
        const updated = res.data.data || post;
        setPost(prev => ({ ...prev, isPinned: !prev.isPinned }));
        showToast(updated.isPinned ? 'Post pinned to top' : 'Post unpinned');
        if (onPostUpdated) onPostUpdated();
      }
    } catch (err) {
      alert('Failed to toggle pin state');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleHide = async () => {
    if (!post) return;
    try {
      setActionLoading(true);
      const res = await axiosPrivate.post(`/admin/social/posts/${post._id}/hide`);
      if (res.data.success || res.data.status === 'success') {
        const updatedStatus = post.status === 'archived' ? 'published' : 'archived';
        setPost(prev => ({ ...prev, status: updatedStatus }));
        showToast(`Post status updated to ${updatedStatus}`);
        if (onPostUpdated) onPostUpdated();
      }
    } catch (err) {
      alert('Failed to toggle post visibility');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await axiosPrivate.delete(`/admin/social/comments/${commentId}`);
      showToast('Comment deleted');
      await fetchDetails();
      if (onPostUpdated) onPostUpdated();
    } catch (err) {
      alert('Failed to delete comment');
    }
  };

  if (!isOpen) return null;

  const author = post?.author || post?.userId || post?.authorId;
  const stats = post?.stats || {
    likesCount: post?.likesCount || likes.length || 0,
    commentsCount: post?.commentsCount || comments.length || 0,
    sharesCount: post?.sharesCount || 0,
    savedCount: post?.savedCount || 0,
    viewsCount: post?.viewsCount || 0
  };

  const mediaList = (post?.media && post.media.length > 0) 
    ? post.media 
    : (post?.images && post.images.length > 0) 
      ? post.images.map(url => ({ type: 'image', url })) 
      : [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm transition-opacity">
      
      {/* Lightbox Modal for Full Media Preview */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedMedia(null)}>
          <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
          {selectedMedia.type === 'video' ? (
            <video src={selectedMedia.url} controls className="max-h-[85vh] max-w-[90vw] rounded-lg" autoPlay />
          ) : (
            <img src={selectedMedia.url} alt="Post media preview" className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg" />
          )}
        </div>
      )}

      {/* Centered Post Details Modal */}
      <div className="w-full max-w-4xl h-[calc(100dvh-1.5rem)] sm:h-[92vh] max-h-[900px] min-h-0 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Drawer Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50 shrink-0">
          <div className="flex items-center space-x-3">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Post Moderation & Details
            </h2>
            {post && (
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider ${
                post.isDeleted 
                  ? 'bg-rose-100 text-rose-700' 
                  : post.status === 'archived' 
                    ? 'bg-amber-100 text-amber-700' 
                    : 'bg-emerald-100 text-emerald-700'
              }`}>
                {post.isDeleted ? 'Deleted' : post.status === 'archived' ? 'Archived' : 'Active'}
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold text-center animate-fade-in">
            {toastMsg}
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-xs font-semibold text-slate-500">Loading complete post information...</p>
          </div>
        ) : !post ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
            <ShieldAlert className="w-12 h-12 mb-2 stroke-[1.5] text-amber-500" />
            <p className="text-sm font-bold text-slate-700">Post Information Unavailable</p>
            <p className="text-xs text-slate-400 mt-1">The requested post could not be retrieved from database.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            
            {/* Author Profile Banner */}
            <div className="p-6 border-b border-slate-100 bg-white space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3.5">
                  {author?.avatar ? (
                    <img 
                      src={author.avatar} 
                      alt={author.name} 
                      className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-extrabold text-base shadow-sm">
                      {author?.name ? author.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                      {author?.name || 'Unknown Member'}
                      {author?.role && (
                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-indigo-50 text-indigo-700 rounded-md">
                          {author.role}
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mt-0.5">
                      {author?.email && <span>{author.email}</span>}
                      {author?.phone && <span>• {author.phone}</span>}
                    </div>
                  </div>
                </div>

                <span className={`px-3 py-1 text-xs font-extrabold rounded-xl uppercase tracking-wider ${
                  post.feedType === 'community' 
                    ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                }`}>
                  {post.feedType === 'community' ? '👥 Community Feed' : '📍 City Feed'}
                </span>
              </div>

              {/* Location & Metadata Badges */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs text-slate-600 font-semibold">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-indigo-500" />
                  <span>
                    City: <strong className="text-slate-800">{post.resolvedCity || author?.city || 'Indore'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-500" />
                  <span>
                    Community: <strong className="text-slate-800">{post.communityId?.name || author?.community || 'Agrawal Samaj'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>Created: {new Date(post.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>

            {/* Engagement Tabs Navigation */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-4 text-xs font-extrabold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'overview' 
                    ? 'border-indigo-600 text-indigo-600 bg-white' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                Overview & Content
              </button>
              <button
                onClick={() => setActiveTab('likes')}
                className={`py-3 px-4 text-xs font-extrabold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'likes' 
                    ? 'border-indigo-600 text-indigo-600 bg-white' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Heart className="w-4 h-4 text-rose-500" />
                Liked By ({stats.likesCount})
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`py-3 px-4 text-xs font-extrabold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'comments' 
                    ? 'border-indigo-600 text-indigo-600 bg-white' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageCircle className="w-4 h-4 text-indigo-500" />
                Comments ({stats.commentsCount})
              </button>
              {reports.length > 0 && (
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`py-3 px-4 text-xs font-extrabold border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === 'reports' 
                      ? 'border-indigo-600 text-indigo-600 bg-white' 
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  Audit ({reports.length})
                </button>
              )}
            </div>

            {/* TAB CONTENTS */}
            <div className="p-6">
              
              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  
                  {/* Category & Status */}
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 text-xs font-extrabold bg-indigo-50 text-indigo-600 rounded-lg">
                      Category: {post.category || 'Notice'}
                    </span>
                    {post.updatedAt && (
                      <span className="text-[11px] font-semibold text-slate-400">
                        Updated: {new Date(post.updatedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {/* Post Full Content */}
                  <div>
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Post Content</h4>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                      {post.content}
                    </div>
                  </div>

                  {/* Media Gallery Grid */}
                  {mediaList.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-indigo-500" />
                        Attached Media ({mediaList.length})
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {mediaList.map((m, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => setSelectedMedia(m)}
                            className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 cursor-pointer aspect-video shadow-sm"
                          >
                            {m.type === 'video' ? (
                              <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white">
                                <Video className="w-8 h-8" />
                              </div>
                            ) : (
                              <img 
                                src={m.url} 
                                alt={`Attachment ${idx + 1}`} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                              Click to expand
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Engagement Statistics Bar */}
                  <div>
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Live Engagement Stats</h4>
                    <div className="grid grid-cols-5 gap-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                      <div>
                        <p className="text-base font-extrabold text-rose-600 flex items-center justify-center gap-1">
                          <Heart size={14} className="fill-rose-500" /> {stats.likesCount}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Likes</p>
                      </div>
                      <div>
                        <p className="text-base font-extrabold text-indigo-600 flex items-center justify-center gap-1">
                          <MessageCircle size={14} /> {stats.commentsCount}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Comments</p>
                      </div>
                      <div>
                        <p className="text-base font-extrabold text-purple-600 flex items-center justify-center gap-1">
                          <Share2 size={14} /> {stats.sharesCount}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Shares</p>
                      </div>
                      <div>
                        <p className="text-base font-extrabold text-amber-600 flex items-center justify-center gap-1">
                          <Bookmark size={14} /> {stats.savedCount}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Saves</p>
                      </div>
                      <div>
                        <p className="text-base font-extrabold text-emerald-600 flex items-center justify-center gap-1">
                          <Eye size={14} /> {stats.viewsCount}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Views</p>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* LIKES TAB */}
              {activeTab === 'likes' && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">
                    Members who liked this post ({likes.length})
                  </h4>

                  {likes.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                      <Heart className="w-8 h-8 mx-auto mb-2 opacity-30 text-rose-500" />
                      No likes recorded for this post yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {likes.map((like, idx) => {
                        const lUser = like.user || like.userId;
                        return (
                          <div key={like._id || idx} className="py-3 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {lUser?.avatar ? (
                                <img src={lUser.avatar} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 font-extrabold flex items-center justify-center text-xs border border-rose-100">
                                  {lUser?.name ? lUser.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-bold text-slate-900">{lUser?.name || 'Member'}</p>
                                <p className="text-[10px] text-slate-400 font-semibold">
                                  {lUser?.city || 'Indore'} • {lUser?.community || 'Samaj Member'}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">
                              {like.createdAt ? new Date(like.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* COMMENTS TAB */}
              {activeTab === 'comments' && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">
                    Comments & Replies ({comments.length})
                  </h4>

                  {comments.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30 text-indigo-500" />
                      No comments recorded for this post yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((c) => {
                        const cUser = c.user || c.userId;
                        return (
                          <div key={c._id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2.5">
                                {cUser?.avatar ? (
                                  <img src={cUser.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                                    {cUser?.name ? cUser.name.charAt(0).toUpperCase() : 'U'}
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs font-bold text-slate-900">{cUser?.name || 'Member'}</p>
                                  <p className="text-[10px] text-slate-400 font-semibold">
                                    {new Date(c.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteComment(c._id)}
                                className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete comment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="mt-2 text-xs text-slate-700 leading-relaxed font-semibold pl-10">
                              {c.text}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* REPORTS / AUDIT TAB */}
              {activeTab === 'reports' && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">
                    Audit Log & Activity History ({reports.length})
                  </h4>

                  <div className="space-y-2.5">
                    {reports.map((rep, idx) => (
                      <div key={rep._id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-800">{rep.action || 'Moderation Action'}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{rep.details || 'Post activity logged'}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold">{new Date(rep.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Drawer Footer Moderation Bar */}
        {post && (
          <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleTogglePin}
                disabled={actionLoading}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  post.isPinned 
                    ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Pin className="w-3.5 h-3.5" />
                {post.isPinned ? 'Unpin' : 'Pin'}
              </button>

              <button
                onClick={handleToggleHide}
                disabled={actionLoading}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  post.status === 'archived'
                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {post.status === 'archived' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {post.status === 'archived' ? 'Unhide' : 'Hide'}
              </button>

              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-1.5"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                {copiedLink ? 'Copied' : 'Share Link'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {post.isDeleted ? (
                <button
                  onClick={handleToggleSoftDelete}
                  disabled={actionLoading}
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore
                </button>
              ) : (
                <button
                  onClick={handleToggleSoftDelete}
                  disabled={actionLoading}
                  className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PostDetailDrawer;
