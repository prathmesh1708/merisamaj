import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin, Plus, Edit, Trash2, Loader, CheckCircle2,
  XCircle, Mail, Phone, RefreshCw, Eye, EyeOff, Copy, Check, Shield,
  User, UserCheck, Search, X, Building, ChevronDown, Award, Users, Key, AlertCircle, Upload
} from 'lucide-react';
import { useData } from '../../../member/context/DataProvider';
import { useHeadAuth } from '../../auth/useHeadAuth';
import { axiosPrivate } from '../../../../core/api/axiosPrivate';

// ─────────────────────────────────────────────
// Heritage Monument SVG Illustrations
// ─────────────────────────────────────────────
const MonumentIllustration = ({ type = 'temple', city = '' }) => {
  const cLower = (city || '').toLowerCase();

  if (type === 'temple_orange' || cLower.includes('ujjain')) {
    return (
      <div className="location-monument-badge bg-orange-monument">
        <svg viewBox="0 0 64 64" className="monument-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M32 6L30 18H34L32 6Z" fill="#EA580C" />
          <path d="M32 6L40 10L32 14" fill="#F97316" />
          <path d="M22 22L32 12L42 22H22Z" fill="#FB923C" />
          <path d="M18 32L32 20L46 32H18Z" fill="#F97316" />
          <path d="M14 42L32 28L50 42H14Z" fill="#EA580C" />
          <rect x="12" y="42" width="40" height="16" rx="2" fill="#C2410C" />
          <path d="M26 58V46C26 43.8 28.7 42 32 42C35.3 42 38 43.8 38 46V58H26Z" fill="#7C2D12" />
          <circle cx="32" cy="36" r="3" fill="#FEF08A" />
        </svg>
      </div>
    );
  }
  if (type === 'palace' || cLower.includes('bhopal')) {
    return (
      <div className="location-monument-badge bg-amber-monument">
        <svg viewBox="0 0 64 64" className="monument-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M32 10C24 10 20 18 20 26H44C44 18 40 10 32 10Z" fill="#D97706" />
          <path d="M32 4V10" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          <circle cx="32" cy="4" r="2" fill="#FDE68A" />
          <rect x="14" y="26" width="36" height="30" rx="3" fill="#B45309" />
          <rect x="8" y="18" width="8" height="38" rx="2" fill="#D97706" />
          <rect x="48" y="18" width="8" height="38" rx="2" fill="#D97706" />
          <path d="M26 56V40C26 36.7 28.7 34 32 34C35.3 34 38 36.7 38 40V56H26Z" fill="#78350F" />
        </svg>
      </div>
    );
  }
  if (type === 'fort' || cLower.includes('khandwa')) {
    return (
      <div className="location-monument-badge bg-terracotta-monument">
        <svg viewBox="0 0 64 64" className="monument-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="22" width="44" height="34" rx="2" fill="#B45309" />
          <path d="M10 22L14 16H20L22 22H26L28 16H34L36 22H40L42 16H48L52 22V26H10V22Z" fill="#D97706" />
          <rect x="24" y="36" width="16" height="20" rx="8" fill="#78350F" />
          <circle cx="18" cy="34" r="2.5" fill="#FEF3C7" />
          <circle cx="46" cy="34" r="2.5" fill="#FEF3C7" />
        </svg>
      </div>
    );
  }
  // Default: Indore Rajwada Heritage Palace
  return (
    <div className="location-monument-badge bg-gold-monument">
      <svg viewBox="0 0 64 64" className="monument-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 16L32 6L46 16V22H18V16Z" fill="#D97706" />
        <rect x="14" y="22" width="36" height="34" rx="2" fill="#B45309" />
        <path d="M24 56V38C24 33.6 27.6 30 32 30C36.4 30 40 33.6 40 38V56H24Z" fill="#78350F" />
        <rect x="18" y="26" width="6" height="8" rx="1" fill="#FEF3C7" />
        <rect x="40" y="26" width="6" height="8" rx="1" fill="#FEF3C7" />
      </svg>
    </div>
  );
};

const AVAILABLE_POWERS = [
  { key: 'canViewMembers', label: 'View & Search Members', category: 'Members' },
  { key: 'canAddMembers', label: 'Add & Register Members', category: 'Members' },
  { key: 'canEditMembers', label: 'Edit Member Profiles', category: 'Members' },
  { key: 'canApproveProfiles', label: 'Approve Member Verifications', category: 'Members' },
  { key: 'canViewProfiles', label: 'View & Manage Matrimonial', category: 'Matrimonial' },
  { key: 'canViewEvents', label: 'View & Manage Events', category: 'Events' },
  { key: 'canCreateEvents', label: 'Create New Events', category: 'Events' },
  { key: 'canViewFunds', label: 'View Samaj Funds & Ledger', category: 'Finance' },
  { key: 'canManageFunds', label: 'Manage Fund Governance', category: 'Finance' },
  { key: 'canViewDonations', label: 'Manage Donation Campaigns', category: 'Finance' },
  { key: 'canViewSocial', label: 'Moderate Social & City Feeds', category: 'Social' },
  { key: 'canViewDharmashala', label: 'Manage Dharmashala Bookings', category: 'Facilities' },
  { key: 'canSendNotifications', label: 'Send Announcements & Notifications', category: 'Broadcast' },
  { key: 'canViewCensus', label: 'View Community Census & Analytics', category: 'Census' }
];

// Detail card for a Local Head / Local Sub-Head inside the Group Detail modal
const LeaderDetailCard = ({ leader, tone = 'slate', isSelf = false, city, group, onEditPowers }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isActive = (leader.accountStatus || 'active') === 'active';
  const hasPassword = leader.plainPassword && leader.plainPassword !== '******';
  const toneClasses = tone === 'indigo' ? 'bg-indigo-50/60 border-indigo-200' : 'bg-slate-50 border-slate-200';
  const initials = (leader.name || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className={`rounded-2xl border p-3.5 ${toneClasses}`}>
      <div className="flex items-start gap-3">
        {leader.avatar ? (
          <img src={leader.avatar} alt={leader.name} className="w-12 h-12 rounded-xl object-cover border border-white shadow-sm shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shrink-0">{initials}</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-extrabold text-slate-800 m-0 truncate">{leader.name}</p>
            {isSelf && <span className="text-[9px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded">YOU</span>}
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
              {isActive ? 'Active' : (leader.accountStatus || 'Inactive')}
            </span>
          </div>
          {leader.designation && <p className="text-xs font-semibold text-indigo-600 m-0 mt-0.5">{leader.designation}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-slate-600">
            <span className="flex items-center gap-1.5 min-w-0">
              <Phone size={12} className="text-slate-400 shrink-0" />
              {leader.phone ? <a href={`tel:${leader.phone}`} className="hover:text-indigo-600 truncate">{leader.phone}</a> : '—'}
            </span>
            <span className="flex items-center gap-1.5 min-w-0">
              <Mail size={12} className="text-slate-400 shrink-0" />
              <span className="truncate">{leader.email || '—'}</span>
            </span>
            <span className="flex items-center gap-1.5"><MapPin size={12} className="text-slate-400 shrink-0" /> {city} • {group}</span>
            {hasPassword && (
              <span className="flex items-center gap-1.5">
                <Key size={12} className="text-slate-400 shrink-0" />
                <span className="font-mono">{showPassword ? leader.plainPassword : '••••••'}</span>
                <button type="button" onClick={() => setShowPassword(v => !v)} className="text-slate-400 hover:text-slate-600" title={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </span>
            )}
          </div>
        </div>
        {onEditPowers && (
          <button
            type="button"
            onClick={onEditPowers}
            className="shrink-0 text-[11px] font-extrabold text-indigo-600 bg-white border border-indigo-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1"
            title="Edit powers & permissions"
          >
            <Shield size={12} /> Powers
          </button>
        )}
      </div>
    </div>
  );
};

export default function LocalCommunityManagement() {
  const { headAuth } = useHeadAuth();
  const { currentUser } = useData();
  const headUser = headAuth?.headUser || currentUser;
  const isLocalHead = (headUser?.role === 'sub_head' || headUser?.accountType === 'local_head') && headUser?.role !== 'head' && headUser?.role !== 'admin';

  const [community, setCommunity] = useState(null);
  const [subCommunities, setSubCommunities] = useState([]);
  const [selectedSubCommunity, setSelectedSubCommunity] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locations, setLocations] = useState([]);
  const [stats, setStats] = useState({});
  const [allLocalHeads, setAllLocalHeads] = useState([]);
  const [allSubHeads, setAllSubHeads] = useState([]);

  // Community members eligible for promotion
  const [communityUsers, setCommunityUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Modals state
  const [showAddGroupModal, setShowAddGroupModal] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');

  const [assignHeadModal, setAssignHeadModal] = useState(null);
  const [submittingHead, setSubmittingHead] = useState(false);
  const [viewHeadsModal, setViewHeadsModal] = useState(null);
  const [unlistedCities, setUnlistedCities] = useState([]);

  // Form for Assigning / Updating Local Head or Sub Head
  const [assignForm, setAssignForm] = useState({
    userId: null,
    name: '',
    phone: '',
    email: '',
    password: '',
    city: '',
    state: 'Madhya Pradesh',
    group: 'Group 1',
    accountType: 'local_head',
    avatar: '',
    headPermissions: {
      canViewDashboard: true,
      canViewMembers: true,
      canApproveProfiles: true,
      canViewEvents: true,
      canCreateEvents: true,
      canViewFunds: true,
      canViewDonations: true,
      canViewSocial: true,
      canSendNotifications: true
    }
  });
  const [assignAvatarFile, setAssignAvatarFile] = useState(null);
  const handleAssignAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAssignAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAssignForm(prev => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Power editing modal for existing sub heads
  const [editPowersModal, setEditPowersModal] = useState(null);
  const [updatingPowers, setUpdatingPowers] = useState(false);

  // Group detail modal (click a group card): Local Head details, sub-heads, rename, visibility
  const [groupDetail, setGroupDetail] = useState(null); // { loc, grp }
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState('');
  const [savingGroupMeta, setSavingGroupMeta] = useState(false);
  // Who is looking: { level: 'community' | 'local' | 'local_sub', city, group }
  const [viewer, setViewer] = useState(null);

  // ── 1. Initial Load: the head's own Community & Sub-Communities ──
  // (Uses /head/local-community — the /admin endpoints reject Head accounts, which
  // used to leave this page showing placeholder groups with zero counts.)
  useEffect(() => {
    const initCommunity = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axiosPrivate.get('/head/local-community/structure');
        const data = res.data?.data || {};
        setCommunity(data.community || null);
        setViewer(data.viewer || null);
        const subs = data.subCommunities || [];
        setSubCommunities(subs);
        const own = headUser?.subCommunity || data.viewer?.subCommunity;
        const ownExists = own && subs.some(sb => (sb.name || '').toLowerCase() === own.toLowerCase());
        // With no sub-communities the breakdown simply covers the whole community
        setSelectedSubCommunity(ownExists ? own : (subs[0]?.name || own || 'all'));
      } catch (err) {
        console.error('Failed to init community:', err);
        setError(err.response?.data?.message || 'Could not load your community.');
        setLoading(false);
      }
    };

    initCommunity();
  }, [headUser]);

  // ── 2. Fetch Location Breakdown for Selected Sub-Community ──
  const fetchLocationData = async () => {
    if (!community?._id || !selectedSubCommunity) return;
    setLoading(true);
    setError('');
    try {
      const res = await axiosPrivate.get(`/head/local-community/sub-communities/${encodeURIComponent(selectedSubCommunity)}/locations`);
      if (res.data?.success && res.data?.data) {
        setLocations(res.data.data.locations || []);
        setStats(res.data.data.stats || {});
        setAllLocalHeads(res.data.data.allLocalHeads || []);
        setAllSubHeads(res.data.data.allSubHeads || []);
        setUnlistedCities(res.data.data.unlistedCities || []);
      }
    } catch (err) {
      console.error('Failed to fetch location data:', err);
      setError(err.response?.data?.message || 'Failed to load locations and groups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (community?._id && selectedSubCommunity) {
      fetchLocationData();
    }
  }, [community?._id, selectedSubCommunity]);

  // Fetch Community Users for quick promotion
  const fetchCommunityUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await axiosPrivate.get('/head/local-community/community-users');
      if (res.data?.status === 'success') {
        setCommunityUsers(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load community users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // ── 3. Actions: Add Group ──
  const handleAddGroupSubmit = (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || !showAddGroupModal) return;
    // A group only really exists once it has a real Local Head, so "Add Group" goes
    // straight into appointing that group's first Local Head — this used to just add
    // a fake, unsaved card that vanished on refresh.
    const loc = showAddGroupModal;
    const groupName = newGroupName.trim();
    setNewGroupName('');
    setShowAddGroupModal(null);
    openAssignHeadModal(loc, { id: `new-${Date.now()}`, name: groupName }, 'local_head');
  };

  // ── 4. Assign Head / Sub Head & Powers ──
  const openAssignHeadModal = (loc, grp, accountType = 'local_head') => {
    fetchCommunityUsers();
    const targetAccountType = isLocalHead ? 'local_sub_head' : accountType;
    setAssignForm({
      userId: null,
      name: '',
      phone: '',
      email: '',
      password: '',
      city: loc.name,
      state: 'Madhya Pradesh',
      group: grp.name,
      accountType: targetAccountType,
      avatar: '',
      headPermissions: {
        canViewDashboard: true,
        canViewMembers: true,
        canApproveProfiles: true,
        canViewEvents: true,
        canCreateEvents: true,
        canViewFunds: true,
        canViewDonations: true,
        canViewSocial: true,
        canSendNotifications: true
      }
    });
    setAssignAvatarFile(null);
    setAssignHeadModal({ loc, grp, accountType: targetAccountType });
  };

  const handleSelectUser = (uId) => {
    if (!uId) {
      setAssignForm(prev => ({ ...prev, userId: null, name: '', phone: '', email: '' }));
      return;
    }
    const foundUser = communityUsers.find(u => u._id === uId);
    if (foundUser) {
      setAssignForm(prev => ({
        ...prev,
        userId: foundUser._id,
        name: foundUser.name || '',
        phone: foundUser.phone || '',
        email: foundUser.email || '',
        city: foundUser.city || prev.city
      }));
    }
  };

  const handleAssignHeadSubmit = async (e) => {
    e.preventDefault();
    if (!assignForm.name.trim() || !assignForm.phone.trim()) {
      alert('Please provide Name and Phone number');
      return;
    }
    // Password is only required when creating a brand-new account — editing an
    // existing leader can leave it blank to keep the current one. Never silently
    // fall back to a default password.
    if (!assignForm.userId && (!assignForm.password || assignForm.password.length < 6)) {
      alert('Please set a login password of at least 6 characters');
      return;
    }
    setSubmittingHead(true);
    try {
      const { avatar, headPermissions, ...restAssignForm } = assignForm;
      let submitPayload;

      if (assignAvatarFile) {
        // A new photo was attached — send as multipart/form-data so the file
        // reaches the backend; the permissions object must travel as a JSON string.
        submitPayload = new FormData();
        Object.entries(restAssignForm).forEach(([key, value]) => {
          submitPayload.append(key, value ?? '');
        });
        submitPayload.append('headPermissions', JSON.stringify(headPermissions));
        submitPayload.append('avatarFile', assignAvatarFile);
      } else {
        submitPayload = assignForm;
      }

      const res = await axiosPrivate.post(
        `/head/local-community/sub-communities/${encodeURIComponent(selectedSubCommunity)}/assign-head`,
        submitPayload
      );
      alert(res.data?.message || 'Leader assigned successfully!');
      setAssignHeadModal(null);
      fetchLocationData();
    } catch (err) {
      console.error('Failed to assign head:', err);
      alert(err.response?.data?.message || 'Failed to assign leader');
    } finally {
      setSubmittingHead(false);
    }
  };

  // ── 5. Update Powers of Existing Sub-Head ──
  const openEditPowersModal = (subHead) => {
    setEditPowersModal({
      ...subHead,
      headPermissions: subHead.headPermissions || {}
    });
  };

  const handleSavePowers = async () => {
    if (!editPowersModal) return;
    setUpdatingPowers(true);
    try {
      await axiosPrivate.put(`/head/sub-heads/${editPowersModal.id || editPowersModal._id}`, {
        headPermissions: editPowersModal.headPermissions
      });
      alert('Powers & Permissions updated successfully!');
      setEditPowersModal(null);
      fetchLocationData();
    } catch (err) {
      console.error('Failed to update powers:', err);
      alert(err.response?.data?.message || 'Failed to update powers');
    } finally {
      setUpdatingPowers(false);
    }
  };

  // ── 6. Group Detail: open, rename, Home visibility ──
  // Community Head can manage every group; a Local Head only their own group.
  const canManageGroup = (grp) => viewer?.level === 'community' || (viewer?.level === 'local' && !!grp?.isMine);

  const openGroupDetail = (loc, grp) => {
    setEditingGroupName(false);
    setGroupNameDraft(grp.name);
    setGroupDetail({ loc, grp });
  };

  const closeGroupDetail = () => {
    setGroupDetail(null);
    setEditingGroupName(false);
  };

  const patchGroup = (payload) => axiosPrivate.patch(
    `/head/local-community/groups/${encodeURIComponent(groupDetail.grp.name)}`,
    { city: groupDetail.loc.name, ...payload }
  );

  const handleSaveGroupRename = async () => {
    if (!groupDetail) return;
    const trimmed = groupNameDraft.trim();
    if (!trimmed || trimmed === groupDetail.grp.name) {
      setEditingGroupName(false);
      return;
    }
    setSavingGroupMeta(true);
    try {
      const res = await patchGroup({ newName: trimmed });
      alert(res.data?.message || `Group renamed to "${trimmed}".`);
      setGroupDetail(prev => prev ? { ...prev, grp: { ...prev.grp, name: trimmed } } : prev);
      setEditingGroupName(false);
      fetchLocationData();
    } catch (err) {
      console.error('Failed to rename group:', err);
      alert(err.response?.data?.message || 'Failed to rename group');
    } finally {
      setSavingGroupMeta(false);
    }
  };

  const handleToggleGroupVisibility = async (nextVisible) => {
    if (!groupDetail) return;
    setSavingGroupMeta(true);
    try {
      await patchGroup({ isVisibleOnHome: nextVisible });
      setGroupDetail(prev => prev ? { ...prev, grp: { ...prev.grp, isVisibleOnHome: nextVisible } } : prev);
      fetchLocationData();
    } catch (err) {
      console.error('Failed to update group visibility:', err);
      alert(err.response?.data?.message || 'Failed to update group visibility');
    } finally {
      setSavingGroupMeta(false);
    }
  };

  const commName = community?.name || 'Rajput';
  const subName = selectedSubCommunity || 'Rathore';
  const subAvatarLetter = (subName || 'R').charAt(0).toUpperCase();

  const activeLocationsCount = stats.activeLocationsCount || locations.filter(l => l.isActive).length;
  const totalCommunityHeadsCount = stats.totalCommunityHeadsCount || 1;
  const totalLocalCommunityHeadsCount = stats.totalLocalCommunityHeadsCount || allLocalHeads.length;
  const totalLocalSubCommunityHeadsCount = stats.totalLocalSubCommunityHeadsCount || allSubHeads.length;
  const totalUsersCount = stats.totalUsersCount || 0;

  return (
    <div className="subcomm-view-container font-sans">
      {/* ── Sub-Community Selector Tabs if multiple ── */}
      {subCommunities.length > 1 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Sub-Community:</span>
          {subCommunities.map((sub, idx) => {
            const sName = typeof sub === 'string' ? sub : (sub.name || `Sub-${idx+1}`);
            const isSelected = sName === selectedSubCommunity;
            return (
              <button
                key={idx}
                onClick={() => setSelectedSubCommunity(sName)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {sName}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Top Header Strip matching Screenshot ── */}
      <div className="subcomm-top-nav">
        <div className="subcomm-left-header">
          <div className="subcomm-avatar-square">
            <span>{subAvatarLetter}</span>
          </div>
          <div>
            <h2 className="subcomm-main-title">{commName} / {subName}</h2>
            <p className="subcomm-breadcrumb">
              Communities &gt; {commName} &gt; {subName} (Location Wise)
            </p>
          </div>
        </div>

        <div className="subcomm-right-meta">
          <div className="comm-status-pill comm-pill-active">
            <span className="pill-dot">●</span> ACTIVE
          </div>
          <span className="subcomm-created-badge">
            📅 Created: {community?.createdAt ? new Date(community.createdAt).toLocaleDateString('en-GB') : '20/09/2026'}
          </span>
        </div>
      </div>

      {/* ── Top Summary Stats Strip matching Screenshot ── */}
      <div className="subcomm-stats-strip">
        {/* Stat 1: Active Locations (Purple) */}
        <div className="strip-stat-box bg-lavender-strip" title="Total active regional units">
          <div className="strip-stat-icon text-indigo">📍</div>
          <div className="strip-stat-num">{activeLocationsCount}</div>
          <div className="strip-stat-label">Active Locations</div>
        </div>

        {/* Stat 2: Total Community Heads (Warm Amber) - Only for Main Head */}
        {!isLocalHead && (
          <div className="strip-stat-box bg-amber-strip" title="Main Community Heads">
            <div className="strip-stat-icon text-amber">👥</div>
            <div className="strip-stat-num">{totalCommunityHeadsCount}</div>
            <div className="strip-stat-label">Total Community Heads</div>
          </div>
        )}

        {/* Stat 3: Total Local Community Heads (Sky Blue) - Only for Main Head */}
        {!isLocalHead && (
          <div
            className="strip-stat-box bg-sky-strip comm-stat-clickable cursor-pointer hover:shadow-md transition-all"
            onClick={() => setViewHeadsModal({ title: `All Local Community Heads • ${commName} / ${subName}`, type: 'local_head', heads: allLocalHeads })}
            title="Click to view all Local Heads"
          >
            <div className="strip-stat-icon text-sky">👤</div>
            <div className="strip-stat-num">{totalLocalCommunityHeadsCount}</div>
            <div className="strip-stat-label">Total Local Community Heads</div>
          </div>
        )}

        {/* Stat 4: Total Local Sub Community Heads (Rose / Red) */}
        <div
          className="strip-stat-box bg-rose-strip comm-stat-clickable cursor-pointer hover:shadow-md transition-all"
          onClick={() => setViewHeadsModal({ title: `All Local Sub Community Heads • ${commName} / ${subName}`, type: 'local_sub_head', heads: allSubHeads })}
          title="Click to view all Local Sub Heads and manage powers"
        >
          <div className="strip-stat-icon text-rose">👥</div>
          <div className="strip-stat-num">{totalLocalSubCommunityHeadsCount}</div>
          <div className="strip-stat-label">Total Local Sub Community Heads</div>
        </div>

        {/* Stat 5: Total Users (Mint Green) */}
        <div className="strip-stat-box bg-mint-strip" title="Live member count registered under this sub-community">
          <div className="strip-stat-icon text-emerald">👥</div>
          <div className="strip-stat-num">{totalUsersCount.toLocaleString()}</div>
          <div className="strip-stat-label">Total Users</div>
        </div>

      </div>

      {/* ── Main 2x2 Grid of Location Cards ── */}
      {loading ? (
        <div className="communities-loading py-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Loading location matrix and assigned heads...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm font-semibold flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={fetchLocationData} className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold">Retry</button>
        </div>
      ) : (
        <div className="subcomm-cards-grid">
          {locations.map(loc => {
            const isLocActive = loc.isActive !== false;
            const locHeadCount = (loc.localHeadsList && loc.localHeadsList.length) || loc.localHeadsCount || 0;

            return (
              <div key={loc.id} className={`subcomm-item-card ${!isLocActive ? 'subcomm-card-inactive' : ''}`}>
                {/* Card Header: Monument Icon + Location Name + Status Pill + Add Group */}
                <div className="subcomm-card-header">
                  <div className="location-header-left">
                    <MonumentIllustration type={loc.illustrationType} city={loc.name} />
                    <div>
                      <h3 className="subcomm-card-title">{loc.fullName || `${loc.name} Location`}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="subcomm-card-subtitle">Total Groups: {loc.groups?.length || 4}</p>
                        {locHeadCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setViewHeadsModal({
                              title: `Local Heads in ${loc.name}`,
                              type: 'local_head',
                              heads: loc.localHeadsList || []
                            })}
                            className="text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full"
                          >
                            👤 {locHeadCount} Head{locHeadCount > 1 ? 's' : ''}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="subcomm-card-header-actions">
                    <div className={`comm-status-pill ${isLocActive ? 'comm-pill-active' : 'comm-pill-inactive'}`}>
                      <span className="pill-dot">●</span> {isLocActive ? 'ACTIVE' : 'INACTIVE'}
                    </div>
                    <button
                      type="button"
                      className="subcomm-btn-add-group"
                      onClick={() => setShowAddGroupModal(loc)}
                    >
                      + Add Group
                    </button>
                  </div>
                </div>

                {/* 4 Group Columns Matrix matching Screenshot */}
                <div className="subcomm-groups-columns">
                  {(loc.groups || []).map((grp, idx) => {
                    const grpHeadCount = grp.heads ?? (grp.localHeadsList?.length || 0);
                    const grpSubHeadCount = grp.subHeads ?? (grp.subHeadsList?.length || 0);

                    return (
                      <div
                        key={grp.id || idx}
                        className={`subcomm-group-col subcomm-group-col-clickable ${grp.isMine ? 'subcomm-group-col-mine' : ''}`}
                        role="button"
                        tabIndex={0}
                        title="Click to view group details"
                        onClick={() => openGroupDetail(loc, grp)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGroupDetail(loc, grp); } }}
                      >
                        <div className={`grp-col-header ${grp.colorClass || 'grp-header-blue'}`}>
                          {grp.name}{grp.isMine ? ' ★' : ''}
                        </div>

                        {/* Local Community Heads Row - Only show for Main Head/Admin */}
                        {!isLocalHead && (
                          <div className="grp-row">
                            <div className="grp-count-line">
                              <span className="grp-icon-blue">👤</span>
                              <span
                                className="grp-number"
                                style={{ cursor: grpHeadCount > 0 ? 'pointer' : 'default' }}
                                onClick={(e) => { e.stopPropagation(); openGroupDetail(loc, grp); }}
                                title={grpHeadCount > 0 ? 'Click to view heads in this group' : ''}
                              >
                                {grpHeadCount}
                              </span>
                              <button
                                type="button"
                                className="grp-plus-btn"
                                title="Assign/Create Local Community Head"
                                onClick={(e) => { e.stopPropagation(); openAssignHeadModal(loc, grp, 'local_head'); }}
                              >
                                +
                              </button>
                            </div>
                            <div className="grp-label-small">Local Community Heads</div>
                          </div>
                        )}

                        {/* Local Sub Community Heads Row */}
                        <div className="grp-row">
                          <div className="grp-count-line">
                            <span className="grp-icon-red">👥</span>
                            <span
                              className="grp-number"
                              style={{ cursor: grpSubHeadCount > 0 ? 'pointer' : 'default' }}
                              onClick={(e) => { e.stopPropagation(); openGroupDetail(loc, grp); }}
                              title={grpSubHeadCount > 0 ? 'Click to view sub-heads in this group and manage powers' : ''}
                            >
                              {grpSubHeadCount}
                            </span>
                            <button
                              type="button"
                              className="grp-plus-btn"
                              title="Assign/Create Local Sub Community Head with Powers"
                              onClick={(e) => { e.stopPropagation(); openAssignHeadModal(loc, grp, 'local_sub_head'); }}
                            >
                              +
                            </button>
                          </div>
                          <div className="grp-label-small">Local Sub Community Heads</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mint Green User Strip matching Screenshot */}
                <div className="subcomm-users-strip">
                  <span className="users-icon">👥</span>
                  <span className="users-count-bold">{(loc.userCount || 0).toLocaleString()}</span>
                  <span className="users-label">Total Users ({loc.name})</span>
                </div>

                {/* Locations are created and managed by the Admin */}
                {!isLocActive && (
                  <p className="text-[11px] font-semibold text-slate-500 text-center m-0">This location has been deactivated by the Admin.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Locations are added by the Admin; tell the head about people outside them */}
      {!loading && !error && (
        <div className="mt-4 px-4 py-3 rounded-2xl border text-xs font-semibold bg-slate-50 border-slate-200 text-slate-600">
          📍 Locations are added by the Admin.
          {unlistedCities.length > 0 && (
            <span className="block mt-1 text-amber-700">
              Not shown above: {unlistedCities.map(c => {
                const parts = [];
                if (c.users) parts.push(`${c.users} member${c.users === 1 ? '' : 's'}`);
                if (c.localHeads) parts.push(`${c.localHeads} Local Head${c.localHeads === 1 ? '' : 's'}`);
                if (c.localSubHeads) parts.push(`${c.localSubHeads} Sub-Head${c.localSubHeads === 1 ? '' : 's'}`);
                return `${c.name} (${parts.join(', ')})`;
              }).join(' • ')} — ask the Admin to add the city as a location.
            </span>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────
          MODAL: Group Detail — Local Head details, Sub-Heads, rename & Home visibility
      ───────────────────────────────────────────── */}
      {groupDetail && (() => {
        const { loc, grp } = groupDetail;
        const gdHeads = grp.localHeadsList || [];
        const gdSubHeads = grp.subHeadsList || [];
        const isVisible = grp.isVisibleOnHome !== false;
        const canEditGroup = canManageGroup(grp);
        return (
          <div className="community-modal-overlay" onClick={closeGroupDetail}>
            <div className="community-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
              <div className="community-modal-header">
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingGroupName ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        type="text"
                        maxLength={40}
                        value={groupNameDraft}
                        onChange={e => setGroupNameDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveGroupRename(); if (e.key === 'Escape') setEditingGroupName(false); }}
                        className="px-3 py-1.5 border border-slate-300 rounded-xl text-base font-extrabold w-56"
                      />
                      <button type="button" disabled={savingGroupMeta} onClick={handleSaveGroupRename} className="text-green-600 font-extrabold">✓</button>
                      <button type="button" onClick={() => setEditingGroupName(false)} className="text-slate-400 font-extrabold">✕</button>
                    </div>
                  ) : (
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      👥 {grp.name}
                      {grp.isMine && <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-full">Your Group</span>}
                      {canEditGroup && (
                        <button
                          type="button"
                          title="Rename Group"
                          onClick={() => { setGroupNameDraft(grp.name); setEditingGroupName(true); }}
                          className="text-sm text-indigo-600 hover:text-indigo-800"
                        >
                          <Edit size={15} />
                        </button>
                      )}
                    </h3>
                  )}
                  <p className="text-xs text-slate-500 mt-0.5">
                    📍 {loc.name} • {!isLocalHead && <>{gdHeads.length} Local Head(s) • </>}{gdSubHeads.length} Local Sub-Head(s)
                  </p>
                </div>
                <button type="button" className="community-modal-close" onClick={closeGroupDetail}>✕</button>
              </div>

              <div className="community-modal-body" style={{ maxHeight: '62vh', overflowY: 'auto' }}>
                {/* Home Page Visibility */}
                {canEditGroup && (
                  <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 mb-4">
                    <div>
                      <p className="text-sm font-extrabold text-slate-800 m-0">Show this group on the Home page?</p>
                      <p className="text-xs text-slate-500 m-0 mt-0.5">
                        Members in {loc.name} will {isVisible ? '' : 'not '}see this Local Head and their team on the leadership directory.
                      </p>
                    </div>
                    <div className="flex bg-slate-200 p-0.5 rounded-xl gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={savingGroupMeta}
                        onClick={() => handleToggleGroupVisibility(true)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold ${isVisible ? 'bg-green-600 text-white' : 'text-slate-600'}`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        disabled={savingGroupMeta}
                        onClick={() => handleToggleGroupVisibility(false)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold ${!isVisible ? 'bg-red-600 text-white' : 'text-slate-600'}`}
                      >
                        No
                      </button>
                    </div>
                  </div>
                )}

                {/* Local Head details — only for the Community Head; a Local Head sees just their Sub-Heads */}
                {!isLocalHead && (<>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider m-0">Local Head</p>
                  {!isLocalHead && gdHeads.length === 0 && (
                    <button
                      type="button"
                      onClick={() => { closeGroupDetail(); openAssignHeadModal(loc, grp, 'local_head'); }}
                      className="text-[11px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg"
                    >
                      + Appoint Local Head
                    </button>
                  )}
                </div>
                {gdHeads.length === 0 ? (
                  <p className="text-sm text-slate-400 mb-4">No Local Head appointed in this group yet.</p>
                ) : (
                  <div className="flex flex-col gap-2.5 mb-5">
                    {gdHeads.map((leader, idx) => (
                      <LeaderDetailCard
                        key={leader.id || idx}
                        leader={leader}
                        tone="indigo"
                        isSelf={String(leader.id) === String(headUser?._id || headUser?.id)}
                        city={loc.name}
                        group={grp.name}
                      />
                    ))}
                  </div>
                )}
                </>)}

                {/* Local Sub-Heads */}
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider m-0">Local Sub-Heads</p>
                  {canEditGroup && (
                    <button
                      type="button"
                      onClick={() => { closeGroupDetail(); openAssignHeadModal(loc, grp, 'local_sub_head'); }}
                      className="text-[11px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg"
                    >
                      + Add Sub-Head
                    </button>
                  )}
                </div>
                {gdSubHeads.length === 0 ? (
                  <p className="text-sm text-slate-400 m-0">No Local Sub-Heads in this group yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {gdSubHeads.map((leader, idx) => (
                      <LeaderDetailCard
                        key={leader.id || idx}
                        leader={leader}
                        tone="slate"
                        city={loc.name}
                        group={grp.name}
                        onEditPowers={canEditGroup ? () => { closeGroupDetail(); openEditPowersModal(leader); } : null}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─────────────────────────────────────────────
          MODAL 1: Assign / Appoint Head / Sub-Head + Give Powers
      ───────────────────────────────────────────── */}
      {assignHeadModal && (
        <div className="community-modal-overlay" onClick={() => setAssignHeadModal(null)}>
          <div className="community-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="community-modal-header">
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  👤 Appoint {assignHeadModal.accountType === 'local_sub_head' ? 'Local Sub Head' : 'Local Community Head'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign to: <strong>{assignHeadModal.loc.name}</strong> • <strong>{assignHeadModal.grp.name}</strong>
                </p>
              </div>
              <button type="button" className="community-modal-close" onClick={() => setAssignHeadModal(null)}>✕</button>
            </div>

            <form onSubmit={handleAssignHeadSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <div className="community-modal-body space-y-4 overflow-y-auto pr-1" style={{ flex: 1, minHeight: 0 }}>
                {/* Role Switcher in Modal - Only for Main Community Head/Admin */}
                {!isLocalHead && (
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAssignForm(prev => ({ ...prev, accountType: 'local_head' }))}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        assignForm.accountType === 'local_head' ? 'bg-white shadow text-indigo-700' : 'text-slate-600'
                      }`}
                    >
                      👤 Local Community Head
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignForm(prev => ({ ...prev, accountType: 'local_sub_head' }))}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        assignForm.accountType === 'local_sub_head' ? 'bg-white shadow text-rose-700' : 'text-slate-600'
                      }`}
                    >
                      👥 Local Sub Head (With Powers)
                    </button>
                  </div>
                )}

                {/* Option A: Pick Existing Community Member */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Option A: Select Registered Community Member
                  </label>
                  <select
                    value={assignForm.userId || ''}
                    onChange={e => handleSelectUser(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose existing member (or create new below) --</option>
                    {communityUsers.map(u => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.phone}) - {u.city || 'No City'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-3 text-slate-400 text-[11px] font-bold uppercase">or create / edit details</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {/* Profile Photo */}
                <div className="flex items-center gap-3">
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                    {assignForm.avatar ? (
                      <img src={assignForm.avatar} className="w-full h-full object-cover" alt="Profile preview" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <User size={22} />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-[11px] font-bold rounded-xl cursor-pointer hover:bg-indigo-100 transition-colors">
                      <Upload size={12} />
                      {assignForm.avatar ? 'Change Photo' : 'Upload Photo'}
                      <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleAssignAvatarSelect} />
                    </label>
                    {assignForm.avatar && (
                      <button
                        type="button"
                        onClick={() => { setAssignForm(prev => ({ ...prev, avatar: '' })); setAssignAvatarFile(null); }}
                        className="ml-2 text-[11px] font-bold text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Option B: Account Info Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Singh"
                      value={assignForm.name}
                      onChange={e => setAssignForm({ ...assignForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (Login ID) *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={assignForm.phone}
                      onChange={e => setAssignForm({ ...assignForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="ramesh@gmail.com"
                      value={assignForm.email}
                      onChange={e => setAssignForm({ ...assignForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Login Password {assignForm.userId ? '(leave blank to keep current)' : '*'}</label>
                    <input
                      type="text"
                      required={!assignForm.userId}
                      placeholder="Min 6 characters (e.g. 123456)"
                      value={assignForm.password}
                      onChange={e => setAssignForm({ ...assignForm, password: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Group</label>
                    <input
                      type="text"
                      placeholder="e.g. Group 2"
                      value={assignForm.group}
                      onChange={e => setAssignForm({ ...assignForm, group: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Type a new name to start a new group.</p>
                  </div>
                </div>

                {/* Sub-Head Powers & Permissions Checklist */}
                {assignForm.accountType === 'local_sub_head' && (
                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                        <Shield size={14} className="text-indigo-600" /> Grant Powers &amp; Permissions to Sub-Head
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const allTrue = {};
                          AVAILABLE_POWERS.forEach(p => { allTrue[p.key] = true; });
                          setAssignForm(prev => ({ ...prev, headPermissions: allTrue }));
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:underline"
                      >
                        Grant All Powers
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100">
                      {AVAILABLE_POWERS.map(power => {
                        const isChecked = assignForm.headPermissions?.[power.key] === true;
                        return (
                          <label
                            key={power.key}
                            className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold cursor-pointer transition-all border ${
                              isChecked
                                ? 'bg-white border-indigo-300 text-indigo-950 shadow-sm'
                                : 'bg-transparent border-transparent text-slate-600 hover:bg-white/60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                setAssignForm(prev => ({
                                  ...prev,
                                  headPermissions: {
                                    ...(prev.headPermissions || {}),
                                    [power.key]: e.target.checked
                                  }
                                }));
                              }}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{power.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="community-modal-actions">
                <button
                  type="button"
                  className="community-btn-secondary"
                  onClick={() => setAssignHeadModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingHead}
                  className="community-btn-primary"
                >
                  {submittingHead ? 'Saving Leader...' : 'Appoint Leader & Grant Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          MODAL 2: View Assigned Leaders & Manage Powers
      ───────────────────────────────────────────── */}
      {viewHeadsModal && (
        <div className="community-modal-overlay" onClick={() => setViewHeadsModal(null)}>
          <div className="community-modal community-modal-wide" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="community-modal-header">
              <div>
                <h3 className="text-lg font-black text-slate-800">👥 {viewHeadsModal.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing {viewHeadsModal.heads?.length || 0} assigned leader profile(s)
                </p>
              </div>
              <button type="button" className="community-modal-close" onClick={() => setViewHeadsModal(null)}>✕</button>
            </div>

            <div className="community-modal-body max-h-[60vh] overflow-y-auto">
              {(!viewHeadsModal.heads || viewHeadsModal.heads.length === 0) ? (
                <div className="text-center py-10 text-slate-500">
                  <div className="text-4xl mb-2">👤</div>
                  <h4 className="text-base font-bold text-slate-800">No Leaders Assigned Yet</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Click the <strong>+</strong> button in any group column to appoint Local Heads or Sub Heads.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {viewHeadsModal.heads.map((head, idx) => (
                    <div
                      key={head.id || head._id || idx}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-lg shrink-0">
                          {(head.name || 'H').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-900">{head.name}</h4>
                            {head.group && (
                              <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                {head.group}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            📞 {head.phone} {head.email ? `• ✉️ ${head.email}` : ''}
                          </p>
                          {head.plainPassword && (
                            <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                              🔑 Password: <span className="font-mono bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{head.plainPassword}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-end justify-between gap-2">
                        <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full ${
                          head.accountStatus === 'active' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          ● {head.accountStatus?.toUpperCase() || 'ACTIVE'}
                        </span>
                        
                        {/* Edit Powers Button for Sub-Heads */}
                        <button
                          type="button"
                          onClick={() => openEditPowersModal(head)}
                          className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl hover:bg-indigo-100 flex items-center gap-1 transition-all"
                        >
                          <Shield size={12} /> Edit Powers
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="community-modal-actions mt-4">
              <button type="button" className="community-btn-primary" onClick={() => setViewHeadsModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          MODAL 3: Edit Powers & Permissions
      ───────────────────────────────────────────── */}
      {editPowersModal && (
        <div className="community-modal-overlay" onClick={() => setEditPowersModal(null)}>
          <div className="community-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="community-modal-header">
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  🛡️ Edit Powers &amp; Permissions
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Leader: <strong>{editPowersModal.name}</strong> ({editPowersModal.phone})
                </p>
              </div>
              <button type="button" className="community-modal-close" onClick={() => setEditPowersModal(null)}>✕</button>
            </div>

            <div className="community-modal-body space-y-3 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-slate-600">
                Check the modules and administrative capabilities you wish to grant to this leader:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                {AVAILABLE_POWERS.map(power => {
                  const isChecked = editPowersModal.headPermissions?.[power.key] === true;
                  return (
                    <label
                      key={power.key}
                      className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold cursor-pointer transition-all border ${
                        isChecked
                          ? 'bg-white border-indigo-400 text-indigo-950 shadow-sm'
                          : 'bg-transparent border-transparent text-slate-600 hover:bg-white/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e => {
                          setEditPowersModal(prev => ({
                            ...prev,
                            headPermissions: {
                              ...(prev.headPermissions || {}),
                              [power.key]: e.target.checked
                            }
                          }));
                        }}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{power.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="community-modal-actions mt-4">
              <button
                type="button"
                className="community-btn-secondary"
                onClick={() => setEditPowersModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updatingPowers}
                onClick={handleSavePowers}
                className="community-btn-primary"
              >
                {updatingPowers ? 'Updating Powers...' : 'Save & Apply Powers'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          MODAL 5: Add Group
      ───────────────────────────────────────────── */}
      {showAddGroupModal && (
        <div className="community-modal-overlay" onClick={() => setShowAddGroupModal(null)}>
          <div className="community-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="community-modal-header">
              <h3 className="text-lg font-black text-slate-800">➕ Add New Group to {showAddGroupModal.name}</h3>
              <button type="button" className="community-modal-close" onClick={() => setShowAddGroupModal(null)}>✕</button>
            </div>
            <form onSubmit={handleAddGroupSubmit}>
              <div className="community-modal-body space-y-3">
                <label className="block text-xs font-bold text-slate-700">Group Name *</label>
                <input
                  type="text"
                  required
                  placeholder={`Group ${(showAddGroupModal.groups?.length || 0) + 1}`}
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                  autoFocus
                />
              </div>
              <div className="community-modal-actions mt-4">
                <button type="button" className="community-btn-secondary" onClick={() => setShowAddGroupModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="community-btn-primary">
                  Add Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EMBEDDED STYLES FOR EXACT SCREENSHOT REPLICATION & MOBILE RESPONSIVENESS ── */}
      <style>{`
        .subcomm-view-container {
          animation: fadeIn 0.25s ease;
          padding: 12px;
          max-width: 1400px;
          margin: 0 auto;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

        .subcomm-top-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 16px;
          padding-bottom: 14px;
          border-bottom: 1.5px solid #f1f5f9;
        }
        .subcomm-left-header {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .subcomm-avatar-square {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, #1e3a8a, #2563eb);
          color: #ffffff;
          font-size: 1.4rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }
        .subcomm-main-title {
          font-size: 1.45rem;
          font-weight: 900;
          color: #0f172a;
          margin: 0;
          line-height: 1.2;
        }
        .subcomm-breadcrumb {
          font-size: 0.8rem;
          color: #64748b;
          margin: 3px 0 0;
          font-weight: 600;
        }
        .subcomm-right-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .comm-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 20px;
          letter-spacing: 0.04em;
        }
        .comm-pill-active {
          background: #dcfce7;
          color: #15803d;
          border: 1px solid #bbf7d0;
        }
        .comm-pill-inactive {
          background: #fee2e2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }
        .subcomm-created-badge {
          font-size: 0.78rem;
          color: #64748b;
          font-weight: 600;
        }

        /* ── Top Summary Stats Strip ── */
        .subcomm-stats-strip {
          display: grid;
          grid-template-columns: repeat(5, 1fr) auto;
          gap: 12px;
          margin-bottom: 24px;
        }
        @media (max-width: 1100px) {
          .subcomm-stats-strip {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 640px) {
          .subcomm-stats-strip {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
        }

        .strip-stat-box {
          border-radius: 14px;
          padding: 14px 12px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .bg-lavender-strip { background: #f5f3ff; border: 1.5px solid #ede9fe; }
        .bg-amber-strip    { background: #fffbeb; border: 1.5px solid #fef3c7; }
        .bg-sky-strip      { background: #f0f9ff; border: 1.5px solid #e0f2fe; }
        .bg-rose-strip     { background: #fef2f2; border: 1.5px solid #fee2e2; }
        .bg-mint-strip     { background: #f0fdf4; border: 1.5px solid #dcfce7; }

        .strip-stat-icon {
          font-size: 1.25rem;
          margin-bottom: 2px;
        }
        .strip-stat-num {
          font-size: 1.5rem;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.1;
        }
        .strip-stat-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #475569;
          margin-top: 4px;
          white-space: nowrap;
        }

        .strip-action-box {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @media (max-width: 640px) {
          .strip-action-box {
            grid-column: span 2;
          }
        }
        .subcomm-btn-add-primary {
          background: #2563eb;
          color: #ffffff;
          border: none;
          border-radius: 14px;
          padding: 0 20px;
          height: 100%;
          min-height: 52px;
          font-size: 0.9rem;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
          width: 100%;
        }
        .subcomm-btn-add-primary:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }

        /* ── Location 2-Column Cards Grid ── */
        .subcomm-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }
        @media (max-width: 960px) {
          .subcomm-cards-grid {
            grid-template-columns: 1fr;
          }
        }

        .subcomm-item-card {
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: all 0.2s;
        }
        .subcomm-item-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
        }
        .subcomm-card-inactive {
          opacity: 0.65;
        }

        .subcomm-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .location-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .location-monument-badge {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.05);
        }
        .bg-gold-monument       { background: #fef3c7; }
        .bg-amber-monument      { background: #fed7aa; }
        .bg-orange-monument     { background: #ffedd5; }
        .bg-terracotta-monument { background: #ffe4e6; }
        .monument-svg {
          width: 32px;
          height: 32px;
        }
        .subcomm-card-title {
          font-size: 1.25rem;
          font-weight: 900;
          color: #0f172a;
          margin: 0;
        }
        .subcomm-card-subtitle {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 600;
          margin: 0;
        }

        .subcomm-card-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .subcomm-btn-add-group {
          background: #2563eb;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          padding: 6px 14px;
          font-size: 0.78rem;
          font-weight: 800;
          cursor: pointer;
          transition: background 0.15s;
        }
        .subcomm-btn-add-group:hover {
          background: #1d4ed8;
        }

        /* ── Group Columns Matrix ── */
        .subcomm-groups-columns {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        @media (max-width: 600px) {
          .subcomm-groups-columns {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
        }

        .subcomm-group-col {
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .subcomm-group-col-clickable {
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
        }
        .subcomm-group-col-clickable:hover,
        .subcomm-group-col-clickable:focus-visible {
          transform: translateY(-2px);
          border-color: #a5b4fc;
          box-shadow: 0 8px 20px rgba(79, 70, 229, 0.12);
          outline: none;
        }
        .subcomm-group-col-mine {
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
        }
        .grp-col-header {
          padding: 8px 4px;
          font-size: 0.78rem;
          font-weight: 900;
          text-align: center;
          letter-spacing: 0.02em;
        }
        .grp-header-blue   { background: #e0f2fe; color: #0369a1; }
        .grp-header-pink   { background: #fce7f3; color: #be185d; }
        .grp-header-green  { background: #dcfce7; color: #15803d; }
        .grp-header-yellow { background: #fef3c7; color: #b45309; }

        .grp-row {
          padding: 10px 8px;
          border-bottom: 1px solid #f1f5f9;
          text-align: center;
        }
        .grp-row:last-child {
          border-bottom: none;
        }
        .grp-count-line {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 2px;
        }
        .grp-number {
          font-size: 1.25rem;
          font-weight: 900;
          color: #0f172a;
        }
        .grp-plus-btn {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: none;
          background: #38bdf8;
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          line-height: 1;
          transition: transform 0.1s, background 0.15s;
          padding: 0;
        }
        .grp-plus-btn:hover {
          background: #0284c7;
          transform: scale(1.1);
        }
        .grp-label-small {
          font-size: 0.65rem;
          font-weight: 700;
          color: #64748b;
          line-height: 1.15;
          margin-top: 2px;
        }

        /* ── Users Mint Strip ── */
        .subcomm-users-strip {
          background: #f0fdf4;
          border: 1.5px solid #dcfce7;
          border-radius: 12px;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 0.85rem;
        }
        .users-count-bold {
          font-weight: 900;
          color: #15803d;
          font-size: 1.1rem;
        }
        .users-label {
          font-weight: 700;
          color: #166534;
        }

        /* ── Action Bar ── */
        .subcomm-card-action-bar {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding-top: 4px;
        }
        .subcomm-act-btn {
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          padding: 8px;
          background: #ffffff;
          font-size: 0.78rem;
          font-weight: 800;
          color: #334155;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s;
        }
        .subcomm-act-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
        .subcomm-act-delete {
          color: #dc2626;
        }
        .subcomm-act-delete:hover {
          background: #fef2f2;
          border-color: #fecaca;
        }

        /* ── Bottom Large Add Button ── */
        .subcomm-bottom-add-bar {
          margin-top: 20px;
        }
        .subcomm-btn-bottom-add {
          width: 100%;
          background: #2563eb;
          color: #ffffff;
          border: none;
          border-radius: 16px;
          padding: 16px;
          font-size: 1rem;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(37, 99, 235, 0.25);
          transition: background 0.15s;
        }
        .subcomm-btn-bottom-add:hover {
          background: #1d4ed8;
        }

        /* ── Modals Generic ── */
        .community-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
        }
        .community-modal {
          background: #ffffff;
          border-radius: 24px;
          width: 100%;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
        }
        .community-modal-header {
          padding: 20px 24px;
          border-bottom: 1.5px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .community-modal-close {
          background: #f1f5f9;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          font-size: 1rem;
          font-weight: 800;
          color: #64748b;
          cursor: pointer;
        }
        .community-modal-body {
          padding: 20px 24px;
        }
        .community-modal-actions {
          padding: 16px 24px;
          background: #f8fafc;
          border-top: 1.5px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
        }
        .community-btn-primary {
          background: #2563eb;
          color: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 10px 20px;
          font-size: 0.85rem;
          font-weight: 800;
          cursor: pointer;
          transition: background 0.15s;
        }
        .community-btn-primary:hover {
          background: #1d4ed8;
        }
        .community-btn-secondary {
          background: #ffffff;
          color: #475569;
          border: 1.5px solid #cbd5e1;
          border-radius: 12px;
          padding: 10px 18px;
          font-size: 0.85rem;
          font-weight: 800;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
