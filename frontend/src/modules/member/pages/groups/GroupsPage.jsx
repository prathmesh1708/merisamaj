import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users, Plus, Search, Lock, Loader2, RefreshCcw,
  Shield, X, Camera, ChevronRight, Check, AlertTriangle, Menu, CheckCheck
} from 'lucide-react';
import { Avatar } from '../../components/common/Avatar';
import { useGroups } from '../../hooks/useGroups';
import { useAuth } from '../../../../core/auth/useAuth';
import { useData } from '../../context/DataProvider';
import { groupService } from '../../../../core/api/groupService';
import { getMembers } from '../../services/directoryApi';

const CATEGORIES = [
  { id: 'all',       label: 'All' },
  { id: 'my',        label: 'My Groups' },
  { id: 'General',   label: 'General' },
  { id: 'Youth',     label: 'Youth' },
  { id: 'Women',     label: 'Women' },
  { id: 'Business',  label: 'Business' },
  { id: 'Education', label: 'Education' },
  { id: 'Religious', label: 'Religious' }
];

const CATEGORY_COLORS = {
  General:   'bg-indigo-100 text-indigo-700',
  Youth:     'bg-blue-100 text-blue-700',
  Women:     'bg-pink-100 text-pink-700',
  Business:  'bg-amber-100 text-amber-700',
  Education: 'bg-purple-100 text-purple-700',
  Religious: 'bg-orange-100 text-orange-700',
  Service:   'bg-emerald-100 text-emerald-700'
};

const GroupCard = ({ group, onJoin, onLeave, onOpen, joiningId }) => {
  const initials   = (group.name || '').substring(0, 2).toUpperCase();
  const colorClass = CATEGORY_COLORS[group.category] || 'bg-purple-100 text-purple-700';
  const memberCount = group.memberCount || group.members?.length || 0;
  const isLoading  = joiningId === group._id;

  return (
    <div
      className="bg-white rounded-[24px] border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_rgba(124,58,237,0.08)] p-4 flex items-center justify-between gap-3.5 transition-all cursor-pointer mb-3.5 hover:-translate-y-0.5 group text-left select-none"
      onClick={() => onOpen(group._id)}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {group.avatar ? (
          <img src={group.avatar} alt={group.name} className="w-12 h-12 rounded-2xl object-cover shadow-xs border border-slate-100" />
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 font-extrabold text-sm flex items-center justify-center border border-purple-100/60 shadow-2xs">
            <Users size={20} className="text-purple-600" />
          </div>
        )}
        {group.type !== 'public' && !group.isJoined && (
          <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-slate-700 text-white rounded-full flex items-center justify-center border-2 border-white shadow-xs">
            <Lock size={9} />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-0.5 gap-2">
          <h3 className="font-extrabold text-slate-800 text-[14.5px] leading-tight truncate group-hover:text-purple-700 transition-colors">{group.name}</h3>
          <span className={`text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full whitespace-nowrap uppercase tracking-wider ${colorClass}`}>
            {group.category || 'Group'}
          </span>
        </div>
        
        <p className="text-[12px] text-slate-500 font-medium truncate mb-1.5 leading-snug">
          {group.description || `A ${group.category || 'community'} group for members`}
        </p>
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Users size={13} className="text-slate-400" />
            <span className="text-[11px] font-extrabold text-slate-500">{memberCount.toLocaleString()} members</span>
          </div>

          <div className="flex items-center gap-2">
            {group.isJoined ? (
              <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                <CheckCheck size={12} />
                <span className="text-[10.5px] font-extrabold">Joined</span>
              </div>
            ) : group.type === 'public' ? (
              <button
                disabled={isLoading}
                onClick={e => { e.stopPropagation(); onJoin(group._id); }}
                className="flex items-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/60 px-3 py-1 rounded-full text-[11.5px] font-extrabold transition-all press-scale disabled:opacity-60 shadow-2xs"
              >
                {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} strokeWidth={2.5} />}
                Join
              </button>
            ) : (
              <span className="text-[10px] font-extrabold text-slate-500 bg-slate-50 border border-slate-200/60 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Private
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Create Group Sheet ────────────────────────────────────────────────────────
const CreateGroupSheet = ({ onClose, onCreated, communityPolicy }) => {
  const { user } = useAuth();
  const { createGroup } = useGroups();
  const [step, setStep]       = useState(1);
  const [name, setName]       = useState('');
  const [desc, setDesc]       = useState('');
  const [type, setType]       = useState('public');
  const [category, setCategory] = useState('General');
  const [avatar, setAvatar]   = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState(null);
  const fileRef = useRef(null);

  const [search, setSearch] = useState('');
  const [membersList, setMembersList] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  React.useEffect(() => {
    if (step === 3) {
      setLoadingMembers(true);
      getMembers({ search, limit: 10, page: 1 })
        .then(res => setMembersList(res.data || []))
        .catch(err => console.error(err))
        .finally(() => setLoadingMembers(false));
    }
  }, [step, search]);

  const toggleMember = (id) => {
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError('Group name is required.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', desc.trim());
      formData.append('type', type);
      formData.append('category', category);
      if (selectedMembers.length > 0) {
        formData.append('initialMembers', JSON.stringify(selectedMembers));
      }
      if (avatar) formData.append('photo', avatar);
      const data = await createGroup(formData);
      onCreated(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group.');
    } finally {
      setSubmitting(false);
    }
  };

  const needsApproval = communityPolicy === 'verified_with_approval'
    && user?.role !== 'head' && user?.role !== 'admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] my-auto border border-purple-100/30 animate-scale-in">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="text-brand-primary font-semibold text-[15px]">← Back</button>
          ) : (
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
          )}
          <h2 className="font-bold text-gray-900 text-[17px]">
            {step === 1 ? 'Create Group' : step === 2 ? 'Group Settings' : 'Add Members'}
          </h2>
          {step < 3 ? (
            <button onClick={() => { if (name.trim()) setStep(step + 1); else setError('Group name is required.'); }}
              className="text-brand-primary font-bold text-[15px]">Next →</button>
          ) : (
            <button onClick={handleCreate} disabled={submitting}
              className="text-brand-primary font-bold text-[15px] disabled:opacity-50">
              {submitting ? 'Creating...' : needsApproval ? 'Submit' : 'Create'}
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          {error && (
            <div className="mx-5 mt-3 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[13px] font-medium flex items-center gap-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {step === 1 && (
            <div className="px-5 py-4 space-y-5">
              {/* Avatar */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-brand-primary/20 to-brand-primary/40 rounded-2xl flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                    {avatarPreview
                      ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                      : <Users size={36} className="text-brand-primary/60" />
                    }
                  </div>
                  <button onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-8 h-8 bg-brand-primary text-white rounded-full flex items-center justify-center shadow-md border-2 border-white">
                    <Camera size={14} />
                  </button>
                  <input type="file" ref={fileRef} accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Group Name *</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)} maxLength={50}
                  placeholder="Enter group name..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-gray-900 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  value={desc} onChange={e => setDesc(e.target.value)} rows={3} maxLength={300}
                  placeholder="What is this group about?"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-gray-900 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 resize-none transition-all"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                  {['General','Youth','Women','Business','Education','Religious','Service'].map(cat => (
                    <button key={cat} onClick={() => setCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-[13px] font-bold transition-all ${
                        category === cat ? 'bg-brand-primary text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="px-5 py-4 space-y-5">
              {/* Group type */}
              <div>
                <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">Group Type</label>
                <div className="space-y-2">
                  {[
                    { id: 'public',    label: 'Public',  desc: 'Anyone in the community can join' },
                    { id: 'private',   label: 'Private', desc: 'Members must be added by admin' }
                  ].map(opt => (
                    <button key={opt.id} onClick={() => setType(opt.id)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                        type === opt.id ? 'border-brand-primary bg-brand-primary/5' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                      }`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        type === opt.id ? 'border-brand-primary' : 'border-gray-300'
                      }`}>
                        {type === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-brand-primary" />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-[14px]">{opt.label}</p>
                        <p className="text-[12px] text-gray-500">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Approval notice */}
              {needsApproval && (
                <div className="flex items-start gap-3 bg-amber-50 rounded-xl p-3.5 border border-amber-200">
                  <Shield size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[13px] text-amber-700 font-medium leading-relaxed">
                    This community requires <strong>head approval</strong> before the group becomes active.
                    Your request will be sent for review.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="px-5 py-4 flex flex-col h-full space-y-4">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search members to invite..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-[13.5px] text-gray-800 focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
                />
              </div>

              <div className="flex-1 overflow-y-auto min-h-[300px]">
                {loadingMembers ? (
                  <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-primary" /></div>
                ) : membersList.length === 0 ? (
                  <div className="text-center text-gray-400 py-10 text-[13px]">No members found</div>
                ) : (
                  <div className="space-y-2">
                    {membersList.map(m => (
                      <div key={m._id} onClick={() => toggleMember(m._id)}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedMembers.includes(m._id) ? 'border-brand-primary bg-brand-primary/5' : 'border-gray-100 hover:border-gray-200'
                        }`}>
                        <div className="flex items-center gap-3">
                          <Avatar src={m.avatar} fallback={m.name} size="md" />
                          <div>
                            <p className="text-[14px] font-bold text-gray-900">{m.name}</p>
                            <p className="text-[12px] text-gray-500">{m.familyId?.headName ? `C/o ${m.familyId.headName}` : 'Member'}</p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                          selectedMembers.includes(m._id) ? 'bg-brand-primary border-brand-primary' : 'border-gray-300'
                        }`}>
                          {selectedMembers.includes(m._id) && <Check size={12} className="text-white" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main GroupsPage ──────────────────────────────────────────────────────────
const GroupsPage = ({ isHub = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { setMobileMenuOpen, markModuleAsVisited } = useData();

  useEffect(() => {
    if (markModuleAsVisited) {
      markModuleAsVisited('groups');
    }
  }, [markModuleAsVisited]);

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchText, setSearchText]         = useState('');
  const [showCreate, setShowCreate]         = useState(false);
  const [joiningId, setJoiningId]           = useState(null);
  const [joinError, setJoinError]           = useState(null);
  const [successMsg, setSuccessMsg]         = useState(null);

  // Use real API data
  const {
    groups, loading, error, total, hasMore,
    loadMore, refresh, joinGroup, leaveGroup
  } = useGroups({
    category: activeCategory !== 'all' && activeCategory !== 'my' ? activeCategory : undefined,
    search: searchText || undefined,
    myGroupsOnly: activeCategory === 'my'
  });

  const [invitations, setInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

  const fetchInvitations = async () => {
    setLoadingInvitations(true);
    try {
      const res = await groupService.getPendingInvitations();
      setInvitations(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInvitations(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleInvitation = async (id, action) => {
    try {
      if (action === 'accept') {
        await groupService.acceptInvitation(id);
        setSuccessMsg('Invitation accepted!');
      } else {
        await groupService.declineInvitation(id);
        setSuccessMsg('Invitation declined');
      }
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchInvitations();
      refresh();
    } catch (err) {
      setJoinError(err.response?.data?.message || 'Failed to process invitation');
      setTimeout(() => setJoinError(null), 3000);
    }
  };

  const handleJoin = useCallback(async (groupId) => {
    setJoiningId(groupId);
    setJoinError(null);
    try {
      await joinGroup(groupId);
      setSuccessMsg('Joined successfully!');
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err) {
      setJoinError(err.response?.data?.message || 'Failed to join group.');
      setTimeout(() => setJoinError(null), 3000);
    } finally {
      setJoiningId(null);
    }
  }, [joinGroup]);

  const handleGroupCreated = useCallback((data) => {
    setShowCreate(false);
    if (data?.group?._id) {
      setSuccessMsg(
        data.group.approvalStatus === 'pending'
          ? 'Group submitted for approval! 📋'
          : 'Group created! 🎉'
      );
      setTimeout(() => setSuccessMsg(null), 3000);
      if (data.group.approvalStatus === 'approved') {
        navigate(`/member/groups/${data.group._id}`);
      }
    }
  }, [navigate]);

  return (
    <div className={`flex flex-col bg-gray-50 ${isHub ? 'h-full' : 'min-h-screen pb-20'}`}>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-0 sticky top-0 z-20 shadow-sm">
        {!isHub && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setMobileMenuOpen && setMobileMenuOpen(true)}
                className="p-1 -ml-1 text-gray-800 hover:text-brand-primary press-scale transition-colors"
                aria-label="Open Menu"
              >
                <Menu size={22} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Groups</h1>
                {total > 0 && <p className="text-[12px] text-gray-400 font-medium mt-0.5">{total} groups in your community</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={refresh} className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-purple-50 transition-colors">
                {loading ? <Loader2 size={17} className="animate-spin text-brand-primary" /> : <RefreshCcw size={17} />}
              </button>
              <button onClick={() => setShowCreate(true)}
                className="w-9 h-9 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-sm hover:bg-brand-primary/90 transition-colors">
                <Plus size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-3 px-4 pt-3 select-none">
          <Search size={16} className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={searchText} onChange={e => setSearchText(e.target.value)}
            placeholder="Search groups..."
            className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2.5 text-[13px] font-extrabold text-slate-800 focus:outline-none focus:border-purple-500/50 focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Category Chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 px-4 scrollbar-hide select-none">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-extrabold whitespace-nowrap transition-all shrink-0 press-scale ${
                activeCategory === cat.id ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toast Messages */}
      {(successMsg || joinError) && (
        <div className={`mx-4 mt-3 px-4 py-2.5 rounded-2xl text-[13px] font-extrabold flex items-center gap-2 shadow-2xs ${
          successMsg ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'
        }`}>
          {successMsg || joinError}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 px-4 py-3 bg-rose-50 border border-rose-200/60 rounded-2xl text-rose-700 text-[13px] font-extrabold flex items-center gap-2">
          <AlertTriangle size={15} /> {error}
          <button onClick={refresh} className="ml-auto underline text-[12px]">Retry</button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-2">
        
        {/* Pending Invitations */}
        {invitations.length > 0 && !searchText && (
          <div className="mb-4 p-4 rounded-[24px] bg-purple-50/60 border border-purple-100/80">
            <h3 className="text-[11px] font-extrabold text-purple-900 uppercase tracking-wider mb-3">Pending Invitations ({invitations.length})</h3>
            <div className="space-y-3">
              {invitations.map(inv => (
                <div key={inv._id} className="bg-white rounded-2xl p-3.5 shadow-2xs border border-purple-100/60 flex flex-col gap-2.5 text-left">
                  <div className="flex items-center gap-3">
                    <Avatar src={inv.group?.avatarUrl} initials={(inv.group?.name || '').substring(0,2).toUpperCase()} size="md" color="bg-purple-100 text-purple-700" />
                    <div>
                      <h4 className="text-[14px] font-extrabold text-slate-800">{inv.group?.name}</h4>
                      <p className="text-[11.5px] text-slate-500 font-medium">Invited by <span className="font-extrabold text-slate-700">{inv.invitedBy?.name}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <button 
                      onClick={() => handleInvitation(inv._id, 'decline')}
                      className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-[12px] font-extrabold hover:bg-slate-200 press-scale"
                    >
                      Decline
                    </button>
                    <button 
                      onClick={() => handleInvitation(inv._id, 'accept')}
                      className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-[12px] font-extrabold shadow-2xs press-scale"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && groups.length === 0 && (
          <div className="space-y-3.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-[24px] h-24 animate-pulse border border-slate-100 p-4 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-100 rounded-md w-3/4" />
                  <div className="h-3 bg-slate-50 rounded-md w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Groups List */}
        {groups.length > 0 && (
          <div className="flex flex-col pb-6">
            {groups.map(group => (
              <GroupCard
                key={group._id}
                group={group}
                onJoin={handleJoin}
                onLeave={leaveGroup}
                onOpen={id => navigate(`/member/groups/${id}`, { state: { from: location.pathname === '/member/groups' ? '/member/groups' : '/member/social', tab: 'groups' } })}
                joiningId={joiningId}
              />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && groups.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6 bg-white rounded-[28px] border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] my-4">
            <div className="w-14 h-14 bg-purple-50 text-purple-600 border border-purple-100/60 rounded-2xl flex items-center justify-center shadow-2xs">
              <Users size={26} />
            </div>
            <div>
              <p className="text-slate-800 font-extrabold text-[15px] mb-1">
                {activeCategory === 'my' ? 'No Joined Groups' : 'No Groups Found'}
              </p>
              <p className="text-slate-400 font-medium text-[12px] max-w-xs">
                {activeCategory === 'my' ? 'Discover and join community groups in your samaj.' : 'Be the first to create a community group!'}
              </p>
            </div>
            <button 
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[12px] font-extrabold rounded-xl shadow-sm press-scale mt-1"
            >
              <Plus size={15} strokeWidth={2.5} /> Create Group
            </button>
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <div className="flex justify-center p-4">
            <button onClick={loadMore} disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 border border-brand-primary/30 text-brand-primary text-[13px] font-bold rounded-xl hover:bg-brand-primary/5 disabled:opacity-50 transition-colors">
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              Load More
            </button>
          </div>
        )}
      </div>

      {/* FAB */}
      {!isHub && (
        <button onClick={() => setShowCreate(true)}
          className="fixed bottom-24 right-5 w-14 h-14 bg-brand-primary text-white rounded-2xl shadow-[0_8px_24px_rgba(124,58,237,0.35)] flex items-center justify-center active:scale-95 transition-transform z-20 hover:bg-brand-primary/90">
          <Plus size={24} />
        </button>
      )}

      {/* Create Group Sheet */}
      {showCreate && (
        <CreateGroupSheet
          onClose={() => setShowCreate(false)}
          onCreated={handleGroupCreated}
          communityPolicy={user?.community?.settings?.groupCreationPolicy || 'head_admin'}
        />
      )}
    </div>
  );
};

export default GroupsPage;
