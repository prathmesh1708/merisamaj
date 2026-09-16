import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, AlertCircle, Check, Loader2 } from 'lucide-react';

const CANCEL_REASON_PRESETS = [
  { id: 'postponed', label: 'Postponed / स्थगित (New date soon)' },
  { id: 'unavoidable', label: 'Unavoidable Circumstances / अपरिहार्य कारण' },
  { id: 'venue_changed', label: 'Venue or Time Changed / स्थान/समय परिवर्तन' },
  { id: 'family_reason', label: 'Family Emergency / पारिवारिक कारण' },
  { id: 'cancelled_org', label: 'Event Cancelled / कार्यक्रम निरस्त' }
];

export default function CancelInvitationModal({ isOpen, onClose, invitation, onConfirm }) {
  const [selectedPreset, setSelectedPreset] = useState(CANCEL_REASON_PRESETS[0].label);
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !invitation) return null;

  const displayTitle = invitation.title || `Wedding of ${invitation.groomName} & ${invitation.brideName}`;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const finalReason = (customReason && customReason.trim()) ? customReason.trim() : selectedPreset;
    
    if (!finalReason) {
      setError('Please provide a reason for cancelling this invitation.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onConfirm(finalReason);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to cancel invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-[88dvh] sm:max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Banner (Fixed at top of modal) */}
          <div className="bg-gradient-to-r from-rose-500 via-red-500 to-pink-600 p-4 sm:p-6 text-white text-left relative shrink-0">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors text-white"
            >
              <X size={16} />
            </button>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-2 sm:mb-3 border border-white/30">
              <AlertTriangle size={20} className="text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-black tracking-tight leading-tight">Cancel Invitation</h3>
            <p className="text-[11px] sm:text-xs text-white/90 font-medium mt-0.5 leading-snug">
              कार्यक्रम रद्द करें · All invited members will be notified with your reason.
            </p>
          </div>

          {/* Body Content (Scrollable) */}
          <form id="cancel-invitation-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3.5 text-left">
            {/* Event Name Pill */}
            <div className="bg-slate-50 border border-slate-200/70 p-3 sm:p-3.5 rounded-2xl">
              <p className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">Selected Event</p>
              <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 truncate">{displayTitle}</p>
              {invitation.date && (
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  Date: {new Date(invitation.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>

            {/* Presets */}
            <div>
              <label className="block text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-600 mb-1.5">
                Select Reason (कारण चुनें)
              </label>
              <div className="space-y-1.5">
                {CANCEL_REASON_PRESETS.map((preset) => {
                  const isSelected = selectedPreset === preset.label;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedPreset(preset.label);
                        if (!customReason) setError('');
                      }}
                      className={`w-full p-2 sm:p-2.5 rounded-xl text-left text-[11px] sm:text-xs font-bold transition-all flex items-center justify-between border ${
                        isSelected
                          ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-2xs'
                          : 'bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="leading-snug">{preset.label}</span>
                      {isSelected && <Check size={14} className="text-rose-600 shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Notes */}
            <div>
              <label className="block text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-600 mb-1.5">
                Additional Note / Custom Reason (वैकल्पिक विवरण)
              </label>
              <textarea
                rows={2}
                value={customReason}
                onChange={(e) => {
                  setCustomReason(e.target.value);
                  setError('');
                }}
                placeholder="Type additional details or reason for invitees (e.g., We regret to inform you that due to unexpected weather, the event is postponed to next month)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-2.5 sm:p-3 text-xs font-medium outline-none focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/10 transition-all text-slate-800 placeholder-slate-400"
              />
            </div>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-bold">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </form>

          {/* Sticky Actions Footer (Always visible above bottom bars) */}
          <div className="shrink-0 p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 sm:py-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-colors"
            >
              Keep Event Active
            </button>
            <button
              type="submit"
              form="cancel-invitation-form"
              disabled={isSubmitting}
              className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl text-xs sm:text-sm font-black shadow-md shadow-rose-500/25 transition-all flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Confirm Cancel (रद्द करें)'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
