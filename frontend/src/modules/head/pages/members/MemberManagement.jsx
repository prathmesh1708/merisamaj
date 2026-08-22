import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, CheckCircle2, Heart, Calendar, Search, ShieldAlert, Sparkles, Send, Plus, 
  ChevronRight, X, Eye, MapPin, Clock, ArrowUpRight, BarChart3, FileText, Check, 
  AlertCircle, RefreshCw, Trash2, ShieldCheck, Filter, Download, Grid, List, 
  EyeOff, AlertTriangle, ArrowUpDown, ChevronDown, UserPlus, HelpCircle
} from 'lucide-react';
import { useData } from '../../../member/context/DataProvider';
import { Avatar } from '../../../member/components/common/Avatar';
import { useHeadAuth } from '../../auth/useHeadAuth';
import { filterMembersForHead } from '../../utils/headCommunityFilter';

export const MemberManagement = () => {
  const { headAuth } = useHeadAuth();
  const { members, verifyMember, rejectMember, currentUser } = useData();

  const headUser = headAuth?.headUser || currentUser;

  const headCommunityName = useMemo(() => {
    if (Array.isArray(headUser?.assignedCommunityIds) && headUser.assignedCommunityIds.length > 0) {
      return headUser.assignedCommunityIds.map(c => typeof c === 'string' ? c : c.name || c._id).join(', ');
    }
    if (headUser?.community) return headUser.community;
    if (headUser?.communityId?.name) return headUser.communityId.name;
    return "Assigned Samaj Communities";
  }, [headUser]);

  // Local state representing the local scope of members for the current Samaj (head's assigned community)
  const assignedMembers = useMemo(() => filterMembersForHead(members || [], headUser), [members, headUser]);

  const communityMembers = useMemo(() => {
    return assignedMembers.map(m => {
      const cityName = typeof m.city === 'object' && m.city?.name ? m.city.name : (m.city || (Number(m.id || 1) % 2 === 0 ? 'Indore' : 'Bhopal'));
      return {
        ...m,
        city: cityName,
        memberId: m.memberId || `AS-${1000 + Number(m.id || 1)}`,
        email: m.email || `${(m.name || 'member').toLowerCase().replace(/\s/g, '')}@gmail.com`,
        gender: m.gender || (Number(m.id || 1) % 2 === 0 ? 'Female' : 'Male'),
        ageGroup: m.ageGroup || (Number(m.id || 1) % 3 === 0 ? 'Senior (60+)' : Number(m.id || 1) % 3 === 1 ? 'Youth (18-35)' : 'Adult (36-59)'),
        maritalStatus: m.maritalStatus || (Number(m.id || 1) % 2 === 0 ? 'Unmarried' : 'Married'),
        bloodGroup: m.bloodGroup || (Number(m.id || 1) % 4 === 0 ? 'B+' : Number(m.id || 1) % 4 === 1 ? 'A+' : 'O+'),
        familySize: m.familySize || (Number(m.id || 1) % 3 + 2),
        registrationDate: m.registrationDate || '2026-06-12',
        lastActive: m.lastActive || '2 Hrs ago',
        area: m.area || (Number(m.id || 1) % 2 === 0 ? 'Vijay Nagar' : 'Saket'),
        familyMembers: m.familyMembers || [
          { name: `${(m.name || 'Member').split(' ')[0]}'s Spouse`, relationship: 'Spouse', occupation: 'Homemaker', age: 34, isVerified: true },
          { name: `${(m.name || 'Member').split(' ')[0]}'s Child`, relationship: 'Son', occupation: 'Student', age: 12, isVerified: false }
        ],
        activities: [
          { date: '2026-07-06', time: '11:20 AM', action: 'Log In', status: 'Success', device: 'Chrome / Windows', location: 'Indore, India' },
          { date: '2026-07-05', time: '04:15 PM', action: 'Profile Update', status: 'Success', device: 'Safari / iPhone', location: 'Indore, India' }
        ]
      };
    });
  }, [assignedMembers]);

  // Derive unique cities dynamically from community members
  const uniqueCities = useMemo(() => {
    const set = new Set();
    communityMembers.forEach(m => {
      if (m.city) set.add(m.city.trim());
    });
    return Array.from(set).sort();
  }, [communityMembers]);

  // Tab View Mode
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'directory'

  // Advanced Filters States
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    city: 'all',
    area: 'all',
    gender: 'all',
    ageGroup: 'all',
    profession: 'all',
    maritalStatus: 'all',
    bloodGroup: 'all',
    verification: 'all',
    familySize: 'all'
  });
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'alphabetical' | 'active'

  // Selection & UI States
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeDrawerMember, setActiveDrawerMember] = useState(null); // Member object for profile drawer
  const [activeModal, setActiveModal] = useState(null); // 'add' | 'verify_doc' | 'status_confirm' | 'bulk_action' | null
  const [selectedMemberForStatus, setSelectedMemberForStatus] = useState(null);
  const [targetStatus, setTargetStatus] = useState(null);
  const [toast, setToast] = useState(null);

  // Form State for Adding Member
  const [addForm, setAddForm] = useState({
    name: '', phone: '', city: '', profession: '', gender: 'Male', ageGroup: 'Adult (36-59)', maritalStatus: 'Married', bloodGroup: 'O+'
  });

  // Details drawer active tab
  const [drawerTab, setDrawerTab] = useState('profile'); // 'profile' | 'family' | 'activities'

  // Document verification modal state
  const [verificationDoc, setVerificationDoc] = useState(null);

  // Toast Trigger Helper
  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // Filter Reset
  const handleResetFilters = () => {
    setFilters({
      city: 'all', area: 'all', gender: 'all', ageGroup: 'all', profession: 'all', maritalStatus: 'all', bloodGroup: 'all', verification: 'all', familySize: 'all'
    });
    setSearchQuery('');
    setSortBy('newest');
    showToast('Filters reset successfully');
  };

  // Filtered & Sorted Members
  const filteredMembers = useMemo(() => {
    let result = communityMembers.filter(m => {
      const matchText = searchQuery.trim().toLowerCase();
      const name = (m.name || '').toLowerCase();
      const phone = String(m.phone || '');
      const memberId = (m.memberId || '').toLowerCase();
      const email = (m.email || '').toLowerCase();

      const matchesSearch = !matchText || 
                            name.includes(matchText) ||
                            phone.includes(matchText) ||
                            memberId.includes(matchText) ||
                            email.includes(matchText);

      const memberCity = (m.city || '').trim().toLowerCase();
      const filterCity = (filters.city || 'all').trim().toLowerCase();
      const matchesCity = filterCity === 'all' || memberCity === filterCity;

      const memberArea = (m.area || '').trim().toLowerCase();
      const filterArea = (filters.area || 'all').trim().toLowerCase();
      const matchesArea = filterArea === 'all' || memberArea === filterArea;

      const rawGender = (m.gender || m.sex || '').trim().toLowerCase();
      const filterGender = (filters.gender || 'all').trim().toLowerCase();
      let matchesGender = filterGender === 'all';
      if (!matchesGender) {
        if (filterGender === 'male') {
          matchesGender = rawGender === 'male' || rawGender === 'm' || rawGender.startsWith('m');
        } else if (filterGender === 'female') {
          matchesGender = rawGender === 'female' || rawGender === 'f' || rawGender.startsWith('f');
        } else {
          matchesGender = rawGender === filterGender;
        }
      }

      const matchesAge = filters.ageGroup === 'all' || m.ageGroup === filters.ageGroup;
      const matchesProfession = filters.profession === 'all' || (m.profession && m.profession.toLowerCase() === filters.profession.toLowerCase());
      const matchesMarital = filters.maritalStatus === 'all' || m.maritalStatus === filters.maritalStatus;
      const matchesBlood = filters.bloodGroup === 'all' || m.bloodGroup === filters.bloodGroup;

      const isVerified = Boolean(m.isVerified || m.status === 'verified');
      const matchesVerification = filters.verification === 'all' || 
                                 (filters.verification === 'verified' && isVerified) || 
                                 (filters.verification === 'pending' && !isVerified);

      return matchesSearch && matchesCity && matchesArea && matchesGender && matchesAge && matchesProfession && matchesMarital && matchesBlood && matchesVerification;
    });

    // Safe Sorting
    const sorted = [...result];
    if (sortBy === 'newest') {
      sorted.sort((a, b) => {
        const idA = Number(a.id) || 0;
        const idB = Number(b.id) || 0;
        if (idA && idB) return idB - idA;
        return String(b.registrationDate || '').localeCompare(String(a.registrationDate || ''));
      });
    } else if (sortBy === 'oldest') {
      sorted.sort((a, b) => {
        const idA = Number(a.id) || 0;
        const idB = Number(b.id) || 0;
        if (idA && idB) return idA - idB;
        return String(a.registrationDate || '').localeCompare(String(b.registrationDate || ''));
      });
    } else if (sortBy === 'alphabetical') {
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return sorted;
  }, [communityMembers, searchQuery, filters, sortBy]);

  // Dynamic statistics
  const stats = useMemo(() => {
    const total = communityMembers.length;
    const pending = communityMembers.filter(m => !m.isVerified).length;
    const verified = communityMembers.filter(m => m.isVerified).length;
    const active = communityMembers.filter(m => !m.suspended).length; // active if not suspended in mock
    return { total, pending, verified, active };
  }, [communityMembers]);

  // Bulk operation handlers
  const handleBulkAction = (action) => {
    if (selectedIds.length === 0) {
      showToast('Select members first');
      return;
    }
    if (action === 'verify') {
      selectedIds.forEach(id => verifyMember(id));
      showToast(`Bulk verified ${selectedIds.length} members successfully!`);
    } else if (action === 'suspend') {
      showToast(`Bulk suspended ${selectedIds.length} members successfully!`);
    } else if (action === 'activate') {
      showToast(`Bulk activated ${selectedIds.length} members!`);
    }
    setSelectedIds([]);
  };

  // Add Member submit
  const handleAddMember = (e) => {
    e.preventDefault();
    if (!addForm.name || !addForm.phone) {
      showToast('Please fill in required fields');
      return;
    }

    // In a real app we would call context.addMember, here we mock a success response
    showToast(`Successfully registered ${addForm.name} to community!`);
    setAddForm({ name: '', phone: '', city: '', profession: '', gender: 'Male', ageGroup: 'Adult (36-59)', maritalStatus: 'Married', bloodGroup: 'O+' });
    setActiveModal(null);
  };

  // Status adjustment callback with confirmation prompt
  const triggerStatusChange = (member, status) => {
    setSelectedMemberForStatus(member);
    setTargetStatus(status);
    setActiveModal('status_confirm');
  };

  const confirmStatusChange = () => {
    if (targetStatus === 'verify') {
      verifyMember(selectedMemberForStatus.id);
      showToast(`Account verified for ${selectedMemberForStatus.name}!`);
    } else if (targetStatus === 'suspend') {
      showToast(`Account suspended for ${selectedMemberForStatus.name}`);
    } else if (targetStatus === 'activate') {
      showToast(`Account activated for ${selectedMemberForStatus.name}`);
    } else if (targetStatus === 'remove') {
      showToast(`Account soft-deleted for ${selectedMemberForStatus.name}`);
    }
    setActiveModal(null);
  };

  // Export engine
  const handleExport = (format) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredMembers, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `samaj_members_export.${format.toLowerCase()}`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Exported ${filteredMembers.length} records in ${format} format!`);
  };

  const handleApprove = (id, name) => {
    verifyMember(id);
    showToast(`Approved membership for ${name}!`);
    if (verificationDoc?.id === id) setVerificationDoc(null);
    if (activeDrawerMember?.id === id) setActiveDrawerMember(null);
  };

  const handleReject = (id, name) => {
    rejectMember(id);
    showToast(`Rejected membership for ${name}`);
    if (verificationDoc?.id === id) setVerificationDoc(null);
    if (activeDrawerMember?.id === id) setActiveDrawerMember(null);
  };

  return (
    <div className="space-y-6 pb-16 relative">
      
      {/* ─── TOAST NOTIFICATION ─── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border bg-emerald-50 border-emerald-200 text-emerald-700 text-xs font-semibold"
          >
            <CheckCircle2 size={16} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── PAGE HEADER & STATS ─── */}
      <section className="bg-white p-4 sm:p-6 border border-slate-100 rounded-2xl shadow-sm relative overflow-hidden flex flex-col gap-4 sm:gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none" />
        
        {/* Header (Web View Only) */}
        <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                Member Directory Governance
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Council Head Executive Panel: {headCommunityName}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button 
              onClick={() => setActiveModal('add')}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-500/10 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <UserPlus size={14} /> Add Member
            </button>
            
            {/* Export options */}
            <div className="relative group">
              <button className="px-3.5 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-650 text-xs font-semibold border border-slate-200/80 flex items-center gap-1.5 cursor-pointer">
                <Download size={14} /> Export <ChevronDown size={12} />
              </button>
              <div className="absolute right-0 top-full mt-1.5 w-36 bg-white border border-slate-100 rounded-xl overflow-hidden shadow-xl invisible group-hover:visible z-20 transition-all duration-200">
                {['CSV', 'Excel', 'PDF'].map((fmt) => (
                  <button 
                    key={fmt}
                    onClick={() => handleExport(fmt)}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer"
                  >
                    Export as {fmt}
                  </button>
                ))}
                <button 
                  onClick={() => window.print()}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 border-t border-slate-100 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer"
                >
                  Print Directory
                </button>
              </div>
            </div>

            <div className="flex bg-slate-50 border border-slate-200/80 rounded-lg p-0.5">
              <button 
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'table' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <List size={14} />
              </button>
              <button 
                onClick={() => setViewMode('directory')}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'directory' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Grid size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic counters grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Samaj Members</span>
            <h3 className="text-xl font-bold text-slate-800 mt-1">{stats.total}</h3>
          </div>
          <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100">
            <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">Pending Approvals</span>
            <h3 className="text-xl font-bold text-amber-600 mt-1">{stats.pending}</h3>
          </div>
          <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100">
            <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">Verified Accounts</span>
            <h3 className="text-xl font-bold text-emerald-600 mt-1">{stats.verified}</h3>
          </div>
          <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100">
            <span className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">Active Members</span>
            <h3 className="text-xl font-bold text-indigo-600 mt-1">{stats.active}</h3>
          </div>
        </div>

      </section>

      {/* ─── FILTERS & CONTROLS ─── */}
      <section className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search box */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search directory by Name, Mobile, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50/50 border border-slate-200/80 rounded-lg text-xs text-slate-850 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* City */}
            <select 
              value={filters.city}
              onChange={(e) => setFilters({...filters, city: e.target.value})}
              className="bg-slate-50/50 border border-slate-200/80 rounded-lg px-3 py-2 text-xs text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200 cursor-pointer"
            >
              <option value="all">All Cities</option>
              {uniqueCities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Gender */}
            <select 
              value={filters.gender}
              onChange={(e) => setFilters({...filters, gender: e.target.value})}
              className="bg-slate-50/50 border border-slate-200/80 rounded-lg px-3 py-2 text-xs text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200 cursor-pointer"
            >
              <option value="all">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>

            {/* Verification */}
            <select 
              value={filters.verification}
              onChange={(e) => setFilters({...filters, verification: e.target.value})}
              className="bg-slate-50/50 border border-slate-200/80 rounded-lg px-3 py-2 text-xs text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200 cursor-pointer"
            >
              <option value="all">Verification Status</option>
              <option value="verified">Verified Only</option>
              <option value="pending">Pending Only</option>
            </select>
          </div>
        </div>

        {/* Filter Action panel */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Filtered: {filteredMembers.length} Accounts found</span>
          <button 
            onClick={handleResetFilters}
            className="text-[10px] font-semibold text-rose-500 hover:text-rose-600 uppercase tracking-wider cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      </section>

      {/* ─── STICKY BULK ACTIONS BAR ─── */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 border border-slate-800 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 text-xs font-semibold text-white animate-slide-up">
          <span>{selectedIds.length} members selected</span>
          <div className="h-4 w-[1px] bg-white/15" />
          <div className="flex gap-2">
            <button onClick={() => handleBulkAction('verify')} className="px-3 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-white rounded-lg transition-all border border-emerald-500/25 cursor-pointer">Approve</button>
            <button onClick={() => handleBulkAction('suspend')} className="px-3 py-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-white rounded-lg transition-all border border-amber-500/25 cursor-pointer">Suspend</button>
            <button onClick={() => setSelectedIds([])} className="px-2 py-1 text-slate-400 hover:text-white cursor-pointer">Cancel</button>
          </div>
        </div>
      )}

      {/* ─── PRIMARY CONTENT SWITCH ─── */}
      {viewMode === 'table' ? (
        /* TABLE LIST VIEW */
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white">
            <table className="w-full text-left border-collapse text-xs text-slate-700">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider bg-slate-50/50">
                  <th className="p-3.5 w-10">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.length === filteredMembers.length && filteredMembers.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(filteredMembers.map(m => m.id));
                        else setSelectedIds([]);
                      }}
                      className="w-4 h-4 rounded bg-slate-50 border-slate-200 accent-indigo-600 cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5">Member Details</th>
                  <th className="p-3.5">Member ID</th>
                  <th className="p-3.5">Contact</th>
                  <th className="p-3.5">Family size</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      No members match the query filters.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => {
                    const isChecked = selectedIds.includes(member.id);
                    return (
                      <tr key={member.id} className="hover:bg-slate-50/40 transition-all">
                        <td className="p-3.5">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) setSelectedIds(selectedIds.filter(id => id !== member.id));
                              else setSelectedIds([...selectedIds, member.id]);
                            }}
                            className="w-4 h-4 rounded bg-slate-50 border-slate-200 accent-indigo-600 cursor-pointer"
                          />
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar initials={member.initials} size="sm" imageUrl={member.avatar} />
                            <div>
                              <h4 className="font-semibold text-slate-800 leading-tight">{member.name}</h4>
                              <p className="text-[11px] text-slate-400 mt-0.5">{member.city} • {member.profession || 'Business'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono tracking-wider text-indigo-600 font-semibold">{member.memberId}</td>
                        <td className="p-3.5">
                          <p className="text-slate-800 font-semibold">{member.phone}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">{member.email}</p>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-700">{member.familySize} Members</td>
                        <td className="p-3.5">
                          {member.isVerified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100/60">
                              <ShieldCheck size={9} /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-100/60 animate-pulse">
                              <AlertCircle size={9} /> Pending
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button 
                              onClick={() => setActiveDrawerMember(member)}
                              className="p-1.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-500 cursor-pointer transition-all"
                            >
                              <Eye size={12} />
                            </button>
                            {!member.isVerified ? (
                              <button 
                                onClick={() => setVerificationDoc(member)}
                                className="px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100/60 text-[10px] font-semibold transition-all cursor-pointer"
                              >
                                Audit
                              </button>
                            ) : (
                              <button 
                                onClick={() => triggerStatusChange(member, 'suspend')}
                                className="px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100/60 text-[10px] font-semibold transition-all cursor-pointer"
                              >
                                Suspend
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW DIRECTORY */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => (
            <div key={member.id} className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm flex flex-col justify-between space-y-4 hover:border-indigo-150 hover:shadow-md transition-all duration-200">
              <div className="flex items-start gap-4">
                <Avatar initials={member.initials} size="md" imageUrl={member.avatar} />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-slate-800 truncate leading-tight">{member.name}</h4>
                  <p className="text-xs text-indigo-600 font-semibold mt-0.5 truncate">{member.profession || 'Business'}</p>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1"><MapPin size={10} /> {member.city}</p>
                </div>
              </div>

              <div className="pt-3.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-slate-50/50 border border-slate-100">
                  <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider block">Family Count</span>
                  <span className="font-semibold text-slate-700 mt-0.5 block">{member.familySize} Members</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50/50 border border-slate-100">
                  <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider block">Verification</span>
                  <span className={`font-bold mt-0.5 block ${member.isVerified ? 'text-emerald-600' : 'text-amber-600 animate-pulse'}`}>
                    {member.isVerified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button 
                  onClick={() => setActiveDrawerMember(member)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-650 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-lg transition-all cursor-pointer"
                >
                  View Profile
                </button>
                {!member.isVerified && (
                  <button 
                    onClick={() => setVerificationDoc(member)}
                    className="flex-1 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-500/10 transition-all cursor-pointer"
                  >
                    Audit Credentials
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── MEMBER DETAILS VIEW SIDE DRAWER ─── */}
      <AnimatePresence>
        {activeDrawerMember && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveDrawerMember(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Slide Box */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-lg h-full bg-white border-l border-slate-150 shadow-2xl relative z-10 flex flex-col p-6 overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <Avatar initials={activeDrawerMember.initials} size="md" imageUrl={activeDrawerMember.avatar} />
                  <div>
                    <h3 className="text-md font-bold text-slate-800">{activeDrawerMember.name}</h3>
                    <p className="text-[10px] text-indigo-600 font-semibold tracking-wider uppercase">{activeDrawerMember.memberId}</p>
                  </div>
                </div>
                <button onClick={() => setActiveDrawerMember(null)} className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              {/* Tabs selector */}
              <div className="flex border-b border-slate-100 mb-4">
                {['profile', 'family', 'activities'].map((tab) => (
                  <button 
                    key={tab}
                    onClick={() => setDrawerTab(tab)}
                    className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wider transition-all relative cursor-pointer ${
                      drawerTab === tab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-650'
                    }`}
                  >
                    {tab}
                    {drawerTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-650" />
                    )}
                  </button>
                ))}
              </div>

              {/* Scrollable Contents */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {drawerTab === 'profile' && (
                  <div className="space-y-4 text-xs text-slate-600">
                    <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-xl space-y-2">
                      <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block mb-1">Contact details</h4>
                      <p><strong>Mobile:</strong> {activeDrawerMember.phone}</p>
                      <p><strong>Email:</strong> {activeDrawerMember.email}</p>
                      <p><strong>Gotra/Sub-gotra:</strong> Garg / Agrawal</p>
                      <p><strong>Blood Group:</strong> {activeDrawerMember.bloodGroup}</p>
                    </div>

                    <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-xl space-y-2">
                      <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block mb-1">Profession Details</h4>
                      <p><strong>Profession:</strong> {activeDrawerMember.profession || 'CA'}</p>
                      <p><strong>Location:</strong> {activeDrawerMember.area}, {activeDrawerMember.city}</p>
                    </div>
                  </div>
                )}

                {drawerTab === 'family' && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block mb-1 flex items-center justify-between">
                      <span>Family Tree Nodes</span>
                      <button onClick={() => showToast('Redirected to node configuration')} className="text-[9px] text-indigo-500 uppercase cursor-pointer">+ Add node</button>
                    </h4>
                    
                    {activeDrawerMember.familyMembers.map((fm, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-white border border-slate-100 flex items-center justify-between text-xs text-slate-600 shadow-sm">
                        <div>
                          <p className="font-semibold text-slate-800">{fm.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{fm.relationship} • {fm.occupation} • Age: {fm.age}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-semibold uppercase ${fm.isVerified ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' : 'bg-amber-50 text-amber-600 border border-amber-100/50'}`}>
                          {fm.isVerified ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {drawerTab === 'activities' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block mb-1">Auditable activity timeline</h4>
                    <div className="space-y-3 relative pl-4 border-l border-slate-100 ml-2">
                      {activeDrawerMember.activities.map((act, idx) => (
                        <div key={idx} className="relative space-y-1">
                          <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-600 border-2 border-white" />
                          <div className="p-3 rounded-xl bg-white border border-slate-100 text-xs text-slate-600 shadow-sm">
                            <span className="font-semibold text-slate-850">{act.action}</span>
                            <span className="text-[9px] text-slate-450 block mt-0.5">{act.date} {act.time} • {act.device}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action commands */}
              <div className="border-t border-slate-100 pt-4 mt-auto flex gap-3">
                <button 
                  onClick={() => triggerStatusChange(activeDrawerMember, 'suspend')}
                  className="flex-1 py-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100/60 font-semibold transition-all text-center text-xs cursor-pointer"
                >
                  Suspend Account
                </button>
                <button 
                  onClick={() => triggerStatusChange(activeDrawerMember, 'verify')}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-500/10 transition-all text-center text-xs cursor-pointer"
                >
                  Verify Member
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── DOCUMENT VERIFICATION ARCHIVE DRAWER ─── */}
      <AnimatePresence>
        {verificationDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setVerificationDoc(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-md bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-2xl relative z-10 p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-md font-bold text-slate-800">Document Audit Desk</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Auditing: {verificationDoc.name}</p>
                </div>
                <button onClick={() => setVerificationDoc(null)} className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="w-full aspect-[4/3] rounded-xl bg-gradient-to-br from-indigo-950 to-indigo-900 p-4 border border-indigo-950/20 flex flex-col justify-between text-white select-none relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full filter blur-xl pointer-events-none" />
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-[10px] font-bold tracking-wider text-purple-350">INDORE SAMAJ ARCHIVE</h4>
                    <p className="text-[7px] text-purple-400 font-bold uppercase mt-0.5">Identity Verification Card</p>
                  </div>
                  <span className="w-6 h-6 rounded bg-amber-500/20 text-[9px] flex items-center justify-center">🇮🇳</span>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <Avatar initials={verificationDoc.initials} size="md" />
                  <div>
                    <p className="text-xs font-bold">{verificationDoc.name}</p>
                    <p className="text-[8px] text-purple-300">City: {verificationDoc.city}</p>
                    <p className="text-[8px] text-purple-300">S/o or W/o Details Attached</p>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-2 flex items-center justify-between text-[9px] font-mono tracking-widest text-purple-300/80">
                  <span>9024 1002 9948</span>
                  <span className="text-[7px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-sans font-bold">DIGI-SIGNED</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => handleReject(verificationDoc.id, verificationDoc.name)}
                  className="flex-1 py-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold border border-rose-100/60 active:scale-95 transition-all text-center cursor-pointer"
                >
                  Reject Proof
                </button>
                <button 
                  onClick={() => handleApprove(verificationDoc.id, verificationDoc.name)}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm active:scale-95 transition-all text-center cursor-pointer"
                >
                  Approve & Verify
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── CONFIRMATION STATE CHANGE MODAL ─── */}
      <AnimatePresence>
        {activeModal === 'status_confirm' && selectedMemberForStatus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-sm bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-2xl relative z-10 p-6 space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-500">
                <AlertTriangle size={24} className="animate-pulse" />
                <h3 className="text-md font-bold text-slate-800">Confirm Action</h3>
              </div>

              <p className="text-xs text-slate-650 leading-relaxed">
                Are you sure you want to change the status of <strong>{selectedMemberForStatus.name}</strong> to: <strong>{targetStatus}</strong>? This action updates directory databases and triggers system notifications.
              </p>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 text-xs font-semibold transition-all text-center cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmStatusChange}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm active:scale-95 transition-all text-center cursor-pointer"
                >
                  Confirm Action
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── ADD MEMBER POPUP MODAL ─── */}
      <AnimatePresence>
        {activeModal === 'add' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-md bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-2xl relative z-10 p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                  <UserPlus size={18} className="text-indigo-650" />
                  Add Community Member
                </h3>
                <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddMember} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Full Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g., Rajesh Kumar Agrawal" 
                    value={addForm.name}
                    onChange={(e) => setAddForm({...addForm, name: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50/40 border border-slate-200/80 rounded-lg outline-none focus:ring-2 focus:ring-indigo-50 focus:border-indigo-200 text-sm text-slate-800 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Mobile Number *</label>
                  <input 
                    type="tel" 
                    required
                    placeholder="e.g., +91 90248 12848" 
                    value={addForm.phone}
                    onChange={(e) => setAddForm({...addForm, phone: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50/40 border border-slate-200/80 rounded-lg outline-none focus:ring-2 focus:ring-indigo-50 focus:border-indigo-200 text-sm text-slate-800 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">City Location</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Indore" 
                      value={addForm.city}
                      onChange={(e) => setAddForm({...addForm, city: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-slate-50/40 border border-slate-200/80 rounded-lg outline-none focus:ring-2 focus:ring-indigo-50 focus:border-indigo-200 text-sm text-slate-800 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Profession</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Software Architect" 
                      value={addForm.profession}
                      onChange={(e) => setAddForm({...addForm, profession: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-slate-50/40 border border-slate-200/80 rounded-lg outline-none focus:ring-2 focus:ring-indigo-50 focus:border-indigo-200 text-sm text-slate-800 transition-all"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm shadow-indigo-500/10 active:scale-95 transition-all cursor-pointer"
                >
                  Register Member Profile
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default MemberManagement;
