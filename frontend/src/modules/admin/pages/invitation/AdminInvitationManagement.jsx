import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Search, Filter, CheckCircle, XCircle, Eye, Download, Users, 
  MapPin, Calendar, Clock, Sparkles, X, ChevronDown, Trash2, Globe, Phone, Mail,
  AlertCircle, RefreshCw, Layers
} from 'lucide-react';
import { adminInvitationService } from '../../services/adminInvitationService';
import { axiosPrivate } from '../../../../core/api/axiosPrivate';

export const AdminInvitationManagement = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalInvitations: 0,
    pendingApproval: 0,
    approvedCount: 0,
    rejectedCount: 0,
    totalRsvps: 0,
    totalAttending: 0
  });

  const [communities, setCommunities] = useState([]);
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [communityFilter, setCommunityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (communityFilter !== 'all') params.communityId = communityFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [invRes, statsRes] = await Promise.all([
        adminInvitationService.getAllInvitations(params),
        adminInvitationService.getStats(params)
      ]);

      if (invRes.success) setInvitations(invRes.data || []);
      if (statsRes.success) setStats(statsRes.data || {});
    } catch (err) {
      console.error('Failed to load admin invitations:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load digital invitations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [communityFilter, statusFilter]);

  // Fetch Communities list for filter
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const res = await axiosPrivate.get('/admin/communities');
        setCommunities(res.data.data || []);
      } catch (err) {
        console.error('Failed to load communities for invitation filter', err);
      }
    };
    fetchCommunities();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    setActionLoading(true);
    try {
      await adminInvitationService.updateStatus(id, newStatus);
      showToast(`Invitation status changed to ${newStatus}`);
      fetchData();
      if (selectedInvitation && selectedInvitation._id === id) {
        setSelectedInvitation(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invitation? This action cannot be undone.')) return;
    setActionLoading(true);
    try {
      await adminInvitationService.deleteInvitation(id);
      showToast('Invitation deleted successfully');
      setSelectedInvitation(null);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete invitation', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 ${
              toast.type === 'error' ? 'bg-rose-500/90 text-white border-rose-600' : 'bg-emerald-500/90 text-white border-emerald-600'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-6 rounded-3xl border border-purple-500/20 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-widest mb-1">
            <Send size={14} className="text-purple-400" /> Platform Moderation Desk
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Digital Invitations Oversight</h1>
          <p className="text-xs text-purple-100/90 mt-1">Monitor, review, and moderate digital event & ceremony invitations across all communities.</p>
        </div>

        <button 
          onClick={fetchData} 
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh List
        </button>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Invitations</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.totalInvitations || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Pending Approval</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{stats.pendingApproval || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Approved</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats.approvedCount || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm">
          <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Rejected</p>
          <p className="text-2xl font-black text-rose-600 mt-1">{stats.rejectedCount || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm">
          <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Total RSVPs</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">{stats.totalRsvps || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm">
          <p className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Total Attending</p>
          <p className="text-2xl font-black text-purple-600 mt-1">{stats.totalAttending || 0}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by title, host, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchData()}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Community Filter */}
          <select
            value={communityFilter}
            onChange={(e) => setCommunityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Communities</option>
            {communities.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Main Content Table */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 flex flex-col items-center justify-center min-h-[300px]">
          <RefreshCw size={24} className="text-purple-600 animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-500">Loading invitations dataset...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 p-8 rounded-2xl text-center">
          <AlertCircle size={24} className="text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-rose-800">{error}</p>
          <button onClick={fetchData} className="mt-3 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold">Try Again</button>
        </div>
      ) : invitations.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center">
          <Send size={32} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No digital invitations found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting search parameters or community filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3.5 px-4">Event & Host</th>
                  <th className="py-3.5 px-4">Date & Location</th>
                  <th className="py-3.5 px-4">Community</th>
                  <th className="py-3.5 px-4">RSVPs</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {invitations.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-slate-900">{inv.title}</p>
                        <p className="text-[11px] text-slate-500 font-medium">Host: {inv.hostName}</p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-800 flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" /> {inv.date}
                        </p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400" /> {inv.location}
                        </p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                        {inv.community}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-[11px] font-bold text-slate-700">
                        <span className="text-emerald-600">{inv.attendingCount} attending</span> / {inv.rsvpsCount} total
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                        inv.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                        inv.status === 'Pending' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                        'bg-rose-100 text-rose-700 border border-rose-200'
                      }`}>
                        {inv.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedInvitation(inv)}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        {inv.status !== 'Approved' && (
                          <button
                            onClick={() => handleStatusChange(inv._id, 'Approved')}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                        {inv.status !== 'Rejected' && (
                          <button
                            onClick={() => handleStatusChange(inv._id, 'Rejected')}
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                            title="Reject"
                          >
                            <XCircle size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(inv._id)}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedInvitation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Digital Invitation Details</p>
                <h3 className="text-lg font-black">{selectedInvitation.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedInvitation(null)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Host Name</p>
                  <p className="font-bold text-slate-800">{selectedInvitation.hostName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Contact</p>
                  <p className="font-bold text-slate-800">{selectedInvitation.contact}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Event Date</p>
                  <p className="font-bold text-slate-800">{selectedInvitation.date}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Location</p>
                  <p className="font-bold text-slate-800">{selectedInvitation.location}</p>
                </div>
              </div>

              {selectedInvitation.message && (
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Invitation Message</p>
                  <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-medium text-slate-700">{selectedInvitation.message}</p>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-100">
                <div>
                  <p className="text-[11px] font-bold text-purple-900">Current Moderation Status</p>
                  <p className="text-[10px] text-purple-700 font-semibold uppercase">{selectedInvitation.status}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatusChange(selectedInvitation._id, 'Approved')}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-[11px]"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedInvitation._id, 'Rejected')}
                    className="px-3 py-1.5 bg-amber-600 text-white rounded-lg font-bold text-[11px]"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminInvitationManagement;
