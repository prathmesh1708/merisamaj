import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, User, Lock, ShieldCheck, AlertCircle, Loader2, ChevronRight, Award } from 'lucide-react';
import { useHeadAuth } from '../../auth/useHeadAuth';

const HeadLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { headAuth, headLogin } = useHeadAuth();

  const [form, setForm] = useState({ loginId: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState(null);

  const from = location.state?.from?.pathname || '/head/dashboard';

  // Already logged in — go straight to dashboard
  useEffect(() => {
    if (headAuth.isInitialized && headAuth.isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [headAuth.isAuthenticated, headAuth.isInitialized, navigate, from]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.loginId.trim()) {
      setError('Login ID is required.');
      return;
    }
    if (!form.password) {
      setError('Password is required.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await headLogin(form.loginId, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!headAuth.isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f0527 0%, #1a0845 50%, #0d1b4b 100%)' }}>
        <Loader2 size={32} className="animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative overflow-hidden px-4"
      style={{ background: 'linear-gradient(135deg, #0f0527 0%, #1a0845 40%, #0d1b4b 100%)' }}
    >
      {/* ─── Background Aura Blobs ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)', top: '-20%', left: '-10%' }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)', bottom: '-20%', right: '-10%' }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #A78BFA 0%, transparent 70%)', top: '50%', right: '20%' }}
        />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* ─── Login Card ─── */}
      <div
        className="relative w-full max-w-[420px] rounded-2xl overflow-hidden z-10"
        style={{
          background: 'rgba(15, 5, 39, 0.75)',
          border: '1px solid rgba(167, 139, 250, 0.2)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* Top gradient border */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, transparent, #7C3AED, #A78BFA, #7C3AED, transparent)' }}
        />

        <div className="px-8 pt-10 pb-8">
          {/* ─── Header ─── */}
          <div className="flex flex-col items-center mb-8">
            {/* Avatar / Shield Icon */}
            <div className="relative mb-5">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #4C1D95 100%)',
                  boxShadow: '0 12px 40px rgba(124,58,237,0.5), 0 0 0 8px rgba(124,58,237,0.1)',
                }}
              >
                <ShieldCheck size={36} className="text-white relative z-10" />
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%)' }}
                />
              </div>
              {/* Status badge */}
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: '#10B981', border: '2px solid rgba(15,5,39,0.8)' }}
              >
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            </div>

            {/* Titles */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <Award size={13} className="text-amber-400" />
                <span
                  className="text-[10px] font-black uppercase tracking-[0.18em]"
                  style={{ color: 'rgba(253,230,138,0.85)' }}
                >
                  Head & Local Head Portal
                </span>
                <Award size={13} className="text-amber-400" />
              </div>
              <h1 className="text-[24px] font-black text-white leading-tight tracking-tight">
                Leadership Login
              </h1>
              <p className="text-[13px] mt-1" style={{ color: 'rgba(167,139,250,0.7)' }}>
                Sign in with your Login ID, Email, or Phone Number
              </p>
            </div>
          </div>

          {/* ─── Error Alert ─── */}
          {error && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5 text-[13px]"
              style={{
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#FCA5A5',
              }}
            >
              <AlertCircle size={15} className="shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* ─── Form ─── */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Identifier Field (Email, Phone, or Login ID) */}
            <div className="space-y-1.5">
              <label
                htmlFor="head-loginId"
                className="block text-[11px] font-bold uppercase tracking-wider"
                style={{ color: 'rgba(167,139,250,0.8)' }}
              >
                Login ID / Email / Phone
              </label>
              <div className="relative">
                <div
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: focusedField === 'loginId' ? '#A78BFA' : 'rgba(255,255,255,0.3)' }}
                >
                  <User size={15} />
                </div>
                <input
                  id="head-loginId"
                  name="loginId"
                  type="text"
                  autoComplete="username"
                  value={form.loginId}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('loginId')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="e.g. email@example.com, phone, or login ID"
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-[14px] text-white placeholder-white/25 transition-all duration-200 outline-none disabled:opacity-50"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: focusedField === 'loginId'
                      ? '1px solid rgba(167,139,250,0.6)'
                      : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: focusedField === 'loginId' ? '0 0 0 3px rgba(124,58,237,0.15)' : 'none',
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="head-password"
                className="block text-[11px] font-bold uppercase tracking-wider"
                style={{ color: 'rgba(167,139,250,0.8)' }}
              >
                Password
              </label>
              <div className="relative">
                <div
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: focusedField === 'password' ? '#A78BFA' : 'rgba(255,255,255,0.3)' }}
                >
                  <Lock size={15} />
                </div>
                <input
                  id="head-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="w-full pl-10 pr-12 py-3 rounded-xl text-[14px] text-white placeholder-white/25 transition-all duration-200 outline-none disabled:opacity-50"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: focusedField === 'password'
                      ? '1px solid rgba(167,139,250,0.6)'
                      : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(124,58,237,0.15)' : 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="head-login-btn"
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-[14px] text-white transition-all duration-200 active:scale-[0.98] mt-2 relative overflow-hidden group"
              style={{
                background: isLoading
                  ? 'rgba(124,58,237,0.5)'
                  : 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                boxShadow: isLoading ? 'none' : '0 8px 24px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              {/* Shimmer on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 60%)' }}
              />
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Login to Dashboard</span>
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* ─── Apply Link ─── */}
          <div className="mt-6 text-center">
            <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Don&apos;t have Head Panel access?{' '}
              <a
                href="#"
                className="font-semibold transition-colors"
                style={{ color: 'rgba(167,139,250,0.8)' }}
                onMouseEnter={e => (e.target.style.color = '#A78BFA')}
                onMouseLeave={e => (e.target.style.color = 'rgba(167,139,250,0.8)')}
              >
                Apply for Community Head access
              </a>
            </p>
          </div>
        </div>

        {/* ─── Footer ─── */}
        <div
          className="px-8 py-4 flex items-center justify-center gap-5 flex-wrap"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}
        >
          {['Forgot Password', 'Contact Support', 'Privacy Policy'].map((link, i) => (
            <a
              key={link}
              href="#"
              className="text-[11px] font-medium transition-colors"
              style={{ color: 'rgba(255,255,255,0.25)' }}
              onMouseEnter={e => (e.target.style.color = 'rgba(167,139,250,0.7)')}
              onMouseLeave={e => (e.target.style.color = 'rgba(255,255,255,0.25)')}
            >
              {link}
            </a>
          ))}
        </div>
      </div>

      {/* ─── Bottom Brand Label ─── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <p className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.18)' }}>
          © 2025 MeriSamaj · Community Management Platform
        </p>
      </div>
    </div>
  );
};

export default HeadLoginPage;
