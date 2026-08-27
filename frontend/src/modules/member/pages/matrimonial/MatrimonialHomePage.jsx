import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Heart, Bell, SlidersHorizontal, X, Star, Crown, ChevronRight,
  ChevronLeft, Home, Mail, MessageCircle, Sparkles, ShieldCheck, MapPin,
  Briefcase, GraduationCap, Clock, Check, Bookmark, BookmarkCheck,
  Play, Pencil, User, Image, Lock, ShieldAlert, Award, EyeOff, ArrowLeft, Plus,
  Phone, MailCheck, ShieldCheck as VerifiedIcon, Sparkles as SpotlightIcon,
  PhoneCall, Users, SwitchCamera
} from 'lucide-react';
import { useData } from '../../context/DataProvider';
import { useMatrimonial } from './MatrimonialContext';
import { matrimonialChatService } from '../../../../core/api/matrimonialService';

const membershipRanks = {
  'Normal': 1,
  'Pro Plan': 2,
  'Pro Max Plan': 3,
  'Pro Supreme Plan': 4,
  'Combo Plan': 5
};
const MatrimonialHomePage = () => {
  const navigate = useNavigate();
  const { currentUser, updateProfile, getUnreadCountForModule } = useData();
  const {
    dashboard, dashboardLoading, fetchDashboard,
    myProfile,
    receivedInterests, sentInterests, acceptedInterests, interestsLoading,
    fetchInterests,
    sendInterest, acceptInterest: acceptInterestAPI, rejectInterest: rejectInterestAPI,
    cancelInterest: cancelInterestAPI,
    visitors,
    toggleShortlist, isShortlisted, searchFilters, setSearchFilters
  } = useMatrimonial();

  // ─── Interest Counts from real API ───────────────────────────────────────
  const receivedCount = dashboard?.interests?.received ?? receivedInterests.length;
  const acceptedCount = dashboard?.interests?.accepted ?? acceptedInterests.length;
  const sentCount     = dashboard?.interests?.sent     ?? sentInterests.length;

  // ─── Activity Tab Data from real API ────────────────────────────────────
  const [activityInterestTab, setActivityInterestTab] = useState('Received');

  const activeList = useMemo(() => {
    if (activityInterestTab === 'Received') return receivedInterests;
    if (activityInterestTab === 'Accepted') return acceptedInterests;
    if (activityInterestTab === 'Sent')     return sentInterests;
    return [];
  }, [activityInterestTab, receivedInterests, sentInterests, acceptedInterests]);
  const [ignoredIds, setIgnoredIds] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [activeFilterPill, setActiveFilterPill] = useState('all'); // 'all' | 'verified' | 'joined' | 'nearby'
  const [searchText, setSearchText] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const openChatWithProfile = async (profileId) => {
    try {
      const res = await matrimonialChatService.openConversation(profileId);
      navigate(`/member/matrimonial/chat/${res.data.data.conversation._id}`);
    } catch (err) {
      showToast('Cannot open chat. Make sure interest is accepted.');
    }
  };

  const [myPhotosCount, setMyPhotosCount] = useState(3);
  const [myMatrimonialBio, setMyMatrimonialBio] = useState(currentUser?.matrimonialBio || currentUser?.bio || "");
  const [myGotra, setMyGotra] = useState(currentUser?.gotra || "Not specified");
  const [myDiet, setMyDiet] = useState(currentUser?.diet || "Not specified");
  const [myIncome, setMyIncome] = useState(currentUser?.income || currentUser?.annualIncome || "Not specified");
  
  // New Basic Details
  const [myHeight, setMyHeight] = useState(currentUser?.height || "");
  const [myWeight, setMyWeight] = useState(currentUser?.weight || "");
  const [myBodyType, setMyBodyType] = useState(currentUser?.bodyType || "Not specified");
  const [myComplexion, setMyComplexion] = useState(currentUser?.complexion || "Not specified");
  const [myBloodGroup, setMyBloodGroup] = useState(currentUser?.bloodGroup || "Not specified");
  const [myMaritalStatus, setMyMaritalStatus] = useState(currentUser?.maritalStatus || "Not specified");
  const [myMotherTongue, setMyMotherTongue] = useState(currentUser?.motherTongue || "");
  
  const [activePickerSheet, setActivePickerSheet] = useState(null); // null | 'gotra' | 'diet' | 'income' | 'partner-gotra' | 'partner-diet' | 'bodyType' | 'complexion' | 'bloodGroup' | 'maritalStatus'

  // Matrimony Subscription state helpers
  const sub = currentUser?.matrimonySubscription;
  const isCurrentlySubscribed = sub && sub.status === 'active';
  const isCombo = isCurrentlySubscribed && sub.plan === 'Combo';

  const [userMembership, setUserMembership] = useState('Pro Max');
  const [isMembershipPopupOpen, setIsMembershipPopupOpen] = useState(false);
  const [selectedPlanToUpgrade, setSelectedPlanToUpgrade] = useState('Pro Supreme');

  useEffect(() => {
    if (isCurrentlySubscribed) {
      setUserMembership(sub.plan + ' Plan');
    } else {
      setUserMembership('Normal');
    }
  }, [sub, isCurrentlySubscribed]);

  // Sync state values with active profile (e.g. for Combo subscription)
  useEffect(() => {
    if (isCombo && sub?.profiles?.[sub.activeProfileType]) {
      const p = sub.profiles[sub.activeProfileType];
      setMyMatrimonialBio(p.bio || p.matrimonialBio || '');
      setMyGotra(p.gotra || 'Garg');
      setMyDiet(p.diet || 'Vegetarian');
      setMyIncome(p.income || '₹10-15 Lacs p.a');
      setMyPhotosCount(p.photosCount || 3);
      setMyHeight(p.height || '');
      setMyWeight(p.weight || '');
      setMyBodyType(p.bodyType || 'Not specified');
      setMyComplexion(p.complexion || 'Not specified');
      setMyBloodGroup(p.bloodGroup || 'Not specified');
      setMyMaritalStatus(p.maritalStatus || 'Not specified');
      setMyMotherTongue(p.motherTongue || '');
    } else {
      setMyMatrimonialBio(currentUser?.matrimonialBio || '');
      setMyGotra(currentUser?.gotra || 'Garg');
      setMyDiet(currentUser?.diet || 'Vegetarian');
      setMyIncome(currentUser?.income || '₹10-15 Lacs p.a');
      setMyPhotosCount(currentUser?.photosCount || 3);
      setMyHeight(currentUser?.height || '');
      setMyWeight(currentUser?.weight || '');
      setMyBodyType(currentUser?.bodyType || 'Not specified');
      setMyComplexion(currentUser?.complexion || 'Not specified');
      setMyBloodGroup(currentUser?.bloodGroup || 'Not specified');
      setMyMaritalStatus(currentUser?.maritalStatus || 'Not specified');
      setMyMotherTongue(currentUser?.motherTongue || '');
    }
  }, [sub?.activeProfileType, currentUser, isCombo]);

  const handleSaveDetails = (updatedFields) => {
    if (isCombo) {
      const updatedProfiles = {
        ...sub.profiles,
        [sub.activeProfileType]: {
          ...(sub.profiles?.[sub.activeProfileType] || {}),
          ...updatedFields
        }
      };
      updateProfile({
        matrimonySubscription: {
          ...sub,
          profiles: updatedProfiles
        }
      });
      showToast('Profile details saved successfully! 💖');
    } else {
      updateProfile(updatedFields);
      showToast('Profile details saved successfully! 💖');
    }
  };

  const handleSwitchActiveProfileType = (type) => {
    updateProfile({
      matrimonySubscription: {
        ...sub,
        activeProfileType: type
      }
    });
    showToast(`Now editing ${type === 'groom' ? "Son's" : "Daughter's"} Matrimonial Profile 🔄`);
  };

  const handleToggleComboActiveProfile = () => {
    if (!isCurrentlySubscribed || sub.plan !== 'Combo') return;
    const nextActive = sub.activeProfileType === 'groom' ? 'bride' : 'groom';
    updateProfile({
      matrimonySubscription: {
        ...sub,
        activeProfileType: nextActive
      }
    });
    showToast(`Switched active search to ${nextActive === 'groom' ? "Son's Matches (Viewing Brides)" : "Daughter's Matches (Viewing Grooms)"} 🔄`);
  };

  // Sub-navigation view inside activity hub
  const [currentSubView, setCurrentSubView] = useState(null); // null (default bottom nav matches/activity) | 'visits' | 'shortlisted' | 'contacts'
  const [visitsTab, setVisitsTab] = useState('visitors'); // 'visitors' | 'visited'
  const [contactsTab, setContactsTab] = useState('viewed-my'); // 'viewed-my' | 'i-viewed'
  const [shortlistTab, setShortlistTab] = useState('they-shortlisted'); // 'they-shortlisted' | 'i-shortlisted'
  
  // Messenger layout state
  const [messengerTab, setMessengerTab] = useState('accepted'); // 'accepted' | 'interests'
  const [onlyInterestsWithMsgs, setOnlyInterestsWithMsgs] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);

  // Advanced Filter state
  const [ageRange, setAgeRange] = useState({ min: 18, max: 50 });
  const [selectedMaritalStatus, setSelectedMaritalStatus] = useState('All');
  const [selectedDiet, setSelectedDiet] = useState('All');
  const [verifiedOnlyFilter, setVerifiedOnlyFilter] = useState(false);
  const [withPhotoOnlyFilter, setWithPhotoOnlyFilter] = useState(false);

  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Scroll lock effect for overlays
  useEffect(() => {
    const isOverlayOpen = activePickerSheet || isMembershipPopupOpen || isFilterDrawerOpen;
    if (isOverlayOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [activePickerSheet, isMembershipPopupOpen, isFilterDrawerOpen]);

  // Sync state with currentUser changes
  useEffect(() => {
    if (currentUser) {
      if (currentUser.matrimonialBio) setMyMatrimonialBio(currentUser.matrimonialBio);
      if (currentUser.gotra) setMyGotra(currentUser.gotra);
      if (currentUser.diet) setMyDiet(currentUser.diet);
      if (currentUser.income) setMyIncome(currentUser.income);
    }
  }, [currentUser]);

  // Handle Search Filters from Search Page
  useEffect(() => {
    if (searchFilters) {
      if (searchFilters.minAge && searchFilters.maxAge) {
        setAgeRange({ min: searchFilters.minAge, max: searchFilters.maxAge });
      }
      if (searchFilters.gotra) {
        setSelectedGotra(searchFilters.gotra);
      }
      if (searchFilters.diet) {
        setSelectedDiet(searchFilters.diet);
      }
      setSearchFilters(null); // Reset after applying
    }
  }, [searchFilters, setSearchFilters]);

  const handleInterest = async (profileId) => {
    const result = await sendInterest(profileId);
    if (result.success) {
      showToast('Interest Request Sent Successfully! 💕');
    } else {
      showToast(result.error || 'Failed to send interest');
    }
  };

  const handleInterestResponse = async (interestId, action) => {
    if (action === 'accept') {
      const result = await acceptInterestAPI(interestId);
      if (result.success) {
        showToast('Interest Accepted! You can now chat 💬');
      }
    } else {
      const result = await rejectInterestAPI(interestId);
      if (result.success) {
        showToast('Interest Declined');
      }
    }
  };

  const handleShortlist = (profileId) => {
    toggleShortlist(profileId);
    showToast(isShortlisted(profileId) ? 'Removed from shortlist' : 'Profile Added to Shortlist! ⭐');
  };

  const handleIgnore = (profileId) => {
    setIgnoredIds(prev => [...prev, profileId]);
    showToast('Profile Hidden/Ignored');
  };

  // ─── Feed from Dashboard API ──────────────────────────────────────────────
  // Uses dashboard.recommendations.newMembers as the primary feed.
  // Falls back to empty array while dashboard is loading.
  const feedProfiles = useMemo(() => {
    const base = dashboard?.recommendations?.newMembers || [];
    return base.map(profile => ({
      ...profile,
      id: profile._id || profile.id,
      name: profile.personal?.fullName || profile.name || 'Unknown',
      age: profile.age ?? null,
      gender: profile.personal?.gender || '',
      city: profile.location?.city || '',
      community: profile.personal?.community || '',
      gotra: profile.personal?.gotra || '',
      profession: profile.education?.profession || profile.education?.occupation || '',
      income: profile.education?.annualIncome || '',
      education: profile.education?.highestQualification || '',
      diet: profile.lifestyle?.diet || '',
      avatar: (profile.photos || []).find(p => p.isPrimary)?.url || null,
      photoCount: (profile.photos || []).length,
      activeStatus: profile.lastActiveAt
        ? new Date(profile.lastActiveAt) > new Date(Date.now() - 3600000)
          ? 'Online Now'
          : 'Active Recently'
        : 'Active Today',
      membershipTier: 'Normal',
      verifiedStatus: profile.verificationStatus === 'verified',
      isNew: new Date(profile.createdAt) > new Date(Date.now() - 7 * 24 * 3600000),
      isRestricted: profile.isRestricted ?? true,
    }));
  }, [dashboard]);

  // ─── filteredFeed — same filter logic, now on live data ──────────────────
  const filteredFeed = useMemo(() => {
    return feedProfiles.filter(profile => {
      if (ignoredIds.includes(profile.id)) return false;
      if (searchText.trim()) {
        const query = searchText.toLowerCase();
        const matchesName      = (profile.name || '').toLowerCase().includes(query);
        const matchesCity      = (profile.city || '').toLowerCase().includes(query);
        const matchesProfession= (profile.profession || '').toLowerCase().includes(query);
        const matchesGotra     = (profile.gotra || '').toLowerCase().includes(query);
        if (!matchesName && !matchesCity && !matchesProfession && !matchesGotra) return false;
      }
      if (activeFilterPill === 'verified' && !profile.verifiedStatus) return false;
      if (activeFilterPill === 'joined'   && !profile.isNew)          return false;
      const userCity = currentUser?.city || '';
      if (activeFilterPill === 'nearby' && userCity && profile.city !== userCity) return false;
      if (profile.age !== null && profile.age !== undefined) {
        if (profile.age < ageRange.min || profile.age > ageRange.max) return false;
      }
      if (selectedMaritalStatus !== 'All') {
        const ms = profile.maritalStatus || profile.personal?.maritalStatus || '';
        if (ms.toLowerCase() !== selectedMaritalStatus.toLowerCase()) return false;
      }
      if (selectedDiet !== 'All' && (profile.diet || profile.lifestyle?.diet || '').toLowerCase() !== selectedDiet.toLowerCase()) return false;
      if (verifiedOnlyFilter && !profile.verifiedStatus) return false;
      if (withPhotoOnlyFilter && !profile.avatar && (!profile.photos || profile.photos.length === 0)) return false;
      return true;
    });
  }, [feedProfiles, ignoredIds, activeFilterPill, searchText, ageRange, selectedMaritalStatus, selectedDiet, verifiedOnlyFilter, withPhotoOnlyFilter, currentUser]);

  // ─── dynamicVisitors — from real visitors API ─────────────────────────────
  const dynamicVisitors = useMemo(() => {
    return visitors.map((v, idx) => ({
      id: v._id || v.id || `vis_${idx}`,
      name: v.visitorProfile?.personal?.fullName || 'Unknown Visitor',
      age: v.visitorProfile?.age ?? null,
      city: v.visitorProfile?.location?.city || '',
      community: v.visitorProfile?.personal?.community || '',
      profession: v.visitorProfile?.education?.profession || '',
      avatar: (v.visitorProfile?.photos || []).find(p => p.isPrimary)?.url || null,
      membershipTier: 'Normal',
      visitedDate: v.lastVisited ? new Date(v.lastVisited).toLocaleDateString('en-IN') : 'Recently',
      requiresUpgrade: idx > 1, // First 2 visible, rest locked for non-premium
    }));
  }, [visitors]);

  // ─── dynamicVisited — placeholder (visited-by-me API not yet implemented) ─
  const dynamicVisited = useMemo(() => [], []);

  // Active bottom tab
  const [activeBottomTab, setActiveBottomTab] = useState('matches'); // 'matches' | 'activity' | 'messenger' | 'premium'

  // Reset Subviews on bottom tab change
  useEffect(() => {
    setCurrentSubView(null);
  }, [activeBottomTab]);

  // Fetch conversations when messenger tab opens
  useEffect(() => {
    if (activeBottomTab === 'messenger') {
      const fetchConvs = async () => {
        setConversationsLoading(true);
        try {
          const res = await matrimonialChatService.getConversations();
          setConversations(res.data.data.conversations || []);
        } catch (err) {
          console.error(err);
        } finally {
          setConversationsLoading(false);
        }
      };
      fetchConvs();
    }
  }, [activeBottomTab]);

  // Listener for simulated interest acceptance event
  useEffect(() => {
    const handleAccepted = (e) => {
      showToast(`${e.detail.name} accepted your interest! Connection established. 💖`);
    };
    window.addEventListener('matrimonialInterestAccepted', handleAccepted);
    return () => window.removeEventListener('matrimonialInterestAccepted', handleAccepted);
  }, []);

  const renderMatrimonialSubTabs = () => (
    <div className="bg-white/95 backdrop-blur-md px-3 py-2 border-b border-slate-100/90 shrink-0 z-40">
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/90 rounded-2xl max-w-lg mx-auto">
        <button
          onClick={() => { setActiveBottomTab('matches'); setCurrentSubView(null); }}
          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-[11px] md:text-xs font-black transition-all ${
            activeBottomTab === 'matches'
              ? 'bg-white text-rose-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles size={12} className={activeBottomTab === 'matches' ? 'text-rose-500' : 'text-slate-400'} />
          <span className="truncate">Matches</span>
        </button>

        <button
          onClick={() => { setActiveBottomTab('activity'); setCurrentSubView(null); }}
          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-[11px] md:text-xs font-black transition-all relative ${
            activeBottomTab === 'activity'
              ? 'bg-white text-rose-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock size={12} className={activeBottomTab === 'activity' ? 'text-rose-500' : 'text-slate-400'} />
          <span className="truncate">Activity</span>
          {receivedCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          )}
        </button>

        <button
          onClick={() => { setActiveBottomTab('messenger'); setCurrentSubView(null); }}
          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-[11px] md:text-xs font-black transition-all relative ${
            activeBottomTab === 'messenger'
              ? 'bg-white text-rose-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageCircle size={12} className={activeBottomTab === 'messenger' ? 'text-rose-500' : 'text-slate-400'} />
          <span className="truncate">Chat</span>
          <span className="px-1 py-0.2 bg-rose-500 text-white text-[8px] font-bold rounded-full">
            2
          </span>
        </button>

        <button
          onClick={() => navigate('/member/profile/upgrade')}
          className="flex items-center justify-center gap-1 py-1.5 px-1 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl text-[11px] md:text-xs font-black shadow-xs hover:opacity-95 active:scale-95 transition-all"
        >
          <Crown size={11} />
          <span className="truncate">Upgrade</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] bg-slate-50 flex flex-col overflow-hidden relative select-none w-full">

      {/* ─── MAIN MATCHES FEED VIEW ─── */}
      {activeBottomTab === 'matches' && (
        <>
          {/* Header Bar — Glass morphism */}
          <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-45 border-b border-purple-100/30 shrink-0 px-4 h-15 flex items-center justify-between shadow-[0_2px_12px_rgba(244,63,94,0.03)]">
            {isSearchOpen ? (
              <div className="flex-1 flex items-center gap-3 bg-rose-50/40 border border-rose-100/30 px-3.5 py-2 rounded-xl">
                <Search size={18} className="text-rose-450" />
                <input
                  type="text"
                  placeholder="Search matches..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="bg-transparent outline-none w-full text-[14px] text-slate-800 font-semibold"
                  autoFocus
                />
                <button onClick={() => { setSearchText(''); setIsSearchOpen(false); }} className="text-slate-400 p-0.5">
                  <X size={18} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3.5">
                  <div 
                    onClick={() => {
                      setActiveBottomTab('my-profile');
                      setCurrentSubView(null);
                    }}
                    className="w-10 h-10 rounded-full bg-slate-200 border-2 border-rose-500/30 flex items-center justify-center text-slate-500 cursor-pointer relative shadow-sm hover:scale-105 active:scale-95 transition-transform"
                  >
                    {currentUser?.avatar ? (
                      <img src={currentUser.avatar} alt="Me" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span className="text-[12.5px] font-black text-rose-500 uppercase">{currentUser?.initials || 'RA'}</span>
                    )}
                    <div className="absolute -bottom-1 -right-1 bg-rose-500 text-white rounded-full px-1 py-0.5 text-[7px] font-black border border-white uppercase tracking-tighter leading-none">
                      {isCurrentlySubscribed ? sub.plan.split(' ').map(n=>n[0]).join('') : 'N'}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h1 className="text-[17px] font-black text-slate-800 tracking-tight leading-tight">
                        {isCombo 
                          ? (sub.activeProfileType === 'groom' ? "Son's Matches" : "Daughter's Matches") 
                          : "My matches"}
                      </h1>
                      {isCombo && (
                        <button
                          onClick={handleToggleComboActiveProfile}
                          className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-full text-[8.5px] font-black uppercase tracking-tight flex items-center gap-0.5 active:scale-95 transition-all"
                          title="Switch active search profile"
                        >
                          <SwitchCamera size={10} /> Switch
                        </button>
                      )}
                    </div>
                    <p 
                      className="text-[11px] font-bold text-slate-400 mt-0.5 flex items-center gap-1 cursor-pointer hover:text-rose-500 transition-colors"
                      onClick={() => navigate('/member/matrimonial/setup')}
                    >
                      as per <span className="text-rose-500 font-extrabold">partner preferences</span>
                      <Pencil size={10} className="text-slate-400 stroke-[2.5]" />
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <button
                    className="text-rose-500 active:scale-95 transition-transform relative"
                    onClick={() => navigate('/member/matrimonial/interests')}
                  >
                    <Heart size={22} fill="currentColor" className="drop-shadow-[0_1px_4px_rgba(244,63,94,0.5)] hover:scale-110 transition-transform" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                      {receivedCount > 0 ? (receivedCount > 9 ? '9+' : receivedCount) : ''}
                    </span>
                  </button>
                  <button className="text-slate-700 active:scale-95 transition-transform" onClick={() => setIsSearchOpen(true)}>
                    <Search size={22} className="stroke-[1.8]" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ─── MATRIMONIAL SUB-NAVIGATION TABS (Balanced across all devices) ─── */}
          {renderMatrimonialSubTabs()}

          {/* Scrollable feed */}
          <div className="flex-1 overflow-y-auto pb-24 bg-slate-50 flex flex-col">
            <div className="px-4 py-3 bg-white border-b border-slate-100/80 flex items-center gap-2 overflow-x-auto scrollbar-hide shrink-0 font-sans">
              <button
                onClick={() => setIsFilterDrawerOpen(true)}
                className="px-3.5 py-2 rounded-full border border-slate-200 bg-white text-slate-700 text-[12px] font-bold flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform"
              >
                <SlidersHorizontal size={13} className="text-slate-500" /> Filters
              </button>
              
              {['All matches', 'Verified', 'Just Joined', 'Nearby'].map((pillLabel, index) => {
                const pillsKeys = ['all', 'verified', 'joined', 'nearby'];
                const targetKey = pillsKeys[index];
                return (
                  <button
                    key={targetKey}
                    onClick={() => setActiveFilterPill(targetKey)}
                    className={`px-4 py-2 rounded-full text-[12px] font-bold transition-all shrink-0 active:scale-95 border ${
                      activeFilterPill === targetKey
                        ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-655'
                    }`}
                  >
                    {pillLabel}
                  </button>
                );
              })}
            </div>

            {/* ─── MARRIED / CLOSED PROFILE BANNER ─── */}
            {myProfile?.isClosed && (
              <div
                className="mx-4 mt-4 mb-2 rounded-3xl p-6 text-white relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                  <span style={{ fontSize: '180px', lineHeight: 1 }}>💍</span>
                </div>
                <div className="relative z-10 text-center">
                  <span style={{ fontSize: '40px', lineHeight: 1, display: 'block', marginBottom: '8px' }}>💍🎊</span>
                  <h2 className="text-[18px] font-black mb-1">Congratulations!</h2>
                  <p className="text-white/80 text-[12px] font-semibold leading-relaxed">
                    Your matrimonial profile is now <strong className="text-yellow-200">closed</strong>. You have been removed from matchmaking. We wish you a happy married life!
                  </p>
                  <button
                    onClick={() => navigate('/member/matrimonial/interests')}
                    className="mt-4 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-[12px] font-bold border border-white/30 active:scale-95 transition-all"
                    id="married-view-history-btn"
                  >
                    View Your Journey 💑
                  </button>
                </div>
              </div>
            )}

            <div className="p-4 space-y-5 flex-1 max-w-md mx-auto w-full">
              {/* Hide matchmaking feed for married users */}
              {myProfile?.isClosed ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span style={{ fontSize: '60px', lineHeight: 1 }} className="mb-4">🎊</span>
                  <h3 className="text-[16px] font-black text-slate-800 mb-2">You're Married! 💑</h3>
                  <p className="text-[12px] text-slate-400 font-semibold max-w-[240px] leading-relaxed">
                    Your profile is closed. You no longer appear in matchmaking or search results.
                  </p>
                </div>
              ) : (
              <>
              {!isCurrentlySubscribed && (
                <div className="p-5 bg-gradient-to-r from-rose-50 to-pink-50 rounded-3xl text-slate-800 shadow-[0_4px_18px_rgba(244,63,94,0.06)] flex flex-col gap-3 relative overflow-hidden border border-rose-100">
                  <div className="absolute -right-6 -bottom-6 opacity-5 text-rose-500">
                    <Heart size={90} fill="currentColor" />
                  </div>
                  <div className="relative z-10">
                    <span className="bg-rose-100 text-rose-600 text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider border border-rose-200">
                      Premium Matches
                    </span>
                    <h3 className="text-[14.5px] font-black mt-2 leading-tight text-indigo-950">Matrimonial Premium Plans</h3>
                    <p className="text-[10px] text-slate-450 font-bold leading-normal mt-1">
                      Access specialized directories, view contact details, search by gotra, and manage dual profiles!
                    </p>
                  </div>
                  <button 
                    onClick={() => navigate('/member/profile/upgrade')}
                    className="self-start px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10.5px] font-black shadow-sm active:scale-95 transition-all uppercase tracking-wider"
                  >
                    Upgrade Now
                  </button>
                </div>
              )}
              {filteredFeed.length > 0 ? (
                filteredFeed.map(profile => {
                  const interestSent = profile.hasSentInterest || false;
                  const isShort = isShortlisted(profile._id || profile.id);

                  const userRank = membershipRanks[userMembership] || 0;
                  const targetRank = membershipRanks[profile.membershipTier] || 0;
                  const hasMembershipAccess = userRank >= targetRank;

                  // Connection status comes from the API-enriched profile
                  const isConnected = profile.isConnected || false;
                  const isPhotoVisible = profile.photoVisibility !== 'connections' || isConnected;

                  const hasAccess = hasMembershipAccess && isPhotoVisible;

                  const handleCardClick = () => {
                    if (!hasMembershipAccess) {
                      setIsMembershipPopupOpen(true);
                      setSelectedPlanToUpgrade(profile.membershipTier);
                    } else {
                      navigate(`/member/matrimonial/${profile.id}`);
                    }
                  };

                  const getTierStyle = (tier) => {
                    if (tier === 'Pro Supreme') return 'bg-[#E53E3E] text-white';
                    if (tier === 'Pro Max') return 'bg-[#ED8936] text-white';
                    if (tier === 'Pro') return 'bg-[#3182CE] text-white';
                    return 'bg-slate-500 text-white';
                  };

                  return (
                    <div
                      key={profile.id}
                      className="bg-white rounded-[32px] overflow-hidden border border-slate-250/20 shadow-[0_8px_24px_rgba(0,0,0,0.08)] flex flex-col font-sans relative"
                    >
                      <div
                        className="relative aspect-[3/4.5] overflow-hidden bg-slate-900 cursor-pointer flex flex-col justify-end"
                        style={{ minHeight: '520px' }}
                        onClick={handleCardClick}
                      >
                        <img
                          src={profile.photos?.[0]?.url || profile.userId?.avatar || profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.personal?.fullName || profile.name || 'User')}&background=0f172a&color=fff&size=400`}
                          alt={profile.name}
                          className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
                            !hasAccess ? 'blur-2xl brightness-75 scale-105' : ''
                          }`}
                        />
                        
                        <div className="absolute top-4 right-4 bg-black/45 backdrop-blur-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 pointer-events-none z-10">
                          <Image size={12} className="text-white" />
                          <span className="text-[10px] font-black text-white">
                            {profile.photos?.length || profile.photoCount || 1}
                          </span>
                        </div>

                        {/* Membership Lock Overlay */}
                        {!hasMembershipAccess && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/35 backdrop-blur-xs z-15">
                            <EyeOff size={28} className="text-white/90 mb-3" />
                            <p className="text-white text-[13.5px] font-black leading-snug tracking-wide px-4">
                              Photo visible to paid members only
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsMembershipPopupOpen(true);
                                setSelectedPlanToUpgrade(profile.membershipTier);
                              }}
                              className="mt-4 px-5 py-2.5 bg-transparent hover:bg-white/10 text-white border-2 border-white rounded-full text-[12.5px] font-black tracking-wide transition-all active:scale-95"
                            >
                              Upgrade to view
                            </button>
                          </div>
                        )}

                        {/* Connection Lock Overlay (Cloned from reference image) */}
                        {hasMembershipAccess && !isPhotoVisible && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/35 backdrop-blur-xs z-15">
                            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20 relative mb-3">
                              <Image size={26} className="text-white/80" />
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                                <Lock size={12} className="text-slate-800 fill-slate-800" />
                              </div>
                            </div>
                            <p className="text-white text-[13.5px] font-black leading-snug tracking-wide px-4">
                              Photo visible only after connection is established
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInterest(profile.id);
                              }}
                              className="mt-4 px-5 py-2.5 bg-transparent hover:bg-white/10 text-white border-2 border-white rounded-full text-[12.5px] font-black tracking-wide transition-all active:scale-95 animate-pulse"
                            >
                              {interestSent ? 'Interest Sent' : 'Express Interest'}
                            </button>
                          </div>
                        )}

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-36 pb-26 px-5 pointer-events-none z-5" />

                        <div className="relative z-10 px-5 pb-3 pointer-events-none flex flex-col justify-end">
                          <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full w-fit mb-2.5 shadow-sm ${getTierStyle(profile.membershipTier)}`}>
                            {profile.membershipTier}
                          </span>

                          <span className="text-[11px] text-white/80 font-bold uppercase tracking-wider">
                            {profile.activeStatus}
                          </span>
                          
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <h2 className="text-white text-[24px] font-black tracking-tight leading-none">
                              {profile.name}, {profile.age}
                            </h2>
                            {profile.membershipTier !== 'Normal' && (
                              <Award size={18} className="text-amber-400 fill-amber-400 shadow-sm shrink-0" />
                            )}
                          </div>
                          
                          <p className="text-white/85 text-[13.5px] font-bold mt-2.5 leading-none">
                            {profile.height} · {profile.city} · {profile.community}
                          </p>
                          
                          <p className="text-white/80 text-[12.5px] font-semibold mt-1.5 leading-none">
                            {profile.profession} · Earns {profile.income}
                          </p>
                          
                          <p className="text-white/70 text-[12px] font-semibold mt-1.5 leading-none">
                            {profile.education}
                          </p>
                        </div>

                        <div className="relative z-10 py-4 px-4 flex justify-around items-center select-none bg-transparent">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleInterest(profile.id); }}
                            className="flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                          >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                              interestSent ? 'bg-emerald-600 text-white' : 'bg-[#9E2045] text-white hover:bg-[#B82B55]'
                        }`}>
                              {interestSent ? <Check size={20} strokeWidth={2.5} /> : <Mail size={20} />}
                            </div>
                            <span className="text-[10px] font-bold text-white tracking-wide">Interest</span>
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); handleShortlist(profile.id); }}
                            className="flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                          >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xs text-white hover:bg-black/50 transition-all`}>
                              <Star size={20} className={isShort ? 'text-amber-400 fill-amber-400' : 'text-white'} />
                            </div>
                            <span className="text-[10px] font-bold text-white tracking-wide">Shortlist</span>
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); handleIgnore(profile.id); }}
                            className="flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                          >
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xs text-white hover:bg-black/50 transition-all">
                              <X size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-white tracking-wide">Ignore</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isConnected) {
                                openChatWithProfile(profile._id);
                              } else {
                                showToast("Connection pending. You can message once they accept your interest!");
                              }
                            }}
                            className="flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                          >
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xs text-white hover:bg-black/50 transition-all">
                              <MessageCircle size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-white tracking-wide">Chat</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400 font-sans">
                    <ShieldAlert size={28} />
                  </div>
                  <h3 className="text-[15px] font-black text-slate-800">No matching profiles left</h3>
                  <p className="text-[12px] text-slate-400 max-w-[200px] mt-1 font-semibold leading-relaxed">
                    Try resetting active filter parameters or check back later for new profiles.
                  </p>
                </div>
              )}
              </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ─── ACTIVITY HUB VIEW (Matches reference Image 2) ─── */}
      {activeBottomTab === 'activity' && currentSubView === null && (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {/* Header */}
          <div className="bg-white sticky top-0 z-40 border-b border-slate-100/80 px-4 h-15 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div 
                onClick={() => { setActiveBottomTab('my-profile'); setCurrentSubView(null); }}
                className="w-9 h-9 rounded-full bg-slate-200 border-2 border-slate-100 flex items-center justify-center text-slate-500 cursor-pointer hover:opacity-85 shadow-sm active:scale-95 transition-all"
              >
                <User size={18} />
              </div>
              <h1 className="text-[18px] font-black text-slate-800 tracking-tight leading-none">Activity</h1>
            </div>
            <div className="flex items-center gap-3">
              <button className="text-slate-700 relative" onClick={() => navigate('/member/notifications?module=matrimonial')}>
                <Heart size={21} />
                {getUnreadCountForModule('matrimonial') > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white">
                    {getUnreadCountForModule('matrimonial')}
                  </span>
                )}
              </button>
              <button className="text-slate-700" onClick={() => setIsSearchOpen(true)}>
                <Search size={21} />
              </button>
            </div>
          </div>

          {renderMatrimonialSubTabs()}

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-28">
            {/* Stat Cards (Cloned from Image 2) */}
            <div className="flex gap-2.5">
              {/* Profile Visits Card */}
              <div 
                onClick={() => setCurrentSubView('visits')}
                className="flex-1 bg-white rounded-2xl p-3.5 border border-slate-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.03)] text-center cursor-pointer active:scale-95 transition-all"
              >
                <span className="text-[26px] font-black text-indigo-600 block leading-none">{dynamicVisitors.length}</span>
                <span className="text-[11.5px] font-bold text-slate-650 mt-1.5 block leading-tight">Profile<br/>Visits</span>
              </div>

              {/* Shortlisted Profiles Card */}
              <div 
                onClick={() => setCurrentSubView('shortlisted')}
                className="flex-1 bg-white rounded-2xl p-3.5 border border-slate-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.03)] text-center cursor-pointer active:scale-95 transition-all"
              >
                <span className="text-[26px] font-black text-amber-500 block leading-none">{dashboard?.shortlist ?? 0}</span>
                <span className="text-[11.5px] font-bold text-slate-650 mt-1.5 block leading-tight">Shortlisted<br/>Profiles</span>
              </div>

              {/* Contact Views Card */}
              <div 
                onClick={() => setCurrentSubView('contacts')}
                className="flex-1 bg-white rounded-2xl p-3.5 border border-slate-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.03)] text-center cursor-pointer active:scale-95 transition-all"
              >
                <span className="text-[26px] font-black text-emerald-600 block leading-none">0</span>
                <span className="text-[11.5px] font-bold text-slate-650 mt-1.5 block leading-tight">Contact<br/>Views</span>
              </div>
            </div>

            {/* Interests Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[15px] font-black text-slate-800">Interests</h3>
                <button 
                  onClick={() => navigate('/member/matrimonial/interests')}
                  className="text-[12px] font-extrabold text-rose-500 hover:text-rose-600"
                >
                  View All
                </button>
              </div>

              {/* Horizontal Pill subtabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide" data-swipe-block="true">
                {[
                  { key: 'Received', label: `Received (${receivedCount})` },
                  { key: 'Accepted', label: `Accepted (${acceptedCount})` },
                  { key: 'Sent', label: `Sent (${sentCount})` }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActivityInterestTab(tab.key)}
                    className={`px-4.5 py-2 rounded-full border text-[12px] font-bold shrink-0 transition-all ${
                      activityInterestTab === tab.key
                        ? 'border-rose-500 bg-rose-50 text-rose-600 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-650 hover:border-slate-350'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Dynamic list rendering or Spotlight fallback */}
              {activeList.length > 0 ? (
                <div className="space-y-3">
                  {activeList.map(item => {
                    const isConnected = item.status === 'accepted';
                    const isPhotoVisible = true; // In interest lists, always show avatar
                    
                    // The other profile is either senderProfile (if we received it) or receiverProfile (if we sent it)
                    // This works for all tabs (Received, Sent, Accepted) since only one will be populated per interest record
                    const otherProfile = item.senderProfile || item.receiverProfile;
                    
                    const profileData = otherProfile || item;
                    const profileId = otherProfile?._id || item._id || item.id;
                    const name = profileData.personal?.fullName || profileData.name || 'Member';
                    const avatar = profileData.photos?.[0]?.url || profileData.userId?.avatar || profileData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f87171&color=fff&size=150`;
                    const age = profileData.age || '';
                    const height = profileData.height || '';
                    const gotra = profileData.gotra || '';
                    const city = profileData.location?.city || profileData.city || '';
                    const profession = profileData.profession || '';

                    return (
                      <div 
                        key={item._id || item.id}
                        onClick={() => navigate(`/member/matrimonial/${profileId}`)}
                        className="bg-white rounded-2.5xl border border-slate-200/55 p-3.5 flex gap-3.5 items-center cursor-pointer hover:bg-slate-50/50 active:bg-slate-50 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                      >
                        {/* Avatar Column */}
                        <div className="relative shrink-0">
                          <img 
                            src={avatar} 
                            alt={name} 
                            className={`w-13 h-16 rounded-xl object-cover border border-slate-100/80 shadow-xs transition-all duration-300 ${
                              !isPhotoVisible ? 'blur-md brightness-90' : ''
                            }`} 
                          />
                          {profileData.online && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                          )}
                        </div>

                        {/* Text Parameters Column */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[13.5px] font-black text-indigo-950 truncate">{name}, {age}</h4>
                          <p className="text-[11px] text-slate-500 font-bold truncate mt-0.5">
                            {height} · {gotra} · {city}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold truncate mt-0.5">
                            {profession}
                          </p>
                        </div>

                        {/* Actions Column */}
                        <div className="shrink-0 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {activityInterestTab === 'Received' && (
                            <div className="flex items-center gap-1.5">
                              <button 
                                onClick={() => {
                                  handleInterestResponse(item._id || item.id, 'accept');
                                }}
                                className="bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black px-3.5 py-1.5 rounded-lg active:scale-95 transition-transform shadow-xs uppercase tracking-wider"
                              >
                                Accept
                              </button>
                              <button 
                                onClick={() => {
                                  handleInterestResponse(item._id || item.id, 'decline');
                                }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-550 text-[10px] font-black px-3 py-1.5 rounded-lg active:scale-95 transition-transform uppercase tracking-wider"
                              >
                                Decline
                              </button>
                            </div>
                          )}

                          {activityInterestTab === 'Accepted' && (
                            <button 
                              onClick={() => openChatWithProfile(profileId)}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10.5px] font-extrabold px-4 py-1.5 rounded-lg active:scale-95 transition-transform flex items-center gap-1 shadow-sm"
                            >
                              <MessageCircle size={13} /> Chat
                            </button>
                          )}

                          {activityInterestTab === 'Sent' && (
                            <button 
                              onClick={async () => {
                                const result = await cancelInterestAPI(item._id || item.id);
                                if (result.success) showToast('Interest request cancelled.');
                                else showToast(result.error || 'Could not cancel interest.');
                              }}
                              className="border border-slate-200 hover:bg-slate-50 text-slate-500 text-[10px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Spotlight empty state card box (Cloned from Image 2) */
                <div className="bg-white rounded-3xl border border-slate-200/50 p-6 text-center shadow-[0_4px_16px_rgba(0,0,0,0.03)]">
                  {/* Illustration cards mock stack */}
                  <div className="flex justify-center items-center gap-1.5 mb-5 select-none pointer-events-none">
                    <div className="w-10 h-14 bg-rose-50 border border-rose-100 rounded-lg transform -rotate-12 opacity-60 flex items-center justify-center text-rose-350">
                      <User size={16} />
                    </div>
                    <div className="w-12 h-16 bg-rose-100/50 border-2 border-rose-200 rounded-xl shadow-md z-10 flex flex-col justify-end p-1">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full mb-1 border border-white" />
                    </div>
                    <div className="w-10 h-14 bg-rose-50 border border-rose-100 rounded-lg transform rotate-12 opacity-60 flex items-center justify-center text-rose-350">
                      <User size={16} />
                    </div>
                  </div>

                  <h4 className="text-[14.5px] font-black text-slate-800">
                    Receive interest with Spotlight!
                  </h4>
                  
                  <p className="text-[12px] text-slate-500 font-semibold mt-1.5 leading-relaxed max-w-[260px] mx-auto">
                    Remain on top of the list and increase your chances of receiving more interests
                  </p>

                  <button 
                    onClick={() => {
                      setIsMembershipPopupOpen(true);
                      setSelectedPlanToUpgrade('Pro Supreme');
                    }}
                    className="mt-4 text-[12.5px] font-black text-rose-500 hover:text-rose-600 select-none block mx-auto active:scale-95"
                  >
                    Tell me more
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── SUBVIEW 1: PROFILE VISITS PAGE (Cloned from Images 1 & 3) ─── */}
      {currentSubView === 'visits' && (
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden font-sans">
          {/* Header Bar — Glass morphism */}
          <div className="bg-white/80 backdrop-blur-xl border-b border-purple-100/30 px-4 h-14 flex items-center gap-3 sticky top-0 z-35 shrink-0 shadow-[0_2px_12px_rgba(244,63,94,0.02)]">
            <button onClick={() => setCurrentSubView(null)} className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-slate-800 hover:bg-rose-50 hover:text-rose-600 transition-colors press-scale">
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <h1 className="text-[17px] font-bold text-text-primary tracking-tight">Profile Visits</h1>
          </div>

          {/* Sub-tabs */}
          <div className="flex border-b border-slate-100 bg-white shrink-0">
            <button
              onClick={() => setVisitsTab('visitors')}
              className={`flex-1 py-3.5 text-center text-[12px] font-extrabold tracking-wider uppercase relative ${
                visitsTab === 'visitors' ? 'text-slate-800' : 'text-slate-400'
              }`}
            >
              Profile Visitors (13)
              {visitsTab === 'visitors' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-rose-500" />}
            </button>
            <button
              onClick={() => setVisitsTab('visited')}
              className={`flex-1 py-3.5 text-center text-[12px] font-extrabold tracking-wider uppercase relative ${
                visitsTab === 'visited' ? 'text-slate-800' : 'text-slate-400'
              }`}
            >
              Profiles I Visited
              {visitsTab === 'visited' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-rose-500" />}
            </button>
          </div>

          {/* List Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {visitsTab === 'visitors' ? (
              <div className="space-y-6">
                {dynamicVisitors.map((visitor) => (
                  <div key={visitor.id} className="bg-white rounded-[32px] overflow-hidden border border-slate-200/40 shadow-md relative">
                    <div className="relative aspect-[3/4.5] overflow-hidden bg-slate-900 cursor-pointer flex flex-col justify-end" style={{ minHeight: '480px' }}>
                      {/* Photo base */}
                      <img
                        src={visitor.photos?.[0]?.url || visitor.userId?.avatar || visitor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(visitor.name || 'User')}&background=0f172a&color=fff&size=400`}
                        alt={visitor.name}
                        className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
                          visitor.requiresUpgrade ? 'blur-2xl brightness-75 scale-105' : ''
                        }`}
                      />
                      
                      {/* If requires upgrade, show locked blur overlay */}
                      {visitor.requiresUpgrade ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/35 backdrop-blur-xs z-15">
                          <Lock size={28} className="text-white/90 mb-3" />
                          <p className="text-white text-[13.5px] font-black leading-snug tracking-wide px-4">
                            Photo visible to paid members only
                          </p>
                          <button
                            onClick={() => setIsMembershipPopupOpen(true)}
                            className="mt-4 px-5 py-2.5 bg-transparent hover:bg-white/10 text-white border-2 border-white rounded-full text-[12.5px] font-black tracking-wide transition-all active:scale-95"
                          >
                            Upgrade to view
                          </button>
                        </div>
                      ) : null}

                      {/* Header Badge: Visited Time */}
                      <div className="absolute top-4 left-4 text-white text-[11.5px] font-extrabold tracking-wide text-left bg-black/35 backdrop-blur-xs px-2.5 py-1.5 rounded-lg z-10">
                        Visited {visitor.visitedDate}
                      </div>

                      {/* Top Right Photo Count Badge */}
                      <div className="absolute top-4 right-4 bg-black/45 backdrop-blur-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 pointer-events-none z-10">
                        <Image size={12} className="text-white" />
                        <span className="text-[10px] font-black text-white">
                          {visitor.photoCount}
                        </span>
                      </div>

                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-36 pb-26 px-5 z-5" />

                      {/* Text parameters on top of the image */}
                      <div className="relative z-10 px-5 pb-3 pointer-events-none">
                        <span className="text-[11px] text-white/80 font-bold uppercase tracking-wider">
                          {visitor.activeStatus}
                        </span>
                        <h2 className="text-white text-[23px] font-black mt-1 leading-none">
                          {visitor.requiresUpgrade ? 'XXXXX' : visitor.name}, {visitor.age}
                        </h2>
                        <p className="text-white/80 text-[13px] font-bold mt-2 leading-none">
                          {visitor.height} · {visitor.city} · {visitor.community}
                        </p>
                        <p className="text-white/85 text-[12.5px] font-semibold mt-1.5 leading-none">
                          {visitor.profession} · {visitor.income}
                        </p>
                        <p className="text-white/70 text-[12px] font-semibold mt-1.5 leading-none">
                          {visitor.education}
                        </p>
                      </div>

                      {/* Translucent Managed-By Strip */}
                      <div className="relative z-10 bg-black/35 backdrop-blur-xs py-2 px-5 text-center text-white/85 text-[11px] font-semibold italic border-y border-white/10 select-none pointer-events-none">
                        Profile managed by {visitor.managedBy}
                      </div>

                      {/* Action Circle overlays */}
                      <div className="relative z-10 py-4 px-4 flex justify-around items-center select-none bg-transparent">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleInterest(visitor.id); }}
                          className="flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                        >
                          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#9E2045] text-white hover:bg-[#B82B55] transition-all">
                            <Mail size={20} />
                          </div>
                          <span className="text-[10px] font-bold text-white tracking-wide">Interest</span>
                        </button>
                        
                        <button
                          onClick={(e) => { e.stopPropagation(); handleShortlist(visitor.id); }}
                          className="flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                        >
                          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xs text-white hover:bg-black/50 transition-all">
                            <Star size={20} className={isShortlisted(visitor.id) ? 'text-amber-400 fill-amber-400' : 'text-white'} />
                          </div>
                          <span className="text-[10px] font-bold text-white tracking-wide">Shortlist</span>
                        </button>
                        
                        <button
                          onClick={(e) => { e.stopPropagation(); handleIgnore(visitor.id); }}
                          className="flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                        >
                          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xs text-white hover:bg-black/50 transition-all">
                            <X size={20} />
                          </div>
                          <span className="text-[10px] font-bold text-white tracking-wide">Ignore</span>
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!visitor.requiresUpgrade) {
                              openChatWithProfile(visitor._id);
                            } else {
                              showToast('Upgrade to chat with this profile!');
                            }
                          }}
                          className="flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                        >
                          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xs text-white hover:bg-black/50 transition-all">
                            <MessageCircle size={20} />
                          </div>
                          <span className="text-[10px] font-bold text-white tracking-wide">Chat</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {dynamicVisited.length > 0 ? (
                  dynamicVisited.map((visited) => (
                    <div key={visited.id} className="bg-white rounded-[32px] overflow-hidden border border-slate-200/40 shadow-md relative">
                      <div className="relative aspect-[3/4.5] overflow-hidden bg-slate-900 cursor-pointer flex flex-col justify-end" style={{ minHeight: '480px' }}>
                        
                        {/* Dynamic background photo */}
                        <img
                          src={visited.photos?.[0]?.url || visited.userId?.avatar || visited.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(visited.name || 'User')}&background=0f172a&color=fff&size=400`}
                          alt={visited.name}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        
                        <div className="absolute top-4 left-4 text-white text-[11.5px] font-extrabold tracking-wide text-left bg-black/30 backdrop-blur-xs px-2.5 py-1.5 rounded-lg z-10">
                          Visited on {visited.visitedDate}
                        </div>

                        {/* Top Right Photo Count Badge */}
                        <div className="absolute top-4 right-4 bg-black/45 backdrop-blur-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 pointer-events-none z-10">
                          <Image size={12} className="text-white" />
                          <span className="text-[10px] font-black text-white">
                            {visited.photos?.length || visited.photoCount || 1}
                          </span>
                        </div>

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-36 pb-26 px-5 z-5" />

                        {/* Text parameters on top of the image */}
                        <div className="relative z-10 px-5 pb-3 pointer-events-none">
                          <span className="text-[11.5px] text-white/80 font-bold uppercase tracking-wider">
                            {visited.activeStatus}
                          </span>
                          <h2 className="text-white text-[23px] font-black mt-1 leading-none">
                            {visited.name}, {visited.age}
                          </h2>
                          <p className="text-white/80 text-[13px] font-bold mt-2 leading-none">
                            {visited.height} · {visited.city} · {visited.community}
                          </p>
                          <p className="text-white/85 text-[12.5px] font-semibold mt-1.5 leading-none">
                            {visited.profession} · {visited.income}
                          </p>
                          <p className="text-white/70 text-[12px] font-semibold mt-1.5 leading-none">
                            {visited.education}
                          </p>
                        </div>

                        {/* Managed By Strip */}
                        <div className="relative z-10 bg-black/35 backdrop-blur-xs py-2 px-5 text-center text-white/85 text-[11px] font-semibold italic border-y border-white/10 select-none pointer-events-none">
                          Profile managed by {visited.managedBy}
                        </div>

                        {/* Action Circular Buttons (Chat, Contact, Cancel) */}
                        <div className="relative z-10 py-4 px-4 flex justify-around items-center select-none bg-transparent">
                          {/* Chat */}
                          <button
                            onClick={(e) => { e.stopPropagation(); openChatWithProfile(visited._id); }}
                            className="flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                          >
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xs text-white hover:bg-black/50 transition-all">
                              <MessageCircle size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-white tracking-wide">Chat</span>
                          </button>

                          {/* Contact details */}
                          <button
                            onClick={(e) => { e.stopPropagation(); showToast(`Opening contact phone for ${visited.name}`); }}
                            className="flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                          >
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xs text-white hover:bg-black/50 transition-all">
                              <Phone size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-white tracking-wide">Contact</span>
                          </button>

                          {/* Cancel visited */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setCurrentSubView(null); }}
                            className="flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                          >
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xs text-white hover:bg-black/50 transition-all">
                              <X size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-white tracking-wide">Cancel</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 text-slate-400 font-bold text-sm bg-white rounded-3xl border border-slate-200/50 p-6 shadow-sm">
                    No recently viewed profiles.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── SUBVIEW 2: CONTACT VIEWS PAGE (Cloned from Image 4) ─── */}
      {currentSubView === 'contacts' && (
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden font-sans">
          {/* Header Bar — Glass morphism */}
          <div className="bg-white/80 backdrop-blur-xl border-b border-purple-100/30 px-4 h-14 flex items-center gap-3 sticky top-0 z-35 shrink-0 shadow-[0_2px_12px_rgba(244,63,94,0.02)]">
            <button onClick={() => setCurrentSubView(null)} className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-slate-800 hover:bg-rose-50 hover:text-rose-600 transition-colors press-scale">
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <h1 className="text-[17px] font-bold text-text-primary tracking-tight">Contact Views</h1>
          </div>

          {/* Subtabs */}
          <div className="flex border-b border-slate-100 bg-white shrink-0">
            <button
              onClick={() => setContactsTab('contacts-i-viewed')}
              className={`flex-1 py-3.5 text-center text-[12px] font-extrabold tracking-wider uppercase relative ${
                contactsTab === 'contacts-i-viewed' ? 'text-slate-800' : 'text-slate-400'
              }`}
            >
              Contacts I Viewed
              {contactsTab === 'contacts-i-viewed' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-rose-500" />}
            </button>
            <button
              onClick={() => setContactsTab('viewed-my')}
              className={`flex-1 py-3.5 text-center text-[12px] font-extrabold tracking-wider uppercase relative ${
                contactsTab === 'viewed-my' ? 'text-slate-800' : 'text-slate-400'
              }`}
            >
              Viewed My Contact
              {contactsTab === 'viewed-my' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-rose-500" />}
            </button>
          </div>

          {/* Pink Alert Banner & Empty state layout (Cloned from Image 4) */}
          <div className="flex-1 bg-white p-4 flex flex-col overflow-y-auto">
            {contactsTab === 'viewed-my' && (
              <div className="bg-rose-50/70 border border-rose-100/60 rounded-xl p-4 flex items-center justify-between text-left gap-3 mb-6">
                <p className="text-[12px] text-rose-700 leading-relaxed font-extrabold">
                  Upgrade to a paid membership to view the matches who visited your profile!
                </p>
                <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-500 shrink-0 select-none">
                  <Lock size={18} />
                </div>
              </div>
            )}

            {/* Empty state illustration block */}
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
              <div className="w-20 h-20 bg-rose-50/50 rounded-full flex items-center justify-center mb-6 relative">
                <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-500 shadow-sm">
                  <PhoneCall size={24} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md">
                  <Search size={14} className="text-slate-700 stroke-[3]" />
                </div>
              </div>

              <h4 className="text-[15px] font-black text-slate-850">
                Find out who viewed your contact
              </h4>
              
              <p className="text-[12px] text-slate-400 font-semibold mt-2 leading-relaxed max-w-[260px] mx-auto">
                Discover & connect with matches who looked up your contact details
              </p>

              <button
                onClick={() => setIsMembershipPopupOpen(true)}
                className="mt-6 text-[13px] font-black text-rose-500 hover:text-rose-600 block active:scale-95"
              >
                Upgrade Membership
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SUBVIEW 3: SHORTLISTED LISTS (Cloned from Image 5) ─── */}
      {currentSubView === 'shortlisted' && (
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden font-sans">
          {/* Header Bar — Glass morphism */}
          <div className="bg-white/80 backdrop-blur-xl border-b border-purple-100/30 px-4 h-14 flex items-center gap-3 sticky top-0 z-35 shrink-0 shadow-[0_2px_12px_rgba(244,63,94,0.02)]">
            <button onClick={() => setCurrentSubView(null)} className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-slate-800 hover:bg-rose-50 hover:text-rose-600 transition-colors press-scale">
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <h1 className="text-[17px] font-bold text-text-primary tracking-tight">Shortlisted</h1>
          </div>

          {/* Subtabs */}
          <div className="flex border-b border-slate-100 bg-white shrink-0">
            <button
              onClick={() => setShortlistTab('they-shortlisted')}
              className={`flex-1 py-3.5 text-center text-[12px] font-extrabold tracking-wider uppercase relative ${
                shortlistTab === 'they-shortlisted' ? 'text-slate-800' : 'text-slate-400'
              }`}
            >
              They Shortlisted
              {shortlistTab === 'they-shortlisted' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-rose-500" />}
            </button>
            <button
              onClick={() => setShortlistTab('i-shortlisted')}
              className={`flex-1 py-3.5 text-center text-[12px] font-extrabold tracking-wider uppercase relative ${
                shortlistTab === 'i-shortlisted' ? 'text-slate-800' : 'text-slate-400'
              }`}
            >
              I Shortlisted
              {shortlistTab === 'i-shortlisted' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-rose-500" />}
            </button>
          </div>

          {/* List or Empty states */}
          <div className="flex-1 bg-white p-4 flex flex-col overflow-y-auto">
            {shortlistTab === 'they-shortlisted' ? (
              /* Empty state (Cloned from Image 5) */
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 bg-rose-50/50 rounded-full flex items-center justify-center mb-6 relative">
                  <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-500 shadow-sm">
                    <Star size={24} fill="currentColor" />
                  </div>
                </div>

                <h4 className="text-[15px] font-black text-slate-850">
                  Get noticed by the right people!
                </h4>
                
                <p className="text-[12px] text-slate-400 font-semibold mt-2 leading-relaxed max-w-[260px] mx-auto">
                  Boost the possibility of getting shortlisted by ensuring that your profile is updated
                </p>

                <button
                  onClick={() => navigate('/member/matrimonial/setup')}
                  className="mt-6 text-[13px] font-black text-rose-500 hover:text-rose-600 block active:scale-95"
                >
                  Update profile
                </button>
              </div>
            ) : (
              /* Dynamic list of shortlisted profiles from Context */
              <div className="space-y-3">
                {shortlistedIds.length > 0 ? (
                  <p className="text-slate-500 text-center py-6 font-semibold text-[13px]">
                    You have {shortlistedIds.length} shortlisted profile{shortlistedIds.length > 1 ? 's' : ''}.{' '}
                    <button onClick={() => navigate('/member/matrimonial/shortlist')} className="text-rose-500 underline">View all</button>
                  </p>
                ) : (
                  <p className="text-slate-400 text-center py-10 font-semibold text-[13px]">You haven't shortlisted any matches yet.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MESSENGER VIEW (Cloned from Images 1 & 2) ─── */}
      {activeBottomTab === 'messenger' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 font-sans">
          {/* Header */}
          <div className="bg-white sticky top-0 z-40 border-b border-slate-100/80 px-4 h-15 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div 
                onClick={() => { setActiveBottomTab('my-profile'); setCurrentSubView(null); }}
                className="w-9 h-9 rounded-full bg-slate-200 border-2 border-slate-100 flex items-center justify-center text-slate-500 cursor-pointer hover:opacity-85 shadow-sm active:scale-95 transition-all"
              >
                <User size={18} />
              </div>
              <h1 className="text-[18px] font-black text-slate-800 tracking-tight leading-none">Messenger</h1>
            </div>
            <div className="flex items-center gap-3">
              <button className="text-slate-700 relative" onClick={() => navigate('/member/notifications?module=matrimonial')}>
                <Heart size={21} />
                {getUnreadCountForModule('matrimonial') > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white">
                    {getUnreadCountForModule('matrimonial')}
                  </span>
                )}
              </button>
              <button className="text-slate-700" onClick={() => setIsSearchOpen(true)}>
                <Search size={21} />
              </button>
            </div>
          </div>

          {renderMatrimonialSubTabs()}

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-28">
            
            {/* Online Matches Section (Image 1) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-black text-slate-800">Your Matches</h3>
                  <span className="text-[12px] font-bold text-slate-400">{acceptedInterests.length}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-semibold mb-4 leading-none">
                Initiate a chat with your matches to get faster response
              </p>

              {/* Horizontal Scroll list */}
              <div className="flex gap-4 overflow-x-auto scrollbar-hide py-2" data-swipe-block="true">
                {acceptedInterests.map((interest) => {
                  const otherUser = interest.senderId?._id === currentUser?._id 
                    ? interest.receiverId 
                    : interest.senderId;
                  if (!otherUser) return null;
                  return (
                    <div 
                      key={interest._id} 
                      onClick={() => openChatWithProfile(otherUser._id)}
                      className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 transition-transform"
                    >
                      <div className="w-13 h-13 rounded-full bg-slate-200 border-2 border-slate-100 flex items-center justify-center text-slate-500 relative shadow-sm">
                        {otherUser.avatar ? (
                          <img src={otherUser.avatar} alt={otherUser.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <User size={22} />
                        )}
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-xs" />
                      </div>
                      <span className="text-[10.5px] font-bold text-slate-700 max-w-[70px] truncate text-center">
                        {otherUser.name?.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
                {acceptedInterests.length === 0 && (
                  <p className="text-[12px] text-slate-400">No accepted matches yet.</p>
                )}
              </div>
            </div>

            {/* My Conversations Section */}
            <div>
              <h3 className="text-[15.5px] font-black text-slate-800 mb-3">My Conversations</h3>

              {/* Sub tabs Accepted / Interests */}
              <div className="flex border-b border-slate-100 bg-white mb-4">
                <button
                  onClick={() => setMessengerTab('accepted')}
                  className={`flex-1 py-3.5 text-center text-[12.5px] font-extrabold tracking-wide relative ${
                    messengerTab === 'accepted' ? 'text-slate-800' : 'text-slate-450'
                  }`}
                >
                  Accepted (1)
                  {messengerTab === 'accepted' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-rose-500" />}
                </button>
                <button
                  onClick={() => setMessengerTab('interests')}
                  className={`flex-1 py-3.5 text-center text-[12.5px] font-extrabold tracking-wide relative ${
                    messengerTab === 'interests' ? 'text-slate-800' : 'text-slate-450'
                  }`}
                >
                  Interests
                  {messengerTab === 'interests' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-rose-500" />}
                </button>
              </div>

              {/* Accepted list container (Image 1) */}
              {messengerTab === 'accepted' && (
                <div className="divide-y divide-slate-100 bg-white rounded-3xl border border-slate-200/50 shadow-sm p-2">
                  {conversationsLoading ? (
                    <div className="p-4 text-center text-slate-400 text-[13px]">Loading...</div>
                  ) : conversations.length > 0 ? (
                    conversations.map((conv) => {
                      const otherUser = conv.participants?.find(p => p._id !== currentUser?._id) || conv.participants?.[0];
                      const lastMsg = conv.lastMessageId;
                      let msgText = 'No messages yet';
                      if (lastMsg) {
                        msgText = lastMsg.type === 'image' ? '📸 Image' : lastMsg.type === 'deleted' ? '🗑️ This message was deleted' : lastMsg.message;
                      }
                      const unread = conv.unreadCount?.[currentUser?._id] || 0;
                      let dateStr = '';
                      if (lastMsg) {
                        const d = new Date(lastMsg.createdAt);
                        dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                      }

                      return (
                        <div
                          key={conv._id}
                          onClick={() => navigate(`/member/matrimonial/chat/${conv._id}`)}
                          className="p-3.5 flex gap-3.5 items-center cursor-pointer hover:bg-slate-50/50 active:bg-slate-50 transition-colors first:rounded-t-3xl last:rounded-b-3xl"
                        >
                          {otherUser?.avatar ? (
                            <img src={otherUser.avatar} alt={otherUser.name} className="w-12 h-12 rounded-full object-cover border border-slate-100 shadow-xs" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-slate-200 border-2 border-slate-100 flex items-center justify-center text-slate-500 shadow-xs"><User size={20} /></div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline">
                              <h4 className="text-[13.5px] font-black text-slate-850 truncate">{otherUser?.name || 'Unknown User'}</h4>
                              <span className="text-[10px] font-bold text-slate-400">{dateStr}</span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <p className="text-[11.5px] font-semibold text-slate-500 truncate">{msgText}</p>
                              {unread > 0 && (
                                <span className="w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                                  {unread}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-[13px] font-semibold">
                      No conversations yet. Start a chat from your matches!
                    </div>
                  )}
                </div>
              )}

              {/* Interests list container (Image 2) */}
              {messengerTab === 'interests' && (
                <div className="space-y-3">
                  {/* Toggle filter bar */}
                  <div className="flex items-center justify-between bg-slate-100 rounded-xl px-4 py-2 mb-3">
                    <span className="text-[11px] font-extrabold text-slate-500">Only pending interests</span>
                  </div>

                  <div className="divide-y divide-slate-100 bg-white rounded-3xl border border-slate-200/50 shadow-sm p-2">
                    {receivedInterests.length > 0 ? (
                      receivedInterests.map((interest) => {
                        const user = interest.senderId;
                        if (!user) return null;
                        return (
                          <div key={interest._id} className="p-3.5 flex gap-3 items-start relative hover:bg-slate-50/50 transition-colors first:rounded-t-3xl last:rounded-b-3xl">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover border border-slate-100 shadow-xs mt-1" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-slate-200 border-2 border-slate-100 flex items-center justify-center text-slate-500 shadow-xs mt-1"><User size={20} /></div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[13px] font-black text-slate-850 truncate">{user.name}</h4>
                              <p className="text-[11px] font-semibold text-slate-400 mt-0.5 leading-tight flex items-center gap-1.5 flex-wrap">
                                <span>{user.matrimonialProfile?.age ? `${user.matrimonialProfile.age} Yrs` : ''}</span>
                                {user.matrimonialProfile?.height && <span>• {user.matrimonialProfile.height}</span>}
                                {user.matrimonialProfile?.occupation && <span>• {user.matrimonialProfile.occupation}</span>}
                              </p>
                              <div className="flex items-center gap-2 mt-2.5">
                                <button 
                                  onClick={() => handleInterestResponse(interest._id, 'accept')}
                                  className="flex-1 h-8 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[11px] font-bold transition-colors"
                                >
                                  Accept
                                </button>
                                <button 
                                  onClick={() => handleInterestResponse(interest._id, 'reject')}
                                  className="w-8 h-8 flex items-center justify-center border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
                                >
                                  <X size={15} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-slate-400 text-[13px] font-semibold">
                        No pending interests received.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ─── PREMIUM PLANS Upgrade popup modal (Simulated from images) ─── */}
      {isMembershipPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in" data-swipe-block="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsMembershipPopupOpen(false)} />
          <div className="bg-white text-slate-800 w-full rounded-t-[32px] p-5 pb-safe z-10 shadow-2xl max-w-md animate-slide-up flex flex-col font-sans max-h-[85vh] overflow-y-auto">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4 shrink-0" />
            
            <div className="text-center mb-4">
              <h3 className="text-[17px] font-black text-slate-800">Upgrade Membership</h3>
              <p className="text-[12px] text-slate-400 mt-0.5">Unlock all premium match features</p>
            </div>

            {/* Comparison Table */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden mb-4 shrink-0">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-2.5 font-bold text-slate-400 uppercase tracking-wider">Benefit</th>
                    <th className="p-2.5 font-bold text-center text-slate-800">Pro</th>
                    <th className="p-2.5 font-bold text-center text-[#ED8936]">Pro Max</th>
                    <th className="p-2.5 font-bold text-center text-[#E53E3E]">Pro Supreme</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11.5px] font-semibold text-slate-700">
                  <tr>
                    <td className="p-2.5">Contact Sharing</td>
                    <td className="p-2.5 text-center text-emerald-500">✓</td>
                    <td className="p-2.5 text-center text-emerald-500">✓</td>
                    <td className="p-2.5 text-center text-emerald-500">✓</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="p-2.5">Engage+</td>
                    <td className="p-2.5 text-center text-emerald-500">✓</td>
                    <td className="p-2.5 text-center text-emerald-500">✓</td>
                    <td className="p-2.5 text-center text-emerald-500">✓</td>
                  </tr>
                  <tr>
                    <td className="p-2.5">Contact Details</td>
                    <td className="p-2.5 text-center font-bold">25</td>
                    <td className="p-2.5 text-center font-bold">50</td>
                    <td className="p-2.5 text-center font-bold">80</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="p-2.5">Super Interest</td>
                    <td className="p-2.5 text-center font-bold text-slate-400">0</td>
                    <td className="p-2.5 text-center font-bold">50</td>
                    <td className="p-2.5 text-center font-bold">80</td>
                  </tr>
                  <tr>
                    <td className="p-2.5">Spotlights</td>
                    <td className="p-2.5 text-center font-bold text-slate-400">0</td>
                    <td className="p-2.5 text-center font-bold">1</td>
                    <td className="p-2.5 text-center font-bold">3</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="p-2.5">Gold Badge</td>
                    <td className="p-2.5 text-center text-emerald-500">✓</td>
                    <td className="p-2.5 text-center text-emerald-500">✓</td>
                    <td className="p-2.5 text-center text-emerald-500">✓</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-rose-50 border border-rose-100 rounded-xl py-2 px-4 text-center mb-4 shrink-0">
              <span className="text-[12px] font-black text-rose-600 uppercase tracking-widest">
                FLAT 70% OFF ON ALL PLANS
              </span>
            </div>

            <div className="flex flex-col gap-2 mt-auto shrink-0">
              <button
                onClick={() => {
                  setUserMembership(selectedPlanToUpgrade);
                  setIsMembershipPopupOpen(false);
                  showToast(`Upgraded to ${selectedPlanToUpgrade} Successfully! 👑`);
                }}
                className="w-full py-3.5 bg-rose-500 text-white rounded-2xl text-[13.5px] font-extrabold shadow-md active:scale-95 transition-transform"
              >
                Upgrade to {selectedPlanToUpgrade} Now
              </button>
              <button
                onClick={() => setIsMembershipPopupOpen(false)}
                className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl text-[12.5px] font-bold active:scale-95 transition-transform"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MY PROFILE VIEW (New Profile Section) ─── */}
      {activeBottomTab === 'my-profile' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 font-sans">
          {/* Header */}
          <div className="bg-white sticky top-0 z-40 border-b border-slate-100/80 px-4 h-15 flex items-center gap-3 shrink-0">
            <button 
              onClick={() => setActiveBottomTab('matches')} 
              className="p-1 active:opacity-60 text-slate-800"
            >
              <ArrowLeft size={22} />
            </button>
            <h1 className="text-[17px] font-black text-slate-800 tracking-tight leading-none">My Matrimonial Profile</h1>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
            
            {/* Quick Summary Card */}
            <div className="bg-white rounded-3xl border border-slate-200/50 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col items-center text-center">
              <div className="relative mb-3">
                <div className="w-20 h-20 rounded-full bg-slate-200 border-4 border-rose-500/20 flex items-center justify-center text-slate-500 text-[26px] font-black shadow-md overflow-hidden">
                  <img src={myProfile?.photos?.[0]?.url || currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=0f172a&color=fff&size=400`} alt="Me" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 bg-rose-500 text-white rounded-full px-2 py-0.5 text-[8px] font-black border-2 border-white uppercase tracking-wider shadow-sm">
                  {isCurrentlySubscribed ? `${sub.plan} Plan` : 'Normal'}
                </div>
              </div>
              
              <h3 className="text-[16px] font-black text-indigo-950">{currentUser?.name || 'Member Profile'}</h3>
              <p className="text-[12px] text-slate-400 font-bold mt-0.5">
                {currentUser?.city || 'City Not Set'}{currentUser?.gender ? ` · ${currentUser.gender}` : ''}{currentUser?.age ? ` · ${currentUser.age} Years` : ''}
              </p>

              {/* Dynamic status pill markers */}
              <p className="text-[10px] text-slate-450 font-semibold mt-2.5 flex flex-wrap justify-center gap-x-2">
                <span>Gotra: <strong className="text-slate-700">{myGotra}</strong></span>
                <span>•</span>
                <span>Diet: <strong className="text-slate-700">{myDiet}</strong></span>
                <span>•</span>
                <span>Income: <strong className="text-slate-700">{myIncome}</strong></span>
              </p>
              
              {/* Matrimony Subscription Status and Links */}
              <div className="mt-4 bg-rose-50/40 border border-rose-100 rounded-2xl p-3 w-full">
                <p className="text-[10px] text-rose-550 font-black uppercase tracking-wider">Matrimony Subscription</p>
                <p className="text-xs font-black text-slate-750 mt-1">
                  Plan: {isCurrentlySubscribed ? `${sub.plan} Membership` : 'Free Account'}
                </p>
                <button
                  onClick={() => navigate('/member/profile/upgrade')}
                  className="mt-2.5 w-full py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-xs transition-colors active:scale-97"
                >
                  Manage Subscription
                </button>
              </div>
            </div>

            {/* Combo Profile Switcher (Conditional) */}
            {isCombo && (
              <div className="bg-white rounded-3xl border border-slate-200/50 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3">
                <p className="text-[10px] text-indigo-950 font-black uppercase tracking-wider text-center">Manage Dual Profiles</p>
                <div className="bg-slate-50 rounded-2xl p-1 flex items-center justify-between border border-slate-250/20">
                  <button
                    onClick={() => handleSwitchActiveProfileType('groom')}
                    className={`flex-1 text-center py-2 rounded-xl font-black text-[11px] border transition-all ${
                      sub.activeProfileType === 'groom'
                        ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                        : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Son (Groom)
                  </button>
                  <button
                    onClick={() => handleSwitchActiveProfileType('bride')}
                    className={`flex-1 text-center py-2 rounded-xl font-black text-[11px] border transition-all ${
                      sub.activeProfileType === 'bride'
                        ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                        : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Daughter (Bride)
                  </button>
                </div>
                <p className="text-[9.5px] text-slate-450 font-extrabold text-center leading-none">
                  Currently Editing Details For: <span className="text-rose-500 font-black">{sub.activeProfileType === 'groom' ? "Son's Profile" : "Daughter's Profile"}</span>
                </p>
              </div>
            )}

            {/* Photo Upload Manager */}
            {isCurrentlySubscribed && (
              <div className="bg-white rounded-3xl border border-slate-200/50 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                <h4 className="text-[13.5px] font-black text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                  <Image size={15} className="text-rose-500" /> Manage My Photos
                </h4>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {(myProfile?.photos || []).map((photo, i) => (
                    <div key={photo._id || i} className="aspect-[3/4] bg-slate-100 rounded-xl overflow-hidden relative border border-slate-200/50 flex items-center justify-center animate-fade-in">
                      <img src={photo.url} alt={`Uploaded ${i}`} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => {
                          showToast('Photo removal requires opening full manage screen.');
                          navigate('/member/matrimonial/manage');
                        }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  {(myProfile?.photos || []).length < 4 && (
                    <button 
                      onClick={() => {
                        showToast('Navigating to full profile manager to upload real photos... 📸');
                        navigate('/member/matrimonial/manage');
                      }}
                      className="aspect-[3/4] border-2 border-dashed border-slate-200 hover:border-rose-400 rounded-xl flex flex-col items-center justify-center text-slate-400 active:scale-95 transition-transform"
                    >
                      <Plus size={16} />
                      <span className="text-[9px] font-bold mt-1">Add Photo</span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Currently showing {(myProfile?.photos || []).length} profile photos. Uploaded photos are visible to matched members.</p>
              </div>
            )}

            {/* Profile Bio Config */}
            <div className="bg-white rounded-3xl border border-slate-200/50 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <h4 className="text-[13.5px] font-black text-slate-800 mb-3 uppercase tracking-wider">About Me & Bio</h4>
              <textarea
                value={myMatrimonialBio}
                onChange={(e) => setMyMatrimonialBio(e.target.value)}
                placeholder="Describe your personality, hobbies, family background, and partner expectations..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-bold min-h-[100px]"
              />
              <button 
                onClick={() => {
                  handleSaveDetails({ bio: myMatrimonialBio, matrimonialBio: myMatrimonialBio });
                  showToast('Matrimonial Bio Saved successfully! 💕');
                }}
                className="mt-3 w-full py-2.5 bg-rose-500 text-white rounded-xl text-[12px] font-black shadow-xs active:scale-95 transition-transform uppercase tracking-wider"
              >
                Save Bio Description
              </button>
            </div>
            {/* Basic Details Config */}
            <div className="bg-white rounded-3xl border border-slate-200/50 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <h4 className="text-[13.5px] font-black text-slate-800 mb-4 uppercase tracking-wider">Basic Details</h4>
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[10.5px] text-slate-400 font-extrabold uppercase tracking-wide block mb-1.5">Height</label>
                    <input 
                      type="text" 
                      value={myHeight} 
                      onChange={(e) => setMyHeight(e.target.value)}
                      placeholder="e.g. 5'6&quot;"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-[12.5px] font-bold text-slate-750 focus:outline-none focus:border-rose-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] text-slate-400 font-extrabold uppercase tracking-wide block mb-1.5">Weight</label>
                    <input 
                      type="text" 
                      value={myWeight} 
                      onChange={(e) => setMyWeight(e.target.value)}
                      placeholder="e.g. 65 kg"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-[12.5px] font-bold text-slate-750 focus:outline-none focus:border-rose-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[10.5px] text-slate-400 font-extrabold uppercase tracking-wide block mb-1.5">Body Type</label>
                    <button 
                      onClick={() => setActivePickerSheet('bodyType')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[12.5px] font-bold text-slate-750 flex items-center justify-between hover:bg-slate-100/30"
                    >
                      <span className="truncate mr-2">{myBodyType}</span>
                      <ChevronRight size={14} className="text-slate-400 rotate-90 shrink-0" />
                    </button>
                  </div>
                  <div>
                    <label className="text-[10.5px] text-slate-400 font-extrabold uppercase tracking-wide block mb-1.5">Complexion</label>
                    <button 
                      onClick={() => setActivePickerSheet('complexion')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[12.5px] font-bold text-slate-750 flex items-center justify-between hover:bg-slate-100/30"
                    >
                      <span className="truncate mr-2">{myComplexion}</span>
                      <ChevronRight size={14} className="text-slate-400 rotate-90 shrink-0" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[10.5px] text-slate-400 font-extrabold uppercase tracking-wide block mb-1.5">Blood Group</label>
                    <button 
                      onClick={() => setActivePickerSheet('bloodGroup')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[12.5px] font-bold text-slate-750 flex items-center justify-between hover:bg-slate-100/30"
                    >
                      <span className="truncate mr-2">{myBloodGroup}</span>
                      <ChevronRight size={14} className="text-slate-400 rotate-90 shrink-0" />
                    </button>
                  </div>
                  <div>
                    <label className="text-[10.5px] text-slate-400 font-extrabold uppercase tracking-wide block mb-1.5">Marital Status</label>
                    <button 
                      onClick={() => setActivePickerSheet('maritalStatus')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[12.5px] font-bold text-slate-750 flex items-center justify-between hover:bg-slate-100/30"
                    >
                      <span className="truncate mr-2">{myMaritalStatus}</span>
                      <ChevronRight size={14} className="text-slate-400 rotate-90 shrink-0" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10.5px] text-slate-400 font-extrabold uppercase tracking-wide block mb-1.5">Mother Tongue</label>
                  <input 
                    type="text" 
                    value={myMotherTongue} 
                    onChange={(e) => setMyMotherTongue(e.target.value)}
                    placeholder="e.g. Hindi, Marwari"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-[12.5px] font-bold text-slate-750 focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>
              <button 
                onClick={() => {
                  handleSaveDetails({
                    height: myHeight,
                    weight: myWeight,
                    bodyType: myBodyType,
                    complexion: myComplexion,
                    bloodGroup: myBloodGroup,
                    maritalStatus: myMaritalStatus,
                    motherTongue: myMotherTongue
                  });
                  showToast('Basic Details Saved successfully! ✨');
                }}
                className="mt-4 w-full py-2.5 bg-rose-500 text-white rounded-xl text-[12px] font-black shadow-xs active:scale-95 transition-transform uppercase tracking-wider"
              >
                Save Basic Details
              </button>
            </div>

            {/* Detailed Parameters Config */}
            <div className="bg-white rounded-3xl border border-slate-200/50 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <h4 className="text-[13.5px] font-black text-slate-800 mb-4 uppercase tracking-wider">Matrimonial Details</h4>
              <div className="space-y-3.5">
                <div>
                  <label className="text-[10.5px] text-slate-400 font-extrabold uppercase tracking-wide">Gotra</label>
                  <button 
                    onClick={() => setActivePickerSheet('gotra')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[12.5px] font-bold text-slate-750 flex items-center justify-between hover:bg-slate-100/30 active:scale-99 transition-all"
                  >
                    <span>{myGotra}</span>
                    <ChevronRight size={14} className="text-slate-400 rotate-90" />
                  </button>
                </div>

                <div>
                  <label className="text-[10.5px] text-slate-400 font-extrabold uppercase tracking-wide">Diet</label>
                  <button 
                    onClick={() => setActivePickerSheet('diet')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[12.5px] font-bold text-slate-750 flex items-center justify-between hover:bg-slate-100/30 active:scale-99 transition-all"
                  >
                    <span>{myDiet}</span>
                    <ChevronRight size={14} className="text-slate-400 rotate-90" />
                  </button>
                </div>

                <div>
                  <label className="text-[10.5px] text-slate-400 font-extrabold uppercase tracking-wide">Annual Income Range</label>
                  <button 
                    onClick={() => setActivePickerSheet('income')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[12.5px] font-bold text-slate-750 flex items-center justify-between hover:bg-slate-100/30 active:scale-99 transition-all"
                  >
                    <span>{myIncome}</span>
                    <ChevronRight size={14} className="text-slate-400 rotate-90" />
                  </button>
                </div>
              </div>
              <button 
                onClick={() => {
                  handleSaveDetails({
                    gotra: myGotra,
                    diet: myDiet,
                    income: myIncome
                  });
                  showToast('Profile Parameters Saved successfully! ⭐');
                }}
                className="mt-4 w-full py-2.5 bg-rose-500 text-white rounded-xl text-[12px] font-black shadow-xs active:scale-95 transition-transform uppercase tracking-wider"
              >
                Save Details
              </button>
            </div>

            {/* Dynamic Partner Preferences Filter Config */}
            <div className="bg-white rounded-3xl border border-slate-200/50 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <h4 className="text-[13.5px] font-black text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-1.5">
                <Heart size={15} className="text-rose-500 fill-rose-500" /> Partner Preferences
              </h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10.5px] text-slate-400 font-extrabold uppercase tracking-wide">Matches Gotra Filter</label>
                    <span className="text-[10.5px] font-black text-rose-500">{selectedGotra === 'All' ? 'All Gotras' : selectedGotra}</span>
                  </div>
                  <button 
                    onClick={() => setActivePickerSheet('partner-gotra')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[12.5px] font-bold text-slate-750 flex items-center justify-between hover:bg-slate-100/30 active:scale-99 transition-all"
                  >
                    <span>{selectedGotra === 'All' ? 'Show All Gotras' : selectedGotra}</span>
                    <ChevronRight size={14} className="text-slate-400 rotate-90" />
                  </button>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10.5px] text-slate-400 font-extrabold uppercase tracking-wide">Matches Diet Filter</label>
                    <span className="text-[10.5px] font-black text-rose-500">{selectedDiet === 'All' ? 'All Diets' : `${selectedDiet} Only`}</span>
                  </div>
                  <button 
                    onClick={() => setActivePickerSheet('partner-diet')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[12.5px] font-bold text-slate-750 flex items-center justify-between hover:bg-slate-100/30 active:scale-99 transition-all"
                  >
                    <span>{selectedDiet === 'All' ? 'Show All Diets' : `${selectedDiet} Only`}</span>
                    <ChevronRight size={14} className="text-slate-400 rotate-90" />
                  </button>
                </div>
              </div>
              <button 
                onClick={() => {
                  showToast('Preferences Saved! Feed matches updated. 💕');
                  setActiveBottomTab('matches');
                }}
                className="mt-5 w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl text-[12.5px] font-black shadow-md active:scale-95 transition-transform uppercase tracking-wider"
              >
                Apply Preferences & Search Matches
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* Custom Slide-Up Bottom Sheet Picker for Dropdowns on Mobile */}
      {activePickerSheet && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[80] flex items-end justify-center animate-fade-in font-sans" onClick={() => setActivePickerSheet(null)}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-white rounded-t-3xl max-h-[70vh] flex flex-col shadow-2xl animate-slide-up border-t border-slate-100"
          >
            {/* Handle bar */}
            <div className="w-12 h-1.2 bg-slate-250 rounded-full mx-auto my-3.5 shrink-0" />
            
            {/* Header */}
            <div className="px-5 pb-3 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-[13.5px] font-black text-slate-800 uppercase tracking-wider">
                {activePickerSheet === 'gotra' && 'Select Your Gotra'}
                {activePickerSheet === 'diet' && 'Select Your Diet'}
                {activePickerSheet === 'income' && 'Select Annual Income'}
                {activePickerSheet === 'partner-gotra' && 'Preferred Gotra Filter'}
                {activePickerSheet === 'partner-diet' && 'Preferred Diet Filter'}
                {activePickerSheet === 'bodyType' && 'Select Body Type'}
                {activePickerSheet === 'complexion' && 'Select Complexion'}
                {activePickerSheet === 'bloodGroup' && 'Select Blood Group'}
                {activePickerSheet === 'maritalStatus' && 'Select Marital Status'}
              </h3>
              <button 
                onClick={() => setActivePickerSheet(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 active:bg-slate-200"
              >
                <X size={15} />
              </button>
            </div>
            
            {/* Options list */}
            <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5">
              {activePickerSheet === 'gotra' && ['Garg', 'Bansal', 'Mittal', 'Goyal', 'Jindal', 'Singhal', 'Kansal'].map(g => (
                <button
                  key={g}
                  onClick={() => { setMyGotra(g); updateProfile({ gotra: g }); setActivePickerSheet(null); showToast(`Selected Gotra: ${g}`); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-[13.5px] font-extrabold transition-all border ${
                    myGotra === g ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-slate-150 text-slate-650 hover:bg-slate-50'
                  }`}
                >
                  {g}
                </button>
              ))}

              {activePickerSheet === 'diet' && ['Vegetarian', 'Non-Vegetarian', 'Eggetarian'].map(d => (
                <button
                  key={d}
                  onClick={() => { setMyDiet(d); updateProfile({ diet: d }); setActivePickerSheet(null); showToast(`Selected Diet: ${d}`); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-[13.5px] font-extrabold transition-all border ${
                    myDiet === d ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-slate-150 text-slate-650 hover:bg-slate-50'
                  }`}
                >
                  {d}
                </button>
              ))}

              {activePickerSheet === 'income' && ['₹5-7.5 Lacs p.a', '₹7.5-10 Lacs p.a', '₹10-15 Lacs p.a', '₹15-20 Lacs p.a', '₹20+ Lacs p.a'].map(inc => (
                <button
                  key={inc}
                  onClick={() => { setMyIncome(inc); updateProfile({ income: inc }); setActivePickerSheet(null); showToast(`Selected Income: ${inc}`); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-[13.5px] font-extrabold transition-all border ${
                    myIncome === inc ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-slate-150 text-slate-650 hover:bg-slate-50'
                  }`}
                >
                  {inc}
                </button>
              ))}

              {activePickerSheet === 'partner-gotra' && ['All', 'Garg', 'Bansal', 'Mittal', 'Goyal', 'Jindal', 'Dodiya', 'Saini', 'Jatav'].map(g => (
                <button
                  key={g}
                  onClick={() => { setSelectedGotra(g); setActivePickerSheet(null); showToast(`Partner Gotra filter set to: ${g}`); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-[13.5px] font-extrabold transition-all border ${
                    selectedGotra === g ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-slate-150 text-slate-650 hover:bg-slate-50'
                  }`}
                >
                  {g === 'All' ? 'Show All Gotras' : g}
                </button>
              ))}

              {activePickerSheet === 'partner-diet' && ['All', 'Vegetarian', 'Non-Vegetarian'].map(d => (
                <button
                  key={d}
                  onClick={() => { setSelectedDiet(d); setActivePickerSheet(null); showToast(`Partner Diet filter set to: ${d}`); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-[13.5px] font-extrabold transition-all border ${
                    selectedDiet === d ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-slate-150 text-slate-650 hover:bg-slate-50'
                  }`}
                >
                  {d === 'All' ? 'Show All Diets' : `${d} Only`}
                </button>
              ))}

              {activePickerSheet === 'bodyType' && ['Average', 'Slim', 'Athletic', 'Heavy'].map(b => (
                <button
                  key={b}
                  onClick={() => { setMyBodyType(b); setActivePickerSheet(null); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-[13.5px] font-extrabold transition-all border ${
                    myBodyType === b ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-slate-150 text-slate-650 hover:bg-slate-50'
                  }`}
                >
                  {b}
                </button>
              ))}

              {activePickerSheet === 'complexion' && ['Fair', 'Very Fair', 'Wheatish', 'Dark'].map(c => (
                <button
                  key={c}
                  onClick={() => { setMyComplexion(c); setActivePickerSheet(null); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-[13.5px] font-extrabold transition-all border ${
                    myComplexion === c ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-slate-150 text-slate-650 hover:bg-slate-50'
                  }`}
                >
                  {c}
                </button>
              ))}

              {activePickerSheet === 'bloodGroup' && ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                <button
                  key={bg}
                  onClick={() => { setMyBloodGroup(bg); setActivePickerSheet(null); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-[13.5px] font-extrabold transition-all border ${
                    myBloodGroup === bg ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-slate-150 text-slate-650 hover:bg-slate-50'
                  }`}
                >
                  {bg}
                </button>
              ))}

              {activePickerSheet === 'maritalStatus' && ['Never Married', 'Divorced', 'Widowed'].map(ms => (
                <button
                  key={ms}
                  onClick={() => { setMyMaritalStatus(ms); setActivePickerSheet(null); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-[13.5px] font-extrabold transition-all border ${
                    myMaritalStatus === ms ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-slate-150 text-slate-650 hover:bg-slate-50'
                  }`}
                >
                  {ms}
                </button>
              ))}
            </div>
            
            {/* Close */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button 
                onClick={() => setActivePickerSheet(null)}
                className="w-full py-3 bg-white border border-slate-200 rounded-xl text-[13px] font-black text-slate-500 uppercase tracking-wider active:scale-95 transition-transform"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── FILTERS DRAWER / SLIDE-UP MODAL ─── */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[80] flex items-end justify-center animate-fade-in font-sans" onClick={() => setIsFilterDrawerOpen(false)}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl animate-slide-up border-t border-slate-100 max-w-md pb-safe"
          >
            {/* Handle bar */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />
            
            {/* Header */}
            <div className="px-5 pb-3 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-rose-500" />
                <h3 className="text-[15px] font-black text-slate-800 uppercase tracking-wider">Refine Matches</h3>
              </div>
              <button 
                onClick={() => setIsFilterDrawerOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-450 hover:bg-slate-200"
              >
                <X size={15} />
              </button>
            </div>
            
            {/* Scrollable Filters Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              
              {/* Age Range Slider Selection */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wide">Age Range</label>
                  <span className="text-[12px] font-black text-rose-500">{ageRange.min} - {ageRange.max} Years</span>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="18" 
                    max="60" 
                    value={ageRange.min}
                    onChange={(e) => setAgeRange(prev => ({ ...prev, min: Math.min(parseInt(e.target.value), prev.max) }))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                  <input 
                    type="range" 
                    min="18" 
                    max="60" 
                    value={ageRange.max}
                    onChange={(e) => setAgeRange(prev => ({ ...prev, max: Math.max(parseInt(e.target.value), prev.min) }))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                </div>
                <div className="flex justify-between text-[9.5px] text-slate-400 font-bold mt-1.5 uppercase">
                  <span>Min: {ageRange.min} yrs</span>
                  <span>Max: {ageRange.max} yrs</span>
                </div>
              </div>

              {/* Marital Status Selection */}
              <div>
                <label className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wide block mb-2">Marital Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {['All', 'Never Married', 'Divorced', 'Widowed', 'Awaiting Divorce'].map(ms => (
                    <button
                      key={ms}
                      onClick={() => setSelectedMaritalStatus(ms)}
                      className={`py-2 px-3 text-[11px] font-extrabold rounded-xl border transition-all text-center ${
                        selectedMaritalStatus === ms 
                          ? 'bg-rose-50 border-rose-350 text-rose-600 shadow-xs' 
                          : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                      }`}
                    >
                      {ms}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Toggle Filters (Verified Only & Photo Only) */}
              <div>
                <label className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wide block mb-2">Profile Verification & Photos</label>
                <div className="space-y-2">
                  <button
                    onClick={() => setVerifiedOnlyFilter(prev => !prev)}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${
                      verifiedOnlyFilter 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold' 
                        : 'bg-white border-slate-200 text-slate-600 font-semibold hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck size={16} className={verifiedOnlyFilter ? 'text-emerald-600' : 'text-slate-400'} />
                      <span className="text-[12px]">Verified Profiles Only</span>
                    </div>
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                      verifiedOnlyFilter ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'
                    }`}>
                      {verifiedOnlyFilter && <Check size={11} strokeWidth={3} />}
                    </div>
                  </button>

                  <button
                    onClick={() => setWithPhotoOnlyFilter(prev => !prev)}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${
                      withPhotoOnlyFilter 
                        ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold' 
                        : 'bg-white border-slate-200 text-slate-600 font-semibold hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Image size={16} className={withPhotoOnlyFilter ? 'text-rose-600' : 'text-slate-400'} />
                      <span className="text-[12px]">Profiles With Photo Only</span>
                    </div>
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                      withPhotoOnlyFilter ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-300'
                    }`}>
                      {withPhotoOnlyFilter && <Check size={11} strokeWidth={3} />}
                    </div>
                  </button>
                </div>
              </div>

              {/* Diet Selection */}
              <div>
                <label className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wide block mb-2">Diet Preference</label>
                <div className="flex gap-2">
                  {['All', 'Vegetarian', 'Non-Vegetarian', 'Eggetarian'].map(d => (
                    <button
                      key={d}
                      onClick={() => setSelectedDiet(d)}
                      className={`flex-1 py-2 text-[10.5px] font-extrabold rounded-xl border transition-all ${
                        selectedDiet === d 
                          ? 'bg-rose-50 border-rose-350 text-rose-600 shadow-xs' 
                          : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button 
                onClick={() => {
                  setAgeRange({ min: 18, max: 50 });
                  setSelectedMaritalStatus('All');
                  setSelectedDiet('All');
                  setVerifiedOnlyFilter(false);
                  setWithPhotoOnlyFilter(false);
                  showToast('Filters reset to default.');
                }}
                className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-[12.5px] font-black text-slate-500 uppercase tracking-wider active:scale-95 transition-transform"
              >
                Reset
              </button>
              <button 
                onClick={() => {
                  setIsFilterDrawerOpen(false);
                  showToast('Filters applied successfully! 🔍');
                }}
                className="flex-1 py-3 bg-rose-500 text-white rounded-xl text-[12.5px] font-black uppercase tracking-wider active:scale-95 transition-transform shadow-md shadow-rose-500/10"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

  
      {/* ─── TOAST NOTIFICATION ─── */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-sm text-white text-[12.5px] font-black px-5 py-3 rounded-full shadow-lg z-[60] animate-bounce-in border border-white/10">
          {toastMessage}
        </div>
      )}

    </div>
  );
};

export default MatrimonialHomePage;
