import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hourglass, RefreshCw, ListChecks, LogOut } from 'lucide-react';
import { useAuth } from '../../../../core/auth/useAuth';
import { authService } from '../../../../core/auth/authService';

/**
 * Shown to a member who typed a community under "Other" that doesn't exist yet.
 * Members can't create communities: the admin sees the request and creates it (or
 * adds them to an existing one). Until then the member waits here.
 */
const CommunityRequestedScreen = () => {
  const navigate = useNavigate();
  const { auth, setAuth, logout } = useAuth();
  const requested = auth.user?.requestedCommunity || 'your community';
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState('');

  const checkAgain = async () => {
    setChecking(true);
    setNote('');
    try {
      const res = await authService.getMe();
      if (res?.user) {
        try { localStorage.setItem('merisamaj_user', JSON.stringify(res.user)); } catch { /* storage full */ }
        setAuth(prev => ({ ...prev, user: res.user }));
        if (res.user.requestedCommunity && !res.user.communityId) setNote('Still waiting for the admin. We will notify you as soon as it is added.');
      }
    } catch {
      setNote('Could not check right now. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const chooseFromList = () => {
    try { localStorage.setItem('merisamaj_onboarding_resume_step', 'onboarding-2'); } catch { /* storage unavailable */ }
    navigate('/member/onboarding');
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-purple-50 to-white flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-purple-100 shadow-xl p-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
          <Hourglass size={30} />
        </div>
        <h1 className="text-xl font-black text-slate-900">Community requested</h1>
        <p className="text-sm text-slate-500 font-semibold mt-2 leading-relaxed">
          <b className="text-slate-800">{requested}</b> is not on ApniSamaj yet. We have sent it to the admin.
          You will be added and notified as soon as it is created.
        </p>

        {note && <p className="mt-4 text-xs font-bold text-purple-700 bg-purple-50 rounded-xl px-3 py-2">{note}</p>}

        <div className="mt-6 space-y-2.5">
          <button onClick={checkAgain} disabled={checking}
            className="w-full py-3 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60">
            <RefreshCw size={16} className={checking ? 'animate-spin' : ''} /> Check again
          </button>
          <button onClick={chooseFromList}
            className="w-full py-3 rounded-2xl border border-slate-200 text-slate-700 text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50">
            <ListChecks size={16} /> Choose a community from the list
          </button>
          {logout && (
            <button onClick={() => logout()} className="w-full py-2.5 text-xs font-bold text-slate-400 flex items-center justify-center gap-1.5 hover:text-rose-500">
              <LogOut size={14} /> Log out
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunityRequestedScreen;
