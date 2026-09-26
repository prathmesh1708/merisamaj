const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Auth Fields
  phone: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true },
  loginId: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  plainPassword: { type: String }, // Stored purely for Admin visibility in Head Panel
  
  // Basic Profile Fields
  name: { type: String, required: true, trim: true },
  avatar: { type: String }, // URL from cloudinary or base64
  cover: { type: String }, // Cover image URL
  bio: { type: String, trim: true },
  about: { type: String, trim: true, default: 'Available' },
  gender: { type: String },
  dob: { type: Date },
  bloodGroup: { type: String },
  maritalStatus: { type: String },
  gotra: { type: String },
  familyType: { type: String },
  
  // Social Links
  facebook: { type: String },
  twitter: { type: String },
  linkedin: { type: String },
  
  // Community Fields
  /**
   * communityId — PRIMARY community isolation key (ObjectId ref to Community model).
   * This is the single source of truth for community membership.
   * The old `community` String field below is DEPRECATED and kept only for migration.
   */
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    index: true,
    default: null,
  },
  // @deprecated — use communityId (ObjectId) instead. Will be removed after migration.
  community: { type: String },
  subCommunity: { type: String },
  
  // Location Fields
  city: { type: String },
  district: { type: String },
  state: { type: String },
  pincode: { type: String },
  
  // Education & Profession
  qualification: { type: String },
  school: { type: String },
  passingYear: { type: String },
  profession: { type: String },
  company: { type: String },
  annualIncome: { type: String },
  workCity: { type: String },
  
  // Detailed Address
  houseNumber: { type: String },
  streetAddress: { type: String },
  landmark: { type: String },
  areaAddress: { type: String },
  pincodeAddress: { type: String },
  detailedAddress: { type: String },
  alternatePhone: { type: String },
  alternateEmail: { type: String },
  
  // Profile Privacy Configuration
  isPrivate: { type: Boolean, default: false },
  phonePrivacy: { type: String, enum: ['public', 'followers', 'private'], default: 'followers' },
  emailPrivacy: { type: String, enum: ['public', 'followers', 'private'], default: 'followers' },
  familyPrivacy: { type: String, enum: ['public', 'followers', 'private'], default: 'followers' },
  
  // Family Members Array
  familyMembers: [{
    name: String,
    relation: String,
    age: String,
    dob: Date,
    gender: String,
    phone: String,
    mobile: String,
    gotra: String
  }],
  
  // Preferences (Matrimonial/Other)
  prefEducation: { type: String },
  prefAge: { type: String },
  prefHeight: { type: String },
  prefOccupation: { type: String },
  prefCity: { type: String },
  
  // Verification Flags
  isAadharVerified: { type: Boolean, default: false },
  isFaceVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: true }, // Default true for development ease
  isEmailVerified: { type: Boolean, default: true }, // Default true for development ease
  
  // Centralized Status Fields
  accountStatus: { 
    type: String, 
    enum: ['active', 'inactive', 'blocked', 'deleted', 'pending verification'], 
    default: 'pending verification' 
  },
  verificationStatus: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected'], 
    default: 'pending' // New users require approval by Community Head
  },
  registrationSource: { 
    type: String, 
    default: 'mobile' 
  },
  
  // Preferences
  notificationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    announcements: { type: Boolean, default: true }
  },
  
  // FCM Device tokens for notifications
  deviceTokens: [{ type: String }],
  
  // Audit fields
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  country: { type: String, default: 'India' },
  
  // Referral & Rewards Fields
  referralCode: { type: String, index: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  pointsBalance: { type: Number, default: 0 },
  // Membership & Subscription Fields
  isPremium: { type: Boolean, default: false },
  membershipPlan: { type: String, default: '' },
  membershipExpiry: { type: String, default: '' },
  membershipStartDate: { type: String, default: '' },
  matrimonySubscription: { type: mongoose.Schema.Types.Mixed, default: null },

  role: { 
    type: String, 
    enum: ['user', 'admin', 'head', 'sub_head', 'admin_sub_head'], 
    default: 'user' 
  },

  // Discriminates sub-head category: admin sub-head, community sub-head, or local sub-head
  subHeadType: {
    type: String,
    enum: ['admin', 'community', 'local'],
    default: null
  },

  // Sub-Leader Hierarchy Fields
  parentHeadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Discriminates the purpose of a sub_head account created by an Admin or Head
  // (e.g. Leadership team member vs. Local Head module vs Admin/Community/Local Sub-Head)
  accountType: { 
    type: String, 
    enum: ['leadership', 'local_head', 'admin_sub_head', 'community_sub_head', 'local_sub_head'] 
  },
  designation: { type: String, default: 'Member' },
  department: { type: String },
  termYears: { type: String, default: '2024-2027' },
  joiningDate: { type: Date },
  socialLinks: {
    facebook: { type: String },
    twitter: { type: String },
    linkedin: { type: String },
    whatsapp: { type: String }
  },

  // Assigned communities for Head users (array of ObjectIds for multiple assignments)
  assignedCommunityIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
  }],
  
  // Granular module permissions for Admin Sub-Head users
  adminPermissions: {
    canViewDashboard: { type: Boolean, default: true },
    
    // User & Community Management
    canViewUsers: { type: Boolean, default: false },
    canAddUsers: { type: Boolean, default: false },
    canEditUsers: { type: Boolean, default: false },
    canDeleteUsers: { type: Boolean, default: false },
    canManageCommunities: { type: Boolean, default: false },
    canManageCommunityHeads: { type: Boolean, default: false },
    canManageCities: { type: Boolean, default: false },

    // Platform Modules
    canManageMatrimonial: { type: Boolean, default: false },
    canManageEvents: { type: Boolean, default: false },
    canManageProfessionals: { type: Boolean, default: false },
    canManageDonations: { type: Boolean, default: false },
    canManageFunds: { type: Boolean, default: false },
    canManageDharmashala: { type: Boolean, default: false },
    canManageObituaries: { type: Boolean, default: false },
    canManageCensus: { type: Boolean, default: false },
    canManageLeadership: { type: Boolean, default: false },
    canManageInvitations: { type: Boolean, default: false },
    canManageVoting: { type: Boolean, default: false },

    // Social Management
    canManageSocial: { type: Boolean, default: false },

    // Content, System & Operations
    canManageSubscriptions: { type: Boolean, default: false },
    canManageReferrals: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: false },
    canSendNotifications: { type: Boolean, default: false },
    canManageShortcuts: { type: Boolean, default: false },
    canManageAppContent: { type: Boolean, default: false },
    canManageSubHeads: { type: Boolean, default: false },
    canManageConfig: { type: Boolean, default: false }
  },

  // Granular module permissions for Community & Local Sub-Head users
  headPermissions: {
    canViewDashboard: { type: Boolean, default: true },
    
    // Members
    canViewMembers: { type: Boolean, default: true },
    canAddMembers: { type: Boolean, default: false },
    canEditMembers: { type: Boolean, default: false },
    canRemoveMembers: { type: Boolean, default: false },
    canExportMembers: { type: Boolean, default: false },
    
    // Matrimonial
    canViewProfiles: { type: Boolean, default: true },
    canApproveProfiles: { type: Boolean, default: false },
    canEditProfiles: { type: Boolean, default: false },
    
    // Events
    canViewEvents: { type: Boolean, default: true },
    canCreateEvents: { type: Boolean, default: false },
    canEditEvents: { type: Boolean, default: false },
    canDeleteEvents: { type: Boolean, default: false },
    canManageBookings: { type: Boolean, default: false },
    
    // Donations
    canViewDonations: { type: Boolean, default: true },
    canCreateDonationCampaigns: { type: Boolean, default: false },
    canManageExpenses: { type: Boolean, default: false },

    // Funds
    canViewFunds: { type: Boolean, default: true },
    canManageFunds: { type: Boolean, default: false },

    // Leadership & Sub-Heads
    canViewLeadership: { type: Boolean, default: true },
    canManageLeadership: { type: Boolean, default: false },
    canManageSubHeads: { type: Boolean, default: false },
    canManageLocalCommunity: { type: Boolean, default: false },

    // Dharmashala
    canViewDharmashala: { type: Boolean, default: true },
    canManageDharmashala: { type: Boolean, default: false },

    // Social Feed
    canViewSocial: { type: Boolean, default: true },
    canManageSocial: { type: Boolean, default: false },

    // Community Kitchen / Food
    canViewKitchen: { type: Boolean, default: true },
    canManageKitchen: { type: Boolean, default: false },

    // Professional Directory
    canViewDirectory: { type: Boolean, default: true },
    canManageDirectory: { type: Boolean, default: false },

    // Invitations & Obituary
    canViewInvitations: { type: Boolean, default: true },
    canCreateInvitations: { type: Boolean, default: false },
    canManageInvitations: { type: Boolean, default: false },
    canViewObituary: { type: Boolean, default: true },
    canManageObituary: { type: Boolean, default: false },
    
    // Elections & Home Content
    canViewElections: { type: Boolean, default: true },
    canManageElections: { type: Boolean, default: false },
    canViewHomeContent: { type: Boolean, default: true },
    canManageHomeContent: { type: Boolean, default: false },

    // Census & Reports & Notifications
    canViewCensus: { type: Boolean, default: true },
    canManageCensus: { type: Boolean, default: false },
    canSendNotifications: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: true }
  },

  accountDetails: {
    bankName: { type: String, default: '', trim: true },
    accountNumber: { type: String, default: '', trim: true },
    ifscCode: { type: String, default: '', trim: true },
    upiId: { type: String, default: '', trim: true },
    accountHolderName: { type: String, default: '', trim: true },
    qrCode: { type: String, default: '', trim: true }
  }
}, {
  timestamps: true
});

// Password Hash Middleware
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (this.plainPassword && this.plainPassword === enteredPassword) return true;
  if (this.password === enteredPassword) return true;
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (e) {
    return false;
  }
};

// Compound Indexes for fast Admin & Member queries
userSchema.index({ role: 1, accountStatus: 1, createdAt: -1 });
userSchema.index({ role: 1, verificationStatus: 1, createdAt: -1 });
userSchema.index({ role: 1, communityId: 1, createdAt: -1 });
userSchema.index({ role: 1, city: 1, createdAt: -1 });
userSchema.index({ role: 1, accountStatus: 1, communityId: 1, designation: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
