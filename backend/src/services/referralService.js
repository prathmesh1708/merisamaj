const mongoose = require('mongoose');
const User = require('../models/User');
const Referral = require('../models/Referral');
const ReferralConfig = require('../models/ReferralConfig');
const { createUserNotification } = require('./notificationService');
const { sendPushNotification } = require('./pushNotificationService');

/**
 * Get or initialize global ReferralConfig singleton
 */
const getOrCreateConfig = async () => {
  let config = await ReferralConfig.findOne({});
  if (!config) {
    config = await ReferralConfig.create({
      registrationReferrerPoints: 100,
      registrationReferredPoints: 50,
      subscriptionPoints: 100,
      membershipPoints: 150,
      donationPoints: 75,
      isActive: true
    });
  }
  return config;
};

/**
 * Generate a unique referral code for a new user (e.g., SAMAJ-A492)
 */
const generateUniqueReferralCode = async () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let isUnique = false;
  let code = '';
  
  while (!isUnique) {
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code = `SAMAJ-${suffix}`;
    const existing = await User.findOne({ referralCode: code }).select('_id').lean();
    if (!existing) {
      isUnique = true;
    }
  }
  return code;
};

/**
 * Process referral logic upon new user registration
 */
const processRegistrationReferral = async (newUser, enteredReferralCode) => {
  try {
    const config = await getOrCreateConfig();
    
    // Ensure newUser has a unique referral code if missing
    if (!newUser.referralCode) {
      const code = await generateUniqueReferralCode();
      newUser.referralCode = code;
      await User.findByIdAndUpdate(newUser._id, { referralCode: code }).catch(() => {});
    }

    if (!enteredReferralCode || typeof enteredReferralCode !== 'string' || !enteredReferralCode.trim()) {
      return;
    }

    const cleanCode = enteredReferralCode.trim();
    const searchOpts = [{ referralCode: cleanCode }, { phone: cleanCode }];
    if (mongoose.isValidObjectId(cleanCode)) {
      searchOpts.push({ _id: cleanCode });
    }

    const inviter = await User.findOne({ $or: searchOpts }).select('_id name referralCode').lean();
    if (!inviter || inviter._id.toString() === newUser._id.toString()) {
      return;
    }

    // Set permanent referredBy link on new user
    await User.findByIdAndUpdate(newUser._id, { referredBy: inviter._id });
    newUser.referredBy = inviter._id;

    if (!config.isActive) {
      return;
    }

    const referrerPts = Number(config.registrationReferrerPoints || 0);
    const referredPts = Number(config.registrationReferredPoints || 0);

    // 1. Award points to Referrer
    if (referrerPts > 0) {
      await Referral.create({
        referrer: inviter._id,
        referredUser: newUser._id,
        eventType: 'REGISTRATION',
        pointsAwarded: referrerPts
      });

      await User.findByIdAndUpdate(inviter._id, {
        $inc: { pointsBalance: referrerPts, totalPointsEarned: referrerPts }
      });

      // Send SINGLE notification to referrer with exact point amount
      const notifMsg = `You earned ${referrerPts} referral points because ${newUser.name || 'A member'} registered using your referral link!`;
      try {
        const notifDoc = await createUserNotification({
          userId: inviter._id,
          module: 'referral',
          type: 'referral_bonus_earned',
          title: 'Referral Points Earned 🎁',
          message: notifMsg,
          icon: '🎁',
          actionUrl: '/member/referral'
        });

        if (notifDoc) {
          sendPushNotification({
            userId: inviter._id,
            notificationId: notifDoc._id,
            type: 'referral_bonus_earned',
            title: 'Referral Points Earned 🎁',
            message: notifMsg,
            icon: '🎁',
            actionUrl: '/member/referral'
          }).catch(err => console.error('[ReferralPushError]', err.message));
        }
      } catch (nErr) {
        console.warn('[ReferralNotifyWarn]', nErr.message);
      }
    }

    // 2. Award welcome points to Referred User
    if (referredPts > 0) {
      await Referral.create({
        referrer: newUser._id,
        referredUser: newUser._id,
        eventType: 'REGISTRATION',
        pointsAwarded: referredPts
      });

      await User.findByIdAndUpdate(newUser._id, {
        $inc: { pointsBalance: referredPts, totalPointsEarned: referredPts }
      });
    }

  } catch (error) {
    console.error('[ProcessRegistrationReferralError]', error);
  }
};

/**
 * Process referral side-effect for SUBSCRIPTION, MEMBERSHIP, DONATION
 * Lightweight & Non-blocking
 */
const processReferralEvent = async (eventType, actingUserId, sourceReference = null) => {
  try {
    if (!actingUserId) return;

    const config = await getOrCreateConfig();
    if (!config.isActive) return;

    const actingUser = await User.findById(actingUserId).select('_id name referredBy').lean();
    if (!actingUser || !actingUser.referredBy) return;

    let pointsToAward = 0;
    if (eventType === 'SUBSCRIPTION') pointsToAward = Number(config.subscriptionPoints || 0);
    // Note: MEMBERSHIP event type is defined here and in ReferralConfig, but is NOT currently triggered anywhere — there is no backend Membership upgrade/payment endpoint yet (UpgradeMembershipPage.jsx is frontend-only). Add a processReferralEvent('MEMBERSHIP', ...) call in the future backend Membership upgrade handler once it exists.
    else if (eventType === 'MEMBERSHIP') pointsToAward = Number(config.membershipPoints || 0);
    else if (eventType === 'DONATION') pointsToAward = Number(config.donationPoints || 0);

    if (pointsToAward <= 0) return;

    const inviterId = actingUser.referredBy;

    // Create Referral record
    await Referral.create({
      referrer: inviterId,
      referredUser: actingUserId,
      eventType,
      pointsAwarded: pointsToAward,
      sourceReference
    });

    // Credit Points
    await User.findByIdAndUpdate(inviterId, {
      $inc: { pointsBalance: pointsToAward, totalPointsEarned: pointsToAward }
    });

    // Send Notification to Inviter
    const eventNameMap = {
      SUBSCRIPTION: 'purchased a subscription',
      MEMBERSHIP: 'upgraded membership',
      DONATION: 'made a donation'
    };
    const notifMsg = `You earned ${pointsToAward} points because your referred member ${actingUser.name || 'a member'} ${eventNameMap[eventType] || 'completed an action'}!`;

    try {
      const notifDoc = await createUserNotification({
        userId: inviterId,
        module: 'referral',
        type: 'referral_bonus_earned',
        title: `Referral Reward (${eventType}) 💰`,
        message: notifMsg,
        icon: '💰',
        actionUrl: '/member/referral'
      });

      if (notifDoc) {
        sendPushNotification({
          userId: inviterId,
          notificationId: notifDoc._id,
          type: 'referral_bonus_earned',
          title: `Referral Reward (${eventType}) 💰`,
          message: notifMsg,
          icon: '💰',
          actionUrl: '/member/referral'
        }).catch(err => console.error('[ReferralPushError]', err.message));
      }
    } catch (nErr) {
      console.warn('[ReferralNotifyWarn]', nErr.message);
    }

  } catch (error) {
    console.error(`[ProcessReferralEventError:${eventType}]`, error);
  }
};

module.exports = {
  getOrCreateConfig,
  generateUniqueReferralCode,
  processRegistrationReferral,
  processReferralEvent
};
