import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Wallet, Search, RefreshCw, Plus, Eye, Edit3, 
  Trash2, CheckCircle2, MapPin, Calendar, 
  ArrowUpRight, Info, FileText, IndianRupee, 
  Clock, TrendingUp, AlertTriangle, Filter, 
  Users, Send, Check, X, Printer, ShieldAlert,
  Receipt
} from 'lucide-react';
import { adminFundService } from '../../services/adminFundService';
import { getAllCommunities } from '../../services/communityService';

export default function GlobalFundManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  
  // Data States
  const [funds, setFunds] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [stats, setStats] = useState(null);
  const [incomeSources, setIncomeSources] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    communityId: 'All',
    scope: 'All',
    status: 'All'
  });

  // UI / Drawer States
  const [toast, setToast] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerFundId, setDrawerFundId] = useState(null);
  const [drawerFund, setDrawerFund] = useState(null);
  const [drawerContributions, setDrawerContributions] = useState([]);
  const [drawerTransactions, setDrawerTransactions] = useState([]);
  const [drawerExpenses, setDrawerExpenses] = useState([]);
  const [drawerTab, setDrawerTab] = useState('overview'); // overview | contributions | transactions | expenses
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Action Modals State
  const [activeModal, setActiveModal] = useState(null); // 'create' | 'edit' | 'delete-confirm' | null
  const [selectedFund, setSelectedFund] = useState(null);

  // Form State for Create/Edit
  const [fundForm, setFundForm] = useState({
    name: '',
    purpose: '',
    description: '',
    targetAmount: '',
    contributionPerMember: '',
    startDate: '',
    endDate: '',
    dueDate: '',
    scope: 'GLOBAL',
    communityId: '',
    status: 'Active'
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch funds list
      const fundRes = await adminFundService.getFunds(filters);
      if (fundRes.success) {
        setFunds(fundRes.data);
      }

      // Fetch communities
      const commRes = await getAllCommunities();
      if (commRes && commRes.data) {
        setCommunities(commRes.data);
      }

      // Fetch Stats
      const statRes = await adminFundService.getStats();
      if (statRes.success) {
        setStats(statRes.data);
      }

      try {
        const incomeRes = await adminFundService.getIncomeSources(
          filters.communityId && filters.communityId !== 'All' ? { communityId: filters.communityId } : {}
        );
        if (incomeRes.success) setIncomeSources(incomeRes.data);
      } catch (incomeErr) {
        console.error('Failed to fetch income sources breakdown', incomeErr);
      }

    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch Samaj fund records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  // Load Drawer Fund details dynamically
  const openDrawer = async (fundId) => {
    setDrawerFundId(fundId);
    setIsDrawerOpen(true);
    setDrawerTab('overview');
    setDrawerLoading(true);
    try {
      const fundRes = await adminFundService.getFundById(fundId);
      if (fundRes.success) setDrawerFund(fundRes.data);

      const contribRes = await adminFundService.getFundContributions(fundId);
      if (contribRes.success) setDrawerContributions(contribRes.data);

      const txRes = await adminFundService.getFundTransactions(fundId);
      if (txRes.success) setDrawerTransactions(txRes.data);

      const expRes = await adminFundService.getFundExpenses(fundId);
      if (expRes.success) setDrawerExpenses(expRes.data);

    } catch (err) {
      console.error(err);
    } finally {
      setDrawerLoading(false);
    }
  };

  // Create/Edit Handler
  const openCreateModal = () => {
    setFundForm({
      name: '',
      purpose: '',
      description: '',
      targetAmount: '',
      contributionPerMember: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      dueDate: '',
      scope: 'GLOBAL',
      communityId: communities[0]?._id || '',
      status: 'Active'
    });
    setSelectedFund(null);
    setActiveModal('create');
  };

  const openEditModal = (fund) => {
    setSelectedFund(fund);
    setFundForm({
      name: fund.name,
      purpose: fund.purpose,
      description: fund.description,
      targetAmount: fund.targetAmount,
      contributionPerMember: fund.contributionPerMember,
      startDate: fund.startDate || '',
      endDate: fund.endDate || '',
      dueDate: fund.dueDate || '',
      scope: fund.scope,
      communityId: fund.communityId || '',
      status: fund.status
    });
    setActiveModal('edit');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (activeModal === 'create') {
        const res = await adminFundService.createFund(fundForm);
        if (res.success) {
          showToast('Samaj Fund initialized successfully.');
          loadData();
          setActiveModal(null);
        }
      } else {
        const res = await adminFundService.updateFund(selectedFund.id, fundForm);
        if (res.success) {
          showToast('Samaj Fund updated successfully.');
          loadData();
          setActiveModal(null);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Operation failed.');
    }
  };

  // Delete Handler
  const handleDelete = async (fund) => {
    setSelectedFund(fund);
    setActiveModal('delete-confirm');
  };

  const confirmDelete = async () => {
    try {
      const res = await adminFundService.deleteFund(selectedFund.id);
      if (res.success) {
        showToast('Fund deleted successfully.');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Saved to archive.', 'warning');
    } finally {
      loadData();
      setActiveModal(null);
    }
  };

  // Search filter Client-side helper
  const filteredFunds = funds.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.purpose.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 font-sans">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-lg text-white font-bold text-sm z-50 flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-amber-600'
        }`}>
          <CheckCircle2 size={16} />
          {toast.message}
        </div>
      )}

      {/* Header Panel */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Samaj Funds & Member Dues</h1>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Control and audit member-wise contribution ledgers</p>
        </div>
        <div className="flex gap-3">
          <Link to="accounts" className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center hover:bg-slate-50">Accounts &amp; Cash</Link>
          <button 
            onClick={loadData}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <RefreshCw size={18} />
          </button>
          <button 
            onClick={openCreateModal}
            className="bg-indigo-600 text-white px-5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 flex items-center gap-2 hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Plus size={16} /> Create Fund
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Target Pool</p>
            <p className="text-2xl font-black text-slate-900">₹ {stats.overallTarget.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-2">{stats.totalFunds} Active Campaigns</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Collected</p>
            <p className="text-2xl font-black text-emerald-600">₹ {stats.overallCollected.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-2">From all registered chapters</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Expenses</p>
            <p className="text-2xl font-black text-rose-600">₹ {stats.overallExpenses.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-2">Dharmashala Maintenance / Events</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-indigo-50 to-white">
            <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Net Balance Available</p>
            <p className="text-2xl font-black text-indigo-950">₹ {stats.availableBalance.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-indigo-400 font-semibold mt-2">{stats.globalCount} Global / {stats.communityCount} Chapter Funds</p>
          </div>
        </div>
      )}

      {/* Samaj Income Sources — where the platform's income is coming from */}
      {incomeSources && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-800">Samaj Income Sources</h3>
              <p className="text-[10.5px] text-slate-400 font-semibold mt-0.5">
                {filters.communityId !== 'All' ? 'Filtered to selected community' : 'Platform-wide, across every community'}
              </p>
            </div>
            <p className="text-lg font-black text-slate-900">₹ {incomeSources.totals.grandTotal.toLocaleString('en-IN')}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4">
              <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1">Fund / Membership</p>
              <p className="text-lg font-black text-indigo-950">₹ {incomeSources.totals.fund.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-4">
              <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-1">Donations</p>
              <p className="text-lg font-black text-rose-950">₹ {incomeSources.totals.donations.toLocaleString('en-IN')}</p>
              <p className="text-[9.5px] text-rose-600/70 font-semibold mt-1">{incomeSources.donations.transactionCount} transactions</p>
            </div>
            <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Dharmashala Bookings</p>
              <p className="text-lg font-black text-amber-950">₹ {incomeSources.totals.dharmashala.toLocaleString('en-IN')}</p>
              <p className="text-[9.5px] text-amber-600/70 font-semibold mt-1">
                Online ₹{incomeSources.dharmashala.online.toLocaleString('en-IN')} · Offline ₹{incomeSources.dharmashala.offline.toLocaleString('en-IN')}
                {incomeSources.dharmashala.pendingAmount > 0 && ` · ₹${incomeSources.dharmashala.pendingAmount.toLocaleString('en-IN')} pending`}
              </p>
            </div>
            <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4">
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Manual / Cash Collections</p>
              <p className="text-lg font-black text-emerald-950">₹ {(incomeSources.totals.manual || 0).toLocaleString('en-IN')}</p>
              <p className="text-[9.5px] text-emerald-600/70 font-semibold mt-1">{incomeSources.manual?.entryCount || 0} entries</p>
            </div>
          </div>

          {incomeSources.dharmashala.byLocation?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Dharmashala Income by Location</p>
              <div className="flex flex-wrap gap-2">
                {incomeSources.dharmashala.byLocation.map(loc => (
                  <span key={loc.city} className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold text-slate-600">
                    {loc.city}: <span className="text-amber-700">₹{loc.amount.toLocaleString('en-IN')}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4 mb-6">
        <div className="flex-1 max-w-sm relative">
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by fund name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium outline-none focus:border-indigo-400 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2 block text-right">Scope</label>
            <select 
              value={filters.scope}
              onChange={(e) => setFilters({ ...filters, scope: e.target.value })}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:border-indigo-400"
            >
              <option value="All">All Scope</option>
              <option value="GLOBAL">Global</option>
              <option value="COMMUNITY">Chapter-Specific</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2 block text-right">Status</label>
            <select 
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:border-indigo-400"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Closed">Closed</option>
              <option value="Expired">Expired</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2 block text-right">Chapter</label>
            <select 
              value={filters.communityId}
              onChange={(e) => setFilters({ ...filters, communityId: e.target.value })}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:border-indigo-400"
            >
              <option value="All">All Communities</option>
              {communities.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Funds Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
              <th className="p-4 pl-6">Fund Details</th>
              <th className="p-4">Scope / Chapter</th>
              <th className="p-4 text-right">Target Amount</th>
              <th className="p-4 text-right">Fee Per Member</th>
              <th className="p-4 text-right">Collected Pool</th>
              <th className="p-4 text-right">Remaining Dues</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 pr-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredFunds.map(fund => {
              const progress = fund.targetAmount > 0 ? Math.min(Math.round((fund.collectedAmount / fund.targetAmount) * 100), 100) : 0;
              return (
                <tr key={fund.id} className="hover:bg-slate-50/50 text-slate-700 font-medium text-[13px] transition-colors">
                  <td className="p-4 pl-6">
                    <p className="font-bold text-slate-800 text-sm leading-snug">{fund.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{fund.purpose}</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                      fund.scope === 'GLOBAL' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                      {fund.scope}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">{fund.communityName}</p>
                  </td>
                  <td className="p-4 text-right font-bold text-slate-900">₹ {fund.targetAmount.toLocaleString('en-IN')}</td>
                  <td className="p-4 text-right font-bold text-slate-650">₹ {fund.contributionPerMember.toLocaleString('en-IN')}</td>
                  <td className="p-4 text-right">
                    <span className="font-bold text-emerald-600">₹ {fund.collectedAmount.toLocaleString('en-IN')}</span>
                    <div className="w-16 h-1 bg-slate-100 rounded-full mt-1.5 ml-auto overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </td>
                  <td className="p-4 text-right font-bold text-rose-600">₹ {fund.remainingAmount.toLocaleString('en-IN')}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                      fund.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {fund.status}
                    </span>
                  </td>
                  <td className="p-4 pr-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => openDrawer(fund.id)}
                        className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-100 flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        onClick={() => openEditModal(fund)}
                        className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-indigo-650 hover:border-indigo-100 flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(fund)}
                        className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-100 flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredFunds.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                  No funds found matching filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE & EDIT MODAL */}
      {activeModal && activeModal !== 'delete-confirm' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">
                {activeModal === 'create' ? 'Launch New Samaj Fund' : 'Edit Samaj Fund'}
              </h2>
              <button 
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fund Name *</label>
                <input 
                  type="text" 
                  required
                  value={fundForm.name} 
                  onChange={(e) => setFundForm({ ...fundForm, name: e.target.value })}
                  placeholder="e.g. Dharamshala Maintenance Fund"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-400 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Scope *</label>
                  <select 
                    value={fundForm.scope}
                    onChange={(e) => setFundForm({ ...fundForm, scope: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-400 focus:bg-white"
                  >
                    <option value="GLOBAL">GLOBAL (Visible to All)</option>
                    <option value="COMMUNITY">COMMUNITY (Single Chapter)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Community Chapter *</label>
                  <select 
                    value={fundForm.communityId}
                    disabled={fundForm.scope === 'GLOBAL'}
                    onChange={(e) => setFundForm({ ...fundForm, communityId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-400 focus:bg-white disabled:opacity-50"
                  >
                    {communities.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Purpose / Summary</label>
                <input 
                  type="text" 
                  value={fundForm.purpose} 
                  onChange={(e) => setFundForm({ ...fundForm, purpose: e.target.value })}
                  placeholder="e.g. Repair roof, paint halls, community assets"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Description</label>
                <textarea 
                  value={fundForm.description} 
                  onChange={(e) => setFundForm({ ...fundForm, description: e.target.value })}
                  rows={3}
                  placeholder="Provide details about expenditures and objectives..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-400 focus:bg-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Target Amount (₹) *</label>
                  <input 
                    type="number" 
                    required
                    value={fundForm.targetAmount} 
                    onChange={(e) => setFundForm({ ...fundForm, targetAmount: e.target.value })}
                    placeholder="500000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fee Per Member (₹) *</label>
                  <input 
                    type="number" 
                    required
                    value={fundForm.contributionPerMember} 
                    onChange={(e) => setFundForm({ ...fundForm, contributionPerMember: e.target.value })}
                    placeholder="2500"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Date</label>
                  <input 
                    type="date" 
                    value={fundForm.startDate} 
                    onChange={(e) => setFundForm({ ...fundForm, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">End Date</label>
                  <input 
                    type="date" 
                    value={fundForm.endDate} 
                    onChange={(e) => setFundForm({ ...fundForm, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Due Date</label>
                  <input 
                    type="date" 
                    value={fundForm.dueDate} 
                    onChange={(e) => setFundForm({ ...fundForm, dueDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-400 focus:bg-white"
                  />
                </div>
              </div>

              {activeModal === 'edit' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status *</label>
                  <select 
                    value={fundForm.status} 
                    onChange={(e) => setFundForm({ ...fundForm, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-400 focus:bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Closed">Closed</option>
                    <option value="Expired">Expired</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-650 hover:bg-slate-50 font-bold text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-md shadow-indigo-100 hover:bg-indigo-700 cursor-pointer"
                >
                  {activeModal === 'create' ? 'Initialize' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {activeModal === 'delete-confirm' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <ShieldAlert size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-950 mb-1">Delete Samaj Fund?</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Are you sure you want to delete **{selectedFund.name}**? This will remove all associated member ledgers and entries if no payments have been processed. 
              <br />
              <span className="font-semibold text-rose-650 mt-2 block">If payments exist, the fund will be Closed/Archived instead.</span>
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 border border-slate-200 text-slate-650 rounded-xl font-semibold text-sm hover:bg-slate-50 cursor-pointer"
              >
                Keep Fund
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 shadow-md shadow-rose-100 cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex justify-end">
          {/* Backdrop click to close */}
          <div className="flex-1" onClick={() => setIsDrawerOpen(false)} />
          
          <div className="w-full max-w-2xl bg-white shadow-2xl h-screen flex flex-col overflow-hidden relative border-l border-slate-200">
            {/* Drawer Header */}
            {drawerFund && (
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex-1 min-w-0 pr-8">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    drawerFund.scope === 'GLOBAL' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}>
                    {drawerFund.scope} Fund
                  </span>
                  <h3 className="text-lg font-black text-slate-950 leading-tight mt-1.5 truncate">{drawerFund.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{drawerFund.communityName}</p>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer shrink-0"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            {/* Drawer Tabs */}
            <div className="flex border-b border-slate-100 bg-white px-6">
              {[
                { id: 'overview', name: 'Overview' },
                { id: 'contributions', name: 'Member Ledger' },
                { id: 'transactions', name: 'Transactions' },
                { id: 'expenses', name: 'Expenses' }
              ].map(t => (
                <button 
                  key={t.id}
                  onClick={() => setDrawerTab(t.id)}
                  className={`py-3 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer ${
                    drawerTab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
              {drawerLoading ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="w-8 h-8 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-3" />
                  <p className="text-xs text-slate-400 font-bold">Fetching ledger records...</p>
                </div>
              ) : drawerFund ? (
                <>
                  {/* TAB 1: OVERVIEW */}
                  {drawerTab === 'overview' && (
                    <div className="space-y-6">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide border-b border-slate-50 pb-2">Description</h4>
                        <p className="text-sm font-medium text-slate-600 leading-relaxed">{drawerFund.description || 'No description provided.'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Assigned Target</p>
                          <p className="text-lg font-black text-slate-800">₹ {drawerFund.targetAmount.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Collected</p>
                          <p className="text-lg font-black text-emerald-600">₹ {drawerFund.collectedAmount.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Expenditures</p>
                          <p className="text-lg font-black text-rose-600">₹ {drawerFund.expenseAmount.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Net Available Cash</p>
                          <p className="text-lg font-black text-indigo-650">₹ {drawerFund.availableBalance.toLocaleString('en-IN')}</p>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide border-b border-slate-50 pb-2">Timeline Details</h4>
                        <div className="grid grid-cols-3 gap-2 text-xs font-bold text-slate-650">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase mb-0.5">Start Date</p>
                            <p>{drawerFund.startDate || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase mb-0.5">End Date</p>
                            <p>{drawerFund.endDate || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase mb-0.5">Due Date</p>
                            <p className="text-rose-600">{drawerFund.dueDate || '-'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: CONTRIBUTIONS LEDGER */}
                  {drawerTab === 'contributions' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <table className="w-full text-left border-collapse text-[12px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                            <th className="p-3 pl-4">Member Name</th>
                            <th className="p-3 text-right">Assigned</th>
                            <th className="p-3 text-right">Paid</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 pr-4 text-center">Last Pay</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {drawerContributions.map((c, i) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="p-3 pl-4">
                                <p className="font-bold text-slate-800">{c.name}</p>
                                <p className="text-[9px] text-slate-400">{c.phone || c.email}</p>
                              </td>
                              <td className="p-3 text-right text-slate-500">₹{c.assignedAmount}</td>
                              <td className="p-3 text-right font-bold text-emerald-600">₹{c.paidAmount}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                  c.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : c.status === 'Partial' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                                }`}>
                                  {c.status}
                                </span>
                              </td>
                              <td className="p-3 pr-4 text-center text-slate-400 text-[10px]">{c.lastPaymentDate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* TAB 3: TRANSACTIONS LIST */}
                  {drawerTab === 'transactions' && (
                    <div className="space-y-3">
                      {drawerTransactions.map(tx => (
                        <div key={tx.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between text-xs font-semibold">
                          <div>
                            <p className="font-bold text-slate-800">{tx.memberName}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{tx.txnId} • {tx.paymentMode}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-emerald-600 text-sm">₹ {tx.amount}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">{new Date(tx.date).toLocaleDateString('en-GB')}</p>
                          </div>
                        </div>
                      ))}

                      {drawerTransactions.length === 0 && (
                        <div className="text-center py-10 font-bold text-slate-400 text-xs">
                          No transactions found for this fund.
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: EXPENSES LIST */}
                  {drawerTab === 'expenses' && (
                    <div className="space-y-3">
                      {drawerExpenses.map(e => (
                        <div key={e.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between text-xs font-semibold">
                          <div>
                            <p className="font-bold text-slate-800">{e.title}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{e.category} • Added by {e.addedBy}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-rose-600 text-sm">₹ {e.amount}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">{new Date(e.date).toLocaleDateString('en-GB')}</p>
                          </div>
                        </div>
                      ))}

                      {drawerExpenses.length === 0 && (
                        <div className="text-center py-10 font-bold text-slate-400 text-xs">
                          No expenses recorded for this fund.
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
