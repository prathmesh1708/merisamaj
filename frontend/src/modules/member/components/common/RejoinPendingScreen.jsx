import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, RefreshCw, LogOut, User } from 'lucide-react';
import { useAuth } from '../../../../core/auth/useAuth';
import { authService } from '../../../../core/auth/authService';

/**
 * Shown to members whose previous community was deleted by Admin and who have
 * re-selected a community — everything stays locked until the new community's
 * Head / Local Head approves them.
 */
export const RejoinPendingScreen = ({ user }) => {
  const navigate = useNavigate();
  const { setAuth, logout } = useAuth();
  const [checking, setChecking] = useState(false);
  const [statusNote, setStatusNote] = useState('');

  const communityName = user?.community || 'your community';

  const handleCheckStatus = async () => {
    setChecking(true);
    setStatusNote('');
    try {
      const res = await authService.getMe();
      if (res?.user) {
        try { localStorage.setItem('merisamaj_user', JSON.stringify(res.user)); } catch { /* ignore */ }
        setAuth(prev => ({ ...prev, user: res.user }));
        if (res.user.verificationStatus !== 'verified') {
          setStatusNote('Still pending approval. Please check again later.');
        }
      }
    } catch {
      setStatusNote('Could not check status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-white rounded-[32px] p-7 shadow-xl border border-amber-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />

        <div className="mx-auto w-20 h-20 mb-5 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center shadow-lg shadow-amber-500/30 text-white border-2 border-white">
          <Clock size={36} strokeWidth={2.2} />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-[11px] font-bold mb-3">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <span>Approval Pending / अनुमोदन प्रतीक्षित</span>
        </div>

        <h2 className="text-[20px] font-black text-slate-900 leading-tight">
          Waiting for Community Approval
        </h2>

        <div className="mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2">
          {user?.removedCommunityName && (
            <p className="text-[12.5px] text-slate-700 font-medium leading-relaxed">
              Your previous community <strong className="text-slate-900">"{user.removedCommunityName}"</strong> has been removed by the Admin.
            </p>
          )}
          <p className="text-[12px] text-slate-600 leading-relaxed">
            Your request to join <strong className="text-slate-800">{communityName}</strong> is pending with your{' '}
            <strong className="text-slate-800">Community Head</strong> and <strong className="text-slate-800">Local Head</strong>.
            Once they approve, you can use the app normally — your membership and plan are kept safe.
          </p>
        </div>

        {statusNote && (
          <p className="mt-3 text-[12px] font-semibold text-amber-700">{statusNote}</p>
        )}

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={handleCheckStatus}
            disabled={checking}
            className="w-full py-3 px-4 bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] hover:from-[#6D28D9] hover:to-[#4C1D95] text-white font-extrabold text-[13px] rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition-all press-scale disabled:opacity-60"
          >
            <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Checking…' : 'Check Approval Status'}
          </button>
          <button
            onClick={() => navigate('/member/profile')}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[12px] rounded-2xl flex items-center justify-center gap-2 transition-colors"
          >
            <User size={15} />
            View My Profile
          </button>
          <button
            onClick={() => { logout?.(); navigate('/member/login', { replace: true }); }}
            className="w-full py-2.5 px-4 text-rose-600 hover:bg-rose-50 font-bold text-[12px] rounded-2xl flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut size={15} />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejoinPendingScreen;
