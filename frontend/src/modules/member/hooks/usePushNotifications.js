import { useState, useEffect, useCallback } from 'react';
import { pushTokenService } from '../../../core/api/pushService';

/**
 * Custom Hook for Web Push Permission Request & FCM Token Lifecycle.
 * References VITE_FIREBASE_* via import.meta.env
 */
export const usePushNotifications = () => {
  const [permission, setPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [token, setToken]             = useState(null);

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPushPermission = useCallback(async () => {
    if (!isSupported) {
      console.warn('[PushHook] Push notifications are not supported in this browser.');
      return false;
    }

    setLoading(true);
    try {
      // 1. Request Browser Permission
      const resPermission = await Notification.requestPermission();
      setPermission(resPermission);

      if (resPermission !== 'granted') {
        console.warn('[PushHook] Push notification permission denied by user.');
        setLoading(false);
        return false;
      }

      // 2. Dynamically import Firebase Messaging to avoid bundling issues if unsupported
      const { initializeApp } = await import('firebase/app');
      const { getMessaging, getToken } = await import('firebase/messaging');

      const firebaseConfig = {
        apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId:             import.meta.env.VITE_FIREBASE_APP_ID
      };

      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

      if (!firebaseConfig.projectId || !vapidKey) {
        console.warn('[PushHook] Firebase VITE_FIREBASE_* env credentials missing. Push subscription skipped.');
        setLoading(false);
        return false;
      }

      const app = initializeApp(firebaseConfig);
      const messaging = getMessaging(app);

      // Register service worker if not already registered
      let swRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      if (!swRegistration) {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      }

      // 3. Obtain FCM Registration Token
      const currentToken = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: swRegistration
      });

      if (currentToken) {
        setToken(currentToken);
        // 4. Send token to backend API
        await pushTokenService.registerToken(currentToken, 'web');
        console.log('[PushHook] Web Push Token registered successfully.');
        setLoading(false);
        return true;
      } else {
        console.warn('[PushHook] No FCM registration token available.');
        setLoading(false);
        return false;
      }
    } catch (err) {
      console.error('[PushHook] Error setting up push notifications:', err);
      setLoading(false);
      return false;
    }
  }, [isSupported]);

  return {
    isSupported,
    permission,
    loading,
    token,
    requestPushPermission
  };
};

export default usePushNotifications;
