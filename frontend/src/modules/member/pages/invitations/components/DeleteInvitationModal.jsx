import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';

export default function DeleteInvitationModal({ isOpen, onClose, invitation, onConfirm }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !invitation) return null;

  const displayTitle = invitation.title || `Wedding of ${invitation.groomName} & ${invitation.brideName}`;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError('');
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to delete invitation');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-left max-h-[88dvh] sm:max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Banner (Fixed at top) */}
          <div className="bg-gradient-to-r from-red-600 to-rose-600 p-4 sm:p-6 text-white relative shrink-0">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors text-white"
            >
              <X size={16} />
            </button>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-2 sm:mb-3 border border-white/30">
              <Trash2 size={20} className="text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-black tracking-tight leading-tight">Delete Invitation?</h3>
            <p className="text-[11px] sm:text-xs text-white/90 font-medium mt-0.5 leading-snug">
              स्थायी रूप से हटाएं (Delete Permanently)
            </p>
          </div>

          {/* Body (Scrollable if needed) */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-3.5">
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              Are you sure you want to permanently delete <strong className="text-slate-900 font-bold">"{displayTitle}"</strong>?
            </p>

            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 sm:p-3.5 flex items-start gap-2.5 text-amber-800 text-[11px] sm:text-[11.5px] font-medium leading-snug">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                This will delete the invitation for <strong>you and ALL invited members</strong>. It will be removed from everyone's invitation list.
              </span>
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
                {error}
              </div>
            )}
          </div>

          {/* Sticky Actions Footer */}
          <div className="shrink-0 p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 py-2.5 sm:py-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-colors"
            >
              Keep Invitation
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl text-xs sm:text-sm font-black shadow-md shadow-red-500/25 transition-all flex items-center justify-center gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete for Everyone'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
