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

type StationNotificationType = 'notifyNewPlanningPublished' | 'notifyShiftSwapUpdates' | 'notifyBidUpdates' | 'notifyOpenSwapRequests';

/**
 * Check if a user wants notifications for a specific station and notification type.
 * Returns true if:
 * 1. User has no station-specific preference (defaults to enabled)
 * 2. User has explicitly enabled this notification type for this station
 */
async function shouldNotifyUserForStation(
  userId: number, 
  stationId: number, 
  notificationType: StationNotificationType
): Promise<boolean> {
  const pref = await storage.getUserStationNotificationPreference(userId, stationId);
  
  if (!pref) {
    return true;
  }
  
  return pref[notificationType] === true;
}

/**
 * Get all users who should receive notifications for a station.
 * This includes:
 * 1. Users from the station itself
 * 2. Cross-team users with access to the station
 * 3. Supervisors (who have access to all stations)
 */
async function getUsersForStationNotification(
  stationId: number,
  notificationType: StationNotificationType
): Promise<number[]> {
  const allUsers = await storage.getAllUsers();
  const eligibleUserIds: number[] = [];
  
  for (const user of allUsers) {
    let hasAccess = false;
    
    if (user.stationId === stationId) {
      hasAccess = true;
    } else if (user.role === 'supervisor') {
      hasAccess = true;
    } else {
      // getUserAllStations returns number[] (array of station IDs)
      const userStationIds = await storage.getUserAllStations(user.id);
      hasAccess = userStationIds.includes(stationId);
    }
    
    if (hasAccess) {
      const wantsNotification = await shouldNotifyUserForStation(user.id, stationId, notificationType);
      if (wantsNotification) {
        eligibleUserIds.push(user.id);
      }
    }
  }
  
  return eligibleUserIds;
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

/**
 * Send push notification to a specific user with optional preference filtering
 * Used for bid notifications and other specific notification types
 */
export async function sendPushNotificationToUser(
  userId: number,
  title: string,
  body: string,
  url: string = '/dashboard',
  preferenceFilter?: 'notifyBidUpdates' | 'notifyShiftSwapUpdates' | 'notifyMyShiftChanged' | 'notifyNewPlanningPublished'
): Promise<void> {
  const subscriptions = await storage.getAllPushSubscriptions(userId);
  
  if (subscriptions.length === 0) {
    console.log(`No push subscriptions found for user ${userId}`);
    return;
  }

  // Filter by preference if specified
  let enabledSubs = subscriptions;
  if (preferenceFilter) {
    enabledSubs = subscriptions.filter(sub => sub[preferenceFilter]);
  }

  if (enabledSubs.length === 0) {
    console.log(`No enabled subscriptions for user ${userId} with preference ${preferenceFilter}`);
    return;
  }

  await sendPushToSubscriptions(enabledSubs, {
    title,
    body,
    icon: '/icon-192x192.png',
    url,
    data: { type: preferenceFilter || 'general' }
  });
}

// Notification helpers for specific events
export async function notifyNewPlanningPublished(
  stationId: number,
  month: number,
  year: number
): Promise<void> {
  // Get station for display name
  const station = await storage.getStation(stationId);
  const stationPrefix = station ? `[${station.displayName}] ` : '';
  
  // Get all users who should receive this notification (includes cross-team and supervisors)
  const eligibleUserIds = await getUsersForStationNotification(stationId, 'notifyNewPlanningPublished');
  
  // Collect all enabled subscriptions across all eligible users
  const enabledSubscriptions: DBPushSubscription[] = [];
  for (const userId of eligibleUserIds) {
    const subscriptions = await storage.getAllPushSubscriptions(userId);
    const userEnabledSubs = subscriptions.filter(
      sub => sub.notifyNewPlanningPublished
    );
    enabledSubscriptions.push(...userEnabledSubs);
  }

  if (enabledSubscriptions.length === 0) {
    console.log(`No eligible users for new planning notification for station ${stationId}`);
    return;
  }

  const monthNames = [
    'januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'
  ];

  console.log(`Sending new planning notification to ${enabledSubscriptions.length} subscriptions for station ${stationId}`);
  
  await sendPushToSubscriptions(enabledSubscriptions, {
    title: `${stationPrefix}Nieuwe Planning Gepubliceerd`,
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
    
    // Get all stations this user has access to (primary + cross-team)
    const userStationIds = await storage.getUserAllStations(user.id);
    
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
        // Send a separate notification for EACH station the user has access to
        for (const stationId of userStationIds) {
          const station = await storage.getStation(stationId);
          const stationPrefix = station ? `[${station.displayName}] ` : '';
          
          await sendPushToSubscriptions(subs, {
            title: `${stationPrefix}Deadline Beschikbaarheid Nadert`,
            body: `Je hebt nog ${warningDays} dagen om je beschikbaarheid voor ${monthNames[nextMonth - 1]} ${nextYear} in te vullen.`,
            icon: '/icon-192x192.png',
            url: '/preferences',
            data: { 
              type: 'deadline_warning', 
              month: nextMonth, 
              year: nextYear,
              daysRemaining: warningDays,
              stationId: stationId
            }
          });
        }
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
  shift: { date: Date; type: 'day' | 'night' | 'day-half-1' | 'day-half-2' | 'night-half-1' | 'night-half-2'; stationId?: number },
  action: 'assigned' | 'removed' = 'assigned'
): Promise<void> {
  const subscriptions = await storage.getAllPushSubscriptions(userId);
  const enabledSubscriptions = subscriptions.filter(
    sub => sub.notifyMyShiftChanged
  );

  if (enabledSubscriptions.length === 0) {
    return;
  }

  // Get station for display name
  let stationPrefix = '';
  if (shift.stationId) {
    const station = await storage.getStation(shift.stationId);
    if (station) {
      stationPrefix = `[${station.displayName}] `;
    }
  }

  const dateStr = shift.date.toLocaleDateString('nl-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const shiftType = shift.type.startsWith('day') ? 'day' as const : 'night' as const;
  const shiftTypeText = shiftType === 'day' ? 'dagdienst' : 'nachtdienst';

  const baseTitle = action === 'assigned' ? 'Dienst Toegewezen' : 'Dienst Verwijderd';
  const title = `${stationPrefix}${baseTitle}`;
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
 * Uses station-specific notification preferences for cross-team and supervisors
 */
export async function notifyNewShiftSwapRequest(
  stationId: number,
  requesterName: string,
  shiftDate: Date,
  shiftType: 'day' | 'night'
): Promise<void> {
  // Get station for display name
  const station = await storage.getStation(stationId);
  const stationPrefix = station ? `[${station.displayName}] ` : '';
  
  // Get all admin/supervisor users who should receive notifications for this station
  const allUsers = await storage.getAllUsers();
  const adminUsers = allUsers.filter(
    u => u.role === 'admin' || u.role === 'supervisor'
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

  // Send to all admins/supervisors who have access to this station and have notifications enabled
  for (const admin of adminUsers) {
    // Check if admin has access to this station
    let hasAccess = admin.stationId === stationId || admin.role === 'supervisor';
    if (!hasAccess) {
      // getUserAllStations returns number[] (array of station IDs)
      const adminStationIds = await storage.getUserAllStations(admin.id);
      hasAccess = adminStationIds.includes(stationId);
    }
    
    if (!hasAccess) continue;
    
    // Check station-specific preference
    const wantsNotification = await shouldNotifyUserForStation(admin.id, stationId, 'notifyShiftSwapUpdates');
    if (!wantsNotification) continue;
    
    const subscriptions = await storage.getAllPushSubscriptions(admin.id);
    const enabledSubscriptions = subscriptions.filter(sub => sub.notifyShiftSwapUpdates);

    if (enabledSubscriptions.length > 0) {
      await sendPushToSubscriptions(enabledSubscriptions, {
        title: `${stationPrefix}Nieuw Ruilverzoek`,
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
  adminNote?: string,
  stationId?: number
): Promise<void> {
  // Get station for display name
  let stationPrefix = '';
  if (stationId) {
    const station = await storage.getStation(stationId);
    if (station) {
      stationPrefix = `[${station.displayName}] `;
    }
  }

  const dateStr = shiftDate.toLocaleDateString('nl-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const shiftTypeText = shiftType === 'day' ? 'dagdienst' : 'nachtdienst';

  // Notify requester
  const requesterSubscriptions = await storage.getAllPushSubscriptions(requesterId);
  const requesterEnabledSubs = requesterSubscriptions.filter(sub => sub.notifyShiftSwapUpdates);

  if (requesterEnabledSubs.length > 0) {
    const baseTitle = status === 'approved' ? 'Ruilverzoek Goedgekeurd' : 'Ruilverzoek Afgewezen';
    const title = `${stationPrefix}${baseTitle}`;
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
    const targetEnabledSubs = targetSubscriptions.filter(sub => sub.notifyShiftSwapUpdates);

    if (targetEnabledSubs.length > 0) {
      await sendPushToSubscriptions(targetEnabledSubs, {
        title: `${stationPrefix}Nieuwe Dienst Toegewezen`,
        body: `Je hebt de ${shiftTypeText} op ${dateStr} overgenomen via een ruilverzoek.`,
        icon: '/icon-192x192.png',
        url: '/dashboard',
        data: { type: 'shift_swap_approved' }
      });
    }
  }
}
