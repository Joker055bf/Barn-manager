importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// Parse query parameters from self.location.search
const getParams = () => {
  const params = {};
  const search = self.location.search;
  if (search) {
    const parts = search.substring(1).split('&');
    for (var i = 0; i < parts.length; i++) {
      const pair = parts[i].split('=');
      if (pair.length === 2) {
        params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
      }
    }
  }
  return params;
};

const params = getParams();
const customApiKey = params.apiKey;

const firebaseConfig = {
  apiKey: (customApiKey && customApiKey.trim()) ? customApiKey.trim() : "AIzaSyDN_EfGYKfKC7UKFnNkSN1X5Wy9CljQtpA",
  authDomain: "barn-manager-c311f.firebaseapp.com",
  projectId: "barn-manager-c311f",
  storageBucket: "barn-manager-c311f.firebasestorage.app",
  messagingSenderId: "703014749431",
  appId: "1:703014749431:web:dcd3c0827562b9d6e43ff2",
  measurementId: "G-NF8SX1XMRL"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Set App Badge if supported
  if ('setAppBadge' in navigator) {
    navigator.setAppBadge(1).catch(console.error);
  }

  const notificationTitle = payload.notification?.title || 'رسالة جديدة';
  const notificationOptions = {
    body: payload.notification?.body || 'لديك رسالة جديدة في مدير الحظائر',
    icon: '/vite.svg',
    badge: '/vite.svg',
    dir: 'rtl',
    vibrate: [200, 100, 200]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // Check if there is already a window/tab open with the target URL
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.indexOf('/') !== -1 && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, then open the target URL in a new window/tab.
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
