// Helper for Web Push Notification management in Frontend
import api from '../api';

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function registerServiceWorker() {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[SW] Service Worker registered with scope:', registration.scope);
    return registration;
  } catch (err) {
    console.error('[SW] Service Worker registration failed:', err);
    return null;
  }
}

export async function getPushSubscriptionStatus() {
  if (!isPushSupported()) return { supported: false, permission: 'denied', subscribed: false };
  const permission = Notification.permission;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = registration ? await registration.pushManager.getSubscription() : null;
  return {
    supported: true,
    permission,
    subscribed: !!subscription,
    subscription
  };
}

export async function subscribeToPushNotifications() {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  // 1. Request Browser Permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was denied by the user.');
  }

  // 2. Register Service Worker
  const registration = await registerServiceWorker();
  if (!registration) {
    throw new Error('Failed to register Service Worker.');
  }

  // 3. Fetch VAPID Public Key from Backend via api instance
  const res = await api.get('/notifications/vapid-public-key');
  const publicKey = res.data?.publicKey;
  if (!publicKey) {
    throw new Error('VAPID public key not received.');
  }

  const convertedVapidKey = urlBase64ToUint8Array(publicKey);

  // 4. Subscribe with PushManager
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });
  }

  // 5. Send Push Subscription Payload to Backend DB via api instance
  const subJson = subscription.toJSON();
  await api.post('/notifications/subscribe', subJson);

  return subscription;
}

export async function unsubscribeFromPushNotifications() {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  if (!registration) return;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await api.post('/notifications/unsubscribe', { endpoint });
  }
}

export async function sendTestPushNotification() {
  const res = await api.post('/notifications/test-push');
  return res.data;
}
