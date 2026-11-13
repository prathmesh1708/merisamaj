import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles, ExternalLink } from 'lucide-react';

const variants = {
  enter: (direction) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.96
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: 'spring', stiffness: 350, damping: 30 },
      opacity: { duration: 0.3 },
      scale: { duration: 0.3 }
    }
  },
  exit: (direction) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.96,
    transition: {
      x: { type: 'spring', stiffness: 350, damping: 30 },
      opacity: { duration: 0.25 }
    }
  })
};

export const DynamicPromoSlider = ({ customBanners = null }) => {
  const navigate = useNavigate();
  // No configured banners means no slider; never substitute sample content.
  const banners = Array.isArray(customBanners)
    ? customBanners.filter(banner => typeof banner?.image === 'string' && banner.image.trim())
    : [];

  const [[page, direction], setPage] = useState([0, 0]);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);

  const currentIndex = ((page % banners.length) + banners.length) % banners.length;
  const currentBanner = banners[currentIndex];

  const paginate = useCallback((newDirection) => {
    setPage(([prevPage]) => [prevPage + newDirection, newDirection]);
  }, []);

  const jumpTo = (index) => {
    const diff = index - currentIndex;
    if (diff !== 0) {
      setPage([page + diff, diff > 0 ? 1 : -1]);
    }
  };

  // Auto-play timer
  useEffect(() => {
    if (isPaused || banners.length <= 1) return;
    const interval = setInterval(() => {
      paginate(1);
    }, 4800);

    return () => clearInterval(interval);
  }, [isPaused, paginate, banners.length]);

  const handleBannerClick = (banner) => {
    if (!banner?.link) return;
    if (banner.link.startsWith('http://') || banner.link.startsWith('https://')) {
      window.open(banner.link, '_blank', 'noopener,noreferrer');
    } else {
      navigate(banner.link);
    }
  };

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchMove = (e) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    const distance = touchStartXRef.current - touchEndXRef.current;
    if (Math.abs(distance) > 40) {
      if (distance > 0) {
        // Swiped Left -> Next
        paginate(1);
      } else {
        // Swiped Right -> Prev
        paginate(-1);
      }
    }
    touchStartXRef.current = 0;
    touchEndXRef.current = 0;
  };

  if (!banners || banners.length === 0) return null;

  return (
    <div className="px-3 mt-6 relative z-10 select-none animate-fade-in-up">
      {/* Slider Container */}
      <div
        className="relative w-full h-[260px] sm:h-[300px] rounded-[26px] overflow-hidden shadow-lg shadow-purple-500/10 border border-slate-200/80 bg-slate-900 group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 w-full h-full cursor-pointer"
            onClick={() => handleBannerClick(currentBanner)}
          >
            {/* Background Image */}
            <img
              src={currentBanner.image}
              alt={currentBanner.title}
              className="w-full h-full object-cover object-center"
            />

            {/* Gradient Dark Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />

            {/* Banner Content */}
            <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between text-left">
              {/* Top Tag */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r ${currentBanner.tagColor} shadow-md border border-white/20 backdrop-blur-md`}>
                  {currentBanner.tag}
                </span>

                {/* Banner counter */}
                <span className="text-[10.5px] font-black text-white/80 bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/15">
                  {currentIndex + 1} / {banners.length}
                </span>
              </div>

              {/* Bottom Details & CTA */}
              <div className="space-y-1.5">
                <h3 className="text-white text-[17px] sm:text-[20px] font-black leading-tight tracking-tight drop-shadow-md line-clamp-1">
                  {currentBanner.title}
                </h3>
                <p className="text-white/85 text-[11.5px] sm:text-[12.5px] font-medium leading-snug line-clamp-2 max-w-md drop-shadow-sm">
                  {currentBanner.subtitle}
                </p>

                <div className="pt-1.5 flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBannerClick(currentBanner);
                    }}
                    className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[11.5px] font-black rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-900/40 border border-purple-300/30 press-scale transition-all"
                  >
                    <span>{currentBanner.buttonText || 'Learn More'}</span>
                    <ArrowRight size={13} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Left / Right Chevron Arrows (Appear on hover & mobile accessible) */}
        {banners.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                paginate(-1);
              }}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-md transition-all active:scale-90 z-20 opacity-80 group-hover:opacity-100"
              title="Previous Banner"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                paginate(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-md transition-all active:scale-90 z-20 opacity-80 group-hover:opacity-100"
              title="Next Banner"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </>
        )}

        {/* Pagination Dots / Pills */}
        {banners.length > 1 && (
          <div className="absolute bottom-2.5 right-4 z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  jumpTo(idx);
                }}
                className={`transition-all duration-300 rounded-full ${
                  idx === currentIndex
                    ? 'w-5 h-1.5 bg-white shadow-xs'
                    : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicPromoSlider;
