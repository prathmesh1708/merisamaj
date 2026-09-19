import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Check, X, AlertCircle, CheckCircle2, Search, Sparkles, Layers } from 'lucide-react';
import { axiosPrivate } from '../../../../../core/api/axiosPrivate';
import { userService } from '../../../services/userService';

export const EditUserCommunityModal = ({ user, isOpen, onClose, onSuccess }) => {
  const [communities, setCommunities] = useState([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState('');
  const [customCommunityName, setCustomCommunityName] = useState('');
  const [subCommunity, setSubCommunity] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      setError('');
      setSuccessMsg('');
      setSearchQuery('');
      setSubCommunity(user.subCommunity || '');

      const initialCommId = user.communityId?._id || user.communityId || '';
      const initialCommName = user.communityId?.name || user.community || '';

      setSelectedCommunityId(initialCommId);
      setCustomCommunityName(initialCommName);

      // Load all available communities
      setFetchLoading(true);
      axiosPrivate.get('/admin/communities')
        .then(res => {
          const list = res.data?.data || [];
          setCommunities(list);
          const matched = list.find(c => 
            (c._id || c.id) === initialCommId || 
            c.name?.toLowerCase() === initialCommName?.toLowerCase()
          );
          if (matched) {
            setSelectedCommunityId(matched._id || matched.id);
            setIsCustomMode(false);
          } else if (initialCommName) {
            setIsCustomMode(true);
          }
        })
        .catch(err => {
          console.error('Failed to load communities for admin modal:', err);
        })
        .finally(() => {
          setFetchLoading(false);
        });
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const filteredCommunities = communities.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.city && c.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedCommunityDoc = communities.find(c => (c._id || c.id) === selectedCommunityId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let targetCommunityId = null;
      let targetCommunityName = '';

      if (isCustomMode) {
        if (!customCommunityName.trim()) {
          throw new Error('Please enter a valid Samaj / Community name.');
        }
        targetCommunityName = customCommunityName.trim();
        const existingMatch = communities.find(c => c.name.toLowerCase() === targetCommunityName.toLowerCase());
        if (existingMatch) {
          targetCommunityId = existingMatch._id || existingMatch.id;
        }
      } else {
        if (!selectedCommunityId) {
          throw new Error('Please select a community from the list.');
        }
        targetCommunityId = selectedCommunityId;
        targetCommunityName = selectedCommunityDoc?.name || '';
      }

      const payload = {
        communityId: targetCommunityId,
        community: targetCommunityName,
        subCommunity: subCommunity.trim() || undefined,
      };

      const userId = user.id || user._id;
      await userService.updateUser(userId, payload);

      setSuccessMsg(`Samaj updated successfully to "${targetCommunityName}"!`);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update user community');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-purple-100 flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-[#1e1145] to-[#2d1266] p-6 text-white relative shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-amber-300">
                <Building2 size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">Edit Member Samaj (समाज बदलें)</h2>
                <p className="text-xs text-purple-200 font-medium mt-0.5">
                  Update community assignment for {user.name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-purple-300 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* User Info Card */}
            <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">{user.name}</p>
                <p className="text-[11px] text-slate-500 font-medium">{user.phone} • City: {user.city || 'N/A'}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-black tracking-wider text-purple-500 block">Current Samaj</span>
                <span className="text-xs font-bold text-purple-900 bg-white px-2.5 py-0.5 rounded-full border border-purple-200 inline-block mt-0.5">
                  {user.community || 'Not Assigned'}
                </span>
              </div>
            </div>

            {/* Mode Switcher (Select Registered vs Custom) */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setIsCustomMode(false)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  !isCustomMode ? 'bg-white text-purple-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🏛️ Choose from Registered Communities
              </button>
              <button
                type="button"
                onClick={() => setIsCustomMode(true)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  isCustomMode ? 'bg-white text-purple-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ✏️ Custom Samaj Name
              </button>
            </div>

            {!isCustomMode ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search community name..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-purple-600"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-50">
                  {fetchLoading ? (
                    <p className="text-xs text-slate-400 text-center py-4">Loading communities...</p>
                  ) : filteredCommunities.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No communities match your search.</p>
                  ) : (
                    filteredCommunities.map(comm => {
                      const isSelected = selectedCommunityId === (comm._id || comm.id);
                      return (
                        <div
                          key={comm._id || comm.id}
                          onClick={() => {
                            setSelectedCommunityId(comm._id || comm.id);
                            setCustomCommunityName(comm.name);
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-purple-50/80 border-purple-400 shadow-xs'
                              : 'bg-white hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900">{comm.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {comm.headId?.name ? `Head: ${comm.headId.name}` : 'No head assigned'} 
                              {comm.city ? ` • Base: ${comm.city}` : ''}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                              <Check size={12} />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Custom Samaj / Community Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ahirwar Samaj, Maheshwari Samaj"
                  value={customCommunityName}
                  onChange={e => setCustomCommunityName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-purple-600"
                />
              </div>
            )}

            {/* Sub-Community Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Sub-Samaj / Gotra (उप-समाज / शाखा - ऐच्छिक)
              </label>
              <input
                type="text"
                placeholder="e.g. Shakha, Gotra, or Sub-community"
                value={subCommunity}
                onChange={e => setSubCommunity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-purple-600"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                {loading ? 'Saving Changes...' : 'Save & Update Samaj'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
