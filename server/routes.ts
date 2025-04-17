import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertShiftSchema, insertUserSchema, insertShiftPreferenceSchema } from "@shared/schema";
import { z } from "zod";
import { comparePasswords } from "./auth";
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
        minHours: z.number().min(0).max(168).optional(),
        maxHours: z.number().min(0).max(168).optional(),
        preferredHours: z.number().min(0).max(168).optional(),
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


  // Get all shifts
  app.get("/api/shifts", requireAuth, async (req, res) => {
    const shifts = await storage.getAllShifts();
    res.json(shifts);
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
  app.post("/api/schedule/generate", requireAdmin, async (req, res) => {
    try {
      const { month, year } = req.body;
      console.log(`Generating schedule for ${month}/${year}`);
      
      const generatedShifts = await storage.generateMonthlySchedule(month, year);
      res.status(200).json(generatedShifts);
    } catch (error) {
      console.error("Error generating schedule:", error);
      res.status(500).json({ message: "Failed to generate schedule", error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}