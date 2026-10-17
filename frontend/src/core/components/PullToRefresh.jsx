import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * App-wide pull-to-refresh for phones (browser and the Android WebView app).
 *
 * The browser's own pull-to-refresh can't work here: every screen scrolls inside its
 * own container (the page itself never scrolls) and index.html turns the native gesture
 * off. So this watches touches itself: pulling down while everything under the finger
 * is scrolled to the top shows a spinner, and releasing past the threshold reloads.
 */
const THRESHOLD = 80;  // px of (damped) pull needed to refresh
const MAX_PULL = 130;

// Screens where pulling down already means something else
const DISABLED_PATHS = [
  /\/chat\//,            // chat rooms (scroll up through history)
  /\/groups\/[^/]+/,     // group chat
  /\/matrimonial\/chat/,
  /\/story/,
  /\/social\/create/     // full-screen story / post editor
];

const isScrolledToTop = (target) => {
  for (let el = target; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    if (el.scrollTop > 0) {
      const { overflowY } = window.getComputedStyle(el);
      if (/(auto|scroll|overlay)/.test(overflowY)) return false;
    }
  }
  return (document.scrollingElement?.scrollTop || 0) <= 0;
};

const isBlocked = (target) => {
  if (document.body.style.overflow === 'hidden' || document.body.style.position === 'fixed') return true; // a pop-up / viewer is open
  if (DISABLED_PATHS.some(re => re.test(window.location.pathname))) return true;
  return Boolean(target?.closest?.('input, textarea, select, video, [contenteditable="true"], [data-no-pull-refresh]'));
};

export const PullToRefresh = () => {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const gesture = useRef({ startY: 0, startX: 0, armed: false, dist: 0 });

  useEffect(() => {
    const onStart = (e) => {
      const g = gesture.current;
      g.armed = false;
      g.dist = 0;
      if (refreshing || e.touches.length !== 1) return;
      if (isBlocked(e.target) || !isScrolledToTop(e.target)) return;
      g.startY = e.touches[0].clientY;
      g.startX = e.touches[0].clientX;
      g.armed = true;
    };

    const onMove = (e) => {
      const g = gesture.current;
      if (!g.armed) return;
      const dy = e.touches[0].clientY - g.startY;
      const dx = Math.abs(e.touches[0].clientX - g.startX);
      // Sideways swipes (tabs, carousels) and upward scrolls are not a pull
      if (dy <= 0 || dx > dy) {
        if (g.dist) setPull(0);
        g.dist = 0;
        if (dy < 0 || dx > 30) g.armed = false;
        return;
      }
      g.dist = Math.min(dy * 0.5, MAX_PULL);
      setPull(g.dist);
    };

    const onEnd = () => {
      const g = gesture.current;
      if (!g.armed) return;
      g.armed = false;
      if (g.dist >= THRESHOLD) {
        setRefreshing(true);
        setPull(THRESHOLD);
        setTimeout(() => window.location.reload(), 250);
      } else {
        setPull(0);
      }
      g.dist = 0;
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [refreshing]);

  if (pull <= 0 && !refreshing) return null;

  const progress = Math.min(pull / THRESHOLD, 1);
  return (
    <div
      className="fixed left-1/2 z-[9999] pointer-events-none"
      style={{ top: 0, transform: `translate(-50%, ${pull - 44}px)`, transition: gesture.current.armed ? 'none' : 'transform 200ms ease-out' }}
    >
      <div
        className="w-10 h-10 rounded-full bg-white shadow-lg border border-slate-100 flex items-center justify-center"
        style={{ opacity: 0.4 + progress * 0.6 }}
      >
        <RefreshCw
          size={20}
          className={`text-[#7C3AED] ${refreshing ? 'animate-spin' : ''}`}
          style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
        />
      </div>
    </div>
  );
};

export default PullToRefresh;
