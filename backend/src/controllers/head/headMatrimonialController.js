/**
 * headMatrimonialController.js
 * Head panel: community-specific matrimonial management.
 */
const MatrimonialProfile = require('../../models/MatrimonialProfile');
const ProfileReport      = require('../../models/ProfileReport');
const InterestRequest    = require('../../models/InterestRequest');
const UserSubscription   = require('../../models/UserSubscription');
const MarriageRequest    = require('../../models/MarriageRequest');
const { createNotification } = require('../../services/notificationService');

// ─── Community Dashboard (─────────────────────────────────────────────────────────
exports.getCommunityStats = async (req, res) => {
  try {
    const communityId = req.communityId;
    if (!communityId) return res.status(400).json({ status: 'error', message: 'Community ID required.' });

    const now      = new Date();
    const weekAgo  = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1);

    const User = require('../../models/User');
    const communityUserIds = await User.find({ communityId }).distinct('_id');

    const [
      total, active, pending, hidden, connected, verified, married,
      weekly, monthly, recentInterests, pendingMarriageRequests
    ] = await Promise.all([
      MatrimonialProfile.countDocuments({ communityId, isDeleted: false }),
      MatrimonialProfile.countDocuments({ communityId, isDeleted: false, status: 'active' }),
      MatrimonialProfile.countDocuments({ communityId, isDeleted: false, status: 'pending' }),
      MatrimonialProfile.countDocuments({ communityId, isDeleted: false, status: 'hidden' }),
      MatrimonialProfile.countDocuments({ communityId, isDeleted: false, maritalLifecycle: 'connected' }),
      MatrimonialProfile.countDocuments({ communityId, isDeleted: false, verificationStatus: 'verified' }),
      MatrimonialProfile.countDocuments({ communityId, isDeleted: false, status: 'married' }),
      MatrimonialProfile.countDocuments({ communityId, isDeleted: false, createdAt: { $gte: weekAgo } }),
      MatrimonialProfile.countDocuments({ communityId, isDeleted: false, createdAt: { $gte: monthAgo } }),
      InterestRequest.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        $or: [
          { senderId: { $in: communityUserIds } },
          { receiverId: { $in: communityUserIds } }
        ]
      }),
      MarriageRequest.countDocuments({ status: 'pending', requesterId: { $in: communityUserIds } })
    ]);

    res.json({
      status: 'success',
      data: {
        total, active, pending, hidden, connected, verified, married,
        weeklyRegistrations: weekly,
        monthlyRegistrations: monthly,
        recentInterests,
        pendingMarriageRequests
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Get Single Profile by ID ─────────────────────────────────────────────────
exports.getProfileById = async (req, res) => {
  try {
    const communityId = req.communityId;
    const profile = await MatrimonialProfile.findOne({
      _id: req.params.id,
      communityId,
      isDeleted: false
    }).populate('userId', 'name phone email').lean({ virtuals: true });

    if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found in your community.' });
    res.json({ status: 'success', data: { profile } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── List Community Profiles ──────────────────────────────────────────────────

exports.listCommunityProfiles = async (req, res) => {
  try {
    const { page = 1, limit = 20, verificationStatus, status } = req.query;
    const query = { communityId: req.communityId, isDeleted: false };
    if (verificationStatus) query.verificationStatus = verificationStatus;
    if (status) query.status = status;

    const total = await MatrimonialProfile.countDocuments(query);
    const profiles = await MatrimonialProfile.find(query)
      .populate('userId', 'name phone')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean({ virtuals: true });

    res.json({ status: 'success', data: { profiles, total, page: Number(page) } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Verify Profile (Community-scoped) ───────────────────────────────────────────────────
exports.verifyProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Status must be verified or rejected.' });
    }

    const profile = await MatrimonialProfile.findOne({ _id: id, communityId: req.communityId });
    if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found in your community.' });

    profile.verificationStatus = status;
    // verified → active (searchable), rejected → hidden (not deleted, user can fix)
    if (status === 'verified') {
      profile.status = 'active';
    } else {
      profile.status = 'hidden';
    }
    profile.verifiedBy = req.user._id;
    profile.verifiedAt = new Date();
    await profile.save();

    await createNotification({
      userId:   profile.userId,
      module:   'matrimonial',
      type:     `matrimonial_profile_${status}`,
      title:    status === 'verified' ? 'Profile Verified! ✅' : 'Verification Rejected',
      message:  status === 'verified'
        ? 'Your matrimonial profile has been verified by your community head and is now visible in search results.'
        : `Your profile verification was rejected. ${adminNote || 'Please update your profile and resubmit.'}`,
      icon:     status === 'verified' ? '✅' : '❌',
      priority: 'high',
      actionUrl:'/member/matrimonial/profile'
    });

    res.json({ status: 'success', message: `Profile ${status}.` });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Connected Members ────────────────────────────────────────────────────────────
exports.getConnectedMembers = async (req, res) => {
  try {
    const communityId = req.communityId;
    const { page = 1, limit = 20 } = req.query;

    const total    = await MatrimonialProfile.countDocuments({ communityId, isDeleted: false, maritalLifecycle: 'connected' });
    const profiles = await MatrimonialProfile.find({ communityId, isDeleted: false, maritalLifecycle: 'connected' })
      .populate('userId', 'name phone')
      .sort({ updatedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean({ virtuals: true });

    res.json({ status: 'success', data: { profiles, total, page: Number(page) } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Pending Profiles ─────────────────────────────────────────────────────────────
exports.getPendingProfiles = async (req, res) => {
  try {
    const communityId = req.communityId;
    const { page = 1, limit = 20 } = req.query;

    const total    = await MatrimonialProfile.countDocuments({ communityId, isDeleted: false, status: 'pending' });
    const profiles = await MatrimonialProfile.find({ communityId, isDeleted: false, status: 'pending' })
      .populate('userId', 'name phone email')
      .sort({ createdAt: 1 }) // Oldest first (FIFO verification queue)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean({ virtuals: true });

    res.json({ status: 'success', data: { profiles, total, page: Number(page) } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Community Reports ────────────────────────────────────────────────────────
exports.listCommunityReports = async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;

    // Get community user IDs first
    const User = require('../../models/User');
    const communityUsers = await User.find({ communityId: req.communityId }).distinct('_id');
    query.reportedUserId = { $in: communityUsers };

    const total = await ProfileReport.countDocuments(query);
    const reports = await ProfileReport.find(query)
      .populate('reporterId', 'name phone email avatar')
      .populate('reportedUserId', 'name phone email avatar city gotra')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    res.json({ status: 'success', data: { reports, total, page: Number(page) } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Update Profile Status (Community-scoped) ─────────────────────────────────
exports.updateProfileStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active' | 'hidden' | 'suspended'

    const allowedStatuses = ['active', 'hidden', 'suspended'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ status: 'error', message: `Status must be one of: ${allowedStatuses.join(', ')}` });
    }

    const profile = await MatrimonialProfile.findOne({ _id: id, communityId: req.communityId });
    if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found in your community.' });

    profile.status = status;
    await profile.save();

    res.json({ status: 'success', message: `Profile status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Resolve Report (Community-scoped) ───────────────────────────────────────
exports.resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminNotes, suspendUser } = req.body; // 'actioned' | 'dismissed'

    const User = require('../../models/User');
    const communityUsers = await User.find({ communityId: req.communityId }).distinct('_id');

    const report = await ProfileReport.findOne({ _id: id, reportedUserId: { $in: communityUsers } });
    if (!report) return res.status(404).json({ status: 'error', message: 'Report not found in your community.' });

    const allowedActions = ['actioned', 'dismissed'];
    if (!allowedActions.includes(action)) {
      return res.status(400).json({ status: 'error', message: 'Action must be actioned or dismissed.' });
    }

    report.status     = action;
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    if (adminNotes) report.adminNotes = adminNotes;
    await report.save();

    // If head actioned report and chose to suspend profile
    if (suspendUser && action === 'actioned') {
      await MatrimonialProfile.findOneAndUpdate(
        { userId: report.reportedUserId, communityId: req.communityId },
        { status: 'suspended' }
      );
    }

    res.json({ status: 'success', message: `Report ${action} successfully.` });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Married Members (Community-scoped) ──────────────────────────────────────
exports.getMarriedMembers = async (req, res) => {
  try {
    const communityId = req.communityId;
    const { page = 1, limit = 50 } = req.query;

    const total    = await MatrimonialProfile.countDocuments({ communityId, isDeleted: false, status: 'married' });
    const profiles = await MatrimonialProfile.find({ communityId, isDeleted: false, status: 'married' })
      .populate('userId', 'name phone email avatar city')
      .populate('marriageConfirmedWith', 'name phone email avatar city')
      .sort({ closedAt: -1, updatedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean({ virtuals: true });

    res.json({ status: 'success', data: { profiles, total, page: Number(page) } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Community Marriage Requests ──────────────────────────────────────────────
exports.getCommunityMarriageRequests = async (req, res) => {
  try {
    const communityId = req.communityId;
    const { page = 1, limit = 50, status } = req.query;

    const User = require('../../models/User');
    const communityUserIds = await User.find({ communityId }).distinct('_id');

    const query = {
      $or: [
        { requesterId: { $in: communityUserIds } },
        { receiverId: { $in: communityUserIds } }
      ]
    };
    if (status && status !== 'all') query.status = status;

    const total = await MarriageRequest.countDocuments(query);
    const requests = await MarriageRequest.find(query)
      .populate('requesterId', 'name phone email avatar city gotra')
      .populate('receiverId', 'name phone email avatar city gotra')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    res.json({ status: 'success', data: { requests, total, page: Number(page) } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

