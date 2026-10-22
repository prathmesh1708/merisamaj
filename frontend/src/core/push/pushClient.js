/**
 * pushClient.js
 * Web Push (Firebase Cloud Messaging) device registration, shared by the
 * permission prompt, the logged-in session bootstrap and logout.
 *
 * Flow: permission granted → register /firebase-messaging-sw.js → FCM getToken
 * (with the VAPID key) → POST the token to /member/notifications/push-token so the
 * backend can target this device. On logout the token is deactivated server-side
 * so the next person on this device doesn't receive the previous user's alerts.
 */
import { pushTokenService } from '../api/pushService';
import { getApiUrl } from '../api/axiosConfig';

// The worker gets the API address in its URL: it posts chat delivery receipts there
// the moment a push arrives (the "delivered" double tick), even with the app closed.
const SW_URL = `/firebase-messaging-sw.js?api=${encodeURIComponent(getApiUrl())}`;
// Not prefixed with merisamaj_ on purpose: clearAllUserData() wipes those on logout,
// and we need the token afterwards to deactivate it / re-link it on next login.
const TOKEN_KEY = 'push_fcm_token';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID
};
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const isPushConfigured = () =>
  !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId &&
     firebaseConfig.appId && VAPID_KEY);

/** Browser-level support (iOS Safari only supports it for installed home-screen apps). */
export const isPushSupportedBrowser = () =>
  typeof window !== 'undefined' &&
  window.isSecureContext &&
  'Notification' in window &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

const getStoredToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
const setStoredToken = (token) => {
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch {}
};

let messagingPromise = null;

// Lazily load Firebase (keeps it out of the main bundle) and reuse one app instance —
// calling initializeApp twice throws "Firebase App named '[DEFAULT]' already exists".
const getMessagingInstance = () => {
  if (!messagingPromise) {
    messagingPromise = (async () => {
      const [{ initializeApp, getApps, getApp }, { getMessaging, isSupported }] = await Promise.all([
        import('firebase/app'),
        import('firebase/messaging')
      ]);
      if (!(await isSupported())) return null;
      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      return getMessaging(app);
    })().catch((err) => {
      messagingPromise = null;
      throw err;
    });
  }
  return messagingPromise;
};

const getServiceWorkerRegistration = async () => {
  // register() is a no-op for the same script URL and updates the worker in place
  // (keeping its push subscription) when the URL changed
  const registration = await navigator.serviceWorker.register(SW_URL, { scope: '/' });
  // getToken needs an *active* worker; a freshly registered one may still be installing
  await navigator.serviceWorker.ready;
  return registration;
};

/**
 * Get this device's FCM token and link it to the logged-in user on the backend.
 * Only runs when notification permission is already granted — it never prompts.
 * Returns the token, or null when push isn't available.
 */
export const registerPushDevice = async () => {
  if (!isPushSupportedBrowser() || !isPushConfigured()) return null;
  if (Notification.permission !== 'granted') return null;

  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  const { getToken } = await import('firebase/messaging');
  const registration = await getServiceWorkerRegistration();
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) return null;

  // Always (re)send: the backend upserts by token, so this also moves a shared
  // device over to whoever is logged in now and re-activates a deactivated token.
  await pushTokenService.registerToken(token, 'web');
  setStoredToken(token);
  return token;
};

/**
 * Ask for permission (must be called from a user gesture), then register the device.
 * Returns { permission, token }.
 */
export const requestPushPermissionAndRegister = async () => {
  if (!isPushSupportedBrowser()) return { permission: 'unsupported', token: null };
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { permission, token: null };
  const token = await registerPushDevice();
  return { permission, token };
};

/**
 * Stop sending pushes for the current user to this device. Call BEFORE the auth
 * token is cleared — the auth token is captured synchronously so the request
 * still authenticates even if storage is wiped right after this call.
 */
export const unregisterPushDevice = (authToken) => {
  const token = getStoredToken();
  if (!token) return Promise.resolve();
  const bearer = authToken ||
    (() => { try { return localStorage.getItem('merisamaj_token') || localStorage.getItem('head_auth_token'); } catch { return null; } })();
  if (!bearer) return Promise.resolve();
  const request = pushTokenService.unregisterToken(token, { Authorization: `Bearer ${bearer}` }).catch(() => {});
  // Never hold up logout for more than a few seconds on a slow network
  return Promise.race([request, new Promise(resolve => setTimeout(resolve, 3000))]);
};
