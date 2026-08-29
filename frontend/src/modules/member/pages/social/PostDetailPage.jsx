import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, Share2, MoreHorizontal, Send, ArrowLeft, Check, Camera, Smile, ThumbsUp, Calendar, Phone, Eye, MessageCircle, ChevronDown, Clock, X, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';

const InstagramIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    width={props.size || "24"}
    height={props.size || "24"}
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);
import { Avatar } from '../../components/common/Avatar';
import { useData } from '../../context/DataProvider';
import socialService from '../../../../core/api/socialService';

const categoryColors = {
  Notice: 'text-emerald-700 bg-emerald-500 border-emerald-500',
  Event: 'text-blue-700 bg-blue-500 border-blue-500',
  Matrimony: 'text-purple-700 bg-purple-500 border-purple-500',
  Business: 'text-amber-700 bg-amber-500 border-amber-500',
  Women: 'text-pink-700 bg-pink-500 border-pink-500',
  Obituary: 'text-rose-700 bg-rose-500 border-rose-500',
  Achievement: 'text-yellow-750 bg-yellow-500 border-yellow-550',
  Youth: 'text-teal-700 bg-teal-500 border-teal-500'
};

const getCategoryLabel = (category, lang) => {
  const labels = {
    hi: { Notice: 'समाज सूचना', Event: 'कार्यक्रम', Matrimony: 'विवाह', Business: 'रोजगार/बिजनेस', Women: 'महिला मंडल', Obituary: 'शोक संदेश', Achievement: 'उपलब्धि', Youth: 'युवा मंडल' },
    en: { Notice: 'Notice', Event: 'Event', Matrimony: 'Matrimony', Business: 'Business', Women: 'Women', Obituary: 'Obituary', Achievement: 'Achievement', Youth: 'Youth' }
  };
  return labels[lang]?.[category] || category;
};

const extractYouTubeVideoId = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  const regExp = /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);
  if (match && match[1]) return match[1];

  try {
    const fullUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const parsed = new URL(fullUrl);
    if (parsed.searchParams.has('v')) return parsed.searchParams.get('v');
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    if (parsed.hostname.includes('youtu.be') && pathParts.length > 0) return pathParts[0];
    if (['shorts', 'live', 'embed', 'v'].includes(pathParts[0]) && pathParts.length > 1) return pathParts[1];
  } catch (e) {}

  return '';
};

const AutoPauseVideo = ({ src, isSingle = true }) => {
  const videoRef = React.useRef(null);
  const containerRef = React.useRef(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    const containerEl = containerRef.current;
    if (!videoEl || !containerEl) return;

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
      { threshold: [0, 0.15, 0.5, 0.8, 1.0], rootMargin: '0px' }
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

const extractInstagramEmbedUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  const match = trimmed.match(/instagram\.com\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) {
    const code = match[1];
    return `https://www.instagram.com/reel/${code}/embed/`;
  }
  return '';
};

const InstagramEmbedPlayer = ({ url }) => {
  const embedUrl = extractInstagramEmbedUrl(url);
  const containerRef = React.useRef(null);
  const [isInView, setIsInView] = React.useState(true);

  useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl || !embedUrl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.15) {
            setIsInView(false);
          } else if (entry.intersectionRatio >= 0.25) {
            setIsInView(true);
          }
        });
      },
      {
        threshold: [0, 0.15, 0.25, 0.5, 1.0],
        rootMargin: '0px'
      }
    );

    observer.observe(containerEl);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsInView(false);
      } else {
        setIsInView(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [embedUrl]);

  if (!embedUrl) {
    return (
      <a 
        href={url.startsWith('http') ? url : `https://${url}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full p-4 bg-gradient-to-r from-purple-950/40 via-pink-950/30 to-slate-900 border border-pink-500/20 rounded-2xl flex items-center justify-between hover:border-pink-500/50 transition-all text-white"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow">
            <InstagramIcon size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-200">Watch on Instagram</p>
            <p className="text-[10px] text-slate-400 truncate max-w-[220px]">{url}</p>
          </div>
        </div>
        <span className="text-xs font-black text-pink-400 bg-pink-500/10 px-3 py-1.5 rounded-xl border border-pink-500/20">Open ↗</span>
      </a>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="w-full rounded-2xl overflow-hidden bg-black shadow-md relative border border-slate-800/80 my-1 min-h-[480px] flex items-center justify-center"
    >
      {isInView ? (
        <iframe
          src={embedUrl}
          className="w-full h-[480px] max-h-[75vh] border-0 rounded-2xl bg-black"
          scrolling="no"
          allowTransparency="true"
          allow="encrypted-media; picture-in-picture"
          title="Instagram Reel/Post"
        />
      ) : (
        <div className="w-full h-[480px] bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-2">
          <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-pink-500 animate-pulse">
            <InstagramIcon size={20} />
          </div>
          <span className="text-[11px] font-bold text-slate-500">Instagram Video Paused</span>
        </div>
      )}
    </div>
  );
};

const RenderMedia = ({ url, isSingle = true }) => {
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
  const isInstagram = lowercase.includes('instagram.com') || Boolean(extractInstagramEmbedUrl(cleanUrl));

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
      <InstagramEmbedPlayer url={cleanUrl} />
    );
  }

  if (isVideo) {
    return (
      <AutoPauseVideo src={cleanUrl} isSingle={isSingle} />
    );
  }

  return (
    <div className={isSingle ? "w-full rounded-2xl overflow-hidden" : "w-full h-full bg-slate-100 flex items-center justify-center"}>
      <img 
        src={cleanUrl} 
        alt="Post Attachment" 
        loading="lazy"
        decoding="async"
        className={isSingle ? "w-full h-auto max-h-[850px] object-cover rounded-2xl animate-fade-in block" : "w-full h-full object-cover"} 
      />
    </div>
  );
};

const MultiImageGrid = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = React.useRef(null);

  if (!images || images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="w-full mb-3 rounded-2xl overflow-hidden bg-slate-950/5 flex items-center justify-center">
        <RenderMedia url={images[0]} isSingle={true} />
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
      {/* Top Right Counter Badge */}
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
            className="w-full shrink-0 snap-center snap-always flex items-center justify-center min-h-[250px] max-h-[550px] overflow-hidden"
          >
            <RenderMedia url={imgUrl} isSingle={false} />
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

const PostDetailPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { posts, togglePostLike, togglePostSave, addPostComment, fetchPostComments, recordPostView, addCommentReply, toggleCommentLike, currentUser, language, members, admins } = useData();
  const [commentText, setCommentText] = useState('');
  const [activeSort, setActiveSort] = useState('newest'); // newest | oldest
  const [toastMessage, setToastMessage] = useState('');
  const [replyingToComment, setReplyingToComment] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    if (postId) {
      if (fetchPostComments) {
        fetchPostComments(postId);
      }
      if (recordPostView) {
        recordPostView(postId);
      }
    }
  }, [postId]);

  const post = posts.find((p) => p.id === postId);
  const lang = 'en'; // Force English for Feed Section as requested

  const matchedMember = members?.find(m => m.name === post?.author?.name) || admins?.find(a => a.name === post?.author?.name);

  const handleAuthorClick = () => {
    if (matchedMember) {
      navigate(`/member/directory/${matchedMember.id}`);
    }
  };

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-5 text-center">
        <X size={44} className="text-slate-350 mb-2" />
        <h2 className="text-md font-bold text-slate-700">Post not found</h2>
        <button onClick={() => navigate(-1)} className="mt-4 px-5 py-2 bg-brand-primary text-white text-[12.5px] font-bold rounded-full">Go Back</button>
      </div>
    );
  }

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleLike = () => {
    togglePostLike(post.id);
  };

  const handleSave = () => {
    togglePostSave(post.id);
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    if (replyingToComment) {
      const commentTargetId = replyingToComment.id || replyingToComment._id;
      await addCommentReply(post.id, commentTargetId, commentText.trim());
      setReplyingToComment(null);
    } else {
      await addPostComment(post.id, commentText.trim());
    }
    setCommentText('');
  };

  const getCommentAuthor = (c) => {
    if (c.author) return c.author;
    if (c.userId && typeof c.userId === 'object') {
      const name = c.userId.name || 'Member';
      return {
        name,
        avatar: c.userId.avatar,
        initials: name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
        isVerified: true
      };
    }
    return { name: 'Member', avatar: null, initials: 'M', isVerified: true };
  };

  const rawComments = post.commentsList || [];
  const sortedComments = [...rawComments].sort((a, b) => {
    const idA = String(a._id || a.id || '');
    const idB = String(b._id || b.id || '');
    if (activeSort === 'newest') return idB.localeCompare(idA);
    return idA.localeCompare(idB);
  });

  const catColor = categoryColors[post.category] || 'text-gray-700 bg-gray-500 border-gray-300';
  const colorText = catColor.split(' ')[0];
  const colorBg = catColor.split(' ')[1];
  const colorBorder = catColor.split(' ')[2];

  const imagePlaceholders = {
    ganesh_celebration: 'https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?w=800',
    blood_donation_banner: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800',
    rohit_upsc_success: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
    rakesh_digital_services: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
    health_camp_event: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800',
    matrimonial_meetup: 'https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?w=800'
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] flex flex-col relative">
      
      {/* Toast Overlay */}
      {toastMessage && (
        <div className="fixed bottom-20 left-4 right-4 z-50 flex justify-center pointer-events-none">
          <div className="bg-slate-900/95 text-white font-semibold text-[12.5px] px-5 py-3 rounded-2xl shadow-xl backdrop-blur-xs flex items-center gap-2">
            <Check size={14} className="text-green-400" />
            {toastMessage}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white px-4 h-16 flex items-center gap-3 border-b border-slate-100 shrink-0 sticky top-0 z-30 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 press-scale">
          <ArrowLeft size={22} className="text-slate-800" />
        </button>
        <h1 className="text-[15.5px] font-black text-slate-850">
          {lang === 'hi' ? 'पोस्ट विवरण' : 'Post Details'}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Post Container Card */}
        <div className="bg-white border-b border-slate-100/70 shadow-sm overflow-hidden mb-4">

          {/* Author Header */}
          <div className="flex items-center justify-between px-5 pt-4.5 pb-3">
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
                      <Check size={9} strokeWidth={4} /> Verified Member
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-slate-400 font-semibold mt-1 flex items-center gap-1.5">
                  <span className="text-blue-500 font-bold">{post.community}</span>
                  <span className="text-slate-350">•</span>
                  <span>{post.timestamp}</span>
                </p>
              </div>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-sm/5 text-white ${colorBg}`}>
              {getCategoryLabel(post.category, lang)}
            </span>
          </div>

          {/* Title & Body content */}
          <div className="px-5 pb-3">
            {post.title && (
              <h3 className="text-[16px] font-extrabold text-slate-900 mb-1.5 leading-snug tracking-tight">{post.title}</h3>
            )}
            <p className="text-[13.5px] text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">{post.content}</p>
          </div>

          {/* Event Details Table */}
          {post.category === 'Event' && post.eventDetails && (
            <div className="mx-5 mb-4 p-4 rounded-2xl bg-blue-50/40 border border-blue-100/30">
              <div className="grid grid-cols-2 gap-y-3.5 gap-x-2 text-[12px]">
                <div>
                  <span className="font-extrabold text-blue-600 block">Date</span>
                  <span className="font-semibold text-slate-700 mt-0.5 block">{post.eventDetails.date}</span>
                </div>
                <div>
                  <span className="font-extrabold text-blue-600 block">Time</span>
                  <span className="font-semibold text-slate-700 mt-0.5 block">{post.eventDetails.time}</span>
                </div>
                <div className="col-span-2">
                  <span className="font-extrabold text-blue-600 block">Venue</span>
                  <span className="font-semibold text-slate-700 mt-0.5 block">{post.eventDetails.location}</span>
                </div>
                {post.eventDetails.contact && (
                  <div className="col-span-2 pt-2 border-t border-blue-100/40 flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-blue-600 block">Contact</span>
                      <span className="font-semibold text-slate-700 block mt-0.5">{post.eventDetails.contact}</span>
                    </div>
                    <a 
                      href={`tel:${post.eventDetails.contact.match(/\d+/)?.[0] || ''}`}
                      className="w-8.5 h-8.5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-transform"
                    >
                      <Phone size={14} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Media view */}
          {post.images && post.images.length > 0 ? (
            <div className="px-5">
              <MultiImageGrid images={post.images} />
            </div>
          ) : (
            post.image && (
              <div className="mx-5 mb-3.5 bg-slate-950/5 flex items-center justify-center overflow-hidden relative rounded-2xl border border-slate-100">
                <RenderMedia url={post.image} isSingle={true} />
              </div>
            )
          )}

          {/* Interaction stats */}
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-[11.5px] font-bold text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="flex items-center -space-x-1">
                <span className="w-5.5 h-5.5 rounded-full bg-red-50 flex items-center justify-center border-2 border-white shadow-sm">
                  <Heart size={9} className="text-red-500 fill-red-500 animate-pulse" />
                </span>
                <span className="w-5.5 h-5.5 rounded-full bg-blue-50 flex items-center justify-center border-2 border-white shadow-sm">
                  <ThumbsUp size={9} className="text-blue-500 fill-blue-500" />
                </span>
              </span>
              <span className="text-slate-500 font-semibold">{post.likes} likes</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-semibold">{rawComments.length} comments</span>
              <span className="flex items-center gap-1 font-semibold text-slate-450">
                <Eye size={13} className="text-slate-350" />
                {post.views || 0} views
              </span>
            </div>
          </div>

          {/* Action triggers */}
          <div className="flex items-center justify-evenly py-1.5 border-t border-slate-100 bg-slate-50/20">
            <button 
              onClick={handleLike} 
              className={`flex items-center justify-center gap-1.5 px-3 py-2 text-[13.5px] font-bold transition-all rounded-xl hover:bg-slate-100/50 ${post.isLiked ? 'text-red-500' : 'text-slate-500 hover:text-red-500'}`}
            >
              <Heart size={18} className={post.isLiked ? 'fill-red-500 text-red-500' : ''} />
              <span>Like</span>
            </button>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                triggerToast('Link copied to clipboard!');
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-[13.5px] font-bold text-slate-500 hover:text-emerald-600 hover:bg-slate-100/50 rounded-xl transition-all"
            >
              <Share2 size={18} />
              <span>Share</span>
            </button>
            <button 
              onClick={handleSave} 
              className={`flex items-center justify-center gap-1.5 px-3 py-2 text-[13.5px] font-bold transition-all rounded-xl hover:bg-slate-100/50 ${post.isSaved ? 'text-amber-500' : 'text-slate-500 hover:text-amber-500'}`}
            >
              <Bookmark size={18} className={post.isSaved ? 'fill-amber-500 text-amber-500' : ''} />
              <span>Save</span>
            </button>
          </div>
        </div>

        {/* ─── COMMENTS LIST SECTION ─── */}
        <div className="px-4.5 pt-2 pb-16">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-wider">
              {lang === 'hi' ? `सभी कमेंट (${rawComments.length})` : `All Comments (${rawComments.length})`}
            </h3>
            
            {/* Sort toggle */}
            <div className="flex items-center gap-1 text-[12px] font-bold text-slate-400 cursor-pointer hover:text-slate-650" onClick={() => setActiveSort(activeSort === 'newest' ? 'oldest' : 'newest')}>
              <span>{activeSort === 'newest' ? (lang === 'hi' ? 'नवीनतम' : 'Newest') : (lang === 'hi' ? 'सबसे पुराना' : 'Oldest')}</span>
              <ChevronDown size={14} />
            </div>
          </div>

          <div className="space-y-4">
            {sortedComments.map((comment, i) => {
              const author = getCommentAuthor(comment);
              const commentKey = comment._id || comment.id || `c_${i}`;
              return (
                <div key={commentKey} className="flex gap-3 items-start animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                  <Avatar initials={author.initials} src={author.avatar} size="sm" color="bg-indigo-50 text-indigo-700" />
                  <div className="flex-1">
                    <div className="bg-white rounded-2xl rounded-tl-xs px-4 py-3 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <h5 className="text-[13px] font-black text-slate-800 leading-tight">{author.name}</h5>
                        {author.isVerified && (
                          <span className="w-3.5 h-3.5 rounded-full bg-brand-primary text-white flex items-center justify-center scale-70">
                            <Check size={9} strokeWidth={4} />
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-slate-655 font-medium leading-relaxed">{comment.text}</p>
                    </div>
                    
                    {/* Like / Reply / Edit / Delete Action buttons under comment */}
                    <div className="flex items-center gap-4.5 mt-1.5 px-1.5 text-[11px] font-extrabold text-slate-400">
                      <span>{comment.time || 'Just now'}</span>
                      {comment.isEdited && (
                        <span className="text-[10px] text-slate-400 font-bold italic">(edited)</span>
                      )}
                      <button 
                        onClick={() => toggleCommentLike(post.id, commentKey)}
                        className={`font-extrabold transition-colors flex items-center gap-1 cursor-pointer ${comment.isLiked ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`}
                      >
                        <ThumbsUp size={11} className={comment.isLiked ? 'fill-red-500 text-red-500' : ''} />
                        <span>{comment.likes || 0} Likes</span>
                      </button>
                      <button 
                        onClick={() => setReplyingToComment(comment)} 
                        className="hover:text-brand-primary cursor-pointer transition-colors"
                      >
                        Reply
                      </button>

                      {/* Comment Edit/Delete Actions */}
                      {((comment.userId?._id || comment.userId) === currentUser?._id || author.name === currentUser?.name) && (
                        <button
                          onClick={async () => {
                            const newText = prompt('Edit comment:', comment.text);
                            if (newText && newText.trim() && comment._id) {
                              try {
                                await socialService.updateComment(comment._id, { text: newText.trim() });
                                setRawComments(prev => prev.map(c => c._id === comment._id ? { ...c, text: newText.trim(), isEdited: true } : c));
                              } catch (err) {
                                console.error('Failed to update comment:', err);
                              }
                            }
                          }}
                          className="hover:text-purple-600 cursor-pointer transition-colors"
                        >
                          Edit
                        </button>
                      )}

                      {(((comment.userId?._id || comment.userId) === currentUser?._id || author.name === currentUser?.name || (post.userId?._id || post.authorId) === currentUser?._id || ['admin','super_admin','master_admin','head'].includes(currentUser?.role))) && (
                        <button
                          onClick={async () => {
                            if (window.confirm('Delete this comment?') && comment._id) {
                              try {
                                const res = await socialService.deleteComment(comment._id);
                                const decCount = res.deletedCount || 1;
                                setRawComments(prev => prev.filter(c => c._id !== comment._id));
                                setPost(prev => prev ? { ...prev, commentsCount: Math.max(0, (prev.commentsCount || 0) - decCount) } : prev);
                              } catch (err) {
                                console.error('Failed to delete comment:', err);
                              }
                            }
                          }}
                          className="hover:text-rose-600 cursor-pointer transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>

                    {/* Comment Thread Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-3.5 pl-6 border-l-2 border-slate-100 space-y-3.5">
                        {comment.replies.map((reply, ri) => {
                          const replyAuthor = getCommentAuthor(reply);
                          const replyKey = reply._id || reply.id || `r_${ri}`;
                          return (
                            <div key={replyKey} className="flex gap-2.5 items-start">
                              <Avatar initials={replyAuthor.initials} src={replyAuthor.avatar} size="sm" color="bg-indigo-50 text-indigo-700" />
                              <div className="flex-1 bg-slate-50/60 rounded-2xl rounded-tl-xs px-3.5 py-2.5 border border-slate-100/40">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <h6 className="text-[12.5px] font-black text-slate-800 leading-tight">{replyAuthor.name}</h6>
                                  {replyAuthor.isVerified && (
                                    <span className="w-3.5 h-3.5 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center scale-70 shrink-0">
                                      <Check size={9} strokeWidth={4} />
                                    </span>
                                  )}
                                </div>
                                <p className="text-[12px] text-slate-655 font-medium leading-relaxed">{reply.text}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Bar Container */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-150/60 shadow-[0_-3px_10px_rgba(0,0,0,0.015)]">
        {/* Replying to indicator */}
        {replyingToComment && (
          <div className="bg-slate-50 border-b border-slate-100 px-5 py-2 flex items-center justify-between animate-fade-in">
            <span className="text-[11.5px] font-bold text-slate-500">
              Replying to <span className="text-[#8B5CF6] font-black">{replyingToComment.author.name}</span>
            </span>
            <button 
              onClick={() => setReplyingToComment(null)}
              className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Emoji Picker Row */}
        {showEmojiPicker && (
          <div className="bg-slate-50/90 border-b border-slate-100 px-4 py-2 flex justify-around animate-slide-up">
            {['😊', '👍', '❤️', '🔥', '🎉', '👏', '😂'].map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setCommentText(prev => prev + emoji);
                  setShowEmojiPicker(false);
                }}
                className="text-[18px] hover:scale-125 active:scale-95 transition-transform p-1"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Comment Input Fixed Bar */}
        <div 
          className="px-4 py-2.5 flex items-center gap-3"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 10px)' }}
        >
          <Avatar initials={currentUser?.initials || 'U'} size="sm" color="bg-indigo-50 text-indigo-700" className="shrink-0" />
          
          <div className="flex-1 flex items-center bg-slate-50 rounded-full px-4.5 py-2 border border-slate-100 focus-within:border-brand-primary/20 focus-within:bg-white transition-all gap-2">
            <input
              type="text"
              placeholder={replyingToComment ? `Reply to ${replyingToComment.author.name.split(' ')[0]}...` : 'Write a comment...'}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
              className="flex-1 text-[13px] text-slate-800 bg-transparent outline-none placeholder-slate-400 font-semibold"
            />
            <button 
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-0.5 active:scale-90 transition-transform ${showEmojiPicker ? 'text-[#8B5CF6]' : 'text-slate-400 hover:text-slate-650'}`}
            >
              <Smile size={18} />
            </button>
          </div>
          
          <button 
            onClick={handleSendComment} 
            disabled={!commentText.trim()} 
            className={`w-9.5 h-9.5 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 ${
              commentText.trim() 
                ? 'bg-brand-primary text-white shadow-sm shadow-brand-primary/25' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Send size={15} className="ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostDetailPage;
