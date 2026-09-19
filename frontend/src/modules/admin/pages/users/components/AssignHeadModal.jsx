import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Crown, UserCheck, Users, X, AlertCircle, CheckCircle2, Building2, MapPin } from 'lucide-react';
import { communityHeadService } from '../../../services/communityHeadService';
import { userService } from '../../../services/userService';

export const AssignHeadModal = ({ user, isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState('promote'); // 'promote' | 'existing'
  const [availableHeads, setAvailableHeads] = useState([]);
  const [selectedHeadId, setSelectedHeadId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccessMsg('');
      setMode('promote');
      setSelectedHeadId('');
      // Load available heads
      communityHeadService.getHeads()
        .then(heads => {
          setAvailableHeads(heads || []);
          if (heads && heads.length > 0) {
            setSelectedHeadId(heads[0].id || heads[0]._id);
          }
        })
        .catch(err => console.error('Failed to load existing heads:', err));
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        action: mode === 'promote' ? 'promote_user' : 'assign_existing_head',
        targetHeadId: mode === 'existing' ? selectedHeadId : undefined,
      };

      const res = await userService.assignHead(user.id, payload);
      setSuccessMsg(res.message || 'Head assigned successfully!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to assign community head');
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
          className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-purple-100"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-[#1e1145] to-[#2d1266] p-6 text-white relative">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-amber-300">
                <Crown size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">Assign Community Head</h2>
                <p className="text-xs text-purple-200 font-medium mt-0.5">
                  Resolve head pending for {user.community || 'Samaj'} in {user.city || 'unassigned city'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-purple-300 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* User & Context Summary Card */}
          <div className="p-6 space-y-5">
            <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{user.name}</p>
                    <p className="text-xs text-slate-500 font-medium">{user.phone} {user.email ? `• ${user.email}` : ''}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                  🔴 Head Pending
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-100/80 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-1.5 truncate">
                  <Building2 size={13} className="text-purple-500 shrink-0" />
                  <span className="truncate">{user.community || 'No Community'}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin size={13} className="text-purple-500 shrink-0" />
                  <span className="truncate">{user.city || 'City Pending'}</span>
                </div>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setMode('promote')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  mode === 'promote'
                    ? 'bg-white text-purple-700 shadow-sm border border-purple-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Crown size={15} /> Promote This Member
              </button>
              <button
                type="button"
                onClick={() => setMode('existing')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  mode === 'existing'
                    ? 'bg-white text-purple-700 shadow-sm border border-purple-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck size={15} /> Assign Existing Head
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'promote' ? (
                <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/70 text-xs text-amber-900 space-y-2">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>👑</span> Promote {user.name} directly to Community Head:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800 font-medium">
                    <li>Role will be upgraded to <strong>Community Head</strong> with administrative access.</li>
                    <li>Community <strong>{user.community || 'Samaj'}</strong> in <strong>{user.city}</strong> will be linked to them.</li>
                    <li>Status in registration and member directory will update to <strong>🟢 Head Active</strong>.</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Select Existing Community Head
                  </label>
                  {availableHeads.length > 0 ? (
                    <select
                      value={selectedHeadId}
                      onChange={e => setSelectedHeadId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-purple-600 focus:bg-white transition-all"
                    >
                      {availableHeads.map(h => (
                        <option key={h.id || h._id} value={h.id || h._id}>
                          {h.name} ({h.phone || h.email || 'Head'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                      No other heads found. Please choose "Promote This Member" or create a head first.
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 font-medium">
                    This will assign the selected Head to manage {user.community || 'this community'} and add {user.city} to their jurisdiction.
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || (mode === 'existing' && !selectedHeadId)}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all flex items-center gap-2"
                >
                  {loading ? 'Processing...' : mode === 'promote' ? '✓ Promote to Head' : '✓ Assign Head'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
