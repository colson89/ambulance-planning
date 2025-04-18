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
    
    // Bijhouden hoeveel uren elke ambulancier al is ingepland
    const userAssignedHours = new Map<number, number>();
    
    // Initialiseer hours tracking voor elke ambulancier
    ambulanciers.forEach(user => {
      userAssignedHours.set(user.id, 0);
    });
    
    console.log(`Generating schedule for ${month}/${year} with ${ambulanciers.length} ambulanciers`);
    
    // Helper functie om te controleren of een ambulancier nog uren kan werken
    const canAssignHours = (userId: number, hoursToAdd: number): boolean => {
      const user = ambulanciers.find(u => u.id === userId);
      if (!user) return false;
      
      const currentHours = userAssignedHours.get(userId) || 0;
      
      // Controleer of deze toewijzing binnen de opgegeven uren valt
      return currentHours + hoursToAdd <= user.hours;
    };
    
    // Helper functie om bij te houden hoeveel uren een ambulancier werkt
    const addAssignedHours = (userId: number, hoursToAdd: number): void => {
      if (userId === 0) return; // 0 = niet toegewezen
      const currentHours = userAssignedHours.get(userId) || 0;
      userAssignedHours.set(userId, currentHours + hoursToAdd);
    };
    
    // Bereken gewicht voor toewijzing op basis van huidige uren
    const getUserWeight = (userId: number, preferredHours: number = 0): number => {
      const user = ambulanciers.find(u => u.id === userId);
      if (!user) return 0;
      
      const currentHours = userAssignedHours.get(userId) || 0;
      const targetHours = user.hours;
      
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
    
    // Functie om ambulanciers te sorteren op basis van werklast en voorkeuren
    const getSortedUsersForAssignment = (availableUserIds: number[]): number[] => {
      // Eerst filteren op gebruikers die nog uren kunnen werken
      const filteredUsers = availableUserIds.filter(userId => {
        const user = ambulanciers.find(u => u.id === userId);
        if (!user) return false;
        
        const currentHours = userAssignedHours.get(userId) || 0;
        return currentHours < user.hours;
      });
      
      // Sorteren op basis van hoeveel uren de gebruiker al gewerkt heeft
      return filteredUsers.sort((a, b) => {
        const userA = ambulanciers.find(u => u.id === a);
        const userB = ambulanciers.find(u => u.id === b);
        
        if (!userA || !userB) return 0;
        
        const hoursA = userAssignedHours.get(a) || 0;
        const hoursB = userAssignedHours.get(b) || 0;
        
        // Als een gebruiker minder dan 50% van zijn uren heeft, hogere prioriteit
        const thresholdA = userA.hours * 0.5;
        const thresholdB = userB.hours * 0.5;
        
        if (hoursA < thresholdA && hoursB >= thresholdB) return -1;
        if (hoursB < thresholdB && hoursA >= thresholdA) return 1;
        
        // Anders sorteren op huidige toegewezen uren (minder uren = eerder ingepland)
        return hoursA - hoursB;
      });
    };
    
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
        
        // De nachtshift is 12 uur
        const shiftHours = 12;
        
        // Sorteer beschikbare ambulanciers op basis van werklast
        const sortedNightUsers = getSortedUsersForAssignment(availableForNight);
        
        // Eerste ambulancier
        let selectedId = 0;
        if (sortedNightUsers.length > 0) {
          // Kies de eerste geschikte ambulancier
          for (const userId of sortedNightUsers) {
            if (canAssignHours(userId, shiftHours)) {
              selectedId = userId;
              break;
            }
          }
          
          if (selectedId > 0) {
            assignedIds.push(selectedId);
            addAssignedHours(selectedId, shiftHours);
            
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
            // Geen geschikte ambulancier gevonden
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
        } else {
          // Geen beschikbare gebruikers
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
        const remainingNightUsers = sortedNightUsers.filter(id => !assignedIds.includes(id));
        
        selectedId = 0;
        if (remainingNightUsers.length > 0) {
          // Kies de eerste geschikte ambulancier
          for (const userId of remainingNightUsers) {
            if (canAssignHours(userId, shiftHours)) {
              selectedId = userId;
              break;
            }
          }
          
          if (selectedId > 0) {
            addAssignedHours(selectedId, shiftHours);
            
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
            // Geen geschikte ambulancier gevonden
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
        } else {
          // Geen geschikte gebruikers meer beschikbaar
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
        const dayShiftHours = 12; // 12 uur per dagshift
        
        // Sorteer op basis van werklast
        const sortedDayUsers = getSortedUsersForAssignment(availableForDay);
        
        // Eerste ambulancier dag
        let selectedId = 0;
        if (sortedDayUsers.length > 0) {
          // Kies de eerste geschikte ambulancier
          for (const userId of sortedDayUsers) {
            if (canAssignHours(userId, dayShiftHours)) {
              selectedId = userId;
              break;
            }
          }
          
          if (selectedId > 0) {
            assignedDayIds.push(selectedId);
            addAssignedHours(selectedId, dayShiftHours);
            
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
            // Geen geschikte ambulancier gevonden
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
        } else {
          // Geen beschikbare gebruikers
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
        const remainingDayUsers = sortedDayUsers.filter(id => !assignedDayIds.includes(id));
        
        selectedId = 0;
        if (remainingDayUsers.length > 0) {
          // Kies de eerste geschikte ambulancier
          for (const userId of remainingDayUsers) {
            if (canAssignHours(userId, dayShiftHours)) {
              selectedId = userId;
              break;
            }
          }
          
          if (selectedId > 0) {
            addAssignedHours(selectedId, dayShiftHours);
            
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
            // Geen geschikte ambulancier gevonden
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
        } else {
          // Geen geschikte gebruikers meer beschikbaar
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
        const nightShiftHours = 12; // 12 uur per nachtshift
        
        // Filter gebruikers voor nachtshift - niet dezelfde als dagshift
        const availableForNightFiltered = availableForNight.filter(
          id => !assignedDayIds.includes(id)
        );
        
        // Sorteer op basis van werklast
        const sortedNightUsers = getSortedUsersForAssignment(availableForNightFiltered);
        
        // Eerste ambulancier nacht
        selectedId = 0;
        if (sortedNightUsers.length > 0) {
          // Kies de eerste geschikte ambulancier
          for (const userId of sortedNightUsers) {
            if (canAssignHours(userId, nightShiftHours)) {
              selectedId = userId;
              break;
            }
          }
          
          if (selectedId > 0) {
            assignedNightIds.push(selectedId);
            addAssignedHours(selectedId, nightShiftHours);
            
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
            // Geen geschikte ambulancier gevonden
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
        } else {
          // Geen beschikbare gebruikers
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
        const remainingNightUsers = sortedNightUsers.filter(
          id => !assignedNightIds.includes(id)
        );
        
        selectedId = 0;
        if (remainingNightUsers.length > 0) {
          // Kies de eerste geschikte ambulancier
          for (const userId of remainingNightUsers) {
            if (canAssignHours(userId, nightShiftHours)) {
              selectedId = userId;
              break;
            }
          }
          
          if (selectedId > 0) {
            addAssignedHours(selectedId, nightShiftHours);
            
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
            // Geen geschikte ambulancier gevonden
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
        } else {
          // Geen geschikte gebruikers meer beschikbaar
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
    
    // Log de uiteindelijke uren per gebruiker
    console.log("Assigned hours per user:");
    // Convert entries to array to avoid iterator issues
    const entries = Array.from(userAssignedHours.entries());
    for (const [userId, hours] of entries) {
      const user = ambulanciers.find(u => u.id === userId);
      if (user && hours > 0) {
        console.log(`${user.username}: ${hours} hours (opgegeven: ${user.hours})`);
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