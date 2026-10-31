const Referral = require('../../models/Referral');
const RedemptionRequest = require('../../models/RedemptionRequest');
const User = require('../../models/User');
const referralService = require('../../services/referralService');
const { createNotification } = require('../../services/notificationService');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const dateRange = (startDate, endDate) => {
  if (!startDate && !endDate) return null;
  const range = {};
  if (startDate) range.$gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return range;
};

const usersMatching = async (q) => {
  const rx = new RegExp(escapeRegex(q.trim()), 'i');
  const users = await User.find({ $or: [{ name: rx }, { phone: rx }, { referralCode: rx }] }).select('_id').lean();
  return users.map(u => u._id);
};

/**
 * Get platform-wide referral events list with filters and pagination
 */
exports.getAllReferrals = async (req, res) => {
  try {
    const { eventType, search, startDate, endDate, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (eventType && eventType !== 'ALL') filter.eventType = eventType;
    const range = dateRange(startDate, endDate);
    if (range) filter.createdAt = range;

    if (search && search.trim()) {
      const userIds = await usersMatching(search);
      filter.$or = [
        { referrer: { $in: userIds } },
        { referredUser: { $in: userIds } }
      ];
    }

    const lim = Math.min(5000, Math.max(1, Number(limit)));
    const skip = (Number(page) - 1) * lim;
    const total = await Referral.countDocuments(filter);

    const referrals = await Referral.find(filter)
      .populate('referrer', 'name phone avatar referralCode')
      .populate('referredUser', 'name phone avatar referralCode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .lean();

    // Welcome bonus rows are logged with the new member as both sides
    referrals.forEach(r => {
      r.isWelcomeBonus = String(r.referrer?._id || r.referrer) === String(r.referredUser?._id || r.referredUser);
    });

    res.status(200).json({
      success: true,
      status: 'success',
      data: referrals,
      pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) }
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
    // Fix accounts that were given someone else's code by the old register flow
    referralService.repairDuplicateCodes().catch(err => console.error('[Referral] code repair failed:', err.message));

    const config = await referralService.getOrCreateConfig();

    const [totalReferrals, totalPointsAgg, eventBreakdownAgg, topReferrers, payoutAgg, balanceAgg] = await Promise.all([
      Referral.countDocuments({}),
      Referral.aggregate([{ $group: { _id: null, totalPoints: { $sum: '$pointsAwarded' } } }]),
      Referral.aggregate([{ $group: { _id: '$eventType', count: { $sum: 1 }, points: { $sum: '$pointsAwarded' } } }]),
      referralService.topReferrers({ limit: 5 }),
      RedemptionRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, points: { $sum: '$points' }, amount: { $sum: '$amount' } } }]),
      User.aggregate([{ $group: { _id: null, points: { $sum: '$pointsBalance' } } }])
    ]);

    const breakdown = {
      REGISTRATION: { count: 0, points: 0 },
      SUBSCRIPTION: { count: 0, points: 0 },
      MEMBERSHIP: { count: 0, points: 0 },
      DONATION: { count: 0, points: 0 }
    };
    eventBreakdownAgg.forEach(item => {
      if (breakdown[item._id]) breakdown[item._id] = { count: item.count, points: item.points };
    });

    const payouts = {};
    ['pending', 'approved', 'paid', 'rejected', 'cancelled'].forEach(s => {
      const row = payoutAgg.find(p => p._id === s);
      payouts[s] = { count: row?.count || 0, points: row?.points || 0, amount: row?.amount || 0 };
    });

    const outstandingPoints = balanceAgg[0]?.points || 0;

    res.status(200).json({
      success: true,
      status: 'success',
      data: {
        isActive: config.isActive,
        totalReferrals,
        totalPointsAwarded: totalPointsAgg[0]?.totalPoints || 0,
        breakdown,
        topReferrers,
        payouts,
        outstandingPoints,
        outstandingAmount: Math.round(outstandingPoints * (config.rupeesPerPoint ?? 1) * 100) / 100
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
    res.status(200).json({ success: true, status: 'success', data: config });
  } catch (error) {
    console.error('Admin Get Referral Config Error:', error);
    res.status(500).json({ success: false, status: 'error', message: error.message });
  }
};

const NUMBER_FIELDS = ['registrationReferrerPoints', 'registrationReferredPoints', 'subscriptionPoints',
  'membershipPoints', 'donationPoints', 'rupeesPerPoint', 'minRedeemPoints'];
const BOOL_FIELDS = ['isActive', 'rewardFirstPurchaseOnly', 'redemptionEnabled'];

/**
 * Update referral configuration settings
 */
exports.updateReferralConfig = async (req, res) => {
  try {
    const config = await referralService.getOrCreateConfig();

    for (const f of NUMBER_FIELDS) {
      if (req.body[f] === undefined || req.body[f] === '') continue;
      const n = Number(req.body[f]);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ success: false, message: `${f} must be a positive number.` });
      }
      config[f] = n;
    }
    for (const f of BOOL_FIELDS) {
      if (req.body[f] !== undefined) config[f] = req.body[f] === true || req.body[f] === 'true';
    }
    if (config.minRedeemPoints < 1) config.minRedeemPoints = 1;

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

// ─── Redemption (cash payout) requests ───────────────────────────────────────

const notifyRedemption = (request, title, message) =>
  createNotification({
    userId: request.user?._id || request.user,
    module: 'referral',
    type: 'referral_redemption_update',
    title,
    message,
    icon: '💸',
    priority: 'high',
    actionUrl: '/member/referral/redeem',
    referenceId: request._id,
    referenceType: 'RedemptionRequest'
  }).catch(err => console.warn('[RedemptionNotifyWarn]', err.message));

exports.getRedemptions = async (req, res) => {
  try {
    const { status, search, method, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (method && method !== 'all') filter.method = method;
    const range = dateRange(startDate, endDate);
    if (range) filter.createdAt = range;
    if (search && search.trim()) {
      const rx = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [
        { user: { $in: await usersMatching(search) } },
        { upiId: rx }, { accountNumber: rx }, { transactionRef: rx }, { accountHolderName: rx }
      ];
    }

    const lim = Math.min(5000, Math.max(1, Number(limit)));
    const [total, list, counts] = await Promise.all([
      RedemptionRequest.countDocuments(filter),
      RedemptionRequest.find(filter)
        .populate('user', 'name phone avatar referralCode pointsBalance pointsRedeemed')
        .populate('processedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * lim)
        .limit(lim)
        .lean(),
      RedemptionRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);

    res.json({
      success: true,
      data: list,
      counts: Object.fromEntries(counts.map(c => [c._id, c.count])),
      pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * One request plus everything the admin needs to verify it: where the member's
 * points came from, who they referred, and their earlier payouts.
 */
exports.getRedemptionDetail = async (req, res) => {
  try {
    const request = await RedemptionRequest.findById(req.params.id)
      .populate('user', 'name phone email avatar referralCode pointsBalance pointsRedeemed createdAt accountStatus verificationStatus city state')
      .populate('processedBy', 'name')
      .populate('history.by', 'name')
      .lean();
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    const userId = request.user?._id;
    const [earnings, referredUsers, recentEvents, previousPayouts] = await Promise.all([
      Referral.aggregate([
        { $match: { referrer: userId } },
        { $group: { _id: '$eventType', count: { $sum: 1 }, points: { $sum: '$pointsAwarded' } } }
      ]),
      User.find({ referredBy: userId }).select('name phone createdAt accountStatus verificationStatus').sort({ createdAt: -1 }).limit(50).lean(),
      Referral.find({ referrer: userId }).populate('referredUser', 'name phone').sort({ createdAt: -1 }).limit(30).lean(),
      RedemptionRequest.find({ user: userId, _id: { $ne: request._id } }).select('points amount status method createdAt paidAt transactionRef').sort({ createdAt: -1 }).lean()
    ]);

    res.json({
      success: true,
      data: {
        request,
        totalPointsEarned: earnings.reduce((s, e) => s + e.points, 0),
        earnings,
        referredUsers,
        recentEvents,
        previousPayouts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveRedemption = async (req, res) => {
  try {
    const note = String(req.body.note || '').trim();
    const request = await RedemptionRequest.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      {
        status: 'approved',
        processedBy: req.user._id,
        ...(note ? { adminNote: note } : {}),
        $push: { history: { status: 'approved', note: note || 'Verified by admin', by: req.user._id } }
      },
      { new: true }
    );
    if (!request) return res.status(400).json({ success: false, message: 'Only a pending request can be approved.' });

    notifyRedemption(request, 'Redemption Approved ✅',
      `Your request to redeem ${request.points} points (₹${request.amount}) is approved. Payment will be sent soon.`);
    res.json({ success: true, message: 'Request approved.', data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markRedemptionPaid = async (req, res) => {
  try {
    const transactionRef = String(req.body.transactionRef || '').trim();
    const paymentMode = String(req.body.paymentMode || '').trim();
    const note = String(req.body.note || '').trim();
    if (!transactionRef) {
      return res.status(400).json({ success: false, message: 'Enter the transaction / UTR number of the payment.' });
    }

    const request = await RedemptionRequest.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ['pending', 'approved'] } },
      {
        status: 'paid',
        transactionRef,
        paymentMode,
        paidAt: new Date(),
        processedBy: req.user._id,
        ...(note ? { adminNote: note } : {}),
        $push: { history: { status: 'paid', note: `Paid via ${paymentMode || 'transfer'} · Ref ${transactionRef}${note ? ` · ${note}` : ''}`, by: req.user._id } }
      },
      { new: true }
    );
    if (!request) return res.status(400).json({ success: false, message: 'This request is already closed.' });

    await User.updateOne({ _id: request.user }, { $inc: { pointsRedeemed: request.points } });
    notifyRedemption(request, 'Payment Sent 💸',
      `₹${request.amount} has been paid for your ${request.points} referral points. Transaction ref: ${transactionRef}.`);
    res.json({ success: true, message: 'Marked as paid.', data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.rejectRedemption = async (req, res) => {
  try {
    const reason = String(req.body.reason || '').trim();
    if (!reason) return res.status(400).json({ success: false, message: 'Please give a reason for rejecting.' });

    const request = await RedemptionRequest.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ['pending', 'approved'] } },
      {
        status: 'rejected',
        rejectionReason: reason,
        processedBy: req.user._id,
        $push: { history: { status: 'rejected', note: reason, by: req.user._id } }
      },
      { new: true }
    );
    if (!request) return res.status(400).json({ success: false, message: 'This request is already closed.' });

    // Points go back to the member
    await User.updateOne({ _id: request.user }, { $inc: { pointsBalance: request.points } });
    notifyRedemption(request, 'Redemption Request Rejected',
      `Your request to redeem ${request.points} points was rejected: ${reason}. The points are back in your balance.`);
    res.json({ success: true, message: 'Request rejected and points returned to the member.', data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Reports ─────────────────────────────────────────────────────────────────

/**
 * Everything for the Reports tab, for an optional date range: totals, per-event
 * breakdown, monthly trend, conversion of referred sign-ups, payouts and top referrers.
 */
exports.getReports = async (req, res) => {
  try {
    const range = dateRange(req.query.startDate, req.query.endDate);
    const refMatch = range ? { createdAt: range } : {};
    const config = await referralService.getOrCreateConfig();
    const rate = config.rupeesPerPoint ?? 1;

    // Monthly trend: last 12 months, or the chosen range
    const trendStart = range?.$gte || (() => { const d = new Date(); d.setMonth(d.getMonth() - 11, 1); d.setHours(0, 0, 0, 0); return d; })();
    const trendMatch = { createdAt: { $gte: trendStart, ...(range?.$lte ? { $lte: range.$lte } : {}) } };
    const monthKey = { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } };

    const [
      byEvent, referredSignups, uniqueReferrers, monthlyEvents, monthlyPayouts,
      payoutsByStatus, payoutsByMethod, top, referredIds, balanceAgg
    ] = await Promise.all([
      Referral.aggregate([
        { $match: { ...refMatch, $expr: { $ne: ['$referrer', '$referredUser'] } } },
        { $group: { _id: '$eventType', count: { $sum: 1 }, points: { $sum: '$pointsAwarded' } } }
      ]),
      User.countDocuments({ referredBy: { $ne: null }, ...(range ? { createdAt: range } : {}) }),
      Referral.distinct('referrer', { ...refMatch, $expr: { $ne: ['$referrer', '$referredUser'] } }),
      Referral.aggregate([
        { $match: trendMatch },
        { $group: {
          _id: monthKey,
          events: { $sum: { $cond: [{ $ne: ['$referrer', '$referredUser'] }, 1, 0] } },
          signups: { $sum: { $cond: [{ $and: [{ $eq: ['$eventType', 'REGISTRATION'] }, { $ne: ['$referrer', '$referredUser'] }] }, 1, 0] } },
          points: { $sum: '$pointsAwarded' }
        } }
      ]),
      RedemptionRequest.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: trendStart, ...(range?.$lte ? { $lte: range.$lte } : {}) } } },
        { $group: { _id: { y: { $year: '$paidAt' }, m: { $month: '$paidAt' } }, amount: { $sum: '$amount' }, points: { $sum: '$points' }, count: { $sum: 1 } } }
      ]),
      RedemptionRequest.aggregate([
        { $match: refMatch },
        { $group: { _id: '$status', count: { $sum: 1 }, points: { $sum: '$points' }, amount: { $sum: '$amount' } } }
      ]),
      RedemptionRequest.aggregate([
        { $match: { ...refMatch, status: 'paid' } },
        { $group: { _id: '$method', count: { $sum: 1 }, amount: { $sum: '$amount' } } }
      ]),
      referralService.topReferrers({ limit: 20, match: refMatch }),
      User.find({ referredBy: { $ne: null }, ...(range ? { createdAt: range } : {}) }).distinct('_id'),
      User.aggregate([{ $group: { _id: null, points: { $sum: '$pointsBalance' } } }])
    ]);

    // Referred sign-ups who went on to buy a subscription (any time)
    const convertedToPaid = referredIds.length
      ? (await Referral.distinct('referredUser', { referredUser: { $in: referredIds }, eventType: { $in: ['SUBSCRIPTION', 'MEMBERSHIP'] } })).length
      : 0;

    const months = [];
    const end = range?.$lte || new Date();
    for (let d = new Date(trendStart.getFullYear(), trendStart.getMonth(), 1); d <= end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      const k = (r) => r._id.y === d.getFullYear() && r._id.m === d.getMonth() + 1;
      const ev = monthlyEvents.find(k);
      const pay = monthlyPayouts.find(k);
      months.push({
        month: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
        events: ev?.events || 0,
        signups: ev?.signups || 0,
        pointsAwarded: ev?.points || 0,
        payoutAmount: pay?.amount || 0,
        payoutCount: pay?.count || 0
      });
      if (months.length > 36) break;
    }

    const events = { REGISTRATION: { count: 0, points: 0 }, SUBSCRIPTION: { count: 0, points: 0 }, MEMBERSHIP: { count: 0, points: 0 }, DONATION: { count: 0, points: 0 } };
    byEvent.forEach(e => { if (events[e._id]) events[e._id] = { count: e.count, points: e.points }; });

    // Welcome bonus points given to new members in the range
    const welcomeAgg = await Referral.aggregate([
      { $match: { ...refMatch, $expr: { $eq: ['$referrer', '$referredUser'] } } },
      { $group: { _id: null, count: { $sum: 1 }, points: { $sum: '$pointsAwarded' } } }
    ]);

    const payouts = {};
    ['pending', 'approved', 'paid', 'rejected', 'cancelled'].forEach(s => {
      const row = payoutsByStatus.find(p => p._id === s);
      payouts[s] = { count: row?.count || 0, points: row?.points || 0, amount: row?.amount || 0 };
    });

    const outstandingPoints = balanceAgg[0]?.points || 0;

    res.json({
      success: true,
      data: {
        rupeesPerPoint: rate,
        summary: {
          referredSignups,
          uniqueReferrers: uniqueReferrers.length,
          convertedToPaid,
          conversionRate: referredSignups ? Math.round((convertedToPaid / referredIds.length) * 1000) / 10 : 0,
          pointsToReferrers: byEvent.reduce((s, e) => s + e.points, 0),
          welcomeBonusPoints: welcomeAgg[0]?.points || 0,
          welcomeBonusCount: welcomeAgg[0]?.count || 0,
          outstandingPoints,
          outstandingAmount: Math.round(outstandingPoints * rate * 100) / 100
        },
        events,
        payouts,
        payoutsByMethod: Object.fromEntries(payoutsByMethod.map(p => [p._id, { count: p.count, amount: p.amount }])),
        monthly: months,
        topReferrers: top
      }
    });
  } catch (error) {
    console.error('Admin Referral Reports Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
