import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { CheckCircle, ChevronRight, Camera, LogOut, Globe, Lock, Check, ArrowLeft, Sparkles, ShieldCheck, User, Briefcase, Package, Activity, Users, Gift, Grid, Settings as SettingsIcon, Edit3, Heart, Bookmark, Plus, Crown, MapPin, Sun, Moon, Mail, Phone, Loader2, Info } from 'lucide-react';
import { useData } from '../../context/DataProvider';
import { Avatar } from '../../components/common/Avatar';
import { ActivityDashboard } from './components/ActivityDashboard';
import { AnimatePresence, motion } from 'framer-motion';
import socialService from '../../../../core/api/socialService';
import { getMemberById } from '../../services/directoryApi';
import { resolvePostMediaUrl, isMediaVideo } from '../../utils/mediaUtils';

// ── Profile Post Thumbnail Component (Handles media aliases, resolution & graceful fallbacks) ──
const ProfilePostThumbnail = ({ post, onClick }) => {
  const [hasImageError, setHasImageError] = useState(false);

  const rawMedia = (post.images && post.images.length > 0)
    ? post.images[0] 
    : (post.image || (post.media && post.media.length > 0 ? post.media[0] : null));

  const resolvedUrl = resolvePostMediaUrl(rawMedia);
  const isVideo = isMediaVideo(resolvedUrl) || (post.media && post.media[0]?.type === 'video');
  const mediaCount = (post.images?.length || 0) + (post.media?.length || 0);

  const categoryLabel = post.category || 'General';
  const postContent = post.content || post.title || '';

  return (
    <div 
      onClick={onClick}
      className="aspect-square bg-white rounded-2xl overflow-hidden relative cursor-pointer hover:opacity-95 border border-slate-150/70 shadow-xs hover:shadow-md transition-all press-scale group"
    >
      {resolvedUrl && !hasImageError ? (
        <>
          <img 
            src={resolvedUrl} 
            alt={postContent || "Post thumbnail"} 
            onError={() => setHasImageError(true)} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
          />
          {/* Badge for multiple media */}
          {mediaCount > 1 && (
            <div className="absolute top-2 right-2 bg-slate-900/70 backdrop-blur-xs text-white text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
              <Camera size={10} />
              <span>{mediaCount}</span>
            </div>
          )}
          {/* Video Play Badge */}
          {isVideo && (
            <div className="absolute inset-0 bg-black/25 flex items-center justify-center pointer-events-none">
              <div className="w-8 h-8 rounded-full bg-white/90 text-brand-primary flex items-center justify-center shadow-md font-bold text-xs pl-0.5">
                ▶
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-[#faf8ff] via-[#f5f1fe] to-[#efe9fc] select-none">
          <span className="text-[8px] font-black text-brand-primary uppercase tracking-widest mb-1.5 bg-purple-100/90 text-purple-800 px-2 py-0.5 rounded-md border border-purple-200/50 shadow-xs">
            {categoryLabel}
          </span>
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-700 line-clamp-3 leading-tight px-1">
            {postContent || 'Community Post'}
          </p>
        </div>
      )}
    </div>
  );
};

const MyProfilePage = () => {
  const navigate = useNavigate();
  const { memberId } = useParams();
  const location = useLocation();
  
  const { 
    currentUser, 
    logoutUser, 
    updateProfile,
    profilePrivacy,
    followRelations,
    blockedUsers,
    members,
    posts,
    acceptFollowRequest,
    rejectFollowRequest,
    removeFollower,
    unfollowUser,
    updateProfilePrivacy,
    updateGranularPrivacy,
    granularPrivacy,
    unblockUser,
    language,
    setLanguage,
    followedAnnouncements,
    toggleFollowedAnnouncement,
    sendFollowRequest,
    cancelFollowRequest,
    blockUser,
    admins
  } = useData();

  const myId = currentUser?.id || currentUser?._id || 'u1';
  const isMe = !memberId || memberId === myId;

  const [activeTab, setActiveTab] = useState('posts');
  const [loadedMember, setLoadedMember] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Social Links Modal State
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [facebook, setFacebook] = useState(currentUser.facebook || 'https://facebook.com/user');
  const [twitter, setTwitter] = useState(currentUser.twitter || 'https://twitter.com/user');
  const [linkedin, setLinkedin] = useState(currentUser.linkedin || 'https://linkedin.com/in/user');

  // Blocked Users Modal State
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  // Privacy Settings Modal State
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  
  // Preferences settings modal states & support form state
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // Activity Dashboard State
  const [showActivityDashboard, setShowActivityDashboard] = useState(false);
  
  // Highlights & Dynamic Tab States
  const [highlights, setHighlights] = useState([]);
  const [profileStats, setProfileStats] = useState({ postsCount: 0, followersCount: 0, followingCount: 0, savedCount: 0 });
  const [savedPostsList, setSavedPostsList] = useState([]);
  const [likedPostsList, setLikedPostsList] = useState([]);
  const [pastStories, setPastStories] = useState([]);
  const [loadingPastStories, setLoadingPastStories] = useState(false);

  const [showHighlightSelectionModal, setShowHighlightSelectionModal] = useState(false);
  const [showHighlightCreationModal, setShowHighlightCreationModal] = useState(false);
  const [selectedHighlightItems, setSelectedHighlightItems] = useState([]);
  const [newHighlightTitle, setNewHighlightTitle] = useState('Highlights');
  const [activeHighlightView, setActiveHighlightView] = useState(null);

  // Other User followers/following list state
  const [targetFollowersList, setTargetFollowersList] = useState([]);
  const [targetFollowingList, setTargetFollowingList] = useState([]);
  const [loadingFollows, setLoadingFollows] = useState(false);

  // Instant cached member fallback derived via useMemo
  const cachedMemberFallback = useMemo(() => {
    if (!memberId || isMe) return null;
    const found = (members || []).find(m => m.id === memberId || m._id === memberId) || 
                  (admins || []).find(a => a.id === memberId || a._id === memberId);
    if (!found) return null;
    return {
      ...found,
      id: found._id || found.id,
      initials: found.name ? found.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?'
    };
  }, [memberId, isMe, members, admins]);

  const profileUser = isMe ? currentUser : (loadedMember || cachedMemberFallback || {});

  // Consolidated Parallel Profile Data Loader
  useEffect(() => {
    let isMounted = true;
    const targetUserId = isMe ? myId : memberId;
    if (!targetUserId) return;

    if (cachedMemberFallback) {
      setLoadedMember(cachedMemberFallback);
    } else if (isMe) {
      setLoadedMember(null);
    }

    const loadAllProfileData = async () => {
      setLoadingPosts(true);
      if (memberId && !isMe && !cachedMemberFallback) {
        setLoadingProfile(true);
      }

      const targetSocialId = isMe ? '' : memberId;

      try {
        const promises = [
          socialService.getProfileStats(targetSocialId),
          socialService.getUserHighlights(targetSocialId),
          socialService.getUserPosts(targetUserId)
        ];

        if (memberId && !isMe) {
          promises.push(getMemberById(memberId));
        }

        const results = await Promise.allSettled(promises);
        if (!isMounted) return;

        // Result 0: Profile Stats
        if (results[0].status === 'fulfilled' && results[0].value?.success) {
          setProfileStats(results[0].value.data);
        }

        // Result 1: Highlights
        if (results[1].status === 'fulfilled' && results[1].value?.success) {
          setHighlights(results[1].value.data);
        }

        // Result 2: User Posts
        if (results[2].status === 'fulfilled' && results[2].value?.success && results[2].value.data) {
          const mapped = results[2].value.data.map(p => ({
            ...p,
            id: p._id || p.id,
            images: p.media?.map(m => m.url) || p.images || [],
            category: p.category || 'General',
            content: p.content || ''
          }));
          setUserPosts(mapped);
        }

        // Result 3: Detailed Member Profile (if viewing another user)
        if (memberId && !isMe && results[3] && results[3].status === 'fulfilled') {
          const memberRes = results[3].value;
          if (memberRes.success && memberRes.data) {
            const mapped = {
              ...memberRes.data,
              id: memberRes.data._id || memberRes.data.id,
              initials: memberRes.data.name ? memberRes.data.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?'
            };
            setLoadedMember(mapped);
          }
        }
      } catch (err) {
        console.error("Failed to load profile data:", err);
      } finally {
        if (isMounted) {
          setLoadingProfile(false);
          setLoadingPosts(false);
        }
      }
    };

    loadAllProfileData();

    return () => {
      isMounted = false;
    };
  }, [memberId, isMe, myId]);

  // Fetch Saved and Liked posts dynamically on tab switch
  useEffect(() => {
    const loadTabContent = async () => {
      if (activeTab === 'saved' && isMe) {
        try {
          const res = await socialService.getSavedPosts();
          if (res.success) {
            const mapped = (res.data || []).map(p => ({
              ...p,
              id: p._id || p.id,
              images: p.media?.map(m => m.url) || p.images || [],
              category: p.category || 'General',
              content: p.content || ''
            }));
            setSavedPostsList(mapped);
          }
        } catch (err) {
          console.error('Failed to fetch saved posts:', err);
        }
      } else if (activeTab === 'liked' && isMe) {
        try {
          const res = await socialService.getLikedPosts();
          if (res.success) {
            const mapped = (res.data || []).map(p => ({
              ...p,
              id: p._id || p.id,
              images: p.media?.map(m => m.url) || p.images || [],
              category: p.category || 'General',
              content: p.content || ''
            }));
            setLikedPostsList(mapped);
          }
        } catch (err) {
          console.error('Failed to fetch liked posts:', err);
        }
      }
    };
    loadTabContent();
  }, [activeTab, isMe]);

  const handleOpenHighlightSelection = async () => {
    setShowHighlightSelectionModal(true);
    setLoadingPastStories(true);
    try {
      const res = await socialService.getPastStories();
      if (res.success) {
        setPastStories(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch past stories for highlights:', err);
    } finally {
      setLoadingPastStories(false);
    }
  };

  const handleCreateHighlightDone = async () => {
    if (selectedHighlightItems.length === 0) return;
    try {
      const storyIds = selectedHighlightItems.map(item => item._id || item.id).filter(Boolean);
      const coverImage = selectedHighlightItems[0]?.media || selectedHighlightItems[0];
      const res = await socialService.createHighlight({
        title: newHighlightTitle || 'Highlights',
        coverImage,
        storyIds
      });
      if (res.success) {
        setHighlights(prev => [res.data, ...prev]);
      }
    } catch (err) {
      console.error('Failed to create highlight:', err);
    } finally {
      setShowHighlightCreationModal(false);
      setSelectedHighlightItems([]);
      setNewHighlightTitle('Highlights');
    }
  };

  const handleDeleteHighlight = async (highlightId) => {
    try {
      await socialService.deleteHighlight(highlightId);
      setHighlights(prev => prev.filter(h => (h._id || h.id) !== highlightId));
      setActiveHighlightView(null);
    } catch (err) {
      console.error('Failed to delete highlight:', err);
    }
  };

  
  const userGranular = granularPrivacy?.[myId] || granularPrivacy?.u1 || granularPrivacy || {};
  const [myPrivacySetting, setMyPrivacySetting] = useState(profilePrivacy?.[myId] || profilePrivacy?.u1 || 'public');
  const [myPhoneSetting, setMyPhoneSetting] = useState(userGranular.phone || 'followers');
  const [myEmailSetting, setMyEmailSetting] = useState(userGranular.email || 'followers');
  const [myFamilySetting, setMyFamilySetting] = useState(userGranular.familyTree || 'followers');

  // Sync form state when modal opens
  useEffect(() => {
    if (showPrivacyModal) {
      setMyPrivacySetting(profilePrivacy?.[myId] || profilePrivacy?.u1 || 'public');
      const latestGranular = granularPrivacy?.[myId] || granularPrivacy?.u1 || granularPrivacy || {};
      setMyPhoneSetting(latestGranular.phone || 'followers');
      setMyEmailSetting(latestGranular.email || 'followers');
      setMyFamilySetting(latestGranular.familyTree || 'followers');
    }
  }, [showPrivacyModal, profilePrivacy, granularPrivacy, myId]);

  // Members lists Modal State (Followers/Following)
  const [membersListModalType, setMembersListModalType] = useState(null); // 'followers', 'following', or null
  const [membersSearchQuery, setMembersSearchQuery] = useState('');

  useEffect(() => {
    setMembersSearchQuery('');
  }, [membersListModalType]);

  // Fetch target user follows list dynamically for both self and other user
  useEffect(() => {
    const fetchTargetFollows = async () => {
      const targetId = isMe ? (currentUser?._id || currentUser?.id) : memberId;
      if (membersListModalType && targetId) {
        setLoadingFollows(true);
        try {
          if (membersListModalType === 'followers') {
            const res = await socialService.getFollowers(targetId);
            if (res.success && res.data) {
              const mapped = res.data.map(m => ({
                ...m,
                id: m._id || m.id,
                name: m.name || 'Member',
                avatar: m.avatar,
                city: m.city || 'Indore',
                initials: m.name ? m.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?'
              }));
              setTargetFollowersList(mapped);
            }
          } else if (membersListModalType === 'following') {
            const res = await socialService.getFollowing(targetId);
            if (res.success && res.data) {
              const mapped = res.data.map(m => ({
                ...m,
                id: m._id || m.id,
                name: m.name || 'Member',
                avatar: m.avatar,
                city: m.city || 'Indore',
                initials: m.name ? m.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?'
              }));
              setTargetFollowingList(mapped);
            }
          }
        } catch (err) {
          console.error("Failed to load target follows list:", err);
        } finally {
          setLoadingFollows(false);
        }
      }
    };
    fetchTargetFollows();
  }, [membersListModalType, memberId, isMe, currentUser]);

  useEffect(() => {
    if (showSocialModal || showPrivacyModal || membersListModalType || showBlockedModal || showActivityDashboard || showHighlightSelectionModal || showHighlightCreationModal || showNotificationsModal || showLanguageModal || showThemeModal || showHelpModal || showAboutModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showSocialModal, showPrivacyModal, membersListModalType, showBlockedModal, showActivityDashboard, showHighlightSelectionModal, showHighlightCreationModal, showNotificationsModal, showLanguageModal, showThemeModal, showHelpModal, showAboutModal]);

  const handleSaveSocials = () => {
    updateProfile({ facebook, twitter, linkedin });
    setShowSocialModal(false);
  };

  const handleSavePrivacy = () => {
    updateProfilePrivacy(myPrivacySetting);
    updateGranularPrivacy('phone', myPhoneSetting);
    updateGranularPrivacy('email', myEmailSetting);
    updateGranularPrivacy('familyTree', myFamilySetting);
    setShowPrivacyModal(false);
  };

  // Follow states derivations
  const myFollowerRelations = followRelations?.filter(r => r.followingId === myId && r.status === 'accepted') || [];
  const myFollowingRelations = followRelations?.filter(r => r.followerId === myId && r.status === 'accepted') || [];

  const myFollowers = members.filter(m => myFollowerRelations.some(r => r.followerId === m.id));
  const myFollowing = members.filter(m => myFollowingRelations.some(r => r.followingId === myId));

  // Pending Received Requests
  const pendingRequestsRelations = followRelations?.filter(r => r.followingId === myId && r.status === 'pending') || [];
  const pendingRequests = members.filter(m => pendingRequestsRelations.some(r => r.followerId === m.id));

  // Blocked Members derivation
  const blockedMembersIds = blockedUsers?.filter(b => b.blockerId === myId).map(b => b.blockedId) || [];
  const blockedMembersList = members.filter(m => blockedMembersIds.includes(m.id));

  // Block/follow status checks for the target profileUser
  const isBlocked = blockedUsers?.some(b => (b.blockerId === myId && b.blockedId === profileUser.id) || (b.blockerId === profileUser.id && b.blockedId === myId)) || profileUser.isBlocked === true;
  const isFollowing = followRelations?.some(r => r.followerId === myId && r.followingId === profileUser.id && r.status === 'accepted') || (followRelations?.some(r => r.followerId === myId && r.followingId === profileUser._id && r.status === 'accepted'));
  const hasRequested = followRelations?.some(r => r.followerId === myId && r.followingId === profileUser.id && r.status === 'pending') || (followRelations?.some(r => r.followerId === myId && r.followingId === profileUser._id && r.status === 'pending'));
  const privacySetting = profilePrivacy?.[profileUser.id] || profilePrivacy?.[profileUser._id] || (profileUser.isPrivate ? 'private' : 'public');
  const isPrivate = privacySetting === 'private';
  const canAccess = isMe || !isPrivate || isFollowing;

  // Granular privacy settings
  const memberGranular = granularPrivacy?.[profileUser.id] || 
                         granularPrivacy?.[profileUser._id] ||
                         (profileUser.id === myId ? (granularPrivacy?.[myId] || granularPrivacy) : null) || 
                         { phone: 'followers', email: 'followers', familyTree: 'followers' };

  const isFieldVisible = (fieldSetting) => {
    if (isMe) return true;
    if (fieldSetting === 'public') return true;
    if (fieldSetting === 'followers') return isFollowing;
    return false; // 'private' or 'only me'
  };

  const showPhone = isMe || (profileUser.phone && isFieldVisible(memberGranular.phone));
  const showEmail = isMe || (profileUser.email && isFieldVisible(memberGranular.email));
  const showFamily = isMe || (profileUser.familyMembers && isFieldVisible(memberGranular.familyTree));

  // Helper hash function to generate realistic deterministic values for details fields
  const getHashValue = (str, offset = 0) => {
    if (!str) return 0;
    return str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + offset;
  };
  const hash = getHashValue(profileUser.id || profileUser._id || '');

  // Dynamic deterministic properties
  const memberIdCode = `SM${7000 + (hash % 999)}`;
  const birthYear = 2026 - (profileUser.age || 40);
  const birthDay = 1 + (hash % 28);
  const birthMonth = 1 + (hash % 12);
  const dobStr = `${birthDay.toString().padStart(2, '0')}/${birthMonth.toString().padStart(2, '0')}/${birthYear}`;
  
  // Mappings
  const cityMap = {
    'Indore': 'Indore, Madhya Pradesh',
    'Jaipur': 'Jaipur, Rajasthan',
    'Bhopal': 'Bhopal, Madhya Pradesh',
    'Ujjain': 'Ujjain, Madhya Pradesh',
    'Ahmedabad': 'Ahmedabad, Gujarat',
    'Lucknow': 'Lucknow, Uttar Pradesh',
    'Delhi': 'Delhi',
    'Kota': 'Kota, Rajasthan',
    'Alwar': 'Alwar, Rajasthan',
    'Bikaner': 'Bikaner, Rajasthan',
    'Udaipur': 'Udaipur, Rajasthan',
    'Pune': 'Pune, Maharashtra',
  };

  const professionMap = {
    'Architect': 'Architect',
    'Doctor': 'Doctor',
    'Software Engineer': 'Software Engineer',
    'Teacher': 'Teacher',
    'CA': 'CA',
    'Pharmacist': 'Pharmacist',
    'Lawyer': 'Lawyer',
    'Interior Designer': 'Interior Designer',
    'Marketing Manager': 'Marketing Manager',
    'Homemaker': 'Homemaker',
    'Business Owner': 'Business Owner',
  };

  const businessTypeMap = {
    'Architect': 'Construction & Designing',
    'Doctor': 'Healthcare & Medical',
    'Software Engineer': 'IT & Software Services',
    'Teacher': 'Education Services',
    'CA': 'Financial Audits & Advisory',
    'Pharmacist': 'Pharma Manufacturing & Retail',
    'Lawyer': 'Legal Services & Advisory',
    'Interior Designer': 'Home Decor & Design',
    'Marketing Manager': 'Marketing & Advertising',
    'Homemaker': 'Family Care',
    'Business Owner': 'Manufacturing & Trading',
  };

  const phoneNum = profileUser.phone || '';
  const emailAddr = profileUser.email || '';
  const englishCity = profileUser.city || profileUser.district || profileUser.state || '';

  // Professional details
  const englishProfession = profileUser.profession || profileUser.role || '';
  const companyName = profileUser.company || '';
  const businessSector = businessTypeMap[profileUser.profession] || (profileUser.profession ? 'Professional Services' : '');
  const estYear = profileUser.passingYear || '';

  // Full Address
  const fullAddress = profileUser.detailedAddress || profileUser.address || (englishCity ? `${englishCity}${profileUser.pincode ? ' - ' + profileUser.pincode : ''}` : '');

  return (
    <div className="min-h-screen bg-surface pb-24 relative overflow-x-hidden">
      {/* Header Bar — Glass morphism */}
      <div className="bg-white/85 backdrop-blur-xl border-b border-purple-100/30 flex items-center justify-between px-4 h-14 sticky top-0 z-30 shadow-[0_2px_12px_rgba(124,58,237,0.03)]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (isMe) {
                navigate('/member/social');
              } else if (location.state?.fromCity) {
                navigate('/member/leadership', { state: { activeCityDetail: location.state.fromCity } });
              } else {
                navigate(-1);
              }
            }} 
            className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-purple-50 transition-colors press-scale"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-[17px] font-extrabold text-slate-800 tracking-tight leading-tight">
            {isMe ? 'My Profile' : (profileUser?.name || 'Member Profile')}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isMe && (
            <button 
              onClick={() => navigate('/member/settings')}
              className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-purple-50 transition-all press-scale"
            >
              <SettingsIcon size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto sm:px-4 py-0 sm:py-6 space-y-4 text-left select-none">
        
        {/* ─── PROFILE HEADER CARD ─── */}
        <div className="bg-white sm:rounded-[28px] overflow-hidden border-b sm:border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative">
          {/* Cover photo banner */}
          <div className="h-44 sm:h-64 w-full relative bg-gradient-to-br from-[#2A0E5C] via-[#3B1578] to-[#5B21B6] overflow-hidden">
            <img 
              src={profileUser.cover || "https://images.unsplash.com/photo-1609234656388-0ff363383899?auto=format&fit=crop&w=800&q=80"} 
              alt="Cover" 
              className="w-full h-full object-cover opacity-80"
            />
            {/* Gradient cover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-black/20" />
            
            {/* Cover Upload Trigger (only when isMe) */}
            {isMe && (
              <label className="absolute top-3.5 right-3.5 w-8 h-8 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white rounded-xl flex items-center justify-center border border-white/20 cursor-pointer transition-all press-scale shadow-md z-10">
                <Camera size={13} />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        updateProfile({ cover: event.target.result });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            )}
          </div>

          {/* Profile details block */}
          <div className="px-4.5 pb-4 pt-3 relative flex flex-row-reverse items-stretch justify-between gap-4 sm:gap-6">
            
            {/* Overlapping Clean Neutral Avatar */}
            <div className="shrink-0 z-10 mr-1 sm:mr-3 flex flex-col items-center justify-between pb-1 self-stretch">
              <div className="-mt-[55px] sm:-mt-[70px] relative">
                <div className="w-[95px] h-[95px] sm:w-[120px] sm:h-[120px] rounded-full overflow-hidden bg-slate-100 text-slate-700 font-black text-[22px] flex items-center justify-center border-4 border-white shadow-md">
                  {profileUser.avatar ? (
                    <img src={profileUser.avatar} alt={profileUser.name} className="w-full h-full object-cover" />
                  ) : (
                    profileUser.initials || (profileUser.name ? profileUser.name.substring(0, 2).toUpperCase() : '?')
                  )}
                </div>

                {/* Avatar Camera trigger (only when isMe) */}
                {isMe && (
                  <label className="absolute bottom-0 right-0 w-7.5 h-7.5 text-slate-700 bg-white rounded-full shadow-md flex items-center justify-center press-scale border-2 border-slate-200 cursor-pointer transition-all hover:bg-slate-50">
                    <Camera size={12} />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            updateProfile({ avatar: event.target.result });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* ─── MEMBERSHIP PILL TRIGGER ─── */}
              <div className="my-2 flex flex-col items-center">
                {(() => {
                  const isUserSubscribed = profileUser.isPremium || (isMe && currentUser?.isPremium) || profileUser.matrimonySubscription?.status === 'active' || (isMe && currentUser?.matrimonySubscription?.status === 'active');
                  const currentPlanTitle = currentUser?.membershipPlan || profileUser?.membershipPlan || currentUser?.matrimonySubscription?.plan || profileUser?.matrimonySubscription?.plan || 'PRO MAX';

                  if (isMe) {
                    return (
                      <button
                        onClick={() => navigate('/member/profile/upgrade')}
                        className={`px-3 py-1.5 rounded-full text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-xs border ${
                          isUserSubscribed
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 border-amber-400 text-white shadow-amber-500/20 hover:from-amber-600 hover:to-amber-700'
                            : 'bg-gradient-to-r from-rose-500 to-rose-600 border-rose-500 text-white shadow-rose-500/20 hover:from-rose-600 hover:to-rose-700'
                        }`}
                      >
                        {isUserSubscribed ? (
                          <>
                            <Crown size={12} className="text-yellow-200 fill-yellow-200 shrink-0" />
                            <span>{currentPlanTitle}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={12} className="fill-white shrink-0" />
                            <span>Upgrade Pro</span>
                          </>
                        )}
                      </button>
                    );
                  }

                  return (
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border shadow-xs ${
                      isUserSubscribed
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      {isUserSubscribed ? `👑 ${currentPlanTitle}` : '✨ Member'}
                    </span>
                  );
                })()}
              </div>

              {/* Follow count statistics bar */}
              <div className="flex items-center justify-center gap-2 text-[12px] sm:text-[13px] font-extrabold text-slate-500 text-center whitespace-nowrap">
                <button 
                  onClick={() => {
                    if (isMe || canAccess) setMembersListModalType('followers');
                  }} 
                  className="hover:text-purple-600 transition-colors press-scale"
                  disabled={!isMe && !canAccess}
                >
                  <span className="font-extrabold text-slate-800">
                    {typeof profileStats?.followersCount === 'number' ? profileStats.followersCount : (isMe ? myFollowers.length : targetFollowersList.length)}
                  </span> <span className="text-slate-400 font-semibold">followers</span>
                </button>
                <span className="text-slate-300">•</span>
                <button 
                  onClick={() => {
                    if (isMe || canAccess) setMembersListModalType('following');
                  }} 
                  className="hover:text-purple-600 transition-colors press-scale"
                  disabled={!isMe && !canAccess}
                >
                  <span className="font-extrabold text-slate-800">
                    {typeof profileStats?.followingCount === 'number' ? profileStats.followingCount : (isMe ? myFollowing.length : targetFollowingList.length)}
                  </span> <span className="text-slate-400 font-semibold">following</span>
                </button>
              </div>
            </div>

            {/* User credentials details */}
            <div className="text-left space-y-2 flex-1 pt-0 sm:pt-0.5 ml-1 sm:ml-3">
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-[17px] xs:text-[20px] sm:text-[25px] font-black text-slate-800 tracking-tight leading-none flex items-center gap-1.5 break-words flex-wrap max-w-full">
                  {profileUser.name}
                  {profileUser.isPrivate && <span className="text-xs" title="Private Account">🔒</span>}
                  {profileUser.isVerified && <CheckCircle size={18} className="text-emerald-500 fill-emerald-50 shrink-0" />}
                </h2>
                {(() => {
                  const rawRole = (profileUser.role || '').toLowerCase();
                  const rawDes = profileUser.designation || '';
                  const isElevated = rawRole === 'head' || rawRole === 'sub_head' || (rawDes && rawDes.toLowerCase() !== 'member');
                  
                  if (isElevated) {
                    const badgeLabel = (rawRole === 'head' || rawDes.toLowerCase() === 'community head' || rawDes.toLowerCase() === 'president')
                      ? 'COMMUNITY HEAD'
                      : (rawRole === 'sub_head' || rawDes.toLowerCase() === 'sub head')
                      ? 'SUB HEAD'
                      : rawDes.toUpperCase();

                    return (
                      <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[9px] sm:text-[10px] font-black uppercase px-2.5 py-1 rounded shadow-sm tracking-wider flex items-center gap-1 border border-amber-400/30">
                        <Crown size={12} className="text-amber-200 fill-amber-200" /> {badgeLabel}
                      </span>
                    );
                  }

                  const isPremiumMember = profileUser.isPremium || (isMe && currentUser?.isPremium) || profileUser.matrimonySubscription?.status === 'active' || (isMe && currentUser?.matrimonySubscription?.status === 'active');
                  const currentPlan = profileUser.membershipPlan || (isMe && currentUser?.membershipPlan) || profileUser.matrimonySubscription?.plan || (isMe && currentUser?.matrimonySubscription?.plan) || 'PRO';

                  if (isPremiumMember) {
                    return (
                      <span className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-white text-[9px] sm:text-[10px] font-black uppercase px-2.5 py-1 rounded shadow-sm tracking-wider flex items-center gap-0.5 border border-amber-400/20">
                        👑 {currentPlan}
                      </span>
                    );
                  }

                  return (
                    <span className="bg-purple-50 text-brand-primary text-[9px] sm:text-[10px] font-black uppercase px-2.5 py-1 rounded border border-purple-100/50 tracking-wider">
                      Member
                    </span>
                  );
                })()}
              </div>

              {profileUser.bio && (
                <p className="text-[12.5px] font-medium text-slate-600 italic mt-1 leading-snug">
                  "{profileUser.bio}"
                </p>
              )}

              {/* Bio metadata columns */}
              <div className="text-[12px] sm:text-[14.5px] font-semibold text-slate-500 flex flex-col gap-2 mt-2.5">
                <p className="flex items-center gap-2">
                  <Briefcase size={14} className="text-slate-400 shrink-0" /> 
                  <span>
                    {profileUser.profession || (['head', 'sub_head'].includes((profileUser.role || '').toLowerCase()) ? (profileUser.designation || 'Community Leadership') : 'Community Member')}
                    {profileUser.company ? ` at ${profileUser.company}` : ''}
                  </span>
                </p>
                {(profileUser.city || profileUser.state) && (
                  <p className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400 shrink-0" /> 
                    <span>{profileUser.city}{profileUser.city && profileUser.state && ', '}{profileUser.state}</span>
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <Users size={14} className="text-slate-400 shrink-0" /> 
                  <span>{profileUser.community || 'Community Not Assigned'}{profileUser.subCommunity ? ` (${profileUser.subCommunity})` : ''}</span>
                </p>
                {showPhone && profileUser.phone && (
                  <p className="flex items-center gap-2 flex-wrap text-[11px] sm:text-[13.5px] text-slate-450 mt-0.5">
                    <Phone size={12} className="text-slate-400 shrink-0" /> 
                    <span>{profileUser.phone}</span>
                  </p>
                )}
                {showEmail && profileUser.email && (
                  <p className="flex items-center gap-2 flex-wrap text-[11px] sm:text-[13.5px] text-slate-450">
                    <Mail size={12} className="text-slate-400 shrink-0" /> 
                    <span className="truncate max-w-[170px] sm:max-w-xs">{profileUser.email}</span>
                  </p>
                )}
              </div>

              {/* Social Links Badge */}
              {(profileUser.linkedin || profileUser.facebook || profileUser.twitter) && (
                <a 
                  href={profileUser.linkedin || profileUser.facebook || profileUser.twitter} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-[13px] font-bold text-brand-primary inline-flex items-center gap-1.5 mt-1 bg-purple-50 hover:bg-purple-100/70 border border-purple-100/30 px-3.5 py-1.5 rounded-full transition-colors truncate max-w-full"
                >
                  <Globe size={13} /> {new URL(profileUser.linkedin || profileUser.facebook || profileUser.twitter || 'https://linktr.ee/user').hostname}
                </a>
              )}

            </div>

          </div>

          {/* Action buttons (Follow/Message) for other user */}
          {!isMe && (
            <div className="flex gap-2.5 px-4.5 pb-4 pt-2 border-t border-purple-100/10 bg-slate-50/20">
              {isBlocked ? (
                <button
                  onClick={() => unblockUser(profileUser.id || profileUser._id)}
                  className="flex-1 py-2 bg-red-650 hover:bg-red-700 text-white rounded-xl text-[13px] font-black shadow-sm press-scale transition-all"
                >
                  Unblock
                </button>
              ) : isFollowing ? (
                <>
                  <button
                    onClick={async () => {
                      const res = await unfollowUser(profileUser.id || profileUser._id);
                      if (res && res.targetStats) {
                        setProfileStats(prev => ({
                          ...prev,
                          followersCount: res.targetStats.followersCount,
                          followingCount: res.targetStats.followingCount
                        }));
                      }
                    }}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[13px] font-black shadow-sm press-scale transition-all"
                  >
                    Following
                  </button>
                  <button
                    onClick={() => navigate(`/member/chat/${profileUser.id || profileUser._id}`)}
                    className="flex-1 py-2 bg-purple-50 hover:bg-purple-100/60 text-brand-primary rounded-xl text-[13px] font-black border border-purple-100/35 shadow-sm press-scale transition-all"
                  >
                    Message
                  </button>
                </>
              ) : hasRequested ? (
                <button
                  onClick={() => cancelFollowRequest(profileUser.id || profileUser._id)}
                  className="flex-1 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-[13px] font-black shadow-sm press-scale transition-all"
                >
                  Requested
                </button>
              ) : (
                <button
                  onClick={async () => {
                    const res = await sendFollowRequest(profileUser.id || profileUser._id);
                    if (res && res.targetStats) {
                      setProfileStats(prev => ({
                        ...prev,
                        followersCount: res.targetStats.followersCount,
                        followingCount: res.targetStats.followingCount
                      }));
                    }
                  }}
                  className="flex-1 py-2 bg-brand-primary hover:bg-brand-dark text-white rounded-xl text-[13px] font-black shadow-sm press-scale transition-all"
                >
                  Follow
                </button>
              )}
            </div>
          )}
        </div>

        {isBlocked ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-3xl border border-purple-100/10 shadow-sm mx-3.5 sm:mx-0">
            <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
              <span className="text-3xl">🚫</span>
            </div>
            <h3 className="text-[15px] font-bold text-slate-800">Member is Blocked</h3>
            <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
              You have blocked this member or they have blocked you. Unblock them first to view their profile details.
            </p>
          </div>
        ) : !canAccess ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-3xl border border-purple-100/10 shadow-sm mx-3.5 sm:mx-0">
            <div className="w-16 h-16 rounded-full border border-purple-100/10 flex items-center justify-center mb-4 bg-purple-50 text-brand-primary">
              <Lock size={28} />
            </div>
            <h3 className="text-[15px] font-bold text-slate-800">This Profile is Private</h3>
            <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
              Only accepted followers can view this member's posts and details.
            </p>
          </div>
        ) : (
          <>
            {/* ─── PRIVILEGED HEAD CONTROL PANEL TOGGLE (ONLY FOR COMMUNITY HEAD / ADMIN) ─── */}
            {(() => {
              const rawRole = (currentUser?.role || '').toLowerCase();
              const rawDes = (currentUser?.designation || '').toLowerCase();
              const isHeadUser = isMe && (['head', 'sub_head', 'admin'].includes(rawRole) || rawDes === 'community head' || rawDes === 'sub head' || rawDes === 'president');

              if (!isHeadUser) return null;

              return (
                <div className="mx-3.5 sm:mx-0 bg-slate-200/70 p-1 rounded-2xl flex items-center gap-1 border border-slate-350/40 shadow-inner">
                  {/* Active: Member Profile */}
                  <div 
                    className="flex-1 py-2 sm:py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-[13px] font-black text-white shadow-md cursor-default select-none"
                    style={{
                      background: 'linear-gradient(135deg, #180d45 0%, #291361 100%)',
                      boxShadow: '0 2px 8px rgba(24, 13, 69, 0.35)'
                    }}
                  >
                    <User size={14} className="text-purple-300 shrink-0" />
                    <span>Member Profile</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                  </div>

                  {/* Toggle to: Head Control Panel */}
                  <button
                    type="button"
                    onClick={() => navigate('/head/dashboard')}
                    className="flex-1 py-2 sm:py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-[13px] font-bold text-slate-600 hover:text-purple-600 active:scale-95 transition-all cursor-pointer bg-white/80 hover:bg-white shadow-xs"
                  >
                    <Crown size={14} className="text-amber-500 shrink-0" />
                    <span>{rawRole === 'sub_head' ? 'Local Head Panel' : 'Head Control Panel'}</span>
                  </button>
                </div>
              );
            })()}

            {/* ─── STATISTICS CARDS (Posts, Friends, Family) ─── */}
            <div className="grid grid-cols-3 gap-3 mx-3.5 sm:mx-0">
              {/* Card 1: Posts */}
              <motion.div 
                whileHover={{ y: -4, scale: 1.02 }}
                onClick={() => setActiveTab('posts')}
                className="rounded-[24px] p-4 flex flex-col items-center justify-center text-center bg-white border border-purple-100/10 shadow-sm relative overflow-hidden group transition-all duration-300 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #fdfcff 100%)',
                  boxShadow: '0 8px 24px -6px rgba(124,58,237,0.04), inset 0 2px 4px rgba(255,255,255,0.9)'
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center border border-purple-100/40 shadow-sm mb-2 text-brand-primary">
                  <Grid size={17} />
                </div>
                <span className="text-[17px] font-black text-slate-850 leading-none">
                  {profileStats.postsCount || userPosts.length}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-2">Posts</span>
              </motion.div>

              {/* Card 2: Friends */}
              <motion.div 
                whileHover={{ y: -4, scale: 1.02 }}
                onClick={() => setMembersListModalType('followers')}
                className="rounded-[24px] p-4 flex flex-col items-center justify-center text-center bg-white border border-purple-100/10 shadow-sm relative overflow-hidden group transition-all duration-300 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #fdfcff 100%)',
                  boxShadow: '0 8px 24px -6px rgba(124,58,237,0.04), inset 0 2px 4px rgba(255,255,255,0.9)'
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100/40 shadow-sm mb-2 text-blue-500">
                  <Users size={17} />
                </div>
                <span className="text-[17px] font-black text-slate-850 leading-none">
                  {profileStats.followersCount || (isMe ? myFollowers.length : targetFollowersList.length)}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-2">Friends</span>
              </motion.div>

              {/* Card 3: Family */}
              <motion.div 
                whileHover={isMe ? { y: -4, scale: 1.02 } : {}}
                onClick={() => {
                  if (isMe) navigate('/member/profile/family');
                }}
                className={`rounded-[24px] p-4 flex flex-col items-center justify-center text-center bg-white border border-purple-100/10 shadow-sm relative overflow-hidden group transition-all duration-300 ${isMe ? 'cursor-pointer' : 'cursor-default'}`}
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #fdfcff 100%)',
                  boxShadow: '0 8px 24px -6px rgba(124,58,237,0.04), inset 0 2px 4px rgba(255,255,255,0.9)'
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-100/40 shadow-sm mb-2 text-rose-500">
                  <Heart size={17} fill="currentColor" />
                </div>
                <span className="text-[17px] font-black text-slate-850 leading-none">
                  {showFamily ? (profileUser.familyMembers?.length || 0) : '🔒'}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-2">Family</span>
              </motion.div>
            </div>

            {/* ─── HIGHLIGHTS SECTION ─── */}
            {(isMe || (highlights && highlights.length > 0)) && (
              <div className="bg-white rounded-3xl p-4 border border-purple-100/10 shadow-sm mx-3.5 sm:mx-0">
                <div className="flex gap-4 overflow-x-auto scrollbar-hide py-1">
                  {/* New Highlight Button (only when isMe) */}
                  {isMe && (
                    <div className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group" onClick={() => handleOpenHighlightSelection()}>
                      <div className="w-14 h-14 rounded-full border border-dashed border-slate-350 flex items-center justify-center bg-white group-hover:bg-slate-50 transition-colors">
                        <Plus size={20} className="text-slate-800" />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700">New</span>
                    </div>
                  )}
                  {/* Existing Highlights */}
                  {highlights.map(h => (
                    <div key={h._id || h.id} onClick={() => setActiveHighlightView(h)} className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group">
                      <div className="w-14 h-14 rounded-full border-2 border-brand-primary/20 p-[1.5px] bg-white group-hover:scale-105 transition-transform">
                        <img src={resolvePostMediaUrl(h.coverImage || h.cover) || "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=200"} className="w-full h-full rounded-full object-cover" alt={h.title} />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 max-w-[64px] truncate text-center">{h.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── TAB NAVIGATION BAR ─── */}
            <div className="flex items-center border border-purple-100/30 bg-white/75 backdrop-blur-xl sticky top-14 z-20 rounded-2xl p-1 gap-1 shadow-[0_4px_16px_rgba(124,58,237,0.02)] mx-3.5 sm:mx-0">
              {(isMe 
                ? [
                    { id: 'posts', icon: Grid, label: 'Posts' },
                    { id: 'liked', icon: Heart, label: 'Liked' },
                    { id: 'saved', icon: Bookmark, label: 'Saved' }
                  ]
                : [
                    { id: 'posts', icon: Grid, label: 'Posts' },
                    { id: 'details', icon: Info, label: 'Details' }
                  ]
              ).map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-2.5 rounded-xl flex flex-col items-center justify-center transition-all duration-300 relative press-scale ${
                      isActive ? 'text-brand-primary' : 'text-slate-400 hover:text-slate-650'
                    }`}
                    style={isActive ? { background: 'rgba(124,58,237,0.07)' } : {}}
                  >
                    <tab.icon size={19} className={isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'} />
                    <span className="text-[9px] font-black uppercase tracking-wider mt-1">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ─── TABS CONTENT PANELS ─── */}
            
            {/* Posts Tab Content */}
            {activeTab === 'posts' && (
              <div className="px-0.5 mx-3.5 sm:mx-0">
                {loadingPosts ? (
                  <div className="py-16 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1 md:gap-1.5">
                    {userPosts.length > 0 ? (
                      userPosts.map((post) => (
                        <ProfilePostThumbnail 
                          key={post.id} 
                          post={post} 
                          onClick={() => navigate(`/member/social/${post.id}`)} 
                        />
                      ))
                    ) : (
                      <div className="col-span-3 py-16 flex flex-col items-center justify-center text-slate-400 bg-white rounded-[28px] border border-purple-100/10 shadow-sm">
                        <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mb-3 border border-slate-100">
                          <Camera size={22} className="text-slate-400" />
                        </div>
                        <h3 className="text-xs font-black text-slate-700">No Posts Yet</h3>
                        <p className="text-[10px] text-slate-450 mt-0.5">
                          {isMe ? 'Share a moment with your community.' : 'No posts shared by this member yet.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Liked Tab Content */}
            {activeTab === 'liked' && isMe && (
              <div className="px-0.5 mx-3.5 sm:mx-0">
                <div className="grid grid-cols-3 gap-1 md:gap-1.5">
                  {likedPostsList.length > 0 ? (
                    likedPostsList.map((post) => (
                      <ProfilePostThumbnail 
                        key={post.id} 
                        post={post} 
                        onClick={() => navigate(`/member/social/${post.id}`)} 
                      />
                    ))
                  ) : (
                    <div className="col-span-3 py-16 flex flex-col items-center justify-center text-slate-400 bg-white rounded-[28px] border border-purple-100/10 shadow-sm">
                      <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mb-3 border border-slate-100">
                        <Heart size={22} className="text-slate-400" />
                      </div>
                      <h3 className="text-xs font-black text-slate-700">No Liked Posts</h3>
                      <p className="text-[10px] text-slate-450 mt-0.5">Posts you like will appear here.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Saved Tab Content */}
            {activeTab === 'saved' && isMe && (
              <div className="px-0.5 mx-3.5 sm:mx-0">
                <div className="grid grid-cols-3 gap-1 md:gap-1.5">
                  {savedPostsList.length > 0 ? (
                    savedPostsList.map((post) => (
                      <ProfilePostThumbnail 
                        key={post.id} 
                        post={post} 
                        onClick={() => navigate(`/member/social/${post.id}`)} 
                      />
                    ))
                  ) : (
                    <div className="col-span-3 py-16 flex flex-col items-center justify-center text-slate-400 bg-white rounded-[28px] border border-purple-100/10 shadow-sm">
                      <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mb-3 border border-slate-100">
                        <Bookmark size={22} className="text-slate-400" />
                      </div>
                      <h3 className="text-xs font-black text-slate-700">No Saved Posts</h3>
                      <p className="text-[10px] text-slate-450 mt-0.5">Posts you save will appear here.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Details Tab Content (only when !isMe) */}
            {activeTab === 'details' && !isMe && (
              <div className="p-4 space-y-6 bg-white rounded-3xl border border-purple-100/10 shadow-sm mx-3.5 sm:mx-0">
                {/* Section 1: Personal Information */}
                <div className="space-y-2 text-left">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Personal Information</h3>
                  <div className="bg-slate-50/50 rounded-2xl border border-purple-100/10 divide-y divide-purple-100/10 overflow-hidden">
                    <InfoField label="Member ID" value={memberIdCode} />
                    <InfoField label="Date of Birth" value={dobStr} />
                    <InfoField label="Mobile Number" value={showPhone ? phoneNum : (memberGranular.phone === 'private' ? '🔒 Private' : '🔒 Followers Only')} />
                    <InfoField label="Email" value={showEmail ? emailAddr : (memberGranular.email === 'private' ? '🔒 Private' : '🔒 Followers Only')} />
                  </div>
                </div>

                {/* Section 2: Professional Information */}
                <div className="space-y-2 text-left">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Professional Information</h3>
                  <div className="bg-slate-50/50 rounded-2xl border border-purple-100/10 divide-y divide-purple-100/10 overflow-hidden">
                    <InfoField label="Company" value={companyName} />
                    <InfoField label="Business" value={businessSector} />
                    <InfoField label="Est. Year" value={estYear.toString()} />
                  </div>
                </div>

                {/* Section 3: Address */}
                <div className="space-y-2 text-left">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Address</h3>
                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-purple-100/10">
                    <div className="flex gap-2.5 items-start">
                      <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-slate-700 leading-relaxed">{fullAddress}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Social Links Modal */}
      {showSocialModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" style={{ touchAction: 'none' }} onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-pop border border-purple-100/20" style={{ touchAction: 'auto' }}>
            <h3 className="text-[16px] font-bold text-text-primary">Add Social Media Links</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase">Facebook</label>
                <input 
                  type="text" 
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  className="w-full mt-1 bg-surface border border-purple-100/30 rounded-xl px-4 py-2.5 text-xs font-semibold text-text-primary outline-none focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/10 transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase">Twitter</label>
                <input 
                  type="text" 
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  className="w-full mt-1 bg-surface border border-purple-100/30 rounded-xl px-4 py-2.5 text-xs font-semibold text-text-primary outline-none focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/10 transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase">LinkedIn</label>
                <input 
                  type="text" 
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  className="w-full mt-1 bg-surface border border-purple-100/30 rounded-xl px-4 py-2.5 text-xs font-semibold text-text-primary outline-none focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/10 transition-all shadow-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setShowSocialModal(false)}
                className="flex-1 py-3 border border-purple-100/30 text-text-primary rounded-2xl font-bold text-xs press-scale text-center hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveSocials}
                className="flex-1 py-3 bg-gradient-to-r from-brand-primary to-brand-glow text-white rounded-2xl font-bold text-xs press-scale text-center hover:shadow-lg shadow-purple-500/25 flex items-center justify-center gap-1.5"
              >
                <Check size={14} /> Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Privacy Settings Modal */}
      {showPrivacyModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" style={{ touchAction: 'none' }} onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-pop border border-purple-100/20 max-h-[85vh] overflow-y-auto" style={{ touchAction: 'auto' }}>
            <div className="flex items-center justify-between border-b border-purple-100/20 pb-2.5">
              <h3 className="text-[16px] font-bold text-text-primary">Privacy Settings</h3>
              <button onClick={() => setShowPrivacyModal(false)} className="text-purple-300 hover:text-brand-primary w-7 h-7 bg-purple-50 rounded-full flex items-center justify-center font-bold">✕</button>
            </div>
            
            <div className="space-y-4 pt-1">
              {/* Profile Type Toggle */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-text-secondary uppercase block">Profile Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMyPrivacySetting('public')}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      myPrivacySetting === 'public'
                        ? 'bg-brand-primary border-brand-primary text-white shadow-md shadow-purple-200'
                        : 'bg-white border-purple-100/30 text-text-secondary hover:border-purple-200'
                    }`}
                  >
                    🔓 Public
                  </button>
                  <button
                    onClick={() => setMyPrivacySetting('private')}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      myPrivacySetting === 'private'
                        ? 'bg-brand-primary border-brand-primary text-white shadow-md shadow-purple-200'
                        : 'bg-white border-purple-100/30 text-text-secondary hover:border-purple-200'
                    }`}
                  >
                    🔒 Private
                  </button>
                </div>
              </div>

              {/* Granular Option: Phone */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-text-secondary uppercase">Mobile Visibility</label>
                <select
                  value={myPhoneSetting}
                  onChange={(e) => setMyPhoneSetting(e.target.value)}
                  className="w-full bg-surface border border-purple-100/30 rounded-xl px-3 py-2.5 text-xs font-semibold text-text-primary outline-none focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/10 transition-all shadow-sm"
                >
                  <option value="public">Public</option>
                  <option value="followers">Followers Only</option>
                  <option value="private">Only Me</option>
                </select>
              </div>

              {/* Granular Option: Email */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-text-secondary uppercase">Email Visibility</label>
                <select
                  value={myEmailSetting}
                  onChange={(e) => setMyEmailSetting(e.target.value)}
                  className="w-full bg-surface border border-purple-100/30 rounded-xl px-3 py-2.5 text-xs font-semibold text-text-primary outline-none focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/10 transition-all shadow-sm"
                >
                  <option value="public">Public</option>
                  <option value="followers">Followers Only</option>
                  <option value="private">Only Me</option>
                </select>
              </div>

              {/* Granular Option: Family Tree */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-text-secondary uppercase">Family Tree Visibility</label>
                <select
                  value={myFamilySetting}
                  onChange={(e) => setMyFamilySetting(e.target.value)}
                  className="w-full bg-surface border border-purple-100/30 rounded-xl px-3 py-2.5 text-xs font-semibold text-text-primary outline-none focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/10 transition-all shadow-sm"
                >
                  <option value="public">Public</option>
                  <option value="followers">Followers Only</option>
                  <option value="private">Only Me</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-purple-100/20">
              <button 
                onClick={() => setShowPrivacyModal(false)}
                className="flex-1 py-3 border border-purple-100/30 text-text-primary rounded-2xl font-bold text-xs press-scale text-center hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePrivacy}
                className="flex-1 py-3 bg-gradient-to-r from-brand-primary to-brand-glow text-white rounded-2xl font-bold text-xs press-scale text-center hover:shadow-lg shadow-purple-500/25 flex items-center justify-center gap-1.5"
              >
                <Check size={14} /> Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Members List Modal (Followers / Following) */}
      {membersListModalType && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" style={{ touchAction: 'none' }} onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl flex flex-col h-[80vh] max-h-[80vh] animate-scale-pop border border-purple-100/20" style={{ touchAction: 'auto' }}>
            <div className="flex items-center justify-between pb-3 border-b border-purple-100/20 shrink-0">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide">
                {membersListModalType === 'followers' ? 'Followers' : 'Following'}
              </h3>
              <button 
                onClick={() => setMembersListModalType(null)}
                className="w-7 h-7 rounded-full bg-purple-50 hover:bg-purple-100 flex items-center justify-center text-brand-primary font-bold transition-all active:scale-95"
              >
                ✕
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="mt-3.5 mb-2 shrink-0 relative">
              <input
                type="text"
                placeholder="Search by name, city, gotra..."
                value={membersSearchQuery}
                onChange={(e) => setMembersSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-purple-100/30 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-text-primary outline-none focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/10 transition-all shadow-inner"
              />
              <span className="absolute left-3.5 top-3 text-slate-400">🔍</span>
              {membersSearchQuery && (
                <button
                  onClick={() => setMembersSearchQuery('')}
                  className="absolute right-3.5 top-3 text-[10px] font-black text-slate-400 hover:text-slate-650"
                >
                  ✕
                </button>
              )}
            </div>
            
            <div className="overflow-y-auto py-4 space-y-3 flex-1 min-h-[200px]">
              {loadingFollows ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                  <Loader2 size={24} className="animate-spin text-brand-primary" />
                  <span className="text-xs font-semibold">Loading members...</span>
                </div>
              ) : (() => {
                const sourceList = membersListModalType === 'followers'
                  ? (targetFollowersList.length > 0 ? targetFollowersList : myFollowers)
                  : (targetFollowingList.length > 0 ? targetFollowingList : myFollowing);

                const listToRender = sourceList.filter(m => {
                  const q = membersSearchQuery.toLowerCase();
                  return (
                    m.name?.toLowerCase().includes(q) ||
                    m.city?.toLowerCase().includes(q) ||
                    m.profession?.toLowerCase().includes(q) ||
                    m.subCommunity?.toLowerCase().includes(q)
                  );
                });

                return listToRender.length > 0 ? (
                  listToRender.map(m => (
                    <div key={m.id || m._id} className="flex items-center justify-between p-3.5 bg-purple-50/30 border border-purple-100/20 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={m.avatar} initials={m.initials} size="sm" color="bg-purple-100 text-brand-primary font-bold" />
                        <div>
                          <h4 className="text-[13px] font-bold text-text-primary leading-none">{m.name}</h4>
                          <p className="text-[10px] text-text-secondary mt-1">{m.city || m.community || 'Member'}</p>
                        </div>
                      </div>
                      {membersListModalType === 'followers' ? (
                        <button
                          onClick={async () => {
                            await removeFollower(m.id);
                            setTargetFollowersList(prev => prev.filter(item => (item.id || item._id) !== m.id));
                            setProfileStats(prev => ({ ...prev, followersCount: Math.max(0, (prev.followersCount || 1) - 1) }));
                          }}
                          className="px-3.5 py-1.5 bg-red-50 text-red-650 hover:bg-red-100/60 rounded-xl text-[11px] font-bold press-scale transition-colors"
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            await unfollowUser(m.id);
                            setTargetFollowingList(prev => prev.filter(item => (item.id || item._id) !== m.id));
                            setProfileStats(prev => ({ ...prev, followingCount: Math.max(0, (prev.followingCount || 1) - 1) }));
                          }}
                          className="px-3.5 py-1.5 bg-purple-50 text-brand-primary hover:bg-purple-100/60 rounded-xl text-[11px] font-bold press-scale transition-colors"
                        >
                          Unfollow
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-text-muted">
                    <p className="text-xs font-semibold">
                      {membersSearchQuery ? 'No search results found.' : `No ${membersListModalType === 'followers' ? 'followers' : 'following'} found.`}
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Blocked Users Modal */}
      {showBlockedModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" style={{ touchAction: 'none' }} onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl flex flex-col max-h-[75vh] animate-scale-pop border border-purple-100/20" style={{ touchAction: 'auto' }}>
            <div className="flex items-center justify-between pb-3 border-b border-purple-100/20 shrink-0">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide">
                Blocked Users
              </h3>
              <button 
                onClick={() => setShowBlockedModal(false)}
                className="w-7 h-7 rounded-full bg-purple-50 hover:bg-purple-100 flex items-center justify-center text-brand-primary font-bold transition-all active:scale-95"
              >
                ✕
              </button>
            </div>
            
            <div className="overflow-y-auto py-4 space-y-3 flex-1 min-h-[200px]">
              {blockedMembersList.length > 0 ? (
                blockedMembersList.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3.5 bg-purple-50/30 border border-purple-100/20 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={m.initials} size="sm" color="bg-red-50 text-red-650 font-bold animate-pulse-glow" />
                      <div>
                        <h4 className="text-[13px] font-bold text-text-primary leading-none">{m.name}</h4>
                        <p className="text-[10px] text-text-secondary mt-1">{m.city}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => unblockUser(m.id)}
                      className="px-3.5 py-1.5 bg-purple-50 text-brand-primary hover:bg-purple-100/60 rounded-xl text-[11px] font-bold press-scale transition-colors"
                    >
                      Unblock
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-text-muted">
                  <p className="text-xs font-semibold">
                    No blocked users found.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <AnimatePresence>
        {showActivityDashboard && (
          <ActivityDashboard onClose={() => setShowActivityDashboard(false)} />
        )}
      </AnimatePresence>

      {/* Highlight Selection Modal */}
      {showHighlightSelectionModal && createPortal(
        <div className="fixed inset-0 z-[9999] bg-[#0c0c0c] flex flex-col animate-slide-up h-full w-full max-w-md mx-auto" style={{ touchAction: 'none' }} onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-white/10">
            <div className="flex items-center gap-6">
              <button onClick={() => setShowHighlightSelectionModal(false)} className="text-white p-1 -ml-1 active:scale-95 transition-transform">
                <ArrowLeft size={24} />
              </button>
              <h2 className="text-white text-[19px] font-semibold tracking-tight">Add to highlight</h2>
            </div>
            <button 
              onClick={() => {
                setShowHighlightSelectionModal(false);
                setShowHighlightCreationModal(true);
              }}
              disabled={selectedHighlightItems.length === 0}
              className={`text-[15px] font-semibold tracking-wide ${selectedHighlightItems.length > 0 ? 'text-[#0095f6]' : 'text-white/40'}`}
            >
              Next
            </button>
          </div>
          {/* Grid of user's stories & past posts */}
          <div className="flex-1 overflow-y-auto bg-[#0c0c0c] p-[1px]" style={{ touchAction: 'auto' }}>
            {loadingPastStories ? (
              <div className="flex items-center justify-center py-20 text-white/50 text-xs">
                Loading your stories...
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-[2px]">
                {(() => {
                  const displayItems = pastStories.length > 0 ? pastStories : posts.filter(p => p.images && p.images.length > 0).map(p => ({ _id: p.id, media: p.images[0] }));
                  if (displayItems.length === 0) {
                    return (
                      <div className="col-span-3 py-20 text-center text-white/40 text-xs">
                        No stories available to create highlight. Post a story first!
                      </div>
                    );
                  }
                  
                  return displayItems.map((storyItem, idx) => {
                    const itemMedia = storyItem.media || storyItem.image || storyItem;
                    const isSelected = selectedHighlightItems.some(s => (s._id || s) === (storyItem._id || storyItem));
                    return (
                      <div 
                        key={storyItem._id || idx} 
                        onClick={() => {
                          if (isSelected) {
                            setSelectedHighlightItems(prev => prev.filter(s => (s._id || s) !== (storyItem._id || storyItem)));
                          } else {
                            setSelectedHighlightItems(prev => [...prev, storyItem]);
                          }
                        }}
                        className="aspect-[9/16] bg-gray-900 relative cursor-pointer overflow-hidden group"
                      >
                        <img src={itemMedia} className="w-full h-full object-cover" alt="Story preview" />
                        <div className="absolute inset-0 bg-black/10 group-active:bg-black/30 transition-colors" />
                        <div className="absolute top-2 right-2">
                          <div className={`w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center transition-all ${
                            isSelected 
                              ? 'bg-[#0095f6] border-[#0095f6] scale-100 opacity-100' 
                              : 'border-white/80 bg-black/20 backdrop-blur-sm opacity-80'
                          }`}>
                            {isSelected && <Check size={14} strokeWidth={3} className="text-white" />}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Highlight Creation Modal */}
      {showHighlightCreationModal && createPortal(
        <div className="fixed inset-0 z-[9999] bg-[#0c0c0c] flex flex-col animate-slide-up h-full w-full max-w-md mx-auto" style={{ touchAction: 'none' }} onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-white/10">
            <div className="flex items-center gap-6">
              <button onClick={() => {
                setShowHighlightCreationModal(false);
                setShowHighlightSelectionModal(true);
              }} className="text-white p-1 -ml-1 active:scale-95 transition-transform">
                <ArrowLeft size={24} />
              </button>
              <h2 className="text-white text-[19px] font-semibold tracking-tight">New highlight</h2>
            </div>
            <button 
              onClick={handleCreateHighlightDone}
              className="text-[#0095f6] text-[15px] font-semibold tracking-wide active:text-white/70 transition-colors"
            >
              Done
            </button>
          </div>
          {/* Edit Cover & Title */}
          <div className="flex-1 flex flex-col items-center pt-16 px-6" style={{ touchAction: 'auto' }}>
            <div className="w-[88px] h-[88px] rounded-full p-[2px] bg-gradient-to-tr from-purple-500 to-indigo-500 mb-3 shadow-xl">
              <div className="w-full h-full rounded-full overflow-hidden bg-[#0c0c0c] border-[3px] border-[#0c0c0c]">
                <img src={selectedHighlightItems[0]?.media || selectedHighlightItems[0]} className="w-full h-full object-cover" alt="Cover" />
              </div>
            </div>
            <button className="text-[#0095f6] text-[13.5px] font-medium mb-8 active:opacity-70 transition-opacity">Highlight Cover</button>
            <div className="w-full max-w-[200px] relative">
              <input 
                type="text"
                value={newHighlightTitle}
                onChange={(e) => setNewHighlightTitle(e.target.value)}
                className="w-full bg-transparent border-b-[1.5px] border-[#0095f6] text-center text-white text-[17px] font-medium outline-none pb-2 placeholder:text-white/30 focus:border-[#0095f6] transition-colors"
                placeholder="Highlights"
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Notifications Preferences Modal */}
      {showNotificationsModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" style={{ touchAction: 'none' }} onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-pop border border-purple-100/20 max-h-[85vh] overflow-y-auto" style={{ touchAction: 'auto' }}>
            <div className="flex items-center justify-between border-b border-purple-100/20 pb-2.5">
              <h3 className="text-[16px] font-bold text-text-primary flex items-center gap-2">
                <span>🔔</span> Notifications
              </h3>
              <button onClick={() => setShowNotificationsModal(false)} className="text-purple-300 hover:text-brand-primary w-7 h-7 bg-purple-50 rounded-full flex items-center justify-center font-bold">✕</button>
            </div>
            <div className="space-y-3 pt-1">
              {[
                { key: 'announcements', label: 'Community Announcements' },
                { key: 'matrimonial', label: 'Matrimonial Alerts' },
                { key: 'events', label: 'Event RSVP Alerts' },
                { key: 'groups', label: 'Group Chat Messages' }
              ].map((opt) => {
                const isActive = followedAnnouncements?.[opt.key] !== false;
                return (
                  <div key={opt.key} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100/60">
                    <span className="text-[13px] font-bold text-slate-700">{opt.label}</span>
                    <button 
                      onClick={() => toggleFollowedAnnouncement(opt.key)}
                      className={`w-11 h-6 rounded-full relative transition-all ${isActive ? 'bg-brand-primary' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-0.75 transition-all shadow-sm ${isActive ? 'right-0.75' : 'left-0.75'}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Language Selection Modal */}
      {showLanguageModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" style={{ touchAction: 'none' }} onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-pop border border-purple-100/20" style={{ touchAction: 'auto' }}>
            <div className="flex items-center justify-between border-b border-purple-100/20 pb-2.5">
              <h3 className="text-[16px] font-bold text-text-primary flex items-center gap-2">
                <span>🌐</span> Select Language
              </h3>
              <button onClick={() => setShowLanguageModal(false)} className="text-purple-300 hover:text-brand-primary w-7 h-7 bg-purple-50 rounded-full flex items-center justify-center font-bold">✕</button>
            </div>
            <div className="space-y-2.5 pt-1">
              {[
                { key: 'en', label: 'English' },
                { key: 'hi', label: 'हिन्दी (Hindi)' }
              ].map((langOpt) => {
                const isSelected = language === langOpt.key;
                return (
                  <button 
                    key={langOpt.key}
                    onClick={() => {
                      setLanguage(langOpt.key);
                      setShowLanguageModal(false);
                    }}
                    className={`w-full p-4 rounded-2xl flex items-center justify-between font-bold text-[14px] border transition-all ${isSelected ? 'bg-purple-50 border-brand-primary text-brand-primary' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                  >
                    <span>{langOpt.label}</span>
                    {isSelected && <Check size={18} className="text-brand-primary animate-scale-in" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Theme Settings Modal */}
      {showThemeModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" style={{ touchAction: 'none' }} onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-pop border border-purple-100/20" style={{ touchAction: 'auto' }}>
            <div className="flex items-center justify-between border-b border-purple-100/20 pb-2.5">
              <h3 className="text-[16px] font-bold text-text-primary flex items-center gap-2">
                <span>📱</span> Theme Settings
              </h3>
              <button onClick={() => setShowThemeModal(false)} className="text-purple-300 hover:text-brand-primary w-7 h-7 bg-purple-50 rounded-full flex items-center justify-center font-bold">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              {[
                { key: 'light', label: 'Light Mode', icon: Sun, color: 'text-amber-500' },
                { key: 'dark', label: 'Dark Mode', icon: Moon, color: 'text-indigo-600' }
              ].map((mode) => {
                const isSelected = theme === mode.key;
                return (
                  <button 
                    key={mode.key}
                    onClick={() => {
                      setTheme(mode.key);
                      setShowThemeModal(false);
                    }}
                    className={`p-5 rounded-2xl flex flex-col items-center gap-2.5 border transition-all font-bold text-[13px] ${isSelected ? 'bg-purple-50 border-brand-primary text-brand-primary shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                  >
                    <mode.icon size={22} className={mode.color} />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Help & Support Modal */}
      {showHelpModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" style={{ touchAction: 'none' }} onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-pop border border-purple-100/20" style={{ touchAction: 'auto' }}>
            <div className="flex items-center justify-between border-b border-purple-100/20 pb-2.5">
              <h3 className="text-[16px] font-bold text-text-primary flex items-center gap-2">
                <span>🛡️</span> Contact Support
              </h3>
              <button onClick={() => {
                setShowHelpModal(false);
                setSupportSubmitted(false);
                setSupportMessage('');
              }} className="text-purple-300 hover:text-brand-primary w-7 h-7 bg-purple-50 rounded-full flex items-center justify-center font-bold">✕</button>
            </div>
            
            {supportSubmitted ? (
              <div className="py-8 flex flex-col items-center justify-center text-center animate-scale-in">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-100 shadow-sm mb-3">
                  <Check size={24} />
                </div>
                <h4 className="font-bold text-[15px] text-slate-700">Ticket Submitted</h4>
                <p className="text-[12px] text-slate-500 mt-1 max-w-[220px]">Our support team will contact you shortly.</p>
              </div>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                if (supportMessage.trim()) {
                  setSupportSubmitted(true);
                  setTimeout(() => {
                    setSupportSubmitted(false);
                    setSupportMessage('');
                    setShowHelpModal(false);
                  }, 2000);
                }
              }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">How can we help you?</label>
                  <textarea 
                    rows={4}
                    placeholder="Describe your issue or feedback in detail..."
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-[13px] font-medium outline-none focus:border-brand-primary focus:ring-4 focus:ring-purple-50 transition-all resize-none"
                    required
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-brand-primary text-white rounded-xl text-[14px] font-bold hover:bg-brand-dark flex items-center justify-center gap-1.5 shadow-md shadow-brand-primary/10"
                >
                  Submit Request
                </button>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* About MeriSamaj Modal */}
      {showAboutModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" style={{ touchAction: 'none' }} onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-pop border border-purple-100/20" style={{ touchAction: 'auto' }}>
            <div className="flex items-center justify-between border-b border-purple-100/20 pb-2.5">
              <h3 className="text-[16px] font-bold text-text-primary flex items-center gap-2">
                <span>ℹ️</span> About MeriSamaj
              </h3>
              <button onClick={() => setShowAboutModal(false)} className="text-purple-300 hover:text-brand-primary w-7 h-7 bg-purple-50 rounded-full flex items-center justify-center font-bold">✕</button>
            </div>
            <div className="space-y-4 text-slate-600 text-[13px] leading-relaxed pt-1">
              <div className="text-center py-4 bg-purple-50/50 rounded-2xl border border-purple-100/30 mb-2">
                <div className="text-2xl font-black text-brand-primary">MeriSamaj</div>
                <div className="text-[11px] font-bold text-slate-400 mt-0.5">COMMUNITY CONNECT & SERVICES</div>
              </div>
              <p>
                MeriSamaj is a unified platform created to connect family members, manage community bookings, publish announcements, and facilitate matrimonial matchmaking in a highly secure and private digital ecosystem.
              </p>
              <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-400">Release Version</span>
                  <span className="font-bold text-slate-700">1.2.0 (Stable)</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-400">Website URL</span>
                  <a href="https://merisamaj.com" target="_blank" rel="noopener noreferrer" className="font-bold text-brand-primary hover:underline">merisamaj.com</a>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Active Highlight Viewer Modal */}
      {activeHighlightView && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-[#111] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[85vh] relative">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-brand-primary p-0.5">
                  <img src={activeHighlightView.coverImage || activeHighlightView.cover} className="w-full h-full object-cover rounded-full" alt="Cover" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-none">{activeHighlightView.title}</h3>
                  <span className="text-[10px] text-white/50 mt-1 block">Highlight Stories</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleDeleteHighlight(activeHighlightView._id || activeHighlightView.id)}
                  className="px-2.5 py-1 text-[11px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                  Delete
                </button>
                <button 
                  onClick={() => setActiveHighlightView(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeHighlightView.storyIds && activeHighlightView.storyIds.length > 0 ? (
                activeHighlightView.storyIds.map((story, idx) => (
                  <div key={story._id || idx} className="rounded-2xl overflow-hidden border border-white/10 bg-black/50 relative aspect-[9/16]">
                    <img src={story.media || story} className="w-full h-full object-cover" alt="Highlight item" />
                    {story.text && (
                      <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md p-2.5 rounded-xl border border-white/10 text-white text-xs">
                        {story.text}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="aspect-[9/16] rounded-2xl overflow-hidden border border-white/10 bg-black/50 relative">
                  <img src={activeHighlightView.coverImage || activeHighlightView.cover} className="w-full h-full object-cover" alt="Highlight item" />
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const InfoField = ({ label, value }) => (
  <div className="flex justify-between items-center px-4 py-3.5 text-xs font-semibold">
    <span className="text-slate-400 font-medium">{label}</span>
    <span className="text-slate-700 font-bold text-right truncate max-w-[200px]" title={value}>{value || '—'}</span>
  </div>
);

export default MyProfilePage;
