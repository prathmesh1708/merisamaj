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
  if (fcmInitialized || !admin) return true;

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
  'account_security_alert', 'account_status_changed'
]);

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

    const tokenStrings = tokens.map(t => t.fcmToken);

    // 4. Construct FCM Multicast Message Payload
    const payload = {
      tokens: tokenStrings,
      notification: {
        title: title || 'ApniSamaj Alert',
        body: message || ''
      },
      data: {
        type: type || 'general',
        icon: icon || '🔔',
        actionUrl: actionUrl || '/member/notifications',
        notificationId: notificationId ? notificationId.toString() : ''
      },
      webpush: {
        headers: {
          Urgency: type === 'emergency_alert' ? 'high' : 'normal'
        },
        fcmOptions: {
          link: actionUrl || '/member/notifications'
        }
      }
    };

    // 5. Send FCM Multicast
    const response = await admin.messaging().sendEachForMulticast(payload);

    // 6. Clean up failed tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code;
          if (errCode === 'messaging/invalid-registration-token' || errCode === 'messaging/registration-token-not-registered') {
            failedTokens.push(tokenStrings[idx]);
          }
        }
      });

      if (failedTokens.length > 0) {
        await UserPushToken.updateMany(
          { fcmToken: { $in: failedTokens } },
          { $set: { isActive: false } }
        );
      }
    }

    // 7. Update UserNotification document push tracking status
    if (notificationId) {
      const status = response.successCount > 0 ? 'sent' : 'failed';
      await UserNotification.findByIdAndUpdate(notificationId, {
        pushSent: response.successCount > 0,
        pushStatus: status
      });
    }

    return {
      status: 'success',
      successCount: response.successCount,
      failureCount: response.failureCount
    };
  } catch (err) {
    console.error('[PushService] sendPushNotification error:', err.message);
    if (notificationId) {
      await UserNotification.findByIdAndUpdate(notificationId, { pushStatus: 'failed' }).catch(() => {});
    }
    return { status: 'error', message: err.message };
  }
};

module.exports = {
  registerPushToken,
  unregisterPushToken,
  sendPushNotification,
  PUSH_ELIGIBLE_TYPES
};
