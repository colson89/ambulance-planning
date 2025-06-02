import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import { insertShiftSchema, insertUserSchema, insertShiftPreferenceSchema, shiftPreferences, shifts, insertWeekdayConfigSchema } from "@shared/schema";
import { z } from "zod";
import { addMonths } from 'date-fns';
import {format} from 'date-fns';
import { db } from "./db";
import { and, gte, lte, asc, ne } from "drizzle-orm";
import * as XLSX from 'xlsx';

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Admin middleware
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
    }
    next();
  };

  // Authenticatie middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    next();
  };
  
  // Speciale route voor noodgeval login (ALLEEN VOOR ONTWIKKELING)
  app.post("/api/dev-login", async (req, res) => {
    try {
      const { username } = req.body;
      console.log(`Development login request for ${username}`);
      
      // Haal gebruiker op
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "Gebruiker niet gevonden" });
      }
      
      // Log gebruiker in
      req.login(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ message: "Login error" });
        }
        console.log(`Development login successful for ${username}`);
        res.status(200).json(user);
      });
    } catch (error) {
      console.error("Development login error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get all users (admin only)
  app.get("/api/users", requireAdmin, async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  // Create new user (admin only)
  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json(error.errors);
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });

  // Update user (admin only)
  app.patch("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const updateSchema = z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        role: z.enum(["admin", "ambulancier"]).optional(),
        hours: z.number().min(0).max(168).optional(),
      });

      const updateData = updateSchema.parse(req.body);
      const user = await storage.updateUser(parseInt(req.params.id), updateData);
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json(error.errors);
      } else {
        res.status(500).json({ message: "Failed to update user" });
      }
    }
  });

  // Update user password (admin or self)
  app.patch("/api/users/:id/password", requireAuth, async (req, res) => {
    try {
      // Check if user is admin or updating their own password
      if (!req.user?.isAdmin && req.user?.id !== parseInt(req.params.id)) {
        return res.sendStatus(403);
      }

      const data = (req.user?.isAdmin
        ? z.object({ password: z.string().min(6) })
        : z.object({
          currentPassword: z.string().min(1),
          newPassword: z.string().min(6)
        })
      ).parse(req.body);

      // Als niet admin, verifieer huidig wachtwoord
      if (!req.user?.isAdmin) {
        const user = await storage.getUser(parseInt(req.params.id));
        if (!user || !(await comparePasswords(data.currentPassword, user.password))) {
          return res.status(400).json({ message: "Huidig wachtwoord is incorrect" });
        }
      }

      const user = await storage.updateUserPassword(
        parseInt(req.params.id),
        // Als admin, gebruik direct het nieuwe wachtwoord, anders gebruik newPassword
        'password' in data ? data.password : data.newPassword
      );

      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json(error.errors);
      } else {
        res.status(500).json({ message: "Failed to update password" });
      }
    }
  });

  // Delete user (admin only)
  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteUser(parseInt(req.params.id));
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Get shift preferences for a month
  app.get("/api/preferences", requireAuth, async (req, res) => {
    try {
      const { month, year } = req.query;
      if (!month || !year) {
        return res.status(400).json({ message: "Month and year are required" });
      }

      const preferences = await storage.getUserShiftPreferences(
        req.user!.id,
        parseInt(month as string),
        parseInt(year as string)
      );
      res.json(preferences);
    } catch (error) {
      res.status(500).json({ message: "Failed to get preferences" });
    }
  });
  
  // Get preferences for a specific user (for admin view)
  app.get("/api/preferences/:userId/:month/:year", requireAdmin, async (req, res) => {
    try {
      const { userId, month, year } = req.params;
      const preferences = await storage.getUserShiftPreferences(
        parseInt(userId),
        parseInt(month),
        parseInt(year)
      );
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ message: "Failed to get user preferences" });
    }
  });
  
  // Clear all preferences for a user and month
  app.delete("/api/preferences/clearMonth/:userId/:month/:year", requireAdmin, async (req, res) => {
    try {
      const { userId, month, year } = req.params;
      const userPrefs = await storage.getUserShiftPreferences(
        parseInt(userId),
        parseInt(month),
        parseInt(year)
      );
      
      // Delete each preference
      for (const pref of userPrefs) {
        await storage.deleteShiftPreference(pref.id);
      }
      
      res.status(200).json({ message: `Deleted ${userPrefs.length} preferences for user ${userId} in ${month}/${year}` });
    } catch (error) {
      console.error("Error clearing preferences:", error);
      res.status(500).json({ message: "Failed to clear preferences" });
    }
  });
  
  // Track active processes
  let isGeneratingPreferences = false;
  let currentProgress = { percentage: 0, message: "", isActive: false };
  let deleteProgress = { percentage: 0, message: "", isActive: false };
  let generateProgress = { percentage: 0, message: "", isActive: false };

  // Progress endpoints for frontend polling
  app.get("/api/preferences/progress", requireAdmin, (req, res) => {
    res.json(currentProgress);
  });

  app.get("/api/schedule/delete-progress", requireAdmin, (req, res) => {
    res.json(deleteProgress);
  });

  app.get("/api/schedule/generate-progress", requireAdmin, (req, res) => {
    res.json(generateProgress);
  });

  // Generate random preferences for testing (admin only)
  app.post("/api/preferences/generate-test-data", requireAdmin, async (req, res) => {
    try {
      // Check if another process is already running
      if (isGeneratingPreferences) {
        return res.status(409).json({ 
          message: "Er is al een voorkeurengeneratie proces bezig. Wacht tot het huidige proces is voltooid." 
        });
      }

      const { month, year, userId } = req.body;
      
      if (!month || !year) {
        return res.status(400).json({ message: "Month and year are required" });
      }

      // Mark process as active
      isGeneratingPreferences = true;
      currentProgress = { percentage: 0, message: "Voorkeurengeneratie gestart...", isActive: true };
      console.log("[BLOKKERING] Voorkeurengeneratie proces gestart - nieuwe verzoeken worden geblokkeerd");
      
      let users;
      if (userId) {
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        users = [user];
      } else {
        users = await storage.getAllUsers();
        // Include all users including admins
      }
      
      // Eerst alle bestaande voorkeuren voor deze maand/jaar verwijderen
      currentProgress.message = `Verwijderen van bestaande voorkeuren voor maand ${month}/${year}...`;
      console.log(`[0%] Verwijderen van bestaande voorkeuren voor maand ${month}/${year}...`);
      
      for (let userIndex = 0; userIndex < users.length; userIndex++) {
        const user = users[userIndex];
        const deleteProgress = Math.round((userIndex / users.length) * 50); // 0% tot 50%
        
        // Haal bestaande voorkeuren op
        const existingPreferences = await storage.getUserShiftPreferences(user.id, month, year);
        
        // Verwijder elke bestaande voorkeur
        for (const preference of existingPreferences) {
          await storage.deleteShiftPreference(preference.id);
        }
        
        currentProgress.percentage = deleteProgress;
        currentProgress.message = `Verwijderd voor ${user.username} (${userIndex + 1}/${users.length})`;
        console.log(`[${deleteProgress}%] ${existingPreferences.length} voorkeuren verwijderd voor gebruiker ${user.username} (${userIndex + 1}/${users.length})`);
      }
      
      currentProgress.percentage = 50;
      currentProgress.message = "Nieuwe voorkeuren genereren...";
      console.log(`[50%] Alle bestaande voorkeuren verwijderd, nu nieuwe voorkeuren genereren...`);
      
      const daysInMonth = new Date(year, month, 0).getDate();
      let createdPreferences = 0;
      const totalOperations = users.length * daysInMonth;
      let completedOperations = 0;
      
      console.log(`[50%] Begonnen met genereren van voorkeuren voor ${users.length} gebruikers...`);
      
      for (let userIndex = 0; userIndex < users.length; userIndex++) {
        const user = users[userIndex];
        const userProgress = Math.round(50 + ((userIndex / users.length) * 40)); // 50% tot 90%
        currentProgress.percentage = userProgress;
        currentProgress.message = `Voorkeuren genereren voor ${user.username} (${userIndex + 1}/${users.length})`;
        console.log(`[${userProgress}%] Voorkeuren genereren voor ${user.username} (${userIndex + 1}/${users.length})`);
        
        // Voor elke dag in de maand
        for (let day = 1; day <= daysInMonth; day++) {
          const currentDate = new Date(year, month - 1, day);
          const dayOfWeek = currentDate.getDay(); // 0 is zondag, 6 is zaterdag
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          
          // For testing: even userId = more night shifts, odd = more day shifts
          const isEvenUserId = user.id % 2 === 0;
          
          // Bepaal beschikbaarheid - 25% kans op beschikbaarheid
          const randomValue = Math.random();
          
          // Voor elke gebruiker maken we een vaste verdeling van beschikbare dagen
          // Elke gebruiker krijgt precies 25% beschikbaarheid (8 dagen voor een maand van 31 dagen)
          
          // Gebruik een deterministische aanpak op basis van userID en dag van de maand
          // Dit zorgt ervoor dat elke gebruiker andere dagen beschikbaar is
          const userOffset = user.id % 4; // Verdeel gebruikers in 4 groepen
          
          // Bepaal of de dag beschikbaar is voor deze gebruiker
          // We delen de maand in 4 groepen van ~8 dagen, en elke userOffset groep krijgt andere dagen
          const isAvailable = ((day + userOffset) % 4 === 0);
          
          if (isAvailable) {
            // Even user IDs prefer night shifts
            const preferNight = isEvenUserId ? Math.random() < 0.7 : Math.random() < 0.3;
            const shiftType = preferNight ? "night" : "day";
            
            // Preference types: 75% full shifts, 25% half shifts (verdeeld over first en second)
            let preferenceType;
            const halfShiftRand = Math.random();
            // Exacte verdeling: 75% volledig, 25% half (12.5% eerste helft, 12.5% tweede helft)
            if (halfShiftRand < 0.75) {
              preferenceType = "full";
            } else if (halfShiftRand < 0.875) {
              preferenceType = "first";
            } else {
              preferenceType = "second";
            }
            
            // Bepaal start- en eindtijden op basis van type shift en voorkeurstype
            const startTime = new Date(currentDate);
            const endTime = new Date(currentDate);
            
            if (shiftType === "day") {
              if (preferenceType === "full") {
                startTime.setHours(7, 0, 0, 0);
                endTime.setHours(19, 0, 0, 0);
              } else if (preferenceType === "first") {
                startTime.setHours(7, 0, 0, 0);
                endTime.setHours(13, 0, 0, 0);
              } else { // second
                startTime.setHours(13, 0, 0, 0);
                endTime.setHours(19, 0, 0, 0);
              }
            } else { // night
              if (preferenceType === "full") {
                startTime.setHours(19, 0, 0, 0);
                // Voor nachtshifts: eindtijd op de volgende dag
                endTime.setDate(endTime.getDate() + 1);
                endTime.setHours(7, 0, 0, 0);
              } else if (preferenceType === "first") {
                startTime.setHours(19, 0, 0, 0);
                endTime.setHours(23, 0, 0, 0);
              } else { // second
                startTime.setHours(23, 0, 0, 0);
                // Voor tweede helft: eindtijd op de volgende dag
                endTime.setDate(endTime.getDate() + 1);
                endTime.setHours(7, 0, 0, 0);
              }
            }
            
            // Creëer de beschikbaarheidsvoorkeur
            await storage.createShiftPreference({
              userId: user.id,
              date: currentDate,
              type: shiftType,
              startTime: startTime,
              endTime: endTime,
              month,
              year,
              canSplit: preferenceType === "full" && Math.random() < 0.2, // 20% kans dat volledige shift gesplitst mag worden
              notes: `Automatisch gegenereerd voor test (${preferenceType} ${shiftType} shift)`
            });
            createdPreferences++;
          } 
          // Voor alle andere dagen (75%) expliciet markeren als onbeschikbaar
          else {
            // Maak een "unavailable" voorkeur
            await storage.createShiftPreference({
              userId: user.id,
              date: currentDate,
              type: "unavailable",
              startTime: null,
              endTime: null,
              month,
              year,
              canSplit: false,
              notes: "Automatisch gegenereerd voor test (niet beschikbaar)"
            });
            createdPreferences++;
          }
          
          completedOperations++;
          // GEEN neutrale voorkeuren meer
        }
        
        // Log voortgang na elke gebruiker
        const overallProgress = Math.round(90 + ((completedOperations / totalOperations) * 10)); // 90% tot 100%
        currentProgress.percentage = overallProgress;
        currentProgress.message = `Voltooid voor ${user.username} - ${completedOperations}/${totalOperations} operaties`;
        console.log(`[${overallProgress}%] Voltooid voor ${user.username} - ${completedOperations}/${totalOperations} operaties`);
      }
      
      currentProgress.percentage = 100;
      currentProgress.message = "Voorkeuren generatie voltooid!";
      console.log(`[100%] Voorkeuren generatie voltooid!`);
      
      // Sla de huidige tijd op als tijdstempel voor de laatste generatie
      const now = new Date();
      const timestamp = now.toISOString();
      await storage.setSystemSetting('last_preferences_generated', timestamp);
      
      // Release the lock and reset progress
      isGeneratingPreferences = false;
      currentProgress = { percentage: 0, message: "", isActive: false };
      console.log("[BLOKKERING] Voorkeurengeneratie proces voltooid - nieuwe verzoeken zijn weer toegestaan");
      
      res.status(200).json({ 
        message: `Successfully generated ${createdPreferences} test preferences for ${users.length} users`,
        timestamp: timestamp,
        formattedTimestamp: now.toLocaleString('nl-NL', { 
          timeZone: 'Europe/Brussels',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false 
        })
      });
    } catch (error) {
      console.error("Error generating test preferences:", error);
      
      // Release the lock in case of error
      isGeneratingPreferences = false;
      currentProgress = { percentage: 0, message: "", isActive: false };
      console.log("[BLOKKERING] Voorkeurengeneratie proces gefaald - blokkering vrijgegeven");
      
      res.status(500).json({ 
        message: "Failed to generate test preferences",
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Get all preferences for admin view
  app.get("/api/preferences/all", requireAdmin, async (req, res) => {
    try {
      // Get month and year from query parameters, fallback to current date
      const { month, year } = req.query;
      const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
      
      // Get all shift preferences for the specified month/year using SQL query
      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 0);
      
      const allPreferences = await db.select()
        .from(shiftPreferences)
        .where(
          and(
            gte(shiftPreferences.date, startDate),
            lte(shiftPreferences.date, endDate)
          )
        )
        .orderBy(asc(shiftPreferences.date), asc(shiftPreferences.userId));
      
      res.json(allPreferences);
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ message: "Failed to get preferences" });
    }
  });

  // Route handler for creating preferences
  app.post("/api/preferences", requireAuth, async (req, res) => {
    try {
      console.log('Received preference data:', req.body);

      const preferenceData = {
        ...req.body,
        userId: req.user!.id,
        date: new Date(req.body.date),
        startTime: req.body.startTime ? new Date(req.body.startTime) : null,
        endTime: req.body.endTime ? new Date(req.body.endTime) : null,
        status: "pending"
      };

      console.log('Processing preference with data:', preferenceData);

      // Check if there's already a preference for this date
      const existingPreferences = await storage.getUserShiftPreferences(
        req.user!.id,
        preferenceData.month,
        preferenceData.year
      );

      const existingPreference = existingPreferences.find(pref => 
        format(new Date(pref.date), "yyyy-MM-dd") === format(new Date(preferenceData.date), "yyyy-MM-dd")
      );

      let preference;
      if (existingPreference) {
        // Update existing preference
        preference = await storage.updateShiftPreference(existingPreference.id, preferenceData);
        console.log('Updated existing preference:', preference);
      } else {
        // Create new preference
        preference = await storage.createShiftPreference(preferenceData);
        console.log('Created new preference:', preference);
      }

      res.status(201).json(preference);
    } catch (error) {
      console.error('Error processing preference:', error);
      res.status(500).json({
        message: "Er is een fout opgetreden bij het opslaan van de voorkeur"
      });
    }
  });

  // Delete shift preference
  app.delete("/api/preferences/:id", requireAuth, async (req, res) => {
    try {
      // Check if preference exists and belongs to user
      const preference = await storage.getShiftPreference(parseInt(req.params.id));
      if (!preference) {
        return res.status(404).json({ message: "Voorkeur niet gevonden" });
      }

      if (preference.userId !== req.user!.id) {
        return res.status(403).json({ message: "U heeft geen toegang tot deze voorkeur" });
      }

      await storage.deleteShiftPreference(parseInt(req.params.id));
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Kon voorkeur niet verwijderen" });
    }
  });


  // Get all shifts - optionally filter by month/year
  app.get("/api/shifts", requireAuth, async (req, res) => {
    try {
      let shifts;
      
      if (req.query.month && req.query.year) {
        const month = parseInt(req.query.month as string);
        const year = parseInt(req.query.year as string);
        shifts = await storage.getShiftsByMonth(month, year);
      } else {
        shifts = await storage.getAllShifts();
      }
      
      res.status(200).json(shifts);
    } catch (error) {
      console.error("Error getting shifts:", error);
      res.status(500).json({ message: "Failed to get shifts" });
    }
  });
  
  // Delete all shifts for a specific month/year
  app.delete("/api/shifts/month", requireAdmin, async (req, res) => {
    try {
      const { month, year } = req.body;
      if (!month || !year) {
        return res.status(400).json({ message: "Month and year are required" });
      }
      
      console.log(`Deleting all shifts for ${month}/${year}`);
      
      // Haal eerst alle shifts op voor deze maand/jaar
      const shifts = await storage.getShiftsByMonth(parseInt(month), parseInt(year));
      const totalShifts = shifts.length;
      
      console.log(`[0%] Begonnen met verwijderen van ${totalShifts} shifts...`);
      
      // Initialize progress tracking
      deleteProgress = { percentage: 0, message: "Beginnen met verwijderen...", isActive: true };
      
      // Verwijder alle shifts voor deze maand/jaar met voortgangsindicatie
      for (let i = 0; i < shifts.length; i++) {
        await storage.deleteShift(shifts[i].id);
        
        // Update progress for every shift
        const progress = Math.round(((i + 1) / totalShifts) * 100);
        deleteProgress.percentage = progress;
        deleteProgress.message = `${i + 1}/${totalShifts} shifts verwijderd`;
        
        // Log voortgang elke 10 shifts of bij de laatste
        if (i % 10 === 0 || i === shifts.length - 1) {
          console.log(`[${progress}%] ${i + 1}/${totalShifts} shifts verwijderd`);
        }
      }
      
      // Complete progress tracking
      deleteProgress = { percentage: 100, message: "Verwijderen voltooid!", isActive: false };
      
      console.log(`[100%] ${totalShifts} shifts succesvol verwijderd voor ${month}/${year}`);
      res.status(200).json({ 
        message: `${totalShifts} shifts verwijderd voor ${month}/${year}`,
        count: totalShifts
      });
    } catch (error) {
      console.error("Error deleting shifts:", error);
      res.status(500).json({ message: "Failed to delete shifts" });
    }
  });

  // Get shifts by month
  app.get("/api/shifts/month/:month/:year", requireAuth, async (req, res) => {
    try {
      const { month, year } = req.params;
      const shifts = await storage.getShiftsByMonth(
        parseInt(month),
        parseInt(year)
      );
      res.json(shifts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get shifts" });
    }
  });

  // Generate monthly schedule (admin only)
  app.post("/api/shifts/generate/:month/:year", requireAdmin, async (req, res) => {
    try {
      const { month, year } = req.params;
      const generatedShifts = await storage.generateMonthlySchedule(
        parseInt(month),
        parseInt(year)
      );
      res.status(200).json(generatedShifts);
    } catch (error) {
      console.error("Error generating schedule:", error);
      res.status(500).json({ message: "Failed to generate schedule" });
    }
  });
  
  // New API endpoint for schedule generation
  // TIJDELIJKE AANPASSING: veranderd van requireAdmin naar publiek toegankelijk
  // zodat we de functionaliteit kunnen demonstreren
  app.post("/api/schedule/generate", async (req, res) => {
    try {
      const { month, year } = req.body;
      console.log(`[0%] Planning generatie gestart voor ${month}/${year}`);
      
      // Initialize progress tracking
      generateProgress = { percentage: 0, message: "Planning generatie gestart...", isActive: true };
      
      const generatedShifts = await storage.generateMonthlySchedule(month, year, (percentage, message) => {
        generateProgress.percentage = percentage;
        generateProgress.message = message;
      });
      
      // Complete progress tracking
      generateProgress = { percentage: 100, message: "Planning voltooid!", isActive: false };
      console.log(`[100%] Planning generatie voltooid voor ${month}/${year}`);
      
      // Log gebruikers uren voor verificatie
      console.log("Gebruikers uren na planning generatie:");
      const users = await storage.getAllUsers();
      const ambulanciers = users.filter(user => user.role === 'ambulancier');
      
      // Shifts tellen per gebruiker
      const userShiftHours = new Map();
      ambulanciers.forEach(user => {
        const userShifts = generatedShifts.filter(s => s.userId === user.id);
        const hours = userShifts.length * 12; // Elke shift is 12 uur
        userShiftHours.set(user.id, hours);
        console.log(`- ${user.username}: ${hours} uren gepland, opgegeven: ${user.hours}`);
      });
      
      res.status(200).json(generatedShifts);
    } catch (error) {
      console.error("Error generating schedule:", error);
      res.status(500).json({ message: "Failed to generate schedule", error: error.message });
    }
  });
  
  // Route om alle shift tijden te corrigeren naar de nieuwe tijden
  app.post("/api/shifts/fix-times", requireAuth, async (req, res) => {
    try {
      console.log("Corrigeren van shift tijden naar de correcte waarden...");
      
      // Haal alle shifts op
      const allShifts = await storage.getAllShifts();
      let updatedCount = 0;
      
      for (const shift of allShifts) {
        let startHour, endHour, needsUpdate = false;
        
        // Bepaal de juiste tijden op basis van type shift
        if (shift.type === "day") {
          // Dagshift: 07:00 - 19:00
          startHour = 7;
          endHour = 19;
          
          // Controleer of de huidige tijden niet al correct zijn
          const currentStartHour = new Date(shift.startTime).getHours();
          const currentEndHour = new Date(shift.endTime).getHours();
          
          if (currentStartHour !== startHour || currentEndHour !== endHour) {
            needsUpdate = true;
          }
        } else if (shift.type === "night") {
          // Nachtshift: 19:00 - 07:00 (volgende dag)
          startHour = 19;
          endHour = 7;
          
          // Controleer of de huidige tijden niet al correct zijn
          const currentStartHour = new Date(shift.startTime).getHours();
          const currentEndHour = new Date(shift.endTime).getHours();
          
          if (currentStartHour !== startHour || currentEndHour !== endHour) {
            needsUpdate = true;
          }
        }
        
        if (needsUpdate) {
          // Bereken de juiste datums voor de start- en eindtijd
          const shiftDate = new Date(shift.date);
          const startTime = new Date(shiftDate);
          startTime.setHours(startHour, 0, 0, 0);
          
          const endTime = new Date(shiftDate);
          if (shift.type === "night") {
            // Voor nachtshift: eindtijd is de volgende dag
            endTime.setDate(endTime.getDate() + 1);
          }
          endTime.setHours(endHour, 0, 0, 0);
          
          // Update de shift
          await storage.updateShift(shift.id, {
            startTime,
            endTime
          });
          
          // Update ook split tijden indien van toepassing
          if (shift.isSplitShift) {
            if (shift.type === "day") {
              if (new Date(shift.splitEndTime).getHours() === 13) {
                // Eerste helft van dag: 07:00 - 13:00
                const splitStartTime = new Date(shiftDate);
                splitStartTime.setHours(7, 0, 0, 0);
                
                const splitEndTime = new Date(shiftDate);
                splitEndTime.setHours(13, 0, 0, 0);
                
                await storage.updateShift(shift.id, {
                  splitStartTime,
                  splitEndTime
                });
              } else {
                // Tweede helft van dag: 13:00 - 19:00
                const splitStartTime = new Date(shiftDate);
                splitStartTime.setHours(13, 0, 0, 0);
                
                const splitEndTime = new Date(shiftDate);
                splitEndTime.setHours(19, 0, 0, 0);
                
                await storage.updateShift(shift.id, {
                  splitStartTime,
                  splitEndTime
                });
              }
            } else if (shift.type === "night") {
              // Verwerk splitshifts voor nacht indien nodig
              // Huidige implementatie heeft geen gesplitste nachtshifts
            }
          }
          
          updatedCount++;
        }
      }
      
      console.log(`${updatedCount} shifts bijgewerkt met de correcte tijden.`);
      res.status(200).json({ message: `${updatedCount} shifts bijgewerkt met de correcte tijden.` });
      
    } catch (error) {
      console.error("Fout bij corrigeren van shift tijden:", error);
      res.status(500).json({ message: "Fout bij corrigeren van shift tijden", error: error.message });
    }
  });
  
  // Get a specific shift by id
  app.get("/api/shifts/:id", requireAuth, async (req, res) => {
    try {
      const shift = await storage.getShift(parseInt(req.params.id));
      if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
      }
      res.status(200).json(shift);
    } catch (error) {
      console.error("Error getting shift:", error);
      res.status(500).json({ message: "Failed to get shift" });
    }
  });
  
  // Update a shift (for manual planning adjustments)
  app.patch("/api/shifts/:id", requireAdmin, async (req, res) => {
    try {
      const shiftId = parseInt(req.params.id);
      const updateData = req.body;
      
      // Validate the shift exists
      const existingShift = await storage.getShift(shiftId);
      if (!existingShift) {
        return res.status(404).json({ message: "Shift not found" });
      }
      
      // Update the shift
      const updatedShift = await storage.updateShift(shiftId, updateData);
      res.status(200).json(updatedShift);
    } catch (error) {
      console.error("Error updating shift:", error);
      res.status(500).json({ message: "Failed to update shift" });
    }
  });

  // Split a night shift into two half shifts
  app.post("/api/shifts/:id/split", requireAdmin, async (req, res) => {
    try {
      const shiftId = parseInt(req.params.id);
      
      // Get the existing shift
      const existingShift = await storage.getShift(shiftId);
      if (!existingShift) {
        return res.status(404).json({ message: "Shift not found" });
      }
      
      // Only day and night shifts can be split
      if (existingShift.type !== "night" && existingShift.type !== "day") {
        return res.status(400).json({ message: "Only day and night shifts can be split" });
      }
      
      // Check if already split
      if (existingShift.isSplitShift) {
        return res.status(400).json({ message: "Shift is already split" });
      }
      
      // Determine split times based on shift type
      let firstHalfStart, firstHalfEnd, secondHalfStart, secondHalfEnd;
      
      if (existingShift.type === "night") {
        // Night shift: 19:00-23:00 and 23:00-07:00
        firstHalfStart = new Date(existingShift.date.getFullYear(), existingShift.date.getMonth(), existingShift.date.getDate(), 19, 0, 0);
        firstHalfEnd = new Date(existingShift.date.getFullYear(), existingShift.date.getMonth(), existingShift.date.getDate(), 23, 0, 0);
        secondHalfStart = new Date(existingShift.date.getFullYear(), existingShift.date.getMonth(), existingShift.date.getDate(), 23, 0, 0);
        secondHalfEnd = new Date(existingShift.date.getFullYear(), existingShift.date.getMonth(), existingShift.date.getDate() + 1, 7, 0, 0);
      } else {
        // Day shift: 07:00-13:00 and 13:00-19:00
        firstHalfStart = new Date(existingShift.date.getFullYear(), existingShift.date.getMonth(), existingShift.date.getDate(), 7, 0, 0);
        firstHalfEnd = new Date(existingShift.date.getFullYear(), existingShift.date.getMonth(), existingShift.date.getDate(), 13, 0, 0);
        secondHalfStart = new Date(existingShift.date.getFullYear(), existingShift.date.getMonth(), existingShift.date.getDate(), 13, 0, 0);
        secondHalfEnd = new Date(existingShift.date.getFullYear(), existingShift.date.getMonth(), existingShift.date.getDate(), 19, 0, 0);
      }

      // Update the existing shift to mark it as split and set hours to first half
      await storage.updateShift(shiftId, {
        isSplitShift: true,
        startTime: firstHalfStart,
        endTime: firstHalfEnd,
        userId: 0,
        status: "open"
      });
      
      // Create a second half shift
      const secondHalfShift = await storage.createShift({
        date: existingShift.date,
        type: existingShift.type,
        startTime: secondHalfStart,
        endTime: secondHalfEnd,
        userId: 0,
        status: "open",
        isSplitShift: true,
        splitGroup: shiftId // Link to the original shift
      });
      
      // Update the original shift with the split group reference
      await storage.updateShift(shiftId, {
        splitGroup: shiftId
      });
      
      res.status(200).json({ 
        message: "Shift successfully split into two half shifts",
        originalShift: shiftId,
        secondHalfShift: secondHalfShift.id
      });
    } catch (error) {
      console.error("Error splitting shift:", error);
      res.status(500).json({ message: "Failed to split shift" });
    }
  });

  // Merge split shifts back into one full night shift
  app.post("/api/shifts/:id/merge", requireAdmin, async (req, res) => {
    try {
      const shiftId = parseInt(req.params.id);
      
      // Get the existing shift
      const existingShift = await storage.getShift(shiftId);
      if (!existingShift) {
        return res.status(404).json({ message: "Shift not found" });
      }
      
      // Only split shifts can be merged
      if (!existingShift.isSplitShift) {
        return res.status(400).json({ message: "Only split shifts can be merged" });
      }
      
      // Find the other half of the split shift
      const allShifts = await storage.getShiftsByMonth(
        existingShift.date.getMonth() + 1,
        existingShift.date.getFullYear()
      );
      
      const splitGroup = existingShift.splitGroup;
      const otherHalf = allShifts.find(shift => 
        shift.id !== shiftId && 
        shift.splitGroup === splitGroup &&
        shift.isSplitShift
      );
      
      if (otherHalf) {
        // Delete the other half
        await storage.deleteShift(otherHalf.id);
      }
      
      // Determine full shift times based on shift type
      let fullShiftStart, fullShiftEnd, shiftDescription;
      
      if (existingShift.type === "night") {
        // Night shift: 19:00-07:00
        fullShiftStart = new Date(existingShift.date.getFullYear(), existingShift.date.getMonth(), existingShift.date.getDate(), 19, 0, 0);
        fullShiftEnd = new Date(existingShift.date.getFullYear(), existingShift.date.getMonth(), existingShift.date.getDate() + 1, 7, 0, 0);
        shiftDescription = "full night shift";
      } else {
        // Day shift: 07:00-19:00
        fullShiftStart = new Date(existingShift.date.getFullYear(), existingShift.date.getMonth(), existingShift.date.getDate(), 7, 0, 0);
        fullShiftEnd = new Date(existingShift.date.getFullYear(), existingShift.date.getMonth(), existingShift.date.getDate(), 19, 0, 0);
        shiftDescription = "full day shift";
      }

      // Update the original shift to be a full shift again
      await storage.updateShift(shiftId, {
        isSplitShift: false,
        splitGroup: null,
        startTime: fullShiftStart,
        endTime: fullShiftEnd,
        userId: 0,
        status: "open"
      });
      
      res.status(200).json({ 
        message: `Split shifts successfully merged into one ${shiftDescription}`,
        mergedShift: shiftId
      });
    } catch (error) {
      console.error("Error merging shifts:", error);
      res.status(500).json({ message: "Failed to merge shifts" });
    }
  });

  // Note: De bulk-import endpoint voor ambulanciers is verwijderd omdat deze niet meer nodig is
  // De ambulanciers zijn al direct toegevoegd via SQL

  // Haal de laatste tijdstempel op voor het genereren van testvoorkeuren
  app.get("/api/system/settings/last-preferences-generated", requireAuth, async (req, res) => {
    try {
      const timestamp = await storage.getSystemSetting('last_preferences_generated');
      
      if (timestamp) {
        // Correcte timezone-aware formattering met expliciete opties
        const date = new Date(timestamp);
        res.json({
          timestamp,
          formattedTimestamp: date.toLocaleString('nl-NL', { 
            timeZone: 'Europe/Brussels',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false 
          })
        });
      } else {
        res.json({
          timestamp: null,
          formattedTimestamp: "Nog niet gegenereerd"
        });
      }
    } catch (error) {
      console.error("Error fetching last preferences generation timestamp:", error);
      res.status(500).json({ message: "Kon tijdstempel niet ophalen" });
    }
  });

  // Weekday configuration routes
  app.get("/api/weekday-configs", requireAdmin, async (req, res) => {
    try {
      const configs = await storage.getWeekdayConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Error getting weekday configs:", error);
      res.status(500).json({ message: "Failed to get weekday configurations" });
    }
  });

  app.get("/api/weekday-configs/:dayOfWeek", requireAdmin, async (req, res) => {
    try {
      const dayOfWeek = parseInt(req.params.dayOfWeek);
      const config = await storage.getWeekdayConfig(dayOfWeek);
      if (!config) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      res.json(config);
    } catch (error) {
      console.error("Error getting weekday config:", error);
      res.status(500).json({ message: "Failed to get weekday configuration" });
    }
  });

  app.put("/api/weekday-configs/:dayOfWeek", requireAdmin, async (req, res) => {
    try {
      const dayOfWeek = parseInt(req.params.dayOfWeek);
      const updateData = req.body;
      
      const updatedConfig = await storage.updateWeekdayConfig(dayOfWeek, updateData);
      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating weekday config:", error);
      res.status(500).json({ message: "Failed to update weekday configuration" });
    }
  });

  app.post("/api/weekday-configs/initialize", requireAdmin, async (req, res) => {
    try {
      await storage.initializeDefaultWeekdayConfigs();
      const configs = await storage.getWeekdayConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Error initializing weekday configs:", error);
      res.status(500).json({ message: "Failed to initialize weekday configurations" });
    }
  });

  // Statistics routes
  app.get("/api/statistics/shifts", requireAdmin, async (req, res) => {
    try {
      const { type, year, month, quarter } = req.query;
      
      if (!type || !year) {
        return res.status(400).json({ message: "Type and year are required" });
      }
      
      const targetYear = parseInt(year as string);
      let startDate: Date, endDate: Date;
      
      switch (type) {
        case "month":
          if (!month) {
            return res.status(400).json({ message: "Month is required for monthly statistics" });
          }
          const targetMonth = parseInt(month as string);
          startDate = new Date(targetYear, targetMonth - 1, 1);
          endDate = new Date(targetYear, targetMonth, 0);
          break;
          
        case "quarter":
          if (!quarter) {
            return res.status(400).json({ message: "Quarter is required for quarterly statistics" });
          }
          const targetQuarter = parseInt(quarter as string);
          const quarterStartMonth = (targetQuarter - 1) * 3;
          startDate = new Date(targetYear, quarterStartMonth, 1);
          endDate = new Date(targetYear, quarterStartMonth + 3, 0);
          break;
          
        case "year":
          startDate = new Date(targetYear, 0, 1);
          endDate = new Date(targetYear, 11, 31);
          break;
          
        default:
          return res.status(400).json({ message: "Invalid type. Must be month, quarter, or year" });
      }
      
      // Get all users
      const users = await storage.getAllUsers();
      
      // Get shift preferences for the period
      const preferences = await db.select()
        .from(shiftPreferences)
        .where(
          and(
            gte(shiftPreferences.date, startDate),
            lte(shiftPreferences.date, endDate)
          )
        );
      
      // Get actual shifts for the period
      const actualShifts = await db.select()
        .from(shifts)
        .where(
          and(
            gte(shifts.date, startDate),
            lte(shifts.date, endDate),
            ne(shifts.userId, 0) // Exclude open shifts
          )
        );
      
      // Calculate statistics for each user
      const statistics = users.map(user => {
        const userPreferences = preferences.filter(p => p.userId === user.id);
        const userActualShifts = actualShifts.filter(s => s.userId === user.id);
        
        // Count preferences by type and weekend/weekday
        const prefStats = userPreferences.reduce((acc, pref) => {
          const isWeekend = pref.date.getDay() === 0 || pref.date.getDay() === 6;
          const key = `${pref.type}${isWeekend ? 'Weekend' : 'Week'}` as keyof typeof acc;
          // Only count approved or pending preferences (not unavailable)
          if (pref.type !== 'unavailable') {
            acc[key]++;
          }
          return acc;
        }, {
          dayWeek: 0,
          nightWeek: 0,
          dayWeekend: 0,
          nightWeekend: 0
        });
        
        // Count actual shifts by type and weekend/weekday
        const actualStats = userActualShifts.reduce((acc, shift) => {
          const isWeekend = shift.date.getDay() === 0 || shift.date.getDay() === 6;
          const key = `${shift.type}${isWeekend ? 'Weekend' : 'Week'}` as keyof typeof acc;
          acc[key]++;
          return acc;
        }, {
          dayWeek: 0,
          nightWeek: 0,
          dayWeekend: 0,
          nightWeekend: 0
        });
        
        return {
          userId: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          // Preferences
          dayShiftWeek: prefStats.dayWeek,
          nightShiftWeek: prefStats.nightWeek,
          dayShiftWeekend: prefStats.dayWeekend,
          nightShiftWeekend: prefStats.nightWeekend,
          totalPreferences: prefStats.dayWeek + prefStats.nightWeek + prefStats.dayWeekend + prefStats.nightWeekend,
          // Actual shifts
          actualDayShiftWeek: actualStats.dayWeek,
          actualNightShiftWeek: actualStats.nightWeek,
          actualDayShiftWeekend: actualStats.dayWeekend,
          actualNightShiftWeekend: actualStats.nightWeekend,
          totalActualShifts: actualStats.dayWeek + actualStats.nightWeek + actualStats.dayWeekend + actualStats.nightWeekend
        };
      });
      
      res.json(statistics);
    } catch (error) {
      console.error("Error fetching shift statistics:", error);
      res.status(500).json({ message: "Failed to get shift statistics" });
    }
  });

  // Export planning to HTML (legacy)
  app.get("/api/schedule/export", requireAdmin, async (req, res) => {
    try {
      const { month, year } = req.query;
      
      if (!month || !year) {
        return res.status(400).json({ message: "Month and year are required" });
      }
      
      const targetMonth = parseInt(month as string);
      const targetYear = parseInt(year as string);
      
      // Get shifts for the month
      const shifts = await storage.getShiftsByMonth(targetMonth, targetYear);
      
      // Get all users to map names
      const users = await storage.getAllUsers();
      const userMap = new Map(users.map(u => [u.id, u]));
      
      // Create HTML table for better Excel compatibility
      let htmlContent = `
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
          </style>
        </head>
        <body>
          <table>
            <tr>
              <th>Datum</th>
              <th>Dag</th>
              <th>Type</th>
              <th>Start Tijd</th>
              <th>Eind Tijd</th>
              <th>Voornaam</th>
              <th>Achternaam</th>
              <th>Status</th>
            </tr>
      `;
      
      // Sort shifts by date
      const sortedShifts = shifts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Add shifts to HTML table
      for (const shift of sortedShifts) {
        const user = userMap.get(shift.userId);
        const date = new Date(shift.date);
        const dayName = date.toLocaleDateString('nl-NL', { weekday: 'long' });
        const dateStr = date.toLocaleDateString('nl-NL');
        const startTime = new Date(shift.startTime).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        const endTime = new Date(shift.endTime).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        
        const firstName = user ? user.firstName : 'Open';
        const lastName = user ? user.lastName : 'Shift';
        const type = shift.type === 'day' ? 'Dag' : 'Nacht';
        const status = shift.status === 'planned' ? 'Gepland' : 'Open';
        
        htmlContent += `
            <tr>
              <td>${dateStr}</td>
              <td>${dayName}</td>
              <td>${type}</td>
              <td>${startTime}</td>
              <td>${endTime}</td>
              <td>${firstName}</td>
              <td>${lastName}</td>
              <td>${status}</td>
            </tr>
        `;
      }
      
      htmlContent += `
          </table>
        </body>
        </html>
      `;
      
      // Set headers for Excel file download
      const filename = `planning_${targetMonth}_${targetYear}.xls`;
      res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(htmlContent, 'utf8'));
      
      // Add BOM for proper UTF-8 handling in Excel
      res.write('\uFEFF');
      res.end(htmlContent);
      
    } catch (error) {
      console.error("Error exporting schedule:", error);
      res.status(500).json({ message: "Failed to export schedule" });
    }
  });

  // Export planning to XLSX (modern Excel format)
  app.get("/api/schedule/export-xlsx", requireAdmin, async (req, res) => {
    try {
      const { month, year } = req.query;
      
      if (!month || !year) {
        return res.status(400).json({ message: "Month and year are required" });
      }
      
      const targetMonth = parseInt(month as string);
      const targetYear = parseInt(year as string);
      
      // Get shifts for the month
      const shifts = await storage.getShiftsByMonth(targetMonth, targetYear);
      
      // Get all users to map names
      const users = await storage.getAllUsers();
      const userMap = new Map(users.map(u => [u.id, u]));
      
      // Sort shifts by date
      const sortedShifts = shifts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Prepare data for Excel
      const excelData = [
        // Header row
        ['Datum', 'Dag', 'Type', 'Start Tijd', 'Eind Tijd', 'Voornaam', 'Achternaam', 'Status']
      ];
      
      // Add data rows
      for (const shift of sortedShifts) {
        const user = userMap.get(shift.userId);
        const date = new Date(shift.date);
        const dayName = date.toLocaleDateString('nl-NL', { weekday: 'long' });
        const dateStr = date.toLocaleDateString('nl-NL');
        const startTime = new Date(shift.startTime).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        const endTime = new Date(shift.endTime).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        
        const firstName = user ? user.firstName : 'Open';
        const lastName = user ? user.lastName : 'Shift';
        const type = shift.type === 'day' ? 'Dag' : 'Nacht';
        const status = shift.status === 'planned' ? 'Gepland' : 'Open';
        
        excelData.push([
          dateStr,
          dayName,
          type,
          startTime,
          endTime,
          firstName,
          lastName,
          status
        ]);
      }
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(excelData);
      
      // Set column widths
      const colWidths = [
        { wch: 12 }, // Datum
        { wch: 12 }, // Dag
        { wch: 8 },  // Type
        { wch: 12 }, // Start Tijd
        { wch: 12 }, // Eind Tijd
        { wch: 15 }, // Voornaam
        { wch: 15 }, // Achternaam
        { wch: 10 }  // Status
      ];
      worksheet['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Planning');
      
      // Generate XLSX buffer
      const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      // Set headers for XLSX download
      const filename = `planning_${targetMonth}_${targetYear}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', xlsxBuffer.length);
      
      res.end(xlsxBuffer);
      
    } catch (error) {
      console.error("Error exporting XLSX schedule:", error);
      res.status(500).json({ message: "Failed to export XLSX schedule" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}