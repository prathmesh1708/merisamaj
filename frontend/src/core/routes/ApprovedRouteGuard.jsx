import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { isMemberApproved } from '../../modules/member/utils/approvalUtils';
import { ShieldAlert, Clock, Home, Users, ArrowRight } from 'lucide-react';

/**
 * Route guard that restricts unapproved members from accessing protected modules
 * such as Chat, Social, Matrimony, Events, Directory, Donations, etc.
 */
export const ApprovedRouteGuard = ({ featureName = 'This feature' }) => {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const user = auth?.user;

  const approved = isMemberApproved(user);

  if (approved) {
    return <Outlet />;
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-white rounded-[32px] p-7 shadow-xl border border-amber-100 relative overflow-hidden">
        {/* Top Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />

        {/* Icon */}
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
        <h2 className="text-[20px] font-black text-slate-900 leading-tight">
          Community Head Approval Required
        </h2>
        <p className="text-[13px] font-bold text-amber-600 mt-0.5">
          समाज अध्यक्ष द्वारा अनुमोदन आवश्यक है
        </p>

        {/* Description */}
        <div className="mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2">
          <p className="text-[12.5px] text-slate-700 font-medium leading-relaxed">
            Access to <strong className="text-slate-900 font-bold">{featureName}</strong> is locked for new members until your account is approved.
          </p>
          <p className="text-[12px] text-slate-600 leading-relaxed">
            Your registration is currently under review by the <strong className="text-slate-800">Community Head</strong>. Once approved, you will have full access.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={() => navigate('/member/home')}
            className="w-full py-3 px-4 bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] hover:from-[#6D28D9] hover:to-[#4C1D95] text-white font-extrabold text-[13px] rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition-all press-scale"
          >
            <Home size={16} />
            Go to Home Page / होम पेज पर जाएं
          </button>

          <button
            onClick={() => navigate('/member/leadership')}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[12px] rounded-2xl flex items-center justify-center gap-2 transition-colors"
          >
            <Users size={15} />
            View Community Leaders / समाज नेतृत्व
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovedRouteGuard;
