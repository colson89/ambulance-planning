import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import { insertShiftSchema, insertUserSchema, insertShiftPreferenceSchema } from "@shared/schema";
import { z } from "zod";
import { addMonths } from 'date-fns';
import {format} from 'date-fns';

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
  
  // Generate random preferences for testing (admin only)
  app.post("/api/preferences/generate-test-data", requireAdmin, async (req, res) => {
    try {
      const { month, year, userId } = req.body;
      
      if (!month || !year) {
        return res.status(400).json({ message: "Month and year are required" });
      }
      
      let users;
      if (userId) {
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        users = [user];
      } else {
        users = await storage.getAllUsers();
        // Filter out admin users
        users = users.filter(u => u.role !== 'admin');
      }
      
      const daysInMonth = new Date(year, month, 0).getDate();
      let createdPreferences = 0;
      
      for (const user of users) {
        // Voor elke dag in de maand
        for (let day = 1; day <= daysInMonth; day++) {
          const currentDate = new Date(year, month - 1, day);
          const dayOfWeek = currentDate.getDay(); // 0 is zondag, 6 is zaterdag
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          
          // For testing: even userId = more night shifts, odd = more day shifts
          const isEvenUserId = user.id % 2 === 0;
          
          // Slechts 25% kans op beschikbaarheid (veel realistischer)
          const isAvailable = Math.random() < 0.25;
          
          if (isAvailable) {
            // Even user IDs prefer night shifts
            const preferNight = isEvenUserId ? Math.random() < 0.7 : Math.random() < 0.3;
            const shiftType = preferNight ? "night" : "day";
            
            // Preference types: 75% full shifts, 12.5% first half, 12.5% second half
            // Dit maakt dat ongeveer 25% van de beschikbaarheid uit halve shifts bestaat
            let preferenceType;
            const rand = Math.random();
            if (rand < 0.75) {
              preferenceType = "full";
            } else if (rand < 0.875) {
              preferenceType = "first";
            } else {
              preferenceType = "second";
            }
            
            // Weekend dagen: hogere kans (60%) om als onbeschikbaar te zijn gemarkeerd
            if (isWeekend && Math.random() < 0.6) {
              await storage.createShiftPreference({
                userId: user.id,
                date: currentDate,
                type: "unavailable", // Onbeschikbaar
                startTime: null,
                endTime: null,
                month,
                year,
                notes: "Automatisch gegenereerd voor test (niet beschikbaar)"
              });
            } else {
              await storage.createShiftPreference({
                userId: user.id,
                date: currentDate,
                type: shiftType, // Day of night
                startTime: null,
                endTime: null,
                month,
                year,
                notes: `Automatisch gegenereerd voor test (${preferenceType} ${shiftType} shift)`
              });
            }
            createdPreferences++;
          } else {
            // If not available, mark as unavailable
            await storage.createShiftPreference({
              userId: user.id,
              date: currentDate,
              type: "unavailable",
              startTime: null,
              endTime: null,
              month,
              year,
              notes: "Automatisch gegenereerd voor test (niet beschikbaar)"
            });
            createdPreferences++;
          }
        }
      }
      
      // Sla de huidige tijd op als tijdstempel voor de laatste generatie
      const now = new Date();
      const timestamp = now.toISOString();
      await storage.setSystemSetting('last_preferences_generated', timestamp);
      
      res.status(200).json({ 
        message: `Successfully generated ${createdPreferences} test preferences for ${users.length} users`,
        timestamp: timestamp,
        formattedTimestamp: now.toLocaleString('nl-NL')
      });
    } catch (error) {
      console.error("Error generating test preferences:", error);
      res.status(500).json({ 
        message: "Failed to generate test preferences",
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Get all preferences for admin view
  app.get("/api/preferences/all", requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      
      // Get the current month and year
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      // Start getting preferences for all users
      const allPreferencesPromises = allUsers.map(async (user) => {
        const userPreferences = await storage.getUserShiftPreferences(
          user.id,
          currentMonth,
          currentYear
        );
        
        return {
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          preferences: userPreferences
        };
      });
      
      const allPreferences = await Promise.all(allPreferencesPromises);
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
      const deletedCount = shifts.length;
      
      // Verwijder alle shifts voor deze maand/jaar
      for (const shift of shifts) {
        await storage.deleteShift(shift.id);
      }
      
      console.log(`${deletedCount} shifts verwijderd voor ${month}/${year}`);
      res.status(200).json({ 
        message: `${deletedCount} shifts verwijderd voor ${month}/${year}`,
        count: deletedCount
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
      console.log(`Generating schedule for ${month}/${year}`);
      
      const generatedShifts = await storage.generateMonthlySchedule(month, year);
      
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

  // Note: De bulk-import endpoint voor ambulanciers is verwijderd omdat deze niet meer nodig is
  // De ambulanciers zijn al direct toegevoegd via SQL

  // Haal de laatste tijdstempel op voor het genereren van testvoorkeuren
  app.get("/api/system/settings/last-preferences-generated", requireAuth, async (req, res) => {
    try {
      const timestamp = await storage.getSystemSetting('last_preferences_generated');
      
      if (timestamp) {
        const date = new Date(timestamp);
        res.json({
          timestamp,
          formattedTimestamp: date.toLocaleString('nl-NL')
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

  const httpServer = createServer(app);
  return httpServer;
}