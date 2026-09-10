import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, CheckCircle, Lock, ChevronRight, ChevronLeft,
  Upload, Trash2, Star, AlertCircle, Loader2
} from 'lucide-react';
import { useMatrimonialProfile } from '../../../../hooks/useMatrimonialProfile';
import { matrimonialProfileService } from '../../../../core/api/matrimonialService';
import { useData } from '../../context/DataProvider';

// ─── Sub-Components ───────────────────────────────────────────────────────────
const CustomSelect = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const selected = options.find(o => o.value === value) || options[0];
  return (
    <div className="relative w-full" ref={ref}>
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between text-[13.5px] font-bold text-slate-800 outline-none focus:border-rose-500 transition-all select-none">
        <span>{selected?.label || value}</span>
        <span className="text-[10px] text-slate-400">▼</span>
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 max-h-48 overflow-y-auto">
          {options.map(opt => (
            <button key={opt.value} type="button"
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full px-4 py-2.5 text-left text-[13.5px] font-semibold transition-all hover:bg-slate-50 ${opt.value === value ? 'text-rose-500 bg-rose-50/20' : 'text-slate-700'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const InputField = ({ label, required, error, ...props }) => (
  <div>
    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <input type="text"
      className={`w-full bg-white border ${error ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-rose-500'} rounded-xl px-4 py-3 text-[13.5px] font-bold text-slate-800 outline-none transition-all placeholder-slate-300`}
      {...props} />
    {error && <span className="text-[11px] font-bold text-red-500 mt-1 block">{error}</span>}
  </div>
);

const STEPS = ['Photos & Privacy', 'Basic Details', 'Religious & Social', 'Education & Career', 'Family Background', 'Partner Preferences'];

// ─── Main Component ───────────────────────────────────────────────────────────
const MatrimonialSetupPage = ({ isHub = false, onPublish }) => {
  const navigate = useNavigate();
  const { profile, loading, saving, fetchMyProfile, saveProfile } = useMatrimonialProfile();
  const { currentUser } = useData();

  const [step, setStep] = useState(1);
  const [isEdit, setIsEdit]   = useState(false);
  const [toast, setToast]     = useState('');
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    // Step 1
    photoVisibility: 'connections',
    visibility:      'all_members',
    // Step 2
    fullName:     '',
    gender:       'male',
    dateOfBirth:  '',
    height:       '',
    weight:       '',
    maritalStatus:'Never Married',
    motherTongue: 'Hindi',
    religion:     'Hindu',
    community:    '',
    // Step 3
    gotra:   '',
    manglik: 'No',
    rashi:   '',
    star:    '',
    // Step 4
    highestQualification: '',
    college:   '',
    profession:'',
    occupation:'',
    company:   '',
    annualIncome:'',
    // Step 5
    fatherOccupation:'',
    motherOccupation:'',
    brothers:    '0',
    sisters:     '0',
    familyType:  'Nuclear',
    familyValues:'Moderate',
    diet:        'Vegetarian',
    // Step 6
    ageMin: '22',
    ageMax: '30',
    heightMin:'',
    heightMax:'',
    partnerEducation:'',
    partnerOccupation:'',
    partnerCommunity:'',
    partnerCity:'',
    about:'',
    partnerExpectations:'',
    state:'',
    city:'',
  });

  // Load existing profile
  useEffect(() => {
    fetchMyProfile().then(p => {
      if (p) {
        setIsEdit(true);
        // Prefill form from profile, fallback to currentUser data
        setForm(prev => ({
          ...prev,
          fullName:     p.personal?.fullName || currentUser?.name || '',
          gender:       p.personal?.gender || currentUser?.gender || 'male',
          dateOfBirth:  p.personal?.dateOfBirth ? p.personal.dateOfBirth.split('T')[0] : (currentUser?.dob ? currentUser.dob.split('T')[0] : ''),
          height:       p.personal?.height || '',
          weight:       p.personal?.weight || '',
          maritalStatus:p.personal?.maritalStatus || currentUser?.maritalStatus || 'Never Married',
          motherTongue: p.personal?.motherTongue || 'Hindi',
          religion:     p.personal?.religion || 'Hindu',
          community:    p.personal?.community || currentUser?.community || '',
          gotra:        p.personal?.gotra || currentUser?.gotra || '',
          highestQualification: p.education?.highestQualification || '',
          college:      p.education?.college || '',
          profession:   p.education?.profession || '',
          occupation:   p.education?.occupation || '',
          company:      p.education?.company || '',
          annualIncome: p.education?.annualIncome || '',
          fatherOccupation: p.family?.fatherOccupation || '',
          motherOccupation: p.family?.motherOccupation || '',
          brothers:     String(p.family?.brothers || '0'),
          sisters:      String(p.family?.sisters || '0'),
          familyType:   p.family?.familyType || 'Nuclear',
          familyValues: p.family?.familyValues || 'Moderate',
          diet:         p.lifestyle?.diet || 'Vegetarian',
          manglik:      p.horoscope?.manglik || 'No',
          rashi:        p.horoscope?.rashi || '',
          star:         p.horoscope?.star || '',
          ageMin:       String(p.preferences?.ageMin || '22'),
          ageMax:       String(p.preferences?.ageMax || '30'),
          heightMin:    String(p.preferences?.heightMin || ''),
          heightMax:    String(p.preferences?.heightMax || ''),
          partnerEducation: p.preferences?.education || '',
          partnerOccupation:p.preferences?.occupation || '',
          partnerCommunity: p.preferences?.community || '',
          partnerCity:      p.preferences?.city || '',
          about:            p.about?.biography || '',
          partnerExpectations: p.about?.partnerExpectations || '',
          state:            p.location?.state || currentUser?.state || '',
          city:             p.location?.city || currentUser?.city || '',
          photoVisibility:  p.visibility || 'all_members',
          visibility:       p.visibility || 'all_members',
        }));
      } else if (currentUser) {
        // First time setup: Pre-fill from user registration data
        setForm(prev => ({
          ...prev,
          fullName: currentUser.name || '',
          gender: currentUser.gender || 'male',
          dateOfBirth: currentUser.dob ? currentUser.dob.split('T')[0] : '',
          gotra: currentUser.gotra || '',
          community: currentUser.community || '',
          city: currentUser.city || '',
          state: currentUser.state || '',
          maritalStatus: currentUser.maritalStatus || 'Never Married'
        }));
      }
    });
  }, []);

  // Listen to currentUser updates (it may load late from AuthContext)
  useEffect(() => {
    if (currentUser && !isEdit) {
      setForm(prev => ({
        ...prev,
        fullName: prev.fullName || currentUser.name || '',
        gender: (prev.gender && prev.gender !== 'male') ? prev.gender : (currentUser.gender || 'male'),
        dateOfBirth: prev.dateOfBirth || (currentUser.dob ? currentUser.dob.split('T')[0] : ''),
        gotra: prev.gotra || currentUser.gotra || '',
        community: prev.community || currentUser.community || '',
        city: prev.city || currentUser.city || '',
        state: prev.state || currentUser.state || '',
        maritalStatus: prev.maritalStatus !== 'Never Married' ? prev.maritalStatus : (currentUser.maritalStatus || 'Never Married')
      }));
    }
  }, [currentUser, isEdit]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // Build API payload from form
  const buildPayload = () => ({
    personal: {
      fullName:     form.fullName,
      gender:       form.gender,
      dateOfBirth:  form.dateOfBirth,
      height:       Number(form.height) || undefined,
      weight:       Number(form.weight) || undefined,
      maritalStatus:form.maritalStatus,
      motherTongue: form.motherTongue,
      religion:     form.religion,
      community:    form.community,
      gotra:        form.gotra,
    },
    education: {
      highestQualification: form.highestQualification,
      college:      form.college,
      profession:   form.profession,
      occupation:   form.occupation,
      company:      form.company,
      annualIncome: form.annualIncome,
    },
    family: {
      fatherOccupation: form.fatherOccupation,
      motherOccupation: form.motherOccupation,
      brothers:  Number(form.brothers) || 0,
      sisters:   Number(form.sisters)  || 0,
      familyType:  form.familyType,
      familyValues:form.familyValues,
    },
    lifestyle: { diet: form.diet },
    horoscope: { manglik: form.manglik, rashi: form.rashi, star: form.star },
    location:  { state: form.state, city: form.city },
    preferences: {
      ageMin:    Number(form.ageMin) || 22,
      ageMax:    Number(form.ageMax) || 30,
      heightMin: Number(form.heightMin) || undefined,
      heightMax: Number(form.heightMax) || undefined,
      education: form.partnerEducation,
      occupation:form.partnerOccupation,
      community: form.partnerCommunity,
      city:      form.partnerCity,
    },
    about: { biography: form.about, partnerExpectations: form.partnerExpectations },
    visibility: form.visibility,
    // Note: 'status' is intentionally excluded — only admin can set profile status
  });

  const [stepErrors, setStepErrors] = useState({});

  const validateStep = () => {
    const errs = {};
    if (step === 2) {
      if (!form.fullName || form.fullName.trim() === '') errs.fullName = 'Full Name is required';
      if (!form.dateOfBirth) errs.dateOfBirth = 'Date of Birth is required';
    }
    setStepErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFinish = async () => {
    if (!validateStep()) return;
    const payload = buildPayload();
    const result  = await saveProfile(payload, !isEdit);
    if (result.success) {
      // Upload pending photos if any
      if (photoFiles.length > 0) {
        await uploadPendingPhotos(result.profile._id);
      }
      showToast(isEdit ? 'Profile updated successfully! ✅' : 'Profile published! ✅');
      if (onPublish) { onPublish(result.profile); }
      else { setTimeout(() => navigate('/member/matrimonial'), 1200); }
    } else {
      showToast(`Error: ${result.error}`);
    }
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < STEPS.length) setStep(s => s + 1);
    else handleFinish();
  };
  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
    else navigate(-1);
  };

  // Photo selection (local preview before upload)
  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    const previews = files.map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    setPhotoFiles(prev => [...prev, ...previews].slice(0, 6));
  };

  const removePhotoPreview = (idx) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const uploadPendingPhotos = async (profileId) => {
    if (photoFiles.length === 0) return;
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      photoFiles.forEach(({ file }) => formData.append('photos', file));
      await matrimonialProfileService.uploadPhotos(formData);
    } catch (err) {
      console.error('Photo upload failed:', err.response?.data?.message);
    } finally {
      setPhotoUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 1: return (
        <div className="space-y-4">
          <h2 className="text-[16px] font-black text-slate-800">Photos & Privacy</h2>

          {/* Photo upload area */}
          <div className="grid grid-cols-3 gap-2">
            {photoFiles.map((item, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                <img src={item.preview} alt="preview" className="w-full h-full object-cover" />
                <button onClick={() => removePhotoPreview(idx)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white">
                  <Trash2 size={12} />
                </button>
                {idx === 0 && (
                  <span className="absolute bottom-1 left-1 text-[8px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-bold">Primary</span>
                )}
              </div>
            ))}
            {photoFiles.length < 6 && (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-rose-200 bg-rose-50 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform">
                <Camera size={24} className="text-rose-400" />
                <span className="text-[10px] font-bold text-rose-400">Add Photo</span>
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />

          <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 flex items-start gap-3">
            <Lock size={16} className="text-rose-500 shrink-0 mt-0.5" />
            <p className="text-[12px] text-rose-700 leading-relaxed font-semibold">
              Choose your profile visibility. Selecting <strong>"All Members"</strong> allows candidates across all Samaj communities on MeriSamaj to view and discover your profile.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Profile Visibility</label>
            <CustomSelect value={form.visibility} onChange={v => setForm(f => ({ ...f, visibility: v }))}
              options={[
                { value: 'all_members',  label: 'All Members (Visible to all communities)' },
                { value: 'my_community', label: 'My Community Only (Visible only to my Samaj)' },
                { value: 'private',      label: 'Private (Connections only)' },
              ]} />
          </div>
        </div>
      );

      case 2: return (
        <div className="space-y-4">
          <h2 className="text-[16px] font-black text-slate-800">Basic Details</h2>
          <InputField label="Full Name" name="fullName" required placeholder="Your full name" value={form.fullName} onChange={handleChange} error={stepErrors.fullName} />
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Gender <span className="text-rose-500">*</span></label>
            <div className="flex gap-2">
              {['male', 'female'].map(g => (
                <button key={g} type="button" onClick={() => setForm(f => ({ ...f, gender: g }))}
                  className={`flex-1 py-3 rounded-xl text-[13px] font-bold border transition-all ${form.gender === g ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                  {g === 'male' ? '👨 Male' : '👩 Female'}
                </button>
              ))}
            </div>
          </div>
          <InputField label="Date of Birth" name="dateOfBirth" required type="date" value={form.dateOfBirth} onChange={handleChange} error={stepErrors.dateOfBirth} />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Height (cm)" name="height" placeholder="e.g. 170" value={form.height} onChange={handleChange} />
            <InputField label="Weight (kg)" name="weight" placeholder="e.g. 65" value={form.weight} onChange={handleChange} />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Marital Status</label>
            <CustomSelect value={form.maritalStatus} onChange={v => setForm(f => ({ ...f, maritalStatus: v }))}
              options={['Never Married', 'Divorced', 'Widowed', 'Separated'].map(m => ({ value: m, label: m }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Mother Tongue" name="motherTongue" value={form.motherTongue} onChange={handleChange} />
            <InputField label="Community" name="community" required placeholder="e.g. Agarwal" value={form.community} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField label="State" name="state" placeholder="e.g. Delhi" value={form.state} onChange={handleChange} />
            <InputField label="City" name="city" placeholder="e.g. New Delhi" value={form.city} onChange={handleChange} />
          </div>
        </div>
      );

      case 3: return (
        <div className="space-y-4">
          <h2 className="text-[16px] font-black text-slate-800">Religious & Social Details</h2>
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Religion</label>
            <CustomSelect value={form.religion} onChange={v => setForm(f => ({ ...f, religion: v }))}
              options={['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Other'].map(r => ({ value: r, label: r }))} />
          </div>
          <InputField label="Gotra" name="gotra" placeholder="e.g. Bansal" value={form.gotra} onChange={handleChange} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Manglik</label>
              <CustomSelect value={form.manglik} onChange={v => setForm(f => ({ ...f, manglik: v }))}
                options={['No', 'Yes', 'Anshik', "Don't Know"].map(m => ({ value: m, label: m }))} />
            </div>
            <InputField label="Rashi" name="rashi" placeholder="e.g. Kanya" value={form.rashi} onChange={handleChange} />
          </div>
          <InputField label="Nakshatra / Star" name="star" placeholder="e.g. Chitra" value={form.star} onChange={handleChange} />
          <InputField label="About Yourself" name="about" placeholder="Describe yourself..." value={form.about} onChange={handleChange} />
        </div>
      );

      case 4: return (
        <div className="space-y-4">
          <h2 className="text-[16px] font-black text-slate-800">Education & Career</h2>
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Highest Qualification</label>
            <CustomSelect value={form.highestQualification} onChange={v => setForm(f => ({ ...f, highestQualification: v }))}
              options={['10th', '12th', 'Graduate', 'Post Graduate', 'PhD', 'Diploma', 'Other'].map(e => ({ value: e, label: e }))} />
          </div>
          <InputField label="College / University" name="college" placeholder="e.g. Delhi University" value={form.college} onChange={handleChange} />
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Profession Type</label>
            <CustomSelect value={form.profession} onChange={v => setForm(f => ({ ...f, profession: v }))}
              options={['Business', 'Service', 'Self Employed', 'Student', 'Not Working', 'Other'].map(p => ({ value: p, label: p }))} />
          </div>
          <InputField label="Occupation / Designation" name="occupation" placeholder="e.g. Senior Engineer" value={form.occupation} onChange={handleChange} />
          <InputField label="Company Name" name="company" placeholder="e.g. Amazon India" value={form.company} onChange={handleChange} />
          <InputField label="Annual Income" name="annualIncome" placeholder="e.g. 10-15 LPA" value={form.annualIncome} onChange={handleChange} />
        </div>
      );

      case 5: return (
        <div className="space-y-4">
          <h2 className="text-[16px] font-black text-slate-800">Family Background</h2>
          <InputField label="Father's Occupation" name="fatherOccupation" placeholder="e.g. Business" value={form.fatherOccupation} onChange={handleChange} />
          <InputField label="Mother's Occupation" name="motherOccupation" placeholder="e.g. Homemaker" value={form.motherOccupation} onChange={handleChange} />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Brothers" name="brothers" type="number" min="0" placeholder="0" value={form.brothers} onChange={handleChange} />
            <InputField label="Sisters" name="sisters" type="number" min="0" placeholder="0" value={form.sisters} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Family Type</label>
              <CustomSelect value={form.familyType} onChange={v => setForm(f => ({ ...f, familyType: v }))}
                options={['Nuclear', 'Joint', 'Extended'].map(t => ({ value: t, label: t }))} />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Family Values</label>
              <CustomSelect value={form.familyValues} onChange={v => setForm(f => ({ ...f, familyValues: v }))}
                options={['Traditional', 'Moderate', 'Liberal'].map(v => ({ value: v, label: v }))} />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Diet</label>
            <CustomSelect value={form.diet} onChange={v => setForm(f => ({ ...f, diet: v }))}
              options={['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Eggetarian', 'Jain'].map(d => ({ value: d, label: d }))} />
          </div>
        </div>
      );

      case 6: return (
        <div className="space-y-4">
          <h2 className="text-[16px] font-black text-slate-800">Partner Preferences</h2>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Age Range</label>
              <span className="text-[13px] font-extrabold text-slate-800">{form.ageMin} – {form.ageMax} yrs</span>
            </div>
            <div className="flex gap-3">
              <input type="range" min="18" max="50" value={form.ageMin} className="w-full accent-rose-500"
                onChange={e => setForm(f => ({ ...f, ageMin: e.target.value }))} />
              <input type="range" min="18" max="60" value={form.ageMax} className="w-full accent-rose-500"
                onChange={e => setForm(f => ({ ...f, ageMax: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Min Height (cm)" name="heightMin" placeholder="e.g. 155" value={form.heightMin} onChange={handleChange} />
            <InputField label="Max Height (cm)" name="heightMax" placeholder="e.g. 185" value={form.heightMax} onChange={handleChange} />
          </div>
          <InputField label="Preferred Education" name="partnerEducation" placeholder="e.g. Post Graduate" value={form.partnerEducation} onChange={handleChange} />
          <InputField label="Preferred Occupation" name="partnerOccupation" placeholder="e.g. Any" value={form.partnerOccupation} onChange={handleChange} />
          <InputField label="Preferred Community" name="partnerCommunity" placeholder="e.g. Agarwal / Any" value={form.partnerCommunity} onChange={handleChange} />
          <InputField label="Preferred City" name="partnerCity" placeholder="e.g. Delhi NCR" value={form.partnerCity} onChange={handleChange} />
          <InputField label="Partner Expectations" name="partnerExpectations" placeholder="What you're looking for..." value={form.partnerExpectations} onChange={handleChange} />

          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
            <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-[13px] font-extrabold text-emerald-800">Ready to Publish!</p>
              <p className="text-[11.5px] text-emerald-600 mt-0.5 leading-relaxed font-semibold">
                Your profile will be live and active immediately. Matches will be shown based on your chosen preferences and visibility settings.
              </p>
            </div>
          </div>
        </div>
      );

      default: return null;
    }
  };

  return (
    <div className={isHub 
      ? 'bg-slate-50 flex flex-col min-h-full pb-24 w-full relative' 
      : 'min-h-screen bg-slate-50 flex flex-col pb-24 w-full relative overflow-hidden'}>
      {!isHub && (
        <div className="bg-white border-b border-slate-100 flex items-center gap-3 px-4 h-14 sticky top-0 z-30 shadow-sm">
            <button onClick={handleBack} className="p-1 active:opacity-60"><ArrowLeft size={22} className="text-slate-800" /></button>
            <div className="flex-1">
              <h1 className="text-[17px] font-black text-slate-800">{isEdit ? 'Edit Profile' : 'Setup Profile'}</h1>
            </div>
            <span className="text-[11px] font-extrabold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
              {step}/{STEPS.length}
            </span>
          </div>
        )}

      {/* Progress */}
      <div className="w-full">
        <div className="bg-slate-200 h-1">
          <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${(step / STEPS.length) * 100}%` }} />
        </div>
      </div>
      <form noValidate onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="flex flex-col flex-1 overflow-hidden">
        {/* Progress */}
        <div className="w-full">
          <div className="h-1 bg-slate-100 flex"><div className="h-1 bg-rose-500 transition-all duration-500 ease-out" style={{ width: `${(step / STEPS.length) * 100}%` }} /></div>
        </div>

        {/* Step Labels */}
        <div className="px-4 pt-3 pb-1 overflow-x-auto">
          <div className="flex gap-1.5 min-w-max">
            {STEPS.map((s, i) => (
              <span key={i} className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${i + 1 === step ? 'bg-rose-500 text-white shadow-sm shadow-rose-200' : i + 1 < step ? 'bg-emerald-100 text-emerald-600' : 'bg-white border border-slate-200 text-slate-400'}`}>
                {i + 1 < step ? '✓' : i + 1} {s}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 pt-4 pb-6 overflow-y-auto">{renderStep()}</div>

        {/* Footer Nav */}
        <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-slate-100 p-4 z-40 flex gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}>
          {step > 1 && (
            <button type="button" onClick={handleBack}
              className="py-3.5 px-6 bg-slate-100 text-slate-600 rounded-2xl text-[13.5px] font-bold flex items-center gap-1 active:scale-95 transition-transform hover:bg-slate-200">
              <ChevronLeft size={16} /> Back
            </button>
          )}
          <button type="submit" disabled={saving || photoUploading}
            className="flex-1 py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl text-[13.5px] font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-rose-200 active:scale-95 transition-all disabled:opacity-60">
            {saving || photoUploading ? <Loader2 size={16} className="animate-spin" /> : null}
            {step === STEPS.length ? (isEdit ? 'Save Changes' : 'Publish Profile') : 'Continue'} <ChevronRight size={16} />
          </button>
        </div>
      </form>

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[12.5px] font-black px-5 py-3 rounded-full shadow-lg z-[60]">
          {toast}
        </div>
      )}
    </div>
  );
};

export default MatrimonialSetupPage;
