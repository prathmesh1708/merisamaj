import React, { useState, useEffect } from 'react';
import {
  MapPin, Plus, Edit, Trash2, Loader, CheckCircle2,
  XCircle, Mail, Phone, RefreshCw, Eye, EyeOff, Copy, Check, Shield,
  User, UserCheck, Search, X
} from 'lucide-react';
import headLocalCommunityService from '../../../../core/api/headLocalCommunityService';
import { useData } from '../../../member/context/DataProvider';

const emptyForm = { name: '', email: '', phone: '', password: '' };

export default function LocalCommunityManagement() {
  const { user } = useData();
  const [localHeads, setLocalHeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visiblePasswordId, setVisiblePasswordId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Community users state for selection
  const [communityUsers, setCommunityUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchLocalHeads = async () => {
    setLoading(true);
    try {
      const res = await headLocalCommunityService.getLocalHeads();
      if (res.status === 'success') {
        setLocalHeads(res.data);
      }
    } catch (err) {
      console.error('Failed to load local heads:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommunityUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await headLocalCommunityService.getCommunityUsers();
      if (res.status === 'success') {
        setCommunityUsers(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load community users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchLocalHeads();
  }, []);

  const openCreateModal = () => {
    setEditId(null);
    setSelectedUserId(null);
    setUserSearchTerm('');
    setForm(emptyForm);
    setError('');
    setShowModal(true);
    fetchCommunityUsers();
  };

  const openEditModal = (localHead) => {
    setEditId(localHead._id);
    setSelectedUserId(null);
    setForm({
      name: localHead.name || '',
      email: localHead.email || '',
      phone: localHead.phone || '',
      password: ''
    });
    setError('');
    setShowModal(true);
  };

  const handleSelectUser = (uId) => {
    if (!uId) {
      setSelectedUserId(null);
      setForm(emptyForm);
      return;
    }
    const foundUser = communityUsers.find(u => u._id === uId);
    if (foundUser) {
      setSelectedUserId(foundUser._id);
      setForm({
        name: foundUser.name || '',
        email: foundUser.email || '',
        phone: foundUser.phone || '',
        password: form.password || ''
      });
    }
  };

  const clearSelectedUser = () => {
    setSelectedUserId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = editId
        ? form
        : { ...form, userId: selectedUserId || undefined };

      const res = editId
        ? await headLocalCommunityService.updateLocalHead(editId, payload)
        : await headLocalCommunityService.createLocalHead(payload);

      if (res.status === 'success') {
        setShowModal(false);
        fetchLocalHeads();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save Local Head');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (localHead) => {
    try {
      const res = await headLocalCommunityService.toggleLocalHeadStatus(localHead._id);
      if (res.status === 'success') {
        fetchLocalHeads();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (localHead) => {
    if (!window.confirm(`Deactivate ${localHead.name}'s Local Head account? They will no longer be able to log in.`)) return;
    try {
      const res = await headLocalCommunityService.deleteLocalHead(localHead._id);
      if (res.status === 'success') {
        fetchLocalHeads();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyPassword = (localHead) => {
    if (!localHead.plainPassword) return;
    navigator.clipboard.writeText(localHead.plainPassword).then(() => {
      setCopiedId(localHead._id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const filteredCommunityUsers = communityUsers.filter(u => {
    if (!userSearchTerm) return true;
    const term = userSearchTerm.toLowerCase();
    return (
      u.name?.toLowerCase().includes(term) ||
      u.phone?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-[#120b32] via-[#1e1145] to-[#2e1a6c] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-purple-500/20">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-400 font-bold text-2xl shrink-0">
            <MapPin size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-purple-200 mb-1">
              <Shield size={14} className="text-amber-400" /> Local Community Management
            </div>
            <h1 className="text-2xl font-black text-white leading-tight">Local Heads</h1>
            <p className="text-xs font-semibold text-purple-200/90 mt-0.5">Select existing community members or create new accounts for Local Heads.</p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95 shrink-0"
        >
          <Plus size={16} /> Add Local Head
        </button>
      </div>

      {/* Local Heads Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-slate-800">Local Head Accounts</h2>
            <p className="text-xs text-slate-500">Share the email and password with each Local Head so they can log in to the Head panel.</p>
          </div>
          <button onClick={fetchLocalHeads} className="p-2 text-slate-400 hover:text-indigo-600">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold uppercase text-slate-400">
                <th className="p-4">Name</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Password</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center"><Loader className="animate-spin text-indigo-600 inline" /></td></tr>
              ) : localHeads.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400 font-bold">No Local Heads created yet. Click "Add Local Head" to appoint one.</td></tr>
              ) : (
                localHeads.map(lh => (
                  <tr key={lh._id} className="hover:bg-slate-50/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                          {lh.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{lh.name}</p>
                          <p className="text-[10px] text-slate-400">Added: {lh.joiningDate ? new Date(lh.joiningDate).toLocaleDateString() : 'Recent'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="flex items-center gap-1.5 text-slate-800"><Mail size={12} className="text-slate-400" /> {lh.email}</p>
                      <p className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5"><Phone size={11} /> {lh.phone}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-slate-700">
                          {visiblePasswordId === lh._id ? (lh.plainPassword || '—') : '••••••••'}
                        </span>
                        <button
                          onClick={() => setVisiblePasswordId(visiblePasswordId === lh._id ? null : lh._id)}
                          className="p-1 text-slate-400 hover:text-indigo-600"
                          title={visiblePasswordId === lh._id ? 'Hide password' : 'Show password'}
                        >
                          {visiblePasswordId === lh._id ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <button
                          onClick={() => handleCopyPassword(lh)}
                          className="p-1 text-slate-400 hover:text-indigo-600"
                          title="Copy password"
                        >
                          {copiedId === lh._id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${lh.accountStatus === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {lh.accountStatus}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => openEditModal(lh)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600" title="Edit / Reset Password"><Edit size={14} /></button>
                      <button onClick={() => handleToggleStatus(lh)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600" title="Toggle Active Status">
                        {lh.accountStatus === 'active' ? <XCircle size={14} className="text-rose-500" /> : <CheckCircle2 size={14} className="text-emerald-500" />}
                      </button>
                      <button onClick={() => handleDelete(lh)} className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600" title="Deactivate"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-slate-800">{editId ? 'Edit Local Head' : 'Create Local Head'}</h3>
            <p className="text-xs text-slate-500">
              {editId ? 'Update details or reset the login password.' : 'Select an existing community member or enter details to create a Local Head.'}
            </p>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
                {error}
              </div>
            )}

            {!editId && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <User size={14} className="text-indigo-600" /> Select Existing Member (Optional)
                  </label>
                  {loadingUsers && <Loader size={12} className="animate-spin text-indigo-600" />}
                </div>

                {selectedUserId ? (
                  <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <UserCheck size={18} className="text-indigo-600" />
                      <div>
                        <p className="text-xs font-bold text-indigo-950">{form.name}</p>
                        <p className="text-[10px] font-medium text-indigo-700">{form.phone} {form.email ? `• ${form.email}` : ''}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearSelectedUser}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="Clear selection"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {communityUsers.length > 5 && (
                      <div className="relative">
                        <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search members by name, phone or email..."
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                    <select
                      onChange={(e) => handleSelectUser(e.target.value)}
                      value={selectedUserId || ''}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Choose a user from community --</option>
                      {filteredCommunityUsers.map(u => (
                        <option key={u._id} value={u._id}>
                          {u.name} ({u.phone}) {u.accountType === 'local_head' ? '• Already Local Head' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text" required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email Address *</label>
                  <input
                    type="email" required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number *</label>
                  <input
                    type="text" required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">{editId ? 'New Password (Optional)' : 'Login Password *'}</label>
                <input
                  type="text" required={!editId}
                  minLength={6}
                  placeholder={editId ? 'Leave blank to keep unchanged' : 'At least 6 characters'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 font-bold text-xs text-slate-500">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-indigo-700 disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save Local Head'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
