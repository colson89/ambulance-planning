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
    // Verwijder bestaande shifts voor deze maand
    await db.delete(shifts)
      .where(and(
        eq(shifts.month, month),
        eq(shifts.year, year)
      ));

    // Haal ambulanciers op (filter admin eruit)
    const allUsers = await this.getAllUsers();
    const ambulanciers = allUsers.filter(user => user.role === 'ambulancier');
    
    // Maak eerst een kalender voor de maand
    const daysInMonth = new Date(year, month, 0).getDate();
    const generatedShifts: Shift[] = [];
    
    console.log(`Generating schedule for ${month}/${year} with ${ambulanciers.length} ambulanciers`);
    
    // Voor elke dag in de maand (1-31)
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month - 1, day);
      const isWeekendDay = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      
      // Verzamel beschikbare ambulanciers voor deze specifieke dag
      const availableForDay: number[] = [];
      const availableForNight: number[] = [];
      
      // Check beschikbaarheid voor elke ambulancier
      for (const user of ambulanciers) {
        const preferences = await this.getUserShiftPreferences(user.id, month, year);
        
        // Voorkeuren filteren voor deze specifieke dag
        const prefsForThisDay = preferences.filter(pref => {
          const prefDate = new Date(pref.date);
          return prefDate.getDate() === day && 
                 prefDate.getMonth() === (month - 1) && 
                 prefDate.getFullYear() === year;
        });
        
        // Als er een voorkeur is, controleer het type
        for (const pref of prefsForThisDay) {
          if (pref.type !== 'unavailable') {
            if (pref.type === 'day') {
              availableForDay.push(user.id);
            } else if (pref.type === 'night') {
              availableForNight.push(user.id);
            }
          }
        }
      }
      
      console.log(`Day ${day}: ${availableForDay.length} available for day, ${availableForNight.length} available for night`);
      
      // Weekdagen: alleen nachtshifts plannen (2 ambulanciers per shift)
      if (!isWeekendDay) {
        // Maximaal 2 ambulanciers toewijzen voor de nachtshift
        const assignedIds: number[] = [];
        
        // Eerste ambulancier
        if (availableForNight.length > 0) {
          // Random selectie voor eerste ambulancier
          const randomIndex = Math.floor(Math.random() * availableForNight.length);
          const selectedId = availableForNight[randomIndex];
          assignedIds.push(selectedId);
          
          // Shift aanmaken
          const nightShift1 = {
            userId: selectedId,
            date: currentDate,
            type: "night" as const,
            startTime: new Date(year, month - 1, day, 19, 0, 0),
            endTime: new Date(year, month - 1, day + 1, 7, 0, 0),
            status: "planned" as const,
            month,
            year,
            isSplitShift: false
          };
          
          const savedShift1 = await this.createShift(nightShift1);
          generatedShifts.push(savedShift1);
        } else {
          // Geen beschikbare gebruiker, open shift
          const openShift1 = {
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
          
          const savedOpenShift1 = await this.createShift(openShift1);
          generatedShifts.push(savedOpenShift1);
        }
        
        // Tweede ambulancier (niet dezelfde als de eerste)
        const remainingNightUsers = availableForNight.filter(id => !assignedIds.includes(id));
        if (remainingNightUsers.length > 0) {
          // Random selectie voor tweede ambulancier
          const randomIndex = Math.floor(Math.random() * remainingNightUsers.length);
          const selectedId = remainingNightUsers[randomIndex];
          
          // Shift aanmaken
          const nightShift2 = {
            userId: selectedId,
            date: currentDate,
            type: "night" as const,
            startTime: new Date(year, month - 1, day, 19, 0, 0),
            endTime: new Date(year, month - 1, day + 1, 7, 0, 0),
            status: "planned" as const,
            month,
            year,
            isSplitShift: false
          };
          
          const savedShift2 = await this.createShift(nightShift2);
          generatedShifts.push(savedShift2);
        } else {
          // Geen tweede beschikbare gebruiker, nog een open shift
          const openShift2 = {
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
          
          const savedOpenShift2 = await this.createShift(openShift2);
          generatedShifts.push(savedOpenShift2);
        }
      } 
      // Weekend: zowel dag- als nachtshifts plannen
      else {
        // DAGSHIFT - Maximaal 2 ambulanciers toewijzen
        const assignedDayIds: number[] = [];
        
        // Eerste ambulancier dag
        if (availableForDay.length > 0) {
          const randomIndex = Math.floor(Math.random() * availableForDay.length);
          const selectedId = availableForDay[randomIndex];
          assignedDayIds.push(selectedId);
          
          const dayShift1 = {
            userId: selectedId,
            date: currentDate,
            type: "day" as const,
            startTime: new Date(year, month - 1, day, 7, 0, 0),
            endTime: new Date(year, month - 1, day, 19, 0, 0),
            status: "planned" as const,
            month,
            year,
            isSplitShift: false
          };
          
          const savedDayShift1 = await this.createShift(dayShift1);
          generatedShifts.push(savedDayShift1);
        } else {
          const openDayShift1 = {
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
          
          const savedOpenDayShift1 = await this.createShift(openDayShift1);
          generatedShifts.push(savedOpenDayShift1);
        }
        
        // Tweede ambulancier dag
        const remainingDayUsers = availableForDay.filter(id => !assignedDayIds.includes(id));
        if (remainingDayUsers.length > 0) {
          const randomIndex = Math.floor(Math.random() * remainingDayUsers.length);
          const selectedId = remainingDayUsers[randomIndex];
          
          const dayShift2 = {
            userId: selectedId,
            date: currentDate,
            type: "day" as const,
            startTime: new Date(year, month - 1, day, 7, 0, 0),
            endTime: new Date(year, month - 1, day, 19, 0, 0),
            status: "planned" as const,
            month,
            year,
            isSplitShift: false
          };
          
          const savedDayShift2 = await this.createShift(dayShift2);
          generatedShifts.push(savedDayShift2);
        } else {
          const openDayShift2 = {
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
          
          const savedOpenDayShift2 = await this.createShift(openDayShift2);
          generatedShifts.push(savedOpenDayShift2);
        }
        
        // NACHTSHIFT - Maximaal 2 ambulanciers toewijzen, niet dezelfde als dagshift
        const assignedNightIds: number[] = [];
        
        // Filter gebruikers voor nachtshift - niet dezelfde als dagshift
        const availableForNightFiltered = availableForNight.filter(
          id => !assignedDayIds.includes(id)
        );
        
        // Eerste ambulancier nacht
        if (availableForNightFiltered.length > 0) {
          const randomIndex = Math.floor(Math.random() * availableForNightFiltered.length);
          const selectedId = availableForNightFiltered[randomIndex];
          assignedNightIds.push(selectedId);
          
          const nightShift1 = {
            userId: selectedId,
            date: currentDate,
            type: "night" as const,
            startTime: new Date(year, month - 1, day, 19, 0, 0),
            endTime: new Date(year, month - 1, day + 1, 7, 0, 0),
            status: "planned" as const,
            month,
            year,
            isSplitShift: false
          };
          
          const savedNightShift1 = await this.createShift(nightShift1);
          generatedShifts.push(savedNightShift1);
        } else {
          const openNightShift1 = {
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
          
          const savedOpenNightShift1 = await this.createShift(openNightShift1);
          generatedShifts.push(savedOpenNightShift1);
        }
        
        // Tweede ambulancier nacht
        const remainingNightUsers = availableForNightFiltered.filter(
          id => !assignedNightIds.includes(id)
        );
        
        if (remainingNightUsers.length > 0) {
          const randomIndex = Math.floor(Math.random() * remainingNightUsers.length);
          const selectedId = remainingNightUsers[randomIndex];
          
          const nightShift2 = {
            userId: selectedId,
            date: currentDate,
            type: "night" as const,
            startTime: new Date(year, month - 1, day, 19, 0, 0),
            endTime: new Date(year, month - 1, day + 1, 7, 0, 0),
            status: "planned" as const,
            month,
            year,
            isSplitShift: false
          };
          
          const savedNightShift2 = await this.createShift(nightShift2);
          generatedShifts.push(savedNightShift2);
        } else {
          const openNightShift2 = {
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
          
          const savedOpenNightShift2 = await this.createShift(openNightShift2);
          generatedShifts.push(savedOpenNightShift2);
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
  
  async getShift(id: number): Promise<Shift | undefined> {
    const [shift] = await db
      .select()
      .from(shifts)
      .where(eq(shifts.id, id));
    return shift;
  }
  
  async updateShift(id: number, updateData: Partial<Shift>): Promise<Shift> {
    const [shift] = await db
      .update(shifts)
      .set(updateData)
      .where(eq(shifts.id, id))
      .returning();
      
    if (!shift) throw new Error("Shift not found");
    return shift;
  }
}

export const storage = new DatabaseStorage();