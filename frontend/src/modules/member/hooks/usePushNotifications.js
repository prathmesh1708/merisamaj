import { useState, useEffect, useCallback } from 'react';
import {
  isPushSupportedBrowser,
  isPushConfigured,
  requestPushPermissionAndRegister
} from '../../../core/push/pushClient';

/**
 * Custom Hook for the Web Push permission prompt.
 * Device registration itself lives in core/push/pushClient.js.
 */
export const usePushNotifications = () => {
  const [permission, setPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [token, setToken]             = useState(null);

  useEffect(() => {
    const supported = isPushSupportedBrowser() && isPushConfigured();
    setIsSupported(supported);
    if (supported) setPermission(Notification.permission);
  }, []);

  const requestPushPermission = useCallback(async () => {
    if (!isSupported) {
      console.warn('[PushHook] Push notifications are not supported in this browser.');
      return false;
    }

    setLoading(true);
    try {
      const result = await requestPushPermissionAndRegister();
      setPermission(result.permission);
      if (result.token) {
        setToken(result.token);
        return true;
      }
      if (result.permission !== 'granted') {
        console.warn('[PushHook] Push notification permission denied by user.');
      }
      return false;
    } catch (err) {
      console.error('[PushHook] Error setting up push notifications:', err);
      return false;
    } finally {
      setLoading(false);
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
