import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight, UserPlus, LogIn } from 'lucide-react';

/**
 * Single entry point of the app: choose how to sign in.
 *  - Member         → existing member login / registration (/member/login, /member/register)
 * Leadership accounts continue to use their direct login routes.
 */
const LoginAsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-10 bg-gradient-to-br from-[#f5f3ff] via-white to-[#eef2ff]">
      <div className="w-full max-w-[420px]">
        {/* Brand */}
        <div className="text-center mb-7">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Users size={30} className="text-white" />
          </div>
          <h1 className="mt-4 text-[26px] font-black text-slate-900 tracking-tight">ApniSamaj</h1>
          <p className="text-[13px] text-slate-500 font-semibold mt-1">Choose how you want to continue</p>
        </div>

        {/* Member */}
        <div className="bg-white rounded-3xl border border-purple-100 shadow-[0_8px_30px_rgba(124,58,237,0.08)] p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#9333EA] flex items-center justify-center shrink-0">
              <Users size={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wider text-[#7C3AED]">Login as</p>
              <h2 className="text-[17px] font-black text-slate-900 leading-tight">Member</h2>
              <p className="text-[12px] text-slate-500 font-medium">Samaj members & families</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <button
              type="button"
              onClick={() => navigate('/member/login')}
              className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[13px] font-bold shadow-md shadow-purple-500/25 active:scale-[0.98] transition-all"
            >
              <LogIn size={16} /> Login
            </button>
            <button
              type="button"
              onClick={() => navigate('/member/register')}
              className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-purple-50 hover:bg-purple-100 text-[#7C3AED] border border-purple-200 text-[13px] font-bold active:scale-[0.98] transition-all"
            >
              <UserPlus size={16} /> Register
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginAsPage;
