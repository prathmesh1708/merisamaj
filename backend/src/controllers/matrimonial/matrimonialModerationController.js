/**
 * matrimonialModerationController.js
 * Handles: Shortlist, Visitors, Block/Unblock, Report
 */
const Shortlist       = require('../../models/Shortlist');
const ProfileVisitor  = require('../../models/ProfileVisitor');
const UserBlock       = require('../../models/UserBlock');
const ProfileReport   = require('../../models/ProfileReport');
const MatrimonialProfile = require('../../models/MatrimonialProfile');

// ─── Shortlist ────────────────────────────────────────────────────────────────
exports.addToShortlist = async (req, res) => {
  try {
    const { profileId, notes } = req.body;
    const profile = await MatrimonialProfile.findOne({ _id: profileId, status: 'active', isDeleted: false });
    if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found.' });

    const item = await Shortlist.findOneAndUpdate(
      { userId: req.user._id, profileId },
      { notes },
      { upsert: true, new: true }
    );
    res.json({ status: 'success', message: 'Added to shortlist.', data: { shortlist: item } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.removeFromShortlist = async (req, res) => {
  try {
    const { profileId } = req.params;
    await Shortlist.findOneAndDelete({ userId: req.user._id, profileId });
    res.json({ status: 'success', message: 'Removed from shortlist.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.getShortlist = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const total = await Shortlist.countDocuments({ userId: req.user._id });
    const items = await Shortlist.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('profileId');
    res.json({ status: 'success', data: { items, total, page: Number(page) } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Visitors (Premium Only) ─────────────────────────────────────────────────
exports.getMyVisitors = async (req, res) => {
  try {
    const myProfile = await MatrimonialProfile.findOne({ userId: req.user._id, isDeleted: false });
    if (!myProfile) return res.status(404).json({ status: 'error', message: 'No matrimonial profile found.' });

    // Populate visitorId as 'visitorProfile' — matches MatrimonialContext normalizer:
    // v.visitorProfile?.personal?.fullName, v.visitorProfile?.photos, etc.
    const { page = 1, limit = 20 } = req.query;
    const total = await ProfileVisitor.countDocuments({ profileId: myProfile._id });
    const visitors = await ProfileVisitor.find({ profileId: myProfile._id })
      .sort({ lastVisited: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate({
        path: 'visitorId',
        select: 'name avatar',
      })
      .lean();

    // Enrich each visitor with their matrimonial profile data
    const enriched = await Promise.all(visitors.map(async v => {
      const visitorMatrimonialProfile = await MatrimonialProfile.findOne({
        userId: v.visitorId?._id || v.visitorId,
        isDeleted: false
      }).select('personal location education photos age').lean();
      return {
        ...v,
        visitorProfile: visitorMatrimonialProfile || null,
      };
    }));

    res.json({ status: 'success', data: { visitors: enriched, total, page: Number(page) } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Block User ───────────────────────────────────────────────────────────────
exports.blockUser = async (req, res) => {
  try {
    const { userId: blockedUserId, reason } = req.body;
    if (req.user._id.equals(blockedUserId)) {
      return res.status(400).json({ status: 'error', message: 'You cannot block yourself.' });
    }
    await UserBlock.findOneAndUpdate(
      { userId: req.user._id, blockedUserId },
      { reason },
      { upsert: true, new: true }
    );
    res.json({ status: 'success', message: 'User blocked successfully.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const { userId: blockedUserId } = req.params;
    await UserBlock.findOneAndDelete({ userId: req.user._id, blockedUserId });
    res.json({ status: 'success', message: 'User unblocked.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.getBlockedUsers = async (req, res) => {
  try {
    const blockedUsers = await UserBlock.find({ userId: req.user._id })
      .populate('blockedUserId', 'name avatar');
    // Response key is 'blockedUsers' to match frontend MatrimonialContext contract
    res.json({ status: 'success', data: { blockedUsers } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Report Profile ───────────────────────────────────────────────────────────
exports.reportProfile = async (req, res) => {
  try {
    const { reportedUserId, reason, description } = req.body;
    if (req.user._id.equals(reportedUserId)) {
      return res.status(400).json({ status: 'error', message: 'You cannot report yourself.' });
    }
    const report = await ProfileReport.create({
      reporterId:   req.user._id,
      reportedUserId,
      reason,
      description,
      status: 'pending'
    });
    res.status(201).json({ status: 'success', message: 'Report submitted. Our team will review it.', data: { report } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
