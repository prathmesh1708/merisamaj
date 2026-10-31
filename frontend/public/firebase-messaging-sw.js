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
 *   { notification: { title, body, image? }, data: { type, icon, actionUrl, notificationId, tag, ack, image } }
 */

// Drop your app logo here (192×192 PNG) to show it on notifications.
// If the file is missing the browser simply shows the notification without an icon.
const DEFAULT_ICON = '/notification-icon.png';

// API base passed by the app when registering this worker (see core/push/pushClient.js)
const API_BASE = (() => {
  const api = new URL(self.location.href).searchParams.get('api') || '/api/v1';
  return new URL(api, self.location.origin).href.replace(/\/$/, '');
})();

// Tell the server this phone received the chat message → sender sees the grey
// double tick, even though the app is closed. The receipt is signed by the server.
const sendDeliveryReceipt = (ack) =>
  fetch(`${API_BASE}/chat/delivery-ack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ack }),
    credentials: 'omit',
    keepalive: true
  }).catch(() => {});

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
    // Big picture under the text (admin broadcast posters); Chrome/Edge show it, others ignore it
    ...(data.image || payload.notification?.image ? { image: data.image || payload.notification.image } : {}),
    data: {
      actionUrl: data.actionUrl || (data.type === 'admin_broadcast' ? '/member/home' : '/member/notifications'),
      notificationId: data.notificationId
    },
    // Chats share one tag per conversation, so new messages replace the old pop-up
    // (and still buzz via renotify); other alerts each get their own.
    tag: data.tag || data.notificationId || `${data.type || 'merisamaj'}-${Date.now()}`,
    renotify: Boolean(data.tag),
    requireInteraction: data.type === 'emergency_alert'
  };

  const receipt = data.ack ? sendDeliveryReceipt(data.ack) : Promise.resolve();

  event.waitUntil(Promise.all([receipt,
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // The app is open and on screen — it already shows the message live, so skip the pop-up
      const appVisible = clientList.some((c) => c.visibilityState === 'visible' && c.focused);
      if (appVisible) return undefined;
      return self.registration.showNotification(title, options);
    })
  ]));
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
