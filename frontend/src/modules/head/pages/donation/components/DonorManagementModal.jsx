import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Download, Users, IndianRupee } from 'lucide-react';
import headDonationService from '../../../../../core/api/headDonationService';

const DonorManagementModal = ({ isOpen, onClose, campaignId }) => {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && campaignId) {
      loadDonors();
    }
  }, [isOpen, campaignId]);

  const loadDonors = async () => {
    setLoading(true);
    try {
      const data = await headDonationService.getCampaignDonors(campaignId);
      setDonors(data);
    } catch (error) {
      console.error('Failed to load donors', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDonors = (donors || []).filter(d => 
    (d.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.txnId || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status) => {
    if (status === 'Completed' || status === 'Success') return <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-bold">Success</span>;
    if (status === 'Failed') return <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-xs font-bold">Failed</span>;
    return <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs font-bold">{status || 'Active'}</span>;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="text-brand-primary" size={24} /> Donor Management
              </h2>
              <p className="text-sm text-gray-500 mt-1">View and manage all contributions for this campaign.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Toolbar */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
            <div className="relative group flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-primary transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search by name or txn ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all text-sm font-medium"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors cursor-pointer">
              <Download size={16} /> Export CSV
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-0">
            {loading ? (
              <div className="flex-1 p-12 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading donors...</p>
              </div>
            ) : filteredDonors.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 text-gray-400">
                  <IndianRupee size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">No donations found</h3>
                <p className="text-gray-500 mt-1">There are no donations matching your criteria yet.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Donor</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Txn ID</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredDonors.map((donor, idx) => (
                    <tr key={donor.id || idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900 text-sm">{donor.name || 'Anonymous'}</p>
                        <p className="text-xs text-gray-500">ID: {donor.memberId || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-brand-primary text-sm">₹{(donor.amount || 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{donor.paymentMethod || 'Razorpay'}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono text-xs">
                        {donor.txnId || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(donor.date || Date.now()).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {getStatusBadge(donor.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DonorManagementModal;
