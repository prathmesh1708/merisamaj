const mongoose = require('mongoose');
const User = require('../../models/User');
const Community = require('../../models/Community');
const MatrimonialProfile = require('../../models/MatrimonialProfile');
const Event = require('../../models/Event');
const Professional = require('../../models/Professional');
const Post = require('../../models/Post');
const PostLike = require('../../models/PostLike');
const EventResponse = require('../../models/EventResponse');
const Contribution = require('../../models/Contribution');
const Donation = require('../../models/Donation');
const { applyScopeFilter } = require('../../utils/queryScopeHelper');

// Everything a Head needs to review a member — never the password fields
const MEMBER_PROFILE_FIELDS = [
  'name phone email alternatePhone alternateEmail avatar cover bio about',
  'gender dob bloodGroup maritalStatus gotra familyType',
  'community communityId subCommunity',
  'city district state country pincode houseNumber streetAddress landmark areaAddress detailedAddress',
  'qualification school passingYear profession company annualIncome workCity',
  'familyMembers',
  'isAadharVerified isFaceVerified isPhoneVerified isEmailVerified verificationStatus accountStatus registrationSource referredBy createdAt',
  'membershipReview'
].join(' ');

// Membership request tabs. Approved only counts requests decided through the review
// flow (membershipReview), otherwise every verified member would be listed.
const PENDING_REQUEST = { $or: [{ verificationStatus: 'pending' }, { accountStatus: 'pending verification' }] };
const REQUEST_STATUS_FILTERS = {
  pending: PENDING_REQUEST,
  approved: { verificationStatus: 'verified', 'membershipReview.status': 'approved' },
  rejected: { verificationStatus: 'rejected' }
};
REQUEST_STATUS_FILTERS.all = { $or: [PENDING_REQUEST, REQUEST_STATUS_FILTERS.approved, REQUEST_STATUS_FILTERS.rejected] };

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isLocalHeadUser = (user) => {
  if (!user) return false;
  const allRoles = [user.role, ...(Array.isArray(user.roles) ? user.roles : [])]
    .filter(Boolean)
    .map(r => String(r).toLowerCase());
  const accType = String(user.accountType || '').toLowerCase();
  const subHeadType = String(user.subHeadType || '').toLowerCase();
  const des = String(user.designation || '').toLowerCase();

  return (
    accType === 'local_head' ||
    accType === 'local_sub_head' ||
    allRoles.includes('local_head') ||
    subHeadType === 'local' ||
    des === 'local head' ||
    (allRoles.includes('sub_head') && subHeadType !== 'admin' && accType !== 'community_head')
  );
};

/**
 * @desc    Get consolidated Head Dashboard Stats
 * @route   GET /api/v1/head/dashboard/stats
 * @access  Private (Head/Admin)
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // A Local Head cannot widen their assigned city by editing the query string.
    const activeCity = isLocalHeadUser(req.user) ? req.user.city : (req.query.city || null);

    // ── 1. Total Members & Account Status Breakdown ──
    const memberBaseFilter = applyScopeFilter(req, { role: { $in: ['user', 'member'] }, accountStatus: { $ne: 'deleted' } }, { overrideCity: activeCity });
    const totalMembers = await User.countDocuments(memberBaseFilter);

    const activeMembersCount = await User.countDocuments(
      applyScopeFilter(req, { role: { $in: ['user', 'member'] }, accountStatus: 'active' }, { overrideCity: activeCity })
    );

    const inactiveMembersCount = await User.countDocuments(
      applyScopeFilter(req, { role: { $in: ['user', 'member'] }, accountStatus: { $in: ['inactive', 'pending verification', 'blocked'] } }, { overrideCity: activeCity })
    );

    // 6-Month Member Growth Aggregation
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const growthMatchFilter = applyScopeFilter(req, { createdAt: { $gte: sixMonthsAgo }, accountStatus: { $ne: 'deleted' } }, { overrideCity: activeCity });
    const rawGrowth = await User.aggregate([
      { $match: growthMatchFilter },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format 6 months array
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const memberGrowthTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mNum = d.getMonth() + 1;
      const yNum = d.getFullYear();
      const match = rawGrowth.find(g => g._id.year === yNum && g._id.month === mNum);
      memberGrowthTrend.push({
        month: monthNames[d.getMonth()],
        year: yNum,
        count: match ? match.count : 0
      });
    }

    // ── 2. Pending Member Approvals ──
    const pendingQuery = applyScopeFilter(req, {
      role: { $in: ['user', 'member'] },
      $or: [
        { verificationStatus: 'pending' },
        { accountStatus: 'pending verification' }
      ]
    }, { overrideCity: activeCity, includeUnassignedCity: !isLocalHeadUser(req.user) });

    const pendingMembersCount = await User.countDocuments(pendingQuery);
    const pendingLimit = req.query.limit ? Math.min(100, Math.max(1, parseInt(req.query.limit))) : 50;
    const pendingMembersList = await User.find(pendingQuery)
      // Full profile so the Head can review the applicant properly (never the password)
      .select(MEMBER_PROFILE_FIELDS)
      .populate('communityId', 'name')
      .populate('referredBy', 'name phone')
      .sort({ createdAt: -1 })
      .limit(pendingLimit)
      .lean();

    // ── 3. Active Matrimonial Profiles ──
    const matQuery = applyScopeFilter(req, { status: 'active' }, { overrideCity: activeCity });
    const activeMatrimonialCount = await MatrimonialProfile.countDocuments(matQuery);

    // ── 4. Upcoming Events ──
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const eventQuery = applyScopeFilter(req, {
      $or: [
        { date: { $gte: todayStart } },
        { startDate: { $gte: todayStart } }
      ]
    }, { overrideCity: activeCity });

    const upcomingEventsCount = await Event.countDocuments(eventQuery);
    const upcomingEventsList = await Event.find(eventQuery)
      .sort({ date: 1, startDate: 1 })
      .limit(6)
      .lean();

    // ── 5. Professional Listings Overview & Category Breakdown (Approved listings only) ──
    const profBaseQuery = applyScopeFilter(req, { status: 'Approved' }, { overrideCity: activeCity });
    const totalProfessionalsCount = await Professional.countDocuments(profBaseQuery);

    const rawProfCategories = await Professional.aggregate([
      { $match: profBaseQuery },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const professionalCategoryBreakdown = rawProfCategories.map(c => ({
      category: c._id || 'General',
      count: c.count
    }));

    // ── 6. Recent Registrations ──
    const recentRegQuery = applyScopeFilter(req, { role: { $in: ['user', 'member'] }, accountStatus: { $ne: 'deleted' } }, { overrideCity: activeCity });
    const recentRegistrations = await User.find(recentRegQuery)
      .select('name phone email city profession avatar verificationStatus accountStatus createdAt')
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    // ── 7. Community Engagement Real Activity Metrics ──
    const postScope = applyScopeFilter(req, {}, { overrideCity: activeCity });
    const totalCommunityPosts = await Post.countDocuments(postScope);

    // FIX 5: PostLike scoping via community posts IDs
    const communityPosts = await Post.find(postScope).select('_id').lean();
    const communityPostIds = communityPosts.map(p => p._id);
    const totalCommunityLikes = await PostLike.countDocuments({
      postId: { $in: communityPostIds }
    });

    const eventScope = applyScopeFilter(req, {}, { overrideCity: activeCity });
    const totalCommunityEvents = await Event.countDocuments(eventScope);

    // FIX 4: Event RSVPs & Attendance aggregation (Split Confirmed RSVPs vs Interested)
    const communityEvents = await Event.find(eventScope).select('_id').lean();
    const communityEventIds = communityEvents.map(e => e._id);

    const totalEventRSVPs = await EventResponse.countDocuments({
      eventId: { $in: communityEventIds },
      $or: [
        { isGoing: true },
        { registered: true },
        { response: 'Going' }
      ]
    });

    const totalInterestedCount = await EventResponse.countDocuments({
      eventId: { $in: communityEventIds },
      $or: [
        { isInterested: true },
        { response: 'Interested' }
      ]
    });

    // Calculate total funds/donations raised in community
    const contribScope = applyScopeFilter(req, { status: { $ne: 'Failed' } }, { overrideCity: activeCity });
    const rawContribSum = await Contribution.aggregate([
      { $match: contribScope },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } }
    ]);
    const totalFundsRaised = rawContribSum.length > 0 ? rawContribSum[0].total : 0;

    // ── 8. Top Contributors (Top Donors in Community) ──
    const topDonorsRaw = await Contribution.aggregate([
      { $match: contribScope },
      { $group: { _id: '$memberId', totalPaid: { $sum: '$paidAmount' }, txnCount: { $sum: 1 } } },
      { $sort: { totalPaid: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          totalPaid: 1,
          txnCount: 1,
          name: { $ifNull: ['$user.name', 'Community Supporter'] },
          avatar: '$user.avatar',
          city: '$user.city'
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalMembers,
          activeMembersCount,
          inactiveMembersCount,
          pendingMembersCount,
          activeMatrimonialCount,
          upcomingEventsCount,
          totalProfessionalsCount,
          totalCommunityPosts,
          totalCommunityLikes,
          totalCommunityEvents,
          totalEventRSVPs,
          totalInterestedCount,
          totalFundsRaised
        },
        memberGrowthTrend,
        pendingMembersList,
        upcomingEventsList,
        professionalCategoryBreakdown,
        recentRegistrations,
        topContributors: topDonorsRaw
      }
    });

  } catch (error) {
    console.error('Head Dashboard Stats Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch dashboard stats' });
  }
};

/**
 * @desc    Community membership requests by status, with per-status counts (Scoped)
 * @route   GET /api/v1/head/dashboard/members/requests?status=all|pending|approved|rejected&search=
 */
exports.getMemberRequests = async (req, res) => {
  try {
    const status = REQUEST_STATUS_FILTERS[req.query.status] ? req.query.status : 'pending';
    const activeCity = isLocalHeadUser(req.user) ? req.user.city : (req.query.city || null);
    const scopeOptions = { overrideCity: activeCity, includeUnassignedCity: !isLocalHeadUser(req.user) };
    const scoped = (...conditions) => applyScopeFilter(req, { role: { $in: ['user', 'member'] }, $and: conditions }, scopeOptions);

    const conditions = [REQUEST_STATUS_FILTERS[status]];
    const search = String(req.query.search || '').trim().slice(0, 60);
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      conditions.push({ $or: [{ name: rx }, { city: rx }, { phone: rx }, { community: rx }, { subCommunity: rx }] });
    }

    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [requests, pending, approved, rejected] = await Promise.all([
      User.find(scoped(...conditions))
        .select(MEMBER_PROFILE_FIELDS)
        .populate('communityId', 'name')
        .populate('referredBy', 'name phone')
        .populate('membershipReview.by', 'name')
        .sort({ 'membershipReview.at': -1, createdAt: -1 })
        .limit(limit)
        .lean(),
      User.countDocuments(scoped(REQUEST_STATUS_FILTERS.pending)),
      User.countDocuments(scoped(REQUEST_STATUS_FILTERS.approved)),
      User.countDocuments(scoped(REQUEST_STATUS_FILTERS.rejected))
    ]);

    res.status(200).json({
      status: 'success',
      counts: { all: pending + approved + rejected, pending, approved, rejected },
      data: requests
    });
  } catch (error) {
    console.error('Get Member Requests Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to load member requests' });
  }
};

/**
 * @desc    Full profile of one member, for reviewing a verification request (Scoped)
 * @route   GET /api/v1/head/dashboard/members/:id
 */
exports.getMemberProfile = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid member ID format.' });
    }
    const filter = applyScopeFilter(req, { _id: new mongoose.Types.ObjectId(req.params.id) }, { includeUnassignedCity: !isLocalHeadUser(req.user) });
    const member = await User.findOne(filter)
      .select(MEMBER_PROFILE_FIELDS)
      .populate('communityId', 'name')
      .populate('referredBy', 'name phone')
      .populate('membershipReview.by', 'name')
      .lean();
    if (!member) {
      return res.status(404).json({ status: 'fail', message: 'Member not found or not in your community.' });
    }

    // Gallery = photos from the member's own published posts
    const posts = await Post.find({ $or: [{ userId: member._id }, { authorId: member._id }], status: 'published', isDeleted: false })
      .select('images media')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    member.gallery = posts
      .flatMap(p => [...(p.images || []), ...(p.media || []).filter(m => m.type === 'image').map(m => m.url)])
      .filter(Boolean)
      .slice(0, 12);

    res.status(200).json({ status: 'success', data: member });
  } catch (error) {
    console.error('Get Member Profile Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to load member profile' });
  }
};

exports.approveMember = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid member ID format.' });
    }

    const filter = applyScopeFilter(req, { _id: new mongoose.Types.ObjectId(req.params.id) }, { includeUnassignedCity: !isLocalHeadUser(req.user) });
    const user = await User.findOne(filter);
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'Member not found or not in your community.' });
    }

    if (user.verificationStatus !== 'pending' && user.accountStatus !== 'pending verification') {
      return res.status(409).json({ status: 'fail', message: 'This membership request is no longer pending.' });
    }

    user.verificationStatus = 'verified';
    user.accountStatus = 'active';
    user.isAadharVerified = true;
    user.membershipReview = { status: 'approved', by: req.user._id, at: new Date(), note: '' };
    await user.save();

    res.status(200).json({ status: 'success', message: `Approved membership for ${user.name}` });
  } catch (error) {
    console.error('Approve Member Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to approve member' });
  }
};

/**
 * @desc    Reject member account (Scoped & Validated)
 * @route   PATCH /api/v1/head/dashboard/members/:id/reject
 */
exports.rejectMember = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid member ID format.' });
    }

    const filter = applyScopeFilter(req, { _id: new mongoose.Types.ObjectId(req.params.id) }, { includeUnassignedCity: !isLocalHeadUser(req.user) });
    const user = await User.findOne(filter);
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'Member not found or not in your community.' });
    }

    if (user.verificationStatus !== 'pending' && user.accountStatus !== 'pending verification') {
      return res.status(409).json({ status: 'fail', message: 'This membership request is no longer pending.' });
    }

    user.verificationStatus = 'rejected';
    user.accountStatus = 'inactive';
    user.membershipReview = {
      status: 'rejected',
      by: req.user._id,
      at: new Date(),
      note: String(req.body?.note || '').trim().slice(0, 500)
    };
    await user.save();

    res.status(200).json({ status: 'success', message: `Rejected membership for ${user.name}` });
  } catch (error) {
    console.error('Reject Member Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to reject member' });
  }
};

/**
 * @desc    Revoke member verification (Scoped & Validated)
 * @route   PATCH /api/v1/head/dashboard/members/:id/revoke
 */
exports.revokeMember = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid member ID format.' });
    }

    const filter = applyScopeFilter(req, { _id: new mongoose.Types.ObjectId(req.params.id) }, { includeUnassignedCity: !isLocalHeadUser(req.user) });
    const user = await User.findOne(filter);
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'Member not found or not in your community.' });
    }

    user.verificationStatus = 'pending';
    user.accountStatus = 'pending verification';
    user.membershipReview = { status: null, by: null, at: null, note: '' };
    await user.save();

    res.status(200).json({ status: 'success', message: `Revoked verification for ${user.name}` });
  } catch (error) {
    console.error('Revoke Member Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to revoke member' });
  }
};

/**
 * @desc    Update community banner (Scoped to Head's community)
 * @route   PUT /api/v1/head/dashboard/community/banner
 * @access  Private (Head/Admin)
 */
exports.updateCommunityBanner = async (req, res) => {
  try {
    const Community = require('../../models/Community');
    const { bannerUrl } = req.body;

    if (!req.communityId) {
      return res.status(400).json({ status: 'fail', message: 'No community context found for this Head user.' });
    }

    const updatedCommunity = await Community.findByIdAndUpdate(
      req.communityId,
      { $set: { bannerUrl: bannerUrl || '' } },
      { new: true }
    );

    if (!updatedCommunity) {
      return res.status(404).json({ status: 'fail', message: 'Community not found.' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Community banner updated successfully',
      data: {
        bannerUrl: updatedCommunity.bannerUrl
      }
    });
  } catch (error) {
    console.error('Update Community Banner Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update community banner' });
  }
};

// 12. Get Community details (including accountDetails)
exports.getCommunityDetails = async (req, res) => {
  try {
    const communityId = req.communityId || req.user?.communityId;
    if (!communityId) {
      return res.status(400).json({ status: 'error', message: 'Community ID not associated with this head account' });
    }

    const community = await Community.findById(communityId).lean();
    if (!community) {
      return res.status(404).json({ status: 'error', message: 'Community not found' });
    }

    res.status(200).json({ status: 'success', data: community });
  } catch (error) {
    console.error('Get Community Details Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve community details' });
  }
};

// 13. Update Community Account details
exports.updateCommunityAccountDetails = async (req, res) => {
  try {
    const communityId = req.communityId || req.user?.communityId;
    if (!communityId) {
      return res.status(400).json({ status: 'error', message: 'Community ID not associated with this head account' });
    }

    const { bankName, accountNumber, ifscCode, upiId, accountHolderName } = req.body;

    const updatedCommunity = await Community.findByIdAndUpdate(
      communityId,
      {
        $set: {
          accountDetails: {
            bankName: bankName || '',
            accountNumber: accountNumber || '',
            ifscCode: ifscCode || '',
            upiId: upiId || '',
            accountHolderName: accountHolderName || ''
          }
        }
      },
      { new: true }
    );

    if (!updatedCommunity) {
      return res.status(404).json({ status: 'error', message: 'Community not found' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Community account details updated successfully',
      data: updatedCommunity
    });
  } catch (error) {
    console.error('Update Community Account Details Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update community account details' });
  }
};

/**
 * @desc    Bulk actions on community members (verify, reject, suspend, activate, revoke)
 * @route   POST /api/v1/head/dashboard/members/bulk-action
 * @access  Private (Head/Admin)
 */
exports.bulkMemberAction = async (req, res) => {
  try {
    const { memberIds, action } = req.body;
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ status: 'fail', message: 'memberIds array is required.' });
    }
    const allowedActions = ['verify', 'reject', 'suspend', 'activate', 'revoke'];
    if (!allowedActions.includes(action)) {
      return res.status(400).json({ status: 'fail', message: `action must be one of: ${allowedActions.join(', ')}` });
    }

    const validIds = memberIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
    if (validIds.length === 0) {
      return res.status(400).json({ status: 'fail', message: 'No valid member IDs provided.' });
    }

    const filter = applyScopeFilter(req, { _id: { $in: validIds } }, { includeUnassignedCity: !isLocalHeadUser(req.user) });

    let updateFields = {};
    if (action === 'verify') {
      updateFields = { verificationStatus: 'verified', accountStatus: 'active', isAadharVerified: true };
    } else if (action === 'reject') {
      updateFields = { verificationStatus: 'rejected', accountStatus: 'inactive' };
    } else if (action === 'suspend') {
      updateFields = { accountStatus: 'inactive' };
    } else if (action === 'activate') {
      updateFields = { accountStatus: 'active' };
    } else if (action === 'revoke') {
      updateFields = { verificationStatus: 'pending', accountStatus: 'pending verification', membershipReview: { status: null, by: null, at: null, note: '' } };
    }

    // Stamp the decision on members whose request was actually pending (before it changes)
    if (action === 'verify' || action === 'reject') {
      await User.updateMany({ $and: [filter, PENDING_REQUEST] }, {
        $set: { membershipReview: { status: action === 'verify' ? 'approved' : 'rejected', by: req.user._id, at: new Date(), note: '' } }
      });
    }

    const result = await User.updateMany(filter, { $set: updateFields });

    res.status(200).json({
      status: 'success',
      message: `Bulk ${action} applied successfully to ${result.modifiedCount} members.`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk Member Action Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to perform bulk member action' });
  }
};

