import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, MessageCircle, Share2, MoreHorizontal, PlusCircle, Image as ImageIcon, Send, Search, Bell, Radio, Clock, Camera, Video, Calendar, Eye, Heart, Bookmark, Award, Sparkles, Smile, Phone, MapPin, Check, Gift, X, SlidersHorizontal, User, Settings, LogOut, Megaphone, HeartHandshake, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar } from '../../components/common/Avatar';
import { useData } from '../../context/DataProvider';
import { PostSkeleton } from '../../components/common/Skeleton';
import { StoryViewer } from '../../components/common/StoryViewer';
import { useDraggableScroll } from '../../../../hooks/useDraggableScroll';
import socialService from '../../../../core/api/socialService';

// Local translation dictionary for Feed Redesign
const localT = {
  en: {
    welcome: "Namaste",
    subGreeting: "Have a wonderful day!",
    all: "All",
    Normal: "Normal",
    Announcement: "Announcement",
    Event: "Event",
    "Blood Donation": "Blood Donation",
    Emergency: "Emergency",
    writeSomething: "Write Post",
    photo: "Add Photo",
    video: "Post Video",
    eventQuick: "Create Event",
    verifiedMember: "Verified Member",
    likes: "likes",
    comments: "comments",
    like: "Like",
    save: "Save",
    comment: "Comment",
    share: "Share",
    views: "views",
    date: "Date",
    time: "Time",
    venue: "Venue",
    contact: "Contact",
    searchPlaceholder: "Search posts...",
    shareUpdate: "Share an update or photo with the community..."
  },
  hi: {
    welcome: "Welcome",
    subGreeting: "Have a wonderful day!",
    all: "All",
    Normal: "Normal",
    Announcement: "Announcement",
    Event: "Event",
    "Blood Donation": "Blood Donation",
    Emergency: "Emergency",
    writeSomething: "Write Post",
    photo: "Add Photo",
    video: "Post Video",
    eventQuick: "Create Event",
    verifiedMember: "Verified Member",
    likes: "likes",
    comments: "comments",
    like: "Like",
    save: "Save",
    comment: "Comment",
    share: "Share",
    views: "views",
    date: "Date",
    time: "Time",
    venue: "Venue",
    contact: "Contact",
    searchPlaceholder: "Search posts...",
    shareUpdate: "Share an update or photo with the community..."
  }
};

const categoryPills = [
  { id: 'all', key: 'all' },
  { id: 'Normal', key: 'Normal' },
  { id: 'Announcement', key: 'Announcement' },
  { id: 'Event', key: 'Event' },
  { id: 'Blood Donation', key: 'Blood Donation' },
  { id: 'Emergency', key: 'Emergency' }
];

const categoryIcons = {
  all: Sparkles,
  Normal: Radio,
  Announcement: Megaphone,
  Event: Calendar,
  "Blood Donation": HeartHandshake,
  Emergency: AlertCircle
};

const getCategoryStyles = (category, lang) => {
  const mapping = {
    Normal: {
      label: localT[lang].Normal,
      bg: 'bg-slate-50/70 border-slate-100/50',
      text: 'text-slate-700',
      accent: 'border-slate-300',
      badge: 'bg-slate-500 text-white'
    },
    Announcement: {
      label: localT[lang].Announcement,
      bg: 'bg-purple-50/70 border-purple-100/50',
      text: 'text-purple-700',
      accent: 'border-purple-500',
      badge: 'bg-purple-600 text-white'
    },
    Event: {
      label: localT[lang].Event,
      bg: 'bg-blue-50/70 border-blue-100/50',
      text: 'text-blue-700',
      accent: 'border-blue-500',
      badge: 'bg-blue-500 text-white'
    },
    "Blood Donation": {
      label: localT[lang]["Blood Donation"],
      bg: 'bg-rose-50/70 border-rose-100/50',
      text: 'text-rose-700',
      accent: 'border-rose-500',
      badge: 'bg-rose-500 text-white animate-pulse'
    },
    Emergency: {
      label: localT[lang].Emergency,
      bg: 'bg-red-100 border-red-200',
      text: 'text-red-700 font-extrabold',
      accent: 'border-red-600',
      badge: 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]'
    }
  };
  return mapping[category] || {
    label: category,
    bg: 'bg-gray-50 border-gray-100/50',
    text: 'text-gray-700',
    accent: 'border-gray-300',
    badge: 'bg-gray-500 text-white'
  };
};

const extractYouTubeVideoId = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  
  // Universal regex covering watch?v=, youtu.be/, shorts/, live/, embed/, m.youtube.com
  const regExp = /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);
  if (match && match[1]) {
    return match[1];
  }

  try {
    const fullUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const parsed = new URL(fullUrl);
    if (parsed.searchParams.has('v')) {
      return parsed.searchParams.get('v');
    }
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    if (parsed.hostname.includes('youtu.be') && pathParts.length > 0) {
      return pathParts[0];
    }
    if (['shorts', 'live', 'embed', 'v'].includes(pathParts[0]) && pathParts.length > 1) {
      return pathParts[1];
    }
  } catch (e) {}

  return '';
};

const AutoPauseVideo = ({ src, isSingle = true, onClick }) => {
  const videoRef = React.useRef(null);
  const containerRef = React.useRef(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    const containerEl = containerRef.current;
    if (!videoEl || !containerEl) return;

    // Automatically pause video when scrolled out of viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.15) {
            if (!videoEl.paused) {
              videoEl.pause();
            }
          }
        });
      },
      {
        threshold: [0, 0.15, 0.5, 0.8, 1.0],
        rootMargin: '0px'
      }
    );

    observer.observe(containerEl);

    const handleVisibilityChange = () => {
      if (document.hidden && !videoEl.paused) {
        videoEl.pause();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={isSingle ? "w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center relative my-0.5" : "w-full h-full bg-black flex items-center justify-center relative"}
      onClick={onClick}
    >
      <video 
        ref={videoRef}
        src={src} 
        controls 
        playsInline
        webkit-playsinline="true"
        preload="metadata"
        className={isSingle ? "w-full max-h-[600px] object-contain rounded-2xl block mx-auto" : "w-full h-full object-cover"} 
      />
    </div>
  );
};

const AutoPauseYouTube = ({ embedUrl }) => {
  const containerRef = React.useRef(null);
  const iframeRef = React.useRef(null);

  useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.15) {
            try {
              if (iframeRef.current?.contentWindow) {
                iframeRef.current.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
              }
            } catch (e) {}
          }
        });
      },
      { threshold: [0, 0.15, 0.5, 1.0] }
    );

    observer.observe(containerEl);
    return () => observer.disconnect();
  }, []);

  const finalEmbedUrl = embedUrl.includes('?') 
    ? `${embedUrl}&enablejsapi=1` 
    : `${embedUrl}?enablejsapi=1`;

  return (
    <div ref={containerRef} className="w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-md relative" onClick={(e) => e.stopPropagation()}>
      <iframe 
        ref={iframeRef}
        src={finalEmbedUrl} 
        className="w-full h-full border-0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen 
        title="YouTube Video" 
      />
    </div>
  );
};

export const RenderMedia = ({ url, isSingle = false, onClick }) => {
  const placeholders = {
    women_workshop_1: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800',
    women_workshop_2: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=600',
    women_workshop_3: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600',
    youth_cricket: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800',
    youth_chess: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600'
  };

  let cleanUrl = placeholders[url] || url || '';
  if (!cleanUrl) return null;

  const lowercase = cleanUrl.toLowerCase();

  const isVideo = 
    lowercase.endsWith('.mp4') || 
    lowercase.endsWith('.webm') || 
    lowercase.endsWith('.ogg') || 
    lowercase.endsWith('.mov') || 
    lowercase.includes('video') || 
    lowercase.startsWith('data:video') ||
    lowercase.includes('/video/');

  const isYoutube = lowercase.includes('youtube.com') || lowercase.includes('youtu.be') || Boolean(extractYouTubeVideoId(cleanUrl));
  const isInstagram = lowercase.includes('instagram.com');

  if (isYoutube) {
    const videoId = extractYouTubeVideoId(cleanUrl);
    const embedUrl = videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1` : '';
    return embedUrl ? (
      <AutoPauseYouTube embedUrl={embedUrl} />
    ) : (
      <a 
        href={cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="w-full p-4 bg-slate-900 flex flex-col items-center justify-center text-center border border-slate-800 rounded-2xl text-slate-300 hover:bg-slate-800 transition-colors"
      >
        <span className="text-xs font-black text-rose-500 flex items-center gap-1.5 mb-1">
          ▶ Watch on YouTube
        </span>
        <span className="text-[11px] text-slate-400 truncate max-w-full underline">{cleanUrl}</span>
      </a>
    );
  }

  if (isInstagram) {
    return (
      <div className="w-full h-36 bg-[#121212] flex flex-col items-center justify-center p-3 text-center border border-slate-800 rounded-2xl" onClick={onClick}>
        <span className="text-[12px] font-bold text-pink-500">Instagram Embed</span>
        <span className="text-[9px] text-slate-500 truncate max-w-full mt-1">{cleanUrl}</span>
      </div>
    );
  }

  if (isVideo) {
    return (
      <AutoPauseVideo src={cleanUrl} isSingle={isSingle} onClick={onClick} />
    );
  }

  return (
    <div className={isSingle ? "w-full rounded-2xl overflow-hidden" : "w-full h-full bg-slate-100 flex items-center justify-center"}>
      <img 
        src={cleanUrl} 
        alt="Post Attachment" 
        loading="lazy"
        decoding="async"
        className={isSingle ? "w-full h-auto max-h-[850px] object-cover rounded-2xl block cursor-pointer hover:scale-[1.005] transition-transform duration-300" : "w-full h-full object-cover cursor-pointer"} 
        onClick={onClick} 
      />
    </div>
  );
};

const MultiImageGrid = ({ images, onClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = React.useRef(null);

  if (!images || images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="w-full mb-3 rounded-2xl overflow-hidden bg-slate-950/5 flex items-center justify-center">
        <RenderMedia url={images[0]} onClick={onClick} isSingle={true} />
      </div>
    );
  }

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollPosition = scrollRef.current.scrollLeft;
    const width = scrollRef.current.offsetWidth;
    const newIndex = Math.round(scrollPosition / width);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < images.length) {
      setCurrentIndex(newIndex);
    }
  };

  const scrollToImage = (index) => {
    if (!scrollRef.current) return;
    const width = scrollRef.current.offsetWidth;
    scrollRef.current.scrollTo({
      left: width * index,
      behavior: 'smooth'
    });
    setCurrentIndex(index);
  };

  const handleTouchStart = (e) => {
    e.stopPropagation();
  };

  const handleTouchMove = (e) => {
    e.stopPropagation();
  };

  const handleTouchEnd = (e) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="relative w-full mb-3 rounded-2xl overflow-hidden bg-slate-950/5 group border border-slate-100/80 shadow-xs select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      data-swipe-block="true"
    >
      {/* Top Right Counter Badge (Instagram Style: e.g. 1/3) */}
      <div className="absolute top-3 right-3 z-20 bg-slate-900/75 backdrop-blur-md text-white text-[10.5px] font-extrabold px-2.5 py-1 rounded-full shadow-md pointer-events-none tracking-wider flex items-center gap-1 border border-white/10">
        <span>{currentIndex + 1}</span>
        <span className="text-white/60">/</span>
        <span>{images.length}</span>
      </div>

      {/* Horizontal Swipeable Container */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide select-none"
        style={{ scrollSnapType: 'x mandatory', touchAction: 'pan-x' }}
      >
        {images.map((imgUrl, idx) => (
          <div 
            key={idx} 
            className="w-full shrink-0 snap-center snap-always flex items-center justify-center min-h-[250px] max-h-[500px] overflow-hidden"
          >
            <RenderMedia url={imgUrl} onClick={onClick} isSingle={false} />
          </div>
        ))}
      </div>

      {/* Left Navigation Arrow */}
      {currentIndex > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            scrollToImage(currentIndex - 1);
          }}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md backdrop-blur-xs flex items-center justify-center transition-all opacity-90 hover:opacity-100 hover:scale-105 active:scale-95 border border-slate-200/50"
          aria-label="Previous image"
        >
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>
      )}

      {/* Right Navigation Arrow */}
      {currentIndex < images.length - 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            scrollToImage(currentIndex + 1);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md backdrop-blur-xs flex items-center justify-center transition-all opacity-90 hover:opacity-100 hover:scale-105 active:scale-95 border border-slate-200/50"
          aria-label="Next image"
        >
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>
      )}

      {/* Bottom Pagination Dots */}
      <div className="absolute bottom-3 left-0 right-0 z-20 flex items-center justify-center gap-1.5 pointer-events-none">
        {images.map((_, idx) => (
          <span
            key={idx}
            className={`transition-all duration-300 rounded-full shadow-xs ${
              idx === currentIndex
                ? 'w-2.5 h-2.5 bg-blue-500 ring-2 ring-white/80 scale-110'
                : 'w-1.5 h-1.5 bg-white/80 backdrop-blur-xs'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

const PostCard = ({ post, index, lang, onShareClick, onPostUpdated, onPostDeleted }) => {
  const navigate = useNavigate();
  const { togglePostLike, togglePostSave, members, admins, currentUser } = useData();
  const styles = getCategoryStyles(post.category, lang);
  const [doubleHeart, setDoubleHeart] = useState(false);

  // Action Menu & Edit / Delete States
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || '');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAuthor = (post.authorId || post.userId || post.author?.id) === currentUser?._id || post.author?.name === currentUser?.name;
  const isAdmin = ['admin', 'super_admin', 'master_admin', 'master'].includes(currentUser?.role);
  const isHead = currentUser?.role === 'head' && (currentUser?.communityId === post.communityId || currentUser?.community === post.community);
  const canDelete = isAuthor || isHead || isAdmin;
  const canEdit = isAuthor;

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setIsSavingEdit(true);
    try {
      const postId = post.id || post._id;
      const res = await socialService.updatePost(postId, { content: editContent.trim() });
      if (res && res.success) {
        setIsEditing(false);
        if (onPostUpdated) onPostUpdated(res.data);
      }
    } catch (err) {
      console.error('Failed to update post:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const postId = post.id || post._id;
      const res = await socialService.deletePost(postId);
      if (res && res.success) {
        setShowDeleteConfirm(false);
        if (onPostDeleted) onPostDeleted(postId);
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const matchedMember = members.find(m => m.name === post.author.name) || admins.find(a => a.name === post.author.name);

  const handleAuthorClick = () => {
    if (matchedMember) {
      navigate(`/member/directory/${matchedMember.id}`);
    }
  };

  const handleDoubleTap = (e) => {
    if (e.detail === 2) {
      if (!post.isLiked) {
        togglePostLike(post.id);
      }
      setDoubleHeart(true);
      setTimeout(() => setDoubleHeart(false), 800);
    }
  };

  const imagePlaceholders = {
    ganesh_celebration: 'https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?w=800',
    blood_donation_banner: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800',
    rohit_upsc_success: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
    rakesh_digital_services: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
    health_camp_event: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800',
    matrimonial_meetup: 'https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?w=800'
  };

  const getSingleImageUrl = (img) => imagePlaceholders[img] || img;

  return (
    <div 
      className="bg-white border-b border-slate-150/60 transition-all duration-300 relative overflow-hidden"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Edit Post Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-black text-slate-900">✏️ Edit Post</h3>
            <textarea
              rows={4}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
              placeholder="Edit post text..."
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit || !editContent.trim()}
                className="px-4 py-2 bg-purple-700 text-white rounded-xl text-xs font-bold hover:bg-purple-800 disabled:opacity-50"
              >
                {isSavingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Post Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-base font-black text-slate-900">Delete Post?</h3>
            <p className="text-xs text-slate-500 font-medium">Are you sure you want to remove this post? This action will remove it from all feeds.</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Author Header */}
      <div className="flex items-center justify-between px-3 pt-4.5 pb-3">
        <div 
          onClick={handleAuthorClick}
          className={`flex items-center gap-3 ${matchedMember ? 'cursor-pointer group' : ''}`}
        >
          <Avatar initials={post.author.initials} size="md" color="bg-indigo-50 text-indigo-700" />
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-[15px] font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">{post.author.name}</h4>
              {post.author.isVerified && (
                <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold bg-[#8B5CF6]/8 text-[#7C3AED] px-2 py-0.5 rounded-full select-none">
                  <Check size={9} strokeWidth={4} /> {localT[lang].verifiedMember}
                </span>
              )}
            </div>
            <p className="text-[12px] text-slate-400 font-semibold mt-1 flex items-center gap-1.5">
              <span className="text-blue-500 font-bold">{post.community}</span>
              <span className="text-slate-350">•</span>
              <span>{post.timestamp}</span>
              {post.isEdited && (
                <span className="text-[10px] text-slate-400 font-bold italic ml-1">(edited)</span>
              )}
            </p>
          </div>
        </div>
        
        {/* Action Dropdown & Category Badge on right */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end gap-1.5">
            <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-sm/5 ${styles.badge}`}>
              {styles.label}
            </span>
            {post.isPinned && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                <AlertCircle size={10} /> PINNED
              </span>
            )}
          </div>

          {/* Three-Dot Menu Options */}
          {(canEdit || canDelete) && (
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <MoreHorizontal size={18} />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-8 z-30 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 w-36 overflow-hidden animate-fade-in">
                  {canEdit && (
                    <button
                      onClick={() => { setShowMenu(false); setIsEditing(true); }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2"
                    >
                      ✏️ Edit Post
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                    >
                      🗑️ Delete Post
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Title & Content */}
      <div className="px-3 pb-3">
        {post.title && (
          <h3 className="text-[16px] font-extrabold text-slate-900 mb-1.5 leading-snug tracking-tight">{post.title}</h3>
        )}
        <p className="text-[13.5px] text-slate-600 leading-relaxed font-medium">
          {post.content && post.content.length > 260 ? (
            <span>
              {post.content.slice(0, 260).trim().replace(/[\r\n]+/g, ' ')}
              <span className="text-slate-400 font-bold ml-1">... </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/member/social/${post.id || post._id}`);
                }}
                className="inline text-blue-600 hover:text-blue-700 font-extrabold text-[13px] ml-1 cursor-pointer hover:underline"
              >
                See all
              </button>
            </span>
          ) : (
            <span className="whitespace-pre-wrap">{post.content}</span>
          )}
        </p>
      </div>

      {/* Event Details Grid (Conditional) */}
      {post.category === 'Event' && post.eventDetails && (
        <div className="mx-3 mb-3.5 p-4 rounded-2xl bg-blue-50/40 border border-blue-100/30">
          <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-[12px]">
            <div>
              <span className="font-extrabold text-blue-600 block">{localT[lang].date}</span>
              <span className="font-semibold text-slate-700 mt-0.5 block">{post.eventDetails.date}</span>
            </div>
            <div>
              <span className="font-extrabold text-blue-600 block">{localT[lang].time}</span>
              <span className="font-semibold text-slate-700 mt-0.5 block">{post.eventDetails.time}</span>
            </div>
            <div className="col-span-2">
              <span className="font-extrabold text-blue-600 block">{localT[lang].venue}</span>
              <span className="font-semibold text-slate-700 mt-0.5 block">{post.eventDetails.location}</span>
            </div>
            {post.eventDetails.contact && (
              <div className="col-span-2 pt-1.5 border-t border-blue-100/40 flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-blue-600 block">{localT[lang].contact}</span>
                  <span className="font-semibold text-slate-700 block mt-0.5">{post.eventDetails.contact}</span>
                </div>
                <a 
                  href={`tel:${post.eventDetails.contact.match(/\d+/)?.[0] || ''}`}
                  className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-transform"
                >
                  <Phone size={14} />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Post Media - Single Image / Gallery Collage / Auto-detected YouTube */}
      <div onClick={handleDoubleTap} className="relative select-none">
        {post.images && post.images.length > 0 ? (
          <div className="px-0">
            <MultiImageGrid images={post.images} onClick={() => navigate(`/member/social/${post.id}`)} />
          </div>
        ) : post.image ? (
          <div className="mb-3 bg-slate-950/5 flex items-center justify-center cursor-pointer overflow-hidden relative rounded-2xl" onClick={() => navigate(`/member/social/${post.id}`)}>
            <RenderMedia url={post.image} onClick={() => navigate(`/member/social/${post.id}`)} isSingle={true} />
          </div>
        ) : (() => {
          const match = post.content?.match(/(https?:\/\/[^\s]+)/g);
          if (match) {
            for (const u of match) {
              if (extractYouTubeVideoId(u)) {
                return (
                  <div className="mb-3 bg-slate-950/5 flex items-center justify-center overflow-hidden relative rounded-2xl">
                    <RenderMedia url={u} onClick={() => navigate(`/member/social/${post.id}`)} isSingle={true} />
                  </div>
                );
              }
            }
          }
          return null;
        })()}

        {/* Double Tap Heart Animation */}
        <AnimatePresence>
          {doubleHeart && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1.3 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            >
              <Heart size={70} className="text-red-500 fill-red-500 drop-shadow-lg" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stats (Likes, Comments & Views) */}
      <div className="px-3 pb-3 flex items-center justify-between text-[11.5px] font-bold text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center -space-x-1">
            <span className="w-5.5 h-5.5 rounded-full bg-red-50 flex items-center justify-center border-2 border-white shadow-sm">
              <Heart size={9} className="text-red-500 fill-red-500" />
            </span>
            <span className="w-5.5 h-5.5 rounded-full bg-blue-50 flex items-center justify-center border-2 border-white shadow-sm">
              <ThumbsUp size={9} className="text-blue-500 fill-blue-500" />
            </span>
          </span>
          <span className="text-slate-500 font-semibold">{post.likes} {localT[lang].likes}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-500 font-semibold">
            {post.commentsList ? post.commentsList.length : (post.comments || 0)} {localT[lang].comments}
          </span>
          <span className="flex items-center gap-1 font-semibold text-slate-450">
            <Eye size={13} className="text-slate-350" />
            {post.views ? `${post.views >= 1000 ? (post.views / 1000).toFixed(1) + 'K' : post.views} ${localT[lang].views}` : `0 ${localT[lang].views}`}
          </span>
        </div>
      </div>

      {/* Action Triggers Row */}
      <div className="flex items-center justify-evenly py-1.5 border-t border-slate-100 bg-slate-50/20">
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={(e) => { e.stopPropagation(); togglePostLike(post.id); }}
          className={`flex items-center justify-center gap-1.5 px-2 py-2 text-[13.5px] font-bold transition-all rounded-xl hover:bg-slate-100/50 ${post.isLiked ? 'text-red-500' : 'text-slate-500 hover:text-red-500'}`}
        >
          <Heart size={18} className={post.isLiked ? 'fill-red-500 text-red-500' : ''} /> 
          {localT[lang].like}
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={(e) => { e.stopPropagation(); navigate(`/member/social/${post.id}`); }}
          className="flex items-center justify-center gap-1.5 px-2 py-2 text-[13.5px] font-bold text-slate-500 hover:text-[#1877F2] hover:bg-slate-100/50 rounded-xl transition-all"
        >
          <MessageCircle size={18} /> 
          {localT[lang].comment}
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={(e) => { e.stopPropagation(); onShareClick(post); }}
          className="flex items-center justify-center gap-1.5 px-2 py-2 text-[13.5px] font-bold text-slate-500 hover:text-emerald-600 hover:bg-slate-100/50 rounded-xl transition-all"
        >
          <Share2 size={18} />
          {localT[lang].share}
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={(e) => { e.stopPropagation(); togglePostSave(post.id); }}
          className={`flex items-center justify-center gap-1.5 px-2 py-2 text-[13.5px] font-bold transition-all rounded-xl hover:bg-slate-100/50 ${post.isSaved ? 'text-amber-500' : 'text-slate-500 hover:text-amber-500'}`}
        >
          <Bookmark size={18} className={post.isSaved ? 'fill-amber-500 text-amber-500' : ''} /> 
          {localT[lang].save}
        </motion.button>
      </div>
    </div>
  );
};

const FeedPage = ({ isHub = false, feedType = 'city', searchQuery = '', isFilterOpen: propIsFilterOpen, setIsFilterOpen: propSetIsFilterOpen }) => {
  const [localIsFilterOpen, localSetIsFilterOpen] = useState(false);
  const isFilterOpen = propIsFilterOpen !== undefined ? propIsFilterOpen : localIsFilterOpen;
  const setIsFilterOpen = propSetIsFilterOpen !== undefined ? propSetIsFilterOpen : localSetIsFilterOpen;

  const navigate = useNavigate();
  const { posts, members: mockMembers, currentUser, language, stories = [], getUnreadCountForModule, logoutUser } = useData();
  const [activeTab, setActiveTab] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('#profile-dropdown-container')) {
        setIsProfileDropdownOpen(false);
      }
    };
    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isProfileDropdownOpen]);

  useEffect(() => {
    setSearchText(searchQuery);
  }, [searchQuery]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStory, setActiveStory] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const storiesRef = useDraggableScroll();

  const lang = 'en'; // Force English for Feed Section as requested

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [activeTab]);

  useEffect(() => {
    if (isFilterOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFilterOpen]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Filter posts based on active tab, search query, and feed visibility rules
  const filteredFeedPosts = posts.filter(post => {
    const matchesCategory = activeTab === 'all' || post.category === activeTab;
    const matchesSearch = searchText.trim() === '' || 
      post.content.toLowerCase().includes(searchText.toLowerCase()) ||
      (post.title && post.title.toLowerCase().includes(searchText.toLowerCase())) ||
      post.author.name.toLowerCase().includes(searchText.toLowerCase());

    // Feed Visibility Filter
    let matchesFeedType = false;
    if (feedType === 'city') {
      matchesFeedType = post.feedType !== 'community';
    } else if (feedType === 'community') {
      matchesFeedType = post.feedType === 'community' || post.feedType === 'both';
    } else {
      matchesFeedType = true;
    }

    return matchesCategory && matchesSearch && matchesFeedType;
  }).sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0; // maintain original date-based sort for the rest
  });

  return (
    <div className="min-h-screen bg-[#F5F6FA] pb-28">
      {/* Toast Alert Popup */}
      {createPortal(
        <AnimatePresence>
          {toastMessage && (
            <motion.div 
              key="toast"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-20 left-4 right-4 z-[9999] flex justify-center pointer-events-none"
            >
              <div className="bg-slate-900/95 text-white font-semibold text-[12.5px] px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 backdrop-blur-xs pointer-events-auto">
                <Sparkles size={16} className="text-yellow-400 animate-pulse" />
                {toastMessage}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Global Header (Hide if in Hub) */}
      {!isHub && (
        <div className="bg-white sticky top-0 z-40 border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
          <div className="flex items-center justify-between px-5 h-16">
            <h1 className="text-[20px] font-black text-slate-800 tracking-tight">Social Hub</h1>
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/member/notifications?module=community')} className="relative text-slate-700 active:scale-95 transition-transform">
                <Bell size={22} />
                {getUnreadCountForModule('community') > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {getUnreadCountForModule('community')}
                  </span>
                )}
              </button>

            </div>
          </div>
        </div>
      )}
      
      <div className="px-4.5 pt-2">


        {/* ─── STORY CARDS (FACEBOOK STYLE) ─── */}
        <div className="pb-1 mb-1 mt-0">
          <div 
            ref={storiesRef} 
            className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-2 -mx-4.5 px-4.5"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            data-swipe-block="true"
          >
            {/* Create Story Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-[92px] h-[146px] rounded-xl shrink-0 cursor-pointer overflow-hidden border border-slate-200 bg-white shadow-sm flex flex-col"
              onClick={() => {
                const myStories = stories.filter(s => s.memberId === 'me');
                if (myStories.length > 0) {
                  setActiveStory(myStories[0]);
                } else {
                  navigate('/member/social/create', { state: { createStoryMode: true } });
                }
              }}
            >
              <div className="h-[65%] w-full bg-slate-100 overflow-hidden">
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt="Me" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-brand-primary/10 flex items-center justify-center text-[28px] font-black text-brand-primary">
                    {currentUser?.initials || 'ME'}
                  </div>
                )}
              </div>
              <div className="h-[35%] w-full relative flex items-end justify-center pb-2.5 bg-white">
                <div className="absolute -top-4 w-8 h-8 bg-blue-500 rounded-full border-4 border-white flex items-center justify-center shadow-sm" onClick={(e) => {
                    e.stopPropagation();
                    navigate('/member/social/create', { state: { createStoryMode: true } });
                  }}>
                  <PlusCircle size={18} className="text-white" strokeWidth={2.5} fill="currentColor" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 tracking-tight">Create story</span>
              </div>
            </motion.div>

            {/* Other User Stories */}
            {stories
              .filter(s => s.memberId !== 'me')
              .filter((story, index, self) => index === self.findIndex((t) => t.memberId === story.memberId))
              .map((story, idx) => (
              <motion.div 
                key={story.id} 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.04 }}
                className="relative w-[92px] h-[146px] rounded-xl shrink-0 cursor-pointer overflow-hidden shadow-sm animate-fade-in group"
                onClick={() => setActiveStory(story)}
              >
                <img src={story.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600'} alt="Story" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/70 pointer-events-none" />
                
                {/* User Avatar Circle */}
                <div className="absolute top-2.5 left-2.5 w-9 h-9 rounded-full p-[2px] bg-blue-500 z-10 shadow-sm">
                  <div className="w-full h-full rounded-full border-2 border-white bg-white overflow-hidden flex items-center justify-center">
                    <Avatar initials={story.initials} avatar={story.avatar} size="xs" />
                  </div>
                </div>
                
                {/* User Name */}
                <span className="absolute bottom-2.5 left-2.5 right-2 text-[11px] font-semibold text-white leading-tight drop-shadow-md z-10">
                  {story.name}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ─── POSTS FEED LIST ─── */}
        <div className="space-y-0 pb-16 -mx-4.5">
          {isLoading ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : (
            filteredFeedPosts.length > 0 ? (
              filteredFeedPosts.map((post, index) => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  index={index} 
                  lang={lang} 
                  onShareClick={(p) => {
                    // Copy mock link to clipboard & notify
                    const clientUrl = import.meta.env.VITE_CLIENT_URL || window.location.origin;
                    navigator.clipboard.writeText(`${clientUrl}/member/social/${p.id}`);
                    triggerToast("Link copied to clipboard!");
                  }}
                />
              ))
            ) : (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 text-slate-400 shadow-sm mt-4.5">
                <Radio size={40} className="mx-auto mb-2 text-slate-300" />
                <p className="text-[13.5px] font-bold">No posts found in this category.</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Floating Story Viewer Modal */}
      <StoryViewer 
        story={activeStory} 
        stories={stories}
        onStoryChange={(nextStory) => setActiveStory(nextStory)}
        onClose={() => setActiveStory(null)} 
      />

      {/* Category Filter Bottom Sheet */}
      {createPortal(
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div 
              key="filter-sheet"
              className="fixed inset-0 z-[9999] flex items-end justify-center" 
              style={{ touchAction: 'none' }} 
              onWheel={e => e.stopPropagation()} 
              onTouchMove={e => e.stopPropagation()}
            >
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsFilterOpen(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-xs"
              />
              
              {/* Sheet Container */}
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 250 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full rounded-t-[32px] max-w-md flex flex-col overflow-hidden max-h-[80vh] shadow-2xl relative z-10"
                data-swipe-block="true"
                style={{ touchAction: 'auto' }}
              >
              {/* Drag Handle Indicator */}
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 pb-4 border-b border-slate-100/60 shrink-0">
                <div>
                  <h3 className="text-[17px] font-black text-slate-800">Filter Posts</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Select Category</p>
                </div>
                <button 
                  onClick={() => setIsFilterOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center active:scale-95 transition-all text-slate-500"
                >
                  <X size={16} />
                </button>
              </div>
              
              {/* List */}
              <div className="p-5 overflow-y-auto space-y-2.5 max-h-[55vh] pb-10">
                {categoryPills.map(pill => {
                  const isActive = activeTab === pill.id;
                  const Icon = categoryIcons[pill.id];
                  const pillLabel = pill.id === 'all' ? localT[lang].all : localT[lang][pill.id];
                  const styles = getCategoryStyles(pill.id === 'all' ? '' : pill.id, lang);
                  
                  return (
                    <button
                      key={pill.id}
                      onClick={() => {
                        setActiveTab(pill.id);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full p-3.5 rounded-2xl border-2 flex items-center justify-between transition-all active:scale-[0.99] ${
                        isActive 
                          ? 'bg-brand-primary/5 border-brand-primary' 
                          : 'bg-white border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isActive ? 'bg-brand-primary text-white' : `${styles.bg} ${styles.text}`
                        }`}>
                          {Icon && <Icon size={18} />}
                        </div>
                        <span className={`text-[14px] font-extrabold ${
                          isActive ? 'text-brand-primary' : 'text-slate-700'
                        }`}>
                          {pillLabel}
                        </span>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isActive ? 'border-brand-primary bg-brand-primary text-white' : 'border-slate-250 bg-white'
                      }`}>
                        {isActive && <Check size={11} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default FeedPage;
