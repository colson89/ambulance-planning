// Push Notifications Client Library

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
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

export async function isPushSupported(): Promise<boolean> {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function getPermissionStatus(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications worden niet ondersteund in deze browser');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  try {
    const supported = await isPushSupported();
    if (!supported) {
      throw new Error('Push notificaties worden niet ondersteund in deze browser');
    }

    // Request permission if not granted
    const permission = await getPermissionStatus();
    if (permission !== 'granted') {
      const newPermission = await requestNotificationPermission();
      if (newPermission !== 'granted') {
        throw new Error('Notificatie toestemming geweigerd');
      }
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Get VAPID public key from server
    const response = await fetch('/api/push/vapid-public-key');
    const vapidPublicKey = await response.text();
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    // Send subscription to server
    const serverResponse = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth'))
        }
      })
    });

    if (!serverResponse.ok) {
      // If server fails, unsubscribe from push manager to stay in sync
      await subscription.unsubscribe();
      const errorData = await serverResponse.json().catch(() => ({ message: 'Server error' }));
      throw new Error(errorData.message || 'Kon subscriptie niet opslaan op de server');
    }

    console.log('✓ Push notification subscription successful');
    return subscription;
  } catch (error) {
    console.error('✗ Failed to subscribe to push notifications:', error);
    throw error;
  }
}

export async function unsubscribeFromPushNotifications(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Unsubscribe from push manager
      await subscription.unsubscribe();

      // Notify server
      const serverResponse = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });

      if (!serverResponse.ok) {
        const errorData = await serverResponse.json().catch(() => ({ message: 'Server error' }));
        throw new Error(errorData.message || 'Kon unsubscribe niet verwerken op de server');
      }

      console.log('✓ Unsubscribed from push notifications');
    }
  } catch (error) {
    console.error('✗ Failed to unsubscribe from push notifications:', error);
    throw error;
  }
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  try {
    const supported = await isPushSupported();
    if (!supported) {
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error('Failed to get current subscription:', error);
    return null;
  }
}

export async function updatePushPreferences(
  endpoint: string,
  preferences: {
    notifyNewPlanningPublished?: boolean;
    notifyMyShiftChanged?: boolean;
    notifyAvailabilityDeadline?: boolean;
    notifyShiftSwapUpdates?: boolean;
    notifyBidUpdates?: boolean;
    deadlineWarningDays?: number;
  }
): Promise<void> {
  try {
    const response = await fetch('/api/push/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, preferences })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Server error' }));
      throw new Error(errorData.message || 'Kon voorkeuren niet opslaan');
    }

    console.log('✓ Push preferences updated');
  } catch (error) {
    console.error('✗ Failed to update push preferences:', error);
    throw error;
  }
}

export async function sendTestNotification(): Promise<void> {
  try {
    const response = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Server error' }));
      throw new Error(errorData.message || 'Kon test notificatie niet versturen');
    }

    console.log('✓ Test notification sent');
  } catch (error) {
    console.error('✗ Failed to send test notification:', error);
    throw error;
  }
}

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) {
    return '';
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
