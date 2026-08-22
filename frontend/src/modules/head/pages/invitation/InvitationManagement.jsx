import React, { useState, useEffect } from 'react';
import { Mail, Search, RefreshCw, Eye, CheckCircle, XCircle, Trash2, AlertCircle, Calendar, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import headInvitationService from '../../services/headInvitationService';

export default function InvitationManagement() {
  const [invitations, setInvitations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg, isError = false) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const fetchInvitationsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [invRes, statsRes] = await Promise.all([
        headInvitationService.getAllInvitations(params),
        headInvitationService.getStats()
      ]);

      if (invRes.status === 'success') setInvitations(invRes.data || []);
      if (statsRes.status === 'success') setStats(statsRes.data || {});
    } catch (err) {
      console.error('Failed to load community invitations:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load community invitations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitationsData();
  }, [statusFilter]);

  const handleStatusUpdate = async (id, newStatus) => {
    setActionLoading(true);
    try {
      await headInvitationService.updateStatus(id, newStatus);
      showToast(`Invitation status updated to ${newStatus}`);
      fetchInvitationsData();
      if (selectedInvitation && selectedInvitation._id === id) {
        setSelectedInvitation(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      showToast(err.message || 'Failed to update status', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invitation? This action cannot be undone.')) return;
    setActionLoading(true);
    try {
      await headInvitationService.deleteInvitation(id);
      showToast('Invitation deleted successfully');
      setSelectedInvitation(null);
      fetchInvitationsData();
    } catch (err) {
      showToast(err.message || 'Failed to delete invitation', true);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-purple-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold border border-purple-500/30">
          <CheckCircle size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-950 via-indigo-900 to-slate-900 p-6 rounded-3xl border border-purple-500/20 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-widest mb-1">
            <Mail size={14} className="text-purple-400" /> Community Governance
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Community Invitations Desk</h1>
          <p className="text-xs text-purple-100/90 mt-1">Review, approve, and moderate digital invitations created by members of your community.</p>
        </div>

        <button 
          onClick={fetchInvitationsData} 
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Invitations</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats?.totalInvitations || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Pending Approval</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{stats?.pendingApproval || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Approved</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats?.approvedCount || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm">
          <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Rejected</p>
          <p className="text-2xl font-black text-rose-600 mt-1">{stats?.rejectedCount || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm">
          <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Total RSVPs</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">{stats?.totalRsvps || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm">
          <p className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Attending</p>
          <p className="text-2xl font-black text-purple-600 mt-1">{stats?.totalAttending || 0}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Search invitation title, host, venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchInvitationsData()}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-purple-500"
          >
            <option value="All">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 flex flex-col items-center justify-center min-h-[300px]">
          <RefreshCw size={24} className="text-purple-600 animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-500">Loading invitations...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 p-8 rounded-2xl text-center">
          <AlertCircle size={24} className="text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-rose-800">{error}</p>
          <button onClick={fetchInvitationsData} className="mt-3 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold">Retry</button>
        </div>
      ) : invitations.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center">
          <Mail size={32} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No invitations found for your community</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3.5 px-4">Event & Host</th>
                  <th className="py-3.5 px-4">Date & Location</th>
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
                            onClick={() => handleStatusUpdate(inv._id, 'Approved')}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                        {inv.status !== 'Rejected' && (
                          <button
                            onClick={() => handleStatusUpdate(inv._id, 'Rejected')}
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
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Invitation Details</p>
                <h3 className="text-lg font-black">{selectedInvitation.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedInvitation(null)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Host</p>
                  <p className="font-bold text-slate-800">{selectedInvitation.hostName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Contact</p>
                  <p className="font-bold text-slate-800">{selectedInvitation.contact}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Date</p>
                  <p className="font-bold text-slate-800">{selectedInvitation.date}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Location</p>
                  <p className="font-bold text-slate-800">{selectedInvitation.location}</p>
                </div>
              </div>

              {selectedInvitation.message && (
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Message</p>
                  <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-medium text-slate-700">{selectedInvitation.message}</p>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-100">
                <div>
                  <p className="text-[11px] font-bold text-purple-900">Moderation Status</p>
                  <p className="text-[10px] text-purple-700 font-semibold uppercase">{selectedInvitation.status}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatusUpdate(selectedInvitation._id, 'Approved')}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-[11px]"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(selectedInvitation._id, 'Rejected')}
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
}
