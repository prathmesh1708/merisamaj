import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Sparkles, ShieldCheck, ChevronRight, User, Users, Briefcase, 
  Package, Globe, Lock, Bell, Shield, Info, LogOut, Gift, Check, X, Moon, Sun, Send
} from 'lucide-react';
import { useData } from '../../context/DataProvider';
import { Avatar } from '../../components/common/Avatar';

export const SettingsPage = () => {
  const navigate = useNavigate();

  const { 
    currentUser, 
    logoutUser, 
    updateProfile,
    profilePrivacy,
    followRelations,
    blockedUsers,
    members,
    updateProfilePrivacy,
    updateGranularPrivacy,
    granularPrivacy,
    unblockUser,
    language,
    setLanguage,
    followedAnnouncements,
    toggleFollowedAnnouncement
  } = useData();

  // Social Links Modal State
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [facebook, setFacebook] = useState(currentUser?.facebook || 'https://facebook.com/user');
  const [twitter, setTwitter] = useState(currentUser?.twitter || 'https://twitter.com/user');
  const [linkedin, setLinkedin] = useState(currentUser?.linkedin || 'https://linkedin.com/in/user');

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
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const myId = currentUser?.id || currentUser?._id || 'u1';
  const userGranular = granularPrivacy?.[myId] || granularPrivacy?.u1 || granularPrivacy || {};
  const [myPrivacySetting, setMyPrivacySetting] = useState(profilePrivacy?.[myId] || profilePrivacy?.u1 || 'public');
  const [myPhoneSetting, setMyPhoneSetting] = useState(userGranular.phone || 'followers');
  const [myEmailSetting, setMyEmailSetting] = useState(userGranular.email || 'followers');
  const [myFamilySetting, setMyFamilySetting] = useState(userGranular.familyTree || 'followers');

  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);

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

  useEffect(() => {
    if (showSocialModal || showPrivacyModal || showBlockedModal || showNotificationsModal || showLanguageModal || showThemeModal || showHelpModal || showAboutModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showSocialModal, showPrivacyModal, showBlockedModal, showNotificationsModal, showLanguageModal, showThemeModal, showHelpModal, showAboutModal]);

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

  const handleSupportSubmit = (e) => {
    e.preventDefault();
    if (supportMessage.trim()) {
      setSupportSubmitted(true);
      setTimeout(() => {
        setSupportSubmitted(false);
        setSupportMessage('');
        setShowHelpModal(false);
      }, 2000);
    }
  };

  // Blocked Members derivation
  const blockedMembersIds = blockedUsers?.filter(b => b.blockerId === myId).map(b => b.blockedId) || [];
  const blockedMembersList = members?.filter(m => blockedMembersIds.includes(m.id)) || [];

  
  return (
    <div className="min-h-screen bg-slate-50/70 pb-20 font-sans select-none">
      {/* Header Bar — Glass morphism */}
      <div className="bg-white/85 backdrop-blur-xl border-b border-purple-100/30 flex items-center justify-between px-4 h-14 sticky top-0 z-30 shadow-[0_2px_12px_rgba(124,58,237,0.03)]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/member/profile')} className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-purple-50 transition-colors press-scale">
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <h1 className="text-[17px] font-extrabold text-slate-800 tracking-tight leading-tight">Settings</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-5 text-left">
        
        {/* Premium Upgrade Promotion Banner — Original Compact Style */}
        <div>
          {!currentUser?.isPremium ? (
            <div 
              onClick={() => navigate('/member/profile/upgrade')}
              className="p-4 rounded-[22px] bg-gradient-to-r from-rose-500 via-pink-500 to-[#e62e52] text-white shadow-[0_6px_20px_rgba(244,63,94,0.2)] flex items-center justify-between cursor-pointer press-scale border border-rose-400/30 group"
            >
              <div className="space-y-1 text-left">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={15} className="text-amber-300 fill-amber-300 animate-pulse" />
                  <h3 className="text-[11.5px] font-extrabold uppercase tracking-wider text-white">Upgrade Membership</h3>
                </div>
                <p className="text-[10.5px] text-white/90 font-medium leading-normal">
                  Access direct contacts, send 50+ super interests & get a Gold Badge!
                </p>
              </div>
              <ChevronRight size={18} className="text-white/80 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </div>
          ) : (
            <div 
              onClick={() => navigate('/member/profile/upgrade')}
              className="p-4 rounded-[22px] bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-white shadow-[0_6px_20px_rgba(245,158,11,0.2)] flex items-center justify-between cursor-pointer press-scale border border-yellow-300/30 group"
            >
              <div className="space-y-1 text-left">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-white fill-white/20" />
                  <h3 className="text-[11.5px] font-extrabold uppercase tracking-wider text-white">{currentUser.membershipPlan || 'Pro Max'} Active</h3>
                </div>
                <p className="text-[10.5px] text-white/90 font-medium leading-normal">
                  Valid plan until: {currentUser.membershipExpiry || 'Till Marriage'} · Enjoy premium matchmaking!
                </p>
              </div>
              <ChevronRight size={18} className="text-white/80 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </div>
          )}
        </div>


        {/* Profile Menu Actions List */}
        <div className="space-y-4">
          
          {/* Group 1: Account Info */}
          <div className="bg-white rounded-[26px] overflow-hidden border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] divide-y divide-slate-100">
            <div className="px-4.5 py-3 bg-purple-50/50 border-b border-purple-100/40">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-900/70">Account Information</span>
            </div>
            
            {/* Action 1: Personal Info */}
            <button 
              onClick={() => navigate('/member/profile/edit')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-purple-50/30 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <User size={18} />
                </div>
                <div>
                  <span className="text-[13px] font-extrabold text-slate-800 group-hover:text-purple-700 transition-colors block">Personal Info</span>
                  <span className="text-[10.5px] font-semibold text-slate-400 mt-0.5 block leading-none">Add and update your information</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-purple-600 transition-colors" />
            </button>

            {/* Action 1.5: Family Details */}
            <button 
              onClick={() => navigate('/member/profile/family')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-purple-50/30 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <Users size={18} />
                </div>
                <div>
                  <span className="text-[13px] font-extrabold text-slate-800 group-hover:text-purple-700 transition-colors block">Family Details</span>
                  <span className="text-[10.5px] font-semibold text-slate-400 mt-0.5 block leading-none">Manage family tree & details</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-purple-600 transition-colors" />
            </button>

            {/* Action 2: Professional Info */}
            <button 
              onClick={() => navigate('/member/professional/apply')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-purple-50/30 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <Briefcase size={18} />
                </div>
                <div>
                  <span className="text-[13px] font-extrabold text-slate-800 group-hover:text-purple-700 transition-colors block">Professional Info</span>
                  <span className="text-[10.5px] font-semibold text-slate-400 mt-0.5 block leading-none">Add business and services</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-purple-600 transition-colors" />
            </button>

            {/* Action 3: Services / Products */}
            <button 
              onClick={() => navigate('/member/professional')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-purple-50/30 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <Package size={18} />
                </div>
                <div>
                  <span className="text-[13px] font-extrabold text-slate-800 group-hover:text-purple-700 transition-colors block">Services / Products</span>
                  <span className="text-[10.5px] font-semibold text-slate-400 mt-0.5 block leading-none">Your products and business services</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-purple-600 transition-colors" />
            </button>

            {/* Action 4: Social Media Links */}
            <button 
              onClick={() => setShowSocialModal(true)}
              className="w-full flex items-center justify-between p-3.5 hover:bg-purple-50/30 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <Globe size={18} />
                </div>
                <div>
                  <span className="text-[13px] font-extrabold text-slate-800 group-hover:text-purple-700 transition-colors block">Social Media Links</span>
                  <span className="text-[10.5px] font-semibold text-slate-400 mt-0.5 block leading-none">Add social media profile links</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-purple-600 transition-colors" />
            </button>
          </div>

          {/* Group 2: Connections & Privacy */}
          <div className="bg-white rounded-[26px] overflow-hidden border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] divide-y divide-slate-100">
            <div className="px-4.5 py-3 bg-purple-50/50 border-b border-purple-100/40">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-900/70">Security & Sharing</span>
            </div>
            
            {/* Action: Refer & Earn */}
            <button 
              onClick={() => navigate('/member/referral')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-purple-50/30 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <Gift size={18} />
                </div>
                <div>
                  <span className="text-[13px] font-extrabold text-slate-800 group-hover:text-purple-700 transition-colors block">Refer & Earn</span>
                  <span className="text-[10.5px] font-semibold text-slate-400 mt-0.5 block leading-none">Invite friends and get rewards</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-purple-600 transition-colors" />
            </button>

            {/* Action 5: Privacy Settings */}
            <button 
              onClick={() => setShowPrivacyModal(true)}
              className="w-full flex items-center justify-between p-3.5 hover:bg-purple-50/30 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <Lock size={18} />
                </div>
                <div>
                  <span className="text-[13px] font-extrabold text-slate-800 group-hover:text-purple-700 transition-colors block">Privacy Settings</span>
                  <span className="text-[10.5px] font-semibold text-slate-400 mt-0.5 block leading-none">Manage profile privacy</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-purple-600 transition-colors" />
            </button>

            {/* Action: Blocked Users */}
            <button 
              onClick={() => setShowBlockedModal(true)}
              className="w-full flex items-center justify-between p-3.5 hover:bg-purple-50/30 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                  <span className="text-sm">🚫</span>
                </div>
                <div>
                  <span className="text-[13px] font-extrabold text-slate-800 group-hover:text-purple-700 transition-colors block">Blocked Users</span>
                  <span className="text-[10.5px] font-semibold text-slate-400 mt-0.5 block leading-none">List of blocked members</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-purple-600 transition-colors" />
            </button>

            {/* Action: Notifications */}
            <button 
              onClick={() => setShowNotificationsModal(true)}
              className="w-full flex items-center justify-between p-3.5 hover:bg-purple-50/30 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <Bell size={18} />
                </div>
                <div>
                  <span className="text-[13px] font-extrabold text-slate-800 group-hover:text-purple-700 transition-colors block">Notifications</span>
                  <span className="text-[10.5px] font-semibold text-slate-400 mt-0.5 block leading-none">Manage announcement alerts</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-purple-600 transition-colors" />
            </button>

          </div>

          {/* Group 2.5: Support & About */}
          <div className="bg-white rounded-[26px] overflow-hidden border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] divide-y divide-slate-100">
            <div className="px-4.5 py-3 bg-purple-50/50 border-b border-purple-100/40">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-900/70">Support & Info</span>
            </div>

            {/* Action: Help & Support */}
            <button 
              onClick={() => setShowHelpModal(true)}
              className="w-full flex items-center justify-between p-3.5 hover:bg-purple-50/30 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <Shield size={18} />
                </div>
                <div>
                  <span className="text-[13px] font-extrabold text-slate-800 group-hover:text-purple-700 transition-colors block">Help & Support</span>
                  <span className="text-[10.5px] font-semibold text-slate-400 mt-0.5 block leading-none">Contact community admin</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-purple-600 transition-colors" />
            </button>

            {/* Action: About */}
            <button 
              onClick={() => setShowAboutModal(true)}
              className="w-full flex items-center justify-between p-3.5 hover:bg-purple-50/30 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <Info size={18} />
                </div>
                <div>
                  <span className="text-[13px] font-extrabold text-slate-800 group-hover:text-purple-700 transition-colors block">About ApniSamaj</span>
                  <span className="text-[10.5px] font-semibold text-slate-400 mt-0.5 block leading-none">Version info & details</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-purple-600 transition-colors" />
            </button>
          </div>

          {/* Group 3: Logout Action */}
          <div className="pt-2">
            <button 
              onClick={logoutUser}
              className="w-full bg-rose-50/80 hover:bg-rose-100/80 border border-rose-200/60 p-3.5 flex items-center justify-center gap-2 rounded-[22px] press-scale cursor-pointer transition-all text-rose-700 font-extrabold text-[13px] shadow-2xs"
            >
              <LogOut size={16} className="text-rose-600" strokeWidth={2.5} />
              <span className="uppercase tracking-wider">Log out</span>
            </button>
          </div>

        </div>
      </div>


      {/* ─── MODALS ─── */}

      {/* 1. Social Links Modal */}
      {showSocialModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 animate-scale-in shadow-xl border border-purple-100/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Globe size={20} className="text-brand-primary" /> Social Media Links
              </h3>
              <button onClick={() => setShowSocialModal(false)} className="p-1 rounded-full bg-slate-100 text-slate-500">
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Facebook Profile</label>
                <input 
                  type="text" 
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-brand-primary"
                  placeholder="https://facebook.com/yourprofile"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Twitter / X Profile</label>
                <input 
                  type="text" 
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-brand-primary"
                  placeholder="https://twitter.com/yourprofile"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">LinkedIn Profile</label>
                <input 
                  type="text" 
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-brand-primary"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>

              <button 
                onClick={handleSaveSocials}
                className="w-full py-3 bg-brand-primary text-white rounded-xl text-[14px] font-bold hover:bg-brand-dark transition-colors mt-2 shadow-md shadow-brand-primary/10"
              >
                Save Links
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Privacy Settings Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 animate-slide-up shadow-xl border border-purple-100/30">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Lock size={20} className="text-brand-primary" /> Privacy Settings
              </h3>
              <button onClick={() => setShowPrivacyModal(false)} className="p-1 rounded-full bg-slate-100 text-slate-500">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {['public', 'private'].map((type) => (
                    <button 
                      key={type}
                      onClick={() => setMyPrivacySetting(type)}
                      className={`py-3 rounded-xl text-[13px] font-bold border transition-all ${myPrivacySetting === type ? 'bg-purple-50 border-brand-primary text-brand-primary' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                    >
                      {type === 'public' ? '🔓 Public' : '🔒 Private'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number Visibility</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowPhoneDropdown(!showPhoneDropdown);
                    setShowEmailDropdown(false);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold text-slate-700 outline-none focus:border-brand-primary transition-all text-left flex items-center justify-between"
                >
                  <span>{myPhoneSetting === 'everyone' ? 'Everyone' : myPhoneSetting === 'followers' ? 'Followers Only' : 'Only Me'}</span>
                  <ChevronRight size={16} className={`text-slate-400 shrink-0 transition-transform ${showPhoneDropdown ? 'rotate-90' : ''}`} />
                </button>
                {showPhoneDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPhoneDropdown(false)} />
                    <div className="absolute top-[70px] left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                      {[
                        { value: 'everyone', label: 'Everyone' },
                        { value: 'followers', label: 'Followers Only' },
                        { value: 'none', label: 'Only Me' }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setMyPhoneSetting(opt.value);
                            setShowPhoneDropdown(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-purple-50 text-[13px] font-bold text-slate-700 flex items-center justify-between border-b border-slate-50 last:border-0"
                        >
                          <span className={myPhoneSetting === opt.value ? 'text-brand-primary' : ''}>{opt.label}</span>
                          {myPhoneSetting === opt.value && <Check size={14} className="text-brand-primary" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Visibility</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailDropdown(!showEmailDropdown);
                    setShowPhoneDropdown(false);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold text-slate-700 outline-none focus:border-brand-primary transition-all text-left flex items-center justify-between"
                >
                  <span>{myEmailSetting === 'everyone' ? 'Everyone' : myEmailSetting === 'followers' ? 'Followers Only' : 'Only Me'}</span>
                  <ChevronRight size={16} className={`text-slate-400 shrink-0 transition-transform ${showEmailDropdown ? 'rotate-90' : ''}`} />
                </button>
                {showEmailDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowEmailDropdown(false)} />
                    <div className="absolute top-[70px] left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                      {[
                        { value: 'everyone', label: 'Everyone' },
                        { value: 'followers', label: 'Followers Only' },
                        { value: 'none', label: 'Only Me' }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setMyEmailSetting(opt.value);
                            setShowEmailDropdown(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-purple-50 text-[13px] font-bold text-slate-700 flex items-center justify-between border-b border-slate-50 last:border-0"
                        >
                          <span className={myEmailSetting === opt.value ? 'text-brand-primary' : ''}>{opt.label}</span>
                          {myEmailSetting === opt.value && <Check size={14} className="text-brand-primary" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button 
                onClick={handleSavePrivacy}
                className="w-full py-3 bg-brand-primary text-white rounded-xl text-[14px] font-bold hover:bg-brand-dark transition-colors mt-6 shadow-md shadow-brand-primary/10"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Blocked Users Modal */}
      {showBlockedModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 animate-slide-up shadow-xl border border-purple-100/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <span>🚫</span> Blocked Users
              </h3>
              <button onClick={() => setShowBlockedModal(false)} className="p-1 rounded-full bg-slate-100 text-slate-500">
                <X size={18} />
              </button>
            </div>

            {blockedMembersList.length === 0 ? (
              <div className="py-8 text-center text-slate-400 font-medium text-xs">
                No blocked users found.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {blockedMembersList.map(blockedUser => (
                  <div key={blockedUser.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={blockedUser.initials} size="sm" color="bg-purple-50 text-brand-primary" />
                      <div>
                        <h4 className="text-[13px] font-bold text-slate-800 leading-none">{blockedUser.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-1">{blockedUser.city}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => unblockUser(blockedUser.id)}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold hover:bg-slate-300 transition-colors"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Notifications Preferences Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 animate-slide-up shadow-xl border border-purple-100/30">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Bell size={20} className="text-brand-primary" /> Notifications
              </h3>
              <button onClick={() => setShowNotificationsModal(false)} className="p-1 rounded-full bg-slate-100 text-slate-500">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5">
              {[
                { key: 'announcements', label: 'Community Announcements' },
                { key: 'matrimonial', label: 'Matrimonial Alerts' },
                { key: 'events', label: 'Event Registrations & RSVP' },
                { key: 'groups', label: 'Group Chat Messages' }
              ].map((opt) => {
                const isActive = followedAnnouncements?.[opt.key] !== false;
                return (
                  <div key={opt.key} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[13.5px] font-bold text-slate-700">{opt.label}</span>
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
        </div>
      )}

      {/* 5. Help & Support Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 animate-slide-up shadow-xl border border-purple-100/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Shield size={20} className="text-brand-primary" /> Contact Support
              </h3>
              <button onClick={() => setShowHelpModal(false)} className="p-1 rounded-full bg-slate-100 text-slate-500">
                <X size={18} />
              </button>
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
              <form onSubmit={handleSupportSubmit} className="space-y-4">
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
                  <Send size={15} />
                  Submit Request
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 6. About ApniSamaj Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 animate-slide-up shadow-xl border border-purple-100/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Info size={20} className="text-brand-primary" /> About ApniSamaj
              </h3>
              <button onClick={() => setShowAboutModal(false)} className="p-1 rounded-full bg-slate-100 text-slate-500">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-slate-600 text-[13px] leading-relaxed">
              <div className="text-center py-4 bg-purple-50/50 rounded-2xl border border-purple-100/30 mb-2">
                <div className="text-2xl font-black text-brand-primary">ApniSamaj</div>
                <div className="text-[11px] font-bold text-slate-400 mt-0.5">COMMUNITY CONNECT & SERVICES</div>
              </div>

              <p>
                ApniSamaj is a unified platform created to connect family members, manage community bookings, publish announcements, and facilitate matrimonial matchmaking in a highly secure and private digital ecosystem.
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
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
