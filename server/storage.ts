import { users, shifts, shiftPreferences, systemSettings, weekdayConfigs, type User, type InsertUser, type Shift, type ShiftPreference, type InsertShiftPreference, type WeekdayConfig, type InsertWeekdayConfig } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc, ne } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(userId: number, updateData: Partial<User>): Promise<User>;
  updateUserPassword(userId: number, newPassword: string): Promise<User>;
  deleteUser(userId: number): Promise<void>;
  getAllShifts(): Promise<Shift[]>;
  getShiftsByMonth(month: number, year: number): Promise<Shift[]>;
  createShift(shift: any): Promise<Shift>;
  getUserShiftPreferences(userId: number, month: number, year: number): Promise<ShiftPreference[]>;
  createShiftPreference(preference: InsertShiftPreference): Promise<ShiftPreference>;
  updateShiftPreference(id: number, updateData: Partial<ShiftPreference>): Promise<ShiftPreference>;
  deleteShiftPreference(id: number): Promise<void>;
  getOpenShiftsForPlanning(month: number, year: number): Promise<Shift[]>;
  generateMonthlySchedule(month: number, year: number): Promise<Shift[]>;
  sessionStore: session.Store;
  getShiftPreference(id: number): Promise<ShiftPreference | undefined>;
  getShift(id: number): Promise<Shift | undefined>;
  updateShift(id: number, updateData: Partial<Shift>): Promise<Shift>;
  deleteShift(id: number): Promise<void>;
  
  // Systeeminstellingen
  getSystemSetting(key: string): Promise<string | null>;
  setSystemSetting(key: string, value: string): Promise<void>;
  
  // Weekdag configuraties
  getWeekdayConfigs(): Promise<WeekdayConfig[]>;
  getWeekdayConfig(dayOfWeek: number): Promise<WeekdayConfig | null>;
  updateWeekdayConfig(dayOfWeek: number, config: Partial<WeekdayConfig>): Promise<WeekdayConfig>;
  initializeDefaultWeekdayConfigs(): Promise<void>;
}

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.username));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(userId: number, updateData: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserPassword(userId: number, newPassword: string): Promise<User> {
    const hashedPassword = await hashPassword(newPassword);
    const [user] = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deleteUser(userId: number): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  async getAllShifts(): Promise<Shift[]> {
    return await db.select().from(shifts).orderBy(asc(shifts.date));
  }

  async getShiftsByMonth(month: number, year: number): Promise<Shift[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    return await db.select().from(shifts)
      .where(
        and(
          gte(shifts.date, startDate),
          lte(shifts.date, endDate)
        )
      )
      .orderBy(asc(shifts.date));
  }

  async createShift(shiftData: any): Promise<Shift> {
    const [shift] = await db
      .insert(shifts)
      .values(shiftData)
      .returning();
    return shift;
  }

  async getUserShiftPreferences(userId: number, month: number, year: number): Promise<ShiftPreference[]> {
    return await db.select().from(shiftPreferences)
      .where(
        and(
          eq(shiftPreferences.userId, userId),
          eq(shiftPreferences.month, month),
          eq(shiftPreferences.year, year)
        )
      );
  }

  async createShiftPreference(preference: InsertShiftPreference): Promise<ShiftPreference> {
    const [pref] = await db
      .insert(shiftPreferences)
      .values(preference)
      .returning();
    return pref;
  }

  async updateShiftPreference(id: number, updateData: Partial<ShiftPreference>): Promise<ShiftPreference> {
    const [pref] = await db
      .update(shiftPreferences)
      .set(updateData)
      .where(eq(shiftPreferences.id, id))
      .returning();
    return pref;
  }

  async deleteShiftPreference(id: number): Promise<void> {
    await db.delete(shiftPreferences).where(eq(shiftPreferences.id, id));
  }

  async getOpenShiftsForPlanning(month: number, year: number): Promise<Shift[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    return await db.select().from(shifts)
      .where(
        and(
          gte(shifts.date, startDate),
          lte(shifts.date, endDate),
          eq(shifts.status, "open")
        )
      )
      .orderBy(asc(shifts.date));
  }

  async generateMonthlySchedule(month: number, year: number, updateProgress?: (percentage: number, message: string) => void): Promise<Shift[]> {
    // Verwijder bestaande shifts voor de maand
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    await db.delete(shifts).where(
      and(
        gte(shifts.date, startDate),
        lte(shifts.date, endDate)
      )
    );

    const activeUsers = await db.select().from(users);
    const generatedShifts: Shift[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Track assigned hours per user
    const userAssignedHours = new Map<number, number>();
    activeUsers.forEach(user => userAssignedHours.set(user.id, 0));

    // Calculate previous weekend shifts for fair distribution
    const getWeekendShiftHistory = async (userId: number): Promise<number> => {
      // Look at last 3 months of weekend shifts
      const threeMonthsAgo = new Date(year, month - 4, 1);
      const lastMonth = new Date(year, month - 1, 0);
      
      const weekendShifts = await db.select()
        .from(shifts)
        .where(and(
          eq(shifts.userId, userId),
          gte(shifts.date, threeMonthsAgo),
          lte(shifts.date, lastMonth),
          ne(shifts.status, "open")
        ));
      
      return weekendShifts.filter(shift => {
        const shiftDay = shift.date.getDay();
        return shiftDay === 0 || shiftDay === 6; // Sunday or Saturday
      }).length;
    };

    // Helper functions
    const canAssignHours = (userId: number, hoursToAdd: number): boolean => {
      const currentHours = userAssignedHours.get(userId) || 0;
      const user = activeUsers.find(u => u.id === userId);
      return user && (currentHours + hoursToAdd) <= user.hours;
    };

    const addAssignedHours = (userId: number, hoursToAdd: number): void => {
      const currentHours = userAssignedHours.get(userId) || 0;
      userAssignedHours.set(userId, currentHours + hoursToAdd);
    };

    const getSortedUsersForAssignment = (availableUserIds: number[]): number[] => {
      return availableUserIds.sort((a, b) => {
        const hoursA = userAssignedHours.get(a) || 0;
        const hoursB = userAssignedHours.get(b) || 0;
        return hoursA - hoursB;
      });
    };

    // Enhanced sorting for weekend shifts - prioritize fair distribution
    const getSortedUsersForWeekendAssignment = async (availableUserIds: number[]): Promise<number[]> => {
      const usersWithHistory = await Promise.all(
        availableUserIds.map(async (userId) => ({
          userId,
          weekendShifts: await getWeekendShiftHistory(userId),
          currentHours: userAssignedHours.get(userId) || 0
        }))
      );

      return usersWithHistory
        .sort((a, b) => {
          // First priority: fewer weekend shifts in history
          if (a.weekendShifts !== b.weekendShifts) {
            return a.weekendShifts - b.weekendShifts;
          }
          // Second priority: fewer hours assigned this month
          return a.currentHours - b.currentHours;
        })
        .map(user => user.userId);
    };

    // Ensure weekday configs are initialized
    await this.initializeDefaultWeekdayConfigs();

    // Generate shifts for each day
    for (let day = 1; day <= daysInMonth; day++) {
      if (updateProgress) {
        const percentage = Math.round((day / daysInMonth) * 100);
        updateProgress(percentage, `Planning dag ${day}/${daysInMonth}`);
      }

      const currentDate = new Date(year, month - 1, day);
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
      
      // Get configuration for this day of week
      const dayConfig = await this.getWeekdayConfig(dayOfWeek);
      if (!dayConfig) {
        console.log(`No config found for day ${dayOfWeek}, skipping...`);
        continue;
      }

      // Get users who have submitted preferences for this specific date
      const dayPreferences = await db.select()
        .from(shiftPreferences)
        .where(and(
          eq(shiftPreferences.date, currentDate),
          eq(shiftPreferences.type, "day")
        ));
      
      const nightPreferences = await db.select()
        .from(shiftPreferences)
        .where(and(
          eq(shiftPreferences.date, currentDate),
          eq(shiftPreferences.type, "night")
        ));
      
      const availableDayUsers = dayPreferences.map(p => p.userId);
      const availableNightUsers = nightPreferences.map(p => p.userId);
      
      // Track assigned users for this day to prevent double assignment
      const assignedDayIds: number[] = [];
      const assignedNightIds: number[] = [];

      // DAY SHIFTS (7:00-19:00) - Based on weekday configuration
      let assignedDayShifts = 0;
      
      if (dayConfig.enableDayShifts) {
        const sortedDayUsers = getSortedUsersForAssignment(availableDayUsers);

        for (const userId of sortedDayUsers) {
          if (assignedDayShifts >= dayConfig.dayShiftCount) break;
          
          if (canAssignHours(userId, 12)) {
            assignedDayIds.push(userId);
            addAssignedHours(userId, 12);
            assignedDayShifts++;
            
            const dayShift = {
              userId: userId,
              date: currentDate,
              type: "day" as const,
              startTime: new Date(year, month - 1, day, 7, 0, 0),
              endTime: new Date(year, month - 1, day, 19, 0, 0),
              status: "planned" as const,
              month,
              year,
              isSplitShift: false
            };
            
            const savedDayShift = await this.createShift(dayShift);
            generatedShifts.push(savedDayShift);
          }
        }

        // Create open day shifts for remaining positions
        for (let i = assignedDayShifts; i < dayConfig.dayShiftCount; i++) {
          const openDayShift = {
            userId: 0,
            date: currentDate,
            type: "day" as const,
            startTime: new Date(year, month - 1, day, 7, 0, 0),
            endTime: new Date(year, month - 1, day, 19, 0, 0),
            status: "open" as const,
            month,
            year,
            isSplitShift: false
          };
          
          const savedOpenShift = await this.createShift(openDayShift);
          generatedShifts.push(savedOpenShift);
        }
      }

      // NIGHT SHIFTS - Based on weekday configuration
      if (dayConfig.enableNightShifts) {
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        // WEEKEND: Try full night shifts first (19:00-07:00)
        const availableForNight = availableNightUsers.filter(id => !assignedDayIds.includes(id));
        const sortedNightUsers = getSortedUsersForAssignment(availableForNight);
        let assignedFullNightShifts = 0;

        // Step 1: Try to assign full night shifts
        for (const userId of sortedNightUsers) {
          if (assignedFullNightShifts >= 2) break;
          
          if (canAssignHours(userId, 12)) {
            assignedNightIds.push(userId);
            addAssignedHours(userId, 12);
            assignedFullNightShifts++;
            
            const nightShift = {
              userId: userId,
              date: currentDate,
              type: "night" as const,
              startTime: new Date(year, month - 1, day, 19, 0, 0),
              endTime: new Date(year, month - 1, day + 1, 7, 0, 0),
              status: "planned" as const,
              month,
              year,
              isSplitShift: false
            };
            
            const savedNightShift = await this.createShift(nightShift);
            generatedShifts.push(savedNightShift);
          }
        }

        // Step 2: If we couldn't fill with full shifts, use half shifts as backup
        if (assignedFullNightShifts < 2) {
          const remainingAvailable = availableForNight.filter((id: number) => !assignedNightIds.includes(id));
          
          // First half (19:00-23:00)
          const sortedFirstHalf = getSortedUsersForAssignment(remainingAvailable);
          let assignedFirstHalf = 0;
          const neededFirstHalf = (2 - assignedFullNightShifts);

          for (const userId of sortedFirstHalf) {
            if (assignedFirstHalf >= neededFirstHalf) break;
            
            if (canAssignHours(userId, 4)) {
              assignedNightIds.push(userId);
              addAssignedHours(userId, 4);
              assignedFirstHalf++;
              
              const nightHalfShift = {
                userId: userId,
                date: currentDate,
                type: "night" as const,
                startTime: new Date(year, month - 1, day, 19, 0, 0),
                endTime: new Date(year, month - 1, day, 23, 0, 0),
                status: "planned" as const,
                month,
                year,
                isSplitShift: true
              };
              
              const savedShift = await this.createShift(nightHalfShift);
              generatedShifts.push(savedShift);
            }
          }

          // Second half (23:00-07:00)
          const stillAvailable = remainingAvailable.filter(id => !assignedNightIds.includes(id));
          const sortedSecondHalf = getSortedUsersForAssignment(stillAvailable);
          let assignedSecondHalf = 0;

          for (const userId of sortedSecondHalf) {
            if (assignedSecondHalf >= neededFirstHalf) break;
            
            if (canAssignHours(userId, 8)) {
              assignedNightIds.push(userId);
              addAssignedHours(userId, 8);
              assignedSecondHalf++;
              
              const nightHalfShift = {
                userId: userId,
                date: currentDate,
                type: "night" as const,
                startTime: new Date(year, month - 1, day, 23, 0, 0),
                endTime: new Date(year, month - 1, day + 1, 7, 0, 0),
                status: "planned" as const,
                month,
                year,
                isSplitShift: true
              };
              
              const savedShift = await this.createShift(nightHalfShift);
              generatedShifts.push(savedShift);
            }
          }

          // Create open shifts for any remaining unfilled positions
          const totalAssigned = assignedFullNightShifts + Math.min(assignedFirstHalf, assignedSecondHalf);
          for (let i = totalAssigned; i < 2; i++) {
            // Create open full shift
            const openNightShift = {
              userId: 0,
              date: currentDate,
              type: "night" as const,
              startTime: new Date(year, month - 1, day, 19, 0, 0),
              endTime: new Date(year, month - 1, day + 1, 7, 0, 0),
              status: "open" as const,
              month,
              year,
              isSplitShift: false
            };
            
            const savedOpenShift = await this.createShift(openNightShift);
            generatedShifts.push(savedOpenShift);
          }
        }

      } else {
        // WEEKDAY: Create half shifts (19:00-23:00 and 23:00-07:00)
        const availableForNight = availableNightUsers.filter((id: number) => !assignedDayIds.includes(id));

        // First half (19:00-23:00)
        const sortedFirstHalf = getSortedUsersForAssignment(availableForNight);
        let assignedFirstHalf = 0;

        for (const userId of sortedFirstHalf) {
          if (assignedFirstHalf >= 2) break;
          
          if (canAssignHours(userId, 4) && !assignedNightIds.includes(userId)) {
            assignedNightIds.push(userId);
            addAssignedHours(userId, 4);
            assignedFirstHalf++;
            
            const nightHalfShift = {
              userId: userId,
              date: currentDate,
              type: "night" as const,
              startTime: new Date(year, month - 1, day, 19, 0, 0),
              endTime: new Date(year, month - 1, day, 23, 0, 0),
              status: "planned" as const,
              month,
              year,
              isSplitShift: true
            };
            
            const savedShift = await this.createShift(nightHalfShift);
            generatedShifts.push(savedShift);
          }
        }

        // Create open shifts for remaining first half positions
        for (let i = assignedFirstHalf; i < 2; i++) {
          const openShift = {
            userId: 0,
            date: currentDate,
            type: "night" as const,
            startTime: new Date(year, month - 1, day, 19, 0, 0),
            endTime: new Date(year, month - 1, day, 23, 0, 0),
            status: "open" as const,
            month,
            year,
            isSplitShift: true
          };
          
          const savedOpenShift = await this.createShift(openShift);
          generatedShifts.push(savedOpenShift);
        }

        // Second half (23:00-07:00)
        const remainingAvailable = availableForNight.filter(id => !assignedNightIds.includes(id));
        const sortedSecondHalf = getSortedUsersForAssignment(remainingAvailable);
        let assignedSecondHalf = 0;

        for (const userId of sortedSecondHalf) {
          if (assignedSecondHalf >= 2) break;
          
          if (canAssignHours(userId, 8)) {
            assignedNightIds.push(userId);
            addAssignedHours(userId, 8);
            assignedSecondHalf++;
            
            const nightHalfShift = {
              userId: userId,
              date: currentDate,
              type: "night" as const,
              startTime: new Date(year, month - 1, day, 23, 0, 0),
              endTime: new Date(year, month - 1, day + 1, 7, 0, 0),
              status: "planned" as const,
              month,
              year,
              isSplitShift: true
            };
            
            const savedShift = await this.createShift(nightHalfShift);
            generatedShifts.push(savedShift);
          }
        }

        // Create open shifts for remaining second half positions
        for (let i = assignedSecondHalf; i < 2; i++) {
          const openShift = {
            userId: 0,
            date: currentDate,
            type: "night" as const,
            startTime: new Date(year, month - 1, day, 23, 0, 0),
            endTime: new Date(year, month - 1, day + 1, 7, 0, 0),
            status: "open" as const,
            month,
            year,
            isSplitShift: true
          };
          
          const savedOpenShift = await this.createShift(openShift);
          generatedShifts.push(savedOpenShift);
        }
      }
    }
    
    console.log(`Schedule generation complete: ${generatedShifts.length} shifts created`);
    return generatedShifts;
  }

  async getShiftPreference(id: number): Promise<ShiftPreference | undefined> {
    const [preference] = await db
      .select()
      .from(shiftPreferences)
      .where(eq(shiftPreferences.id, id));
    return preference || undefined;
  }

  async getShift(id: number): Promise<Shift | undefined> {
    const [shift] = await db
      .select()
      .from(shifts)
      .where(eq(shifts.id, id));
    return shift || undefined;
  }

  async updateShift(id: number, updateData: Partial<Shift>): Promise<Shift> {
    const [shift] = await db
      .update(shifts)
      .set(updateData)
      .where(eq(shifts.id, id))
      .returning();
    return shift;
  }

  async deleteShift(id: number): Promise<void> {
    await db.delete(shifts).where(eq(shifts.id, id));
  }

  async getSystemSetting(key: string): Promise<string | null> {
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));
    return setting?.value || null;
  }
  
  async setSystemSetting(key: string, value: string): Promise<void> {
    const existing = await this.getSystemSetting(key);
    
    if (existing !== null) {
      await db.update(systemSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(systemSettings.key, key));
    } else {
      await db.insert(systemSettings).values({
        key,
        value,
        updatedAt: new Date()
      });
    }
  }

  async getWeekdayConfigs(): Promise<WeekdayConfig[]> {
    return await db.select().from(weekdayConfigs).orderBy(asc(weekdayConfigs.dayOfWeek));
  }

  async getWeekdayConfig(dayOfWeek: number): Promise<WeekdayConfig | null> {
    const [config] = await db.select()
      .from(weekdayConfigs)
      .where(eq(weekdayConfigs.dayOfWeek, dayOfWeek));
    return config || null;
  }

  async updateWeekdayConfig(dayOfWeek: number, configData: Partial<WeekdayConfig>): Promise<WeekdayConfig> {
    const [config] = await db.update(weekdayConfigs)
      .set({ ...configData, updatedAt: new Date() })
      .where(eq(weekdayConfigs.dayOfWeek, dayOfWeek))
      .returning();
    return config;
  }

  async initializeDefaultWeekdayConfigs(): Promise<void> {
    // Check if configs already exist
    const existingConfigs = await this.getWeekdayConfigs();
    if (existingConfigs.length > 0) return;

    // Default configuration: weekends have day+night shifts, weekdays only night shifts
    const defaultConfigs = [
      { dayOfWeek: 0, enableDayShifts: true, enableNightShifts: true },   // Sunday
      { dayOfWeek: 1, enableDayShifts: false, enableNightShifts: true },  // Monday
      { dayOfWeek: 2, enableDayShifts: false, enableNightShifts: true },  // Tuesday
      { dayOfWeek: 3, enableDayShifts: false, enableNightShifts: true },  // Wednesday
      { dayOfWeek: 4, enableDayShifts: false, enableNightShifts: true },  // Thursday
      { dayOfWeek: 5, enableDayShifts: false, enableNightShifts: true },  // Friday
      { dayOfWeek: 6, enableDayShifts: true, enableNightShifts: true },   // Saturday
    ];

    for (const config of defaultConfigs) {
      await db.insert(weekdayConfigs).values(config);
    }
  }
}

export const storage = new DatabaseStorage();