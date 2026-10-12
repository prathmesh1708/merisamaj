/* eslint-disable no-undef */
/**
 * firebase-messaging-sw.js
 * Service Worker for Firebase Web Push Notifications in ApniSamaj.
 *
 * FCM delivers web pushes as standard Push API events, so this worker handles them
 * directly — no Firebase SDK is needed here (the old importScripts of the SDK from
 * gstatic was unused, and if that CDN was blocked the whole worker failed to install).
 *
 * Payload sent by backend/src/services/pushNotificationService.js:
 *   { notification: { title, body }, data: { type, icon, actionUrl, notificationId } }
 */

// Drop your app logo here (192×192 PNG) to show it on notifications.
// If the file is missing the browser simply shows the notification without an icon.
const DEFAULT_ICON = '/notification-icon.png';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// data.icon is an emoji in the in-app list (e.g. "🔔"), not an image — only use real URLs
const resolveIcon = (icon) =>
  typeof icon === 'string' && (/^https?:\/\//.test(icon) || icon.startsWith('/')) ? icon : DEFAULT_ICON;

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (err) {
    payload = { notification: { title: 'ApniSamaj', body: event.data.text() } };
  }

  const data = payload.data || {};
  const title = payload.notification?.title || data.title || 'ApniSamaj Alert';
  const options = {
    body: payload.notification?.body || data.message || '',
    icon: resolveIcon(data.icon),
    data: {
      actionUrl: data.actionUrl || '/member/notifications',
      notificationId: data.notificationId
    },
    // Unique tag per notification so several alerts don't overwrite each other
    tag: data.notificationId || `${data.type || 'merisamaj'}-${Date.now()}`,
    requireInteraction: data.type === 'emergency_alert'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Open (or focus) the app at the notification's target page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.actionUrl || '/member/notifications', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const appClient = clientList.find((c) => new URL(c.url).origin === self.location.origin);
      if (appClient) {
        return appClient.focus().then((client) => (client && 'navigate' in client ? client.navigate(targetUrl) : client));
      }
      return clients.openWindow ? clients.openWindow(targetUrl) : undefined;
    })
  );
});
