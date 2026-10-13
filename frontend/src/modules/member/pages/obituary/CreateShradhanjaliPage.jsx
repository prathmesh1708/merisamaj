import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Upload,
  X,
  CheckCircle2,
  Phone,
  ChevronDown,
  CalendarDays,
  Clock,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react';
import { useData } from '../../context/DataProvider';
import { AnimatedPage } from '../../components/layout/AnimatedPage';
import StepWizard from './components/StepWizard';
import { FullImage } from '../../../../core/components/FullImage';

const CEREMONY_TYPES = [
  'Funeral / Last Rites'
];

const PREFIXES = ['Late', 'Late Shri', 'Late Smt', 'Shri', 'Smt', ''];

const INITIAL_FORM = {
  // Step 1 — Photo
  photoUrl: '',
  photoFile: null,
  // Step 2 — Basic Info
  prefix: 'Late Smt',
  deceasedName: '',
  age: '',
  birthDate: '',
  dateOfPassing: '',
  // Step 3 — Ceremony
  ritesType: 'Funeral / Last Rites',
  ritesDate: '',
  ritesTime: '',
  ritesVenue: '',
  ceremonies: [
    { type: 'Funeral / Last Rites', date: '', time: '', venue: '' }
  ],
  showLocation: true,
  // Step 4 — Description & Privacy
  message: 'We request you all to pray for the peace of the departed soul.',
  privacy: 'public',
  familyContact: '',
  relation: 'Son/Daughter',
};

const MiniCalendar = ({ value, onChange, onClose, position }) => {
  const [date, setDate] = useState(() => {
    const d = value ? new Date(value) : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  });

  const year = date.getFullYear();
  const month = date.getMonth();

  // Get first day of the month
  const firstDay = new Date(year, month, 1).getDay();
  // Adjust so Monday is first day (0 = Monday, 6 = Sunday)
  const firstDayIndex = firstDay === 0 ? 6 : firstDay - 1;

  // Get number of days in the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setDate(new Date(year, month + 1, 1));
  };

  const handleYearChange = (e) => {
    setDate(new Date(parseInt(e.target.value), month, 1));
  };

  const handleMonthChange = (e) => {
    setDate(new Date(year, parseInt(e.target.value), 1));
  };

  const handleSelectDay = (day) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${year}-${m}-${d}`);
    onClose();
  };

  // Generate years list
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear + 2; y >= 1900; y--) {
    years.push(y);
  }

  // Days array
  const dayCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    dayCells.push(<div key={`empty-${i}`} className="w-7 h-7" />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isSelected = value === `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    dayCells.push(
      <button
        key={`day-${d}`}
        type="button"
        onClick={() => handleSelectDay(d)}
        className={`w-7 h-7 rounded-full text-[11px] font-bold transition-all flex items-center justify-center cursor-pointer ${
          isSelected 
            ? 'bg-amber-600 text-white shadow-sm' 
            : 'hover:bg-amber-50 text-gray-700'
        }`}
      >
        {d}
      </button>
    );
  }

  return (
    <div 
      className="absolute bg-white border border-amber-200 rounded-2xl shadow-xl p-3 z-50 w-[240px] animate-fade-in"
      style={{
        top: position.top,
        left: position.left,
        fontFamily: 'sans-serif'
      }}
    >
      {/* Month & Year Selectors */}
      <div className="flex items-center justify-between gap-1 mb-2 border-b border-amber-100 pb-2">
        <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded-lg text-amber-800 font-extrabold text-xs">&lt;</button>
        <div className="flex gap-1">
          <select 
            value={month} 
            onChange={handleMonthChange}
            className="text-[11px] font-bold text-gray-700 bg-transparent border-none outline-none cursor-pointer"
          >
            {monthsList.map((m, i) => <option key={i} value={i} className="bg-white text-slate-800 font-medium">{m}</option>)}
          </select>
          <select 
            value={year} 
            onChange={handleYearChange}
            className="text-[11px] font-bold text-gray-700 bg-transparent border-none outline-none cursor-pointer"
          >
            {years.map(y => <option key={y} value={y} className="bg-white text-slate-800 font-medium">{y}</option>)}
          </select>
        </div>
        <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded-lg text-amber-800 font-extrabold text-xs">&gt;</button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 text-center mb-1">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(w => (
          <span key={w} className="text-[9px] font-bold text-gray-400 uppercase">{w}</span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-y-0.5 justify-items-center">
        {dayCells}
      </div>

      {/* Quick Footer */}
      <div className="flex items-center justify-between border-t border-amber-100 pt-2 mt-2 text-[10px] font-bold">
        <button 
          type="button" 
          onClick={() => {
            const today = new Date();
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const d = String(today.getDate()).padStart(2, '0');
            onChange(`${y}-${m}-${d}`);
            onClose();
          }}
          className="text-amber-800 hover:underline"
        >
          Today
        </button>
        <button 
          type="button" 
          onClick={() => {
            onChange('');
            onClose();
          }}
          className="text-gray-400 hover:underline"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

const CalendarInput = ({ value, onChange, placeholder, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const handleOpen = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: Math.min(rect.left + window.scrollX, window.innerWidth - 260)
      });
      setIsOpen(true);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target) && !e.target.closest('.mini-calendar-portal')) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        readOnly
        value={value}
        onClick={handleOpen}
        placeholder={placeholder}
        className="w-full rounded-xl px-3.5 py-2 text-[12.5px] font-bold border outline-none bg-slate-50/70 cursor-pointer transition-all pr-9 text-slate-800"
        style={{ borderColor: error ? '#EF4444' : '#E2E8F0' }}
      />
      <div 
        onClick={handleOpen}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer pointer-events-none"
      >
        <CalendarDays size={15} />
      </div>

      {isOpen && createPortal(
        <div className="mini-calendar-portal">
          <MiniCalendar 
            value={value} 
            onChange={onChange} 
            onClose={() => setIsOpen(false)} 
            position={position} 
          />
        </div>,
        document.body
      )}
    </div>
  );
};

const MiniTimePicker = ({ value, onChange, onClose, position }) => {
  const [hour, setHour] = useState(() => {
    const parts = (value || '12:00').split(':');
    return parts[0] || '12';
  });
  const [minute, setMinute] = useState(() => {
    const parts = (value || '12:00').split(':');
    return parts[1] || '00';
  });

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const handleSelectHour = (h) => {
    setHour(h);
    onChange(`${h}:${minute}`);
  };

  const handleSelectMinute = (m) => {
    setMinute(m);
    onChange(`${hour}:${m}`);
  };

  return (
    <div 
      className="absolute bg-white border border-amber-200 rounded-2xl shadow-xl p-3 z-50 w-[160px] animate-fade-in flex flex-col"
      style={{
        top: position.top,
        left: position.left,
        fontFamily: 'sans-serif'
      }}
    >
      <div className="flex justify-between items-center border-b border-amber-100 pb-2 mb-2">
        <span className="text-[11px] font-bold text-gray-700">Select Time</span>
        <button type="button" onClick={onClose} className="text-[10px] font-bold text-amber-800 hover:underline cursor-pointer">Done</button>
      </div>

      <div className="flex gap-2 h-[150px]">
        {/* Hours list */}
        <div className="flex-1 overflow-y-auto no-scrollbar border border-slate-100 rounded-xl p-1 bg-slate-50/50">
          <div className="text-[9px] font-bold text-gray-400 uppercase text-center mb-1 sticky top-0 bg-slate-50">Hr</div>
          {hours.map(h => {
            const isSelected = h === hour;
            return (
              <button
                key={h}
                type="button"
                onClick={() => handleSelectHour(h)}
                className={`w-full py-1 text-[11px] font-bold rounded-lg transition-all text-center mb-0.5 cursor-pointer ${
                  isSelected ? 'bg-amber-600 text-white shadow-sm' : 'hover:bg-amber-50 text-gray-700'
                }`}
              >
                {h}
              </button>
            );
          })}
        </div>

        {/* Minutes list */}
        <div className="flex-1 overflow-y-auto no-scrollbar border border-slate-100 rounded-xl p-1 bg-slate-50/50">
          <div className="text-[9px] font-bold text-gray-400 uppercase text-center mb-1 sticky top-0 bg-slate-50">Min</div>
          {minutes.map(m => {
            const isSelected = m === minute;
            return (
              <button
                key={m}
                type="button"
                onClick={() => handleSelectMinute(m)}
                className={`w-full py-1 text-[11px] font-bold rounded-lg transition-all text-center mb-0.5 cursor-pointer ${
                  isSelected ? 'bg-amber-600 text-white shadow-sm' : 'hover:bg-amber-50 text-gray-700'
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const TimeInput = ({ value, onChange, placeholder, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const handleOpen = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: Math.min(rect.left + window.scrollX, window.innerWidth - 180)
      });
      setIsOpen(true);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target) && !e.target.closest('.mini-time-portal')) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        readOnly
        value={value}
        onClick={handleOpen}
        placeholder={placeholder}
        className="w-full rounded-xl px-3.5 py-2 text-[12.5px] font-bold border outline-none bg-slate-50/70 cursor-pointer transition-all pr-9 text-slate-800"
        style={{ borderColor: error ? '#EF4444' : '#E2E8F0' }}
      />
      <div 
        onClick={handleOpen}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer pointer-events-none"
      >
        <Clock size={15} />
      </div>

      {isOpen && createPortal(
        <div className="mini-time-portal">
          <MiniTimePicker 
            value={value} 
            onChange={onChange} 
            onClose={() => setIsOpen(false)} 
            position={position} 
          />
        </div>,
        document.body
      )}
    </div>
  );
};

const CreateShradhanjaliPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const { addObituary, updateObituary, obituaries, currentUser } = useData();
  const [step, setStep] = useState(1);

  const communityId = useMemo(() => {
    const comName = currentUser?.community;
    return comName ? comName.toLowerCase().replace(/\s/g, '_') : 'cm_123';
  }, [currentUser]);

  const settings = useMemo(() => {
    const saved = localStorage.getItem(`community_settings_${communityId}`);
    const defaults = {
      enabled: true,
      memberSubmissionEnabled: true,
      requireApproval: true,
      fieldConfig: {
        ceremonyType: { enabled: true, label: 'Ceremony Type' },
        date: { enabled: true, label: 'Date' },
        time: { enabled: true, label: 'Time' },
        venueAddress: { enabled: true, label: 'Venue Address' },
        showLocation: { enabled: true, label: 'Show Location' }
      }
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.shradhanjali) {
          return {
            ...defaults,
            ...parsed.shradhanjali,
            fieldConfig: {
              ...defaults.fieldConfig,
              ...(parsed.shradhanjali.fieldConfig || {})
            }
          };
        }
      } catch (e) {}
    }
    return defaults;
  }, [communityId]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [isPosting, setIsPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const fileInputRef = useRef(null);
  const [showCeremonyPicker, setShowCeremonyPicker] = useState(false);

  const obituaryToEdit = isEditMode ? obituaries.find(o => o.id === id) : null;

  useEffect(() => {
    if (isEditMode && obituaryToEdit) {
      const existingCeremonies = (obituaryToEdit.ceremonies && obituaryToEdit.ceremonies.length > 0)
        ? obituaryToEdit.ceremonies
        : (obituaryToEdit.funeralDetails ? [obituaryToEdit.funeralDetails] : [{ type: 'Funeral / Last Rites', date: '', time: '', venue: '' }]);

      setForm({
        photoUrl: obituaryToEdit.image || '',
        photoFile: null,
        prefix: obituaryToEdit.prefix || 'Late Smt',
        deceasedName: obituaryToEdit.deceasedNameEn || obituaryToEdit.deceasedName.replace(obituaryToEdit.prefix, '').trim(),
        age: obituaryToEdit.age?.toString() || '',
        birthDate: obituaryToEdit.birthDate || '',
        dateOfPassing: obituaryToEdit.dateOfPassing || '',
        ritesType: existingCeremonies[0]?.type || 'Funeral / Last Rites',
        ritesDate: existingCeremonies[0]?.date || '',
        ritesTime: existingCeremonies[0]?.time || '',
        ritesVenue: existingCeremonies[0]?.venue || '',
        ceremonies: existingCeremonies,
        showLocation: true,
        message: obituaryToEdit.message || '',
        privacy: obituaryToEdit.privacy || 'public',
        familyContact: obituaryToEdit.familyContact || '',
        relation: obituaryToEdit.author?.relation || 'Son/Daughter',
      });
    }
  }, [id, obituaryToEdit, isEditMode]);

  useEffect(() => {
    if (showCeremonyPicker !== false && showCeremonyPicker !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showCeremonyPicker]);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: '' }));
  };

  // ── Validation per step ──
  const validateStep = () => {
    const newErrors = {};
    if (step === 1) {
      if (!form.photoUrl) newErrors.photoUrl = 'Please upload a photo';
    }
    if (step === 2) {
      if (!form.deceasedName.trim()) newErrors.deceasedName = 'Full name is required';
      if (!form.dateOfPassing) newErrors.dateOfPassing = 'Date of passing is required';
    }
    if (step === 3) {
      const dateConfig = settings.fieldConfig?.date || { enabled: true };
      const venueAddressConfig = settings.fieldConfig?.venueAddress || { enabled: true };

      const activeCeremonies = form.ceremonies && form.ceremonies.length > 0
        ? form.ceremonies
        : [{ type: form.ritesType, date: form.ritesDate, time: form.ritesTime, venue: form.ritesVenue }];

      if (dateConfig.enabled && !activeCeremonies[0]?.date) newErrors.ritesDate = 'Primary ceremony date is required';
      if (venueAddressConfig.enabled && !activeCeremonies[0]?.venue?.trim()) newErrors.ritesVenue = 'Primary ceremony venue is required';
    }
    if (step === 4) {
      if (!form.message.trim()) newErrors.message = 'Message is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep(s => Math.min(s + 1, 4));
  };

  const handleBack = () => {
    if (step === 1) { navigate(-1); return; }
    setStep(s => Math.max(s - 1, 1));
  };

  // ── Photo upload handler ──
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setForm(f => ({ ...f, photoUrl: url, photoFile: file }));
    setErrors(e => ({ ...e, photoUrl: '' }));
  };

  // ── Final post submit ──
  const handlePost = async () => {
    if (isPosting) return;
    setIsPosting(true);

    const activeCeremonies = form.ceremonies && form.ceremonies.length > 0
      ? form.ceremonies
      : [{ type: form.ritesType, date: form.ritesDate, time: form.ritesTime, venue: form.ritesVenue }];

    const formData = new FormData();
    formData.append('prefix', form.prefix);
    formData.append('deceasedName', form.deceasedName);
    formData.append('age', form.age);
    formData.append('birthDate', form.birthDate);
    formData.append('dateOfPassing', form.dateOfPassing);
    formData.append('ritesType', activeCeremonies[0]?.type || form.ritesType);
    formData.append('ritesDate', activeCeremonies[0]?.date || form.ritesDate);
    formData.append('ritesTime', activeCeremonies[0]?.time || form.ritesTime);
    formData.append('ritesVenue', activeCeremonies[0]?.venue || form.ritesVenue);
    formData.append('ceremonies', JSON.stringify(activeCeremonies));
    formData.append('message', form.message);
    formData.append('privacy', form.privacy);
    formData.append('familyContact', form.familyContact);
    formData.append('relation', form.relation);

    if (form.photoFile) {
      formData.append('image', form.photoFile);
    } else if (isEditMode) {
      formData.append('existingImage', form.photoUrl);
    }

    try {
      if (isEditMode) {
        await updateObituary(id, formData);
      } else {
        await addObituary(formData);
      }
      setIsPosting(false);
      setPosted(true);
      setTimeout(() => navigate('/member/shradhanjali', { replace: true }), 2000);
    } catch (error) {
      console.error('Error submitting tribute:', error);
      setIsPosting(false);
      alert('Error submitting tribute: ' + (error.response?.data?.message || error.message));
    }
  };

  // ── Step content renderers ──

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center space-y-0.5">
        <h2 className="text-[15px] font-extrabold text-slate-800 tracking-tight">Upload Photo</h2>
        <p className="text-[11px] font-medium text-slate-400">Use a clear and high-quality photo of deceased</p>
      </div>

      {form.photoUrl ? (
        <div className="relative rounded-2xl overflow-hidden shadow-sm max-h-[300px] w-full flex items-center justify-center">
          <img src={form.photoUrl} alt="preview" className="w-full h-auto max-h-[300px] object-contain rounded-2xl bg-slate-100" />
          {/* Remove */}
          <button
            onClick={() => setForm(f => ({ ...f, photoUrl: '', photoFile: null }))}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center press-scale z-10"
          >
            <X size={13} />
          </button>
          {/* Om badge preview */}
          <div
            className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold z-10"
            style={{ background: 'rgba(20,12,0,0.75)', color: '#D4AF37' }}
          >
            🪔 Om Shanti
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2.5 py-8 press-scale transition-all"
          style={{ borderColor: errors.photoUrl ? '#EF4444' : 'rgba(212,175,55,0.4)', background: 'rgba(212,175,55,0.03)' }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(124,92,46,0.1) 0%, rgba(212,175,55,0.15) 100%)' }}
          >
            <Upload size={22} style={{ color: '#7C5C2E' }} />
          </div>
          <div className="text-center">
            <p className="text-[13.5px] font-extrabold" style={{ color: '#7C5C2E' }}>Upload Photo</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Please select a clear photo</p>
          </div>
          <div
            className="px-3.5 py-1.5 rounded-full text-[11.5px] font-extrabold text-white shadow-xs"
            style={{ background: 'linear-gradient(135deg, #7C5C2E 0%, #D4AF37 100%)' }}
          >
            Choose Photo
          </div>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelect}
      />

      {errors.photoUrl && (
        <p className="text-[11px] text-red-500 text-center font-bold">{errors.photoUrl}</p>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4 text-left">
      <div className="text-center space-y-0.5">
        <h2 className="text-[15px] font-extrabold text-slate-800 tracking-tight">Basic Information</h2>
        <p className="text-[11px] font-medium text-slate-400">Enter details of the deceased</p>
      </div>

      {/* Prefix selector */}
      <div>
        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Prefix</label>
        <div className="flex flex-wrap gap-1.5">
          {PREFIXES.map(p => (
            <button
              key={p || 'none'}
              onClick={() => set('prefix', p)}
              className="px-3 py-1 rounded-xl text-[11px] font-extrabold border transition-all press-scale"
              style={{
                background: form.prefix === p ? '#7C5C2E' : 'white',
                color: form.prefix === p ? 'white' : '#475569',
                borderColor: form.prefix === p ? '#7C5C2E' : '#E2E8F0'
              }}
            >
              {p || 'None'}
            </button>
          ))}
        </div>
      </div>

      {/* Full Name */}
      <div>
        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
          Full Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.deceasedName}
          onChange={e => set('deceasedName', e.target.value)}
          placeholder="e.g. Kamla Devi Agrawal"
          className="w-full rounded-xl px-3.5 py-2 text-[12.5px] font-bold border outline-none transition-all text-slate-800"
          style={{
            borderColor: errors.deceasedName ? '#EF4444' : form.deceasedName ? 'rgba(212,175,55,0.5)' : '#E2E8F0',
            background: '#F8FAFC'
          }}
        />
        {errors.deceasedName && <p className="text-[11px] text-red-500 font-bold mt-1">{errors.deceasedName}</p>}
        {/* Preview */}
        {form.deceasedName && (
          <p className="text-[11px] text-slate-400 font-medium mt-1">
            Preview: <span className="font-extrabold text-slate-700">{form.prefix} {form.deceasedName}</span>
          </p>
        )}
      </div>

      {/* Age + Relation */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Age</label>
          <input
            type="number"
            value={form.age}
            onChange={e => set('age', e.target.value)}
            placeholder="e.g. 82"
            className="w-full rounded-xl px-3.5 py-2 text-[12.5px] font-bold border outline-none bg-slate-50/70 transition-all text-slate-800"
            style={{ borderColor: '#E2E8F0' }}
          />
        </div>
        <div>
          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Relation</label>
          <input
            type="text"
            value={form.relation}
            onChange={e => set('relation', e.target.value)}
            placeholder="Son / Daughter"
            className="w-full rounded-xl px-3.5 py-2 text-[12.5px] font-bold border outline-none bg-slate-50/70 transition-all text-slate-800"
            style={{ borderColor: '#E2E8F0' }}
          />
        </div>
      </div>

      {/* Birth + Death dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1"><CalendarDays size={10} /> Date of Birth</span>
          </label>
          <CalendarInput
            value={form.birthDate}
            onChange={val => set('birthDate', val)}
            placeholder="YYYY-MM-DD"
          />
        </div>
        <div>
          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1"><CalendarDays size={10} /> Date of Passing <span className="text-red-400">*</span></span>
          </label>
          <CalendarInput
            value={form.dateOfPassing}
            onChange={val => set('dateOfPassing', val)}
            placeholder="YYYY-MM-DD"
            error={errors.dateOfPassing}
          />
          {errors.dateOfPassing && <p className="text-[11px] text-red-500 font-bold mt-1">{errors.dateOfPassing}</p>}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => {
    const ceremonyTypeConfig = settings.fieldConfig?.ceremonyType || { enabled: true, label: 'Ceremony Type' };
    const dateConfig = settings.fieldConfig?.date || { enabled: true, label: 'Date' };
    const timeConfig = settings.fieldConfig?.time || { enabled: true, label: 'Time' };
    const venueAddressConfig = settings.fieldConfig?.venueAddress || { enabled: true, label: 'Venue Address' };
    const showLocationConfig = settings.fieldConfig?.showLocation || { enabled: true, label: 'Show Location' };

    return (
      <div className="space-y-5">
        <div className="text-center space-y-0.5">
          <h2 className="text-[15px] font-extrabold text-slate-800 tracking-tight">Ceremony Details</h2>
          <p className="text-[11px] font-medium text-slate-400">Enter details of the last rites</p>
        </div>

        {/* Dynamic Ceremonies Block List */}
        <div className="space-y-4 text-left">
          {(form.ceremonies || []).map((c, index) => (
            <div key={index} className="p-3.5 bg-amber-50/40 rounded-2xl border border-amber-200/60 space-y-3 relative">
              <div className="flex items-center justify-between border-b border-amber-100 pb-1.5">
                <span className="text-[10px] font-black uppercase text-amber-900/70 tracking-wider">
                  Ceremony #{index + 1}
                </span>
                {form.ceremonies.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = form.ceremonies.filter((_, i) => i !== index);
                      setForm(f => ({ ...f, ceremonies: updated }));
                    }}
                    className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                    title="Remove Ceremony"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* Type selector */}
              {ceremonyTypeConfig.enabled && (
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                    {ceremonyTypeConfig.label}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCeremonyPicker(index)}
                    className="w-full flex items-center justify-between rounded-xl px-3.5 py-2 text-[12.5px] font-bold border outline-none bg-white transition-all text-left text-slate-800"
                    style={{ borderColor: 'rgba(212,175,55,0.4)' }}
                  >
                    <span>{c.type || 'Select Type'}</span>
                    <ChevronDown size={15} className="text-slate-400 shrink-0" />
                  </button>
                </div>
              )}

              {/* Date + Time */}
              {(dateConfig.enabled || timeConfig.enabled) && (
                <div className="grid grid-cols-2 gap-2.5">
                  {dateConfig.enabled && (
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                        <span className="flex items-center gap-1"><CalendarDays size={10} /> {dateConfig.label} {index === 0 && <span className="text-red-400">*</span>}</span>
                      </label>
                      <CalendarInput
                        value={c.date}
                        onChange={val => {
                          const updated = [...form.ceremonies];
                          updated[index] = { ...updated[index], date: val };
                          setForm(f => ({ ...f, ceremonies: updated, ritesDate: updated[0].date }));
                        }}
                        placeholder="YYYY-MM-DD"
                        error={index === 0 && errors.ritesDate}
                      />
                      {index === 0 && errors.ritesDate && <p className="text-[11px] text-red-500 font-bold mt-1">{errors.ritesDate}</p>}
                    </div>
                  )}
                  {timeConfig.enabled && (
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                        <span className="flex items-center gap-1"><Clock size={10} /> {timeConfig.label}</span>
                      </label>
                      <TimeInput
                        value={c.time}
                        onChange={val => {
                          const updated = [...form.ceremonies];
                          updated[index] = { ...updated[index], time: val };
                          setForm(f => ({ ...f, ceremonies: updated, ritesTime: updated[0].time }));
                        }}
                        placeholder="Select time"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Venue */}
              {venueAddressConfig.enabled && (
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                    <span className="flex items-center gap-1"><MapPin size={10} /> {venueAddressConfig.label} {index === 0 && <span className="text-red-400">*</span>}</span>
                  </label>
                  <input
                    type="text"
                    value={c.venue}
                    onChange={e => {
                      const updated = [...form.ceremonies];
                      updated[index] = { ...updated[index], venue: e.target.value };
                      setForm(f => ({ ...f, ceremonies: updated, ritesVenue: updated[0].venue }));
                    }}
                    placeholder="e.g. Swarg Mandir, M.G. Road, Indore"
                    className="w-full rounded-xl px-3.5 py-2 text-[12.5px] font-bold border outline-none bg-white transition-all text-slate-800"
                    style={{ borderColor: index === 0 && errors.ritesVenue ? '#EF4444' : '#E2E8F0' }}
                  />
                  {index === 0 && errors.ritesVenue && <p className="text-[11px] text-red-500 font-bold mt-1">{errors.ritesVenue}</p>}
                </div>
              )}
            </div>
          ))}

          {/* Add Another Ceremony Button */}
          <button
            type="button"
            onClick={() => {
              const updated = [
                ...(form.ceremonies || []),
                { type: 'Funeral / Last Rites', date: '', time: '', venue: '' }
              ];
              setForm(f => ({ ...f, ceremonies: updated }));
            }}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-50 text-amber-800 text-[11.5px] font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer press-scale"
          >
            <Plus size={15} /> + Add Another Ceremony (कार्यक्रम जोड़े)
          </button>
        </div>

        {/* Ceremony type bottom-sheet picker */}
        {createPortal(
          <AnimatePresence>
            {showCeremonyPicker !== false && showCeremonyPicker !== null && (
              <motion.div
                key="ceremony-picker"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-end justify-center"
                style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', touchAction: 'none' }}
                onClick={() => setShowCeremonyPicker(null)}
                onWheel={e => e.stopPropagation()}
                onTouchMove={e => e.stopPropagation()}
              >
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 36 }}
                  className="w-full max-w-md rounded-t-[28px] overflow-hidden bg-white shadow-2xl pb-6"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Handle */}
                  <div className="flex justify-center pt-3 pb-1">
                    <div className="w-12 h-1.5 rounded-full bg-slate-200" />
                  </div>

                  {/* Title */}
                  <div
                    className="flex items-center justify-between px-5 py-3 border-b"
                    style={{ borderColor: 'rgba(212,175,55,0.15)' }}
                  >
                    <h3 className="text-[15px] font-extrabold" style={{ color: '#7C5C2E' }}>Select Ceremony Type</h3>
                    <button
                      type="button"
                      onClick={() => setShowCeremonyPicker(null)}
                      className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center press-scale hover:bg-slate-200 transition-colors"
                    >
                      <X size={14} className="text-slate-500" />
                    </button>
                  </div>

                  {/* Options list */}
                  <div className="p-4 space-y-2">
                    {CEREMONY_TYPES.map((type, idx) => {
                      const activeIndex = typeof showCeremonyPicker === 'number' ? showCeremonyPicker : 0;
                      const isSelected = form.ceremonies?.[activeIndex]?.type === type;
                      return (
                        <motion.button
                          key={type}
                          type="button"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          onClick={() => {
                            const updated = [...(form.ceremonies || [])];
                            if (updated[activeIndex]) {
                              updated[activeIndex] = { ...updated[activeIndex], type };
                            }
                            setForm(f => ({ ...f, ceremonies: updated, ritesType: updated[0]?.type || type }));
                            setShowCeremonyPicker(null);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-all press-scale ${
                            isSelected
                              ? 'bg-amber-50/90 border-amber-300/80 text-[#7C5C2E] shadow-sm'
                              : 'bg-slate-50/60 border-slate-200/60 text-slate-700 hover:bg-slate-100/60'
                          }`}
                        >
                          <span className="text-[13.5px] font-bold">
                            {type}
                          </span>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            >
                              <CheckCircle2 size={18} className="text-[#7C5C2E] shrink-0" />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
            </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      </div>
    );
  };

  const renderStep4 = () => (
    <div className="space-y-4 text-left">
      <div className="text-center space-y-0.5">
        <h2 className="text-[15px] font-extrabold text-slate-800 tracking-tight">Write Message</h2>
        <p className="text-[11px] font-medium text-slate-400">Condolence message & privacy settings</p>
      </div>

      {/* Tribute message */}
      <div>
        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
          Condolence Message <span className="text-red-400">*</span>
        </label>
        <textarea
          value={form.message}
          onChange={e => set('message', e.target.value)}
          rows={3}
          maxLength={300}
          placeholder="Write a message of remembrance..."
          className="w-full rounded-xl px-3.5 py-2.5 text-[12.5px] font-medium border outline-none bg-slate-50/70 resize-none transition-all text-slate-800"
          style={{ borderColor: errors.message ? '#EF4444' : form.message ? 'rgba(212,175,55,0.4)' : '#E2E8F0' }}
        />
        <div className="flex justify-between mt-1">
          {errors.message && <p className="text-[11px] text-red-500 font-bold">{errors.message}</p>}
          <span className="text-[10.5px] text-slate-400 font-extrabold ml-auto">{form.message.length}/300</span>
        </div>
      </div>

      {/* Family contact */}
      <div>
        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
          <span className="flex items-center gap-1"><Phone size={10} /> Family Contact Number</span>
        </label>
        <input
          type="tel"
          value={form.familyContact}
          onChange={e => set('familyContact', e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="9876543210"
          maxLength={10}
          className="w-full rounded-xl px-3.5 py-2 text-[12.5px] font-bold border outline-none bg-slate-50/70 transition-all text-slate-800"
          style={{ borderColor: '#E2E8F0' }}
        />
      </div>
    </div>
  );

  const renderReview = () => {
    const fullName = `${form.prefix} ${form.deceasedName}`.trim();
    return (
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-[18px] font-bold text-gray-900">Review Post</h2>
          <p className="text-[13px] text-gray-500">Check details before posting</p>
        </div>

        {/* Preview card */}
        <div
          className="rounded-2xl overflow-hidden border"
          style={{ borderColor: 'rgba(212,175,55,0.2)' }}
        >
          {/* Photo preview */}
          {form.photoUrl && (
            <div className="relative h-[200px]">
              <FullImage src={form.photoUrl} alt="preview" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
              <div
                className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold"
                style={{ background: 'rgba(20,12,0,0.75)', color: '#D4AF37' }}
              >
                🪔 Om Shanti
              </div>
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                <p className="text-white text-[18px] font-bold" style={{ fontFamily: 'Outfit, serif' }}>{fullName}</p>
                <p className="text-[12px]" style={{ color: 'rgba(212,175,55,0.9)' }}>
                  {form.age && `Age: ${form.age} Years`} {form.dateOfPassing && `• Passing: ${new Date(form.dateOfPassing).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                </p>
              </div>
            </div>
          )}

          <div className="p-4 space-y-3" style={{ background: '#FFFBF5' }}>
            {/* Message */}
            {form.message && (
              <p className="text-[13px] text-gray-700 italic leading-relaxed">
                "{form.message}"
              </p>
            )}

            {/* Ceremony details */}
            {form.ritesDate && (
              <div
                className="rounded-xl p-3 border text-[12px] space-y-1"
                style={{ background: 'rgba(212,175,55,0.06)', borderColor: 'rgba(212,175,55,0.2)' }}
              >
                <p className="font-bold" style={{ color: '#7C5C2E' }}>{form.ritesType}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-gray-600 mt-2">
                  {form.ritesDate && <span className="flex items-center gap-1"><CalendarDays size={12} className="text-amber-700" /> {form.ritesDate}</span>}
                  {form.ritesTime && <span className="flex items-center gap-1"><Clock size={12} className="text-amber-700" /> {form.ritesTime}</span>}
                  {form.ritesVenue && <span className="flex items-center gap-1"><MapPin size={12} className="text-amber-700" /> {form.ritesVenue}</span>}
                </div>
              </div>
            )}

            {/* Family contact */}
            {form.familyContact && (
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <Phone size={12} />
                <span>{form.familyContact}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const STEP_CONTENT = {
    1: renderStep1,
    2: renderStep2,
    3: renderStep3,
    4: renderStep4,
  };

  // ── Posted Success Screen ──
  if (posted) {
    return (
      <AnimatedPage>
        <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="text-[72px]"
          >
            🪔
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-[22px] font-bold text-gray-900 mb-2">Condolence Post Published</h2>
            <p className="text-[14px] text-gray-500">May their soul rest in peace 🙏</p>
          </motion.div>
        </div>
      </AnimatedPage>
    );
  }

  const isLeadOrAdmin = ['head', 'admin'].includes(currentUser?.role);
  const isSubmissionBlocked = !isEditMode && !settings.memberSubmissionEnabled && !isLeadOrAdmin;

  if (!settings.enabled || isSubmissionBlocked) {
    return (
      <AnimatedPage>
        <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-8 text-center">
          <span className="text-[64px]">🚫</span>
          <h2 className="text-[20px] font-bold text-gray-900">Submission Disabled</h2>
          <p className="text-[14px] text-gray-500 max-w-sm">
            {!settings.enabled 
              ? 'The condolences portal has been disabled by your Samaj Adhyaksh.' 
              : 'Obituary submission has been disabled by the Community Administrator.'}
          </p>
          <button 
            onClick={() => navigate('/member/shradhanjali')}
            className="mt-2 px-6 py-2.5 rounded-xl text-[13px] font-bold text-white press-scale"
            style={{ background: '#7C5C2E' }}
          >
            Go back to Tributes
          </button>
        </div>
      </AnimatedPage>
    );
  }

  const isReview = step === 4 && form.deceasedName;

  return (
    <AnimatedPage>
      {/* ─── Header ─── */}
      <div
        className="responsive-fixed-top z-40 border-b"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(24px)',
          borderColor: 'rgba(212,175,55,0.25)',
          boxShadow: '0 2px 14px rgba(124,92,46,0.04)',
          paddingTop: 'var(--spacing-safe-top)'
        }}
      >
        <div className="flex items-center justify-between gap-3 h-14 px-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBack} 
              className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-amber-50 transition-colors press-scale"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="text-left">
              <h1 className="text-[16px] font-extrabold tracking-tight" style={{ color: '#7C5C2E' }}>Create Condolence Post</h1>
              <p className="text-[10px] font-extrabold text-amber-900/60 uppercase tracking-wider">Shradhanjali Portal</p>
            </div>
          </div>
          <span className="text-[11px] font-black text-amber-800 bg-amber-50 border border-amber-200/60 px-3 py-1 rounded-full uppercase tracking-wider">
            Step {step}/4
          </span>
        </div>

        {/* Step wizard */}
        <div className="px-4 pb-2.5">
          <StepWizard currentStep={step} />
        </div>
      </div>

      {/* ─── Form content ─── */}
      <div className="pt-[116px] pb-28 px-4 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            {/* Step content or review */}
            {step < 4
              ? STEP_CONTENT[step]?.()
              : (
                <div className="space-y-5">
                  {renderReview()}
                  {renderStep4()}
                </div>
              )
            }
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── Bottom CTA ─── */}
      <div
        className="responsive-fixed-bottom z-40 px-4 py-4 border-t"
        style={{
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(16px)',
          borderColor: 'rgba(212,175,55,0.15)',
          paddingBottom: 'calc(var(--spacing-safe-bottom) + 16px)'
        }}
      >
        {step < 4 ? (
          <button
            onClick={handleNext}
            className="w-full py-3 rounded-xl font-extrabold text-[13.5px] text-white flex items-center justify-center gap-2 press-scale shadow-md"
            style={{
              background: 'linear-gradient(135deg, #7C5C2E 0%, #D4AF37 100%)',
              boxShadow: '0 4px 16px rgba(124,92,46,0.3)'
            }}
          >
            Proceed
            <ArrowRight size={16} />
          </button>
        ) : (
          <div className="flex gap-2.5">
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3 rounded-xl font-extrabold text-[13px] border press-scale"
              style={{ borderColor: 'rgba(124,92,46,0.3)', color: '#7C5C2E' }}
            >
              Back
            </button>
            <button
              onClick={handlePost}
              disabled={isPosting}
              className="flex-2 flex-[2] py-3 rounded-xl font-extrabold text-[13.5px] text-white flex items-center justify-center gap-2 press-scale disabled:opacity-70 shadow-md"
              style={{
                background: 'linear-gradient(135deg, #7C5C2E 0%, #D4AF37 100%)',
                boxShadow: '0 4px 16px rgba(124,92,46,0.3)'
              }}
            >
              {isPosting ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="inline-block"
                  >
                    🪔
                  </motion.span>
                  Publishing...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Publish Post
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </AnimatedPage>
  );
};

export default CreateShradhanjaliPage;
