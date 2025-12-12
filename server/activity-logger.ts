/**
 * Activity Logger - Audit Trail for User Actions
 * 
 * Logs all important user activities for admin/supervisor review.
 * Categories: auth, preferences, schedule, users, settings, verdi, overtime, other
 */

import { db } from "./db";
import { activityLogs, type InsertActivityLog } from "@shared/schema";
import { desc, eq, and, gte, lte, sql, inArray } from "drizzle-orm";

export type ActivityCategory = "LOGIN" | "LOGOUT" | "PREFERENCE" | "SCHEDULE" | "SHIFT_SWAP" | "SHIFT_MANUAL" | "SHIFT_BID" | "USER_MANAGEMENT" | "SETTINGS" | "VERDI" | "OVERTIME" | "PROFILE" | "OTHER";

interface LogActivityParams {
  userId?: number | null;
  stationId?: number | null;
  action: string;
  category: ActivityCategory;
  details?: string | null;
  targetUserId?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceType?: string | null;
  deviceOS?: string | null;
  location?: string | null;
}

interface DeviceInfo {
  deviceType: string;
  deviceOS: string;
}

function parseUserAgent(userAgent: string): DeviceInfo {
  let deviceType = 'Onbekend';
  let deviceOS = 'Onbekend';

  if (!userAgent || userAgent === 'unknown') {
    return { deviceType, deviceOS };
  }

  const ua = userAgent.toLowerCase();

  // Detect specific mobile devices first
  if (/pixel\s*(\d+\s*\w*)/i.test(userAgent)) {
    const match = userAgent.match(/pixel\s*(\d+\s*\w*)/i);
    deviceType = `Google Pixel ${match?.[1] || ''}`.trim();
  } else if (/sm-[a-z]\d+/i.test(userAgent)) {
    // Samsung Galaxy devices
    const match = userAgent.match(/sm-([a-z]\d+)/i);
    deviceType = `Samsung Galaxy ${match?.[1]?.toUpperCase() || ''}`.trim();
  } else if (/samsung/i.test(userAgent)) {
    deviceType = 'Samsung';
  } else if (/iphone/i.test(userAgent)) {
    deviceType = 'iPhone';
  } else if (/ipad/i.test(userAgent)) {
    deviceType = 'iPad';
  } else if (/huawei/i.test(userAgent)) {
    deviceType = 'Huawei';
  } else if (/xiaomi|redmi|poco/i.test(userAgent)) {
    deviceType = 'Xiaomi';
  } else if (/oneplus/i.test(userAgent)) {
    deviceType = 'OnePlus';
  } else if (/oppo/i.test(userAgent)) {
    deviceType = 'Oppo';
  } else if (/vivo/i.test(userAgent)) {
    deviceType = 'Vivo';
  } else if (/nokia/i.test(userAgent)) {
    deviceType = 'Nokia';
  } else if (/motorola|moto\s/i.test(userAgent)) {
    deviceType = 'Motorola';
  } else if (ua.includes('android') && ua.includes('mobile')) {
    deviceType = 'Android Telefoon';
  } else if (ua.includes('android') && ua.includes('tablet')) {
    deviceType = 'Android Tablet';
  } else if (ua.includes('android')) {
    deviceType = 'Android Toestel';
  } else if (ua.includes('macintosh') || ua.includes('mac os')) {
    deviceType = 'Mac';
  } else if (ua.includes('windows')) {
    deviceType = 'Windows PC';
  } else if (ua.includes('linux')) {
    deviceType = 'Linux PC';
  } else if (ua.includes('cros')) {
    deviceType = 'Chromebook';
  }

  // Detect OS
  if (/android\s*([\d.]+)?/i.test(userAgent)) {
    const match = userAgent.match(/android\s*([\d.]+)?/i);
    deviceOS = `Android ${match?.[1] || ''}`.trim();
  } else if (/iphone os\s*([\d_]+)/i.test(userAgent) || /cpu os\s*([\d_]+)/i.test(userAgent)) {
    const match = userAgent.match(/(?:iphone os|cpu os)\s*([\d_]+)/i);
    const version = match?.[1]?.replace(/_/g, '.') || '';
    deviceOS = `iOS ${version}`.trim();
  } else if (/mac os x\s*([\d_]+)?/i.test(userAgent)) {
    const match = userAgent.match(/mac os x\s*([\d_]+)?/i);
    const version = match?.[1]?.replace(/_/g, '.') || '';
    deviceOS = `macOS ${version}`.trim();
  } else if (/windows nt\s*([\d.]+)?/i.test(userAgent)) {
    const match = userAgent.match(/windows nt\s*([\d.]+)?/i);
    const ntVersion = match?.[1];
    const winVersion = ntVersion === '10.0' ? '10/11' : ntVersion === '6.3' ? '8.1' : ntVersion === '6.2' ? '8' : ntVersion === '6.1' ? '7' : ntVersion || '';
    deviceOS = `Windows ${winVersion}`.trim();
  } else if (/linux/i.test(userAgent)) {
    deviceOS = 'Linux';
  } else if (/cros/i.test(userAgent)) {
    deviceOS = 'Chrome OS';
  }

  return { deviceType, deviceOS };
}

function isPrivateIP(ip: string): boolean {
  if (!ip || ip === 'unknown') return true;
  
  // Localhost
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('127.')) return true;
  
  // Private IPv4 ranges (RFC1918)
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  
  // 172.16.0.0 - 172.31.255.255 (172.16.0.0/12)
  if (ip.startsWith('172.')) {
    const secondOctet = parseInt(ip.split('.')[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }
  
  // Link-local
  if (ip.startsWith('169.254.')) return true;
  
  // IPv6 private/link-local
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:')) return true;
  
  return false;
}

async function getLocationFromIP(ipAddress: string): Promise<string> {
  if (isPrivateIP(ipAddress)) {
    return 'Lokaal netwerk';
  }

  try {
    // Use ip-api.com free service (no API key needed, 45 requests per minute)
    const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,city,country,message`, {
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });
    
    if (!response.ok) {
      return 'Onbekend';
    }

    const data = await response.json();
    
    if (data.status === 'success' && data.city && data.country) {
      return `${data.city}, ${data.country}`;
    }
    
    return 'Onbekend';
  } catch (error) {
    console.error('[ActivityLogger] Failed to get location from IP:', error);
    return 'Onbekend';
  }
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    // Parse device info from User-Agent if not provided
    let deviceType = params.deviceType ?? null;
    let deviceOS = params.deviceOS ?? null;
    
    if (params.userAgent && (!deviceType || !deviceOS)) {
      const deviceInfo = parseUserAgent(params.userAgent);
      deviceType = deviceType ?? deviceInfo.deviceType;
      deviceOS = deviceOS ?? deviceInfo.deviceOS;
    }

    // Get location from IP if not provided (async, but don't block)
    let location = params.location ?? null;
    if (!location && params.ipAddress) {
      location = await getLocationFromIP(params.ipAddress);
    }

    const logEntry: InsertActivityLog = {
      userId: params.userId ?? null,
      stationId: params.stationId ?? null,
      action: params.action,
      category: params.category,
      details: params.details ?? null,
      targetUserId: params.targetUserId ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      deviceType,
      deviceOS,
      location,
      createdAt: new Date(),
    };

    await db.insert(activityLogs).values(logEntry);
  } catch (error) {
    console.error("[ActivityLogger] Failed to log activity:", error);
  }
}

export function getClientInfo(req: { 
  ip?: string; 
  headers: { [key: string]: string | string[] | undefined };
}): { ipAddress: string; userAgent: string } {
  const forwardedFor = req.headers['x-forwarded-for'];
  let ipAddress = 'unknown';
  
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    ipAddress = ips.split(',')[0].trim();
  } else if (req.headers['x-real-ip']) {
    const realIp = req.headers['x-real-ip'];
    ipAddress = Array.isArray(realIp) ? realIp[0] : realIp;
  } else if (req.ip) {
    ipAddress = req.ip;
  }

  const userAgentHeader = req.headers['user-agent'];
  const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : (userAgentHeader || 'unknown');

  return { ipAddress, userAgent };
}

interface GetActivityLogsParams {
  stationId?: number;
  stationIds?: number[];
  userId?: number;
  category?: ActivityCategory;
  categories?: ActivityCategory[];
  startDate?: Date;
  endDate?: Date;
  detailsSearch?: string;
  limit?: number;
  offset?: number;
}

export async function getActivityLogs(params: GetActivityLogsParams = {}) {
  const { stationId, stationIds, userId, category, categories, startDate, endDate, detailsSearch, limit = 100, offset = 0 } = params;

  const conditions = [];

  if (stationIds && stationIds.length > 0) {
    conditions.push(inArray(activityLogs.stationId, stationIds));
  } else if (stationId) {
    conditions.push(eq(activityLogs.stationId, stationId));
  }

  if (userId) {
    conditions.push(eq(activityLogs.userId, userId));
  }

  if (categories && categories.length > 0) {
    conditions.push(inArray(activityLogs.category, categories));
  } else if (category) {
    conditions.push(eq(activityLogs.category, category));
  }

  if (startDate) {
    conditions.push(gte(activityLogs.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(activityLogs.createdAt, endDate));
  }

  if (detailsSearch && detailsSearch.trim()) {
    conditions.push(sql`${activityLogs.details} ILIKE ${'%' + detailsSearch.trim() + '%'}`);
  }

  const logs = await db
    .select()
    .from(activityLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return logs;
}

export async function getActivityLogsCount(params: Omit<GetActivityLogsParams, 'limit' | 'offset'> = {}) {
  const { stationId, stationIds, userId, category, categories, startDate, endDate, detailsSearch } = params;

  const conditions = [];

  if (stationIds && stationIds.length > 0) {
    conditions.push(inArray(activityLogs.stationId, stationIds));
  } else if (stationId) {
    conditions.push(eq(activityLogs.stationId, stationId));
  }

  if (userId) {
    conditions.push(eq(activityLogs.userId, userId));
  }

  if (categories && categories.length > 0) {
    conditions.push(inArray(activityLogs.category, categories));
  } else if (category) {
    conditions.push(eq(activityLogs.category, category));
  }

  if (startDate) {
    conditions.push(gte(activityLogs.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(activityLogs.createdAt, endDate));
  }

  if (detailsSearch && detailsSearch.trim()) {
    conditions.push(sql`${activityLogs.details} ILIKE ${'%' + detailsSearch.trim() + '%'}`);
  }

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(activityLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return Number(result[0]?.count || 0);
}

export const ActivityActions = {
  LOGIN: {
    SUCCESSFUL: "Succesvol ingelogd",
    FAILED: "Inlogpoging mislukt",
    BLOCKED: "Inlogpoging geblokkeerd (rate limit)",
  },
  LOGOUT: "Uitgelogd",
  PREFERENCE: {
    SAVED: "Voorkeur opgeslagen",
    DELETED: "Voorkeur verwijderd",
    SYNCED: "Voorkeuren gesynchroniseerd",
  },
  SCHEDULE: {
    GENERATED: "Planning gegenereerd",
    SHIFT_ASSIGNED: "Shift toegewezen",
    SHIFT_REMOVED: "Shift verwijderd",
    SHIFT_SWAPPED: "Shift gewisseld",
  },
  SHIFT_SWAP: {
    REQUESTED: "Ruilverzoek ingediend",
    APPROVED: "Ruilverzoek goedgekeurd",
    REJECTED: "Ruilverzoek afgewezen",
    CANCELLED: "Ruilverzoek geannuleerd",
  },
  USER_MANAGEMENT: {
    CREATED: "Gebruiker aangemaakt",
    UPDATED: "Gebruiker gewijzigd",
    DELETED: "Gebruiker verwijderd",
    PASSWORD_CHANGED: "Wachtwoord gewijzigd",
    CROSS_TEAM_ADDED: "Cross-team toegang toegevoegd",
    CROSS_TEAM_REMOVED: "Cross-team toegang verwijderd",
  },
  PROFILE: {
    UPDATED: "Profiel bijgewerkt",
    PHOTO_UPLOADED: "Profielfoto geüpload",
  },
  SETTINGS: {
    UPDATED: "Instelling gewijzigd",
    HOLIDAY_ADDED: "Feestdag toegevoegd",
    HOLIDAY_DELETED: "Feestdag verwijderd",
    WEEKDAY_CONFIG_UPDATED: "Weekdag configuratie gewijzigd",
    STATION_SETTINGS_UPDATED: "Station instellingen gewijzigd",
    PREFERENCES_CLEARED: "Voorkeuren gewist",
  },
  VERDI: {
    SYNC_STARTED: "Verdi sync gestart",
    SYNC_COMPLETED: "Verdi sync voltooid",
    SYNC_FAILED: "Verdi sync mislukt",
    CONFIG_UPDATED: "Verdi configuratie gewijzigd",
    MAPPING_UPDATED: "Verdi mapping gewijzigd",
  },
  OVERTIME: {
    CREATED: "Overuren geregistreerd",
    UPDATED: "Overuren gewijzigd",
    DELETED: "Overuren verwijderd",
  },
  SHIFT_MANUAL: {
    CREATED: "Shift manueel aangemaakt",
    UPDATED: "Shift manueel gewijzigd",
    DELETED: "Shift manueel verwijderd",
    MONTH_DELETED: "Maand shifts verwijderd",
    ASSIGNED: "Shift manueel toegewezen",
    UNASSIGNED: "Shift manueel vrijgemaakt",
    DATE_CHANGED: "Shift datum/tijd gewijzigd",
    STATION_CHANGED: "Shift station gewijzigd",
    TYPE_CHANGED: "Shift type gewijzigd",
    SPLIT: "Shift gesplitst",
    MERGED: "Shift samengevoegd",
    FORCE_OVERRIDE: "Validatie geforceerd omzeild",
  },
  SHIFT_BID: {
    CREATED: "Bieding geplaatst",
    ACCEPTED: "Bieding geaccepteerd",
    REJECTED: "Bieding afgewezen",
    WITHDRAWN: "Bieding ingetrokken",
  },
  REPORTAGE: {
    SMTP_CONFIG_UPDATED: "SMTP configuratie gewijzigd",
    CONFIG_UPDATED: "Reportage configuratie gewijzigd",
    RECIPIENT_ADDED: "Reportage ontvanger toegevoegd",
    RECIPIENT_UPDATED: "Reportage ontvanger gewijzigd",
    RECIPIENT_DELETED: "Reportage ontvanger verwijderd",
    REPORT_SENT: "Reportage verzonden",
  },
} as const;
