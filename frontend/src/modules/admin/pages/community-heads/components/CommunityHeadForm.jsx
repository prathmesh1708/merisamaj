import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CheckCircle, ChevronRight, ChevronLeft, Shield, Building2, User, Key, Upload,
  LayoutDashboard, Wallet, Vote, Send, Users, Calendar, Briefcase, Heart, HeartHandshake, Home, Mail, Share2, Award, LayoutTemplate
} from 'lucide-react';
import { axiosPrivate } from '../../../../../core/api/axiosPrivate';

const defaultPermissions = {
  canViewDashboard: true,
  canViewReports: true,
  canViewMembers: true, canAddMembers: true, canEditMembers: true, canRemoveMembers: false, canExportMembers: true,
  canViewProfiles: true, canApproveProfiles: true, canEditProfiles: true,
  canViewEvents: true, canCreateEvents: true, canEditEvents: true, canDeleteEvents: false, canManageBookings: true,
  canViewDharmashala: true, canManageDharmashala: true,
  canViewInvitations: true, canCreateInvitations: true, canManageInvitations: true,
  canViewDonations: true, canCreateDonationCampaigns: true, canManageExpenses: true,
  canViewFunds: true, canManageFunds: true,
  canViewSocial: true, canManageSocial: true, canSendNotifications: true,
  canViewDirectory: true, canManageDirectory: true,
  canViewLeadership: true, canManageLeadership: true,
  canViewObituary: true, canManageObituary: true,
  canViewElections: true, canManageElections: true,
  canViewHomeContent: true, canManageHomeContent: true
};

const HEAD_MODULES = [
  {
    id: 'dashboard',
    title: 'President Dashboard',
    description: 'Overview dashboard, analytics & samaj activity reports',
    icon: LayoutDashboard,
    keys: ['canViewDashboard', 'canViewReports']
  },
  {
    id: 'members',
    title: 'Members Management',
    description: 'Member directory, verifications, profiles, add/edit & export',
    icon: Users,
    keys: ['canViewMembers', 'canAddMembers', 'canEditMembers', 'canRemoveMembers', 'canExportMembers']
  },
  {
    id: 'matrimonial',
    title: 'Matrimonial Management',
    description: 'Matrimonial profiles, interest request approvals & editing',
    icon: Heart,
    keys: ['canViewProfiles', 'canApproveProfiles', 'canEditProfiles']
  },
  {
    id: 'events',
    title: 'Event Management',
    description: 'Community events, activity logs & ticket bookings',
    icon: Calendar,
    keys: ['canViewEvents', 'canCreateEvents', 'canEditEvents', 'canDeleteEvents', 'canManageBookings']
  },
  {
    id: 'dharmashala',
    title: 'Dharmashala Management',
    description: 'Dharmashalas, room inventory & guest bookings',
    icon: Home,
    keys: ['canViewDharmashala', 'canManageDharmashala']
  },
  {
    id: 'invitations',
    title: 'Digital Invitations',
    description: 'Event digital invitation cards & broadcast tools',
    icon: Mail,
    keys: ['canViewInvitations', 'canCreateInvitations', 'canManageInvitations']
  },
  {
    id: 'donations',
    title: 'Donation Campaigns',
    description: 'Fundraising campaigns, donor tracking & expense management',
    icon: HeartHandshake,
    keys: ['canViewDonations', 'canCreateDonationCampaigns', 'canManageExpenses']
  },
  {
    id: 'funds',
    title: 'Fund Governance',
    description: 'Community treasury funds, ledger transactions & expenses',
    icon: Wallet,
    keys: ['canViewFunds', 'canManageFunds']
  },
  {
    id: 'social',
    title: 'Social & Group Hub',
    description: 'Community feed, post moderation, groups & notifications',
    icon: Share2,
    keys: ['canViewSocial', 'canManageSocial', 'canSendNotifications']
  },
  {
    id: 'professionals',
    title: 'Professional Directory',
    description: 'Business directory listings & category management',
    icon: Briefcase,
    keys: ['canViewDirectory', 'canManageDirectory']
  },
  {
    id: 'leadership',
    title: 'Leadership & Team',
    description: 'Executive committee, sub-heads & leadership team',
    icon: Shield,
    keys: ['canViewLeadership', 'canManageLeadership']
  },
  {
    id: 'obituary',
    title: 'Obituaries (Shradhanjali)',
    description: 'Shradhanjali posts, condolences & remembrance notices',
    icon: Award,
    keys: ['canViewObituary', 'canManageObituary']
  },
  {
    id: 'elections',
    title: 'Election Commission',
    description: 'Community voting polls, elections & result verification',
    icon: Vote,
    keys: ['canViewElections', 'canManageElections']
  },
  {
    id: 'homeContent',
    title: 'Home Banners & Content',
    description: 'Homepage banners, CMS announcements & app content',
    icon: LayoutTemplate,
    keys: ['canViewHomeContent', 'canManageHomeContent']
  }
];

export const CommunityHeadForm = ({ isOpen, onClose, onSubmit, initialData, existingGroups = [] }) => {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', loginId: '', password: '', assignedCommunityIds: [], avatar: '', group: 'Group 1'
  });
  const [avatarFile, setAvatarFile] = useState(null);

  const [permissions, setPermissions] = useState(defaultPermissions);
  const [availableCommunities, setAvailableCommunities] = useState([]);
  const [isFetchingCommunities, setIsFetchingCommunities] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError(null);
      setAvatarFile(null);
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          email: initialData.email || '',
          phone: initialData.phone || '',
          loginId: initialData.loginId || '',
          password: '', // Leave blank unless they want to change it
          assignedCommunityIds: initialData.assignedCommunityIds?.map(c => c._id || c.id || c) || [],
          avatar: initialData.avatar || '',
          group: initialData.group || 'Group 1'
        });
        setPermissions({ ...defaultPermissions, ...initialData.headPermissions });
      } else {
        setFormData({ name: '', email: '', phone: '', loginId: '', password: '', assignedCommunityIds: [], avatar: '', group: 'Group 1' });
        setPermissions(defaultPermissions);
      }
      
      const fetchCommunities = async () => {
        setIsFetchingCommunities(true);
        try {
          const res = await axiosPrivate.get('/admin/communities');
          setAvailableCommunities(res.data.data || []);
        } catch (error) {
          console.error("Failed to fetch communities", error);
          setAvailableCommunities([]);
        } finally {
          setIsFetchingCommunities(false);
        }
      };
      fetchCommunities();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    setError(null);
    setStep(prev => Math.min(totalSteps, prev + 1));
  };
  const handleBack = () => {
    setError(null);
    setStep(prev => Math.max(1, prev - 1));
  };
  
  // ── Handle avatar file selection ──
  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    const { avatar, ...restFormData } = formData;
    let dataToSubmit;

    if (avatarFile) {
      // A new photo was attached — send as multipart/form-data so the file reaches
      // the backend; array/object fields must travel as JSON strings in this mode.
      dataToSubmit = new FormData();
      Object.entries(restFormData).forEach(([key, value]) => {
        if (key === 'password' && initialData && !value) return;
        if (key === 'assignedCommunityIds') {
          dataToSubmit.append(key, JSON.stringify(value || []));
        } else {
          dataToSubmit.append(key, value ?? '');
        }
      });
      dataToSubmit.append('headPermissions', JSON.stringify(permissions));
      dataToSubmit.append('avatarFile', avatarFile);
    } else {
      dataToSubmit = {
        ...restFormData,
        headPermissions: permissions
      };
      if (initialData && !dataToSubmit.password) {
        delete dataToSubmit.password;
      }
    }

    const result = await onSubmit(dataToSubmit);
    if (result && !result.success) {
      setError(result.error || 'Failed to save Community Head');
    }
    setLoading(false);
  };

  const steps = [
    { title: 'Profile', icon: User },
    { title: 'Communities', icon: Building2 },
    { title: 'Permissions', icon: Shield },
    { title: 'Review', icon: CheckCircle }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-white border border-gray-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
            <div>
              <h2 className="text-xl font-black text-gray-900">
                <Shield className="w-6 h-6 text-brand-primary inline mr-2" />
                {initialData ? 'Edit Community Head' : 'Create Community Head'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">Setup a new administrator account and assign module access.</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Stepper */}
          <div className="px-8 pt-6 pb-2 border-b border-gray-50 bg-gray-50/50">
            <div className="flex items-center justify-between relative max-w-2xl mx-auto">
              <div className="absolute left-0 top-5 w-full h-[2px] bg-gray-200 -z-0">
                <div 
                  className="h-full bg-brand-primary transition-all duration-300 ease-out"
                  style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
                />
              </div>
              
              {steps.map((s, i) => {
                const isCompleted = step > i + 1;
                const isCurrent = step === i + 1;
                const Icon = s.icon;
                return (
                  <div key={i} className="relative z-10 flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isCompleted ? 'bg-brand-primary text-white' : isCurrent ? 'bg-white border-2 border-brand-primary text-brand-primary shadow-md' : 'bg-white border-2 border-gray-200 text-gray-400'}`}>
                      {isCompleted ? <CheckCircle size={18} /> : <Icon size={18} />}
                    </div>
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${isCurrent ? 'text-brand-primary' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                      {s.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Body */}
          <div className="p-8 flex-1 overflow-y-auto bg-gray-50/30">
            {step === 1 && (
              <div className="max-w-xl mx-auto space-y-6">
                {/* Head Information Section */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
                  <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4">Head Information</h3>

                  {/* Profile Photo */}
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                      {formData.avatar ? (
                        <img src={formData.avatar} className="w-full h-full object-cover" alt="Profile preview" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <User size={26} />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-primary/10 text-brand-primary text-xs font-bold rounded-xl cursor-pointer hover:bg-brand-primary/20 transition-colors">
                        <Upload size={13} />
                        {formData.avatar ? 'Change Photo' : 'Upload Photo'}
                        <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleAvatarSelect} />
                      </label>
                      {formData.avatar && (
                        <button
                          type="button"
                          onClick={() => { setFormData(prev => ({ ...prev, avatar: '' })); setAvatarFile(null); }}
                          className="ml-2 text-xs font-bold text-gray-400 hover:text-rose-500 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                      <p className="text-xs text-gray-400 mt-1.5">Optional — JPG, PNG or WEBP, up to 5MB.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                      <label className="text-xs font-bold text-gray-600 uppercase">Full Name *</label>
                      <input 
                        type="text" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                        placeholder="e.g. Rahul Sharma"
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                      <label className="text-xs font-bold text-gray-600 uppercase">Phone Number *</label>
                      <input 
                        type="tel" 
                        maxLength="10"
                        value={formData.phone}
                        onChange={e => {
                          const numericValue = e.target.value.replace(/\D/g, '');
                          setFormData({...formData, phone: numericValue});
                        }}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                        placeholder="9876543210"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase">Leadership Group</label>
                    <input
                      type="text"
                      list="community-head-group-suggestions"
                      value={formData.group}
                      onChange={e => setFormData({ ...formData, group: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                      placeholder="e.g. Group 1"
                    />
                    <datalist id="community-head-group-suggestions">
                      {existingGroups.map(g => <option key={g} value={g} />)}
                      <option value="Group 1" />
                      <option value="Group 2" />
                    </datalist>
                    <p className="text-xs text-gray-400 mt-1">Which section this Community Head appears under on the member leadership directory. Reuse an existing group, or type a new one to start another section.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase">Email Address (Optional)</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                      placeholder="head@community.com"
                    />
                    <p className="text-xs text-gray-400 mt-1">Official contact email for notifications.</p>
                  </div>
                </div>

                {/* Head Panel Login Credentials Section */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
                  <h3 className="text-sm font-bold text-brand-primary border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
                    <Key size={16} /> Head Panel Login Credentials
                  </h3>
                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 uppercase">Login ID *</label>
                      <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-primary/20 focus-within:border-brand-primary transition-all overflow-hidden">
                        <div className="pl-3.5 pr-1 flex items-center justify-center text-gray-400 shrink-0">
                          <User size={18} />
                        </div>
                        <input 
                          type="text" 
                          value={formData.loginId}
                          onChange={e => setFormData({...formData, loginId: e.target.value})}
                          className="w-full px-3 py-2.5 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm font-medium text-gray-900"
                          placeholder="e.g. rahul_head"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Unique ID used to log in to the Head Panel.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 uppercase">Login Password {initialData ? '(Leave blank to keep current)' : '*'}</label>
                      <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-primary/20 focus-within:border-brand-primary transition-all overflow-hidden">
                        <div className="pl-3.5 pr-1 flex items-center justify-center text-gray-400 shrink-0">
                          <Key size={18} />
                        </div>
                        <input
                          type="text"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          className="w-full px-3 py-2.5 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm font-medium text-gray-900"
                          placeholder={initialData ? "Leave blank to keep current" : "Set password for login"}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Select Communities</h3>
                  {availableCommunities.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = availableCommunities.every(c => formData.assignedCommunityIds.includes(c._id));
                        if (allSelected) {
                          setFormData(f => ({ ...f, assignedCommunityIds: [] }));
                        } else {
                          setFormData(f => ({ ...f, assignedCommunityIds: availableCommunities.map(c => c._id) }));
                        }
                      }}
                      className="text-xs font-bold text-brand-primary hover:underline cursor-pointer"
                    >
                      {availableCommunities.every(c => formData.assignedCommunityIds.includes(c._id)) ? 'Deselect All' : 'Select All Communities'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {isFetchingCommunities ? (
                    <div className="col-span-1 sm:col-span-2 text-center py-10 bg-white rounded-2xl border border-gray-100 text-gray-500 font-medium">
                      Loading communities...
                    </div>
                  ) : availableCommunities.length === 0 ? (
                    <div className="col-span-1 sm:col-span-2 text-center py-10 bg-white rounded-2xl border border-gray-100 text-gray-500 font-medium">
                      No communities found. Please create a community first.
                    </div>
                  ) : (
                    availableCommunities.map(c => (
                      <label key={c._id} className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.assignedCommunityIds.includes(c._id) ? 'border-brand-primary bg-brand-primary/5' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                        <div className="mt-0.5">
                          <input 
                            type="checkbox"
                            className="w-5 h-5 rounded text-brand-primary focus:ring-brand-primary/50"
                            checked={formData.assignedCommunityIds.includes(c._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(f => ({ ...f, assignedCommunityIds: [...f.assignedCommunityIds, c._id] }));
                              } else {
                                setFormData(f => ({ ...f, assignedCommunityIds: f.assignedCommunityIds.filter(id => id !== c._id) }));
                              }
                            }}
                          />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{c.city || 'No City'} • {c.membersCount || 0} Members</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Select All Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-5 rounded-2xl border border-gray-100 shadow-sm gap-3">
                  <div>
                    <h4 className="text-base font-bold text-gray-900">Head Module Access Controls</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Toggle modules ACTIVE to grant full module access, or DISABLED to restrict.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const allActive = HEAD_MODULES.every(mod => mod.keys.some(k => permissions[k]));
                      const updated = { ...permissions };
                      HEAD_MODULES.forEach(mod => {
                        mod.keys.forEach(k => { updated[k] = !allActive; });
                      });
                      setPermissions(updated);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      HEAD_MODULES.every(mod => mod.keys.some(k => permissions[k]))
                        ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                        : 'bg-brand-primary/10 text-brand-primary border-brand-primary/20 hover:bg-brand-primary/20'
                    }`}
                  >
                    <CheckCircle size={14} />
                    {HEAD_MODULES.every(mod => mod.keys.some(k => permissions[k])) ? 'Disable All Modules' : 'Enable All Modules'}
                  </button>
                </div>

                {/* Module Toggles List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {HEAD_MODULES.map(mod => {
                    const ModuleIcon = mod.icon;
                    const isActive = mod.keys.some(k => permissions[k]);
                    return (
                      <div
                        key={mod.id}
                        onClick={() => {
                          const updated = { ...permissions };
                          mod.keys.forEach(k => { updated[k] = !isActive; });
                          setPermissions(updated);
                        }}
                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                          isActive 
                            ? 'bg-white border-brand-primary shadow-md shadow-brand-primary/5' 
                            : 'bg-white border-gray-100 opacity-70 hover:opacity-100 hover:border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-brand-primary/10 text-brand-primary' : 'bg-gray-100 text-gray-400'}`}>
                            <ModuleIcon size={24} />
                          </div>
                          <div>
                            <h5 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                              {mod.title}
                              {isActive ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                  ACTIVE
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">
                                  DISABLED
                                </span>
                              )}
                            </h5>
                            <p className="text-xs text-gray-500 mt-1 leading-snug">{mod.description}</p>
                          </div>
                        </div>

                        <div className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 ml-3 ${isActive ? 'bg-brand-primary' : 'bg-gray-200'}`}>
                          <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="max-w-2xl mx-auto bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-brand-primary/10 text-brand-primary rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                    {formData.avatar ? (
                      <img src={formData.avatar} className="w-full h-full object-cover" alt={formData.name || 'Profile'} />
                    ) : (
                      <User size={32} />
                    )}
                  </div>
                  <h3 className="text-2xl font-black text-gray-900">{formData.name || 'Unknown Name'}</h3>
                  <p className="text-gray-500 mt-1">{formData.email || 'No email provided'} • {formData.phone || 'No phone provided'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-8 border-t border-gray-100 pt-8">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Assigned Communities</h4>
                    {formData.assignedCommunityIds.length > 0 ? (
                      <ul className="space-y-2">
                        {formData.assignedCommunityIds.map(id => {
                          const c = availableCommunities.find(c => c._id === id);
                          return <li key={id} className="text-sm font-semibold text-gray-700 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-primary" /><span key={id}>{c ? c.name : id}</span></li>;
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No communities assigned</p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Active Modules</h4>
                    <div className="flex flex-wrap gap-2">
                      {HEAD_MODULES.filter(m => m.keys.some(k => permissions[k])).map(m => (
                        <span key={m.id} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
                          ✓ {m.title}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="px-6 py-3 bg-rose-50 border-t border-rose-100 text-rose-600 text-sm font-semibold flex items-center justify-center">
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="p-6 border-t border-gray-100 bg-white flex items-center justify-between">
            <button 
              onClick={handleBack}
              disabled={step === 1}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Back
            </button>
            {step < totalSteps ? (
              <button 
                onClick={handleNext}
                disabled={step === 1 && (!formData.name || !formData.phone || !formData.loginId || (!initialData && !formData.password))}
                className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-bold shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all"
              >
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-bold shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all"
              >
                {loading ? (initialData ? 'Saving...' : 'Creating...') : (initialData ? 'Save Changes' : 'Create Administrator')} <CheckCircle size={16} />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
