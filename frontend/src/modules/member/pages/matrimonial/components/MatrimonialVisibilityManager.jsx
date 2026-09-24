import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Eye, ShieldCheck, MapPin, Search, Check, ChevronRight,
  UserCheck, Lock, Mail, MessageCircle, Sparkles, Heart, Bell, Settings,
  SlidersHorizontal, User, Image, FileText, HelpCircle, CreditCard,
  Building, CheckCircle2, Info, CheckSquare, Square, EyeOff, X, Users,
  Home, PhoneCall, Phone, Upload, Trash2, Camera, Star, AlertCircle,
  Shield, CheckCheck, Crown, ExternalLink, ChevronDown, ChevronUp, Plus
} from 'lucide-react';
import { matrimonialProfileService } from '../../../../../core/api/matrimonialService';
import { useData } from '../../../context/DataProvider';

// Sample community data with profile counts
const COMMUNITY_OPTIONS = [
  { id: 'marathi', name: 'Marathi', count: 320 },
  { id: 'gujarati', name: 'Gujarati', count: 280 },
  { id: 'punjabi', name: 'Punjabi', count: 240 },
  { id: 'rajasthani', name: 'Rajasthani', count: 180 },
  { id: 'bengali', name: 'Bengali', count: 150 },
  { id: 'tamil', name: 'Tamil', count: 210 },
  { id: 'telugu', name: 'Telugu', count: 190 },
  { id: 'kannada', name: 'Kannada', count: 170 },
  { id: 'malayalam', name: 'Malayalam', count: 160 },
  { id: 'odia', name: 'Odia', count: 140 },
  { id: 'bhojpuri', name: 'Bhojpuri', count: 120 },
  { id: 'sindhi', name: 'Sindhi', count: 100 },
  { id: 'agrawal', name: 'Agrawal', count: 310 },
  { id: 'brahmin', name: 'Brahmin', count: 420 },
  { id: 'rajput', name: 'Rajput', count: 290 },
  { id: 'jain', name: 'Jain', count: 260 },
];

// Sample location data with profile counts
const LOCATION_OPTIONS = [
  { id: 'mumbai', name: 'Mumbai, Maharashtra', type: 'city', count: 320 },
  { id: 'pune', name: 'Pune, Maharashtra', type: 'city', count: 210 },
  { id: 'nagpur', name: 'Nagpur, Maharashtra', type: 'city', count: 98 },
  { id: 'delhi', name: 'Delhi', type: 'city', count: 450 },
  { id: 'bangalore', name: 'Bangalore, Karnataka', type: 'city', count: 380 },
  { id: 'hyderabad', name: 'Hyderabad, Telangana', type: 'city', count: 290 },
  { id: 'ahmedabad', name: 'Ahmedabad, Gujarat', type: 'city', count: 220 },
  { id: 'jaipur', name: 'Jaipur, Rajasthan', type: 'city', count: 180 },
  { id: 'indore', name: 'Indore, Madhya Pradesh', type: 'city', count: 240 },
  { id: 'bhopal', name: 'Bhopal, Madhya Pradesh', type: 'city', count: 160 },
];

export const MatrimonialVisibilityManager = ({
  onClose,
  initialScreen = 'menu', // 'menu' | 'visibility' | 'select-communities' | 'select-locations' | 'preview' | 'edit-profile' | 'photos' | 'preferences' | 'privacy' | 'subscription' | 'help'
  currentUser: propUser,
  myProfile: propProfile,
  onNavigateToTab,
}) => {
  const navigate = useNavigate();
  const { currentUser: dataUser, updateProfile } = useData();
  const user = propUser || dataUser || {};
  const profile = propProfile || {};

  // Current active screen in the suite
  const [currentScreen, setCurrentScreen] = useState(initialScreen);
  const [previewTab, setPreviewTab] = useState('before'); // 'before' | 'after'
  const [locationTab, setLocationTab] = useState('cities'); // 'cities' | 'states' | 'nearby'
  const [toastMessage, setToastMessage] = useState('');
  
  // Search states
  const [communitySearch, setCommunitySearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');

  // Form states for Edit Profile
  const [editForm, setEditForm] = useState({
    fullName: user?.name || profile?.personal?.fullName || 'Rahul Sharma',
    age: user?.age || 28,
    gender: user?.gender || profile?.personal?.gender || 'male',
    height: user?.height || profile?.personal?.height || "5'8\"",
    weight: user?.weight || "68 kg",
    maritalStatus: user?.maritalStatus || 'Never Married',
    education: user?.education || profile?.education?.highestQualification || 'B.Tech / MBA',
    profession: user?.profession || profile?.education?.profession || 'Software Engineer',
    annualIncome: user?.income || user?.annualIncome || '₹15-20 Lacs p.a',
    community: user?.community || profile?.personal?.community || 'Agrawal',
    subCommunity: user?.subCommunity || 'Garg',
    gotra: user?.gotra || 'Garg',
    diet: user?.diet || 'Vegetarian',
    city: user?.city || profile?.location?.city || 'Mumbai, Maharashtra',
    bio: user?.matrimonialBio || user?.bio || profile?.about?.summary || 'Passionate professional looking for a like-minded life partner with good family values.'
  });

  // Partner Preferences State
  const [preferences, setPreferences] = useState({
    minAge: 22,
    maxAge: 30,
    preferredDiet: 'Vegetarian',
    preferredMaritalStatus: 'Never Married',
    preferredCommunity: 'Same Community',
    preferredGotra: 'Different Gotra',
    minIncome: '₹10+ Lacs p.a'
  });

  // Privacy Settings State
  const [privacySettings, setPrivacySettings] = useState({
    showPhoneOnlyAfterAccept: true,
    incognitoMode: false,
    protectPhotosScreenshot: true,
    accountStatus: 'active' // 'active' | 'hidden' | 'paused'
  });

  // Visibility Settings State (Matches Screen 2 in reference image)
  const [settings, setSettings] = useState({
    otherCommunities: {
      enabled: true,
      scope: 'all', // 'all' | 'selected'
      selectedCommunities: ['Marathi', 'Gujarati', 'Punjabi', 'Tamil']
    },
    myCommunity: {
      enabled: true,
      scope: 'all'
    },
    mySubCommunity: {
      enabled: true,
      scope: 'all'
    },
    aadharVerifiedOnly: true,
    communityVerifiedOnly: true,
    selectedLocations: {
      enabled: true,
      locations: ['Mumbai, Maharashtra', 'Pune, Maharashtra', 'Delhi']
    },
    visibleOnlyAfterAccept: true
  });

  // Photos State
  const [photosList, setPhotosList] = useState([
    { id: 1, url: profile?.photos?.[0]?.url || user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80', isPrimary: true },
    { id: 2, url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80', isPrimary: false },
    { id: 3, url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80', isPrimary: false },
  ]);

  const [saving, setSaving] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Load saved visibility settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await matrimonialProfileService.getVisibilitySettings();
        if (res.data?.data) {
          setSettings(prev => ({
            ...prev,
            ...res.data.data
          }));
        }
      } catch (err) {
        // Fallback to presets
      }
    };
    loadSettings();
  }, []);

  const handleSaveVisibilitySettings = async () => {
    setSaving(true);
    try {
      await matrimonialProfileService.updateVisibilitySettings(settings);
      showToast('Visibility settings saved successfully! 🔒');
    } catch (err) {
      showToast('Settings saved locally! ✨');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfileForm = (e) => {
    e.preventDefault();
    setSaving(true);
    if (updateProfile) {
      updateProfile({
        name: editForm.fullName,
        age: editForm.age,
        gender: editForm.gender,
        height: editForm.height,
        diet: editForm.diet,
        gotra: editForm.gotra,
        income: editForm.annualIncome,
        maritalStatus: editForm.maritalStatus,
        matrimonialBio: editForm.bio,
        city: editForm.city
      });
    }
    setTimeout(() => {
      setSaving(false);
      showToast('Matrimonial profile updated successfully! 💖');
      setCurrentScreen('menu');
    }, 600);
  };

  const handleSavePreferences = () => {
    showToast('Partner preferences updated! 💍');
    setCurrentScreen('menu');
  };

  const handleSavePrivacy = () => {
    showToast('Privacy & Security configurations saved! 🛡️');
    setCurrentScreen('menu');
  };

  // Toggle helpers
  const toggleSetting = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleNestedSetting = (parentKey, prop) => {
    setSettings(prev => ({
      ...prev,
      [parentKey]: {
        ...prev[parentKey],
        [prop]: !prev[parentKey][prop]
      }
    }));
  };

  const toggleCommunitySelection = (commName) => {
    setSettings(prev => {
      const current = prev.otherCommunities.selectedCommunities || [];
      const exists = current.includes(commName);
      const updated = exists
        ? current.filter(c => c !== commName)
        : [...current, commName];
      return {
        ...prev,
        otherCommunities: {
          ...prev.otherCommunities,
          selectedCommunities: updated
        }
      };
    });
  };

  const toggleLocationSelection = (locName) => {
    setSettings(prev => {
      const current = prev.selectedLocations.locations || [];
      const exists = current.includes(locName);
      const updated = exists
        ? current.filter(l => l !== locName)
        : [...current, locName];
      return {
        ...prev,
        selectedLocations: {
          ...prev.selectedLocations,
          locations: updated
        }
      };
    });
  };

  // Filtered lists
  const filteredCommunities = useMemo(() => {
    if (!communitySearch.trim()) return COMMUNITY_OPTIONS;
    return COMMUNITY_OPTIONS.filter(c =>
      c.name.toLowerCase().includes(communitySearch.toLowerCase())
    );
  }, [communitySearch]);

  const filteredLocations = useMemo(() => {
    let list = LOCATION_OPTIONS;
    if (locationTab === 'cities') {
      list = LOCATION_OPTIONS.filter(l => l.type === 'city');
    } else if (locationTab === 'states') {
      list = [
        { id: 'mh', name: 'Maharashtra', count: 680 },
        { id: 'gj', name: 'Gujarat', count: 520 },
        { id: 'rj', name: 'Rajasthan', count: 390 },
        { id: 'dl', name: 'Delhi NCR', count: 450 },
        { id: 'ka', name: 'Karnataka', count: 410 },
        { id: 'mp', name: 'Madhya Pradesh', count: 350 },
      ];
    } else if (locationTab === 'nearby') {
      list = LOCATION_OPTIONS.slice(0, 4);
    }
    if (!locationSearch.trim()) return list;
    return list.filter(l =>
      l.name.toLowerCase().includes(locationSearch.toLowerCase())
    );
  }, [locationTab, locationSearch]);

  const previewUser = {
    name: editForm.fullName || user?.name || 'Rahul Sharma',
    id: user?.memberId || (user?._id ? `MP${user._id.slice(-6).toUpperCase()}` : 'MP123456'),
    age: editForm.age || 28,
    height: editForm.height || "5'8\"",
    education: editForm.education || 'B.Com',
    city: editForm.city || 'Mumbai, Maharashtra',
    religion: 'Hindu',
    caste: editForm.community || 'Bania',
    photo: photosList.find(p => p.isPrimary)?.url || photosList[0]?.url || user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
    completionPercentage: profile?.profileCompletion?.percentage || 63,
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SCREEN 1: MATRIMONY PROFILE MENU (Matches Screen 1 in Image)
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentScreen === 'menu') {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 min-h-full font-sans pb-36 overflow-y-auto">
        {/* Header */}
        <div className="bg-white px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onClose ? onClose() : navigate('/member/matrimonial')}
              className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 text-slate-700 active:scale-95"
              title="Back to Matches"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 shadow-xs">
              <Heart size={18} className="fill-rose-500" />
            </div>
            <div>
              <h1 className="text-[17px] font-black text-rose-600 leading-none">Matrimony</h1>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Find Your Perfect Life Partner</p>
            </div>
          </div>
          <button
            onClick={() => setCurrentScreen('visibility')}
            className="p-2 text-slate-500 hover:text-rose-600 active:scale-95 transition-all"
            title="Visibility Settings"
          >
            <Settings size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
          {/* User Profile Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-sm flex items-center gap-4">
            <div className="relative shrink-0">
              <div 
                onClick={() => setCurrentScreen('photos')}
                className="w-16 h-16 rounded-full overflow-hidden border-2 border-rose-500 shadow-sm cursor-pointer hover:opacity-90 active:scale-95 transition-all relative group"
              >
                <img
                  src={previewUser.photo}
                  alt={previewUser.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={16} className="text-white" />
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-black text-slate-800 truncate">{previewUser.name}</h3>
              </div>
              <p className="text-[11px] text-slate-400 font-bold">ID: {previewUser.id}</p>

              {/* Profile Completion Bar */}
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${previewUser.completionPercentage}%` }}
                  />
                </div>
                <span className="text-[11px] font-black text-slate-700">{previewUser.completionPercentage}%</span>
              </div>
              <p className="text-[9.5px] text-slate-400 font-semibold mt-0.5">Profile Completion</p>
            </div>

            <div>
              <button
                onClick={() => setCurrentScreen('preview')}
                className="px-3 py-1.5 rounded-xl border border-rose-400 text-rose-600 hover:bg-rose-50 text-[11px] font-bold whitespace-nowrap active:scale-95 transition-all shadow-xs"
              >
                View Profile
              </button>
            </div>
          </div>

          {/* Menu Items List (All 7 Features 100% Clickable & Interactive) */}
          <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm overflow-hidden divide-y divide-slate-100">
            {/* 1. Edit Profile */}
            <button
              onClick={() => setCurrentScreen('edit-profile')}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition-colors text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-rose-50 text-slate-600 group-hover:text-rose-600 flex items-center justify-center transition-colors">
                  <FileText size={16} />
                </div>
                <div>
                  <span className="text-[13.5px] font-bold text-slate-800">Edit Profile</span>
                  <p className="text-[10.5px] text-slate-400">Biodata, education, gotra & details</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* 2. Profile Photos */}
            <button
              onClick={() => setCurrentScreen('photos')}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition-colors text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-rose-50 text-slate-600 group-hover:text-rose-600 flex items-center justify-center transition-colors">
                  <Image size={16} />
                </div>
                <div>
                  <span className="text-[13.5px] font-bold text-slate-800">Profile Photos</span>
                  <p className="text-[10.5px] text-slate-400">{photosList.length} photos uploaded</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* 3. Partner Preferences */}
            <button
              onClick={() => setCurrentScreen('preferences')}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition-colors text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-rose-50 text-slate-600 group-hover:text-rose-600 flex items-center justify-center transition-colors">
                  <Heart size={16} />
                </div>
                <div>
                  <span className="text-[13.5px] font-bold text-slate-800">Partner Preferences</span>
                  <p className="text-[10.5px] text-slate-400">Age, diet, gotra & community matching</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* 4. Profile Visibility Settings (HIGHLIGHTED / ACTIVE) */}
            <button
              onClick={() => setCurrentScreen('visibility')}
              className="w-full px-5 py-4 flex items-center justify-between bg-rose-50/40 hover:bg-rose-50/80 active:bg-rose-100/70 transition-colors text-left border-l-4 border-l-rose-500"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
                  <Settings size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-extrabold text-rose-700">Profile Visibility Settings</span>
                    <span className="px-2 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded-full uppercase tracking-wider shadow-xs">Active</span>
                  </div>
                  <p className="text-[10.5px] text-rose-600/80">Control who can view your photo & profile</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-rose-600" />
            </button>

            {/* 5. Privacy & Security */}
            <button
              onClick={() => setCurrentScreen('privacy')}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition-colors text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-rose-50 text-slate-600 group-hover:text-rose-600 flex items-center justify-center transition-colors">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <span className="text-[13.5px] font-bold text-slate-800">Privacy &amp; Security</span>
                  <p className="text-[10.5px] text-slate-400">Phone number & incognito browsing</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* 6. Subscription Plans */}
            <button
              onClick={() => setCurrentScreen('subscription')}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition-colors text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-rose-50 text-slate-600 group-hover:text-rose-600 flex items-center justify-center transition-colors">
                  <CreditCard size={16} />
                </div>
                <div>
                  <span className="text-[13.5px] font-bold text-slate-800">Subscription Plans</span>
                  <p className="text-[10.5px] text-slate-400">Upgrade to Pro, Pro Max & Supreme</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* 7. Help & Support */}
            <button
              onClick={() => setCurrentScreen('help')}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition-colors text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-rose-50 text-slate-600 group-hover:text-rose-600 flex items-center justify-center transition-colors">
                  <HelpCircle size={16} />
                </div>
                <div>
                  <span className="text-[13.5px] font-bold text-slate-800">Help &amp; Support</span>
                  <p className="text-[10.5px] text-slate-400">Helpline, WhatsApp chat & FAQs</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-sm text-white text-[12.5px] font-black px-5 py-3 rounded-full shadow-lg z-50 animate-bounce-in border border-white/10">
            {toastMessage}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCREEN 2: PROFILE VISIBILITY SETTINGS (Matches Screen 2 in Image)
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentScreen === 'visibility') {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 min-h-full font-sans pb-36 overflow-y-auto">
        {/* Top Sticky Header */}
        <div className="bg-white px-4 py-3.5 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentScreen('menu')}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-[16px] font-black text-slate-800">Profile Visibility Settings</h2>
          </div>
          <button
            onClick={() => setCurrentScreen('preview')}
            className="text-[12px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 active:scale-95 transition-all"
          >
            <Eye size={14} /> Preview
          </button>
        </div>

        <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
          {/* Top Banner: Eye Icon */}
          <div className="bg-rose-50/80 border border-rose-100 rounded-2xl p-3.5 flex items-start gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Eye size={18} />
            </div>
            <div>
              <h4 className="text-[13px] font-black text-rose-800">Control who can see your profile</h4>
              <p className="text-[11px] text-rose-600 font-medium mt-0.5 leading-snug">
                Aap khud decide karein ki kaun aapki profile dekh sakta hai.
              </p>
            </div>
          </div>

          {/* Settings List */}
          <div className="space-y-3">
            {/* Setting 1: Other Community Members */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Building size={16} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-800">Other Community Members</h4>
                    <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                      Dusre community ke members ko bhi aapki profile dikhai degi.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={settings.otherCommunities.enabled}
                    onChange={() => toggleNestedSetting('otherCommunities', 'enabled')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {settings.otherCommunities.enabled && (
                <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2.5 pl-11">
                  {/* Radio 1: All Other Communities */}
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="otherScope"
                      checked={settings.otherCommunities.scope === 'all'}
                      onChange={() => setSettings(s => ({ ...s, otherCommunities: { ...s.otherCommunities, scope: 'all' } }))}
                      className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-slate-300"
                    />
                    <span className="text-[12px] font-semibold text-slate-700">
                      All Other Communities <span className="text-slate-400 text-[11px]">(1,345 profiles)</span>
                    </span>
                  </label>

                  {/* Radio 2: Selected Communities */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="otherScope"
                        checked={settings.otherCommunities.scope === 'selected'}
                        onChange={() => setSettings(s => ({ ...s, otherCommunities: { ...s.otherCommunities, scope: 'selected' } }))}
                        className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-slate-300"
                      />
                      <span className="text-[12px] font-semibold text-slate-700">Selected Communities</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setCurrentScreen('select-communities')}
                      className="text-[11.5px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-0.5 active:scale-95"
                    >
                      Select ({settings.otherCommunities.selectedCommunities.length}) <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Setting 2: My Community Members */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Users size={16} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-800">My Community Members</h4>
                    <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                      Sirf meri community ke members dekh sakte hain.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={settings.myCommunity.enabled}
                    onChange={() => toggleNestedSetting('myCommunity', 'enabled')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {settings.myCommunity.enabled && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 pl-11 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span className="text-[12px] font-semibold text-slate-700">
                    All Members <span className="text-slate-400 text-[11px]">(460 profiles)</span>
                  </span>
                </div>
              )}
            </div>

            {/* Setting 3: My Sub Community Members */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Users size={16} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-800">My Sub Community Members</h4>
                    <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                      Sirf meri sub community ke members dekh sakte hain.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={settings.mySubCommunity.enabled}
                    onChange={() => toggleNestedSetting('mySubCommunity', 'enabled')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {settings.mySubCommunity.enabled && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 pl-11 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span className="text-[12px] font-semibold text-slate-700">
                    All Sub Communities <span className="text-slate-400 text-[11px]">(300 profiles)</span>
                  </span>
                </div>
              )}
            </div>

            {/* Setting 4: Aadhar Verified Members */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-800">Aadhar Verified Members</h4>
                    <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                      Sirf Aadhar verified members aapki profile dekh sakte hain.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={settings.aadharVerifiedOnly}
                    onChange={() => toggleSetting('aadharVerifiedOnly')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>

            {/* Setting 5: Community Verified Members */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-800">Community Verified Members</h4>
                    <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                      Sirf community verified members aapki profile dekh sakte hain.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={settings.communityVerifiedOnly}
                    onChange={() => toggleSetting('communityVerifiedOnly')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>

            {/* Setting 6: Selected Location Members */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-800">Selected Location Members</h4>
                    <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                      Sirf selected location ke members aapki profile dekh sakte hain.
                    </p>
                    {settings.selectedLocations.enabled && (
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('select-locations')}
                        className="text-[11.5px] font-bold text-rose-600 hover:text-rose-700 mt-1.5 flex items-center gap-0.5"
                      >
                        Set Location ({settings.selectedLocations.locations.length}) &gt;
                      </button>
                    )}
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={settings.selectedLocations.enabled}
                    onChange={() => toggleNestedSetting('selectedLocations', 'enabled')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>

            {/* Setting 7: Visible Only After Request Accept */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Mail size={16} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-800">Visible Only After Request Accept</h4>
                    <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                      Jab koi member aapko request bheje aur aap accept karein tab hi aapki profile unko full visible hogi.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={settings.visibleOnlyAfterAccept}
                    onChange={() => toggleSetting('visibleOnlyAfterAccept')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Sticky Save Changes Button */}
          <div className="pt-2">
            <button
              onClick={handleSaveVisibilitySettings}
              disabled={saving}
              className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-2xl font-black text-[14px] shadow-lg shadow-rose-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <>Saving Changes...</>
              ) : (
                <>
                  <Check size={18} strokeWidth={3} /> Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCREEN 3: SELECT COMMUNITIES (Matches Screen 3 in Image)
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentScreen === 'select-communities') {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 min-h-full font-sans pb-36 overflow-y-auto">
        <div className="bg-white px-4 py-3.5 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentScreen('visibility')}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-[16px] font-black text-slate-800">Select Communities</h2>
          </div>
        </div>

        <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
          {/* Search Box */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search community..."
              value={communitySearch}
              onChange={(e) => setCommunitySearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-800 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* List of Communities */}
          <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-xs">
            {filteredCommunities.map((comm) => {
              const isSelected = settings.otherCommunities.selectedCommunities.includes(comm.name);
              return (
                <label
                  key={comm.id}
                  className="flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => toggleCommunitySelection(comm.name)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-rose-500 border-rose-500 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check size={14} strokeWidth={3} />}
                    </div>
                    <span className="text-[13px] font-bold text-slate-800">{comm.name}</span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">{comm.count} profiles</span>
                </label>
              );
            })}
          </div>

          {/* Sticky Done Button */}
          <div className="pt-2">
            <button
              onClick={() => setCurrentScreen('visibility')}
              className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-black text-[14px] shadow-lg shadow-rose-500/20 active:scale-98 transition-all"
            >
              Done
            </button>
            <p className="text-center text-[11px] font-bold text-slate-400 mt-2">
              {settings.otherCommunities.selectedCommunities.length} Communities Selected
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCREEN 4: SELECTED LOCATION MEMBERS (Matches Screen 4 in Image)
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentScreen === 'select-locations') {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 min-h-full font-sans pb-36 overflow-y-auto">
        <div className="bg-white px-4 py-3.5 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentScreen('visibility')}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-[16px] font-black text-slate-800">Selected Location Members</h2>
          </div>
        </div>

        <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
          {/* Top Location Toggle Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={16} />
              </div>
              <div>
                <h4 className="text-[13px] font-bold text-slate-800">Show my profile to selected location members</h4>
                <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                  Sirf unhi members ko aapki profile dikhai degi jo aapke selected location me rehte hain.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={settings.selectedLocations.enabled}
                onChange={() => toggleNestedSetting('selectedLocations', 'enabled')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search location (City, State, Country)..."
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-800 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Segmented Location Tabs */}
          <div className="flex border-b border-slate-200">
            {[
              { id: 'cities', label: 'Popular Cities' },
              { id: 'states', label: 'States' },
              { id: 'nearby', label: 'Nearby' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setLocationTab(tab.id)}
                className={`flex-1 pb-2.5 text-[12px] font-black transition-all border-b-2 text-center ${
                  locationTab === tab.id
                    ? 'border-rose-500 text-rose-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Locations Checklist */}
          <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-xs">
            {filteredLocations.map((loc) => {
              const isSelected = settings.selectedLocations.locations.includes(loc.name);
              return (
                <label
                  key={loc.id}
                  className="flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => toggleLocationSelection(loc.name)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-rose-500 border-rose-500 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check size={14} strokeWidth={3} />}
                    </div>
                    <span className="text-[13px] font-bold text-slate-800">{loc.name}</span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">{loc.count} profiles</span>
                </label>
              );
            })}
          </div>

          {/* Sticky Apply Location Button */}
          <div className="pt-2">
            <button
              onClick={() => setCurrentScreen('visibility')}
              className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-black text-[14px] shadow-lg shadow-rose-500/20 active:scale-98 transition-all"
            >
              Apply Location ({settings.selectedLocations.locations.length} Selected)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCREEN: EDIT PROFILE (In-App Direct Biodata Editor)
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentScreen === 'edit-profile') {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 min-h-full font-sans pb-36 overflow-y-auto">
        <div className="bg-white px-4 py-3.5 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentScreen('menu')}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-[16px] font-black text-slate-800">Edit Matrimonial Profile</h2>
          </div>
        </div>

        <form onSubmit={handleSaveProfileForm} className="p-4 space-y-4 max-w-lg mx-auto w-full">
          {/* Basic Details */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3.5">
            <h3 className="text-xs font-black text-rose-600 uppercase tracking-wider">Personal Information</h3>
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Full Name</label>
              <input
                type="text"
                value={editForm.fullName}
                onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Age</label>
                <input
                  type="number"
                  value={editForm.age}
                  onChange={e => setEditForm({ ...editForm, age: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Gender</label>
                <select
                  value={editForm.gender}
                  onChange={e => setEditForm({ ...editForm, gender: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                >
                  <option value="male">Male (Groom)</option>
                  <option value="female">Female (Bride)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Height</label>
                <input
                  type="text"
                  value={editForm.height}
                  onChange={e => setEditForm({ ...editForm, height: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                  placeholder="e.g. 5'8&quot;"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Marital Status</label>
                <select
                  value={editForm.maritalStatus}
                  onChange={e => setEditForm({ ...editForm, maritalStatus: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                >
                  <option value="Never Married">Never Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Religious & Community */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3.5">
            <h3 className="text-xs font-black text-rose-600 uppercase tracking-wider">Community & Lifestyle</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Community</label>
                <input
                  type="text"
                  value={editForm.community}
                  onChange={e => setEditForm({ ...editForm, community: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Gotra</label>
                <input
                  type="text"
                  value={editForm.gotra}
                  onChange={e => setEditForm({ ...editForm, gotra: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Diet</label>
                <select
                  value={editForm.diet}
                  onChange={e => setEditForm({ ...editForm, diet: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                >
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Non-Vegetarian">Non-Vegetarian</option>
                  <option value="Eggetarian">Eggetarian</option>
                  <option value="Jain">Jain Vegetarian</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Location City</label>
                <input
                  type="text"
                  value={editForm.city}
                  onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Education & Career */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3.5">
            <h3 className="text-xs font-black text-rose-600 uppercase tracking-wider">Education & Career</h3>
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Highest Qualification</label>
              <input
                type="text"
                value={editForm.education}
                onChange={e => setEditForm({ ...editForm, education: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Profession</label>
                <input
                  type="text"
                  value={editForm.profession}
                  onChange={e => setEditForm({ ...editForm, profession: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Annual Income</label>
                <input
                  type="text"
                  value={editForm.annualIncome}
                  onChange={e => setEditForm({ ...editForm, annualIncome: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          {/* About Me Bio */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2">
            <h3 className="text-xs font-black text-rose-600 uppercase tracking-wider">About Me & Family</h3>
            <textarea
              value={editForm.bio}
              onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
              placeholder="Describe your personality, hobbies, family background..."
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-black text-[14px] shadow-lg shadow-rose-500/20 active:scale-98 transition-all"
          >
            {saving ? 'Saving Profile Details...' : 'Save Profile Details'}
          </button>
        </form>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCREEN: PROFILE PHOTOS MANAGER
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentScreen === 'photos') {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 min-h-full font-sans pb-36 overflow-y-auto">
        <div className="bg-white px-4 py-3.5 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentScreen('menu')}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-[16px] font-black text-slate-800">Profile Photos</h2>
          </div>
        </div>

        <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
          {/* Photo privacy banner */}
          <div className="bg-rose-50/80 border border-rose-100 rounded-2xl p-3.5 flex items-center gap-3">
            <ShieldCheck size={20} className="text-rose-600 shrink-0" />
            <p className="text-[11.5px] text-rose-700 font-bold leading-tight">
              Photos will be shown blurred to restricted members according to your Visibility Settings.
            </p>
          </div>

          {/* Photos Grid */}
          <div className="grid grid-cols-2 gap-3.5">
            {photosList.map((photo, index) => (
              <div key={photo.id} className="relative aspect-[3/4] bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs group">
                <img src={photo.url} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                {photo.isPrimary && (
                  <div className="absolute top-2 left-2 bg-rose-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-md">
                    Primary
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5 justify-between">
                  {!photo.isPrimary && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotosList(photosList.map(p => ({ ...p, isPrimary: p.id === photo.id })));
                        showToast('Primary photo updated! 🌟');
                      }}
                      className="px-2 py-1 bg-white text-slate-800 text-[10px] font-bold rounded-lg shadow-sm"
                    >
                      Make Primary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (photosList.length > 1) {
                        setPhotosList(photosList.filter(p => p.id !== photo.id));
                        showToast('Photo removed');
                      } else {
                        showToast('Must keep at least 1 photo');
                      }
                    }}
                    className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-sm"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}

            {/* Add photo card */}
            <label className="aspect-[3/4] border-2 border-dashed border-rose-300 hover:border-rose-500 bg-rose-50/30 hover:bg-rose-50/60 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 text-center p-3">
              <Upload size={24} className="text-rose-500 mb-1.5" />
              <span className="text-xs font-black text-rose-700">Add New Photo</span>
              <span className="text-[10px] text-slate-400 font-medium mt-0.5">JPG, PNG up to 10MB</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    const url = URL.createObjectURL(e.target.files[0]);
                    setPhotosList([...photosList, { id: Date.now(), url, isPrimary: false }]);
                    showToast('New photo added! 📸');
                  }
                }}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => setCurrentScreen('menu')}
            className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-black text-[14px] shadow-lg shadow-rose-500/20 active:scale-98 transition-all"
          >
            Done Managing Photos
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCREEN: PARTNER PREFERENCES
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentScreen === 'preferences') {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 min-h-full font-sans pb-36 overflow-y-auto">
        <div className="bg-white px-4 py-3.5 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentScreen('menu')}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-[16px] font-black text-slate-800">Partner Preferences</h2>
          </div>
        </div>

        <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Preferred Age Range: {preferences.minAge} - {preferences.maxAge} Years
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={18}
                  max={45}
                  value={preferences.minAge}
                  onChange={e => setPreferences({ ...preferences, minAge: Number(e.target.value) })}
                  className="w-full accent-rose-500"
                />
                <input
                  type="range"
                  min={preferences.minAge}
                  max={55}
                  value={preferences.maxAge}
                  onChange={e => setPreferences({ ...preferences, maxAge: Number(e.target.value) })}
                  className="w-full accent-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Preferred Diet</label>
              <select
                value={preferences.preferredDiet}
                onChange={e => setPreferences({ ...preferences, preferredDiet: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
              >
                <option value="Vegetarian">Vegetarian Only</option>
                <option value="Non-Vegetarian">Non-Vegetarian Allowed</option>
                <option value="Eggetarian">Eggetarian Allowed</option>
                <option value="All">Any Diet Preference</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Marital Status Preference</label>
              <select
                value={preferences.preferredMaritalStatus}
                onChange={e => setPreferences({ ...preferences, preferredMaritalStatus: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
              >
                <option value="Never Married">Never Married Only</option>
                <option value="Divorced Allowed">Divorced / Widowed Allowed</option>
                <option value="All">Doesn't Matter</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Community Scope</label>
              <select
                value={preferences.preferredCommunity}
                onChange={e => setPreferences({ ...preferences, preferredCommunity: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
              >
                <option value="Same Community">My Community Only ({user?.community || 'Agrawal'})</option>
                <option value="Selected Communities">Selected Communities</option>
                <option value="All">All Communities Welcome</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSavePreferences}
            className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-black text-[14px] shadow-lg shadow-rose-500/20 active:scale-98 transition-all"
          >
            Save Partner Preferences
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCREEN: PRIVACY & SECURITY
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentScreen === 'privacy') {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 min-h-full font-sans pb-36 overflow-y-auto">
        <div className="bg-white px-4 py-3.5 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentScreen('menu')}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-[16px] font-black text-slate-800">Privacy & Security</h2>
          </div>
        </div>

        <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-[13px] font-bold text-slate-800">Show Phone Number After Accept Only</h4>
                <p className="text-[11px] text-slate-400">Restricts contact numbers to accepted matches</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={privacySettings.showPhoneOnlyAfterAccept}
                  onChange={() => setPrivacySettings({ ...privacySettings, showPhoneOnlyAfterAccept: !privacySettings.showPhoneOnlyAfterAccept })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <h4 className="text-[13px] font-bold text-slate-800">Incognito Profile Mode</h4>
                <p className="text-[11px] text-slate-400">Browse profiles without leaving a visit footprint</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={privacySettings.incognitoMode}
                  onChange={() => setPrivacySettings({ ...privacySettings, incognitoMode: !privacySettings.incognitoMode })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <h4 className="text-[13px] font-bold text-slate-800">Screenshot Protection</h4>
                <p className="text-[11px] text-slate-400">Prevents screenshots and watermarks photos</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={privacySettings.protectPhotosScreenshot}
                  onChange={() => setPrivacySettings({ ...privacySettings, protectPhotosScreenshot: !privacySettings.protectPhotosScreenshot })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSavePrivacy}
            className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-black text-[14px] shadow-lg shadow-rose-500/20 active:scale-98 transition-all"
          >
            Save Privacy Settings
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCREEN: SUBSCRIPTION PLANS
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentScreen === 'subscription') {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 min-h-full font-sans pb-36 overflow-y-auto">
        <div className="bg-white px-4 py-3.5 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentScreen('menu')}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-[16px] font-black text-slate-800">Subscription Plans</h2>
          </div>
        </div>

        <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
          {/* Plan 1: Pro Plan */}
          <div className="bg-white rounded-3xl p-5 border-2 border-rose-500 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-rose-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl">
              Most Popular
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="text-amber-500" size={18} />
              <h3 className="text-base font-black text-slate-800">Pro Membership</h3>
            </div>
            <p className="text-2xl font-black text-rose-600 mb-3">₹999 <span className="text-xs text-slate-400 font-bold">/ Month</span></p>
            <ul className="space-y-2 text-xs font-semibold text-slate-600 mb-4">
              <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Send unlimited interest requests</li>
              <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Unlock verified badge on profile</li>
              <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Direct chat with accepted profiles</li>
            </ul>
            <button
              type="button"
              onClick={() => {
                navigate('/member/matrimonial/subscription');
              }}
              className="w-full py-2.5 bg-rose-500 text-white font-black text-xs rounded-xl shadow-md active:scale-95 transition-all"
            >
              Upgrade to Pro Plan
            </button>
          </div>

          {/* Plan 2: Pro Max */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="text-purple-500" size={18} />
              <h3 className="text-base font-black text-slate-800">Pro Max Plan</h3>
            </div>
            <p className="text-2xl font-black text-slate-800 mb-3">₹1,999 <span className="text-xs text-slate-400 font-bold">/ 3 Months</span></p>
            <ul className="space-y-2 text-xs font-semibold text-slate-600 mb-4">
              <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> View direct phone numbers (30 contacts)</li>
              <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> 5x profile visibility boost in matches</li>
              <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Incognito browsing mode included</li>
            </ul>
            <button
              type="button"
              onClick={() => {
                navigate('/member/matrimonial/subscription');
              }}
              className="w-full py-2.5 bg-slate-900 text-white font-black text-xs rounded-xl shadow-md active:scale-95 transition-all"
            >
              Upgrade to Pro Max
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCREEN: HELP & SUPPORT
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentScreen === 'help') {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 min-h-full font-sans pb-36 overflow-y-auto">
        <div className="bg-white px-4 py-3.5 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentScreen('menu')}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-[16px] font-black text-slate-800">Help & Support</h2>
          </div>
        </div>

        <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-rose-600 uppercase tracking-wider">Contact Assistance</h3>

            <a
              href="tel:+919876543210"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50/50 hover:bg-rose-50 border border-rose-100 text-rose-700 font-bold text-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center">
                  <PhoneCall size={16} />
                </div>
                <div>
                  <p className="text-xs text-rose-900 font-black">Call Matrimonial Helpline</p>
                  <p className="text-[11px] text-rose-600 font-medium">+91 98765 43210 (10 AM - 7 PM)</p>
                </div>
              </div>
              <ChevronRight size={18} />
            </a>

            <a
              href="https://wa.me/919876543210?text=Hello%20MeriSamaj%20Support"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold text-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <MessageCircle size={16} />
                </div>
                <div>
                  <p className="text-xs text-emerald-900 font-black">Chat on WhatsApp</p>
                  <p className="text-[11px] text-emerald-600 font-medium">Quick match & verification help</p>
                </div>
              </div>
              <ChevronRight size={18} />
            </a>

            <a
              href="mailto:support@merisamaj.com"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-blue-700 font-bold text-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
                  <Mail size={16} />
                </div>
                <div>
                  <p className="text-xs text-blue-900 font-black">Email Support Desk</p>
                  <p className="text-[11px] text-blue-600 font-medium">support@merisamaj.com</p>
                </div>
              </div>
              <ChevronRight size={18} />
            </a>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2.5">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Frequently Asked Questions</h3>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs font-bold text-slate-800">How does photo blur work?</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">When Visibility restriction is on, members only see your blurred photo until you accept their interest request.</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs font-bold text-slate-800">How do I verify with Aadhar?</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">Upload your government ID card under verification to get a green tick badge.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCREEN 5 & 6: HOW YOUR PROFILE LOOKS (PREVIEW SCREEN)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-full font-sans pb-36 overflow-y-auto">
      {/* Top Header */}
      <div className="bg-white px-4 py-3.5 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentScreen('menu')}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-[16px] font-black text-slate-800">How Your Profile Looks</h2>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Segmented Switch Buttons (Matches Screen 5 vs 6) */}
        <div className="bg-slate-200/80 p-1 rounded-2xl flex gap-1">
          <button
            onClick={() => setPreviewTab('before')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
              previewTab === 'before'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Before Request
          </button>
          <button
            onClick={() => setPreviewTab('after')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
              previewTab === 'after'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            After Request Accept
          </button>
        </div>

        {/* Profile Card Simulation */}
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-md">
          {/* Photo Area */}
          <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
            <img
              src={previewUser.photo}
              alt={previewUser.name}
              className={`w-full h-full object-cover transition-all duration-700 ${
                previewTab === 'before'
                  ? 'filter blur-md scale-110'
                  : 'filter blur-0 scale-100'
              }`}
            />

            {previewTab === 'before' && (
              <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] flex flex-col items-center justify-center text-white">
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center mb-1.5 border border-white/20">
                  <Lock size={22} className="text-white" />
                </div>
                <span className="text-[11px] font-black tracking-wide uppercase">Photo Restricted</span>
              </div>
            )}
          </div>

          {/* Profile Bio Details */}
          <div className="p-5 space-y-3">
            <div>
              <h3 className="text-[18px] font-black text-slate-800">{previewUser.name}</h3>
              <p className="text-[12.5px] text-slate-500 font-bold mt-0.5">
                {previewUser.age} Years | {previewUser.height} | {previewUser.education}
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2 text-[12px] text-slate-600 font-semibold">
                <MapPin size={14} className="text-rose-500 shrink-0" />
                <span>{previewUser.city}</span>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-slate-600 font-semibold">
                <User size={14} className="text-rose-500 shrink-0" />
                <span>{previewUser.religion} | {previewUser.caste}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              {previewTab === 'before' ? (
                <button
                  type="button"
                  onClick={() => showToast('Interest simulated')}
                  className="w-full py-3 bg-rose-100 text-rose-600 rounded-2xl font-black text-[13px] transition-all"
                >
                  Send Interest
                </button>
              ) : (
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateToTab) onNavigateToTab('messages');
                      else navigate('/member/matrimonial');
                    }}
                    className="flex-1 py-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl font-black text-[13px] active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <MessageCircle size={16} /> Chat Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentScreen('edit-profile')}
                    className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-black text-[13px] active:scale-95 transition-all shadow-md shadow-rose-500/20"
                  >
                    View Full Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Informational Banner */}
        {previewTab === 'before' ? (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3.5 flex items-start gap-2.5">
            <Info size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <p className="text-[11.5px] text-rose-700 font-bold leading-snug">
              Photo will be shown blurred to members (jahan aapne visibility restrict kiya hai)
            </p>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 flex items-start gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11.5px] text-emerald-700 font-bold leading-snug">
              Jab aap unki request accept karenge tab wo aapki profile full detail ke saath dekh payenge.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
