importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDN_EfGYKfKC7UKFnNkSN1X5Wy9CljQtpA",
  authDomain: "barn-manager-c311f.firebaseapp.com",
  projectId: "barn-manager-c311f",
  storageBucket: "barn-manager-c311f.firebasestorage.app",
  messagingSenderId: "703014749431",
  appId: "1:703014749431:web:dcd3c0827562b9d6e43ff2",
  measurementId: "G-NF8SX1XMRL"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Resolved against this worker's scope so it works at a domain root and under a GitHub Pages subpath.
const APP_URL = self.registration.scope;
const ICON_URL = new URL('icons/icon-192.png', APP_URL).href;

messaging.onBackgroundMessage((payload) => {
  if ('setAppBadge' in navigator) {
    navigator.setAppBadge(1).catch(() => {});
  }

  // Messages with a `notification` block are already displayed by the FCM SDK;
  // showing them again here produced every notification twice.
  if (payload.notification) return;

  const data = payload.data || {};
  self.registration.showNotification(data.title || 'رسالة جديدة', {
    body: data.body || 'لديك رسالة جديدة في مدير الحظائر',
    icon: ICON_URL,
    badge: ICON_URL,
    dir: 'rtl',
    vibrate: [200, 100, 200]
  });
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.startsWith(APP_URL) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(APP_URL);
      }
    })
  );
});

// Force immediate update and activation of the new service worker
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});
