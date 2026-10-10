/**
 * Service for core community settings operations.
 * Simulates API calls with delays.
 */

// Mock initial state
const INITIAL_SETTINGS = {
  general: {
    name: 'Agrawal Samaj Indore',
    description: 'A progressive community for the Agrawal families in Indore.',
    tagline: 'Unity in Diversity',
    mission: 'To unite, uplift and empower our community members.',
    vision: 'A globally recognized, strong, and self-sufficient community.',
    history: 'Established in 1980 by visionary leaders.',
    establishedYear: '1980',
    registrationNumber: 'REG-12345-IND',
    website: 'https://agrawalsamaj.org',
    email: 'contact@agrawalsamaj.org',
    phone: '+91-9876543210',
    officeAddress: '123, Samaj Bhavan, MG Road, Indore, MP',
    workingHours: 'Mon-Sat: 10:00 AM - 6:00 PM',
    supportDetails: '24/7 Helpline: 1800-123-456',
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
  return new Promise((resolve) => {
    setTimeout(() => {
      // In a real app, we would fetch by communityId
      const saved = localStorage.getItem(`community_settings_${communityId}`);
      if (saved) {
        resolve(JSON.parse(saved));
      } else {
        resolve(INITIAL_SETTINGS);
      }
    }, 800);
  });
};

export const updateCommunitySettings = async (communityId, payload) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        localStorage.setItem(`community_settings_${communityId}`, JSON.stringify(payload));
        // Also log to audit history
        resolve({ success: true, message: 'Settings updated successfully' });
      } catch (err) {
        reject(new Error('Failed to update settings'));
      }
    }, 1000);
  });
};

export const resetCommunitySettings = async (communityId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      localStorage.removeItem(`community_settings_${communityId}`);
      resolve({ success: true, data: INITIAL_SETTINGS });
    }, 800);
  });
};
