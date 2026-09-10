import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Clock, ArrowRight, X, Phone, Users, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * ApprovalRequiredModal
 * Shown when an unapproved/pending member tries to access restricted features
 * (Chat, Social, Matrimony, Directory, Donations, etc.)
 */
export const ApprovalRequiredModal = ({ isOpen, onClose, featureName = '' }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleViewLeaders = () => {
    onClose();
    navigate('/member/leadership');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl border border-amber-100 z-10"
        >
          {/* Top Decorative Gradient */}
          <div className="h-2.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 w-full" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors z-20"
          >
            <X size={16} />
          </button>

          <div className="p-6 sm:p-7 text-center">
            {/* Glowing Icon Container */}
            <div className="relative mx-auto w-20 h-20 mb-5 flex items-center justify-center">
              <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center shadow-lg shadow-amber-500/30 text-white border-2 border-white">
                <ShieldAlert size={36} strokeWidth={2.2} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-amber-100 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                <Clock size={14} className="text-amber-700" />
              </div>
            </div>

            {/* Status Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-[11px] font-bold mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Pending Head Approval / अनुमोदन प्रतीक्षित</span>
            </div>

            {/* Title */}
            <h3 className="text-[20px] font-black text-slate-900 leading-tight">
              Community Head Approval Required
            </h3>
            <p className="text-[13px] font-bold text-amber-600 mt-0.5">
              समाज अध्यक्ष द्वारा अनुमोदन आवश्यक है
            </p>

            {/* Message Description */}
            <div className="mt-3.5 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2">
              <p className="text-[12.5px] text-slate-700 font-medium leading-relaxed">
                {featureName ? (
                  <>
                    Access to <strong className="text-slate-900 font-bold">{featureName}</strong> is restricted for new members.
                  </>
                ) : (
                  <>
                    Access to <strong className="text-slate-900 font-bold">Chat, Social Feed, Directory</strong>, and other member features is restricted for new members.
                  </>
                )}
              </p>
              <p className="text-[12px] text-slate-600 leading-relaxed">
                Your profile is currently under review by the <strong className="text-slate-800">Community Head (समाज अध्यक्ष)</strong>. Once approved, you will gain full access to all sections.
              </p>
            </div>

            {/* Available Features Notice */}
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-emerald-50/70 border border-emerald-100 rounded-xl text-left">
              <Shield size={16} className="text-emerald-600 shrink-0" />
              <p className="text-[11px] text-emerald-800 font-medium leading-tight">
                Currently, you can view the <strong>Home Banner</strong>, <strong>Core Members</strong>, <strong>Success Stories</strong>, and <strong>Matrimony</strong>.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                onClick={handleViewLeaders}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] hover:from-[#6D28D9] hover:to-[#4C1D95] text-white font-extrabold text-[13px] rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition-all press-scale"
              >
                <Users size={16} />
                View Community Leaders / समाज नेतृत्व देखें
                <ArrowRight size={15} />
              </button>

              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[12px] rounded-2xl transition-colors"
              >
                Close / समझ गया
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ApprovalRequiredModal;
