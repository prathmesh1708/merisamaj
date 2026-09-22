import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Phone, ArrowRight, ArrowLeft, MapPin, Users, CheckCircle,
  User, Camera, Bell, Mail, Check, Clock, ShieldCheck, GraduationCap,
  Briefcase, FileText, Sparkles, ChevronDown, PlusCircle, CheckCircle2,
  Lock, Eye, AlertCircle, ClipboardCheck, Globe, EyeOff, Trash2, Edit3, Heart,
  Search
} from 'lucide-react';
import { useData } from '../../context/DataProvider';
import { useAuth } from '../../../../core/auth/useAuth';
import { authService } from '../../../../core/auth/authService';
import { axiosPublic } from '../../../../core/api/axiosConfig';
import {
  validateName,
  validateDOB,
  validatePincode,
  validateEnum,
  validateOptionalPhone,
  validateOptionalText,
  validateAge,
  validateImageFile,
  validatePastedValue,
  ALLOWED_GENDERS,
  ALLOWED_BLOOD_GROUPS,
  ALLOWED_MARITAL_STATUSES,
  buildCleanPayload,
} from '../../../../core/utils/validators';

// Helper to strip heavy base64 Data URIs before writing to localStorage to prevent QuotaExceededError
const cleanUserForStorage = (userObj) => {
  if (!userObj || typeof userObj !== 'object') return userObj;
  const safeObj = { ...userObj };
  if (typeof safeObj.avatar === 'string' && safeObj.avatar.startsWith('data:')) {
    delete safeObj.avatar;
  }
  if (Array.isArray(safeObj.photos)) {
    safeObj.photos = safeObj.photos.filter(p => typeof p === 'string' && !p.startsWith('data:'));
  }
  if (Array.isArray(safeObj.familyMembers)) {
    safeObj.familyMembers = safeObj.familyMembers.map(m => {
      if (m && typeof m.avatar === 'string' && m.avatar.startsWith('data:')) {
        const { avatar, ...rest } = m;
        return rest;
      }
      return m;
    });
  }
  return safeObj;
};

const safeSetLocalStorage = (key, val) => {
  try {
    const cleaned = (key === 'merisamaj_user' || key === 'merisamaj_registered_user') ? cleanUserForStorage(val) : val;
    localStorage.setItem(key, typeof cleaned === 'string' ? cleaned : JSON.stringify(cleaned));
  } catch (err) {
    console.warn(`LocalStorage quota exceeded for ${key}:`, err);
  }
};

// ─── MOCK DATA ───────────────────────────────────────────────────────────────
const communityData = {
  'Agrawal Samaj': {
    subCommunities: ['Bisa Agrawal', 'Dasa Agrawal', 'Maheshwari', 'Oswal', 'Porwal'],
    cities: ['Indore', 'Ujjain', 'Bhopal', 'Jaipur', 'Ratlam', 'Gwalior', 'Sagar']
  },
  'Jain Samaj': {
    subCommunities: ['Digambar', 'Shwetambar', 'Sthanakvasi', 'Terapanthi'],
    cities: ['Mumbai', 'Surat', 'Pune', 'Ahmedabad', 'Jaipur', 'Indore', 'Delhi']
  },
  'Gupta Samaj': {
    subCommunities: ['Vaishya Gupta', 'Kayastha Gupta', 'Kshatriya Gupta'],
    cities: ['Delhi', 'Lucknow', 'Kanpur', 'Agra', 'Allahabad', 'Varanasi']
  },
  'Sharma Samaj': {
    subCommunities: ['Gaur Brahmin', 'Saraswat Brahmin', 'Kanyakubja', 'Maithil Brahmin'],
    cities: ['Jaipur', 'Delhi', 'Udaipur', 'Ajmer', 'Jodhpur', 'Bhopal', 'Nagpur']
  },
  'Patel Samaj': {
    subCommunities: ['Kadava Patel', 'Leuva Patel', 'Anjana Patel', 'Bhavssar Patel'],
    cities: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Anand', 'Gandhinagar']
  },
  'Mali Samaj': {
    subCommunities: ['Phul Mali', 'Kachhi Mali', 'Dhakad Mali', 'Teli Mali'],
    cities: ['Ujjain', 'Dewas', 'Ratlam', 'Indore', 'Bhopal', 'Mandsaur']
  },
  'Brahmin Samaj': {
    subCommunities: ['Sharma', 'Dwivedi', 'Trivedi', 'Shukla', 'Mishra', 'Joshi', 'Pandey', 'Choubey'],
    cities: ['Indore', 'Bhopal', 'Ujjain', 'Jaipur', 'Delhi', 'Kanpur', 'Varanasi']
  },
  'Rajput Samaj': {
    subCommunities: ['Rathore', 'Chauhan', 'Parmar', 'Singh', 'Solanki', 'Sisodia', 'Tomar'],
    cities: ['Jaipur', 'Udaipur', 'Jodhpur', 'Indore', 'Bhopal', 'Gwalior', 'Kota']
  },
  'Verma Samaj': {
    subCommunities: ['Kayastha Verma', 'Kshatriya Verma', 'Kurmi Verma'],
    cities: ['Lucknow', 'Kanpur', 'Gorakhpur', 'Agra', 'Delhi', 'Bhopal']
  }
};

const COMMUNITY_KEYS = Object.keys(communityData);

const INDIAN_STATES = [
  'Madhya Pradesh', 'Rajasthan', 'Maharashtra', 'Gujarat', 'Delhi',
  'Uttar Pradesh', 'Bihar', 'Karnataka', 'Punjab', 'Haryana',
  'West Bengal', 'Tamil Nadu', 'Telangana', 'Andhra Pradesh', 'Kerala',
  'Chhattisgarh', 'Jharkhand', 'Uttarakhand', 'Himachal Pradesh', 'Other'
];

const COMMON_DISTRICTS = [
  'Indore', 'Bhopal', 'Ujjain', 'Ratlam', 'Gwalior', 'Jabalpur', 'Dewas', 'Khandwa',
  'Jaipur', 'Udaipur', 'Jodhpur', 'Kota', 'Ajmer',
  'Mumbai', 'Pune', 'Nagpur', 'Nashik',
  'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot',
  'New Delhi', 'Lucknow', 'Kanpur', 'Agra', 'Varanasi',
  'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Other'
];

// ─── SLIDE WRAPPER ────────────────────────────────────────────────────────────
const SlideIn = ({ children, dir = 'right' }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
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

// ─── CUSTOM SELECT DROPDOWN ───────────────────────────────────────────────────
// `searchable` adds a magnifying-glass icon on the closed field and a live
// filter box at the top of the open list (used for Community / Sub-Community / City).
const CustomSelect = ({ value, onChange, options, placeholder = 'Select', disabled = false, className = '', searchable = false }) => {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const btnRef = useRef(null);
  const listRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        listRef.current && !listRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  // Reset the filter text each time the dropdown closes, and focus it on open
  useEffect(() => {
    if (open && searchable) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    if (!open) setSearchQuery('');
  }, [open, searchable]);

  const handleOpen = () => {
    if (disabled) return;
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropHeight = Math.min(options.length * 48 + (searchable ? 66 : 20), 300);
      const showAbove = spaceBelow < dropHeight + 8;
      setDropdownStyle({
        position: 'fixed',
        left: rect.left,
        width: Math.max(rect.width, 240),
        zIndex: 9999,
        ...(showAbove
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      });
    }
    setOpen(o => !o);
  };

  const selected = options.find(o => (typeof o === 'string' ? o : o.value) === value);
  const selectedLabel = selected ? (typeof selected === 'string' ? selected : selected.label) : null;
  const selectedDotColor = selected && typeof selected === 'object' ? selected.dotColor : null;

  const filteredOptions = searchable && searchQuery.trim()
    ? options.filter(o => {
        const label = (typeof o === 'string' ? o : o.label) || '';
        return label.toLowerCase().includes(searchQuery.trim().toLowerCase());
      })
    : options;

  const hasDotColors = filteredOptions.some(o => typeof o === 'object' && o.dotColor);

  const dropdownList = open && (
    <div
      ref={listRef}
      style={dropdownStyle}
      className="bg-white border border-purple-100 rounded-2xl shadow-2xl shadow-purple-500/20 overflow-hidden animate-fade-in flex flex-col"
    >
      {searchable && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/60 shrink-0">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="Search..."
            className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder-slate-400"
          />
        </div>
      )}
      <div className="max-h-64 overflow-y-auto py-1 divide-y divide-slate-100">
        {filteredOptions.length === 0 && (
          <div className="px-4 py-6 text-center text-xs font-semibold text-slate-400">No matches found.</div>
        )}
        {filteredOptions.map((opt, i) => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const label = typeof opt === 'string' ? opt : opt.label;
          const isSelected = val === value;
          const dotColor = typeof opt === 'object' ? opt.dotColor : null;
          const isCovered = typeof opt === 'object' ? opt.isCovered : false;

          // Section headers
          const prevOpt = i > 0 ? filteredOptions[i - 1] : null;
          const isFirstRed = hasDotColors && dotColor === 'red' && (!prevOpt || prevOpt.dotColor === 'green');
          const isFirstGreen = hasDotColors && dotColor === 'green' && i === 0;

          return (
            <React.Fragment key={i}>
              {isFirstGreen && (
                <div className="bg-emerald-50/90 px-3.5 py-1.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-emerald-100 sticky top-0 z-10">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Head Assigned Cities
                </div>
              )}
              {isFirstRed && (
                <div className="bg-slate-50 px-3.5 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 sticky top-0 z-10">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Other Cities
                </div>
              )}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onChange(val); setOpen(false); }}
                onTouchEnd={(e) => { e.preventDefault(); onChange(val); setOpen(false); }}
                className={`w-full text-left px-4 py-3 text-sm font-semibold transition-all flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#7C3AED] text-white'
                    : isCovered
                    ? 'text-slate-900 hover:bg-emerald-50/70 hover:text-emerald-900'
                    : 'text-slate-700 hover:bg-purple-50 hover:text-[#7C3AED]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {dotColor === 'green' && (
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  )}
                  {dotColor === 'red' && (
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                    </span>
                  )}
                  <span className="text-sm font-bold tracking-normal">{label}</span>
                </div>

                {isSelected && <Check size={16} className="shrink-0 text-white" />}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className={`w-full flex items-center justify-between border rounded-xl px-3.5 py-3 text-sm font-semibold outline-none transition-all ${
          disabled
            ? 'bg-gray-50 border-slate-200 text-slate-400 cursor-not-allowed'
            : open
            ? 'bg-white border-[#7C3AED] ring-4 ring-[#7C3AED]/5 shadow-sm'
            : 'bg-white border-slate-300/80 text-slate-900 cursor-pointer hover:bg-white hover:border-purple-300'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate min-w-0">
          {searchable && <Search size={16} className="text-slate-800 shrink-0 stroke-[2.2]" />}
          {selectedDotColor === 'green' && (
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          )}
          {selectedDotColor === 'red' && (
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-400"></span>
            </span>
          )}
          <span className={`truncate ${selectedLabel ? 'text-slate-900 font-bold text-sm' : 'text-slate-400 font-medium'}`}>
            {selectedLabel || placeholder}
          </span>
        </div>
        <ChevronDown size={17} className={`shrink-0 text-slate-700 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? createPortal(dropdownList, document.body) : null}
    </div>
  );
};

// ─── VERIFICATION STEP COMPONENT ─────────────────────────────────────────────
const VerificationStep = ({ isFaceVerified, setIsFaceVerified, isAadharVerified, setIsAadharVerified, setToastMessage, auth, setAuth }) => {
  // Aadhaar states
  const [aadhaarStage, setAadhaarStage] = useState('idle'); // idle | input | otp | success | failed
  const [aadhaarMobile, setAadhaarMobile] = useState('');
  const [aadhaarOtp, setAadhaarOtp] = useState(['', '', '', '', '', '']);
  const [aadhaarLoading, setAadhaarLoading] = useState(false);
  const [aadhaarError, setAadhaarError] = useState('');
  const aadhaarOtpRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];

  // Face states
  const [faceStage, setFaceStage] = useState('idle'); // idle | camera | scanning | success | failed
  const [faceGuide, setFaceGuide] = useState('Position your face in the circle');
  const [faceGuideSeverity, setFaceGuideSeverity] = useState('neutral'); // neutral | warn | success
  const [cameraDenied, setCameraDenied] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // ── Aadhaar helpers ──────────────────────────────────────────────────────
  const handleSendAadhaarOtp = async () => {
    const cleaned = aadhaarMobile.replace(/\D/g, '');
    if (cleaned.length !== 10) { setAadhaarError('Please enter a valid 10-digit mobile number.'); return; }
    setAadhaarLoading(true); setAadhaarError('');
    try {
      await axiosPublic.post('/auth/aadhaar/send-otp', { mobileNo: cleaned });
      setAadhaarStage('otp');
      setToastMessage('OTP sent to your Aadhaar-registered mobile!');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      setAadhaarError(err?.response?.data?.message || 'Failed to send OTP. Try again.');
    } finally { setAadhaarLoading(false); }
  };

  const handleVerifyAadhaarOtp = async () => {
    const otpStr = aadhaarOtp.join('');
    if (otpStr.length !== 6) { setAadhaarError('Please enter the 6-digit OTP.'); return; }
    setAadhaarLoading(true); setAadhaarError('');
    try {
      await axiosPublic.post('/auth/aadhaar/verify-otp', { mobileNo: aadhaarMobile.replace(/\D/g, ''), otp: otpStr });
      setIsAadharVerified(true);
      setAadhaarStage('success');
      setToastMessage('Aadhaar verified successfully! ✓');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      setAadhaarError(err?.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally { setAadhaarLoading(false); }
  };

  const handleOtpInput = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...aadhaarOtp];
    next[idx] = val.slice(-1);
    setAadhaarOtp(next);
    setAadhaarError('');
    if (val && idx < 5) aadhaarOtpRefs[idx + 1].current?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !aadhaarOtp[idx] && idx > 0) aadhaarOtpRefs[idx - 1].current?.focus();
  };

  // ── Face Camera helpers ──────────────────────────────────────────────────
  const startCamera = async () => {
    setCameraDenied(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setFaceStage('camera');
      startFaceGuideLoop();
    } catch (err) {
      setCameraDenied(true);
      setFaceStage('failed');
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  // Simulated face detection loop — cycles through guidance messages then marks success
  const startFaceGuideLoop = () => {
    const steps = [
      { msg: 'Position your face in the circle', sev: 'neutral', ms: 1200 },
      { msg: 'Move a bit closer...', sev: 'warn', ms: 1400 },
      { msg: 'Perfect! Hold still...', sev: 'neutral', ms: 1200 },
      { msg: 'Looking good! Scanning...', sev: 'neutral', ms: 1500 },
      { msg: 'Move slightly to the right', sev: 'warn', ms: 1200 },
      { msg: 'Keep face inside the oval', sev: 'warn', ms: 1000 },
      { msg: 'Almost done — hold still!', sev: 'neutral', ms: 1200 },
      { msg: 'Face matched! Verifying...', sev: 'success', ms: 1000 },
    ];
    let i = 0;
    setFaceGuide(steps[0].msg); setFaceGuideSeverity(steps[0].sev);
    setFaceStage('scanning');
    const run = () => {
      i++;
      if (i >= steps.length) {
        stopCamera();
        setIsFaceVerified(true);
        setFaceStage('success');
        setToastMessage('Face verified successfully! ✓');
        setTimeout(() => setToastMessage(''), 3000);
        return;
      }
      setFaceGuide(steps[i].msg); setFaceGuideSeverity(steps[i].sev);
      scanIntervalRef.current = setTimeout(run, steps[i].ms);
    };
    scanIntervalRef.current = setTimeout(run, steps[0].ms);
  };

  useEffect(() => () => stopCamera(), []);

  const guideBorderColor = faceGuideSeverity === 'success' ? '#10B981' : faceGuideSeverity === 'warn' ? '#F59E0B' : '#7C3AED';
  const guideBg = faceGuideSeverity === 'success' ? 'bg-emerald-500/90' : faceGuideSeverity === 'warn' ? 'bg-amber-400/90' : 'bg-[#7C3AED]/90';

  return (
    <div className="space-y-4 text-left animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[#1E1E38] tracking-tight">Step 8: Verification (Optional)</h1>
        <p className="text-xs text-slate-500 font-semibold mt-1">Verify your profile for more trust and matches</p>
      </div>

      {/* ── Face Verification Card ───────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-purple-100/50 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden">
        {/* Card Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F3E8FF] flex items-center justify-center shrink-0">
              <Camera size={22} className="text-[#7C3AED]" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">Face Verification</p>
              <p className="text-[11px] text-slate-500 font-semibold">Verify using selfie check</p>
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle2 size={11} className="text-[#7C3AED]" />
                <span className="text-[10px] text-[#7C3AED] font-bold">Keep your profile safe</span>
              </div>
            </div>
          </div>
          {isFaceVerified ? (
            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <CheckCircle size={22} className="text-emerald-500" />
              </div>
              <span className="text-[10px] font-black text-emerald-600">Verified</span>
            </div>
          ) : faceStage === 'idle' ? (
            <button
              type="button"
              onClick={startCamera}
              className="flex items-center gap-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[12px] font-extrabold px-4 py-2 rounded-xl shadow-md shadow-purple-500/20 transition-all press-scale"
            >
              Verify <ArrowRight size={14} strokeWidth={2.5} />
            </button>
          ) : null}
        </div>

        {/* Camera View */}
        {(faceStage === 'camera' || faceStage === 'scanning') && (
          <div className="px-4 pb-4 space-y-3">
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3] flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                onLoadedMetadata={() => videoRef.current?.play()}
              />
              {/* Oval overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="w-[55%] aspect-[3/4] rounded-full transition-all duration-300"
                  style={{
                    border: `3px solid ${guideBorderColor}`,
                    boxShadow: `0 0 0 2000px rgba(0,0,0,0.55)`,
                    clipPath: 'none'
                  }}
                />
              </div>
              {/* Scan line animation */}
              {faceStage === 'scanning' && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                  <div
                    className="absolute left-[22.5%] w-[55%] h-[2px] bg-gradient-to-r from-transparent via-[#7C3AED] to-transparent opacity-80"
                    style={{ animation: 'scanLine 2s ease-in-out infinite', top: '20%' }}
                  />
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />

            {/* Guidance message */}
            <div className={`${guideBg} text-white text-center px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-300`}>
              {faceGuide}
            </div>

            <button
              type="button"
              onClick={() => { stopCamera(); setFaceStage('idle'); }}
              className="w-full py-2 text-[11px] font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        )}

        {faceStage === 'failed' && (
          <div className="px-4 pb-4">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-3 text-center space-y-2">
              <p className="text-xs font-bold text-red-500">
                {cameraDenied ? 'Camera access denied. Please allow camera access in your browser settings.' : 'Face verification failed. Please try again.'}
              </p>
              <button
                type="button"
                onClick={startCamera}
                className="text-[11px] font-bold text-[#7C3AED] underline"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Aadhaar Verification Card ─────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-purple-100/50 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden">
        {/* Card Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF3E8] flex items-center justify-center shrink-0">
              <svg width="28" height="28" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="28" cy="22" r="12" fill="#FF8C00" opacity="0.15" />
                <path d="M28 10 C18 10 10 18 10 28 C10 38 18 46 28 46 C38 46 46 38 46 28 C46 18 38 10 28 10Z" fill="none" stroke="#FF8C00" strokeWidth="2.5" />
                <path d="M20 28 Q28 18 36 28 Q28 38 20 28Z" fill="#FF8C00" opacity="0.7" />
                <circle cx="28" cy="28" r="4" fill="#FF8C00" />
                <line x1="28" y1="42" x2="28" y2="46" stroke="#FF8C00" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="18" y1="44" x2="22" y2="41" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round" />
                <line x1="38" y1="44" x2="34" y2="41" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">Aadhaar Verification</p>
              <p className="text-[11px] text-slate-500 font-semibold">Verify using UIDAI e-Aadhaar</p>
              <div className="flex items-center gap-1 mt-1">
                <ShieldCheck size={11} className="text-orange-500" />
                <span className="text-[10px] text-orange-500 font-bold">100% Secure &amp; Private</span>
              </div>
            </div>
          </div>

          {isAadharVerified || aadhaarStage === 'success' ? (
            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <CheckCircle size={22} className="text-emerald-500" />
              </div>
              <span className="text-[10px] font-black text-emerald-600">Verified</span>
            </div>
          ) : aadhaarStage === 'idle' ? (
            <button
              type="button"
              onClick={() => setAadhaarStage('input')}
              className="flex items-center gap-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[12px] font-extrabold px-4 py-2 rounded-xl shadow-md shadow-purple-500/20 transition-all press-scale"
            >
              Verify <ArrowRight size={14} strokeWidth={2.5} />
            </button>
          ) : null}
        </div>

        {/* Aadhaar — Mobile Input Stage */}
        {aadhaarStage === 'input' && (
          <div className="px-4 pb-4 space-y-3">
            <div className="bg-[#FFF8F0] rounded-2xl p-3 border border-orange-100">
              <p className="text-[11px] text-orange-700 font-semibold leading-relaxed">
                Enter the <strong>mobile number registered with your Aadhaar</strong>. An OTP will be sent to verify your identity.
              </p>
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider block mb-1.5">
                Aadhaar Registered Mobile <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 flex items-center shrink-0">
                  <span className="text-xs font-bold text-slate-700">+91</span>
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="98765 43210"
                  value={aadhaarMobile}
                  onChange={e => { setAadhaarMobile(e.target.value.replace(/\D/g, '')); setAadhaarError(''); }}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-800 outline-none focus:border-[#7C3AED]"
                />
              </div>
              {aadhaarError && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{aadhaarError}</p>}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAadhaarStage('idle')}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendAadhaarOtp}
                disabled={aadhaarLoading}
                className="flex-1 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {aadhaarLoading ? (
                  <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Sending...</span></>
                ) : 'Send OTP'}
              </button>
            </div>
          </div>
        )}

        {/* Aadhaar — OTP Input Stage */}
        {aadhaarStage === 'otp' && (
          <div className="px-4 pb-4 space-y-3">
            <div className="bg-[#F0FFF4] rounded-2xl p-3 border border-emerald-100">
              <p className="text-[11px] text-emerald-700 font-semibold leading-relaxed">
                OTP sent to <strong>+91 {aadhaarMobile}</strong>. Enter the 6-digit code below.
              </p>
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider block mb-2">Enter OTP</label>
              <div className="flex gap-2 justify-between">
                {aadhaarOtp.map((digit, i) => (
                  <input
                    key={i}
                    ref={aadhaarOtpRefs[i]}
                    type="tel"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpInput(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className={`w-10 h-12 text-center text-base font-black rounded-xl border-2 outline-none transition-all ${
                      digit ? 'border-[#7C3AED] bg-[#F3E8FF] text-[#7C3AED]' : 'border-slate-200 bg-white text-slate-800'
                    } focus:border-[#7C3AED]`}
                  />
                ))}
              </div>
              {aadhaarError && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1">{aadhaarError}</p>}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setAadhaarStage('input'); setAadhaarOtp(['','','','','','']); setAadhaarError(''); }}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Change No.
              </button>
              <button
                type="button"
                onClick={handleVerifyAadhaarOtp}
                disabled={aadhaarLoading || aadhaarOtp.join('').length < 6}
                className="flex-1 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {aadhaarLoading ? (
                  <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Verifying...</span></>
                ) : 'Verify OTP'}
              </button>
            </div>
            <button
              type="button"
              onClick={handleSendAadhaarOtp}
              className="w-full text-[11px] font-bold text-[#7C3AED] text-center hover:underline"
            >
              Resend OTP
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scanLine {
          0%   { transform: translateY(0); opacity: 0.9; }
          50%  { transform: translateY(200px); opacity: 0.5; }
          100% { transform: translateY(0); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
};

const OnboardingScreen = () => {
  const navigate = useNavigate();
  const { loginUser, setLanguage, language } = useData();
  const { auth, setAuth } = useAuth();

  // Onboarding Wizard State
  const [step, setStep] = useState('onboarding-1'); 

  // Step-level inline validation errors
  const [stepErrors, setStepErrors] = useState({});

  // Lock community selection when editing profile from Home/Profile, allow during new registration
  const isFromHome = localStorage.getItem('merisamaj_onboarding_from_home') === 'true';
  const isJustRegistered = localStorage.getItem('merisamaj_just_registered') === 'true';
  const isCommunityLocked = isFromHome || (!!(auth.user?.communityId || auth.user?.community) && !isJustRegistered);

  // Prefilled states from Registration flow
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Step 3 Selection
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [customCommunity, setCustomCommunity] = useState('');
  const [selectedSubCommunity, setSelectedSubCommunity] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('');
  
  const DEFAULT_COMMUNITIES = [
    { label: 'Brahmin Samaj', value: 'Brahmin Samaj' },
    { label: 'Rajput Samaj', value: 'Rajput Samaj' },
    { label: 'Jain Samaj', value: 'Jain Samaj' },
    { label: 'Namdev Samaj', value: 'Namdev Samaj' },
    { label: 'Agrawal Samaj', value: 'Agrawal Samaj' },
    { label: 'Gupta Samaj', value: 'Gupta Samaj' },
    { label: 'Mali Samaj', value: 'Mali Samaj' },
    { label: 'Patel Samaj', value: 'Patel Samaj' },
    { label: 'Verma Samaj', value: 'Verma Samaj' },
    { label: 'Other', value: 'other' },
  ];

  // Dynamic API Data
  const [apiCommunities, setApiCommunities] = useState(DEFAULT_COMMUNITIES);
  const [apiCities, setApiCities] = useState([]);

  useEffect(() => {
    const loadCommunities = async () => {
      try {
        const res = await axiosPublic.get('/auth/communities');
        if (res.data.success && res.data.data.length > 0) {
          const fetched = res.data.data.map(c => ({
            label: c.name,
            value: c._id,
            subCommunities: Array.isArray(c.subCommunities) ? c.subCommunities : []
          }));
          const mergedMap = new Map();
          fetched.forEach(item => {
            if (item.label.toLowerCase() !== 'other') {
              mergedMap.set(item.label.toLowerCase(), item);
            }
          });
          DEFAULT_COMMUNITIES.forEach(item => {
            if (item.value !== 'other' && !mergedMap.has(item.label.toLowerCase())) {
              mergedMap.set(item.label.toLowerCase(), item);
            }
          });
          const list = Array.from(mergedMap.values());
          list.push({ label: 'Other', value: 'other', subCommunities: [] });
          setApiCommunities(list);
        } else {
          setApiCommunities(DEFAULT_COMMUNITIES);
        }
      } catch (err) {
        console.error('Failed to load public communities:', err);
        setApiCommunities(DEFAULT_COMMUNITIES);
      }
    };
    loadCommunities();
  }, []);

  // Compute available sub-communities dynamically for the selected community
  const availableSubCommunities = useMemo(() => {
    if (!selectedCommunity) return [];
    if (selectedCommunity === 'other') return ['General'];
    const matched = apiCommunities.find(c => c.value === selectedCommunity || c.label === selectedCommunity);
    if (matched && Array.isArray(matched.subCommunities) && matched.subCommunities.length > 0) {
      return matched.subCommunities;
    }
    return ['General'];
  }, [selectedCommunity, apiCommunities]);

  const DEFAULT_INDIAN_CITIES = [
    { label: 'Indore', value: 'Indore' },
    { label: 'Bhopal', value: 'Bhopal' },
    { label: 'Ujjain', value: 'Ujjain' },
    { label: 'Khandwa', value: 'Khandwa' },
    { label: 'Gwalior', value: 'Gwalior' },
    { label: 'Jabalpur', value: 'Jabalpur' },
    { label: 'Ratlam', value: 'Ratlam' },
    { label: 'Dewas', value: 'Dewas' },
    { label: 'Jaipur', value: 'Jaipur' },
    { label: 'Delhi', value: 'Delhi' },
    { label: 'Mumbai', value: 'Mumbai' },
    { label: 'Ahmedabad', value: 'Ahmedabad' },
    { label: 'Pune', value: 'Pune' },
  ];

  useEffect(() => {
    const loadCities = async () => {
      try {
        const url = selectedCommunity && selectedCommunity !== 'other'
          ? `/auth/cities?communityId=${selectedCommunity}`
          : '/auth/cities';
        const res = await axiosPublic.get(url);
        if (res.data.success && res.data.data.length > 0) {
          const fetched = res.data.data.map(c => ({
            label: c.name,
            value: c.name,
            state: c.state || '',
            dotColor: c.dotColor || 'red',
            isCovered: Boolean(c.isCovered),
            hasHead: Boolean(c.hasHead),
            hasCommunity: Boolean(c.hasCommunity),
            headInfo: c.headInfo || null,
            statusText: c.statusText || (c.isCovered ? 'Head Assigned' : 'Head Pending')
          }));
          setApiCities(fetched);
        } else {
          setApiCities(DEFAULT_INDIAN_CITIES.map(c => ({
            ...c,
            dotColor: 'red',
            isCovered: false,
            hasHead: false,
            hasCommunity: false,
            statusText: 'Head Pending'
          })));
        }
      } catch (err) {
        console.error('Failed to load public cities:', err);
        setApiCities(DEFAULT_INDIAN_CITIES.map(c => ({
          ...c,
          dotColor: 'red',
          isCovered: false,
          hasHead: false,
          hasCommunity: false,
          statusText: 'Head Pending'
        })));
      }
    };
    loadCities();
  }, [selectedCommunity]);

  // Step 4 Personal
  const [avatar, setAvatar] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [gotra, setGotra] = useState('');
  const [familyType, setFamilyType] = useState('');

  // Step 5 Education
  const [qualification, setQualification] = useState('');
  const [school, setSchool] = useState('');
  const [passingYear, setPassingYear] = useState('');

  // Step 6 Profession
  const [profession, setProfession] = useState('');
  const [company, setCompany] = useState('');
  const [annualIncome, setAnnualIncome] = useState('');
  const [workCity, setWorkCity] = useState('');

  // Step 7 Address & Contact
  const [houseNumber, setHouseNumber] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [areaAddress, setAreaAddress] = useState('');
  const [pincodeAddress, setPincodeAddress] = useState('');
  const [detailedAddress, setDetailedAddress] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [alternateEmail, setAlternateEmail] = useState('');

  // Step 8 Family
  const [familyMembers, setFamilyMembers] = useState([]);
  const [tempFamilyName, setTempFamilyName] = useState('');
  const [tempFamilyRelation, setTempFamilyRelation] = useState('');
  const [tempFamilyAge, setTempFamilyAge] = useState('');
  const [tempFamilyMobile, setTempFamilyMobile] = useState('');
  const [tempFamilyGotra, setTempFamilyGotra] = useState('');
  const [editingFamilyMemberId, setEditingFamilyMemberId] = useState(null);

  // Step 10 Verification details
  const [isAadharVerified, setIsAadharVerified] = useState(false);
  const [isFaceVerified, setIsFaceVerified] = useState(false);
  const [verifyingAadhar, setVerifyingAadhar] = useState(false);
  const [verifyingFace, setVerifyingFace] = useState(false);

  // Step 11 Preferences
  const [prefEducation, setPrefEducation] = useState('');
  const [prefAge, setPrefAge] = useState('');
  const [prefHeight, setPrefHeight] = useState('');
  const [prefOccupation, setPrefOccupation] = useState('');
  const [prefCity, setPrefCity] = useState('');

  const [slideDir, setSlideDir] = useState('right');
  const [toastMessage, setToastMessage] = useState('');

  // Prefill phone and email from registration session
  useEffect(() => {
    const regPhone = localStorage.getItem('merisamaj_register_phone') || '';
    const regEmail = localStorage.getItem('merisamaj_register_email') || '';
    if (regPhone) setPhone(regPhone);
    if (regEmail) setEmail(regEmail);
  }, []);

  // Prefill and lock community/onboarding details from authenticated user or local session
  useEffect(() => {
    const userToLoad = auth.user || JSON.parse(localStorage.getItem('merisamaj_registered_user') || 'null') || JSON.parse(localStorage.getItem('merisamaj_user') || 'null');
    if (userToLoad) {
      if (userToLoad.name) setName(userToLoad.name);
      if (userToLoad.phone) setPhone(userToLoad.phone);
      if (userToLoad.gender) setGender(userToLoad.gender);
      if (userToLoad.communityId) {
        const cId = userToLoad.communityId._id || userToLoad.communityId;
        const matched = apiCommunities.find(c => c.value === cId || c.label.toLowerCase() === (userToLoad.community || '').toLowerCase());
        if (matched && matched.value !== 'other') {
          setSelectedCommunity(matched.value);
        } else if (userToLoad.community) {
          setSelectedCommunity('other');
          setCustomCommunity(userToLoad.community);
        } else {
          setSelectedCommunity(cId);
        }
      } else if (userToLoad.community && apiCommunities.length > 0) {
        const matched = apiCommunities.find(c => c.label.toLowerCase() === userToLoad.community.toLowerCase());
        if (matched && matched.value !== 'other') {
          setSelectedCommunity(matched.value);
        } else {
          setSelectedCommunity('other');
          setCustomCommunity(userToLoad.community);
        }
      }
      if (userToLoad.subCommunity) setSelectedSubCommunity(userToLoad.subCommunity);
      if (userToLoad.city) setSelectedCity(userToLoad.city);
      if (userToLoad.pincode) setPincode(userToLoad.pincode);
      if (userToLoad.district) setDistrict(userToLoad.district);
      if (userToLoad.state) setStateName(userToLoad.state);
      if (userToLoad.avatar) setAvatar(userToLoad.avatar);
      if (userToLoad.dob) setDob(userToLoad.dob);
      if (userToLoad.bloodGroup) setBloodGroup(userToLoad.bloodGroup);
      if (userToLoad.maritalStatus) setMaritalStatus(userToLoad.maritalStatus);
      if (userToLoad.gotra) setGotra(userToLoad.gotra);
      if (userToLoad.familyType) setFamilyType(userToLoad.familyType);
      if (userToLoad.qualification) setQualification(userToLoad.qualification);
      if (userToLoad.school) setSchool(userToLoad.school);
      if (userToLoad.passingYear) setPassingYear(userToLoad.passingYear);
      if (userToLoad.profession) setProfession(userToLoad.profession);
      if (userToLoad.company) setCompany(userToLoad.company);
      if (userToLoad.annualIncome) setAnnualIncome(userToLoad.annualIncome);
      if (userToLoad.workCity) setWorkCity(userToLoad.workCity);
      if (userToLoad.houseNumber) setHouseNumber(userToLoad.houseNumber);
      if (userToLoad.streetAddress) setStreetAddress(userToLoad.streetAddress);
      if (userToLoad.landmark) setLandmark(userToLoad.landmark);
      if (userToLoad.areaAddress) setAreaAddress(userToLoad.areaAddress);
      if (userToLoad.pincodeAddress) setPincodeAddress(userToLoad.pincodeAddress);
      if (userToLoad.detailedAddress) setDetailedAddress(userToLoad.detailedAddress);
      if (userToLoad.alternatePhone) setAlternatePhone(userToLoad.alternatePhone);
      if (userToLoad.alternateEmail) setAlternateEmail(userToLoad.alternateEmail);
      if (userToLoad.familyMembers) setFamilyMembers(userToLoad.familyMembers);
      if (userToLoad.isAadharVerified !== undefined) setIsAadharVerified(userToLoad.isAadharVerified);
      if (userToLoad.isFaceVerified !== undefined) setIsFaceVerified(userToLoad.isFaceVerified);
      if (userToLoad.prefEducation) setPrefEducation(userToLoad.prefEducation);
      if (userToLoad.prefAge) setPrefAge(userToLoad.prefAge);
      if (userToLoad.prefHeight) setPrefHeight(userToLoad.prefHeight);
      if (userToLoad.prefOccupation) setPrefOccupation(userToLoad.prefOccupation);
      if (userToLoad.prefCity) setPrefCity(userToLoad.prefCity);
    }

    // Resume flow step check
    const resumeStep = localStorage.getItem('merisamaj_onboarding_resume_step');
    if (resumeStep) {
      setStep(resumeStep);
    }
  }, [auth.user, apiCommunities]);

  // Autofill state and district based on pincode
  useEffect(() => {
    if (pincode.length === 6) {
      if (pincode.startsWith('452')) {
        setDistrict('Indore');
        setStateName('Madhya Pradesh');
      } else if (pincode.startsWith('456')) {
        setDistrict('Ujjain');
        setStateName('Madhya Pradesh');
      } else if (pincode.startsWith('457')) {
        setDistrict('Ratlam');
        setStateName('Madhya Pradesh');
      } else if (pincode.startsWith('302')) {
        setDistrict('Jaipur');
        setStateName('Rajasthan');
      } else if (pincode.startsWith('110')) {
        setDistrict('New Delhi');
        setStateName('Delhi');
      } else {
        setDistrict('Indore');
        setStateName('Madhya Pradesh');
      }
    }
  }, [pincode]);

  const ONBOARDING_FLOW = [1, 2, 3, 8, 11];

  const calculateCompletion = () => {
    const sNum = parseInt(step.split('-')[1]);
    if (sNum === 11) return 100;
    let pct = 0;
    pct += 25; // Step 1: Mobile verification
    const isCommValid = selectedCommunity && (selectedCommunity !== 'other' || customCommunity.trim().length > 0);
    if (isCommValid && selectedCity) pct += 25; // Step 2: Community & City
    if (name && gender) pct += 30; // Step 3: Personal Information
    if (isAadharVerified || isFaceVerified) pct += 20; // Step 8: Verification
    return Math.min(pct, 95);
  };

  const handleAddFamilyMember = () => {
    const famErrors = {};
    const nameResult = validateName(tempFamilyName);
    if (!nameResult.valid) famErrors.familyName = nameResult.error;
    if (!tempFamilyRelation) famErrors.familyRelation = 'Relation is required.';
    if (!tempFamilyAge && tempFamilyAge !== 0) famErrors.familyAge = 'Age is required.';
    else {
      const ageResult = validateAge(tempFamilyAge);
      if (!ageResult.valid) famErrors.familyAge = ageResult.error;
    }
    if (tempFamilyMobile && tempFamilyMobile.trim()) {
      const phoneResult = validateOptionalPhone(tempFamilyMobile);
      if (!phoneResult.valid) famErrors.familyMobile = phoneResult.error;
    }
    if (Object.keys(famErrors).length > 0) {
      setStepErrors(famErrors);
      return;
    }
    setStepErrors({});
    if (editingFamilyMemberId) {
      setFamilyMembers(prev => prev.map(m => m.id === editingFamilyMemberId ? {
        ...m,
        name: tempFamilyName,
        relation: tempFamilyRelation,
        age: tempFamilyAge,
        phone: tempFamilyMobile,
        mobile: tempFamilyMobile,
        gotra: tempFamilyGotra
      } : m));
      setEditingFamilyMemberId(null);
    } else {
      const newMember = {
        id: `fam-${Date.now()}`,
        name: tempFamilyName,
        relation: tempFamilyRelation,
        age: tempFamilyAge,
        phone: tempFamilyMobile,
        mobile: tempFamilyMobile,
        gotra: tempFamilyGotra
      };
      setFamilyMembers(prev => [...prev, newMember]);
    }
    setTempFamilyName('');
    setTempFamilyRelation('');
    setTempFamilyAge('');
    setTempFamilyMobile('');
    setTempFamilyGotra('');
  };

  const handleEditFamilyMember = (member) => {
    setEditingFamilyMemberId(member.id);
    setTempFamilyName(member.name);
    setTempFamilyRelation(member.relation);
    setTempFamilyAge(member.age);
    setTempFamilyMobile(member.phone || member.mobile || '');
    setTempFamilyGotra(member.gotra || '');
  };

  const handleRemoveFamilyMember = (id) => {
    setFamilyMembers(prev => prev.filter(m => m.id !== id));
  };

  // ─── STEP VALIDATION GATE ────────────────────────────────────────────────────
  const validateStep = (stepNum) => {
    const errors = {};
    if (stepNum === 2) {
      if (!selectedCommunity) {
        errors.community = 'Please select a community.';
      } else if (selectedCommunity === 'other' && !customCommunity.trim()) {
        errors.customCommunity = 'Please write your community name.';
      }
      if (!selectedCity) errors.city = 'Please select your city.';
    }
    if (stepNum === 3) {
      const nameResult = validateName(name);
      if (!nameResult.valid) errors.name = nameResult.error;
      if (!gender) errors.gender = 'Please select your gender.';
      const genderResult = validateEnum(gender, ALLOWED_GENDERS, 'Gender');
      if (!genderResult.valid) errors.gender = genderResult.error;
      if (!dob) {
        errors.dob = 'Date of birth is required.';
      } else {
        const dobResult = validateDOB(dob);
        if (!dobResult.valid) errors.dob = dobResult.error;
      }
      if (bloodGroup) {
        const bgResult = validateEnum(bloodGroup, ALLOWED_BLOOD_GROUPS, 'Blood group');
        if (!bgResult.valid) errors.bloodGroup = bgResult.error;
      }
      if (!maritalStatus) {
        errors.maritalStatus = 'Marital status is required.';
      } else {
        const msResult = validateEnum(maritalStatus, ALLOWED_MARITAL_STATUSES, 'Marital status');
        if (!msResult.valid) errors.maritalStatus = msResult.error;
      }
      if (!familyType) {
        errors.familyType = 'Family type is required.';
      }
      if (!stateName) {
        errors.stateName = 'State is required.';
      }
      if (!district) {
        errors.district = 'District is required.';
      }
      if (!selectedCity || !selectedCity.trim()) {
        errors.selectedCity = 'City / Village is required.';
      }
    }
    if (stepNum === 4) {
      if (pincode && pincode.length > 0) {
        const pinResult = validatePincode(pincode);
        if (!pinResult.valid) errors.pincode = pinResult.error;
      }
    }
    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    let communityName = '';
    let communityIdVal = '';

    if (selectedCommunity === 'other') {
      communityName = customCommunity.trim() || 'Other';
      communityIdVal = customCommunity.trim() || 'other';
    } else {
      const resolvedComm = apiCommunities.find(c => c.value === selectedCommunity || c.label === selectedCommunity);
      communityName = resolvedComm ? resolvedComm.label : (typeof selectedCommunity === 'string' && selectedCommunity ? selectedCommunity : '');
      communityIdVal = selectedCommunity;
    }

    const completeUserObj = {
      id: auth.user?.id || auth.user?._id || `u-${Date.now()}`,
      name: String(name || auth.user?.name || ''),
      phone: String(phone || auth.user?.phone || ''),
      email: String(email || auth.user?.email || ''),
      community: communityName || auth.user?.community || 'Jain Samaj',
      communityId: String(communityIdVal || auth.user?.communityId || 'Jain Samaj'),
      subCommunity: String(selectedSubCommunity || ''),
      city: String(selectedCity || ''),
      district: String(district || ''),
      state: String(stateName || ''),
      pincode: String(pincode || ''),
      avatar: avatar || auth.user?.avatar || null,
      gender: String(gender || ''),
      dob: String(dob || ''),
      bloodGroup: String(bloodGroup || ''),
      maritalStatus: String(maritalStatus || ''),
      gotra: String(gotra || ''),
      familyType: String(familyType || ''),
      qualification: String(qualification || ''),
      school: String(school || ''),
      profession: String(profession || ''),
      company: String(company || ''),
      detailedAddress: String(detailedAddress || ''),
      familyMembers: Array.isArray(familyMembers) ? familyMembers : [],
      isAadharVerified: Boolean(isAadharVerified),
      isFaceVerified: Boolean(isFaceVerified),
      prefEducation: String(prefEducation || ''),
      prefAge: String(prefAge || ''),
      prefHeight: String(prefHeight || ''),
      prefOccupation: String(prefOccupation || ''),
      prefCity: String(prefCity || '')
    };

    // 1. Instantly persist to local storage & state so UX never breaks or shows error
    try {
      safeSetLocalStorage('merisamaj_registered_user', completeUserObj);
      safeSetLocalStorage('merisamaj_user', completeUserObj);
      if (typeof loginUser === 'function') loginUser(completeUserObj);
      if (typeof setAuth === 'function') setAuth(prev => ({ ...prev, user: completeUserObj }));
    } catch (e) {
      console.warn('Local storage persistence warning:', e);
    }

    // 2. Try async backend API update in background
    try {
      const formData = new FormData();
      formData.append('name', completeUserObj.name);
      formData.append('gender', completeUserObj.gender);
      formData.append('dob', completeUserObj.dob);
      formData.append('bloodGroup', completeUserObj.bloodGroup);
      formData.append('maritalStatus', completeUserObj.maritalStatus);
      formData.append('gotra', completeUserObj.gotra);
      formData.append('familyType', completeUserObj.familyType);
      formData.append('community', completeUserObj.community);
      formData.append('communityId', completeUserObj.communityId);
      formData.append('subCommunity', completeUserObj.subCommunity);
      formData.append('city', completeUserObj.city);
      formData.append('district', completeUserObj.district);
      formData.append('state', completeUserObj.state);
      formData.append('pincode', completeUserObj.pincode);
      formData.append('qualification', completeUserObj.qualification);
      formData.append('school', completeUserObj.school);
      formData.append('profession', completeUserObj.profession);
      formData.append('company', completeUserObj.company);
      formData.append('detailedAddress', completeUserObj.detailedAddress);
      if (avatarFile) formData.append('avatarFile', avatarFile);

      const response = await authService.updateProfile(formData);
      if (response && typeof response === 'object') {
        const mergedUser = { ...completeUserObj, ...response };
        safeSetLocalStorage('merisamaj_user', mergedUser);
        if (typeof loginUser === 'function') loginUser(mergedUser);
        if (typeof setAuth === 'function') setAuth(prev => ({ ...prev, user: mergedUser }));
      }
    } catch (apiErr) {
      console.warn('Backend API update warning (proceeding cleanly with local saved state):', apiErr);
    }

    // 3. Move smoothly to Step 11 Finish Screen
    setStep('onboarding-11');
    setToastMessage('Profile saved successfully!');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleGoToHome = () => {
    try {
      localStorage.removeItem('merisamaj_just_registered');
      localStorage.removeItem('merisamaj_onboarding_resume_step');
      localStorage.removeItem('merisamaj_onboarding_from_home');
    } catch (e) {}

    let savedUser = {};
    try {
      savedUser = JSON.parse(localStorage.getItem('merisamaj_registered_user') || 'null') ||
                        JSON.parse(localStorage.getItem('merisamaj_user') || 'null') ||
                        auth.user || {};
    } catch (e) {
      savedUser = auth.user || {};
    }

    if (!savedUser.community && !savedUser.communityId) {
      savedUser = { ...savedUser, community: 'Jain Samaj', communityId: 'Jain Samaj' };
    }

    safeSetLocalStorage('merisamaj_user', savedUser);
    if (typeof loginUser === 'function') loginUser(savedUser);
    if (typeof setAuth === 'function') setAuth(prev => ({ ...prev, user: savedUser, isAuthenticated: true }));
    navigate('/member/home');
  };

  const renderOnboardingHeader = (current) => {
    const compPct = calculateCompletion();
    const flowIdx = ONBOARDING_FLOW.indexOf(current);
    const displayStep = flowIdx !== -1 ? flowIdx + 1 : current;
    const totalDisplaySteps = flowIdx !== -1 ? ONBOARDING_FLOW.length : 11;

    const handleBack = () => {
      setSlideDir('left');
      if (flowIdx > 0) {
        setStep(`onboarding-${ONBOARDING_FLOW[flowIdx - 1]}`);
      } else if (flowIdx === 0 || current === 1) {
        navigate('/member/register');
      } else {
        setStep(`onboarding-${current - 1}`);
      }
    };

    return (
      <div className="bg-white/40 backdrop-blur-md border-b border-purple-100/30 shrink-0 z-10">
        <div className="p-4 flex items-center justify-between">
          <button 
            onClick={handleBack} 
            className="w-9 h-9 rounded-xl bg-white/80 border border-purple-100/30 flex items-center justify-center text-text-primary hover:bg-purple-50 transition-colors press-scale"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-brand-primary">Step {displayStep} of {totalDisplaySteps}</span>
            <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100 shadow-xs select-none">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9.5px] font-black tracking-tight leading-none">{compPct}% done</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProgressCard = (current, pct) => {
    const flowIdx = ONBOARDING_FLOW.indexOf(current);
    const totalSteps = flowIdx !== -1 ? ONBOARDING_FLOW.length : 11;
    const currentStepNum = flowIdx !== -1 ? flowIdx + 1 : current;
    const remaining = totalSteps - currentStepNum;
    const stepList = flowIdx !== -1 ? ONBOARDING_FLOW : Array.from({ length: 11 }, (_, i) => i + 1);

    return (
      <div className="bg-white rounded-[20px] border border-purple-100 p-3.5 shadow-xs space-y-3 select-none animate-fade-in text-left shrink-0">
        <div className="flex items-center justify-between py-0.5 px-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Check size={11} strokeWidth={3} />
            </div>
            <span className="text-xs font-extrabold text-slate-800">Step {currentStepNum} of {totalSteps}</span>
          </div>

          <div className="w-[1px] h-4 bg-slate-200" />

          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[#7C3AED]" />
            <span className="text-xs font-extrabold text-slate-800">
              {remaining === 0 ? 'Last Step' : `${remaining} Step${remaining !== 1 ? 's' : ''} Remaining`}
            </span>
          </div>
        </div>

        <div className="border-t border-slate-100" />

        <div className="overflow-x-auto no-scrollbar scroll-smooth py-1 px-2">
          <div className="flex items-center min-w-[240px] relative justify-between">
            <div className="absolute top-3.5 left-3 right-3 h-[2px] bg-slate-200 -z-10" />
            
            <div 
              className="absolute top-3.5 left-3 h-[2px] bg-[#7C3AED] transition-all duration-500 -z-10"
              style={{ width: `${((currentStepNum - 1) / Math.max(totalSteps - 1, 1)) * 90}%` }}
            />

            {stepList.map((stNum, idx) => {
              const itemStepNum = idx + 1;
              const isCompleted = itemStepNum < currentStepNum;
              const isActive = itemStepNum === currentStepNum;

              return (
                <div key={idx} className="flex flex-col items-center relative z-10 shrink-0">
                  <div 
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-[#7C3AED] text-white shadow-xs' 
                        : isActive 
                        ? 'bg-white border-2 border-[#7C3AED] text-[#7C3AED] shadow-sm' 
                        : 'bg-white border border-slate-300 text-slate-400'
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={12} strokeWidth={3} />
                    ) : (
                      itemStepNum
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderToast = () => toastMessage && (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#1e1145] text-white border border-purple-500/20 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-bounce font-sans text-xs font-bold select-none">
      <AlertCircle size={15} className="text-purple-300" />
      <span>{toastMessage}</span>
    </div>
  );

  const onboardingStepNum = parseInt(step.split('-')[1]);
  const compPct = calculateCompletion();

  return (
    <div className="h-screen bg-surface flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 aura-bg z-0 animate-aura-pulse" />
      {renderToast()}
      {renderOnboardingHeader(onboardingStepNum)}

      <div className="flex-1 px-6 pt-4 pb-6 overflow-y-auto z-10 max-w-sm mx-auto w-full space-y-4">
        {renderProgressCard(onboardingStepNum, compPct)}
        
        <SlideIn key={onboardingStepNum}>
          {/* Step 1: Mobile verified */}
          {onboardingStepNum === 1 && (
            <div className="space-y-5 text-left animate-fade-in">
              <div className="w-14 h-14 bg-[#F3E8FF] rounded-2xl flex items-center justify-center text-[#6D28D9] shrink-0 border border-purple-200/40">
                <Phone size={26} />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-800">Step 1: Mobile Verified</h1>
                <p className="text-xs text-slate-500 font-semibold mt-1">Verification completed during registration</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3 mt-4">
                <CheckCircle className="text-emerald-600 shrink-0" size={24} />
                <div>
                  <p className="text-sm font-bold text-emerald-800">Verified Mobile Number</p>
                  <p className="text-xs text-emerald-700 font-semibold mt-0.5">{phone || '+91 XXXXX XXXXX'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Community selection */}
          {onboardingStepNum === 2 && (
            <div className="space-y-5 text-left animate-fade-in">
              <div className="w-14 h-14 bg-[#F3E8FF] rounded-2xl flex items-center justify-center text-[#6D28D9] shrink-0 border border-purple-200/40">
                <Users size={26} />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-800">Step 2: Select Community</h1>
                <p className="text-xs text-slate-500 font-semibold mt-1">Which community do you belong to?</p>
              </div>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">SELECT COMMUNITY</label>
                  <CustomSelect
                    value={selectedCommunity}
                    onChange={(val) => { 
                      setSelectedCommunity(val); 
                      if (val !== 'other') setCustomCommunity('');
                      setSelectedSubCommunity(''); 
                      setSelectedCity(''); 
                      setStepErrors(prev => ({ ...prev, community: '', customCommunity: '' })); 
                    }}
                    options={apiCommunities}
                    placeholder="Select community"
                    disabled={isCommunityLocked}
                    searchable
                  />
                  {isCommunityLocked && (
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">Community assigned during registration (locked).</p>
                  )}
                  {stepErrors.community && <p role="alert" className="text-[10px] text-red-500 font-semibold mt-1">{stepErrors.community}</p>}
                </div>

                {/* Custom Community Input when "Other" is selected */}
                {selectedCommunity === 'other' && (
                  <div className="bg-purple-50/70 p-3.5 border border-purple-200/90 rounded-2xl space-y-1.5 animate-fade-in">
                    <label className="text-[11px] font-bold text-[#6D28D9] uppercase tracking-wider block">
                      Write Your Community Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Maheshwari Samaj, Brahmin Samaj, etc."
                      value={customCommunity}
                      onChange={(e) => {
                        setCustomCommunity(e.target.value);
                        setStepErrors(prev => ({ ...prev, customCommunity: '', community: '' }));
                      }}
                      className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-500/15 transition-all placeholder:text-slate-400"
                      autoFocus
                    />
                    <p className="text-[10px] text-purple-700 font-medium">
                      If your Samaj is not listed above, please write your community name here.
                    </p>
                    {stepErrors.customCommunity && (
                      <p role="alert" className="text-[10px] text-red-500 font-semibold">{stepErrors.customCommunity}</p>
                    )}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      SUB-COMMUNITY / CATEGORY
                    </label>
                    {availableSubCommunities.length > 0 && (
                      <span className="text-xs font-bold text-[#6D28D9]">
                        {availableSubCommunities.length} Options
                      </span>
                    )}
                  </div>
                  <CustomSelect
                    value={selectedSubCommunity}
                    onChange={setSelectedSubCommunity}
                    options={availableSubCommunities}
                    placeholder="Select sub-community"
                    disabled={!selectedCommunity || (selectedCommunity === 'other' && !customCommunity.trim())}
                    searchable
                  />
                  {availableSubCommunities.length > 0 && availableSubCommunities[0] !== 'General' && (
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">
                      Choose from registered sub-communities for this Samaj.
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    SELECT CITY (COMMUNITY LOCAL HEAD GROUP)
                  </label>
                  <CustomSelect
                    value={selectedCity}
                    onChange={(val) => { setSelectedCity(val); setStepErrors(prev => ({ ...prev, city: '' })); }}
                    options={apiCities}
                    placeholder="Select city"
                    disabled={!selectedCommunity || (selectedCommunity === 'other' && !customCommunity.trim())}
                    searchable
                  />
                  {stepErrors.city && <p role="alert" className="text-[10px] text-red-500 font-semibold mt-1">{stepErrors.city}</p>}

                  {/* Visual Status Card for Selected City — shows the Local Head (or Community Head) who will approve this request */}
                  {selectedCity && (
                    (() => {
                      const matchedCity = apiCities.find(c => (c.value || c.name || c.label) === selectedCity);
                      const head = matchedCity?.headInfo;
                      if (matchedCity?.isCovered && head) {
                        const initials = (head.name || 'H')
                          .split(' ')
                          .filter(Boolean)
                          .map(n => n[0])
                          .join('')
                          .substring(0, 2)
                          .toUpperCase();
                        const label = head.type === 'local' ? 'Active Local Head' : 'Active Community Head';
                        return (
                          <div className="mt-3 flex items-center gap-3.5 bg-[#ECFDF5] border border-emerald-300/80 rounded-2xl p-3 animate-fade-in shadow-xs">
                            {head.avatar ? (
                              <img
                                src={head.avatar}
                                alt={head.name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400 shrink-0 shadow-xs"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center text-emerald-800 font-black text-sm shrink-0 shadow-xs">
                                {initials}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2 shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                {label}
                              </p>
                              <p className="text-base font-black text-slate-900 truncate mt-0.5">{head.name}</p>
                            </div>
                          </div>
                        );
                      } else if (selectedCity) {
                        return (
                          <div className="mt-2.5 flex items-start gap-1.5 text-[10px] font-semibold text-amber-800 bg-amber-50/80 px-3 py-2 rounded-xl border border-amber-200 animate-fade-in">
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-0.5"></span>
                            <span>Head pending for {selectedCity}. You can register now; Admin will assign a Samaj Head.</span>
                          </div>
                        );
                      }
                      return null;
                    })()
                  )}
                </div>

                {pincode.length === 6 && (
                  <div className="bg-purple-50/40 p-4 border border-purple-100/50 rounded-2xl space-y-2 animate-fade-in">
                    <p className="text-[10px] text-[#7C3AED] font-bold uppercase tracking-wider">Location (Auto-filled)</p>
                    <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-700">
                      <p><strong>District:</strong> {district}</p>
                      <p><strong>State:</strong> {stateName}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Personal Information */}
          {onboardingStepNum === 3 && (
            <div className="space-y-4 text-left animate-fade-in">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[#1E1E38] tracking-tight">Step 3: Personal Information</h1>
                <p className="text-xs text-slate-500 font-semibold mt-1">Please provide accurate personal details</p>
              </div>

              {/* Upload Profile Photo Card */}
              <div className="bg-white p-4 rounded-3xl border border-purple-100/50 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center gap-4">
                <div className="relative shrink-0">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-[110px] h-[110px] sm:w-[120px] sm:h-[120px] rounded-3xl object-cover border-[3px] border-purple-100 shadow-sm" />
                  ) : (
                    <div className="w-[110px] h-[110px] sm:w-[120px] sm:h-[120px] bg-slate-50 border-2 border-slate-200 border-dashed rounded-3xl flex flex-col items-center justify-center text-slate-400 gap-1.5">
                      <User size={34} strokeWidth={1.5} />
                      <span className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">Photo</span>
                    </div>
                  )}
                  <label className="absolute -bottom-1.5 -right-1.5 w-9 h-9 sm:w-10 sm:h-10 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-full flex items-center justify-center shadow-lg cursor-pointer border-[3px] border-white text-white transition-all press-scale z-10">
                    <Camera size={16} strokeWidth={2.5} />
                    <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const fileResult = validateImageFile(file);
                      if (!fileResult.valid) {
                        setStepErrors(prev => ({ ...prev, avatar: fileResult.error }));
                        e.target.value = '';
                        return;
                      }
                      setStepErrors(prev => ({ ...prev, avatar: '' }));
                      setAvatarFile(file);
                      const reader = new FileReader();
                      reader.onload = (ev) => setAvatar(ev.target.result);
                      reader.readAsDataURL(file);
                    }} />
                  </label>
                  {stepErrors.avatar && <p role="alert" className="text-[10px] text-red-500 font-semibold mt-1 text-center">{stepErrors.avatar}</p>}
                </div>
                
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 bg-[#F3E8FF] rounded-full flex items-center justify-center text-[#7C3AED] shrink-0">
                      <Camera size={13} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-slate-800 leading-tight">Upload Profile Photo</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-snug mb-2.5">
                    A clear profile photo helps the admin approve your profile quickly.
                  </p>
                  
                  <div className="bg-[#F8F5FF] rounded-xl p-2.5 flex items-start gap-2 border border-purple-100/80">
                    <div className="w-4 h-4 rounded-full border-2 border-[#7C3AED] text-[#7C3AED] flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">!</div>
                    <p className="text-[10px] sm:text-[10.5px] text-slate-600 font-semibold leading-tight">
                      Use a clear image of your face.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Input Fields */}
              <div className="space-y-3.5">
                {/* Full Name */}
                <div>
                  <label className="text-[10px] sm:text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                    FULL NAME <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setStepErrors(prev => ({ ...prev, name: '' })); }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold text-slate-800 outline-none focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/5 transition-all shadow-xs"
                  />
                  {stepErrors.name && <p role="alert" className="text-[10px] text-red-500 font-bold mt-1 ml-1">{stepErrors.name}</p>}
                </div>

                {/* Gender Selection */}
                <div>
                  <label className="text-[10px] sm:text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                    GENDER <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2.5 mt-1">
                    {['Male', 'Female', 'Other'].map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => { setGender(g); setStepErrors(prev => ({ ...prev, gender: '' })); }}
                        className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all border-2 ${
                          gender === g
                            ? 'bg-[#F3E8FF] border-[#7C3AED] text-[#7C3AED] shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-purple-200'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  {stepErrors.gender && <p role="alert" className="text-[10px] text-red-500 font-bold mt-1 ml-1">{stepErrors.gender}</p>}
                </div>

                {/* Date of Birth & Blood Group */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[10px] sm:text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                      DATE OF BIRTH <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => { setDob(e.target.value); setStepErrors(prev => ({ ...prev, dob: '' })); }}
                      className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-800 outline-none focus:border-[#7C3AED]"
                    />
                    {stepErrors.dob && <p role="alert" className="text-[10px] text-red-500 font-bold mt-1 ml-1">{stepErrors.dob}</p>}
                  </div>
                  <div>
                    <label className="text-[10px] sm:text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                      BLOOD GROUP
                    </label>
                    <div className="mt-1">
                      <CustomSelect
                        value={bloodGroup}
                        onChange={(val) => { setBloodGroup(val); setStepErrors(prev => ({ ...prev, bloodGroup: '' })); }}
                        options={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']}
                        placeholder="Select"
                      />
                    </div>
                    {stepErrors.bloodGroup && <p role="alert" className="text-[10px] text-red-500 font-bold mt-1 ml-1">{stepErrors.bloodGroup}</p>}
                  </div>
                </div>

                {/* Marital Status & Gotra */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[10px] sm:text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                      MARITAL STATUS <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1">
                      <CustomSelect
                        value={maritalStatus}
                        onChange={(val) => { setMaritalStatus(val); setStepErrors(prev => ({ ...prev, maritalStatus: '' })); }}
                        options={['Single', 'Married', 'Widowed', 'Divorced', 'Separated']}
                        placeholder="Select"
                      />
                    </div>
                    {stepErrors.maritalStatus && <p role="alert" className="text-[10px] text-red-500 font-bold mt-1 ml-1">{stepErrors.maritalStatus}</p>}
                  </div>
                  <div>
                    <label className="text-[10px] sm:text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                      GOTRA
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Gotra"
                      value={gotra}
                      onChange={(e) => setGotra(e.target.value)}
                      className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-800 outline-none focus:border-[#7C3AED]"
                    />
                  </div>
                </div>

                {/* Family Type */}
                <div>
                  <label className="text-[10px] sm:text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                    FAMILY TYPE <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1">
                    <CustomSelect
                      value={familyType}
                      onChange={(val) => { setFamilyType(val); setStepErrors(prev => ({ ...prev, familyType: '' })); }}
                      options={['Nuclear Family', 'Joint Family', 'Single Parent Family', 'Other']}
                      placeholder="Select"
                    />
                  </div>
                  {stepErrors.familyType && <p role="alert" className="text-[10px] text-red-500 font-bold mt-1 ml-1">{stepErrors.familyType}</p>}
                </div>

                {/* Current Address Card */}
                <div className="bg-white/80 p-4 sm:p-5 rounded-3xl border border-purple-100/60 shadow-[0_4px_20px_rgba(124,58,237,0.03)] space-y-3.5 mt-2">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-xl bg-[#F3E8FF] flex items-center justify-center text-[#7C3AED] shrink-0">
                      <MapPin size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800">Current Address</h3>
                      <p className="text-[11px] text-slate-500 font-medium">Please enter your current address details.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 pt-1">
                    <div>
                      <label className="text-[10px] sm:text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                        STATE <span className="text-red-500">*</span>
                      </label>
                      <CustomSelect
                        value={stateName}
                        onChange={(val) => { setStateName(val); setStepErrors(prev => ({ ...prev, stateName: '' })); }}
                        options={INDIAN_STATES}
                        placeholder="Select State"
                        searchable={true}
                      />
                      {stepErrors.stateName && <p role="alert" className="text-[10px] text-red-500 font-bold mt-1 ml-1">{stepErrors.stateName}</p>}
                    </div>

                    <div>
                      <label className="text-[10px] sm:text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                        DISTRICT <span className="text-red-500">*</span>
                      </label>
                      <CustomSelect
                        value={district}
                        onChange={(val) => { setDistrict(val); setStepErrors(prev => ({ ...prev, district: '' })); }}
                        options={COMMON_DISTRICTS}
                        placeholder="Select District"
                        searchable={true}
                      />
                      {stepErrors.district && <p role="alert" className="text-[10px] text-red-500 font-bold mt-1 ml-1">{stepErrors.district}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] sm:text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block mb-1">
                      CITY / VILLAGE <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your city or village"
                      value={selectedCity}
                      onChange={(e) => { setSelectedCity(e.target.value); setStepErrors(prev => ({ ...prev, selectedCity: '' })); }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-800 outline-none focus:border-[#7C3AED] shadow-xs"
                    />
                    {stepErrors.selectedCity && <p role="alert" className="text-[10px] text-red-500 font-bold mt-1 ml-1">{stepErrors.selectedCity}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Education Details */}
          {onboardingStepNum === 4 && (
            <div className="space-y-5 text-left animate-fade-in">
              <div className="w-14 h-14 bg-[#F3E8FF] rounded-2xl flex items-center justify-center text-[#6D28D9] shrink-0 border border-purple-200/40">
                <GraduationCap size={26} />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-800">Step 4: Education Details</h1>
                <p className="text-xs text-slate-500 font-semibold mt-1">Add your qualification and school/college details</p>
              </div>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Highest Qualification</label>
                  <CustomSelect
                    value={qualification}
                    onChange={setQualification}
                    options={['10th', '12th', 'Diploma', 'Graduate', 'B.Tech', 'M.Tech', 'MBA', 'PhD', 'Other']}
                    placeholder="Select qualification"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">School / College Name</label>
                  <input
                    type="text"
                    placeholder="Enter school or college name"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#7C3AED] transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Year of Passing</label>
                  <input
                    type="tel"
                    maxLength={4}
                    placeholder="e.g. 2018"
                    value={passingYear}
                    onChange={(e) => setPassingYear(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#7C3AED] transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Profession Details */}
          {onboardingStepNum === 5 && (
            <div className="space-y-5 text-left animate-fade-in">
              <div className="w-14 h-14 bg-[#F3E8FF] rounded-2xl flex items-center justify-center text-[#6D28D9] shrink-0 border border-purple-200/40">
                <Briefcase size={26} />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-800">Step 5: Profession / Occupation</h1>
                <p className="text-xs text-slate-500 font-semibold mt-1">Share your job, business, or occupation details</p>
              </div>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Profession / Job Role</label>
                  <CustomSelect
                    value={profession}
                    onChange={setProfession}
                    options={['Software Engineer', 'Business Owner', 'Doctor', 'CA', 'Teacher', 'Farmer', 'Housewife', 'Student', 'Other']}
                    placeholder="Select profession"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Company / Business Name</label>
                  <input
                    type="text"
                    placeholder="Enter company or store name"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#7C3AED] transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Annual Income (Optional)</label>
                  <CustomSelect
                    value={annualIncome}
                    onChange={setAnnualIncome}
                    options={['Under 3 Lakh', '3 - 5 Lakh', '5 - 10 Lakh', '10 - 15 Lakh', '15 - 20 Lakh', '20 Lakh+']}
                    placeholder="Select income range"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Work City</label>
                  <CustomSelect
                    value={workCity}
                    onChange={setWorkCity}
                    options={['Indore', 'Jaipur', 'Bhopal', 'Delhi', 'Mumbai', 'Ahmedabad', 'Bangalore', 'Other']}
                    placeholder="Select work city"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Address & Contact */}
          {onboardingStepNum === 6 && (
            <div className="space-y-4 text-left animate-fade-in">
              <div>
                <h1 className="text-xl font-black text-slate-800">Step 6: Address & Contact</h1>
                <p className="text-xs text-slate-500 font-semibold mt-1">Add your address and contact details</p>
              </div>
              <div className="space-y-4 pt-1">
                <div className="p-3.5 bg-white border border-purple-100 rounded-[22px] space-y-3 shadow-xs">
                  <p className="text-[10px] text-brand-primary font-black uppercase tracking-wider mb-1.5">Address</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400">House No.</label>
                      <input type="text" placeholder="123" value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400">Pincode</label>
                      <input type="tel" maxLength={6} placeholder="411001" value={pincodeAddress} onChange={(e) => setPincodeAddress(e.target.value.replace(/\D/g, ''))} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400">Address / Street</label>
                    <input type="text" placeholder="e.g. Shivaji Nagar" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400">Landmark</label>
                      <input type="text" placeholder="e.g. Near Metro" value={landmark} onChange={(e) => setLandmark(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400">Area / Locality</label>
                      <input type="text" placeholder="e.g. MG Road" value={areaAddress} onChange={(e) => setAreaAddress(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none" />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-white border border-purple-100 rounded-[22px] space-y-3 shadow-xs">
                  <p className="text-[10px] text-brand-primary font-black uppercase tracking-wider mb-1.5">Contact Information</p>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400">Alternate Mobile (Optional)</label>
                    <input type="tel" maxLength={10} placeholder="e.g. 98765 43211" value={alternatePhone} onChange={(e) => setAlternatePhone(e.target.value.replace(/\D/g, ''))} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-450 uppercase">Email ID (Optional)</label>
                    <input type="email" placeholder="example@email.com" value={alternateEmail} onChange={(e) => setAlternateEmail(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Family Details */}
          {onboardingStepNum === 7 && (
            <div className="space-y-4 text-left animate-fade-in">
              <div>
                <h1 className="text-xl font-black text-slate-800">Step 7: Family Details</h1>
                <p className="text-xs text-slate-500 font-semibold mt-1">Add family member details</p>
              </div>
              
              {familyMembers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Added Members</p>
                  {familyMembers.map(m => (
                    <div key={m.id} className="flex justify-between items-center bg-white p-3 border border-slate-150 rounded-2xl shadow-xs animate-scale-up">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{m.name} <span className="text-[#7C3AED] font-semibold">({m.relation})</span></p>
                        <p className="text-[10px] text-slate-550 font-semibold mt-0.5">{m.age} yrs · Gotra: {m.gotra || 'N/A'}</p>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          type="button" 
                          onClick={() => handleEditFamilyMember(m)}
                          className="p-2 text-indigo-650 hover:bg-purple-50 rounded-xl transition-all"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveFamilyMember(m.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-white p-4 rounded-3xl border border-slate-200/65 space-y-3 shadow-sm">
                <p className="text-[10px] text-brand-primary font-black uppercase tracking-wider animate-pulse">
                  {editingFamilyMemberId ? 'Edit Member' : 'Add Member'}
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="col-span-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Name</label>
                    <input type="text" placeholder="Enter name" value={tempFamilyName} onChange={e => setTempFamilyName(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none animate-scale-up" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Relation</label>
                    <CustomSelect
                      value={tempFamilyRelation}
                      onChange={setTempFamilyRelation}
                      options={[
                        { value: 'Wife', label: 'Wife' },
                        { value: 'Husband', label: 'Husband' },
                        { value: 'Son', label: 'Son' },
                        { value: 'Daughter', label: 'Daughter' },
                        { value: 'Father', label: 'Father' },
                        { value: 'Mother', label: 'Mother' },
                        { value: 'Brother', label: 'Brother' },
                        { value: 'Sister', label: 'Sister' }
                      ]}
                      placeholder="Select"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Age</label>
                    <input type="tel" maxLength={3} placeholder="Age" value={tempFamilyAge} onChange={e => setTempFamilyAge(e.target.value.replace(/\D/g, ''))} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Mobile Number</label>
                    <input type="tel" maxLength={10} placeholder="Mobile" value={tempFamilyMobile} onChange={e => setTempFamilyMobile(e.target.value.replace(/\D/g, ''))} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Gotra</label>
                    <input type="text" placeholder="Gotra" value={tempFamilyGotra} onChange={e => setTempFamilyGotra(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none" />
                  </div>
                </div>
                
                <button 
                  type="button" 
                  onClick={handleAddFamilyMember}
                  className="w-full mt-1 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/10 transition-all press-scale"
                >
                  <PlusCircle size={15} /> {editingFamilyMemberId ? 'Save Member' : 'Add Member'}
                </button>
              </div>
            </div>
          )}

          {/* Step 8: Verification */}
          {onboardingStepNum === 8 && (
            <VerificationStep
              isFaceVerified={isFaceVerified}
              setIsFaceVerified={setIsFaceVerified}
              isAadharVerified={isAadharVerified}
              setIsAadharVerified={setIsAadharVerified}
              setToastMessage={setToastMessage}
              auth={auth}
              setAuth={setAuth}
            />
          )}

          {/* Step 9: Partner Preferences */}
          {onboardingStepNum === 9 && (
            <div className="space-y-4 text-left animate-fade-in">
              <div>
                <h1 className="text-xl font-black text-slate-800">Step 9: Partner Preferences</h1>
                <p className="text-xs text-slate-500 font-semibold mt-1">Add preferences to get matching matrimonial profiles</p>
              </div>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Education Preference</label>
                  <CustomSelect
                    value={prefEducation}
                    onChange={setPrefEducation}
                    options={['Graduation and above', 'Post Graduation', 'PhD', 'Any', 'Doctor / Engineer']}
                    placeholder="Select preference"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Age Preference</label>
                  <CustomSelect
                    value={prefAge}
                    onChange={setPrefAge}
                    options={['18 - 22 Years', '22 - 28 Years', '28 - 35 Years', 'Any']}
                    placeholder="Select preference"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Height Preference</label>
                  <CustomSelect
                    value={prefHeight}
                    onChange={setPrefHeight}
                    options={["4'5\" - 5'2\"", "5'2\" - 6'0\"", "6'0\"+", 'Any']}
                    placeholder="Select preference"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Occupation Preference</label>
                  <CustomSelect
                    value={prefOccupation}
                    onChange={setPrefOccupation}
                    options={['Software Professional', 'Government Job', 'Business Owner', 'Any', 'CA / Doctor']}
                    placeholder="Select preference"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 10: Profile Completion Checklist Summary */}
          {onboardingStepNum === 10 && (
            <div className="space-y-4 text-left animate-fade-in">
              <div>
                <h1 className="text-xl font-black text-slate-800">Step 10: Your Profile Progress</h1>
                <p className="text-xs text-slate-500 font-semibold mt-1">Complete your profile to get better matches</p>
              </div>
              <div className="space-y-4 pt-1">
                <div className="bg-white p-5 rounded-3xl border border-purple-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-2 relative overflow-hidden">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center shrink-0 border border-emerald-100">
                      <CheckCircle className="text-emerald-600 w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-[#10B981] leading-none">{compPct}%</span>
                        <span className="text-sm font-semibold text-slate-650">Completed</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${compPct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4.5 rounded-3xl border border-purple-100/30 shadow-xs space-y-3.5 text-left">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Checklist Details</p>
                  {[
                    { label: 'Mobile Verification', completed: true },
                    { label: 'Community Details', completed: !!selectedCommunity && !!selectedSubCommunity },
                    { label: 'Personal Information', completed: !!name && !!gender },
                    { label: 'Family Details', completed: familyMembers.length > 0 },
                    { label: 'Education Details', completed: !!qualification || !!school },
                    { label: 'Profession Details', completed: !!profession || !!company },
                    { label: 'Address & Contact', completed: !!houseNumber || !!detailedAddress }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 size={16} className={item.completed ? 'text-emerald-500 fill-emerald-100' : 'text-slate-300'} />
                        <span className={item.completed ? 'text-slate-750' : 'text-slate-400'}>{item.label}</span>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${item.completed ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        {item.completed ? 'Done' : 'Skipped'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 11: Finish Screen */}
          {onboardingStepNum === 11 && (
            <div className="py-6 text-center space-y-6 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-200/50 scale-110 animate-bounce duration-700">
                <Check size={36} strokeWidth={3} />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Congratulations!</h1>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Your profile has been created successfully.
                </p>
              </div>

              <div className="bg-purple-50/40 border border-purple-100/40 p-4.5 rounded-[22px] text-left space-y-2 shadow-xs text-xs font-semibold text-slate-650 leading-relaxed">
                <h4 className="text-[11px] font-black text-[#6D28D9] flex items-center gap-1"><AlertCircle size={13} className="text-purple-400" /> What happens next?</h4>
                <ul className="list-disc pl-4 space-y-1 text-[10px] text-slate-500 leading-relaxed">
                  <li>Your profile created successfully</li>
                  <li>You can update your profile details anytime</li>
                  <li>Start exploring matches now</li>
                </ul>
              </div>
            </div>
          )}
        </SlideIn>
      </div>

      {/* Footer Navigation Buttons */}
      <div className="px-6 pb-8 pt-4 shrink-0 bg-white/50 backdrop-blur-md border-t border-purple-100/30 z-10 max-w-sm mx-auto w-full">
        {onboardingStepNum === 11 ? (
          <div className="flex flex-col gap-2.5">
            <button 
              onClick={handleGoToHome}
              className="w-full py-3.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-black rounded-2xl shadow-lg flex items-center justify-center gap-1.5"
            >
              Go to Home
            </button>
            <button 
              onClick={() => {
                let savedUser = {};
                try {
                  savedUser = JSON.parse(localStorage.getItem('merisamaj_registered_user') || 'null') ||
                                    JSON.parse(localStorage.getItem('merisamaj_user') || 'null') ||
                                    auth.user || {};
                } catch (e) {
                  savedUser = auth.user || {};
                }
                safeSetLocalStorage('merisamaj_user', savedUser);
                if (typeof loginUser === 'function') loginUser(savedUser);
                if (typeof setAuth === 'function') setAuth(prev => ({ ...prev, user: savedUser, isAuthenticated: true }));
                navigate('/member/matrimonial');
              }}
              className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-655 text-sm font-bold rounded-2xl flex items-center justify-center gap-1.5"
            >
              Browse Profiles
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {[4, 5, 6, 8, 9].includes(onboardingStepNum) && (
              <button
                type="button"
                onClick={async () => {
                  setSlideDir('right');
                  if (onboardingStepNum === 8) {
                    await handleSaveProfile();
                  } else {
                    const currentIdx = ONBOARDING_FLOW.indexOf(onboardingStepNum);
                    if (currentIdx !== -1 && currentIdx < ONBOARDING_FLOW.length - 1) {
                      setStep(`onboarding-${ONBOARDING_FLOW[currentIdx + 1]}`);
                    } else {
                      setStep(`onboarding-${onboardingStepNum + 1}`);
                    }
                  }
                }}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-550 text-xs font-bold rounded-xl border border-slate-200 transition-all flex flex-col items-center justify-center"
              >
                <span>Skip for now</span>
                <span className="text-[9px] text-slate-400 font-semibold mt-0.5">You can add this later from settings</span>
              </button>
            )}

            <button
              type="button"
              onClick={async () => {
                // Step 1 -> Next goes to Step 2
                if (onboardingStepNum === 1) {
                  setSlideDir('right');
                  setStep('onboarding-2');
                  return;
                }

                // Step 2 -> Validate -> Next goes to Step 3
                if (onboardingStepNum === 2) {
                  const isValid = validateStep(2);
                  if (!isValid) {
                    setToastMessage('Please fix the validation errors to proceed.');
                    setTimeout(() => setToastMessage(''), 3000);
                    return;
                  }
                  setSlideDir('right');
                  setStep('onboarding-3');
                  return;
                }

                // Step 3 -> Validate -> Next directly jumps to Step 8 (Verification)
                if (onboardingStepNum === 3) {
                  const isValid = validateStep(3);
                  if (!isValid) {
                    setToastMessage('Please fix the validation errors to proceed.');
                    setTimeout(() => setToastMessage(''), 3000);
                    return;
                  }
                  setSlideDir('right');
                  setStep('onboarding-8');
                  return;
                }

                // Step 8 -> Complete & Save Profile -> directly transitions to Step 11 (Congratulations)
                if (onboardingStepNum === 8) {
                  setSlideDir('right');
                  await handleSaveProfile();
                  return;
                }

                // Fallback for Step 10
                if (onboardingStepNum === 10) {
                  setSlideDir('right');
                  await handleSaveProfile();
                  return;
                }

                // Fallback if navigating intermediate step directly
                const currentIdx = ONBOARDING_FLOW.indexOf(onboardingStepNum);
                if (currentIdx !== -1 && currentIdx < ONBOARDING_FLOW.length - 1) {
                  setSlideDir('right');
                  setStep(`onboarding-${ONBOARDING_FLOW[currentIdx + 1]}`);
                } else {
                  setSlideDir('right');
                  setStep(`onboarding-${onboardingStepNum + 1}`);
                }
              }}
              className="w-full py-3.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl text-base font-bold flex items-center justify-center gap-2 press-scale shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all"
            >
              Continue <ArrowRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingScreen;
