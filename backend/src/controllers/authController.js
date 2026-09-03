const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');
const { notifyInvitationAccepted, notifySecurityAlert } = require('../services/notificationService');
const { sendPushNotification } = require('../services/pushNotificationService');

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
  const isPrivileged = ['admin', 'head'].includes(user.role);
  
  const accessToken = jwt.sign(
    { id: user._id, role: user.role },
    config.jwtSecret,
    { expiresIn: isPrivileged ? '1d' : config.jwtExpiresIn }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    config.jwtRefreshSecret,
    { expiresIn: isPrivileged ? '1d' : config.jwtRefreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

const getUserResponsePayload = (user) => {
  return {
    id: user._id,
    name: user.name || 'Profile Incomplete',
    phone: user.phone,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    cover: user.cover,
    bio: user.bio || '',
    facebook: user.facebook || '',
    twitter: user.twitter || '',
    linkedin: user.linkedin || '',
    gender: user.gender,
    dob: user.dob,
    bloodGroup: user.bloodGroup,
    maritalStatus: user.maritalStatus,
    gotra: user.gotra,
    communityId: user.communityId,
    assignedCommunityId: user.assignedCommunityId,
    assignedCommunityIds: user.assignedCommunityIds,
    headPermissions: user.headPermissions,
    community: user.communityId?.name || user.community || '',
    communityLogo: user.communityId?.logoUrl || '',
    communityBanner: user.communityId?.bannerUrl || '',
    communityDescription: user.communityId?.description || '',
    communityCity: user.communityId?.city || '',
    subCommunity: user.subCommunity,
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
    prefEducation: user.prefEducation,
    prefAge: user.prefAge,
    prefHeight: user.prefHeight,
    prefOccupation: user.prefOccupation,
    prefCity: user.prefCity,
    isAadharVerified: user.isAadharVerified || false,
    isFaceVerified: user.isFaceVerified || false,
    accountStatus: user.accountStatus,
    verificationStatus: user.verificationStatus,
    isVerified: user.isVerified || (user.verificationStatus === 'verified'),
    isPremium: user.isPremium || false,
    membershipPlan: user.membershipPlan || '',
    membershipExpiry: user.membershipExpiry || '',
    membershipStartDate: user.membershipStartDate || '',
    matrimonySubscription: user.matrimonySubscription || null
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
      referralCode,
      accountStatus: 'active',
      verificationStatus: 'verified', // Verified by default in dev environment
      isPhoneVerified: true,
      isEmailVerified: true
    };

    // Root Fix: Look up default community and assign it to new users
    const Community = require('../models/Community');
    const defaultComm = await Community.findOne({});
    if (defaultComm) {
      userData.communityId = defaultComm._id;
      userData.community = defaultComm.name;
    }

    if (email && email.trim() !== '') {
      email = email.trim().toLowerCase();
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ success: false, errors: { email: 'This email address is already registered.' } });
      }
      userData.email = email;
    }

    // Auto-generate referral code for new user if not provided
    const referralService = require('../services/referralService');
    if (!userData.referralCode) {
      userData.referralCode = await referralService.generateUniqueReferralCode();
    }

    const user = await User.create(userData);

    if (user) {
      await user.populate('communityId', 'name slug isActive settings logoUrl description city');

      // ── Process Referral Points & Single Notification via Referral Service ──────────
      await referralService.processRegistrationReferral(user, referralCode);

      const { accessToken, refreshToken } = generateTokens(user);
      
      // Store Refresh Token in HttpOnly cookies
      const cookieOptions = getCookieOptions(7 * 24 * 60 * 60 * 1000);
      res.cookie('member_jwt', refreshToken, cookieOptions);
      res.cookie('jwt', refreshToken, cookieOptions);

      res.status(201).json({
        user: getUserResponsePayload(user),
        accessToken
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
    .populate('communityId', 'name slug isActive settings logoUrl description city')
    .populate('assignedCommunityIds', 'name slug isActive settings logoUrl description city');

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
      
      const isPrivileged = ['admin', 'head', 'sub_head'].includes(user.role);
      const maxAge = isPrivileged ? 1 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
      const cookieOptions = getCookieOptions(maxAge);

      if (user.role === 'admin') {
        res.cookie('admin_jwt', refreshToken, cookieOptions);
      } else if (user.role === 'head' || user.role === 'sub_head') {
        res.cookie('head_jwt', refreshToken, cookieOptions);
      } else {
        res.cookie('member_jwt', refreshToken, cookieOptions);
        res.cookie('jwt', refreshToken, cookieOptions);
      }

      // New Device Login Security Alert Trigger
      const deviceToken = req.body.deviceToken || req.headers['user-agent'];
      if (deviceToken && Array.isArray(user.deviceTokens) && !user.deviceTokens.includes(deviceToken)) {
        user.deviceTokens.push(deviceToken);
        user.save().catch(() => {});

        notifySecurityAlert(user._id, `New login detected on your account.`).catch(err => console.warn('[NewDeviceAlertError]', err.message));
      }

      res.json({
        user: getUserResponsePayload(user),
        accessToken
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user profile (Fresh from DB)
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('communityId', 'name slug isActive settings logoUrl description city')
      .populate('assignedCommunityIds', 'name slug isActive settings logoUrl description city');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
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
      .populate('communityId', 'name slug isActive settings logoUrl description city')
      .populate('assignedCommunityIds', 'name slug isActive settings logoUrl description city');

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Verify account status
    if (user.accountStatus === 'blocked' || user.accountStatus === 'deleted') {
      return res.status(403).json({ message: 'Account status is not active' });
    }

    const tokens = generateTokens(user);

    // Rotate refresh token cookies
    const cookieOptions = getCookieOptions(7 * 24 * 60 * 60 * 1000);
    res.cookie('member_jwt', tokens.refreshToken, cookieOptions);
    res.cookie('jwt', tokens.refreshToken, cookieOptions);

    res.json({
      user: getUserResponsePayload(user),
      accessToken: tokens.accessToken
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

    const tokens = generateTokens(user);

    const cookieOptions = getCookieOptions(1 * 24 * 60 * 60 * 1000);
    res.cookie('admin_jwt', tokens.refreshToken, cookieOptions);

    res.json({
      user: getUserResponsePayload(user),
      accessToken: tokens.accessToken
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
      .populate('communityId', 'name slug isActive settings logoUrl description city')
      .populate('assignedCommunityIds', 'name slug isActive settings logoUrl description city');

    if (!user || !['head', 'admin', 'sub_head'].includes(user.role)) {
      return res.status(401).json({ message: 'Head user not found' });
    }

    if (user.accountStatus === 'inactive' || user.accountStatus === 'suspended') {
      return res.status(403).json({ message: 'Your Community Head account is currently inactive.' });
    }

    const tokens = generateTokens(user);

    const cookieOptions = getCookieOptions(1 * 24 * 60 * 60 * 1000);
    res.cookie('head_jwt', tokens.refreshToken, cookieOptions);

    res.json({
      user: getUserResponsePayload(user),
      accessToken: tokens.accessToken
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
      // Basic Fields
      user.name = req.body.name !== undefined ? req.body.name : user.name;
      user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;
      user.gender = req.body.gender || user.gender;
      user.dob = req.body.dob || user.dob;
      user.bloodGroup = req.body.bloodGroup || user.bloodGroup;
      user.maritalStatus = req.body.maritalStatus || user.maritalStatus;
      user.gotra = req.body.gotra || user.gotra;
      
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
      if (req.file) {
        if (req.file.path) {
          user.avatar = req.file.path;
        } else if (req.file.buffer) {
          user.avatar = `data:${req.file.mimetype || 'image/png'};base64,${req.file.buffer.toString('base64')}`;
        }
      } else if (req.body.avatar) {
        user.avatar = req.body.avatar;
      }
      if (req.body.cover) {
        user.cover = req.body.cover;
      }
      
      // Community Update & Sync
      const Community = require('../models/Community');
      const mongoose = require('mongoose');

      if (req.body.communityId && mongoose.isValidObjectId(req.body.communityId)) {
        const targetComm = await Community.findById(req.body.communityId);
        if (targetComm && targetComm.isActive) {
          user.communityId = targetComm._id;
          user.community = targetComm.name;
        }
      } else if (req.body.community || (req.body.communityId && typeof req.body.communityId === 'string')) {
        const targetName = (req.body.community || req.body.communityId).toString().replace(/samaj/gi, '').trim();
        if (targetName) {
          const commDoc = await Community.findOne({ name: { $regex: new RegExp(`^${targetName}`, 'i') } });
          if (commDoc) {
            user.communityId = commDoc._id;
            user.community = commDoc.name;
          } else {
            user.community = req.body.community || req.body.communityId;
          }
        }
      }
      user.subCommunity = req.body.subCommunity !== undefined ? req.body.subCommunity : user.subCommunity;
      
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
      
      // Family Members
      if (req.body.familyMembers) {
        try {
          user.familyMembers = typeof req.body.familyMembers === 'string' 
            ? JSON.parse(req.body.familyMembers) 
            : req.body.familyMembers;
        } catch (e) {
          user.familyMembers = req.body.familyMembers;
        }
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
      user.isAadharVerified = req.body.isAadharVerified !== undefined ? req.body.isAadharVerified : user.isAadharVerified;
      user.isFaceVerified = req.body.isFaceVerified !== undefined ? req.body.isFaceVerified : user.isFaceVerified;

      // Membership & Subscription fields
      if (req.body.isPremium !== undefined) user.isPremium = req.body.isPremium;
      if (req.body.membershipPlan !== undefined) user.membershipPlan = req.body.membershipPlan;
      if (req.body.membershipExpiry !== undefined) user.membershipExpiry = req.body.membershipExpiry;
      if (req.body.membershipStartDate !== undefined) user.membershipStartDate = req.body.membershipStartDate;
      if (req.body.matrimonySubscription !== undefined) user.matrimonySubscription = req.body.matrimonySubscription;

      const updatedUser = await user.save();
      await updatedUser.populate('communityId', 'name slug isActive settings logoUrl description city');
      await updatedUser.populate('assignedCommunityIds', 'name slug isActive settings logoUrl description city');

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

// @desc    Simulated OTP sending (returns default OTP '123456' for development)
// @route   POST /api/auth/send-otp
// @access  Public
const sendOtp = async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ message: 'Phone number is required' });
  }
  
  let otp = null;
  // TODO: Integrate Production SMS Provider here (Twilio/Fast2SMS)
  if (process.env.NODE_ENV !== "production") {
      otp = "123456";
  }
  
  // In production, we would actually trigger the SMS sending here instead of returning it
  res.json({ message: 'OTP sent successfully (simulated)', otp });
};

// @desc    Simulated OTP verification (accepts '123456')
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ message: 'Phone and OTP are required' });
  }

  let expectedOtp = null;
  if (process.env.NODE_ENV !== "production") {
      expectedOtp = "123456";
  }
  // TODO: Production verification logic would check against a DB record or SMS provider API
  
  if (expectedOtp && otp === expectedOtp) {
    res.json({ message: 'OTP verified successfully' });
  } else {
    res.status(400).json({ message: 'Invalid OTP' });
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

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ message: 'User not found with this mobile number' });
    }

    let expectedOtp = null;
    if (process.env.NODE_ENV !== "production") {
      expectedOtp = "123456";
    }
    
    if (expectedOtp && otp !== expectedOtp) {
      return res.status(400).json({ message: 'Invalid OTP' });
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
      .select('name cityIds')
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, data: communities });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch communities' });
  }
};

// @desc    Get all active cities mapped to a community
// @route   GET /api/v1/auth/cities?communityId=XYZ
// @access  Public
const getPublicCities = async (req, res) => {
  try {
    const { communityId } = req.query;
    const City = require('../models/City');
    
    let filter = { isActive: true };

    if (communityId) {
      const Community = require('../models/Community');
      const community = await Community.findById(communityId);
      if (community && community.cityIds && community.cityIds.length > 0) {
        filter._id = { $in: community.cityIds };
      }
    }

    const cities = await City.find(filter)
      .select('name state')
      .sort({ name: 1 })
      .lean();
      
    res.json({ success: true, data: cities });
  } catch (error) {
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
  changePassword
};
