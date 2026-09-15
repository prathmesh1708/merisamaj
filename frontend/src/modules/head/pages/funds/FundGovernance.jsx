import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, Search, RefreshCw, Plus, Eye, Edit3, 
  Trash2, CheckCircle2, MapPin, Calendar, 
  ArrowUpRight, Info, FileText, IndianRupee, 
  Clock, TrendingUp, AlertTriangle, Filter, 
  Users, Send, Check, X, Printer, ShieldAlert,
  Receipt, Banknote, Landmark, ShieldCheck,
  CheckCircle, UserCheck
} from 'lucide-react';
import { headFundService } from '../../../../core/api/headFundService';
import { useHeadAuth } from '../../auth/useHeadAuth';

export const FundGovernance = () => {
  const { headAuth } = useHeadAuth();
  const currentUser = headAuth?.headUser || null;

  // Role detection
  const userRole = (currentUser?.role || '').toLowerCase();
  const isLocalHead = userRole === 'sub_head' || currentUser?.accountType === 'local_head';
  const userCity = currentUser?.city || 'Local Area';

  // Data States
  const [funds, setFunds] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [headCommunityName, setHeadCommunityName] = useState('My Chapter');

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'All',
    scope: 'All'
  });

  // UI / Drawer States
  const [toast, setToast] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerFund, setDrawerFund] = useState(null);
  const [drawerContributions, setDrawerContributions] = useState([]);
  const [drawerTransactions, setDrawerTransactions] = useState([]);
  const [drawerExpenses, setDrawerExpenses] = useState([]);
  const [drawerTab, setDrawerTab] = useState('overview'); // overview | contributions | transactions | expenses
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Action Modals State
  const [activeModal, setActiveModal] = useState(null); // 'create' | 'edit' | 'delete-confirm' | 'add-expense' | 'collect-cash' | null
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
    city: '',
    status: 'Active'
  });

  // Form State for Expense
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    description: '',
    amount: '',
    category: 'Maintenance',
    date: '',
    receiptAttached: false
  });

  // Form State for Cash Collection
  const [cashForm, setCashForm] = useState({
    memberId: '',
    memberName: '',
    amount: '',
    receiptNo: '',
    notes: '',
    date: ''
  });
  const [cashMemberSearch, setCashMemberSearch] = useState('');
  const [isSubmittingCash, setIsSubmittingCash] = useState(false);
  const [isSubmittingFund, setIsSubmittingFund] = useState(false);
  const [modalError, setModalError] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const fundRes = await headFundService.getFunds();
      if (fundRes.success) {
        setFunds(fundRes.data);
      }

      const statRes = await headFundService.getStats();
      if (statRes.success) {
        setStats(statRes.data);
      }

      // Fetch head's community name from localStorage session
      const userStr = localStorage.getItem('merisamaj_user');
      if (userStr) {
        const u = JSON.parse(userStr);
        setHeadCommunityName(u.communityName || (u.communityId && u.communityId.name) || 'My Chapter');
      }

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch Samaj fund records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Load Drawer details dynamically
  const openDrawer = async (fundId) => {
    setIsDrawerOpen(true);
    setDrawerTab('overview');
    setDrawerLoading(true);
    try {
      const fundRes = await headFundService.getFundById(fundId);
      if (fundRes.success) setDrawerFund(fundRes.data);

      const contribRes = await headFundService.getFundContributions(fundId);
      if (contribRes.success) setDrawerContributions(contribRes.data);

      const txRes = await headFundService.getFundTransactions(fundId);
      if (txRes.success) setDrawerTransactions(txRes.data);

      const expRes = await headFundService.getFundExpenses(fundId);
      if (expRes.success) setDrawerExpenses(expRes.data);
    } catch (err) {
      console.error('Drawer details fetch failed:', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const refreshDrawerData = async (fundId) => {
    if (!fundId) return;
    try {
      const fundRes = await headFundService.getFundById(fundId);
      if (fundRes.success) setDrawerFund(fundRes.data);

      const contribRes = await headFundService.getFundContributions(fundId);
      if (contribRes.success) setDrawerContributions(contribRes.data);

      const txRes = await headFundService.getFundTransactions(fundId);
      if (txRes.success) setDrawerTransactions(txRes.data);

      const expRes = await headFundService.getFundExpenses(fundId);
      if (expRes.success) setDrawerExpenses(expRes.data);
    } catch (err) {
      console.error('refreshDrawerData error:', err);
    }
  };

  const openCreateModal = () => {
    setModalError(null);
    setFundForm({
      name: '',
      purpose: '',
      description: '',
      targetAmount: '',
      contributionPerMember: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      dueDate: '',
      city: isLocalHead ? userCity : '',
      status: 'Active'
    });
    setSelectedFund(null);
    setActiveModal('create');
  };

  const openEditModal = (fund) => {
    setModalError(null);
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
      city: fund.city || '',
      status: fund.status
    });
    setActiveModal('edit');
  };

  const openExpenseModal = (fund) => {
    setSelectedFund(fund);
    setExpenseForm({
      title: '',
      description: '',
      amount: '',
      category: 'Maintenance',
      date: new Date().toISOString().split('T')[0],
      receiptAttached: false
    });
    setActiveModal('add-expense');
  };

  const openCashCollectionModal = async (fund, preselectedMember = null) => {
    setSelectedFund(fund);
    
    // Fetch members of this fund if not already loaded
    let contribs = drawerContributions;
    if (!isDrawerOpen || drawerFund?.id !== fund.id) {
      const contribRes = await headFundService.getFundContributions(fund.id);
      if (contribRes.success) {
        contribs = contribRes.data;
        setDrawerContributions(contribRes.data);
      }
    }

    setCashForm({
      memberId: preselectedMember ? preselectedMember.memberId : (contribs[0]?.memberId || ''),
      memberName: preselectedMember ? preselectedMember.name : (contribs[0]?.name || ''),
      amount: preselectedMember ? (preselectedMember.remainingAmount || fund.contributionPerMember) : (contribs[0]?.remainingAmount || fund.contributionPerMember),
      receiptNo: `REC-${Date.now().toString().slice(-6)}`,
      notes: '',
      date: new Date().toISOString().split('T')[0]
    });
    setCashMemberSearch('');
    setActiveModal('collect-cash');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmittingFund(true);

    try {
      const payload = {
        ...fundForm,
        targetAmount: Number(fundForm.targetAmount),
        contributionPerMember: Number(fundForm.contributionPerMember),
        startDate: fundForm.startDate || new Date().toISOString().split('T')[0],
        endDate: fundForm.endDate || undefined,
        dueDate: fundForm.dueDate || undefined,
        city: isLocalHead ? userCity : (fundForm.city || undefined)
      };

      if (activeModal === 'create') {
        const res = await headFundService.createFund(payload);
        if (res.success) {
          showToast(isLocalHead ? `Local Chapter Fund (${userCity}) launched successfully.` : 'Community Samaj Fund launched successfully.');
          loadData();
          setActiveModal(null);
        }
      } else {
        const res = await headFundService.updateFund(selectedFund.id, payload);
        if (res.success) {
          showToast('Samaj Fund details updated.');
          loadData();
          setActiveModal(null);
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Operation failed. Please try again.';
      setModalError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setIsSubmittingFund(false);
    }
  };

  const confirmDelete = async () => {
    try {
      const res = await headFundService.deleteFund(selectedFund.id);
      if (res.success) {
        showToast('Fund deleted successfully.');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Fund archived/closed.', 'warning');
    } finally {
      loadData();
      setActiveModal(null);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await headFundService.addExpense(selectedFund.id, expenseForm);
      if (res.success) {
        showToast('Expense recorded successfully.');
        loadData();
        if (isDrawerOpen && drawerFund?.id === selectedFund.id) {
          refreshDrawerData(selectedFund.id);
        }
        setActiveModal(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add expense.');
    }
  };

  const handleCashCollectionSubmit = async (e) => {
    e.preventDefault();
    if (!cashForm.memberId) {
      alert('Please select a member.');
      return;
    }
    if (!cashForm.amount || Number(cashForm.amount) <= 0) {
      alert('Please enter a valid cash amount.');
      return;
    }

    try {
      setIsSubmittingCash(true);
      const res = await headFundService.recordCashPayment(selectedFund.id, {
        memberId: cashForm.memberId,
        amount: Number(cashForm.amount),
        receiptNo: cashForm.receiptNo,
        notes: cashForm.notes,
        date: cashForm.date
      });

      if (res.success) {
        showToast(`₹${cashForm.amount} cash collection recorded & member notified!`, 'success');
        await loadData();
        if (isDrawerOpen && drawerFund?.id === selectedFund.id) {
          await refreshDrawerData(selectedFund.id);
        }
        setActiveModal(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record cash payment.');
    } finally {
      setIsSubmittingCash(false);
    }
  };

  // Client-side filtering
  const filteredFunds = funds.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (f.city && f.city.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filters.status === 'All' || f.status === filters.status;
    const matchesScope = filters.scope === 'All' || f.scope === filters.scope;
    return matchesSearch && matchesStatus && matchesScope;
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 font-sans rounded-3xl">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-5 right-5 px-5 py-3.5 rounded-2xl shadow-xl text-white font-bold text-xs z-55 flex items-center gap-2.5 animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-600 shadow-emerald-200' : 'bg-amber-600 shadow-amber-200'
        }`}>
          <CheckCircle2 size={16} />
          {toast.message}
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isLocalHead ? `Local Chapter Funds (${userCity})` : 'Community Master Funds & Dues'}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
              isLocalHead ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-purple-50 text-purple-700 border-purple-200'
            }`}>
              {isLocalHead ? 'Local Head Desk' : 'Community Head Desk'}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {isLocalHead 
              ? `Manage local chapter dues, verify donations & record cash payments for ${userCity}`
              : `Control community-wide and local chapter funds for ${headCommunityName}`}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={loadData}
            title="Refresh Ledger Data"
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer shadow-sm"
          >
            <RefreshCw size={18} />
          </button>
          
          <button 
            onClick={openCreateModal}
            className="bg-[#7C3AED] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-md shadow-purple-200 cursor-pointer"
          >
            <Plus size={16} /> {isLocalHead ? 'Launch Local Fund' : 'Launch Samaj Fund'}
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
            <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Pool</p>
            <p className="text-2xl font-black text-slate-900">₹ {stats.overallTarget.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-2">{stats.totalFunds} Active Campaigns</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
            <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Collected</p>
            <p className="text-2xl font-black text-emerald-600">₹ {stats.overallCollected.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-emerald-600/70 font-semibold mt-2">Online Gateway & Offline Cash</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
            <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Expenses</p>
            <p className="text-2xl font-black text-rose-600">₹ {stats.overallExpenses.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-2">Audited disbursements</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden bg-gradient-to-br from-indigo-50/60 to-white">
            <p className="text-[10.5px] font-bold text-indigo-700 uppercase tracking-wider mb-1">Net Balance Available</p>
            <p className="text-2xl font-black text-indigo-950">₹ {stats.availableBalance.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-rose-500 font-bold mt-2">₹ {stats.overallPending.toLocaleString('en-IN')} Remaining Dues</p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="w-full md:flex-1 md:max-w-sm relative">
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by fund name, purpose, or city..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold outline-none focus:border-purple-400 focus:bg-white transition-all text-slate-800"
          />
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scope</label>
            <select 
              value={filters.scope}
              onChange={(e) => setFilters({ ...filters, scope: e.target.value })}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-purple-400 text-slate-800"
            >
              <option value="All">All Scopes</option>
              <option value="COMMUNITY">Community Wide</option>
              <option value="LOCAL">Local Chapter</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
            <select 
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-purple-400 text-slate-800"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Funds Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="p-4 pl-6">Fund Details</th>
                <th className="p-4">Governance Scope</th>
                <th className="p-4 text-right">Target Amount</th>
                <th className="p-4 text-right">Fee Per Member</th>
                <th className="p-4 text-right">Collected Pool</th>
                <th className="p-4 text-right">Remaining Dues</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 pr-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-[13px]">
              {filteredFunds.map(fund => {
                const progress = fund.targetAmount > 0 ? Math.min(Math.round((fund.collectedAmount / fund.targetAmount) * 100), 100) : 0;
                const isLocalFund = fund.scope === 'LOCAL' || fund.creatorType === 'LOCAL_HEAD';

                return (
                  <tr key={fund.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-slate-900 text-sm leading-snug">{fund.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{fund.purpose}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          isLocalFund 
                            ? 'bg-amber-50 text-amber-800 border-amber-200' 
                            : 'bg-purple-50 text-purple-800 border-purple-200'
                        }`}>
                          {isLocalFund ? `Local (${fund.city || 'Chapter'})` : 'Community Master'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">By {fund.createdBy}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-black text-slate-900">₹ {fund.targetAmount.toLocaleString('en-IN')}</td>
                    <td className="p-4 text-right font-bold text-slate-600">₹ {fund.contributionPerMember.toLocaleString('en-IN')}</td>
                    <td className="p-4 text-right">
                      <span className="font-black text-emerald-600">₹ {fund.collectedAmount.toLocaleString('en-IN')}</span>
                      <div className="w-16 h-1 bg-slate-100 rounded-full mt-1.5 ml-auto overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                    </td>
                    <td className="p-4 text-right font-black text-rose-600">₹ {fund.remainingAmount.toLocaleString('en-IN')}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                        fund.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {fund.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* 1. View Drawer */}
                        <button 
                          onClick={() => openDrawer(fund.id)}
                          title="View Fund Ledger & Audit"
                          className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-purple-600 hover:border-purple-200 flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <Eye size={14} />
                        </button>

                        {/* 2. Collect Cash Payment */}
                        <button 
                          onClick={() => openCashCollectionModal(fund)}
                          title="Record Cash Collection from Member"
                          className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <Banknote size={14} />
                        </button>

                        {/* 3. Log Expense */}
                        <button 
                          onClick={() => openExpenseModal(fund)}
                          title="Log Audited Expense"
                          className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <Receipt size={14} />
                        </button>

                        {/* 4. Edit */}
                        <button 
                          onClick={() => openEditModal(fund)}
                          title="Edit Campaign"
                          className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-purple-600 hover:border-purple-200 flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <Edit3 size={14} />
                        </button>

                        {/* 5. Delete */}
                        <button 
                          onClick={() => { setSelectedFund(fund); setActiveModal('delete-confirm'); }}
                          title="Delete / Close Fund"
                          className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center cursor-pointer transition-colors"
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
                  <td colSpan={8} className="p-10 text-center text-slate-400 font-bold">
                    No funds found matching filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── CREATE & EDIT CAMPAIGN MODAL ─── */}
      <AnimatePresence>
        {activeModal && (activeModal === 'create' || activeModal === 'edit') && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl relative z-10 p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-md font-black text-slate-900 flex items-center gap-2">
                  <ShieldAlert size={18} className="text-purple-600" />
                  {activeModal === 'create' 
                    ? (isLocalHead ? `Launch Local Chapter Fund (${userCity})` : 'Launch Community Samaj Fund') 
                    : 'Edit Samaj Fund'}
                </h3>
                <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl text-xs font-bold text-purple-900 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-purple-600 block uppercase tracking-wider mb-0.5">Assigned Scope</span>
                    {isLocalHead ? `Local Chapter (${userCity})` : `Community Master (${headCommunityName})`}
                  </div>
                  <span className="text-[10px] bg-purple-200/60 text-purple-800 px-2 py-0.5 rounded font-extrabold uppercase">
                    {isLocalHead ? 'Local Head' : 'Community Head'}
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fund Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g., Dharamshala Maintenance / Local Area Fund" 
                    value={fundForm.name}
                    onChange={(e) => setFundForm({...fundForm, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-400 focus:bg-white text-xs text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Purpose / Tag *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g., Annual Renovation Works" 
                    value={fundForm.purpose}
                    onChange={(e) => setFundForm({...fundForm, purpose: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-400 focus:bg-white text-xs text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Goal (₹) *</label>
                    <input 
                      type="number" 
                      required
                      placeholder="500000" 
                      value={fundForm.targetAmount}
                      onChange={(e) => setFundForm({...fundForm, targetAmount: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-400 focus:bg-white text-xs text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contribution/Member (₹) *</label>
                    <input 
                      type="number" 
                      required
                      placeholder="2500" 
                      value={fundForm.contributionPerMember}
                      onChange={(e) => setFundForm({...fundForm, contributionPerMember: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-400 focus:bg-white text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Date</label>
                    <input 
                      type="date" 
                      value={fundForm.startDate}
                      onChange={(e) => setFundForm({...fundForm, startDate: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-400 focus:bg-white text-[11px] text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">End Date</label>
                    <input 
                      type="date" 
                      value={fundForm.endDate}
                      onChange={(e) => setFundForm({...fundForm, endDate: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-400 focus:bg-white text-[11px] text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Due Date</label>
                    <input 
                      type="date" 
                      value={fundForm.dueDate}
                      onChange={(e) => setFundForm({...fundForm, dueDate: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-400 focus:bg-white text-[11px] text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campaign Summary</label>
                  <textarea 
                    rows="3"
                    placeholder="Describe campaign goals and allocation of funds..." 
                    value={fundForm.description}
                    onChange={(e) => setFundForm({...fundForm, description: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-400 focus:bg-white text-xs text-slate-800 resize-none"
                  />
                </div>

                {activeModal === 'edit' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status *</label>
                    <select 
                      value={fundForm.status}
                      onChange={(e) => setFundForm({...fundForm, status: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-400 focus:bg-white text-xs text-slate-800 font-bold"
                    >
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                      <option value="Closed">Closed</option>
                      <option value="Expired">Expired</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                )}

                {modalError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span>{modalError}</span>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isSubmittingFund}
                  className="w-full py-3 rounded-xl bg-[#7C3AED] text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-purple-200 hover:bg-opacity-90 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 transition-all"
                >
                  {isSubmittingFund ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    activeModal === 'create' ? 'Authorize & Launch Fund' : 'Save Details'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── RECORD CASH PAYMENT MODAL ─── */}
      <AnimatePresence>
        {activeModal === 'collect-cash' && selectedFund && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-md bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl relative z-10 p-6 space-y-4 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <Banknote size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Record Cash Collection</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{selectedFund.name}</p>
                  </div>
                </div>
                <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCashCollectionSubmit} className="space-y-4">
                {/* Select Member */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Contributor / Member *</label>
                  
                  {/* Search input for members */}
                  <input 
                    type="text" 
                    placeholder="Search member by name..." 
                    value={cashMemberSearch}
                    onChange={(e) => setCashMemberSearch(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-purple-400 mb-1"
                  />

                  <select 
                    value={cashForm.memberId}
                    onChange={(e) => {
                      const selected = drawerContributions.find(c => c.memberId === e.target.value);
                      setCashForm({
                        ...cashForm,
                        memberId: e.target.value,
                        memberName: selected ? selected.name : '',
                        amount: selected ? (selected.remainingAmount || selectedFund.contributionPerMember) : selectedFund.contributionPerMember
                      });
                    }}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white text-xs text-slate-900 font-bold"
                  >
                    <option value="">-- Choose Member --</option>
                    {drawerContributions
                      .filter(c => !cashMemberSearch || c.name.toLowerCase().includes(cashMemberSearch.toLowerCase()))
                      .map(c => (
                        <option key={c.memberId} value={c.memberId}>
                          {c.name} {c.phone ? `(${c.phone})` : ''} - Due: ₹{c.remainingAmount} [{c.status}]
                        </option>
                      ))}
                  </select>
                </div>

                {/* Amount to collect */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cash Amount Received (₹) *</label>
                    <span className="text-[10px] font-bold text-emerald-600">Physical Cash Handover</span>
                  </div>
                  <input 
                    type="number" 
                    required
                    min="1"
                    placeholder="e.g., 2500" 
                    value={cashForm.amount}
                    onChange={(e) => setCashForm({...cashForm, amount: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white text-sm font-black text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Receipt No</label>
                    <input 
                      type="text" 
                      placeholder="REC-001" 
                      value={cashForm.receiptNo}
                      onChange={(e) => setCashForm({...cashForm, receiptNo: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white text-xs font-semibold text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collection Date</label>
                    <input 
                      type="date" 
                      value={cashForm.date}
                      onChange={(e) => setCashForm({...cashForm, date: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white text-xs font-semibold text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collector Remarks / Note</label>
                  <textarea 
                    rows="2"
                    placeholder="Handed over cash in person..." 
                    value={cashForm.notes}
                    onChange={(e) => setCashForm({...cashForm, notes: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white text-xs text-slate-800 resize-none"
                  />
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-[11px] text-emerald-900 font-medium">
                  🔒 Member will receive an instant in-app notification and verified receipt under their Samaj Fund account.
                </div>

                <button 
                  type="submit"
                  disabled={isSubmittingCash}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-emerald-200 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCash ? 'Recording...' : `Confirm Cash Receipt (₹${Number(cashForm.amount || 0).toLocaleString('en-IN')})`}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── LOG EXPENSE MODAL ─── */}
      <AnimatePresence>
        {activeModal === 'add-expense' && selectedFund && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-md bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl relative z-10 p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-md font-black text-slate-950 flex items-center gap-2">
                  <Receipt size={18} className="text-rose-500" />
                  Log Audited Expense
                </h3>
                <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expense Title *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g., Dharamshala Electricity / Maintenance" 
                    value={expenseForm.title}
                    onChange={(e) => setExpenseForm({...expenseForm, title: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-400 focus:bg-white text-xs text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount (₹) *</label>
                    <input 
                      type="number" 
                      required
                      placeholder="e.g., 45000" 
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-400 focus:bg-white text-xs text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
                    <select 
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-400 focus:bg-white text-xs text-slate-800"
                    >
                      <option value="Maintenance">Maintenance</option>
                      <option value="Education">Education</option>
                      <option value="Medical">Medical</option>
                      <option value="Social Event">Social Event</option>
                      <option value="Infrastructure">Infrastructure</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</label>
                  <input 
                    type="date" 
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-400 focus:bg-white text-xs text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Summary Notes</label>
                  <textarea 
                    rows="2"
                    placeholder="Short notes on disbursement..." 
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-400 focus:bg-white text-xs text-slate-800 resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 rounded-xl bg-rose-600 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-rose-200 hover:bg-opacity-90 cursor-pointer"
                >
                  Log Transaction
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── DELETE CONFIRM MODAL ─── */}
      <AnimatePresence>
        {activeModal === 'delete-confirm' && selectedFund && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl relative z-10 p-6 space-y-4 text-slate-850"
            >
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-2">
                <ShieldAlert size={22} />
              </div>
              <h3 className="text-md font-bold text-slate-900 mb-1">Delete Samaj Fund?</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Confirm deletion of <strong>{selectedFund.name}</strong>. 
                <br />
                <span className="font-semibold text-rose-600 mt-2 block">If payments exist, it will be Closed instead of deleted to protect ledger history.</span>
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 shadow-md shadow-rose-200 cursor-pointer"
                >
                  Delete Fund
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── DETAIL DRAWER ─── */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex justify-end">
          <div className="flex-1" onClick={() => setIsDrawerOpen(false)} />
          
          <div className="w-full max-w-xl bg-white border-l border-slate-250 shadow-2xl h-screen flex flex-col overflow-hidden relative">
            {/* Drawer Header */}
            {drawerFund && (
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex-1 min-w-0 pr-8">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                      drawerFund.scope === 'LOCAL' 
                        ? 'bg-amber-50 text-amber-800 border-amber-200' 
                        : 'bg-purple-50 text-purple-800 border-purple-200'
                    }`}>
                      {drawerFund.scope === 'LOCAL' ? `Local Fund (${drawerFund.city || 'Chapter'})` : 'Community Master Fund'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">By {drawerFund.createdBy}</span>
                  </div>
                  <h3 className="text-md font-black text-slate-900 leading-tight mt-1.5 truncate">{drawerFund.name}</h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{drawerFund.purpose}</p>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Drawer Tabs */}
            <div className="flex border-b border-slate-100 bg-white px-5">
              {[
                { id: 'overview', name: 'Overview' },
                { id: 'contributions', name: 'Member Ledger' },
                { id: 'transactions', name: 'Transactions' },
                { id: 'expenses', name: 'Expenses' }
              ].map(t => (
                <button 
                  key={t.id}
                  onClick={() => setDrawerTab(t.id)}
                  className={`py-3 px-3.5 font-bold text-[11px] uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    drawerTab === t.id ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-450 hover:text-slate-900'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50">
              {drawerLoading ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin mb-3" />
                  <p className="text-[10px] text-slate-400 font-bold">Synchronizing ledger...</p>
                </div>
              ) : drawerFund ? (
                <>
                  {/* TAB 1: OVERVIEW */}
                  {drawerTab === 'overview' && (
                    <div className="space-y-5 text-left">
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                        <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-wider border-b border-slate-100 pb-1">Summary & Purpose</h4>
                        <p className="text-xs font-semibold text-slate-700 leading-relaxed">{drawerFund.description || 'No description provided.'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Assigned Target</p>
                          <p className="text-lg font-black text-slate-900 mt-0.5">₹ {drawerFund.targetAmount.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                          <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Total Collected</p>
                          <p className="text-lg font-black text-emerald-600 mt-0.5">₹ {drawerFund.collectedAmount.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                          <p className="text-[9px] font-bold text-rose-600 uppercase tracking-wider">Total Expenditures</p>
                          <p className="text-lg font-black text-rose-600 mt-0.5">₹ {drawerFund.expenseAmount.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs bg-gradient-to-br from-indigo-50/60 to-white">
                          <p className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider">Net Balance</p>
                          <p className="text-lg font-black text-indigo-950 mt-0.5">₹ {drawerFund.availableBalance.toLocaleString('en-IN')}</p>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                        <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-wider border-b border-slate-100 pb-1.5">Timeline</h4>
                        <div className="grid grid-cols-3 gap-2 text-[11px] font-bold text-slate-500">
                          <div>
                            <p className="text-[8.5px] text-slate-400 uppercase mb-0.5">Start Date</p>
                            <p className="text-slate-800">{drawerFund.startDate || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[8.5px] text-slate-400 uppercase mb-0.5">End Date</p>
                            <p className="text-slate-800">{drawerFund.endDate || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[8.5px] text-slate-400 uppercase mb-0.5">Due Date</p>
                            <p className="text-rose-600 font-black">{drawerFund.dueDate || '-'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Cash collection CTA */}
                      <button 
                        onClick={() => openCashCollectionModal(drawerFund)}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-200 cursor-pointer"
                      >
                        <Banknote size={18} /> Record Member Cash Collection
                      </button>
                    </div>
                  )}

                  {/* TAB 2: MEMBER LEDGER */}
                  {drawerTab === 'contributions' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          {drawerContributions.length} Enrolled Members
                        </span>
                        <button 
                          onClick={() => openCashCollectionModal(drawerFund)}
                          className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-bold uppercase flex items-center gap-1 hover:bg-emerald-100 cursor-pointer"
                        >
                          <Plus size={12} /> Collect Cash
                        </button>
                      </div>

                      <div className="bg-white border border-slate-200 overflow-hidden rounded-2xl shadow-xs">
                        <table className="w-full text-left border-collapse text-xs text-slate-800">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                              <th className="p-3 pl-4">Member</th>
                              <th className="p-3 text-right">Assigned</th>
                              <th className="p-3 text-right">Paid</th>
                              <th className="p-3 text-center">Status</th>
                              <th className="p-3 pr-4 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold">
                            {drawerContributions.map((c, i) => (
                              <tr key={i} className="hover:bg-slate-50/50">
                                <td className="p-3 pl-4">
                                  <p className="font-bold text-slate-900">{c.name}</p>
                                  <p className="text-[9px] text-slate-400">{c.phone || c.email} {c.city ? `• ${c.city}` : ''}</p>
                                </td>
                                <td className="p-3 text-right text-slate-500">₹{c.assignedAmount}</td>
                                <td className="p-3 text-right font-black text-emerald-600">₹{c.paidAmount}</td>
                                <td className="p-3 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                    c.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : c.status === 'Partial' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                                  }`}>
                                    {c.status}
                                  </span>
                                </td>
                                <td className="p-3 pr-4 text-center">
                                  {c.remainingAmount > 0 ? (
                                    <button 
                                      onClick={() => openCashCollectionModal(drawerFund, c)}
                                      title="Record Cash Collection"
                                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 mx-auto cursor-pointer"
                                    >
                                      <Banknote size={11} /> Cash
                                    </button>
                                  ) : (
                                    <CheckCircle size={16} className="text-emerald-500 mx-auto" />
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: TRANSACTIONS */}
                  {drawerTab === 'transactions' && (
                    <div className="space-y-3">
                      {drawerTransactions.map(tx => (
                        <div key={tx.id} className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between text-xs font-semibold text-slate-800">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900">{tx.memberName}</p>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                tx.paymentMode === 'Cash' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              }`}>
                                {tx.paymentMode || 'Online'}
                              </span>
                            </div>
                            <p className="text-[9px] text-slate-400 mt-0.5">
                              {tx.txnId} {tx.collectedBy ? `• Verified by ${tx.collectedBy}` : ''}
                            </p>
                            {tx.notes && (
                              <p className="text-[9px] text-slate-500 mt-0.5 italic">"{tx.notes}"</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-black text-emerald-600 text-sm">₹ {tx.amount.toLocaleString('en-IN')}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">{new Date(tx.date).toLocaleDateString('en-GB')}</p>
                          </div>
                        </div>
                      ))}

                      {drawerTransactions.length === 0 && (
                        <div className="text-center py-10 font-bold text-slate-400 text-xs">
                          No transaction history logged yet.
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: EXPENSES */}
                  {drawerTab === 'expenses' && (
                    <div className="space-y-3">
                      {drawerExpenses.map(e => (
                        <div key={e.id} className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between text-xs font-semibold text-slate-800">
                          <div>
                            <p className="font-bold text-slate-900">{e.title}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">{e.category} • Audited by {e.addedBy}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-rose-600 text-sm">₹ {e.amount.toLocaleString('en-IN')}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">{new Date(e.date).toLocaleDateString('en-GB')}</p>
                          </div>
                        </div>
                      ))}

                      {drawerExpenses.length === 0 && (
                        <div className="text-center py-10 font-bold text-slate-400 text-xs">
                          No operational expenses recorded.
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
};

export default FundGovernance;
