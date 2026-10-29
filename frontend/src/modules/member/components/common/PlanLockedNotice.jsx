import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Lock } from 'lucide-react';

/** Full-screen "your plan doesn't include this" with a way to the membership plans. */
export const PlanLockedNotice = ({ title, message, secondaryAction }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="Go back"
        className="absolute top-5 left-4 w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600"
      >
        <ArrowLeft size={18} />
      </button>
      <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 mb-4">
        <Lock size={28} />
      </div>
      <h2 className="text-lg font-black text-slate-900">{title}</h2>
      <p className="text-[13px] text-slate-500 leading-relaxed mt-2 max-w-xs">{message}</p>
      <button
        type="button"
        onClick={() => navigate('/member/membership')}
        className="mt-6 w-full max-w-xs h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-md shadow-amber-500/25"
      >
        <Crown size={17} /> See membership plans
      </button>
      {secondaryAction && (
        <button
          type="button"
          onClick={secondaryAction.onClick}
          className="mt-3 w-full max-w-xs h-11 rounded-2xl bg-white border border-slate-200 text-slate-700 text-sm font-bold"
        >
          {secondaryAction.label}
        </button>
      )}
    </div>
  );
};

export default PlanLockedNotice;
