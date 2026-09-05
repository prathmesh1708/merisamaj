import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Send } from 'lucide-react';
import { Avatar } from './Avatar';
import { useData } from '../../context/DataProvider';
import { createPortal } from 'react-dom';

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0
  })
};

export const StoryViewer = ({ story, stories = [], onStoryChange, onClose }) => {
  const [progress, setProgress] = useState(0);
  const [likedStories, setLikedStories] = useState({});
  const { sendChatMessage, getOrCreateChat } = useData();
  const [replyText, setReplyText] = useState('');
  const [showToast, setShowToast] = useState(false);
  
  // State to hold fixed window height, ignoring dynamic keyboard resizing on mobile
  const [fixedHeight, setFixedHeight] = useState('100vh');
  useEffect(() => {
    setFixedHeight(`${window.innerHeight}px`);
  }, []);

  const isCurrentStoryLiked = story ? !!likedStories[story.id] : false;

  const toggleLike = (e) => {
    e.stopPropagation();
    if (story) {
      setLikedStories(prev => ({
        ...prev,
        [story.id]: !prev[story.id]
      }));
    }
  };

  const handleSendReply = () => {
    const trimmed = replyText.trim();
    if (!trimmed || !story) return;

    const posterId = story.memberId;
    if (posterId === 'me' || posterId === 'u1') {
      setReplyText('');
      return;
    }

    const resolvedChatId = getOrCreateChat(posterId);
    sendChatMessage(resolvedChatId, `Replied to your story: "${trimmed}"`);
    setReplyText('');

    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  // Grouping and index variables
  const currentMemberStories = story ? stories.filter(s => s.memberId === story.memberId) : [];
  const activeStoryIndex = story ? currentMemberStories.findIndex(s => s.id === story.id) : -1;

  // Track unique member IDs in order of stories
  const memberIds = [];
  stories.forEach(s => {
    if (!memberIds.includes(s.memberId)) {
      memberIds.push(s.memberId);
    }
  });
  const currentMemberIndex = story ? memberIds.indexOf(story.memberId) : -1;

  // Horizontal slide transition direction mapping
  const [direction, setDirection] = useState(1);
  const [prevStoryId, setPrevStoryId] = useState(story?.id);

  useEffect(() => {
    if (story && story.id !== prevStoryId) {
      const oldIdx = stories.findIndex(s => s.id === prevStoryId);
      const newIdx = stories.findIndex(s => s.id === story.id);
      setDirection(newIdx > oldIdx ? 1 : -1);
      setPrevStoryId(story.id);
    }
  }, [story, stories, prevStoryId]);

  const [isPaused, setIsPaused] = useState(false);
  const touchStartTimeRef = useRef(0);
  const holdTimeoutRef = useRef(null);
  const tappedSideRef = useRef('right');
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);

  const goToNextUser = () => {
    if (currentMemberIndex < memberIds.length - 1) {
      const nextMemberId = memberIds[currentMemberIndex + 1];
      const nextMemberStories = stories.filter(s => s.memberId === nextMemberId);
      if (nextMemberStories.length > 0) {
        onStoryChange(nextMemberStories[0]);
      }
    } else {
      onClose();
    }
  };

  const goToPrevUser = () => {
    if (currentMemberIndex > 0) {
      const prevMemberId = memberIds[currentMemberIndex - 1];
      const prevMemberStories = stories.filter(s => s.memberId === prevMemberId);
      if (prevMemberStories.length > 0) {
        onStoryChange(prevMemberStories[0]);
      }
    } else {
      setProgress(0);
    }
  };

  const handleTouchStart = (side, e) => {
    tappedSideRef.current = side;
    touchStartTimeRef.current = Date.now();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    touchStartXRef.current = clientX;
    touchStartYRef.current = clientY;

    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    holdTimeoutRef.current = setTimeout(() => {
      setIsPaused(true);
    }, 200);
  };

  const handleTouchEnd = (e) => {
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    
    const diffX = clientX - touchStartXRef.current;
    const diffY = clientY - touchStartYRef.current;
    const touchDuration = Date.now() - touchStartTimeRef.current;
    setIsPaused(false);
    
    // Swipe left/right detection threshold: 40 pixels
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        goToNextUser();
      } else {
        goToPrevUser();
      }
    } else {
      if (touchDuration < 200) {
        handleTap(tappedSideRef.current);
      }
    }
  };

  const handleTouchCancel = () => {
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    setIsPaused(false);
  };

  // Reset progress when story changes
  useEffect(() => {
    setProgress(0);
  }, [story?.id]);

  // Lock body scroll when story viewer is open to prevent page scrolling behind it
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, []);

  // Auto advance timeline (5 seconds total)
  useEffect(() => {
    if (!story || isPaused) return;

    const duration = 5000;
    const interval = 50; // Update every 50ms
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          
          // 1. Check if there is another story for the current member
          if (activeStoryIndex !== -1 && activeStoryIndex < currentMemberStories.length - 1) {
            onStoryChange(currentMemberStories[activeStoryIndex + 1]);
          } 
          // 2. If current member's stories are finished, move to the next member's first story
          else if (currentMemberIndex !== -1 && currentMemberIndex < memberIds.length - 1) {
            const nextMemberId = memberIds[currentMemberIndex + 1];
            const nextMemberStories = stories.filter(s => s.memberId === nextMemberId);
            if (nextMemberStories.length > 0) {
              onStoryChange(nextMemberStories[0]);
            } else {
              onClose();
            }
          } 
          // 3. Otherwise close the story viewer
          else {
            onClose();
          }
          return 100;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [story?.id, isPaused, activeStoryIndex, currentMemberIndex, onStoryChange, onClose]);

  if (!story) return null;

  const mockStoryImage = story.image || '';

  const handleTap = (tapDirection) => {
    if (tapDirection === 'right') {
      // Tap right -> next story for current member, or first story of next member, or close
      if (activeStoryIndex < currentMemberStories.length - 1) {
        onStoryChange(currentMemberStories[activeStoryIndex + 1]);
      } else if (currentMemberIndex < memberIds.length - 1) {
        const nextMemberId = memberIds[currentMemberIndex + 1];
        const nextMemberStories = stories.filter(s => s.memberId === nextMemberId);
        if (nextMemberStories.length > 0) {
          onStoryChange(nextMemberStories[0]);
        } else {
          onClose();
        }
      } else {
        onClose();
      }
    } else {
      // Tap left -> previous story for current member, or last story of previous member, or restart
      if (activeStoryIndex > 0) {
        onStoryChange(currentMemberStories[activeStoryIndex - 1]);
      } else if (currentMemberIndex > 0) {
        const prevMemberId = memberIds[currentMemberIndex - 1];
        const prevMemberStories = stories.filter(s => s.memberId === prevMemberId);
        if (prevMemberStories.length > 0) {
          onStoryChange(prevMemberStories[prevMemberStories.length - 1]);
        } else {
          setProgress(0);
        }
      } else {
        setProgress(0);
      }
    }
  };

  return createPortal(
    <AnimatePresence>
      {story && (
      <motion.div 
        drag={!isPaused ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.8 }}
        onDragEnd={(event, info) => {
          // Close if dragged down past 100px OR if flicked down with speed
          if (info.offset.y > 100 || (info.offset.y > 20 && info.velocity.y > 300)) {
            onClose();
          }
        }}
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
        className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden touch-none"
      >
        
        {/* Full Card sliding container */}
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={story.memberId}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 280, damping: 28 },
              opacity: { duration: 0.18 }
            }}
            className="absolute inset-0 w-full h-full bg-black overflow-hidden"
          >
            {/* Story Image Background */}
            <div className="absolute top-0 left-0 w-full bg-gray-900 pointer-events-none" style={{ height: fixedHeight }}>
              <img 
                src={mockStoryImage} 
                alt="Story" 
                className="w-full h-full object-cover"
              />
            </div>
            {/* Progress Bar Container - ONLY for the current member's stories */}
            <div className="absolute top-0 pt-4 left-0 right-0 z-20 px-2 flex gap-1.5">
              {currentMemberStories.map((s, idx) => {
                let widthPercent = 0;
                if (idx < activeStoryIndex) widthPercent = 100;
                else if (idx === activeStoryIndex) widthPercent = progress;

                return (
                  <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-75"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Header Overlay */}
            <div className="absolute top-0 pt-8 left-0 right-0 z-20 px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar initials={story.initials} avatar={story.avatar} size="sm" color="bg-white/10 text-white" />
                <div className="text-white drop-shadow-md">
                  <h4 className="font-bold text-[14px] leading-tight">{story.name}</h4>
                  <p className="text-[11px] opacity-80">{story.timestamp || '2h ago'}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            {/* Text Overlay */}
            {story.text && (
              <div 
                className="absolute z-20 pointer-events-none max-w-[88%] transition-all duration-200"
                style={{
                  top: `${Math.min(88, Math.max(12, story.textPosition?.y ?? 50))}%`,
                  left: `${Math.min(88, Math.max(12, story.textPosition?.x ?? 50))}%`,
                  transform: 'translate(-50%, -50%)',
                  textAlign: story.textStyle?.align || 'center'
                }}
              >
                <span 
                  className={`inline-block font-black drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] leading-relaxed ${
                    story.textStyle?.bgStyle === 'pill-light'
                      ? 'bg-white/85 text-slate-900 px-5 py-3 rounded-2xl backdrop-blur-md shadow-lg border border-white/40'
                      : story.textStyle?.bgStyle === 'neon'
                      ? 'bg-gradient-to-r from-pink-500/90 via-purple-600/90 to-indigo-600/90 text-white px-5 py-3 rounded-2xl backdrop-blur-md shadow-xl border border-white/20'
                      : story.textStyle?.bgStyle === 'transparent'
                      ? 'text-white px-3 py-1 drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]'
                      : 'bg-black/55 text-white px-5 py-3 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg'
                  } ${
                    story.textStyle?.fontSize === 'sm' ? 'text-[14px] sm:text-[15px]' :
                    story.textStyle?.fontSize === 'lg' ? 'text-[21px] sm:text-[24px]' :
                    story.textStyle?.fontSize === 'xl' ? 'text-[25px] sm:text-[29px]' :
                    'text-[17px] sm:text-[19px]'
                  }`}
                  style={{
                    color: story.textStyle?.color || (story.textStyle?.bgStyle === 'pill-light' ? '#0f172a' : '#ffffff'),
                    textAlign: story.textStyle?.align || 'center'
                  }}
                >
                  {story.text}
                </span>
              </div>
            )}
            
            {/* Gradient overlays for legibility */}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />

            {/* Story Reply Footer */}
            <div className="absolute bottom-0 pb-6 left-0 right-0 z-20 px-4">
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  placeholder="Reply to story..." 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                  className="flex-1 bg-black/40 backdrop-blur-md border border-white/20 rounded-full px-5 py-3 text-white placeholder-white/60 text-[14px] outline-none focus:bg-black/60 transition-colors"
                  onClick={(e) => e.stopPropagation()} // Prevent closing/advancing when typing
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                />
                {replyText.trim() ? (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleSendReply(); }}
                    className="w-12 h-12 rounded-full bg-indigo-650 text-white flex items-center justify-center press-scale shrink-0 active:scale-95 transition-all shadow-md"
                  >
                    <Send size={20} className="ml-0.5" />
                  </button>
                ) : (
                  <button 
                    onClick={toggleLike}
                    className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center press-scale shrink-0 active:scale-95 transition-all"
                  >
                    <Heart 
                      size={22} 
                      className={isCurrentStoryLiked ? "text-rose-500 fill-rose-500" : "text-slate-500"} 
                      fill={isCurrentStoryLiked ? "currentColor" : "none"} 
                    />
                  </button>
                )}
              </div>
            </div>

            {/* Float Sent Toast */}
            {showToast && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/85 text-white font-black text-[12px] px-5 py-3.5 rounded-full shadow-2xl border border-white/10 z-[60] flex items-center gap-2 backdrop-blur-xs animate-fade-in select-none">
                <span>Reply Sent! 💬</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Static Overlay Tap Targets in the middle viewport */}
        <div className="absolute top-20 bottom-24 left-0 right-0 z-30 flex select-none">
          <div 
            className="w-1/3 h-full cursor-pointer" 
            onMouseDown={(e) => handleTouchStart('left', e)}
            onMouseUp={(e) => handleTouchEnd(e)}
            onMouseLeave={handleTouchCancel}
            onTouchStart={(e) => { handleTouchStart('left', e); }}
            onTouchEnd={(e) => { handleTouchEnd(e); }}
            onTouchCancel={handleTouchCancel}
          />
          <div 
            className="w-2/3 h-full cursor-pointer" 
            onMouseDown={(e) => handleTouchStart('right', e)}
            onMouseUp={(e) => handleTouchEnd(e)}
            onMouseLeave={handleTouchCancel}
            onTouchStart={(e) => { handleTouchStart('right', e); }}
            onTouchEnd={(e) => { handleTouchEnd(e); }}
            onTouchCancel={handleTouchCancel}
          />
        </div>

      </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
