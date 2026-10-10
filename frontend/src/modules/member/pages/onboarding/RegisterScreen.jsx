import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, ArrowRight, Bell, Eye, EyeOff, Lock, Check, AlertCircle, Gift, CheckCircle2, Loader2
} from 'lucide-react';
import { useData } from '../../context/DataProvider';
import { useReferral } from '../referral/ReferralContext';
import { authService } from '../../../../core/auth/authService';
import { useAuth } from '../../../../core/auth/useAuth';
import {
  validateName,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validatePhone,
  validateAlphanumeric,
  validatePastedValue,
  getPasswordStrength,
} from '../../../../core/utils/validators';

// ─── SLIDE WRAPPER ────────────────────────────────────────────────────────────
const SlideIn = ({ children, dir = 'right' }) => {
  const [visible, setVisible] = useState(false);
  React.useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);
  const from = dir === 'right' ? 'translate-x-6' : '-translate-x-6';
  return (
    <div className={`transition-all duration-300 ease-out ${visible ? 'opacity-100 translate-x-0' : `opacity-0 ${from}`}`}>
      {children}
    </div>
  );
};

// Removed OtpBanner as per production refactor. SMS will be delivered directly to mobile.

const RegisterScreen = () => {
  const navigate = useNavigate();
  const { loginUser } = useData();
  const { register } = useAuth();
  const inputRefs = useRef([]);
  const [isLoading, setIsLoading] = useState(false);

  // States
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerOtp, setRegisterOtp] = useState(['', '', '', '', '', '']);
  const [isRegMobileVerified, setIsRegMobileVerified] = useState(false);
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegConfirmPass, setShowRegConfirmPass] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState({});

  // Password strength
  const passwordStrength = getPasswordStrength(registerPassword);

  // Referral State
  const { validateReferralCode } = useReferral();
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [referralStatus, setReferralStatus] = useState(null); // null, 'loading', 'success', 'error'
  const [referralMessage, setReferralMessage] = useState('');

  const [otpError, setOtpError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const isRegOtpComplete = registerOtp.every(d => d !== '');

  // "Resend OTP" becomes available 30s after each send (the server enforces the same)
  const [resendIn, setResendIn] = useState(0);
  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const handleRegisterSendOtp = async () => {
    const phoneResult = validatePhone(registerPhone);
    if (!phoneResult.valid) {
      setFieldErrors(prev => ({ ...prev, phone: phoneResult.error }));
      return;
    }
    setFieldErrors(prev => ({ ...prev, phone: '' }));
    setIsLoading(true);
    setOtpError('');
    try {
      const res = await authService.sendOtp({ phone: registerPhone, type: 'register' });
      setOtpSent(true);
      setRegisterOtp(['', '', '', '', '', '']);
      setResendIn(30);
      setToastMessage(res?.message || 'OTP sent successfully');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to send OTP.';
      setToastMessage(message);
      setTimeout(() => setToastMessage(''), 4000);
      if (otpSent) setOtpError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterVerifyOtp = async () => {
    const entered = registerOtp.join('');
    setIsLoading(true);
    setOtpError('');
    try {
      await authService.verifyOtp({ phone: registerPhone, otp: entered, type: 'register' });
      setIsRegMobileVerified(true);
      setToastMessage('Mobile number verified successfully!');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (error) {
      setOtpError(error?.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterNext = async () => {
    const errors = {};
    const nameResult = validateName(registerName);
    if (!nameResult.valid) errors.name = nameResult.error;
    const passResult = validatePassword(registerPassword);
    if (!passResult.valid) errors.password = passResult.error;
    const confirmResult = validateConfirmPassword(registerPassword, registerConfirmPassword);
    if (!confirmResult.valid) errors.confirmPassword = confirmResult.error;
    if (registerEmail && registerEmail.trim()) {
      const emailResult = validateEmail(registerEmail, false);
      if (!emailResult.valid) errors.email = emailResult.error;
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsLoading(true);
    try {
      await register({
        name: registerName.trim(),
        phone: registerPhone,
        email: registerEmail ? registerEmail.trim().toLowerCase() : undefined,
        password: registerPassword,
        referralCode: referralCodeInput || undefined,
      });
      localStorage.setItem('merisamaj_just_registered', 'true');
      localStorage.removeItem('merisamaj_onboarding_from_home');
      localStorage.setItem('merisamaj_register_phone', registerPhone);
      if (registerEmail) localStorage.setItem('merisamaj_register_email', registerEmail.trim().toLowerCase());
      setToastMessage('Registration successful! Launching profile setup.');
      setTimeout(() => {
        loginUser({ name: registerName, mobile: registerPhone, email: registerEmail, isVerified: true });
        navigate('/member/onboarding');
      }, 500);
    } catch (error) {
      localStorage.removeItem('merisamaj_just_registered');
      const apiErrors = error?.response?.data?.errors;
      const apiMessage = error?.response?.data?.message;
      if (apiErrors) {
        setFieldErrors(apiErrors);
        const firstKey = Object.keys(apiErrors)[0];
        const msg = apiErrors[firstKey] || 'Registration error. Please check inputs.';
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 4000);
      } else {
        setToastMessage(apiMessage || 'Registration error. Please try again.');
        setTimeout(() => setToastMessage(''), 4000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidateReferral = async () => {
    if (!referralCodeInput.trim()) return;
    const alphaResult = validateAlphanumeric(referralCodeInput);
    if (!alphaResult.valid) {
      setFieldErrors(prev => ({ ...prev, referral: alphaResult.error }));
      return;
    }
    setReferralStatus('loading');
    const result = await validateReferralCode(referralCodeInput);
    if (result.valid) {
      setReferralStatus('success');
      setReferralMessage(result.message);
    } else {
      setReferralStatus('error');
      setReferralMessage(result.message);
    }
  };

  const renderToast = () => toastMessage && (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#1e1145] text-white border border-purple-500/20 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-bounce font-sans text-xs font-bold select-none">
      <AlertCircle size={15} className="text-purple-300" />
      <span>{toastMessage}</span>
    </div>
  );

  return (
    <div className="h-screen bg-surface flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 aura-bg z-0 animate-aura-pulse" />
      {renderToast()}

      {/* Back navigation header */}
      <div className="p-4 shrink-0 z-10 flex items-center justify-between">
        <button 
          onClick={() => navigate('/member/login', { state: { skipLanguage: true } })} 
          className="w-9 h-9 rounded-xl bg-white/80 border border-purple-100/30 flex items-center justify-center text-text-primary hover:bg-purple-50 transition-colors press-scale"
        >
          <ArrowRight size={18} strokeWidth={2.5} className="rotate-180" />
        </button>
        <span className="text-xs font-bold text-brand-primary">Register</span>
      </div>

      <div className="flex-1 px-6 pt-2 pb-6 overflow-y-auto z-10 max-w-sm mx-auto w-full">
        {/* Tab Switcher */}
        <div className="flex bg-purple-100/40 border border-purple-200/30 p-1.5 rounded-2xl mt-2 mb-6 shadow-inner">
          <button 
            onClick={() => navigate('/member/login', { state: { skipLanguage: true } })} 
            className="flex-1 py-2.5 text-xs font-black rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/20 transition-all"
          >
            Login
          </button>
          <button 
            className="flex-1 py-2.5 text-xs font-black rounded-xl bg-[#7C3AED] text-white shadow-md"
          >
            Register
          </button>
        </div>

        {/* ─── REGISTRATION FLOW ─── */}
        <div className="space-y-4 animate-fade-in text-left">
          {/* Step 1: Mobile verification */}
          <div className="p-4 bg-white/95 rounded-[22px] border border-purple-100/30 shadow-xs space-y-4">
            <p className="text-[10px] text-brand-primary font-black uppercase tracking-wider">Registration Step 1: Mobile Verification</p>
            
            <div>
              <label htmlFor="register-phone" className="text-[11px] font-bold text-slate-400 uppercase">Mobile Number</label>
              <div className={`flex items-center gap-2.5 mt-1 bg-slate-50 border rounded-xl px-3 py-2 ${fieldErrors.phone ? 'border-red-400' : 'border-slate-200'}`}>
                <span className="text-xs text-slate-500 font-black">+91</span>
                <input 
                  id="register-phone"
                  type="tel" 
                  maxLength={10} 
                  autoComplete="tel"
                  placeholder="Mobile Number" 
                  value={registerPhone} 
                  onChange={(e) => { setRegisterPhone(e.target.value.replace(/\D/g, '')); setFieldErrors(prev => ({ ...prev, phone: '' })); }} 
                  disabled={isRegMobileVerified}
                  aria-invalid={!!fieldErrors.phone}
                  aria-describedby="register-phone-error"
                  className="flex-1 text-xs text-slate-800 outline-none bg-transparent placeholder-slate-400 font-semibold" 
                />
                {!isRegMobileVerified && (
                  <button 
                    type="button" 
                    onClick={handleRegisterSendOtp}
                    disabled={isLoading || registerPhone.length !== 10}
                    className="bg-[#7C3AED] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg press-scale disabled:opacity-45 shrink-0 flex items-center justify-center min-w-[70px]"
                  >
                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'Send OTP'}
                  </button>
                )}
              </div>
              {fieldErrors.phone && <p id="register-phone-error" role="alert" className="text-[10px] text-red-500 font-semibold mt-1 ml-1">{fieldErrors.phone}</p>}
            </div>

            {!isRegMobileVerified && otpSent && (
              <div className="animate-fade-in space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Enter OTP</label>
                <div className="flex gap-1.5 justify-center">
                  {registerOtp.map((digit, i) => (
                    <input
                      key={i}
                      id={`reg-otp-${i}`}
                      ref={el => inputRefs.current[i] = el}
                      type="tel"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const newOtp = [...registerOtp];
                        newOtp[i] = e.target.value.replace(/\D/g, '');
                        setRegisterOtp(newOtp);
                        if (e.target.value && i < 5) inputRefs.current[i + 1]?.focus();
                      }}
                      className="w-10 h-12 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-bold text-slate-800 outline-none"
                    />
                  ))}
                </div>
                {otpError && <p className="text-[10px] text-red-500 font-semibold text-center mt-1">{otpError}</p>}
                <button 
                  type="button" 
                  onClick={handleRegisterVerifyOtp}
                  disabled={isLoading || !isRegOtpComplete}
                  className="w-full py-2 bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-bold rounded-xl press-scale disabled:opacity-45 mt-2 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'Verify OTP'}
                </button>
                <div className="text-center pt-1">
                  {resendIn > 0 ? (
                    <p className="text-[10px] text-slate-400 font-semibold">Resend OTP in {resendIn}s</p>
                  ) : (
                    <button type="button" onClick={handleRegisterSendOtp} disabled={isLoading} className="text-[10px] font-bold text-[#7C3AED] hover:underline disabled:opacity-50">
                      Didn't get the code? Resend OTP
                    </button>
                  )}
                </div>
              </div>
            )}

            {isRegMobileVerified && (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl p-3 flex items-center gap-2 text-xs font-bold">
                <Check size={16} strokeWidth={3} className="text-emerald-600 animate-scale-up" />
                Mobile Number Verified Successfully
              </div>
            )}
          </div>

          {/* Step 2: Account credentials */}
          <div className={`p-4 bg-white/95 rounded-[22px] border border-purple-100/30 shadow-xs space-y-4 transition-all duration-300 ${!isRegMobileVerified ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            <p className="text-[10px] text-brand-primary font-black uppercase tracking-wider">Registration Step 2: Account Credentials</p>

            {/* Full Name */}
            <div>
              <label htmlFor="register-name" className="text-[11px] font-bold text-slate-400 uppercase">Full Name</label>
              <input
                id="register-name"
                type="text"
                autoComplete="name"
                placeholder="Enter full name"
                value={registerName}
                onChange={(e) => { setRegisterName(e.target.value); setFieldErrors(prev => ({ ...prev, name: '' })); }}
                onKeyPress={(e) => { if (!/[a-zA-Z\u0900-\u097F ]/.test(e.key)) e.preventDefault(); }}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text');
                  const res = validatePastedValue(pasted, 'name');
                  if (!res.valid) { e.preventDefault(); setFieldErrors(prev => ({ ...prev, name: res.error })); }
                }}
                onBlur={() => { const r = validateName(registerName); if (!r.valid) setFieldErrors(prev => ({ ...prev, name: r.error })); }}
                aria-invalid={!!fieldErrors.name}
                aria-describedby="register-name-error"
                className={`w-full mt-1 bg-slate-50 border rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none ${fieldErrors.name ? 'border-red-400' : 'border-slate-200'}`}
              />
              {fieldErrors.name && <p id="register-name-error" role="alert" className="text-[10px] text-red-500 font-semibold mt-1 ml-1">{fieldErrors.name}</p>}
            </div>

            {/* Email (Optional) */}
            <div>
              <label htmlFor="register-email" className="text-[11px] font-bold text-slate-400 uppercase">Email Address <span className="normal-case text-slate-300">(Optional)</span></label>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                placeholder="Enter email address"
                value={registerEmail}
                onChange={(e) => { setRegisterEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: '' })); }}
                onBlur={() => { if (registerEmail.trim()) { const r = validateEmail(registerEmail); if (!r.valid) setFieldErrors(prev => ({ ...prev, email: r.error })); } }}
                aria-invalid={!!fieldErrors.email}
                aria-describedby="register-email-error"
                className={`w-full mt-1 bg-slate-50 border rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none ${fieldErrors.email ? 'border-red-400' : 'border-slate-200'}`}
              />
              {fieldErrors.email && <p id="register-email-error" role="alert" className="text-[10px] text-red-500 font-semibold mt-1 ml-1">{fieldErrors.email}</p>}
            </div>

            {/* Password with strength indicator */}
            <div>
              <label htmlFor="register-password" className="text-[11px] font-bold text-slate-400 uppercase">Password</label>
              <div className={`flex items-center mt-1 bg-slate-50 border rounded-xl px-3 py-2.5 ${fieldErrors.password ? 'border-red-400' : 'border-slate-200'}`}>
                <input
                  id="register-password"
                  type={showRegPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Create password (min 6 characters)"
                  value={registerPassword}
                  onChange={(e) => { setRegisterPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: '' })); }}
                  onBlur={() => { const r = validatePassword(registerPassword); if (!r.valid) setFieldErrors(prev => ({ ...prev, password: r.error })); }}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby="register-password-error"
                  className="flex-1 text-xs font-semibold text-slate-800 outline-none bg-transparent"
                />
                <button type="button" onClick={() => setShowRegPass(!showRegPass)} className="text-slate-400 hover:text-slate-650 shrink-0 ml-1" aria-label={showRegPass ? 'Hide password' : 'Show password'}>
                  {showRegPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Password Strength Indicator */}
              {registerPassword && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {['weak', 'medium', 'strong'].map((level, idx) => (
                      <div key={level} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        (passwordStrength === 'weak' && idx === 0) ? 'bg-red-400' :
                        (passwordStrength === 'medium' && idx <= 1) ? 'bg-amber-400' :
                        (passwordStrength === 'strong') ? 'bg-emerald-500' : 'bg-slate-200'
                      }`} />
                    ))}
                  </div>
                  <span className={`text-[9px] font-black uppercase shrink-0 ${passwordStrength === 'strong' ? 'text-emerald-600' : passwordStrength === 'medium' ? 'text-amber-500' : 'text-red-500'}`}>
                    {passwordStrength}
                  </span>
                </div>
              )}
              {fieldErrors.password && <p id="register-password-error" role="alert" className="text-[10px] text-red-500 font-semibold mt-1 ml-1">{fieldErrors.password}</p>}
            </div>

            {/* Confirm Password with match indicator */}
            <div>
              <label htmlFor="register-confirm-password" className="text-[11px] font-bold text-slate-400 uppercase">Confirm Password</label>
              <div className={`flex items-center mt-1 bg-slate-50 border rounded-xl px-3 py-2.5 ${fieldErrors.confirmPassword ? 'border-red-400' : 'border-slate-200'}`}>
                <input
                  id="register-confirm-password"
                  type={showRegConfirmPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={registerConfirmPassword}
                  onChange={(e) => { setRegisterConfirmPassword(e.target.value); setFieldErrors(prev => ({ ...prev, confirmPassword: '' })); }}
                  onBlur={() => { const r = validateConfirmPassword(registerPassword, registerConfirmPassword); if (!r.valid) setFieldErrors(prev => ({ ...prev, confirmPassword: r.error })); }}
                  aria-invalid={!!fieldErrors.confirmPassword}
                  aria-describedby="register-confirm-error"
                  className="flex-1 text-xs font-semibold text-slate-800 outline-none bg-transparent"
                />
                {/* Real-time match indicator */}
                {registerConfirmPassword && (
                  <span className="shrink-0 ml-1">
                    {registerPassword === registerConfirmPassword
                      ? <Check size={14} className="text-emerald-500" />
                      : <AlertCircle size={14} className="text-red-400" />}
                  </span>
                )}
                <button type="button" onClick={() => setShowRegConfirmPass(!showRegConfirmPass)} className="text-slate-400 hover:text-slate-650 shrink-0 ml-1" aria-label={showRegConfirmPass ? 'Hide password' : 'Show password'}>
                  {showRegConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && <p id="register-confirm-error" role="alert" className="text-[10px] text-red-500 font-semibold mt-1 ml-1">{fieldErrors.confirmPassword}</p>}
            </div>

            {/* Referral Code (Optional) */}
            <div className="pt-2 border-t border-purple-100/50 mt-4">
              <label className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-2">
                <Gift size={14} className="text-brand-primary" /> Have a Referral Code? <span className="text-slate-300 normal-case">(Optional)</span>
              </label>
              
              {!referralStatus || referralStatus === 'error' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      placeholder="Enter Referral Code" 
                      value={referralCodeInput}
                      onChange={(e) => {
                        setReferralCodeInput(e.target.value.toUpperCase());
                        setReferralStatus(null);
                        setReferralMessage('');
                      }}
                      className={`flex-1 bg-slate-50 border ${referralStatus === 'error' ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-brand-primary'} rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none uppercase tracking-wider`}
                    />
                    <button 
                      type="button"
                      onClick={handleValidateReferral}
                      disabled={!referralCodeInput || referralStatus === 'loading'}
                      className="bg-brand-primary text-white text-[11px] font-bold px-4 py-2.5 rounded-xl disabled:opacity-50 active:scale-95 transition-all w-[80px] flex justify-center"
                    >
                      {referralStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> : 'Apply'}
                    </button>
                  </div>
                  {referralStatus === 'error' && (
                    <p className="text-[10px] text-red-500 font-bold ml-1">{referralMessage}</p>
                  )}
                </div>
              ) : (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100/60 rounded-xl p-3 flex items-start gap-3 animate-fade-in shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm border border-emerald-200/50">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-black text-emerald-800">{referralMessage}</h4>
                    <p className="text-[10px] font-bold text-emerald-600/80 mt-0.5">Code Applied: {referralCodeInput}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={handleRegisterNext}
            disabled={isLoading || !isRegMobileVerified || !registerName || !registerPassword || !registerConfirmPassword}
            className={`w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 press-scale shadow-md transition-all ${
              (isRegMobileVerified && registerName && registerPassword && registerConfirmPassword) && !isLoading
                ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white cursor-pointer shadow-purple-500/20' 
                : 'bg-purple-200/40 text-purple-400/60 cursor-not-allowed shadow-none'
            }`}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Register & Continue'} 
            {!isLoading && <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterScreen;
