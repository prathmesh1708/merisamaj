import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Crown } from 'lucide-react';

/**
 * Shown in place of a matrimony section the member's plan doesn't include.
 * Which sections are locked comes from the plan's features (admin → Subscription Plans).
 */
const PlanLockScreen = ({ title, description, compact = false }) => {
  const navigate = useNavigate();
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 ${compact ? 'py-10' : 'py-16'}`}>
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-100 to-amber-100 flex items-center justify-center mb-4 shadow-sm">
        <Lock size={26} className="text-rose-500" />
      </div>
      <h3 className="text-[16px] font-black text-slate-800">{title}</h3>
      <p className="text-[12.5px] text-slate-500 font-semibold mt-1.5 max-w-[280px] leading-relaxed">
        {description || 'This feature is not part of your current plan. Upgrade to unlock it.'}
      </p>
      <button
        onClick={() => navigate('/member/matrimonial/subscription')}
        className="mt-5 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-full text-[13px] font-black flex items-center gap-2 shadow-md active:scale-95 transition-all"
      >
        <Crown size={15} /> View Plans & Upgrade
      </button>
    </div>
  );
};

export default PlanLockScreen;
