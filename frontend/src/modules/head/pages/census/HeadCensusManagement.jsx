import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, User, Heart, Sparkles, MapPin, Search, Filter, Phone, 
  CheckCircle, XCircle, FileText, Download, Printer, RefreshCw, 
  BarChart2, PieChart, Clock, Calendar, Shield, Trash2, Edit2, ChevronRight
} from 'lucide-react';
import { axiosPrivate } from '../../../../core/api/axiosPrivate';

export const HeadCensusManagement = () => {
  const [activeTab, setActiveTab] = useState('overview'); // overview, members, requests
  const [censusSummary, setCensusSummary] = useState(null);
  const [membersList, setMembersList] = useState([]);
  const [updateRequests, setUpdateRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  // Active = registered on MeriSamaj; Inactive = approved family-added member without an account
  const [activityFilter, setActivityFilter] = useState('all');

  // Notification Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch Live Community Census Summary
  const fetchCensusSummary = async () => {
    try {
      const res = await axiosPrivate.get('/head/census/summary');
      if (res.data && res.data.data) {
        setCensusSummary(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load Head census summary:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load census data');
    }
  };

  // Fetch Live Community Member Listing
  const fetchCensusMembers = async () => {
    try {
      const res = await axiosPrivate.get('/head/census/members');
      if (res.data && res.data.data) {
        setMembersList(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load Head census members:', err);
    }
  };

  // Fetch Member Data Update Requests
  const fetchUpdateRequests = async () => {
    try {
      const res = await axiosPrivate.get('/head/census/update-requests');
      if (res.data && res.data.data) {
        setUpdateRequests(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load update requests:', err);
    }
  };

  const loadAllHeadCensusData = async () => {
    setLoading(true);
    await Promise.all([
      fetchCensusSummary(),
      fetchCensusMembers(),
      fetchUpdateRequests()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllHeadCensusData();
  }, []);

  // Handle Reviewing Member Update Request (Approve / Reject)
  const handleReviewRequest = async (requestId, newStatus) => {
    try {
      await axiosPrivate.patch(`/head/census/update-requests/${requestId}`, {
        status: newStatus,
        reviewNote: `Processed by Head on ${newDate()}`
      });
      setUpdateRequests(prev => prev.map(r => r._id === requestId ? { ...r, status: newStatus } : r));
      showToast(`Request ${newStatus.toLowerCase()} successfully`);
      fetchCensusSummary();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Action failed', 'error');
    }
  };

  const newDate = () => new Date().toLocaleDateString();

  // Handle Member Deactivation (Soft-Delete)
  const handleDeactivateMember = async (memberId) => {
    if (window.confirm('Are you sure you want to deactivate this member from community census?')) {
      try {
        await axiosPrivate.patch(`/member/members/${memberId}/status`, { accountStatus: 'inactive' });
        setMembersList(prev => prev.filter(m => m.id !== memberId && m._id !== memberId));
        showToast('Member census listing deactivated successfully');
        fetchCensusSummary();
      } catch (err) {
        showToast(err.response?.data?.message || err.message || 'Deactivation failed', 'error');
      }
    }
  };

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return membersList.filter(m => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = m.name?.toLowerCase().includes(q);
        const matchPhone = m.phone?.includes(q);
        const matchCity = m.city?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchCity) return false;
      }
      if (selectedCity !== 'all' && m.city !== selectedCity) return false;
      if (selectedGender !== 'all' && m.gender !== selectedGender) return false;
      if (activityFilter === 'active' && m.active === false) return false;
      if (activityFilter === 'inactive' && m.active !== false) return false;
      return true;
    });
  }, [membersList, searchQuery, selectedCity, selectedGender, activityFilter]);

  const inactiveMembersCount = membersList.filter(m => m.active === false).length;

  const summary = censusSummary?.summary || {};
  const citiesBreakdown = censusSummary?.citiesBreakdown || [];
  const ageBrackets = censusSummary?.ageBrackets || { '0-17': 0, '18-25': 0, '26-35': 0, '36-50': 0, '50+': 0 };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-white font-bold text-xs flex items-center gap-2 ${
              toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
            }`}
          >
            <Sparkles size={16} />
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Community Census Desk</h1>
            <p className="text-xs text-slate-500 font-medium">Manage community demographics, member listings, and update requests</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={loadAllHeadCensusData}
            className="px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded-2xl hover:bg-slate-200 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={14} /> Refresh Data
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Members</span>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{summary.totalMembers || 0}</h3>
          <span className="text-[10px] text-emerald-600 font-bold mt-1 inline-block">100% Community Scope</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Adult Males</span>
          <h3 className="text-2xl font-black text-blue-600 mt-1">{summary.malesCount || 0}</h3>
          <span className="text-[10px] text-slate-500 font-medium mt-1 inline-block">Age 18+</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Adult Females</span>
          <h3 className="text-2xl font-black text-pink-600 mt-1">{summary.femalesCount || 0}</h3>
          <span className="text-[10px] text-slate-500 font-medium mt-1 inline-block">Age 18+</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Children</span>
          <h3 className="text-2xl font-black text-emerald-600 mt-1">{summary.kidsCount || 0}</h3>
          <span className="text-[10px] text-slate-500 font-medium mt-1 inline-block">Age under 18</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-2.5 font-bold text-xs rounded-2xl transition-all ${
            activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          Demographic Overview
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`px-5 py-2.5 font-bold text-xs rounded-2xl transition-all ${
            activeTab === 'members' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          Census Member Directory ({filteredMembers.length})
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`px-5 py-2.5 font-bold text-xs rounded-2xl transition-all relative ${
            activeTab === 'requests' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          Update Requests ({updateRequests.filter(r => r.status === 'Pending').length})
        </button>
      </div>

      {/* Tab 1: Demographic Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Age Brackets */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BarChart2 size={18} className="text-indigo-600" /> Age Brackets Distribution
            </h3>
            <div className="flex justify-between items-end h-40 pt-4 pb-2 border-b border-slate-100">
              {['0-17', '18-25', '26-35', '36-50', '50+'].map((bracket) => {
                const val = ageBrackets[bracket] || 0;
                const maxVal = Math.max(...Object.values(ageBrackets), 1);
                const barHeight = Math.max((val / maxVal) * 110, 10);
                return (
                  <div key={bracket} className="flex flex-col items-center gap-2 w-12">
                    <span className="text-xs font-bold text-slate-600">{val}</span>
                    <div className="w-7 bg-indigo-600 rounded-t-xl" style={{ height: `${barHeight}px` }} />
                    <span className="text-[11px] font-bold text-slate-500 mt-1">{bracket}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Regional Cities */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-indigo-600" /> Active Regional Hubs
            </h3>
            <div className="space-y-3.5">
              {citiesBreakdown.length > 0 ? (
                citiesBreakdown.slice(0, 5).map((c) => {
                  const maxCityCount = Math.max(...citiesBreakdown.map(b => b.count), 1);
                  const percent = Math.min((c.count / maxCityCount) * 100, 100);
                  return (
                    <div key={c.name}>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                        <span>{c.name}</span>
                        <span className="font-bold text-slate-900">{c.count} members</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">No city data available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Census Member Directory */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-72">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search member name or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              {[
                { key: 'all', label: `All (${membersList.length})` },
                { key: 'active', label: `Active (${membersList.length - inactiveMembersCount})` },
                { key: 'inactive', label: `Inactive (${inactiveMembersCount})` }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActivityFilter(tab.key)}
                  className={`px-4 py-2 font-bold text-xs rounded-xl transition-all ${
                    activityFilter === tab.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Inactive members were added by their family and approved, but have not registered on MeriSamaj yet. They are included in the Jangana total.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Member Name</th>
                  <th className="p-3">Gender</th>
                  <th className="p-3">Age</th>
                  <th className="p-3">City</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Profession</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map(m => (
                  <tr key={m.id || m._id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-900">{m.name}</td>
                    <td className="p-3">{m.gender || 'Male'}</td>
                    <td className="p-3 font-semibold">{m.age || 30} yrs</td>
                    <td className="p-3">{m.city || 'Indore'}</td>
                    <td className="p-3 font-mono">{m.phone || '-'}</td>
                    <td className="p-3">{m.profession || 'Professional'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                        m.active === false ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {m.memberStatus || (m.active === false ? 'Inactive' : 'Active')}
                      </span>
                      {m.familyCode && <span className="block text-[10px] text-slate-400 mt-0.5">{m.familyCode} · {m.relation}</span>}
                    </td>
                    <td className="p-3 text-right">
                      {!m.isFamilyRecord && (
                      <button
                        onClick={() => handleDeactivateMember(m.id || m._id)}
                        className="p-1.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"
                        title="Deactivate Member Listing"
                      >
                        <Trash2 size={14} />
                      </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Update Requests Review Desk */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Member Data Update Requests</h3>
          <div className="space-y-3">
            {updateRequests.length > 0 ? (
              updateRequests.map(r => (
                <div key={r._id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{r.memberName}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        {r.fieldToUpdate}: {r.newValue}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">Reason: {r.reason}</p>
                    <p className="text-[10px] text-slate-400">Submitted by: {r.applicantId?.name || 'Member'} · {r.phone}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {r.status === 'Pending' ? (
                      <>
                        <button
                          onClick={() => handleReviewRequest(r._id, 'Approved')}
                          className="px-3.5 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-1"
                        >
                          <CheckCircle size={14} /> Approve
                        </button>
                        <button
                          onClick={() => handleReviewRequest(r._id, 'Rejected')}
                          className="px-3.5 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 transition-colors flex items-center gap-1"
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </>
                    ) : (
                      <span className={`text-xs font-bold px-3 py-1 rounded-xl ${
                        r.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {r.status}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No census update requests pending</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
