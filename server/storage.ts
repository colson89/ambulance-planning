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
    // Haal alle gebruikers en hun voorkeuren op
    const users = await this.getAllUsers();
    const generatedShifts: Shift[] = [];
    
    // Maak een willekeurige planning gebaseerd op gebruikersvoorkeuren
    // Dit is een vereenvoudigde aanpak - In een echte app zou dit complexere logica hebben
    
    // Maak eerst een kalender voor de maand
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Verwijder bestaande shifts voor deze maand
    const existingShifts = await this.getShiftsByMonth(month, year);
    for (const shift of existingShifts) {
      await db.delete(shifts).where(eq(shifts.id, shift.id));
    }
    
    // Voor elke dag in de maand
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month - 1, day);
      const isWeekendDay = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      
      // 1. Weekdagen hebben alleen nachtshifts nodig
      if (!isWeekendDay) {
        // Kies willekeurig een gebruiker met 25% kans
        const eligibleUsers = users.filter(() => Math.random() < 0.25);
        if (eligibleUsers.length > 0) {
          const selectedUser = eligibleUsers[Math.floor(Math.random() * eligibleUsers.length)];
          
          // Nachtshift
          const nightShift = {
            userId: selectedUser.id,
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
        }
      } 
      // 2. Weekend heeft dag- en nachtshifts nodig
      else {
        // Kies willekeurig gebruikers voor de dagshift
        const dayShiftUsers = users.filter(() => Math.random() < 0.25);
        if (dayShiftUsers.length > 0) {
          const selectedUser = dayShiftUsers[Math.floor(Math.random() * dayShiftUsers.length)];
          
          // Dagshift
          const dayShift = {
            userId: selectedUser.id,
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
        
        // Kies willekeurig gebruikers voor de nachtshift
        const nightShiftUsers = users.filter(u => 
          !dayShiftUsers.some(du => du.id === u.id) && // Vermijd dezelfde gebruiker voor dag- en nachtshift
          Math.random() < 0.25
        );
        
        if (nightShiftUsers.length > 0) {
          const selectedUser = nightShiftUsers[Math.floor(Math.random() * nightShiftUsers.length)];
          
          // Nachtshift
          const nightShift = {
            userId: selectedUser.id,
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
    }
    
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