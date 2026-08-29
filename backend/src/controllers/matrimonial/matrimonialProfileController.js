/**
 * matrimonialProfileController.js
 * Handles all CRUD operations and search for MatrimonialProfile.
 */
const MatrimonialProfile  = require('../../models/MatrimonialProfile');
const MatrimonialSettings = require('../../models/MatrimonialSettings');
const User                = require('../../models/User');
const InterestRequest     = require('../../models/InterestRequest');
const UserBlock           = require('../../models/UserBlock');
const ProfileVisitor      = require('../../models/ProfileVisitor');
const { calculateMatchPercentage, calcAge } = require('../../services/matchService');
const { buildRestrictedProfile, buildFullProfile } = require('../../middleware/matrimonialPrivacy');
const { notifyProfileViewed, createNotification, notifyProfileSubmittedToAdmin } = require('../../services/notificationService');
const { getEffectiveFeatures } = require('../../middleware/subscriptionMiddleware');
const { inheritTenantPayload } = require('../../utils/queryScopeHelper');

// ─── Completion Calculator ────────────────────────────────────────────────────
const SECTION_REQUIRED_FIELDS = {
  personal:    ['fullName', 'gender', 'dateOfBirth', 'maritalStatus', 'religion', 'community'],
  education:   ['highestQualification', 'profession'],
  family:      ['familyType'],
  lifestyle:   ['diet'],
  location:    ['state', 'city'],
  preferences: ['ageMin', 'ageMax'],
  photos:      null,  // Checked separately
  about:       ['biography']
};

const calculateCompletion = (profile) => {
  const completedSections = [];
  const sections = Object.keys(SECTION_REQUIRED_FIELDS);

  for (const section of sections) {
    if (section === 'photos') {
      const approvedPhotos = (profile.photos || []).filter(p => p.status === 'approved');
      if (approvedPhotos.length > 0) completedSections.push('photos');
      continue;
    }
    const requiredFields = SECTION_REQUIRED_FIELDS[section];
    const sectionData    = profile[section];
    if (!sectionData) continue;
    const allFilled = requiredFields.every(f => sectionData[f] !== undefined && sectionData[f] !== null && sectionData[f] !== '');
    if (allFilled) completedSections.push(section);
  }

  const percentage = Math.round((completedSections.length / sections.length) * 100);
  return { percentage, completedSections };
};

// ─── Get effective min completion (env-driven, falls back to DB settings) ─────
const getMinCompletion = async () => {
  const envVal = parseInt(process.env.MATRIMONIAL_MIN_COMPLETION);
  if (!isNaN(envVal) && envVal > 0) return envVal;
  const settings = await MatrimonialSettings.findOne().lean();
  return settings?.profileCompletionRequired ?? 50;
};

// ─── Create Profile ───────────────────────────────────────────────────────────
exports.createProfile = async (req, res) => {
  try {
    const existing = await MatrimonialProfile.findOne({ userId: req.user._id, isDeleted: false });
    if (existing) {
      return res.status(400).json({ status: 'error', message: 'You already have a matrimonial profile.' });
    }

    const payload = inheritTenantPayload(req, req.body);

    const profileData = {
      ...payload,
      userId:      req.user._id,
      communityId: payload.communityId,
      createdBy:   req.user._id,
      updatedBy:   req.user._id
    };

    const profile = new MatrimonialProfile(profileData);
    // ─── Production rule: always start as 'pending' ──────────────────────────
    // Admin/Head must verify before the profile appears in search
    profile.status = 'pending';
    profile.visibility = req.body.visibility || 'public';
    const completion = calculateCompletion(profile);
    profile.profileCompletion = completion;

    await profile.save();

    // Notify admin/head about new pending profile
    try {
      const Community = require('../../models/Community');
      const comm = await Community.findById(req.communityId).select('headId').lean();
      if (comm?.headId) {
        notifyProfileSubmittedToAdmin([comm.headId], req.user.name || 'A member', profile._id);
      }
    } catch (notifErr) {
      console.warn('[Notify] createProfile profile_submitted_to_admin failed:', notifErr.message);
    }

    // Notify user
    createNotification({
      userId:        req.user._id,
      module:        'matrimonial',
      type:          'matrimonial_profile_created',
      title:         'Profile Under Review ⏳',
      message:       'Your matrimonial profile has been submitted and is pending admin verification. You will be notified once it is approved.',
      icon:          '⏳',
      priority:      'normal',
      actionUrl:     '/member/matrimonial/profile'
    });

    res.status(201).json({
      status: 'success',
      message: 'Profile created and pending verification.',
      data: { profile }
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ status: 'error', message: 'You already have a matrimonial profile.' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Update Profile ───────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id, isDeleted: false });
    if (!profile) {
      return res.status(404).json({ status: 'error', message: 'Profile not found. Please create one first.' });
    }

    // Merge nested objects safely — 'status' excluded (admin-only)
    const allowedSections = ['personal', 'education', 'family', 'lifestyle', 'location', 'preferences', 'horoscope', 'about', 'contactSharing', 'privacy', 'visibility'];
    for (const section of allowedSections) {
      if (req.body[section] !== undefined) {
        if (typeof req.body[section] === 'object' && !Array.isArray(req.body[section])) {
          profile[section] = { ...profile[section]?.toObject?.() ?? profile[section], ...req.body[section] };
        } else {
          profile[section] = req.body[section];
        }
      }
    }

    profile.updatedBy  = req.user._id;
    profile.lastActiveAt = new Date();

    // Recalculate completion
    const completion = calculateCompletion(profile);
    profile.profileCompletion = completion;

    await profile.save();
    res.json({ status: 'success', data: { profile, profileCompletion: completion } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Get My Profile ───────────────────────────────────────────────────────────
exports.getMyProfile = async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id, isDeleted: false });
    if (!profile) {
      return res.status(200).json({ status: 'success', data: { profile: null } });
    }
    res.json({ status: 'success', data: { profile } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Get User Profile (Privacy-aware) ────────────────────────────────────────
exports.getUserProfile = async (req, res) => {
  try {
    const { id } = req.params; // This is the MatrimonialProfile _id
    const viewerId = req.user._id;

    const profile = await MatrimonialProfile.findOne({
      _id: id,
      status: { $in: ['active', 'married'] },
      isDeleted: false
    }).populate('userId', 'name phone email avatar');

    if (!profile) {
      return res.status(404).json({ status: 'error', message: 'Profile not found or not available.' });
    }

    const profileOwnerUserId = profile.userId._id || profile.userId;

    // If profile is married, restrict viewing to the owner or their confirmed partner
    if (profile.status === 'married' && !profileOwnerUserId.equals(viewerId)) {
      const viewerProfile = await MatrimonialProfile.findOne({ userId: viewerId, isDeleted: false });
      if (!viewerProfile || !viewerProfile.marriageConfirmedWith || !viewerProfile.marriageConfirmedWith.equals(profile._id)) {
        return res.status(404).json({ status: 'error', message: 'Profile not found or not available.' });
      }
    }

    // ─── Block Check ────────────────────────────────────────────────────────
    const isBlocked = await UserBlock.findOne({
      $or: [
        { userId: viewerId, blockedUserId: profileOwnerUserId },
        { userId: profileOwnerUserId, blockedUserId: viewerId }
      ]
    });
    if (isBlocked) {
      return res.status(403).json({ status: 'error', message: 'You cannot view this profile.' });
    }

    const { features } = await getEffectiveFeatures(viewerId);

    // ─── Record Visit (Premium feature) ────────────────────────────────────
    if (!profileOwnerUserId.equals(viewerId)) {
      await ProfileVisitor.findOneAndUpdate(
        { visitorId: viewerId, profileId: profile._id },
        { $inc: { visitCount: 1 }, $set: { lastVisited: new Date() } },
        { upsert: true, new: true }
      );
      // Update profile view counters
      await MatrimonialProfile.findByIdAndUpdate(profile._id, {
        $inc: { totalProfileViews: 1, monthlyProfileViews: 1, weeklyProfileViews: 1 }
      });
      // Notify profile owner if they have Premium
      const ownerFeatures = await getEffectiveFeatures(profileOwnerUserId);
      if (ownerFeatures.features.visitorHistory) {
        const viewer = req.user;
        notifyProfileViewed(profileOwnerUserId, viewer.name || 'Someone');
      }
    }

    // ─── My own profile — full view ─────────────────────────────────────────
    if (profileOwnerUserId.equals(viewerId)) {
      return res.json({ status: 'success', data: {
        profile: buildFullProfile(profile, features),
        matchPercentage: 100, matchedCriteria: [],
        isConnected: false,
        interestRelationship: null
      }});
    }

    // ─── Check for Accepted Interest ────────────────────────────────────────
    const acceptedInterest = await InterestRequest.findOne({
      $or: [
        { senderId: viewerId, receiverId: profileOwnerUserId, status: 'accepted' },
        { senderId: profileOwnerUserId, receiverId: viewerId, status: 'accepted' }
      ]
    });

    // ─── Check for Pending Interest ─────────────────────────────────────────
    const pendingInterest = !acceptedInterest ? await InterestRequest.findOne({
      $or: [
        { senderId: viewerId, receiverId: profileOwnerUserId, status: 'pending' },
        { senderId: profileOwnerUserId, receiverId: viewerId, status: 'pending' }
      ]
    }) : null;

    // ─── Build interestRelationship summary ──────────────────────────────────
    let interestRelationship = null;
    if (acceptedInterest) {
      interestRelationship = {
        _id:      acceptedInterest._id,
        status:   'accepted',
        isSender: acceptedInterest.senderId.toString() === viewerId.toString(),
        conversationId: acceptedInterest.conversationId
      };
    } else if (pendingInterest) {
      interestRelationship = {
        _id:      pendingInterest._id,
        status:   'pending',
        isSender: pendingInterest.senderId.toString() === viewerId.toString()
      };
    }

    // ─── Calculate Match % ───────────────────────────────────────────────────
    const myProfile = await MatrimonialProfile.findOne({ userId: viewerId, isDeleted: false }).lean();
    let matchPercentage = 0;
    let matchedCriteria = [];
    if (myProfile) {
      const result = await calculateMatchPercentage(myProfile, profile);
      matchPercentage = result.matchPercentage;
      matchedCriteria = result.matchedCriteria;
    }

    // ─── Build Response based on Privacy Rules ───────────────────────────────
    let profileData;
    const { subscription } = await getEffectiveFeatures(viewerId);
    const hasPremium = !!subscription;

    if (hasPremium || acceptedInterest || profileOwnerUserId.equals(viewerId)) {
      profileData = buildFullProfile(profile, features);
    } else {
      profileData = buildRestrictedProfile(profile);
    }

    res.json({
      status: 'success',
      data:   {
        profile: profileData,
        matchPercentage,
        matchedCriteria,
        isConnected: !!acceptedInterest,
        interestRelationship
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message, stack: err.stack });
  }
};

// ─── Search Profiles ──────────────────────────────────────────────────────────
exports.searchProfiles = async (req, res) => {
  try {
    const {
      page = 1, limit = 20,
      name,
      gender, ageMin, ageMax,
      heightMin, heightMax,
      community, religion, maritalStatus, gotra,
      profession, education, occupation,
      state, city, country,
      diet, annualIncome,
      sort = 'recent',
      verifiedOnly, withPhoto
    } = req.query;

    // ─── Min Completion (env-driven) ─────────────────────────────────────────
    const completionRequired = await getMinCompletion();

    // ─── Get Current User's Profile early to enforce gender opposite filtering ────
    const myProfile = await MatrimonialProfile.findOne({ userId: req.user._id, isDeleted: false }).lean({ virtuals: true });
    
    // Block search if user is married or profile is closed
    if (myProfile && (myProfile.isClosed || myProfile.status === 'married')) {
      return res.status(403).json({ status: 'error', message: 'Married profiles cannot search for new matches.' });
    }

    const userDoc = await User.findById(req.user._id).select('gender').lean();

    const mongoose = require('mongoose');
    const userObjectId = new mongoose.Types.ObjectId(req.user._id);

    const query = {
      isDeleted:  false,
      status:     'active',         // Only active (not married/hidden/suspended) profiles
      isClosed:   { $ne: true },    // Exclude married/closed profiles from matchmaking
      // ─── Exclude current user from their own search results ───────────────
      userId:     { $ne: userObjectId },
      'profileCompletion.percentage': { $gte: completionRequired }
    };

    // ─── Block Filter ────────────────────────────────────────────────────────
    const blockedByMe  = await UserBlock.find({ userId: req.user._id }).distinct('blockedUserId');
    const whoBlockedMe = await UserBlock.find({ blockedUserId: req.user._id }).distinct('userId');
    const excludeUsers = [...blockedByMe, ...whoBlockedMe];
    // userId.$ne is already set — merge with $nin if blocks exist
    if (excludeUsers.length > 0) {
      query.userId = { $ne: userObjectId, $nin: excludeUsers };
    }

    // ─── Name Search ─────────────────────────────────────────────────────────
    const escapeRegex = (str) => (str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (name && name.trim()) {
      query['personal.fullName'] = new RegExp(escapeRegex(name.trim()), 'i');
    }

    // ─── Gender Filter (Strictly Enforce Opposite Gender) ────────────────────
    let myGender = null;
    if (myProfile && myProfile.personal && myProfile.personal.gender) {
      myGender = myProfile.personal.gender.toLowerCase();
    } else if (userDoc && userDoc.gender) {
      myGender = userDoc.gender.toLowerCase();
    }

    if (myGender === 'male') {
      query['personal.gender'] = 'female';
    } else if (myGender === 'female') {
      query['personal.gender'] = 'male';
    } else if (gender) {
      query['personal.gender'] = gender;
    }

    // ─── Age Filter (calculated via DOB) ─────────────────────────────────────
    if (ageMin || ageMax) {
      const today = new Date();
      if (ageMax) {
        const minDob = new Date(today.getFullYear() - Number(ageMax), today.getMonth(), today.getDate());
        query['personal.dateOfBirth'] = { ...query['personal.dateOfBirth'], $gte: minDob };
      }
      if (ageMin) {
        const maxDob = new Date(today.getFullYear() - Number(ageMin), today.getMonth(), today.getDate());
        query['personal.dateOfBirth'] = { ...query['personal.dateOfBirth'], $lte: maxDob };
      }
    }

    // ─── Height Filter ────────────────────────────────────────────────────────
    if (heightMin) query['personal.height'] = { $gte: Number(heightMin) };
    if (heightMax) query['personal.height'] = { ...(query['personal.height'] || {}), $lte: Number(heightMax) };

    // ─── Profile Attribute Filters (Index-friendly Anchored RegEx) ──────────────
    const prefixRegex = (val) => new RegExp('^' + escapeRegex(val.trim()), 'i');
    const exactRegex  = (val) => new RegExp('^' + escapeRegex(val.trim()) + '$', 'i');

    // ─── Community & Community Scope Filter ──────────────────────────────────
    const userCommunity = (myProfile?.personal?.community || req.user?.community || '').trim();
    if (req.query.communityScope === 'other') {
      if (userCommunity) {
        query['personal.community'] = { $not: new RegExp('^' + escapeRegex(userCommunity) + '$', 'i') };
      }
    } else if (req.query.communityScope === 'my') {
      if (userCommunity) {
        query['personal.community'] = new RegExp('^' + escapeRegex(userCommunity) + '$', 'i');
      }
    } else if (community && community.trim()) {
      query['personal.community'] = prefixRegex(community);
    }
    if (religion)      query['personal.religion']                = prefixRegex(religion);
    if (gotra)         query['personal.gotra']                   = prefixRegex(gotra);
    if (profession)    query['education.profession']             = prefixRegex(profession);
    if (occupation)    query['education.occupation']             = prefixRegex(occupation);
    if (education)     query['education.highestQualification']   = prefixRegex(education);
    if (state)         query['location.state']                   = prefixRegex(state);
    if (city)          query['location.city']                    = prefixRegex(city);
    if (country)       query['location.country']                 = prefixRegex(country);
    if (annualIncome)  query['education.annualIncome']           = prefixRegex(annualIncome);

    // Dropdown / Select inputs: Exact match
    if (maritalStatus) query['personal.maritalStatus']           = exactRegex(maritalStatus);
    if (diet)          query['lifestyle.diet']                   = exactRegex(diet);

    // ─── Verified Only ────────────────────────────────────────────────────────
    if (verifiedOnly === 'true' || verifiedOnly === true) {
      query.verificationStatus = 'verified';
    }

    // ─── With Photo Only ─────────────────────────────────────────────────────
    if (withPhoto === 'true' || withPhoto === true) {
      query['photos.status'] = 'approved';
    }

    // ─── Sort ────────────────────────────────────────────────────────────────
    let sortOption = {};
    if (sort === 'recent')        sortOption = { createdAt: -1 };
    else if (sort === 'active')   sortOption = { lastActiveAt: -1 };
    else if (sort === 'age_asc')  sortOption = { 'personal.dateOfBirth': -1 };
    else if (sort === 'age_desc') sortOption = { 'personal.dateOfBirth': 1 };
    else                          sortOption = { createdAt: -1 };

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await MatrimonialProfile.countDocuments(query);

    let profiles = await MatrimonialProfile.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .lean({ virtuals: true });

    // ─── Enrich with Match % and Privacy-Aware Preview ───────────────────────

    // Pre-load accepted interests for batch check
    const profileUserIds = profiles.map(p => p.userId);
    const acceptedInterests = await InterestRequest.find({
      $or: [
        { senderId: req.user._id, receiverId: { $in: profileUserIds }, status: 'accepted' },
        { senderId: { $in: profileUserIds }, receiverId: req.user._id, status: 'accepted' }
      ]
    }).lean();
    const connectedUserIds = new Set(acceptedInterests.map(i =>
      i.senderId.toString() === req.user._id.toString() ? i.receiverId.toString() : i.senderId.toString()
    ));

    // Pre-load sent interests
    const sentInterests = await InterestRequest.find({
      senderId: req.user._id,
      receiverId: { $in: profileUserIds },
      status: 'pending'
    }).lean();
    const sentToUserIds = new Set(sentInterests.map(i => i.receiverId.toString()));

    profiles = await Promise.all(profiles.map(async (profile) => {
      const isOwner     = profile.userId.toString() === req.user._id.toString();
      const isConnected = connectedUserIds.has(profile.userId.toString());
      const isPublic    = profile.visibility === 'public';
      const hasSentInterest = sentToUserIds.has(profile.userId.toString());

      let safeProfile;
      if (isOwner || isPublic || isConnected) {
        safeProfile = buildFullProfile(profile, { contactDetailsAccess: false });
      } else {
        safeProfile = buildRestrictedProfile(profile);
      }

      let matchPercentage = 0;
      let matchedCriteria = [];
      if (myProfile) {
        const result = await calculateMatchPercentage(myProfile, profile);
        matchPercentage = result.matchPercentage;
        matchedCriteria = result.matchedCriteria;
      }

      return { ...safeProfile, matchPercentage, matchedCriteria, isConnected, hasSentInterest };
    }));

    res.json({
      status: 'success',
      data: {
        profiles,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Soft Delete Profile ──────────────────────────────────────────────────────
exports.deleteProfile = async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id, isDeleted: false });
    if (!profile) {
      return res.status(404).json({ status: 'error', message: 'Profile not found.' });
    }
    profile.isDeleted = true;
    profile.deletedAt = new Date();
    profile.status    = 'deleted';
    profile.updatedBy = req.user._id;
    await profile.save();
    res.json({ status: 'success', message: 'Profile deleted successfully.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Get Available Communities in Matrimonial ────────────────────────────────
exports.getAvailableCommunities = async (req, res) => {
  try {
    const Community = require('../../models/Community');
    const [distinctProfileCommunities, registeredCommunities] = await Promise.all([
      MatrimonialProfile.distinct('personal.community', { isDeleted: false, status: 'active' }),
      Community.find({ isActive: true }).select('name').lean()
    ]);

    const communitySet = new Set();
    distinctProfileCommunities.filter(Boolean).forEach(c => communitySet.add(c.trim()));
    registeredCommunities.forEach(c => {
      if (c.name) communitySet.add(c.name.trim());
    });

    const standardCommunities = ['Agrawal', 'Jain', 'Brahmin', 'Maheshwari', 'Maratha', 'Khandelwal', 'Rajput', 'Gupta', 'Patel', 'Sikh', 'Punjabi', 'Yadav', 'Sindhi'];
    standardCommunities.forEach(c => communitySet.add(c));

    const list = Array.from(communitySet).sort((a, b) => a.localeCompare(b));
    res.json({ status: 'success', data: list });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
