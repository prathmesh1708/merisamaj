const User = require('../../models/User');
const { notifyUserBlocked, notifyUserActivated } = require('../../services/notificationService');
const { sendPushNotification } = require('../../services/pushNotificationService');
const Community = require('../../models/Community');
const Post = require('../../models/Post');
const Donation = require('../../models/Donation');
const { applyScopeFilter } = require('../../utils/queryScopeHelper');

// ─── Helper: normalize filter value to lowercase for DB match ───
const statusMap = {
  'active': 'active',
  'inactive': 'inactive',
  'blocked': 'blocked',
  'deleted': 'deleted',
  'pending verification': 'pending verification',
};

// ─── Helper: map DB user to a consistent frontend-friendly shape ───
const formatUser = (user) => {
  const comm = user.communityId;
  const hasHead = Boolean(comm && comm.headId);
  const headName = comm?.headId?.name || null;
  const headPhone = comm?.headId?.phone || null;

  const headStatus = !comm ? 'no_community' : (hasHead ? 'assigned' : 'unassigned');

  return {
    id: user._id,
    name: user.name || 'N/A',
    email: user.email || null,
    phone: user.phone || 'N/A',
    avatar: user.avatar || null,
    gender: user.gender || null,
    dob: user.dob || null,
    city: user.city || null,
    state: user.state || null,
    district: user.district || null,
    community: comm?.name || user.community || null,
    communityId: comm?._id || user.communityId || null,
    hasHead: hasHead,
    headStatus: headStatus,
    headName: headName,
    headPhone: headPhone,
    subCommunity: user.subCommunity || null,
    role: user.role,
    accountStatus: user.accountStatus,
    verificationStatus: user.verificationStatus,
    isVerified: user.verificationStatus === 'verified',
    registrationSource: user.registrationSource,
    profession: user.profession || null,
    qualification: user.qualification || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    familyMembers: user.familyMembers || [],
  };
};

// @desc    Get paginated + filtered list of users
// @route   GET /api/v1/admin/users
// @access  Admin
exports.getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      verificationStatus = '',
      communityId = '',
      city = '',
      headStatus = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    // Build query — only regular users (not admin/head)
    const query = { role: { $in: ['user', 'member'] } };

    // Search
    if (search && search.trim()) {
      const escapeRegex = (str) => (str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    // Status filter
    if (status && status !== 'all') {
      query.accountStatus = status.toLowerCase();
    }

    // Verification filter
    if (verificationStatus && verificationStatus !== 'all') {
      query.verificationStatus = verificationStatus.toLowerCase();
    }

    // Community filter
    if (communityId && communityId !== 'all') {
      query.communityId = communityId;
    }

    // City filter
    if (city && city !== 'all') {
      query.city = { $regex: city, $options: 'i' };
    }

    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    let users = await User.find(query)
      .select('-password -plainPassword -deviceTokens')
      .populate({
        path: 'communityId',
        select: 'name _id headId city cityIds',
        populate: { path: 'headId', select: 'name phone email' }
      })
      .sort(sortObj)
      .lean();

    let totalCount = users.length;

    // In-memory filter for headStatus if requested
    if (headStatus && headStatus !== 'all') {
      if (headStatus === 'unassigned') {
        users = users.filter(u => !u.communityId || !u.communityId.headId);
      } else if (headStatus === 'assigned') {
        users = users.filter(u => u.communityId && u.communityId.headId);
      }
      totalCount = users.length;
    }

    const paginatedUsers = users.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.status(200).json({
      status: 'success',
      data: paginatedUsers.map(formatUser),
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch users' });
  }
};

// @desc    Assign or promote a head for user's community & city
// @route   POST /api/v1/admin/users/:id/assign-head
// @access  Admin
exports.assignHeadToUserCommunity = async (req, res) => {
  const mongoose = require('mongoose');
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { action, targetHeadId, headPermissions } = req.body;
    const targetUserId = req.params.id;

    const user = await User.findById(targetUserId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    let community = null;
    if (user.communityId) {
      community = await Community.findById(user.communityId).session(session);
    }
    if (!community && user.community) {
      community = await Community.findOne({ name: user.community }).session(session);
    }

    // If community doesn't exist, create it automatically
    if (!community) {
      const commName = user.community || `${user.name}'s Community`;
      community = new Community({
        name: commName,
        city: user.city || '',
        cityIds: [],
        isActive: true,
        createdBy: req.user._id
      });
    }

    // Ensure user's city is included in community.cityIds if applicable
    if (user.city) {
      const City = require('../../models/City');
      const cityDoc = await City.findOne({ name: new RegExp(`^${user.city.trim()}$`, 'i') }).session(session);
      if (cityDoc && !community.cityIds.some(id => String(id) === String(cityDoc._id))) {
        community.cityIds.push(cityDoc._id);
      }
    }

    if (action === 'promote_user') {
      // Promote this user to head
      user.role = 'head';
      user.communityId = community._id;
      user.assignedCommunityId = community._id;
      user.assignedCommunityIds = [community._id];
      if (headPermissions) {
        user.headPermissions = { ...user.headPermissions, ...headPermissions };
      }
      await user.save({ session });

      community.headId = user._id;
      await community.save({ session });
    } else if (action === 'assign_existing_head' && targetHeadId) {
      const existingHead = await User.findById(targetHeadId).session(session);
      if (!existingHead) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ status: 'error', message: 'Selected head user not found' });
      }

      community.headId = existingHead._id;
      await community.save({ session });

      if (!Array.isArray(existingHead.assignedCommunityIds)) existingHead.assignedCommunityIds = [];
      if (!existingHead.assignedCommunityIds.some(id => String(id) === String(community._id))) {
        existingHead.assignedCommunityIds.push(community._id);
      }
      existingHead.communityId = community._id;
      await existingHead.save({ session });

      user.communityId = community._id;
      await user.save({ session });
    } else {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ status: 'error', message: 'Invalid action or missing targetHeadId' });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: 'success',
      message: action === 'promote_user' ? `${user.name} was promoted to Community Head` : 'Community Head assigned successfully',
      data: {
        userId: user._id,
        communityId: community._id,
        headId: community.headId
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('assignHeadToUserCommunity error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Server error' });
  }
};

// @desc    Get user management dashboard stats
// @route   GET /api/v1/admin/users/stats
// @access  Admin
exports.getUserStats = async (req, res) => {
  try {
    const memberQuery = { role: { $in: ['user', 'member'] } };

    const [
      totalUsers,
      activeUsers,
      pendingVerification,
      suspendedUsers,
      blockedUsers,
      newUsersThisMonth,
    ] = await Promise.all([
      User.countDocuments(memberQuery),
      User.countDocuments({ ...memberQuery, accountStatus: 'active' }),
      User.countDocuments({ ...memberQuery, verificationStatus: 'pending' }),
      User.countDocuments({ ...memberQuery, accountStatus: 'inactive' }),
      User.countDocuments({ ...memberQuery, accountStatus: 'blocked' }),
      User.countDocuments({
        ...memberQuery,
        createdAt: { $gte: new Date(new Date().setDate(1)) }, // from 1st of current month
      }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        totalUsers,
        activeUsers,
        pendingVerification,
        suspendedUsers,
        blockedUsers,
        newUsersThisMonth,
        pendingComplaints: 0,      // stub — no Complaint model yet
        pendingTransfers: 0,       // stub — no TransferRequest model yet
      },
    });
  } catch (error) {
    console.error('User Stats Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch user stats' });
  }
};

// @desc    Get single user details with activity
// @route   GET /api/v1/admin/users/:id
// @access  Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -plainPassword -deviceTokens')
      .populate('communityId', 'name _id city isActive')
      .lean();

    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    // Fetch recent activity from available models (routed through applyScopeFilter)
    const donationFilter = applyScopeFilter(req, { user: user._id });
    const [recentPosts, recentDonations] = await Promise.all([
      Post.find({ authorId: user._id }).sort({ createdAt: -1 }).limit(5).select('content createdAt').lean(),
      Donation.find(donationFilter).sort({ createdAt: -1 }).limit(5).select('amount status createdAt').lean(),
    ]);

    const activityFeed = [
      ...recentPosts.map(p => ({ type: 'Post', description: (p.content || '').substring(0, 80) + (p.content?.length > 80 ? '...' : ''), date: p.createdAt, module: 'Social' })),
      ...recentDonations.map(d => ({ type: 'Donation', description: `₹${d.amount} donation — ${d.status}`, date: d.createdAt, module: 'Donations' })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);

    res.status(200).json({
      status: 'success',
      data: {
        ...formatUser(user),
        // Extra detail fields not in list view
        bloodGroup: user.bloodGroup,
        maritalStatus: user.maritalStatus,
        gotra: user.gotra,
        houseNumber: user.houseNumber,
        streetAddress: user.streetAddress,
        landmark: user.landmark,
        areaAddress: user.areaAddress,
        pincode: user.pincode,
        alternatePhone: user.alternatePhone,
        alternateEmail: user.alternateEmail,
        qualification: user.qualification,
        school: user.school,
        passingYear: user.passingYear,
        profession: user.profession,
        company: user.company,
        annualIncome: user.annualIncome,
        workCity: user.workCity,
        notificationPreferences: user.notificationPreferences,
        activityFeed,
        stats: {
          posts: await Post.countDocuments({ authorId: user._id }),
          donations: await Donation.countDocuments(donationFilter),
          invitations: 0,
        },
      },
    });
  } catch (error) {
    console.error('Get User By ID Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch user details' });
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/admin/users/:id
// @access  Admin
exports.updateUser = async (req, res) => {
  try {
    const allowedFields = [
      'name', 'email', 'phone', 'gender', 'dob', 'city', 'state', 'district',
      'community', 'subCommunity', 'qualification', 'profession', 'company',
      'communityId', 'verificationStatus',
    ];

    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const Community = require('../../models/Community');
    const mongoose = require('mongoose');

    if (updates.communityId && mongoose.isValidObjectId(updates.communityId)) {
      const commDoc = await Community.findById(updates.communityId);
      if (commDoc) {
        updates.communityId = commDoc._id;
        updates.community = commDoc.name;
      }
    } else if (updates.community && typeof updates.community === 'string') {
      const rawComm = updates.community.trim();
      const commDoc = await Community.findOne({ name: new RegExp(`^${rawComm}$`, 'i') });
      if (commDoc) {
        updates.communityId = commDoc._id;
        updates.community = commDoc.name;
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .select('-password -plainPassword -deviceTokens')
      .populate('communityId', 'name _id headId city cityIds');

    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    const cacheService = require('../../utils/cacheService');
    cacheService.del(`auth_user_${user._id}`);

    res.status(200).json({ status: 'success', data: formatUser(user) });
  } catch (error) {
    console.error('Update User Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update user' });
  }
};

// @desc    Verify user account
// @route   PATCH /api/v1/admin/users/:id/verify
// @access  Admin
exports.verifyUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          verificationStatus: 'verified',
          accountStatus: 'active',
        },
      },
      { new: true }
    ).select('-password -plainPassword').populate('communityId', 'name _id');

    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    res.status(200).json({ status: 'success', data: formatUser(user), message: 'User verified successfully' });
  } catch (error) {
    console.error('Verify User Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to verify user' });
  }
};

// @desc    Suspend user (set to inactive)
// @route   PATCH /api/v1/admin/users/:id/suspend
// @access  Admin
exports.suspendUser = async (req, res) => {
  try {
    const { reason } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          accountStatus: 'inactive',
          suspensionReason: reason || 'Suspended by Admin',
          suspendedBy: req.user._id,
          suspendedAt: new Date(),
        },
      },
      { new: true }
    ).select('-password -plainPassword').populate('communityId', 'name _id');

    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    res.status(200).json({ status: 'success', data: formatUser(user), message: 'User suspended successfully' });
  } catch (error) {
    console.error('Suspend User Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to suspend user' });
  }
};

// @desc    Block user
// @route   PATCH /api/v1/admin/users/:id/block
// @access  Admin
exports.blockUser = async (req, res) => {
  try {
    const { reason } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          accountStatus: 'blocked',
          blockReason: reason || 'Blocked by Admin',
          blockedBy: req.user._id,
          blockedAt: new Date(),
        },
      },
      { new: true }
    ).select('-password -plainPassword').populate('communityId', 'name _id');

    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    // ── Notification: notify blocked user ────────────────────────────────────────
    try {
      const notifDoc = await notifyUserBlocked(user._id, reason);
      if (notifDoc) {
        sendPushNotification({
          userId: user._id,
          notificationId: notifDoc._id,
          type: 'account_blocked',
          title: 'Account Blocked 🛑',
          message: `Your account has been restricted by an administrator. Reason: ${reason || 'Violation of community policies'}`,
          icon: '🛑',
          actionUrl: '/member/profile'
        }).catch(err => console.error('[AccountPushError]', err.message));
      }
    } catch (notifErr) {
      console.warn('[Notify] blockUser account_blocked failed:', notifErr.message);
    }

    res.status(200).json({ status: 'success', data: formatUser(user), message: 'User blocked successfully' });
  } catch (error) {
    console.error('Block User Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to block user' });
  }
};

// @desc    Activate user account
// @route   PATCH /api/v1/admin/users/:id/activate
// @access  Admin
exports.activateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          accountStatus: 'active',
          $unset: {
            suspensionReason: '',
            blockReason: '',
            suspendedBy: '',
            suspendedAt: '',
            blockedBy: '',
            blockedAt: '',
          },
        },
      },
      { new: true }
    ).select('-password -plainPassword').populate('communityId', 'name _id');

    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    // ── Notification: notify activated user ───────────────────────────────────────
    try {
      const notifDoc = await notifyUserActivated(user._id);
      if (notifDoc) {
        sendPushNotification({
          userId: user._id,
          notificationId: notifDoc._id,
          type: 'account_activated',
          title: 'Account Activated ✅',
          message: 'Your account has been restored to active status. Welcome back!',
          icon: '✅',
          actionUrl: '/member/home'
        }).catch(err => console.error('[AccountPushError]', err.message));
      }
    } catch (notifErr) {
      console.warn('[Notify] activateUser account_activated failed:', notifErr.message);
    }

    res.status(200).json({ status: 'success', data: formatUser(user), message: 'User activated successfully' });
  } catch (error) {
    console.error('Activate User Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to activate user' });
  }
};

// @desc    Soft-delete user
// @route   DELETE /api/v1/admin/users/:id
// @access  Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { accountStatus: 'deleted' } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    res.status(200).json({ status: 'success', message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete User Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete user' });
  }
};
