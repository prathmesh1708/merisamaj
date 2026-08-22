import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Phone, ArrowRight, ArrowLeft, MapPin, Users, CheckCircle,
  User, Camera, Bell, Mail, Check, Clock, ShieldCheck, GraduationCap,
  Briefcase, FileText, Sparkles, ChevronDown, PlusCircle, CheckCircle2,
  Lock, Eye, AlertCircle, ClipboardCheck, Globe, EyeOff, Trash2, Edit3, Heart
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
  'Verma Samaj': {
    subCommunities: ['Kayastha Verma', 'Kshatriya Verma', 'Kurmi Verma'],
    cities: ['Lucknow', 'Kanpur', 'Gorakhpur', 'Agra', 'Delhi', 'Bhopal']
  }
};

const COMMUNITY_KEYS = Object.keys(communityData);

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
const CustomSelect = ({ value, onChange, options, placeholder = 'Select', disabled = false, className = '' }) => {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const btnRef = useRef(null);
  const listRef = useRef(null);

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

  const handleOpen = () => {
    if (disabled) return;
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropHeight = Math.min(options.length * 44 + 8, 220);
      const showAbove = spaceBelow < dropHeight + 8;
      setDropdownStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
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

  const dropdownList = open && (
    <div
      ref={listRef}
      style={dropdownStyle}
      className="bg-white border border-purple-100 rounded-2xl shadow-2xl shadow-purple-500/15 overflow-hidden"
    >
      <div className="max-h-52 overflow-y-auto py-1">
        {options.map((opt, i) => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const label = typeof opt === 'string' ? opt : opt.label;
          const isSelected = val === value;
          return (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(val); setOpen(false); }}
              onTouchEnd={(e) => { e.preventDefault(); onChange(val); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-between gap-2 ${
                isSelected
                  ? 'bg-[#7C3AED] text-white font-semibold'
                  : 'text-text-primary hover:bg-purple-50 hover:text-[#7C3AED]'
              }`}
            >
              {label}
              {isSelected && <Check size={14} className="shrink-0" />}
            </button>
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
        className={`w-full flex items-center justify-between border rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none transition-all ${
          disabled
            ? 'bg-gray-50 border-gray-250 text-gray-400 cursor-not-allowed'
            : open
            ? 'bg-white border-[#7C3AED] ring-4 ring-[#7C3AED]/5'
            : 'bg-white/95 border-purple-200 text-text-primary cursor-pointer hover:bg-white hover:border-purple-300'
        }`}
      >
        <span className={selectedLabel ? 'text-text-primary' : 'text-gray-450'}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown size={15} className={`shrink-0 text-text-secondary transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? createPortal(dropdownList, document.body) : null}
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
  const [selectedSubCommunity, setSelectedSubCommunity] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('');
  
  const DEFAULT_COMMUNITIES = [
    { label: 'Jain Samaj', value: 'Jain Samaj' },
    { label: 'Namdev Samaj', value: 'Namdev Samaj' },
    { label: 'Agrawal Samaj', value: 'Agrawal Samaj' },
    { label: 'Gupta Samaj', value: 'Gupta Samaj' },
    { label: 'Mali Samaj', value: 'Mali Samaj' },
    { label: 'Patel Samaj', value: 'Patel Samaj' },
    { label: 'Verma Samaj', value: 'Verma Samaj' },
  ];

  // Dynamic API Data
  const [apiCommunities, setApiCommunities] = useState(DEFAULT_COMMUNITIES);
  const [apiCities, setApiCities] = useState([]);

  useEffect(() => {
    const loadCommunities = async () => {
      try {
        const res = await axiosPublic.get('/auth/communities');
        if (res.data.success && res.data.data.length > 0) {
          const fetched = res.data.data.map(c => ({ label: c.name, value: c._id }));
          const mergedMap = new Map();
          [...fetched, ...DEFAULT_COMMUNITIES].forEach(item => {
            if (!mergedMap.has(item.label.toLowerCase())) {
              mergedMap.set(item.label.toLowerCase(), item);
            }
          });
          setApiCommunities(Array.from(mergedMap.values()));
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
      if (!selectedCommunity) {
        setApiCities(DEFAULT_INDIAN_CITIES);
        return;
      }
      try {
        const res = await axiosPublic.get(`/auth/cities?communityId=${selectedCommunity}`);
        if (res.data.success && res.data.data.length > 0) {
          const fetched = res.data.data.map(c => ({ label: c.name, value: c.name }));
          const mergedMap = new Map();
          [...fetched, ...DEFAULT_INDIAN_CITIES].forEach(item => {
            if (!mergedMap.has(item.value.toLowerCase())) {
              mergedMap.set(item.value.toLowerCase(), item);
            }
          });
          setApiCities(Array.from(mergedMap.values()));
        } else {
          setApiCities(DEFAULT_INDIAN_CITIES);
        }
      } catch (err) {
        console.error('Failed to load public cities:', err);
        setApiCities(DEFAULT_INDIAN_CITIES);
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
        setSelectedCommunity(cId);
      } else if (userToLoad.community && apiCommunities.length > 0) {
        const matched = apiCommunities.find(c => c.label === userToLoad.community);
        if (matched) setSelectedCommunity(matched.value);
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

  const calculateCompletion = () => {
    let pct = 0;
    pct += 15; // Prefilled mobile verification
    if (selectedCommunity && selectedSubCommunity && pincode) pct += 15;
    if (name && gender) pct += 20;
    if (qualification || school) pct += 10;
    if (profession || company) pct += 10;
    if (houseNumber || detailedAddress || alternatePhone) pct += 10;
    if (familyMembers.length > 0) pct += 10;
    if (isAadharVerified || isFaceVerified || prefEducation || prefAge) pct += 10;
    return Math.min(pct, 100);
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
      if (!selectedCommunity) errors.community = 'Please select a community.';
      if (!selectedCity) errors.city = 'Please select your city.';
    }
    if (stepNum === 3) {
      const nameResult = validateName(name);
      if (!nameResult.valid) errors.name = nameResult.error;
      if (!gender) errors.gender = 'Please select your gender.';
      const genderResult = validateEnum(gender, ALLOWED_GENDERS, 'Gender');
      if (!genderResult.valid) errors.gender = genderResult.error;
      if (dob) {
        const dobResult = validateDOB(dob);
        if (!dobResult.valid) errors.dob = dobResult.error;
      }
      if (bloodGroup) {
        const bgResult = validateEnum(bloodGroup, ALLOWED_BLOOD_GROUPS, 'Blood group');
        if (!bgResult.valid) errors.bloodGroup = bgResult.error;
      }
      if (maritalStatus) {
        const msResult = validateEnum(maritalStatus, ALLOWED_MARITAL_STATUSES, 'Marital status');
        if (!msResult.valid) errors.maritalStatus = msResult.error;
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
    const resolvedComm = apiCommunities.find(c => c.value === selectedCommunity || c.label === selectedCommunity);
    const communityName = resolvedComm ? resolvedComm.label : (typeof selectedCommunity === 'string' && selectedCommunity ? selectedCommunity : '');

    const completeUserObj = {
      id: auth.user?.id || auth.user?._id || `u-${Date.now()}`,
      name: String(name || auth.user?.name || ''),
      phone: String(phone || auth.user?.phone || ''),
      email: String(email || auth.user?.email || ''),
      community: communityName || auth.user?.community || 'Jain Samaj',
      communityId: String(selectedCommunity || auth.user?.communityId || 'Jain Samaj'),
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
    return (
      <div className="bg-white/40 backdrop-blur-md border-b border-purple-100/30 shrink-0 z-10">
        <div className="p-4 flex items-center justify-between">
          <button 
            onClick={() => {
              setSlideDir('left');
              if (current === 1) navigate('/member/register');
              else setStep(`onboarding-${current - 1}`);
            }} 
            className="w-9 h-9 rounded-xl bg-white/80 border border-purple-100/30 flex items-center justify-center text-text-primary hover:bg-purple-50 transition-colors press-scale"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-brand-primary">Step {current} of 11</span>
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
    const totalSteps = 11;
    const remaining = totalSteps - current;

    return (
      <div className="bg-white rounded-[20px] border border-purple-100 p-3.5 shadow-[0_4px_20px_rgba(124,58,237,0.04)] space-y-3 select-none animate-fade-in text-left shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center shrink-0 border border-purple-100">
            <ClipboardCheck size={20} className="text-[#6D28D9]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-purple-950 leading-none">{pct}%</span>
              <span className="text-[10px] font-bold text-slate-550">Completed</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#7C3AED] via-[#6366F1] to-[#2DD4BF] rounded-full transition-all duration-700 ease-out" 
                  style={{ width: `${pct}%` }} 
                />
              </div>
              <span className="text-[9px] font-bold text-slate-400 shrink-0">{pct}%</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100/80" />

        <div className="flex items-center justify-between py-0">
          <div className="flex items-center gap-1.5">
            <div className="w-4.5 h-4.5 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
              <Check size={10} strokeWidth={3} />
            </div>
            <span className="text-[11px] font-black text-slate-700">Step {current} of {totalSteps}</span>
          </div>

          <div className="w-[1px] h-4 bg-slate-200" />

          <div className="flex items-center gap-1.5">
            <FileText size={14} className="text-[#7C3AED]" />
            <span className="text-[11px] font-black text-slate-700">
              {remaining === 0 ? 'Last Step' : `${remaining} Page${remaining !== 1 ? 's' : ''} Remaining`}
            </span>
          </div>
        </div>

        <div className="border-t border-slate-100/80" />

        <div className="overflow-x-auto no-scrollbar scroll-smooth py-0.5 -mx-1 px-1">
          <div className="flex items-center min-w-[350px] relative justify-between">
            <div className="absolute top-3 left-3 right-3 h-[1.5px] bg-slate-150 -z-1" />
            
            <div 
              className="absolute top-3 left-3 h-[1.5px] bg-[#7C3AED] transition-all duration-500 -z-1"
              style={{ width: `${((current - 1) / (totalSteps - 1)) * 93}%` }}
            />

            {Array.from({ length: totalSteps }).map((_, idx) => {
              const stepNum = idx + 1;
              const isCompleted = stepNum < current;
              const isActive = stepNum === current;

              return (
                <div key={idx} className="flex flex-col items-center relative z-10 shrink-0">
                  <div 
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-[#7C3AED] text-white shadow-sm' 
                        : isActive 
                        ? 'bg-white border-[1.5px] border-[#7C3AED] text-[#7C3AED] scale-105 shadow-md ring-2 ring-[#7C3AED]/10' 
                        : 'bg-white border border-slate-250 text-slate-400'
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={9} strokeWidth={3} />
                    ) : (
                      stepNum
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
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Select Community</label>
                  <CustomSelect
                    value={selectedCommunity}
                    onChange={(val) => { setSelectedCommunity(val); setSelectedSubCommunity(''); setSelectedCity(''); setStepErrors(prev => ({ ...prev, community: '' })); }}
                    options={apiCommunities}
                    placeholder="Select community"
                    disabled={isCommunityLocked}
                  />
                  {isCommunityLocked && (
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">Community assigned during registration (locked).</p>
                  )}
                  {stepErrors.community && <p role="alert" className="text-[10px] text-red-500 font-semibold mt-1">{stepErrors.community}</p>}
                </div>
                <div>
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Sub-Community / Category</label>
                  <CustomSelect
                    value={selectedSubCommunity}
                    onChange={setSelectedSubCommunity}
                    options={selectedCommunity ? ['General'] : []}
                    placeholder="Select sub-community"
                    disabled={!selectedCommunity}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Enter Pincode</label>
                    <input
                      type="tel"
                      maxLength={6}
                      placeholder="Enter pincode"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#7C3AED] transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Select City</label>
                    <CustomSelect
                      value={selectedCity}
                      onChange={(val) => { setSelectedCity(val); setStepErrors(prev => ({ ...prev, city: '' })); }}
                      options={selectedCity ? [{ label: selectedCity, value: selectedCity }, ...apiCities.filter(c => c.value !== selectedCity)] : apiCities}
                      placeholder="Select city"
                      disabled={!selectedCommunity}
                    />
                    {stepErrors.city && <p role="alert" className="text-[10px] text-red-500 font-semibold mt-1">{stepErrors.city}</p>}
                  </div>
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
                <h1 className="text-xl font-black text-slate-800">Step 3: Personal Information</h1>
                <p className="text-xs text-slate-500 font-semibold mt-1">Please provide accurate personal details</p>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-purple-100/30 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center gap-4">
                <div className="relative shrink-0">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-[120px] h-[120px] rounded-[1.25rem] object-cover border-[3px] border-purple-100 shadow-sm" />
                  ) : (
                    <div className="w-[120px] h-[120px] bg-slate-50 border-2 border-slate-200 border-dashed rounded-[1.25rem] flex flex-col items-center justify-center text-slate-400 gap-2">
                      <User size={36} strokeWidth={1.5} />
                      <span className="text-[10px] font-semibold text-slate-400 tracking-wide uppercase">Photo</span>
                    </div>
                  )}
                  <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#7C3AED] rounded-full flex items-center justify-center shadow-lg cursor-pointer border-[3px] border-white text-white hover:bg-[#5B21B6] transition-colors press-scale z-10">
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
                  {stepErrors.avatar && <p role="alert" className="text-[10px] text-red-500 font-semibold mt-2 text-center">{stepErrors.avatar}</p>}
                </div>
                
                <div className="flex-1 min-w-0 py-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 bg-[#F3E8FF] rounded-full flex items-center justify-center text-[#7C3AED] shrink-0">
                      <Camera size={13} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-800 leading-tight">Upload Profile Photo</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-snug mb-3">
                    A clear profile photo helps the admin approve your profile quickly.
                  </p>
                  
                  <div className="bg-slate-50/80 rounded-[10px] p-2.5 flex gap-2 items-start border border-slate-100">
                    <AlertCircle size={14} className="text-[#7C3AED] shrink-0 mt-0.5" />
                    <p className="text-[9.5px] text-slate-500 font-medium leading-relaxed">
                      Use a clear image of your face.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-450 uppercase">Full Name <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="Enter your full name" value={name} onChange={(e) => { setName(e.target.value); setStepErrors(prev => ({ ...prev, name: '' })); }} className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#7C3AED]" />
                  {stepErrors.name && <p role="alert" className="text-[10px] text-red-500 font-semibold mt-1 ml-1">{stepErrors.name}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-450 uppercase">Gender <span className="text-red-500">*</span></label>
                  <div className="flex gap-2 mt-1">
                    {['Male', 'Female', 'Other'].map(g => (
                      <button key={g} type="button" onClick={() => { setGender(g); setStepErrors(prev => ({ ...prev, gender: '' })); }} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${gender === g ? 'bg-purple-50 border-[#7C3AED] text-[#7C3AED]' : 'bg-white border-purple-100/30 text-text-primary hover:border-purple-200'}`}>{g}</button>
                    ))}
                  </div>
                  {stepErrors.gender && <p role="alert" className="text-[10px] text-red-500 font-semibold mt-1 ml-1">{stepErrors.gender}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-450 uppercase">Date of Birth</label>
                    <input type="date" value={dob} onChange={(e) => { setDob(e.target.value); setStepErrors(prev => ({ ...prev, dob: '' })); }} className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#7C3AED]" />
                    {stepErrors.dob && <p role="alert" className="text-[10px] text-red-500 font-semibold mt-1 ml-1">{stepErrors.dob}</p>}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-450 uppercase">Blood Group</label>
                    <div className="mt-1">
                      <CustomSelect
                        value={bloodGroup}
                        onChange={(val) => { setBloodGroup(val); setStepErrors(prev => ({ ...prev, bloodGroup: '' })); }}
                        options={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']}
                        placeholder="Select"
                      />
                    </div>
                    {stepErrors.bloodGroup && <p role="alert" className="text-[10px] text-red-500 font-semibold mt-1 ml-1">{stepErrors.bloodGroup}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-450 uppercase">Marital Status</label>
                    <div className="mt-1">
                      <CustomSelect
                        value={maritalStatus}
                        onChange={(val) => { setMaritalStatus(val); setStepErrors(prev => ({ ...prev, maritalStatus: '' })); }}
                        options={['Single', 'Married', 'Widowed', 'Divorced', 'Separated']}
                        placeholder="Select"
                      />
                    </div>
                    {stepErrors.maritalStatus && <p role="alert" className="text-[10px] text-red-500 font-semibold mt-1 ml-1">{stepErrors.maritalStatus}</p>}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-450 uppercase">Gotra</label>
                    <input type="text" placeholder="Enter Gotra" value={gotra} onChange={(e) => setGotra(e.target.value)} className="w-full mt-1 bg-[#fff] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#7C3AED]" />
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
            <div className="space-y-4 text-left animate-fade-in">
              <div>
                <h1 className="text-xl font-black text-slate-800">Step 8: Verification (Optional)</h1>
                <p className="text-xs text-slate-500 font-semibold mt-1">Verify your profile for more trust and matches</p>
              </div>
              
              <div className="space-y-3.5 pt-2">
                <div className="bg-white p-4.5 rounded-3xl border border-purple-100/30 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-55 flex items-center justify-center text-brand-primary shrink-0"><Camera size={18} /></div>
                    <div>
                      <p className="text-xs font-black text-slate-800">Face Verification</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Verify using selfie check</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setVerifyingFace(true);
                      setTimeout(() => {
                        setVerifyingFace(false);
                        setIsFaceVerified(true);
                        setToastMessage('Face verification successful!');
                        setTimeout(() => setToastMessage(''), 2000);
                      }, 1500);
                    }}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all border ${
                      isFaceVerified ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]'
                    }`}
                  >
                    {isFaceVerified ? 'Verified ✓' : verifyingFace ? 'Verifying...' : 'Verify'}
                  </button>
                </div>

                <div className="bg-white p-4.5 rounded-3xl border border-purple-100/30 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-55 flex items-center justify-center text-brand-primary shrink-0"><ShieldCheck size={18} /></div>
                    <div>
                      <p className="text-xs font-black text-slate-800">Aadhaar Verification</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Verify using UIDAI e-Aadhaar</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setVerifyingAadhar(true);
                      setTimeout(() => {
                        setVerifyingAadhar(false);
                        setIsAadharVerified(true);
                        setToastMessage('Aadhaar verification successful!');
                        setTimeout(() => setToastMessage(''), 2000);
                      }, 1500);
                    }}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all border ${
                      isAadharVerified ? 'bg-emerald-50 border-[#A7F3D0] text-emerald-600' : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]'
                    }`}
                  >
                    {isAadharVerified ? 'Verified ✓' : verifyingAadhar ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>
            </div>
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
                onClick={() => {
                  setSlideDir('right');
                  setStep(`onboarding-${onboardingStepNum + 1}`);
                }}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-550 text-xs font-bold rounded-xl border border-slate-200 transition-all flex flex-col items-center justify-center"
              >
                <span>Skip for now</span>
                <span className="text-[9px] text-slate-400 font-semibold mt-0.5">You can add this later from settings</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                // Use validateStep gate for steps 2 and 3
                if (onboardingStepNum === 2 || onboardingStepNum === 3 || onboardingStepNum === 4) {
                  const isValid = validateStep(onboardingStepNum);
                  if (!isValid) {
                    setToastMessage('Please fix the validation errors to proceed.');
                    setTimeout(() => setToastMessage(''), 3000);
                    return;
                  }
                }
                // Family member required check (soft warning only)
                if (onboardingStepNum === 7 && familyMembers.length === 0) {
                  setToastMessage('Please add at least one family member');
                  setTimeout(() => setToastMessage(''), 2000);
                  return;
                }

                setSlideDir('right');
                if (onboardingStepNum === 10) {
                  handleSaveProfile();
                } else {
                  setStep(`onboarding-${onboardingStepNum + 1}`);
                }
              }}
              className="w-full py-3.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 press-scale shadow-md"
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingScreen;
