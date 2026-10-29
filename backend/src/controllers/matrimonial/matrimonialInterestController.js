/**
 * matrimonialInterestController.js
 * Manages the full interest request lifecycle.
 */
const InterestRequest = require('../../models/InterestRequest');

const { countInterestsThisMonth, countSuperInterestsThisMonth } = require('../../services/matrimonialUsageService');
const MatrimonialProfile = require('../../models/MatrimonialProfile');
const Conversation = require('../../models/Conversation');
const UserBlock = require('../../models/UserBlock');
const UserSubscription = require('../../models/UserSubscription');
const {
  notifyInterestReceived,
  notifyInterestAccepted,
  notifyInterestRejected
} = require('../../services/notificationService');
const { sendPushNotification } = require('../../services/pushNotificationService');
const { getEffectiveFeatures } = require('../../middleware/subscriptionMiddleware');

// Super Interests have their own monthly quota (plan feature superInterestsPerMonth: 0 = none, -1 = unlimited)
const checkSuperInterestQuota = async (userId) => {
  const { features } = await getEffectiveFeatures(userId);
  const limit = Number(features.superInterestsPerMonth) || 0;
  if (limit === 0) {
    return { ok: false, code: 'SUPER_INTEREST_NOT_IN_PLAN', message: 'Super Interest is not included in your plan. Upgrade to send one.' };
  }
  if (limit === -1) return { ok: true };
  const used = await countSuperInterestsThisMonth(userId);
  if (used >= limit) {
    return { ok: false, code: 'SUPER_INTEREST_LIMIT_REACHED', message: `You have used all ${limit} Super Interests for this month.`, used, limit };
  }
  return { ok: true };
};

// Tells the receiver (name only if the sender's privacy setting shows it)
const notifyReceiver = async (senderId, receiverId, interestId, isSuper) => {
  const senderProfile = await MatrimonialProfile.findOneAndUpdate({ userId: senderId }, { lastActiveAt: new Date() }, { new: true })
    .select('personal.fullName visibilitySettings').lean();
  const senderName = visibleNameOf(senderProfile) || 'A member';
  const notif = await notifyInterestReceived(receiverId, senderName, interestId, { isSuper });
  if (notif) {
    sendPushNotification({
      userId: receiverId,
      notificationId: notif._id,
      type: 'matrimonial_interest_received',
      title: isSuper ? 'Super Interest Received! ⭐' : 'New Interest Received! 💌',
      message: isSuper ? `${senderName} sent you a Super Interest.` : `${senderName} has sent you an interest request.`,
      icon: isSuper ? '⭐' : '💌',
      actionUrl: '/member/matrimonial/interests'
    }).catch(err => console.error('[PushError]', err.message));
  }
};

// ─── Send Interest ────────────────────────────────────────────────────────────
// body.superInterest = true sends a Super Interest, or upgrades a pending interest to one
exports.sendInterest = async (req, res) => {
  try {
    const { receiverProfileId, message } = req.body;
    const wantsSuper = req.body.superInterest === true || req.body.superInterest === 'true';
    const senderId = req.user._id;

    const mongoose = require('mongoose');
    const isValidId = mongoose.Types.ObjectId.isValid(receiverProfileId);

    // Fetch receiver's profile by profile _id OR userId
    let receiverProfile = null;
    if (isValidId) {
      receiverProfile = await MatrimonialProfile.findOne({
        $or: [{ _id: receiverProfileId }, { userId: receiverProfileId }],
        isDeleted: false
      });
    }

    if (!receiverProfile) {
      return res.status(404).json({ status: 'error', message: 'Profile not found or not available.' });
    }

    // ─── Block interests to married/closed profiles ───────────────────────────
    if (receiverProfile.isClosed || receiverProfile.status === 'married') {
      return res.status(400).json({ status: 'error', message: 'This profile is no longer accepting interests. The user is married.' });
    }

    const receiverId = receiverProfile.userId;

    // ─── Self-send check ─────────────────────────────────────────────────────
    if (senderId.equals(receiverId)) {
      return res.status(400).json({ status: 'error', message: 'You cannot send interest to yourself.' });
    }

    // ─── Block check ─────────────────────────────────────────────────────────
    const isBlocked = await UserBlock.findOne({
      $or: [
        { userId: senderId, blockedUserId: receiverId },
        { userId: receiverId, blockedUserId: senderId }
      ]
    });
    if (isBlocked) {
      return res.status(403).json({ status: 'error', message: 'You cannot send interest to this user.' });
    }

    // ─── Duplicate check: block if already pending or accepted ────────────────
    const existing = await InterestRequest.findOne({
      senderId,
      receiverId,
      status: { $in: ['pending', 'accepted'] }
    });
    // Upgrading a pending interest to a Super Interest
    if (existing && wantsSuper && existing.status === 'pending') {
      if (existing.isSuper) {
        return res.status(400).json({ status: 'error', message: 'You have already sent a Super Interest to this member.', currentStatus: 'pending' });
      }
      const quota = await checkSuperInterestQuota(senderId);
      if (!quota.ok) return res.status(403).json({ status: 'error', ...quota, ok: undefined });
      existing.isSuper = true;
      existing.superAt = new Date();
      await existing.save();
      await notifyReceiver(senderId, receiverId, existing._id, true);
      return res.json({ status: 'success', message: 'Your interest is now a Super Interest.', data: { interest: existing } });
    }

    if (existing) {
      return res.status(400).json({
        status: 'error',
        message: existing.status === 'accepted' ? 'You are already connected with this person.' : 'Interest request already sent and is pending.',
        currentStatus: existing.status
      });
    }

    // ─── Super Interest quota (instead of the regular interest limit) ─────────
    if (wantsSuper) {
      const quota = await checkSuperInterestQuota(senderId);
      if (!quota.ok) return res.status(403).json({ status: 'error', ...quota, ok: undefined });
    }

    // ─── Plan limit check ─────────────────────────────────────────────────────
    const { userSubscription } = req;
    if (!wantsSuper && userSubscription && req.userFeatures?.interestLimit !== -1) {
      const used = await countInterestsThisMonth(req.user._id);
      const limit = req.userFeatures.interestLimit;
      if (used >= limit) {
        return res.status(403).json({ status: 'error', code: 'INTEREST_LIMIT_REACHED', message: `Monthly limit of ${limit} interests reached. Upgrade to Premium.` });
      }
      await UserSubscription.findByIdAndUpdate(userSubscription._id, {
        $inc: { 'usage.interestsSentThisMonth': 1 }
      });
    }

    // ─── Reuse stale record OR create new ────────────────────────────────────
    // If a rejected/cancelled/withdrawn record exists — reuse it to avoid index conflict
    let interest;
    const staleInterest = await InterestRequest.findOne({
      senderId,
      receiverId,
      status: { $in: ['rejected', 'cancelled', 'withdrawn'] }
    });

    if (staleInterest) {
      staleInterest.status      = 'pending';
      staleInterest.message     = message || '';
      staleInterest.rejectedAt  = undefined;
      staleInterest.cancelledAt = undefined;
      staleInterest.withdrawnAt = undefined;
      staleInterest.conversationId = undefined;
      staleInterest.isSuper     = wantsSuper;
      staleInterest.superAt     = wantsSuper ? new Date() : undefined;
      await staleInterest.save();
      interest = staleInterest;
    } else {
      interest = await InterestRequest.create({ senderId, receiverId, message, isSuper: wantsSuper, superAt: wantsSuper ? new Date() : undefined });
    }

    // Updates the sender's lastActiveAt and notifies the receiver
    await notifyReceiver(senderId, receiverId, interest._id, wantsSuper);

    res.status(201).json({ status: 'success', message: wantsSuper ? 'Super Interest sent.' : 'Interest sent successfully.', data: { interest } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Accept Interest ──────────────────────────────────────────────────────────
exports.acceptInterest = async (req, res) => {
  try {
    const { id } = req.params;
    const receiverId = req.user._id;

    const interest = await InterestRequest.findOne({ _id: id, receiverId, status: 'pending' });
    if (!interest) {
      return res.status(404).json({ status: 'error', message: 'Interest request not found or already processed.' });
    }

    // ─── Idempotent Conversation creation ────────────────────────────────────
    let conversation = await Conversation.findOne({
      type: 'matrimonial',
      referenceId: interest._id
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [interest.senderId, receiverId],
        type: 'matrimonial',
        referenceId: interest._id,
        createdBy: receiverId,
        isActive: true
      });
    }

    interest.status         = 'accepted';
    interest.acceptedAt     = new Date();
    interest.conversationId = conversation._id;
    await interest.save();

    // ─── Mark both profiles as Connected ─────────────────────────────────────
    await MatrimonialProfile.updateMany(
      { userId: { $in: [interest.senderId, receiverId] }, isDeleted: false },
      { $set: { maritalLifecycle: 'connected', lastActiveAt: new Date() } }
    );

    // Notify sender
    const notifAccepted = await notifyInterestAccepted(interest.senderId, req.user.name, interest._id);
    if (notifAccepted) {
      sendPushNotification({
        userId: interest.senderId,
        notificationId: notifAccepted._id,
        type: 'matrimonial_interest_accepted',
        title: 'Interest Accepted! 🎉',
        message: `${req.user.name} has accepted your interest request. You can now chat!`,
        icon: '🎉',
        actionUrl: '/member/matrimonial/interests'
      }).catch(err => console.error('[PushError]', err.message));
    }

    res.json({
      status: 'success',
      message: 'Interest accepted! You can now chat.',
      data: { interest, conversationId: conversation._id }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Reject Interest ──────────────────────────────────────────────────────────
exports.rejectInterest = async (req, res) => {
  try {
    const { id } = req.params;
    const receiverId = req.user._id;

    const interest = await InterestRequest.findOne({ _id: id, receiverId, status: 'pending' });
    if (!interest) {
      return res.status(404).json({ status: 'error', message: 'Interest request not found or already processed.' });
    }

    interest.status = 'rejected';
    interest.rejectedAt = new Date();
    await interest.save();

    notifyInterestRejected(interest.senderId, interest._id);

    res.json({ status: 'success', message: 'Interest rejected.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Cancel / Withdraw Interest ───────────────────────────────────────────────
exports.cancelInterest = async (req, res) => {
  try {
    const { id } = req.params;
    const senderId = req.user._id;

    const interest = await InterestRequest.findOne({ _id: id, senderId, status: 'pending' });
    if (!interest) {
      return res.status(404).json({ status: 'error', message: 'Interest request not found or cannot be cancelled.' });
    }

    interest.status = 'cancelled';
    interest.cancelledAt = new Date();
    await interest.save();

    res.json({ status: 'success', message: 'Interest cancelled.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── List Sent Interests ────────────────────────────────────────────────────────────────
const { buildRestrictedProfile, buildProfileForViewer, visibleNameOf } = require('../../middleware/matrimonialPrivacy');
const { ensureBlurredPhotos } = require('../../services/matrimonialPhotoBlur');

// The other person in an interest: full profile once accepted; until then the restricted
// view, and their account (name, avatar, id) is replaced by what that view allows.
const presentCounterpart = async (interest, accountField, profileField, canViewPhotos) => {
  const accountId = interest[accountField]?._id || interest[accountField];
  const profile = await MatrimonialProfile.findOne({ userId: accountId, isDeleted: false }).lean({ virtuals: true });
  const connected = interest.status === 'accepted';
  if (!connected && profile) await ensureBlurredPhotos([profile], { includePublic: !canViewPhotos });
  const out = { ...interest, [profileField]: profile ? buildProfileForViewer(profile, { isConnected: connected, canViewPhotos }) : null };
  if (!connected) {
    const shown = out[profileField];
    out[accountField] = { name: (profile && visibleNameOf(profile)) || 'Member', avatar: shown?.photos?.[0]?.url || null };
  }
  return out;
};

exports.getSentInterests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { senderId: req.user._id };
    if (status) query.status = status;

    const total = await InterestRequest.countDocuments(query);
    const interests = await InterestRequest.find(query)
      .populate('receiverId', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    // Enrich with receiver's matrimonial profile
    const { features } = await getEffectiveFeatures(req.user._id);
    const enriched = await Promise.all(interests.map(i => presentCounterpart(i, 'receiverId', 'receiverProfile', !!features.viewProfilePhotos)));

    res.json({ status: 'success', data: { interests: enriched, total, page: Number(page) } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── List Received Interests ──────────────────────────────────────────────────
exports.getReceivedInterests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { receiverId: req.user._id };
    if (status) query.status = status;

    const total = await InterestRequest.countDocuments(query);
    const interests = await InterestRequest.find(query)
      .populate('senderId', 'name avatar')
      .sort({ isSuper: -1, createdAt: -1 }) // Super Interests first
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    // Enrich with sender's matrimonial profile
    const { features } = await getEffectiveFeatures(req.user._id);
    const enriched = await Promise.all(interests.map(i => presentCounterpart(i, 'senderId', 'senderProfile', !!features.viewProfilePhotos)));

    res.json({ status: 'success', data: { interests: enriched, total, page: Number(page) } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Declined / Cancelled Interests ───────────────────────────────────────────
// "I declined"   → interests I declined + my own interests I cancelled
// "They declined" → my interests they declined + their interests to me they cancelled
// @route GET /api/v1/member/matrimonial/interests/declined
exports.getDeclinedInterests = async (req, res) => {
  try {
    const me = req.user._id;
    const closed = ['rejected', 'cancelled', 'withdrawn'];
    const interests = await InterestRequest.find({
      status: { $in: closed },
      $or: [{ senderId: me }, { receiverId: me }]
    }).sort({ updatedAt: -1 }).limit(200).lean();

    const otherIds = [...new Set(interests.map(i =>
      String(String(i.senderId) === String(me) ? i.receiverId : i.senderId)))];
    const profiles = await MatrimonialProfile.find({ userId: { $in: otherIds }, isDeleted: false })
      .populate('userId', 'verificationStatus isAadharVerified')
      .lean({ virtuals: true });
    const { features } = await getEffectiveFeatures(me);
    const canViewPhotos = !!features.viewProfilePhotos;
    await ensureBlurredPhotos(profiles, { includePublic: !canViewPhotos });
    const profileByUser = new Map(profiles.map(p => [String(p.userId?._id || p.userId), p]));

    const iDeclined = [];
    const theyDeclined = [];
    for (const i of interests) {
      const iSent = String(i.senderId) === String(me);
      const otherId = String(iSent ? i.receiverId : i.senderId);
      const profile = profileByUser.get(otherId);
      const action = i.status === 'rejected' ? 'declined' : 'cancelled';
      const entry = {
        _id: i._id,
        action,
        date: (action === 'declined' ? i.rejectedAt : (i.cancelledAt || i.withdrawnAt)) || i.updatedAt,
        profile: profile ? buildRestrictedProfile(profile, { canViewPhotos }) : null
      };
      // Who closed it: the receiver declines, the sender cancels
      const closedByMe = action === 'declined' ? !iSent : iSent;
      (closedByMe ? iDeclined : theyDeclined).push(entry);
    }

    res.json({ status: 'success', data: { iDeclined, theyDeclined } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
