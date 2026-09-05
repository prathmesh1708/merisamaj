import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, RefreshCw, Eye, Edit, Trash2, Users, HeartHandshake, AlertCircle, IndianRupee } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import headDonationService from '../../../../core/api/headDonationService';
import { useHeadAuth } from '../../auth/useHeadAuth';

import DonationFormModal from './components/DonationFormModal';
import DonationDetailModal from './components/DonationDetailModal';
import DonorManagementModal from './components/DonorManagementModal';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import ExpenseManagementModal from './components/ExpenseManagementModal';
import LedgerView from './components/LedgerView';

const DonationManagement = () => {
  const { headAuth } = useHeadAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filter & Search
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDonorOpen, setIsDonorOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [fetchedCampaigns, fetchedStats] = await Promise.all([
        headDonationService.getAllCampaigns(),
        headDonationService.getDashboardStats()
      ]);
      setCampaigns(Array.isArray(fetchedCampaigns) ? fetchedCampaigns : []);
      setStats(fetchedStats || null);
    } catch (error) {
      console.error('Failed to fetch donation data', error);
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (headAuth.isAuthenticated) {
      fetchDashboardData();
    }
  }, [headAuth.isAuthenticated]);

  const handleAction = (action, campaign = null) => {
    setSelectedCampaign(campaign);
    if (action === 'create') {
      setSelectedCampaign(null);
      setIsFormOpen(true);
    } else if (action === 'edit') {
      setIsFormOpen(true);
    } else if (action === 'view') {
      setIsDetailOpen(true);
    } else if (action === 'donors') {
      setIsDonorOpen(true);
    } else if (action === 'delete') {
      setIsDeleteOpen(true);
    } else if (action === 'expense') {
      setIsExpenseOpen(true);
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'bannerImage') {
          if (formData[key] instanceof File) {
            data.append('bannerImage', formData[key]);
          } else if (typeof formData[key] === 'string') {
            data.append('bannerImage', formData[key]);
          }
        } else if (Array.isArray(formData[key])) {
          data.append(key, JSON.stringify(formData[key]));
        } else if (formData[key] !== undefined && formData[key] !== null) {
          data.append(key, formData[key]);
        }
      });

      if (selectedCampaign) {
        await headDonationService.updateCampaign(selectedCampaign.id || selectedCampaign._id, data);
      } else {
        await headDonationService.createCampaign(data);
      }
      setIsFormOpen(false);
      fetchDashboardData();
    } catch (error) {
      console.error('Submission failed', error);
      const errMsg = error.response?.data?.message || error.message;
      alert(`Action failed: ${errMsg}`);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await headDonationService.deleteCampaign(selectedCampaign.id || selectedCampaign._id);
      setIsDeleteOpen(false);
      fetchDashboardData();
    } catch (error) {
      console.error('Deletion failed', error);
      alert('Delete failed.');
    }
  };

  const handleExpenseSubmit = async (expenseData) => {
    try {
      await headDonationService.addExpense(selectedCampaign.id || selectedCampaign._id, expenseData);
      setIsExpenseOpen(false);
      fetchDashboardData();
    } catch (error) {
      console.error('Expense submission failed', error);
      alert(error.response?.data?.message || 'Failed to add expense.');
    }
  };

  const filteredCampaigns = (campaigns || []).filter(c => {
    if (!c) return false;
    const title = (c.title || '').toLowerCase();
    const query = (searchQuery || '').toLowerCase();
    const matchesSearch = title.includes(query);
    if (activeTab === 'All') return matchesSearch;
    return (c.status === activeTab) && matchesSearch;
  });

  const getStatusBadge = (status) => {
    const styles = {
      'Active': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Published': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Approved': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Scheduled': 'bg-blue-100 text-blue-700 border-blue-200',
      'Draft': 'bg-gray-100 text-gray-700 border-gray-200',
      'Completed': 'bg-purple-100 text-purple-700 border-purple-200',
      'Suspended': 'bg-rose-100 text-rose-700 border-rose-200',
    };
    const style = styles[status] || styles['Draft'];
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${style}`}>
        {status || 'Draft'}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <HeartHandshake className="text-brand-primary" size={28} />
            Donation Campaigns
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track all community fund collections</p>
        </div>
        <button 
          onClick={() => handleAction('create')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white rounded-xl font-bold transition-colors shadow-sm cursor-pointer"
        >
          <Plus size={18} /> New Campaign
        </button>
      </div>

      {/* Dashboard Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <HeartHandshake size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Raised</p>
              <h3 className="text-2xl font-black text-gray-900">₹{(stats.totalRaisedAmount || 0).toLocaleString()}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Donors</p>
              <h3 className="text-2xl font-black text-gray-900">{stats.totalDonors || 0}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Campaigns</p>
              <h3 className="text-2xl font-black text-gray-900">{stats.activeCampaigns || 0}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Filter size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Target</p>
              <h3 className="text-2xl font-black text-gray-900">₹{(stats.totalTargetAmount || 0).toLocaleString()}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            {['All', 'Active', 'Published', 'Draft', 'Completed', 'Scheduled', 'Ledger'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab 
                    ? 'bg-white text-brand-primary shadow-sm ring-1 ring-gray-200' 
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-primary transition-colors pointer-events-none z-10" size={18} />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                className="w-full sm:w-64 pr-4 py-2 rounded-xl border border-gray-200 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all text-sm font-medium"
              />
            </div>
            <button 
              onClick={fetchDashboardData}
              className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-brand-primary hover:border-brand-primary/30 transition-colors shadow-sm cursor-pointer"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin text-brand-primary' : ''} />
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto min-h-[400px]">
          {activeTab === 'Ledger' ? (
            <div className="p-6 bg-gray-50/30">
              <LedgerView />
            </div>
          ) : isLoading ? (
            <div className="h-full flex flex-col items-center justify-center p-12 space-y-4">
              <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
              <p className="text-gray-500 font-medium">Loading campaigns...</p>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                <HeartHandshake className="text-gray-400" size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">No campaigns found</h3>
              <p className="text-gray-500 max-w-sm mx-auto mt-2 mb-6">
                {searchQuery ? 'Try adjusting your search or filters to find what you are looking for.' : 'Get started by creating your first donation campaign.'}
              </p>
              {!searchQuery && (
                <button 
                  onClick={() => handleAction('create')}
                  className="px-5 py-2.5 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Create Campaign
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Campaign Info</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Donors</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <AnimatePresence>
                  {filteredCampaigns.map((campaign) => (
                    <motion.tr 
                      key={campaign.id || campaign._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-brand-50/30 transition-colors group"
                    >
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                            {campaign.bannerImage || campaign.coverImage ? (
                              <img src={campaign.bannerImage || campaign.coverImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <HeartHandshake size={20} />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm line-clamp-1">{campaign.title || 'Untitled Campaign'}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{campaign.category || 'General'} • {campaign.visibility || 'All Members'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top min-w-[200px]">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-brand-primary">₹{(campaign.raisedAmount || 0).toLocaleString()}</span>
                          <span className="text-gray-500">of ₹{(campaign.targetAmount || 0).toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-brand-primary h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(100, Math.max(0, campaign.progress || 0))}%` }}
                          />
                        </div>
                        {(campaign.expenseAmount || 0) > 0 && (
                          <div className="flex items-center justify-between text-xs mt-1 text-gray-500">
                            <span>Utilized: <span className="font-bold text-rose-500">₹{(campaign.expenseAmount || 0).toLocaleString()}</span></span>
                            <span>Bal: <span className="font-bold text-emerald-600">₹{(campaign.availableBalance || 0).toLocaleString()}</span></span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg border border-gray-100">
                          <Users size={14} className="text-gray-400" />
                          <span className="text-sm font-bold text-gray-700">{campaign.totalDonors || campaign.contributorsCount || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        {getStatusBadge(campaign.status)}
                      </td>
                      <td className="px-6 py-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleAction('view', campaign)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" title="View Details">
                            <Eye size={18} />
                          </button>
                          <button onClick={() => handleAction('donors', campaign)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" title="Manage Donors">
                            <Users size={18} />
                          </button>
                          <button onClick={() => handleAction('edit', campaign)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" title="Edit Campaign">
                            <Edit size={18} />
                          </button>
                          <button onClick={() => handleAction('expense', campaign)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" title="Add Expense">
                            <IndianRupee size={18} />
                          </button>
                          <button onClick={() => handleAction('delete', campaign)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" title="Delete">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modals */}
      {isFormOpen && (
        <DonationFormModal 
          isOpen={isFormOpen} 
          onClose={() => setIsFormOpen(false)} 
          onSubmit={handleFormSubmit}
          initialData={selectedCampaign}
        />
      )}
      
      {isDetailOpen && selectedCampaign && (
        <DonationDetailModal 
          isOpen={isDetailOpen} 
          onClose={() => setIsDetailOpen(false)} 
          campaignId={selectedCampaign.id || selectedCampaign._id}
        />
      )}
      
      {isDonorOpen && selectedCampaign && (
        <DonorManagementModal 
          isOpen={isDonorOpen} 
          onClose={() => setIsDonorOpen(false)} 
          campaignId={selectedCampaign.id || selectedCampaign._id}
        />
      )}
      
      {isDeleteOpen && selectedCampaign && (
        <DeleteConfirmationModal 
          isOpen={isDeleteOpen} 
          onClose={() => setIsDeleteOpen(false)} 
          onConfirm={handleDeleteConfirm}
          itemName={selectedCampaign.title || 'this campaign'}
        />
      )}

      {isExpenseOpen && selectedCampaign && (
        <ExpenseManagementModal
          isOpen={isExpenseOpen}
          onClose={() => setIsExpenseOpen(false)}
          onSubmit={handleExpenseSubmit}
          availableBalance={selectedCampaign.availableBalance || 0}
        />
      )}
    </div>
  );
};

export default DonationManagement;
