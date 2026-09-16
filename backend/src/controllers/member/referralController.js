const User = require('../../models/User');
const Referral = require('../../models/Referral');
const referralService = require('../../services/referralService');

/**
 * Get current user's referral info and balance
 */
exports.getMyReferralInfo = async (req, res) => {
  try {
    let user = await User.findById(req.user._id).select('referralCode pointsBalance totalPointsEarned name avatar').lean();
    if (!user) {
      return res.status(404).json({ success: false, status: 'error', message: 'User not found' });
    }

    // Safety net: assign unique referral code if user doesn't have one
    if (!user.referralCode) {
      const newCode = await referralService.generateUniqueReferralCode();
      await User.findByIdAndUpdate(req.user._id, { referralCode: newCode });
      user.referralCode = newCode;
    }

    const shareLink = `https://app.merisamaj.com/register?ref=${user.referralCode}`;

    // Aggregates for stats
    const totalReferrals = await User.countDocuments({ referredBy: req.user._id });
    
    // Count per event type
    const eventCounts = await Referral.aggregate([
      { $match: { referrer: req.user._id } },
      { $group: { _id: '$eventType', count: { $sum: 1 }, points: { $sum: '$pointsAwarded' } } }
    ]);

    const eventBreakdown = {
      REGISTRATION: { count: 0, points: 0 },
      SUBSCRIPTION: { count: 0, points: 0 },
      MEMBERSHIP: { count: 0, points: 0 },
      DONATION: { count: 0, points: 0 }
    };

    eventCounts.forEach(item => {
      if (eventBreakdown[item._id]) {
        eventBreakdown[item._id] = { count: item.count, points: item.points };
      }
    });

    res.status(200).json({
      success: true,
      status: 'success',
      data: {
        referralCode: user.referralCode,
        pointsBalance: user.pointsBalance || 0,
        totalPointsEarned: user.totalPointsEarned || 0,
        totalReferrals,
        eventBreakdown,
        shareLink
      }
    });
  } catch (error) {
    console.error('Get My Referral Info Error:', error);
    res.status(500).json({ success: false, status: 'error', message: error.message });
  }
};

/**
 * Get user's referral event history (all 4 event types)
 */
exports.getMyReferralHistory = async (req, res) => {
  try {
    const history = await Referral.find({ referrer: req.user._id })
      .populate('referredUser', 'name avatar phone createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const formattedHistory = history.map(item => ({
      id: item._id,
      _id: item._id,
      eventType: item.eventType,
      pointsAwarded: item.pointsAwarded,
      points: item.pointsAwarded,
      createdAt: item.createdAt,
      date: item.createdAt,
      referredUser: item.referredUser ? {
        id: item.referredUser._id,
        name: item.referredUser.name || 'Member',
        avatar: item.referredUser.avatar || null
      } : { name: 'Member', avatar: null }
    }));

    res.status(200).json({
      success: true,
      status: 'success',
      data: formattedHistory
    });
  } catch (error) {
    console.error('Get My Referral History Error:', error);
    res.status(500).json({ success: false, status: 'error', message: error.message });
  }
};

/**
 * Get list of members directly referred by current user
 */
exports.getMyReferredUsers = async (req, res) => {
  try {
    const users = await User.find({ referredBy: req.user._id })
      .select('name avatar phone createdAt pointsBalance')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = users.map(u => ({
      id: u._id,
      name: u.name,
      avatar: u.avatar || null,
      joinedAt: u.createdAt
    }));

    res.status(200).json({
      success: true,
      status: 'success',
      data: formatted
    });
  } catch (error) {
    console.error('Get My Referred Users Error:', error);
    res.status(500).json({ success: false, status: 'error', message: error.message });
  }
};

/**
 * Get top referrers leaderboard
 */
exports.getLeaderboard = async (req, res) => {
  try {
    const topUsers = await User.find({ totalPointsEarned: { $gt: 0 } })
      .select('name avatar totalPointsEarned pointsBalance')
      .sort({ totalPointsEarned: -1 })
      .limit(10)
      .lean();

    const formattedLeaderboard = topUsers.map((u, idx) => ({
      rank: idx + 1,
      id: u._id,
      name: u.name,
      avatar: u.avatar || null,
      points: u.totalPointsEarned || 0
    }));

    res.status(200).json({
      success: true,
      status: 'success',
      data: formattedLeaderboard
    });
  } catch (error) {
    console.error('Get Leaderboard Error:', error);
    res.status(500).json({ success: false, status: 'error', message: error.message });
  }
};

/**
 * Validate a referral code during checkout/signup
 */
exports.validateReferralCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ success: false, valid: false, message: 'Referral code is required.' });
    }

    const cleanCode = code.trim();
    const user = await User.findOne({
      $or: [{ referralCode: cleanCode }, { phone: cleanCode }]
    }).select('name referralCode').lean();

    if (!user) {
      return res.status(404).json({ success: false, valid: false, message: 'Invalid referral code.' });
    }

    if (user._id.toString() === req.user?._id?.toString()) {
      return res.status(400).json({ success: false, valid: false, message: 'You cannot use your own referral code.' });
    }

    res.status(200).json({
      success: true,
      valid: true,
      message: `Code Applied! Referred by ${user.name}.`,
      data: {
        code: user.referralCode || cleanCode,
        referrerName: user.name
      }
    });
  } catch (error) {
    console.error('Validate Referral Code Error:', error);
    res.status(500).json({ success: false, valid: false, message: error.message });
  }
};
