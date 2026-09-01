import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDraggableScroll } from '../../../../hooks/useDraggableScroll';
import { Bell, Search, Calendar, Heart, Users, BookOpen, Briefcase, Vote, ChevronRight, MapPin, Shield, Crown, ImagePlus, ArrowRight, Plus, Sparkles, GraduationCap, HeartHandshake, Flame, User, Smile, Phone, MessageCircle, Clock, CalendarDays, Mail, Home, Wallet, Megaphone } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';
import { useData } from '../../context/DataProvider';
import { t } from '../../utils/translations';
import { StoryViewer } from '../../components/common/StoryViewer';
import { CityLandscape } from '../../components/common/CityLandscape';
import { mockAdmins as mockAdminsRaw } from '../../data/mockUsers';
// Static success stories for home page — matrimonial module shows community matches
const mockSuccessStories = [
  { id: 'ss1', groomName: 'Rajesh & Priya Agrawal', location: 'Indore', marriageDate: 'Feb 2026', avatar: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80', quote: 'Found our match on MeriSamaj within 3 months!' },
  { id: 'ss2', groomName: 'Vikram & Sunita Sharma', location: 'Bhopal', marriageDate: 'Apr 2026', avatar: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80', quote: 'Community filter made finding the right match easy.' },
  { id: 'ss3', groomName: 'Amit & Kavita Gupta', location: 'Delhi', marriageDate: 'Jun 2026', avatar: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80', quote: 'Our families connected through MeriSamaj. Grateful!' },
];

import ReferAndEarnBanner from './ReferAndEarnBanner';
import donationService from '../../../../core/api/donationService';
import { successStoryService } from '../../../../core/api/matrimonialService';
import { axiosPrivate } from '../../../../core/api/axiosPrivate';
import { AnimatedIconCards } from '../../components/common/AnimatedIconCards';



const OmIcon = ({ size, className }) => (
  <span style={{ fontSize: `${size}px`, lineHeight: 1 }} className={`${className} font-serif select-none`}>
    ॐ
  </span>
);

const DiyaIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2.5s-3 4-3 7.5c0 1.9 1.2 3.5 3 3.5s3-1.6 3-3.5c0-3.5-3-7.5-3-7.5z" />
    <path d="M4 14.5c0 3 3.5 5.5 8 5.5s8-2.5 8-5.5H4z" />
  </svg>
);

const quickActions = [
  { 
    icon: Briefcase, 
    label: 'Professional Network', 
    path: '/member/professional', 
    iconBg: 'bg-gradient-to-br from-[#D500F9] to-[#FF1744]', 
    hoverBorder: 'hover:border-[#D500F9]/40',
    hoverText: 'group-hover:text-[#FF1744]',
    hoverChevronBg: 'group-hover:bg-[#D500F9]',
    desc: 'Find jobs & hire within the community',
    bgImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80'
  },
  { 
    icon: BookOpen, 
    label: 'Directory', 
    path: '/member/directory', 
    iconBg: 'bg-gradient-to-br from-[#2979FF] to-[#00E5FF]', 
    hoverBorder: 'hover:border-[#2979FF]/40',
    hoverText: 'group-hover:text-[#2979FF]',
    hoverChevronBg: 'group-hover:bg-[#2979FF]',
    desc: 'Browse Samaj Members',
    bgImage: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=400&q=80'
  },
  { 
    icon: Users, 
    label: 'Groups', 
    path: '/member/social', 
    state: { tab: 'groups' },
    iconBg: 'bg-gradient-to-br from-[#E91E63] to-[#9C27B0]', 
    hoverBorder: 'hover:border-[#E91E63]/40',
    hoverText: 'group-hover:text-[#E91E63]',
    hoverChevronBg: 'group-hover:bg-[#E91E63]',
    desc: 'Discussions',
    bgImage: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?auto=format&fit=crop&w=400&q=80'
  },
  { 
    icon: Vote, 
    label: 'Voting', 
    path: '/member/voting', 
    iconBg: 'bg-gradient-to-br from-[#651FFF] to-[#3D5AFE]', 
    hoverBorder: 'hover:border-[#651FFF]/40',
    hoverText: 'group-hover:text-[#651FFF]',
    hoverChevronBg: 'group-hover:bg-[#651FFF]',
    desc: 'Community Polls',
    bgImage: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=400&q=80'
  },
  { 
    icon: Home, 
    label: 'Dharmashala', 
    path: '/member/dharmashala', 
    iconBg: 'bg-gradient-to-br from-[#00BFA5] to-[#00E676]', 
    hoverBorder: 'hover:border-[#00BFA5]/40',
    hoverText: 'group-hover:text-[#00BFA5]',
    hoverChevronBg: 'group-hover:bg-[#00BFA5]',
    desc: 'Book Rooms',
    bgImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80'
  },
  { 
    icon: Wallet, 
    label: 'Samaj Fund', 
    path: '/member/fund', 
    iconBg: 'bg-gradient-to-br from-[#FF9100] to-[#FFD600]', 
    hoverBorder: 'hover:border-[#FF9100]/40',
    hoverText: 'group-hover:text-[#FF9100]',
    hoverChevronBg: 'group-hover:bg-[#FF9100]',
    desc: 'Community Fund',
    bgImage: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=400&q=80'
  }
];

const HomePage = () => {
  const navigate = useNavigate();
  const { currentUser, members: mockMembers, admins: contextAdmins, posts: mockPosts, events: mockEvents, language, setLanguage, notifications, getUnreadCountForModule } = useData();
  const mockAdmins = contextAdmins && contextAdmins.length > 0 ? contextAdmins : mockAdminsRaw;
  const subHeadsRef = useDraggableScroll();
  const updatesScrollRef = useDraggableScroll();
  
  const [liveTopDonors, setLiveTopDonors] = useState([]);
  const [liveSuccessStories, setLiveSuccessStories] = useState([]);
  const [censusSummary, setCensusSummary] = useState(null);
  const [totalFundsAmount, setTotalFundsAmount] = useState(0);
  const [liveCommunityHead, setLiveCommunityHead] = useState(null);
  const [liveSubLeaders, setLiveSubLeaders] = useState([]);
  const [leadershipLoading, setLeadershipLoading] = useState(true);
  const [liveCensusBanner, setLiveCensusBanner] = useState(null);
  const [liveFooterArtwork, setLiveFooterArtwork] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    axiosPrivate.get('/member/census/summary')
      .then(res => {
        if (isMounted && res.data?.data?.summary) {
          setCensusSummary(res.data.data.summary);
        }
      })
      .catch(() => {});

    axiosPrivate.get('/member/leadership')
      .then(res => {
        if (isMounted && res.data?.success && res.data?.data) {
          setLiveCommunityHead(res.data.data.communityHead || null);
          if (Array.isArray(res.data.data.subLeaders)) setLiveSubLeaders(res.data.data.subLeaders);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLeadershipLoading(false);
      });

    donationService.getStats()
      .then(res => {
        if (isMounted) {
          if (Array.isArray(res.data?.topDonors) && res.data.topDonors.length > 0) {
            setLiveTopDonors(res.data.topDonors);
          }
          const rawAmount = res.data?.totalDonatedAmount || res.data?.summary?.totalDonatedAmount || 0;
          setTotalFundsAmount(rawAmount);
        }
      })
      .catch(() => {});
      
    const targetCommId = currentUser?.communityId?._id || currentUser?.communityId || (typeof currentUser?.community === 'string' && currentUser.community) || '';
    axiosPrivate.get('/member/app-content', { params: targetCommId ? { communityId: targetCommId } : {} })
      .then(res => {
        if (isMounted && res.data?.success && res.data?.data) {
          const appData = res.data.data;
          if (appData.heroBanner) {
            setHomepageContentSettings(prev => ({
              ...(prev || {}),
              hero: appData.heroBanner,
              exclusiveFeatures: appData.exclusiveFeatures
            }));
          }
          if (Array.isArray(appData.successStories) && appData.successStories.length > 0) {
            setLiveSuccessStories(appData.successStories);
          }
          if (appData.coreMembers?.communityHead) {
            setLiveCommunityHead(appData.coreMembers.communityHead);
          }
          if (Array.isArray(appData.coreMembers?.committee) && appData.coreMembers.committee.length > 0) {
            setLiveSubLeaders(appData.coreMembers.committee);
          }
          if (appData.censusBanner) {
            setLiveCensusBanner(appData.censusBanner);
          }
          if (appData.footerArtwork) {
            setLiveFooterArtwork(appData.footerArtwork);
          }
        }
      })
      .catch(() => {});

    return () => { isMounted = false; };
  }, [currentUser?.communityId]);

  const displayTopDonors = liveTopDonors;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning,' : hour < 18 ? 'Good afternoon,' : 'Good evening,';

  // Dynamic counts for quick actions (with 0 default if no unread)
  const invitationCount = getUnreadCountForModule('nimantran') || 0;
  const donationCount = getUnreadCountForModule('donation') || 0;
  const shradhanjaliCount = getUnreadCountForModule('shradhanjali') || 0;

  // Dynamic counts for summary cards
  const newBookingsCount = notifications?.filter(n => (n.type === 'booking' || n.category === 'dharamshala') && !n.isRead)?.length || 0;
  const newDonationsCount = notifications?.filter(n => n.type === 'donation' && !n.isRead)?.length || 0;
  const newNoticesCount = notifications?.filter(n => n.type === 'announcement' && !n.isRead)?.length || 0;
  const newEventsCount = notifications?.filter(n => n.type === 'event' && !n.isRead)?.length || 0;
  const totalUpdatesCount = notifications?.filter(n => !n.isRead)?.length || (newBookingsCount + newDonationsCount + newNoticesCount + newEventsCount);

  const formattedFunds = useMemo(() => {
    if (!totalFundsAmount || totalFundsAmount === 0) return '₹0';
    if (totalFundsAmount >= 100000) return `₹${(totalFundsAmount / 1000).toFixed(0)}k`;
    if (totalFundsAmount >= 1000) return `₹${(totalFundsAmount / 1000).toFixed(1)}k`;
    return `₹${totalFundsAmount}`;
  }, [totalFundsAmount]);

  const unreadCount = getUnreadCountForModule('home');
  const userCommunity = currentUser?.community || '';

  // Deriving isolated community ID
  const communityId = useMemo(() => {
    const comName = currentUser?.community;
    if (comName) {
      return comName.toLowerCase().replace(/\s/g, '_');
    }
    return 'cm_123';
  }, [currentUser]);

  const [homepageContentSettings, setHomepageContentSettings] = useState(null);

  const loadHomepageSettings = useCallback(() => {
    // 1. Check global key first
    const globalSaved = localStorage.getItem('merisamaj_global_homepage_content');
    if (globalSaved) {
      try {
        const parsed = JSON.parse(globalSaved);
        if (parsed && (parsed.hero || parsed.exclusiveFeatures)) {
          setHomepageContentSettings(parsed);
          return;
        }
      } catch (e) {}
    }

    // 2. Fallback to community specific key
    const keysToTry = [
      `community_settings_${communityId}`,
      `community_settings_${currentUser?.communityId}`,
      'community_settings_cm_123'
    ];

    for (const key of keysToTry) {
      if (!key) continue;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.homepageContent) {
            setHomepageContentSettings(parsed.homepageContent);
            return;
          }
        } catch (e) {}
      }
    }
  }, [communityId, currentUser]);

  useEffect(() => {
    loadHomepageSettings();
    const handleUpdate = () => loadHomepageSettings();
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('merisamaj_homepage_updated', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('merisamaj_homepage_updated', handleUpdate);
    };
  }, [loadHomepageSettings]);

  const mergedFeatures = useMemo(() => {
    const content = homepageContentSettings?.exclusiveFeatures;
    if (!Array.isArray(content) || content.length === 0) {
      return quickActions;
    }
    return [...content]
      .filter(f => f.enabled)
      .sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99))
      .map(f => {
        const matchedStatic = quickActions.find(qa => qa.path === f.path || qa.label.toLowerCase().includes(f.label.toLowerCase().substring(0, 4)));
        const isGroupFeature = f.path === '/member/groups' || f.label?.toLowerCase() === 'groups';
        return {
          label: f.label,
          desc: f.desc,
          path: isGroupFeature ? '/member/social' : f.path,
          state: isGroupFeature ? { tab: 'groups' } : (f.state || matchedStatic?.state),
          icon: LucideIcons[f.icon] || Briefcase,
          bgImage: f.bgImage || matchedStatic?.bgImage || 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=400&q=80'
        };
      });
  }, [homepageContentSettings, quickActions]);

  const communityPosts = [...mockPosts].sort((a, b) => {
    const aMatch = a.community === userCommunity ? 1 : 0;
    const bMatch = b.community === userCommunity ? 1 : 0;
    return bMatch - aMatch;
  }).slice(0, 10);

  const personalizedEvents = [...mockEvents].sort((a, b) => {
    const aInCity = currentUser?.city && a.venue?.toLowerCase().includes(currentUser.city.toLowerCase()) ? 1 : 0;
    const bInCity = currentUser?.city && b.venue?.toLowerCase().includes(currentUser.city.toLowerCase()) ? 1 : 0;
    return bInCity - aInCity;
  });

  const getCommunitySurnameLocal = (community) => {
    if (!community) return 'Agrawal';
    if (community.includes('Mali')) return 'Mali';
    if (community.includes('Gupta')) return 'Gupta';
    if (community.includes('Sharma')) return 'Sharma';
    if (community.includes('Jain')) return 'Jain';
    if (community.includes('Patel')) return 'Patel';
    if (community.includes('Verma')) return 'Verma';
    return 'Agrawal';
  };

  const displaySuccessStories = liveSuccessStories.length > 0 
    ? liveSuccessStories 
    : mockSuccessStories.map(story => {
        const surname = getCommunitySurnameLocal(userCommunity);
        return {
          ...story,
          groomName: story.groomName.replaceAll('Agrawal', surname).replaceAll('Jain', surname).replaceAll('Mali', surname).replaceAll('Gupta', surname).replaceAll('Sharma', surname).replaceAll('Patel', surname).replaceAll('Verma', surname)
        };
      });

  const getSamajImage = (community) => {
    const c = community.toLowerCase();
    const base = window.location.pathname.includes('/MeriSamaj') ? '/MeriSamaj/' : '/';
    if (c.includes('agrawal')) return `${base}assets/images/rajwada.png`;
    if (c.includes('mali')) return `${base}assets/images/mali.png`;
    if (c.includes('gupta')) return `${base}assets/images/gupta.png`;
    if (c.includes('sharma')) return `${base}assets/images/sharma.png`;
    if (c.includes('jain')) return `${base}assets/images/jain.png`;
    if (c.includes('patel')) return `${base}assets/images/patel.png`;
    if (c.includes('verma')) return `${base}assets/images/verma.png`;
    return `${base}assets/images/rajwada.png`; // fallback
  };

  const handleDonorClick = (donor) => {
    let targetUserId = donor.userId;
    if (!targetUserId) {
      const found = (mockMembers || []).find(m => m.name?.toLowerCase() === donor.name?.toLowerCase() || m.id === donor.id || m._id === donor.id) ||
                    (mockAdmins || []).find(a => a.name?.toLowerCase() === donor.name?.toLowerCase() || a.id === donor.id || a._id === donor.id) ||
                    (liveSubLeaders || []).find(sl => sl.name?.toLowerCase() === donor.name?.toLowerCase() || sl._id === donor.id) ||
                    (liveCommunityHead && liveCommunityHead.name?.toLowerCase() === donor.name?.toLowerCase() ? liveCommunityHead : null);
      if (found) {
        targetUserId = found._id || found.id;
      }
    }
    if (targetUserId) {
      navigate(`/member/directory/${targetUserId}`);
    } else {
      navigate('/member/directory');
    }
  };

  return (
    <div className="min-h-screen bg-surface pb-28">
      {/* ─── SAMAJ HERO BANNER ─── */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: '240px' }}>
        {/* Background Image — 100% natural, crisp, untouched as uploaded */}
        <img 
          src={
            currentUser?.communityId?.bannerUrl || 
            currentUser?.communityBanner || 
            homepageContentSettings?.hero?.backgroundImage || 
            getSamajImage(userCommunity)
          } 
          alt={userCommunity}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Floating Top Navbar */}
        <div className="relative z-10 px-4 pt-4 pb-2 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group bg-black/40 hover:bg-black/50 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/25 shadow-lg transition-all" 
            onClick={() => navigate('/member/profile')}
          >
            {/* Neutral Round Avatar Circle */}
            <div className="relative shrink-0">
              {currentUser?.avatar ? (
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name} 
                  className="w-11 h-11 rounded-full object-cover border-2 border-white/60 shadow-md group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div 
                  className="w-11 h-11 rounded-full bg-white/25 text-white font-black text-[15px] flex items-center justify-center backdrop-blur-md border border-white/40 shadow-md group-hover:scale-105 transition-transform duration-200"
                >
                  {(currentUser?.name || userCommunity).substring(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            <div className="text-left">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-extrabold tracking-wider uppercase text-white/90 drop-shadow-sm">{greeting}</span>
                <OmIcon size={11} className="text-amber-300 drop-shadow" />
              </div>
              <h1 className="text-[17px] sm:text-[19px] font-black text-white tracking-tight leading-tight drop-shadow-md">{currentUser?.name || 'Member'}</h1>
              {currentUser?.community && (
                <p className="text-[10.5px] font-bold text-amber-200 mt-0.5 leading-tight select-none flex items-center gap-1 drop-shadow-sm">
                  <MapPin size={10} className="text-amber-300" />
                  {currentUser.community}{currentUser.city ? ` · ${currentUser.city}` : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[11px] font-black uppercase press-scale transition-all bg-black/40 backdrop-blur-md border border-white/25 hover:bg-black/55 shadow-lg"
            >
              {language === 'en' ? 'HI' : 'EN'}
            </button>
            <button 
              className="relative w-9 h-9 rounded-xl flex items-center justify-center press-scale transition-all bg-black/40 backdrop-blur-md border border-white/25 hover:bg-black/55 text-white shadow-lg"
              onClick={() => navigate('/member/notifications?module=home')}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white font-black text-[9px] rounded-full border-2 border-black/40 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Samaj Identity Content — bottom of hero */}
        {(homepageContentSettings?.hero?.title || homepageContentSettings?.hero?.subtitle) && (
          <div className="relative z-10 px-4 pt-3 pb-3 flex flex-col justify-end text-left">
            <div className="bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/25 max-w-fit shadow-lg space-y-1">
              {homepageContentSettings?.hero?.title && (
                <h2 className="text-white text-[15px] font-extrabold tracking-tight drop-shadow-md">{homepageContentSettings.hero.title}</h2>
              )}
              {homepageContentSettings?.hero?.subtitle && (
                <p className="text-white/90 text-[11px] font-medium leading-snug drop-shadow-sm max-w-xs">{homepageContentSettings.hero.subtitle}</p>
              )}
              {homepageContentSettings?.hero?.buttonText && (
                <button 
                  onClick={() => navigate(homepageContentSettings.hero.buttonLink || '/member/directory')}
                  className="mt-1 px-3.5 py-1.5 bg-[#FF2162] hover:bg-[#E0144C] text-white text-[11px] font-bold rounded-xl flex items-center gap-1 transition-all press-scale shadow-md"
                >
                  {homepageContentSettings.hero.buttonText} <ChevronRight size={12} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>



      {/* Spacer */}
      <div className="h-4" />

      {/* ─── PROFILE COMPLETION CARD ─── */}
      {(() => {
        const getRemainingProfileSections = (user) => {
          if (!user) return [];
          const remaining = [];
          if (!user.qualification && !user.school) remaining.push({ name: 'Education Details', step: 'onboarding-4' });
          if (!user.profession && !user.company) remaining.push({ name: 'Profession Details', step: 'onboarding-5' });
          if (!user.detailedAddress && !user.houseNumber && !user.address && !user.streetAddress && !user.city) remaining.push({ name: 'Address Details', step: 'onboarding-6' });
          if (!user.isAadharVerified && !user.isFaceVerified) remaining.push({ name: 'Verification', step: 'onboarding-9' });
          if (!user.prefEducation && !user.prefAge && !user.prefOccupation) remaining.push({ name: 'Partner Preferences', step: 'onboarding-10' });
          return remaining;
        };

        const calculateCompletionForUser = (user) => {
          if (!user) return 0;
          let pct = 0;
          pct += 15; // Mobile verified
          if (user.community || user.communityId) pct += 15;
          if (user.name && (user.gender || user.dob)) pct += 20;
          if (user.qualification || user.school) pct += 10;
          if (user.profession || user.company) pct += 10;
          if (user.houseNumber || user.detailedAddress || user.address || user.streetAddress || user.alternatePhone || user.city) pct += 10;
          if (user.familyMembers && user.familyMembers.length > 0) pct += 10;
          if (user.isAadharVerified || user.isFaceVerified || user.prefEducation || user.prefAge || user.prefOccupation) pct += 10;
          return Math.min(pct, 100);
        };

        const remainingSections = getRemainingProfileSections(currentUser);
        const totalCount = remainingSections.length;
        const compPct = calculateCompletionForUser(currentUser);

        if (totalCount === 0) return null;

        return (
          <div className="px-3 mb-4 animate-fade-in-up">
            <div className="bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#5B21B6] rounded-[24px] p-4 text-white shadow-[0_8px_30px_rgb(124,58,237,0.15)] relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-white/5 rounded-full blur-xl" />
              <div className="absolute left-1/3 top-0 w-20 h-20 bg-purple-300/10 rounded-full blur-xl" />
              
              <div className="flex items-center gap-3.5 relative z-10">
                <div className="w-11 h-11 bg-white/15 backdrop-blur-md rounded-full flex items-center justify-center shrink-0 border border-white/10">
                  <Sparkles size={18} className="text-purple-200 animate-pulse" />
                </div>
                
                <div className="flex-1 min-w-0 text-left">
                  <h3 className="text-xs font-black tracking-tight leading-tight">Complete Your Profile</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-1.5 w-24 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-400 rounded-full" style={{ width: `${compPct}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-purple-200">{compPct}% done</span>
                  </div>
                  <p className="text-[9px] text-purple-205/70 font-semibold mt-1 truncate">
                    {totalCount} section{totalCount !== 1 ? 's' : ''} remaining (Education, Profession, etc.)
                  </p>
                </div>

                <button
                  onClick={() => {
                    localStorage.setItem('merisamaj_onboarding_from_home', 'true');
                    localStorage.setItem('merisamaj_onboarding_resume_step', 'onboarding-1');
                    navigate('/member/onboarding');
                  }}
                  className="bg-white hover:bg-purple-50 text-purple-900 text-[11px] font-extrabold px-3.5 py-2.5 rounded-xl flex items-center gap-1 shrink-0 transition-all press-scale shadow-sm"
                >
                  Continue <ArrowRight size={13} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── INTERACTIVE HIGHLIGHTS MODULE ─── */}
      <AnimatedIconCards
        invitationCount={invitationCount}
        donationCount={donationCount}
        shradhanjaliCount={shradhanjaliCount}
        onNavigate={navigate}
      />


      {/* ─── TOP 5 DONORS SECTION ─── */}
      <div className="px-3 mt-6 relative z-10 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#FF2162] to-[#FF4D85] shadow-[0_4px_12px_rgba(255,33,98,0.25)] border border-[#FF2162]/20">
                <Heart className="text-white animate-pulse" size={13} fill="currentColor" />
              </div>
            </div>
            <h3 className="text-[15px] font-extrabold text-text-primary tracking-tight">Top 5 Recent Donors</h3>
          </div>
          <button 
            onClick={() => navigate('/member/donation/donors')} 
            className="text-[11px] font-bold text-[#FF2162] flex items-center gap-0.5 hover:underline press-scale"
          >
            View All <ChevronRight size={13} strokeWidth={2.5} />
          </button>
        </div>

        {displayTopDonors.length === 0 ? (
          <div className="py-6 px-3 text-center bg-white rounded-2xl border border-slate-100 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-2">
              <Heart size={18} className="text-[#FF2162]" fill="currentColor" />
            </div>
            <p className="text-xs font-bold text-slate-800">No Donors Yet</p>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5 max-w-[220px] mx-auto">
              No donations recorded yet in your community. Be the first to contribute!
            </p>
            <button
              onClick={() => navigate('/member/donation')}
              className="mt-3 px-4 py-2 bg-[#FF2162] hover:bg-[#E0144C] text-white text-[11px] font-bold rounded-xl press-scale shadow-sm"
            >
              Explore Campaigns
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {[...displayTopDonors].sort((a, b) => b.amount - a.amount).slice(0, 5).map((donor, idx) => {
              // Select color themes and icons for purposes
              const purposeStr = (donor.purpose || '').toLowerCase();
              const paymentModeStr = (donor.paymentMode || 'Online (UPI)').toLowerCase();
              let purposeIcon = <Home size={11} className="text-amber-500" />;
              let purposeBg = 'bg-amber-50';
              if (purposeStr.includes('schola') || purposeStr.includes('chhatra')) {
                purposeIcon = <GraduationCap size={11} className="text-purple-500" />;
                purposeBg = 'bg-purple-50';
              } else if (purposeStr.includes('gaushala') || purposeStr.includes('cow')) {
                purposeIcon = <span className="text-[10px] leading-none">🐄</span>;
                purposeBg = 'bg-orange-50';
              } else if (purposeStr.includes('vivah') || purposeStr.includes('marri')) {
                purposeIcon = <Heart size={10} className="text-rose-500" fill="currentColor" />;
                purposeBg = 'bg-rose-50';
              } else if (purposeStr.includes('shiksha') || purposeStr.includes('edu')) {
                purposeIcon = <BookOpen size={11} className="text-blue-500" />;
                purposeBg = 'bg-blue-50';
              }

              // Badges for payments
              let paymentBadge = (
                <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100/50">
                  <span>Online (UPI)</span>
                </div>
              );
              if (paymentModeStr.includes('bank')) {
                paymentBadge = (
                  <div className="flex items-center gap-1 text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100/50">
                    <span>Bank Transfer</span>
                  </div>
                );
              } else if (paymentModeStr.includes('cash')) {
                paymentBadge = (
                  <div className="flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100/50">
                  <span>Cash</span>
                </div>
                );
              }

              // Rank Badge color & 3D styling
              const rankGradients = [
                'from-[#FF2162] to-[#FF4D85] shadow-[0_3px_8px_rgba(255,33,98,0.25)]',
                'from-[#A78BFA] to-[#C4B5FD] shadow-[0_3px_8px_rgba(167,139,250,0.2)]',
                'from-[#F59E0B] to-[#FBBF24] shadow-[0_3px_8px_rgba(245,158,11,0.2)]',
                'from-[#94A3B8] to-[#CBD5E1] shadow-[0_3px_6px_rgba(148,163,184,0.15)]',
                'from-[#94A3B8] to-[#CBD5E1] shadow-[0_3px_6px_rgba(148,163,184,0.15)]'
              ];
              const rankGrad = rankGradients[idx] || rankGradients[4];

              return (
                <motion.div
                  key={donor.id || `donor-${idx}`}
                  whileHover={{ y: -2, scale: 1.01, boxShadow: '0 6px 20px rgba(124,58,237,0.06)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleDonorClick(donor)}
                  className="group/donor flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-100/80 hover:border-purple-200/90 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {/* 3D Rank Badge */}
                    <div className={`w-[22px] h-[22px] rounded-lg bg-gradient-to-br ${rankGrad} text-white flex items-center justify-center text-[10px] font-black tracking-tight border border-white/20 select-none shrink-0`}>
                      {idx + 1}
                    </div>

                    {/* Avatar with Glow Rings */}
                    <div className="relative shrink-0">
                      <div className="w-[42px] h-[42px] rounded-full overflow-hidden border border-purple-100/80 group-hover/donor:border-[#FF2162]/50 p-[1.5px] bg-white transition-colors">
                        {donor.avatar ? (
                          <img src={donor.avatar} alt={donor.name} className="w-full h-full object-cover rounded-full group-hover/donor:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full rounded-full bg-purple-50 text-brand-primary flex items-center justify-center text-[11px] font-black uppercase">
                            {donor.initials}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Details: Name, Purpose, Date */}
                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-extrabold text-slate-800 group-hover/donor:text-[#FF2162] tracking-tight leading-tight transition-colors">
                          {donor.name}
                        </span>
                        <span className="text-[9px] font-bold text-purple-600/75 opacity-0 group-hover/donor:opacity-100 transition-opacity flex items-center">
                          Profile <ChevronRight size={10} strokeWidth={3} />
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {/* Purpose badge */}
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${purposeBg} border border-purple-100/10`}>
                            {purposeIcon}
                          </span>
                          <span className="text-[9px] font-bold text-slate-500 truncate max-w-[130px] leading-tight">
                            {donor.purpose}
                          </span>
                        </div>
                        {/* Date info */}
                        <div className="flex items-center gap-1 text-[8.5px] font-semibold text-slate-400 leading-tight">
                          <Calendar size={8} className="text-slate-400" />
                          <span>{donor.date}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Amount and Payment Mode */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-[14px] font-black text-emerald-600 leading-none tracking-tight">
                      ₹{new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(donor.amount)}
                    </span>
                    {paymentBadge}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── TODAY'S UPDATES SECTION ─── */}
      <div className="mt-5 relative z-10">
        {/* Header */}
        <div className="px-3 flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.15)' }}>
                <Bell className="text-brand-primary" size={14} strokeWidth={2.5} />
              </div>
              {totalUpdatesCount > 0 && (
                <div className="absolute -top-1 -right-1 w-[14px] h-[14px] rounded-full bg-gradient-to-br from-red-400 to-rose-600 border border-white flex items-center justify-center">
                  <span className="text-[7px] text-white font-black">{totalUpdatesCount > 9 ? '9+' : totalUpdatesCount}</span>
                </div>
              )}
            </div>
            <h3 className="text-[15px] font-bold text-text-primary tracking-tight">Today's Updates</h3>
          </div>
          <button onClick={() => navigate('/member/notifications')} className="flex items-center gap-1 text-[11px] font-bold text-brand-primary press-scale px-2.5 py-1 rounded-xl" style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.12)' }}>
            View All <ChevronRight size={13} />
          </button>
        </div>

        {/* Premium metric pill cards */}
        <div className="mx-3 rounded-[24px] overflow-hidden" style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(124,58,237,0.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 20px -4px rgba(124,58,237,0.08), 0 12px 32px -8px rgba(124,58,237,0.05)' }}>
          <div className="flex items-stretch">
            {/* New Bookings */}
            <div onClick={() => navigate('/member/dharmashala')} className="flex flex-col items-center justify-center text-center cursor-pointer press-scale flex-1 py-3.5 gap-1.5 relative overflow-hidden group">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.06) 0%, transparent 70%)' }} />
              <div className="w-8 h-8 rounded-[12px] flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <Home className="text-emerald-500" size={14} strokeWidth={2.5} />
              </div>
              <span className="text-[14px] font-black text-text-primary leading-none">{newBookingsCount}</span>
              <span className="text-[8px] font-semibold text-text-muted leading-tight">Bookings</span>
            </div>

            <div className="w-[1px] self-stretch my-3" style={{ background: 'linear-gradient(180deg, transparent, rgba(124,58,237,0.1), transparent)' }} />

            {/* New Funds Received */}
            <div onClick={() => navigate('/member/fund')} className="flex flex-col items-center justify-center text-center cursor-pointer press-scale flex-1 py-3.5 gap-1.5 relative overflow-hidden group">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.06) 0%, transparent 70%)' }} />
              <div className="w-8 h-8 rounded-[12px] flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.15)' }}>
                <Wallet className="text-brand-primary" size={14} strokeWidth={2.5} />
              </div>
              <span className="text-[14px] font-black text-text-primary leading-none tracking-tight">{formattedFunds}</span>
              <span className="text-[8px] font-semibold text-text-muted leading-tight">Funds</span>
            </div>

            <div className="w-[1px] self-stretch my-3" style={{ background: 'linear-gradient(180deg, transparent, rgba(124,58,237,0.1), transparent)' }} />

            {/* New Contributions */}
            <div onClick={() => navigate('/member/donation')} className="flex flex-col items-center justify-center text-center cursor-pointer press-scale flex-1 py-3.5 gap-1.5 relative overflow-hidden group">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'radial-gradient(ellipse at center, rgba(244,63,94,0.06) 0%, transparent 70%)' }} />
              <div className="w-8 h-8 rounded-[12px] flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.15)' }}>
                <Heart className="text-rose-500" size={14} strokeWidth={2.5} />
              </div>
              <span className="text-[14px] font-black text-text-primary leading-none">{newDonationsCount}</span>
              <span className="text-[8px] font-semibold text-text-muted leading-tight">Donations</span>
            </div>

            <div className="w-[1px] self-stretch my-3" style={{ background: 'linear-gradient(180deg, transparent, rgba(124,58,237,0.1), transparent)' }} />

            {/* Important Notice */}
            <div onClick={() => navigate('/member/notifications')} className="flex flex-col items-center justify-center text-center cursor-pointer press-scale flex-1 py-3.5 gap-1.5 relative overflow-hidden group">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.06) 0%, transparent 70%)' }} />
              <div className="w-8 h-8 rounded-[12px] flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <Megaphone className="text-amber-500" size={14} strokeWidth={2.5} />
              </div>
              <span className="text-[14px] font-black text-text-primary leading-none">{newNoticesCount}</span>
              <span className="text-[8px] font-semibold text-text-muted leading-tight">Notices</span>
            </div>

            <div className="w-[1px] self-stretch my-3" style={{ background: 'linear-gradient(180deg, transparent, rgba(124,58,237,0.1), transparent)' }} />

            {/* New Events */}
            <div onClick={() => navigate('/member/events')} className="flex flex-col items-center justify-center text-center cursor-pointer press-scale flex-1 py-3.5 gap-1.5 relative overflow-hidden group">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.06) 0%, transparent 70%)' }} />
              <div className="w-8 h-8 rounded-[12px] flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <Calendar className="text-blue-500" size={14} strokeWidth={2.5} />
              </div>
              <span className="text-[14px] font-black text-text-primary leading-none">{newEventsCount}</span>
              <span className="text-[8px] font-semibold text-text-muted leading-tight">Events</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── CENSUS DASHBOARD BANNER ─── */}
      {liveCensusBanner?.enabled !== false && (
        <div className="px-3 mt-5 relative z-10">
          <div
            onClick={() => navigate('/member/census')}
            className="w-full rounded-[28px] shadow-xl shadow-purple-500/15 border border-purple-400/20 text-white relative overflow-hidden cursor-pointer press-scale"
            style={{
              background: liveCensusBanner?.backgroundImage
                ? `url("${liveCensusBanner.backgroundImage}") center/cover no-repeat`
                : 'linear-gradient(135deg, #4C1D95 0%, #6D28D9 50%, #7C3AED 100%)'
            }}
          >
            {/* Darkness & Tint Gradient Overlay */}
            <div 
              className="absolute inset-0 z-0 pointer-events-none" 
              style={{
                background: liveCensusBanner?.overlayGradient === 'dark'
                  ? `linear-gradient(135deg, rgba(15,23,42,${(liveCensusBanner?.overlayOpacity ?? 75)/100}) 0%, rgba(30,27,75,${(liveCensusBanner?.overlayOpacity ?? 75)/100}) 100%)`
                  : liveCensusBanner?.overlayGradient === 'royal'
                  ? `linear-gradient(135deg, rgba(30,17,69,${(liveCensusBanner?.overlayOpacity ?? 75)/100}) 0%, rgba(49,46,129,${(liveCensusBanner?.overlayOpacity ?? 75)/100}) 100%)`
                  : liveCensusBanner?.overlayGradient === 'magenta'
                  ? `linear-gradient(135deg, rgba(131,24,67,${(liveCensusBanner?.overlayOpacity ?? 75)/100}) 0%, rgba(76,5,25,${(liveCensusBanner?.overlayOpacity ?? 75)/100}) 100%)`
                  : `linear-gradient(135deg, rgba(76,29,149,${(liveCensusBanner?.overlayOpacity ?? 75)/100}) 0%, rgba(109,40,217,${(liveCensusBanner?.overlayOpacity ?? 75)/100}) 50%, rgba(124,58,237,${(liveCensusBanner?.overlayOpacity ?? 75)/100}) 100%)`
              }}
            />

            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-300/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

            <div className="relative z-10 p-4 pb-2 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-white/15 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-white/10 backdrop-blur-md">
                  Community Census
                </span>
              </div>
              <h3 className="text-[19px] font-bold leading-tight tracking-tight">
                Community Census Dashboard
              </h3>
              <p className="text-white/65 text-[11px] mt-1.5 font-medium leading-snug">
                Detailed breakdown of total members, men, women &amp; children with percentage
              </p>
              
              <button
                onClick={(e) => { e.stopPropagation(); navigate('/member/census'); }}
                className="mt-3 mb-1 px-4 py-1.5 bg-white/12 hover:bg-white/20 border border-white/20 rounded-xl text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors backdrop-blur-md"
              >
                View Details <ArrowRight size={12} />
              </button>
            </div>

            <div className="relative w-[110px] h-[110px] shrink-0 flex items-center justify-center select-none pointer-events-none mr-1">
              <svg viewBox="0 0 160 160" className="w-full h-full">
                <rect x="35" y="25" width="90" height="110" rx="8" fill="#ffffff" />
                <path d="M65 25c0-4 3-7 7-7h26c4 0 7 3 7 7v4H65v-4z" fill="#cbd5e1" />
                <rect x="73" y="15" width="14" height="6" rx="2" fill="#94a3b8" />
                <circle cx="70" cy="55" r="18" fill="#7C3AED" />
                <path d="M70 55 L70 37 A18 18 0 0 1 88 55 Z" fill="#F59E0B" />
                <path d="M70 55 L88 55 A18 18 0 0 1 70 73 Z" fill="#10b981" />
                <path d="M70 55 L70 73 A18 18 0 0 1 52 55 Z" fill="#A78BFA" />
                <rect x="43" y="80" width="30" height="3" rx="1.5" fill="#e2e8f0" />
                <rect x="43" y="87" width="20" height="3" rx="1.5" fill="#e2e8f0" />
                <rect x="97" y="65" width="5" height="25" rx="1" fill="#93c5fd" />
                <rect x="105" y="55" width="5" height="35" rx="1" fill="#8B5CF6" />
                <rect x="113" y="72" width="5" height="18" rx="1" fill="#c084fc" />
                <g transform="translate(10, 10)">
                  <line x1="120" y1="120" x2="145" y2="145" stroke="#374151" strokeWidth="9" strokeLinecap="round" />
                  <circle cx="105" cy="105" r="22" fill="#ffffff" stroke="#374151" strokeWidth="6" />
                  <circle cx="105" cy="105" r="19" fill="#f8fafc" />
                  <rect x="95" y="105" width="4" height="12" rx="1" fill="#10b981" />
                  <rect x="102" y="96" width="4" height="21" rx="1" fill="#f59e0b" />
                  <rect x="109" y="101" width="4" height="16" rx="1" fill="#7C3AED" />
                </g>
              </svg>
              
              <div className="absolute bottom-1 left-0 flex items-end">
                <svg viewBox="0 0 24 32" className="w-8 h-10 drop-shadow-md -mr-1.5">
                  <circle cx="12" cy="7" r="6" fill="#7C3AED" />
                  <path d="M2 28c0-6 4-11 10-11s10 5 10 11" fill="#7C3AED" />
                </svg>
                <svg viewBox="0 0 24 32" className="w-8 h-10 drop-shadow-md z-10 -mr-1.5">
                  <circle cx="12" cy="6" r="6" fill="#ec4899" />
                  <path d="M4 30c0-7 3-12 8-12s8 5 8 12" fill="#ec4899" />
                </svg>
                <svg viewBox="0 0 24 32" className="w-6 h-8 drop-shadow-md">
                  <circle cx="12" cy="6" r="5" fill="#10b981" />
                  <path d="M4 28c0-5 3-9 8-9s8 4 8 9" fill="#10b981" />
                </svg>
              </div>

              <div className="absolute top-1 right-1 w-7 h-7 rounded-full bg-purple-400/80 border border-white/20 flex items-center justify-center shadow-md">
                <Users size={12} className="text-white" />
              </div>
            </div>
          </div>

          <div className="relative z-10 mx-2 mb-2 bg-white/8 backdrop-blur-md rounded-2xl border border-white/10 grid grid-cols-4 divide-x divide-white/10">
            {(() => {
              const total = censusSummary?.totalMembers || 0;
              const males = censusSummary?.malesCount || 0;
              const females = censusSummary?.femalesCount || 0;
              const kids = censusSummary?.kidsCount || 0;

              const malePct = total > 0 ? Math.round((males / total) * 100) : 52;
              const femalePct = total > 0 ? Math.round((females / total) * 100) : 38;
              const kidsPct = total > 0 ? Math.round((kids / total) * 100) : 10;

              return [
                {
                  icon: <Users size={15} className="text-white" />,
                  iconBg: 'bg-purple-400/30',
                  value: total > 0 ? `${total}` : '100%',
                  label: 'Total Members',
                  sublabel: total > 0 ? 'Verified Count' : 'Total Count',
                  bar: 'bg-purple-300',
                  barPct: 100
                },
                {
                  icon: <User size={15} className="text-white" />,
                  iconBg: 'bg-blue-400/30',
                  value: `${malePct}%`,
                  label: 'Men',
                  sublabel: total > 0 ? `${males} members` : '% of Total',
                  bar: 'bg-blue-300',
                  barPct: malePct
                },
                {
                  icon: <User size={15} className="text-white" />,
                  iconBg: 'bg-pink-400/30',
                  value: `${femalePct}%`,
                  label: 'Women',
                  sublabel: total > 0 ? `${females} members` : '% of Total',
                  bar: 'bg-pink-300',
                  barPct: femalePct
                },
                {
                  icon: <Smile size={15} className="text-white" />,
                  iconBg: 'bg-green-400/30',
                  value: `${kidsPct}%`,
                  label: 'Children',
                  sublabel: total > 0 ? `${kids} kids` : '(0-17 yrs)',
                  bar: 'bg-green-300',
                  barPct: kidsPct
                },
              ];
            })().map((stat, i) => (
              <div key={i} className="flex flex-col items-center py-2.5 px-1 gap-0.5">
                <div className={`w-8 h-8 rounded-xl ${stat.iconBg} flex items-center justify-center mb-0.5 border border-white/10`}>
                  {stat.icon}
                </div>
                <span className="text-[14px] font-bold text-white leading-none">{stat.value}</span>
                <span className="text-[8px] font-medium text-white/80 text-center leading-tight">{stat.label}</span>
                <div className="w-full px-1 mt-0.5">
                  <div className="h-[2px] w-full bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${stat.bar} rounded-full`} style={{ width: `${stat.barPct}%` }} />
                  </div>
                </div>
                <span className="text-[7px] text-white/50 text-center leading-tight">{stat.sublabel}</span>
              </div>
            ))}
          </div>

          <div className="relative z-10 mx-2 mb-2 px-3 py-1.5 bg-white/6 border border-white/8 rounded-xl flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-white">i</span>
            </div>
            <p className="text-[10px] text-white/60 font-medium leading-tight">
              View detailed community member count &amp; percentage breakdown in this dashboard.
            </p>
          </div>
        </div>
      </div>
      )}
      {/* ─── END CENSUS DASHBOARD BANNER ─── */}

      {/* ─── BENTO GRID (QUICK ACTIONS) ─── */}
      <div className="px-3 mt-6 relative z-10">
        <div className="flex items-center justify-between mb-4 px-0.5">
          <h3 className="text-[13px] font-black text-text-secondary tracking-widest uppercase">Exclusive Features</h3>
          <div className="h-[1.5px] flex-1 mx-3 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.15), transparent)' }} />
          <span className="text-[10px] font-bold tracking-wider" style={{ color: 'rgba(124,58,237,0.5)' }}>{mergedFeatures.length} FEATURES</span>
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          {mergedFeatures.map((action, idx) => (
            <motion.button
              key={action.label}
              onClick={() => {
                if (action.path === '/member/groups' || action.state?.tab === 'groups' || action.label?.toLowerCase() === 'groups') {
                  navigate('/member/social', { state: { tab: 'groups' } });
                } else {
                  navigate(action.path, action.state ? { state: action.state } : undefined);
                }
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + (idx * 0.05), type: 'spring', stiffness: 300, damping: 25 }}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className={`rounded-[28px] bg-white text-left w-full flex flex-col justify-between min-h-[160px] relative overflow-hidden group shadow-lg`}
              style={{ padding: '18px' }}
            >
              {/* Background Image & Overlay */}
              <img 
                src={action.bgImage} 
                alt={action.label} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-black/15 transition-opacity duration-300 group-hover:bg-black/25" />

              {/* Icon & Arrow Row */}
              <div className="w-full flex items-center justify-between z-10 relative">
                <div 
                  className={`w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 icon-squircle shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 group-hover:bg-white/30`}
                  style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.4)' }}
                >
                  <action.icon size={22} className="text-white relative z-10 drop-shadow-md" strokeWidth={2.2} />
                </div>
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-all duration-300 bg-white/20 backdrop-blur-sm border border-white/30 group-hover:bg-white group-hover:border-white`}
                >
                  <ChevronRight size={14} className="text-white group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all duration-300" />
                </div>
              </div>

              {/* Text content - styled with text shadow directly over clear background */}
              <div className="mt-4 z-10 relative text-left">
                <span 
                  className="font-black text-white leading-snug tracking-tight block text-[15px]"
                  style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.9), 0 1px 3px rgba(0, 0, 0, 0.9)' }}
                >
                  {action.label}
                </span>
                <span 
                  className="text-[11px] font-bold text-white/95 mt-1 block leading-tight"
                  style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.9)' }}
                >
                  {action.desc}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ─── SECTION DIVIDER ─── */}
      <div className="mx-3 mt-8 mb-6 h-[1px] bg-gradient-to-r from-transparent via-purple-200/40 to-transparent" />

      {/* ─── MATRIMONY SUCCESS STORIES ─── */}
      <div className="px-0 relative z-10">
        <div className="px-3 flex items-center justify-between mb-4">
          <h3 className="text-[17px] font-bold text-text-primary tracking-tight">Success Stories</h3>
          <button onClick={() => navigate('/member/matrimonial')} className="text-[13px] text-pink-600 font-bold press-scale flex items-center gap-0.5">
            Find Your Perfect Match <ChevronRight size={16} />
          </button>
        </div>
        
        {/* Featured Story */}
        {displaySuccessStories.length > 0 && displaySuccessStories[0].featured && (
          <div className="px-3 mb-4">
            <div 
              onClick={() => navigate(displaySuccessStories[0]._id ? `/member/matrimonial/success-stories/${displaySuccessStories[0]._id}` : '/member/matrimonial')}
              className="w-full h-[220px] rounded-[24px] relative overflow-hidden shadow-lg shadow-purple-500/15 cursor-pointer active:scale-[0.98] transition-transform border border-purple-100/20"
            >
              <img src={displaySuccessStories[0].coverImage || displaySuccessStories[0].avatar} alt={displaySuccessStories[0].title || displaySuccessStories[0].groomName} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute inset-0 p-5 flex flex-col justify-end">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1"><LucideIcons.Star size={12} fill="currentColor" /> Featured Match</span>
                </div>
                <h4 className="text-white text-[24px] font-serif font-bold leading-tight drop-shadow-md">
                  {displaySuccessStories[0].title || displaySuccessStories[0].groomName}
                </h4>
                <p className="text-white/80 text-[13px] font-medium mt-1">
                  {displaySuccessStories[0].shortDescription || `Married in ${displaySuccessStories[0].marriageDate}`}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-3 pb-4 px-3">
          {displaySuccessStories.filter(s => !s.featured).map((story, idx) => (
            <div 
              key={story.id || story._id || `story-${idx}`} 
              onClick={() => navigate(story._id ? `/member/matrimonial/success-stories/${story._id}` : '/member/matrimonial')}
              className="snap-center shrink-0 w-[275px] h-[340px] rounded-[28px] relative overflow-hidden shadow-lg shadow-purple-500/10 active:scale-[0.98] transition-transform cursor-pointer border border-white/10"
            >
              <img src={story.coverImage || story.avatar} alt={story.title || story.groomName} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
              
              <div className="absolute inset-0 p-5 flex flex-col justify-end">
                <div className="bg-pink-500/85 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest inline-flex self-start mb-3 shadow-sm border border-pink-400/40">
                  {story.tag || 'Met through Samaj Matrimony'}
                </div>
                <h4 className="text-white text-[21px] font-serif font-bold leading-tight drop-shadow-md">
                  {story.title || (story.groomId && story.brideId ? `${story.groomId.name} & ${story.brideId.name}` : story.groomName)}
                </h4>
                <p className="text-white/75 text-[12px] font-medium mt-1 drop-shadow-sm flex items-center gap-1.5">
                  <Heart size={12} className="text-pink-400" fill="currentColor" /> 
                  Married in {story.weddingDate ? (isNaN(new Date(story.weddingDate).getTime()) ? story.weddingDate : new Date(story.weddingDate).toLocaleDateString()) : (story.marriageDate || '2024')}
                </p>
                <div className="mt-3 pt-3 border-t border-white/15">
                  <p className="text-white/85 text-[13px] italic font-medium leading-snug drop-shadow-sm line-clamp-3">
                    "{story.quote || story.shortDescription}"
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── SECTION DIVIDER ─── */}
      <div className="mx-3 mt-6 mb-6 h-[1px] bg-gradient-to-r from-transparent via-purple-200/40 to-transparent" />

      {/* ─── YOUR LEADERS (Samaj Netrutva) ─── */}
      <div className="px-3 mb-8">
        {(() => {
          const rawRole = liveCommunityHead?.designation || liveCommunityHead?.role;
          const headRole = (!rawRole || rawRole.toLowerCase() === 'member') ? 'Community Head' : rawRole;

          const president = liveCommunityHead ? {
            id: liveCommunityHead._id,
            name: liveCommunityHead.name,
            role: headRole,
            city: liveCommunityHead.city || '',
            state: liveCommunityHead.state || '',
            phone: liveCommunityHead.phone || '',
            avatar: liveCommunityHead.avatar || liveCommunityHead.cover || (currentUser?.role === 'head' ? currentUser?.avatar : '')
          } : null;

          const defaultLeaderPhoto = 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80';
          const leaderAvatarPhoto = (president?.avatar && !president.avatar.includes('ui-avatars.com'))
            ? president.avatar
            : defaultLeaderPhoto;

          const coreCommittee = (liveSubLeaders && liveSubLeaders.length > 0) ? liveSubLeaders.map(sl => ({
            id: sl._id || sl.id,
            name: sl.name,
            role: sl.designation || sl.role || 'Executive Member',
            city: sl.city || '',
            phone: sl.phone || '',
            avatar: sl.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(sl.name)}&background=6C3BFF&color=ffffff&bold=true`
          })) : [];

          return (
            <div className="flex flex-col gap-5">
              {/* Core Committee Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[18px] font-bold text-text-primary tracking-tight">Core Members</h3>
                  <p className="text-[12px] text-text-secondary font-medium">Core Committee</p>
                </div>
                <button onClick={() => navigate('/member/leadership')} className="text-[13px] text-brand-primary font-bold press-scale flex items-center gap-1">
                  View All <ChevronRight size={16} />
                </button>
              </div>

              {/* President / Community Head Section */}
              {leadershipLoading ? (
                <div className="relative w-full rounded-[24px] bg-gradient-to-r from-[#1e1145] via-[#2d1b69] to-[#4C1D95] border border-purple-400/10 p-5 shrink-0 min-h-[170px] flex flex-col justify-between animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-white/20" />
                    <div className="h-4 bg-white/20 rounded-full w-24" />
                  </div>
                  <div className="space-y-2 mt-4">
                    <div className="h-5 bg-white/20 rounded-md w-40" />
                    <div className="h-3 bg-white/10 rounded-md w-28" />
                  </div>
                  <div className="flex gap-2 w-full mt-4">
                    <div className="flex-1 h-7 bg-white/15 rounded-xl" />
                    <div className="flex-1 h-7 bg-white/15 rounded-xl" />
                  </div>
                </div>
              ) : !president ? (
                <div className="relative w-full rounded-[24px] bg-gradient-to-r from-[#1e1145] via-[#2d1b69] to-[#4C1D95] border border-purple-400/10 p-5 shrink-0 min-h-[170px] flex flex-col justify-center items-start shadow-xl shadow-purple-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-full border-2 border-amber-400/60 flex items-center justify-center bg-black/20 shrink-0">
                      <Crown size={16} className="text-amber-400 fill-amber-400" />
                    </div>
                    <span className="bg-purple-500/80 text-white text-[9px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider border border-purple-400/30">
                      Community Leadership
                    </span>
                  </div>
                  <h4 className="text-white text-[16px] font-bold leading-tight mt-1">No Head Assigned Yet</h4>
                  <p className="text-purple-200/70 text-[11px] font-medium mt-1">Community head appointment is currently pending.</p>
                </div>
              ) : (
                <div 
                  onClick={() => navigate('/member/leadership', { state: { selectedId: president.id } })}
                  className="relative w-full rounded-[24px] bg-gradient-to-r from-[#1e1145] via-[#2d1b69] to-[#4C1D95] shadow-xl shadow-purple-500/10 border border-purple-400/10 overflow-hidden p-5 shrink-0 cursor-pointer active:scale-[0.99] transition-all duration-300 min-h-[170px]"
                >
                  {/* Full-height blended portrait photo on right */}
                  <img 
                    src={leaderAvatarPhoto} 
                    className="absolute right-0 top-0 bottom-0 w-[58%] h-full object-cover object-[center_20%] pointer-events-none z-0" 
                    style={{
                      WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.05) 8%, rgba(0,0,0,0.85) 60%, black 100%)',
                      maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.05) 8%, rgba(0,0,0,0.85) 60%, black 100%)'
                    }}
                    alt={president.name} 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = defaultLeaderPhoto;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#1e1145] via-[#2d1b69]/70 via-[#2d1b69]/15 to-transparent pointer-events-none z-0" />

                  {/* Left content */}
                  <div className="relative z-10 flex flex-col justify-between h-full max-w-[62%]">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full border-2 border-amber-400/60 flex items-center justify-center bg-black/20 shadow-sm shrink-0">
                        <Crown size={16} className="text-amber-400 fill-amber-400" />
                      </div>
                      <span className="bg-purple-500/80 backdrop-blur-sm text-white text-[9px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider border border-purple-400/30 truncate">
                        {president.role || 'Community Head'}
                      </span>
                    </div>

                    <div className="mt-3.5">
                      <h4 className="text-white text-[18px] font-bold leading-tight tracking-tight drop-shadow-sm">
                        {president.name}
                      </h4>
                      <p className="text-amber-300/90 text-[11px] font-bold mt-0.5 uppercase tracking-wide">
                        {president.role || 'Community Head'}
                      </p>
                    </div>

                    {/* Golden Separator */}
                    <div className="flex items-center gap-1.5 my-3 w-28">
                      <div className="h-[1px] flex-1 bg-amber-400/25" />
                      <div className="w-1 h-1 rotate-45 bg-amber-400/60" />
                      <div className="h-[1px] flex-1 bg-amber-400/25" />
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2 text-white/90 text-[10px] font-medium mb-3.5">
                      <MapPin size={11} className="text-white/70 shrink-0" />
                      <span>{[president.city, president.state].filter(Boolean).join(', ') || 'Community Head'}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                      <a 
                        href={`tel:${president.phone || ''}`}
                        className="flex-1 py-1.5 rounded-xl border border-purple-300/30 hover:bg-white/5 text-white text-[10px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform text-center backdrop-blur-sm"
                      >
                        <Phone size={11} /> Call
                      </a>
                      <button 
                        onClick={() => navigate(`/member/chat/member/${president.id}`)}
                        className="flex-1 py-1.5 rounded-xl border border-emerald-300/30 hover:bg-white/5 text-white text-[10px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform backdrop-blur-sm"
                      >
                        <MessageCircle size={11} /> Chat
                      </button>
                    </div>
                  </div>
                </div>
              )}
                
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-4 -mx-3 px-3">
                {coreCommittee.map((member, idx) => {
                    const badgeColor = member.role?.toLowerCase().includes('vice') 
                      ? 'bg-[#7c3aed]' 
                      : member.role?.toLowerCase().includes('secretary') || member.role?.toLowerCase().includes('सचिव')
                      ? 'bg-[#ff3b68]' 
                      : member.role?.toLowerCase().includes('treasurer') || member.role?.toLowerCase().includes('कोषाध्यक्ष')
                      ? 'bg-[#00a651]'
                      : 'bg-amber-500';
                      
                    const displayRole = member.role && member.role !== 'user' ? member.role : 'Executive Member';

                    return (
                      <div 
                        key={member.id || `core-${idx}`} 
                        onClick={() => navigate('/member/leadership', { state: { selectedId: member.id } })}
                        className={`shrink-0 w-[calc((100vw-56px)/3.1)] max-w-[130px] bg-white rounded-3xl flex flex-col items-center cursor-pointer transition-all duration-300 pb-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-purple-50 hover:border-purple-200 overflow-hidden`}
                      >
                        {/* Full Width Portrait Photo */}
                        <div className="w-full aspect-[4/3.8] overflow-hidden bg-gray-50 shrink-0 mb-1.5 pointer-events-none rounded-t-3xl">
                          <img src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=6C3BFF&color=ffffff&bold=true`} className="w-full h-full object-cover" alt={member.name} />
                        </div>
                        
                        {/* Role Badge - below photo */}
                        <span className={`text-white text-[7.5px] font-black px-1.5 py-0.5 rounded-md shadow-sm leading-none mb-1.5 shrink-0 ${badgeColor}`}>
                          {displayRole}
                        </span>
                        
                        {/* Office Bearer Name */}
                        <h4 className="text-slate-900 text-[9.5px] font-extrabold text-center leading-tight mb-2 px-1 h-5 flex items-center justify-center truncate w-full">
                          {member.name}
                        </h4>
                        
                        {/* Interactive Buttons: Call & Chat */}
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <a 
                            href={`tel:${member.phone || ''}`}
                            className="w-6 h-6 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 hover:bg-purple-600 hover:text-white transition-colors"
                          >
                            <Phone size={10} />
                          </a>
                          <button 
                            onClick={() => navigate(`/member/chat/member/${member.id}`)}
                            className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors"
                          >
                            <MessageCircle size={10} />
                          </button>
                        </div>
                      </div>
                    );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ─── SECTION DIVIDER ─── */}
      <div className="mx-3 mt-8 mb-6 h-[1px] bg-gradient-to-r from-transparent via-purple-200/40 to-transparent" />

      {/* ─── UPCOMING EVENTS ─── */}
      <div className="px-0">
        <div className="px-3 flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[17px] font-bold text-text-primary tracking-tight">Upcoming Events</h3>
            <p className="text-[11px] text-text-secondary font-medium mt-0.5">Upcoming Events</p>
          </div>
          <button onClick={() => navigate('/member/events')} className="text-[13px] text-brand-primary font-bold press-scale flex items-center gap-0.5">
            View More <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-3 pb-3 px-3">
          {personalizedEvents.slice(0, 4).map((event, idx) => {
            const gradients = {
              Cultural: 'from-purple-500 to-violet-600',
              Education: 'from-blue-500 to-cyan-600',
              Matrimonial: 'from-pink-500 to-rose-600',
              Health: 'from-emerald-500 to-teal-600',
              Sports: 'from-orange-500 to-amber-600',
            };
            const catGradient = gradients[event.category] || gradients.Cultural;
            return (
              <div
                key={event.id || event._id || `event-${idx}`}
                className="snap-center shrink-0 w-[260px] card-neo overflow-hidden cursor-pointer active:scale-[0.97] transition-transform"
                onClick={() => navigate(`/member/events/${event._id || event.id}`)}
              >
                {/* Image / Gradient Header */}
                <div className="h-[100px] relative flex items-center justify-center overflow-hidden bg-gray-900 rounded-t-[24px]">
                  {event.image ? (
                    <img 
                      src={event.image} 
                      alt={event.title} 
                      className="absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${catGradient}`} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
                  
                  {!event.image && (
                    <CalendarDays size={48} className="text-white/10 absolute right-2 top-2" />
                  )}
                  
                  <div className="absolute bottom-[-12px] left-3 z-10">
                    <div className="w-[42px] h-[48px] bg-white rounded-xl shadow-md flex flex-col items-center justify-center border border-purple-100/30">
                      <span className="text-[17px] font-bold text-text-primary leading-none">{event.day}</span>
                      <span className="text-[8px] font-bold text-brand-primary mt-0.5 uppercase">{event.monthShort}</span>
                    </div>
                  </div>
                  {event.isFeatured && (
                    <span className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-[8px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      ★ Featured
                    </span>
                  )}
                  <span className="absolute top-2 right-2 bg-black/30 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/10">
                    {event.category}
                  </span>
                </div>
                {/* Card Body */}
                <div className="p-3 pt-5">
                  <h4 className="font-bold text-[13px] text-text-primary leading-snug line-clamp-2">{event.titleEn || event.title}</h4>
                  <div className="flex flex-col gap-1 mt-2">
                    <p className="text-[11px] text-text-secondary flex items-center gap-1 line-clamp-1">
                      <Clock size={10} className="text-text-muted shrink-0" /> {event.timeEn || event.time}
                    </p>
                    <p className="text-[11px] text-text-secondary flex items-center gap-1 line-clamp-1">
                      <MapPin size={10} className="text-text-muted shrink-0" /> {(event.venueEn || event.venue).split(',')[0]}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-purple-100/20">
                    <span className="text-[10px] text-text-secondary font-medium flex items-center gap-1">
                      <Users size={10} className="text-text-muted" /> {event.interested || event.attendees}+ Likes
                    </span>
                    {event.isRegistered ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-0.5">
                        ✓ RSVP'd
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-brand-primary bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100/50">
                        Join →
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── SECTION DIVIDER ─── */}
      <div className="mx-3 mt-8 mb-6 h-[1px] bg-gradient-to-r from-transparent via-purple-200/40 to-transparent" />

      {/* ─── COMMUNITY FEED PREVIEW ─── */}
      <div className="px-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[17px] font-bold text-text-primary tracking-tight">Community Feed</h3>
          <button onClick={() => navigate('/member/social')} className="text-[13px] text-social-module font-bold press-scale flex items-center gap-0.5">
            View All <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-3 pb-2 -mx-3 px-3">
          {communityPosts.slice(0, 5).map((post, i) => {
            const matchedMember = mockMembers.find(m => m.name === post.author.name) || mockAdmins.find(a => a.name === post.author.name);
            const handleAuthorClick = (e) => {
              if (matchedMember) {
                e.stopPropagation();
                navigate(`/member/directory/${matchedMember.id}`);
              }
            };

            return (
              <div key={post.id} className="card-neo p-4 press-scale animate-stagger-fade-in shrink-0 w-[275px] snap-center" style={{ animationDelay: `${i * 80}ms` }} onClick={() => navigate(`/member/social/${post.id}`)}>
                <div className="flex items-center gap-3 mb-3">
                  <div onClick={handleAuthorClick} className={matchedMember ? 'cursor-pointer' : ''}>
                    <Avatar initials={post.author.initials} size="sm" />
                  </div>
                  <div className="flex-1">
                    <h4 onClick={handleAuthorClick} className={`text-[14px] font-bold text-text-primary ${matchedMember ? 'cursor-pointer hover:underline hover:text-brand-primary' : ''}`}>{post.author.name}</h4>
                    <p className="text-[12px] text-text-secondary">{post.community} · {post.timestamp}</p>
                  </div>
                </div>
              <p className="text-[14px] text-text-primary leading-relaxed line-clamp-2">{post.content}</p>
              <div className="flex items-center gap-5 mt-3 pt-3 border-t border-purple-100/20">
                <span className="text-[13px] text-text-secondary font-medium">❤️ {post.likes}</span>
                <span className="text-[13px] text-text-secondary font-medium">💬 {post.comments}</span>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* ─── SECTION DIVIDER ─── */}
      <div className="mx-3 mt-8 mb-6 h-[1px] bg-gradient-to-r from-transparent via-purple-200/40 to-transparent" />

      {/* ─── REFER & EARN BANNER ─── */}
      <div className="px-3 mb-8">
        <ReferAndEarnBanner />
      </div>

      {/* ─── SECTION DIVIDER ─── */}
      <div className="mx-3 mt-2 mb-6 h-[1px] bg-gradient-to-r from-transparent via-purple-200/40 to-transparent" />

      {/* ─── END OF FEED ILLUSTRATION ─── */}
      {liveFooterArtwork?.enabled !== false && (
        <div className="mt-8 relative w-full h-[450px] flex flex-col items-center justify-end overflow-hidden pb-[160px] -mb-[120px] bg-gradient-to-b from-transparent to-purple-50/50">
          {/* Background Artwork: Custom Image (100% natural) or SVG CityLandscape */}
          {liveFooterArtwork?.artworkType === 'image' && liveFooterArtwork?.backgroundImage ? (
            <img 
              src={liveFooterArtwork.backgroundImage} 
              alt="Footer Background" 
              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full pointer-events-none select-none text-brand-primary">
              <CityLandscape className="w-full h-full" />
            </div>
          )}
          
          {/* End text */}
          <div className="relative z-10 flex flex-col items-center">
             <h3 className="text-brand-primary/40 text-[42px] font-black italic tracking-tighter mb-2 drop-shadow-md leading-none select-none">
               {liveFooterArtwork?.hashtagText || '#MeriSamaj'}
             </h3>
             <div className="bg-white/85 backdrop-blur-xl px-6 py-2.5 rounded-2xl border border-purple-200/40 shadow-sm flex flex-col items-center text-center">
               <span className="text-text-secondary text-[14px] font-black tracking-wide">
                 {liveFooterArtwork?.caughtUpTitle || "You're all caught up!"}
               </span>
               <span className="text-text-muted text-[11px] font-medium mt-0.5">
                 {liveFooterArtwork?.caughtUpSubtitle || 'Check back later for new updates'}
               </span>
             </div>
          </div>
        </div>
      )}

      {/* ─── MEDIA FAB ─── */}
      <button
        onClick={() => navigate('/member/social/create')}
        className="fixed bottom-[100px] right-5 w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-glow text-white flex items-center justify-center shadow-[0_8px_30px_rgba(124,58,237,0.35)] press-scale z-40 hover:scale-105 transition-transform animate-glow-pulse"
      >
        <ImagePlus size={23} />
      </button>

    </div>
  );
};

export default HomePage;
