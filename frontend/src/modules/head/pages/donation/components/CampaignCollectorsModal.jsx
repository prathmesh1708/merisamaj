import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Users, ShieldCheck, Loader2 } from 'lucide-react';
import headDonationService from '../../../../../core/api/headDonationService';

const CampaignCollectorsModal = ({ isOpen, onClose, campaignId, campaignTitle }) => {
  const [loading, setLoading] = useState(true);
  const [creatorCanCollect, setCreatorCanCollect] = useState(true);
  const [subHeads, setSubHeads] = useState([]);
  const [togglingId, setTogglingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await headDonationService.getCampaignCollectors(campaignId);
      setCreatorCanCollect(data.creatorCanCollect !== false);
      setSubHeads(data.subHeads || []);
    } catch (error) {
      console.error('Failed to load campaign collectors', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && campaignId) load();
  }, [isOpen, campaignId]);

  const handleToggle = async (subHead) => {
    setTogglingId(subHead.id);
    try {
      await headDonationService.updateCampaignCollectors(campaignId, subHead.id, !subHead.grantedForCampaign);
      setSubHeads(prev => prev.map(s => s.id === subHead.id ? { ...s, grantedForCampaign: !s.grantedForCampaign } : s));
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update access.');
    } finally {
      setTogglingId(null);
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Wallet className="text-brand-primary" size={22} /> Cash Collection Access
              </h2>
              <p className="text-xs text-gray-500 mt-1 truncate max-w-sm">{campaignTitle}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer">
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="animate-spin text-brand-primary mb-3" size={28} />
                <p className="text-sm text-gray-500">Loading...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-semibold text-emerald-800">
                  <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                  <span>As the creator of this campaign, you can always collect cash for it — no separate permission needed.</span>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Users size={14} /> Grant Collection Access to Your Sub-Heads
                  </h3>
                  {subHeads.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-400 bg-gray-50 rounded-xl border border-gray-100">
                      You haven't created any Sub-Heads yet. Add one from Sub-Head Management first.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {subHeads.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50/60 transition-colors">
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{s.name}</p>
                            <p className="text-xs text-gray-500">{s.designation}{s.city ? ` · ${s.city}` : ''}</p>
                            {s.hasGlobalPermission && (
                              <span className="inline-block mt-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                Has global Cash Collection permission
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleToggle(s)}
                            disabled={togglingId === s.id}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                              s.grantedForCampaign
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {togglingId === s.id ? '...' : s.grantedForCampaign ? 'Granted ✓' : 'Grant Access'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CampaignCollectorsModal;
