import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Search, Bell, Users, MessageCircle, MapPin, Compass, X, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar } from '../../components/common/Avatar';
import { useData } from '../../context/DataProvider';
import { PlusCircle, Edit2, Search as SearchIcon } from 'lucide-react';
import { mockMembers } from '../../data/mockUsers';

import FeedPage from './FeedPage';
import GroupsPage from '../groups/GroupsPage';
import ChatListPage from '../chat/ChatListPage';
import DirectoryPage from '../directory/DirectoryPage';
import { DiscoverContent } from './components/DiscoverContent';

// React Icons
import { FiUsers } from 'react-icons/fi';
import { HiOutlineChatAlt } from 'react-icons/hi';
import { MdOutlineGroupAdd } from 'react-icons/md';



// Custom Tab Icons matching the requested design and React Icons
const CityFeedIcon = ({ size = 26, isActive }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 -960 960 960"
    fill={isActive ? '#7C3AED' : '#828E9E'}
    className="transition-all duration-200"
  >
    <path d="M0-240v-63q0-43 44-70t116-27q13 0 25 .5t23 2.5q-14 21-21 44t-7 48v65H0Zm240 0v-65q0-32 17.5-58.5T307-410q32-20 76.5-30t96.5-10q53 0 97.5 10t76.5 30q32 20 49 46.5t17 58.5v65H240Zm540 0v-65q0-26-6.5-49T754-397q11-2 22.5-2.5t23.5-.5q72 0 116 26.5t44 70.5v63H780Zm-455-80h311q-10-20-55.5-35T480-370q-55 0-100.5 15T325-320ZM160-440q-33 0-56.5-23.5T80-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T160-440Zm640 0q-33 0-56.5-23.5T720-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T800-440Zm-320-40q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T600-600q0 50-34.5 85T480-480Zm0-80q17 0 28.5-11.5T520-600q0-17-11.5-28.5T480-640q-17 0-28.5 11.5T440-600q0 17 11.5 28.5T480-560Zm1 240Zm-1-280Z" />
  </svg>
);

const CommunityFeedIcon = ({ size = 26, isActive }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={isActive ? '#7C3AED' : '#828E9E'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-200">
    <circle cx="12" cy="12.5" r="7.5" opacity="0.6" />
    <circle cx="12" cy="5.5" r="1.5" />
    <path d="M10 9a2.2 2.2 0 0 1 4 0" />
    <circle cx="12" cy="12.5" r="1.5" />
    <path d="M10 16a2.2 2.2 0 0 1 4 0" />
    <circle cx="6" cy="15.5" r="1.5" />
    <path d="M4 19a2.2 2.2 0 0 1 4 0" />
    <circle cx="18" cy="15.5" r="1.5" />
    <path d="M16 19a2.2 2.2 0 0 1 4 0" />
  </svg>
);

const GroupsIcon = ({ size = 26, isActive }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={isActive ? '#7C3AED' : '#828E9E'}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="transition-all duration-200"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" strokeWidth="2.5" />
    <line x1="16" y1="11" x2="22" y2="11" strokeWidth="2.5" />
  </svg>
);

const ChatIcon = ({ size = 26, isActive }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={isActive ? '#7C3AED' : '#828E9E'}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="transition-all duration-200"
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const DiscoverIcon = ({ size = 26, isActive }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={isActive ? '#7C3AED' : '#828E9E'}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="transition-all duration-200"
  >
    <circle cx="12" cy="12" r="9" />
    <polygon points="16.2,7.8 13.8,13.8 7.8,16.2 10.2,10.2" fill={isActive ? '#7C3AED' : 'none'} opacity={isActive ? '0.15' : '1'} />
    <polygon points="16.2,7.8 13.8,13.8 7.8,16.2 10.2,10.2" />
  </svg>
);

const SocialHubPage = ({ initialTab = 'city-feed' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, setMobileMenuOpen, getUnreadCountForModule, fetchFeedPosts, cityPosts = [], communityPosts = [] } = useData();
  const [activeTab, setActiveTab] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState({ 'city-feed': true, 'community-feed': true });

  useEffect(() => {
    if (activeTab === 0 && (!cityPosts || cityPosts.length === 0)) {
      fetchFeedPosts('city');
    } else if (activeTab === 1 && (!communityPosts || communityPosts.length === 0)) {
      fetchFeedPosts('community');
    }
  }, [activeTab, cityPosts, communityPosts]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const getHeaderTitle = () => {
    const userCity = currentUser?.city || 'Indore';
    const userCommunity = (currentUser?.community || 'General').replace(/samaj/gi, '').replace(/\s+/g, ' ').trim();
    
    switch (activeTab) {
      case 0: // City Feed
        return `${userCity} ${userCommunity} Community`;
      case 1: // Community Feed
        return `Entire ${userCommunity} Community`;
      case 2: // Groups
        return 'Groups';
      case 3: // Discover
        return 'Discover';
      default:
        return 'Social Hub';
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const containerRef = useRef(null);   // visible viewport of the pager
  const trackRef = useRef(null);       // row of tab pages, moved with translateX
  const indicatorRef = useRef(null);   // purple underline in the tab bar
  const [triggerCreateGroup, setTriggerCreateGroup] = useState(false);
  // Live swipe state kept in a ref: updating React state on every finger move
  // would re-render all four tabs and make the swipe stutter.
  const swipeRef = useRef({ startX: 0, startY: 0, startTime: 0, mode: null, offset: 0, frame: null, target: null });
  const isWheelingRef = useRef(false);
  const wheelTimeoutRef = useRef(null);
  const lastTabScrollY = useRef({});

  const tabs = [
    { id: 'city-feed', label: 'City Feed', icon: CityFeedIcon, component: FeedPage, feedProps: { feedType: 'city' } },
    { id: 'community-feed', label: 'Community Feed', icon: CommunityFeedIcon, component: FeedPage, feedProps: { feedType: 'community' } },
    { id: 'groups', label: 'Groups', icon: GroupsIcon, component: GroupsPage },
    { id: 'discover', label: 'Discover', icon: DiscoverIcon, component: DiscoverContent }
  ];

  // Persist active tab to sessionStorage whenever activeTab changes
  useEffect(() => {
    if (tabs[activeTab]) {
      sessionStorage.setItem('socialHub_activeTab', tabs[activeTab].id);
    }
  }, [activeTab]);

  // Pick the starting tab from route state, sessionStorage, or initialTab
  useEffect(() => {
    let passedTabId = location.state?.tab || sessionStorage.getItem('socialHub_activeTab') || initialTab;
    if (passedTabId === 'feed') passedTabId = 'city-feed';
    if (passedTabId === 'connect') passedTabId = 'community-feed';
    const tabIndex = tabs.findIndex(t => t.id === passedTabId);
    if (tabIndex !== -1) {
      setActiveTab(tabIndex);
      sessionStorage.setItem('socialHub_activeTab', tabs[tabIndex].id);
    }
  }, [initialTab, location.state]);

  // ── Pager positioning ─────────────────────────────────────────────────────
  // Moves the track (and the tab underline) to `index`, shifted by `dragPx` while
  // the finger is down. `animate` adds the snap animation after release.
  const positionPager = (index, dragPx = 0, animate = true) => {
    const track = trackRef.current;
    const indicator = indicatorRef.current;
    const width = containerRef.current?.clientWidth || 1;
    const transition = animate ? 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
    if (track) {
      track.style.transition = transition;
      track.style.transform = `translate3d(${-index * width + dragPx}px, 0, 0)`;
    }
    if (indicator) {
      indicator.style.transition = transition;
      indicator.style.transform = `translateX(${(index - dragPx / width) * 100}%)`;
    }
  };

  // Snap to the active tab whenever it changes (tap, swipe or route state).
  // The first placement after opening the page is instant, not animated.
  const hasPositionedRef = useRef(false);
  useEffect(() => {
    positionPager(activeTab, 0, hasPositionedRef.current);
    const t = setTimeout(() => { hasPositionedRef.current = true; }, 100);
    return () => clearTimeout(t);
  }, [activeTab]);

  // Keep aligned on resize/rotation (pixel based, so recompute without animation)
  useEffect(() => {
    const handleResize = () => positionPager(activeTab, 0, false);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  const handleTabScroll = (e) => {
    const tabId = e.currentTarget.dataset.tabId;
    const currentScrollY = e.currentTarget.scrollTop;
    const scrollHeight = e.currentTarget.scrollHeight;
    const clientHeight = e.currentTarget.clientHeight;

    // Trigger cursor pagination fetch when user scrolls close to the bottom
    if (scrollHeight - currentScrollY - clientHeight < 120 && !loadingMore && hasMore[tabId]) {
      const feedType = tabId === 'city-feed' ? 'city' : 'community';
      const feedPosts = feedType === 'city' ? cityPosts : communityPosts;
      if (feedPosts && feedPosts.length > 0) {
        setLoadingMore(true);
        const lastPost = feedPosts[feedPosts.length - 1];
        const cursor = lastPost.createdAt;
        fetchFeedPosts(feedType, '', cursor).then((res) => {
          setLoadingMore(false);
          if (res && !res.hasMore) {
            setHasMore(prev => ({ ...prev, [tabId]: false }));
          }
        });
      }
    }
    
    // Only apply the hide-on-scroll behavior to the City Feed and Community Feed tabs
    if (tabId !== 'city-feed' && tabId !== 'community-feed') {
      lastTabScrollY.current[tabId] = currentScrollY;
      return;
    }

    const lastScroll = lastTabScrollY.current[tabId] || 0;
    const difference = currentScrollY - lastScroll;

    // Accumulate scroll delta. Only trigger and reset baseline when threshold is crossed.
    if (Math.abs(difference) > 8) {
      if (currentScrollY <= 60) {
        // Always show near the top
        window.dispatchEvent(new CustomEvent('toggle-bottom-nav', { detail: true }));
      } else if (difference > 0) {
        // Scrolling down -> hide BottomNav
        window.dispatchEvent(new CustomEvent('toggle-bottom-nav', { detail: false }));
      } else {
        // Scrolling up -> show BottomNav
        window.dispatchEvent(new CustomEvent('toggle-bottom-nav', { detail: true }));
      }
      
      // Update baseline ONLY when threshold is crossed so slow scrolling accumulates
      lastTabScrollY.current[tabId] = currentScrollY;
    }
  };

  useEffect(() => {
    // Show bottom nav instantly when user switches tabs
    window.dispatchEvent(new CustomEvent('toggle-bottom-nav', { detail: true }));
  }, [activeTab]);

  const scrollToTab = (index) => {
    const clamped = Math.max(0, Math.min(tabs.length - 1, index));
    if (clamped === activeTab) positionPager(clamped, 0, true);
    else setActiveTab(clamped);
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
      if (swipeRef.current.frame) cancelAnimationFrame(swipeRef.current.frame);
    };
  }, []);

  // True if the touch started on something that scrolls sideways by itself (stories
  // row, filter chips...). Those rows own the whole gesture — even at their end — so
  // scrolling chips never drags the page to another tab.
  const insideHorizontalScroller = (target) => {
    let el = target;
    while (el && el !== containerRef.current && !el.dataset?.tabId) {
      if (el.dataset?.swipeBlock === 'true') return true;
      if (el.scrollWidth > el.clientWidth + 1) {
        const overflowX = getComputedStyle(el).overflowX;
        if (overflowX === 'auto' || overflowX === 'scroll') return true;
      }
      el = el.parentElement;
    }
    return false;
  };

  // While a sideways swipe is in progress, stop the page from also scrolling up/down.
  // React's touch listeners are passive, so this needs a native one.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const blockVerticalScroll = (e) => {
      if (swipeRef.current.mode === 'swipe' && e.cancelable) e.preventDefault();
    };
    el.addEventListener('touchmove', blockVerticalScroll, { passive: false });
    return () => el.removeEventListener('touchmove', blockVerticalScroll);
  }, []);

  // overflow:hidden boxes can still be scrolled sideways by the browser (focusing an
  // input, scrollIntoView...), which leaves the pager half-way between tabs. Undo it.
  const resetStrayScroll = (e) => {
    if (e.currentTarget.scrollLeft !== 0) e.currentTarget.scrollLeft = 0;
  };

  // ── Finger-following swipe ────────────────────────────────────────────────
  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const sw = swipeRef.current;
    sw.startX = t.clientX;
    sw.startY = t.clientY;
    sw.startTime = performance.now();
    sw.mode = null;
    sw.offset = 0;
    sw.target = e.target;
  };

  const handleTouchMove = (e) => {
    const sw = swipeRef.current;
    if (sw.mode === 'ignore' || e.touches.length !== 1) return;
    const t = e.touches[0];
    const diffX = t.clientX - sw.startX;
    const diffY = t.clientY - sw.startY;

    // Decide once per gesture whether this is a sideways swipe or a vertical scroll
    if (!sw.mode) {
      if (Math.abs(diffX) < 8 && Math.abs(diffY) < 8) return;
      if (Math.abs(diffX) > Math.abs(diffY) * 1.2 && !insideHorizontalScroller(sw.target)) {
        sw.mode = 'swipe';
      } else {
        sw.mode = 'ignore';
        return;
      }
    }

    // Rubber-band resistance past the first and last tab
    const atEdge = (activeTab === 0 && diffX > 0) || (activeTab === tabs.length - 1 && diffX < 0);
    sw.offset = atEdge ? diffX * 0.3 : diffX;

    if (!sw.frame) {
      sw.frame = requestAnimationFrame(() => {
        sw.frame = null;
        if (sw.mode === 'swipe') positionPager(activeTab, sw.offset, false);
      });
    }
  };

  const handleTouchEnd = () => {
    const sw = swipeRef.current;
    if (sw.frame) { cancelAnimationFrame(sw.frame); sw.frame = null; }
    if (sw.mode !== 'swipe') { sw.mode = null; return; }
    sw.mode = null;

    const width = containerRef.current?.clientWidth || 1;
    const elapsed = Math.max(1, performance.now() - sw.startTime);
    const velocity = sw.offset / elapsed; // px per ms
    // Change tab if dragged past 25% of the screen, or flicked quickly
    const passed = Math.abs(sw.offset) > width * 0.25 || (Math.abs(velocity) > 0.45 && Math.abs(sw.offset) > 30);

    let next = activeTab;
    if (passed) next = sw.offset < 0 ? activeTab + 1 : activeTab - 1;
    scrollToTab(next);
  };

  // Trackpad / mouse horizontal wheel: one tab per gesture
  const handleWheel = (e) => {
    if (insideHorizontalScroller(e.target)) return;
    if (Math.abs(e.deltaX) > 15 && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      if (!isWheelingRef.current) {
        isWheelingRef.current = true;
        scrollToTab(e.deltaX > 0 ? activeTab + 1 : activeTab - 1);
      }
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
      wheelTimeoutRef.current = setTimeout(() => {
        isWheelingRef.current = false;
      }, 250);
    }
  };

  // Render unified FAB based on active tab
  const renderFAB = () => {
    if (activeTab === 0) { // City Feed
      return (
        <button 
          onClick={() => navigate('/member/social/create', { state: { feedType: 'city' } })} 
          className="responsive-fixed-fab w-14 h-14 bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] text-white rounded-2xl shadow-[0_8px_30px_rgba(59,130,246,0.35)] flex items-center justify-center press-scale hover:scale-105 transition-transform absolute bottom-6 right-5 z-50"
        >
          <PlusCircle size={24} />
        </button>
      );
    }
    if (activeTab === 1) { // Community Feed
      return (
        <button 
          onClick={() => navigate('/member/social/create', { state: { feedType: 'community' } })} 
          className="responsive-fixed-fab w-14 h-14 bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] text-white rounded-2xl shadow-[0_8px_30px_rgba(59,130,246,0.35)] flex items-center justify-center press-scale hover:scale-105 transition-transform absolute bottom-6 right-5 z-50"
        >
          <PlusCircle size={24} />
        </button>
      );
    }
    if (activeTab === 2) { // Groups
      return (
        <button 
          onClick={() => setTriggerCreateGroup(true)} 
          className="responsive-fixed-fab w-14 h-14 bg-gradient-to-br from-brand-primary to-brand-glow text-white rounded-2xl shadow-[0_8px_30px_rgba(124,58,237,0.35)] flex items-center justify-center press-scale hover:scale-105 transition-transform absolute bottom-6 right-5 z-50"
        >
          <Users size={22} />
        </button>
      );
    }
    return null;
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden relative bg-surface">
      
      {/* ─── FIXED GLOBAL HEADER ─── */}
      <div className="bg-white/85 backdrop-blur-xl sticky top-0 z-40 border-b border-purple-100/30 flex-shrink-0 shadow-[0_2px_12px_rgba(124,58,237,0.03)] text-left select-none">
        <div className="flex items-center justify-between px-4 h-14">
          {isSearchOpen ? (
            <div className="flex-1 flex items-center gap-3 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-xl">
              <Search size={16} className="text-purple-600 shrink-0" />
              <input
                type="text"
                placeholder="Search posts & groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none w-full text-[13px] text-slate-800 font-extrabold placeholder-slate-400"
                autoFocus
              />
              <button 
                onClick={() => setIsFilterOpen(true)}
                className="text-slate-400 hover:text-purple-600 p-0.5 press-scale"
                title="Filter Category"
              >
                <SlidersHorizontal size={16} />
              </button>
              <button onClick={() => {
                setSearchQuery('');
                setIsSearchOpen(false);
              }} className="text-slate-400 hover:text-purple-600 p-0.5 press-scale">
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <button 
                  className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-purple-50 transition-colors press-scale" 
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu size={20} strokeWidth={2.5} />
                </button>
                <div className="text-left">
                  <h1 className={`font-extrabold text-slate-800 tracking-tight leading-tight whitespace-nowrap overflow-hidden text-ellipsis ${activeTab < 2 ? 'text-[15px] sm:text-[16px]' : 'text-[17px]'}`}>{getHeaderTitle()}</h1>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Social Hub & Feed</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-purple-50 transition-all press-scale" 
                  onClick={() => setIsSearchOpen(true)}
                >
                  <Search size={18} />
                </button>
                <button 
                  className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 relative hover:bg-purple-50 transition-all press-scale" 
                  onClick={() => navigate('/member/notifications?module=community')}
                >
                  <Bell size={18} />
                  {getUnreadCountForModule('community') > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-600 rounded-full" />
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* ─── TAB BAR ─── */}
        <div className="flex relative border-t border-slate-100">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === idx;
            return (
              <button 
                key={tab.id}
                onClick={() => scrollToTab(idx)}
                className={`flex-1 py-3 flex items-center justify-center transition-all press-scale ${isActive ? 'text-purple-600' : 'text-slate-400 hover:text-slate-700'}`}
              >
                <Icon size={22} isActive={isActive} className={isActive ? 'drop-shadow-sm scale-110' : ''} />
              </button>
            );
          })}
          {/* Active Tab Indicator */}
          <div ref={indicatorRef} className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-full will-change-transform" 
               style={{ width: `${100 / tabs.length}%`, transform: `translateX(${activeTab * 100}%)` }} 
          />
        </div>
      </div>


      {/* ─── SWIPEABLE CONTENT CONTAINER ─── */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onWheel={handleWheel}
        onScroll={resetStrayScroll}
        className="flex-1 min-h-0 overflow-hidden"
        style={{ touchAction: 'pan-y' }}
      >
        <div ref={trackRef} className="flex h-full w-full will-change-transform">
        {tabs.map((tab) => {
          const Component = tab.component;
          const extraProps = tab.feedProps || {};
          const groupsProps = tab.id === 'groups' ? {
            triggerCreateGroup,
            onGroupCreateTriggered: () => setTriggerCreateGroup(false)
          } : {};
          return (
            <div 
              key={tab.id} 
              data-tab-id={tab.id}
              onScroll={(e) => { resetStrayScroll(e); handleTabScroll(e); }}
              className="w-full min-w-0 h-full flex-shrink-0 overflow-y-auto overflow-x-hidden overscroll-y-contain pb-28"
            >
              <Component isHub={true} {...extraProps} {...groupsProps} searchQuery={searchQuery} isFilterOpen={isFilterOpen} setIsFilterOpen={setIsFilterOpen} />
            </div>
          );
        })}
        </div>
      </div>

      {/* ─── UNIFIED FAB ─── */}
      {renderFAB()}

    </div>
  );
};

export default SocialHubPage;
