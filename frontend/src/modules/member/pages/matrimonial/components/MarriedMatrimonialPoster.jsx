import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, LogIn, Loader2 } from 'lucide-react';
import { useData } from '../../../context/DataProvider';

/**
 * Shown instead of the matrimonial section to members who registered as Married.
 * Matrimony profiles belong to the person looking for a match, so a family member
 * (son, daughter, sibling…) needs their own account: this poster sends the member
 * to Register / Login, logging them out first so those pages open.
 */
export const MarriedMatrimonialPoster = () => {
  const navigate = useNavigate();
  const { currentUser, logoutUser } = useData();
  const [leavingTo, setLeavingTo] = useState(null); // 'register' | 'login'

  const goTo = async (page) => {
    const ok = window.confirm(
      page === 'register'
        ? 'You will be logged out so you can register a new account for your family member. Continue?'
        : 'You will be logged out so you can log in with your family member\'s account. Continue?'
    );
    if (!ok) return;
    setLeavingTo(page);
    try {
      await logoutUser();
    } finally {
      navigate(`/member/${page}`, { replace: true });
    }
  };

  const firstName = (currentUser?.name || '').split(' ')[0];

  return (
    <div className="min-h-full w-full bg-gradient-to-b from-rose-50 via-white to-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 shrink-0">
        <button
          onClick={() => navigate('/member/home')}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200/70 flex items-center justify-center text-slate-700 active:scale-95 transition-transform"
          aria-label="Back to home"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-[16px] font-extrabold text-slate-800">Matrimony</h1>
      </div>

      <div className="flex-1 px-4 pb-28 pt-2 max-w-md w-full mx-auto">
        {/* Poster */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-600 text-white p-6 shadow-[0_12px_32px_rgba(236,72,153,0.28)]">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -left-8 -bottom-12 w-36 h-36 rounded-full bg-white/10" />
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.07] pointer-events-none">
            <span style={{ fontSize: '200px', lineHeight: 1 }}>💍</span>
          </div>

          <div className="relative z-10 text-center">
            <span className="block mb-3" style={{ fontSize: '52px', lineHeight: 1 }}>💑</span>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/80">
              {firstName ? `Namaste, ${firstName}` : 'Namaste'}
            </p>
            <h2 className="text-[22px] font-black leading-tight mt-1.5">You are already married</h2>
            <p className="text-[13px] text-white/85 font-semibold leading-relaxed mt-3">
              Your account is registered as <strong className="text-yellow-200">Married</strong>, so
              matchmaking isn't available on your own profile.
            </p>
          </div>
        </div>

        {/* Family member card */}
        <div className="mt-5 bg-white rounded-3xl border border-rose-100 shadow-[0_4px_18px_rgba(244,63,94,0.06)] p-5">
          <h3 className="text-[15px] font-black text-slate-800">Looking for a match for your family member?</h3>
          <p className="text-[12.5px] text-slate-500 font-semibold leading-relaxed mt-1.5">
            Create a new profile for your son, daughter, brother or sister with their own account.
            They can then use Matrimony to find matches.
          </p>

          <button
            onClick={() => goTo('register')}
            disabled={Boolean(leavingTo)}
            className="mt-4 w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-[14px] font-extrabold flex items-center justify-center gap-2 shadow-md shadow-rose-200 active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {leavingTo === 'register' ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
            Create a New Profile
          </button>

          <button
            onClick={() => goTo('login')}
            disabled={Boolean(leavingTo)}
            className="mt-2.5 w-full py-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 text-[13px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {leavingTo === 'login' ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            Already have their account? Log in
          </button>
        </div>

        <p className="text-[11px] text-slate-400 font-semibold text-center leading-relaxed mt-4 px-4">
          You'll be logged out of this account first. You can log back in any time.
        </p>
      </div>
    </div>
  );
};

export default MarriedMatrimonialPoster;
