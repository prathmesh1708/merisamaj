const User = require('../../models/User');
const Referral = require('../../models/Referral');
const RedemptionRequest = require('../../models/RedemptionRequest');
const referralService = require('../../services/referralService');

// Public link that opens registration with the code filled in
const shareLinkFor = (req, code) => {
  const base = (process.env.CLIENT_URL || '').split(',')[0].trim()
    || req.get('origin')
    || 'https://apnisamaj.com';
  return `${base.replace(/\/$/, '')}/member/register?ref=${encodeURIComponent(code)}`;
};

const OPEN_STATUSES = ['pending', 'approved'];

/**
 * Get current user's referral info and balance
 */
exports.getMyReferralInfo = async (req, res) => {
  try {
    let user = await User.findById(req.user._id).select('referralCode pointsBalance pointsRedeemed name avatar createdAt').lean();
    if (!user) {
      return res.status(404).json({ success: false, status: 'error', message: 'User not found' });
    }

    // Safety net: own code if missing, or if an older account owns the same code
    const owner = user.referralCode ? await referralService.findCodeOwner(user.referralCode) : null;
    if (!user.referralCode || (owner && String(owner._id) !== String(user._id))) {
      const newCode = await referralService.generateUniqueReferralCode();
      await User.findByIdAndUpdate(req.user._id, { referralCode: newCode });
      user.referralCode = newCode;
    }

    const totalReferrals = await User.countDocuments({ referredBy: req.user._id });

    // Everything credited to me (incl. my welcome bonus), per event type
    const eventCounts = await Referral.aggregate([
      { $match: { referrer: req.user._id } },
      { $group: { _id: '$eventType', count: { $sum: { $cond: [{ $ne: ['$referrer', '$referredUser'] }, 1, 0] } }, points: { $sum: '$pointsAwarded' } } }
    ]);

    const eventBreakdown = {
      REGISTRATION: { count: 0, points: 0 },
      SUBSCRIPTION: { count: 0, points: 0 },
      MEMBERSHIP: { count: 0, points: 0 },
      DONATION: { count: 0, points: 0 }
    };
    let totalPointsEarned = 0;
    eventCounts.forEach(item => {
      totalPointsEarned += item.points;
      if (eventBreakdown[item._id]) {
        eventBreakdown[item._id] = { count: item.count, points: item.points };
      }
    });

    // Last 6 months of points earned, for the dashboard chart
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5, 1);
    sixMonthsAgo.setHours(0, 0, 0, 0);
    const monthly = await Referral.aggregate([
      { $match: { referrer: req.user._id, createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, points: { $sum: '$pointsAwarded' } } }
    ]);
    const earningsOverview = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1);
      const row = monthly.find(r => r._id.y === d.getFullYear() && r._id.m === d.getMonth() + 1);
      earningsOverview.push({ month: d.toLocaleString('en-IN', { month: 'short' }), value: row?.points || 0 });
    }

    const pendingAgg = await RedemptionRequest.aggregate([
      { $match: { user: req.user._id, status: { $in: OPEN_STATUSES } } },
      { $group: { _id: null, points: { $sum: '$points' } } }
    ]);

    res.status(200).json({
      success: true,
      status: 'success',
      data: {
        referralCode: user.referralCode,
        pointsBalance: user.pointsBalance || 0,
        totalPointsEarned,
        pointsRedeemed: user.pointsRedeemed || 0,
        pendingRedemptionPoints: pendingAgg[0]?.points || 0,
        totalReferrals,
        eventBreakdown,
        earningsOverview,
        shareLink: shareLinkFor(req, user.referralCode)
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
      isWelcomeBonus: String(item.referrer) === String(item.referredUser?._id || item.referredUser),
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
    const top = await referralService.topReferrers({ limit: 10 });
    res.status(200).json({
      success: true,
      status: 'success',
      data: top.map((u, idx) => ({
        rank: idx + 1,
        id: u._id,
        name: u.name,
        avatar: u.avatar,
        points: u.totalPointsEarned
      }))
    });
  } catch (error) {
    console.error('Get Leaderboard Error:', error);
    res.status(500).json({ success: false, status: 'error', message: error.message });
  }
};

/**
 * Validate a referral code — public (used on the register screen before login)
 */
exports.validateReferralCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ success: false, valid: false, message: 'Referral code is required.' });
    }

    const user = await referralService.findCodeOwner(code);
    if (!user) {
      return res.status(404).json({ success: false, valid: false, message: 'Invalid referral code.' });
    }

    if (req.user && user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, valid: false, message: 'You cannot use your own referral code.' });
    }

    res.status(200).json({
      success: true,
      valid: true,
      message: `Code Applied! Referred by ${user.name}.`,
      data: {
        code: user.referralCode || code.trim(),
        referrerName: user.name
      }
    });
  } catch (error) {
    console.error('Validate Referral Code Error:', error);
    res.status(500).json({ success: false, valid: false, message: error.message });
  }
};

// ─── Cash redemption ─────────────────────────────────────────────────────────

/**
 * Rate, minimum, my balance and the payout details I used last time
 */
exports.getRedeemInfo = async (req, res) => {
  try {
    const config = await referralService.getOrCreateConfig();
    const user = await User.findById(req.user._id).select('pointsBalance pointsRedeemed name').lean();
    const last = await RedemptionRequest.findOne({ user: req.user._id }).sort({ createdAt: -1 })
      .select('method accountHolderName upiId bankName accountNumber ifscCode').lean();
    const hasOpenRequest = await RedemptionRequest.exists({ user: req.user._id, status: { $in: OPEN_STATUSES } });

    res.json({
      success: true,
      data: {
        redemptionEnabled: config.redemptionEnabled !== false,
        rupeesPerPoint: config.rupeesPerPoint ?? 1,
        minRedeemPoints: config.minRedeemPoints ?? 500,
        pointsBalance: user?.pointsBalance || 0,
        pointsRedeemed: user?.pointsRedeemed || 0,
        hasOpenRequest: !!hasOpenRequest,
        lastPayoutDetails: last || { accountHolderName: user?.name || '' }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Ask to cash out points. Points leave the balance now (held), and come back if
 * the admin rejects the request or the member cancels it.
 */
exports.createRedemption = async (req, res) => {
  try {
    const config = await referralService.getOrCreateConfig();
    if (config.redemptionEnabled === false) {
      return res.status(400).json({ success: false, message: 'Point redemption is currently paused. Please try again later.' });
    }

    const points = Math.floor(Number(req.body.points));
    const method = String(req.body.method || '').toUpperCase() === 'BANK' ? 'BANK' : 'UPI';
    const minPoints = config.minRedeemPoints ?? 500;
    const rate = config.rupeesPerPoint ?? 1;
    const details = {
      accountHolderName: String(req.body.accountHolderName || '').trim(),
      upiId: String(req.body.upiId || '').trim(),
      bankName: String(req.body.bankName || '').trim(),
      accountNumber: String(req.body.accountNumber || '').replace(/\s/g, ''),
      ifscCode: String(req.body.ifscCode || '').trim().toUpperCase()
    };

    if (!Number.isFinite(points) || points < minPoints) {
      return res.status(400).json({ success: false, message: `Minimum ${minPoints} points can be redeemed.` });
    }
    if (!details.accountHolderName) {
      return res.status(400).json({ success: false, message: 'Please enter the account holder name.' });
    }
    if (method === 'UPI' && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(details.upiId)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid UPI ID (e.g. name@okaxis).' });
    }
    if (method === 'BANK') {
      if (!/^\d{9,18}$/.test(details.accountNumber)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid bank account number.' });
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(details.ifscCode)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid IFSC code (e.g. SBIN0001234).' });
      }
    }
    // One open request at a time keeps the admin queue simple
    if (await RedemptionRequest.exists({ user: req.user._id, status: { $in: OPEN_STATUSES } })) {
      return res.status(400).json({ success: false, message: 'You already have a redemption request in progress. Please wait for it to be processed.' });
    }

    // Take the points only if the balance still covers them (atomic — no double spend)
    const held = await User.findOneAndUpdate(
      { _id: req.user._id, pointsBalance: { $gte: points } },
      { $inc: { pointsBalance: -points } },
      { new: true }
    );
    if (!held) {
      return res.status(400).json({ success: false, message: 'You do not have enough points.' });
    }

    let request;
    try {
      request = await RedemptionRequest.create({
        user: req.user._id,
        points,
        amount: Math.round(points * rate * 100) / 100,
        rupeesPerPoint: rate,
        method,
        ...details,
        upiId: method === 'UPI' ? details.upiId : '',
        bankName: method === 'BANK' ? details.bankName : '',
        accountNumber: method === 'BANK' ? details.accountNumber : '',
        ifscCode: method === 'BANK' ? details.ifscCode : '',
        history: [{ status: 'pending', note: 'Requested by member', by: req.user._id }]
      });
    } catch (err) {
      await User.updateOne({ _id: req.user._id }, { $inc: { pointsBalance: points } }); // give back
      throw err;
    }

    res.status(201).json({
      success: true,
      message: `Request sent! ₹${request.amount} will be paid to you after admin verification.`,
      data: request
    });
  } catch (error) {
    console.error('Create Redemption Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyRedemptions = async (req, res) => {
  try {
    const list = await RedemptionRequest.find({ user: req.user._id })
      .select('-history.by -processedBy')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Member cancels their own request while it is still pending → points come back
 */
exports.cancelRedemption = async (req, res) => {
  try {
    const request = await RedemptionRequest.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, status: 'pending' },
      { status: 'cancelled', $push: { history: { status: 'cancelled', note: 'Cancelled by member', by: req.user._id } } },
      { new: true }
    );
    if (!request) {
      return res.status(400).json({ success: false, message: 'Only a pending request can be cancelled.' });
    }
    await User.updateOne({ _id: req.user._id }, { $inc: { pointsBalance: request.points } });
    res.json({ success: true, message: 'Request cancelled. Points returned to your balance.', data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
