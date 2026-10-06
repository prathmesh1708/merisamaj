import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import ManualDonationModal from '../../../../components/donation/ManualDonationModal';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HeartHandshake, Search, Sliders, RefreshCw, Download, Plus, Eye, Edit3, 
  ShieldAlert, Archive, Trash2, CheckCircle2, XCircle, MapPin, Calendar, 
  ArrowUpRight, Info, FileText, ChevronRight, Phone, Globe, IndianRupee, 
  FileSpreadsheet, Clock, CheckSquare, ShieldX, TrendingUp, Sparkles, 
  AlertTriangle, Filter, DollarSign, Wallet, Users, Send, Check, X, Printer
} from 'lucide-react';
import { Avatar } from '../../../member/components/common/Avatar';

// Import Services
import { campaignService } from '../../services/campaignService';
import { donationService } from '../../services/donationService';
import { financialAnalyticsService } from '../../services/financialAnalyticsService';
import { donationAuditService } from '../../services/donationAuditService';
import { receiptService } from '../../services/receiptService';

// Import Charts
import { 
  LineChart, AreaChart, BarChart, DonutChart, ProgressRing, Sparkline 
} from '../../../head/pages/reports/components/ChartComponents';

export default function GlobalDonationManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  
  // Data States
  const [campaigns, setCampaigns] = useState([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    community: 'All',
    city: 'All',
    campaignId: 'All',
    paymentStatus: 'All',
    campaignStatus: 'All',
    campaignType: 'All',
    minAmount: '',
    maxAmount: '',
    paymentMethod: 'All',
    sort: 'newest'
  });

  // UI / Modal States
  const [toast, setToast] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerCampaign, setDrawerCampaign] = useState(null);
  const [drawerTab, setDrawerTab] = useState('overview'); // overview | contributions | stats | docs | announcements | audits

  // Action Modals State
  const [activeModal, setActiveModal] = useState(null); // 'create' | 'edit' | 'proof' | 'refund' | 'override' | 'confirm' | null
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [refundNotes, setRefundNotes] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');

  // Form State for Create/Edit Campaign
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    community: 'Agrawal Samaj',
    city: 'Indore',
    type: 'Infrastructure',
    targetAmount: '',
    startDate: '',
    endDate: '',
    description: ''
  });

  // Confirm Actions variables
  const [confirmAction, setConfirmAction] = useState({
    type: '', // 'close' | 'archive' | 'suspend' | 'resume' | 'delete'
    targetId: null,
    title: '',
    message: ''
  });

  // Input announcements & documents
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocFile, setNewDocFile] = useState('proposal_draft.pdf');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Campaigns
      const campRes = await campaignService.getCampaigns({
        searchQuery: activeTab === 'campaigns' ? searchQuery : '',
        community: filters.community,
        city: filters.city,
        campaignStatus: filters.campaignStatus,
        campaignType: filters.campaignType,
        minAmount: filters.minAmount,
        maxAmount: filters.maxAmount,
        sort: filters.sort
      });
      setCampaigns(campRes.data);

      // Transactions
      const txRes = await donationService.getTransactions({
        searchQuery: activeTab === 'transactions' ? searchQuery : '',
        community: filters.community,
        city: filters.city,
        campaignId: filters.campaignId,
        paymentStatus: filters.paymentStatus,
        paymentMethod: filters.paymentMethod,
        minAmount: filters.minAmount,
        maxAmount: filters.maxAmount,
        sort: filters.sort
      });
      setTransactions(txRes.data);

      // Analytics
      const analRes = await financialAnalyticsService.getDashboardAnalytics();
      setAnalytics(analRes);

      // Audits
      const audRes = await donationAuditService.getAuditLogs({
        searchQuery: activeTab === 'audit' ? searchQuery : ''
      });
      setAuditLogs(audRes.data);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch financial records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [
    activeTab,
    searchQuery,
    filters.community,
    filters.city,
    filters.campaignId,
    filters.paymentStatus,
    filters.campaignStatus,
    filters.campaignType,
    filters.minAmount,
    filters.maxAmount,
    filters.paymentMethod,
    filters.sort
  ]);

  const handleResetFilters = () => {
    setFilters({
      community: 'All',
      city: 'All',
      campaignId: 'All',
      paymentStatus: 'All',
      campaignStatus: 'All',
      campaignType: 'All',
      minAmount: '',
      maxAmount: '',
      paymentMethod: 'All',
      sort: 'newest'
    });
    setSearchQuery('');
    showToast('Filters reset successfully');
  };

  const handleExport = (format, reportType) => {
    let exportData = [];
    let filename = '';

    if (reportType === 'campaigns') {
      exportData = campaigns;
      filename = `samaj_campaign_report.${format.toLowerCase()}`;
    } else if (reportType === 'transactions') {
      exportData = transactions;
      filename = `donation_transactions_ledger.${format.toLowerCase()}`;
    } else {
      exportData = auditLogs;
      filename = `donation_system_audit.${format.toLowerCase()}`;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Exported ${exportData.length} records in ${format} format!`);
  };

  // Campaigns Actions
  const handleOpenCreateCampaign = () => {
    setCampaignForm({
      name: '',
      community: 'Agrawal Samaj',
      city: 'Indore',
      type: 'Infrastructure',
      targetAmount: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: ''
    });
    setSelectedCampaign(null);
    setActiveModal('create');
  };

  const handleOpenEditCampaign = (campaign) => {
    setSelectedCampaign(campaign);
    setCampaignForm({
      name: campaign.name,
      community: campaign.community,
      city: campaign.city,
      type: campaign.type,
      targetAmount: campaign.targetAmount,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      description: campaign.description || ''
    });
    setActiveModal('edit');
  };

  const submitCampaignForm = async (e) => {
    e.preventDefault();
    try {
      if (activeModal === 'create') {
        await campaignService.createCampaign(campaignForm);
        showToast('New donation campaign initialized!');
      } else {
        await campaignService.updateCampaign(selectedCampaign.id, campaignForm);
        showToast('Campaign details updated successfully.');
      }
      setActiveModal(null);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const triggerCampaignStateChange = (type, targetId) => {
    const messages = {
      close: 'This will mark the campaign as completed and prevent any future contributions. The funds collected will remain allocated.',
      archive: 'This will move the campaign into deep historical records, hiding it from default active directory grids.',
      suspend: 'This will freeze this campaign, warning members and blocking active payment methods.',
      resume: 'This will lift the suspend flag and reactive the campaign for global community contributions.',
      delete: 'Perform a soft-delete? Campaign will be hidden but details remain retrievable by developers.'
    };
    const titles = {
      close: 'Close Samaj Campaign?',
      archive: 'Archive Fund Campaign?',
      suspend: 'Suspend Donation Campaign?',
      resume: 'Resume Suspended Campaign?',
      delete: 'Soft-Delete Fund Campaign?'
    };

    setConfirmAction({
      type,
      targetId,
      title: titles[type],
      message: messages[type]
    });
    setActiveModal('confirm');
  };

  const executeConfirmAction = async () => {
    const { type, targetId } = confirmAction;
    try {
      if (type === 'close') {
        await campaignService.changeCampaignStatus(targetId, 'Completed', 'Closed by Master Admin override.');
        showToast('Campaign successfully completed and closed.', 'info');
      } else if (type === 'archive') {
        await campaignService.changeCampaignStatus(targetId, 'Archived', 'Archived by Master Admin operator.');
        showToast('Campaign transferred to archive vaults.', 'info');
      } else if (type === 'suspend') {
        await campaignService.changeCampaignStatus(targetId, 'Suspended', 'Suspended due to audit query.');
        showToast('Campaign suspended. Contributions frozen.', 'warning');
      } else if (type === 'resume') {
        await campaignService.changeCampaignStatus(targetId, 'Active', 'Re-activated by Master Admin.');
        showToast('Campaign resumed. Contributions enabled.', 'success');
      } else if (type === 'delete') {
        await campaignService.softDeleteCampaign(targetId);
        showToast('Campaign soft-deleted.', 'error');
      }
      
      // Close side drawer if matching
      if (drawerCampaign && drawerCampaign.id === targetId) {
        setIsDrawerOpen(false);
      }

      setActiveModal(null);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenOverride = (campaign) => {
    setSelectedCampaign(campaign);
    setOverrideNotes('');
    setActiveModal('override');
  };

  const submitOverrideDecision = async (approved) => {
    try {
      await campaignService.overrideDecision(selectedCampaign.id, approved, overrideNotes);
      showToast(approved ? 'Override: Campaign marked Active.' : 'Override: Campaign Suspended.', approved ? 'success' : 'warning');
      setActiveModal(null);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Transaction Actions
  const handleOpenProof = (txn) => {
    setSelectedTransaction(txn);
    setRejectionReason('');
    setActiveModal('proof');
  };

  const approvePayment = async (txnId) => {
    try {
      await donationService.approveManualPayment(txnId);
      showToast('Payment verification check-off successful!', 'success');
      setActiveModal(null);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const rejectPayment = async (txnId) => {
    if (!rejectionReason.trim()) {
      showToast('Please state a rejection reason.', 'warning');
      return;
    }
    try {
      await donationService.rejectPayment(txnId, rejectionReason);
      showToast('Manual payment proof rejected. Notification dispatched.', 'error');
      setActiveModal(null);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenRefund = (txn) => {
    setSelectedTransaction(txn);
    setRefundNotes('');
    setActiveModal('refund');
  };

  const submitRefund = async () => {
    try {
      await donationService.issueRefund(selectedTransaction.id, refundNotes);
      showToast('Refund issued. Core treasury updated.', 'info');
      setActiveModal(null);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const printReceipt = async (txnId) => {
    try {
      await receiptService.printReceipt(txnId);
      showToast('Document receipt compiled. Sending to spooler...');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Side Drawer additions
  const addAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) {
      showToast('Fill in all fields for the announcement.', 'warning');
      return;
    }
    try {
      const updated = await campaignService.addAnnouncement(drawerCampaign.id, newAnnouncement.title, newAnnouncement.content);
      setDrawerCampaign(updated);
      setNewAnnouncement({ title: '', content: '' });
      showToast('Announcement broadcasted and synced.');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const addDocument = async () => {
    if (!newDocTitle) {
      showToast('Document title is required.', 'warning');
      return;
    }
    try {
      const updated = await campaignService.uploadDocument(drawerCampaign.id, newDocTitle, newDocFile);
      setDrawerCampaign(updated);
      setNewDocTitle('');
      showToast('Official document uploaded and verified.');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenDrawer = (campaign) => {
    setDrawerCampaign(campaign);
    setDrawerTab('overview');
    setIsDrawerOpen(true);
  };

  const drawerContributionsList = useMemo(() => {
    if (!drawerCampaign) return [];
    return transactions.filter(t => t.campaignId === drawerCampaign.id);
  }, [drawerCampaign, transactions]);

  // Unique list filters calculations
  const uniqueCities = useMemo(() => {
    const list = campaigns.map(c => c.city);
    return ['All', ...new Set(list)];
  }, [campaigns]);

  const uniqueCommunities = useMemo(() => {
    const list = campaigns.map(c => c.community);
    return ['All', ...new Set(list)];
  }, [campaigns]);

  const activeTabClass = (tabName) => {
    return activeTab === tabName 
      ? 'border-purple-500 text-purple-600 bg-purple-500/5 font-extrabold shadow-sm'
      : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-bold';
  };

  return (
    <div className="space-y-6 pb-12 relative min-h-screen">
      {/* Aurora Ambient Aura Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[500px] h-[500px] rounded-full bg-purple-500/5 filter blur-[80px]" />
        <div className="absolute top-[40%] -right-[10%] w-[600px] h-[600px] rounded-full bg-violet-600/5 filter blur-[100px]" />
      </div>

      <div className="relative z-10 flex justify-end">
        <button onClick={() => setManualOpen(true)} className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-sm font-bold hover:bg-white/20 transition-colors">+ Manual Donation</button>
      </div>
      <ManualDonationModal open={manualOpen} onClose={() => setManualOpen(false)} campaigns={campaigns} onSaved={() => window.location.reload()} />

      {/* ─── TOAST NOTIFICATIONS ─── */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-55 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-md ${
              toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
              toast.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
              toast.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
              'bg-purple-500/10 border-purple-500/20 text-purple-400'
            }`}
          >
            <CheckCircle2 size={18} />
            <span className="text-xs font-extrabold tracking-wide uppercase">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── PAGE HEADER ─── */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <HeartHandshake className="text-purple-600" />
            Global Donation & Community Fund Control Center
          </h2>
          <p className="text-xs text-slate-500 mt-1">Audit transactions, manage fund campaigns, approve payments, and compare performance across all Samaj chapters.</p>
        </div>
        <button 
          onClick={handleOpenCreateCampaign}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider press-scale flex items-center gap-2 shadow-lg shadow-purple-500/20"
        >
          <Plus size={14} /> Launch Fund Campaign
        </button>
      </section>

      {/* ─── SUB TABS NAVIGATION ─── */}
      <div className="border-b border-slate-100 flex items-center gap-1 overflow-x-auto no-scrollbar py-1 relative z-10">
        {[
          { id: 'overview', label: 'Dashboard Overview', icon: Wallet },
          { id: 'campaigns', label: 'Campaign Directory', icon: FileText },
          { id: 'transactions', label: 'Transaction Center', icon: IndianRupee },
          { id: 'analytics', label: 'Financial Analytics', icon: TrendingUp },
          { id: 'comparison', label: 'Samaj Comparison', icon: Users },
          { id: 'audit', label: 'Audit Tracker', icon: Clock }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setSearchParams({ tab: t.id })}
              className={`flex items-center gap-2 px-4 py-2 text-xs border-b-2 transition-all whitespace-nowrap rounded-t-xl ${activeTabClass(t.id)}`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          )
        })}
      </div>

      {loading && !analytics ? (
        /* Skeleton Loading */
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse border border-slate-200/50" />
            ))}
          </div>
          <div className="h-96 rounded-3xl bg-slate-100 animate-pulse border border-slate-200/50" />
        </div>
      ) : (
        <div className="space-y-6 relative z-10">
          
          {/* ────────────────────────────────────────── */}
          {/* TAB 1: OVERVIEW                            */}
          {/* ────────────────────────────────────────── */}
          {activeTab === 'overview' && analytics && (
            <div className="space-y-6 animate-fade-in">
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { title: 'Total Collection', value: `₹${analytics.stats.totalCollection.toLocaleString()}`, trend: [20, 45, 28, 60, 55, 80], change: '+24.5%', color: 'from-purple-600 to-indigo-600', action: 'transactions' },
                  { title: 'Total Donations', value: analytics.stats.totalDonors * 2.5 + ' Recs', trend: [10, 15, 8, 25, 20, 30], change: '+12.3%', color: 'from-indigo-600 to-blue-600', action: 'transactions' },
                  { title: 'Pending Dues', value: `₹${analytics.stats.pendingContributions.toLocaleString()}`, trend: [40, 20, 35, 10, 25, 15], change: '-5.2%', color: 'from-blue-600 to-cyan-600', action: 'transactions' },
                  { title: 'Active Campaigns', value: analytics.stats.activeCampaigns, trend: [2, 3, 3, 4, 5, 5], change: '+2 Campaigns', color: 'from-violet-600 to-fuchsia-600', action: 'campaigns' },
                  { title: 'Finished Projects', value: analytics.stats.completedCampaigns, trend: [1, 1, 2, 2, 3, 3], change: 'Goal Met', color: 'from-emerald-600 to-teal-600', action: 'campaigns' },
                  { title: 'Monthly Collection', value: `₹${analytics.stats.monthlyCollection.toLocaleString()}`, trend: [50, 80, 45, 120, 95, 150], change: '+18.9%', color: 'from-fuchsia-600 to-pink-600', action: 'analytics' },
                  { title: 'Annual Collection', value: `₹${analytics.stats.annualCollection.toLocaleString()}`, trend: [100, 150, 180, 250, 320, 400], change: '+32.4%', color: 'from-pink-600 to-rose-600', action: 'analytics' },
                  { title: 'Avg Donation', value: `₹${analytics.stats.averageDonation.toLocaleString()}`, trend: [3000, 4500, 3500, 6000, 5000, 8000], change: '+15%', color: 'from-purple-500 to-pink-500', action: 'analytics' },
                  { title: 'Unique Donors', value: analytics.stats.totalDonors, trend: [5, 12, 18, 30, 25, 45], change: 'Generous Samaj', color: 'from-teal-600 to-emerald-500', action: 'transactions' },
                  { title: 'Top Samaj Chapter', value: analytics.stats.highestContributingCommunity.split(' ')[0], trend: [1, 2, 2, 1, 1, 1], change: 'Highest Contributor', color: 'from-rose-600 to-amber-500', action: 'comparison' }
                ].map((kpi, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setSearchParams({ tab: kpi.action })}
                    className="card-neo p-4.5 bg-white border border-slate-100 hover:border-purple-500/20 hover:shadow-xl hover:shadow-purple-500/5 transition-all group cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{kpi.title}</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                          kpi.change.startsWith('+') ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-50 text-slate-600'
                        }`}>{kpi.change}</span>
                      </div>
                      <h4 className="text-[17px] font-black text-slate-800 mt-2 tracking-tight group-hover:text-purple-600 transition-colors">{kpi.value}</h4>
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-slate-50 flex items-center justify-between gap-4">
                      <div className="w-16 h-5">
                        <Sparkline data={kpi.trend} color="#9333EA" width={70} height={20} />
                      </div>
                      <span className="text-[9px] text-purple-600 font-extrabold uppercase tracking-widest flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        View <ArrowUpRight size={10} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Core Dashboard Content splits */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Active Campaigns Progress (Left 2 cols) */}
                <div className="lg:col-span-2 card-neo p-6 bg-white border border-slate-100 space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <Wallet size={16} className="text-purple-600" />
                        Active Fund Campaign Milestones
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Real-time status check on target collection pools across all zones</p>
                    </div>
                    <button 
                      onClick={() => setSearchParams({ tab: 'campaigns' })}
                      className="text-[10px] font-black text-purple-600 uppercase tracking-widest hover:underline flex items-center gap-0.5"
                    >
                      View All Directory <ChevronRight size={12} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {campaigns.filter(c => c.status === 'Active').slice(0, 4).map(camp => {
                      const percentage = Math.min(100, Math.round((camp.collectedAmount / camp.targetAmount) * 100));
                      return (
                        <div 
                          key={camp.id} 
                          onClick={() => handleOpenDrawer(camp)}
                          className="p-4 rounded-2xl border border-slate-100/80 bg-slate-50/50 hover:bg-slate-50 hover:border-purple-200/50 transition-all cursor-pointer flex items-center justify-between"
                        >
                          <div className="space-y-1 pr-4 min-w-0 flex-1">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 uppercase tracking-widest">{camp.type}</span>
                            <h4 className="text-[13px] font-black text-slate-800 truncate leading-snug mt-1">{camp.name}</h4>
                            <p className="text-[9.5px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                              <MapPin size={10} /> {camp.city} | {camp.community}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-650 font-bold pt-1.5">
                              <span>₹{camp.collectedAmount.toLocaleString()} / ₹{camp.targetAmount.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="w-16 h-16 shrink-0 relative flex items-center justify-center">
                            <ProgressRing progress={percentage} size={60} color="#7C3AED" trackColor="#E9D5FF" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Queue of manual verification (Right 1 col) */}
                <div className="card-neo p-6 bg-white border border-slate-100 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="pb-3 border-b border-slate-50">
                      <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <ShieldAlert size={16} className="text-amber-500 animate-pulse" />
                        Verification Action Needed
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Approve manual payments and NEFT transfers to update ledger</p>
                    </div>

                    <div className="space-y-3.5 max-h-[280px] overflow-y-auto no-scrollbar">
                      {transactions.filter(t => t.paymentStatus === 'Pending Verification').length === 0 ? (
                        <div className="py-8 text-center">
                          <CheckCircle2 className="mx-auto text-emerald-500" size={32} />
                          <p className="text-[11px] text-slate-400 font-bold mt-2">All checks completed. Vault clean.</p>
                        </div>
                      ) : (
                        transactions.filter(t => t.paymentStatus === 'Pending Verification').slice(0, 3).map(txn => (
                          <div 
                            key={txn.id}
                            className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all flex items-start gap-3"
                          >
                            <Avatar initials={txn.memberInitials} size="xs" color="bg-amber-100 text-amber-800 font-bold" />
                            <div className="min-w-0 flex-1">
                              <div className="flex justify-between items-center">
                                <h4 className="text-xs font-black text-slate-800 truncate">{txn.memberName}</h4>
                                <span className="text-[9.5px] font-black text-slate-800 text-purple-600">₹{txn.amount.toLocaleString()}</span>
                              </div>
                              <p className="text-[9px] text-slate-500 mt-0.5 font-medium truncate">{txn.campaignName}</p>
                              <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200/50">
                                <span className="text-[8px] font-extrabold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase tracking-wider">{txn.paymentMethod} Pending</span>
                                <button 
                                  onClick={() => handleOpenProof(txn)}
                                  className="text-[9px] font-black text-purple-600 uppercase tracking-widest hover:underline flex items-center gap-0.5"
                                >
                                  Audit Proof <ArrowUpRight size={10} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => setSearchParams({ tab: 'transactions', paymentStatus: 'Pending Verification' })}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-650 hover:text-slate-800 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors mt-4"
                  >
                    View All Verification Queue ({transactions.filter(t => t.paymentStatus === 'Pending Verification').length})
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────── */}
          {/* TAB 2: CAMPAIGN DIRECTORY                  */}
          {/* ────────────────────────────────────────── */}
          {activeTab === 'campaigns' && (
            <div className="space-y-6 animate-fade-in">
              {/* Sticky Search & filters */}
              <div className="p-4 bg-white border border-slate-100 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
                    <input 
                      type="text"
                      placeholder="Search campaign name, ID, city, or created by..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-purple-400 text-xs font-semibold text-slate-800"
                    />
                  </div>
                  
                  {/* Community Filter */}
                  <select 
                    value={filters.community}
                    onChange={(e) => setFilters({...filters, community: e.target.value})}
                    className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs font-bold text-slate-650"
                  >
                    <option value="All">All Communities</option>
                    {uniqueCommunities.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  {/* City Filter */}
                  <select 
                    value={filters.city}
                    onChange={(e) => setFilters({...filters, city: e.target.value})}
                    className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs font-bold text-slate-650"
                  >
                    <option value="All">All Cities</option>
                    {uniqueCities.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <select 
                    value={filters.campaignStatus}
                    onChange={(e) => setFilters({...filters, campaignStatus: e.target.value})}
                    className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs font-bold text-slate-650"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Archived">Archived</option>
                  </select>

                  <select 
                    value={filters.sort}
                    onChange={(e) => setFilters({...filters, sort: e.target.value})}
                    className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs font-bold text-slate-650"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="highest">Highest Target</option>
                    <option value="lowest">Lowest Target</option>
                    <option value="recentlyUpdated">Recently Updated</option>
                  </select>

                  <button 
                    onClick={handleResetFilters}
                    className="p-2 text-slate-400 hover:text-purple-600 bg-slate-50 hover:bg-purple-50 rounded-xl transition-all"
                    title="Reset Filters"
                  >
                    <RefreshCw size={16} />
                  </button>

                  <button 
                    onClick={() => handleExport('CSV', 'campaigns')}
                    className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-all"
                    title="Export Campaigns Report"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>

              {/* Campaigns table */}
              <div className="card-neo bg-white border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs text-slate-800">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-450 tracking-wider bg-slate-50/50">
                        <th className="p-4">Campaign Name</th>
                        <th className="p-4">Samaj Chapter</th>
                        <th className="p-4">Type</th>
                        <th className="p-4 text-right">Target Goal</th>
                        <th className="p-4 text-right">Collected</th>
                        <th className="p-4 text-right">Progress</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4">Due Date</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {campaigns.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="p-8 text-center text-slate-400 font-bold">No fund campaigns registered. Try adjusting filters.</td>
                        </tr>
                      ) : (
                        campaigns.map(camp => {
                          const percentage = Math.min(100, Math.round((camp.collectedAmount / camp.targetAmount) * 100));
                          return (
                            <tr key={camp.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4">
                                <div>
                                  <h4 className="font-extrabold text-slate-900">{camp.name}</h4>
                                  <p className="text-[9.5px] text-slate-400 mt-0.5">ID: {camp.id} | Created: {camp.startDate}</p>
                                </div>
                              </td>
                              <td className="p-4 text-slate-500 font-medium">
                                <div className="flex items-center gap-1">
                                  <MapPin size={10} className="text-slate-400" />
                                  <span>{camp.community} ({camp.city})</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="inline-block px-2 py-0.5 rounded bg-purple-50 text-purple-600 font-bold uppercase text-[9px] tracking-wider">{camp.type}</span>
                              </td>
                              <td className="p-4 text-right font-black text-slate-900">₹{camp.targetAmount.toLocaleString()}</td>
                              <td className="p-4 text-right font-black text-emerald-600">₹{camp.collectedAmount.toLocaleString()}</td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2.5">
                                  <span className="font-black text-purple-600">{percentage}%</span>
                                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-purple-600 rounded-full" 
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                  camp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                                  camp.status === 'Suspended' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                                  camp.status === 'Completed' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' :
                                  'bg-slate-100 text-slate-500'
                                }`}>
                                  {camp.status}
                                </span>
                              </td>
                              <td className="p-4 text-slate-500 font-medium">{camp.endDate}</td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => handleOpenDrawer(camp)}
                                    className="p-1.5 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                    title="View Overview Drawer"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button 
                                    onClick={() => handleOpenEditCampaign(camp)}
                                    className="p-1.5 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Edit Campaign"
                                  >
                                    <Edit3 size={14} />
                                  </button>

                                  {/* Administrative Override Actions */}
                                  {camp.status === 'Active' ? (
                                    <button 
                                      onClick={() => triggerCampaignStateChange('suspend', camp.id)}
                                      className="p-1.5 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                      title="Suspend Campaign"
                                    >
                                      <ShieldAlert size={14} />
                                    </button>
                                  ) : camp.status === 'Suspended' ? (
                                    <button 
                                      onClick={() => triggerCampaignStateChange('resume', camp.id)}
                                      className="p-1.5 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                      title="Resume Campaign"
                                    >
                                      <CheckCircle2 size={14} />
                                    </button>
                                  ) : null}

                                  {camp.status !== 'Completed' && (
                                    <button 
                                      onClick={() => triggerCampaignStateChange('close', camp.id)}
                                      className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Close & Finish Campaign"
                                    >
                                      <CheckSquare size={14} />
                                    </button>
                                  )}

                                  <button 
                                    onClick={() => triggerCampaignStateChange('archive', camp.id)}
                                    className="p-1.5 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Archive Record"
                                  >
                                    <Archive size={14} />
                                  </button>

                                  <button 
                                    onClick={() => triggerCampaignStateChange('delete', camp.id)}
                                    className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Soft-Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>

                                  <button 
                                    onClick={() => handleOpenOverride(camp)}
                                    className="p-1 px-1.5 hover:text-purple-700 hover:bg-purple-50 text-[8px] font-black border border-purple-250 rounded uppercase tracking-wider"
                                    title="Override Decision"
                                  >
                                    Override
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────── */}
          {/* TAB 3: TRANSACTION CENTER                  */}
          {/* ────────────────────────────────────────── */}
          {activeTab === 'transactions' && (
            <div className="space-y-6 animate-fade-in">
              {/* Filters */}
              <div className="p-4 bg-white border border-slate-100 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
                    <input 
                      type="text"
                      placeholder="Search member name, ID, receipt number, txn reference..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-purple-400 text-xs font-semibold text-slate-800"
                    />
                  </div>

                  <select 
                    value={filters.campaignId}
                    onChange={(e) => setFilters({...filters, campaignId: e.target.value})}
                    className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs font-bold text-slate-650"
                  >
                    <option value="All">All Campaigns</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <select 
                    value={filters.paymentStatus}
                    onChange={(e) => setFilters({...filters, paymentStatus: e.target.value})}
                    className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs font-bold text-slate-650"
                  >
                    <option value="All">All Payment Status</option>
                    <option value="Approved">Approved</option>
                    <option value="Pending Verification">Pending Verification</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Refunded">Refunded</option>
                  </select>

                  <select 
                    value={filters.paymentMethod}
                    onChange={(e) => setFilters({...filters, paymentMethod: e.target.value})}
                    className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs font-bold text-slate-650"
                  >
                    <option value="All">All Payment Methods</option>
                    <option value="UPI">UPI</option>
                    <option value="NEFT">NEFT</option>
                    <option value="Card">Card</option>
                    <option value="Cash">Cash</option>
                  </select>

                  <button 
                    onClick={handleResetFilters}
                    className="p-2 text-slate-400 hover:text-purple-600 bg-slate-50 hover:bg-purple-50 rounded-xl transition-all"
                  >
                    <RefreshCw size={16} />
                  </button>

                  <button 
                    onClick={() => handleExport('CSV', 'transactions')}
                    className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-all"
                    title="Export Ledger"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>

              {/* Transactions list table */}
              <div className="card-neo bg-white border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs text-slate-800">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-450 tracking-wider bg-slate-50/50">
                        <th className="p-4">Transaction Details</th>
                        <th className="p-4">Member Name</th>
                        <th className="p-4">Purpose / Campaign</th>
                        <th className="p-4">Method / Reference</th>
                        <th className="p-4 text-right">Donated Amount</th>
                        <th className="p-4 text-center">Payment Status</th>
                        <th className="p-4 text-center">Receipt Status</th>
                        <th className="p-4">Transaction Date</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="p-8 text-center text-slate-400 font-bold">No transaction records matching criteria.</td>
                        </tr>
                      ) : (
                        transactions.map(txn => (
                          <tr key={txn.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4">
                              <div>
                                <span className="font-extrabold text-slate-900">{txn.id}</span>
                                {txn.paymentProof && (
                                  <span className="ml-2 px-1.5 py-0.5 rounded text-[8px] bg-amber-50 text-amber-700 font-extrabold uppercase border border-amber-100">Has Proof</span>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Avatar initials={txn.memberInitials} size="xs" color="bg-purple-100 text-purple-700 font-bold" />
                                <div>
                                  <h4 className="font-extrabold text-slate-800">{txn.memberName}</h4>
                                  <p className="text-[9.5px] text-slate-400 mt-0.5">{txn.community} ({txn.city})</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 font-medium text-slate-500 max-w-[200px] truncate">{txn.campaignName}</td>
                            <td className="p-4 font-medium text-slate-650">
                              <div>
                                <span className="font-extrabold text-slate-800">{txn.paymentMethod}</span>
                                {txn.referenceNumber && <p className="text-[9px] text-slate-400 mt-0.5">Ref: {txn.referenceNumber}</p>}
                              </div>
                            </td>
                            <td className="p-4 text-right font-black text-slate-900">₹{txn.amount.toLocaleString()}</td>
                            <td className="p-4 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                txn.paymentStatus === 'Approved' ? 'bg-emerald-500/10 text-emerald-600' :
                                txn.paymentStatus === 'Pending Verification' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                                txn.paymentStatus === 'Refunded' ? 'bg-indigo-500/10 text-indigo-600' :
                                'bg-rose-500/10 text-rose-600'
                              }`}>
                                {txn.paymentStatus}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                txn.receiptStatus === 'Generated' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-450'
                              }`}>
                                {txn.receiptStatus}
                              </span>
                            </td>
                            <td className="p-4 text-slate-500 font-medium">{new Date(txn.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {txn.paymentStatus === 'Pending Verification' && (
                                  <button 
                                    onClick={() => handleOpenProof(txn)}
                                    className="px-2 py-1 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white rounded text-[10px] font-black uppercase tracking-wider transition-colors"
                                  >
                                    Verify Proof
                                  </button>
                                )}

                                {txn.paymentStatus === 'Approved' && (
                                  <>
                                    <button 
                                      onClick={() => printReceipt(txn.id)}
                                      className="p-1.5 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                      title="Generate Receipt"
                                    >
                                      <Printer size={14} />
                                    </button>
                                    <button 
                                      onClick={() => handleOpenRefund(txn)}
                                      className="px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded text-[9px] font-black uppercase tracking-wider border border-rose-100"
                                      title="Issue Refund"
                                    >
                                      Refund
                                    </button>
                                  </>
                                )}

                                {txn.rejectionReason && (
                                  <button 
                                    onClick={() => alert(`Rejection Reason: ${txn.rejectionReason}`)}
                                    className="p-1 text-slate-400 hover:text-slate-650"
                                    title="View Rejection Reason"
                                  >
                                    <Info size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────── */}
          {/* TAB 4: FINANCIAL ANALYTICS                 */}
          {/* ────────────────────────────────────────── */}
          {activeTab === 'analytics' && analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              {/* Monthly Collection Trend */}
              <div className="card-neo p-6 bg-white border border-slate-100 space-y-4">
                <div>
                  <h4 className="text-sm font-black text-slate-800">Monthly Collection Aurora Trend</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Audit collection trends aggregated across all registered zones</p>
                </div>
                <div className="h-56">
                  <AreaChart 
                    data={analytics.monthlyCollectionTrend.data} 
                    labels={analytics.monthlyCollectionTrend.labels} 
                    color="#8B5CF6" 
                    height={200}
                  />
                </div>
              </div>

              {/* Yearly collections bar chart */}
              <div className="card-neo p-6 bg-white border border-slate-100 space-y-4">
                <div>
                  <h4 className="text-sm font-black text-slate-800">Annual Growth Ledger</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Year-over-year audited Samaj capital progress</p>
                </div>
                <div className="h-56">
                  <BarChart 
                    data={analytics.yearlyCollection.data} 
                    labels={analytics.yearlyCollection.labels} 
                    colors={['#8B5CF6']} 
                    height={200}
                  />
                </div>
              </div>

              {/* Community Wise Share */}
              <div className="card-neo p-6 bg-white border border-slate-100 space-y-4">
                <div>
                  <h4 className="text-sm font-black text-slate-800">Community Contribution Share</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Aggregate donations split by specific community chapters</p>
                </div>
                <div className="flex items-center justify-around gap-6">
                  <DonutChart 
                    data={analytics.communityWiseCollection} 
                    colors={['#8B5CF6', '#4F46E5', '#10B981', '#F59E0B', '#EC4899']} 
                    size={150}
                  />
                  <div className="space-y-1.5 text-xs">
                    {analytics.communityWiseCollection.map((item, idx) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: ['#8B5CF6', '#4F46E5', '#10B981', '#F59E0B', '#EC4899'][idx % 5] }}
                        />
                        <span className="font-bold text-slate-650">{item.name}:</span>
                        <span className="font-extrabold text-slate-800">₹{item.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Donors list */}
              <div className="card-neo p-6 bg-white border border-slate-100 space-y-4">
                <div>
                  <h4 className="text-sm font-black text-slate-800">Top Donors Leaderboard</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Highest contributing members across all Samaj campaigns</p>
                </div>
                <div className="space-y-3.5">
                  {analytics.topDonors.map((donor, idx) => (
                    <div key={donor.name} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100/50">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-400 w-4">#{idx+1}</span>
                        <Avatar initials={donor.initials} size="xs" color="bg-purple-100 text-purple-800 font-bold" />
                        <div>
                          <h4 className="text-xs font-black text-slate-850">{donor.name}</h4>
                          <p className="text-[9px] text-slate-400 font-semibold">{donor.community}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-purple-600">₹{donor.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────── */}
          {/* TAB 5: SAMAJ COMPARISON                    */}
          {/* ────────────────────────────────────────── */}
          {activeTab === 'comparison' && analytics && (
            <div className="space-y-6 animate-fade-in">
              <div className="card-neo bg-white border border-slate-100 overflow-hidden">
                <div className="p-6 pb-3 border-b border-slate-50">
                  <h3 className="text-sm font-black text-slate-800">Chapter Comparative Audit</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Evaluate capital generation efficiency and participation parameters across zones</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs text-slate-800">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-450 tracking-wider bg-slate-50/50">
                        <th className="p-4">Samaj Chapter</th>
                        <th className="p-4 text-right">Collection Pool</th>
                        <th className="p-4 text-right">Donation Growth</th>
                        <th className="p-4 text-right">Campaign Success</th>
                        <th className="p-4 text-right">Avg Donation</th>
                        <th className="p-4 text-right">Participation Rate</th>
                        <th className="p-4 text-right">Unsettled Payouts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {analytics.communityComparison.map(row => (
                        <tr key={row.community} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <span className="font-extrabold text-slate-900">{row.community}</span>
                          </td>
                          <td className="p-4 text-right font-black text-slate-900">₹{row.collectionAmount.toLocaleString()}</td>
                          <td className="p-4 text-right">
                            <span className={`font-black ${row.donationGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {row.donationGrowth >= 0 ? '+' : ''}{row.donationGrowth}%
                            </span>
                          </td>
                          <td className="p-4 text-right font-black text-purple-600">{row.campaignSuccessRate}%</td>
                          <td className="p-4 text-right font-bold text-slate-650">₹{row.averageContribution.toLocaleString()}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="font-black text-slate-850">{row.communityParticipation}%</span>
                              <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-indigo-500" 
                                  style={{ width: `${row.communityParticipation}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right font-black text-rose-500">₹{row.pendingPayments.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────── */}
          {/* TAB 6: AUDIT TRACKER                       */}
          {/* ────────────────────────────────────────── */}
          {activeTab === 'audit' && (
            <div className="space-y-6 animate-fade-in">
              {/* Audit Search */}
              <div className="p-4 bg-white border border-slate-100 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div className="relative flex-1 min-w-[280px]">
                  <Search className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
                  <input 
                    type="text"
                    placeholder="Search logs by operator, campaign, or change action..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-purple-400 text-xs font-semibold text-slate-800"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleExport('CSV', 'audits')}
                    className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-all"
                    title="Export Audit Logs"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>

              {/* Logs Table */}
              <div className="card-neo bg-white border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs text-slate-800">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-450 tracking-wider bg-slate-50/50">
                        <th className="p-4">Log ID</th>
                        <th className="p-4">Campaign Name</th>
                        <th className="p-4">Action</th>
                        <th className="p-4">Operator</th>
                        <th className="p-4">Timestamp</th>
                        <th className="p-4">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-slate-400 font-bold">No system changes logged matching queries.</td>
                        </tr>
                      ) : (
                        auditLogs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 font-mono text-slate-450">{log.id}</td>
                            <td className="p-4 text-slate-900 font-bold max-w-[180px] truncate">{log.campaignName}</td>
                            <td className="p-4">
                              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                log.action.includes('Approved') || log.action.includes('Created') ? 'bg-emerald-50 text-emerald-700' :
                                log.action.includes('Suspended') ? 'bg-amber-50 text-amber-700' :
                                log.action.includes('Deleted') || log.action.includes('Rejected') ? 'bg-rose-50 text-rose-700' :
                                'bg-purple-50 text-purple-700'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="p-4 text-slate-800 font-bold">{log.operator}</td>
                            <td className="p-4 text-slate-500 font-medium">{new Date(log.date).toLocaleString()}</td>
                            <td className="p-4 text-slate-500 font-medium max-w-[300px] truncate" title={log.details}>{log.details}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ─── MODAL 1: CREATE / EDIT CAMPAIGN ─── */}
      <AnimatePresence>
        {(activeModal === 'create' || activeModal === 'edit') && (
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
              className="w-full max-w-lg bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-2xl relative z-10 p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <HeartHandshake className="text-purple-600 animate-pulse" />
                  {activeModal === 'create' ? 'Launch Samaj Development Campaign' : 'Edit Campaign details'}
                </h3>
                <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-800 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={submitCampaignForm} className="space-y-4 text-xs font-semibold text-slate-755">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Fund Campaign Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g., Dharamshala Solar Electrification Fund" 
                    value={campaignForm.name}
                    onChange={(e) => setCampaignForm({...campaignForm, name: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-150 rounded-xl outline-none focus:border-purple-600 text-slate-850 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Samaj Community Chapter *</label>
                    <select 
                      value={campaignForm.community}
                      onChange={(e) => setCampaignForm({...campaignForm, community: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-150 rounded-xl outline-none focus:border-purple-600 text-slate-850 font-bold"
                    >
                      <option value="Agrawal Samaj">Agrawal Samaj</option>
                      <option value="Brahmin Samaj">Brahmin Samaj</option>
                      <option value="Patidar Samaj">Patidar Samaj</option>
                      <option value="Rajput Samaj">Rajput Samaj</option>
                      <option value="Maheshwari Samaj">Maheshwari Samaj</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Target City Zone *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g., Indore" 
                      value={campaignForm.city}
                      onChange={(e) => setCampaignForm({...campaignForm, city: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-150 rounded-xl outline-none focus:border-purple-600 text-slate-850 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Campaign Target Goal (INR) *</label>
                    <input 
                      type="number" 
                      required
                      placeholder="e.g., 800000" 
                      value={campaignForm.targetAmount}
                      onChange={(e) => setCampaignForm({...campaignForm, targetAmount: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-150 rounded-xl outline-none focus:border-purple-600 text-slate-850 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Fund Category Type *</label>
                    <select 
                      value={campaignForm.type}
                      onChange={(e) => setCampaignForm({...campaignForm, type: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-150 rounded-xl outline-none focus:border-purple-600 text-slate-850 font-bold"
                    >
                      <option value="Infrastructure">Infrastructure</option>
                      <option value="Education">Education</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Welfare">Welfare</option>
                      <option value="Emergency">Emergency Relief</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Start Date</label>
                    <input 
                      type="date" 
                      value={campaignForm.startDate}
                      onChange={(e) => setCampaignForm({...campaignForm, startDate: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-150 rounded-xl outline-none focus:border-purple-600 text-slate-850"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider">End Date</label>
                    <input 
                      type="date" 
                      value={campaignForm.endDate}
                      onChange={(e) => setCampaignForm({...campaignForm, endDate: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-150 rounded-xl outline-none focus:border-purple-600 text-slate-850"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Campaign Mission Details</label>
                  <textarea 
                    rows="3"
                    placeholder="Provide description about fund usage and audit allocations..."
                    value={campaignForm.description}
                    onChange={(e) => setCampaignForm({...campaignForm, description: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-150 rounded-xl outline-none focus:border-purple-600 text-slate-850 font-medium resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-750 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-purple-500/25 transition-colors press-scale"
                >
                  {activeModal === 'create' ? 'Authorize & Launch Campaign' : 'Save Modifications'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 2: CONFIRM STATUS ACTION ─── */}
      <AnimatePresence>
        {activeModal === 'confirm' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-black/60"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white border border-slate-150 rounded-3xl overflow-hidden shadow-2xl relative z-10 p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{confirmAction.title}</h3>
                  <p className="text-[10px] text-slate-400">Review operator action</p>
                </div>
              </div>

              <p className="text-xs text-slate-650 leading-relaxed font-semibold">{confirmAction.message}</p>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-black uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeConfirmAction}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider transition-all"
                >
                  Confirm Action
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 3: AUDIT PAYMENT PROOF SCREEN ─── */}
      <AnimatePresence>
        {activeModal === 'proof' && selectedTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-2xl relative z-10 p-6 flex flex-col md:flex-row gap-6"
            >
              {/* Proof Screenshot view */}
              <div className="flex-1 space-y-2.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Bank Payment Receipt Proof</span>
                <div className="w-full aspect-[4/3] rounded-2xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center overflow-hidden relative group">
                  {selectedTransaction.paymentProof ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-purple-50/50">
                      <FileText size={48} className="text-purple-500 animate-bounce" />
                      <span className="text-xs font-bold text-slate-800 mt-3">{selectedTransaction.paymentProof}</span>
                      <p className="text-[10px] text-slate-400 mt-1">Receipt attachment verified on disk</p>
                    </div>
                  ) : (
                    <div className="text-center p-6">
                      <HelpCircle className="mx-auto text-slate-450" size={32} />
                      <p className="text-xs text-slate-450 font-bold mt-2">No receipt document attached.</p>
                      <span className="text-[9px] text-slate-400 mt-1 block">Manual check-off requested by operator</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Review Audit checks */}
              <div className="flex-1 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Audit Member Ledger</h3>
                      <p className="text-[9px] text-purple-600 font-extrabold uppercase mt-0.5">TXN: {selectedTransaction.id}</p>
                    </div>
                    <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-800 transition-colors">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-2 mt-4 text-xs font-semibold text-slate-650">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Donor Name:</span>
                      <span className="text-slate-800 font-extrabold">{selectedTransaction.memberName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Samaj Samaj:</span>
                      <span className="text-slate-800">{selectedTransaction.community} ({selectedTransaction.city})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Donation campaign:</span>
                      <span className="text-slate-800 truncate max-w-[160px]">{selectedTransaction.campaignName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Payment Amount:</span>
                      <span className="text-purple-600 font-black text-sm">₹{selectedTransaction.amount.toLocaleString()}.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Method / Reference:</span>
                      <span className="text-slate-800">{selectedTransaction.paymentMethod} ({selectedTransaction.referenceNumber || 'N/A'})</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Rejection Reason (If Rejecting)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Reference ID not found on bank statement" 
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-150 rounded-xl outline-none focus:border-purple-600 text-xs font-semibold text-slate-850"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => rejectPayment(selectedTransaction.id)}
                    className="flex-1 py-2.5 rounded-xl border border-rose-100 text-rose-600 hover:bg-rose-50 text-xs font-black uppercase tracking-wider transition-all"
                  >
                    Reject Payment
                  </button>
                  <button 
                    onClick={() => approvePayment(selectedTransaction.id)}
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider transition-all"
                  >
                    Approve Payment
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 4: REFUND TRANSACTION ─── */}
      <AnimatePresence>
        {activeModal === 'refund' && selectedTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-black/60"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white border border-slate-150 rounded-3xl overflow-hidden shadow-2xl relative z-10 p-6 space-y-4"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Authorize Refund Payout</h3>
                  <p className="text-[9px] text-rose-600 font-extrabold uppercase mt-0.5">TXN: {selectedTransaction.id}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs font-semibold text-slate-650">
                <div className="flex justify-between">
                  <span>Refund To:</span>
                  <span className="text-slate-800 font-extrabold">{selectedTransaction.memberName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Refundable Amount:</span>
                  <span className="text-rose-600 font-black">₹{selectedTransaction.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Campaign Pool Affected:</span>
                  <span className="text-slate-800 truncate max-w-[180px]">{selectedTransaction.campaignName}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Refund Reason Notes</label>
                <textarea 
                  rows="2"
                  placeholder="State double payment, member cancellation, or compliance queries..."
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-150 rounded-xl outline-none focus:border-purple-600 text-xs font-semibold text-slate-850 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-black uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitRefund}
                  className="flex-1 py-2.5 rounded-xl bg-rose-650 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider transition-all"
                >
                  Authorize Refund
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 5: OVERRIDE CAMPAIGN DECISION ─── */}
      <AnimatePresence>
        {activeModal === 'override' && selectedCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-black/60"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white border border-slate-150 rounded-3xl overflow-hidden shadow-2xl relative z-10 p-6 space-y-4"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Master Admin Override Authority</h3>
                  <p className="text-[9px] text-slate-400">Override decisions established by local Samaj Heads</p>
                </div>
              </div>

              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-[11px] text-purple-700 font-semibold space-y-1">
                <p><strong>Campaign Name:</strong> {selectedCampaign.name}</p>
                <p><strong>Proposed By:</strong> {selectedCampaign.createdBy} ({selectedCampaign.creatorRole})</p>
                <p><strong>Current Status:</strong> {selectedCampaign.status}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Override Notes & Audit justification *</label>
                <textarea 
                  rows="3"
                  required
                  placeholder="State compliance checklist findings or board governance notes..."
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-150 rounded-xl outline-none focus:border-purple-600 text-xs font-semibold text-slate-850 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={() => submitOverrideDecision(false)}
                  className="py-2.5 rounded-xl border border-amber-100 text-amber-600 hover:bg-amber-50 text-xs font-black uppercase tracking-wider transition-all"
                >
                  Force Suspend
                </button>
                <button 
                  onClick={() => submitOverrideDecision(true)}
                  className="py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider transition-all"
                >
                  Force Approve Active
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── SIDE DRAWER: CAMPAIGN PROFILE ─── */}
      <AnimatePresence>
        {isDrawerOpen && drawerCampaign && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-white border-l border-slate-100 shadow-2xl z-50 flex flex-col justify-between overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      drawerCampaign.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 animate-pulse' :
                      drawerCampaign.status === 'Suspended' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {drawerCampaign.status}
                    </span>
                    <span className="text-[10px] font-extrabold text-slate-400">ID: {drawerCampaign.id}</span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 leading-snug">{drawerCampaign.name}</h3>
                  <p className="text-[10.5px] text-slate-500 font-semibold flex items-center gap-1">
                    <MapPin size={12} className="text-slate-450" />
                    {drawerCampaign.community} | {drawerCampaign.city} Zone
                  </p>
                </div>

                <button 
                  onClick={() => setIsDrawerOpen(false)} 
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer sub tabs */}
              <div className="px-6 border-b border-slate-100 flex items-center gap-1 overflow-x-auto no-scrollbar py-1 bg-slate-50/50">
                {[
                  { id: 'overview', label: 'Overview', icon: FileText },
                  { id: 'contributions', label: 'Contributions', icon: IndianRupee },
                  { id: 'stats', label: 'Financial Progress', icon: TrendingUp },
                  { id: 'docs', label: 'Documents', icon: Globe },
                  { id: 'announcements', label: 'Announcements', icon: Send },
                  { id: 'audits', label: 'Audit History', icon: Clock }
                ].map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setDrawerTab(t.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-[11px] border-b-2 font-bold whitespace-nowrap transition-all ${
                        drawerTab === t.id 
                          ? 'border-purple-600 text-purple-600 font-extrabold'
                          : 'border-transparent text-slate-500 hover:text-slate-950'
                      }`}
                    >
                      <Icon size={12} />
                      {t.label}
                    </button>
                  )
                })}
              </div>

              {/* Drawer main scroll content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                
                {/* Drawer Tab 1: Overview */}
                {drawerTab === 'overview' && (
                  <div className="space-y-5 animate-fade-in text-xs font-semibold text-slate-650">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Description</span>
                      <p className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-700 leading-relaxed font-semibold">
                        {drawerCampaign.description || 'No detailed description set for this campaign.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                        <span className="text-[9px] font-black text-slate-450 uppercase block">Launched By</span>
                        <span className="text-slate-800 font-extrabold">{drawerCampaign.createdBy}</span>
                        <p className="text-[8px] text-purple-600 font-extrabold uppercase">{drawerCampaign.creatorRole}</p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                        <span className="text-[9px] font-black text-slate-450 uppercase block">Donation Category</span>
                        <span className="text-slate-800 font-extrabold">{drawerCampaign.type}</span>
                        <p className="text-[8.5px] text-slate-450 font-semibold">{drawerCampaign.city} Zone</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                        <span className="text-[9px] font-black text-slate-450 uppercase block">Start Date</span>
                        <span className="text-slate-800 font-extrabold">{drawerCampaign.startDate}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                        <span className="text-[9px] font-black text-slate-450 uppercase block">Closing Date</span>
                        <span className="text-slate-800 font-extrabold">{drawerCampaign.endDate}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Drawer Tab 2: Contributions */}
                {drawerTab === 'contributions' && (
                  <div className="space-y-4 animate-fade-in">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Campaign Contribution Ledger ({drawerContributionsList.length})</span>
                    <div className="space-y-2.5">
                      {drawerContributionsList.length === 0 ? (
                        <p className="py-8 text-center text-slate-400 font-bold">No contributions recorded for this campaign yet.</p>
                      ) : (
                        drawerContributionsList.map(item => (
                          <div 
                            key={item.id}
                            className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5">
                              <Avatar initials={item.memberInitials} size="xs" color="bg-purple-100 text-purple-700 font-bold" />
                              <div>
                                <h4 className="text-xs font-black text-slate-900 leading-none">{item.memberName}</h4>
                                <span className="text-[9px] text-slate-400 mt-1 block">Ref ID: {item.id} | Mode: {item.paymentMethod}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-slate-900 block">₹{item.amount.toLocaleString()}</span>
                              <span className={`inline-block text-[8px] font-black uppercase tracking-wider mt-0.5 ${
                                item.paymentStatus === 'Approved' ? 'text-emerald-600' : 'text-amber-500'
                              }`}>{item.paymentStatus}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Drawer Tab 3: Financial Progress */}
                {drawerTab === 'stats' && (
                  <div className="space-y-6 animate-fade-in text-xs font-semibold text-slate-650">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                        <span className="text-[9px] font-black text-slate-450 uppercase block">Target Amount</span>
                        <span className="text-sm font-black text-slate-900 mt-1 block">₹{drawerCampaign.targetAmount.toLocaleString()}</span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                        <span className="text-[9px] font-black text-slate-450 uppercase block">Collected</span>
                        <span className="text-sm font-black text-emerald-650 mt-1 block">₹{drawerCampaign.collectedAmount.toLocaleString()}</span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                        <span className="text-[9px] font-black text-slate-450 uppercase block">Total Contributors</span>
                        <span className="text-sm font-black text-purple-600 mt-1 block">{drawerCampaign.contributorsCount} Donors</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-black text-slate-450 uppercase">
                        <span>Campaign Collection Progress</span>
                        <span>{Math.min(100, Math.round((drawerCampaign.collectedAmount / drawerCampaign.targetAmount) * 100))}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-600 rounded-full" 
                          style={{ width: `${Math.min(100, Math.round((drawerCampaign.collectedAmount / drawerCampaign.targetAmount) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Drawer Tab 4: Documents */}
                {drawerTab === 'docs' && (
                  <div className="space-y-4 animate-fade-in">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Official Audited Documentation ({drawerCampaign.documents?.length || 0})</span>
                    <div className="space-y-2.5">
                      {!drawerCampaign.documents || drawerCampaign.documents.length === 0 ? (
                        <p className="py-6 text-center text-slate-400 font-bold">No documentation attachments verified.</p>
                      ) : (
                        drawerCampaign.documents.map(doc => (
                          <div 
                            key={doc.id}
                            className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5">
                              <FileText size={16} className="text-purple-500" />
                              <div>
                                <h4 className="text-xs font-black text-slate-800 leading-none">{doc.title}</h4>
                                <span className="text-[9px] text-slate-400 mt-1 block">Verified: {doc.date}</span>
                              </div>
                            </div>
                            <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded uppercase tracking-wider">{doc.status}</span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3.5 mt-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Verify New Document Attachment</span>
                      <div className="space-y-2.5">
                        <input 
                          type="text" 
                          placeholder="Document Label (e.g. Audit Ledger Q1)" 
                          value={newDocTitle}
                          onChange={(e) => setNewDocTitle(e.target.value)}
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-purple-600 text-xs font-semibold text-slate-850"
                        />
                        <button 
                          onClick={addDocument}
                          className="w-full py-2 bg-purple-650 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shadow shadow-purple-500/10"
                        >
                          Upload & Certify
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Drawer Tab 5: Announcements */}
                {drawerTab === 'announcements' && (
                  <div className="space-y-4 animate-fade-in">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Broadcast Logs ({drawerCampaign.announcements?.length || 0})</span>
                    <div className="space-y-3 max-h-[220px] overflow-y-auto no-scrollbar">
                      {!drawerCampaign.announcements || drawerCampaign.announcements.length === 0 ? (
                        <p className="py-6 text-center text-slate-400 font-bold">No announcements broadcasted yet.</p>
                      ) : (
                        drawerCampaign.announcements.map(ann => (
                          <div 
                            key={ann.id}
                            className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1"
                          >
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-black text-slate-850">{ann.title}</h4>
                              <span className="text-[9px] text-slate-400 font-semibold">{ann.date}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">{ann.content}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 mt-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Create New Public Announcement</span>
                      <div className="space-y-2.5">
                        <input 
                          type="text" 
                          placeholder="Announcement Title" 
                          value={newAnnouncement.title}
                          onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-purple-600 text-xs font-semibold text-slate-850"
                        />
                        <textarea 
                          rows="2"
                          placeholder="Type details to notify community members..."
                          value={newAnnouncement.content}
                          onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-purple-600 text-xs font-semibold text-slate-850 resize-none"
                        />
                        <button 
                          onClick={addAnnouncement}
                          className="w-full py-2 bg-purple-650 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shadow shadow-purple-500/10"
                        >
                          Broadcast to Samaj Dashboard
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Drawer Tab 6: Audits */}
                {drawerTab === 'audits' && (
                  <div className="space-y-4 animate-fade-in">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Campaign Historical Activity Log</span>
                    <div className="relative border-l border-slate-200 ml-3 pl-5 space-y-5">
                      {!drawerCampaign.auditHistory || drawerCampaign.auditHistory.length === 0 ? (
                        <p className="py-6 text-center text-slate-400 font-bold ml-[-20px]">No historical changes tracked.</p>
                      ) : (
                        drawerCampaign.auditHistory.map(audit => (
                          <div key={audit.id} className="relative text-xs font-semibold text-slate-650">
                            {/* Marker Node */}
                            <div className="absolute -left-[26px] top-1.5 w-3 h-3 rounded-full bg-purple-600 border-2 border-white shadow shadow-purple-500/20" />
                            <div className="flex justify-between items-center">
                              <span className="text-slate-800 font-extrabold">{audit.action}</span>
                              <span className="text-[9.5px] text-slate-400 font-semibold">{new Date(audit.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{audit.details}</p>
                            <span className="text-[9px] text-purple-600 font-extrabold uppercase mt-1 block">BY: {audit.operator}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Drawer Footer Actions */}
              <div className="p-6 border-t border-slate-100 flex gap-3.5 bg-slate-50/30 shrink-0">
                <button 
                  onClick={() => handleOpenEditCampaign(drawerCampaign)}
                  className="flex-1 py-2.5 text-center text-xs font-black uppercase bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-650 hover:text-slate-800 rounded-xl transition-colors"
                >
                  Edit Details
                </button>
                {drawerCampaign.status === 'Active' ? (
                  <button 
                    onClick={() => triggerCampaignStateChange('suspend', drawerCampaign.id)}
                    className="flex-1 py-2.5 text-center text-xs font-black uppercase bg-amber-50 border border-amber-100 hover:bg-amber-100 text-amber-700 rounded-xl transition-colors"
                  >
                    Suspend Campaign
                  </button>
                ) : drawerCampaign.status === 'Suspended' ? (
                  <button 
                    onClick={() => triggerCampaignStateChange('resume', drawerCampaign.id)}
                    className="flex-1 py-2.5 text-center text-xs font-black uppercase bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors"
                  >
                    Resume Campaign
                  </button>
                ) : null}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
