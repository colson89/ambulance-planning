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

export async function sendPushToSubscriptions(
  subscriptions: DBPushSubscription[],
  payload: PushNotificationPayload
): Promise<void> {
  if (subscriptions.length === 0) {
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
  // Get all users from this station
  const users = await storage.getUsersByStation(stationId);
  
  // Collect all enabled subscriptions across all users
  const enabledSubscriptions: DBPushSubscription[] = [];
  for (const user of users) {
    const subscriptions = await storage.getAllPushSubscriptions(user.id);
    const userEnabledSubs = subscriptions.filter(
      sub => sub.notifyNewPlanningPublished
    );
    enabledSubscriptions.push(...userEnabledSubs);
  }

  if (enabledSubscriptions.length === 0) {
    return;
  }

  const monthNames = [
    'januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'
  ];

  await sendPushToSubscriptions(enabledSubscriptions, {
    title: 'Nieuwe Planning Gepubliceerd',
    body: `De planning voor ${monthNames[month - 1]} ${year} is beschikbaar.`,
    icon: '/icon-192x192.png',
    url: '/schedule',
    data: { type: 'new_planning', month, year, stationId }
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
  
  const monthNames = [
    'januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'
  ];
  
  // Get all users with deadline notifications enabled
  const allUsers = await storage.getAllUsers();
  
  for (const user of allUsers) {
    const subscriptions = await storage.getAllPushSubscriptions(user.id);
    const enabledSubscriptions = subscriptions.filter(
      sub => sub.notifyAvailabilityDeadline
    );
    
    if (enabledSubscriptions.length === 0) {
      continue;
    }
    
    // Group subscriptions by warning days to avoid duplicates
    const subscriptionsByWarningDays = new Map<number, DBPushSubscription[]>();
    for (const subscription of enabledSubscriptions) {
      const warningDays = subscription.deadlineWarningDays || 3;
      if (!subscriptionsByWarningDays.has(warningDays)) {
        subscriptionsByWarningDays.set(warningDays, []);
      }
      subscriptionsByWarningDays.get(warningDays)!.push(subscription);
    }
    
    // Check each warning period
    for (const [warningDays, subs] of subscriptionsByWarningDays) {
      const notificationDate = new Date(deadlineDate);
      notificationDate.setDate(notificationDate.getDate() - warningDays);
      
      // Check if today is the notification date
      if (
        currentDate.getDate() === notificationDate.getDate() &&
        currentDate.getMonth() === notificationDate.getMonth() &&
        currentDate.getFullYear() === notificationDate.getFullYear()
      ) {
        await sendPushToSubscriptions(subs, {
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

// Alias functions for use in routes
export const sendPlanningPublishedNotification = notifyNewPlanningPublished;

export async function sendShiftChangedNotification(
  userId: number,
  shift: { date: Date; type: 'day' | 'night' | 'day-half-1' | 'day-half-2' | 'night-half-1' | 'night-half-2' },
  action: 'assigned' | 'removed' = 'assigned'
): Promise<void> {
  const subscriptions = await storage.getAllPushSubscriptions(userId);
  const enabledSubscriptions = subscriptions.filter(
    sub => sub.notifyMyShiftChanged
  );

  if (enabledSubscriptions.length === 0) {
    return;
  }

  const dateStr = shift.date.toLocaleDateString('nl-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const shiftType = shift.type.startsWith('day') ? 'day' as const : 'night' as const;
  const shiftTypeText = shiftType === 'day' ? 'dagdienst' : 'nachtdienst';

  const title = action === 'assigned' ? 'Dienst Toegewezen' : 'Dienst Verwijderd';
  const body = action === 'assigned' 
    ? `Je bent ingepland voor een ${shiftTypeText} op ${dateStr}.`
    : `Je ${shiftTypeText} op ${dateStr} is niet meer toegewezen aan jou.`;

  await sendPushToSubscriptions(enabledSubscriptions, {
    title,
    body,
    icon: '/icon-192x192.png',
    url: '/schedule',
    data: { type: 'shift_changed', userId, shiftDate: shift.date.toISOString(), shiftType, action }
  });
}

// ========================================
// SHIFT SWAP NOTIFICATIONS
// ========================================

/**
 * Notify admins/supervisors about a new shift swap request
 */
export async function notifyNewShiftSwapRequest(
  stationId: number,
  requesterName: string,
  shiftDate: Date,
  shiftType: 'day' | 'night'
): Promise<void> {
  // Get all admin/supervisor users for this station
  const allUsers = await storage.getAllUsers();
  const adminUsers = allUsers.filter(
    u => (u.role === 'admin' || u.role === 'supervisor') && 
         (u.stationId === stationId || u.role === 'supervisor')
  );

  if (adminUsers.length === 0) {
    return;
  }

  const dateStr = shiftDate.toLocaleDateString('nl-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const shiftTypeText = shiftType === 'day' ? 'dagdienst' : 'nachtdienst';

  // Send to all admins/supervisors who have shift change notifications enabled
  for (const admin of adminUsers) {
    const subscriptions = await storage.getAllPushSubscriptions(admin.id);
    const enabledSubscriptions = subscriptions.filter(sub => sub.notifyMyShiftChanged);

    if (enabledSubscriptions.length > 0) {
      await sendPushToSubscriptions(enabledSubscriptions, {
        title: 'Nieuw Ruilverzoek',
        body: `${requesterName} wil de ${shiftTypeText} van ${dateStr} ruilen.`,
        icon: '/icon-192x192.png',
        url: '/shift-swaps',
        data: { type: 'shift_swap_request', stationId }
      });
    }
  }
}

/**
 * Notify users about shift swap request status changes
 */
export async function notifyShiftSwapStatusChanged(
  requesterId: number,
  targetUserId: number,
  shiftDate: Date,
  shiftType: 'day' | 'night',
  status: 'approved' | 'rejected',
  adminNote?: string
): Promise<void> {
  const dateStr = shiftDate.toLocaleDateString('nl-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const shiftTypeText = shiftType === 'day' ? 'dagdienst' : 'nachtdienst';

  // Notify requester
  const requesterSubscriptions = await storage.getAllPushSubscriptions(requesterId);
  const requesterEnabledSubs = requesterSubscriptions.filter(sub => sub.notifyMyShiftChanged);

  if (requesterEnabledSubs.length > 0) {
    const title = status === 'approved' ? 'Ruilverzoek Goedgekeurd' : 'Ruilverzoek Afgewezen';
    let body = status === 'approved'
      ? `Je ruilverzoek voor de ${shiftTypeText} op ${dateStr} is goedgekeurd.`
      : `Je ruilverzoek voor de ${shiftTypeText} op ${dateStr} is afgewezen.`;
    
    if (adminNote) {
      body += ` Opmerking: ${adminNote}`;
    }

    await sendPushToSubscriptions(requesterEnabledSubs, {
      title,
      body,
      icon: '/icon-192x192.png',
      url: '/dashboard',
      data: { type: 'shift_swap_status', status }
    });
  }

  // Notify target user if approved
  if (status === 'approved') {
    const targetSubscriptions = await storage.getAllPushSubscriptions(targetUserId);
    const targetEnabledSubs = targetSubscriptions.filter(sub => sub.notifyMyShiftChanged);

    if (targetEnabledSubs.length > 0) {
      await sendPushToSubscriptions(targetEnabledSubs, {
        title: 'Nieuwe Dienst Toegewezen',
        body: `Je hebt de ${shiftTypeText} op ${dateStr} overgenomen via een ruilverzoek.`,
        icon: '/icon-192x192.png',
        url: '/dashboard',
        data: { type: 'shift_swap_approved' }
      });
    }
  }
}
