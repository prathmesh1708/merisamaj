import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, Plus, Search, Filter, CheckCircle2, XCircle,
  Eye, EyeOff, Copy, Check, Edit2, Trash2, Key, Lock,
  Mail, Phone, RefreshCw, AlertCircle, Sparkles, Building2,
  CheckSquare, Square, Layers, ShieldCheck, Heart, Calendar,
  Briefcase, HeartHandshake, Landmark, Flame, Crown, Send, Globe,
  CreditCard, Gift, BarChart3, Settings, LayoutTemplate
} from 'lucide-react';
import { axiosPrivate } from '../../../../core/api/axiosPrivate';

const PERMISSION_CATEGORIES = [
  {
    category: 'User & Community Management',
    icon: Users,
    color: 'from-blue-500/20 to-indigo-500/20 text-indigo-400',
    permissions: [
      { key: 'canViewDashboard', label: 'Dashboard Access', desc: 'Can view platform dashboard and high-level stats' },
      { key: 'canViewUsers', label: 'View Users', desc: 'Can view user listings, profiles and details' },
      { key: 'canAddUsers', label: 'Add Users', desc: 'Can create new users or register members' },
      { key: 'canEditUsers', label: 'Edit Users', desc: 'Can update user profiles and status' },
      { key: 'canDeleteUsers', label: 'Delete Users', desc: 'Can deactivate or delete user accounts' },
      { key: 'canManageCommunities', label: 'Manage Communities', desc: 'Can create and configure Samaj communities' },
      { key: 'canManageCommunityHeads', label: 'Manage Community Heads', desc: 'Can appoint and supervise Community Heads' },
      { key: 'canManageCities', label: 'Manage Cities', desc: 'Can add and configure operational cities' }
    ]
  },
  {
    category: 'Platform Modules',
    icon: Layers,
    color: 'from-purple-500/20 to-pink-500/20 text-purple-400',
    permissions: [
      { key: 'canManageMatrimonial', label: 'Matrimonial Desk', desc: 'Can moderate matrimonial profiles and stories' },
      { key: 'canManageEvents', label: 'Event Management', desc: 'Can manage platform events, bookings and RSVPs' },
      { key: 'canManageProfessionals', label: 'Professional Directory', desc: 'Can approve and manage verified professionals' },
      { key: 'canManageDonations', label: 'Global Donations', desc: 'Can manage donation campaigns and disbursements' },
      { key: 'canManageFunds', label: 'Samaj Funds', desc: 'Can govern central community funds and allocations' },
      { key: 'canManageDharmashala', label: 'Dharmashala Bookings', desc: 'Can manage guest houses, rooms and reservations' },
      { key: 'canManageObituaries', label: 'Obituary Desk', desc: 'Can moderate shradhanjali notices and condolences' },
      { key: 'canManageCensus', label: 'Community Census', desc: 'Can review family census data and updates' },
      { key: 'canManageLeadership', label: 'Leadership Desk', desc: 'Can manage platform board and leadership members' },
      { key: 'canManageInvitations', label: 'Digital Invitations', desc: 'Can supervise ceremonial cards and invites' },
      { key: 'canManageVoting', label: 'Voting & Elections', desc: 'Can manage platform polls, elections and ballots' }
    ]
  },
  {
    category: 'Social & Communication',
    icon: Globe,
    color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400',
    permissions: [
      { key: 'canManageSocial', label: 'Social & Groups', desc: 'Can moderate city/community feeds and user groups' },
      { key: 'canSendNotifications', label: 'Push Notifications & Broadcast', desc: 'Can broadcast push alerts and SMS' }
    ]
  },
  {
    category: 'Operations, Content & System',
    icon: Settings,
    color: 'from-amber-500/20 to-orange-500/20 text-amber-400',
    permissions: [
      { key: 'canManageSubscriptions', label: 'Subscription Management', desc: 'Can manage membership tiers and revenue' },
      { key: 'canManageReferrals', label: 'Referrals & Rewards', desc: 'Can manage referral bonuses and loyalty points' },
      { key: 'canViewReports', label: 'Reports & Analytics', desc: 'Can export reports and view business intelligence' },
      { key: 'canManageShortcuts', label: 'App Shortcuts & Icons', desc: 'Can configure mobile app quick links' },
      { key: 'canManageAppContent', label: 'User App Edits & CMS', desc: 'Can update promotional banners and notices' },
      { key: 'canManageSubHeads', label: 'Sub-Head Management', desc: 'Can view and administer other sub-heads' },
      { key: 'canManageConfig', label: 'System Configuration', desc: 'Can edit platform settings and API keys' }
    ]
  }
];

export const AdminSubHeadManagement = () => {
  const [subHeads, setSubHeads] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubHead, setEditingSubHead] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Credentials visibility state
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    designation: 'Admin Sub-Head',
    department: 'Operations',
    adminPermissions: {}
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSubHeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await axiosPrivate.get(`/admin/sub-heads?${params.toString()}`);
      if (res.data?.status === 'success') {
        setSubHeads(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load sub-heads:', err);
      showToast(err.response?.data?.message || 'Failed to load Sub-Heads', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubHeads();
  }, [searchQuery, statusFilter]);

  const openCreateModal = () => {
    setEditingSubHead(null);
    const defaultPermissions = {};
    PERMISSION_CATEGORIES.forEach(cat => {
      cat.permissions.forEach(p => {
        defaultPermissions[p.key] = p.key === 'canViewDashboard';
      });
    });

    setForm({
      name: '',
      email: '',
      phone: '',
      password: '',
      designation: 'Admin Sub-Head',
      department: 'Operations',
      adminPermissions: defaultPermissions
    });
    setIsModalOpen(true);
  };

  const openEditModal = (subHead) => {
    setEditingSubHead(subHead);
    const permissions = { ...(subHead.adminPermissions || {}) };
    PERMISSION_CATEGORIES.forEach(cat => {
      cat.permissions.forEach(p => {
        if (permissions[p.key] === undefined) {
          permissions[p.key] = false;
        }
      });
    });

    setForm({
      name: subHead.name || '',
      email: subHead.email || '',
      phone: subHead.phone || '',
      password: '',
      designation: subHead.designation || 'Admin Sub-Head',
      department: subHead.department || 'Operations',
      adminPermissions: permissions
    });
    setIsModalOpen(true);
  };

  const handleTogglePermission = (permKey) => {
    setForm(prev => ({
      ...prev,
      adminPermissions: {
        ...prev.adminPermissions,
        [permKey]: !prev.adminPermissions[permKey]
      }
    }));
  };

  const handleToggleCategory = (category, selectAll) => {
    setForm(prev => {
      const updated = { ...prev.adminPermissions };
      category.permissions.forEach(p => {
        updated[p.key] = selectAll;
      });
      return { ...prev, adminPermissions: updated };
    });
  };

  const handlePresetSelect = (preset) => {
    const updated = {};
    PERMISSION_CATEGORIES.forEach(cat => {
      cat.permissions.forEach(p => {
        if (preset === 'all') {
          updated[p.key] = true;
        } else if (preset === 'users') {
          updated[p.key] = ['canViewDashboard', 'canViewUsers', 'canAddUsers', 'canEditUsers', 'canManageCommunities', 'canManageCities'].includes(p.key);
        } else if (preset === 'events') {
          updated[p.key] = ['canViewDashboard', 'canManageEvents', 'canManageSocial', 'canSendNotifications'].includes(p.key);
        } else if (preset === 'finance') {
          updated[p.key] = ['canViewDashboard', 'canManageFunds', 'canManageDonations', 'canViewReports'].includes(p.key);
        } else if (preset === 'clear') {
          updated[p.key] = p.key === 'canViewDashboard';
        }
      });
    });
    setForm(prev => ({ ...prev, adminPermissions: updated }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Name is required', 'error');
      return;
    }
    if (!form.phone && !form.email) {
      showToast('Either Phone or Email is required', 'error');
      return;
    }
    if (!editingSubHead && (!form.password || form.password.length < 6)) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSubHead) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await axiosPrivate.put(`/admin/sub-heads/${editingSubHead._id}`, payload);
        showToast('Admin Sub-Head updated successfully!', 'success');
      } else {
        await axiosPrivate.post('/admin/sub-heads', form);
        showToast('Admin Sub-Head created successfully with credentials!', 'success');
      }
      setIsModalOpen(false);
      fetchSubHeads();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save Admin Sub-Head', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await axiosPrivate.patch(`/admin/sub-heads/${id}/status`);
      showToast(`Status changed successfully`, 'success');
      fetchSubHeads();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to deactivate and remove Admin Sub-Head ${name}?`)) {
      return;
    }
    try {
      await axiosPrivate.delete(`/admin/sub-heads/${id}`);
      showToast('Admin Sub-Head removed successfully', 'success');
      fetchSubHeads();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete Sub-Head', 'error');
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 pb-24 font-sans max-w-7xl mx-auto">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold text-white ${
              toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── PREMIUM HEADER ─── */}
      <div className="relative bg-white border-b border-gray-100 -mt-6 -mx-6 px-8 py-10 shadow-sm overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-indigo-500/5 rounded-full blur-2xl translate-y-1/3" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <Shield size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Admin Sub-Head Management</h1>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-700 tracking-wide uppercase">
                  Privileged Staff
                </span>
              </div>
              <p className="text-gray-500 font-medium text-sm mt-1">
                Create subordinate admin accounts and assign granular module powers & permissions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchSubHeads}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-gray-700 hover:bg-gray-50 transition-all text-sm font-semibold border border-gray-200 shadow-sm"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-purple-600' : ''} />
              Refresh
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:opacity-95 transition-all shadow-lg shadow-purple-500/25 active:scale-95 cursor-pointer"
            >
              <Plus size={18} /> Create New Admin Sub-Head
            </button>
          </div>
        </div>
      </div>

      {/* ─── STATS CARDS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Sub-Heads</p>
            <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.total}</h3>
            <p className="text-xs text-purple-600 font-semibold mt-1">Delegated staff accounts</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Staff</p>
            <h3 className="text-3xl font-black text-emerald-600 mt-1">{stats.active}</h3>
            <p className="text-xs text-emerald-600 font-semibold mt-1">Authorized with login access</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Inactive / Suspended</p>
            <h3 className="text-3xl font-black text-amber-600 mt-1">{stats.inactive}</h3>
            <p className="text-xs text-amber-600 font-semibold mt-1">Disabled access accounts</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <XCircle size={24} />
          </div>
        </div>
      </div>

      {/* ─── SEARCH & CONTROLS ─── */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone, designation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold text-gray-600">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'hover:text-gray-900'}`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'active' ? 'bg-white text-emerald-600 shadow-sm' : 'hover:text-gray-900'}`}
            >
              Active ({stats.active})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'inactive' ? 'bg-white text-amber-600 shadow-sm' : 'hover:text-gray-900'}`}
            >
              Inactive ({stats.inactive})
            </button>
          </div>
        </div>
      </div>

      {/* ─── SUB-HEADS LIST ─── */}
      {loading ? (
        <div className="bg-white rounded-2xl p-16 border border-gray-100 text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-semibold text-sm">Loading Admin Sub-Heads...</p>
        </div>
      ) : subHeads.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 border border-gray-100 text-center space-y-4">
          <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto">
            <Shield size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No Admin Sub-Heads Found</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            {searchQuery ? 'No accounts match your search criteria.' : 'Create your first Admin Sub-Head to delegate management of specific platform modules.'}
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-700 transition-all shadow-md"
          >
            <Plus size={16} /> Create Sub-Head Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {subHeads.map((subHead) => {
            const perms = subHead.adminPermissions || {};
            const allowedCount = Object.values(perms).filter(Boolean).length;
            const isRevealed = revealedPasswords[subHead._id];

            return (
              <motion.div
                key={subHead._id}
                layout
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all space-y-5 relative overflow-hidden flex flex-col justify-between"
              >
                {/* Status indicator bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    subHead.accountStatus === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />

                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 text-purple-600 flex items-center justify-center font-black text-lg border border-purple-200/40">
                        {subHead.name ? subHead.name.charAt(0).toUpperCase() : 'S'}
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-gray-900">{subHead.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                            {subHead.designation || 'Admin Sub-Head'}
                          </span>
                          <span className="text-xs text-gray-400">• {subHead.department || 'Operations'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleStatus(subHead._id, subHead.accountStatus)}
                      className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase transition-all cursor-pointer ${
                        subHead.accountStatus === 'active'
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                      }`}
                    >
                      {subHead.accountStatus}
                    </button>
                  </div>

                  {/* Credentials / Contact Box */}
                  <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-gray-600">
                      <span className="font-medium flex items-center gap-2">
                        <Mail size={14} className="text-gray-400" />
                        {subHead.email || 'No email set'}
                      </span>
                      {subHead.phone && (
                        <span className="font-medium flex items-center gap-2">
                          <Phone size={14} className="text-gray-400" />
                          {subHead.phone}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Key size={14} className="text-purple-600" />
                        <span className="font-semibold">Login ID:</span>
                        <code className="bg-white px-2 py-0.5 rounded border border-gray-200 text-purple-700 font-mono">
                          {subHead.loginId || subHead.email || subHead.phone}
                        </code>
                      </div>

                      {subHead.plainPassword && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500 font-medium">Pass:</span>
                          <code className="bg-white px-2 py-0.5 rounded border border-gray-200 font-mono text-gray-900">
                            {isRevealed ? subHead.plainPassword : '••••••••'}
                          </code>
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedPasswords(prev => ({
                                ...prev,
                                [subHead._id]: !prev[subHead._id]
                              }))
                            }
                            className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors cursor-pointer"
                            title={isRevealed ? 'Hide Password' : 'Show Password'}
                          >
                            {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(subHead.plainPassword, subHead._id)}
                            className="p-1 text-gray-400 hover:text-purple-600 rounded transition-colors cursor-pointer"
                            title="Copy Password"
                          >
                            {copiedId === subHead._id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Permissions Summary Badges */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Assigned Modules ({allowedCount})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                      {allowedCount === 0 ? (
                        <span className="text-xs text-gray-400 italic">No modules assigned yet</span>
                      ) : (
                        PERMISSION_CATEGORIES.flatMap(cat => cat.permissions)
                          .filter(p => perms[p.key] === true)
                          .map(p => (
                            <span
                              key={p.key}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-100 flex items-center gap-1"
                            >
                              <Check size={11} className="text-purple-600 shrink-0" />
                              {p.label}
                            </span>
                          ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between mt-4">
                  <span className="text-[11px] text-gray-400">
                    Added on {new Date(subHead.createdAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(subHead)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-purple-50 hover:text-purple-700 text-gray-700 text-xs font-bold transition-all cursor-pointer"
                    >
                      <Edit2 size={13} /> Edit Powers
                    </button>
                    <button
                      onClick={() => handleDelete(subHead._id, subHead.name)}
                      className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all cursor-pointer"
                      title="Deactivate Sub-Head"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ─── CREATE / EDIT MODAL ─── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-8 py-6 bg-gradient-to-r from-gray-900 via-indigo-950 to-purple-950 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-purple-300">
                    <Shield size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black">
                      {editingSubHead ? 'Edit Admin Sub-Head & Permissions' : 'Create New Admin Sub-Head'}
                    </h3>
                    <p className="text-xs text-purple-200/70 mt-0.5">
                      Configure login credentials and select specific platform power toggles.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <XCircle size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                {/* 1. Account Details */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black tracking-widest text-gray-400 uppercase flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px]">1</span>
                    Sub-Head Information & Login Credentials
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Vikram Sharma"
                        value={form.name}
                        onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-600 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Designation Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Deputy Platform Administrator"
                        value={form.designation}
                        onChange={(e) => setForm(prev => ({ ...prev, designation: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-600 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Official Email Address</label>
                      <input
                        type="email"
                        placeholder="subhead@merisamaj.com"
                        value={form.email}
                        onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-600 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Mobile Phone Number</label>
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={form.phone}
                        onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-600 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Department / Cell</label>
                      <input
                        type="text"
                        placeholder="e.g. Member Verification Cell"
                        value={form.department}
                        onChange={(e) => setForm(prev => ({ ...prev, department: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-600 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        {editingSubHead ? 'Reset Password (Leave blank to keep existing)' : 'Login Password *'}
                      </label>
                      <input
                        type="text"
                        placeholder={editingSubHead ? 'Enter new password...' : 'Minimum 6 characters'}
                        value={form.password}
                        onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-600 transition-colors font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Permission Matrix */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="text-xs font-black tracking-widest text-gray-400 uppercase flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px]">2</span>
                      Granular Module Permissions & Access Rights
                    </h4>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-gray-400 mr-1">Presets:</span>
                      <button
                        type="button"
                        onClick={() => handlePresetSelect('all')}
                        className="px-2 py-1 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                      >
                        All Access
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetSelect('users')}
                        className="px-2 py-1 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                      >
                        User Manager
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetSelect('finance')}
                        className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        Fund Governance
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetSelect('clear')}
                        className="px-2 py-1 rounded-md text-[10px] font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {PERMISSION_CATEGORIES.map((cat) => {
                      const CatIcon = cat.icon;
                      const allSelected = cat.permissions.every(p => form.adminPermissions[p.key]);
                      const someSelected = cat.permissions.some(p => form.adminPermissions[p.key]);

                      return (
                        <div key={cat.category} className="bg-gray-50/70 rounded-2xl p-5 border border-gray-200/70 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center shrink-0`}>
                                <CatIcon size={16} />
                              </div>
                              <span className="text-sm font-black text-gray-900">{cat.category}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleCategory(cat, !allSelected)}
                              className="text-xs font-bold text-purple-600 hover:text-purple-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              {allSelected ? (
                                <>
                                  <CheckSquare size={14} className="text-purple-600" /> Deselect All
                                </>
                              ) : (
                                <>
                                  <Square size={14} /> Select All
                                </>
                              )}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            {cat.permissions.map((p) => {
                              const isChecked = form.adminPermissions[p.key] === true;

                              return (
                                <div
                                  key={p.key}
                                  onClick={() => handleTogglePermission(p.key)}
                                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 select-none ${
                                    isChecked
                                      ? 'bg-purple-50/80 border-purple-300 shadow-sm'
                                      : 'bg-white border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className={`text-xs font-bold ${isChecked ? 'text-purple-950' : 'text-gray-800'}`}>
                                        {p.label}
                                      </p>
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{p.desc}</p>
                                  </div>

                                  <div
                                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                      isChecked
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'border border-gray-300 bg-white'
                                    }`}
                                  >
                                    {isChecked && <Check size={13} />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 shadow-lg shadow-purple-500/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Saving Sub-Head...' : editingSubHead ? 'Update Sub-Head' : 'Create Admin Sub-Head'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminSubHeadManagement;
