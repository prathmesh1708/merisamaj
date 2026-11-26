const mongoose = require('mongoose');
const { syncMembership } = require('../services/membershipService');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');
const { notifyInvitationAccepted, notifySecurityAlert, notifyLocalHeadNewMember } = require('../services/notificationService');
const { sendPushNotification } = require('../services/pushNotificationService');
const familyService = require('../services/familyService');
const otpService = require('../services/otpService');
const aadhaarSerializer = require('../utils/aadhaarSerializer');

// Centralized production-secure cookie helper
const getCookieOptions = (maxAgeMs = 7 * 24 * 60 * 60 * 1000) => {
  const isProd = config.nodeEnv === 'production';
  return {
    httpOnly: true, // Defense against XSS attacks
    secure: isProd, // True in production (HTTPS required), false in dev HTTP
    sameSite: isProd ? 'none' : 'lax', // 'none' for cross-domain prod cookies, 'lax' for dev
    path: '/',
    maxAge: maxAgeMs,
  };
};

// Helper to generate stateless access and refresh tokens
const generateTokens = (user) => {
  const isPrivileged = ['admin', 'head', 'sub_head', 'admin_sub_head'].includes(user.role);
  
  // `sv` = the account's session version: bumping it logs out every device
  const sv = user.sessionVersion || 0;
  const accessToken = jwt.sign(
    { id: user._id, role: user.role, subHeadType: user.subHeadType, sv },
    config.jwtSecret,
    { expiresIn: isPrivileged ? '1d' : config.jwtExpiresIn }
  );

  const refreshToken = jwt.sign(
    { id: user._id, sv },
    config.jwtRefreshSecret,
    { expiresIn: isPrivileged ? '1d' : config.jwtRefreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

// A token from before the account's sessions were ended (see User.sessionVersion)
const sessionEnded = (decoded, user) => (decoded?.sv || 0) !== (user?.sessionVersion || 0);

const COMMUNITY_MODULE_KEYS = [
  'matrimonialEnabled', 'aadharVerificationEnabled', 'donationEnabled', 'invitationEnabled', 'eventEnabled', 'directoryEnabled',
  'dharmashalaEnabled', 'obituaryEnabled', 'socialFeedEnabled', 'fundEnabled', 'votingEnabled',
  'censusEnabled', 'successStoriesEnabled', 'leadershipEnabled', 'familyEnabled', 'referralEnabled',
  'memberDirectoryEnabled', 'chatEnabled',
  'homeTodayUpdatesEnabled', 'homeUpcomingEventsEnabled', 'homeCommunityFeedEnabled'
];

const getEffectiveCommunityModuleSettings = (user) => {
  const community = user.communityId && typeof user.communityId === 'object' ? user.communityId : null;
  if (!community) return {};
  const parent = community.settings || {};
  const subCommunityName = String(user.subCommunity || '').trim().toLowerCase();
  const sub = community.subCommunities?.find(item => String(item.name || '').trim().toLowerCase() === subCommunityName);
  return Object.fromEntries(COMMUNITY_MODULE_KEYS.map(key => [
    key,
    parent[key] !== false && sub?.settings?.[key] !== false
  ]));
};

const getUserResponsePayload = (user) => {
  return {
    id: user._id,
    name: user.name || 'Profile Incomplete',
    phone: user.phone,
    email: user.email,
    role: user.role,
    subHeadType: user.subHeadType || null,
    avatar: user.avatar,
    cover: user.cover,
    bio: user.bio || '',
    about: user.about || user.bio || 'Available',
    facebook: user.facebook || '',
    twitter: user.twitter || '',
    linkedin: user.linkedin || '',
    gender: user.gender,
    dob: user.dob,
    bloodGroup: user.bloodGroup,
    maritalStatus: user.maritalStatus,
    gotra: user.gotra,
    communityId: user.communityId,
    communityModuleSettings: getEffectiveCommunityModuleSettings(user),
    assignedCommunityId: user.assignedCommunityId,
    assignedCommunityIds: user.assignedCommunityIds,
    headPermissions: user.headPermissions,
    adminPermissions: user.adminPermissions,
    community: user.communityId?.name || user.community || '',
    communityLogo: user.communityId?.logoUrl || '',
    communityBanner: user.communityId?.bannerUrl || '',
    communityDescription: user.communityId?.description || '',
    communityCity: user.communityId?.city || '',
    subCommunity: user.subCommunity,
    mustChooseSubCommunity: !!user.mustChooseSubCommunity,
    requestedCommunity: user.requestedCommunity || '',
    requestedSubCommunity: user.requestedSubCommunity || '',
    city: user.city,
    district: user.district,
    state: user.state,
    pincode: user.pincode,
    country: user.country || 'India',
    qualification: user.qualification,
    school: user.school,
    passingYear: user.passingYear,
    profession: user.profession,
    company: user.company,
    annualIncome: user.annualIncome,
    workCity: user.workCity,
    houseNumber: user.houseNumber,
    streetAddress: user.streetAddress,
    landmark: user.landmark,
    areaAddress: user.areaAddress,
    pincodeAddress: user.pincodeAddress,
    detailedAddress: user.detailedAddress,
    address: user.detailedAddress || user.streetAddress || user.areaAddress || '',
    alternatePhone: user.alternatePhone,
    alternateEmail: user.alternateEmail,
    familyMembers: user.familyMembers || [],
    familyId: user.familyId || null,
    memberRecordId: user.memberRecordId || null,
    prefEducation: user.prefEducation,
    prefAge: user.prefAge,
    prefHeight: user.prefHeight,
    prefOccupation: user.prefOccupation,
    prefCity: user.prefCity,
    isAadharVerified: user.isAadharVerified || false,
    // Own profile: status, verified name, masked number (when the query selected it)
    ...aadhaarSerializer.selfAadhaar(user),
    isFaceVerified: user.isFaceVerified || false,
    accountStatus: user.accountStatus,
    verificationStatus: user.verificationStatus || 'pending',
    isVerified: user.verificationStatus === 'verified',
    isPremium: user.isPremium || false,
    membershipPlan: user.membershipPlan || '',
    membershipExpiry: user.membershipExpiry || '',
    membershipStartDate: user.membershipStartDate || '',
    matrimonySubscription: user.matrimonySubscription || null,
    proBadge: user.proBadge || false,
    appFeatures: user.appFeatures || null,
    appPinUsage: user.appPinUsage || null,
    accountType: user.accountType || null,
    designation: user.designation || '',
    department: user.department || '',
    parentHeadId: user.parentHeadId || null,
    referralCode: user.referralCode || '',
    pointsBalance: user.pointsBalance || 0,
    totalPointsEarned: user.totalPointsEarned || 0
  };
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  let { name, phone, email, password, referralCode } = req.body;

  try {
    // Normalize: validators middleware already cleaned these, but apply again as safety net
    if (name) name = name.trim().replace(/\s+/g, ' ');
    if (phone) phone = phone.replace(/\D/g, '');

    const userExists = await User.findOne({ phone });
    if (userExists) {
      return res.status(400).json({ success: false, errors: { phone: 'This mobile number is already registered.' } });
    }

    const userData = {
      name: name.trim(),
      phone,
      password,
      // NOTE: req.body.referralCode is the INVITER's code — it must not become this
      // user's own code (that gave two accounts the same code and lost the
      // inviter's points). The new user always gets a fresh code below.
      accountStatus: 'pending verification',
      verificationStatus: 'pending', // Pending approval by Community Head
      isPhoneVerified: true,
      isEmailVerified: true
    };

    // Community & city are NOT known yet at this step — the user picks them in
    // Onboarding Step 2, which then calls updateProfile() to save the real
    // choice and fire the local-head/community-head approval notification.
    // Do NOT auto-assign an arbitrary community here — that used to silently
    // attach every new user to whatever community Mongo returned first,
    // routing their approval request to the wrong head.

    if (email && email.trim() !== '') {
      email = email.trim().toLowerCase();
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ success: false, errors: { email: 'This email address is already registered.' } });
      }
      userData.email = email;
    }

    // Every new user gets their own unique referral code
    const referralService = require('../services/referralService');
    userData.referralCode = await referralService.generateUniqueReferralCode();

    // The mobile number must have been verified by OTP (send-otp → verify-otp) just before
    try {
      await otpService.consumeVerifiedOtp(phone, 'register', req.body.otp);
    } catch (otpError) {
      return res.status(400).json({ success: false, errors: { phone: otpError.message }, message: otpError.message });
    }

    const user = await User.create(userData);

    if (user) {
      await user.populate('communityId', 'name slug isActive settings subCommunities.name subCommunities.settings logoUrl bannerUrl description city');

      // ── Process Referral Points & Single Notification via Referral Service ──────────
      await referralService.processRegistrationReferral(user, referralCode);

      // ── Notify Local Head (matching member city) & Community Head ──────────
      notifyLocalHeadNewMember(user).catch(err => console.warn('[notifyLocalHeadNewMember error]:', err.message));

      // ── Family Tree: relatives who already added this mobile number get an accept/reject invite ──
      familyService.activatePendingInvitations(user).catch(err => console.warn('[family invitations error]:', err.message));

      const { accessToken, refreshToken } = generateTokens(user);
      
      // Store Refresh Token in HttpOnly cookies
      const cookieOptions = getCookieOptions(7 * 24 * 60 * 60 * 1000);
      res.cookie('member_jwt', refreshToken, cookieOptions);
      res.cookie('jwt', refreshToken, cookieOptions);

      res.status(201).json({
        user: getUserResponsePayload(user),
        accessToken,
        refreshToken
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get tokens
// @route   POST /api/auth/login
// @access  Public
// const loginUser
const loginUser = async (req, res) => {
  let { identifier, password } = req.body;

  try {
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Phone/Email and password are required' });
    }

    identifier = identifier.trim();
    
    // Auto-detect email, loginId, or phone
    const normalizedPhone = identifier.replace(/\D/g, '');
    const searchConditions = [
      { email: identifier.toLowerCase() },
      { loginId: identifier },
      { loginId: identifier.toLowerCase() },
      { phone: identifier }
    ];
    
    if (normalizedPhone && normalizedPhone.length >= 7) {
      searchConditions.push({ phone: normalizedPhone });
    }

    const searchQuery = { $or: searchConditions };

    // Find by resolved query
    const user = await User.findOne(searchQuery)
    .populate('communityId', 'name slug isActive settings subCommunities.name subCommunities.settings logoUrl bannerUrl description city')
    .populate('assignedCommunityIds', 'name slug isActive settings subCommunities.name subCommunities.settings logoUrl bannerUrl description city');

    if (!user) {
      return res.status(404).json({ message: 'User not found with this identifier' });
    }

    // Check account status
    if (user.accountStatus === 'blocked') {
      return res.status(403).json({ message: 'Your account is blocked. Contact Samaj Admin.' });
    }
    if (user.accountStatus === 'deleted') {
      return res.status(403).json({ message: 'Your account has been deleted.' });
    }
    if (['head', 'sub_head'].includes(user.role) && (user.accountStatus === 'inactive' || user.accountStatus === 'suspended')) {
      return res.status(403).json({ message: 'Your Community Head account is currently inactive.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (isMatch) {
      const { accessToken, refreshToken } = generateTokens(user);
      
      const isPrivileged = ['admin', 'head', 'sub_head', 'admin_sub_head'].includes(user.role);
      const maxAge = isPrivileged ? 1 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
      const cookieOptions = getCookieOptions(maxAge);

      if (user.role === 'admin' || user.role === 'admin_sub_head' || (user.role === 'sub_head' && user.subHeadType === 'admin')) {
        res.cookie('admin_jwt', refreshToken, cookieOptions);
      } else if (user.role === 'head' || user.role === 'sub_head') {
        res.cookie('head_jwt', refreshToken, cookieOptions);
      } else {
        res.cookie('member_jwt', refreshToken, cookieOptions);
        res.cookie('jwt', refreshToken, cookieOptions);
      }

      // New Device Login Security Alert Trigger (Non-blocking safe execution)
      try {
        const deviceToken = req.body.deviceToken || req.headers['user-agent'];
        if (deviceToken && Array.isArray(user.deviceTokens) && !user.deviceTokens.includes(deviceToken)) {
          user.deviceTokens.push(deviceToken);
          user.save().catch(() => {});

          if (typeof notifySecurityAlert === 'function') {
            notifySecurityAlert(user._id, `New login detected on your account.`).catch(err => console.warn('[NewDeviceAlertError]', err.message));
          }
        }
      } catch (alertErr) {
        console.warn('[LoginSecurityAlertWarning]', alertErr.message);
      }

      // Ensure user has a unique referral code
      if (!user.referralCode) {
        try {
          const referralService = require('../services/referralService');
          user.referralCode = await referralService.generateUniqueReferralCode();
          await User.findByIdAndUpdate(user._id, { referralCode: user.referralCode });
        } catch (refErr) {
          console.warn('[ReferralCodeGenError]', refErr.message);
        }
      }

      res.json({
        user: getUserResponsePayload(user),
        accessToken,
        refreshToken
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('[LoginError]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user profile (Fresh from DB)
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    try {
      await syncMembership(req.user._id);
    } catch (syncErr) {
      console.warn('[MembershipSync] getMe:', syncErr.message);
    }
    const user = await User.findById(req.user._id)
      .select('+aadhaarLast4 +aadhaarVerifiedAt') // own profile only (masked in the response)
      .populate('communityId', 'name slug isActive settings subCommunities.name subCommunities.settings logoUrl bannerUrl description city')
      .populate('assignedCommunityIds', 'name slug isActive settings subCommunities.name subCommunities.settings logoUrl bannerUrl description city');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.referralCode) {
      try {
        const referralService = require('../services/referralService');
        user.referralCode = await referralService.generateUniqueReferralCode();
        await User.findByIdAndUpdate(user._id, { referralCode: user.referralCode });
      } catch (refErr) {
        console.warn('[ReferralCodeGetMeGenError]', refErr.message);
      }
    }

    res.json({
      success: true,
      user: getUserResponsePayload(user)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = (req, res) => {
  const expiredOptions = getCookieOptions(0);
  expiredOptions.expires = new Date(0);
  res.cookie('member_jwt', '', expiredOptions);
  res.cookie('jwt', '', expiredOptions);
  res.status(200).json({ message: 'Logged out successfully' });
};

const logoutAdmin = (req, res) => {
  const expiredOptions = getCookieOptions(0);
  expiredOptions.expires = new Date(0);
  res.cookie('admin_jwt', '', expiredOptions);
  res.status(200).json({ message: 'Admin logged out successfully' });
};

const logoutHead = (req, res) => {
  const expiredOptions = getCookieOptions(0);
  expiredOptions.expires = new Date(0);
  res.cookie('head_jwt', '', expiredOptions);
  res.status(200).json({ message: 'Head logged out successfully' });
};

// @desc    Refresh access token (Stateless)
// @route   POST /api/auth/refresh
// @access  Public
const refreshAuth = async (req, res) => {
  const refreshToken = req.cookies?.member_jwt || req.cookies?.jwt || req.body?.refreshToken || req.headers['x-refresh-token'];

  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }

  try {
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
    const user = await User.findById(decoded.id)
      .populate('communityId', 'name slug isActive settings subCommunities.name subCommunities.settings logoUrl bannerUrl description city')
      .populate('assignedCommunityIds', 'name slug isActive settings subCommunities.name subCommunities.settings logoUrl bannerUrl description city');

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Verify account status
    if (user.accountStatus === 'blocked' || user.accountStatus === 'deleted') {
      return res.status(403).json({ message: 'Account status is not active' });
    }

    if (sessionEnded(decoded, user)) {
      return res.status(401).json({ code: 'SESSION_ENDED', message: 'Your session has ended. Please log in again.' });
    }

    const tokens = generateTokens(user);

    // Rotate refresh token cookies
    const cookieOptions = getCookieOptions(7 * 24 * 60 * 60 * 1000);
    res.cookie('member_jwt', tokens.refreshToken, cookieOptions);
    res.cookie('jwt', tokens.refreshToken, cookieOptions);

    res.json({
      user: getUserResponsePayload(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    console.error('Refresh Token Verification Failed:', error.message);
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

const refreshAdmin = async (req, res) => {
  const refreshToken = req.cookies?.admin_jwt || req.body?.refreshToken || req.headers['x-refresh-token'];

  if (!refreshToken) {
    return res.status(401).json({ message: 'No admin refresh token provided' });
  }

  try {
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
    const user = await User.findById(decoded.id);

    if (!user || user.role !== 'admin') {
      return res.status(401).json({ message: 'Admin not found' });
    }
    if (sessionEnded(decoded, user)) {
      return res.status(401).json({ code: 'SESSION_ENDED', message: 'Your session has ended. Please log in again.' });
    }

    const tokens = generateTokens(user);

    const cookieOptions = getCookieOptions(1 * 24 * 60 * 60 * 1000);
    res.cookie('admin_jwt', tokens.refreshToken, cookieOptions);

    res.json({
      user: getUserResponsePayload(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    console.error('Admin Refresh Token Failed:', error.message);
    return res.status(401).json({ message: 'Invalid or expired admin refresh token' });
  }
};

const refreshHead = async (req, res) => {
  const refreshToken = req.cookies?.head_jwt || req.body?.refreshToken || req.headers['x-refresh-token'];

  if (!refreshToken) {
    return res.status(401).json({ message: 'No head refresh token provided' });
  }

  try {
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
    const user = await User.findById(decoded.id)
      .populate('communityId', 'name slug isActive settings subCommunities.name subCommunities.settings logoUrl bannerUrl description city')
      .populate('assignedCommunityIds', 'name slug isActive settings subCommunities.name subCommunities.settings logoUrl bannerUrl description city');

    if (!user || !['head', 'admin', 'sub_head'].includes(user.role)) {
      return res.status(401).json({ message: 'Head user not found' });
    }

    if (user.accountStatus === 'inactive' || user.accountStatus === 'suspended') {
      return res.status(403).json({ message: 'Your Community Head account is currently inactive.' });
    }
    if (sessionEnded(decoded, user)) {
      return res.status(401).json({ code: 'SESSION_ENDED', message: 'Your session has ended. Please log in again.' });
    }

    const tokens = generateTokens(user);

    const cookieOptions = getCookieOptions(1 * 24 * 60 * 60 * 1000);
    res.cookie('head_jwt', tokens.refreshToken, cookieOptions);

    res.json({
      user: getUserResponsePayload(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    console.error('Head Refresh Token Failed:', error.message);
    return res.status(401).json({ message: 'Invalid or expired head refresh token' });
  }
};

// @desc    Update user profile (Onboarding details)
// @route   PUT /api/auth/update-profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      // isAadharVerified is never taken from the client — it is set only by
      // verifyAadhaarOtp after UIDAI confirms the OTP (see aadhaarKycService).

      // Basic Fields
      user.name = req.body.name !== undefined ? req.body.name : user.name;
      user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;
      user.about = req.body.about !== undefined ? req.body.about : (req.body.bio !== undefined ? req.body.bio : user.about);
      // Gender is chosen once (registration / onboarding); after that only an
      // Admin can change it (PUT /admin/users/:id).
      if (req.body.gender) {
        if (!user.gender) {
          user.gender = req.body.gender;
        } else if (String(req.body.gender).toLowerCase() !== String(user.gender).toLowerCase()) {
          return res.status(403).json({
            success: false,
            code: 'GENDER_LOCKED',
            message: 'Gender cannot be changed after registration. Please contact the admin to change it.'
          });
        }
      }
      user.dob = req.body.dob || user.dob;
      user.bloodGroup = req.body.bloodGroup || user.bloodGroup;
      user.maritalStatus = req.body.maritalStatus || user.maritalStatus;
      user.gotra = req.body.gotra || user.gotra;
      user.familyType = req.body.familyType || user.familyType;
      
      // Social Links
      user.facebook = req.body.facebook !== undefined ? req.body.facebook : user.facebook;
      user.twitter = req.body.twitter !== undefined ? req.body.twitter : user.twitter;
      user.linkedin = req.body.linkedin !== undefined ? req.body.linkedin : user.linkedin;

      // Privacy Settings
      user.isPrivate = req.body.isPrivate !== undefined ? req.body.isPrivate : user.isPrivate;
      user.phonePrivacy = req.body.phonePrivacy !== undefined ? req.body.phonePrivacy : user.phonePrivacy;
      user.emailPrivacy = req.body.emailPrivacy !== undefined ? req.body.emailPrivacy : user.emailPrivacy;
      user.familyPrivacy = req.body.familyPrivacy !== undefined ? req.body.familyPrivacy : user.familyPrivacy;

      // Avatar & Cover upload handling
      const avatarFile = req.file || req.files?.avatarFile?.[0] || req.files?.avatar?.[0] || req.files?.photo?.[0] || req.files?.image?.[0];
      const coverFile  = req.files?.coverFile?.[0] || req.files?.cover?.[0];

      if (avatarFile) {
        if (avatarFile.path && avatarFile.path.startsWith('http')) {
          user.avatar = avatarFile.path;
        } else if (avatarFile.path) {
          user.avatar = avatarFile.path;
        } else if (avatarFile.buffer) {
          let uploaded = false;
          if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
            try {
              const cloudinary = require('cloudinary').v2;
              const b64 = Buffer.from(avatarFile.buffer).toString('base64');
              const dataURI = `data:${avatarFile.mimetype || 'image/jpeg'};base64,${b64}`;
              const uploadRes = await cloudinary.uploader.upload(dataURI, {
                folder: `merisamaj/avatars/${user._id}`,
                transformation: [{ width: 500, height: 500, crop: 'limit', quality: 'auto:good' }]
              });
              user.avatar = uploadRes.secure_url;
              uploaded = true;
            } catch (cErr) {
              console.warn('[Avatar Cloudinary Error]:', cErr.message);
            }
          }
          if (!uploaded) {
            const fs = require('fs');
            const path = require('path');
            const uploadDir = path.join(__dirname, '../../uploads/avatars');
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            const ext = avatarFile.mimetype ? (avatarFile.mimetype.split('/')[1] || 'png') : 'png';
            const filename = `avatar_${user._id}_${Date.now()}.${ext}`;
            fs.writeFileSync(path.join(uploadDir, filename), avatarFile.buffer);
            user.avatar = `/uploads/avatars/${filename}`;
          }
        }
      } else if (req.body.avatar !== undefined) {
        if (typeof req.body.avatar === 'string' && req.body.avatar.startsWith('data:') && req.body.avatar.length > 200) {
          let uploaded = false;
          if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
            try {
              const cloudinary = require('cloudinary').v2;
              const uploadRes = await cloudinary.uploader.upload(req.body.avatar, {
                folder: `merisamaj/avatars/${user._id}`,
                transformation: [{ width: 500, height: 500, crop: 'limit', quality: 'auto:good' }]
              });
              user.avatar = uploadRes.secure_url;
              uploaded = true;
            } catch (cErr) {
              console.warn('[Base64 Avatar Cloudinary Error]:', cErr.message);
            }
          }
          if (!uploaded) {
            const fs = require('fs');
            const path = require('path');
            const matches = req.body.avatar.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              const ext = matches[1].split('/')[1] || 'png';
              const buffer = Buffer.from(matches[2], 'base64');
              const uploadDir = path.join(__dirname, '../../uploads/avatars');
              if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
              }
              const filename = `avatar_${user._id}_${Date.now()}.${ext}`;
              fs.writeFileSync(path.join(uploadDir, filename), buffer);
              user.avatar = `/uploads/avatars/${filename}`;
            } else {
              user.avatar = req.body.avatar;
            }
          }
        } else {
          user.avatar = req.body.avatar || '';
        }
      }

      if (coverFile) {
        if (coverFile.path) {
          user.cover = coverFile.path;
        } else if (coverFile.buffer) {
          const fs = require('fs');
          const path = require('path');
          const uploadDir = path.join(__dirname, '../../uploads/avatars');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          const ext = coverFile.mimetype ? (coverFile.mimetype.split('/')[1] || 'png') : 'png';
          const filename = `cover_${user._id}_${Date.now()}.${ext}`;
          fs.writeFileSync(path.join(uploadDir, filename), coverFile.buffer);
          user.cover = `/uploads/avatars/${filename}`;
        }
      } else if (req.body.cover !== undefined) {
        if (typeof req.body.cover === 'string' && req.body.cover.startsWith('data:') && req.body.cover.length > 200) {
          const fs = require('fs');
          const path = require('path');
          const matches = req.body.cover.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const ext = matches[1].split('/')[1] || 'png';
            const buffer = Buffer.from(matches[2], 'base64');
            const uploadDir = path.join(__dirname, '../../uploads/avatars');
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            const filename = `cover_${user._id}_${Date.now()}.${ext}`;
            fs.writeFileSync(path.join(uploadDir, filename), buffer);
            user.cover = `/uploads/avatars/${filename}`;
          }
        } else {
          user.cover = req.body.cover || '';
        }
      }
      
      // Community Update & Sync
      const Community = require('../models/Community');
      const mongoose = require('mongoose');

      const CommunityRequest = require('../models/CommunityRequest');
      const leavePendingRequests = (kind = 'community') => CommunityRequest.updateMany(
        { status: 'pending', ...(kind === 'community' ? { kind: { $ne: 'subCommunity' } } : { kind }), 'requesters.userId': user._id },
        { $pull: { requesters: { userId: user._id } } }
      ).catch(() => {});

      if (req.body.communityId && mongoose.isValidObjectId(req.body.communityId)) {
        const targetComm = await Community.findById(req.body.communityId);
        if (targetComm && targetComm.isActive) {
          user.communityId = targetComm._id;
          user.community = targetComm.name;
          if (user.requestedCommunity) { user.requestedCommunity = ''; await leavePendingRequests(); }
        }
      } else if (req.body.community || (req.body.communityId && typeof req.body.communityId === 'string')) {
        const rawCommName = (req.body.community || req.body.communityId).toString().trim().replace(/\s+/g, ' ').slice(0, 80);
        if (rawCommName && rawCommName.toLowerCase() !== 'other') {
          // A typed name ("Other"): use an existing active community with that name
          // ("Rajput" = "Rajput Samaj"). Members never create communities: an unknown
          // name becomes a request the admin sees in Admin → Communities.
          const key = CommunityRequest.keyOf(rawCommName);
          const escapeRe = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const commDoc = key ? await Community.findOne({
            isActive: true,
            // "samaj" may appear anywhere in the stored name ("Agrawal Samaj Indore")
            name: new RegExp(`^\\s*${escapeRe(key).replace(/ /g, '\\s+(?:(?:samaj|समाज)\\s+)?')}(\\s+(samaj|समाज))?\\s*$`, 'iu')
          }) : null;

          if (commDoc) {
            user.communityId = commDoc._id;
            user.community = commDoc.name;
            if (user.requestedCommunity) { user.requestedCommunity = ''; await leavePendingRequests(); }
          } else if (key) {
            await leavePendingRequests(); // a member waits for one community at a time
            const request = await CommunityRequest.findOneAndUpdate(
              { kind: 'community', parentCommunityId: null, nameKey: key },
              { $setOnInsert: { kind: 'community', parentCommunityId: null, name: rawCommName, nameKey: key } },
              { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            if (request.status !== 'pending') {
              // Asked for again after it was dismissed / handled: open it again
              request.status = 'pending'; request.resolvedAt = null; request.resolvedBy = null; request.note = '';
            }
            // A sub-community typed together with the new community is created with it
            const typedSubForNew = String(req.body.requestedSubCommunity || '').trim().replace(/\s+/g, ' ').slice(0, 80);
            request.requesters.push({
              userId: user._id, typedName: rawCommName, subCommunity: typedSubForNew,
              city: req.body.city || user.city || '', state: req.body.state || user.state || ''
            });
            await request.save();
            user.communityId = null;
            user.community = '';
            user.subCommunity = '';
            user.requestedCommunity = rawCommName;
            user.requestedSubCommunity = typedSubForNew;
          }
        }
      }
      user.subCommunity = req.body.subCommunity !== undefined ? req.body.subCommunity : user.subCommunity;

      // Sub-community typed under "Other": use an existing one with that name, else it
      // becomes a request the admin sees (members never create sub-communities).
      const typedSub = String(req.body.requestedSubCommunity || '').trim().replace(/\s+/g, ' ').slice(0, 80);
      if (String(user.subCommunity || '').trim()) {
        if (user.requestedSubCommunity) { user.requestedSubCommunity = ''; await leavePendingRequests('subCommunity'); }
      } else if (typedSub && user.communityId) {
        const parentId = user.communityId._id || user.communityId;
        const parent = await Community.findById(parentId).select('subCommunities.name subCommunities.isActive').lean();
        const subKey = CommunityRequest.keyOf(typedSub);
        const existingSub = (parent?.subCommunities || []).find(s => s.isActive !== false && CommunityRequest.keyOf(s.name) === subKey);
        await leavePendingRequests('subCommunity');
        if (existingSub) {
          user.subCommunity = existingSub.name;
          user.requestedSubCommunity = '';
        } else if (subKey) {
          const subRequest = await CommunityRequest.findOneAndUpdate(
            { kind: 'subCommunity', parentCommunityId: parentId, nameKey: subKey },
            { $setOnInsert: { kind: 'subCommunity', parentCommunityId: parentId, name: typedSub, nameKey: subKey } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          if (subRequest.status !== 'pending') {
            subRequest.status = 'pending'; subRequest.resolvedAt = null; subRequest.resolvedBy = null; subRequest.note = '';
          }
          subRequest.requesters.push({
            userId: user._id, typedName: typedSub,
            city: req.body.city || user.city || '', state: req.body.state || user.state || ''
          });
          await subRequest.save();
          user.subCommunity = '';
          user.requestedSubCommunity = typedSub;
        }
      }

      // A member asked to re-pick (their sub-community was deleted) is done once they
      // choose one, or ask for a new one
      if (user.mustChooseSubCommunity && (String(user.subCommunity || '').trim() || user.requestedSubCommunity)) user.mustChooseSubCommunity = false;
      
      // Location
      user.city = req.body.city || user.city;
      user.district = req.body.district || user.district;
      user.state = req.body.state || user.state;
      user.pincode = req.body.pincode || user.pincode;
      user.country = req.body.country || user.country;

      // Role and designation are strictly managed by system admin / role assignments and CANNOT be altered via profile updates
      delete req.body.role;
      delete req.body.designation;
      
      if (req.body.termYears !== undefined) user.termYears = req.body.termYears;
      if (req.body.socialLinks) {
        let parsedLinks = req.body.socialLinks;
        // Handle JSON string from FormData uploads
        if (typeof parsedLinks === 'string') {
          try { parsedLinks = JSON.parse(parsedLinks); } catch (e) { parsedLinks = null; }
        }
        if (parsedLinks && typeof parsedLinks === 'object') {
          user.socialLinks = {
            ...(user.socialLinks?.toObject?.() || user.socialLinks || {}),
            ...parsedLinks
          };
        }
      }

      // Education & Profession
      user.qualification = req.body.qualification || user.qualification;
      user.school = req.body.school || user.school;
      user.passingYear = req.body.passingYear || user.passingYear;
      user.profession = req.body.profession || user.profession;
      user.company = req.body.company || user.company;
      user.annualIncome = req.body.annualIncome || user.annualIncome;
      user.workCity = req.body.workCity || user.workCity;
      
      // Address
      user.houseNumber = req.body.houseNumber || user.houseNumber;
      user.streetAddress = req.body.streetAddress || user.streetAddress;
      user.landmark = req.body.landmark || user.landmark;
      user.areaAddress = req.body.areaAddress || user.areaAddress;
       user.pincodeAddress = req.body.pincodeAddress || user.pincodeAddress;
      user.detailedAddress = req.body.detailedAddress || req.body.address || user.detailedAddress;
      user.alternatePhone = req.body.alternatePhone || user.alternatePhone;
      user.alternateEmail = req.body.alternateEmail || user.alternateEmail;
      
      // Family Members (legacy array — synced into Family/FamilyMember records after save)
      const previousFamilyMembers = (user.familyMembers || []).map(m => (m.toObject ? m.toObject() : m));
      let incomingFamilyMembers = null;
      if (req.body.familyMembers) {
        try {
          user.familyMembers = typeof req.body.familyMembers === 'string' 
            ? JSON.parse(req.body.familyMembers) 
            : req.body.familyMembers;
        } catch (e) {
          user.familyMembers = req.body.familyMembers;
        }
        incomingFamilyMembers = user.familyMembers.map(m => (m.toObject ? m.toObject() : m));
        // Records own the family data now; the array is rebuilt by the family service
        user.familyMembers = previousFamilyMembers;
      }
      
      // Preferences
      user.prefEducation = req.body.prefEducation || user.prefEducation;
      user.prefAge = req.body.prefAge || user.prefAge;
      user.prefHeight = req.body.prefHeight || user.prefHeight;
      user.prefOccupation = req.body.prefOccupation || user.prefOccupation;
      user.prefCity = req.body.prefCity || user.prefCity;
      
      // Device tokens / FCM
      if (req.body.deviceToken) {
        if (!user.deviceTokens.includes(req.body.deviceToken)) {
          user.deviceTokens.push(req.body.deviceToken);
        }
      }

      // Verification Flags
      user.isFaceVerified = req.body.isFaceVerified !== undefined ? req.body.isFaceVerified : user.isFaceVerified;

      // Membership / "Pro" fields are NOT editable here — they follow the member's real
      // subscription (bought or granted by the Admin), see services/membershipService.js

      let updatedUser = await user.save();
      if (incomingFamilyMembers) {
        try {
          await familyService.syncLegacyFamilyMembers(updatedUser, incomingFamilyMembers, previousFamilyMembers);
        } catch (err) {
          console.error('[updateProfile] family sync failed:', err.message);
        }
        updatedUser = await User.findById(user._id);
      }
      const cacheService = require('../utils/cacheService');
      cacheService.del(`auth_user_${user._id}`);
      await updatedUser.populate('communityId', 'name slug isActive settings subCommunities.name subCommunities.settings logoUrl bannerUrl description city');
      await updatedUser.populate('assignedCommunityIds', 'name slug isActive settings subCommunities.name subCommunities.settings logoUrl bannerUrl description city');

      if (updatedUser.verificationStatus === 'pending' || updatedUser.accountStatus === 'pending verification') {
        notifyLocalHeadNewMember(updatedUser).catch(err => console.warn('[notifyLocalHeadNewMember error]:', err.message));
      }

      res.json({
        ...getUserResponsePayload(updatedUser),
        message: 'Profile updated successfully'
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Aadhaar verification (QuickeKYC → UIDAI OTP to the Aadhaar-linked mobile) ───
const aadhaarKyc = require('../services/aadhaarKycService');
const AadhaarVerification = require('../models/AadhaarVerification');
const AadhaarKycRecord = require('../models/AadhaarKycRecord');
const aadhaarCrypto = require('../utils/aadhaarCrypto');

// Admin-only KYC record. DOB/gender/address/photo are stored encrypted, and only
// when AADHAAR_DATA_KEY is configured; the verification itself never fails here.
const saveAadhaarKycRecord = async (userId, session, holder) => {
  try {
    const record = {
      provider: session.provider || 'quickekyc',
      method: 'aadhaar_otp',
      mode: session.mode,
      referenceId: holder.referenceId || session.requestId || '',
      verifiedName: holder.fullName || '',
      aadhaarLast4: session.aadhaarLast4,
      verifiedAt: session.verifiedAt,
      encryptedDetails: null,
      encryptedPhoto: null,
      photoMimeType: '',
      hasPhoto: false,
      detailsStored: false
    };
    if (aadhaarCrypto.isConfigured()) {
      record.encryptedDetails = aadhaarCrypto.encryptJson({
        dob: holder.dob || '', gender: holder.gender || '', address: holder.address || ''
      });
      if (holder.photo?.base64) {
        record.encryptedPhoto = aadhaarCrypto.encrypt(Buffer.from(holder.photo.base64, 'base64'));
        record.photoMimeType = holder.photo.mimeType || 'image/jpeg';
        record.hasPhoto = true;
      }
      record.detailsStored = true;
    } else {
      console.warn('[AadhaarKYC] AADHAAR_DATA_KEY not set — DOB/gender/address/photo were not stored.');
    }
    await AadhaarKycRecord.findOneAndUpdate({ userId }, { $set: record }, { upsert: true });
  } catch (err) {
    console.error('[AadhaarKYC] saving KYC record failed:', err.message);
  }
};

const AADHAAR_OTP_TTL_MS = 10 * 60 * 1000;    // UIDAI OTPs are valid for 10 minutes
const AADHAAR_RESEND_COOLDOWN_MS = 60 * 1000;  // UIDAI rejects rapid repeat requests
const AADHAAR_MAX_ATTEMPTS = 5;
const AADHAAR_DAILY_REQUEST_LIMIT = 10;        // each request costs a paid API call

const aadhaarErrorResponse = (res, error, fallback) => {
  if (error instanceof aadhaarKyc.AadhaarKycError) {
    return res.status(error.status).json({ success: false, message: error.message });
  }
  console.error(fallback, error);
  return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
};

const assertAadhaarEnabledFor = async (user) => {
  const Community = require('../models/Community');
  const communityId = user.communityId || user.assignedCommunityIds?.[0];
  if (!communityId) return;
  const community = await Community.findById(communityId).select('settings.aadharVerificationEnabled').lean();
  if (community?.settings?.aadharVerificationEnabled === false) {
    throw new aadhaarKyc.AadhaarKycError('Aadhaar verification is currently disabled for your community.', 403);
  }
};

// @desc    Send an Aadhaar OTP. UIDAI texts it to the mobile linked with the Aadhaar.
// @route   POST /api/v1/auth/aadhaar/send-otp   { aadhaarNumber }
// @access  Private
const sendAadhaarOtp = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('isAadharVerified communityId assignedCommunityIds');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.isAadharVerified) {
      return res.status(400).json({ success: false, message: 'Your Aadhaar is already verified.' });
    }
    await assertAadhaarEnabledFor(user);

    const aadhaar = aadhaarKyc.normalizeAadhaar(req.body.aadhaarNumber);
    if (!aadhaarKyc.isValidAadhaar(aadhaar)) {
      return res.status(400).json({ success: false, message: 'Enter a valid 12-digit Aadhaar number.' });
    }
    const aadhaarHash = aadhaarKyc.hashAadhaar(aadhaar);

    const usedByOther = await User.exists({ _id: { $ne: user._id }, aadhaarHash, isAadharVerified: true });
    if (usedByOther) {
      return res.status(409).json({ success: false, message: 'This Aadhaar is already verified on another account.' });
    }

    const last = await AadhaarVerification.findOne({ userId: user._id }).sort({ createdAt: -1 }).lean();
    if (last && Date.now() - new Date(last.createdAt).getTime() < AADHAAR_RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((AADHAAR_RESEND_COOLDOWN_MS - (Date.now() - new Date(last.createdAt).getTime())) / 1000);
      return res.status(429).json({ success: false, message: `Please wait ${wait} seconds before requesting a new OTP.`, retryAfter: wait });
    }
    const today = await AadhaarVerification.countDocuments({
      userId: user._id,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    if (today >= AADHAAR_DAILY_REQUEST_LIMIT) {
      return res.status(429).json({ success: false, message: 'Too many OTP requests today. Please try again tomorrow.' });
    }

    const { requestId, mode, devOtp } = await aadhaarKyc.generateOtp(aadhaar);

    // Only the newest OTP for this member stays usable.
    await AadhaarVerification.updateMany(
      { userId: user._id, verifiedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { expiresAt: new Date() } }
    );
    await AadhaarVerification.create({
      userId: user._id,
      mode,
      requestId,
      aadhaarHash,
      aadhaarLast4: aadhaar.slice(-4),
      expiresAt: new Date(Date.now() + AADHAAR_OTP_TTL_MS)
    });

    return res.json({
      success: true,
      message: 'OTP sent to the mobile number linked with your Aadhaar.',
      aadhaarLast4: aadhaar.slice(-4),
      resendAfter: AADHAAR_RESEND_COOLDOWN_MS / 1000,
      // Local development without QuickeKYC only — never in production
      ...(devOtp && process.env.NODE_ENV !== 'production' ? { devOtp } : {})
    });
  } catch (error) {
    return aadhaarErrorResponse(res, error, 'sendAadhaarOtp error:');
  }
};

// @desc    Verify the Aadhaar OTP with UIDAI and mark the member verified
// @route   POST /api/v1/auth/aadhaar/verify-otp   { otp }
// @access  Private
const verifyAadhaarOtp = async (req, res) => {
  try {
    const otp = String(req.body.otp || '').trim();
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: 'Enter the 6-digit OTP.' });
    }

    const session = await AadhaarVerification.findOne({ userId: req.user._id, verifiedAt: null }).sort({ createdAt: -1 });
    if (!session || session.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }
    if (session.attempts >= AADHAAR_MAX_ATTEMPTS) {
      return res.status(429).json({ success: false, message: 'Too many wrong attempts. Please request a new OTP.' });
    }

    let holder;
    try {
      holder = await aadhaarKyc.submitOtp(session.requestId, otp, session.mode);
    } catch (error) {
      if (error instanceof aadhaarKyc.AadhaarKycError && error.otpRejected) {
        session.attempts += 1;
        await session.save();
        const left = AADHAAR_MAX_ATTEMPTS - session.attempts;
        return res.status(400).json({
          success: false,
          message: left > 0
            ? `${error.message || 'Invalid OTP.'} ${left} attempt(s) left.`
            : 'Too many wrong attempts. Please request a new OTP.'
        });
      }
      throw error;
    }

    // Re-check right before saving, in case the same Aadhaar was verified elsewhere meanwhile.
    const usedByOther = await User.exists({ _id: { $ne: req.user._id }, aadhaarHash: session.aadhaarHash, isAadharVerified: true });
    if (usedByOther) {
      return res.status(409).json({ success: false, message: 'This Aadhaar is already verified on another account.' });
    }

    session.verifiedAt = new Date();
    await session.save();
    const verifiedName = holder.fullName || '';
    // The member's own `name` is left untouched; the Aadhaar name is kept separately.
    const updatedUser = await User.findByIdAndUpdate(req.user._id, {
      $set: {
        isAadharVerified: true,
        aadhaarVerifiedName: verifiedName,
        aadhaarLast4: session.aadhaarLast4,
        aadhaarVerifiedAt: session.verifiedAt,
        aadhaarHash: session.aadhaarHash
      }
    }, { new: true }).select('+aadhaarLast4 +aadhaarVerifiedAt');
    require('../utils/cacheService').del(`auth_user_${req.user._id}`);

    await saveAadhaarKycRecord(req.user._id, session, holder);

    return res.json({
      success: true,
      message: 'Aadhaar verified successfully!',
      data: { isAadharVerified: true, ...aadhaarSerializer.selfAadhaar(updatedUser) }
    });
  } catch (error) {
    return aadhaarErrorResponse(res, error, 'verifyAadhaarOtp error:');
  }
};

const otpErrorResponse = (res, error) => {
  if (error instanceof otpService.OtpError) {
    return res.status(error.status).json({ message: error.message });
  }
  console.error('[OTP] error:', error);
  return res.status(500).json({ message: 'Something went wrong. Please try again.' });
};

// @desc    Send an OTP by SMS (SMS Gateway Hub). type: 'register' | 'reset_password'
//          Without SMS configured (development only) the OTP is 123456.
// @route   POST /api/auth/send-otp
// @access  Public
const sendOtp = async (req, res) => {
  try {
    const { phone, type } = req.body;
    const phone10 = otpService.normalizePhone(phone);
    if (phone10.length !== 10) {
      return res.status(400).json({ message: 'Enter a valid 10-digit mobile number.' });
    }

    // Don't spend an SMS when the request can't succeed anyway
    const existingUser = await User.findOne({ phone: phone10 }).select('_id').lean();
    const isReset = ['reset_password', 'forgot', 'reset'].includes(String(type || '').toLowerCase());
    if (isReset && !existingUser) {
      return res.status(404).json({ message: 'No account found with this mobile number.' });
    }
    if (!isReset && existingUser) {
      return res.status(400).json({ message: 'This mobile number is already registered. Please log in.' });
    }

    const { devOtp, smsFailed } = await otpService.requestOtp(phone10, isReset ? 'reset_password' : 'register');
    res.json({
      message: smsFailed
        ? 'SMS could not be sent (check SMS gateway settings). Development mode — use 123456'
        : devOtp ? 'OTP sent (development mode — use 123456)' : `OTP sent to +91 ${phone10}`,
      ...(devOtp ? { otp: devOtp } : {})
    });
  } catch (error) {
    otpErrorResponse(res, error);
  }
};

// @desc    Verify an OTP sent by /send-otp
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
  try {
    const { phone, otp, type } = req.body;
    await otpService.verifyOtp(phone, type || 'register', otp);
    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    otpErrorResponse(res, error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  const { phone, otp, newPassword } = req.body;

  try {
    if (!phone || !otp || !newPassword) {
      return res.status(400).json({ message: 'Phone, OTP and new password are required' });
    }

    const phone10 = otpService.normalizePhone(phone);
    const user = await User.findOne({ phone: phone10 });

    if (!user) {
      return res.status(404).json({ message: 'User not found with this mobile number' });
    }

    // The OTP must have been sent to this number and match — in every environment
    try {
      await otpService.consumeVerifiedOtp(phone10, 'reset_password', otp);
    } catch (otpError) {
      return otpErrorResponse(res, otpError);
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all active communities for public registration dropdown
// @route   GET /api/v1/auth/communities
// @access  Public
const getPublicCommunities = async (req, res) => {
  try {
    const Community = require('../models/Community');
    const communities = await Community.find({ isActive: true })
      .select('name city cityIds subCommunities headId')
      .populate('headId', 'name phone')
      .sort({ name: 1 })
      .lean();

    const formatted = communities.map(c => ({
      _id: c._id,
      name: c.name,
      city: c.city || '',
      cityIds: c.cityIds || [],
      // subCommunities are stored as {name, isActive, ...} sub-documents now;
      // public/registration consumers only ever need the active names as plain strings.
      subCommunities: (c.subCommunities || [])
        .filter(s => s && s.isActive !== false && s.name)
        .map(s => s.name),
      hasHead: !!c.headId,
      headName: c.headId?.name || null
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('getPublicCommunities error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch communities' });
  }
};

// @desc    Get all active cities with community & head coverage metadata (green/red dots)
// @route   GET /api/v1/auth/cities?communityId=XYZ
// @access  Public
const getPublicCities = async (req, res) => {
  try {
    const { communityId } = req.query;
    // Optional: scope locations & Local Heads to one sub-community (?subCommunity=…)
    const subKey = (req.query.subCommunity || '').toString().trim().toLowerCase();
    const City = require('../models/City');
    const Community = require('../models/Community');

    // Fetch all active cities
    const allCities = await City.find({ isActive: true })
      .select('name state _id')
      .sort({ name: 1 })
      .lean();

    let targetCommunity = null;
    // Map of lowercased city name → Local Head user (for this community only)
    const localHeadsByCity = new Map();

    if (communityId && mongoose.Types.ObjectId.isValid(communityId)) {
      targetCommunity = await Community.findById(communityId).populate('headId', 'name phone avatar').lean();

      // Local Heads are sub_head users scoped to this community + a specific city
      const localHeads = await User.find({
        communityId,
        role: 'sub_head',
        accountType: 'local_head',
        accountStatus: 'active'
      }).select('name avatar city subCommunity').lean();

      localHeads.forEach(lh => {
        // Heads tagged with another sub-community don't cover this one
        if (subKey && lh.subCommunity && lh.subCommunity.trim().toLowerCase() !== subKey) return;
        if (lh.city) {
          localHeadsByCity.set(lh.city.trim().toLowerCase(), lh);
        }
      });
    }

    // The chosen sub-community's own locations when it has them, else the community's
    const subDoc = subKey
      ? (targetCommunity?.subCommunities || []).find(s => (s.name || '').trim().toLowerCase() === subKey)
      : null;
    const scopedCityIds = subDoc && Array.isArray(subDoc.cityIds) ? subDoc.cityIds : (targetCommunity?.cityIds || []);
    const assignedCityIdsSet = new Set(scopedCityIds.map(id => id.toString()));
    const assignedCityNamesSet = new Set(
      [targetCommunity?.city].filter(Boolean).map(c => c.toLowerCase().trim())
    );

    const mainHasHead = !!targetCommunity?.headId;
    const mainHeadInfo = targetCommunity?.headId ? {
      id: targetCommunity.headId._id,
      name: targetCommunity.headId.name,
      avatar: targetCommunity.headId.avatar || null,
      type: 'community'
    } : null;

    const enrichedCities = allCities.map(city => {
      const cityIdStr = city._id.toString();
      const cityNameKey = city.name.toLowerCase().trim();
      const isCommunityInCity = assignedCityIdsSet.has(cityIdStr) || assignedCityNamesSet.has(cityNameKey);
      const localHead = targetCommunity ? localHeadsByCity.get(cityNameKey) : null;

      // Priority: a Local Head assigned specifically to this city beats the general Community Head
      let headInfo = null;
      let isCovered = false;
      let statusText = 'No Samaj Head';

      if (localHead) {
        headInfo = {
          id: localHead._id,
          name: localHead.name,
          avatar: localHead.avatar || null,
          type: 'local'
        };
        isCovered = true;
        statusText = 'Local Head Assigned';
      } else if (targetCommunity && isCommunityInCity && mainHasHead) {
        headInfo = mainHeadInfo;
        isCovered = true;
        statusText = 'Community Head Assigned';
      } else if (targetCommunity && isCommunityInCity) {
        statusText = 'Head Pending';
      }

      return {
        _id: city._id,
        name: city.name,
        state: city.state || '',
        hasCommunity: Boolean(targetCommunity && isCommunityInCity),
        hasHead: isCovered,
        headInfo,
        isCovered,
        dotColor: isCovered ? 'green' : 'red',
        statusText
      };
    });

    // Sort: Green dot (isCovered: true) first, then alphabetical by name
    enrichedCities.sort((a, b) => {
      if (a.isCovered && !b.isCovered) return -1;
      if (!a.isCovered && b.isCovered) return 1;
      return a.name.localeCompare(b.name);
    });

    res.json({ success: true, data: enrichedCities });
  } catch (error) {
    console.error('getPublicCities error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cities' });
  }
};

// @desc    Change / Update Password
// @route   POST /api/v1/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password.' });
    }

    user.password = newPassword;
    await user.save();

    // Trigger Security Alert (In-App + Push)
    const alertNotif = await notifySecurityAlert(user._id, 'Your account password was successfully updated.');
    if (alertNotif) {
      sendPushNotification({
        userId: user._id,
        notificationId: alertNotif._id,
        type: 'account_security_alert',
        title: 'Security Alert 🛡️',
        message: 'Your account password was successfully updated.',
        icon: '🛡️',
        actionUrl: '/member/profile'
      }).catch(err => console.error('[SecurityAlertPushError]', err.message));
    }

    res.status(200).json({
      success: true,
      message: 'Password updated successfully.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  logoutUser,
  logoutAdmin,
  logoutHead,
  refreshAuth,
  refreshAdmin,
  refreshHead,
  updateProfile,
  sendOtp,
  verifyOtp,
  resetPassword,
  getPublicCommunities,
  getPublicCities,
  changePassword,
  sendAadhaarOtp,
  verifyAadhaarOtp
};
