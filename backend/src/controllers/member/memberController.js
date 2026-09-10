const User = require('../../models/User');
const Follower = require('../../models/Follower');
const UserBlock = require('../../models/UserBlock');
const { applyScopeFilter } = require('../../utils/queryScopeHelper');

// ─────────────────────────────────────────────
// @desc    Get members of the logged-in user's community
// @route   GET /api/v1/member/members
// @access  Private
// ─────────────────────────────────────────────
exports.getCommunityMembers = async (req, res) => {
  try {
    const {
      search,
      city,
      profession,
      age,
      category,
      page = 1,
      limit = 10
    } = req.query;

    const baseFilter = { accountStatus: { $ne: 'deleted' } };
    const filter = applyScopeFilter(req, baseFilter);

    // Optional search by name
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (city) filter.city = { $regex: city, $options: 'i' };
    if (profession) filter.profession = { $regex: profession, $options: 'i' };

    if (age === 'youth') {
      const date35YearsAgo = new Date();
      date35YearsAgo.setFullYear(date35YearsAgo.getFullYear() - 35);
      filter.dob = { $gte: date35YearsAgo };
    } else if (age === 'senior') {
      const date60YearsAgo = new Date();
      date60YearsAgo.setFullYear(date60YearsAgo.getFullYear() - 60);
      filter.dob = { $lte: date60YearsAgo };
    }

    if (category) {
      if (category === 'Executive Members' || category === 'Executives') {
        filter.role = { $in: ['head', 'admin'] };
      } else if (category === 'Teachers') {
        filter.profession = { $regex: 'Teacher', $options: 'i' };
      } else if (category === 'Doctors') {
        filter.profession = { $regex: 'Doctor', $options: 'i' };
      } else if (category === 'Engineers') {
        filter.profession = { $regex: 'Engineer', $options: 'i' };
      } else if (category === 'Business Owners') {
        filter.profession = { $regex: 'Business', $options: 'i' };
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [members, total] = await Promise.all([
      User.find(filter)
        .select('name avatar city profession phone email gender gotra community communityId assignedCommunityIds accountStatus verificationStatus isAadharVerified area familyMembers role createdAt')
        .sort({ name: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: members,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('getCommunityMembers error:', error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// @desc    Get a single member's public profile
// @route   GET /api/v1/member/members/:id
// @access  Private
// ─────────────────────────────────────────────
exports.getMemberProfile = async (req, res) => {
  try {
    const requestingUserId = req.user._id;
    const targetUserId = req.params.id;
    const isMe = requestingUserId.toString() === targetUserId.toString();

    // 1. Block Check
    let hasBlockedOrIsBlocked = false;
    if (!isMe) {
      const blockRelationship = await UserBlock.findOne({
        $or: [
          { userId: requestingUserId, blockedUserId: targetUserId },
          { userId: targetUserId, blockedUserId: requestingUserId }
        ]
      });
      if (blockRelationship) {
        hasBlockedOrIsBlocked = true;
      }
    }

    if (hasBlockedOrIsBlocked) {
      const minimalUser = await User.findById(targetUserId).select('name avatar');
      if (!minimalUser) {
        return res.status(404).json({ status: 'error', message: 'Member not found' });
      }
      return res.json({
        success: true,
        data: {
          _id: minimalUser._id,
          id: minimalUser._id,
          name: minimalUser.name,
          avatar: minimalUser.avatar,
          isBlocked: true
        }
      });
    }

    const member = await User.findById(targetUserId)
      .select('-password -deviceTokens -refreshToken');

    if (!member) {
      return res.status(404).json({ status: 'error', message: 'Member not found' });
    }

    // Community access check: members cannot view profiles from other communities
    if (req.communityId && member.communityId) {
      const memberCommunityId = member.communityId._id ?? member.communityId;
      if (!memberCommunityId.equals(req.communityId)) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. This member belongs to a different community.'
        });
      }
    }

    // 2. Follow / Privacy Check
    let isFollowing = false;
    if (!isMe) {
      const followRel = await Follower.findOne({
        followerId: requestingUserId,
        followingId: targetUserId,
        status: 'accepted'
      });
      if (followRel) {
        isFollowing = true;
      }
    }

    const isPrivate = member.isPrivate === true;
    const canAccess = isMe || !isPrivate || isFollowing;

    if (!canAccess) {
      // Return minimal info for private profiles
      return res.json({
        success: true,
        data: {
          _id: member._id,
          id: member._id,
          name: member.name,
          avatar: member.avatar,
          cover: member.cover,
          bio: member.bio,
          city: member.city,
          state: member.state,
          community: member.community,
          subCommunity: member.subCommunity,
          role: member.role,
          isPrivate: true,
          isVerified: member.isVerified,
          isPremium: member.isPremium
        }
      });
    }

    // 3. Granular Field-level Privacy check (Condition 1)
    const memberObj = member.toObject();
    
    if (!isMe) {
      // Remove detailed street address, landmark, pincodeAddress, houseNumber
      delete memberObj.streetAddress;
      delete memberObj.landmark;
      delete memberObj.pincodeAddress;
      delete memberObj.houseNumber;
      delete memberObj.detailedAddress;

      // Phone number privacy check
      const phonePrivacySetting = member.phonePrivacy || 'followers';
      const showPhone = phonePrivacySetting === 'public' || (phonePrivacySetting === 'followers' && isFollowing);
      if (!showPhone) {
        delete memberObj.phone;
        delete memberObj.alternatePhone;
      }

      // Email privacy check
      const emailPrivacySetting = member.emailPrivacy || 'followers';
      const showEmail = emailPrivacySetting === 'public' || (emailPrivacySetting === 'followers' && isFollowing);
      if (!showEmail) {
        delete memberObj.email;
        delete memberObj.alternateEmail;
      }

      // Family privacy check
      const familyPrivacySetting = member.familyPrivacy || 'followers';
      const showFamily = familyPrivacySetting === 'public' || (familyPrivacySetting === 'followers' && isFollowing);
      if (!showFamily) {
        delete memberObj.familyMembers;
      }
    }

    res.json({ success: true, data: memberObj });
  } catch (error) {
    console.error('getMemberProfile error:', error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// @desc    Get member statistics for directory categories
// @route   GET /api/v1/member/members/stats
// @access  Private
// ─────────────────────────────────────────────
exports.getMemberStats = async (req, res) => {
  try {
    const scopeFilter = applyScopeFilter(req, { accountStatus: { $ne: 'deleted' } });
    const matchStage = {
      $match: scopeFilter
    };

    // Calculate dynamic age boundaries
    const now = new Date();
    const date35YearsAgo = new Date();
    date35YearsAgo.setFullYear(now.getFullYear() - 35);
    const date60YearsAgo = new Date();
    date60YearsAgo.setFullYear(now.getFullYear() - 60);

    const [cityStats, professionStats, ageStats, roleStats] = await Promise.all([
      // Group by city
      User.aggregate([
        matchStage,
        { $match: { city: { $exists: true, $ne: null, $ne: "" } } },
        { $group: { _id: "$city", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      // Group by profession
      User.aggregate([
        matchStage,
        { $match: { profession: { $exists: true, $ne: null, $ne: "" } } },
        { $group: { _id: "$profession", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      // Age categories
      User.aggregate([
        matchStage,
        { $match: { dob: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: null,
            youth: { $sum: { $cond: [{ $gte: ["$dob", date35YearsAgo] }, 1, 0] } },
            senior: { $sum: { $cond: [{ $lte: ["$dob", date60YearsAgo] }, 1, 0] } }
          }
        }
      ]),
      // Specific roles / predefined categories
      User.aggregate([
        matchStage,
        {
          $group: {
            _id: null,
            executives: { $sum: { $cond: [{ $in: ["$role", ["head", "admin"]] }, 1, 0] } },
            teachers: { $sum: { $cond: [{ $regexMatch: { input: "$profession", regex: /Teacher/i } }, 1, 0] } },
            doctors: { $sum: { $cond: [{ $regexMatch: { input: "$profession", regex: /Doctor/i } }, 1, 0] } },
            engineers: { $sum: { $cond: [{ $regexMatch: { input: "$profession", regex: /Engineer/i } }, 1, 0] } },
            business: { $sum: { $cond: [{ $regexMatch: { input: "$profession", regex: /Business/i } }, 1, 0] } }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        cities: cityStats.map(s => ({ name: s._id, count: s.count })),
        professions: professionStats.map(s => ({ name: s._id, count: s.count })),
        age: ageStats.length > 0 ? [
          { name: 'youth', count: ageStats[0].youth },
          { name: 'senior', count: ageStats[0].senior }
        ] : [],
        categories: roleStats.length > 0 ? [
          { name: 'Executive Members', count: roleStats[0].executives },
          { name: 'Teachers', count: roleStats[0].teachers },
          { name: 'Doctors', count: roleStats[0].doctors },
          { name: 'Engineers', count: roleStats[0].engineers },
          { name: 'Business Owners', count: roleStats[0].business }
        ] : []
      }
    });
  } catch (error) {
    console.error('getMemberStats error:', error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};
