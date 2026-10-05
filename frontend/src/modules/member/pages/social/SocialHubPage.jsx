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
  const scrollContainerRef = useRef(null);
  const isTransitioningRef = useRef(false);
  const [triggerCreateGroup, setTriggerCreateGroup] = useState(false);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchTriggeredRef = useRef(false);
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

  // Set initial scroll position based on route state, sessionStorage, or initialTab
  useEffect(() => {
    let passedTabId = location.state?.tab || sessionStorage.getItem('socialHub_activeTab') || initialTab;
    if (passedTabId === 'feed') passedTabId = 'city-feed';
    if (passedTabId === 'connect') passedTabId = 'community-feed';
    const tabIndex = tabs.findIndex(t => t.id === passedTabId);
    if (tabIndex !== -1 && scrollContainerRef.current) {
      setActiveTab(tabIndex);
      sessionStorage.setItem('socialHub_activeTab', tabs[tabIndex].id);
      // Use setTimeout to ensure the DOM is fully rendered and clientWidth is available
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            left: tabIndex * scrollContainerRef.current.clientWidth,
            behavior: 'instant'
          });
        }
      }, 50);
    }
  }, [initialTab, location.state]);

  // Keep scroll position aligned on resize/rotation
  useEffect(() => {
    const handleResize = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          left: activeTab * scrollContainerRef.current.clientWidth,
          behavior: 'instant'
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  const handleScroll = (e) => {
    if (!e.target) return;
    const scrollLeft = e.target.scrollLeft;
    const clientWidth = e.target.clientWidth;
    const newIndex = Math.round(scrollLeft / clientWidth);
    if (newIndex !== activeTab && newIndex >= 0 && newIndex < tabs.length) {
      setActiveTab(newIndex);
    }
  };

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
    if (scrollContainerRef.current && !isTransitioningRef.current) {
      isTransitioningRef.current = true;
      scrollContainerRef.current.scrollTo({
        left: index * scrollContainerRef.current.clientWidth,
        behavior: 'smooth'
      });
      setActiveTab(index);
      
      // Lock swiping transitions for 400ms to prevent multi-page skips
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 400);
    }
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, []);

  // Custom Touch Gestures
  const handleTouchStart = (e) => {
    if (isTransitioningRef.current) return;
    if (e.target.closest('[data-swipe-block="true"]')) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    touchTriggeredRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (isTransitioningRef.current || touchTriggeredRef.current) return;
    if (e.target.closest('[data-swipe-block="true"]')) return;
    
    const diffX = e.touches[0].clientX - touchStartXRef.current;
    const diffY = e.touches[0].clientY - touchStartYRef.current;

    // Trigger horizontal swipe if horizontal movement is dominant and exceeds threshold
    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > 60) {
        touchTriggeredRef.current = true;
        if (diffX < 0) {
          if (activeTab < tabs.length - 1) {
            scrollToTab(activeTab + 1);
          }
        } else {
          if (activeTab > 0) {
            scrollToTab(activeTab - 1);
          }
        }
      }
    }
  };

  const handleWheel = (e) => {
    if (e.target.closest('[data-swipe-block="true"]')) return;
    if (Math.abs(e.deltaX) > 15) {
      if (!isTransitioningRef.current && !isWheelingRef.current) {
        isWheelingRef.current = true;
        if (e.deltaX > 0) {
          if (activeTab < tabs.length - 1) {
            scrollToTab(activeTab + 1);
          }
        } else {
          if (activeTab > 0) {
            scrollToTab(activeTab - 1);
          }
        }
      }

      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
      wheelTimeoutRef.current = setTimeout(() => {
        isWheelingRef.current = false;
      }, 150);
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
          <div className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-full transition-all duration-300 ease-out" 
               style={{ width: `${100 / tabs.length}%`, transform: `translateX(${activeTab * 100}%)` }} 
          />
        </div>
      </div>


      {/* ─── SWIPEABLE CONTENT CONTAINER ─── */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onWheel={handleWheel}
        className="flex overflow-x-hidden scrollbar-hide flex-1"
      >
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
              onScroll={handleTabScroll}
              className="w-full h-full flex-shrink-0 overflow-y-auto pb-28"
            >
              <Component isHub={true} {...extraProps} {...groupsProps} searchQuery={searchQuery} isFilterOpen={isFilterOpen} setIsFilterOpen={setIsFilterOpen} />
            </div>
          );
        })}
      </div>

      {/* ─── UNIFIED FAB ─── */}
      {renderFAB()}

    </div>
  );
};

export default SocialHubPage;
