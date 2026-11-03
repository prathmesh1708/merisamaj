import { axiosPrivate } from '../../../../../core/api/axiosPrivate';

// Defaults are used only for settings that have not been configured yet.
const INITIAL_SETTINGS = {
  general: {
    name: '',
    description: '',
    tagline: '',
    mission: '',
    vision: '',
    history: '',
    establishedYear: '',
    registrationNumber: '',
    website: '',
    email: '',
    phone: '',
    officeAddress: '',
    workingHours: '',
    supportDetails: '',
    mapIframe: ''
  },
  theme: {
    primaryColor: '#7e22ce', // purple-700
    secondaryColor: '#db2777', // pink-600
    accentColor: '#fbbf24', // amber-400
    background: 'light',
    cardRadius: 'large',
    shadowStyle: 'soft',
    buttonStyle: 'rounded',
    glassIntensity: 'medium',
    typographyScale: 'normal'
  },
  branding: { logoUrl: '', bannerUrl: '', primaryColor: '#6f42c1', accentColor: '#db2777' },
  bank: { accountHolderName: '', bankName: '', accountNumber: '', ifscCode: '', upiId: '' },
  automationRules: [],
  auditTimeline: [],
  modules: {
    donation: true,
    matrimonial: true,
    events: true,
    professionalDirectory: true,
    gallery: true,
    news: true,
    polls: false,
    surveys: false,
    achievements: true,
    shradhanjali: true,
    advertisements: false,
    volunteer: true
  },
  registration: {
    enabled: true,
    manualApproval: true,
    referral: false,
    family: true,
    invitation: false,
    waitingList: false,
    requireAadhaar: false,
    requireCertificate: false,
    requireAddress: false,
    requirePhoto: true,
    autoQR: true,
    autoID: true
  },
  directory: {
    showPhone: 'members',
    showEmail: 'members',
    showBusiness: 'public',
    showAddress: 'verified',
    showBloodGroup: 'members',
    showProfession: 'public',
    showFamily: 'members',
    showDonations: 'committee',
    showEvents: 'members'
  },
  matrimonial: {
    enabled: true,
    profileApproval: true,
    autoHideIncomplete: true,
    requireVerification: true,
    requireFamilyApproval: false,
    showContactAfterApproval: true,
    defaultPrivacy: 'private'
  },
  events: {
    qrAttendance: true,
    guestRegistration: true,
    maxSeatsDefault: 500,
    autoWaitingList: true,
    reminderHours: 24,
    certificateGen: false
  },
  professional: {
    enabled: true,
    verificationRequired: true,
    featuredListings: true,
    businessPromotion: true,
    categoryApproval: false
  },
  shradhanjali: {
    enabled: true,
    memberSubmissionEnabled: true,
    requireApproval: true
  },
  security: {
    twoStepApproval: false,
    sensitiveActionConfirm: true,
    sessionTimeout: 60, // minutes
    loginAlerts: true
  },
  homepageContent: {
    hero: {
      backgroundImage: '', // empty by default (fallback to standard landmark image)
      title: 'Welcome to our Samaj Hub',
      subtitle: 'Connecting and empowering community members across the region.',
      buttonText: 'Directory Search',
      buttonLink: '/member/directory'
    },
    exclusiveFeatures: [
      { id: 'professional', label: 'Professional Network', desc: 'Find jobs & hire within the community', path: '/member/professional', icon: 'Briefcase', displayOrder: 1, enabled: true },
      { id: 'directory', label: 'Directory', desc: 'Browse Samaj Members', path: '/member/directory', icon: 'BookOpen', displayOrder: 2, enabled: true },
      { id: 'groups', label: 'Groups', desc: 'Discussions', path: '/member/groups', icon: 'Users', displayOrder: 3, enabled: true },
      { id: 'voting', label: 'Voting', desc: 'Community Polls', path: '/member/voting', icon: 'Vote', displayOrder: 4, enabled: true },
      { id: 'dharmashala', label: 'Dharmashala', desc: 'Book Rooms', path: '/member/dharmashala', icon: 'Home', displayOrder: 5, enabled: true },
      { id: 'fund', label: 'Samaj Fund', desc: 'Community Fund', path: '/member/fund', icon: 'Wallet', displayOrder: 6, enabled: true }
    ],
    promotions: [
      {
        id: 'p1',
        title: 'Refer & Earn Program',
        desc: 'Invite your extended family members to join ApniSamaj platform today and earn community reward points.',
        image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=400&q=80',
        buttonText: 'Invite Family',
        buttonLink: '/member/referral',
        enabled: true
      }
    ]
  }
};

export const fetchCommunitySettings = async (communityId) => {
  const res = await axiosPrivate.get('/head/dashboard/community/settings');
  const community = res.data?.data || {};
  const saved = community.configuration || {};
  return {
    ...INITIAL_SETTINGS,
    ...saved,
    general: {
      ...INITIAL_SETTINGS.general,
      ...(saved.general || {}),
      name: community.name || saved.general?.name || '',
      description: community.description || saved.general?.description || '',
      city: community.city || saved.general?.city || ''
    },
    branding: {
      ...INITIAL_SETTINGS.branding,
      ...(saved.branding || {}),
      logoUrl: community.logoUrl || saved.branding?.logoUrl || '',
      bannerUrl: community.bannerUrl || saved.branding?.bannerUrl || ''
    },
    bank: {
      ...INITIAL_SETTINGS.bank,
      ...(saved.bank || {}),
      ...(community.accountDetails || {})
    },
    modules: {
      ...INITIAL_SETTINGS.modules,
      ...(saved.modules || {}),
      ...(community.settings ? {
        donation: community.settings.donationEnabled,
        matrimonial: community.settings.matrimonialEnabled,
        events: community.settings.eventEnabled,
        professionalDirectory: community.settings.directoryEnabled,
        directory: community.settings.directoryEnabled,
        dharmashala: community.settings.dharmashalaEnabled,
        obituary: community.settings.obituaryEnabled,
        socialFeed: community.settings.socialFeedEnabled
      } : {})
    }
  };
};

export const updateCommunitySettings = async (communityId, payload) => {
  return axiosPrivate.put('/head/dashboard/community/settings', payload);
};

export const resetCommunitySettings = async (communityId) => {
  return axiosPrivate.put('/head/dashboard/community/settings', INITIAL_SETTINGS);
};
