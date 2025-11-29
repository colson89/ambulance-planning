/**
 * Activity Logger - Audit Trail for User Actions
 * 
 * Logs all important user activities for admin/supervisor review.
 * Categories: auth, preferences, schedule, users, settings, verdi, overtime, other
 */

import { db } from "./db";
import { activityLogs, type InsertActivityLog } from "@shared/schema";
import { desc, eq, and, gte, lte, sql } from "drizzle-orm";

export type ActivityCategory = "LOGIN" | "LOGOUT" | "PREFERENCE" | "SCHEDULE" | "USER_MANAGEMENT" | "SETTINGS" | "VERDI" | "OVERTIME" | "PROFILE" | "OTHER";

interface LogActivityParams {
  userId?: number | null;
  stationId?: number | null;
  action: string;
  category: ActivityCategory;
  details?: string | null;
  targetUserId?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const logEntry: InsertActivityLog = {
      userId: params.userId ?? null,
      stationId: params.stationId ?? null,
      action: params.action,
      category: params.category,
      details: params.details ?? null,
      targetUserId: params.targetUserId ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
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
  userId?: number;
  category?: ActivityCategory;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export async function getActivityLogs(params: GetActivityLogsParams = {}) {
  const { stationId, userId, category, startDate, endDate, limit = 100, offset = 0 } = params;

  const conditions = [];

  if (stationId) {
    conditions.push(eq(activityLogs.stationId, stationId));
  }

  if (userId) {
    conditions.push(eq(activityLogs.userId, userId));
  }

  if (category) {
    conditions.push(eq(activityLogs.category, category));
  }

  if (startDate) {
    conditions.push(gte(activityLogs.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(activityLogs.createdAt, endDate));
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
  const { stationId, userId, category, startDate, endDate } = params;

  const conditions = [];

  if (stationId) {
    conditions.push(eq(activityLogs.stationId, stationId));
  }

  if (userId) {
    conditions.push(eq(activityLogs.userId, userId));
  }

  if (category) {
    conditions.push(eq(activityLogs.category, category));
  }

  if (startDate) {
    conditions.push(gte(activityLogs.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(activityLogs.createdAt, endDate));
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
} as const;
