import { users, shifts, shiftPreferences, systemSettings, weekdayConfigs, type User, type InsertUser, type Shift, type ShiftPreference, type InsertShiftPreference, type WeekdayConfig } from "@shared/schema";
import { db } from "./db";
import { eq, and, lt, gte, lte, ne, asc } from "drizzle-orm";
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

    // Haal alle gebruikers op die uren willen werken
    const allUsers = await this.getAllUsers();
    const activeUsers = allUsers.filter(user => user.hours > 0);
    
    // Maak eerst een kalender voor de maand
    const daysInMonth = new Date(year, month, 0).getDate();
    const generatedShifts: Shift[] = [];
    
    // Bijhouden hoeveel uren elke medewerker al is ingepland
    const userAssignedHours = new Map<number, number>();
    
    // Initialiseer hours tracking voor elke actieve gebruiker
    activeUsers.forEach(user => {
      userAssignedHours.set(user.id, 0);
    });
    
    console.log(`Generating schedule for ${month}/${year} with ${activeUsers.length} actieve gebruikers`);
    
    // Helper functie om weekend werk geschiedenis te berekenen (jaarbasis)
    const getWeekendShiftHistory = async (userId: number): Promise<number> => {
      const yearStart = new Date(year, 0, 1);
      const lastMonth = new Date(year, month - 1, 0);
      
      const weekendShifts = await db.select()
        .from(shifts)
        .where(and(
          eq(shifts.userId, userId),
          gte(shifts.date, yearStart),
          lte(shifts.date, lastMonth),
          ne(shifts.status, "open")
        ));
      
      return weekendShifts.filter(shift => {
        const shiftDay = shift.date.getDay();
        return shiftDay === 0 || shiftDay === 6; // Sunday or Saturday
      }).length;
    };
    
    // Helper functie om te controleren of een gebruiker nog uren kan werken
    const canAssignHours = (userId: number, hoursToAdd: number): boolean => {
      const user = activeUsers.find(u => u.id === userId);
      if (!user) return false;
      
      // Nul doeluren betekent dat deze gebruiker niet ingedeeld moet worden
      if (user.hours === 0) return false;
      
      const currentHours = userAssignedHours.get(userId) || 0;
      
      // Log voor debugging
      console.log(`Checking user ${user.username} (ID: ${userId}): hours=${user.hours}, currentHours=${currentHours}, adding=${hoursToAdd}`);
      
      // Controleer of deze toewijzing binnen de opgegeven uren valt
      return currentHours + hoursToAdd <= user.hours;
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
    
    // Functie voor weekend shiften - prioriteert eerlijke verdeling gebaseerd op jaarlijkse geschiedenis
    const getSortedUsersForWeekendAssignment = async (availableUserIds: number[]): Promise<number[]> => {
      const filteredUsers = availableUserIds.filter(userId => {
        const user = activeUsers.find(u => u.id === userId);
        if (!user) return false;
        if (user.hours === 0) return false;
        const currentHours = userAssignedHours.get(userId) || 0;
        return currentHours < user.hours;
      });

      const usersWithHistory = await Promise.all(
        filteredUsers.map(async (userId) => ({
          userId,
          weekendShifts: await getWeekendShiftHistory(userId),
          currentHours: userAssignedHours.get(userId) || 0
        }))
      );

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
      
      // Shuffle (willekeurig door elkaar) elke groep voor meer variatie
      const shuffleArray = (array: number[]): number[] => {
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
      };
      
      // Combineer de groepen met hogere prioriteit vooraan
      return [
        ...shuffleArray(urgentUsers),
        ...shuffleArray(normalUsers),
        ...shuffleArray(lowPriorityUsers)
      ];
    };
    
    // Verzamel alle dagen en splits ze op in weekends en weekdagen
    const allDays: Array<{day: number, date: Date, isWeekend: boolean}> = [];
    const weekendDays: Array<{day: number, date: Date, isWeekend: boolean}> = [];
    const weekDays: Array<{day: number, date: Date, isWeekend: boolean}> = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month - 1, day);
      const isWeekendDay = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      
      const dayInfo = { day, date: currentDate, isWeekend: isWeekendDay };
      allDays.push(dayInfo);
      
      if (isWeekendDay) {
        weekendDays.push(dayInfo);
      } else {
        weekDays.push(dayInfo);
      }
    }

    console.log(`Planning ${weekendDays.length} weekend dagen eerst, daarna ${weekDays.length} weekdagen`);

    // Helper functie om shifts voor een specifieke dag te plannen
    const planDayShifts = async (dayInfo: {day: number, date: Date, isWeekend: boolean}, isWeekend: boolean): Promise<void> => {
      const { day, date: currentDate } = dayInfo;
      
      // Verzamel beschikbare gebruikers voor deze specifieke dag
      const availableForDay: number[] = [];
      const availableForDayFirstHalf: number[] = [];
      const availableForDaySecondHalf: number[] = [];
      const availableForNight: number[] = [];
      const availableForNightFirstHalf: number[] = [];
      const availableForNightSecondHalf: number[] = [];
      
      // Check beschikbaarheid voor elke actieve gebruiker
      for (const user of activeUsers) {
        const preferences = await this.getUserShiftPreferences(user.id, month, year);
        
        // Voorkeuren filteren voor deze specifieke dag
        const prefsForThisDay = preferences.filter((pref: any) => {
          const prefDate = new Date(pref.date);
          return prefDate.getDate() === day && 
                 prefDate.getMonth() === (month - 1) && 
                 prefDate.getFullYear() === year;
        });
        
        // Als er een voorkeur is, controleer het type
        for (const pref of prefsForThisDay) {
          if (pref.type !== 'unavailable') {
            // Haal preferenceType op uit het notes veld indien beschikbaar (first, second, full)
            // Format: "first", "second", "full" of niet aanwezig (dan "full" aannemen)
            const preferenceType = pref.notes?.includes("first") ? "first" : 
                                  pref.notes?.includes("second") ? "second" : 
                                  "full";
            
            if (pref.type === 'day') {
              if (preferenceType === "full") {
                availableForDay.push(user.id);
              } else if (preferenceType === "first") {
                availableForDayFirstHalf.push(user.id);
              } else if (preferenceType === "second") {
                availableForDaySecondHalf.push(user.id);
              }
            } else if (pref.type === 'night') {
              if (preferenceType === "full") {
                availableForNight.push(user.id);
              } else if (preferenceType === "first") {
                availableForNightFirstHalf.push(user.id);
              } else if (preferenceType === "second") {
                availableForNightSecondHalf.push(user.id);
              }
            }
          }
        }
      }
      
      console.log(`Day ${day} (${isWeekend ? 'weekend' : 'weekdag'}): ${availableForDay.length} available for day, ${availableForNight.length} available for night`);
      
      // Voor weekends: gebruik eerlijke verdeling, voor weekdagen: normale verdeling
      const sortedNightUsers = isWeekend 
        ? await getSortedUsersForWeekendAssignment(availableForNight)
        : getSortedUsersForAssignment(availableForNight);
      
      // Weekdagen: alleen nachtshifts plannen (2 personen per shift)
      if (!isWeekend) {
        // Maximaal 2 personen toewijzen voor de nachtshift
        const assignedIds: number[] = [];
        
        // De nachtshift is 12 uur
        const shiftHours = 12;
        
        // Sorteer beschikbare gebruikers op basis van werklast
        const sortedNightUsers = getSortedUsersForAssignment(availableForNight);
        
        // Eerste persoon
        let selectedId = 0;
        if (sortedNightUsers.length > 0) {
          // Kies de eerste geschikte medewerker
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
            // Geen geschikte medewerker gevonden
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
        
        // Tweede medewerker (niet dezelfde als de eerste)
        const remainingNightUsers = sortedNightUsers.filter(id => !assignedIds.includes(id));
        
        selectedId = 0;
        if (remainingNightUsers.length > 0) {
          // Kies de eerste geschikte medewerker
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
            // Geen geschikte medewerker gevonden
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
          // Probeer halve shifts toe te wijzen als er geen volledige shifts mogelijk zijn
          let hasAssignedHalfShift1 = false;
          let hasAssignedHalfShift2 = false;
          
          // Eerste helft van de nacht (19:00 - 23:00)
          const sortedNightFirstHalfUsers = getSortedUsersForAssignment(availableForNightFirstHalf);
          if (sortedNightFirstHalfUsers.length > 0) {
            const halfShiftHours = 6; // 6 uur voor de eerste helft
            
            // Eerste persoon voor eerste helft
            for (const userId of sortedNightFirstHalfUsers) {
              if (canAssignHours(userId, halfShiftHours)) {
                // Maak shift aan voor de eerste helft
                const nightHalfShift1 = {
                  userId: userId,
                  date: currentDate,
                  type: "night" as const,
                  startTime: new Date(year, month - 1, day, 19, 0, 0),
                  endTime: new Date(year, month - 1, day, 23, 0, 0), // Tot 23:00
                  status: "planned" as const,
                  month,
                  year,
                  isSplitShift: true,
                  splitStartTime: new Date(year, month - 1, day, 19, 0, 0),
                  splitEndTime: new Date(year, month - 1, day, 1, 0, 0)
                };
                
                addAssignedHours(userId, halfShiftHours);
                const savedHalfShift1 = await this.createShift(nightHalfShift1);
                generatedShifts.push(savedHalfShift1);
                hasAssignedHalfShift1 = true;
                break;
              }
            }
          }
          
          // Tweede helft van de nacht (23:00 - 7:00)
          const sortedNightSecondHalfUsers = getSortedUsersForAssignment(availableForNightSecondHalf);
          if (sortedNightSecondHalfUsers.length > 0) {
            const halfShiftHours = 6; // 6 uur voor de tweede helft
            
            // Tweede persoon voor tweede helft
            for (const userId of sortedNightSecondHalfUsers) {
              if (canAssignHours(userId, halfShiftHours)) {
                // Maak shift aan voor de tweede helft
                const nightHalfShift2 = {
                  userId: userId,
                  date: currentDate,
                  type: "night" as const,
                  startTime: new Date(year, month - 1, day, 23, 0, 0), // Vanaf 23:00
                  endTime: new Date(year, month - 1, day + 1, 7, 0, 0), // Tot 7:00 volgende dag
                  status: "planned" as const,
                  month,
                  year,
                  isSplitShift: true,
                  splitStartTime: new Date(year, month - 1, day, 23, 0, 0),
                  splitEndTime: new Date(year, month - 1, day + 1, 7, 0, 0)
                };
                
                addAssignedHours(userId, halfShiftHours);
                const savedHalfShift2 = await this.createShift(nightHalfShift2);
                generatedShifts.push(savedHalfShift2);
                hasAssignedHalfShift2 = true;
                break;
              }
            }
          }
          
          // Als eerste helft niet toegewezen kon worden, maak open shift aan
          if (!hasAssignedHalfShift1) {
            const openNightHalfShift1 = {
              userId: 0,
              date: currentDate,
              type: "night" as const,
              startTime: new Date(year, month - 1, day, 19, 0, 0),
              endTime: new Date(year, month - 1, day, 23, 0, 0),
              status: "open" as const,
              month,
              year,
              isSplitShift: true,
              splitStartTime: new Date(year, month - 1, day, 19, 0, 0),
              splitEndTime: new Date(year, month - 1, day, 23, 0, 0)
            };
            
            const savedOpenHalfShift1 = await this.createShift(openNightHalfShift1);
            generatedShifts.push(savedOpenHalfShift1);
          }
          
          // Als tweede helft niet toegewezen kon worden, maak open shift aan
          if (!hasAssignedHalfShift2) {
            const openNightHalfShift2 = {
              userId: 0,
              date: currentDate,
              type: "night" as const,
              startTime: new Date(year, month - 1, day, 23, 0, 0),
              endTime: new Date(year, month - 1, day + 1, 7, 0, 0),
              status: "open" as const,
              month,
              year,
              isSplitShift: true,
              splitStartTime: new Date(year, month - 1, day, 23, 0, 0),
              splitEndTime: new Date(year, month - 1, day + 1, 7, 0, 0)
            };
            
            const savedOpenHalfShift2 = await this.createShift(openNightHalfShift2);
            generatedShifts.push(savedOpenHalfShift2);
          }
        }
      } 
      // Weekend: zowel dag- als nachtshifts plannen
      else {
        // DAGSHIFT - Maximaal 2 medewerkers toewijzen
        const assignedDayIds: number[] = [];
        const dayShiftHours = 12; // 12 uur per dagshift
        
        // Sorteer op basis van werklast
        const sortedDayUsers = getSortedUsersForAssignment(availableForDay);
        
        // Eerste medewerker dag
        let selectedId = 0;
        if (sortedDayUsers.length > 0) {
          // Kies de eerste geschikte medewerker
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
            // Geen geschikte medewerker gevonden
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
        
        // Tweede medewerker dag
        const remainingDayUsers = sortedDayUsers.filter(id => !assignedDayIds.includes(id));
        
        selectedId = 0;
        if (remainingDayUsers.length > 0) {
          // Kies de eerste geschikte medewerker
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
            // Geen geschikte medewerker gevonden
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
          // Probeer halve shifts toe te wijzen als er geen volledige shifts mogelijk zijn
          let hasAssignedHalfShift1 = false;
          let hasAssignedHalfShift2 = false;
          
          // Eerste helft van de dag (7:00 - 13:00)
          // Filter: alleen gebruikers die niet al zijn toegewezen aan een shift op deze dag
          const sortedDayFirstHalfUsers = getSortedUsersForAssignment(
            availableForDayFirstHalf.filter(id => !assignedDayIds.includes(id))
          );
          
          if (sortedDayFirstHalfUsers.length > 0) {
            const halfShiftHours = 6; // 6 uur voor de eerste helft
            
            // Eerste persoon voor eerste helft
            for (const userId of sortedDayFirstHalfUsers) {
              if (canAssignHours(userId, halfShiftHours)) {
                // Maak shift aan voor de eerste helft
                const dayHalfShift1 = {
                  userId: userId,
                  date: currentDate,
                  type: "day" as const,
                  startTime: new Date(year, month - 1, day, 7, 0, 0),
                  endTime: new Date(year, month - 1, day, 13, 0, 0), // Tot 13:00
                  status: "planned" as const,
                  month,
                  year,
                  isSplitShift: true,
                  splitStartTime: new Date(year, month - 1, day, 7, 0, 0),
                  splitEndTime: new Date(year, month - 1, day, 13, 0, 0)
                };
                
                // Voeg toe aan de lijst van toegewezen gebruikers voor deze dag
                assignedDayIds.push(userId);
                addAssignedHours(userId, halfShiftHours);
                const savedHalfShift1 = await this.createShift(dayHalfShift1);
                generatedShifts.push(savedHalfShift1);
                hasAssignedHalfShift1 = true;
                break;
              }
            }
          }
          
          // Tweede helft van de dag (13:00 - 19:00)
          // Filter: alleen gebruikers die niet al zijn toegewezen aan een shift op deze dag
          const sortedDaySecondHalfUsers = getSortedUsersForAssignment(
            availableForDaySecondHalf.filter(id => !assignedDayIds.includes(id))
          );
          
          if (sortedDaySecondHalfUsers.length > 0) {
            const halfShiftHours = 6; // 6 uur voor de tweede helft
            
            // Tweede persoon voor tweede helft
            for (const userId of sortedDaySecondHalfUsers) {
              if (canAssignHours(userId, halfShiftHours)) {
                // Maak shift aan voor de tweede helft
                const dayHalfShift2 = {
                  userId: userId,
                  date: currentDate,
                  type: "day" as const,
                  startTime: new Date(year, month - 1, day, 13, 0, 0), // Vanaf 13:00
                  endTime: new Date(year, month - 1, day, 19, 0, 0), // Tot 19:00
                  status: "planned" as const,
                  month,
                  year,
                  isSplitShift: true,
                  splitStartTime: new Date(year, month - 1, day, 13, 0, 0),
                  splitEndTime: new Date(year, month - 1, day, 19, 0, 0)
                };
                
                // Voeg toe aan de lijst van toegewezen gebruikers voor deze dag
                assignedDayIds.push(userId);
                addAssignedHours(userId, halfShiftHours);
                const savedHalfShift2 = await this.createShift(dayHalfShift2);
                generatedShifts.push(savedHalfShift2);
                hasAssignedHalfShift2 = true;
                break;
              }
            }
          }
          
          // Als eerste helft niet toegewezen kon worden, maak open shift aan
          if (!hasAssignedHalfShift1) {
            const openDayHalfShift1 = {
              userId: 0,
              date: currentDate,
              type: "day" as const,
              startTime: new Date(year, month - 1, day, 7, 0, 0),
              endTime: new Date(year, month - 1, day, 13, 0, 0),
              status: "open" as const,
              month,
              year,
              isSplitShift: true,
              splitStartTime: new Date(year, month - 1, day, 7, 0, 0),
              splitEndTime: new Date(year, month - 1, day, 13, 0, 0)
            };
            
            const savedOpenHalfShift1 = await this.createShift(openDayHalfShift1);
            generatedShifts.push(savedOpenHalfShift1);
          }
          
          // Als tweede helft niet toegewezen kon worden, maak open shift aan
          if (!hasAssignedHalfShift2) {
            const openDayHalfShift2 = {
              userId: 0,
              date: currentDate,
              type: "day" as const,
              startTime: new Date(year, month - 1, day, 13, 0, 0),
              endTime: new Date(year, month - 1, day, 19, 0, 0),
              status: "open" as const,
              month,
              year,
              isSplitShift: true,
              splitStartTime: new Date(year, month - 1, day, 13, 0, 0),
              splitEndTime: new Date(year, month - 1, day, 19, 0, 0)
            };
            
            const savedOpenHalfShift2 = await this.createShift(openDayHalfShift2);
            generatedShifts.push(savedOpenHalfShift2);
          }
        }
        
        // NACHTSHIFT - Maximaal 2 medewerkers toewijzen, niet dezelfde als dagshift
        const assignedNightIds: number[] = [];
        const nightShiftHours = 12; // 12 uur per nachtshift
        
        // Filter gebruikers voor nachtshift - niet dezelfde als dagshift
        const availableForNightFiltered = availableForNight.filter(
          id => !assignedDayIds.includes(id)
        );
        
        // GEOPTIMALISEERDE NACHTSHIFT TOEWIJZING
        // Strategie: Probeer eerst volledige shifts, dan geoptimaliseerde halve shifts
        
        // Sorteer op basis van werklast
        const sortedNightUsers = getSortedUsersForAssignment(availableForNightFiltered);
        
        // Stap 1: Probeer twee volledige nachtshifts toe te wijzen
        let assignedFullShifts = 0;
        let nightShiftsAssigned = [];
        
        for (const userId of sortedNightUsers) {
          if (assignedFullShifts >= 2) break; // Max 2 mensen per nacht
          
          if (canAssignHours(userId, nightShiftHours) && !assignedNightIds.includes(userId)) {
            assignedNightIds.push(userId);
            addAssignedHours(userId, nightShiftHours);
            nightShiftsAssigned.push(userId);
            assignedFullShifts++;
            
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
        
        // Stap 2: Als we minder dan 2 volledige shifts hebben, probeer halve shifts
        const remainingShiftsNeeded = 2 - assignedFullShifts;
        if (remainingShiftsNeeded > 0) {
          // Filter gebruikers voor nachtshift halve shifts - niet dezelfde als dagshift
          const availableForNightFirstHalfFiltered = availableForNightFirstHalf.filter(
            id => !assignedDayIds.includes(id) && !assignedNightIds.includes(id)
          );
          const availableForNightSecondHalfFiltered = availableForNightSecondHalf.filter(
            id => !assignedDayIds.includes(id) && !assignedNightIds.includes(id)
          );

          // OPTIMALISATIE: Probeer complementaire halve shifts toe te wijzen
          // Zoek mensen die beide helften kunnen doen
          const canDoBothHalves = availableForNightFirstHalfFiltered.filter(id => 
            availableForNightSecondHalfFiltered.includes(id) && canAssignHours(id, 12)
          );

          let shiftsAssigned = 0;

          // Strategie A: Wijs eerst complementaire paren toe (voorkomt gaten)
          for (let i = 0; i < Math.min(canDoBothHalves.length, remainingShiftsNeeded) && shiftsAssigned < remainingShiftsNeeded; i++) {
            const userId = canDoBothHalves[i];
            if (canAssignHours(userId, 12)) {
              // Maak twee halve shifts voor deze persoon
              const nightHalfShift1 = {
                userId: userId,
                date: currentDate,
                type: "night" as const,
                startTime: new Date(year, month - 1, day, 19, 0, 0),
                endTime: new Date(year, month - 1, day, 23, 0, 0),
                status: "planned" as const,
                month,
                year,
                isSplitShift: true,
                splitStartTime: new Date(year, month - 1, day, 19, 0, 0),
                splitEndTime: new Date(year, month - 1, day, 23, 0, 0)
              };

              const nightHalfShift2 = {
                userId: userId,
                date: currentDate,
                type: "night" as const,
                startTime: new Date(year, month - 1, day, 23, 0, 0),
                endTime: new Date(year, month - 1, day + 1, 7, 0, 0),
                status: "planned" as const,
                month,
                year,
                isSplitShift: true,
                splitStartTime: new Date(year, month - 1, day, 23, 0, 0),
                splitEndTime: new Date(year, month - 1, day + 1, 7, 0, 0)
              };

              assignedNightIds.push(userId);
              addAssignedHours(userId, 12);
              
              const savedShift1 = await this.createShift(nightHalfShift1);
              const savedShift2 = await this.createShift(nightHalfShift2);
              generatedShifts.push(savedShift1, savedShift2);
              shiftsAssigned += 2; // Dit telt als 2 shifts (volledige dekking)
            }
          }

          // Strategie B: Vul resterende shifts op met aparte halve shifts
          if (shiftsAssigned < remainingShiftsNeeded * 2) {
            // Eerste helft
            const sortedFirstHalf = getSortedUsersForAssignment(availableForNightFirstHalfFiltered);
            for (const userId of sortedFirstHalf) {
              if (shiftsAssigned >= remainingShiftsNeeded * 2) break;
              if (canAssignHours(userId, 6) && !assignedNightIds.includes(userId)) {
                const nightHalfShift = {
                  userId: userId,
                  date: currentDate,
                  type: "night" as const,
                  startTime: new Date(year, month - 1, day, 19, 0, 0),
                  endTime: new Date(year, month - 1, day, 23, 0, 0),
                  status: "planned" as const,
                  month,
                  year,
                  isSplitShift: true,
                  splitStartTime: new Date(year, month - 1, day, 19, 0, 0),
                  splitEndTime: new Date(year, month - 1, day, 23, 0, 0)
                };

                assignedNightIds.push(userId);
                addAssignedHours(userId, 6);
                const savedShift = await this.createShift(nightHalfShift);
                generatedShifts.push(savedShift);
                shiftsAssigned++;
              }
            }

            // Tweede helft
            const sortedSecondHalf = getSortedUsersForAssignment(availableForNightSecondHalfFiltered);
            for (const userId of sortedSecondHalf) {
              if (shiftsAssigned >= remainingShiftsNeeded * 2) break;
              if (canAssignHours(userId, 8) && !assignedNightIds.includes(userId)) {
                const nightHalfShift = {
                  userId: userId,
                  date: currentDate,
                  type: "night" as const,
                  startTime: new Date(year, month - 1, day, 23, 0, 0),
                  endTime: new Date(year, month - 1, day + 1, 7, 0, 0),
                  status: "planned" as const,
                  month,
                  year,
                  isSplitShift: true,
                  splitStartTime: new Date(year, month - 1, day, 23, 0, 0),
                  splitEndTime: new Date(year, month - 1, day + 1, 7, 0, 0)
                };

                assignedNightIds.push(userId);
                addAssignedHours(userId, 8);
                const savedShift = await this.createShift(nightHalfShift);
                generatedShifts.push(savedShift);
                shiftsAssigned++;
              }
            }
          }
        }

        // Maak open shifts voor niet-ingevulde posities
        const totalNightShiftsNeeded = 4; // 2 mensen x 2 shifts per persoon
        const actualShiftsCreated = generatedShifts.filter(s => 
          s.date.toDateString() === currentDate.toDateString() && 
          s.type === 'night' && 
          s.status === 'planned'
        ).length;

        // Maak open shifts aan voor alle nog niet ingevulde posities
        const neededOpenShifts = Math.max(0, 4 - actualShiftsCreated);
        for (let i = 0; i < neededOpenShifts; i++) {
          const isFirstHalf = i % 2 === 0;
          const openShift = {
            userId: 0,
            date: currentDate,
            type: "night" as const,
            startTime: isFirstHalf 
              ? new Date(year, month - 1, day, 19, 0, 0)
              : new Date(year, month - 1, day, 23, 0, 0),
            endTime: isFirstHalf 
              ? new Date(year, month - 1, day, 23, 0, 0)
              : new Date(year, month - 1, day + 1, 7, 0, 0),
            status: "open" as const,
            month,
            year,
            isSplitShift: true,
            splitStartTime: isFirstHalf 
              ? new Date(year, month - 1, day, 19, 0, 0)
              : new Date(year, month - 1, day, 23, 0, 0),
            splitEndTime: isFirstHalf 
              ? new Date(year, month - 1, day, 23, 0, 0)
              : new Date(year, month - 1, day + 1, 7, 0, 0)
          };
          
          const savedOpenShift = await this.createShift(openShift);
          generatedShifts.push(savedOpenShift);
        }
      }
    };

    // FASE 1: Plan alle weekend shiften eerst (voor eerlijke verdeling)
    for (const dayInfo of weekendDays) {
      await planDayShifts(dayInfo, true);
    }

    // FASE 2: Plan weekdag shiften
    for (const dayInfo of weekDays) {
      await planDayShifts(dayInfo, false);
    }
    
    // Log de uiteindelijke uren per gebruiker
    console.log("Assigned hours per user:");
    // Convert entries to array to avoid iterator issues
    const entries = Array.from(userAssignedHours.entries());
    for (const [userId, hours] of entries) {
      const user = activeUsers.find(u => u.id === userId);
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
  
  async deleteShift(id: number): Promise<void> {
    await db.delete(shifts).where(eq(shifts.id, id));
  }
  
  async getSystemSetting(key: string): Promise<string | null> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting?.value || null;
  }
  
  async setSystemSetting(key: string, value: string): Promise<void> {
    // Controleer of de instelling al bestaat
    const existing = await this.getSystemSetting(key);
    
    if (existing !== null) {
      // Update bestaande instelling
      await db.update(systemSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(systemSettings.key, key));
    } else {
      // Maak nieuwe instelling aan
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
      { dayOfWeek: 0, enableDayShifts: true, enableNightShifts: true, dayShiftCount: 2, nightShiftCount: 2 },   // Sunday
      { dayOfWeek: 1, enableDayShifts: false, enableNightShifts: true, dayShiftCount: 0, nightShiftCount: 2 },  // Monday
      { dayOfWeek: 2, enableDayShifts: false, enableNightShifts: true, dayShiftCount: 0, nightShiftCount: 2 },  // Tuesday
      { dayOfWeek: 3, enableDayShifts: false, enableNightShifts: true, dayShiftCount: 0, nightShiftCount: 2 },  // Wednesday
      { dayOfWeek: 4, enableDayShifts: false, enableNightShifts: true, dayShiftCount: 0, nightShiftCount: 2 },  // Thursday
      { dayOfWeek: 5, enableDayShifts: false, enableNightShifts: true, dayShiftCount: 0, nightShiftCount: 2 },  // Friday
      { dayOfWeek: 6, enableDayShifts: true, enableNightShifts: true, dayShiftCount: 2, nightShiftCount: 2 },   // Saturday
    ];

    for (const config of defaultConfigs) {
      await db.insert(weekdayConfigs).values(config);
    }
  }
}

export const storage = new DatabaseStorage();