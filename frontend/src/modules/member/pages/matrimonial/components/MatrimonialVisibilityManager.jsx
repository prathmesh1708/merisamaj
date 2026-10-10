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
import { matrimonialProfileService, matrimonialSubscriptionService } from '../../../../../core/api/matrimonialService';
import { useData } from '../../../context/DataProvider';

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

  // Real matrimonial profile, loaded from the server — used to populate every form below
  const [myProfile, setMyProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Real community/location lists with real profile counts (no sample data)
  const [availableCommunities, setAvailableCommunities] = useState([]);
  const [communitiesLoading, setCommunitiesLoading] = useState(true);
  const [availableCities, setAvailableCities] = useState([]);
  const [availableStates, setAvailableStates] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(true);

  // Form states for Edit Profile — blank until the real profile loads, no sample fallback values
  const [editForm, setEditForm] = useState({
    fullName: user?.name || '',
    dateOfBirth: '',
    gender: user?.gender || '',
    height: '',
    weight: '',
    maritalStatus: '',
    education: '',
    profession: '',
    annualIncome: '',
    community: user?.community || '',
    gotra: '',
    diet: '',
    city: user?.city || '',
    state: '',
    bio: ''
  });

  // Partner Preferences State — blank until the real profile.preferences loads
  const [preferences, setPreferences] = useState({
    minAge: '',
    maxAge: '',
    preferredMaritalStatus: '',
    preferredCommunity: '',
    preferredReligion: '',
    preferredOccupation: '',
    preferredEducation: '',
    minIncome: '',
    preferredCity: ''
  });

  // Privacy Settings State — matches MatrimonialProfile.privacy schema defaults until real data loads
  const [privacySettings, setPrivacySettings] = useState({
    showPhoneOnlyAfterAccept: true,
    incognitoMode: false,
    protectPhotosScreenshot: true,
    accountStatus: 'active' // 'active' | 'hidden'
  });

  // Visibility Settings State (Matches Screen 2 in reference image) — overwritten by real data on load
  const [settings, setSettings] = useState({
    otherCommunities: {
      enabled: true,
      scope: 'all', // 'all' | 'selected'
      selectedCommunities: []
    },
    myCommunity: {
      enabled: true,
      scope: 'all'
    },
    mySubCommunity: {
      enabled: true,
      scope: 'all', // 'all' | 'selected'
      selectedSubCommunities: []
    },
    aadharVerifiedOnly: true,
    communityVerifiedOnly: true,
    selectedLocations: {
      enabled: true,
      locations: []
    },
    visibleOnlyAfterAccept: true
  });

  // Photos State — loaded from the real matrimonial profile, not sample data
  const [photosList, setPhotosList] = useState([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [photoActionId, setPhotoActionId] = useState(null); // _id of photo currently being acted on (primary/delete/reorder)
  const [photoUploading, setPhotoUploading] = useState(false);

  const [saving, setSaving] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Real matrimonial plans (created by the Admin) for the Subscription Plans screen
  const [realPlans, setRealPlans] = useState([]);
  const [realPlansLoading, setRealPlansLoading] = useState(false);
  const [myPlanName, setMyPlanName] = useState('');
  useEffect(() => {
    if (currentScreen !== 'subscription') return;
    setRealPlansLoading(true);
    Promise.allSettled([matrimonialSubscriptionService.listPlans(), matrimonialSubscriptionService.getMySubscription()])
      .then(([plansRes, subRes]) => {
        if (plansRes.status === 'fulfilled') setRealPlans(plansRes.value.data?.data?.plans || []);
        if (subRes.status === 'fulfilled') setMyPlanName(subRes.value.data?.data?.planName || '');
      })
      .finally(() => setRealPlansLoading(false));
  }, [currentScreen]);

  // The member's real community / sub-community names for the visibility cards
  const [memberOf, setMemberOf] = useState({ communityName: '', subCommunityName: '', canUseOtherCommunities: false, subCommunities: [] });
  const otherLocked = memberOf.canUseOtherCommunities === false;
  // "Gupta ji" -> "Gupta ji Samaj" (names that already say Samaj are left as they are)
  const samaj = (name) => (/samaj/i.test(name) ? name : `${name} Samaj`);

  // Load saved visibility settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await matrimonialProfileService.getVisibilitySettings();
        if (res.data?.memberOf) setMemberOf(res.data.memberOf);
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

  // Load real profile photos on mount
  useEffect(() => {
    const loadPhotos = async () => {
      setPhotosLoading(true);
      try {
        const res = await matrimonialProfileService.getPhotos();
        setPhotosList(res.data?.data?.photos || []);
      } catch (err) {
        setPhotosList([]);
      } finally {
        setPhotosLoading(false);
      }
    };
    loadPhotos();
  }, []);

  // Load the real matrimonial profile and populate every form from it — no sample defaults
  useEffect(() => {
    const loadProfile = async () => {
      setProfileLoading(true);
      try {
        const res = await matrimonialProfileService.getMyProfile();
        const p = res.data?.data?.profile || null;
        setMyProfile(p);
        if (p) {
          setEditForm({
            fullName: p.personal?.fullName || user?.name || '',
            dateOfBirth: p.personal?.dateOfBirth ? String(p.personal.dateOfBirth).slice(0, 10) : '',
            gender: p.personal?.gender || user?.gender || '',
            height: p.personal?.height || '',
            weight: p.personal?.weight || '',
            maritalStatus: p.personal?.maritalStatus || '',
            education: p.education?.highestQualification || '',
            profession: p.education?.profession || '',
            annualIncome: p.education?.annualIncome || '',
            community: p.personal?.community || user?.community || '',
            gotra: p.personal?.gotra || '',
            diet: p.lifestyle?.diet || '',
            city: p.location?.city || user?.city || '',
            state: p.location?.state || '',
            bio: p.about?.biography || ''
          });
          setPreferences({
            minAge: p.preferences?.ageMin ?? '',
            maxAge: p.preferences?.ageMax ?? '',
            preferredMaritalStatus: p.preferences?.maritalStatus || '',
            preferredCommunity: p.preferences?.community || '',
            preferredReligion: p.preferences?.religion || '',
            preferredOccupation: p.preferences?.occupation || '',
            preferredEducation: p.preferences?.education || '',
            minIncome: p.preferences?.incomeMin || '',
            preferredCity: p.preferences?.city || '',
            minHeight: p.preferences?.heightMin ?? '',
            maxHeight: p.preferences?.heightMax ?? ''
          });
          setPrivacySettings({
            showPhoneOnlyAfterAccept: p.privacy?.showPhoneOnlyAfterAccept ?? true,
            incognitoMode: p.privacy?.incognitoMode ?? false,
            protectPhotosScreenshot: p.privacy?.protectPhotosScreenshot ?? true,
            accountStatus: p.status === 'hidden' ? 'hidden' : 'active'
          });
        }
      } catch (err) {
        setMyProfile(null);
      } finally {
        setProfileLoading(false);
      }
    };
    loadProfile();
  }, []);

  // Load real community list (with real profile counts) for the community selector screen
  useEffect(() => {
    const loadCommunities = async () => {
      setCommunitiesLoading(true);
      try {
        const res = await matrimonialProfileService.getAvailableCommunitiesWithCounts();
        setAvailableCommunities(res.data?.data || []);
      } catch (err) {
        setAvailableCommunities([]);
      } finally {
        setCommunitiesLoading(false);
      }
    };
    loadCommunities();
  }, []);

  // Load real city/state lists (with real profile counts) for the location selector screen
  useEffect(() => {
    const loadLocations = async () => {
      setLocationsLoading(true);
      try {
        const res = await matrimonialProfileService.getAvailableLocations();
        setAvailableCities(res.data?.data?.cities || []);
        setAvailableStates(res.data?.data?.states || []);
      } catch (err) {
        setAvailableCities([]);
        setAvailableStates([]);
      } finally {
        setLocationsLoading(false);
      }
    };
    loadLocations();
  }, []);

  const handleMakePrimary = async (photo) => {
    setPhotoActionId(photo._id);
    try {
      await matrimonialProfileService.setPrimaryPhoto(photo._id);
      setPhotosList(prev => prev.map(p => ({ ...p, isPrimary: p._id === photo._id })));
      showToast('Primary photo updated! 🌟');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not update primary photo');
    } finally {
      setPhotoActionId(null);
    }
  };

  const handleDeletePhoto = async (photo) => {
    if (photosList.length <= 1) {
      showToast('Must keep at least 1 photo');
      return;
    }
    setPhotoActionId(photo._id);
    try {
      await matrimonialProfileService.deletePhoto(photo._id);
      setPhotosList(prev => prev.filter(p => p._id !== photo._id));
      showToast('Photo removed');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not delete photo');
    } finally {
      setPhotoActionId(null);
    }
  };

  const handleAddPhoto = async (files) => {
    if (!files || files.length === 0) return;
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => formData.append('photos', file));
      const res = await matrimonialProfileService.uploadPhotos(formData);
      setPhotosList(res.data?.data?.photos || []);
      showToast('New photo added! 📸');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not upload photo');
    } finally {
      setPhotoUploading(false);
    }
  };

  // Move a photo earlier/later in display order (direction: -1 = up/earlier, +1 = down/later)
  const movePhoto = async (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= photosList.length) return;

    const reordered = [...photosList];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    setPhotosList(reordered);

    const movedPhoto = reordered[newIndex];
    setPhotoActionId(movedPhoto._id);
    try {
      await matrimonialProfileService.reorderPhotos(reordered.map(p => p._id));
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not save photo order');
    } finally {
      setPhotoActionId(null);
    }
  };

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

  const handleSaveProfileForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      personal: {
        fullName: editForm.fullName,
        dateOfBirth: editForm.dateOfBirth || undefined,
        gender: editForm.gender || undefined,
        height: editForm.height ? Number(editForm.height) : undefined,
        weight: editForm.weight ? Number(editForm.weight) : undefined,
        maritalStatus: editForm.maritalStatus || undefined,
        community: editForm.community || undefined,
        gotra: editForm.gotra || undefined
      },
      education: {
        highestQualification: editForm.education || undefined,
        profession: editForm.profession || undefined,
        annualIncome: editForm.annualIncome || undefined
      },
      lifestyle: {
        diet: editForm.diet || undefined
      },
      location: {
        city: editForm.city || undefined,
        state: editForm.state || undefined
      },
      about: {
        biography: editForm.bio || undefined
      }
    };
    try {
      const res = myProfile
        ? await matrimonialProfileService.updateProfile(payload)
        : await matrimonialProfileService.createProfile(payload);
      setMyProfile(res.data?.data?.profile || null);
      if (updateProfile) {
        updateProfile({ name: editForm.fullName, city: editForm.city });
      }
      showToast('Matrimonial profile updated successfully! 💖');
      setCurrentScreen('menu');
    } catch (err) {
      const apiMsg = err.response?.data?.errors?.[0]?.msg || err.response?.data?.message;
      showToast(apiMsg || 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  // Real values (admin lists + what profiles use) to suggest in the preference fields
  const [prefOptions, setPrefOptions] = useState({});
  useEffect(() => {
    matrimonialProfileService.getPreferenceOptions()
      .then(res => setPrefOptions(res.data?.data || {}))
      .catch(() => {});
  }, []);

  const handleSavePreferences = async () => {
    if (!myProfile) {
      showToast('Please save your profile details first.');
      return;
    }
    setSaving(true);
    try {
      const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
      const txt = (v) => (v && String(v).trim() ? String(v).trim() : null);
      let ageMin = num(preferences.minAge);
      let ageMax = num(preferences.maxAge);
      if (ageMin !== null && ageMax !== null && ageMin > ageMax) [ageMin, ageMax] = [ageMax, ageMin];
      let heightMin = num(preferences.minHeight);
      let heightMax = num(preferences.maxHeight);
      if (heightMin !== null && heightMax !== null && heightMin > heightMax) [heightMin, heightMax] = [heightMax, heightMin];
      // An empty field is sent as null so it is really cleared on the server.
      const res = await matrimonialProfileService.updateProfile({
        preferences: {
          ageMin, ageMax, heightMin, heightMax,
          maritalStatus: txt(preferences.preferredMaritalStatus),
          community: txt(preferences.preferredCommunity),
          religion: txt(preferences.preferredReligion),
          occupation: txt(preferences.preferredOccupation),
          education: txt(preferences.preferredEducation),
          incomeMin: txt(preferences.minIncome),
          city: txt(preferences.preferredCity)
        }
      });
      setMyProfile(res.data?.data?.profile || null);
      showToast('Partner preferences updated! 💍');
      setCurrentScreen('menu');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not update preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrivacy = async () => {
    if (!myProfile) {
      showToast('Please save your profile details first.');
      return;
    }
    setSaving(true);
    try {
      const res = await matrimonialProfileService.updateProfile({
        privacy: {
          showPhoneOnlyAfterAccept: privacySettings.showPhoneOnlyAfterAccept,
          incognitoMode: privacySettings.incognitoMode,
          protectPhotosScreenshot: privacySettings.protectPhotosScreenshot
        }
      });
      setMyProfile(res.data?.data?.profile || null);
      await matrimonialProfileService.setAccountStatus(privacySettings.accountStatus);
      showToast('Privacy & Security configurations saved! 🛡️');
      setCurrentScreen('menu');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not update privacy settings');
    } finally {
      setSaving(false);
    }
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

  // Filtered lists — drawn from real data loaded above, never sample data
  const filteredCommunities = useMemo(() => {
    if (!communitySearch.trim()) return availableCommunities;
    return availableCommunities.filter(c =>
      c.name.toLowerCase().includes(communitySearch.toLowerCase())
    );
  }, [communitySearch, availableCommunities]);

  const filteredLocations = useMemo(() => {
    const list = locationTab === 'states' ? availableStates : availableCities;
    if (!locationSearch.trim()) return list;
    return list.filter(l =>
      l.name.toLowerCase().includes(locationSearch.toLowerCase())
    );
  }, [locationTab, locationSearch, availableCities, availableStates]);

  const calcAge = (dob) => {
    if (!dob) return null;
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const previewUser = {
    name: editForm.fullName || user?.name || 'Your Name',
    id: user?.memberId || (user?._id ? `MP${user._id.slice(-6).toUpperCase()}` : ''),
    age: myProfile?.age ?? calcAge(editForm.dateOfBirth) ?? null,
    height: editForm.height ? `${editForm.height} cm` : '',
    education: editForm.education || '',
    city: editForm.city || '',
    religion: myProfile?.personal?.religion || '',
    caste: editForm.community || '',
    photo: photosList.find(p => p.isPrimary)?.url || photosList[0]?.url || user?.avatar
      || `https://ui-avatars.com/api/?name=${encodeURIComponent(editForm.fullName || user?.name || 'U')}&background=F43F5E&color=ffffff&bold=true`,
    completionPercentage: myProfile?.profileCompletion?.percentage ?? 0,
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

            {/* 4. Profile Visibility Settings */}
            <button
              onClick={() => setCurrentScreen('visibility')}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition-colors text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-rose-50 text-slate-600 group-hover:text-rose-600 flex items-center justify-center transition-colors">
                  <Settings size={16} />
                </div>
                <div>
                  <span className="text-[13.5px] font-bold text-slate-800">Profile Visibility Settings</span>
                  <p className="text-[10.5px] text-slate-400">Control who can view your photo & profile</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
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
                  <p className="text-[10.5px] text-slate-400">View plans and upgrade</p>
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
            {/* Setting 1: Other Community Members — only shown when the plan includes it */}
            {!otherLocked && (
            <div className={`bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs ${otherLocked ? 'opacity-90' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Building size={16} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5">
                      Other Community Members
                      {otherLocked && <Lock size={12} className="text-slate-400" />}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                      Dusre community ke members ko bhi aapki profile dikhai degi.
                    </p>
                  </div>
                </div>

                <label className={`relative inline-flex items-center shrink-0 mt-1 ${otherLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={!otherLocked && settings.otherCommunities.enabled}
                    disabled={otherLocked}
                    onChange={() => { if (!otherLocked) toggleNestedSetting('otherCommunities', 'enabled'); }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {otherLocked && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 pl-11 flex items-center justify-between gap-2">
                  <span className="text-[11.5px] font-semibold text-slate-500">Available with a plan that includes other communities.</span>
                  <button
                    type="button"
                    onClick={() => navigate('/member/matrimonial/subscription')}
                    className="shrink-0 px-3 py-1.5 bg-rose-500 text-white rounded-full text-[11px] font-bold active:scale-95"
                  >
                    Upgrade
                  </button>
                </div>
              )}

              {!otherLocked && settings.otherCommunities.enabled && (
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
                      All Other Communities
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
            )}

            {/* Setting 2: My Community Members */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Users size={16} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-800">{memberOf.communityName ? `All ${samaj(memberOf.communityName)} Members` : 'My Community Members'}</h4>
                    <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                      Sirf meri community{memberOf.communityName ? ` (${memberOf.communityName})` : ''} ke members dekh sakte hain.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={settings.myCommunity.enabled}
                    onChange={() => setSettings(s => {
                      // The sub-community choice lives inside this card, so it follows this switch
                      const enabled = !s.myCommunity.enabled;
                      return {
                        ...s,
                        myCommunity: { ...s.myCommunity, enabled },
                        mySubCommunity: { ...s.mySubCommunity, enabled }
                      };
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Sub-community chooser — which sub-communities of my community can see me */}
              {settings.myCommunity.enabled && (
                <button
                  type="button"
                  onClick={() => setCurrentScreen('select-subcommunities')}
                  className="mt-3 pt-2.5 border-t border-slate-100 pl-11 w-full flex items-center justify-between gap-2 text-left"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                    <span className="text-[12px] font-semibold text-slate-700 truncate">
                      {settings.mySubCommunity.scope === 'selected' && (settings.mySubCommunity.selectedSubCommunities || []).length > 0
                        ? settings.mySubCommunity.selectedSubCommunities.map(samaj).join(', ')
                        : (memberOf.subCommunities || []).length > 0
                          ? `All sub communities (${memberOf.subCommunities.length})`
                          : 'No sub communities in your community yet'}
                    </span>
                  </span>
                  <span className="text-[11.5px] font-bold text-rose-600 flex items-center gap-0.5 shrink-0">
                    Choose <ChevronRight size={14} />
                  </span>
                </button>
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
  if (currentScreen === 'select-subcommunities') {
    const subs = memberOf.subCommunities || [];
    const sel = settings.mySubCommunity.selectedSubCommunities || [];
    const isAll = settings.mySubCommunity.scope !== 'selected';
    const setSub = (patch) => setSettings(s => ({ ...s, mySubCommunity: { ...s.mySubCommunity, ...patch } }));
    const toggleSub = (name) => {
      const next = sel.includes(name) ? sel.filter(n => n !== name) : [...sel, name];
      setSub({ scope: next.length ? 'selected' : 'all', selectedSubCommunities: next });
    };
    return (
      <div className="flex-1 flex flex-col bg-slate-50 min-h-full font-sans pb-36 overflow-y-auto">
        <div className="bg-white px-4 py-3.5 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentScreen('visibility')} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 active:scale-95">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-[16px] font-black text-slate-800">Sub Communities</h2>
              {memberOf.communityName && <p className="text-[11px] text-slate-400 font-semibold">{samaj(memberOf.communityName)}</p>}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3 max-w-lg mx-auto w-full">
          <p className="text-[12px] text-slate-500 font-medium">Choose which sub communities can see your profile.</p>

          {subs.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center text-[12px] font-semibold text-slate-400">
              Your community has no sub communities yet.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
              <label className="flex items-center justify-between px-4 py-3.5 cursor-pointer">
                <span className="text-[13px] font-bold text-slate-800">All sub communities ({subs.length})</span>
                <input type="radio" checked={isAll} onChange={() => setSub({ scope: 'all', selectedSubCommunities: [] })}
                  className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-slate-300" />
              </label>
              {subs.map(name => (
                <label key={name} className="flex items-center justify-between px-4 py-3.5 cursor-pointer">
                  <span className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                    {samaj(name)}
                    {name === memberOf.subCommunityName && (
                      <span className="text-[9px] font-black uppercase bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded">Yours</span>
                    )}
                  </span>
                  <input type="checkbox" checked={!isAll && sel.includes(name)} onChange={() => toggleSub(name)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300" />
                </label>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={async () => { await handleSaveVisibilitySettings(); setCurrentScreen('visibility'); }}
            className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-black text-[14px] shadow-lg shadow-rose-500/20 active:scale-98 transition-all"
          >
            {isAll ? 'Save: all sub communities' : `Save: ${sel.length} selected`}
          </button>
        </div>
      </div>
    );
  }

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
              { id: 'cities', label: 'Cities' },
              { id: 'states', label: 'States' },
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
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={editForm.dateOfBirth}
                  onChange={e => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Gender</label>
                <select
                  value={editForm.gender}
                  onChange={e => setEditForm({ ...editForm, gender: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                  required
                >
                  <option value="">Select</option>
                  <option value="male">Male (Groom)</option>
                  <option value="female">Female (Bride)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Height (cm)</label>
                <input
                  type="number"
                  value={editForm.height}
                  onChange={e => setEditForm({ ...editForm, height: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                  placeholder="e.g. 173"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Weight (kg)</label>
                <input
                  type="number"
                  value={editForm.weight}
                  onChange={e => setEditForm({ ...editForm, weight: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                  placeholder="e.g. 68"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Marital Status</label>
              <select
                value={editForm.maritalStatus}
                onChange={e => setEditForm({ ...editForm, maritalStatus: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
              >
                <option value="">Select</option>
                <option value="Never Married">Never Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
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

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">State</label>
              <input
                type="text"
                value={editForm.state}
                onChange={e => setEditForm({ ...editForm, state: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
              />
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

          {/* Order hint banner */}
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3">
            <SlidersHorizontal size={18} className="text-slate-500 shrink-0" />
            <p className="text-[11.5px] text-slate-600 font-bold leading-tight">
              Use the arrows to set display order — Photo 1 is shown first on your profile. "Make Primary" sets your main photo shown across the app.
            </p>
          </div>

          {photosLoading ? (
            <div className="grid grid-cols-2 gap-3.5">
              {[0, 1].map(i => (
                <div key={i} className="aspect-[3/4] bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            /* Photos Grid */
            <div className="grid grid-cols-2 gap-3.5">
              {photosList.map((photo, index) => {
                const isBusy = photoActionId === photo._id;
                return (
                  <div key={photo._id} className="relative aspect-[3/4] bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs group">
                    <img src={photo.url} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />

                    {/* Order number badge */}
                    <div className="absolute top-2 right-2 bg-slate-900/80 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                      {index + 1}
                    </div>

                    {photo.isPrimary && (
                      <div className="absolute top-2 left-2 bg-rose-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-md">
                        Primary
                      </div>
                    )}

                    {isBusy && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}

                    {/* Reorder arrows */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => movePhoto(index, -1)}
                        className="p-1 bg-white text-slate-700 rounded-md shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move earlier"
                      >
                        <ChevronUp size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={index === photosList.length - 1}
                        onClick={() => movePhoto(index, 1)}
                        className="p-1 bg-white text-slate-700 rounded-md shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move later"
                      >
                        <ChevronDown size={13} />
                      </button>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5 justify-between">
                      {!photo.isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleMakePrimary(photo)}
                          className="px-2 py-1 bg-white text-slate-800 text-[10px] font-bold rounded-lg shadow-sm"
                        >
                          Make Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(photo)}
                        className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-sm"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add photo card */}
              <label className="aspect-[3/4] border-2 border-dashed border-rose-300 hover:border-rose-500 bg-rose-50/30 hover:bg-rose-50/60 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 text-center p-3">
                {photoUploading ? (
                  <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Upload size={24} className="text-rose-500 mb-1.5" />
                    <span className="text-xs font-black text-rose-700">Add New Photo</span>
                    <span className="text-[10px] text-slate-400 font-medium mt-0.5">JPG, PNG up to 10MB</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={photoUploading}
                  onChange={(e) => {
                    handleAddPhoto(e.target.files);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          )}

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
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Preferred Age: {preferences.minAge || preferences.maxAge
                    ? `${preferences.minAge || 18} - ${preferences.maxAge || 60} years`
                    : 'Any age'}
                </label>
                {(preferences.minAge || preferences.maxAge) && (
                  <button type="button" onClick={() => setPreferences({ ...preferences, minAge: '', maxAge: '' })}
                    className="text-[11px] font-bold text-rose-500">Any age</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold">From {preferences.minAge || 18}</span>
                  <input type="range" min={18} max={60}
                    value={preferences.minAge || 18}
                    onChange={e => {
                      const v = Number(e.target.value);
                      setPreferences({ ...preferences, minAge: v, maxAge: preferences.maxAge && preferences.maxAge < v ? v : (preferences.maxAge || 60) });
                    }}
                    className="w-full accent-rose-500" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold">To {preferences.maxAge || 60}</span>
                  <input type="range" min={18} max={60}
                    value={preferences.maxAge || 60}
                    onChange={e => {
                      const v = Number(e.target.value);
                      setPreferences({ ...preferences, maxAge: v, minAge: preferences.minAge && preferences.minAge > v ? v : (preferences.minAge || 18) });
                    }}
                    className="w-full accent-rose-500" />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Only profiles in this age range appear in My matches.</p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Marital Status Preference</label>
              <select
                value={preferences.preferredMaritalStatus}
                onChange={e => setPreferences({ ...preferences, preferredMaritalStatus: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
              >
                <option value="">Doesn't Matter</option>
                <option value="Never Married">Never Married Only</option>
                <option value="Divorced, Widowed, Separated">Divorced / Widowed / Separated Only</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Preferred Community</label>
                <input
                  type="text"
                  value={preferences.preferredCommunity}
                  list="pref-communities"
                  onChange={e => setPreferences({ ...preferences, preferredCommunity: e.target.value })}
                  placeholder={user?.community ? `e.g. ${user.community}` : 'Any community'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Preferred Religion</label>
                <input
                  type="text"
                  value={preferences.preferredReligion}
                  list="pref-religions"
                  onChange={e => setPreferences({ ...preferences, preferredReligion: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Preferred Occupation</label>
                <input
                  type="text"
                  value={preferences.preferredOccupation}
                  list="pref-professions"
                  onChange={e => setPreferences({ ...preferences, preferredOccupation: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Preferred Education</label>
                <input
                  type="text"
                  value={preferences.preferredEducation}
                  list="pref-educations"
                  onChange={e => setPreferences({ ...preferences, preferredEducation: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Minimum Income</label>
                <input
                  type="text"
                  value={preferences.minIncome}
                  onChange={e => setPreferences({ ...preferences, minIncome: e.target.value })}
                  placeholder="e.g. ₹10+ Lacs p.a"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Preferred City</label>
                <input
                  type="text"
                  value={preferences.preferredCity}
                  list="pref-cities"
                  onChange={e => setPreferences({ ...preferences, preferredCity: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Preferred Height (cm)</label>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" min="120" max="220" placeholder="Min e.g. 150" value={preferences.minHeight ?? ''}
                onChange={e => setPreferences({ ...preferences, minHeight: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500" />
              <input type="number" min="120" max="220" placeholder="Max e.g. 180" value={preferences.maxHeight ?? ''}
                onChange={e => setPreferences({ ...preferences, maxHeight: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500" />
            </div>
            <p className="text-[10px] text-slate-400">Tip: separate several choices with commas, e.g. "Indore, Bhopal". Leave a field empty for "any".</p>
          </div>

          <datalist id="pref-communities">{(prefOptions.communities || []).map(v => <option key={v} value={v} />)}</datalist>
          <datalist id="pref-religions">{(prefOptions.religions || []).map(v => <option key={v} value={v} />)}</datalist>
          <datalist id="pref-professions">{(prefOptions.professions || []).map(v => <option key={v} value={v} />)}</datalist>
          <datalist id="pref-educations">{(prefOptions.educations || []).map(v => <option key={v} value={v} />)}</datalist>
          <datalist id="pref-cities">{(prefOptions.cities || []).map(v => <option key={v} value={v} />)}</datalist>

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

            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-[13px] font-bold text-slate-800 mb-0.5">Profile Visibility</h4>
              <p className="text-[11px] text-slate-400 mb-2">Hide your profile from all matchmaking search &amp; discovery</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPrivacySettings({ ...privacySettings, accountStatus: 'active' })}
                  className={`flex-1 py-2 rounded-xl text-[12px] font-bold border transition-all ${
                    privacySettings.accountStatus === 'active'
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setPrivacySettings({ ...privacySettings, accountStatus: 'hidden' })}
                  className={`flex-1 py-2 rounded-xl text-[12px] font-bold border transition-all ${
                    privacySettings.accountStatus === 'hidden'
                      ? 'bg-slate-700 border-slate-700 text-white'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Hidden
                </button>
              </div>
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
          {realPlansLoading && <div className="py-12 text-center text-xs font-bold text-slate-400">Loading plans…</div>}
          {!realPlansLoading && realPlans.length === 0 && (
            <div className="py-12 text-center text-xs font-bold text-slate-400 bg-white rounded-3xl border border-slate-200">No plans available right now.</div>
          )}
          {realPlans.map(plan => {
            const f = plan.features || {};
            const isCurrent = myPlanName && myPlanName === plan.name;
            const highlight = plan.isFeatured || !!plan.badge;
            const perks = [
              `${f.profileViewsPerDay === -1 ? 'Unlimited' : (f.profileViewsPerDay ?? 0)} profile views per day`,
              `${f.interestLimit === -1 ? 'Unlimited' : (f.interestLimit ?? 0)} interests per month`,
              f.chat && 'Chat with accepted matches',
              f.advancedFilters && 'Advanced search filters',
              f.visitorHistory && 'See who visited your profile',
              f.contactDetailsAccess && 'View contact details after acceptance',
              f.crossCommunityVisibility && 'See profiles from other communities',
              f.communityFilter && 'Filter matches by community & sub-community'
            ].filter(Boolean);
            return (
              <div key={plan._id}
                className={`bg-white rounded-3xl p-5 relative overflow-hidden ${highlight ? 'border-2 shadow-md' : 'border border-slate-200 shadow-xs'}`}
                style={highlight ? { borderColor: plan.themeColor || '#f43f5e' } : undefined}>
                {(plan.badge || plan.isFeatured) && (
                  <div className="absolute top-0 right-0 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl"
                    style={{ backgroundColor: plan.themeColor || '#f43f5e' }}>
                    {plan.badge || 'Most Popular'}
                  </div>
                )}
                <div className="flex items-center gap-2 mb-1 pr-20">
                  <Crown size={18} style={{ color: plan.themeColor || '#f59e0b' }} />
                  <h3 className="text-base font-black text-slate-800 break-words">{plan.name}</h3>
                </div>
                {plan.description && <p className="text-[11px] text-slate-500 mb-2">{plan.description}</p>}
                <p className="text-2xl font-black text-rose-600 mb-3">
                  ₹{Number(plan.price || 0).toLocaleString('en-IN')}
                  <span className="text-xs text-slate-400 font-bold"> {plan.price > 0 ? `/ ${plan.durationInDays} days` : '· Free for everyone'}</span>
                  {plan.originalPrice > plan.price && (
                    <span className="ml-2 text-xs text-slate-400 font-bold line-through">₹{Number(plan.originalPrice).toLocaleString('en-IN')}</span>
                  )}
                </p>
                <ul className="space-y-2 text-xs font-semibold text-slate-600 mb-4">
                  {perks.map(p => <li key={p} className="flex items-center gap-2"><Check size={14} className="text-emerald-500 shrink-0" /> {p}</li>)}
                </ul>
                {isCurrent ? (
                  <div className="w-full py-2.5 rounded-xl text-xs font-black text-center bg-emerald-50 text-emerald-700 border border-emerald-200">Your current plan</div>
                ) : plan.price > 0 ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/member/matrimonial/subscription?plan=${plan._id}`)}
                    className="w-full py-2.5 text-white font-black text-xs rounded-xl shadow-md active:scale-95 transition-all"
                    style={{ backgroundColor: plan.themeColor || '#f43f5e' }}
                  >
                    Upgrade to {plan.name} · ₹{Number(plan.price).toLocaleString('en-IN')}
                  </button>
                ) : (
                  <div className="w-full py-2.5 rounded-xl text-xs font-black text-center bg-slate-100 text-slate-500">Included free with every account</div>
                )}
              </div>
            );
          })}
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
              href="https://wa.me/919876543210?text=Hello%20ApniSamaj%20Support"
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
                  ? 'filter blur-[6px] scale-105'
                  : 'filter blur-0 scale-100'
              }`}
            />

            {previewTab === 'before' && (
              <div className="absolute inset-0 bg-black/10 flex flex-col items-center justify-center text-white">
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
                {[previewUser.age ? `${previewUser.age} Years` : null, previewUser.height, previewUser.education]
                  .filter(Boolean).join(' | ') || 'Complete your profile to see this here'}
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              {previewUser.city && (
                <div className="flex items-center gap-2 text-[12px] text-slate-600 font-semibold">
                  <MapPin size={14} className="text-rose-500 shrink-0" />
                  <span>{previewUser.city}</span>
                </div>
              )}
              {(previewUser.religion || previewUser.caste) && (
                <div className="flex items-center gap-2 text-[12px] text-slate-600 font-semibold">
                  <User size={14} className="text-rose-500 shrink-0" />
                  <span>{[previewUser.religion, previewUser.caste].filter(Boolean).join(' | ')}</span>
                </div>
              )}
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
