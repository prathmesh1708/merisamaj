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
const { signDeliveryReceipt } = require('./deliveryReceiptService');

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
  'chat_new_message', 'group_new_message', 'group_invite', 'group_role_promoted', 'chat_mention',
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

// Pushes that must arrive immediately
const URGENT_TYPES = new Set(['chat_new_message', 'group_new_message', 'chat_mention', 'mention', 'emergency_alert']);

const MULTICAST_LIMIT = 500; // FCM maximum tokens per sendEachForMulticast call

// `image` (optional, https URL) shows as a big picture under the text, like shopping-app
// promos: Android and iOS draw it themselves, the web service worker reads data.image.
const buildPayload = ({ tokens, type, title, message, icon, actionUrl, notificationId, tag, ack, image }) => ({
  tokens,
  notification: {
    title: title || 'ApniSamaj Alert',
    body: message || '',
    ...(image ? { imageUrl: image } : {})
  },
  // FCM data values must all be strings
  data: {
    type: type || 'general',
    icon: icon || '🔔',
    actionUrl: actionUrl || '/member/notifications',
    notificationId: notificationId ? notificationId.toString() : '',
    // Same tag = replaces the previous notification on the device (one per chat)
    tag: tag || '',
    // Signed chat delivery receipt — the service worker posts it back on arrival
    ack: ack || '',
    image: image || ''
  },
  // Time-sensitive pushes (chat, emergencies) go out as HIGH priority so Android's
  // battery saver (Doze) delivers them at once instead of delaying or dropping them.
  android: {
    priority: URGENT_TYPES.has(type) ? 'high' : 'normal',
    ttl: URGENT_TYPES.has(type) ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // ms
    ...(tag ? { collapseKey: tag } : {}),
    notification: {
      // Same tag replaces the earlier notification of that chat instead of stacking
      ...(tag ? { tag } : {}),
      ...(image ? { imageUrl: image } : {}),
      sound: 'default'
    }
  },
  apns: {
    headers: {
      'apns-priority': URGENT_TYPES.has(type) ? '10' : '5',
      ...(tag ? { 'apns-collapse-id': tag.slice(0, 64) } : {})
    },
    // mutable-content lets iOS download the image before showing the alert
    payload: { aps: { sound: 'default', ...(image ? { 'mutable-content': 1 } : {}) } },
    ...(image ? { fcmOptions: { imageUrl: image } } : {})
  },
  webpush: {
    headers: {
      Urgency: URGENT_TYPES.has(type) ? 'high' : 'normal',
      TTL: String(URGENT_TYPES.has(type) ? 60 * 60 : 24 * 60 * 60)
    }
  }
});

// Android apps build their own notification from the push data. If the push also
// carries a "notification" block, Android shows it automatically AND the app shows
// its own — two identical pop-ups. So Android devices get a data-only push (one
// notification, made by the app). Set FCM_ANDROID_DATA_ONLY=false to switch back.
const ANDROID_DATA_ONLY = String(process.env.FCM_ANDROID_DATA_ONLY ?? 'true').toLowerCase() !== 'false';

/** Same push without the auto-displayed part; title/body travel in `data` instead */
const toDataOnly = (payload) => {
  const { notification, ...rest } = payload;
  const { notification: _androidNotification, ...android } = payload.android || {};
  return {
    ...rest,
    data: {
      ...payload.data,
      title: notification?.title || '',
      body: notification?.body || '',
      message: notification?.body || ''
    },
    android
  };
};

/**
 * Send one push to many devices (chunks of 500) and deactivate dead tokens.
 * `tokenDocs` are { fcmToken, deviceType }. Returns { successCount, failureCount }.
 */
const sendToTokens = async (tokenDocs, fields) => {
  let successCount = 0;
  let failureCount = 0;
  const deadTokens = [];

  // Never send twice to the same token
  const unique = Array.from(new Map(tokenDocs.map(t => [t.fcmToken, t])).values());
  // A push with an image goes to Android as a normal notification so Android itself
  // draws the big picture (the app's own data-only notification is text only).
  const groups = ANDROID_DATA_ONLY && !fields.image
    ? [
        { tokens: unique.filter(t => t.deviceType === 'android').map(t => t.fcmToken), dataOnly: true },
        { tokens: unique.filter(t => t.deviceType !== 'android').map(t => t.fcmToken), dataOnly: false }
      ]
    : [{ tokens: unique.map(t => t.fcmToken), dataOnly: false }];

  for (const group of groups) {
    for (let i = 0; i < group.tokens.length; i += MULTICAST_LIMIT) {
      const chunk = group.tokens.slice(i, i + MULTICAST_LIMIT);
      const full = buildPayload({ ...fields, tokens: chunk });
      const response = await admin.messaging().sendEachForMulticast(group.dataOnly ? toDataOnly(full) : full);
      successCount += response.successCount;
      failureCount += response.failureCount;
      response.responses.forEach((resp, idx) => {
        if (!resp.success && DEAD_TOKEN_CODES.has(resp.error?.code)) deadTokens.push(chunk[idx]);
      });
    }
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
  actionUrl = '/member/notifications',
  tag,
  ackConversationId,
  image
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
      tokens,
      { type, title, message, icon, actionUrl, notificationId, tag, image,
        ack: ackConversationId ? signDeliveryReceipt(userId, ackConversationId) : '' }
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
  actionUrl = '/member/notifications',
  image
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
      .select('fcmToken deviceType').lean();
    if (tokens.length === 0) {
      return { status: 'no_tokens', reason: 'No recipient has a registered active push token' };
    }

    const { successCount, failureCount } = await sendToTokens(
      tokens,
      { type, title, message, icon, actionUrl, image }
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
