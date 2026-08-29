import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Users, User, Heart, Sparkles, MapPin, Menu,
  ChevronRight, ChevronDown, FileText, Download, Printer, 
  RefreshCw, Search, Filter, Phone, MessageCircle, X, Check,
  TrendingUp, BarChart2, PieChart, Home, Info, AlertCircle,
  HelpCircle, Calendar, Shield, Trash2, Edit2
} from 'lucide-react';
import { useData } from '../../context/DataProvider';
import { axiosPrivate } from '../../../../core/api/axiosPrivate';

// Helper to resolve community surname
const getCommunitySurname = (community) => {
  if (!community) return 'Agrawal';
  const c = community.toLowerCase();
  if (c.includes('mali')) return 'Mali';
  if (c.includes('gupta')) return 'Gupta';
  if (c.includes('sharma')) return 'Sharma';
  if (c.includes('jain')) return 'Jain';
  if (c.includes('patel')) return 'Patel';
  if (c.includes('verma')) return 'Verma';
  return 'Agrawal';
};

// Raw Mock Database Builder
const getMockData = (surname, userCity) => {
  const defaultCity = userCity || 'Indore';
  
  const males = [
    { id: 'm-1', name: `Rajesh ${surname}`, fatherName: `Shankarlal ${surname}`, age: 32, city: defaultCity, phone: '+91 98765 43210', maritalStatus: 'Married', active: true, relation: 'Son', education: 'MBA', profession: 'Business Owner' },
    { id: 'm-2', name: `Suresh ${surname}`, fatherName: `Motilal ${surname}`, age: 28, city: 'Sanawad', phone: '+91 98765 43211', maritalStatus: 'Single', active: true, relation: 'Son', education: 'B.Tech', profession: 'Software Engineer' },
    { id: 'm-3', name: `Mahesh ${surname}`, fatherName: `Ramesh ${surname}`, age: 40, city: 'Khargone', phone: '+91 98765 43212', maritalStatus: 'Married', active: true, relation: 'Son', education: 'B.Com', profession: 'Accountant' },
    { id: 'm-4', name: `Shankarlal ${surname}`, fatherName: `Kishorilal ${surname}`, age: 68, city: defaultCity, phone: '+91 98765 43201', maritalStatus: 'Married', active: true, relation: 'Self (मुखिया)', education: 'Graduate', profession: 'Retired Business Owner' },
    { id: 'm-5', name: `Motilal ${surname}`, fatherName: `Shankarlal ${surname}`, age: 45, city: 'Sanawad', phone: '+91 98765 43202', maritalStatus: 'Married', active: true, relation: 'Self (मुखिया)', education: 'B.A.', profession: 'Shopkeeper' },
    { id: 'm-6', name: `Deepak ${surname}`, fatherName: `Ramesh ${surname}`, age: 35, city: 'Khargone', phone: '+91 98765 43203', maritalStatus: 'Married', active: true, relation: 'Self (मुखिया)', education: 'M.Sc', profession: 'Teacher' },
    { id: 'm-7', name: `Naresh ${surname}`, fatherName: `Gendalal ${surname}`, age: 48, city: 'Dhar', phone: '+91 98765 43204', maritalStatus: 'Married', active: true, relation: 'Self (मुखिया)', education: 'Diploma', profession: 'Contractor' },
    { id: 'm-8', name: `Harilal ${surname}`, fatherName: `Motilal ${surname}`, age: 52, city: 'Dhamnod', phone: '+91 98765 43208', maritalStatus: 'Married', active: true, relation: 'Self (मुखिया)', education: 'Intermediate', profession: 'Farmer' },
    { id: 'm-9', name: `Rakesh ${surname}`, fatherName: `Shankarlal ${surname}`, age: 36, city: defaultCity, phone: '+91 98765 43216', maritalStatus: 'Married', active: true, relation: 'Son', education: 'MBA', profession: 'Manager' },
    { id: 'm-10', name: `Nitin ${surname}`, fatherName: `Shankarlal ${surname}`, age: 34, city: defaultCity, phone: '+91 98765 43217', maritalStatus: 'Single', active: true, relation: 'Son', education: 'B.Com', profession: 'Business Executive' },
    { id: 'm-11', name: `Govind ${surname}`, fatherName: `Shankarlal ${surname}`, age: 30, city: defaultCity, phone: '+91 98765 43218', maritalStatus: 'Single', active: true, relation: 'Son', education: 'M.Tech', profession: 'Researcher' },
    { id: 'm-12', name: `Sunil ${surname}`, fatherName: `Shankarlal ${surname}`, age: 28, city: defaultCity, phone: '+91 98765 43219', maritalStatus: 'Single', active: true, relation: 'Son', education: 'B.Sc', profession: 'Web Developer' },
    { id: 'm-13', name: `Kailash ${surname}`, fatherName: `Ramdas ${surname}`, age: 55, city: defaultCity, phone: '+91 98765 43220', maritalStatus: 'Widowed', active: false, relation: 'Self', education: 'B.Sc', profession: 'Advisor' },
    { id: 'm-14', name: `Vijay ${surname}`, fatherName: `Hariprasad ${surname}`, age: 24, city: defaultCity, phone: '+91 98765 43221', maritalStatus: 'Single', active: false, relation: 'Self', education: 'BBA', profession: 'Student' }
  ];

  const females = [
    { id: 'f-1', name: `Savita ${surname}`, fatherName: `Ramswaroop ${surname}`, age: 29, city: defaultCity, phone: '+91 98765 43213', maritalStatus: 'Married', active: true, relation: 'Wife', education: 'M.A.', profession: 'Homemaker' },
    { id: 'f-2', name: `Pooja ${surname}`, fatherName: `Suresh ${surname}`, age: 27, city: 'Sanawad', phone: '+91 98765 43214', maritalStatus: 'Married', active: true, relation: 'Wife', education: 'B.Ed', profession: 'Teacher' },
    { id: 'f-3', name: `Reena ${surname}`, fatherName: `Deepak ${surname}`, age: 35, city: 'Khargone', phone: '+91 98765 43215', maritalStatus: 'Married', active: true, relation: 'Wife', education: 'MBA', profession: 'HR Recruiter' },
    { id: 'f-4', name: `Kamal ${surname}`, fatherName: `Ganeshrao ${surname}`, age: 62, city: defaultCity, phone: '+91 98765 43205', maritalStatus: 'Married', active: true, relation: 'Wife', education: 'High School', profession: 'Homemaker' },
    { id: 'f-5', name: `Sunita ${surname}`, fatherName: `Shankarlal ${surname}`, age: 42, city: defaultCity, phone: '+91 98765 43206', maritalStatus: 'Married', active: true, relation: 'Daughter-in-law', education: 'Graduate', profession: 'Boutique Owner' },
    { id: 'f-6', name: `Seema ${surname}`, fatherName: `Devendra ${surname}`, age: 40, city: 'Sanawad', phone: '+91 98765 43207', maritalStatus: 'Married', active: true, relation: 'Wife', education: 'Graduate', profession: 'Homemaker' },
    { id: 'f-7', name: `Priya ${surname}`, fatherName: `Shankarlal ${surname}`, age: 26, city: defaultCity, phone: '+91 98765 43225', maritalStatus: 'Single', active: true, relation: 'Daughter', education: 'B.A.', profession: 'Student' },
    { id: 'f-8', name: `Neha ${surname}`, fatherName: `Shankarlal ${surname}`, age: 24, city: defaultCity, phone: '+91 98765 43226', maritalStatus: 'Single', active: true, relation: 'Daughter', education: 'M.Com', profession: 'Account Assistant' },
    { id: 'f-9', name: `Maya ${surname}`, fatherName: `Kailash ${surname}`, age: 50, city: defaultCity, phone: '+91 98765 43227', maritalStatus: 'Widowed', active: true, relation: 'Wife', education: 'Intermediate', profession: 'Tailoring' },
    { id: 'f-10', name: `Asha ${surname}`, fatherName: `Babulal ${surname}`, age: 48, city: 'Dhamnod', phone: '+91 98765 43228', maritalStatus: 'Married', active: false, relation: 'Self', education: 'B.A.', profession: 'Teacher' }
  ];

  const kids = [
    { id: 'k-1', name: `Aarav ${surname}`, fatherName: `Rajesh ${surname}`, age: 8, city: defaultCity, gender: 'Boy', relation: 'Son' },
    { id: 'k-2', name: `Ananya ${surname}`, fatherName: `Suresh ${surname}`, age: 6, city: 'Sanawad', gender: 'Girl', relation: 'Daughter' },
    { id: 'k-3', name: `Vivaan ${surname}`, fatherName: `Deepak ${surname}`, age: 12, city: 'Khargone', gender: 'Boy', relation: 'Son' },
    { id: 'k-4', name: `Shreyas ${surname}`, fatherName: `Shankarlal ${surname}`, age: 10, city: defaultCity, gender: 'Boy', relation: 'Grandson' },
    { id: 'k-5', name: `Ishita ${surname}`, fatherName: `Motilal ${surname}`, age: 14, city: 'Sanawad', gender: 'Girl', relation: 'Daughter' },
    { id: 'k-6', name: `Kavya ${surname}`, fatherName: `Naresh ${surname}`, age: 4, city: 'Dhar', gender: 'Girl', relation: 'Daughter' },
    { id: 'k-7', name: `Rudransh ${surname}`, fatherName: `Rakesh ${surname}`, age: 11, city: defaultCity, gender: 'Boy', relation: 'Son' },
    { id: 'k-8', name: `Ridhima ${surname}`, fatherName: `Rakesh ${surname}`, age: 7, city: defaultCity, gender: 'Girl', relation: 'Daughter' }
  ];

  const families = [
    {
      id: 'fam-1',
      name: `Shankarlal ${surname} परिवार`,
      headId: 'm-4',
      headName: `Shankarlal ${surname}`,
      city: defaultCity,
      type: 'Joint',
      membersCount: 15,
      malesCount: 8,
      femalesCount: 5,
      kidsCount: 2,
      phone: '+91 98765 43201',
      members: {
        males: [
          { name: `Shankarlal ${surname}`, age: 68, relation: 'Self (मुखिया)' },
          { name: `Motilal ${surname}`, age: 45, relation: 'Son' },
          { name: `Rajesh ${surname}`, age: 32, relation: 'Son' },
          { name: `Mahesh ${surname}`, age: 38, relation: 'Son' },
          { name: `Rakesh ${surname}`, age: 36, relation: 'Son' },
          { name: `Nitin ${surname}`, age: 34, relation: 'Son' },
          { name: `Govind ${surname}`, age: 30, relation: 'Son' },
          { name: `Sunil ${surname}`, age: 28, relation: 'Son' }
        ],
        females: [
          { name: `Kamal ${surname}`, age: 62, relation: 'Wife' },
          { name: `Sunita ${surname}`, age: 42, relation: 'Daughter-in-law' },
          { name: `Savita ${surname}`, age: 29, relation: 'Daughter-in-law' },
          { name: `Priya ${surname}`, age: 26, relation: 'Daughter' },
          { name: `Neha ${surname}`, age: 24, relation: 'Daughter' }
        ],
        kids: [
          { name: `Aarav ${surname}`, age: 10, gender: 'Boy', relation: 'Grandson' },
          { name: `Ananya ${surname}`, age: 6, gender: 'Girl', relation: 'Granddaughter' }
        ]
      }
    },
    {
      id: 'fam-2',
      name: `Motilal ${surname} परिवार`,
      headId: 'm-5',
      headName: `Motilal ${surname}`,
      city: 'Sanawad',
      type: 'Joint',
      membersCount: 12,
      malesCount: 5,
      femalesCount: 5,
      kidsCount: 2,
      phone: '+91 98765 43202',
      members: {
        males: [
          { name: `Motilal ${surname}`, age: 45, relation: 'Self (मुखिया)' },
          { name: `Suresh ${surname}`, age: 28, relation: 'Son' }
        ],
        females: [
          { name: `Seema ${surname}`, age: 40, relation: 'Wife' },
          { name: `Pooja ${surname}`, age: 27, relation: 'Daughter-in-law' }
        ],
        kids: [
          { name: `Ishita ${surname}`, age: 14, gender: 'Girl', relation: 'Daughter' }
        ]
      }
    },
    {
      id: 'fam-3',
      name: `Deepak ${surname} परिवार`,
      headId: 'm-6',
      headName: `Deepak ${surname}`,
      city: 'Khargone',
      type: 'Joint',
      membersCount: 18,
      malesCount: 9,
      femalesCount: 6,
      kidsCount: 3,
      phone: '+91 98765 43203',
      members: {
        males: [
          { name: `Deepak ${surname}`, age: 35, relation: 'Self (मुखिया)' },
          { name: `Mahesh ${surname}`, age: 40, relation: 'Brother' }
        ],
        females: [
          { name: `Reena ${surname}`, age: 35, relation: 'Wife' }
        ],
        kids: [
          { name: `Vivaan ${surname}`, age: 12, gender: 'Boy', relation: 'Son' }
        ]
      }
    },
    {
      id: 'fam-4',
      name: `Harilal ${surname} परिवार`,
      headId: 'm-8',
      headName: `Harilal ${surname}`,
      city: 'Dhamnod',
      type: 'Joint',
      membersCount: 14,
      malesCount: 6,
      femalesCount: 6,
      kidsCount: 2,
      phone: '+91 98765 43208',
      members: {
        males: [
          { name: `Harilal ${surname}`, age: 52, relation: 'Self (मुखिया)' }
        ],
        females: [
          { name: `Asha ${surname}`, age: 48, relation: 'Wife' }
        ],
        kids: []
      }
    },
    {
      id: 'fam-5',
      name: `Rajesh ${surname} परिवार`,
      headId: 'm-1',
      headName: `Rajesh ${surname}`,
      city: defaultCity,
      type: 'Nuclear',
      membersCount: 4,
      malesCount: 1,
      femalesCount: 1,
      kidsCount: 2,
      phone: '+91 98765 43210',
      members: {
        males: [
          { name: `Rajesh ${surname}`, age: 32, relation: 'Self (मुखिया)' }
        ],
        females: [
          { name: `Savita ${surname}`, age: 29, relation: 'Wife' }
        ],
        kids: [
          { name: `Aarav ${surname}`, age: 8, gender: 'Boy', relation: 'Son' },
          { name: `Ananya ${surname}`, age: 6, gender: 'Girl', relation: 'Daughter' }
        ]
      }
    },
    {
      id: 'fam-6',
      name: `Suresh ${surname} परिवार`,
      headId: 'm-2',
      headName: `Suresh ${surname}`,
      city: 'Sanawad',
      type: 'Nuclear',
      membersCount: 3,
      malesCount: 1,
      femalesCount: 1,
      kidsCount: 1,
      phone: '+91 98765 43211',
      members: {
        males: [
          { name: `Suresh ${surname}`, age: 28, relation: 'Self (मुखिया)' }
        ],
        females: [
          { name: `Pooja ${surname}`, age: 27, relation: 'Wife' }
        ],
        kids: [
          { name: `Ananya ${surname}`, age: 6, gender: 'Girl', relation: 'Daughter' }
        ]
      }
    },
    {
      id: 'fam-7',
      name: `Mahesh ${surname} परिवार`,
      headId: 'm-3',
      headName: `Mahesh ${surname}`,
      city: 'Khargone',
      type: 'Nuclear',
      membersCount: 5,
      malesCount: 2,
      femalesCount: 2,
      kidsCount: 1,
      phone: '+91 98765 43212',
      members: {
        males: [
          { name: `Mahesh ${surname}`, age: 40, relation: 'Self (मुखिया)' }
        ],
        females: [
          { name: `Reena ${surname}`, age: 35, relation: 'Wife' }
        ],
        kids: [
          { name: `Vivaan ${surname}`, age: 12, gender: 'Boy', relation: 'Son' }
        ]
      }
    },
    {
      id: 'fam-8',
      name: `Naresh ${surname} परिवार`,
      headId: 'm-7',
      headName: `Naresh ${surname}`,
      city: 'Dhar',
      type: 'Nuclear',
      membersCount: 4,
      malesCount: 2,
      femalesCount: 1,
      kidsCount: 1,
      phone: '+91 98765 43204',
      members: {
        males: [
          { name: `Naresh ${surname}`, age: 48, relation: 'Self (मुखिया)' }
        ],
        females: [],
        kids: [
          { name: `Kavya ${surname}`, age: 4, gender: 'Girl', relation: 'Daughter' }
        ]
      }
    }
  ];

  return { males, females, kids, families };
};

export const CensusPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, language, setMobileMenuOpen } = useData();
  const surname = getCommunitySurname(currentUser?.community);
  
  // States
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, males, females, kids, joint-families, nuclear-families, family-details
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [censusData, setCensusData] = useState({
    summary: {
      totalMembers: 0,
      malesCount: 0,
      femalesCount: 0,
      kidsCount: 0,
      totalFamiliesCount: 0,
      jointFamiliesCount: 0,
      nuclearFamiliesCount: 0,
      activeCitiesCount: 0,
      eventsCount: 0
    },
    males: [],
    females: [],
    kids: [],
    families: [],
    citiesBreakdown: [],
    ageBrackets: { '0-17': 0, '18-25': 0, '26-35': 0, '36-50': 0, '50+': 0 }
  });
  const [loadingCensus, setLoadingCensus] = useState(true);
  const [censusError, setCensusError] = useState(null);

  useEffect(() => {
    if (location.state?.view) {
      setCurrentView(location.state.view);
    }
  }, [location.state]);

  const fetchLiveCensusData = async () => {
    try {
      setLoadingCensus(true);
      setCensusError(null);
      const res = await axiosPrivate.get('/member/census/summary');
      if (res.data && res.data.data) {
        setCensusData(res.data.data);
      }
    } catch (err) {
      console.error('[Census Live API Error]', err);
      setCensusError(err.response?.data?.message || err.message || 'Failed to load census data');
    } finally {
      setLoadingCensus(false);
    }
  };

  useEffect(() => {
    fetchLiveCensusData();
  }, []);

  const males = censusData.males || [];
  const females = censusData.females || [];
  const kids = censusData.kids || [];
  const families = censusData.families || [];
  const summary = censusData.summary || {};
  const citiesBreakdown = censusData.citiesBreakdown || [];
  const ageBrackets = censusData.ageBrackets || { '0-17': 0, '18-25': 0, '26-35': 0, '36-50': 0, '50+': 0 };

  // Dynamic Demographic Stats
  const totalMembers = summary.totalMembers || (males.length + females.length + kids.length);
  const malePercent = totalMembers > 0 ? (males.length / totalMembers) * 100 : 0;
  const femalePercent = totalMembers > 0 ? (females.length / totalMembers) * 100 : 0;
  const kidsPercent = totalMembers > 0 ? (kids.length / totalMembers) * 100 : 0;

  const totalFamiliesCount = summary.totalFamiliesCount || families.length;
  const jointFamiliesCount = summary.jointFamiliesCount || families.filter(f => f.type === 'Joint').length;
  const nuclearFamiliesCount = summary.nuclearFamiliesCount || families.filter(f => f.type === 'Nuclear').length;
  const otherFamiliesCount = totalFamiliesCount - (jointFamiliesCount + nuclearFamiliesCount);

  const jointPercent = totalFamiliesCount > 0 ? (jointFamiliesCount / totalFamiliesCount) * 100 : 0;
  const nuclearPercent = totalFamiliesCount > 0 ? (nuclearFamiliesCount / totalFamiliesCount) * 100 : 0;
  const otherPercent = totalFamiliesCount > 0 ? (otherFamiliesCount / totalFamiliesCount) * 100 : 0;
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('');
  const [selectedMaritalStatus, setSelectedMaritalStatus] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [openCityDropdown, setOpenCityDropdown] = useState(false);
  const [openAgeDropdown, setOpenAgeDropdown] = useState(false);
  const [openMaritalDropdown, setOpenMaritalDropdown] = useState(false);

  // Update Data Request Form State
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    memberName: '',
    relation: 'Self',
    phone: '',
    fieldToUpdate: 'Name',
    newValue: '',
    reason: ''
  });
  const [updateSubmitted, setUpdateSubmitted] = useState(false);

  // Activity Feed Interaction States
  const [showRecentModal, setShowRecentModal] = useState(false);
  const [showBloodCampsModal, setShowBloodCampsModal] = useState(false);

  // Download Simulator State
  const [downloadState, setDownloadState] = useState(null); // generating, exporting, finished, null
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Print Preview Mode
  const [printPreviewMode, setPrintPreviewMode] = useState(false);

  useEffect(() => {
    if (isFilterModalOpen || isUpdateModalOpen || showRecentModal || showBloodCampsModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFilterModalOpen, isUpdateModalOpen, showRecentModal, showBloodCampsModal]);

  // Filter logic helper
  const filterMember = (m, genderGroup) => {
    // Search query match
    const matchesSearch = !searchQuery || 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (m.fatherName && m.fatherName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.phone && m.phone.includes(searchQuery)) ||
      (m.city && m.city.toLowerCase().includes(searchQuery.toLowerCase()));

    // City match
    const matchesCity = !selectedCity || m.city === selectedCity;

    // Marital Status match
    const matchesMarital = !selectedMaritalStatus || m.maritalStatus === selectedMaritalStatus;

    // Age Group match
    let matchesAge = true;
    if (selectedAgeGroup) {
      const age = m.age;
      if (selectedAgeGroup === '18-25') matchesAge = age >= 18 && age <= 25;
      else if (selectedAgeGroup === '26-35') matchesAge = age >= 26 && age <= 35;
      else if (selectedAgeGroup === '36-50') matchesAge = age >= 36 && age <= 50;
      else if (selectedAgeGroup === '50+') matchesAge = age > 50;
      else if (selectedAgeGroup === '0-5') matchesAge = age >= 0 && age <= 5;
      else if (selectedAgeGroup === '6-10') matchesAge = age >= 6 && age <= 10;
      else if (selectedAgeGroup === '11-14') matchesAge = age >= 11 && age <= 14;
      else if (selectedAgeGroup === '15-17') matchesAge = age >= 15 && age <= 17;
    }

    return matchesSearch && matchesCity && matchesMarital && matchesAge;
  };

  const filteredMales = males.filter(m => filterMember(m, 'male'));
  const filteredFemales = females.filter(m => filterMember(m, 'female'));
  const filteredKids = kids.filter(m => filterMember(m, 'kid'));
  
  const filteredFamilies = families.filter(f => {
    const matchesSearch = !searchQuery || 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      f.headName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = !selectedCity || f.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  const jointFamiliesList = filteredFamilies.filter(f => f.type === 'Joint');
  const nuclearFamiliesList = filteredFamilies.filter(f => f.type === 'Nuclear');

  // Simulator Download Handler
  const triggerCSVDownload = () => {
    setDownloadState('generating');
    setDownloadProgress(20);
    
    setTimeout(() => {
      setDownloadProgress(60);
      setDownloadState('exporting');
    }, 800);

    setTimeout(() => {
      setDownloadProgress(100);
      setDownloadState('finished');
      
      // Actual CSV generation
      const headers = 'Member ID,Name,Gender,Age,City,Phone Number,Relation,Education,Profession\n';
      const maleLines = males.map(m => `M-${m.id},"${m.name}","Male",${m.age},"${m.city}","${m.phone}","${m.relation}","${m.education}","${m.profession}"`);
      const femaleLines = females.map(f => `F-${f.id},"${f.name}","Female",${f.age},"${f.city}","${f.phone}","${f.relation}","${f.education}","${f.profession}"`);
      const kidLines = kids.map(k => `K-${k.id},"${k.name}","Kids",${k.age},"${k.city}","-","${k.relation}","-","-"`);
      
      const csvContent = headers + [...maleLines, ...femaleLines, ...kidLines].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${currentUser.community.replace(/\s+/g, '_')}_Census_Report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 1600);

    setTimeout(() => {
      setDownloadState(null);
      setDownloadProgress(0);
    }, 2800);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!updateForm.memberName || !updateForm.newValue || !updateForm.reason) {
      alert('Please fill out all required fields.');
      return;
    }
    try {
      setUpdateSubmitted(true);
      await axiosPrivate.post('/member/census/update-request', updateForm);
      setTimeout(() => {
        setUpdateSubmitted(false);
        setIsUpdateModalOpen(false);
        setUpdateForm({
          memberName: '',
          relation: 'Self',
          phone: '',
          fieldToUpdate: 'Name',
          newValue: '',
          reason: ''
        });
      }, 1500);
    } catch (err) {
      setUpdateSubmitted(false);
      alert(err.response?.data?.message || err.message || 'Failed to submit update request.');
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedCity('');
    setSelectedAgeGroup('');
    setSelectedMaritalStatus('');
    setSearchQuery('');
    setOpenCityDropdown(false);
    setOpenAgeDropdown(false);
    setOpenMaritalDropdown(false);
  };

  // SVG Donut Chart segment rendering helper
  const renderDonutSlice = (percent, color, offset) => {
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const strokeDash = (percent / 100) * circumference;
    const strokeOffset = -(offset / 100) * circumference;

    return (
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="transparent"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={`${strokeDash} ${circumference}`}
        strokeDashoffset={strokeOffset}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
        transform="rotate(-90 50 50)"
      />
    );
  };

  return (
    <div className={`min-h-screen bg-gray-50/70 pb-24 ${printPreviewMode ? 'bg-white p-0 pb-0' : ''}`}>
      
      {/* ─── HEADER / ACTION BAR — Glass morphism ─── */}
      {!printPreviewMode && (
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-purple-100/30 px-5 py-3 flex items-center justify-between shadow-[0_2px_12px_rgba(124,58,237,0.02)]">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (currentView === 'dashboard') setMobileMenuOpen(true);
                else if (currentView === 'family-details') {
                  setCurrentView(selectedFamily.type === 'Joint' ? 'joint-families' : 'nuclear-families');
                } else setCurrentView('dashboard');
              }}
              className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-text-primary hover:bg-purple-50 transition-colors press-scale"
            >
              {currentView === 'dashboard' ? (
                <Menu size={22} strokeWidth={2.5} />
              ) : (
                <ArrowLeft size={18} strokeWidth={2.5} />
              )}
            </button>
            <div>
              <h1 className="text-[17px] font-bold text-text-primary leading-tight tracking-tight">
                {currentView === 'dashboard' && (language === 'en' ? 'Community Census' : 'समाज विवरण')}
                {currentView === 'males' && (language === 'en' ? 'Male Members' : 'पुरुष सदस्य')}
                {currentView === 'females' && (language === 'en' ? 'Female Members' : 'महिला सदस्य')}
                {currentView === 'kids' && (language === 'en' ? 'Children (0-17 yrs)' : 'बच्चे (0-17 वर्ष)')}
                {currentView === 'joint-families' && (language === 'en' ? 'Joint Families' : 'संयुक्त परिवार सूची')}
                {currentView === 'nuclear-families' && (language === 'en' ? 'Nuclear Families' : 'एकल परिवार सूची')}
                {currentView === 'family-details' && (language === 'en' ? 'Family Demographics' : 'परिवार विवरण')}
                {currentView === 'cities' && (language === 'en' ? 'Active Cities' : 'सक्रिय शहर')}
              </h1>
              <p className="text-[10px] font-bold text-brand-primary tracking-wide mt-0.5">
                {currentUser?.community} · {currentUser?.city}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsUpdateModalOpen(true)}
              className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100/50 flex items-center justify-center text-brand-primary hover:bg-purple-100/50 transition-all press-scale"
              title="Request Data Update"
            >
              <RefreshCw size={15} />
            </button>
            <button 
              onClick={() => setPrintPreviewMode(true)}
              className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100/50 flex items-center justify-center text-brand-primary hover:bg-purple-100/50 transition-all press-scale"
              title="Print Census Report"
            >
              <Printer size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ─── PRINT PREVIEW BAR (Only visible in Print Preview Mode) ─── */}
      {printPreviewMode && (
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-50 print:hidden">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-amber-400" />
            <span className="text-[13px] font-bold">Print Preview Dashboard</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => window.print()}
              className="px-4 py-1.5 bg-brand-primary text-white text-[12px] font-bold rounded-lg shadow-md active:scale-95 transition-transform"
            >
              Print Now
            </button>
            <button 
              onClick={() => setPrintPreviewMode(false)}
              className="px-4 py-1.5 bg-slate-800 border border-slate-700 text-gray-300 text-[12px] font-bold rounded-lg hover:text-white active:scale-95 transition-transform"
            >
              Exit Preview
            </button>
          </div>
        </div>
      )}

      {/* ─── MAIN CONTENT VIEWER ─── */}
      <div className={`px-5 py-4 ${printPreviewMode ? 'px-8 py-8' : ''}`}>
        
        {/* VIEW 1: DASHBOARD */}
        {currentView === 'dashboard' && !printPreviewMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Quick Header Banner */}
            <div className="bg-gradient-to-br from-[#6366f1] via-[#4f46e5] to-[#3b82f6] rounded-[32px] p-6 text-white shadow-xl shadow-indigo-100/40 relative overflow-hidden mb-6 border border-indigo-400/20">
              <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 animate-pulse" />
              <div className="absolute bottom-0 left-0 w-28 h-28 bg-blue-400/20 rounded-full blur-xl -ml-10 -mb-10" />
              <div className="relative z-10">
                <span className="bg-white/20 text-white text-[9.5px] font-extrabold px-3.5 py-1 rounded-full uppercase tracking-widest border border-white/10">
                  {language === 'en' ? 'Real-time Samaj Census' : 'समाज जनगणना - सांख्यिकी और रिपोर्ट्स'}
                </span>
                <h2 className="text-[24px] font-serif font-black mt-3.5 leading-tight tracking-tight">
                  {language === 'en' ? 'Community Demographics' : 'समाज जनगणना डेशबोर्ड'}
                </h2>
                <p className="text-white/85 text-[12.5px] mt-1.5 leading-relaxed max-w-[290px] font-medium">
                  {language === 'en' ? 'Detailed statistical insights, active reports, age filters, and family groups.' : 'विस्तृत सदस्य आँकड़े, शहरवार रिपोर्ट एवं परिवारों के सम्बंधों का संपूर्ण विवरण।'}
                </p>
              </div>
            </div>

            {/* Card: Active Cities (Placed above CENSUS SUMMARY) */}
            <motion.div 
              whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentView('cities')}
              className="bg-white/90 backdrop-blur-xl border border-white/60 p-4.5 rounded-[24px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_10px_30px_rgb(249,115,22,0.08)] flex items-center justify-between min-h-[88px] cursor-pointer group transition-all mb-5"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-[14px] bg-orange-50 border border-orange-100 text-orange-500 flex items-center justify-center shadow-sm group-hover:bg-orange-500 group-hover:text-white transition-all">
                  <MapPin size={18} />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block tracking-widest uppercase">{language === 'en' ? 'Active Cities' : 'सक्रिय शहर'}</span>
                  <h4 className="text-[17px] font-black text-slate-800 leading-none mt-1 group-hover:text-orange-600 transition-colors">{citiesBreakdown.length} {language === 'en' ? 'Cities' : 'शहर'}</h4>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
            </motion.div>

            {/* Demographics Overview Grid */}
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-[11.5px] font-black text-gray-400 tracking-wider uppercase">
                {language === 'en' ? 'CENSUS SUMMARY' : 'जनगणना संख्यात्मक झलक'}
              </h3>
              <div className="w-9 h-[1px] bg-gray-200 flex-1 ml-3" />
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              
              {/* Card: Total Members */}
              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-white/90 backdrop-blur-xl border border-white/60 p-5 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between min-h-[116px] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider">{language === 'en' ? 'Total Members' : 'कुल सदस्य'}</span>
                  <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                    <Users size={15} />
                  </div>
                </div>
                <div className="relative z-10 mt-3">
                  <h4 className="text-[28px] font-black bg-clip-text text-transparent bg-gradient-to-br from-indigo-950 to-indigo-700 tracking-tight leading-none">{totalMembers.toLocaleString()}</h4>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-2.5 py-0.5 rounded-full mt-2 inline-block shadow-sm">100% Samaj</span>
                </div>
              </motion.div>

              {/* Card: Male Members */}
              <motion.div 
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentView('males')}
                className="bg-white/90 backdrop-blur-xl border border-white/60 p-5 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_15px_40px_rgb(59,130,246,0.1)] flex flex-col justify-between min-h-[116px] cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 transition-colors group-hover:bg-blue-500/10" />
                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-[12px] font-extrabold text-slate-500 group-hover:text-blue-600 transition-colors uppercase tracking-wider">{language === 'en' ? 'Males' : 'पुरुष सदस्य'}</span>
                  <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <User size={15} />
                  </div>
                </div>
                <div className="relative z-10 mt-3">
                  <h4 className="text-[28px] font-black text-slate-800 group-hover:text-blue-700 tracking-tight leading-none transition-colors">{males.length}</h4>
                  <span className="text-[10px] font-extrabold text-slate-400 group-hover:text-blue-500 flex items-center gap-1 mt-2 transition-colors">
                    {language === 'en' ? 'View Directory' : 'पूरी सूची देखें'} <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </motion.div>

              {/* Card: Female Members */}
              <motion.div 
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentView('females')}
                className="bg-white/90 backdrop-blur-xl border border-white/60 p-5 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_15px_40px_rgb(236,72,153,0.1)] flex flex-col justify-between min-h-[116px] cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 transition-colors group-hover:bg-pink-500/10" />
                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-[12px] font-extrabold text-slate-500 group-hover:text-pink-600 transition-colors uppercase tracking-wider">{language === 'en' ? 'Females' : 'महिला सदस्य'}</span>
                  <div className="w-8 h-8 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-500 shadow-sm group-hover:bg-pink-500 group-hover:text-white transition-all">
                    <User size={15} />
                  </div>
                </div>
                <div className="relative z-10 mt-3">
                  <h4 className="text-[28px] font-black text-slate-800 group-hover:text-pink-600 tracking-tight leading-none transition-colors">{females.length}</h4>
                  <span className="text-[10px] font-extrabold text-slate-400 group-hover:text-pink-500 flex items-center gap-1 mt-2 transition-colors">
                    {language === 'en' ? 'View Directory' : 'पूरी सूची देखें'} <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </motion.div>

              {/* Card: Children */}
              <motion.div 
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentView('kids')}
                className="bg-white/90 backdrop-blur-xl border border-white/60 p-5 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_15px_40px_rgb(16,185,129,0.1)] flex flex-col justify-between min-h-[116px] cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 transition-colors group-hover:bg-emerald-500/10" />
                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-[12px] font-extrabold text-slate-500 group-hover:text-emerald-600 transition-colors uppercase tracking-wider">{language === 'en' ? 'Children' : 'बच्चे (0-17)'}</span>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <Sparkles size={14} />
                  </div>
                </div>
                <div className="relative z-10 mt-3">
                  <h4 className="text-[28px] font-black text-slate-800 group-hover:text-emerald-700 tracking-tight leading-none transition-colors">{kids.length}</h4>
                  <span className="text-[10px] font-extrabold text-slate-400 group-hover:text-emerald-500 flex items-center gap-1 mt-2 transition-colors">
                    {language === 'en' ? 'View Directory' : 'पूरी सूची देखें'} <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </motion.div>

              {/* Card: Total Families */}
              <motion.div 
                whileHover={{ y: -2 }}
                className="bg-white/90 backdrop-blur-xl border border-white/60 p-5 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_15px_40px_rgb(124,58,237,0.08)] flex flex-col justify-between min-h-[120px] col-span-2 relative overflow-hidden transition-shadow"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
                <div className="relative z-10 flex items-center justify-between mb-3">
                  <span className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider">{language === 'en' ? 'Samaj Families' : 'कुल परिवार'}</span>
                  <span className="text-[16px] font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-purple-500">{totalFamiliesCount} {language === 'en' ? 'Families' : 'परिवार'}</span>
                </div>
                <div className="relative z-10 grid grid-cols-3 gap-2.5">
                  <motion.div 
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                    onClick={() => setCurrentView('joint-families')}
                    className="bg-purple-50 border border-purple-100 hover:bg-purple-100 hover:border-purple-200 rounded-2xl p-2.5 text-center cursor-pointer transition-all shadow-sm"
                  >
                    <span className="text-[10px] font-bold text-purple-600 block uppercase tracking-wider">{language === 'en' ? 'Joint' : 'संयुक्त'}</span>
                    <span className="text-[15px] font-black text-purple-900 mt-0.5 block">{jointFamiliesCount}</span>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                    onClick={() => setCurrentView('nuclear-families')}
                    className="bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200 rounded-2xl p-2.5 text-center cursor-pointer transition-all shadow-sm"
                  >
                    <span className="text-[10px] font-bold text-emerald-600 block uppercase tracking-wider">{language === 'en' ? 'Nuclear' : 'एकल'}</span>
                    <span className="text-[15px] font-black text-emerald-900 mt-0.5 block">{nuclearFamiliesCount}</span>
                  </motion.div>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 text-center shadow-sm opacity-80">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">{language === 'en' ? 'Others' : 'अन्य'}</span>
                    <span className="text-[15px] font-black text-slate-700 mt-0.5 block">{otherFamiliesCount}</span>
                  </div>
                </div>
              </motion.div>

              {/* Card: Matrimonial Interest */}
              <motion.div 
                whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/member/matrimonial')}
                className="bg-white/90 backdrop-blur-xl border border-white/60 p-4.5 rounded-[24px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_10px_30px_rgb(244,63,94,0.08)] flex items-center justify-between min-h-[88px] col-span-2 cursor-pointer group transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-[14px] bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center shadow-sm group-hover:bg-rose-500 group-hover:text-white transition-all">
                    <Heart size={18} className="group-hover:fill-white transition-colors" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 block tracking-widest uppercase">{language === 'en' ? 'Matrimony Profiles' : 'विवाह हेतु रुचि'}</span>
                    <h4 className="text-[16px] font-black text-slate-800 leading-none mt-1.5 group-hover:text-rose-600 transition-colors">
                      {males.length + females.length} {language === 'en' ? 'Community Profiles' : 'समुदाय बायोडाटा'}
                    </h4>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
              </motion.div>

            </div>

            {/* ─── REPORTS & ANALYTICS SECTION ─── */}
            <div className="flex items-center justify-between mb-4 mt-8">
              <h3 className="text-[11.5px] font-black text-gray-400 tracking-wider uppercase flex items-center gap-1.5">
                <BarChart2 size={15} className="text-[#4f46e5]" />
                {language === 'en' ? 'REPORTS & DEMOGRAPHIC ANALYTICS' : 'रिपोर्ट्स और विश्लेषण (Demographics)'}
              </h3>
              <div className="w-9 h-[1px] bg-gray-200 flex-1 ml-3" />
            </div>

            <div className="flex flex-col gap-6">

              {/* Chart 1: Gender Distribution Donut */}
              <div className="bg-gradient-to-br from-white to-gray-50/20 border border-gray-150/80 rounded-[28px] p-5 shadow-sm/5 transition-all hover:border-indigo-200">
                <h4 className="text-[14.5px] font-black text-gray-900">{language === 'en' ? 'Member Distribution' : 'सामुदायिक सदस्य रिपोर्ट'}</h4>
                <p className="text-[11px] text-gray-500 font-semibold mb-4">{language === 'en' ? 'Gender demographics division' : `कुल सदस्य : ${totalMembers}`}</p>
                
                <div className="flex items-center justify-between gap-4">
                  {/* SVG Donut */}
                  <div className="relative w-24 h-24 shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      {/* Grey background track */}
                      <circle cx="50" cy="50" r="35" fill="transparent" stroke="#f8fafc" strokeWidth="10" />
                      {/* Segment 1: Male */}
                      {renderDonutSlice(malePercent, '#3b82f6', 0)}
                      {/* Segment 2: Female */}
                      {renderDonutSlice(femalePercent, '#ec4899', malePercent)}
                      {/* Segment 3: Kids */}
                      {renderDonutSlice(kidsPercent, '#10b981', malePercent + femalePercent)}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[15px] font-black text-gray-900">{totalMembers >= 1000 ? `${(totalMembers / 1000).toFixed(1)}K` : totalMembers}</span>
                      <span className="text-[8px] font-bold text-gray-400 uppercase">Total</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-100" />
                        <span className="text-[12px] font-semibold text-gray-700">{language === 'en' ? 'Males' : 'पुरुष'}</span>
                      </div>
                      <span className="text-[12px] font-bold text-gray-900">{males.length} ({malePercent.toFixed(1)}%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-sm shadow-pink-100" />
                        <span className="text-[12px] font-semibold text-gray-700">{language === 'en' ? 'Females' : 'महिलाएं'}</span>
                      </div>
                      <span className="text-[12px] font-bold text-gray-900">{females.length} ({femalePercent.toFixed(1)}%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-100" />
                        <span className="text-[12px] font-semibold text-gray-700">{language === 'en' ? 'Kids (0-17)' : 'बच्चे'}</span>
                      </div>
                      <span className="text-[12px] font-bold text-gray-900">{kids.length} ({kidsPercent.toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart 2: Age Group Bar Chart */}
              <div className="bg-gradient-to-br from-white to-gray-50/20 border border-gray-150/80 rounded-[28px] p-5 shadow-sm/5 transition-all hover:border-indigo-200">
                <h4 className="text-[14.5px] font-black text-gray-900">{language === 'en' ? 'Age Group demographics' : 'आयु वर्ग सांख्यिकी रिपोर्ट'}</h4>
                <p className="text-[11px] text-gray-500 font-semibold mb-5">{language === 'en' ? 'Demographic division by age limits' : 'सक्रिय वयस्क समूह'}</p>
                
                {/* Custom CSS Bar Graph */}
                <div className="flex justify-between items-end h-32 px-4 pb-2 border-b border-gray-100">
                  {['0-17', '18-25', '26-35', '36-50', '50+'].map((bracket) => {
                    const val = ageBrackets[bracket] || 0;
                    const maxVal = Math.max(...Object.values(ageBrackets), 1);
                    const barHeight = Math.max((val / maxVal) * 80, 8);
                    return (
                      <div key={bracket} className="flex flex-col items-center gap-2 w-10">
                        <span className="text-[10px] font-bold text-gray-500">{val}</span>
                        <div className="w-5.5 bg-gradient-to-t from-[#4f46e5] to-[#818cf8] rounded-t-xl hover:opacity-90 transition-opacity shadow-sm shadow-indigo-150/50" style={{ height: `${barHeight}px` }} />
                        <span className="text-[10px] font-extrabold text-gray-600 mt-1 whitespace-nowrap">{bracket}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart 3: City-wise Report horizontal progress list */}
              <div className="bg-gradient-to-br from-white to-gray-50/20 border border-gray-150/80 rounded-[28px] p-5 shadow-sm/5 transition-all hover:border-indigo-200">
                <h4 className="text-[14.5px] font-black text-gray-900">{language === 'en' ? 'Active Regional Hubs' : 'शहरवार सदस्यता रिपोर्ट'}</h4>
                <p className="text-[11px] text-gray-500 font-semibold mb-4">{language === 'en' ? 'Cities with active members list' : 'शीर्ष सक्रिय शहर'}</p>
                
                <div className="flex flex-col gap-3.5">
                  {citiesBreakdown.length > 0 ? (
                    citiesBreakdown.slice(0, 5).map((c, idx) => {
                      const maxCityCount = Math.max(...citiesBreakdown.map(b => b.count), 1);
                      const percent = Math.min((c.count / maxCityCount) * 100, 100);
                      return (
                        <div key={c.name || idx}>
                          <div className="flex justify-between items-center text-[12px] font-semibold text-gray-700 mb-1">
                            <span>{c.name}</span>
                            <span className="font-bold text-gray-900">{c.count}</span>
                          </div>
                          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-[12px] text-gray-400 text-center py-2">No regional data available</p>
                  )}
                </div>
              </div>

              {/* Chart 4: Family Type Donut */}
              <div className="bg-gradient-to-br from-white to-gray-50/20 border border-gray-150/80 rounded-[28px] p-5 shadow-sm/5 transition-all hover:border-emerald-250">
                <h4 className="text-[14.5px] font-black text-gray-900">{language === 'en' ? 'Family Type distribution' : 'परिवार प्रकार रिपोर्ट'}</h4>
                <p className="text-[11px] text-gray-500 font-semibold mb-4">{language === 'en' ? 'Joint vs Nuclear division' : `कुल परिवार : ${totalFamiliesCount}`}</p>
                
                <div className="flex items-center justify-between gap-4">
                  {/* SVG Donut */}
                  <div className="relative w-24 h-24 shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <circle cx="50" cy="50" r="35" fill="transparent" stroke="#f8fafc" strokeWidth="10" />
                      {/* Nuclear */}
                      {renderDonutSlice(nuclearPercent, '#10b981', 0)}
                      {/* Joint */}
                      {renderDonutSlice(jointPercent, '#8b5cf6', nuclearPercent)}
                      {/* Other */}
                      {renderDonutSlice(otherPercent, '#94a3b8', nuclearPercent + jointPercent)}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[15px] font-black text-gray-900">{totalFamiliesCount}</span>
                      <span className="text-[8px] font-bold text-gray-400 uppercase">Families</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-600 shadow-sm shadow-purple-100" />
                        <span className="text-[12px] font-semibold text-gray-700">{language === 'en' ? 'Joint Families' : 'संयुक्त परिवार'}</span>
                      </div>
                      <span className="text-[12px] font-bold text-gray-900">{jointFamiliesCount} ({jointPercent.toFixed(0)}%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-100" />
                        <span className="text-[12px] font-semibold text-gray-700">{language === 'en' ? 'Nuclear Families' : 'एकल परिवार'}</span>
                      </div>
                      <span className="text-[12px] font-bold text-gray-900">{nuclearFamiliesCount} ({nuclearPercent.toFixed(0)}%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                        <span className="text-[12px] font-semibold text-gray-700">{language === 'en' ? 'Other Sizes' : 'अन्य'}</span>
                      </div>
                      <span className="text-[12px] font-bold text-gray-900">{otherFamiliesCount} ({otherPercent.toFixed(0)}%)</span>
                    </div>
                  </div>
                </div>
              </div>



            </div>

            {/* Extra Features Action Buttons Grid */}
            <h3 className="text-[13px] font-bold text-text-secondary tracking-widest uppercase mb-3.5 mt-8">
              {language === 'en' ? 'ADDITIONAL OPTIONS' : 'अतिरिक्त सुविधाएं'}
            </h3>
            
            <div className="grid grid-cols-2 gap-3 mb-10">
              <button 
                onClick={() => setIsFilterModalOpen(true)}
                className="flex items-center gap-2 p-3 bg-white border border-gray-150 rounded-2xl active:scale-95 transition-transform text-gray-700 shadow-sm"
              >
                <Filter size={15} className="text-brand-primary" />
                <span className="text-[12.5px] font-extrabold">{language === 'en' ? 'Advanced Filter' : 'एडवांस फिल्टर'}</span>
              </button>
              
              <button 
                onClick={triggerCSVDownload}
                className="flex items-center gap-2 p-3 bg-white border border-gray-150 rounded-2xl active:scale-95 transition-transform text-gray-700 shadow-sm"
              >
                <Download size={15} className="text-emerald-500" />
                <span className="text-[12.5px] font-extrabold">{language === 'en' ? 'Excel / PDF Export' : 'एक्सेल / PDF डाउनलोड'}</span>
              </button>
            </div>

          </motion.div>
        )}

        {/* PRINTABLE PREVIEW / FULL PAGE VIEW (Only displayed when Print Preview active or in print CSS) */}
        {(printPreviewMode) && (
          <div className="bg-white p-4 text-black font-sans print:p-0">
            <div className="text-center border-b-2 border-gray-800 pb-5 mb-6">
              <h1 className="text-[26px] font-serif font-black text-gray-900">{currentUser?.community || 'Samaj'} Census Report</h1>
              <p className="text-[13px] text-gray-600 mt-1">Comprehensive demographic registry for the active chapter: {currentUser?.city || 'Indore'}</p>
              <div className="flex justify-center gap-6 mt-3 text-[12px] font-semibold text-gray-800">
                <span>Total Members: {totalMembers}</span>
                <span>Families: {totalFamiliesCount}</span>
                <span>Active Cities: {citiesBreakdown.length}</span>
                <span>Report Generated: {new Date().toLocaleDateString()}</span>
              </div>
            </div>

            {/* Demographics table */}
            <h3 className="text-[15px] font-bold border-b border-gray-300 pb-1 mb-3">1. Demographics Summary</h3>
            <table className="w-full text-left border-collapse border border-gray-300 mb-6 text-[12px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 font-bold">Category</th>
                  <th className="border border-gray-300 p-2 font-bold">Count</th>
                  <th className="border border-gray-300 p-2 font-bold">Percentage</th>
                  <th className="border border-gray-300 p-2 font-bold">Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-2">Male Members (पुरुष सदस्य)</td>
                  <td className="border border-gray-300 p-2">{males.length}</td>
                  <td className="border border-gray-300 p-2">{((males.length / (totalMembers || 1)) * 100).toFixed(1)}%</td>
                  <td className="border border-gray-300 p-2">Active: {males.filter(m => m.active !== false).length}, Inactive: {males.filter(m => m.active === false).length}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2">Female Members (महिला सदस्य)</td>
                  <td className="border border-gray-300 p-2">{females.length}</td>
                  <td className="border border-gray-300 p-2">{((females.length / (totalMembers || 1)) * 100).toFixed(1)}%</td>
                  <td className="border border-gray-300 p-2">Active: {females.filter(f => f.active !== false).length}, Inactive: {females.filter(f => f.active === false).length}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2">Children (0-17 yrs) (बच्चे)</td>
                  <td className="border border-gray-300 p-2">{kids.length}</td>
                  <td className="border border-gray-300 p-2">{((kids.length / (totalMembers || 1)) * 100).toFixed(1)}%</td>
                  <td className="border border-gray-300 p-2">Boys: {kids.filter(k => k.gender === 'Boy' || k.gender === 'Male').length}, Girls: {kids.filter(k => k.gender === 'Girl' || k.gender === 'Female').length}</td>
                </tr>
                <tr className="font-bold">
                  <td className="border border-gray-300 p-2">Total Community Registry</td>
                  <td className="border border-gray-300 p-2">{totalMembers}</td>
                  <td className="border border-gray-300 p-2">100%</td>
                  <td className="border border-gray-300 p-2">Database Live Sync</td>
                </tr>
              </tbody>
            </table>

            {/* Families table */}
            <h3 className="text-[15px] font-bold border-b border-gray-300 pb-1 mb-3">2. Family Statistics</h3>
            <table className="w-full text-left border-collapse border border-gray-300 mb-6 text-[12px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 font-bold">Family Type</th>
                  <th className="border border-gray-300 p-2 font-bold">Total Families</th>
                  <th className="border border-gray-300 p-2 font-bold">Percentage</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-2">Joint Families (संयुक्त परिवार)</td>
                  <td className="border border-gray-300 p-2">{jointFamiliesCount}</td>
                  <td className="border border-gray-300 p-2">{totalFamiliesCount > 0 ? ((jointFamiliesCount / totalFamiliesCount) * 100).toFixed(0) : 0}%</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2">Nuclear Families (एकल परिवार)</td>
                  <td className="border border-gray-300 p-2">{nuclearFamiliesCount}</td>
                  <td className="border border-gray-300 p-2">{totalFamiliesCount > 0 ? ((nuclearFamiliesCount / totalFamiliesCount) * 100).toFixed(0) : 0}%</td>
                </tr>
                {otherFamiliesCount > 0 && (
                  <tr>
                    <td className="border border-gray-300 p-2">Other Sizes (अन्य)</td>
                    <td className="border border-gray-300 p-2">{otherFamiliesCount}</td>
                    <td className="border border-gray-300 p-2">{totalFamiliesCount > 0 ? ((otherFamiliesCount / totalFamiliesCount) * 100).toFixed(0) : 0}%</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="mt-12 text-center text-gray-500 text-[10px] border-t border-gray-200 pt-4">
              This report is generated dynamically by MeriSamaj community software and is meant for internal community reference only.
            </div>
          </div>
        )}


        {/* VIEWS 2 & 3: MALE / FEMALE MEMBER LISTS */}
        {(currentView === 'males' || currentView === 'females') && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            
            {/* Demographic charts & breakdown inside lists */}
            <div className="bg-white border border-gray-155 rounded-3xl p-4 shadow-sm mb-5">
              <div className="flex items-center gap-3 border-b border-gray-50 pb-3 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${currentView === 'males' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                  <User size={16} />
                </div>
                <div>
                  <h3 className="text-[13.5px] font-black text-gray-900">
                    {currentView === 'males' ? 'Male Demographics (पुरुष आँकड़े)' : 'Female Demographics (महिला आँकड़े)'}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    {language === 'en' ? 'demographics filters & lists' : 'आँकड़े, वैवाहिक स्थिति एवं आयु समूह'}
                  </p>
                </div>
              </div>

              {/* Inner details Grid */}
              {(() => {
                const currentList = currentView === 'males' ? males : females;
                const activeCount = currentList.filter(m => m.active !== false).length;
                const inactiveCount = currentList.filter(m => m.active === false).length;

                const b18_25 = currentList.filter(m => m.age >= 18 && m.age <= 25).length;
                const b26_35 = currentList.filter(m => m.age >= 26 && m.age <= 35).length;
                const b36_50 = currentList.filter(m => m.age >= 36 && m.age <= 50).length;
                const b50plus = currentList.filter(m => m.age > 50).length;
                const maxBracket = Math.max(b18_25, b26_35, b36_50, b50plus, 1);

                const barColor = currentView === 'males' ? 'bg-blue-500' : 'bg-pink-500';

                return (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-center mb-4">
                      <div className="bg-gray-50 rounded-xl p-2">
                        <span className="text-[9px] font-bold text-gray-400 block">{language === 'en' ? 'Total' : 'कुल संख्या'}</span>
                        <span className="text-[15px] font-black text-gray-800">{currentList.length}</span>
                      </div>
                      <div className="bg-emerald-50/50 rounded-xl p-2 border border-emerald-100/30">
                        <span className="text-[9px] font-bold text-emerald-500 block">{language === 'en' ? 'Active' : 'सक्रिय'}</span>
                        <span className="text-[15px] font-black text-emerald-700">{activeCount}</span>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2">
                        <span className="text-[9px] font-bold text-gray-400 block">{language === 'en' ? 'Inactive' : 'निष्क्रिय'}</span>
                        <span className="text-[15px] font-black text-gray-600">{inactiveCount}</span>
                      </div>
                    </div>

                    {/* Age Range Progress Indicators */}
                    <h4 className="text-[11.5px] font-black text-gray-500 mb-2 uppercase tracking-wide">
                      {language === 'en' ? 'Age division' : 'आयु वर्ग अनुसार वर्गीकरण'}
                    </h4>
                    <div className="flex flex-col gap-2 border-b border-gray-50 pb-3.5 mb-3">
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-gray-700 mb-0.5">
                          <span>18-25 Yrs (वर्ष)</span>
                          <span>{b18_25}</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.round((b18_25 / maxBracket) * 100)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-gray-700 mb-0.5">
                          <span>26-35 Yrs (वर्ष)</span>
                          <span>{b26_35}</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.round((b26_35 / maxBracket) * 100)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-gray-700 mb-0.5">
                          <span>36-50 Yrs (वर्ष)</span>
                          <span>{b36_50}</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.round((b36_50 / maxBracket) * 100)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-gray-700 mb-0.5">
                          <span>50+ Yrs (वर्ष)</span>
                          <span>{b50plus}</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.round((b50plus / maxBracket) * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Marital Status chart representation */}
              <h4 className="text-[11.5px] font-black text-gray-500 mb-2.5 uppercase tracking-wide">
                {language === 'en' ? 'Marital Status' : 'वैवाहिक स्थिति'}
              </h4>
              {(() => {
                const currentList = currentView === 'males' ? males : females;
                const single = currentList.filter(m => m.maritalStatus === 'Single' || m.maritalStatus === 'Unmarried').length;
                const married = currentList.filter(m => m.maritalStatus === 'Married').length;
                const other = currentList.filter(m => m.maritalStatus === 'Other').length;
                const notSpecified = Math.max(0, currentList.length - (single + married + other));

                const total = currentList.length || 1;
                const sPct = (single / total) * 100;
                const mPct = (married / total) * 100;
                const oPct = (other / total) * 100;
                const nPct = (notSpecified / total) * 100;

                return (
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 shrink-0">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <circle cx="50" cy="50" r="35" fill="transparent" stroke="#f3f4f6" strokeWidth="12" />
                        {renderDonutSlice(sPct, currentView === 'males' ? '#3b82f6' : '#ec4899', 0)}
                        {renderDonutSlice(mPct, '#e11d48', sPct)}
                        {renderDonutSlice(oPct, '#9333ea', sPct + mPct)}
                        {renderDonutSlice(nPct, '#94a3b8', sPct + mPct + oPct)}
                      </svg>
                    </div>
                    <div className={`flex-1 grid ${notSpecified > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5 text-left text-[11px]`}>
                      <div>
                        <span className="font-extrabold text-gray-600 block">{language === 'en' ? 'Single' : 'अविवाहित'}</span>
                        <span className="font-serif font-black text-gray-900">{single}</span>
                      </div>
                      <div>
                        <span className="font-extrabold text-gray-600 block">{language === 'en' ? 'Married' : 'विवाहित'}</span>
                        <span className="font-serif font-black text-gray-900">{married}</span>
                      </div>
                      <div>
                        <span className="font-extrabold text-purple-700 block" title="Divorced / Widowed / Widower">{language === 'en' ? 'Other' : 'विधुर/विधवा'}</span>
                        <span className="font-serif font-black text-purple-900">{other}</span>
                      </div>
                      {notSpecified > 0 && (
                        <div>
                          <span className="font-extrabold text-gray-400 block">{language === 'en' ? 'Not Specified' : 'अनिर्दिष्ट'}</span>
                          <span className="font-serif font-black text-gray-500">{notSpecified}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* List Header, Search & Filter Button */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex-1 bg-white border border-gray-150 rounded-2xl flex items-center px-3.5 py-2 shadow-sm focus-within:border-brand-primary/20 transition-all">
                <Search size={15} className="text-gray-400 mr-2" />
                <input 
                  type="text"
                  placeholder={language === 'en' ? 'Search members...' : 'नाम, पिता का नाम, फ़ोन या शहर से खोजें...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-[13px] bg-transparent outline-none text-gray-800 placeholder-gray-400"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-gray-400 p-0.5"><X size={14} /></button>
                )}
              </div>
              <button 
                onClick={() => setIsFilterModalOpen(true)}
                className={`p-2.5 rounded-2xl border flex items-center justify-center active:scale-95 transition-all shadow-sm ${selectedCity || selectedAgeGroup || selectedMaritalStatus ? 'bg-brand-primary/5 border-brand-primary/20 text-brand-primary' : 'bg-white border-gray-150 text-gray-600'}`}
              >
                <Filter size={16} />
              </button>
            </div>

            {/* Selected Active Filters Chips */}
            {(selectedCity || selectedAgeGroup || selectedMaritalStatus) && (
              <div className="flex flex-wrap gap-1.5 mb-3.5">
                {selectedCity && (
                  <span className="bg-gray-100 text-gray-700 text-[10.5px] font-extrabold pl-2.5 pr-1.5 py-1 rounded-full flex items-center gap-1">
                    City: {selectedCity}
                    <button onClick={() => setSelectedCity('')} className="p-0.5 text-gray-400 hover:text-gray-600"><X size={10} /></button>
                  </span>
                )}
                {selectedAgeGroup && (
                  <span className="bg-gray-100 text-gray-700 text-[10.5px] font-extrabold pl-2.5 pr-1.5 py-1 rounded-full flex items-center gap-1">
                    Age: {selectedAgeGroup} Yr
                    <button onClick={() => setSelectedAgeGroup('')} className="p-0.5 text-gray-400 hover:text-gray-600"><X size={10} /></button>
                  </span>
                )}
                {selectedMaritalStatus && (
                  <span className="bg-gray-100 text-gray-700 text-[10.5px] font-extrabold pl-2.5 pr-1.5 py-1 rounded-full flex items-center gap-1">
                    Status: {selectedMaritalStatus}
                    <button onClick={() => setSelectedMaritalStatus('')} className="p-0.5 text-gray-400 hover:text-gray-600"><X size={10} /></button>
                  </span>
                )}
                <button onClick={resetFilters} className="text-[11px] font-bold text-[#1e58b8] px-2 py-1">Clear all</button>
              </div>
            )}

            {/* List Render */}
            <div className="flex flex-col gap-2.5">
              {(currentView === 'males' ? filteredMales : filteredFemales).map(member => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  key={member.id}
                  className="bg-white/90 backdrop-blur-xl border border-white/60 p-4 rounded-[20px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgb(124,58,237,0.08)] relative overflow-hidden flex items-center gap-3.5 cursor-pointer transition-all group"
                  onClick={() => navigate('/member/directory/' + member.id)}
                >
                  <div className="w-13 h-13 rounded-full bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center relative shadow-inner">
                    <img 
                      src={member.avatar || member.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || 'Member')}&background=1e58b8&color=ffffff&font-size=0.4&bold=true`} 
                      className="w-full h-full object-cover" 
                      alt={member.name} 
                    />
                    {!member.active && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-[8px] font-black text-white bg-slate-800 px-1 rounded">Muted</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[14.5px] font-black text-slate-900 leading-tight truncate group-hover:text-brand-primary transition-colors">{member.name}</h4>
                    <p className="text-[11.5px] font-semibold text-slate-500 mt-0.5">
                      {currentView === 'males' ? 'पिता' : 'पति/पिता'}: {member.fatherName}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5 text-[11px] text-gray-400 font-semibold">
                      <span className="bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 text-gray-600 font-extrabold">{member.age} {language === 'en' ? 'years' : 'वर्ष'}</span>
                      <span className="flex items-center gap-0.5"><MapPin size={10} /> {member.city}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <motion.a whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} href={`tel:${member.phone}`} className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 transition-colors hover:bg-blue-600 hover:text-white shadow-sm">
                      <Phone size={13} />
                    </motion.a>
                    <motion.button onClick={(e) => { e.stopPropagation(); navigate(`/member/chat/member/${member.id}`); }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 transition-colors hover:bg-emerald-600 hover:text-white shadow-sm">
                      <MessageCircle size={13} />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
              {(currentView === 'males' ? filteredMales : filteredFemales).length === 0 && (
                <div className="text-center py-10 bg-white border border-gray-100 rounded-3xl p-6 text-gray-400">
                  <AlertCircle className="mx-auto mb-2 opacity-50" size={24} />
                  <p className="text-sm font-semibold">{language === 'en' ? 'No members match search query' : 'इस खोज के अनुसार कोई सदस्य नहीं मिला'}</p>
                </div>
              )}
            </div>

          </motion.div>
        )}


        {/* VIEW 4: CHILDREN LIST */}
        {currentView === 'kids' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            {/* Age Range Breakdown */}
            <div className="bg-white border border-gray-150 rounded-3xl p-4 shadow-sm mb-5">
              <div className="flex items-center gap-3 border-b border-gray-50 pb-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Sparkles size={15} />
                </div>
                <div>
                  <h3 className="text-[13.5px] font-black text-gray-900">{language === 'en' ? 'Children demographics (0-17)' : 'बाल सांख्यिकी एवं आयु विवरण'}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{language === 'en' ? 'Demographic details of children' : 'आयु समूह : 0 से 17 वर्ष तक'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div className="bg-gray-50 rounded-xl p-2">
                  <span className="text-[9px] font-bold text-gray-400 block">{language === 'en' ? 'Total kids' : 'कुल बच्चे'}</span>
                  <span className="text-[15px] font-black text-gray-800">{kids.length}</span>
                </div>
                <div className="bg-blue-50/50 rounded-xl p-2 border border-blue-100/30">
                  <span className="text-[9px] font-bold text-blue-500 block">{language === 'en' ? 'Boys' : 'लड़के'}</span>
                  <span className="text-[15px] font-black text-blue-700">{kids.filter(k => k.gender === 'Boy' || k.gender === 'Male').length}</span>
                </div>
                <div className="bg-pink-50/50 rounded-xl p-2 border border-pink-100/30">
                  <span className="text-[9px] font-bold text-pink-500 block">{language === 'en' ? 'Girls' : 'लड़कियां'}</span>
                  <span className="text-[15px] font-black text-pink-700">{kids.filter(k => k.gender === 'Girl' || k.gender === 'Female').length}</span>
                </div>
              </div>

              {/* Progress of kids age range */}
              <h4 className="text-[11.5px] font-black text-gray-500 mb-2 uppercase tracking-wide">
                {language === 'en' ? 'Age limits distribution' : 'आयु समूहानुसार बच्चे'}
              </h4>
              <div className="flex flex-col gap-2">
                {(() => {
                  const k0_5 = kids.filter(k => k.age >= 0 && k.age <= 5).length;
                  const k6_10 = kids.filter(k => k.age >= 6 && k.age <= 10).length;
                  const k11_14 = kids.filter(k => k.age >= 11 && k.age <= 14).length;
                  const k15_17 = kids.filter(k => k.age >= 15 && k.age <= 17).length;
                  const maxKidGroup = Math.max(k0_5, k6_10, k11_14, k15_17, 1);

                  return (
                    <>
                      <div>
                        <div className="flex justify-between text-[11.5px] font-bold text-gray-700 mb-0.5">
                          <span>0 - 5 Yrs (नवजात/शिशु)</span>
                          <span>{k0_5}</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round((k0_5 / maxKidGroup) * 100)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11.5px] font-bold text-gray-700 mb-0.5">
                          <span>6 - 10 Yrs (बालक/बालिका)</span>
                          <span>{k6_10}</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round((k6_10 / maxKidGroup) * 100)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11.5px] font-bold text-gray-700 mb-0.5">
                          <span>11 - 14 Yrs (किशोर)</span>
                          <span>{k11_14}</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round((k11_14 / maxKidGroup) * 100)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11.5px] font-bold text-gray-700 mb-0.5">
                          <span>15 - 17 Yrs (तरुण)</span>
                          <span>{k15_17}</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round((k15_17 / maxKidGroup) * 100)}%` }} />
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* List Header, Search & Filter Button */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex-1 bg-white border border-gray-150 rounded-2xl flex items-center px-3.5 py-2 shadow-sm focus-within:border-brand-primary/20 transition-all">
                <Search size={15} className="text-gray-400 mr-2" />
                <input 
                  type="text"
                  placeholder={language === 'en' ? 'Search children...' : 'बच्चे का नाम, पिता या शहर से खोजें...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-[13px] bg-transparent outline-none text-gray-800 placeholder-gray-400"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-gray-400 p-0.5"><X size={14} /></button>
                )}
              </div>
              <button 
                onClick={() => setIsFilterModalOpen(true)}
                className={`p-2.5 rounded-2xl border flex items-center justify-center active:scale-95 transition-all shadow-sm ${selectedCity || selectedAgeGroup ? 'bg-brand-primary/5 border-brand-primary/20 text-brand-primary' : 'bg-white border-gray-150 text-gray-600'}`}
              >
                <Filter size={16} />
              </button>
            </div>

            {/* List Render */}
            <div className="flex flex-col gap-2.5">
              {filteredKids.map(member => (
                <div 
                  key={member.id}
                  className="bg-white border border-gray-150/70 p-4 rounded-2xl shadow-sm/5 relative overflow-hidden flex items-center gap-3.5 cursor-pointer hover:border-emerald-500/40 transition-colors"
                  onClick={() => navigate('/member/directory/' + member.id)}
                >
                  <div className="w-13 h-13 rounded-full bg-emerald-50 border border-emerald-100 overflow-hidden shrink-0 flex items-center justify-center relative shadow-inner">
                    <img src={`https://i.pravatar.cc/100?u=${member.id}`} className="w-full h-full object-cover" alt="" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full border border-white flex items-center justify-center text-[7px] text-white font-extrabold bg-emerald-500">
                      {member.gender === 'Boy' ? 'B' : 'G'}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-[14.5px] font-extrabold text-gray-900 leading-tight truncate">{member.name}</h4>
                      <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded uppercase ${member.gender === 'Boy' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                        {member.gender}
                      </span>
                    </div>
                    <p className="text-[11.5px] font-semibold text-gray-500 mt-1">
                      {language === 'en' ? 'Parent' : 'पिता'}: {member.fatherName}
                    </p>
                    <div className="flex items-center gap-2.5 mt-1 text-[11px] text-gray-400 font-semibold">
                      <span className="bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 text-gray-600 font-extrabold">{member.age} {language === 'en' ? 'years' : 'वर्ष'}</span>
                      <span className="flex items-center gap-0.5"><MapPin size={10} /> {member.city}</span>
                    </div>
                  </div>
                </div>
              ))}
              {filteredKids.length === 0 && (
                <div className="text-center py-10 bg-white border border-gray-100 rounded-3xl p-6 text-gray-400">
                  <AlertCircle className="mx-auto mb-2 opacity-50" size={24} />
                  <p className="text-sm font-semibold">{language === 'en' ? 'No children match search query' : 'इस खोज के अनुसार कोई बच्चा नहीं मिला'}</p>
                </div>
              )}
            </div>

          </motion.div>
        )}


        {/* VIEWS 5 & 6: JOINT / NUCLEAR FAMILY LISTS */}
        {(currentView === 'joint-families' || currentView === 'nuclear-families') && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            
            {/* Search filter families */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex-1 bg-white border border-gray-150 rounded-2xl flex items-center px-3.5 py-2 shadow-sm focus-within:border-brand-primary/20 transition-all">
                <Search size={15} className="text-gray-400 mr-2" />
                <input 
                  type="text"
                  placeholder={language === 'en' ? 'Search families by head or city...' : 'परिवार मुखिया, शहर या नाम से खोजें...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-[13px] bg-transparent outline-none text-gray-800 placeholder-gray-400"
                />
              </div>
            </div>

            {/* Render List */}
            <div className="flex flex-col gap-3">
              {(currentView === 'joint-families' ? jointFamiliesList : nuclearFamiliesList).map(fam => (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  key={fam.id}
                  onClick={() => {
                    setSelectedFamily(fam);
                    setCurrentView('family-details');
                  }}
                  className="bg-white/90 backdrop-blur-xl border border-white/60 p-5 rounded-[28px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgb(139,92,246,0.08)] relative overflow-hidden cursor-pointer transition-all group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 transition-colors group-hover:bg-brand-primary/10" />
                  <div className="flex items-start justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0 shadow-sm transition-colors ${currentView === 'joint-families' ? 'bg-purple-50 border border-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white' : 'bg-emerald-50 border border-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'}`}>
                        <Home size={18} />
                      </div>
                      <div>
                        <h4 className="text-[16px] font-black text-slate-900 leading-tight group-hover:text-brand-primary transition-colors">{fam.name}</h4>
                        <p className="text-[11.5px] font-semibold text-slate-500 mt-1">
                          {language === 'en' ? 'Family Head' : 'परिवार मुखिया'}: {fam.headName}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-brand-primary bg-brand-primary/5 border border-brand-primary/20 rounded-full px-2.5 py-1 tracking-widest uppercase shadow-sm">
                      {fam.city}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center mt-5 pt-4 border-t border-slate-100 relative z-10">
                    <div className="bg-slate-50 rounded-2xl p-2.5">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">{language === 'en' ? 'Total' : 'सदस्य'}</span>
                      <span className="text-[15px] font-black text-slate-800">{fam.membersCount}</span>
                    </div>
                    <div className="bg-blue-50/50 rounded-2xl p-2.5">
                      <span className="text-[9px] font-bold text-blue-500 block uppercase tracking-wider">{language === 'en' ? 'Males' : 'पुरुष'}</span>
                      <span className="text-[15px] font-black text-blue-700">{fam.malesCount}</span>
                    </div>
                    <div className="bg-pink-50/50 rounded-2xl p-2.5">
                      <span className="text-[9px] font-bold text-pink-500 block uppercase tracking-wider">{language === 'en' ? 'Females' : 'महिला'}</span>
                      <span className="text-[15px] font-black text-pink-600">{fam.femalesCount}</span>
                    </div>
                    <div className="bg-emerald-50/50 rounded-2xl p-2.5">
                      <span className="text-[9px] font-bold text-emerald-500 block uppercase tracking-wider">{language === 'en' ? 'Kids' : 'बच्चे'}</span>
                      <span className="text-[15px] font-black text-emerald-700">{fam.kidsCount}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

          </motion.div>
        )}


        {/* VIEW 7: FAMILY DETAILS TREE */}
        {currentView === 'family-details' && selectedFamily && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            
            {/* Header / Head Card */}
            <div className="bg-white/90 backdrop-blur-xl border border-white/60 rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden mb-5">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-bl-[80px] blur-xl" />
              <div className="flex items-center gap-5 relative z-10">
                <div className="w-18 h-18 rounded-[20px] overflow-hidden shadow-lg bg-gray-50 relative shrink-0 border border-white">
                  <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedFamily.headName || 'Head')}&background=8b5cf6&color=ffffff&font-size=0.4&bold=true`} 
                    className="w-full h-full object-cover" 
                    alt={selectedFamily.headName} 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="bg-purple-100 text-purple-700 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    {language === 'en' ? 'Family Head' : 'परिवार मुखिया'}
                  </span>
                  <h4 className="text-[20px] font-black text-slate-900 mt-2 leading-tight">{selectedFamily.headName}</h4>
                  <div className="flex flex-wrap items-center gap-x-2 text-[11px] font-semibold text-slate-500 mt-1.5">
                    {(() => {
                      const headMember = males.find(m => m.id === selectedFamily.headId) || selectedFamily.members?.males?.[0];
                      const headAge = headMember?.age || 45;
                      return (
                        <span className="bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">
                          {language === 'en' ? 'Age' : 'उम्र'}: {headAge} {language === 'en' ? 'yrs' : 'वर्ष'}
                        </span>
                      );
                    })()}
                    <span className="text-slate-300">•</span>
                    <span className="bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">{selectedFamily.city}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                  <motion.a whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} href={`tel:${selectedFamily.phone}`} className="w-9 h-9 rounded-[14px] shadow-sm flex items-center justify-center text-blue-600 bg-blue-50 border border-blue-100 transition-colors hover:bg-blue-600 hover:text-white">
                    <Phone size={14} />
                  </motion.a>
                </div>
              </div>

              {/* Counts inside Detail */}
              <div className="grid grid-cols-4 gap-2.5 text-center mt-5 pt-5 border-t border-slate-100 relative z-10">
                <div className="bg-slate-50/80 rounded-[18px] p-2.5 shadow-sm">
                  <span className="text-[9.5px] font-bold text-slate-400 block uppercase tracking-wider">{language === 'en' ? 'Total' : 'कुल सदस्य'}</span>
                  <span className="text-[18px] font-black text-slate-800 leading-tight">{selectedFamily.membersCount}</span>
                </div>
                <div className="bg-blue-50/50 rounded-[18px] p-2.5 border border-blue-100/50 shadow-sm">
                  <span className="text-[9.5px] font-bold text-blue-500 block uppercase tracking-wider">{language === 'en' ? 'Males' : 'पुरुष'}</span>
                  <span className="text-[18px] font-black text-blue-600 leading-tight">{selectedFamily.malesCount}</span>
                </div>
                <div className="bg-pink-50/50 rounded-[18px] p-2.5 border border-pink-100/50 shadow-sm">
                  <span className="text-[9.5px] font-bold text-pink-500 block uppercase tracking-wider">{language === 'en' ? 'Females' : 'महिला'}</span>
                  <span className="text-[18px] font-black text-pink-600 leading-tight">{selectedFamily.femalesCount}</span>
                </div>
                <div className="bg-emerald-50/50 rounded-[18px] p-2.5 border border-emerald-100/50 shadow-sm">
                  <span className="text-[9.5px] font-bold text-emerald-500 block uppercase tracking-wider">{language === 'en' ? 'Kids' : 'बच्चे'}</span>
                  <span className="text-[18px] font-black text-emerald-600 leading-tight">{selectedFamily.kidsCount}</span>
                </div>
              </div>
            </div>

            {/* Tree listing grouped by relation */}
            <h3 className="text-[13px] font-bold text-text-secondary tracking-widest uppercase mb-4 mt-6">
              {language === 'en' ? 'FAMILY MEMBERS REGISTRY' : 'परिवार के सदस्यों की सूची'}
            </h3>

            {/* Group 1: Male Members */}
            {selectedFamily.members.males.length > 0 && (
              <div className="mb-5">
                <h4 className="text-[12px] font-black text-slate-600 mb-2 px-1 flex items-center gap-1.5">
                  <User size={13} /> {language === 'en' ? 'MALE MEMBERS' : 'पुरुष सदस्य'}
                </h4>
                <div className="bg-white border border-gray-100 rounded-3xl divide-y divide-gray-50 overflow-hidden shadow-sm">
                  {selectedFamily.members.males.map((member, i) => (
                    <div key={i} className="flex justify-between items-center p-3.5 px-4 text-[13.5px]">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 font-extrabold text-[12.5px] w-5">{i + 1}.</span>
                        <div>
                          <span className="font-extrabold text-gray-800">{member.name}</span>
                          <span className="text-[10px] font-bold border border-slate-200 text-slate-500 rounded px-1.5 py-0.5 ml-2 uppercase">
                            {member.relation}
                          </span>
                        </div>
                      </div>
                      <span className="text-[12px] font-extrabold text-gray-500">{member.age} {language === 'en' ? 'years' : 'वर्ष'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Group 2: Female Members */}
            {selectedFamily.members.females.length > 0 && (
              <div className="mb-5">
                <h4 className="text-[12px] font-black text-slate-600 mb-2 px-1 flex items-center gap-1.5">
                  <User size={13} /> {language === 'en' ? 'FEMALE MEMBERS' : 'महिला सदस्य'}
                </h4>
                <div className="bg-white border border-gray-100 rounded-3xl divide-y divide-gray-50 overflow-hidden shadow-sm">
                  {selectedFamily.members.females.map((member, i) => (
                    <div key={i} className="flex justify-between items-center p-3.5 px-4 text-[13.5px]">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 font-extrabold text-[12.5px] w-5">{i + 1}.</span>
                        <div>
                          <span className="font-extrabold text-gray-800">{member.name}</span>
                          <span className="text-[10px] font-bold border border-slate-200 text-slate-500 rounded px-1.5 py-0.5 ml-2 uppercase">
                            {member.relation}
                          </span>
                        </div>
                      </div>
                      <span className="text-[12px] font-extrabold text-gray-500">{member.age} {language === 'en' ? 'years' : 'वर्ष'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Group 3: Kids */}
            {selectedFamily.members.kids.length > 0 && (
              <div className="mb-6">
                <h4 className="text-[12px] font-black text-slate-600 mb-2 px-1 flex items-center gap-1.5">
                  <Sparkles size={13} /> {language === 'en' ? 'CHILDREN (0-17 YRS)' : 'बच्चे (0-17 वर्ष)'}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {selectedFamily.members.kids.map((kid, i) => (
                    <div 
                      key={i} 
                      className="bg-white border border-gray-100 rounded-2xl p-3 flex items-center gap-3 shadow-sm"
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-50 border overflow-hidden shrink-0">
                        <img src={`https://i.pravatar.cc/100?u=kid-${i}`} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-[12.5px] font-black text-gray-800 truncate leading-tight">{kid.name}</h5>
                        <p className="text-[10.5px] text-gray-400 font-bold uppercase mt-0.5">{kid.relation}</p>
                        <span className="text-[10.5px] font-bold text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {kid.age} {language === 'en' ? 'Yrs' : 'वर्ष'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </motion.div>
        )}

        {/* VIEW 8: ACTIVE CITIES LIST */}
        {currentView === 'cities' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-white/90 backdrop-blur-xl border border-white/60 rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-5">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-4 mb-4">
                <div className="w-12 h-12 rounded-[18px] bg-orange-50 border border-orange-100 text-orange-500 flex items-center justify-center shadow-sm">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="text-[18px] font-black text-slate-900 leading-tight">
                    {language === 'en' ? `Active Cities (${citiesBreakdown.length})` : `सक्रिय शहर विवरण (${citiesBreakdown.length})`}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    {language === 'en' ? 'Members active per regional chapter' : 'सक्रिय क्षेत्रीय इकाइयाँ'}
                  </p>
                </div>
              </div>
              <p className="text-[11.5px] text-gray-400 font-semibold mb-4 leading-relaxed">
                {language === 'en' 
                  ? `Below are the ${citiesBreakdown.length} active cities within our Samaj directory. Click on any city to set it as a filter and view regional member registers.`
                  : `हमारे समाज में सक्रिय कुल ${citiesBreakdown.length} शहर नीचे सूचीबद्ध हैं। किसी भी शहर पर क्लिक करके आप उस शहर के सदस्यों को फ़िल्टर कर सकते हैं।`}
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {citiesBreakdown.length > 0 ? (
                  citiesBreakdown.map((city, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                      whileHover={{ scale: 1.01, x: 4 }} whileTap={{ scale: 0.98 }}
                      key={city.name || idx}
                      onClick={() => {
                        setSelectedCity(city.name);
                        setCurrentView('males'); // Switch to males view with selected city filter applied
                      }}
                      className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100/50 hover:bg-white hover:border-orange-200 hover:shadow-[0_8px_20px_rgb(249,115,22,0.08)] rounded-2xl cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-[13px] font-black text-slate-300 w-6 text-center group-hover:text-orange-300 transition-colors">{idx + 1}.</span>
                        <div>
                          <h4 className="text-[15px] font-black text-slate-800 leading-none group-hover:text-orange-600 transition-colors">{city.name}</h4>
                          <span className="text-[10px] font-bold text-slate-400 mt-1.5 block tracking-wide uppercase">Active Regional Hub</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[12px] font-bold text-slate-600 bg-white border border-slate-150 rounded-[10px] px-3 py-1 shadow-sm group-hover:border-orange-100 group-hover:text-orange-700 transition-colors">{city.count} {language === 'en' ? 'Members' : 'सदस्य'}</span>
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                    No active cities found.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

      </div>


      {/* ─── DYNAMIC EXPORTS PROGRESS OVERLAY MODAL ─── */}
      {downloadState && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-[320px] text-center shadow-2xl border border-gray-100 flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 animate-bounce">
              <Download size={24} />
            </div>
            <h4 className="text-[16px] font-black text-gray-900">
              {downloadState === 'generating' && 'Generating Spreadsheet...'}
              {downloadState === 'exporting' && 'Exporting Directory Rows...'}
              {downloadState === 'finished' && 'Download Started!'}
            </h4>
            <p className="text-[11.5px] text-gray-400 font-semibold mt-1">
              {downloadState === 'finished' ? 'Your CSV report download initialized.' : 'Compiling community records database.'}
            </p>
            
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-5 relative">
              <div className="bg-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
            </div>
            <span className="text-[11.5px] font-black text-gray-800 mt-2">{downloadProgress}%</span>
          </div>
        </div>
      )}


      {/* ─── FILTER OPTION MODAL ─── */}
      {createPortal(
        <AnimatePresence>
          {isFilterModalOpen && (
            <motion.div
              key="filter-modal"
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-end justify-center print:hidden"
              style={{ touchAction: 'none' }}
              onClick={() => setIsFilterModalOpen(false)}
              onWheel={e => e.stopPropagation()}
              onTouchMove={e => e.stopPropagation()}
            >
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="bg-white rounded-t-[32px] w-full max-w-[480px] p-5 shadow-2xl border-t border-gray-100 max-h-[85vh] overflow-y-auto"
                style={{ touchAction: 'auto' }}
                onClick={e => e.stopPropagation()}
              >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-brand-primary" />
                  <span className="text-[15.5px] font-black text-gray-900">Advanced Filter (सक्रिय फ़िल्टर)</span>
                </div>
                <button 
                  onClick={() => setIsFilterModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 active:scale-90"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {/* City Filter */}
                <div className="relative">
                  <label className="text-[11.5px] font-black text-gray-400 tracking-wider uppercase block mb-1.5">Select City (सक्रिय शहर)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenCityDropdown(!openCityDropdown);
                      setOpenAgeDropdown(false);
                      setOpenMaritalDropdown(false);
                    }}
                    className="w-full bg-gray-50 border border-gray-150 rounded-xl p-3 text-[13px] font-extrabold text-left text-gray-800 flex items-center justify-between"
                  >
                    <span>
                      {selectedCity ? selectedCity : "All Cities (सभी शहर)"}
                    </span>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${openCityDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {openCityDropdown && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-150 rounded-xl shadow-lg z-50 max-h-[160px] overflow-y-auto p-1 flex flex-col gap-0.5">
                      {[
                        { value: "", label: "All Cities (सभी शहर)" },
                        ...citiesBreakdown.map(c => ({ value: c.name, label: `${c.name} (${c.count})` }))
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            setSelectedCity(item.value);
                            setOpenCityDropdown(false);
                          }}
                          className={`p-2.5 text-left text-[12.5px] font-extrabold rounded-lg transition-colors ${selectedCity === item.value ? 'bg-blue-50 text-[#1e58b8]' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Age Group Filter */}
                <div className="relative">
                  <label className="text-[11.5px] font-black text-gray-400 tracking-wider uppercase block mb-1.5">Age Limits (उम्र समूह)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenAgeDropdown(!openAgeDropdown);
                      setOpenCityDropdown(false);
                      setOpenMaritalDropdown(false);
                    }}
                    className="w-full bg-gray-50 border border-gray-150 rounded-xl p-3 text-[13px] font-extrabold text-left text-gray-800 flex items-center justify-between"
                  >
                    <span>
                      {selectedAgeGroup 
                        ? [
                            { value: "0-5", label: "0 - 5 Years (Infants)" },
                            { value: "6-10", label: "6 - 10 Years (Kids)" },
                            { value: "11-14", label: "11 - 14 Years (Teenagers)" },
                            { value: "15-17", label: "15 - 17 Years (Adolescents)" },
                            { value: "18-25", label: "18 - 25 Years (Youth)" },
                            { value: "26-35", label: "26 - 35 Years (Adults)" },
                            { value: "36-50", label: "36 - 50 Years (Mid-Age)" },
                            { value: "50+", label: "50+ Years (Senior)" }
                          ].find(o => o.value === selectedAgeGroup)?.label || selectedAgeGroup
                        : "All Ages (सभी आयु वर्ग)"}
                    </span>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${openAgeDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {openAgeDropdown && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-150 rounded-xl shadow-lg z-50 max-h-[160px] overflow-y-auto p-1 flex flex-col gap-0.5">
                      {[
                        { value: "", label: "All Ages (सभी आयु वर्ग)" },
                        { value: "0-5", label: "0 - 5 Years (Infants)" },
                        { value: "6-10", label: "6 - 10 Years (Kids)" },
                        { value: "11-14", label: "11 - 14 Years (Teenagers)" },
                        { value: "15-17", label: "15 - 17 Years (Adolescents)" },
                        { value: "18-25", label: "18 - 25 Years (Youth)" },
                        { value: "26-35", label: "26 - 35 Years (Adults)" },
                        { value: "36-50", label: "36 - 50 Years (Mid-Age)" },
                        { value: "50+", label: "50+ Years (Senior)" }
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            setSelectedAgeGroup(item.value);
                            setOpenAgeDropdown(false);
                          }}
                          className={`p-2.5 text-left text-[12.5px] font-extrabold rounded-lg transition-colors ${selectedAgeGroup === item.value ? 'bg-blue-50 text-[#1e58b8]' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Marital Status Filter */}
                <div className="relative">
                  <label className="text-[11.5px] font-black text-gray-400 tracking-wider uppercase block mb-1.5">Marital Status (वैवाहिक स्थिति)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMaritalDropdown(!openMaritalDropdown);
                      setOpenCityDropdown(false);
                      setOpenAgeDropdown(false);
                    }}
                    className="w-full bg-gray-50 border border-gray-150 rounded-xl p-3 text-[13px] font-extrabold text-left text-gray-800 flex items-center justify-between"
                  >
                    <span>
                      {selectedMaritalStatus
                        ? [
                            { value: "Single", label: "Single (अविवाहित)" },
                            { value: "Married", label: "Married (विवाहित)" },
                            { value: "Other", label: "Other (विधुर / विधवा / तलाकशुदा)" },
                            { value: "Not Specified", label: "Not Specified (अनिर्दिष्ट)" }
                          ].find(o => o.value === selectedMaritalStatus)?.label || selectedMaritalStatus
                        : "All Status (सभी)"}
                    </span>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${openMaritalDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {openMaritalDropdown && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-150 rounded-xl shadow-lg z-50 max-h-[160px] overflow-y-auto p-1 flex flex-col gap-0.5">
                      {[
                        { value: "", label: "All Status (सभी)" },
                        { value: "Single", label: "Single (अविवाहित)" },
                        { value: "Married", label: "Married (विवाहित)" },
                        { value: "Other", label: "Other (विधुर / विधवा / तलाकशुदा)" },
                        { value: "Not Specified", label: "Not Specified (अनिर्दिष्ट)" }
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            setSelectedMaritalStatus(item.value);
                            setOpenMaritalDropdown(false);
                          }}
                          className={`p-2.5 text-left text-[12.5px] font-extrabold rounded-lg transition-colors ${selectedMaritalStatus === item.value ? 'bg-blue-50 text-[#1e58b8]' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-4">
                  <button 
                    onClick={() => {
                      resetFilters();
                      setIsFilterModalOpen(false);
                    }}
                    className="flex-1 py-3 bg-gray-50 border border-gray-150 text-gray-600 rounded-xl text-[13.5px] font-extrabold active:scale-95 transition-transform"
                  >
                    Reset Filters
                  </button>
                  <button 
                    onClick={() => setIsFilterModalOpen(false)}
                    className="flex-1 py-3 bg-brand-primary text-white rounded-xl text-[13.5px] font-extrabold shadow-lg shadow-brand-primary/20 active:scale-95 transition-transform"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}


      {/* ─── DATA CORRECTION REQUEST MODAL ─── */}
      {createPortal(
        <AnimatePresence>
          {isUpdateModalOpen && (
            <motion.div
              key="update-modal"
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-5 print:hidden"
              style={{ touchAction: 'none' }}
              onClick={() => setIsUpdateModalOpen(false)}
              onWheel={e => e.stopPropagation()}
              onTouchMove={e => e.stopPropagation()}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-[32px] w-full max-w-[400px] p-5 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto"
                style={{ touchAction: 'auto' }}
                onClick={e => e.stopPropagation()}
              >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4.5">
                <div className="flex items-center gap-2">
                  <RefreshCw size={15} className="text-orange-500 animate-spin-slow" />
                  <span className="text-[15.5px] font-black text-gray-900">Request Data Correction</span>
                </div>
                <button 
                  onClick={() => setIsUpdateModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 active:scale-90"
                >
                  <X size={16} />
                </button>
              </div>

              {!updateSubmitted ? (
                <form onSubmit={handleUpdateSubmit} className="flex flex-col gap-3.5">
                  <p className="text-[11.5px] text-gray-400 font-semibold leading-relaxed">
                    Notice an error in demographic charts or a member record? File a correction request. The Samaj Admin will verify and apply it.
                  </p>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 tracking-wider uppercase block mb-1">Member Name (सदस्य का नाम) *</label>
                    <input 
                      type="text"
                      placeholder="e.g. Aarav Agrawal"
                      required
                      value={updateForm.memberName}
                      onChange={e => setUpdateForm({...updateForm, memberName: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl p-2.5 text-[13.5px] font-extrabold outline-none text-gray-800 focus:border-brand-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 tracking-wider uppercase block mb-1">Relation (संबंध)</label>
                      <select
                        value={updateForm.relation}
                        onChange={e => setUpdateForm({...updateForm, relation: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-150 rounded-xl p-2.5 text-[13.5px] font-extrabold outline-none text-gray-800"
                      >
                        <option value="Self">Self (स्वयं)</option>
                        <option value="Father">Father</option>
                        <option value="Son">Son</option>
                        <option value="Wife">Wife</option>
                        <option value="Daughter">Daughter</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 tracking-wider uppercase block mb-1">Phone (फ़ोन) *</label>
                      <input 
                        type="tel"
                        placeholder="9876543210"
                        maxLength={10}
                        required
                        value={updateForm.phone}
                        onChange={e => setUpdateForm({...updateForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                        className="w-full bg-gray-50 border border-gray-150 rounded-xl p-2.5 text-[13.5px] font-extrabold outline-none text-gray-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 tracking-wider uppercase block mb-1">Correction Field (बदलने योग्य फ़ील्ड)</label>
                    <select
                      value={updateForm.fieldToUpdate}
                      onChange={e => setUpdateForm({...updateForm, fieldToUpdate: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl p-2.5 text-[13.5px] font-extrabold outline-none text-gray-800"
                    >
                      <option value="Name">Name Spelling (नाम)</option>
                      <option value="Age">Age / Birthdate (उम्र)</option>
                      <option value="City">Active City (सक्रिय शहर)</option>
                      <option value="Relation">Family Relation (पारिवारिक संबंध)</option>
                      <option value="Profession">Profession / Job (व्यवसाय)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 tracking-wider uppercase block mb-1">Corrected Value (नया सही मान) *</label>
                    <input 
                      type="text"
                      placeholder="e.g. Correct age is 35"
                      required
                      value={updateForm.newValue}
                      onChange={e => setUpdateForm({...updateForm, newValue: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl p-2.5 text-[13.5px] font-extrabold outline-none text-gray-800 focus:border-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 tracking-wider uppercase block mb-1">Reason / Notes (कारण) *</label>
                    <textarea 
                      placeholder="Specify verification reference..."
                      required
                      rows="2"
                      value={updateForm.reason}
                      onChange={e => setUpdateForm({...updateForm, reason: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl p-2.5 text-[13px] font-extrabold outline-none text-gray-800 focus:border-brand-primary resize-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[13.5px] font-extrabold shadow-lg shadow-orange-500/20 active:scale-95 transition-all mt-2.5"
                  >
                    Submit Correction Request
                  </button>
                </form>
              ) : (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                      <Check size={28} strokeWidth={3} />
                    </motion.div>
                  </div>
                  <h4 className="text-[16.5px] font-black text-gray-900">Request Filed Successfully</h4>
                  <p className="text-[12px] text-gray-400 font-semibold mt-1.5 leading-relaxed max-w-[280px]">
                    Correction record submitted. The Samaj Administrator has been notified to verify the details.
                  </p>
                </div>
              )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── RECENT MEMBERS MODAL ─── */}
      {createPortal(
        <AnimatePresence>
          {showRecentModal && (
            <motion.div
              key="recent-modal"
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-5 print:hidden"
              style={{ touchAction: 'none' }}
              onClick={() => setShowRecentModal(false)}
              onWheel={e => e.stopPropagation()}
              onTouchMove={e => e.stopPropagation()}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-[32px] w-full max-w-[400px] p-5 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto"
                style={{ touchAction: 'auto' }}
                onClick={e => e.stopPropagation()}
              >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-blue-500" />
                  <span className="text-[15px] font-black text-gray-900">
                    {language === 'en' ? 'Recently Registered Members' : 'नवीनतम सदस्य पंजीकरण'}
                  </span>
                </div>
                <button 
                  onClick={() => setShowRecentModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 active:scale-90"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
                {[
                  { id: 201, name: 'Rajesh Patel', fatherName: 'Madanlal Patel', age: 34, city: 'Indore', date: '2 days ago' },
                  { id: 202, name: 'Sunita Vyas', fatherName: 'Ramakant Vyas', age: 29, city: 'Jaipur', date: '5 days ago' },
                  { id: 203, name: 'Amit Namdev', fatherName: 'Vijay Namdev', age: 26, city: 'Sanawad', date: '1 week ago' },
                  { id: 204, name: 'Deepika Sharma', fatherName: 'Suresh Sharma', age: 22, city: 'Khargone', date: '10 days ago' },
                  { id: 205, name: 'Vikram Solanki', fatherName: 'Devendra Solanki', age: 41, city: 'Dhamnod', date: '2 weeks ago' }
                ].map(member => (
                  <div key={member.id} className="bg-gray-50/60 border border-gray-100 p-3 rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center border border-gray-200 shadow-inner">
                      <img 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=3b82f6&color=ffffff&font-size=0.4&bold=true`} 
                        className="w-full h-full object-cover" 
                        alt={member.name} 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-extrabold text-gray-900 truncate leading-tight">{member.name}</h4>
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-wider">{member.city} • Registered {member.date}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => navigate('/member/chat/me')} className="w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-emerald-500 hover:scale-105 transition-transform active:scale-90">
                        <MessageCircle size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── BLOOD DONATION CAMPS MODAL ─── */}
      {createPortal(
        <AnimatePresence>
          {showBloodCampsModal && (
            <motion.div
              key="blood-modal"
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-5 print:hidden"
              style={{ touchAction: 'none' }}
              onClick={() => setShowBloodCampsModal(false)}
              onWheel={e => e.stopPropagation()}
              onTouchMove={e => e.stopPropagation()}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-[32px] w-full max-w-[400px] p-5 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto"
                style={{ touchAction: 'auto' }}
                onClick={e => e.stopPropagation()}
              >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-orange-500" />
                  <span className="text-[15px] font-black text-gray-900">
                    {language === 'en' ? 'Blood Donation Campaigns' : 'आयोजित रक्तदान शिविर विवरण'}
                  </span>
                </div>
                <button 
                  onClick={() => setShowBloodCampsModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 active:scale-90"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-3.5 max-h-[350px] overflow-y-auto pr-1">
                {[
                  { location: 'Indore Samaj Bhawan', date: '15 June 2026', collected: '85 Units' },
                  { location: 'Sanawad Community Hall', date: '02 May 2026', collected: '54 Units' },
                  { location: 'Jaipur Samaj Dharamshala', date: '20 March 2026', collected: '110 Units' },
                  { location: 'Khargone School Ground', date: '10 Jan 2026', collected: '42 Units' },
                  { location: 'Dhamnod Center', date: '15 Nov 2025', collected: '38 Units' },
                  { location: 'Barwaha Samaj Bhawan', date: '08 Sep 2025', collected: '60 Units' }
                ].map((camp, idx) => (
                  <div key={idx} className="bg-orange-50/20 border border-orange-100/50 p-3 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-[12.5px] font-extrabold text-gray-800 leading-tight">{camp.location}</h4>
                      <p className="text-[10px] font-semibold text-gray-400 mt-1">{language === 'en' ? 'Date:' : 'दिनांक:'} {camp.date}</p>
                    </div>
                    <span className="text-[11.5px] font-black text-orange-600 bg-orange-50 border border-orange-150 px-2.5 py-0.5 rounded-full shrink-0">
                      {camp.collected}
                    </span>
                  </div>
                ))}
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
