import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, Camera, MapPin, Shield, Calendar, Globe, Phone, Mail, 
  Save, Loader, CheckCircle, AlertCircle, ArrowLeft, Crown,
  MessageCircle, ChevronDown, X, Upload, Home, ChevronRight
} from 'lucide-react';
import { FaFacebook, FaLinkedin } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useHeadAuth } from '../../auth/useHeadAuth';
import { axiosPrivate } from '../../../../core/api/axiosPrivate';
import { authService } from '../../../../core/auth/authService';



// ── Indian States ──
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh'
];

// ── Toast Notification ──
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl animate-slide-in-right ${
      type === 'success' 
        ? 'bg-emerald-500/95 border-emerald-400/40 text-white' 
        : 'bg-red-500/95 border-red-400/40 text-white'
    }`}>
      {type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
      <span className="text-sm font-semibold">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
};

// ── Input Field Component ──
const FormField = ({ label, icon: Icon, children, hint }) => (
  <div className="space-y-1">
    <label className="flex items-center gap-1.5 text-[12px] sm:text-[13px] font-bold text-slate-700">
      {Icon && <Icon size={13} className="text-purple-500 shrink-0" />}
      <span>{label}</span>
    </label>
    {children}
    {hint && <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium pl-0.5">{hint}</p>}
  </div>
);

// ── Live Preview Card ──
const LeadershipPreviewCard = ({ formData }) => (
  <div className="relative w-full rounded-2xl sm:rounded-[22px] overflow-hidden shadow-md" style={{ background: 'linear-gradient(135deg, #120b32 0%, #1e1145 50%, #2e1a6c 100%)' }}>
    <div className="relative z-10 p-3.5 sm:p-5">
      <div className="flex items-center gap-3.5 sm:gap-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-amber-400/50 overflow-hidden bg-purple-900/50 shrink-0 shadow-lg">
          {formData.avatar ? (
            <img src={formData.avatar} className="w-full h-full object-cover" alt="Preview" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/60">
              <User size={24} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-white text-[16px] sm:text-[18px] font-extrabold tracking-tight leading-tight truncate">
            {formData.name || 'Your Name'}
          </h4>
          <p className="text-purple-200/80 text-[11.5px] sm:text-[12.5px] font-semibold mt-1 flex items-center gap-1.5 truncate">
            <MapPin size={12} className="text-purple-300 shrink-0" />
            <span className="truncate">{formData.city || 'City'}, {formData.state || 'State'} • {formData.termYears || '2024-2027'}</span>
          </p>
        </div>
      </div>
      {formData.bio && (
        <p className="text-purple-200/70 text-[11px] sm:text-[12px] font-medium mt-2.5 sm:mt-3 line-clamp-2 italic">
          "{formData.bio}"
        </p>
      )}
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════════
// ██   MAIN COMPONENT: HeadProfileSettings
// ════════════════════════════════════════════════════════════════════
const HeadProfileSettings = () => {
  const navigate = useNavigate();
  const { headAuth, updateHeadUser } = useHeadAuth();
  const headUser = headAuth?.headUser;

  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', bio: '',
    designation: '', city: '', state: '', termYears: '',
    avatar: '', cover: '',
    socialLinks: { facebook: '', twitter: '', linkedin: '', whatsapp: '' }
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);

  // ── Load current user data from server ──
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const res = await axiosPrivate.get('/auth/me');
        const user = res.data?.user || res.data;
        if (user) {
          const rawDes = user.designation || headUser?.designation;
          const resolvedName = (user.name && !user.name.toLowerCase().includes('dummy')) ? user.name : (headUser?.name || user.name || '');
          const resolvedPhone = (user.phone && user.phone !== '5656565656') ? user.phone : (headUser?.phone || user.phone || '');

          setFormData({
            name: resolvedName,
            phone: resolvedPhone,
            email: user.email || headUser?.email || '',
            bio: user.bio || headUser?.bio || '',
            designation: (!rawDes || rawDes.toLowerCase() === 'member') ? 'Community Head' : rawDes,
            city: user.city || headUser?.city || '',
            state: user.state || headUser?.state || '',
            termYears: user.termYears || headUser?.termYears || '',
            avatar: user.avatar || headUser?.avatar || '',
            cover: user.cover || headUser?.cover || '',
            socialLinks: {
              facebook: user.socialLinks?.facebook || user.facebook || headUser?.socialLinks?.facebook || '',
              twitter: user.socialLinks?.twitter || user.twitter || headUser?.socialLinks?.twitter || '',
              linkedin: user.socialLinks?.linkedin || user.linkedin || headUser?.socialLinks?.linkedin || '',
              whatsapp: user.socialLinks?.whatsapp || headUser?.socialLinks?.whatsapp || ''
            }
          });
        }
      } catch (err) {
        // Fallback to cached headUser from context
        if (headUser) {
          const rawDes = headUser.designation;
          setFormData({
            name: headUser.name || '',
            phone: headUser.phone || '',
            email: headUser.email || '',
            bio: headUser.bio || '',
            designation: (!rawDes || rawDes.toLowerCase() === 'member') ? 'Community Head' : rawDes,
            city: headUser.city || '',
            state: headUser.state || '',
            termYears: headUser.termYears || '',
            avatar: headUser.avatar || '',
            cover: headUser.cover || '',
            socialLinks: {
              facebook: headUser.socialLinks?.facebook || headUser.facebook || '',
              twitter: headUser.socialLinks?.twitter || headUser.twitter || '',
              linkedin: headUser.socialLinks?.linkedin || headUser.linkedin || '',
              whatsapp: headUser.socialLinks?.whatsapp || ''
            }
          });
        }
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [headUser]);

  // ── Handle input changes ──
  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSocialChange = useCallback((platform, value) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [platform]: value }
    }));
  }, []);

  // ── Handle avatar file selection ──
  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // ── Save Profile ──
  const handleSave = async () => {
    if (!formData.name?.trim()) {
      setToast({ message: 'Name is required', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      let payload;

      if (avatarFile) {
        payload = new FormData();
        payload.append('avatarFile', avatarFile);
        payload.append('name', formData.name);
        payload.append('email', formData.email);
        payload.append('bio', formData.bio);
        payload.append('city', formData.city);
        payload.append('state', formData.state);
        payload.append('termYears', formData.termYears);
        payload.append('socialLinks', JSON.stringify(formData.socialLinks));
      } else {
        payload = {
          name: formData.name,
          email: formData.email,
          bio: formData.bio,
          city: formData.city,
          state: formData.state,
          termYears: formData.termYears,
          socialLinks: formData.socialLinks,
          avatar: formData.avatar
        };
      }

      const result = await authService.updateProfile(payload);

      // Update local storage and auth context state so sidebar and UI reflect changes immediately
      if (result?.user || result?._id) {
        const updatedUser = result.user || result;
        if (updateHeadUser) {
          updateHeadUser(updatedUser);
        } else {
          const storedUser = JSON.parse(localStorage.getItem('head_auth_user') || '{}');
          const merged = { ...storedUser, ...updatedUser };
          localStorage.setItem('head_auth_user', JSON.stringify(merged));
        }
      }

      setAvatarFile(null);
      setToast({ message: 'Profile updated successfully! Leadership section me changes reflect honge.', type: 'success' });
    } catch (err) {
      console.error('Profile update failed:', err);
      setToast({ message: err.message || 'Failed to update profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // ── Loading State ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader className="animate-spin text-purple-600" size={28} />
          <p className="text-sm text-slate-500 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  const inputClass = "w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white border border-slate-200 text-[13px] sm:text-sm text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all";
  const selectClass = `${inputClass} appearance-none cursor-pointer`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-50 pb-28 sm:pb-12">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Header (Web View Only) ── */}
      <div className="hidden md:block sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-xs">
        <div className="max-w-3xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button 
              onClick={() => navigate('/head/dashboard')} 
              className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              <ArrowLeft size={17} />
            </button>
            <div className="min-w-0">
              <h1 className="text-[15px] sm:text-[17px] font-black text-slate-800 tracking-tight leading-tight truncate">My Profile</h1>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-semibold truncate">Edit your leadership details</p>
            </div>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-[11.5px] sm:text-[13px] font-bold shadow-md shadow-purple-500/20 hover:shadow-purple-500/30 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed border border-purple-500/20 shrink-0 whitespace-nowrap cursor-pointer"
          >
            {saving ? <Loader size={13} className="animate-spin" /> : <Save size={13} />}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-1 sm:px-4 md:px-6 pt-2 sm:pt-4 space-y-3.5 sm:space-y-5">

        {/* ── Live Preview ── */}
        <div>
          <LeadershipPreviewCard formData={formData} />
        </div>

        {/* ── App Mode Segmented Toggle Switch (Clean & Aesthetic) ── */}
        <div className="bg-slate-200/70 p-1 rounded-2xl flex items-center gap-1 border border-slate-350/40 shadow-inner">
          {/* Active: Head Panel */}
          <div 
            className="flex-1 py-2 sm:py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-[13px] font-black text-white shadow-md cursor-default select-none"
            style={{
              background: 'linear-gradient(135deg, #180d45 0%, #291361 100%)',
              boxShadow: '0 2px 8px rgba(24, 13, 69, 0.35)'
            }}
          >
            <Crown size={14} className="text-amber-400 fill-amber-400 shrink-0" />
            <span>Head Panel</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
          </div>

          {/* Toggle to: Member App */}
          <button
            type="button"
            onClick={() => navigate('/member/home')}
            className="flex-1 py-2 sm:py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-[13px] font-bold text-slate-600 hover:text-purple-600 active:scale-95 transition-all cursor-pointer bg-white/80 hover:bg-white shadow-xs"
          >
            <Home size={14} className="text-slate-500 shrink-0" />
            <span>Member App</span>
          </button>
        </div>

        {/* ── Profile Photo Section ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
          <h3 className="text-[13px] sm:text-[14px] font-black text-slate-800 mb-3.5 sm:mb-4 flex items-center gap-2">
            <Camera size={15} className="text-purple-500" />
            Profile Photo
          </h3>
          <div className="flex items-center gap-3.5 sm:gap-5">
            <div className="relative group shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-purple-200 overflow-hidden bg-gradient-to-br from-purple-100 to-violet-100 shadow-inner">
                {formData.avatar ? (
                  <img src={formData.avatar} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-purple-400">
                    <User size={24} />
                  </div>
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full bg-purple-600 text-white flex items-center justify-center cursor-pointer shadow-lg hover:bg-purple-700 transition-colors border-2 border-white">
                <Upload size={11} />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarSelect} 
                />
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] sm:text-[13px] font-bold text-slate-700 truncate">अपनी प्रोफ़ाइल फोटो अपलोड करें</p>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 line-clamp-2">यह फोटो Leadership पेज और HomePage पर दिखेगी</p>
              {formData.avatar && (
                <button 
                  onClick={() => { setFormData(prev => ({ ...prev, avatar: '' })); setAvatarFile(null); }}
                  className="mt-1.5 text-[10.5px] text-red-500 font-bold hover:underline cursor-pointer"
                >
                  Remove Photo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Basic Details ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 space-y-3.5 sm:space-y-4">
          <h3 className="text-[13px] sm:text-[14px] font-black text-slate-800 flex items-center gap-2">
            <User size={15} className="text-purple-500" />
            Basic Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="Full Name" icon={User}>
              <input 
                type="text" value={formData.name} 
                onChange={e => handleChange('name', e.target.value)}
                placeholder="Enter your full name"
                className={inputClass}
              />
            </FormField>

            <FormField label="Phone Number" icon={Phone} hint="Phone cannot be changed">
              <input 
                type="text" value={formData.phone} 
                readOnly
                className={`${inputClass} bg-slate-50 text-slate-500 cursor-not-allowed`}
              />
            </FormField>

            <FormField label="Email" icon={Mail}>
              <input 
                type="email" value={formData.email} 
                onChange={e => handleChange('email', e.target.value)}
                placeholder="your@email.com"
                className={inputClass}
              />
            </FormField>

            <FormField label="Designation / पद" icon={Shield} hint="Designation is assigned based on system role">
              <input 
                type="text" 
                value={formData.designation || 'Community Head'} 
                readOnly
                className={`${inputClass} bg-slate-50 text-slate-500 cursor-not-allowed`}
              />
            </FormField>
          </div>

          <FormField label="Bio / परिचय" icon={User} hint="Short bio — Leadership page par dikhega">
            <textarea 
              value={formData.bio} 
              onChange={e => handleChange('bio', e.target.value)}
              placeholder="Write a short bio about yourself..."
              rows={3}
              maxLength={300}
              className={`${inputClass} resize-none`}
            />
            <p className="text-right text-[10px] text-slate-400 mt-0.5">{formData.bio?.length || 0}/300</p>
          </FormField>
        </div>

        {/* ── Location ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 space-y-3.5 sm:space-y-4">
          <h3 className="text-[13px] sm:text-[14px] font-black text-slate-800 flex items-center gap-2">
            <MapPin size={15} className="text-purple-500" />
            Location / स्थान
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="City / शहर" icon={MapPin}>
              <input 
                type="text" value={formData.city} 
                onChange={e => handleChange('city', e.target.value)}
                placeholder="e.g. Indore, Bhopal, Jaipur"
                className={inputClass}
              />
            </FormField>

            <FormField label="State / राज्य" icon={MapPin}>
              <div className="relative">
                <select 
                  value={formData.state} 
                  onChange={e => handleChange('state', e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select State</option>
                  {INDIAN_STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </FormField>
          </div>
        </div>

        {/* ── Term Period ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 space-y-3.5 sm:space-y-4">
          <h3 className="text-[13px] sm:text-[14px] font-black text-slate-800 flex items-center gap-2">
            <Calendar size={15} className="text-purple-500" />
            Term Period / कार्यकाल
          </h3>

          <FormField label="Term Years" icon={Calendar} hint="e.g. 2024-2027">
            <input 
              type="text" value={formData.termYears} 
              onChange={e => handleChange('termYears', e.target.value)}
              placeholder="e.g. 2024-2027"
              className={inputClass}
            />
          </FormField>
        </div>

        {/* ── Social Links ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 space-y-3.5 sm:space-y-4">
          <h3 className="text-[13px] sm:text-[14px] font-black text-slate-800 flex items-center gap-2">
            <Globe size={15} className="text-purple-500" />
            Social Links / सामाजिक लिंक
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="Facebook" icon={FaFacebook}>
              <input 
                type="url" value={formData.socialLinks.facebook} 
                onChange={e => handleSocialChange('facebook', e.target.value)}
                placeholder="https://facebook.com/..."
                className={inputClass}
              />
            </FormField>

            <FormField label="Twitter / X" icon={Globe}>
              <input 
                type="url" value={formData.socialLinks.twitter} 
                onChange={e => handleSocialChange('twitter', e.target.value)}
                placeholder="https://twitter.com/..."
                className={inputClass}
              />
            </FormField>

            <FormField label="LinkedIn" icon={FaLinkedin}>
              <input 
                type="url" value={formData.socialLinks.linkedin} 
                onChange={e => handleSocialChange('linkedin', e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className={inputClass}
              />
            </FormField>

            <FormField label="WhatsApp" icon={MessageCircle}>
              <input 
                type="tel" value={formData.socialLinks.whatsapp} 
                onChange={e => handleSocialChange('whatsapp', e.target.value)}
                placeholder="e.g. 919876543210"
                className={inputClass}
              />
            </FormField>
          </div>
        </div>

        {/* ── Connection Info ── */}
        <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl border border-purple-200/50 p-3.5 sm:p-4">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
              <Shield size={15} className="text-purple-600" />
            </div>
            <div>
              <p className="text-[12px] sm:text-[13px] font-bold text-purple-800">Data Connection</p>
              <p className="text-[10.5px] sm:text-[11px] text-purple-600/80 mt-1 leading-relaxed">
                यहाँ save की गई details automatically <strong>Leadership Page</strong>, 
                <strong> HomePage Core Members</strong>, और <strong>Member Directory</strong> में live reflect होंगी। 
                सब एक ही User account से connected है — कोई duplicate data नहीं।
              </p>
            </div>
          </div>
        </div>

        {/* ── Bottom Save Button (Mobile) ── */}
        <div className="sm:hidden pb-4">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-[13.5px] font-bold shadow-xl shadow-purple-500/25 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
          >
            {saving ? <Loader size={15} className="animate-spin" /> : <Save size={15} />}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default HeadProfileSettings;
