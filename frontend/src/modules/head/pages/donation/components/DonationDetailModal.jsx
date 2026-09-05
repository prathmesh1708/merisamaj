import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, MapPin, Users, CheckCircle, Clock } from 'lucide-react';
import headDonationService from '../../../../../core/api/headDonationService';

const DonationDetailModal = ({ isOpen, onClose, campaignId }) => {
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && campaignId) {
      loadDetails();
    }
  }, [isOpen, campaignId]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const data = await headDonationService.getCampaignById(campaignId);
      setCampaign(data);
    } catch (error) {
      console.error('Failed to load details', error);
    } finally {
      setLoading(false);
    }
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
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {loading ? (
            <div className="flex-1 p-12 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
            </div>
          ) : campaign ? (
            <>
              {/* Header */}
              <div className="relative h-48 bg-gray-100 shrink-0">
                {campaign.bannerImage ? (
                  <img src={campaign.bannerImage} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">No Banner Image</div>
                )}
                <div className="absolute top-4 right-4 flex gap-2">
                  <span className="px-3 py-1 bg-black/50 backdrop-blur-sm text-white rounded-full text-xs font-bold uppercase tracking-wider">
                    {campaign.status}
                  </span>
                  <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">{campaign.title || 'Untitled Campaign'}</h2>
                  <p className="text-gray-500 mt-1">{campaign.shortDescription || 'No short description provided.'}</p>
                </div>

                {/* Progress Card */}
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Raised</p>
                      <h3 className="text-2xl font-black text-brand-primary">₹{(campaign.collectedAmount || campaign.raisedAmount || 0).toLocaleString()}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target</p>
                      <p className="font-bold text-gray-700">₹{(campaign.targetAmount || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                    <div 
                      className="bg-brand-primary h-3 rounded-full transition-all duration-1000" 
                      style={{ width: `${Math.min(100, Math.round((((campaign.collectedAmount || campaign.raisedAmount || 0)) / (campaign.targetAmount || 1)) * 100))}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                      <Users size={16} className="text-gray-400" /> {campaign.contributorsCount || campaign.totalDonors || 0} Donors
                    </div>
                    {campaign.minDonation > 0 && (
                      <span className="text-gray-500">Min: ₹{campaign.minDonation}</span>
                    )}
                  </div>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <CheckCircle size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category</p>
                      <p className="font-bold text-gray-900">{campaign.category || 'General'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Visibility</p>
                      <p className="font-bold text-gray-900">{campaign.visibility || 'All Members'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Created</p>
                      <p className="font-bold text-gray-900">{new Date(campaign.createdAt || Date.now()).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Last Updated</p>
                      <p className="font-bold text-gray-900">{new Date(campaign.updatedAt || campaign.createdAt || Date.now()).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Description</h3>
                  <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                    {campaign.description || 'No detailed description available.'}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 p-12 flex flex-col items-center justify-center text-center">
              <p className="text-gray-500 mb-4">Failed to load campaign details.</p>
              <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">Close</button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DonationDetailModal;
