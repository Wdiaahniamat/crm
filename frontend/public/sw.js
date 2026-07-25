// Service Worker for Native OS Desktop and Mobile Push Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen to incoming push events from backend
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'CRM Notification', body: event.data.text() };
    }
  } else {
    data = { title: 'CRM Notification', body: 'You have a new message or update.' };
  }

  const title = data.title || 'CRM Dashboard';
  const options = {
    body: data.body || '',
    tag: data.type || 'crm-notification',
    requireInteraction: true,
    data: {
      url: data.url || '/',
      timestamp: data.timestamp || Date.now(),
      type: data.type || 'general'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options).catch((err) => {
      console.error('[SW PUSH ERROR]', err);
      return self.registration.showNotification(title, { body: data.body || '' });
    })
  );
});

// Handle user clicking on the notification toast
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the app
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // If no open window found, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
