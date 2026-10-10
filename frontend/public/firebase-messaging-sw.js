/* eslint-disable no-undef */
/**
 * firebase-messaging-sw.js
 * Service Worker for Firebase Web Push Notifications in ApniSamaj.
 * Handles background push payloads when app is closed or backgrounded.
 */

// Import Firebase scripts for Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Handle background push messages
self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const notificationTitle = payload.notification?.title || payload.data?.title || 'ApniSamaj Alert';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.message || '',
      icon: payload.data?.icon || '/pwa-192x192.png',
      badge: '/badge-72x72.png',
      data: {
        actionUrl: payload.data?.actionUrl || '/member/notifications',
        notificationId: payload.data?.notificationId
      },
      tag: payload.data?.type || 'merisamaj-notification',
      renotify: true
    };

    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  } catch (err) {
    console.error('[ServiceWorker] Push event handling error:', err);
  }
});

// Handle notification click to navigate user
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = event.notification.data?.actionUrl || '/member/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
