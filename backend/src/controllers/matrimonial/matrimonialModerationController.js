/**
 * matrimonialModerationController.js
 * Handles: Shortlist, Visitors, Block/Unblock, Report
 */
const Shortlist       = require('../../models/Shortlist');
const ProfileVisitor  = require('../../models/ProfileVisitor');
const UserBlock       = require('../../models/UserBlock');
const ProfileReport   = require('../../models/ProfileReport');
const MatrimonialProfile = require('../../models/MatrimonialProfile');
const { buildProfileForViewer, connectedUserIds, visibleNameOf } = require('../../middleware/matrimonialPrivacy');
const { ensureBlurredPhotos } = require('../../services/matrimonialPhotoBlur');
const { getEffectiveFeatures } = require('../../middleware/subscriptionMiddleware');

// Profiles as this viewer may see them (full once connected, restricted otherwise;
// photos blurred unless the viewer's plan includes photo access)
const presentProfiles = async (viewerId, profiles) => {
  const list = profiles.filter(Boolean);
  const [connected, { features }] = await Promise.all([
    connectedUserIds(viewerId, list.map(p => p.userId?._id || p.userId)),
    getEffectiveFeatures(viewerId)
  ]);
  const canViewPhotos = !!features?.viewProfilePhotos;
  const isConnected = (p) => connected.has(String(p.userId?._id || p.userId));
  await ensureBlurredPhotos(list.filter(p => !isConnected(p)), { includePublic: !canViewPhotos });
  return new Map(list.map(p => [String(p._id), buildProfileForViewer(p, { isConnected: isConnected(p), canViewPhotos })]));
};

// The block/report target: an account id, or a matrimonial profile id (restricted
// profiles don't carry the account id)
const resolveUserId = async ({ userId, profileId }) => {
  if (profileId) {
    const p = await MatrimonialProfile.findById(profileId).select('userId').lean();
    if (p) return p.userId;
  }
  if (userId) {
    const p = await MatrimonialProfile.findById(userId).select('userId').lean().catch(() => null);
    return p ? p.userId : userId;
  }
  return null;
};

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
      .populate({ path: 'profileId', populate: { path: 'userId', select: 'name avatar verificationStatus isAadharVerified' } })
      .lean({ virtuals: true });
    const shown = await presentProfiles(req.user._id, items.map(i => i.profileId));
    const safeItems = items.map(i => ({ ...i, profileId: i.profileId ? shown.get(String(i.profileId._id)) : null }));
    res.json({ status: 'success', data: { items: safeItems, total, page: Number(page) } });
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

    // Enrich each visitor with their matrimonial profile, as this member may see it
    const visitorProfiles = await MatrimonialProfile.find({
      userId: { $in: visitors.map(v => v.visitorId?._id || v.visitorId).filter(Boolean) },
      isDeleted: false
    }).lean({ virtuals: true });
    const shown = await presentProfiles(req.user._id, visitorProfiles);
    const profileByUser = new Map(visitorProfiles.map(p => [String(p.userId), p]));
    const enriched = visitors.map(v => {
      const raw = profileByUser.get(String(v.visitorId?._id || v.visitorId));
      const visitorProfile = raw ? shown.get(String(raw._id)) : null;
      const out = { ...v, visitorProfile };
      if (visitorProfile?.isRestricted) {
        out.visitorId = { name: visibleNameOf(raw) || 'Member', avatar: visitorProfile.photos?.[0]?.url || null };
      }
      return out;
    });

    res.json({ status: 'success', data: { visitors: enriched, total, page: Number(page) } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Profiles I Visited ───────────────────────────────────────────────────────
// My own viewing history (not a plan feature), each profile as I'm allowed to see it now.
exports.getMyVisited = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const visits = await ProfileVisitor.find({ visitorId: req.user._id })
      .sort({ lastVisited: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();
    const profiles = await MatrimonialProfile.find({
      _id: { $in: visits.map(v => v.profileId) }, status: 'active', isDeleted: false
    }).populate('userId', 'name avatar verificationStatus isAadharVerified').lean({ virtuals: true });
    const shown = await presentProfiles(req.user._id, profiles);
    const visited = visits
      .filter(v => shown.has(String(v.profileId)))
      .map(v => ({ _id: v._id, lastVisited: v.lastVisited, visitCount: v.visitCount, profile: shown.get(String(v.profileId)) }));
    const total = await ProfileVisitor.countDocuments({ visitorId: req.user._id });
    res.json({ status: 'success', data: { visited, total, page: Number(page) } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Block User ───────────────────────────────────────────────────────────────
exports.blockUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const blockedUserId = await resolveUserId(req.body);
    if (!blockedUserId) return res.status(400).json({ status: 'error', message: 'userId or profileId is required.' });
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
    const blockedUserId = await resolveUserId({ userId: req.params.userId });
    await UserBlock.findOneAndDelete({ userId: req.user._id, blockedUserId });
    res.json({ status: 'success', message: 'User unblocked.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.getBlockedUsers = async (req, res) => {
  try {
    const blocks = await UserBlock.find({ userId: req.user._id })
      .populate('blockedUserId', 'name avatar')
      .lean();
    // Their name/photo only as their privacy settings allow (blocked = never connected now)
    const theirProfiles = await MatrimonialProfile.find({
      userId: { $in: blocks.map(b => b.blockedUserId?._id).filter(Boolean) }, isDeleted: false
    }).lean({ virtuals: true });
    const shown = await presentProfiles(req.user._id, theirProfiles);
    const profileByUser = new Map(theirProfiles.map(p => [String(p.userId), p]));
    const blockedUsers = blocks.map(b => {
      const raw = b.blockedUserId && profileByUser.get(String(b.blockedUserId._id));
      if (!raw) return b;
      const view = shown.get(String(raw._id));
      if (!view?.isRestricted) return b;
      return { ...b, blockedUserId: { _id: b.blockedUserId._id, name: visibleNameOf(raw) || 'Member', avatar: view.photos?.[0]?.url || null } };
    });
    // Response key is 'blockedUsers' to match frontend MatrimonialContext contract
    res.json({ status: 'success', data: { blockedUsers } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Report Profile ───────────────────────────────────────────────────────────
exports.reportProfile = async (req, res) => {
  try {
    const { reason, description } = req.body;
    const reportedUserId = await resolveUserId({ userId: req.body.reportedUserId, profileId: req.body.profileId });
    if (!reportedUserId) return res.status(400).json({ status: 'error', message: 'reportedUserId or profileId is required.' });
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
