import { users, shifts, shiftPreferences, systemSettings, weekdayConfigs, userComments, stations, userStations, holidays, calendarTokens, verdiStationConfig, verdiUserMappings, verdiPositionMappings, verdiSyncLog, verdiShiftRegistry, pushSubscriptions, reportageConfig, reportageRecipients, reportageLogs, overtime, type User, type InsertUser, type Shift, type ShiftPreference, type InsertShiftPreference, type WeekdayConfig, type UserComment, type InsertUserComment, type Station, type InsertStation, type Holiday, type InsertHoliday, type UserStation, type InsertUserStation, type CalendarToken, type InsertCalendarToken, type VerdiStationConfig, type VerdiUserMapping, type VerdiPositionMapping, type VerdiSyncLog, type VerdiShiftRegistry, type PushSubscription, type InsertPushSubscription, type ReportageConfig, type ReportageRecipient, type ReportageLog, type InsertReportageRecipient, type Overtime, type InsertOvertime } from "../shared/schema";
import { db } from "./db";
import { eq, and, lt, gte, lte, ne, asc, desc, inArray, isNull, or } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { client, pool } from "./db";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import memorystore from "memorystore";
import { verdiClient } from "./verdi-client";

const scryptAsync = promisify(scrypt);
const PostgresSessionStore = connectPg(session);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export interface IStorage {
  // Station management
  getAllStations(): Promise<Station[]>;
  getStation(id: number): Promise<Station | undefined>;
  getStationByCode(code: string): Promise<Station | undefined>;
  createStation(station: InsertStation): Promise<Station>;
  
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByUsernameAndStation(username: string, stationId: number): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Multi-station access
  getUserAccessibleStations(userId: number, includeSupervision?: boolean): Promise<Station[]>;
  getSupervisorAccessibleStations(): Promise<Station[]>; // Supervisors get all stations except supervisor station
  addUserToStation(userId: number, stationId: number, maxHours?: number): Promise<void>;
  removeUserFromStation(userId: number, stationId: number): Promise<void>;
  getUsersByStation(stationId: number): Promise<User[]>;
  
  // Cross-team functionality
  getUserStationAssignments(userId: number): Promise<Array<{station: Station, maxHours: number}>>;
  updateUserStationHours(userId: number, stationId: number, maxHours: number): Promise<void>;
  getCrossTeamUsersForStation(stationId: number): Promise<Array<{user: User, maxHours: number}>>;
  validateCrossTeamSchedule(userId: number, proposedShifts: Array<{date: Date, startTime: Date, endTime: Date, stationId: number}>): Promise<{conflicts: string[], valid: boolean}>;
  
  // Business rule validation helpers
  isUserCrossTeam(userId: number): Promise<boolean>;
  getStationsWithSimpleSystem(stationIds: number[]): Promise<number[]>;
  getUserAllStations(userId: number): Promise<number[]>;
  canUserReceiveSplitShift(userId: number, targetStationId: number): Promise<boolean>;
  hasConflictingCrossTeamShift(userId: number, proposedDate: Date, proposedStartTime: Date, proposedEndTime: Date, targetStationId: number, month: number, year: number): Promise<boolean>;
  
  // Cross-team access control for admins
  userHasAccessToStation(userId: number, stationId: number): Promise<boolean>;
  
  // Unified preferences functionality
  syncUserPreferencesToAllStations(userId: number, month: number, year: number): Promise<void>;
  getUnifiedUserShiftPreferences(userId: number, month: number, year: number): Promise<ShiftPreference[]>;
  deleteUnifiedPreferencesForUser(userId: number, month: number, year: number): Promise<void>;
  
  // Cross-team statistics
  getCrossTeamShiftStatistics(type: "month" | "quarter" | "year", year: number, month?: number, quarter?: number): Promise<any[]>;
  
  createUser(user: InsertUser): Promise<User>;
  updateUser(userId: number, updateData: Partial<User>): Promise<User>;
  updateUserPassword(userId: number, newPassword: string): Promise<User>;
  deleteUser(userId: number): Promise<void>;
  getAllShifts(stationId?: number): Promise<Shift[]>;
  getShiftsByMonth(month: number, year: number, stationId?: number): Promise<Shift[]>;
  createShift(shift: any): Promise<Shift>;
  getUserShiftPreferences(userId: number, month: number, year: number): Promise<ShiftPreference[]>;
  createShiftPreference(preference: InsertShiftPreference): Promise<ShiftPreference>;
  updateShiftPreference(id: number, updateData: Partial<ShiftPreference>): Promise<ShiftPreference>;
  deleteShiftPreference(id: number): Promise<void>;
  getOpenShiftsForPlanning(month: number, year: number): Promise<Shift[]>;
  generateMonthlySchedule(month: number, year: number, stationId?: number, progressCallback?: (percentage: number, message: string) => void): Promise<Shift[]>;
  sessionStore: session.Store;
  getShiftPreference(id: number): Promise<ShiftPreference | undefined>;
  getShift(id: number): Promise<Shift | undefined>;
  updateShift(id: number, updateData: Partial<Shift>): Promise<Shift>;
  deleteShift(id: number): Promise<void>;
  
  // Systeeminstellingen
  getSystemSetting(key: string): Promise<string | null>;
  setSystemSetting(key: string, value: string): Promise<void>;
  
  // Weekdag configuraties
  getWeekdayConfigs(stationId?: number): Promise<WeekdayConfig[]>;
  getWeekdayConfig(dayOfWeek: number, stationId?: number): Promise<WeekdayConfig | null>;
  updateWeekdayConfig(dayOfWeek: number, config: Partial<WeekdayConfig>, stationId?: number): Promise<WeekdayConfig>;
  initializeDefaultWeekdayConfigs(stationId?: number): Promise<void>;
  
  // Gebruiker opmerkingen
  getUserComment(userId: number, month: number, year: number, stationId?: number): Promise<UserComment | null>;
  createUserComment(comment: InsertUserComment): Promise<UserComment>;
  updateUserComment(id: number, comment: string): Promise<UserComment>;
  deleteUserComment(id: number): Promise<void>;
  getAllUserComments(month: number, year: number, stationId?: number): Promise<UserComment[]>;
  
  // Feestdagen beheer
  getAllHolidays(year?: number, stationId?: number): Promise<Holiday[]>;
  getHoliday(id: number): Promise<Holiday | undefined>;
  createHoliday(holiday: InsertHoliday): Promise<Holiday>;
  updateHoliday(id: number, updateData: Partial<Holiday>): Promise<Holiday>;
  deleteHoliday(id: number): Promise<void>;
  getHolidaysForDate(date: Date, stationId?: number): Promise<Holiday[]>;
  generateBelgianHolidays(year: number, stationId?: number): Promise<Holiday[]>;
  isHoliday(date: Date, stationId?: number): Promise<boolean>;
  
  // Calendar tokens beheer
  getCalendarToken(userId: number): Promise<CalendarToken | undefined>;
  createCalendarToken(userId: number): Promise<CalendarToken>;
  regenerateCalendarToken(userId: number): Promise<CalendarToken>;
  getCalendarTokenByToken(token: string): Promise<CalendarToken | undefined>;
  
  // Verdi integratie
  getVerdiStationConfig(stationId: number): Promise<any>;
  upsertVerdiStationConfig(stationId: number, config: {verdiUrl?: string, authId?: string, authSecret?: string, shiftSheetGuid?: string, enabled?: boolean}): Promise<any>;
  getAllVerdiStationConfigs(): Promise<any[]>;
  getVerdiUserMapping(userId: number): Promise<any>;
  upsertVerdiUserMapping(userId: number, personGuid: string): Promise<any>;
  getAllVerdiUserMappings(): Promise<any[]>;
  getVerdiPositionMappings(stationId: number): Promise<any[]>;
  upsertVerdiPositionMapping(stationId: number, positionIndex: number, positionGuid: string, requiresLicenseC: boolean): Promise<any>;
  getAllVerdiPositionMappings(): Promise<any[]>;
  getVerdiSyncLog(shiftId: number): Promise<any>;
  createVerdiSyncLog(shiftId: number, stationId: number, syncStatus: string, verdiShiftGuid?: string, errorMessage?: string, warningMessages?: string, shiftStartTime?: Date, shiftEndTime?: Date, shiftType?: string, isSplitShift?: boolean, splitGroup?: number, splitStartTime?: Date, splitEndTime?: Date, assignedUserIds?: number[]): Promise<any>;
  updateVerdiSyncLog(shiftId: number, syncStatus: string, verdiShiftGuid?: string, errorMessage?: string, warningMessages?: string, shiftStartTime?: Date, shiftEndTime?: Date, shiftType?: string): Promise<any>;
  getVerdiSyncLogsByMonth(month: number, year: number, stationId?: number): Promise<any[]>;
  getLastSuccessfulVerdiSync(stationId: number, month: number, year: number): Promise<Date | null>;
  getLegacyVerdiSyncLogs(stationId?: number): Promise<any[]>;
  deleteVerdiSyncLog(shiftId: number): Promise<void>;
  deleteVerdiSyncLogById(logId: number): Promise<void>;
  updateVerdiSyncLogById(logId: number, syncStatus: 'pending' | 'success' | 'error', errorMessage?: string): Promise<void>;
  resetVerdiSyncLog(shiftId: number): Promise<void>;
  getVerdiSyncStatus(stationId: number, month: number, year: number): Promise<{hasPendingChanges: boolean, newShifts: number, modifiedShifts: number, totalShifts: number}>;
  
  // Push Notifications
  getPushSubscription(userId: number): Promise<PushSubscription | undefined>;
  getAllPushSubscriptions(userId: number): Promise<PushSubscription[]>;
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  updatePushSubscription(userId: number, endpoint: string, updateData: Partial<PushSubscription>): Promise<PushSubscription>;
  deletePushSubscription(userId: number, endpoint: string): Promise<void>;
  deletePushSubscriptionsByUser(userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Tijdelijk gebruik van MemoryStore voor debugging sessie problemen
    const MemoryStore = memorystore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    // TODO: Terug naar PostgreSQL store na sessie fix
    // this.sessionStore = new PostgresSessionStore({
    //   pool: pool as any,
    //   createTableIfMissing: true
    // });
  }

  // Station management methods
  async getAllStations(): Promise<Station[]> {
    try {
      console.log("Fetching stations from database...");
      const result = await db.select().from(stations).orderBy(asc(stations.name));
      console.log("Stations fetched successfully:", result);
      return result;
    } catch (error) {
      console.error("Error in getAllStations:", error);
      throw error;
    }
  }

  async getStation(id: number): Promise<Station | undefined> {
    const [station] = await db.select().from(stations).where(eq(stations.id, id));
    return station || undefined;
  }

  async getStationByCode(code: string): Promise<Station | undefined> {
    const [station] = await db.select().from(stations).where(eq(stations.code, code));
    return station || undefined;
  }

  async createStation(stationData: InsertStation): Promise<Station> {
    const [station] = await db
      .insert(stations)
      .values(stationData)
      .returning();
    return station;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByUsernameAndStation(username: string, stationId: number): Promise<User | undefined> {
    // First try primary station (original behavior)
    const [user] = await db.select().from(users).where(
      and(
        eq(users.username, username),
        eq(users.stationId, stationId)
      )
    );
    
    if (user) return user;

    // If not found, check junction table for multi-station access
    const [multiStationUser] = await db
      .select({
        id: users.id,
        username: users.username,
        password: users.password,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phoneNumber: users.phoneNumber,
        profilePhotoUrl: users.profilePhotoUrl,
        role: users.role,
        isAdmin: users.isAdmin,
        isProfessional: users.isProfessional,
        hasDrivingLicenseC: users.hasDrivingLicenseC,
        hours: users.hours,
        stationId: users.stationId
      })
      .from(users)
      .innerJoin(userStations, eq(users.id, userStations.userId))
      .where(
        and(
          eq(users.username, username),
          eq(userStations.stationId, stationId)
        )
      );

    return multiStationUser;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(userId: number, updateData: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!user) throw new Error("User not found");
    return user;
  }

  async updateUserPassword(userId: number, newPassword: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ password: await hashPassword(newPassword) })
      .where(eq(users.id, userId))
      .returning();

    if (!user) throw new Error("User not found");
    return user;
  }

  async deleteUser(userId: number): Promise<void> {
    // CASCADE DELETE: Verwijder eerst alle gerelateerde records in een transaction
    // Dit voorkomt foreign key constraint errors en zorgt voor atomic cleanup
    
    await db.transaction(async (tx) => {
      // 1. Haal eerst alle shifts van deze user op (voor verdiSyncLog cleanup)
      const userShifts = await tx
        .select({ id: shifts.id })
        .from(shifts)
        .where(eq(shifts.userId, userId));
      
      const shiftIds = userShifts.map(s => s.id);
      
      // 2. Verwijder Verdi sync logs voor deze shifts (FK constraint op shift_id)
      if (shiftIds.length > 0) {
        await tx.delete(verdiSyncLog).where(inArray(verdiSyncLog.shiftId, shiftIds));
      }
      
      // 3. Verwijder shifts
      await tx.delete(shifts).where(eq(shifts.userId, userId));
      
      // 4. Verwijder shift preferences
      await tx.delete(shiftPreferences).where(eq(shiftPreferences.userId, userId));
      
      // 5. Verwijder user comments
      await tx.delete(userComments).where(eq(userComments.userId, userId));
      
      // 6. Verwijder cross-team station assignments (FK constraint)
      await tx.delete(userStations).where(eq(userStations.userId, userId));
      
      // 7. Verwijder calendar tokens (FK constraint)
      await tx.delete(calendarTokens).where(eq(calendarTokens.userId, userId));
      
      // 8. Verwijder Verdi user mappings (FK constraint)
      await tx.delete(verdiUserMappings).where(eq(verdiUserMappings.userId, userId));
      
      // 9. Ten slotte, verwijder de user zelf
      await tx.delete(users).where(eq(users.id, userId));
    });
  }

  // Multi-station access functions
  async getUserAccessibleStations(userId: number, includeSupervision = false): Promise<Station[]> {
    // Check both primary station (from users table) and additional stations (from junction table)
    const user = await this.getUser(userId);
    if (!user) return [];

    // If user is supervisor, return all stations or exclude supervisor station based on flag
    if (user.role === 'supervisor') {
      return includeSupervision ? await this.getAllStations() : this.getSupervisorAccessibleStations();
    }

    // Get primary station
    const primaryStation = await this.getStation(user.stationId);
    const accessibleStations: Station[] = primaryStation ? [primaryStation] : [];

    // Get additional stations from junction table
    const additionalStations = await db
      .select({ 
        id: stations.id,
        name: stations.name,
        code: stations.code,
        displayName: stations.displayName,
        createdAt: stations.createdAt,
        updatedAt: stations.updatedAt
      })
      .from(userStations)
      .innerJoin(stations, eq(userStations.stationId, stations.id))
      .where(eq(userStations.userId, userId));

    // Combine and deduplicate
    const allStationIds = new Set(accessibleStations.map(s => s.id));
    for (const station of additionalStations) {
      if (!allStationIds.has(station.id)) {
        accessibleStations.push(station);
      }
    }

    return accessibleStations.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Supervisors krijgen toegang tot alle stations behalve het supervisor station zelf
  async getSupervisorAccessibleStations(): Promise<Station[]> {
    const allStations = await db.select().from(stations).orderBy(asc(stations.name));
    // Filter out supervisor station (ID 8)
    return allStations.filter(station => station.id !== 8);
  }

  async addUserToStation(userId: number, stationId: number, maxHours: number = 24): Promise<void> {
    // Check if already exists
    const existing = await db
      .select()
      .from(userStations)
      .where(and(eq(userStations.userId, userId), eq(userStations.stationId, stationId)));
    
    if (existing.length === 0) {
      await db.insert(userStations).values({ userId, stationId, maxHours });
    } else {
      // Update existing record with new maxHours
      await db
        .update(userStations)
        .set({ maxHours })
        .where(and(eq(userStations.userId, userId), eq(userStations.stationId, stationId)));
    }
  }

  async removeUserFromStation(userId: number, stationId: number): Promise<void> {
    await db
      .delete(userStations)
      .where(and(eq(userStations.userId, userId), eq(userStations.stationId, stationId)));
  }

  async changePrimaryStation(userId: number, newPrimaryStationId: number, maxHoursForOldStation: number = 24): Promise<User> {
    // Get current user to find old primary station
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    const oldPrimaryStationId = user.stationId;
    
    // Skip if trying to set same station as primary
    if (oldPrimaryStationId === newPrimaryStationId) {
      return user;
    }
    
    // Update primary station in users table
    const [updatedUser] = await db
      .update(users)
      .set({ stationId: newPrimaryStationId })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) throw new Error("Failed to update primary station");
    
    // Remove new primary station from userStations (it's now the primary, not cross-team)
    await db
      .delete(userStations)
      .where(and(eq(userStations.userId, userId), eq(userStations.stationId, newPrimaryStationId)));
    
    // Check if old primary station already exists in userStations
    // (it shouldn't, but handle gracefully)
    const existingOldStation = await db
      .select()
      .from(userStations)
      .where(and(eq(userStations.userId, userId), eq(userStations.stationId, oldPrimaryStationId)));
    
    if (existingOldStation.length > 0) {
      // Update existing record
      await db
        .update(userStations)
        .set({ maxHours: maxHoursForOldStation })
        .where(and(eq(userStations.userId, userId), eq(userStations.stationId, oldPrimaryStationId)));
    } else {
      // Insert new record
      await db.insert(userStations).values({ 
        userId, 
        stationId: oldPrimaryStationId, 
        maxHours: maxHoursForOldStation 
      });
    }
    
    return updatedUser;
  }

  async getUsersByStation(stationId: number): Promise<User[]> {
    console.log(`DEBUG: getUsersByStation called with stationId: ${stationId}`);
    
    // Get users whose primary station is this station
    const primaryUsers = await db
      .select()
      .from(users)
      .where(eq(users.stationId, stationId));

    console.log(`DEBUG: Found ${primaryUsers.length} primary users for station ${stationId}:`, primaryUsers.map(u => `${u.username}:${u.id}`));

    // Get users who have additional access to this station
    const additionalUsers = await db
      .select({
        id: users.id,
        username: users.username,
        password: users.password,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        isAdmin: users.isAdmin,
        isProfessional: users.isProfessional,
        hasDrivingLicenseC: users.hasDrivingLicenseC,
        hours: users.hours,
        stationId: users.stationId
      })
      .from(userStations)
      .innerJoin(users, eq(userStations.userId, users.id))
      .where(eq(userStations.stationId, stationId));

    console.log(`DEBUG: Found ${additionalUsers.length} additional users for station ${stationId}:`, additionalUsers.map(u => `${u.username}:${u.id}`));

    // Combine and deduplicate
    const allUserIds = new Set(primaryUsers.map(u => u.id));
    const allUsers = [...primaryUsers];
    
    for (const user of additionalUsers) {
      if (!allUserIds.has(user.id)) {
        console.log(`DEBUG: Adding additional user ${user.username}:${user.id} to results`);
        allUsers.push(user);
      } else {
        console.log(`DEBUG: Skipping duplicate user ${user.username}:${user.id}`);
      }
    }

    console.log(`DEBUG: Total ${allUsers.length} users returned for station ${stationId}`);
    return allUsers.sort((a, b) => a.username.localeCompare(b.username));
  }

  // Cross-team functionality methods
  async getUserStationAssignments(userId: number): Promise<Array<{station: Station, maxHours: number}>> {
    const assignments = await db
      .select({
        station: {
          id: stations.id,
          name: stations.name,
          code: stations.code,
          displayName: stations.displayName,
          createdAt: stations.createdAt,
          updatedAt: stations.updatedAt
        },
        maxHours: userStations.maxHours
      })
      .from(userStations)
      .innerJoin(stations, eq(userStations.stationId, stations.id))
      .where(eq(userStations.userId, userId));

    return assignments;
  }

  async updateUserStationHours(userId: number, stationId: number, maxHours: number): Promise<void> {
    await db
      .update(userStations)
      .set({ maxHours })
      .where(and(eq(userStations.userId, userId), eq(userStations.stationId, stationId)));
  }

  async getCrossTeamUsersForStation(stationId: number): Promise<Array<{user: User, maxHours: number}>> {
    const crossTeamUsers = await db
      .select({
        user: {
          id: users.id,
          username: users.username,
          password: users.password,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
          isAdmin: users.isAdmin,
          isProfessional: users.isProfessional,
          hasDrivingLicenseC: users.hasDrivingLicenseC,
          hours: users.hours,
          stationId: users.stationId
        },
        maxHours: userStations.maxHours
      })
      .from(userStations)
      .innerJoin(users, eq(userStations.userId, users.id))
      .where(eq(userStations.stationId, stationId));

    return crossTeamUsers;
  }

  async validateCrossTeamSchedule(userId: number, proposedShifts: Array<{date: Date, startTime: Date, endTime: Date, stationId: number}>): Promise<{conflicts: string[], valid: boolean}> {
    const conflicts: string[] = [];
    
    // Sort shifts by start time for easier conflict detection
    const sortedShifts = proposedShifts.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    
    for (let i = 0; i < sortedShifts.length - 1; i++) {
      const currentShift = sortedShifts[i];
      const nextShift = sortedShifts[i + 1];
      
      // Check for overlapping or consecutive shifts
      if (currentShift.endTime >= nextShift.startTime) {
        const currentStation = await this.getStation(currentShift.stationId);
        const nextStation = await this.getStation(nextShift.stationId);
        
        if (currentStation && nextStation) {
          conflicts.push(`Aaneensluitende shiften gedetecteerd: ${currentStation.displayName} (${currentShift.endTime.toLocaleString()}) naar ${nextStation.displayName} (${nextShift.startTime.toLocaleString()})`);
        }
      }
    }
    
    // Check monthly hour limits per station
    for (const proposedShift of proposedShifts) {
      const stationAssignments = await this.getUserStationAssignments(userId);
      const assignment = stationAssignments.find(a => a.station.id === proposedShift.stationId);
      
      if (assignment) {
        // Calculate total hours for this user/station combination in this month
        const shiftDate = new Date(proposedShift.date);
        const existingShifts = await db
          .select()
          .from(shifts)
          .where(
            and(
              eq(shifts.userId, userId),
              eq(shifts.stationId, proposedShift.stationId),
              eq(shifts.month, shiftDate.getMonth() + 1),
              eq(shifts.year, shiftDate.getFullYear())
            )
          );
        
        let totalHours = 0;
        for (const existingShift of existingShifts) {
          const duration = (existingShift.endTime.getTime() - existingShift.startTime.getTime()) / (1000 * 60 * 60);
          totalHours += duration;
        }
        
        // Add current shift duration
        const currentShiftDuration = (proposedShift.endTime.getTime() - proposedShift.startTime.getTime()) / (1000 * 60 * 60);
        totalHours += currentShiftDuration;
        
        if (totalHours > assignment.maxHours) {
          const station = await this.getStation(proposedShift.stationId);
          if (station) {
            conflicts.push(`Maximum uren overschreden voor ${station.displayName}: ${totalHours.toFixed(1)}u van ${assignment.maxHours}u toegestaan`);
          }
        }
      }
    }
    
    return {
      conflicts,
      valid: conflicts.length === 0
    };
  }

  // BUSINESS RULE VALIDATION HELPERS
  // Helper om te controleren of een gebruiker cross-team is (werkt voor meerdere stations)
  async isUserCrossTeam(userId: number): Promise<boolean> {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
      
    if (!user.length) return false;
    
    // Check hoeveel stations deze gebruiker heeft (primair + cross-team)
    const additionalStations = await db
      .select()
      .from(userStations)
      .where(eq(userStations.userId, userId));
    
    // Cross-team betekent: heeft additionele stations naast primaire station
    return additionalStations.length > 0;
  }

  // Helper om te controleren welke stations eenvoudige systemen gebruiken
  async getStationsWithSimpleSystem(stationIds: number[]): Promise<number[]> {
    const simpleSystemStations: number[] = [];
    
    for (const stationId of stationIds) {
      // Check alle weekday configs voor dit station
      const configs = await db
        .select()
        .from(weekdayConfigs)
        .where(eq(weekdayConfigs.stationId, stationId));
      
      // Als er geen configs zijn, gebruik default (allowSplitShifts = true)
      if (configs.length === 0) continue;
      
      // Als ALLE configs voor dit station allowSplitShifts = false hebben, dan is het eenvoudig systeem
      const hasAnyComplexDay = configs.some(config => config.allowSplitShifts === true);
      if (!hasAnyComplexDay) {
        simpleSystemStations.push(stationId);
      }
    }
    
    return simpleSystemStations;
  }

  // Helper om alle stations van een gebruiker op te halen (primair + cross-team)
  async getUserAllStations(userId: number): Promise<number[]> {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
      
    if (!user.length) return [];
    
    const stationIds = [user[0].stationId]; // Primaire station
    
    // Voeg cross-team stations toe
    const additionalStations = await db
      .select()
      .from(userStations)
      .where(eq(userStations.userId, userId));
    
    for (const station of additionalStations) {
      if (!stationIds.includes(station.stationId)) {
        stationIds.push(station.stationId);
      }
    }
    
    return stationIds;
  }

  // Helper voor cross-team toegangscontrole: controleert of een gebruiker toegang heeft tot een specifiek station
  // (via home station OF cross-team toewijzing)
  async userHasAccessToStation(userId: number, stationId: number): Promise<boolean> {
    const allUserStations = await this.getUserAllStations(userId);
    return allUserStations.includes(stationId);
  }

  // Validatie functie: controleert of een cross-team gebruiker alleen volledige shifts krijgt in eenvoudige systemen
  async canUserReceiveSplitShift(userId: number, targetStationId: number): Promise<boolean> {
    // Check of gebruiker cross-team is
    const isCrossTeam = await this.isUserCrossTeam(userId);
    if (!isCrossTeam) {
      // Normale gebruikers kunnen altijd split shifts krijgen (als station het toestaat)
      return true;
    }

    // Voor cross-team gebruikers: check of doelstation eenvoudig systeem gebruikt
    const userStations = await this.getUserAllStations(userId);
    const simpleSystemStations = await this.getStationsWithSimpleSystem(userStations);
    
    // Als doelstation een eenvoudig systeem gebruikt, mag geen split shift
    if (simpleSystemStations.includes(targetStationId)) {
      console.log(`❌ BUSINESS RULE: Cross-team gebruiker ${userId} mag geen split shift krijgen in eenvoudig systeem (station ${targetStationId})`);
      return false;
    }

    // Anders wel toegestaan
    return true;
  }

  // KRITIEKE VALIDATIE: Controleer of cross-team gebruiker al een shift heeft die overlapt/aansluit
  async hasConflictingCrossTeamShift(userId: number, proposedDate: Date, proposedStartTime: Date, proposedEndTime: Date, targetStationId: number, month: number, year: number): Promise<boolean> {
    // Check of gebruiker cross-team is
    const isCrossTeam = await this.isUserCrossTeam(userId);
    if (!isCrossTeam) {
      // Normale gebruikers hebben geen cross-team conflicten
      return false;
    }

    // MONTH-BOUNDARY FIX: Gebruik time-window query in plaats van month/year filter
    // Buffer van 24 uur voor/na de voorgestelde shift om cross-month conflicts te detecteren
    const bufferHours = 24;
    const queryStartTime = new Date(proposedStartTime.getTime() - (bufferHours * 60 * 60 * 1000));
    const queryEndTime = new Date(proposedEndTime.getTime() + (bufferHours * 60 * 60 * 1000));

    // Haal alle shifts op voor deze gebruiker binnen het tijdvenster
    const existingShifts = await db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.userId, userId),
          ne(shifts.stationId, targetStationId), // Alleen shifts van andere stations
          ne(shifts.status, "open"), // Ignore open shifts
          // Time window: shift end tijd > query start EN shift start tijd < query end
          gte(shifts.endTime, queryStartTime),
          lte(shifts.startTime, queryEndTime)
        )
      );

    // Check voor overlapping/aaneensluitende shifts
    for (const existingShift of existingShifts) {
      const existingStart = existingShift.startTime.getTime();
      const existingEnd = existingShift.endTime.getTime();
      const proposedStart = proposedStartTime.getTime();
      const proposedEnd = proposedEndTime.getTime();

      // BUSINESS RULE CLARITY: Geen overlappende shifts, minimum 1 uur pauze tussen stations
      // Overlap check: shifts overlappen direct
      const hasOverlap = (proposedStart < existingEnd) && (proposedEnd > existingStart);
      
      // Consecutive check: minder dan minimum break time tussen shifts
      // Voor cross-team: minimum 1 uur pauze tussen shifts van verschillende stations
      const minBreakTimeMs = 3600000; // 1 uur = 3600000 milliseconden
      
      // Controleer gap tussen shifts (in beide richtingen)
      const gapAfterExisting = proposedStart - existingEnd;  // Positief als proposed shift later is
      const gapBeforeExisting = existingStart - proposedEnd; // Positief als proposed shift eerder is
      
      // Er is een conflict als er overlap is of als de gap kleiner is dan minimum break time
      const hasInsufficientBreak = (gapAfterExisting >= 0 && gapAfterExisting < minBreakTimeMs) ||
                                  (gapBeforeExisting >= 0 && gapBeforeExisting < minBreakTimeMs);
      
      const isConflicting = hasOverlap || hasInsufficientBreak;

      if (isConflicting) {
        const existingStation = await this.getStation(existingShift.stationId);
        const targetStation = await this.getStation(targetStationId);
        
        const conflictType = hasOverlap ? "OVERLAPPING" : "INSUFFICIENT_BREAK";
        const gapInfo = hasOverlap ? "overlapping" : `gap: ${Math.min(gapAfterExisting || Infinity, gapBeforeExisting || Infinity) / (60 * 1000)} minutes`;
        
        console.log(`❌ CROSS-TEAM CONFLICT (${conflictType}): User ${userId} heeft al shift ${existingShift.startTime.toLocaleString()}-${existingShift.endTime.toLocaleString()} in ${existingStation?.displayName}, conflict met voorgestelde shift ${proposedStartTime.toLocaleString()}-${proposedEndTime.toLocaleString()} in ${targetStation?.displayName} (${gapInfo})`);
        return true;
      }
    }

    return false;
  }

  // Unified preferences functionality methods
  async syncUserPreferencesToAllStations(userId: number, month: number, year: number): Promise<void> {
    // Get user's primary station preferences
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    const primaryPreferences = await db
      .select()
      .from(shiftPreferences)
      .where(
        and(
          eq(shiftPreferences.userId, userId),
          eq(shiftPreferences.stationId, user.stationId),
          eq(shiftPreferences.month, month),
          eq(shiftPreferences.year, year)
        )
      );

    // Get all stations this user has access to (excluding primary)
    const assignments = await this.getUserStationAssignments(userId);
    const additionalStationIds = assignments
      .map(a => a.station.id)
      .filter(id => id !== user.stationId);

    // For each additional station, replicate the preferences
    for (const stationId of additionalStationIds) {
      // First delete existing preferences for this month/year/station
      await db
        .delete(shiftPreferences)
        .where(
          and(
            eq(shiftPreferences.userId, userId),
            eq(shiftPreferences.stationId, stationId),
            eq(shiftPreferences.month, month),
            eq(shiftPreferences.year, year)
          )
        );

      // Then insert replicated preferences
      for (const pref of primaryPreferences) {
        await db.insert(shiftPreferences).values({
          userId: pref.userId,
          stationId: stationId, // Different station ID
          date: pref.date,
          type: pref.type,
          startTime: pref.startTime,
          endTime: pref.endTime,
          status: pref.status,
          month: pref.month,
          year: pref.year,
          canSplit: pref.canSplit,
          notes: pref.notes
        });
      }
    }
  }

  async getUnifiedUserShiftPreferences(userId: number, month: number, year: number): Promise<ShiftPreference[]> {
    // Get preferences from all stations this user has access to
    const user = await this.getUser(userId);
    if (!user) return [];

    const accessibleStations = await this.getUserAccessibleStations(userId);
    const stationIds = accessibleStations.map(s => s.id);

    if (stationIds.length === 0) return [];

    // Get preferences from all accessible stations for this month/year
    const preferences = await db
      .select()
      .from(shiftPreferences)
      .where(
        and(
          eq(shiftPreferences.userId, userId),
          eq(shiftPreferences.month, month),
          eq(shiftPreferences.year, year)
        )
      );

    // Filter to only include preferences from accessible stations
    return preferences.filter(pref => stationIds.includes(pref.stationId));
  }

  async deleteUnifiedPreferencesForUser(userId: number, month: number, year: number): Promise<void> {
    const accessibleStations = await this.getUserAccessibleStations(userId);
    const stationIds = accessibleStations.map(s => s.id);

    if (stationIds.length === 0) return;

    // Delete preferences from all accessible stations for this month/year
    for (const stationId of stationIds) {
      await db
        .delete(shiftPreferences)
        .where(
          and(
            eq(shiftPreferences.userId, userId),
            eq(shiftPreferences.stationId, stationId),
            eq(shiftPreferences.month, month),
            eq(shiftPreferences.year, year)
          )
        );
    }
  }

  // Cross-team statistics implementation
  async getCrossTeamShiftStatistics(type: "month" | "quarter" | "year", year: number, month?: number, quarter?: number): Promise<any[]> {
    // Calculate date range based on period type
    let startDate: Date, endDate: Date;
    
    switch (type) {
      case "month":
        if (!month) throw new Error("Month is required for monthly statistics");
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0);
        break;
      case "quarter":
        if (!quarter) throw new Error("Quarter is required for quarterly statistics");
        const quarterMonth = (quarter - 1) * 3;
        startDate = new Date(year, quarterMonth, 1);
        endDate = new Date(year, quarterMonth + 3, 0);
        break;
      case "year":
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31);
        break;
    }

    // Get all cross-team users (users with multiple station assignments)
    const allCrossTeamAssignments = await db
      .select({
        userId: userStations.userId,
        stationId: userStations.stationId,
        maxHours: userStations.maxHours
      })
      .from(userStations);

    // Group by userId to find cross-team users
    const crossTeamUserIds = new Set<number>();
    const userStationMap = new Map<number, Array<{stationId: number, maxHours: number}>>();
    
    for (const assignment of allCrossTeamAssignments) {
      if (!userStationMap.has(assignment.userId)) {
        userStationMap.set(assignment.userId, []);
      }
      userStationMap.get(assignment.userId)!.push({
        stationId: assignment.stationId,
        maxHours: assignment.maxHours
      });
      
      // User is cross-team if they have multiple assignments
      if (userStationMap.get(assignment.userId)!.length > 0) {
        crossTeamUserIds.add(assignment.userId);
      }
    }

    // Get user details for cross-team users
    const crossTeamUsers = crossTeamUserIds.size > 0 ? await db
      .select()
      .from(users)
      .where(inArray(users.id, Array.from(crossTeamUserIds))) : [];

    const statistics = [];

    for (const user of crossTeamUsers) {
      const userAssignments = userStationMap.get(user.id) || [];
      const allStationIds = [user.stationId, ...userAssignments.map(a => a.stationId)];
      
      // Get preferences from all stations for this user
      const preferences = await db
        .select()
        .from(shiftPreferences)
        .where(
          and(
            eq(shiftPreferences.userId, user.id),
            gte(shiftPreferences.date, startDate),
            lte(shiftPreferences.date, endDate)
          )
        );

      // Get actual shifts from all stations for this user  
      const actualShifts = await db
        .select()
        .from(shifts)
        .where(
          and(
            eq(shifts.userId, user.id),
            gte(shifts.date, startDate),
            lte(shifts.date, endDate)
          )
        );

      // Calculate preference statistics
      const prefStats = preferences.reduce((acc, pref) => {
        if (!allStationIds.includes(pref.stationId)) return acc;
        
        const prefDate = new Date(pref.date);
        const isWeekend = prefDate.getDay() === 0 || prefDate.getDay() === 6;
        const key = `${pref.type}${isWeekend ? 'Weekend' : 'Week'}`;
        
        let hours = 0;
        if (pref.startTime && pref.endTime) {
          const startTime = new Date(pref.startTime);
          const endTime = new Date(pref.endTime);
          hours = Math.abs(endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        } else {
          // Fallback to standard hours
          hours = pref.type === 'day' ? 12 : 12;
        }
        
        acc[key] += Math.round(hours);
        return acc;
      }, {
        dayWeek: 0,
        nightWeek: 0,
        dayWeekend: 0,
        nightWeekend: 0
      });

      // Calculate actual shift statistics
      const actualStats = actualShifts.reduce((acc, shift) => {
        if (!allStationIds.includes(shift.stationId)) return acc;
        
        const shiftDate = new Date(shift.date);
        const isWeekend = shiftDate.getDay() === 0 || shiftDate.getDay() === 6;
        const key = `${shift.type}${isWeekend ? 'Weekend' : 'Week'}`;
        
        let hours = 0;
        if (shift.startTime && shift.endTime) {
          const startTime = new Date(shift.startTime);
          const endTime = new Date(shift.endTime);
          hours = Math.abs(endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        } else {
          hours = shift.type === 'day' ? 12 : 12;
        }
        
        acc[key] += Math.round(hours);
        return acc;
      }, {
        dayWeek: 0,
        nightWeek: 0,  
        dayWeekend: 0,
        nightWeekend: 0
      });

      // Calculate total max hours across all stations
      const totalMaxHours = userAssignments.reduce((total, assignment) => {
        return total + assignment.maxHours;
      }, user.hours || 0);

      // Calculate period multiplier
      let periodMultiplier = 1;
      switch (type) {
        case "month":
          periodMultiplier = 1;
          break;
        case "quarter":
          periodMultiplier = 3;
          break;
        case "year":
          periodMultiplier = 12;
          break;
      }

      // Get station names for display
      const stationNames = await Promise.all(
        allStationIds.map(async (stationId) => {
          const station = await this.getStation(stationId);
          return station?.displayName || `Station ${stationId}`;
        })
      );

      statistics.push({
        userId: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isCrossTeam: true,
        stations: stationNames.join(", "),
        // Preferences (in hours)
        dayShiftWeekHours: prefStats.dayWeek,
        nightShiftWeekHours: prefStats.nightWeek,
        dayShiftWeekendHours: prefStats.dayWeekend,
        nightShiftWeekendHours: prefStats.nightWeekend,
        totalPreferenceHours: prefStats.dayWeek + prefStats.nightWeek + prefStats.dayWeekend + prefStats.nightWeekend,
        // Actual shifts (in hours)
        actualDayShiftWeekHours: actualStats.dayWeek,
        actualNightShiftWeekHours: actualStats.nightWeek,
        actualDayShiftWeekendHours: actualStats.dayWeekend,
        actualNightShiftWeekendHours: actualStats.nightWeekend,
        totalActualHours: actualStats.dayWeek + actualStats.nightWeek + actualStats.dayWeekend + actualStats.nightWeekend,
        // Combined max hours from all stations
        maxHours: totalMaxHours * periodMultiplier
      });
    }

    return statistics.sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));
  }

  async getAllShifts(stationId?: number): Promise<Shift[]> {
    if (stationId) {
      return await db.select().from(shifts).where(eq(shifts.stationId, stationId));
    }
    return await db.select().from(shifts);
  }

  async getShiftsByMonth(month: number, year: number, stationId?: number): Promise<Shift[]> {
    const conditions = [
      eq(shifts.month, month),
      eq(shifts.year, year)
    ];
    
    if (stationId) {
      conditions.push(eq(shifts.stationId, stationId));
    }
    
    return await db.select()
      .from(shifts)
      .where(and(...conditions));
  }

  async createShift(shiftData: any): Promise<Shift> {
    // Valideer dat stationId aanwezig is
    if (!shiftData.stationId) {
      throw new Error(`Shift creation failed: stationId is required but was ${shiftData.stationId}`);
    }
    
    const [shift] = await db.insert(shifts).values(shiftData).returning();
    return shift;
  }

  async getUserShiftPreferences(userId: number, month: number, year: number): Promise<ShiftPreference[]> {
    return await db.select()
      .from(shiftPreferences)
      .where(
        and(
          eq(shiftPreferences.userId, userId),
          eq(shiftPreferences.month, month),
          eq(shiftPreferences.year, year)
        )
      );
  }

  async createShiftPreference(preference: InsertShiftPreference): Promise<ShiftPreference> {
    const [pref] = await db.insert(shiftPreferences)
      .values(preference)
      .returning();
    return pref;
  }

  async updateShiftPreference(id: number, updateData: Partial<ShiftPreference>): Promise<ShiftPreference> {
    const [pref] = await db.update(shiftPreferences)
      .set(updateData)
      .where(eq(shiftPreferences.id, id))
      .returning();

    if (!pref) throw new Error("Shift preference not found");
    return pref;
  }

  async deleteShiftPreference(id: number): Promise<void> {
    await db.delete(shiftPreferences).where(eq(shiftPreferences.id, id));
  }

  async deletePreferencesByMonthAndStation(month: number, year: number, stationId: number): Promise<number> {
    const result = await db
      .delete(shiftPreferences)
      .where(
        and(
          eq(shiftPreferences.month, month),
          eq(shiftPreferences.year, year),
          eq(shiftPreferences.stationId, stationId)
        )
      );
    
    return result.rowCount || 0;
  }

  async getOpenShiftsForPlanning(month: number, year: number): Promise<Shift[]> {
    return await db.select()
      .from(shifts)
      .where(
        and(
          eq(shifts.month, month),
          eq(shifts.year, year),
          eq(shifts.status, "open")
        )
      );
  }

  async generateMonthlySchedule(month: number, year: number, stationId?: number, progressCallback?: (percentage: number, message: string) => void): Promise<Shift[]> {
    // Valideer en zet default stationId
    if (!stationId || stationId <= 0) {
      throw new Error(`generateMonthlySchedule: Invalid stationId ${stationId}. Planning generation requires a valid station ID.`);
    }
    
    console.log(`generateMonthlySchedule called with stationId: ${stationId}`);
    
    // Verwijder bestaande shifts voor deze maand en station
    const deleteConditions = [
      eq(shifts.month, month),
      eq(shifts.year, year),
      eq(shifts.stationId, stationId)
    ];
    
    await db.delete(shifts).where(and(...deleteConditions));

    // Haal alle gebruikers op van dit station die uren willen werken (inclusief cross-station gebruikers)
    const stationUsers = await this.getUsersByStation(stationId);
    const activeUsers = stationUsers.filter(user => user.hours > 0);
    
    console.log(`Found ${stationUsers.length} users for station ${stationId}, ${activeUsers.length} active users`);
    
    // Maak eerst een kalender voor de maand
    const daysInMonth = new Date(year, month, 0).getDate();
    const generatedShifts: Shift[] = [];
    
    // Bijhouden hoeveel uren elke medewerker al is ingepland
    const userAssignedHours = new Map<number, number>();
    
    // Initialiseer hours tracking voor elke actieve gebruiker
    activeUsers.forEach(user => {
      userAssignedHours.set(user.id, 0);
    });
    
    // Cache voor station hour limits om database calls te vermijden
    const stationHourLimitsCache = new Map<number, number>();
    
    // Helper functie om per-station hour limiet te berekenen
    const getStationHourLimit = async (userId: number): Promise<number> => {
      const user = activeUsers.find(u => u.id === userId);
      if (!user) return 0;
      
      // Als dit de primaire station van de gebruiker is, gebruik user.hours
      if (user.stationId === stationId) {
        return user.hours;
      }
      
      // Anders zoek in userStations tabel voor cross-station limiet
      const stationAssignment = await db
        .select()
        .from(userStations)
        .where(and(eq(userStations.userId, userId), eq(userStations.stationId, stationId)))
        .limit(1);
      
      return stationAssignment.length > 0 ? stationAssignment[0].maxHours : 0;
    };
    
    // === CONSECUTIVE SHIFT VALIDATOR ===
    // KRITIEKE VEILIGHEIDSCHECK: Voorkom dat mensen opeenvolgende shiften krijgen
    const hasConsecutiveShiftConflict = async (userId: number, proposedDate: Date, proposedStartTime: Date, proposedEndTime: Date): Promise<boolean> => {
      const proposedDay = proposedDate.getDate();
      
      // Controleer bestaande shifts voor deze gebruiker in deze maand
      const existingUserShifts = generatedShifts.filter(shift => shift.userId === userId && shift.status === 'planned');
      
      // REGEL 1: Check vorige dag (geen shift die eindigt binnen 12 uur van deze shift)
      const previousDay = proposedDay - 1;
      if (previousDay >= 1) {
        const previousDayShifts = existingUserShifts.filter(shift => shift.date.getDate() === previousDay);
        
        for (const prevShift of previousDayShifts) {
          const prevEndTime = prevShift.endTime;
          const timeDiffHours = (proposedStartTime.getTime() - prevEndTime.getTime()) / (1000 * 60 * 60);
          
          if (timeDiffHours < 12) {
            console.log(`🚨 CONSECUTIVE SHIFT BLOCKED: User ${userId} has shift ending ${prevEndTime.toLocaleTimeString()} on day ${previousDay}, too close to proposed shift starting ${proposedStartTime.toLocaleTimeString()} on day ${proposedDay} (${timeDiffHours.toFixed(1)}h gap)`);
            return true;
          }
        }
      }
      
      // REGEL 2: Check volgende dag (deze shift mag niet eindigen binnen 12 uur van volgende shift)
      const nextDay = proposedDay + 1;
      if (nextDay <= daysInMonth) {
        const nextDayShifts = existingUserShifts.filter(shift => shift.date.getDate() === nextDay);
        
        for (const nextShift of nextDayShifts) {
          const nextStartTime = nextShift.startTime;
          const timeDiffHours = (nextStartTime.getTime() - proposedEndTime.getTime()) / (1000 * 60 * 60);
          
          if (timeDiffHours < 12) {
            console.log(`🚨 CONSECUTIVE SHIFT BLOCKED: User ${userId} proposed shift ending ${proposedEndTime.toLocaleTimeString()} on day ${proposedDay}, too close to existing shift starting ${nextStartTime.toLocaleTimeString()} on day ${nextDay} (${timeDiffHours.toFixed(1)}h gap)`);
            return true;
          }
        }
      }
      
      // REGEL 3: EXTRA STRENGE CHECK - Geen shifts op dezelfde dag die elkaar overlappen of raken
      const sameDayShifts = existingUserShifts.filter(shift => shift.date.getDate() === proposedDay);
      if (sameDayShifts.length > 0) {
        console.log(`🚨 CONSECUTIVE SHIFT BLOCKED: User ${userId} already has shift on day ${proposedDay} - maximum 1 shift per day`);
        return true;
      }
      
      return false; // Geen conflict gevonden
    };

    // === RIJBEWIJS C VALIDATOR ===
    // KRITIEKE VEILIGHEIDSCHECK: Zorg ervoor dat er minimaal 1 ambulancier met rijbewijs C per shift-team is
    const needsDrivingLicenseC = (assignedUserIds: number[], targetShifts: number, candidateUserId: number): boolean => {
      // Als er maar 1 shift nodig is (1 ambulance), dan is rijbewijs C niet kritiek
      if (targetShifts <= 1) return false;
      
      // Als we de laatste positie invullen EN alle anderen hebben geen rijbewijs C, dan MOET deze wel
      if (assignedUserIds.length === targetShifts - 1) {
        // Check of alle reeds toegewezen users GEEN rijbewijs C hebben
        const allLackLicense = assignedUserIds.every(userId => {
          const user = activeUsers.find(u => u.id === userId);
          return user && !user.hasDrivingLicenseC;
        });
        
        if (allLackLicense) {
          // Check of de candidate rijbewijs C heeft
          const candidateUser = activeUsers.find(u => u.id === candidateUserId);
          const candidateHasLicense = candidateUser?.hasDrivingLicenseC ?? true; // Default true voor backwards compatibility
          
          if (!candidateHasLicense) {
            console.log(`🚗 DRIVING LICENSE CHECK: User ${candidateUserId} blocked - need driving license C (all ${assignedUserIds.length} assigned users lack it)`);
            return true; // Blokkeer deze user
          }
        }
      }
      
      return false; // Geen blokkade
    };

    // CROSS-STATION FIX: Initialiseer station-specifieke hour limits voor alle gebruikers
    console.log('Initializing station-specific hour limits...');
    for (const user of activeUsers) {
      const stationLimit = await getStationHourLimit(user.id);
      stationHourLimitsCache.set(user.id, stationLimit);
      console.log(`User ${user.username} (${user.id}): station ${stationId} limit = ${stationLimit}h`);
    }
    
    console.log(`Generating schedule for ${month}/${year} with ${activeUsers.length} actieve gebruikers`);
    
    // PERFORMANCE FIX 1: Prefetch ALL shift preferences for the month ONCE to fix N+1 query problem
    const allPreferences = await db.select()
      .from(shiftPreferences)
      .where(
        and(
          eq(shiftPreferences.month, month),
          eq(shiftPreferences.year, year)
        )
      );
    
    // Build in-memory index by userId+date for O(1) lookups
    const preferencesIndex = new Map<string, ShiftPreference[]>();
    for (const pref of allPreferences) {
      const key = `${pref.userId}_${pref.date.getDate()}`;
      if (!preferencesIndex.has(key)) {
        preferencesIndex.set(key, []);
      }
      preferencesIndex.get(key)!.push(pref);
    }
    
    // PERFORMANCE FIX 2: Precompute weekend shift history for all active users ONCE 
    const yearStart = new Date(year, 0, 1);
    const lastMonth = new Date(year, month - 1, 0);
    
    const allWeekendShifts = await db.select()
      .from(shifts)
      .where(and(
        gte(shifts.date, yearStart),
        lte(shifts.date, lastMonth),
        ne(shifts.status, "open")
      ));
    
    // 🎉 FEESTDAG FIX: Preload alle feestdagen voor eerlijke weekend verdeling
    // KRITIEKE FIX: Selecteer ZOWEL globale ALS station-specifieke feestdagen
    const allHolidays = await db.select()
      .from(holidays)
      .where(and(
        eq(holidays.year, year),
        eq(holidays.isActive, true),
        // Selecteer globale feestdagen (NULL stationId) + station-specifieke feestdagen
        stationId ? or(isNull(holidays.stationId), eq(holidays.stationId, stationId)) : isNull(holidays.stationId)
      ));
    
    // Build holiday date set voor snelle lookup
    const holidayDates = new Set<string>();
    for (const holiday of allHolidays) {
      holidayDates.add(holiday.date);
    }
    
    // Build weekend history cache (inclusief feestdagen!)
    const weekendHistoryCache = new Map<number, number>();
    for (const user of activeUsers) {
      const userWeekendShifts = allWeekendShifts.filter(shift => {
        if (shift.userId !== user.id) return false;
        const shiftDay = shift.date.getDay();
        const isWeekend = shiftDay === 0 || shiftDay === 6; // Sunday or Saturday
        // 🔧 TIMEZONE FIX: Use local date formatting to avoid UTC drift
        const shiftDateString = `${shift.date.getFullYear()}-${String(shift.date.getMonth() + 1).padStart(2, '0')}-${String(shift.date.getDate()).padStart(2, '0')}`;
        const isHoliday = holidayDates.has(shiftDateString);
        return isWeekend || isHoliday; // 🎉 Feestdagen tellen nu mee als weekend shifts!
      });
      weekendHistoryCache.set(user.id, userWeekendShifts.length);
    }
    
    console.log(`Performance optimizations: ${allPreferences.length} preferences preloaded, ${allWeekendShifts.length} weekend shifts analyzed`);
    
    // WEEKDAY CONFIG FIX: Preload weekday configurations for this station
    const allWeekdayConfigs = await db.select()
      .from(weekdayConfigs)
      .where(eq(weekdayConfigs.stationId, stationId));
    
    // Build weekday config map by day of week (0=Sunday, 1=Monday, etc.)
    const weekdayConfigMap = new Map<number, WeekdayConfig>();
    for (const config of allWeekdayConfigs) {
      weekdayConfigMap.set(config.dayOfWeek, config);
    }
    
    // Default fallback config if none found
    const defaultConfig = {
      dayShiftCount: 2,
      nightShiftCount: 2,
      allowSplitShifts: true,
      enableDayShifts: true,
      enableNightShifts: true
    };
    
    console.log(`Weekday configs loaded: ${allWeekdayConfigs.length} configs for station ${stationId}`);
    
    // Progress tracking
    if (progressCallback) {
      progressCallback(5, `Voorbereidingen afgerond. ${activeUsers.length} actieve gebruikers gevonden.`);
    }
    
    // PERFORMANCE FIX: Use precomputed weekend history instead of querying database per user
    const getWeekendShiftHistory = (userId: number): number => {
      return weekendHistoryCache.get(userId) || 0;
    };
    
    // Helper functie om te controleren of beroepspersoneel kan worden toegewezen (ALLE STATIONS + SPLIT-DAY SUPPORT)
    const canProfessionalBeAssigned = async (userId: number, shiftDate: Date): Promise<boolean> => {
      const user = activeUsers.find(u => u.id === userId);
      if (!user || !user.isProfessional) return true; // Non-professionals are not restricted
      
      // Bereken start en eind van de week (maandag tot zondag)
      const startOfWeek = new Date(shiftDate);
      const currentDay = startOfWeek.getDay();
      const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Als zondag (0), ga 6 dagen terug
      startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      const currentDayKey = shiftDate.toDateString();
      
      // CRITICAL FIX: Query database voor bestaande shifts in ALLE stations voor deze week
      const existingShifts = await db.select()
        .from(shifts)
        .where(and(
          eq(shifts.userId, userId),
          ne(shifts.status, "open"), // Include all non-open shifts (planned, assigned, confirmed, etc.)
          gte(shifts.date, startOfWeek),
          lte(shifts.date, endOfWeek)
        ));
      
      // Tel unieke dagen (splits op dezelfde dag tellen als 1 shift)
      const existingDays = new Set<string>();
      for (const shift of existingShifts) {
        const dayKey = shift.date.toDateString();
        existingDays.add(dayKey);
      }
      
      // Tel shifts van deze maand's generatie (nog niet opgeslagen)
      const newDays = new Set<string>();
      for (const shift of generatedShifts) {
        if (shift.userId === userId && 
            shift.date >= startOfWeek && 
            shift.date <= endOfWeek &&
            shift.status === "planned") {
          const dayKey = shift.date.toDateString();
          newDays.add(dayKey);
        }
      }
      
      // Combineer unique dagen uit database en nieuwe generatie
      const allDays = new Set([...existingDays, ...newDays]);
      
      // SPLIT-DAY FIX: Sta toe als de enige bestaande dag dezelfde is als de huidige shift datum
      if (allDays.size === 0) {
        // Geen shifts deze week - mag worden toegewezen
        console.log(`Professional ${user.username} (${userId}) heeft nog geen shifts deze week - mag worden toegewezen`);
        return true;
      } else if (allDays.size === 1 && allDays.has(currentDayKey)) {
        // Alleen shifts op dezelfde dag - mag worden toegewezen (split shift)
        console.log(`Professional ${user.username} (${userId}) heeft alleen shifts op ${currentDayKey} - split shift toegestaan`);
        return true;
      } else {
        // Shifts op andere dagen - mag niet worden toegewezen
        const otherDays = Array.from(allDays).filter(day => day !== currentDayKey);
        console.log(`BEPERKING: Professional ${user.username} (${userId}) heeft al shifts op andere dagen deze week: ${otherDays.join(', ')} - max 1 dag per week`);
        return false;
      }
    };

    // Helper functie om te controleren of een gebruiker nog uren kan werken
    const canAssignHours = async (userId: number, hoursToAdd: number, shiftDate: Date): Promise<boolean> => {
      const user = activeUsers.find(u => u.id === userId);
      if (!user) return false;
      
      // BEROEPSPERSONEEL BEPERKING: Maximaal 1 shift dag per week (ALLE STATIONS + SPLIT-DAY SUPPORT)
      const canBeAssigned = await canProfessionalBeAssigned(userId, shiftDate);
      if (!canBeAssigned) {
        return false;
      }
      
      const currentHours = userAssignedHours.get(userId) || 0;
      
      // Get cached station hour limit
      let stationLimit = stationHourLimitsCache.get(userId);
      if (stationLimit === undefined) {
        // Als niet gecached, gebruik primaire uren als fallback
        // (Dit wordt later in de cache gevuld door de async setup)
        stationLimit = user.stationId === stationId ? user.hours : 0;
      }
      
      // Nul doeluren betekent dat deze gebruiker niet ingedeeld moet worden
      if (stationLimit === 0) return false;
      
      // Log voor debugging
      console.log(`Checking user ${user.username} (ID: ${userId}): stationLimit=${stationLimit}, currentHours=${currentHours}, adding=${hoursToAdd}, isProfessional=${user.isProfessional}`);
      
      // Controleer of deze toewijzing binnen de station-specifieke uren valt
      return currentHours + hoursToAdd <= stationLimit;
    };
    
    // Helper functie om bij te houden hoeveel uren een gebruiker werkt
    const addAssignedHours = (userId: number, hoursToAdd: number): void => {
      if (userId === 0) return; // 0 = niet toegewezen
      const currentHours = userAssignedHours.get(userId) || 0;
      userAssignedHours.set(userId, currentHours + hoursToAdd);
    };
    
    // Bereken gewicht voor toewijzing op basis van huidige uren
    const getUserWeight = (userId: number, preferredHours: number = 0): number => {
      const user = activeUsers.find(u => u.id === userId);
      if (!user) return 0;
      
      const currentHours = userAssignedHours.get(userId) || 0;
      const targetHours = user.hours;
      
      // Nul doeluren betekent dat deze gebruiker niet ingedeeld moet worden
      if (targetHours === 0) {
        return 0;
      }
      
      // Als gebruiker minder dan 50% van zijn opgegeven uren heeft, hogere prioriteit geven
      if (currentHours < targetHours * 0.5) {
        return 2.0;
      }
      
      // Als gebruiker tussen 50% en 75% van zijn opgegeven uren heeft, gemiddelde prioriteit
      if (currentHours < targetHours * 0.75) {
        return 1.0;
      }
      
      // Als gebruiker meer dan 75% maar minder dan zijn opgegeven uren heeft, lagere prioriteit
      if (currentHours < targetHours) {
        return 0.5;
      }
      
      // Gebruiker is al aan opgegeven uren, laagste prioriteit
      return 0.1;
    };
    
    // PERFORMANCE FIX: Use precomputed data - no more async calls or Promise.all
    const getSortedUsersForWeekendAssignment = (availableUserIds: number[]): number[] => {
      const filteredUsers = availableUserIds.filter(userId => {
        const user = activeUsers.find(u => u.id === userId);
        if (!user) return false;
        if (user.hours === 0) return false;
        const currentHours = userAssignedHours.get(userId) || 0;
        return currentHours < user.hours;
      });

      const usersWithHistory = filteredUsers.map(userId => ({
        userId,
        weekendShifts: getWeekendShiftHistory(userId),
        currentHours: userAssignedHours.get(userId) || 0
      }));

      return usersWithHistory
        .sort((a, b) => {
          // Eerste prioriteit: minder weekend shiften in geschiedenis (jaarbasis)
          if (a.weekendShifts !== b.weekendShifts) {
            return a.weekendShifts - b.weekendShifts;
          }
          // Tweede prioriteit: minder uren toegewezen deze maand
          return a.currentHours - b.currentHours;
        })
        .map(user => user.userId);
    };

    // Functie om actieve gebruikers te sorteren op basis van werklast en voorkeuren
    const getSortedUsersForAssignment = (availableUserIds: number[]): number[] => {
      // Eerst filteren op gebruikers die nog uren kunnen werken
      const filteredUsers = availableUserIds.filter(userId => {
        const user = activeUsers.find(u => u.id === userId);
        if (!user) return false;
        
        // Nul doeluren betekent dat deze gebruiker niet ingedeeld moet worden
        if (user.hours === 0) return false;
        
        const currentHours = userAssignedHours.get(userId) || 0;
        return currentHours < user.hours;
      });
      
      // Willekeurigheid toevoegen aan de sortering voor meer variatie
      // We maken drie groepen op basis van uren:
      // 1. Urgente groep: minder dan 33% van uren gewerkt
      // 2. Normale groep: tussen 33-66% van uren gewerkt
      // 3. Lage prioriteit groep: meer dan 66% van uren gewerkt
      
      const urgentUsers: number[] = [];
      const normalUsers: number[] = [];
      const lowPriorityUsers: number[] = [];
      
      filteredUsers.forEach(userId => {
        const user = activeUsers.find(u => u.id === userId);
        if (!user) return;
        
        const currentHours = userAssignedHours.get(userId) || 0;
        const percentage = (currentHours / user.hours) * 100;
        
        if (percentage < 33) {
          urgentUsers.push(userId);
        } else if (percentage < 66) {
          normalUsers.push(userId);
        } else {
          lowPriorityUsers.push(userId);
        }
      });
      
      // Shuffle binnen elke groep voor willekeurigheid
      const shuffle = (array: number[]) => {
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
      };
      
      // Combineer de groepen in volgorde van prioriteit
      return [
        ...shuffle([...urgentUsers]),
        ...shuffle([...normalUsers]),
        ...shuffle([...lowPriorityUsers])
      ];
    };
    
    // === SCARCITY-FIRST OPTIMIZATION ===
    // Stap 1: Bereken kandidaten voor elke dag VOORDAT we beginnen met toewijzen
    console.log("=== SCARCITY-FIRST ANALYSIS STARTING ===");
    
    type DayInfo = {
      day: number;
      date: Date;
      dayOfWeek: number;
      targetDayShifts: number;
      targetNightShifts: number;
      allowSplitShifts: boolean;
      candidatesForDay: number[];
      candidatesForNight: number[];
      candidateCount: number; // Totaal aantal kandidaten voor alle shifts
      difficultyScore: number; // Hoger = moeilijker in te vullen
    };
    
    const allDayInfos: DayInfo[] = [];
    
    // Bereken kandidaten en moeilijkheid voor elke dag
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month - 1, day);
      const dayOfWeek = currentDate.getDay();
      
      // 🎉 FEESTDAG FIX: Check of deze dag een feestdag is (gebruik preloaded data)
      const currentDateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      const isHolidayDay = holidayDates.has(currentDateString);
      const isWeekendOrHoliday = dayOfWeek === 0 || dayOfWeek === 6 || isHolidayDay;
      
      // 🔧 KRITIEKE FIX: Feestdagen krijgen altijd Sunday configuratie
      const effectiveDayOfWeek = isHolidayDay ? 0 : dayOfWeek; // Treat holidays as Sunday config
      const weekdayConfig = weekdayConfigMap.get(effectiveDayOfWeek) || defaultConfig;
      
      const targetDayShifts = (weekdayConfig.enableDayShifts !== false) ? (weekdayConfig.dayShiftCount || 0) : 0;
      const targetNightShifts = (weekdayConfig.enableNightShifts !== false) ? (weekdayConfig.nightShiftCount || 0) : 0;
      const allowSplitShifts = weekdayConfig.allowSplitShifts ?? true;
      
      // Skip dagen zonder shifts
      if (targetDayShifts === 0 && targetNightShifts === 0) {
        continue;
      }
      
      // Bepaal beschikbare kandidaten voor deze dag
      const candidatesForDay: number[] = [];
      const candidatesForNight: number[] = [];
      
      for (const user of activeUsers) {
        const key = `${user.id}_${day}`;
        const prefsForThisDay = preferencesIndex.get(key) || [];
        
        // Skip unavailable users (check both type='unavailable' AND notes='Niet beschikbaar')
        const isUnavailable = prefsForThisDay.some(pref => 
          pref.type === 'unavailable' || pref.notes === 'Niet beschikbaar'
        );
        if (isUnavailable) continue;
        
        // Check hours capacity
        const currentHours = userAssignedHours.get(user.id) || 0;
        if (currentHours >= user.hours) continue;
        
        // Check for day preferences
        const hasDayPreference = prefsForThisDay.some(pref => pref.type === 'day');
        if (hasDayPreference && targetDayShifts > 0) {
          candidatesForDay.push(user.id);
        }
        
        // Check for night preferences  
        const hasNightPreference = prefsForThisDay.some(pref => pref.type === 'night');
        if (hasNightPreference && targetNightShifts > 0) {
          candidatesForNight.push(user.id);
        }
      }
      
      const totalCandidates = candidatesForDay.length + candidatesForNight.length;
      const totalShiftsNeeded = targetDayShifts + targetNightShifts;
      
      // Bereken moeilijkheidscore: weinig kandidaten = hoge score, weekend/feestdag = extra moeilijk
      const isWeekend = isWeekendOrHoliday;
      const candidateRatio = totalCandidates > 0 ? totalShiftsNeeded / totalCandidates : 999;
      const difficultyScore = candidateRatio + (isWeekend ? 0.5 : 0) + (day > 25 ? 0.3 : 0); // Late dagen extra moeilijk
      
      allDayInfos.push({
        day,
        date: currentDate,
        dayOfWeek,
        targetDayShifts,
        targetNightShifts,
        allowSplitShifts,
        candidatesForDay,
        candidatesForNight,
        candidateCount: totalCandidates,
        difficultyScore
      });
      
      console.log(`Day ${day}: ${totalCandidates} candidates for ${totalShiftsNeeded} shifts (difficulty: ${difficultyScore.toFixed(2)})`);
    }
    
    // Sorteer dagen op moeilijkheid: MOEILIJKSTE EERST!
    allDayInfos.sort((a, b) => {
      // Eerst op difficulty score (hoger = moeilijker eerst)
      if (Math.abs(a.difficultyScore - b.difficultyScore) > 0.1) {
        return b.difficultyScore - a.difficultyScore;
      }
      // Dan op kandidaten aantal (minder kandidaten eerst)
      if (a.candidateCount !== b.candidateCount) {
        return a.candidateCount - b.candidateCount;
      }
      // Dan op dag (later in maand eerst)
      return b.day - a.day;
    });
    
    console.log("=== SCARCITY-FIRST ORDER ===");
    allDayInfos.forEach(dayInfo => {
      console.log(`Processing order: Day ${dayInfo.day} (difficulty: ${dayInfo.difficultyScore.toFixed(2)}, candidates: ${dayInfo.candidateCount})`);
    });
    
    // Loop door alle dagen in SCARCITY-FIRST volgorde
    for (let i = 0; i < allDayInfos.length; i++) {
      const dayInfo = allDayInfos[i];
      const { day, date: currentDate, dayOfWeek, targetDayShifts, targetNightShifts, allowSplitShifts } = dayInfo;
      
      console.log(`Processing day ${day}: ${currentDate.toDateString()} (${i + 1}/${allDayInfos.length})`);
      
      // Progress update
      if (progressCallback) {
        const progressPercent = Math.round((i / allDayInfos.length) * 90) + 5; // 5-95%
        progressCallback(progressPercent, `Verwerken dag ${day} van ${daysInMonth} (scarcity-first)`);
      }
      
      console.log(`Day ${day} (${['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'][dayOfWeek]}): target ${targetDayShifts} dag, ${targetNightShifts} nacht shifts`);
      
      // SCARCITY-FIRST: Gebruik pre-berekende kandidatenlijsten
      const availableForDay: number[] = [...dayInfo.candidatesForDay];
      const availableForDayFirstHalf: number[] = [];
      const availableForDaySecondHalf: number[] = [];
      const availableForNight: number[] = [...dayInfo.candidatesForNight];
      const availableForNightFirstHalf: number[] = [];
      const availableForNightSecondHalf: number[] = [];
      
      // Verfijn split shift lijsten als toegestaan
      if (allowSplitShifts) {
        for (const userId of availableForDay) {
          const key = `${userId}_${day}`;
          const prefsForThisDay = preferencesIndex.get(key) || [];
          
          let hasSpecificSplitPreference = false;
          
          for (const pref of prefsForThisDay) {
            if (pref.type === 'day') {
              // Check splitType eerst (nieuwe field), fallback naar notes voor backward compatibility
              if (pref.splitType === 'morning') {
                availableForDayFirstHalf.push(userId);
                hasSpecificSplitPreference = true;
              } else if (pref.splitType === 'afternoon') {
                availableForDaySecondHalf.push(userId);
                hasSpecificSplitPreference = true;
              } else {
                // Fallback: check notes voor oude preferences
                const splitInfo = pref.notes?.toLowerCase() || '';
                if (splitInfo.includes('first')) {
                  availableForDayFirstHalf.push(userId);
                  hasSpecificSplitPreference = true;
                } else if (splitInfo.includes('second')) {
                  availableForDaySecondHalf.push(userId);
                  hasSpecificSplitPreference = true;
                }
              }
            }
          }
          
          // BUG FIX: Gebruikers die HELE DAG beschikbaar zijn (geen specifieke split voorkeur)
          // moeten ook beschikbaar zijn voor halve shifts, zodat ze kunnen worden toegewezen
          // aan resterende voormiddag of namiddag slots als de volle shift niet lukt
          if (!hasSpecificSplitPreference) {
            availableForDayFirstHalf.push(userId);
            availableForDaySecondHalf.push(userId);
          }
        }
      }
      
      // Update candidate counts na eventuele eerdere toewijzingen
      const updatedAvailableForDay = availableForDay.filter(userId => {
        const currentHours = userAssignedHours.get(userId) || 0;
        const user = activeUsers.find(u => u.id === userId);
        return user && currentHours < user.hours;
      });
      
      const updatedAvailableForNight = availableForNight.filter(userId => {
        const currentHours = userAssignedHours.get(userId) || 0;
        const user = activeUsers.find(u => u.id === userId);
        return user && currentHours < user.hours;
      });
      
      console.log(`Day ${day} UPDATED availability: Day=${updatedAvailableForDay.length}, Night=${updatedAvailableForNight.length} (original: ${dayInfo.candidateCount})`);
      
      // Gebruik de gefilterde lijsten voor verdere verwerking
      availableForDay.length = 0;
      availableForDay.push(...updatedAvailableForDay);
      availableForNight.length = 0; 
      availableForNight.push(...updatedAvailableForNight);
      
      console.log(`Day ${day} availability: Day=${availableForDay.length}, DayFirstHalf=${availableForDayFirstHalf.length}, DaySecondHalf=${availableForDaySecondHalf.length}, Night=${availableForNight.length}, NightFirstHalf=${availableForNightFirstHalf.length}, NightSecondHalf=${availableForNightSecondHalf.length}`);
      
      // Weekend check voor ervaren verdelings systeem
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6; // Sunday = 0, Saturday = 6
      
      // DAGSHIFT - Dynamic target based on weekday config instead of hard-coded 2
      const assignedDayIds: number[] = [];
      
      // ONLY process day shifts if target > 0
      if (targetDayShifts > 0) {
        // Sorteer beschikbare gebruikers op basis van weekend geschiedenis als het weekend is
        const dayUsersToUse = isWeekend 
          ? getSortedUsersForWeekendAssignment(availableForDay)
          : getSortedUsersForAssignment(availableForDay);
        
        const dayShiftHours = 12; // 12 uur per dagshift
        let assignedFullDayShifts = 0;
        
        // Probeer EERST volledige dagshifts toe te wijzen - MAX PRIORITEIT AAN 12-UURS SHIFTS!
        for (const userId of dayUsersToUse) {
          if (assignedFullDayShifts >= targetDayShifts) break; // Dynamic target from weekday config
          
          // 🔧 SPLIT SHIFT FIX: Skip gebruikers die expliciet ALLEEN voormiddag of namiddag willen
          const key = `${userId}_${day}`;
          const prefsForThisDay = preferencesIndex.get(key) || [];
          const hasExplicitSplitPreference = prefsForThisDay.some(pref => {
            if (pref.type === 'day') {
              const splitInfo = pref.notes?.toLowerCase() || '';
              return splitInfo.includes('first') || splitInfo.includes('second');
            }
            return false;
          });
          
          if (hasExplicitSplitPreference) {
            console.log(`⚠️ Skipping user ${userId} for FULL day shift - has explicit split preference (voormiddag/namiddag only)`);
            continue;
          }
          
          if (await canAssignHours(userId, dayShiftHours, currentDate)) {
            // KRITIEKE CROSS-TEAM VALIDATIE: Check for conflicting shifts in andere stations
            const shiftStartTime = new Date(Date.UTC(year, month - 1, day, 7, 0, 0));
            const shiftEndTime = new Date(Date.UTC(year, month - 1, day, 19, 0, 0));
            const hasConflict = await this.hasConflictingCrossTeamShift(
              userId, 
              currentDate, 
              shiftStartTime, 
              shiftEndTime, 
              stationId, 
              month, 
              year
            );
            
            if (hasConflict) {
              console.log(`⚠️ Skipping VOLLEDIGE day shift voor cross-team user ${userId} - conflict gedetecteerd met andere station`);
              continue;
            }

            // 🚨 CONSECUTIVE SHIFT SAFETY CHECK
            const consecutiveConflict = await hasConsecutiveShiftConflict(userId, currentDate, shiftStartTime, shiftEndTime);
            if (consecutiveConflict) {
              console.log(`🚨 SAFETY BLOCK: Skipping day shift voor user ${userId} - consecutive shift conflict`);
              continue;
            }

            // 🚗 RIJBEWIJS C SAFETY CHECK
            if (needsDrivingLicenseC(assignedDayIds, targetDayShifts, userId)) {
              console.log(`🚗 SAFETY BLOCK: Skipping day shift voor user ${userId} - driving license C required`);
              continue;
            }

            const dayShift = {
              userId: userId,
              date: currentDate,
              type: "day" as const,
              startTime: new Date(Date.UTC(year, month - 1, day, 7, 0, 0)),
              endTime: new Date(Date.UTC(year, month - 1, day, 19, 0, 0)),
              status: "planned" as const,
              stationId: stationId,
              month,
              year,
              isSplitShift: false
            };
            
            assignedDayIds.push(userId);
            addAssignedHours(userId, dayShiftHours);
            assignedFullDayShifts++;
            
            const savedDayShift = await this.createShift(dayShift);
            generatedShifts.push(savedDayShift);
            
            console.log(`Assigned FULL day shift (12h) to user ${userId} for day ${day}`);
          }
        }
        
        // ALLEEN als we nog steeds shifts nodig hebben, probeer split shifts
        const stillNeedDayShifts = targetDayShifts - assignedFullDayShifts;
        
        // Track split shift assignments - aantal shifts per tijdslot
        // CRITICAL: Volle dagshifts dekken BEIDE tijdslots, dus beginnen met assignedFullDayShifts!
        let assignedMorningShifts = assignedFullDayShifts;
        let assignedAfternoonShifts = assignedFullDayShifts;
        
        if (stillNeedDayShifts > 0 && allowSplitShifts) {
          console.log(`Still need ${stillNeedDayShifts} day shifts for day ${day}, now trying split shifts (6h each)`);
          console.log(`🎯 Voor coverage van ${targetDayShifts} personen, hebben we nodig: ${targetDayShifts}x voormiddag + ${targetDayShifts}x namiddag`);
          console.log(`📊 Current coverage: ${assignedFullDayShifts} full shifts (count for both AM/PM), need ${stillNeedDayShifts} more`);
          
          // Eerste helft van de dag (7:00 - 13:00) - blijf proberen tot we targetDayShifts personen hebben!
          const sortedDayFirstHalfUsers = getSortedUsersForAssignment(
            availableForDayFirstHalf.filter(id => !assignedDayIds.includes(id))
          );
          
          if (sortedDayFirstHalfUsers.length > 0) {
            const halfShiftHours = 6;
            
            for (const userId of sortedDayFirstHalfUsers) {
              // STOP als we genoeg voormiddag shifts hebben (volledige shifts tellen al mee!)
              if (assignedMorningShifts >= targetDayShifts) {
                console.log(`✅ Genoeg voormiddag shifts toegewezen (${assignedMorningShifts}/${targetDayShifts})`);
                break;
              }
              

              if (await canAssignHours(userId, halfShiftHours, currentDate)) {
                // BUSINESS RULE: Check if cross-team user can receive split shift in simple system
                const canReceiveSplit = await this.canUserReceiveSplitShift(userId, stationId);
                if (!canReceiveSplit) {
                  console.log(`⚠️ Skipping split day shift voor cross-team user ${userId} in eenvoudig systeem (station ${stationId})`);
                  continue;
                }

                // KRITIEKE CROSS-TEAM VALIDATIE: Check for conflicting shifts in andere stations
                const shiftStartTime = new Date(Date.UTC(year, month - 1, day, 7, 0, 0));
                const shiftEndTime = new Date(Date.UTC(year, month - 1, day, 13, 0, 0));
                const hasConflict = await this.hasConflictingCrossTeamShift(
                  userId, 
                  currentDate, 
                  shiftStartTime, 
                  shiftEndTime, 
                  stationId, 
                  month, 
                  year
                );
                
                if (hasConflict) {
                  console.log(`⚠️ Skipping SPLIT day shift (eerste helft) voor cross-team user ${userId} - conflict gedetecteerd met andere station`);
                  continue;
                }

                // 🚨 CONSECUTIVE SHIFT SAFETY CHECK
                const consecutiveConflict = await hasConsecutiveShiftConflict(userId, currentDate, shiftStartTime, shiftEndTime);
                if (consecutiveConflict) {
                  console.log(`🚨 SAFETY BLOCK: Skipping split day shift (eerste helft) voor user ${userId} - consecutive shift conflict`);
                  continue;
                }

                const dayHalfShift1 = {
                  userId: userId,
                  date: currentDate,
                  type: "day" as const,
                  startTime: new Date(Date.UTC(year, month - 1, day, 7, 0, 0)),
                  endTime: new Date(Date.UTC(year, month - 1, day, 13, 0, 0)),
                  status: "planned" as const,
                  stationId: stationId,
                  month,
                  year,
                  isSplitShift: true,
                  splitStartTime: new Date(Date.UTC(year, month - 1, day, 7, 0, 0)),
                  splitEndTime: new Date(Date.UTC(year, month - 1, day, 13, 0, 0))
                };
                
                assignedDayIds.push(userId);
                addAssignedHours(userId, halfShiftHours);
                const savedHalfShift1 = await this.createShift(dayHalfShift1);
                generatedShifts.push(savedHalfShift1);
                assignedMorningShifts++;
                console.log(`✅ Voormiddag shift ${assignedMorningShifts}/${targetDayShifts} toegewezen aan user ${userId}`);
                // NIET STOPPEN - blijf proberen tot we targetDayShifts voormiddag shifts hebben!
              }
            }
          }
          
          // Tweede helft van de dag (13:00 - 19:00) - blijf proberen tot we targetDayShifts personen hebben!
          const sortedDaySecondHalfUsers = getSortedUsersForAssignment(
            availableForDaySecondHalf.filter(id => !assignedDayIds.includes(id))
          );
          
          if (sortedDaySecondHalfUsers.length > 0) {
            const halfShiftHours = 6;
            
            for (const userId of sortedDaySecondHalfUsers) {
              // STOP als we genoeg namiddag shifts hebben (volledige shifts tellen al mee!)
              if (assignedAfternoonShifts >= targetDayShifts) {
                console.log(`✅ Genoeg namiddag shifts toegewezen (${assignedAfternoonShifts}/${targetDayShifts})`);
                break;
              }
              

              if (await canAssignHours(userId, halfShiftHours, currentDate)) {
                // BUSINESS RULE: Check if cross-team user can receive split shift in simple system
                const canReceiveSplit = await this.canUserReceiveSplitShift(userId, stationId);
                if (!canReceiveSplit) {
                  console.log(`⚠️ Skipping split day shift voor cross-team user ${userId} in eenvoudig systeem (station ${stationId})`);
                  continue;
                }

                // KRITIEKE CROSS-TEAM VALIDATIE: Check for conflicting shifts in andere stations  
                const shiftStartTime = new Date(Date.UTC(year, month - 1, day, 13, 0, 0));
                const shiftEndTime = new Date(Date.UTC(year, month - 1, day, 19, 0, 0));
                const hasConflict = await this.hasConflictingCrossTeamShift(
                  userId, 
                  currentDate, 
                  shiftStartTime, 
                  shiftEndTime, 
                  stationId, 
                  month, 
                  year
                );
                
                if (hasConflict) {
                  console.log(`⚠️ Skipping SPLIT day shift (tweede helft) voor cross-team user ${userId} - conflict gedetecteerd met andere station`);
                  continue;
                }

                // 🚨 CONSECUTIVE SHIFT SAFETY CHECK
                const consecutiveConflict = await hasConsecutiveShiftConflict(userId, currentDate, shiftStartTime, shiftEndTime);
                if (consecutiveConflict) {
                  console.log(`🚨 SAFETY BLOCK: Skipping split day shift (tweede helft) voor user ${userId} - consecutive shift conflict`);
                  continue;
                }

                const dayHalfShift2 = {
                  userId: userId,
                  date: currentDate,
                  type: "day" as const,
                  startTime: new Date(Date.UTC(year, month - 1, day, 13, 0, 0)),
                  endTime: new Date(Date.UTC(year, month - 1, day, 19, 0, 0)),
                  status: "planned" as const,
                  stationId: stationId,
                  month,
                  year,
                  isSplitShift: true,
                  splitStartTime: new Date(Date.UTC(year, month - 1, day, 13, 0, 0)),
                  splitEndTime: new Date(Date.UTC(year, month - 1, day, 19, 0, 0))
                };
                
                assignedDayIds.push(userId);
                addAssignedHours(userId, halfShiftHours);
                const savedHalfShift2 = await this.createShift(dayHalfShift2);
                generatedShifts.push(savedHalfShift2);
                assignedAfternoonShifts++;
                console.log(`✅ Namiddag shift ${assignedAfternoonShifts}/${targetDayShifts} toegewezen aan user ${userId}`);
                // NIET STOPPEN - blijf proberen tot we targetDayShifts namiddag shifts hebben!
              }
            }
          }
        } // Einde van split shift blok
        
        // 🔧 BUGFIX: Create open shifts ALTIJD als er nog shifts nodig zijn
        // Dit moet BUITEN de allowSplitShifts check, anders worden shifts "vergeten" in simpele systemen
        if (stillNeedDayShifts > 0) {
          const totalDayShiftsNeeded = targetDayShifts;
          
          if (allowSplitShifts) {
            // Bij split shifts: we hebben targetDayShifts personen nodig voor BEIDE tijdslots
            const stillNeedMorningShifts = targetDayShifts - assignedMorningShifts;
            const stillNeedAfternoonShifts = targetDayShifts - assignedAfternoonShifts;
            
            console.log(`📋 Split shift analysis: Morning=${assignedMorningShifts}/${targetDayShifts}, Afternoon=${assignedAfternoonShifts}/${targetDayShifts}`);
            
            // Maak open shifts voor ontbrekende voormiddag slots
            for (let i = 0; i < stillNeedMorningShifts; i++) {
              const openDayHalfShift1 = {
                userId: 0,
                date: currentDate,
                type: "day" as const,
                startTime: new Date(Date.UTC(year, month - 1, day, 7, 0, 0)),
                endTime: new Date(Date.UTC(year, month - 1, day, 13, 0, 0)),
                status: "open" as const,
                stationId: stationId,
                month,
                year,
                isSplitShift: true,
                splitStartTime: new Date(Date.UTC(year, month - 1, day, 7, 0, 0)),
                splitEndTime: new Date(Date.UTC(year, month - 1, day, 13, 0, 0))
              };
              
              const savedOpenHalfShift1 = await this.createShift(openDayHalfShift1);
              generatedShifts.push(savedOpenHalfShift1);
              console.log(`✅ Created open split day shift (7:00-13:00) #${i+1} for day ${day}`);
            }
            
            // Maak open shifts voor ontbrekende namiddag slots
            for (let i = 0; i < stillNeedAfternoonShifts; i++) {
              const openDayHalfShift2 = {
                userId: 0,
                date: currentDate,
                type: "day" as const,
                startTime: new Date(Date.UTC(year, month - 1, day, 13, 0, 0)),
                endTime: new Date(Date.UTC(year, month - 1, day, 19, 0, 0)),
                status: "open" as const,
                stationId: stationId,
                month,
                year,
                isSplitShift: true,
                splitStartTime: new Date(Date.UTC(year, month - 1, day, 13, 0, 0)),
                splitEndTime: new Date(Date.UTC(year, month - 1, day, 19, 0, 0))
              };
              
              const savedOpenHalfShift2 = await this.createShift(openDayHalfShift2);
              generatedShifts.push(savedOpenHalfShift2);
              console.log(`✅ Created open split day shift (13:00-19:00) #${i+1} for day ${day}`);
            }
          } else {
            // Voor eenvoudig systeem: maak volledige open shifts
            const totalDayShiftsAssigned = assignedFullDayShifts + (assignedMorningShifts + assignedAfternoonShifts) / 2;
            const remainingDayShifts = totalDayShiftsNeeded - totalDayShiftsAssigned;
            
            for (let i = 0; i < Math.ceil(remainingDayShifts); i++) {
                const openFullDayShift = {
                  userId: 0,
                  date: currentDate,
                  type: "day" as const,
                  startTime: new Date(Date.UTC(year, month - 1, day, 7, 0, 0)),
                  endTime: new Date(Date.UTC(year, month - 1, day, 19, 0, 0)),
                  status: "open" as const,
                  stationId: stationId,
                  month,
                  year,
                  isSplitShift: false
                };
                
                const savedOpenFullDayShift = await this.createShift(openFullDayShift);
                generatedShifts.push(savedOpenFullDayShift);
                console.log(`✅ Created open full day shift (7:00-19:00) for day ${day}`);
            }
          }
        }
      } else {
        console.log(`Skipping day shifts for day ${day} - target day shifts = 0`);
      }
      
      // NACHTSHIFT - PRIORITEIT AAN VOLLEDIGE 12-UURS SHIFTS!
      const assignedNightIds: number[] = [];
      
      // ONLY process night shifts if target > 0
      if (targetNightShifts > 0) {
        const nightShiftHours = 12;
        
        // Filter gebruikers voor nachtshift - niet dezelfde als dagshift
        const availableForNightFiltered = availableForNight.filter(
          id => !assignedDayIds.includes(id)
        );
        
        // Sorteer op basis van werklast
        const sortedNightUsers = getSortedUsersForAssignment(availableForNightFiltered);
        
        // Stap 1: Probeer EERST volledige 12-uurs nachtshifts toe te wijzen
        let assignedFullShifts = 0;
        
        for (const userId of sortedNightUsers) {
          if (assignedFullShifts >= targetNightShifts) break; // Dynamic target from weekday config
          
          if (await canAssignHours(userId, nightShiftHours, currentDate) && !assignedNightIds.includes(userId)) {
            // KRITIEKE CROSS-TEAM VALIDATIE: Check for conflicting shifts in andere stations
            const shiftStartTime = new Date(Date.UTC(year, month - 1, day, 19, 0, 0));
            const shiftEndTime = new Date(Date.UTC(year, month - 1, day + 1, 7, 0, 0));
            const hasConflict = await this.hasConflictingCrossTeamShift(
              userId, 
              currentDate, 
              shiftStartTime, 
              shiftEndTime, 
              stationId, 
              month, 
              year
            );
            
            if (hasConflict) {
              console.log(`⚠️ Skipping VOLLEDIGE night shift voor cross-team user ${userId} - conflict gedetecteerd met andere station`);
              continue;
            }

            // 🚨 CONSECUTIVE SHIFT SAFETY CHECK
            const consecutiveConflict = await hasConsecutiveShiftConflict(userId, currentDate, shiftStartTime, shiftEndTime);
            if (consecutiveConflict) {
              console.log(`🚨 SAFETY BLOCK: Skipping night shift voor user ${userId} - consecutive shift conflict`);
              continue;
            }

            // 🚗 RIJBEWIJS C SAFETY CHECK
            if (needsDrivingLicenseC(assignedNightIds, targetNightShifts, userId)) {
              console.log(`🚗 SAFETY BLOCK: Skipping night shift voor user ${userId} - driving license C required`);
              continue;
            }

            assignedNightIds.push(userId);
            addAssignedHours(userId, nightShiftHours);
            assignedFullShifts++;
            
            const nightShift = {
              userId: userId,
              date: currentDate,
              type: "night" as const,
              startTime: new Date(Date.UTC(year, month - 1, day, 19, 0, 0)),
              endTime: new Date(Date.UTC(year, month - 1, day + 1, 7, 0, 0)),
              status: "planned" as const,
              stationId: stationId,
              month,
              year,
              isSplitShift: false
            };
            
            const savedNightShift = await this.createShift(nightShift);
            generatedShifts.push(savedNightShift);
            
            console.log(`Assigned FULL night shift (12h) to user ${userId} for day ${day}`);
          }
        }
        
        // Stap 2: NIEUWE LOGIC - Alleen volledige nachtshifts (19h-7h) - geen splits meer!
        console.log(`Night shifts: assigned ${assignedFullShifts}/${targetNightShifts} full shifts (12h each). No split shifts for nights.`);
        
        // Maak open shifts voor resterende nachtshifts (volledige 19h-7h)
        const neededOpenNightShifts = targetNightShifts - assignedFullShifts;
        if (neededOpenNightShifts > 0) {
          console.log(`Creating ${neededOpenNightShifts} open full night shifts (19h-7h) for day ${day}`);
          for (let i = 0; i < neededOpenNightShifts; i++) {
            const openNightShift = {
              userId: 0,
              date: currentDate,
              type: "night" as const,
              startTime: new Date(Date.UTC(year, month - 1, day, 19, 0, 0)),
              endTime: new Date(Date.UTC(year, month - 1, day + 1, 7, 0, 0)),
              status: "open" as const,
              stationId: stationId,
              month,
              year,
              isSplitShift: false
            };

            const savedOpenShift = await this.createShift(openNightShift);
            generatedShifts.push(savedOpenShift);
          }
        }
        
        // Skip all split shift logic below and continue to next day
        continue;
        
      } // End of night shift processing (targetNightShifts > 0) - all split logic bypassed
    } // End of day loop
    
    console.log(`Generated ${generatedShifts.length} shifts for month ${month}/${year}`);
    
    // Progress tracking - optimization phase starts
    if (progressCallback) {
      progressCallback(92, `Planning basis voltooid. Start geavanceerde gap-filling...`);
    }
    
    // === GEAVANCEERDE MULTI-PASS GAP-FILLING OPTIMALISATIE ===
    console.log("=== STARTING ADVANCED GAP-FILLING OPTIMIZATION ===");
    
    // Stap 1: Analyseer huidige situatie
    const currentOpenShifts = generatedShifts.filter(shift => shift.status === "open");
    const currentAssignedShifts = generatedShifts.filter(shift => shift.status === "planned");
    
    console.log(`INITIAL STATE: ${currentOpenShifts.length} open shifts, ${currentAssignedShifts.length} assigned shifts`);
    
    // Sorteer open shifts op prioriteit: einde maand eerst, dann moeilijke dagen
    const prioritizedOpenShifts = currentOpenShifts.sort((a, b) => {
      const dayA = a.date.getDate();
      const dayB = b.date.getDate();
      
      // Late dagen (>25) krijgen hoogste prioriteit
      const latePriorityA = dayA > 25 ? 1000 : 0;
      const latePriorityB = dayB > 25 ? 1000 : 0;
      
      // Weekend bonus
      const weekendBonusA = (a.date.getDay() === 0 || a.date.getDay() === 6) ? 100 : 0;
      const weekendBonusB = (b.date.getDay() === 0 || b.date.getDay() === 6) ? 100 : 0;
      
      // Nacht shifts zijn moeilijker
      const nightBonusA = a.type === 'night' ? 50 : 0;
      const nightBonusB = b.type === 'night' ? 50 : 0;
      
      const scoreA = latePriorityA + weekendBonusA + nightBonusA + dayA;
      const scoreB = latePriorityB + weekendBonusB + nightBonusB + dayB;
      
      return scoreB - scoreA; // Hoogste score eerst
    });
    
    console.log("PRIORITIZED OPEN SHIFTS:");
    prioritizedOpenShifts.forEach(shift => {
      const day = shift.date.getDate();
      const dayName = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'][shift.date.getDay()];
      console.log(`  - Day ${day} (${dayName}) ${shift.type} shift - PRIORITY`);
    });
    
    // PASS 1: Flexibele toewijzing voor gebruikers met reserve capaciteit
    console.log("=== GAP-FILLING PASS 1: RESERVE CAPACITY ASSIGNMENT ===");
    let pass1Filled = 0;
    
    for (const openShift of prioritizedOpenShifts) {
      if (openShift.status !== "open") continue; // Skip als al ingevuld
      
      const shiftDay = openShift.date.getDate();
      const shiftHours = openShift.type === "day" ? 12 : 12; // Both 12h now
      
      // Zoek gebruikers met reserve capaciteit (minder dan 80% van hun target)
      const reserveCapacityUsers = activeUsers.filter(user => {
        const currentHours = userAssignedHours.get(user.id) || 0;
        const utilizationPercent = (currentHours / user.hours) * 100;
        
        // Heeft nog reserve capaciteit EN geen conflict
        if (utilizationPercent >= 80 || currentHours + shiftHours > user.hours) {
          return false;
        }
        
        // Check preferences - moet EXPLICIETE interesse hebben
        const key = `${user.id}_${shiftDay}`;
        const prefsForThisDay = preferencesIndex.get(key) || [];
        
        // Skip als expliciet unavailable (check both type='unavailable' AND notes='Niet beschikbaar')
        const isUnavailable = prefsForThisDay.some(pref => 
          pref.type === 'unavailable' || pref.notes === 'Niet beschikbaar'
        );
        if (isUnavailable) return false;
        
        // ⚠️ NIEUWE REGEL: Alleen gebruikers met EXPLICIETE voorkeur voor deze shift type
        const hasMatchingPref = prefsForThisDay.some(pref => pref.type === openShift.type);
        
        return hasMatchingPref;
      });
      
      // Sorteer op laagste utilization eerst
      reserveCapacityUsers.sort((a, b) => {
        const aHours = userAssignedHours.get(a.id) || 0;
        const bHours = userAssignedHours.get(b.id) || 0;
        const aUtil = (aHours / a.hours) * 100;
        const bUtil = (bHours / b.hours) * 100;
        return aUtil - bUtil;
      });
      
      if (reserveCapacityUsers.length > 0) {
        const selectedUser = reserveCapacityUsers[0];
        
        // Check voor conflicten
        const hasConflict = await this.hasConflictingCrossTeamShift(
          selectedUser.id,
          openShift.date,
          openShift.startTime,
          openShift.endTime,
          stationId,
          month,
          year
        );
        
        if (!hasConflict) {
          // 🚨 CONSECUTIVE SHIFT SAFETY CHECK
          const consecutiveConflict = await hasConsecutiveShiftConflict(selectedUser.id, openShift.date, openShift.startTime, openShift.endTime);
          if (consecutiveConflict) {
            console.log(`🚨 GAP-FILL PASS1 SAFETY BLOCK: Skipping shift voor user ${selectedUser.id} - consecutive shift conflict`);
            continue; // Skip deze gebruiker en probeer volgende
          }

          // Assign de shift!
          await db.update(shifts)
            .set({ userId: selectedUser.id, status: "planned" as const })
            .where(eq(shifts.id, openShift.id));
          
          // Update tracking
          openShift.userId = selectedUser.id;
          openShift.status = "planned";
          userAssignedHours.set(selectedUser.id, (userAssignedHours.get(selectedUser.id) || 0) + shiftHours);
          
          pass1Filled++;
          console.log(`✅ PASS1: Assigned Day ${shiftDay} ${openShift.type} to ${selectedUser.username} (reserve capacity)`);
        }
      }
    }
    
    // PASS 2: Intelligent swapping for difficult shifts
    console.log("=== GAP-FILLING PASS 2: INTELLIGENT SWAPPING ===");
    let pass2Swapped = 0;
    
    const remainingOpenShifts = generatedShifts.filter(shift => shift.status === "open");
    
    for (const openShift of remainingOpenShifts) {
      const openShiftDay = openShift.date.getDate();
      
      // Zoek assigned shifts waar iemand liever deze open shift zou willen
      for (const assignedShift of currentAssignedShifts) {
        if (assignedShift.status !== "planned" || !assignedShift.userId) continue;
        
        const assignedDay = assignedShift.date.getDate();
        const assignedUserId = assignedShift.userId;
        
        // Check of deze gebruiker liever de open shift wil
        const openKey = `${assignedUserId}_${openShiftDay}`;
        const assignedKey = `${assignedUserId}_${assignedDay}`;
        
        const openPrefs = preferencesIndex.get(openKey) || [];
        const assignedPrefs = preferencesIndex.get(assignedKey) || [];
        
        // 🔧 KRITIEKE BUG FIX: Check of gebruiker NIET unavailable is voor open shift
        // Check zowel type='unavailable' ALS notes='Niet beschikbaar'
        const isUnavailableForOpen = openPrefs.some(pref => 
          pref.type === 'unavailable' || pref.notes === 'Niet beschikbaar'
        );
        if (isUnavailableForOpen) {
          console.log(`🚨 PASS2 SKIP: User ${assignedUserId} is UNAVAILABLE for open shift day ${openShiftDay} - no swap allowed`);
          continue; // Skip deze swap - gebruiker kan niet op deze dag
        }
        
        const wantsOpenShift = openPrefs.some(pref => pref.type === openShift.type);
        const currentlyHasPreference = assignedPrefs.some(pref => pref.type === assignedShift.type);
        
        // Swap alleen als: wil open shift EN huidige toewijzing heeft geen sterke voorkeur
        if (wantsOpenShift && !currentlyHasPreference) {
          // Zoek vervanging voor de assigned shift
          const replacementCandidates = activeUsers.filter(user => {
            if (user.id === assignedUserId) return false;
            
            const currentHours = userAssignedHours.get(user.id) || 0;
            const shiftHours = assignedShift.type === "day" ? 12 : 12;
            
            if (currentHours + shiftHours > user.hours) return false;
            
            // Check preferences voor assigned shift
            const replaceKey = `${user.id}_${assignedDay}`;
            const replacePrefs = preferencesIndex.get(replaceKey) || [];
            
            const isUnavailable = replacePrefs.some(pref => 
              pref.type === 'unavailable' || pref.notes === 'Niet beschikbaar'
            );
            if (isUnavailable) return false;
            
            // ⚠️ NIEUWE REGEL: Alleen gebruikers met EXPLICIETE voorkeur voor deze shift type
            const hasMatchingPref = replacePrefs.some(pref => pref.type === assignedShift.type);
            
            return hasMatchingPref;
          });
          
          if (replacementCandidates.length > 0) {
            const replacement = replacementCandidates[0];
            
            // 🚨 DOUBLE CONSECUTIVE SHIFT SAFETY CHECK FOR SWAPPING
            // Check 1: Can original user take the open shift without conflict?
            const openShiftConflict = await hasConsecutiveShiftConflict(assignedUserId, openShift.date, openShift.startTime, openShift.endTime);
            if (openShiftConflict) {
              console.log(`🚨 GAP-FILL PASS2 SAFETY BLOCK: Original user ${assignedUserId} cannot take open shift - consecutive conflict`);
              continue; // Skip deze swap
            }
            
            // Check 2: Can replacement user take the assigned shift without conflict?
            const assignedShiftConflict = await hasConsecutiveShiftConflict(replacement.id, assignedShift.date, assignedShift.startTime, assignedShift.endTime);
            if (assignedShiftConflict) {
              console.log(`🚨 GAP-FILL PASS2 SAFETY BLOCK: Replacement user ${replacement.id} cannot take assigned shift - consecutive conflict`);
              continue; // Skip deze swap
            }
            
            // Voer de swap uit
            const openShiftHours = openShift.type === "day" ? 12 : 12;
            const assignedShiftHours = assignedShift.type === "day" ? 12 : 12;
            
            // Update database
            await db.update(shifts)
              .set({ userId: assignedUserId, status: "planned" as const })
              .where(eq(shifts.id, openShift.id));
              
            await db.update(shifts)
              .set({ userId: replacement.id })
              .where(eq(shifts.id, assignedShift.id));
            
            // Update tracking
            openShift.userId = assignedUserId;
            openShift.status = "planned";
            assignedShift.userId = replacement.id;
            
            userAssignedHours.set(assignedUserId, (userAssignedHours.get(assignedUserId) || 0) + openShiftHours - assignedShiftHours);
            userAssignedHours.set(replacement.id, (userAssignedHours.get(replacement.id) || 0) + assignedShiftHours);
            
            pass2Swapped++;
            console.log(`🔄 PASS2: SMART SWAP - User ${assignedUserId} moved to Day ${openShiftDay}, ${replacement.username} takes Day ${assignedDay}`);
            
            break; // Found a solution for this open shift
          }
        }
      }
      
      if (pass2Swapped >= 10) break; // Limit swaps to prevent excessive changes
    }
    
    // PASS 3: Last resort flexible assignment (carefully)
    console.log("=== GAP-FILLING PASS 3: CAREFUL LAST RESORT ASSIGNMENT ===");
    let pass3Filled = 0;
    
    const stillOpenShifts = generatedShifts.filter(shift => shift.status === "open");
    
    for (const openShift of stillOpenShifts.slice(0, 5)) { // Limit to 5 most critical
      const shiftDay = openShift.date.getDate();
      const shiftHours = openShift.type === "day" ? 12 : 12;
      
      // Only for end-of-month critical days (>25)
      if (shiftDay <= 25) continue;
      
      // Find users with EXPLICIT preference and capacity
      const lastResortCandidates = activeUsers.filter(user => {
        const currentHours = userAssignedHours.get(user.id) || 0;
        if (currentHours + shiftHours > user.hours) return false;
        
        const key = `${user.id}_${shiftDay}`;
        const prefsForThisDay = preferencesIndex.get(key) || [];
        
        // Skip if EXPLICITLY unavailable (check both type='unavailable' AND notes='Niet beschikbaar')
        const isExplicitlyUnavailable = prefsForThisDay.some(pref => 
          pref.type === 'unavailable' || pref.notes === 'Niet beschikbaar'
        );
        if (isExplicitlyUnavailable) return false;
        
        // ⚠️ NIEUWE REGEL: Alleen gebruikers met EXPLICIETE voorkeur voor deze shift type
        const hasMatchingPref = prefsForThisDay.some(pref => pref.type === openShift.type);
        return hasMatchingPref;
      });
      
      if (lastResortCandidates.length > 0) {
        // Sort by lowest current utilization
        lastResortCandidates.sort((a, b) => {
          const aHours = userAssignedHours.get(a.id) || 0;
          const bHours = userAssignedHours.get(b.id) || 0;
          return aHours - bHours;
        });
        
        const selectedUser = lastResortCandidates[0];
        
        // Check for conflicts
        const hasConflict = await this.hasConflictingCrossTeamShift(
          selectedUser.id,
          openShift.date,
          openShift.startTime,
          openShift.endTime,
          stationId,
          month,
          year
        );
        
        if (!hasConflict) {
          // 🚨 CONSECUTIVE SHIFT SAFETY CHECK
          const consecutiveConflict = await hasConsecutiveShiftConflict(selectedUser.id, openShift.date, openShift.startTime, openShift.endTime);
          if (consecutiveConflict) {
            console.log(`🚨 GAP-FILL PASS3 SAFETY BLOCK: Skipping last resort shift voor user ${selectedUser.id} - consecutive shift conflict`);
            continue; // Skip deze gebruiker en probeer volgende shift
          }

          await db.update(shifts)
            .set({ userId: selectedUser.id, status: "planned" as const })
            .where(eq(shifts.id, openShift.id));
          
          openShift.userId = selectedUser.id;
          openShift.status = "planned";
          userAssignedHours.set(selectedUser.id, (userAssignedHours.get(selectedUser.id) || 0) + shiftHours);
          
          pass3Filled++;
          console.log(`⚠️ PASS3: LAST RESORT - Assigned critical Day ${shiftDay} ${openShift.type} to ${selectedUser.username}`);
        }
      }
    }
    
    const totalGapsFilled = pass1Filled + pass2Swapped + pass3Filled;
    const finalOpenShifts = generatedShifts.filter(shift => shift.status === "open");
    
    console.log(`=== GAP-FILLING RESULTS SUMMARY ===`);
    console.log(`✅ Pass 1 (Reserve Capacity): ${pass1Filled} shifts filled`);
    console.log(`🔄 Pass 2 (Smart Swapping): ${pass2Swapped} swaps performed`);
    console.log(`⚠️ Pass 3 (Last Resort): ${pass3Filled} critical shifts filled`);
    console.log(`📊 TOTAL IMPROVEMENTS: ${totalGapsFilled} gaps filled`);
    console.log(`📋 REMAINING OPEN SHIFTS: ${finalOpenShifts.length}`);
    
    if (finalOpenShifts.length > 0) {
      console.log(`=== ANALYSIS: REMAINING OPEN SHIFTS ===`);
      finalOpenShifts.forEach(shift => {
        const day = shift.date.getDate();
        const dayName = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'][shift.date.getDay()];
        console.log(`  🔴 OPEN: Day ${day} (${dayName}) ${shift.type} shift - NEEDS MANUAL ATTENTION`);
        
        // Analyze why this shift couldn't be filled
        let analysisReason = "Unknown reason";
        const candidatesWithCapacity = activeUsers.filter(user => {
          const currentHours = userAssignedHours.get(user.id) || 0;
          const shiftHours = shift.type === "day" ? 12 : 12;
          return currentHours + shiftHours <= user.hours;
        });
        
        if (candidatesWithCapacity.length === 0) {
          analysisReason = "No users with sufficient hour capacity";
        } else {
          const candidatesAvailable = candidatesWithCapacity.filter(user => {
            const key = `${user.id}_${day}`;
            const prefsForThisDay = preferencesIndex.get(key) || [];
            const isUnavailable = prefsForThisDay.some(pref => pref.type === 'unavailable');
            return !isUnavailable;
          });
          
          if (candidatesAvailable.length === 0) {
            analysisReason = `${candidatesWithCapacity.length} users have capacity but all are explicitly unavailable`;
          } else {
            analysisReason = `${candidatesAvailable.length} users available but no preferences for ${shift.type} shifts`;
          }
        }
        
        console.log(`    📊 Analysis: ${analysisReason}`);
      });
      
      // Month-end analysis
      const endOfMonthOpenShifts = finalOpenShifts.filter(shift => shift.date.getDate() > 25);
      if (endOfMonthOpenShifts.length > 0) {
        console.log(`🚨 END-OF-MONTH PROBLEM: ${endOfMonthOpenShifts.length} open shifts after day 25`);
        console.log(`💡 RECOMMENDATION: Review user hour targets or add more preferences for end-of-month days`);
      }
    } else {
      console.log(`🎉 PERFECT MONTH: All shifts successfully assigned!`);
    }
    
    // Progress update
    if (progressCallback) {
      progressCallback(95, `Gap-filling voltooid! ${totalGapsFilled} extra shifts ingevuld. Start post-optimalisatie...`);
    }
    
    // === POST-OPTIMALISATIE VOOR BETERE VERDELING ===
    console.log("=== STARTING POST-OPTIMIZATION ===");
    
    const allShiftsThisMonth = generatedShifts;
    const openShifts = allShiftsThisMonth.filter(shift => shift.status === "open");
    const assignedShifts = allShiftsThisMonth.filter(shift => shift.status === "planned");
    
    console.log(`Found ${openShifts.length} open shifts and ${assignedShifts.length} assigned shifts`);
    
    if (openShifts.length > 0) {
      let optimizationChanges = 0;
      
      for (const openShift of openShifts) {
        const shiftHours = openShift.isSplitShift ? 
          (openShift.type === "night" && openShift.splitEndTime && openShift.splitStartTime ? 
            (openShift.splitEndTime.getTime() - openShift.splitStartTime.getTime()) / (1000 * 60 * 60) : 6) : 
          (openShift.type === "day" ? 12 : 12);
        
        const candidateUsers = activeUsers.filter(user => {
          const currentHours = userAssignedHours.get(user.id) || 0;
          // EXTRA STRICT CHECK: Never exceed target hours, especially for admins
          if (currentHours >= user.hours) {
            console.log(`SKIP USER: ${user.username} (${user.id}) already at/above target (${currentHours}/${user.hours})`);
            return false;
          }
          
          // CRITICAL BUG FIX: Check user preferences before assigning in post-optimization
          const shiftDay = openShift.date.getDate();
          const key = `${user.id}_${shiftDay}`;
          const prefsForThisDay = preferencesIndex.get(key) || [];
          
          // Check if user is explicitly unavailable for this day (check both type='unavailable' AND notes='Niet beschikbaar')
          const isUnavailable = prefsForThisDay.some(pref => 
            pref.type === 'unavailable' || pref.notes === 'Niet beschikbaar'
          );
          if (isUnavailable) {
            console.log(`SKIP USER: ${user.username} (${user.id}) is unavailable for day ${shiftDay} (explicit unavailable preference)`);
            return false;
          }
          
          // ⚠️ NIEUWE REGEL: Alleen gebruikers met EXPLICIETE voorkeur voor deze shift type
          const hasMatchingPreference = prefsForThisDay.some(pref => 
            pref.type === openShift.type && pref.type !== 'unavailable'
          );
          
          if (!hasMatchingPreference) {
            console.log(`SKIP USER: ${user.username} (${user.id}) has no ${openShift.type} preference for day ${shiftDay}`);
            return false;
          }
          
          return (currentHours + shiftHours) <= user.hours;
        });
        
        const sortedCandidates = candidateUsers
          .map(user => ({
            user,
            currentHours: userAssignedHours.get(user.id) || 0
          }))
          .sort((a, b) => a.currentHours - b.currentHours)
          .map(item => item.user);
        
        if (sortedCandidates.length > 0) {
          const selectedUser = sortedCandidates[0];
          
          const sameDate = openShift.date;
          const hasConflict = assignedShifts.some(shift => 
            shift.userId === selectedUser.id && 
            shift.date.getTime() === sameDate.getTime()
          );
          
          if (!hasConflict) {
            console.log(`DIRECT FILL: Assigning open shift to user ${selectedUser.id} (${selectedUser.username}) for ${openShift.type} shift on ${openShift.date.toDateString()}`);
            
            await db.update(shifts)
              .set({ 
                userId: selectedUser.id, 
                status: "planned" as const 
              })
              .where(eq(shifts.id, openShift.id));
            
            addAssignedHours(selectedUser.id, shiftHours);
            openShift.userId = selectedUser.id;
            openShift.status = "planned";
            optimizationChanges++;
          }
        }
      }
      
      console.log(`DIRECT FILL completed: ${optimizationChanges} shifts filled`);
      
      const remainingOpenShifts = allShiftsThisMonth.filter(shift => shift.status === "open");
      
      if (remainingOpenShifts.length > 0) {
        let swapCount = 0;
        
        for (const openShift of remainingOpenShifts) {
          const candidateAssignedShifts = assignedShifts.filter(shift => 
            shift.type === openShift.type && 
            shift.isSplitShift === openShift.isSplitShift &&
            shift.userId !== 0
          );
          
          for (const assignedShift of candidateAssignedShifts) {
            const currentUser = activeUsers.find(u => u.id === assignedShift.userId);
            if (!currentUser) continue;
            
            const currentUserHours = userAssignedHours.get(currentUser.id) || 0;
            
            // EXTRA STRICT CHECK: Controleer of currentUser de open shift kan nemen zonder over limiet te gaan
            const openShiftHours = openShift.isSplitShift ? 
              (openShift.type === "night" && openShift.splitEndTime && openShift.splitStartTime ? 
                (openShift.splitEndTime.getTime() - openShift.splitStartTime.getTime()) / (1000 * 60 * 60) : 6) : 
              (openShift.type === "day" ? 12 : 12);
            
            if (currentUserHours >= currentUser.hours) {
              console.log(`SKIP SMART SWAP: ${currentUser.username} (${currentUser.id}) already at/above target (${currentUserHours}/${currentUser.hours})`);
              continue;
            }
            
            if ((currentUserHours + openShiftHours) > currentUser.hours) {
              console.log(`SKIP SMART SWAP: Moving ${currentUser.username} to open shift would exceed target (${currentUserHours + openShiftHours} > ${currentUser.hours})`);
              continue;
            }
            
            // BUG FIX: Check if currentUser has preference for the open shift day/type
            const openShiftDay = openShift.date.getDate();
            const openShiftKey = `${currentUser.id}_${openShiftDay}`;
            const openShiftPrefs = preferencesIndex.get(openShiftKey) || [];
            
            const isUnavailableForOpen = openShiftPrefs.some(pref => 
              pref.type === 'unavailable' || pref.notes === 'Niet beschikbaar'
            );
            if (isUnavailableForOpen) {
              console.log(`SKIP SMART SWAP: ${currentUser.username} (${currentUser.id}) is unavailable for open shift day ${openShiftDay}`);
              continue;
            }
            
            // ⚠️ NIEUWE REGEL: Alleen gebruikers met EXPLICIETE voorkeur voor deze shift type
            const hasOpenShiftPreference = openShiftPrefs.some(pref => 
              pref.type === openShift.type && pref.type !== 'unavailable'
            );
            
            if (!hasOpenShiftPreference) {
              console.log(`SKIP SMART SWAP: ${currentUser.username} (${currentUser.id}) has no ${openShift.type} preference for day ${openShiftDay}`);
              continue;
            }
            
            const assignedShiftHours = assignedShift.isSplitShift ? 
              (assignedShift.type === "night" && assignedShift.splitEndTime && assignedShift.splitStartTime ? 
                (assignedShift.splitEndTime.getTime() - assignedShift.splitStartTime.getTime()) / (1000 * 60 * 60) : 6) : 
              (assignedShift.type === "day" ? 12 : 12);
            
            const replacementCandidates = activeUsers.filter(user => {
              const userHours = userAssignedHours.get(user.id) || 0;
              
              // EXTRA STRICT CHECK voor replacement candidate
              if (userHours >= user.hours) {
                console.log(`SKIP REPLACEMENT: ${user.username} (${user.id}) already at/above target (${userHours}/${user.hours})`);
                return false;
              }
              
              if ((userHours + assignedShiftHours) > user.hours) {
                console.log(`SKIP REPLACEMENT: ${user.username} taking assigned shift would exceed target (${userHours + assignedShiftHours} > ${user.hours})`);
                return false;
              }
              
              // BUG FIX: Check if replacement candidate has preference for the assigned shift day/type
              const assignedShiftDay = assignedShift.date.getDate();
              const assignedShiftKey = `${user.id}_${assignedShiftDay}`;
              const assignedShiftPrefs = preferencesIndex.get(assignedShiftKey) || [];
              
              const isUnavailableForAssigned = assignedShiftPrefs.some(pref => 
                pref.type === 'unavailable' || pref.notes === 'Niet beschikbaar'
              );
              if (isUnavailableForAssigned) {
                console.log(`SKIP REPLACEMENT: ${user.username} (${user.id}) is unavailable for assigned shift day ${assignedShiftDay}`);
                return false;
              }
              
              // ⚠️ NIEUWE REGEL: Alleen gebruikers met EXPLICIETE voorkeur voor deze shift type
              const hasAssignedShiftPreference = assignedShiftPrefs.some(pref => 
                pref.type === assignedShift.type && pref.type !== 'unavailable'
              );
              
              if (!hasAssignedShiftPreference) {
                console.log(`SKIP REPLACEMENT: ${user.username} (${user.id}) has no ${assignedShift.type} preference for day ${assignedShiftDay}`);
                return false;
              }
              
              return userHours < currentUserHours && 
                user.id !== currentUser.id && 
                !assignedShifts.some(s => s.userId === user.id && s.date.getTime() === assignedShift.date.getTime());
            });
            
            if (replacementCandidates.length > 0) {
              const replacement = replacementCandidates[0];
              
              console.log(`SMART SWAP: Moving user ${currentUser.id} to open shift, user ${replacement.id} takes over original shift`);
              
              await db.update(shifts)
                .set({ userId: currentUser.id, status: "planned" as const })
                .where(eq(shifts.id, openShift.id));
              
              await db.update(shifts)
                .set({ userId: replacement.id })
                .where(eq(shifts.id, assignedShift.id));
              
              openShift.userId = currentUser.id;
              openShift.status = "planned";
              assignedShift.userId = replacement.id;
              
              swapCount++;
              break;
            }
          }
        }
        
        console.log(`SMART SWAPS completed: ${swapCount} swaps performed`);
      }
    }
    
    // Final progress update
    if (progressCallback) {
      progressCallback(100, `Planning voor ${month}/${year} succesvol gegenereerd!`);
    }
    
    console.log(`=== MONTHLY SCHEDULE GENERATION COMPLETED ===`);
    console.log(`Total shifts generated: ${generatedShifts.length}`);
    
    for (const user of activeUsers) {
      const assignedHours = userAssignedHours.get(user.id) || 0;
      console.log(`User ${user.username} (target: ${user.hours}h): assigned ${assignedHours}h`);
    }
    
    return generatedShifts;
  }

  async getShift(id: number): Promise<Shift | undefined> {
    const [shift] = await db.select().from(shifts).where(eq(shifts.id, id));
    return shift;
  }

  async updateShift(id: number, updateData: Partial<Shift>): Promise<Shift> {
    const [shift] = await db
      .update(shifts)
      .set({
        ...updateData,
        updatedAt: new Date() // Track when shift was last modified
      })
      .where(eq(shifts.id, id))
      .returning();

    if (!shift) throw new Error("Shift not found");
    
    // Reset sync status naar 'pending' maar behoud GUID
    // Dit zorgt ervoor dat bij volgende sync een UPDATE wordt gestuurd
    await this.resetVerdiSyncLog(id);
    
    return shift;
  }

  async deleteShift(id: number): Promise<void> {
    // Haal eerst de shift op (nodig voor Verdi clear assignments met start/end tijd)
    const shift = await this.getShift(id);
    if (!shift) {
      throw new Error("Shift not found");
    }

    // Haal ALLE sync logs op voor deze shift (niet alleen "success")
    // FIX: Oude code checkte alleen syncStatus === "success", waardoor shifts met
    // "pending" of "error" status werden verwijderd zonder Verdi cleanup
    const syncLogs = await db
      .select()
      .from(verdiSyncLog)
      .where(eq(verdiSyncLog.shiftId, id));

    // Check of er sync logs zijn met Verdi GUID (shift was gesynchroniseerd)
    const verdiSyncedLogs = syncLogs.filter(log => log.verdiShiftGuid);
    
    if (verdiSyncedLogs.length > 0) {
      // Shift was gesynchroniseerd naar Verdi - we moeten alle personen eruit halen
      // (volgens Verdi API kunnen shifts niet verwijderd worden, alleen gecleared)
      
      // Haal station config op (gebruik eerste log om station te bepalen)
      const [stationCfg] = await db
        .select()
        .from(verdiStationConfig)
        .where(eq(verdiStationConfig.stationId, verdiSyncedLogs[0].stationId));

      // STRICT: Als config disabled/missing is, kunnen we niet clearen in Verdi
      if (!stationCfg || !stationCfg.enabled) {
        throw new Error(
          `Kan shift niet verwijderen: Deze shift is gesynchroniseerd naar Verdi maar Verdi integratie is nu uitgeschakeld. ` +
          `Activeer eerst Verdi integratie in instellingen of verwijder de shift handmatig in Verdi.`
        );
      }

      // Haal position mappings op voor dit station
      const positionMappings = await db
        .select()
        .from(verdiPositionMappings)
        .where(eq(verdiPositionMappings.stationId, shift.stationId));

      if (positionMappings.length === 0) {
        throw new Error(
          `Kan shift niet verwijderen: Er zijn geen Verdi position mappings geconfigureerd voor dit station. ` +
          `Configureer eerst de position mappings in Verdi instellingen.`
        );
      }

      // Clear alle assignments voor elke Verdi shift GUID (kan meerdere zijn bij split shifts)
      const uniqueGuids = new Set(verdiSyncedLogs.map(log => log.verdiShiftGuid).filter(Boolean));
      
      for (const guid of uniqueGuids) {
        try {
          console.log(`Clearing all assignments for shift ${id} in Verdi (GUID: ${guid})`);
          await verdiClient.clearShiftAssignments(shift, guid!, stationCfg, positionMappings);
          console.log(`Successfully cleared assignments for shift ${id} in Verdi (GUID: ${guid})`);
        } catch (error) {
          console.error(`Error clearing assignments for shift ${id} in Verdi (GUID: ${guid}):`, error);
          // STRICT: Gooi error - shift blijft in beide systemen
          // Dit voorkomt inconsistentie tussen systemen
          throw new Error(
            `Kan shift niet verwijderen: Verdi clear assignments gefaald (${error instanceof Error ? error.message : String(error)}). ` +
            `Probeer later opnieuw of verwijder handmatig in Verdi.`
          );
        }
      }
    }

    // Alleen als Verdi clear succesvol was (of niet nodig was): verwijder lokaal
    await db.delete(verdiSyncLog).where(eq(verdiSyncLog.shiftId, id));
    await db.delete(shifts).where(eq(shifts.id, id));
  }

  async getShiftPreference(id: number): Promise<ShiftPreference | undefined> {
    const [preference] = await db.select().from(shiftPreferences).where(eq(shiftPreferences.id, id));
    return preference;
  }

  // System settings methods
  async getSystemSetting(key: string): Promise<string | null> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting ? setting.value : null;
  }

  async setSystemSetting(key: string, value: string): Promise<void> {
    await db.insert(systemSettings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, updatedAt: new Date() }
      });
  }

  // Weekday configuration methods
  async getWeekdayConfigs(stationId?: number): Promise<WeekdayConfig[]> {
    if (stationId) {
      return await db.select().from(weekdayConfigs)
        .where(eq(weekdayConfigs.stationId, stationId))
        .orderBy(weekdayConfigs.dayOfWeek);
    }
    return await db.select().from(weekdayConfigs).orderBy(weekdayConfigs.dayOfWeek);
  }

  async getWeekdayConfig(dayOfWeek: number, stationId?: number): Promise<WeekdayConfig | null> {
    const conditions = [eq(weekdayConfigs.dayOfWeek, dayOfWeek)];
    
    if (stationId) {
      conditions.push(eq(weekdayConfigs.stationId, stationId));
    }

    const [config] = await db.select().from(weekdayConfigs).where(and(...conditions));
    return config || null;
  }

  async updateWeekdayConfig(dayOfWeek: number, config: Partial<WeekdayConfig>, stationId?: number): Promise<WeekdayConfig> {
    const conditions = [eq(weekdayConfigs.dayOfWeek, dayOfWeek)];
    
    if (stationId) {
      conditions.push(eq(weekdayConfigs.stationId, stationId));
    }

    const [updatedConfig] = await db
      .update(weekdayConfigs)
      .set({ ...config, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    if (!updatedConfig) throw new Error("Weekday config not found");
    return updatedConfig;
  }

  async initializeDefaultWeekdayConfigs(stationId?: number): Promise<void> {
    // Use stationId 1 as default if not provided (for backward compatibility)
    const defaultStationId = stationId || 1;
    
    // Check if configs already exist for this station
    const existingConfigs = await db.select()
      .from(weekdayConfigs)
      .where(eq(weekdayConfigs.stationId, defaultStationId));
    if (existingConfigs.length > 0) {
      return; // Already initialized for this station
    }

    // Create default configs for each day of the week (0 = Sunday, 6 = Saturday)
    const defaultConfigs = [
      { stationId: defaultStationId, dayOfWeek: 0, dayShiftCount: 2, nightShiftCount: 2, allowSplitShifts: true }, // Sunday
      { stationId: defaultStationId, dayOfWeek: 1, dayShiftCount: 2, nightShiftCount: 2, allowSplitShifts: true }, // Monday
      { stationId: defaultStationId, dayOfWeek: 2, dayShiftCount: 2, nightShiftCount: 2, allowSplitShifts: true }, // Tuesday
      { stationId: defaultStationId, dayOfWeek: 3, dayShiftCount: 2, nightShiftCount: 2, allowSplitShifts: true }, // Wednesday
      { stationId: defaultStationId, dayOfWeek: 4, dayShiftCount: 2, nightShiftCount: 2, allowSplitShifts: true }, // Thursday
      { stationId: defaultStationId, dayOfWeek: 5, dayShiftCount: 2, nightShiftCount: 2, allowSplitShifts: true }, // Friday
      { stationId: defaultStationId, dayOfWeek: 6, dayShiftCount: 2, nightShiftCount: 2, allowSplitShifts: true }  // Saturday
    ];

    await db.insert(weekdayConfigs).values(defaultConfigs);
  }

  // User comment methods
  async getUserComment(userId: number, month: number, year: number, stationId?: number): Promise<UserComment | null> {
    const conditions = [
      eq(userComments.userId, userId),
      eq(userComments.month, month),
      eq(userComments.year, year)
    ];
    
    if (stationId) {
      conditions.push(eq(userComments.stationId, stationId));
    }

    const [comment] = await db.select().from(userComments).where(and(...conditions));
    return comment || null;
  }

  async createUserComment(comment: InsertUserComment): Promise<UserComment> {
    const [userComment] = await db.insert(userComments).values(comment).returning();
    return userComment;
  }

  async updateUserComment(id: number, comment: string): Promise<UserComment> {
    const [userComment] = await db
      .update(userComments)
      .set({ comment, updatedAt: new Date() })
      .where(eq(userComments.id, id))
      .returning();

    if (!userComment) throw new Error("User comment not found");
    return userComment;
  }

  async deleteUserComment(id: number): Promise<void> {
    await db.delete(userComments).where(eq(userComments.id, id));
  }

  async getAllUserComments(month: number, year: number, stationId?: number): Promise<UserComment[]> {
    const conditions = [
      eq(userComments.month, month),
      eq(userComments.year, year)
    ];
    
    if (typeof stationId === 'number' && Number.isFinite(stationId) && stationId > 0) {
      conditions.push(eq(userComments.stationId, stationId));
    }

    return await db.select()
      .from(userComments)
      .where(and(...conditions))
      .orderBy(asc(userComments.createdAt));
  }

  // Holiday management methods
  async getAllHolidays(year?: number, stationId?: number): Promise<Holiday[]> {
    const conditions = [];
    
    if (year) {
      conditions.push(eq(holidays.year, year));
    }
    
    if (stationId) {
      conditions.push(eq(holidays.stationId, stationId));
    }

    return await db.select()
      .from(holidays)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(holidays.date));
  }

  async getHoliday(id: number): Promise<Holiday | undefined> {
    const [holiday] = await db.select().from(holidays).where(eq(holidays.id, id));
    return holiday;
  }

  async createHoliday(holiday: InsertHoliday): Promise<Holiday> {
    const [newHoliday] = await db.insert(holidays).values(holiday).returning();
    return newHoliday;
  }

  async updateHoliday(id: number, updateData: Partial<Holiday>): Promise<Holiday> {
    const [holiday] = await db
      .update(holidays)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(holidays.id, id))
      .returning();

    if (!holiday) throw new Error("Holiday not found");
    return holiday;
  }

  async deleteHoliday(id: number): Promise<void> {
    await db.delete(holidays).where(eq(holidays.id, id));
  }

  async getHolidaysForDate(date: Date, stationId?: number): Promise<Holiday[]> {
    const dateString = date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
    const conditions = [eq(holidays.date, dateString)];
    
    if (stationId) {
      conditions.push(eq(holidays.stationId, stationId));
    }

    return await db.select()
      .from(holidays)
      .where(and(...conditions));
  }

  async generateBelgianHolidays(year: number, stationId?: number): Promise<Holiday[]> {
    // Calculate Easter date for the given year
    const calculateEaster = (year: number): Date => {
      const a = year % 19;
      const b = Math.floor(year / 100);
      const c = year % 100;
      const d = Math.floor(b / 4);
      const e = b % 4;
      const f = Math.floor((b + 8) / 25);
      const g = Math.floor((b - f + 1) / 3);
      const h = (19 * a + b - d - g + 15) % 30;
      const i = Math.floor(c / 4);
      const k = c % 4;
      const l = (32 + 2 * e + 2 * i - h - k) % 7;
      const m = Math.floor((a + 11 * h + 22 * l) / 451);
      const month = Math.floor((h + l - 7 * m + 114) / 31);
      const day = ((h + l - 7 * m + 114) % 31) + 1;
      return new Date(year, month - 1, day);
    };

    const easter = calculateEaster(year);
    
    // Define Belgian holidays
    const holidayDefinitions = [
      { name: "Nieuwjaar", date: new Date(year, 0, 1), category: "national" as const },
      { name: "Paasmaandag", date: new Date(easter.getTime() + 24 * 60 * 60 * 1000), category: "national" as const },
      { name: "Dag van de Arbeid", date: new Date(year, 4, 1), category: "national" as const },
      { name: "Onze Lieve Heer Hemelvaart", date: new Date(easter.getTime() + 39 * 24 * 60 * 60 * 1000), category: "national" as const },
      { name: "Pinkstermaandag", date: new Date(easter.getTime() + 50 * 24 * 60 * 60 * 1000), category: "national" as const },
      { name: "Nationale Feestdag", date: new Date(year, 6, 21), category: "national" as const },
      { name: "Onze Lieve Vrouw Hemelvaart", date: new Date(year, 7, 15), category: "national" as const },
      { name: "Allerheiligen", date: new Date(year, 10, 1), category: "national" as const },
      { name: "Wapenstilstand", date: new Date(year, 10, 11), category: "national" as const },
      { name: "Kerstmis", date: new Date(year, 11, 25), category: "national" as const }
    ];

    const holidaysToCreate: InsertHoliday[] = holidayDefinitions.map(holiday => ({
      name: holiday.name,
      date: holiday.date,
      year: year,
      category: holiday.category,
      stationId: stationId || null
    }));

    // Insert holidays and return them
    const createdHolidays: Holiday[] = [];
    for (const holiday of holidaysToCreate) {
      try {
        const created = await this.createHoliday(holiday);
        createdHolidays.push(created);
      } catch (error) {
        console.log(`Holiday ${holiday.name} already exists, skipping...`);
      }
    }

    return createdHolidays;
  }

  async isHoliday(date: Date, stationId?: number): Promise<boolean> {
    const holidaysOnDate = await this.getHolidaysForDate(date, stationId);
    return holidaysOnDate.length > 0;
  }

  // Calendar tokens methods
  async getCalendarToken(userId: number): Promise<CalendarToken | undefined> {
    const result = await db.select().from(calendarTokens).where(eq(calendarTokens.userId, userId));
    return result[0];
  }

  async createCalendarToken(userId: number): Promise<CalendarToken> {
    // Generate een veilige, willekeurige token
    const token = randomBytes(32).toString('hex');
    
    const result = await db.insert(calendarTokens).values({
      userId,
      token
    }).returning();
    
    return result[0];
  }

  async regenerateCalendarToken(userId: number): Promise<CalendarToken> {
    // Verwijder oude token
    await db.delete(calendarTokens).where(eq(calendarTokens.userId, userId));
    
    // Maak nieuwe token
    return this.createCalendarToken(userId);
  }

  async getCalendarTokenByToken(token: string): Promise<CalendarToken | undefined> {
    const result = await db.select().from(calendarTokens).where(eq(calendarTokens.token, token));
    return result[0];
  }

  // Verdi integratie methods
  async getVerdiStationConfig(stationId: number): Promise<VerdiStationConfig | undefined> {
    const result = await db.select().from(verdiStationConfig).where(eq(verdiStationConfig.stationId, stationId));
    return result[0];
  }

  async upsertVerdiStationConfig(stationId: number, config: {verdiUrl?: string, authId?: string, authSecret?: string, shiftSheetGuid?: string, enabled?: boolean}): Promise<VerdiStationConfig> {
    const existing = await this.getVerdiStationConfig(stationId);
    
    if (existing) {
      const result = await db.update(verdiStationConfig)
        .set({
          verdiUrl: config.verdiUrl ?? existing.verdiUrl,
          authId: config.authId ?? existing.authId,
          authSecret: config.authSecret ?? existing.authSecret,
          shiftSheetGuid: config.shiftSheetGuid ?? existing.shiftSheetGuid,
          enabled: config.enabled ?? existing.enabled,
          updatedAt: new Date()
        })
        .where(eq(verdiStationConfig.stationId, stationId))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(verdiStationConfig)
        .values({
          stationId,
          verdiUrl: config.verdiUrl || null,
          authId: config.authId || null,
          authSecret: config.authSecret || null,
          shiftSheetGuid: config.shiftSheetGuid || null,
          enabled: config.enabled ?? false
        })
        .returning();
      return result[0];
    }
  }

  async getAllVerdiStationConfigs(): Promise<VerdiStationConfig[]> {
    return await db.select().from(verdiStationConfig);
  }

  async getVerdiUserMapping(userId: number): Promise<VerdiUserMapping | undefined> {
    const result = await db.select().from(verdiUserMappings).where(eq(verdiUserMappings.userId, userId));
    return result[0];
  }

  async upsertVerdiUserMapping(userId: number, personGuid: string): Promise<VerdiUserMapping> {
    const existing = await this.getVerdiUserMapping(userId);
    
    if (existing) {
      const result = await db.update(verdiUserMappings)
        .set({
          personGuid,
          updatedAt: new Date()
        })
        .where(eq(verdiUserMappings.userId, userId))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(verdiUserMappings)
        .values({
          userId,
          personGuid
        })
        .returning();
      return result[0];
    }
  }

  async getAllVerdiUserMappings(): Promise<VerdiUserMapping[]> {
    return await db.select().from(verdiUserMappings);
  }

  async getVerdiPositionMappings(stationId: number): Promise<VerdiPositionMapping[]> {
    return await db.select().from(verdiPositionMappings)
      .where(eq(verdiPositionMappings.stationId, stationId))
      .orderBy(asc(verdiPositionMappings.positionIndex));
  }

  async upsertVerdiPositionMapping(stationId: number, positionIndex: number, positionGuid: string, requiresLicenseC: boolean): Promise<VerdiPositionMapping> {
    // Atomic delete + insert binnen transactie om race conditions te voorkomen
    // Dit zorgt ervoor dat er altijd maar 1 mapping per positie is, ongeacht requiresLicenseC waarde
    return await db.transaction(async (tx) => {
      // Verwijder alle bestaande mappings voor deze stationId + positionIndex combinatie
      await tx.delete(verdiPositionMappings)
        .where(and(
          eq(verdiPositionMappings.stationId, stationId),
          eq(verdiPositionMappings.positionIndex, positionIndex)
        ));
      
      // Maak nieuwe mapping aan
      const result = await tx.insert(verdiPositionMappings)
        .values({
          stationId,
          positionIndex,
          positionGuid,
          requiresLicenseC
        })
        .returning();
      return result[0];
    });
  }

  async getAllVerdiPositionMappings(): Promise<VerdiPositionMapping[]> {
    return await db.select().from(verdiPositionMappings).orderBy(asc(verdiPositionMappings.stationId), asc(verdiPositionMappings.positionIndex));
  }

  async getVerdiSyncLog(shiftId: number): Promise<VerdiSyncLog | undefined> {
    const result = await db.select().from(verdiSyncLog).where(eq(verdiSyncLog.shiftId, shiftId));
    return result[0];
  }

  async createVerdiSyncLog(shiftId: number, stationId: number, syncStatus: string, verdiShiftGuid?: string, errorMessage?: string, warningMessages?: string, shiftStartTime?: Date, shiftEndTime?: Date, shiftType?: string, isSplitShift?: boolean, splitGroup?: number, splitStartTime?: Date, splitEndTime?: Date, assignedUserIds?: number[]): Promise<VerdiSyncLog> {
    const result = await db.insert(verdiSyncLog)
      .values({
        shiftId,
        stationId,
        syncStatus: syncStatus as "pending" | "success" | "error",
        verdiShiftGuid: verdiShiftGuid || null,
        errorMessage: errorMessage || null,
        warningMessages: warningMessages || null,
        syncedAt: syncStatus === 'success' ? new Date() : null,
        // Snapshot van shift data voor UPDATE detectie
        shiftStartTime: shiftStartTime || null,
        shiftEndTime: shiftEndTime || null,
        shiftType: shiftType as "day" | "night" | null || null,
        // Split shift metadata voor assignment tracking
        isSplitShift: isSplitShift || null,
        splitGroup: splitGroup || null,
        splitStartTime: splitStartTime || null,
        splitEndTime: splitEndTime || null,
        assignedUserIds: assignedUserIds ? JSON.stringify(assignedUserIds) : null
      })
      .returning();
    return result[0];
  }

  async updateVerdiSyncLog(shiftId: number, syncStatus: string, verdiShiftGuid?: string, errorMessage?: string, warningMessages?: string, shiftStartTime?: Date, shiftEndTime?: Date, shiftType?: string): Promise<VerdiSyncLog> {
    const result = await db.update(verdiSyncLog)
      .set({
        syncStatus: syncStatus as "pending" | "success" | "error",
        verdiShiftGuid: verdiShiftGuid || null,
        errorMessage: errorMessage || null,
        warningMessages: warningMessages || null,
        syncedAt: syncStatus === 'success' ? new Date() : null,
        // Snapshot van shift data voor UPDATE detectie
        shiftStartTime: shiftStartTime || null,
        shiftEndTime: shiftEndTime || null,
        shiftType: shiftType as "day" | "night" | null || null,
        updatedAt: new Date()
      })
      .where(eq(verdiSyncLog.shiftId, shiftId))
      .returning();
    return result[0];
  }

  async getVerdiSyncLogsByMonth(month: number, year: number, stationId?: number): Promise<VerdiSyncLog[]> {
    // Haal alle shifts op voor deze maand
    const monthShifts = await this.getShiftsByMonth(month, year, stationId);
    const shiftIds = monthShifts.map(s => s.id);
    
    if (shiftIds.length === 0) {
      return [];
    }
    
    return await db.select().from(verdiSyncLog).where(inArray(verdiSyncLog.shiftId, shiftIds));
  }

  async getLastSuccessfulVerdiSync(stationId: number, month: number, year: number): Promise<Date | null> {
    // Haal alle shifts op voor deze maand
    const monthShifts = await this.getShiftsByMonth(month, year, stationId);
    const shiftIds = monthShifts.map(s => s.id);
    
    if (shiftIds.length === 0) {
      return null;
    }
    
    // Haal de meest recente succesvolle sync op
    const result = await db.select()
      .from(verdiSyncLog)
      .where(and(
        inArray(verdiSyncLog.shiftId, shiftIds),
        eq(verdiSyncLog.syncStatus, 'success')
      ))
      .orderBy(desc(verdiSyncLog.syncedAt))
      .limit(1);
    
    return result[0]?.syncedAt || null;
  }

  async getLegacyVerdiSyncLogs(stationId?: number): Promise<VerdiSyncLog[]> {
    // Haal alle sync logs op zonder snapshot data (shiftStartTime IS NULL)
    let query = db.select()
      .from(verdiSyncLog)
      .where(isNull(verdiSyncLog.shiftStartTime));
    
    if (stationId !== undefined) {
      query = query.where(and(
        isNull(verdiSyncLog.shiftStartTime),
        eq(verdiSyncLog.stationId, stationId)
      )) as any;
    }
    
    return await query;
  }

  async deleteVerdiSyncLog(shiftId: number): Promise<void> {
    await db.delete(verdiSyncLog).where(eq(verdiSyncLog.shiftId, shiftId));
  }

  async deleteVerdiSyncLogById(logId: number): Promise<void> {
    await db.delete(verdiSyncLog).where(eq(verdiSyncLog.id, logId));
  }

  async updateVerdiSyncLogById(
    logId: number,
    syncStatus: 'pending' | 'success' | 'error',
    errorMessage?: string
  ): Promise<void> {
    await db
      .update(verdiSyncLog)
      .set({
        syncStatus,
        errorMessage: errorMessage || null,
        updatedAt: new Date()
      })
      .where(eq(verdiSyncLog.id, logId));
  }

  async resetVerdiSyncLog(shiftId: number): Promise<void> {
    // Reset sync status naar 'pending' maar behoud de GUID
    // Dit zorgt ervoor dat bij volgende sync een UPDATE wordt gestuurd
    const existingLog = await this.getVerdiSyncLog(shiftId);
    if (existingLog) {
      await db
        .update(verdiSyncLog)
        .set({
          syncStatus: 'pending',
          errorMessage: null,
          warningMessages: null,
          updatedAt: new Date()
        })
        .where(eq(verdiSyncLog.shiftId, shiftId));
    }
  }

  async getVerdiSyncStatus(stationId: number, month: number, year: number): Promise<{hasPendingChanges: boolean, newShifts: number, modifiedShifts: number, totalShifts: number}> {
    // Haal alle planned shifts op voor deze maand/station
    const allShifts = await this.getShiftsByMonth(month, year, stationId);
    const plannedShifts = allShifts.filter(s => s.status === 'planned');
    
    if (plannedShifts.length === 0) {
      return {
        hasPendingChanges: false,
        newShifts: 0,
        modifiedShifts: 0,
        totalShifts: 0
      };
    }
    
    // Haal alle sync logs op voor deze maand/station
    const allSyncLogs = await this.getVerdiSyncLogsByMonth(month, year, stationId);
    
    // Group sync logs by shiftId and get the LATEST one for each shift
    // (om oude pending/error logs te negeren na een latere succesvolle sync)
    const latestSyncLogMap = new Map<number, any>();
    for (const log of allSyncLogs) {
      const existing = latestSyncLogMap.get(log.shiftId);
      if (!existing || log.updatedAt > existing.updatedAt) {
        latestSyncLogMap.set(log.shiftId, log);
      }
    }
    
    let newShifts = 0;
    let modifiedShifts = 0;
    
    for (const shift of plannedShifts) {
      const latestSyncLog = latestSyncLogMap.get(shift.id);
      
      if (!latestSyncLog) {
        // Geen sync log = nieuwe shift
        newShifts++;
      } else {
        // Check sync status OR shift modificatie (NIET beide om dubbeltelling te voorkomen)
        const hasFailedSync = latestSyncLog.syncStatus === 'pending' || latestSyncLog.syncStatus === 'error';
        const isModifiedAfterSync = shift.updatedAt && latestSyncLog.updatedAt && shift.updatedAt > latestSyncLog.updatedAt;
        
        if (hasFailedSync || isModifiedAfterSync) {
          modifiedShifts++;
        }
      }
    }
    
    const hasPendingChanges = newShifts > 0 || modifiedShifts > 0;
    
    return {
      hasPendingChanges,
      newShifts,
      modifiedShifts,
      totalShifts: plannedShifts.length
    };
  }

  async getShiftGuidFromRegistry(
    stationId: number,
    shiftDate: Date,
    shiftType: 'day' | 'night',
    splitStartTime?: Date | null,
    splitEndTime?: Date | null
  ): Promise<string | null> {
    // KRITISCH: Gebruik sentinel waarde '__UNSPLIT__' voor niet-split shifts
    // Dit lost het PostgreSQL NULL uniqueness probleem op
    const UNSPLIT_SENTINEL = '__UNSPLIT__';
    const splitStartTimeStr = splitStartTime ? splitStartTime.toISOString() : UNSPLIT_SENTINEL;
    const splitEndTimeStr = splitEndTime ? splitEndTime.toISOString() : UNSPLIT_SENTINEL;
    
    const result = await db
      .select()
      .from(verdiShiftRegistry)
      .where(and(
        eq(verdiShiftRegistry.stationId, stationId),
        eq(verdiShiftRegistry.shiftDate, shiftDate),
        eq(verdiShiftRegistry.shiftType, shiftType),
        eq(verdiShiftRegistry.splitStartTimeStr, splitStartTimeStr),
        eq(verdiShiftRegistry.splitEndTimeStr, splitEndTimeStr)
      ))
      .orderBy(desc(verdiShiftRegistry.updatedAt))
      .limit(1);

    return result[0]?.verdiShiftGuid || null;
  }

  async saveShiftGuidToRegistry(
    stationId: number,
    shiftDate: Date,
    shiftType: 'day' | 'night',
    verdiShiftGuid: string,
    splitStartTime?: Date | null,
    splitEndTime?: Date | null
  ): Promise<VerdiShiftRegistry> {
    // KRITISCH: Gebruik sentinel waarde '__UNSPLIT__' voor niet-split shifts
    // Dit lost het PostgreSQL NULL uniqueness probleem op en zorgt ervoor dat
    // onConflictDoUpdate correct werkt (NULL != NULL in PostgreSQL unique indexes!)
    const UNSPLIT_SENTINEL = '__UNSPLIT__';
    const splitStartTimeStr = splitStartTime ? splitStartTime.toISOString() : UNSPLIT_SENTINEL;
    const splitEndTimeStr = splitEndTime ? splitEndTime.toISOString() : UNSPLIT_SENTINEL;
    
    const result = await db
      .insert(verdiShiftRegistry)
      .values({
        stationId,
        shiftDate,
        shiftType,
        verdiShiftGuid,
        splitStartTimeStr,
        splitEndTimeStr
      })
      .onConflictDoUpdate({
        target: [
          verdiShiftRegistry.stationId,
          verdiShiftRegistry.shiftDate,
          verdiShiftRegistry.shiftType,
          verdiShiftRegistry.splitStartTimeStr,
          verdiShiftRegistry.splitEndTimeStr
        ],
        set: {
          verdiShiftGuid,
          updatedAt: new Date()
        }
      })
      .returning();

    return result[0];
  }

  async getPushSubscription(userId: number): Promise<PushSubscription | undefined> {
    const result = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId))
      .limit(1);
    return result[0];
  }

  async getAllPushSubscriptions(userId: number): Promise<PushSubscription[]> {
    return await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }

  async createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const existing = await db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, subscription.userId),
          eq(pushSubscriptions.endpoint, subscription.endpoint)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const updated = await db
        .update(pushSubscriptions)
        .set({
          p256dh: subscription.p256dh,
          auth: subscription.auth,
          updatedAt: new Date()
        })
        .where(eq(pushSubscriptions.id, existing[0].id))
        .returning();
      return updated[0];
    }

    const result = await db
      .insert(pushSubscriptions)
      .values(subscription)
      .returning();
    return result[0];
  }

  async updatePushSubscription(userId: number, endpoint: string, updateData: Partial<PushSubscription>): Promise<PushSubscription> {
    const result = await db
      .update(pushSubscriptions)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint)
        )
      )
      .returning();
    return result[0];
  }

  async deletePushSubscription(userId: number, endpoint: string): Promise<void> {
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint)
        )
      );
  }

  async deletePushSubscriptionsByUser(userId: number): Promise<void> {
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }

  // Reportage Personeelsdienst Methods
  async getReportageConfig(): Promise<ReportageConfig | null> {
    const result = await db.select().from(reportageConfig).limit(1);
    return result[0] || null;
  }

  async createOrUpdateReportageConfig(config: Partial<ReportageConfig>): Promise<ReportageConfig> {
    const existing = await this.getReportageConfig();
    if (existing) {
      const result = await db
        .update(reportageConfig)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(reportageConfig.id, existing.id))
        .returning();
      return result[0];
    }
    const result = await db.insert(reportageConfig).values({
      enabled: config.enabled ?? false,
      daysAfterMonthEnd: config.daysAfterMonthEnd ?? 5,
      emailSubject: config.emailSubject,
      emailBody: config.emailBody,
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpUser: config.smtpUser,
      smtpPassword: config.smtpPassword,
      smtpFromAddress: config.smtpFromAddress,
      smtpFromName: config.smtpFromName,
      smtpSecure: config.smtpSecure
    }).returning();
    return result[0];
  }

  async getReportageRecipients(): Promise<ReportageRecipient[]> {
    return db.select().from(reportageRecipients).orderBy(asc(reportageRecipients.name));
  }

  async getActiveReportageRecipients(): Promise<ReportageRecipient[]> {
    return db.select().from(reportageRecipients)
      .where(eq(reportageRecipients.isActive, true))
      .orderBy(asc(reportageRecipients.name));
  }

  async createReportageRecipient(recipient: InsertReportageRecipient): Promise<ReportageRecipient> {
    const result = await db.insert(reportageRecipients).values(recipient).returning();
    return result[0];
  }

  async updateReportageRecipient(id: number, updateData: Partial<ReportageRecipient>): Promise<ReportageRecipient> {
    const result = await db
      .update(reportageRecipients)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(reportageRecipients.id, id))
      .returning();
    return result[0];
  }

  async deleteReportageRecipient(id: number): Promise<void> {
    await db.delete(reportageRecipients).where(eq(reportageRecipients.id, id));
  }

  async getReportageLogs(limit: number = 20): Promise<ReportageLog[]> {
    return db.select().from(reportageLogs).orderBy(desc(reportageLogs.sentAt)).limit(limit);
  }

  async createReportageLog(log: { month: number; year: number; recipientCount: number; status: 'success' | 'partial' | 'failed'; errorMessage?: string }): Promise<ReportageLog> {
    const result = await db.insert(reportageLogs).values(log).returning();
    return result[0];
  }

  async updateReportageLastSent(month: number, year: number): Promise<void> {
    const config = await this.getReportageConfig();
    if (config) {
      await db
        .update(reportageConfig)
        .set({ lastSentMonth: month, lastSentYear: year, updatedAt: new Date() })
        .where(eq(reportageConfig.id, config.id));
    }
  }

  // Overtime (Overuren) Methods
  async createOvertime(data: InsertOvertime): Promise<Overtime> {
    const result = await db.insert(overtime).values(data).returning();
    return result[0];
  }

  async getOvertimeById(id: number): Promise<Overtime | undefined> {
    const result = await db.select().from(overtime).where(eq(overtime.id, id)).limit(1);
    return result[0];
  }

  async getOvertimeByUser(userId: number): Promise<Overtime[]> {
    return db.select().from(overtime)
      .where(eq(overtime.userId, userId))
      .orderBy(desc(overtime.date));
  }

  async getOvertimeByUserAndMonth(userId: number, month: number, year: number): Promise<Overtime[]> {
    return db.select().from(overtime)
      .where(and(
        eq(overtime.userId, userId),
        eq(overtime.month, month),
        eq(overtime.year, year)
      ))
      .orderBy(desc(overtime.date));
  }

  async getOvertimeByStation(stationId: number): Promise<Overtime[]> {
    return db.select().from(overtime)
      .where(eq(overtime.stationId, stationId))
      .orderBy(desc(overtime.date));
  }

  async getOvertimeByStationAndMonth(stationId: number, month: number, year: number): Promise<Overtime[]> {
    return db.select().from(overtime)
      .where(and(
        eq(overtime.stationId, stationId),
        eq(overtime.month, month),
        eq(overtime.year, year)
      ))
      .orderBy(desc(overtime.date));
  }

  async getOvertimeByShift(shiftId: number): Promise<Overtime[]> {
    return db.select().from(overtime)
      .where(eq(overtime.shiftId, shiftId))
      .orderBy(asc(overtime.startTime));
  }

  async getAllOvertimeByMonth(month: number, year: number): Promise<Overtime[]> {
    return db.select().from(overtime)
      .where(and(
        eq(overtime.month, month),
        eq(overtime.year, year)
      ))
      .orderBy(desc(overtime.date));
  }

  async updateOvertime(id: number, data: Partial<InsertOvertime>): Promise<Overtime> {
    const result = await db
      .update(overtime)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(overtime.id, id))
      .returning();
    return result[0];
  }

  async deleteOvertime(id: number): Promise<void> {
    await db.delete(overtime).where(eq(overtime.id, id));
  }
}

export const storage = new DatabaseStorage();