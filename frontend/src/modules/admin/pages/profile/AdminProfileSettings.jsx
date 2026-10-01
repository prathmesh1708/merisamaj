import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, Shield, Save, Loader, CheckCircle, AlertCircle,
  ArrowLeft, Upload, X
} from 'lucide-react';
import { useAdminAuth } from '../../auth/useAdminAuth';
import { axiosPrivate } from '../../../../core/api/axiosPrivate';
import { authService } from '../../../../core/auth/authService';

// ── Toast Notification ──
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl ${
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

const FormField = ({ label, icon: Icon, children, hint }) => (
  <div className="space-y-1">
    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase">
      {Icon && <Icon size={13} className="text-brand-primary shrink-0" />}
      <span>{label}</span>
    </label>
    {children}
    {hint && <p className="text-[11px] text-gray-400 font-medium pl-0.5">{hint}</p>}
  </div>
);

// ── My Profile — self-service page for Master Admin & Admin Sub-Heads ──
const AdminProfileSettings = () => {
  const navigate = useNavigate();
  const { adminAuth, updateAdminUser } = useAdminAuth();
  const adminUser = adminAuth?.adminUser;
  const isSubHead = adminUser?.role === 'admin_sub_head' || (adminUser?.role === 'sub_head' && adminUser?.subHeadType === 'admin');

  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', bio: '', designation: '', avatar: ''
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const res = await axiosPrivate.get('/auth/me');
        const user = res.data?.user || res.data;
        if (user) {
          setFormData({
            name: user.name || adminUser?.name || '',
            phone: user.phone || adminUser?.phone || '',
            email: user.email || adminUser?.email || '',
            bio: user.bio || adminUser?.bio || '',
            designation: user.designation || (isSubHead ? 'Admin Sub-Head' : 'Master Admin'),
            avatar: user.avatar || adminUser?.avatar || ''
          });
        }
      } catch (err) {
        if (adminUser) {
          setFormData({
            name: adminUser.name || '',
            phone: adminUser.phone || '',
            email: adminUser.email || '',
            bio: adminUser.bio || '',
            designation: adminUser.designation || (isSubHead ? 'Admin Sub-Head' : 'Master Admin'),
            avatar: adminUser.avatar || ''
          });
        }
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, avatar: reader.result }));
      reader.readAsDataURL(file);
    }
  };

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
      } else {
        payload = { name: formData.name, email: formData.email, bio: formData.bio, avatar: formData.avatar };
      }

      const result = await authService.updateProfile(payload);

      const updatedUser = result?.user || result;
      if (updatedUser && (updatedUser._id || updatedUser.name)) {
        updateAdminUser(updatedUser);
      }

      setAvatarFile(null);
      setToast({ message: 'Profile updated successfully!', type: 'success' });
    } catch (err) {
      console.error('Admin profile update failed:', err);
      setToast({ message: err.response?.data?.message || err.message || 'Failed to update profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader className="animate-spin text-brand-primary" size={28} />
        <p className="text-gray-500 font-medium mt-3 text-sm">Loading profile...</p>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all";

  return (
    <div className="space-y-6 pb-16">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="relative bg-white border-b border-gray-100 -mt-6 -mx-6 px-8 py-8 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-50 border border-gray-200 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Profile</h1>
            <p className="text-gray-500 font-medium text-sm mt-0.5">Manage your own account details and photo.</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-bold shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shrink-0"
        >
          {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="max-w-2xl mx-auto space-y-6 px-2">
        {/* Profile Photo */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4">Profile Photo</h3>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
              {formData.avatar ? (
                <img src={formData.avatar} className="w-full h-full object-cover" alt="Avatar" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <User size={28} />
                </div>
              )}
            </div>
            <div>
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-primary/10 text-brand-primary text-xs font-bold rounded-xl cursor-pointer hover:bg-brand-primary/20 transition-colors">
                <Upload size={13} />
                {formData.avatar ? 'Change Photo' : 'Upload Photo'}
                <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleAvatarSelect} />
              </label>
              {formData.avatar && (
                <button
                  type="button"
                  onClick={() => { setFormData(prev => ({ ...prev, avatar: '' })); setAvatarFile(null); }}
                  className="ml-2 text-xs font-bold text-gray-400 hover:text-rose-500 transition-colors"
                >
                  Remove
                </button>
              )}
              <p className="text-xs text-gray-400 mt-1.5">Optional — JPG, PNG or WEBP, up to 5MB.</p>
            </div>
          </div>
        </div>

        {/* Basic Details */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2 mb-2">Basic Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Full Name" icon={User}>
              <input type="text" value={formData.name} onChange={e => handleChange('name', e.target.value)} className={inputClass} placeholder="Your full name" />
            </FormField>
            <FormField label="Phone Number" icon={Phone} hint="Phone cannot be changed">
              <input type="text" value={formData.phone} readOnly className={`${inputClass} bg-gray-100 text-gray-500 cursor-not-allowed`} />
            </FormField>
            <FormField label="Email" icon={Mail}>
              <input type="email" value={formData.email} onChange={e => handleChange('email', e.target.value)} className={inputClass} placeholder="your@email.com" />
            </FormField>
            <FormField label="Role" icon={Shield} hint="Assigned by the system">
              <input type="text" value={formData.designation} readOnly className={`${inputClass} bg-gray-100 text-gray-500 cursor-not-allowed`} />
            </FormField>
          </div>
          <FormField label="Bio" icon={User}>
            <textarea
              value={formData.bio}
              onChange={e => handleChange('bio', e.target.value)}
              rows={3}
              maxLength={300}
              className={`${inputClass} resize-none`}
              placeholder="A short bio about yourself..."
            />
            <p className="text-right text-[11px] text-gray-400 mt-0.5">{formData.bio?.length || 0}/300</p>
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default AdminProfileSettings;
