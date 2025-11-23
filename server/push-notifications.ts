import webpush from 'web-push';
import { storage } from './storage';
import type { PushSubscription as DBPushSubscription } from '../shared/schema';

// Initialize VAPID details
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidContact = process.env.VAPID_CONTACT_EMAIL || 'mailto:planning@brandweerzonekempen.be';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidContact,
    vapidPublicKey,
    vapidPrivateKey
  );
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: Record<string, any>;
}

export async function sendPushNotification(
  subscription: DBPushSubscription,
  payload: PushNotificationPayload
): Promise<void> {
  const pushSubscription: webpush.PushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth
    }
  };

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icon-192x192.png',
    badge: payload.badge || '/badge-72x72.png',
    url: payload.url || '/',
    data: payload.data || {}
  });

  try {
    await webpush.sendNotification(pushSubscription, notificationPayload);
    console.log(`✓ Push notification sent to user ${subscription.userId}`);
  } catch (error: any) {
    console.error(`✗ Failed to send push notification to user ${subscription.userId}:`, error);
    
    // If subscription is no longer valid (410 Gone), delete it
    if (error.statusCode === 410) {
      console.log(`  Removing expired subscription for user ${subscription.userId}`);
      await storage.deletePushSubscription(subscription.userId, subscription.endpoint);
    }
    
    throw error;
  }
}

export async function sendPushToUser(
  userId: number,
  payload: PushNotificationPayload
): Promise<void> {
  const subscriptions = await storage.getAllPushSubscriptions(userId);
  
  if (subscriptions.length === 0) {
    console.log(`No push subscriptions found for user ${userId}`);
    return;
  }

  const promises = subscriptions.map(sub => 
    sendPushNotification(sub, payload).catch(err => {
      console.error(`Failed to send to subscription ${sub.endpoint}:`, err);
    })
  );

  await Promise.all(promises);
}

export async function sendPushToMultipleUsers(
  userIds: number[],
  payload: PushNotificationPayload
): Promise<void> {
  const promises = userIds.map(userId => 
    sendPushToUser(userId, payload).catch(err => {
      console.error(`Failed to send notification to user ${userId}:`, err);
    })
  );

  await Promise.all(promises);
}

// Notification helpers for specific events
export async function notifyNewPlanningPublished(
  stationId: number,
  month: number,
  year: number
): Promise<void> {
  // Get all users from this station with newPlanningPublished enabled
  const users = await storage.getUsersByStation(stationId);
  
  const subscribedUserIds: number[] = [];
  for (const user of users) {
    const subscriptions = await storage.getAllPushSubscriptions(user.id);
    const hasEnabledSubscription = subscriptions.some(
      sub => sub.notifyNewPlanningPublished
    );
    if (hasEnabledSubscription) {
      subscribedUserIds.push(user.id);
    }
  }

  if (subscribedUserIds.length === 0) {
    return;
  }

  const monthNames = [
    'januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'
  ];

  await sendPushToMultipleUsers(subscribedUserIds, {
    title: 'Nieuwe Planning Gepubliceerd',
    body: `De planning voor ${monthNames[month - 1]} ${year} is beschikbaar.`,
    icon: '/icon-192x192.png',
    url: '/schedule',
    data: { type: 'new_planning', month, year, stationId }
  });
}

export async function notifyShiftChanged(
  userId: number,
  shiftDate: Date,
  shiftType: 'day' | 'night'
): Promise<void> {
  const subscriptions = await storage.getAllPushSubscriptions(userId);
  const enabledSubscriptions = subscriptions.filter(
    sub => sub.notifyMyShiftChanged
  );

  if (enabledSubscriptions.length === 0) {
    return;
  }

  const dateStr = shiftDate.toLocaleDateString('nl-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const shiftTypeText = shiftType === 'day' ? 'dagdienst' : 'nachtdienst';

  await sendPushToUser(userId, {
    title: 'Dienst Gewijzigd',
    body: `Je ${shiftTypeText} op ${dateStr} is gewijzigd.`,
    icon: '/icon-192x192.png',
    url: '/schedule',
    data: { type: 'shift_changed', userId, shiftDate: shiftDate.toISOString(), shiftType }
  });
}

export async function checkAndNotifyDeadlines(): Promise<void> {
  // Get current deadline from system settings
  const deadlineDays = await storage.getSystemSetting('deadline_days');
  const parsedDeadlineDays = deadlineDays ? parseInt(deadlineDays, 10) : 21;
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  
  // Calculate next month
  let nextMonth = currentMonth + 1;
  let nextYear = currentYear;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }
  
  // Calculate deadline date for next month
  const deadlineDate = new Date(nextYear, nextMonth - 1, 1);
  deadlineDate.setDate(deadlineDate.getDate() - parsedDeadlineDays);
  
  // Get all users with deadline notifications enabled
  const allUsers = await storage.getAllUsers();
  
  for (const user of allUsers) {
    const subscriptions = await storage.getAllPushSubscriptions(user.id);
    
    for (const subscription of subscriptions) {
      if (!subscription.notifyAvailabilityDeadline) {
        continue;
      }
      
      const warningDays = subscription.deadlineWarningDays || 3;
      const notificationDate = new Date(deadlineDate);
      notificationDate.setDate(notificationDate.getDate() - warningDays);
      
      // Check if today is the notification date
      if (
        currentDate.getDate() === notificationDate.getDate() &&
        currentDate.getMonth() === notificationDate.getMonth() &&
        currentDate.getFullYear() === notificationDate.getFullYear()
      ) {
        const monthNames = [
          'januari', 'februari', 'maart', 'april', 'mei', 'juni',
          'juli', 'augustus', 'september', 'oktober', 'november', 'december'
        ];
        
        await sendPushToUser(user.id, {
          title: 'Deadline Beschikbaarheid Nadert',
          body: `Je hebt nog ${warningDays} dagen om je beschikbaarheid voor ${monthNames[nextMonth - 1]} ${nextYear} in te vullen.`,
          icon: '/icon-192x192.png',
          url: '/preferences',
          data: { 
            type: 'deadline_warning', 
            month: nextMonth, 
            year: nextYear,
            daysRemaining: warningDays
          }
        });
      }
    }
  }
}

export function getVapidPublicKey(): string {
  return vapidPublicKey;
}
