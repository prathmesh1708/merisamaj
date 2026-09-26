const Referral = require('../../models/Referral');
const ReferralConfig = require('../../models/ReferralConfig');
const User = require('../../models/User');
const referralService = require('../../services/referralService');

/**
 * Get platform-wide referral events list with filters and pagination
 */
exports.getAllReferrals = async (req, res) => {
  try {
    const { eventType, search, startDate, endDate, page = 1, limit = 50 } = req.query;

    const filter = {};

    if (eventType && eventType !== 'ALL') {
      filter.eventType = eventType;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Search filter: if searching by user name or phone
    if (search && search.trim()) {
      const q = search.trim();
      const matchedUsers = await User.find({
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { phone: { $regex: q, $options: 'i' } },
          { referralCode: { $regex: q, $options: 'i' } }
        ]
      }).select('_id').lean();

      const userIds = matchedUsers.map(u => u._id);
      filter.$or = [
        { referrer: { $in: userIds } },
        { referredUser: { $in: userIds } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Referral.countDocuments(filter);

    const referrals = await Referral.find(filter)
      .populate('referrer', 'name phone avatar referralCode')
      .populate('referredUser', 'name phone avatar referralCode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.status(200).json({
      success: true,
      status: 'success',
      data: referrals,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Admin Get All Referrals Error:', error);
    res.status(500).json({ success: false, status: 'error', message: error.message });
  }
};

/**
 * Get platform-wide referral system statistics
 */
exports.getReferralStats = async (req, res) => {
  try {
    const config = await referralService.getOrCreateConfig();

    const totalReferrals = await Referral.countDocuments({});
    
    // Aggregation for total points awarded platform-wide
    const totalPointsAgg = await Referral.aggregate([
      { $group: { _id: null, totalPoints: { $sum: '$pointsAwarded' } } }
    ]);
    const totalPointsAwarded = totalPointsAgg.length > 0 ? totalPointsAgg[0].totalPoints : 0;

    // Breakdown per event type
    const eventBreakdownAgg = await Referral.aggregate([
      { $group: { _id: '$eventType', count: { $sum: 1 }, points: { $sum: '$pointsAwarded' } } }
    ]);

    const breakdown = {
      REGISTRATION: { count: 0, points: 0 },
      SUBSCRIPTION: { count: 0, points: 0 },
      MEMBERSHIP: { count: 0, points: 0 },
      DONATION: { count: 0, points: 0 }
    };

    eventBreakdownAgg.forEach(item => {
      if (breakdown[item._id]) {
        breakdown[item._id] = { count: item.count, points: item.points };
      }
    });

    // Top 5 referrers platform-wide
    const topReferrers = await User.find({ totalPointsEarned: { $gt: 0 } })
      .select('name phone avatar totalPointsEarned pointsBalance referralCode')
      .sort({ totalPointsEarned: -1 })
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      status: 'success',
      data: {
        isActive: config.isActive,
        totalReferrals,
        totalPointsAwarded,
        breakdown,
        topReferrers
      }
    });
  } catch (error) {
    console.error('Admin Get Referral Stats Error:', error);
    res.status(500).json({ success: false, status: 'error', message: error.message });
  }
};

/**
 * Get current referral configuration
 */
exports.getReferralConfig = async (req, res) => {
  try {
    const config = await referralService.getOrCreateConfig();
    res.status(200).json({
      success: true,
      status: 'success',
      data: config
    });
  } catch (error) {
    console.error('Admin Get Referral Config Error:', error);
    res.status(500).json({ success: false, status: 'error', message: error.message });
  }
};

/**
 * Update referral configuration settings
 */
exports.updateReferralConfig = async (req, res) => {
  try {
    const {
      registrationReferrerPoints,
      registrationReferredPoints,
      subscriptionPoints,
      membershipPoints,
      donationPoints,
      isActive
    } = req.body;

    let config = await referralService.getOrCreateConfig();

    if (registrationReferrerPoints !== undefined) config.registrationReferrerPoints = Number(registrationReferrerPoints);
    if (registrationReferredPoints !== undefined) config.registrationReferredPoints = Number(registrationReferredPoints);
    if (subscriptionPoints !== undefined) config.subscriptionPoints = Number(subscriptionPoints);
    if (membershipPoints !== undefined) config.membershipPoints = Number(membershipPoints);
    if (donationPoints !== undefined) config.donationPoints = Number(donationPoints);
    if (isActive !== undefined) config.isActive = Boolean(isActive);

    await config.save();

    res.status(200).json({
      success: true,
      status: 'success',
      message: 'Referral configuration updated successfully.',
      data: config
    });
  } catch (error) {
    console.error('Admin Update Referral Config Error:', error);
    res.status(500).json({ success: false, status: 'error', message: error.message });
  }
};
