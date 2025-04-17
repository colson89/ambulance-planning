import { users, shifts, shiftPreferences, type User, type InsertUser, type Shift, type ShiftPreference, type InsertShiftPreference } from "@shared/schema";
import { db } from "./db";
import { eq, and, lt, gte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const PostgresSessionStore = connectPg(session);

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
}

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
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      password: await hashPassword(insertUser.password)
    }).returning();
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
    await db.delete(users).where(eq(users.id, userId));
  }

  async getAllShifts(): Promise<Shift[]> {
    return await db.select().from(shifts);
  }

  async getShiftsByMonth(month: number, year: number): Promise<Shift[]> {
    return await db.select()
      .from(shifts)
      .where(
        and(
          eq(shifts.month, month),
          eq(shifts.year, year)
        )
      );
  }

  async createShift(shiftData: any): Promise<Shift> {
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

  async generateMonthlySchedule(month: number, year: number): Promise<Shift[]> {
    // Haal alle gebruikers op
    const users = await this.getAllUsers();
    const generatedShifts: Shift[] = [];
    
    // Verwijder bestaande shifts voor deze maand
    const existingShifts = await this.getShiftsByMonth(month, year);
    for (const shift of existingShifts) {
      await db.delete(shifts).where(eq(shifts.id, shift.id));
    }
    
    // Maak eerst een kalender voor de maand
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Verzamel alle gebruikersvoorkeuren voor deze maand
    const allUserPreferences = new Map<number, ShiftPreference[]>();
    
    for (const user of users) {
      const userPrefs = await this.getUserShiftPreferences(user.id, month, year);
      allUserPreferences.set(user.id, userPrefs);
    }
    
    console.log(`Generating schedule for ${month}/${year} with ${users.length} users`);
    
    // Voor elke dag in de maand
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month - 1, day);
      const dateStr = currentDate.toISOString().split('T')[0]; // yyyy-mm-dd
      const isWeekendDay = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      
      // 1. Verzamel beschikbare gebruikers voor deze dag op basis van voorkeuren
      const availableUsers = {
        day: [] as { userId: number, preferenceType: string }[],
        night: [] as { userId: number, preferenceType: string }[]
      };
      
      for (const [userId, preferences] of allUserPreferences.entries()) {
        // Zoek voorkeuren voor deze datum
        const dayPreferences = preferences.filter(pref => {
          const prefDate = new Date(pref.date);
          return prefDate.getDate() === day && 
                prefDate.getMonth() === month - 1 && 
                prefDate.getFullYear() === year;
        });
        
        for (const pref of dayPreferences) {
          // Alleen gebruikers toevoegen die beschikbaar zijn (niet 'unavailable')
          if (pref.preferenceType !== 'unavailable') {
            if (pref.shiftType === 'day') {
              availableUsers.day.push({
                userId: userId,
                preferenceType: pref.preferenceType
              });
            } else if (pref.shiftType === 'night') {
              availableUsers.night.push({
                userId: userId,
                preferenceType: pref.preferenceType
              });
            }
          }
        }
      }
      
      console.log(`Day ${day}: ${availableUsers.day.length} available for day, ${availableUsers.night.length} available for night`);
      
      // 2. Weekdagen hebben alleen nachtshifts nodig
      if (!isWeekendDay) {
        // Als er beschikbare gebruikers zijn, kies er één volgens voorkeur
        if (availableUsers.night.length > 0) {
          // Sorteer op preferenceType - prioriteit aan full shifts
          const sortedUsers = [...availableUsers.night].sort((a, b) => {
            if (a.preferenceType === 'full') return -1;
            if (b.preferenceType === 'full') return 1;
            return 0;
          });
          
          const selectedUser = sortedUsers[0];
          
          // Nachtshift
          const nightShift = {
            userId: selectedUser.userId,
            date: currentDate,
            type: "night" as const,
            startTime: new Date(year, month - 1, day, 19, 0, 0),
            endTime: new Date(year, month - 1, day + 1, 7, 0, 0),
            status: "planned" as const,
            month,
            year,
            isSplitShift: false
          };
          
          const savedShift = await this.createShift(nightShift);
          generatedShifts.push(savedShift);
        } else {
          // Geen beschikbare gebruikers voor deze dag, hou de shift open
          const openShift = {
            userId: 0, // 0 betekent geen toegewezen gebruiker
            date: currentDate,
            type: "night" as const,
            startTime: new Date(year, month - 1, day, 19, 0, 0),
            endTime: new Date(year, month - 1, day + 1, 7, 0, 0),
            status: "open" as const,
            month,
            year,
            isSplitShift: false
          };
          
          const savedOpenShift = await this.createShift(openShift);
          generatedShifts.push(savedOpenShift);
        }
      } 
      // 3. Weekend heeft dag- en nachtshifts nodig
      else {
        // Dagshift in weekend
        if (availableUsers.day.length > 0) {
          // Sorteer op preferenceType - prioriteit aan full shifts
          const sortedDayUsers = [...availableUsers.day].sort((a, b) => {
            if (a.preferenceType === 'full') return -1;
            if (b.preferenceType === 'full') return 1;
            return 0;
          });
          
          const selectedDayUser = sortedDayUsers[0];
          
          // Dagshift
          const dayShift = {
            userId: selectedDayUser.userId,
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
        } else {
          // Geen beschikbare gebruikers voor dagshift in weekend
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
          
          const savedOpenDayShift = await this.createShift(openDayShift);
          generatedShifts.push(savedOpenDayShift);
        }
        
        // Nachtshift in weekend
        // Filter uit de beschikbare nachtshiftgebruikers degenen die al ingepland zijn voor de dagshift
        const nightShiftUsers = availableUsers.night.filter(nightUser => 
          !generatedShifts.some(shift => 
            shift.userId === nightUser.userId && 
            new Date(shift.date).getDate() === day
          )
        );
        
        if (nightShiftUsers.length > 0) {
          // Sorteer op preferenceType - prioriteit aan full shifts
          const sortedNightUsers = [...nightShiftUsers].sort((a, b) => {
            if (a.preferenceType === 'full') return -1;
            if (b.preferenceType === 'full') return 1;
            return 0;
          });
          
          const selectedNightUser = sortedNightUsers[0];
          
          // Nachtshift
          const nightShift = {
            userId: selectedNightUser.userId,
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
        } else {
          // Geen beschikbare gebruikers voor nachtshift in weekend
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
          
          const savedOpenNightShift = await this.createShift(openNightShift);
          generatedShifts.push(savedOpenNightShift);
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
    return preference;
  }
}

export const storage = new DatabaseStorage();