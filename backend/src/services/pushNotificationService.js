/**
 * pushNotificationService.js
 * FCM (Firebase Cloud Messaging) Web Push Notification Service.
 * Dispatches push notifications ONLY for push-eligible event types.
 * References credentials via process.env.FCM_* environment variables.
 */

let admin;
try {
  admin = require('firebase-admin');
} catch (e) {
  console.warn('[PushService] firebase-admin package not installed yet.');
}

const UserPushToken = require('../models/UserPushToken');
const UserNotification = require('../models/UserNotification');

// ─── Firebase Admin SDK Initialization ────────────────────────────────────────
let fcmInitialized = false;

const initFCM = () => {
  if (!admin) return false;
  if (fcmInitialized) return true;

  const projectId   = process.env.FCM_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FCM_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey    = process.env.FCM_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[PushService] FCM env credentials missing. Push notifications disabled.');
    return false;
  }

  // Handle quotes and escaped newlines in private key
  if (privateKey) {
    privateKey = privateKey.trim().replace(/^["']|["']$/g, '');
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey
        })
      });
    }
    fcmInitialized = true;
    console.log('[PushService] Firebase Admin SDK initialized successfully.');
    return true;
  } catch (err) {
    console.warn('[PushService] Firebase Admin SDK init skipped (invalid or placeholder PEM key in .env). Push notifications disabled.', err.message);
    return false;
  }
};

// Attempt initial setup on load
initFCM();

// ─── Push Eligible Subset (STRICT FILTER) ─────────────────────────────────────
const PUSH_ELIGIBLE_TYPES = new Set([
  // Census
  'census_request_approved', 'census_request_rejected', 'family_link_request',
  // Leadership
  'leadership_claim_approved', 'leadership_claim_rejected', 'leadership_role_revoked',
  // Matrimonial
  'matrimonial_interest_received', 'matrimonial_interest_accepted',
  'matrimonial_marriage_request_received', 'matrimonial_marriage_accepted',
  'matrimonial_subscription_expired',
  // Events
  'event_reminder', 'event_updated', 'event_cancelled',
  // Donations & Funds
  'donation_receipt', 'donation_received', 'contribution_recorded',
  // Dharmashala
  'booking_approved', 'booking_rejected', 'booking_payment_confirmed',
  // Obituary
  'obituary_posted',
  // Social
  'emergency_alert', 'official_announcement', 'post_mention',
  // Chat
  'chat_new_message', 'group_invite', 'group_role_promoted', 'chat_mention',
  // Directory
  'listing_approved', 'listing_rejected', 'business_enquiry',
  // Voting
  'election_created', 'election_results_published',
  // Invitations & Referrals
  'invitation_received', 'referral_bonus_earned',
  // Account
  'account_security_alert', 'account_status_changed', 'account_blocked', 'account_activated', 'head_assigned',
  // Broadcasts from the Head / Admin panels
  'head_broadcast', 'admin_broadcast',
  // Community-wide news
  'event_created', 'campaign_created', 'fund_created',
  // Requests that need a Head's action
  'leadership_claim_submitted', 'member_verification_request', 'listing_submitted',
  'booking_received', 'payment_received', 'group_join_request', 'obituary_head_notice',
  // Replies to the member
  'group_join_approved', 'invitation_cancelled', 'invitation_accepted', 'mention',
  'matrimonial_marriage_rejected'
]);

// FCM error codes meaning the token is dead and should not be used again
const DEAD_TOKEN_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
  'messaging/invalid-argument'
]);

const MULTICAST_LIMIT = 500; // FCM maximum tokens per sendEachForMulticast call

const buildPayload = ({ tokens, type, title, message, icon, actionUrl, notificationId }) => ({
  tokens,
  notification: {
    title: title || 'ApniSamaj Alert',
    body: message || ''
  },
  // FCM data values must all be strings
  data: {
    type: type || 'general',
    icon: icon || '🔔',
    actionUrl: actionUrl || '/member/notifications',
    notificationId: notificationId ? notificationId.toString() : ''
  },
  webpush: {
    headers: {
      Urgency: type === 'emergency_alert' ? 'high' : 'normal'
    }
  }
});

/**
 * Send one payload to many tokens in chunks of 500 and deactivate dead tokens.
 * Returns { successCount, failureCount }.
 */
const sendToTokens = async (tokenStrings, fields) => {
  let successCount = 0;
  let failureCount = 0;
  const deadTokens = [];

  for (let i = 0; i < tokenStrings.length; i += MULTICAST_LIMIT) {
    const chunk = tokenStrings.slice(i, i + MULTICAST_LIMIT);
    const response = await admin.messaging().sendEachForMulticast(buildPayload({ ...fields, tokens: chunk }));
    successCount += response.successCount;
    failureCount += response.failureCount;
    response.responses.forEach((resp, idx) => {
      if (!resp.success && DEAD_TOKEN_CODES.has(resp.error?.code)) deadTokens.push(chunk[idx]);
    });
  }

  if (deadTokens.length > 0) {
    await UserPushToken.updateMany({ fcmToken: { $in: deadTokens } }, { $set: { isActive: false } });
  }
  return { successCount, failureCount };
};

/**
 * Atomically mark a notification as being pushed. Returns false if another code
 * path already pushed it — createNotification() pushes centrally and many
 * controllers also call sendPushNotification() for the same notification.
 */
const claimNotificationPush = async (notificationId) => {
  const res = await UserNotification.updateOne(
    { _id: notificationId, pushStatus: { $nin: ['sending', 'sent'] } },
    { $set: { pushStatus: 'sending' } }
  );
  if (res.modifiedCount > 0) return true;
  // Not modified: either already claimed (skip) or the document doesn't exist (send anyway)
  return !(await UserNotification.exists({ _id: notificationId }));
};

/**
 * Register or update an FCM token for a user
 */
const registerPushToken = async ({ userId, fcmToken, deviceType = 'web' }) => {
  try {
    if (!userId || !fcmToken) throw new Error('userId and fcmToken are required.');

    const tokenDoc = await UserPushToken.findOneAndUpdate(
      { fcmToken },
      {
        userId,
        fcmToken,
        deviceType,
        isActive: true,
        lastUsedAt: new Date()
      },
      { upsert: true, new: true }
    );
    return tokenDoc;
  } catch (err) {
    console.error('[PushService] Token registration failed:', err.message);
    throw err;
  }
};

/**
 * Deactivate / Unregister an FCM token
 */
const unregisterPushToken = async ({ userId, fcmToken }) => {
  try {
    if (!fcmToken) return;
    await UserPushToken.updateOne(
      { fcmToken, userId },
      { $set: { isActive: false } }
    );
  } catch (err) {
    console.error('[PushService] Token unregistration failed:', err.message);
  }
};

/**
 * Send FCM Push Notification to recipient(s) for push-eligible events
 */
const sendPushNotification = async ({
  userId,
  notificationId,
  type,
  title,
  message,
  icon = '🔔',
  actionUrl = '/member/notifications'
}) => {
  try {
    // 1. Strict Push Eligibility Check
    if (!PUSH_ELIGIBLE_TYPES.has(type)) {
      return { status: 'skipped', reason: 'Not in push-eligible event subset' };
    }

    // 2. Ensure FCM initialized
    if (!initFCM()) {
      return { status: 'disabled', reason: 'FCM SDK not initialized' };
    }

    // 3. Query active FCM tokens for recipient
    const tokens = await UserPushToken.find({ userId, isActive: true }).lean();
    if (!tokens || tokens.length === 0) {
      return { status: 'no_tokens', reason: 'Recipient has no registered active push tokens' };
    }

    // 4. Push each notification only once
    if (notificationId && !(await claimNotificationPush(notificationId))) {
      return { status: 'skipped', reason: 'Notification already pushed' };
    }

    // 5. Send and deactivate dead tokens
    const { successCount, failureCount } = await sendToTokens(
      tokens.map(t => t.fcmToken),
      { type, title, message, icon, actionUrl, notificationId }
    );

    // 6. Update UserNotification document push tracking status
    if (notificationId) {
      await UserNotification.findByIdAndUpdate(notificationId, {
        pushSent: successCount > 0,
        pushStatus: successCount > 0 ? 'sent' : 'failed'
      });
    }

    return { status: 'success', successCount, failureCount };
  } catch (err) {
    console.error('[PushService] sendPushNotification error:', err.message);
    if (notificationId) {
      await UserNotification.findByIdAndUpdate(notificationId, { pushStatus: 'failed' }).catch(() => {});
    }
    return { status: 'error', message: err.message };
  }
};

/**
 * Send the same push to many users at once (community broadcasts).
 * Looks up all their active devices in one query and multicasts in chunks of 500.
 */
const sendPushToUsers = async ({
  userIds,
  type,
  title,
  message,
  icon = '📢',
  actionUrl = '/member/notifications'
}) => {
  try {
    if (!PUSH_ELIGIBLE_TYPES.has(type)) {
      return { status: 'skipped', reason: 'Not in push-eligible event subset' };
    }
    if (!userIds || userIds.length === 0) {
      return { status: 'no_tokens', reason: 'No recipients' };
    }
    if (!initFCM()) {
      return { status: 'disabled', reason: 'FCM SDK not initialized' };
    }

    const tokens = await UserPushToken.find({ userId: { $in: userIds }, isActive: true })
      .select('fcmToken').lean();
    if (tokens.length === 0) {
      return { status: 'no_tokens', reason: 'No recipient has a registered active push token' };
    }

    const { successCount, failureCount } = await sendToTokens(
      tokens.map(t => t.fcmToken),
      { type, title, message, icon, actionUrl }
    );
    return { status: 'success', successCount, failureCount };
  } catch (err) {
    console.error('[PushService] sendPushToUsers error:', err.message);
    return { status: 'error', message: err.message };
  }
};

/** True when the Firebase Admin SDK is configured and ready to send */
const isPushConfigured = () => initFCM();

module.exports = {
  isPushConfigured,
  registerPushToken,
  unregisterPushToken,
  sendPushNotification,
  sendPushToUsers,
  PUSH_ELIGIBLE_TYPES
};
