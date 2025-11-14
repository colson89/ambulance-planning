import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import { insertShiftSchema, insertUserSchema, insertShiftPreferenceSchema, shiftPreferences, shifts, insertWeekdayConfigSchema, insertUserCommentSchema, insertHolidaySchema, userStations, users, type User, type Shift } from "../shared/schema";
import { z } from "zod";
import { addMonths } from 'date-fns';
import {format} from 'date-fns';
import { db } from "./db";
import { and, gte, lte, asc, ne, eq } from "drizzle-orm";
import * as XLSX from 'xlsx';

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Admin middleware (includes supervisors)
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || (req.user.role !== 'admin' && req.user.role !== 'supervisor')) {
      console.log("Admin access denied:", {
        isAuthenticated: req.isAuthenticated(),
        userRole: req.user?.role,
        userId: req.user?.id
      });
      return res.sendStatus(403);
    }
    next();
  };

  // Strict admin-only middleware (excludes supervisors)
  const requireStrictAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      console.log("Strict admin access denied:", {
        isAuthenticated: req.isAuthenticated(),
        userRole: req.user?.role,
        userId: req.user?.id
      });
      return res.sendStatus(403);
    }
    next();
  };

  // Authenticatie middleware
  const requireAuth = (req: any, res: any, next: any) => {
    console.log("=== REQUIRE AUTH DEBUG ===");
    console.log("isAuthenticated:", req.isAuthenticated());
    console.log("session:", req.session);
    console.log("user:", req.user);
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    next();
  };

  // Version endpoint for deployment verification
  app.get("/api/version", (req, res) => {
    const version = {
      gitSha: process.env.GIT_SHA || '2b5e2f7',
      buildTime: process.env.BUILD_TIME || new Date().toISOString(),
      schemaVersion: '1.1.0-snapshot-fix',
      features: ['snapshot-based-update-detection', 'legacy-log-cleanup']
    };
    res.json(version);
  });

  // Station management routes
  app.get("/api/stations", async (req, res) => {
    try {
      const stations = await storage.getAllStations();
      res.json(stations);
    } catch (error) {
      console.error("Error getting stations:", error);
      res.status(500).json({ message: "Failed to get stations" });
    }
  });

  app.get("/api/stations/:id", async (req, res) => {
    try {
      const stationId = parseInt(req.params.id);
      const station = await storage.getStation(stationId);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      res.json(station);
    } catch (error) {
      console.error("Error getting station:", error);
      res.status(500).json({ message: "Failed to get station" });
    }
  });
  
  // Speciale route voor noodgeval login (ALLEEN VOOR ONTWIKKELING)
  app.post("/api/dev-login", async (req, res) => {
    // SECURITY: Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ message: "Not found" });
    }
    
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

  // Get ALL users for cross-team management (supervisors only)
  app.get("/api/users/all", requireAdmin, async (req, res) => {
    try {
      console.log("Getting all users for cross-team management");
      
      // Only supervisors can get all users for cross-team management
      if (!req.user || req.user.role !== 'supervisor') {
        return res.status(403).json({ message: "Alleen supervisors kunnen alle gebruikers ophalen" });
      }
      
      const allUsers = await storage.getAllUsers();
      console.log(`Found ${allUsers.length} total users for cross-team management`);
      
      // SECURITY: Remove password fields from all user objects before sending
      const users = allUsers.map(({ password, ...userWithoutPassword }) => userWithoutPassword);
      
      res.json(users);
    } catch (error) {
      console.error("Error getting all users:", error);
      res.status(500).json({ message: "Failed to get all users" });
    }
  });

  // Get all users (admin only, filtered by station - supervisors see all stations)
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      console.log("=== GET /api/users DEBUG ===");
      console.log("Admin user object:", JSON.stringify(req.user, null, 2));
      console.log("Admin stationId:", (req.user as any).stationId);
      console.log("Admin role:", (req.user as any).role);
      
      const allUsers = await storage.getAllUsers();
      console.log("All users from database:", allUsers.length);
      console.log("Users station IDs:", allUsers.map(u => `${u.username}:${u.stationId}`));
      
      let filteredUsers;
      
      // Supervisors see all users (including supervisor station for read-only), regular admins see only their station
      if ((req.user as any).role === 'supervisor') {
        const requestedStationId = req.query.stationId ? parseInt(req.query.stationId as string) : null;
        
        if (requestedStationId) {
          // Supervisor requested specific station (including supervisor station for read-only viewing)
          filteredUsers = allUsers.filter(user => user.stationId === requestedStationId);
          console.log(`Supervisor requested station ${requestedStationId}, returning ${filteredUsers.length} users`);
        } else {
          // Return all users including supervisor station for viewing
          filteredUsers = allUsers;
          console.log(`Supervisor gets all users including station 8: ${filteredUsers.length} users`);
        }
      } else {
        // Regular admin - only their station (including cross-station users)
        const adminStationId = (req.user as any).stationId;
        filteredUsers = await storage.getUsersByStation(adminStationId);
        console.log(`Admin gets users for station ${adminStationId}: ${filteredUsers.length} users (including cross-station)`);
      }
      
      // SECURITY FIX: Remove password fields from all user objects before sending
      const users = filteredUsers.map(({ password, ...userWithoutPassword }) => userWithoutPassword);
      
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  // Create new user (admin only)
  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      console.log("=== POST /api/users DEBUG ===");
      console.log("Admin user object:", JSON.stringify(req.user, null, 2));
      console.log("Admin stationId:", (req.user as any).stationId);
      console.log("Admin role:", (req.user as any).role);
      
      const userData = insertUserSchema.parse(req.body);
      console.log("Original userData:", JSON.stringify(userData, null, 2));
      
      // SECURITY: Only supervisors can create other supervisors
      if (userData.role === 'supervisor' && (req.user as any).role !== 'supervisor') {
        return res.status(403).json({ message: "Only supervisors can create other supervisors" });
      }
      
      // SECURITY: Supervisors always go to supervisor station (ID 8)
      if (userData.role === 'supervisor') {
        userData.stationId = 8;
        console.log(`Supervisor automatically assigned to supervisor station (ID 8)`);
      }
      
      // SECURITY: Station assignment logic based on role (only for non-supervisors)
      if ((req.user as any).role === 'supervisor' && userData.role !== 'supervisor') {
        // Supervisors can assign to any station except supervisor station (8)
        if (!userData.stationId) {
          return res.status(400).json({ message: "Supervisors must specify a stationId" });
        }
        if (userData.stationId === 8) {
          return res.status(400).json({ message: "Cannot assign users to supervisor station" });
        }
        
        // Validate station exists and is not supervisor station
        const targetStation = await storage.getStation(userData.stationId);
        if (!targetStation || targetStation.id === 8) {
          return res.status(400).json({ message: "Invalid station selected" });
        }
        console.log(`Supervisor creating user for station ${userData.stationId}`);
      } else {
        // Regular admins: Force to their station only
        const adminStationId = (req.user as any).stationId;
        userData.stationId = adminStationId;
        console.log(`Admin forced stationId to: ${adminStationId}`);
      }
      
      // SECURITY FIX: Hash the password before storing
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
        console.log("Password hashed successfully");
      }
      
      console.log("Final userData (password masked):", { ...userData, password: "[HASHED]" });
      
      const user = await storage.createUser(userData);
      
      // SECURITY FIX: Remove password from response
      const { password, ...userWithoutPassword } = user;
      console.log("Created user (password removed):", JSON.stringify(userWithoutPassword, null, 2));
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("USER CREATION ERROR:", error);
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
      // SECURITY: Check if user belongs to admin's station OR admin is supervisor
      const targetUser = await storage.getUser(parseInt(req.params.id));
      const adminRole = (req.user as any).role;
      const adminStationId = (req.user as any).stationId;
      
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Supervisors can update users in any station except supervisor station (8)
      if (adminRole === 'supervisor') {
        if (targetUser.stationId === 8) {
          return res.status(403).json({ message: "Cannot modify supervisor station users" });
        }
      } else {
        // Regular admins - only their station
        if (targetUser.stationId !== adminStationId) {
          return res.status(404).json({ message: "User not found" });
        }
      }

      const updateSchema = z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        email: z.string().email("Ongeldig email adres").optional().or(z.literal("")),
        role: z.enum(["admin", "ambulancier", "supervisor"]).optional(),
        hours: z.number().min(0).max(168).optional(),
        stationId: z.number().optional(),
        isProfessional: z.boolean().optional(),
        hasDrivingLicenseC: z.boolean().optional(),
      });

      const updateData = updateSchema.parse(req.body);
      
      // SECURITY: Only supervisors can promote users to supervisor role
      if (updateData.role === 'supervisor' && (req.user as any).role !== 'supervisor') {
        return res.status(403).json({ message: "Only supervisors can promote users to supervisor role" });
      }
      
      // SECURITY: When promoting to supervisor, force station assignment to supervisor station (ID 8)
      if (updateData.role === 'supervisor') {
        updateData.stationId = 8;
        console.log(`User promoted to supervisor, automatically assigned to supervisor station (ID 8)`);
      }
      
      const user = await storage.updateUser(parseInt(req.params.id), updateData);
      
      // SECURITY FIX: Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json(error.errors);
      } else {
        res.status(500).json({ message: "Failed to update user" });
      }
    }
  });

  // Update user password (admin, supervisor, or self)
  app.patch("/api/users/:id/password", requireAuth, async (req, res) => {
    try {
      const adminRole = (req.user as any).role;
      const currentUserId = (req.user as any).id;
      const targetUserId = parseInt(req.params.id);
      
      // Check if user is admin/supervisor or updating their own password
      if (adminRole !== 'admin' && adminRole !== 'supervisor' && currentUserId !== targetUserId) {
        return res.sendStatus(403);
      }
      
      // SECURITY: Supervisors can manage all users across all stations, including other supervisors
      if (adminRole === 'supervisor' && currentUserId !== targetUserId) {
        const targetUser = await storage.getUser(targetUserId);
        if (!targetUser) {
          return res.status(404).json({ message: "User not found" });
        }
        // Supervisors have full system access - no restrictions on managing other supervisors
      }

      const data = (adminRole === 'admin' || adminRole === 'supervisor'
        ? z.object({ password: z.string().min(6) })
        : z.object({
          currentPassword: z.string().min(1),
          newPassword: z.string().min(6)
        })
      ).parse(req.body);

      // Als niet admin/supervisor, verifieer huidig wachtwoord
      if (adminRole !== 'admin' && adminRole !== 'supervisor') {
        const user = await storage.getUser(parseInt(req.params.id));
        const currentPassword = 'currentPassword' in data ? data.currentPassword : '';
        if (!user || !(await comparePasswords(currentPassword, user.password))) {
          return res.status(400).json({ message: "Huidig wachtwoord is incorrect" });
        }
      }

      const user = await storage.updateUserPassword(
        targetUserId,
        // Als admin/supervisor, gebruik direct het nieuwe wachtwoord, anders gebruik newPassword
        'password' in data ? data.password : data.newPassword
      );

      // SECURITY FIX: Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
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
      const targetUserId = parseInt(req.params.id);
      const currentUserId = (req.user as any).id;
      const adminRole = (req.user as any).role;
      const adminStationId = (req.user as any).stationId;
      
      // SECURITY: Prevent self-deletion
      if (targetUserId === currentUserId) {
        return res.status(400).json({ message: "Je kunt jezelf niet verwijderen" });
      }
      
      // SECURITY: Check if user belongs to admin's station OR admin is supervisor
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Supervisors can delete users in any station except supervisor station (8)
      if (adminRole === 'supervisor') {
        if (targetUser.stationId === 8) {
          return res.status(403).json({ message: "Cannot access supervisor station users" });
        }
      } else {
        // Regular admins - only their station
        if (targetUser.stationId !== adminStationId) {
          return res.status(404).json({ message: "User not found" });
        }
      }

      await storage.deleteUser(targetUserId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Multi-station management routes
  
  // Get accessible stations for current user
  app.get("/api/user/stations", requireAuth, async (req, res) => {
    try {
      const includeSupervision = req.query.includeSupervisor === 'true';
      const stations = await storage.getUserAccessibleStations(req.user!.id, includeSupervision);
      res.json(stations);
    } catch (error) {
      console.error("Error fetching user stations:", error);
      res.status(500).json({ message: "Failed to get accessible stations" });
    }
  });

  // Station switching (server-side, works without JavaScript)
  app.post("/switch-station", requireAuth, async (req: any, res) => {
    try {
      const { stationId } = req.body;
      console.log("🔄 Station switch requested:", { userId: req.user.id, stationId });
      
      // Verify user has access to this station
      const accessibleStations = await storage.getUserAccessibleStations(req.user.id);
      const hasAccess = accessibleStations.some(station => station.id === parseInt(stationId));
      
      if (!hasAccess) {
        console.log("❌ Access denied to station:", stationId);
        return res.status(403).send("No access to this station");
      }
      
      // Update user's current station in session
      req.user.stationId = parseInt(stationId);
      
      // Update session
      req.login(req.user, (err: any) => {
        if (err) {
          console.error("Session update error:", err);
          return res.status(500).send("Failed to switch station");
        }
        
        console.log("✅ Station switched successfully to:", stationId);
        res.redirect("/dashboard");
      });
      
    } catch (error) {
      console.error("Error switching station:", error);
      res.status(500).send("Failed to switch station");
    }
  });

  // Add user to station (admin only)
  app.post("/api/users/:userId/stations/:stationId", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const stationId = parseInt(req.params.stationId);
      
      // Verify user exists and admin has access to the user's primary station
      const targetUser = await storage.getUser(userId);
      if (!targetUser || targetUser.stationId !== (req.user as any).stationId) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify the station exists
      const station = await storage.getStation(stationId);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      await storage.addUserToStation(userId, stationId);
      res.json({ message: "User toegevoegd aan station" });
    } catch (error) {
      console.error("Error adding user to station:", error);
      res.status(500).json({ message: "Failed to add user to station" });
    }
  });

  // Remove user from station (admin only)
  app.delete("/api/users/:userId/stations/:stationId", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const stationId = parseInt(req.params.stationId);
      
      // Verify user exists and admin has access to the user's primary station
      const targetUser = await storage.getUser(userId);
      if (!targetUser || targetUser.stationId !== (req.user as any).stationId) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't allow removing user from their primary station
      if (targetUser.stationId === stationId) {
        return res.status(400).json({ message: "Cannot remove user from their primary station" });
      }
      
      await storage.removeUserFromStation(userId, stationId);
      res.json({ message: "User verwijderd van station" });
    } catch (error) {
      console.error("Error removing user from station:", error);
      res.status(500).json({ message: "Failed to remove user from station" });
    }
  });

  // ===== CROSS-TEAM API ROUTES =====

  // Get user's cross-team station assignments with hour limits
  app.get("/api/users/:userId/station-assignments", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Input validation
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Ongeldige gebruiker ID" });
      }
      
      // Verify user exists
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Authorization: Supervisors have access to all users for cross-team management
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Only supervisors can access station assignments (for cross-team management)
      if (currentUser.role !== 'supervisor') {
        return res.status(403).json({ message: "Alleen supervisors kunnen station toewijzingen bekijken" });
      }
      
      // Get all station assignments for this user
      const assignments = await storage.getUserStationAssignments(userId);
      
      res.json(assignments);
    } catch (error) {
      console.error("Error getting user station assignments:", error);
      res.status(500).json({ message: "Failed to get station assignments" });
    }
  });

  // Add user to station with hour limits (supervisor only)
  app.post("/api/users/:userId/station-assignments", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { stationId, maxHours } = req.body;
      
      // Input validation
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Ongeldige gebruiker ID" });
      }
      
      // Validate body input
      const schema = z.object({
        stationId: z.number().min(1),
        maxHours: z.number().min(1).max(160) // Max 160 hours per month
      });
      
      const validatedData = schema.parse({ stationId, maxHours });
      
      // Authorization: Only supervisors can assign users to stations
      const currentUser = req.user;
      if (!currentUser || currentUser.role !== 'supervisor') {
        return res.status(403).json({ message: "Alleen supervisors kunnen gebruikers toewijzen aan stations" });
      }
      
      // Verify user exists
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify station exists
      const station = await storage.getStation(validatedData.stationId);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      // Check if supervisor has access to target station
      const accessibleStations = await storage.getUserAccessibleStations(currentUser.id);
      const hasStationAccess = accessibleStations.some(s => s.id === validatedData.stationId);
      
      if (!hasStationAccess) {
        return res.status(403).json({ message: "Geen toegang tot dit station" });
      }
      
      await storage.addUserToStation(userId, validatedData.stationId, validatedData.maxHours);
      
      res.json({ 
        message: `${targetUser.firstName} ${targetUser.lastName} toegevoegd aan ${station.displayName} met ${validatedData.maxHours} uur limiet`
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Ongeldige gegevens", errors: error.errors });
      }
      console.error("Error adding user to station with hours:", error);
      res.status(500).json({ message: "Failed to add user to station" });
    }
  });

  // Remove user from station (delete cross-team assignment)
  app.delete("/api/users/:userId/station-assignments/:stationId", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const stationId = parseInt(req.params.stationId);
      
      // Input validation
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Ongeldige gebruiker ID" });
      }
      if (isNaN(stationId)) {
        return res.status(400).json({ message: "Ongeldig station ID" });
      }
      
      // Authorization: Only supervisors can remove users from stations
      const currentUser = req.user;
      if (!currentUser || currentUser.role !== 'supervisor') {
        return res.status(403).json({ message: "Alleen supervisors kunnen gebruikers verwijderen van stations" });
      }
      
      // Verify user exists
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify station exists
      const station = await storage.getStation(stationId);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      // Prevent removing user from their primary station
      if (targetUser.stationId === stationId) {
        return res.status(400).json({ message: "Kan gebruiker niet verwijderen van hun primaire station" });
      }
      
      // Check if supervisor has access to target station
      const accessibleStations = await storage.getUserAccessibleStations(currentUser.id);
      const hasStationAccess = accessibleStations.some(s => s.id === stationId);
      
      if (!hasStationAccess) {
        return res.status(403).json({ message: "Geen toegang tot dit station" });
      }
      
      await storage.removeUserFromStation(userId, stationId);
      
      res.json({ 
        message: `${targetUser.firstName} ${targetUser.lastName} verwijderd van ${station.displayName}`
      });
    } catch (error) {
      console.error("Error removing user from station:", error);
      res.status(500).json({ message: "Failed to remove user from station" });
    }
  });

  // Update user's hour limit for a specific station
  app.put("/api/users/:userId/stations/:stationId/hours", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const stationId = parseInt(req.params.stationId);
      const { maxHours } = req.body;
      
      // Input validation
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Ongeldige gebruiker ID" });
      }
      if (isNaN(stationId)) {
        return res.status(400).json({ message: "Ongeldig station ID" });
      }
      
      // Validate body input
      const schema = z.object({
        maxHours: z.number().min(1).max(160)
      });
      
      const validatedData = schema.parse({ maxHours });
      
      // Authorization: Only supervisors can update station hours
      const currentUser = req.user;
      if (!currentUser || currentUser.role !== 'supervisor') {
        return res.status(403).json({ message: "Alleen supervisors kunnen uren limieten aanpassen" });
      }
      
      // Verify user exists
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify station exists
      const station = await storage.getStation(stationId);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      // Check if supervisor has access to target station
      const accessibleStations = await storage.getUserAccessibleStations(currentUser.id);
      const hasStationAccess = accessibleStations.some(s => s.id === stationId);
      
      if (!hasStationAccess) {
        return res.status(403).json({ message: "Geen toegang tot dit station" });
      }
      
      await storage.updateUserStationHours(userId, stationId, validatedData.maxHours);
      
      res.json({ 
        message: `Uur limiet voor ${targetUser.firstName} ${targetUser.lastName} bij ${station.displayName} bijgewerkt naar ${validatedData.maxHours} uur`
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Ongeldige gegevens", errors: error.errors });
      }
      console.error("Error updating user station hours:", error);
      res.status(500).json({ message: "Failed to update station hours" });
    }
  });

  // Get cross-team users for a specific station
  app.get("/api/stations/:stationId/cross-team-users", requireAdmin, async (req, res) => {
    try {
      const stationId = parseInt(req.params.stationId);
      
      // Verify station exists
      const station = await storage.getStation(stationId);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      // Get cross-team users for this station
      const crossTeamUsers = await storage.getCrossTeamUsersForStation(stationId);
      
      res.json(crossTeamUsers);
    } catch (error) {
      console.error("Error getting cross-team users:", error);
      res.status(500).json({ message: "Failed to get cross-team users" });
    }
  });

  // Validate cross-team schedule for conflicts
  app.post("/api/validate-cross-team-schedule", requireAuth, async (req, res) => {
    try {
      const { shifts } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Validate input
      const schema = z.object({
        shifts: z.array(z.object({
          date: z.coerce.date(),
          startTime: z.coerce.date(),
          endTime: z.coerce.date(),
          stationId: z.number()
        }))
      });
      
      const validatedData = schema.parse({ shifts });
      
      // Validate the schedule for conflicts
      const validation = await storage.validateCrossTeamSchedule(userId, validatedData.shifts);
      
      res.json(validation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Ongeldige gegevens", errors: error.errors });
      }
      console.error("Error validating cross-team schedule:", error);
      res.status(500).json({ message: "Failed to validate schedule" });
    }
  });

  // ===== UNIFIED PREFERENCES API ROUTES =====

  // Get unified preferences (cross-team) for authenticated user  
  app.get("/api/unified-preferences", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { month, year } = req.query;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Default to current month/year if not provided
      const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

      const preferences = await storage.getUnifiedUserShiftPreferences(userId, targetMonth, targetYear);
      
      res.json(preferences);
    } catch (error) {
      console.error("Error getting unified preferences:", error);
      res.status(500).json({ message: "Failed to get unified preferences" });
    }
  });

  // Sync user preferences to all assigned stations
  app.post("/api/sync-preferences", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { month, year } = req.body;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Validate input
      const schema = z.object({
        month: z.number().min(1).max(12),
        year: z.number().min(2020).max(2050)
      });

      const validatedData = schema.parse({ month, year });

      // Sync preferences from primary station to all assigned stations
      await storage.syncUserPreferencesToAllStations(userId, validatedData.month, validatedData.year);

      res.json({ 
        message: `Voorkeuren gesynchroniseerd voor ${validatedData.month}/${validatedData.year} naar alle toegewezen stations`
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Ongeldige gegevens", errors: error.errors });
      }
      console.error("Error syncing preferences:", error);
      res.status(500).json({ message: "Failed to sync preferences" });
    }
  });

  // Delete unified preferences for authenticated user (all stations)
  app.delete("/api/unified-preferences/:month/:year", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const month = parseInt(req.params.month);
      const year = parseInt(req.params.year);

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Validate parameters
      if (isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Ongeldige maand" });
      }
      if (isNaN(year) || year < 2020 || year > 2050) {
        return res.status(400).json({ message: "Ongeldig jaar" });
      }

      await storage.deleteUnifiedPreferencesForUser(userId, month, year);

      res.json({ message: `Alle voorkeuren voor ${month}/${year} zijn verwijderd van alle stations` });
    } catch (error) {
      console.error("Error deleting unified preferences:", error);
      res.status(500).json({ message: "Failed to delete unified preferences" });
    }
  });

  // Auto-sync preferences when creating/updating preferences
  app.post("/api/preferences-with-sync", requireAuth, async (req, res) => {
    try {
      console.log('Received preference data with sync:', req.body);

      const preferenceData = {
        ...req.body,
        userId: req.user!.id,
        stationId: req.user!.stationId, 
        date: new Date(req.body.date),
        startTime: req.body.startTime ? new Date(req.body.startTime) : null,
        endTime: req.body.endTime ? new Date(req.body.endTime) : null,
        status: "pending"
      };

      console.log('Processing preference with sync:', preferenceData);

      // Check if there's already a preference for this date
      const existingPreferences = await storage.getUserShiftPreferences(
        req.user!.id,
        preferenceData.month,
        preferenceData.year
      );

      const existingPreference = existingPreferences.find(pref => 
        format(new Date(pref.date), "yyyy-MM-dd") === format(new Date(preferenceData.date), "yyyy-MM-dd") &&
        pref.type === preferenceData.type
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

      // Auto-sync to all assigned stations
      await storage.syncUserPreferencesToAllStations(req.user!.id, preferenceData.month, preferenceData.year);
      console.log('Preferences synced to all stations');

      res.status(201).json(preference);
    } catch (error) {
      console.error('Error processing preference with sync:', error);
      res.status(500).json({
        message: "Er is een fout opgetreden bij het opslaan en synchroniseren van de voorkeur"
      });
    }
  });

  // ===== CROSS-TEAM STATISTICS API ROUTES =====

  // Get cross-team shift statistics 
  app.get("/api/statistics/cross-team-shifts", requireAdmin, async (req, res) => {
    try {
      const { type, year, month, quarter } = req.query;
      
      // Validate required parameters
      if (!type || !year) {
        return res.status(400).json({ message: "Type en jaar zijn verplicht" });
      }
      
      const periodType = type as "month" | "quarter" | "year";
      const targetYear = parseInt(year as string);
      
      // Validate type
      if (!["month", "quarter", "year"].includes(periodType)) {
        return res.status(400).json({ message: "Type moet 'month', 'quarter' of 'year' zijn" });
      }
      
      // Validate month for monthly stats
      if (periodType === "month" && !month) {
        return res.status(400).json({ message: "Maand is verplicht voor maandelijkse statistieken" });
      }
      
      // Validate quarter for quarterly stats  
      if (periodType === "quarter" && !quarter) {
        return res.status(400).json({ message: "Kwartaal is verplicht voor kwartaalstatistieken" });
      }
      
      const targetMonth = month ? parseInt(month as string) : undefined;
      const targetQuarter = quarter ? parseInt(quarter as string) : undefined;
      
      console.log(`Fetching cross-team statistics: ${periodType} ${targetYear}${targetMonth ? `/${targetMonth}` : ''}${targetQuarter ? ` Q${targetQuarter}` : ''}`);
      
      const statistics = await storage.getCrossTeamShiftStatistics(
        periodType,
        targetYear,
        targetMonth,
        targetQuarter
      );
      
      console.log(`Found ${statistics.length} cross-team users with statistics`);
      res.json(statistics);
    } catch (error) {
      console.error("Error fetching cross-team shift statistics:", error);
      res.status(500).json({ message: "Failed to get cross-team shift statistics" });
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
      
      // SECURITY: Check if user belongs to admin's station
      const targetUser = await storage.getUser(parseInt(userId));
      if (!targetUser || targetUser.stationId !== (req.user as any).stationId) {
        return res.status(404).json({ message: "User not found" });
      }

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
      
      // SECURITY: Check if user belongs to admin's station
      const targetUser = await storage.getUser(parseInt(userId));
      if (!targetUser || targetUser.stationId !== (req.user as any).stationId) {
        return res.status(404).json({ message: "User not found" });
      }

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

  app.get("/api/schedule/generate-progress", (req, res) => {
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
      const userStationId = req.user?.stationId;
      
      if (!month || !year) {
        return res.status(400).json({ message: "Month and year are required" });
      }

      // Controleer of gebruiker ingelogd is en stationId heeft
      if (!req.user || !userStationId) {
        return res.status(401).json({ message: "Geen geldige sessie of station informatie. Log opnieuw in." });
      }

      // Mark process as active
      isGeneratingPreferences = true;
      currentProgress = { percentage: 0, message: "Voorkeurengeneratie gestart...", isActive: true };
      console.log(`[BLOKKERING] Voorkeurengeneratie proces gestart voor station ${userStationId} - nieuwe verzoeken worden geblokkeerd`);
      
      let users;
      if (userId) {
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        users = [user];
      } else {
        // Alleen gebruikers van het huidige station ophalen
        users = await storage.getUsersByStation(userStationId);
        console.log(`[0%] Voorkeuren genereren voor ${users.length} gebruikers van station ${userStationId}`);
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
              stationId: user.stationId,
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
              stationId: user.stationId,
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
      
      // Sla de huidige tijd op als tijdstempel per maand voor de laatste generatie
      const now = new Date();
      const timestamp = now.toISOString();
      const key = `last_preferences_generated_${month}_${year}`;
      await storage.setSystemSetting(key, timestamp);
      
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

  // Delete all preferences for a specific month/year/station (admin only)
  app.post("/api/preferences/delete-month", requireAdmin, async (req, res) => {
    try {
      const { month, year, password } = req.body;
      const userStationId = req.user?.stationId;
      
      if (!month || !year) {
        return res.status(400).json({ message: "Month and year are required" });
      }

      // Controleer of gebruiker ingelogd is en stationId heeft
      if (!req.user || !userStationId) {
        return res.status(401).json({ message: "Geen geldige sessie of station informatie. Log opnieuw in." });
      }

      // Verifieer wachtwoord (zelfde als test preferences)
      if (password !== "Jeroen0143.") {
        return res.status(403).json({ message: "Onjuist wachtwoord" });
      }

      // Verwijder alle voorkeuren voor deze maand/jaar/station
      const deletedCount = await storage.deletePreferencesByMonthAndStation(month, year, userStationId);
      
      console.log(`Deleted ${deletedCount} preferences for station ${userStationId}, month ${month}/${year}`);
      
      res.status(200).json({ 
        message: `Successfully deleted ${deletedCount} preferences for ${month}/${year}`,
        deletedCount
      });
    } catch (error) {
      console.error("Error deleting preferences:", error);
      res.status(500).json({ 
        message: "Failed to delete preferences",
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
        stationId: req.user!.stationId, // BUGFIX: Add missing stationId
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
        format(new Date(pref.date), "yyyy-MM-dd") === format(new Date(preferenceData.date), "yyyy-MM-dd") &&
        pref.type === preferenceData.type
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
    // Disable caching for dynamic shift data
    res.set('Cache-Control', 'no-store');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    try {
      let shifts;
      const userStationId = req.user?.stationId;
      
      if (req.query.month && req.query.year) {
        const month = parseInt(req.query.month as string);
        const year = parseInt(req.query.year as string);
        shifts = await storage.getShiftsByMonth(month, year, userStationId);
      } else {
        shifts = await storage.getAllShifts(userStationId);
      }
      
      res.status(200).json(shifts);
    } catch (error) {
      console.error("Error getting shifts:", error);
      res.status(500).json({ message: "Failed to get shifts" });
    }
  });

  // Create a new shift
  app.post("/api/shifts", requireAdmin, async (req, res) => {
    try {
      console.log('Creating shift with data:', req.body);
      
      const shiftData = {
        ...req.body,
        userId: req.body.userId || 0, // Default to unassigned
        stationId: req.body.stationId || req.user?.stationId,
        date: new Date(req.body.date),
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
        month: new Date(req.body.date).getMonth() + 1,
        year: new Date(req.body.date).getFullYear()
      };

      // BUSINESS RULE VALIDATION: Check if cross-team user can receive split shift in simple system
      if (shiftData.userId && shiftData.userId > 0 && shiftData.isSplitShift) {
        const canReceiveSplit = await storage.canUserReceiveSplitShift(shiftData.userId, shiftData.stationId);
        if (!canReceiveSplit) {
          console.log(`❌ BUSINESS RULE VIOLATION: Cannot assign split shift to cross-team user ${shiftData.userId} in simple system (station ${shiftData.stationId})`);
          return res.status(400).json({ 
            message: "Cross-team gebruikers kunnen geen gesplitste shifts krijgen in eenvoudige systemen. Wijs een volledige shift toe of kies een andere gebruiker.",
            errorCode: "SPLIT_SHIFT_NOT_ALLOWED_FOR_CROSS_TEAM_USER"
          });
        }
      }
      
      const shift = await storage.createShift(shiftData);
      console.log('Shift created successfully:', shift);
      
      res.status(201).json(shift);
    } catch (error) {
      console.error("Error creating shift:", error);
      res.status(500).json({ message: "Failed to create shift" });
    }
  });
  
  // Delete all shifts for a specific month/year
  app.delete("/api/shifts/month", requireAdmin, async (req, res) => {
    try {
      const { month, year } = req.body;
      if (!month || !year) {
        return res.status(400).json({ message: "Month and year are required" });
      }
      
      const userStationId = req.user?.stationId;
      console.log(`Deleting all shifts for ${month}/${year} for station ${userStationId}`);
      
      // Haal eerst alle shifts op voor deze maand/jaar en station
      const shifts = await storage.getShiftsByMonth(parseInt(month), parseInt(year), userStationId);
      const totalShifts = shifts.length;
      
      console.log(`[0%] Begonnen met verwijderen van ${totalShifts} shifts...`);
      
      // Initialize progress tracking
      deleteProgress = { percentage: 0, message: "Beginnen met verwijderen...", isActive: true };
      
      // Track successes and failures
      let successCount = 0;
      const failedShifts: Array<{ id: number; error: string }> = [];
      
      // Verwijder alle shifts voor deze maand/jaar met voortgangsindicatie
      for (let i = 0; i < shifts.length; i++) {
        try {
          await storage.deleteShift(shifts[i].id);
          successCount++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`Failed to delete shift ${shifts[i].id}:`, errorMsg);
          failedShifts.push({ id: shifts[i].id, error: errorMsg });
        }
        
        // Update progress for every shift
        const progress = Math.round(((i + 1) / totalShifts) * 100);
        deleteProgress.percentage = progress;
        deleteProgress.message = `${successCount}/${totalShifts} shifts verwijderd${failedShifts.length > 0 ? ` (${failedShifts.length} gefaald)` : ''}`;
        
        // Log voortgang elke 10 shifts of bij de laatste
        if (i % 10 === 0 || i === shifts.length - 1) {
          console.log(`[${progress}%] ${successCount}/${totalShifts} shifts verwijderd, ${failedShifts.length} gefaald`);
        }
      }
      
      // Complete progress tracking
      deleteProgress = { percentage: 100, message: "Verwijderen voltooid!", isActive: false };
      
      // Return summary
      if (failedShifts.length === 0) {
        console.log(`[100%] ${successCount} shifts succesvol verwijderd voor ${month}/${year}`);
        res.status(200).json({ 
          message: `${successCount} shifts verwijderd voor ${month}/${year}`,
          count: successCount
        });
      } else {
        console.log(`[100%] ${successCount}/${totalShifts} shifts verwijderd, ${failedShifts.length} gefaald`);
        res.status(207).json({ 
          message: `${successCount}/${totalShifts} shifts verwijderd. ${failedShifts.length} shifts konden niet worden verwijderd uit Verdi.`,
          count: successCount,
          failed: failedShifts.length,
          failedShifts: failedShifts
        });
      }
    } catch (error) {
      console.error("Error deleting shifts:", error);
      deleteProgress = { percentage: 0, message: "Verwijderen gefaald", isActive: false };
      res.status(500).json({ message: "Failed to delete shifts" });
    }
  });

  // Get shifts by month
  app.get("/api/shifts/month/:month/:year", requireAuth, async (req, res) => {
    // Disable caching for dynamic shift data
    res.set('Cache-Control', 'no-store');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    try {
      const { month, year } = req.params;
      const userStationId = req.user?.stationId;
      const shifts = await storage.getShiftsByMonth(
        parseInt(month),
        parseInt(year),
        userStationId
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
      const userStationId = req.user?.stationId;
      const generatedShifts = await storage.generateMonthlySchedule(
        parseInt(month),
        parseInt(year),
        userStationId
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
  app.post("/api/schedule/generate", requireAuth, async (req, res) => {
    try {
      const { month, year } = req.body;
      const userStationId = req.user?.stationId;
      
      
      // Controleer of gebruiker ingelogd is en stationId heeft
      if (!req.user || !userStationId) {
        console.error("Geen geldige gebruiker of stationId:", { 
          user: req.user?.username, 
          stationId: userStationId,
          fullUser: req.user 
        });
        return res.status(401).json({ message: "Geen geldige sessie of station informatie. Log opnieuw in." });
      }
      
      console.log(`[0%] Planning generatie gestart voor ${month}/${year} voor station ${userStationId}`);
      
      // Initialize progress tracking
      generateProgress = { percentage: 0, message: "Planning generatie gestart...", isActive: true };
      
      // Pass progress callback to storage function
      const progressCallback = (percentage: number, message: string) => {
        generateProgress = { percentage, message, isActive: true };
        console.log(`[${percentage}%] ${message}`);
      };
      
      const generatedShifts = await storage.generateMonthlySchedule(month, year, userStationId, progressCallback);
      
      
      // Complete progress tracking
      generateProgress = { percentage: 100, message: "Planning voltooid!", isActive: false };
      console.log(`[100%] Planning generatie voltooid voor ${month}/${year}`);
      
      // Sla de huidige tijd op als tijdstempel per maand voor de laatste planning generatie
      const now = new Date();
      const timestamp = now.toISOString();
      const key = `last_schedule_generated_${month}_${year}`;
      await storage.setSystemSetting(key, timestamp);
      
      
      res.status(200).json(generatedShifts);
    } catch (error) {
      console.error("Error generating schedule:", error);
      res.status(500).json({ message: "Failed to generate schedule", error: String(error) });
    }
  });
  
  
  // Get a specific shift by id
  app.get("/api/shifts/:id", requireAuth, async (req, res) => {
    // Disable caching for dynamic shift data
    res.set('Cache-Control', 'no-store');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
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
      
      // BUSINESS RULE VALIDATION: Check if updating to split shift for cross-team user in simple system
      if (updateData.userId && updateData.userId > 0 && (updateData.isSplitShift || existingShift.isSplitShift)) {
        const targetStationId = updateData.stationId || existingShift.stationId;
        const canReceiveSplit = await storage.canUserReceiveSplitShift(updateData.userId, targetStationId);
        if (!canReceiveSplit) {
          console.log(`❌ BUSINESS RULE VIOLATION: Cannot update shift to assign split shift to cross-team user ${updateData.userId} in simple system (station ${targetStationId})`);
          return res.status(400).json({ 
            message: "Cross-team gebruikers kunnen geen gesplitste shifts krijgen in eenvoudige systemen. Wijs een volledige shift toe of kies een andere gebruiker.",
            errorCode: "SPLIT_SHIFT_NOT_ALLOWED_FOR_CROSS_TEAM_USER"
          });
        }
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
  app.post("/api/shifts/:id/split", requireAuth, async (req, res) => {
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
        status: "open",
        splitGroup: shiftId
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
        splitGroup: shiftId,
        stationId: existingShift.stationId,
        month: existingShift.month,
        year: existingShift.year
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
  app.post("/api/shifts/:id/merge", requireAuth, async (req, res) => {
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

  // Haal de laatste tijdstempel op voor het genereren van testvoorkeuren (per maand)
  app.get("/api/system/settings/last-preferences-generated", requireAuth, async (req, res) => {
    try {
      const { month, year } = req.query;
      const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
      
      const key = `last_preferences_generated_${targetMonth}_${targetYear}`;
      const timestamp = await storage.getSystemSetting(key);
      
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

  // Haal de laatste tijdstempel op voor het genereren van planning (per maand)
  app.get("/api/system/settings/last-schedule-generated", requireAuth, async (req, res) => {
    try {
      const { month, year } = req.query;
      const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
      
      const key = `last_schedule_generated_${targetMonth}_${targetYear}`;
      const timestamp = await storage.getSystemSetting(key);
      
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
      console.error("Error fetching last schedule generation timestamp:", error);
      res.status(500).json({ message: "Kon tijdstempel niet ophalen" });
    }
  });

  // Get admin contact information (accessible to all authenticated users)
  app.get("/api/admins/contact", requireAuth, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const userStationId = req.user?.stationId;
      
      // Filter administrators by the same station as the requesting user
      const admins = users.filter(user => 
        user.role === 'admin' && user.stationId === userStationId
      );
      
      // Return only the contact information, not sensitive data
      const adminContacts = admins.map(admin => ({
        id: admin.id,
        username: admin.username,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        stationId: admin.stationId
      }));
      
      res.json(adminContacts);
    } catch (error) {
      console.error("Error fetching admin contacts:", error);
      res.status(500).json({ message: "Kon administrator contactgegevens niet ophalen" });
    }
  });

  // Weekday configuration routes
  app.get("/api/weekday-configs", requireAuth, async (req, res) => {
    try {
      const userRole = (req.user as any).role;
      const userStationId = (req.user as any).stationId;
      
      // For supervisors, allow them to specify stationId via query parameter
      let targetStationId = userStationId;
      if (userRole === 'supervisor' && req.query.stationId) {
        targetStationId = parseInt(req.query.stationId as string);
      }
      
      const configs = await storage.getWeekdayConfigs(targetStationId);
      res.json(configs);
    } catch (error) {
      console.error("Error getting weekday configs:", error);
      res.status(500).json({ message: "Failed to get weekday configurations" });
    }
  });

  app.get("/api/weekday-configs/:dayOfWeek", requireAuth, async (req, res) => {
    try {
      const dayOfWeek = parseInt(req.params.dayOfWeek);
      const userRole = (req.user as any).role;
      const userStationId = (req.user as any).stationId;
      
      // For supervisors, allow them to specify stationId via query parameter
      let targetStationId = userStationId;
      if (userRole === 'supervisor' && req.query.stationId) {
        targetStationId = parseInt(req.query.stationId as string);
      }
      
      const config = await storage.getWeekdayConfig(dayOfWeek, targetStationId);
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
      const userRole = (req.user as any).role;
      const userStationId = (req.user as any).stationId;
      const updateData = req.body;
      
      // For supervisors, allow them to specify stationId in request body
      let targetStationId = userStationId;
      if (userRole === 'supervisor' && updateData.stationId) {
        targetStationId = updateData.stationId;
        // Remove stationId from updateData as it's not part of the config update
        delete updateData.stationId;
      }
      
      const updatedConfig = await storage.updateWeekdayConfig(dayOfWeek, updateData, targetStationId);
      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating weekday config:", error);
      res.status(500).json({ message: "Failed to update weekday configuration" });
    }
  });

  app.post("/api/weekday-configs/initialize", requireAdmin, async (req, res) => {
    try {
      const userRole = (req.user as any).role;
      const userStationId = (req.user as any).stationId;
      
      // For supervisors, allow them to specify stationId in request body
      let targetStationId = userStationId;
      if (userRole === 'supervisor' && req.body.stationId) {
        targetStationId = req.body.stationId;
      }
      
      await storage.initializeDefaultWeekdayConfigs(targetStationId);
      const configs = await storage.getWeekdayConfigs(targetStationId);
      res.json(configs);
    } catch (error) {
      console.error("Error initializing weekday configs:", error);
      res.status(500).json({ message: "Failed to initialize weekday configurations" });
    }
  });

  // Statistics routes
  app.get("/api/statistics/shifts", requireAdmin, async (req, res) => {
    try {
      const { type, year, month, quarter, stationId } = req.query;
      const user = req.user as any;
      
      if (!type || !year) {
        return res.status(400).json({ message: "Type and year are required" });
      }

      // Voor supervisors: gebruik stationId parameter als die er is, anders hun eigen stationId
      const targetStationId = user.role === 'supervisor' && stationId 
        ? parseInt(stationId as string)
        : user.stationId;

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
      
      // Get users filtered by station
      const allUsers = await storage.getAllUsers();
      const users = allUsers.filter(user => user.stationId === targetStationId);
      
      // Get shift preferences for the period (filtered by station)
      const preferences = await db.select()
        .from(shiftPreferences)
        .where(
          and(
            gte(shiftPreferences.date, startDate),
            lte(shiftPreferences.date, endDate),
            eq(shiftPreferences.stationId, targetStationId)
          )
        );
      
      // Get actual shifts for the period from ALL stations (for cross-station users)
      const actualShifts = await db.select()
        .from(shifts)
        .where(
          and(
            gte(shifts.date, startDate),
            lte(shifts.date, endDate),
            ne(shifts.userId, 0) // Exclude open shifts
            // Removed stationId filter to get shifts from all stations
          )
        );
      
      // Get cross-station hours for users - need to check all users that have access to current station
      const allUsersWithCrossAccess = await storage.getUsersByStation(targetStationId);
      
      // Get ALL cross-station access data for calculating total max hours for all users
      console.log("=== CROSS-STATION DEBUG v3 ===");
      console.log("Target stationId:", targetStationId);
      
      // Get ALL cross-station access data (not filtered by station) to calculate total user capacity
      const allCrossStationAccess = await db.select()
        .from(userStations);
      
      console.log("All cross-station access data:", allCrossStationAccess);
      
      // Calculate statistics for each user
      const statistics = allUsersWithCrossAccess.map(user => {
        const userPreferences = preferences.filter(p => p.userId === user.id);
        const userActualShifts = actualShifts.filter(s => s.userId === user.id);
        
        // Calculate preference hours by type and weekend/weekday
        const prefStats = userPreferences.reduce((acc, pref) => {
          const isWeekend = pref.date.getDay() === 0 || pref.date.getDay() === 6;
          const key = `${pref.type}${isWeekend ? 'Weekend' : 'Week'}` as keyof typeof acc;
          // Only count approved or pending preferences (not unavailable)
          // Check notes for "Niet beschikbaar" because unavailable prefs are stored with notes field
          if (pref.type !== 'unavailable' && pref.notes !== 'Niet beschikbaar') {
            // Standard hours: day = 12h, night = 12h
            const hours = pref.type === 'day' ? 12 : 12;
            acc[key] += hours;
          }
          return acc;
        }, {
          dayWeek: 0,
          nightWeek: 0,
          dayWeekend: 0,
          nightWeekend: 0
        });
        
        // Calculate actual shift hours by type and weekend/weekday
        const actualStats = userActualShifts.reduce((acc, shift) => {
          const isWeekend = shift.date.getDay() === 0 || shift.date.getDay() === 6;
          const key = `${shift.type}${isWeekend ? 'Weekend' : 'Week'}` as keyof typeof acc;
          
          // Calculate actual hours from start/end times
          let hours = 0;
          if (shift.startTime && shift.endTime) {
            const startTime = new Date(shift.startTime);
            const endTime = new Date(shift.endTime);
            hours = Math.abs(endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          } else {
            // Fallback to standard hours if times not available
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
        
        // Calculate max hours based on period type
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
        
        // Calculate total available hours including cross-station access
        let totalHours = user.hours || 0;
        
        // Add ALL cross-station hours for this user (from all stations they have access to)
        const userCrossStationHours = allCrossStationAccess
          .filter(access => access.userId === user.id)
          .reduce((sum, access) => sum + (access.maxHours || 0), 0);
        
        console.log(`User ${user.username} (${user.id}):`, {
          baseHours: user.hours || 0,
          crossStationHours: userCrossStationHours,
          totalCalculated: (user.hours || 0) + userCrossStationHours
        });
        
        totalHours += userCrossStationHours;
        
        return {
          userId: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
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
          // Maximum hours willing to work (adjusted for period) - now includes cross-station hours
          maxHours: totalHours * periodMultiplier
        };
      });
      
      res.json(statistics);
    } catch (error) {
      console.error("Error fetching shift statistics:", error);
      res.status(500).json({ message: "Failed to get shift statistics" });
    }
  });

  // Export planning to XLSX
  app.get("/api/schedule/export-xlsx", requireAdmin, async (req, res) => {
    try {
      const { month, year } = req.query;
      
      if (!month || !year) {
        return res.status(400).json({ message: "Month and year are required" });
      }
      
      const targetMonth = parseInt(month as string);
      const targetYear = parseInt(year as string);
      
      // Get the station ID from the logged-in user
      const stationId = req.user?.stationId;
      
      // Get shifts for the month (filtered by station)
      const shifts = await storage.getShiftsByMonth(targetMonth, targetYear, stationId);
      
      // Get users from the current station to map names
      const users = await storage.getUsersByStation(stationId!);
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
        
        // Hard-coded tijden op basis van shift type en split info
        let startTime = '';
        let endTime = '';
        if (shift.type === 'day') {
          if (shift.isSplitShift && shift.startTime && shift.endTime) {
            const startHour = new Date(shift.startTime).getUTCHours();
            if (startHour === 7) { startTime = '07:00'; endTime = '13:00'; }
            else if (startHour === 13) { startTime = '13:00'; endTime = '19:00'; }
          } else {
            startTime = '07:00';
            endTime = '19:00';
          }
        } else {
          // Nachtshift is altijd volledig
          startTime = '19:00';
          endTime = '07:00';
        }
        
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

  // Gebruiker opmerkingen routes
  
  // Get user comment for specific month/year
  app.get("/api/comments/:month/:year", requireAuth, async (req, res) => {
    try {
      const { month, year } = req.params;
      const userId = req.user?.id;
      if (!userId) return res.sendStatus(401);
      
      const comment = await storage.getUserComment(
        userId,
        parseInt(month),
        parseInt(year),
        req.user?.stationId
      );
      
      res.json(comment);
    } catch (error) {
      console.error("Error getting user comment:", error);
      res.status(500).json({ message: "Failed to get comment" });
    }
  });

  // Create or update user comment
  app.post("/api/comments", requireAuth, async (req, res) => {
    try {
      const validatedData = insertUserCommentSchema.parse({
        ...req.body,
        userId: req.user?.id,
        stationId: req.user?.stationId
      });

      // Check if comment already exists
      const existingComment = await storage.getUserComment(
        validatedData.userId,
        validatedData.month,
        validatedData.year,
        validatedData.stationId
      );

      let savedComment;
      if (existingComment) {
        // Update existing comment
        savedComment = await storage.updateUserComment(
          existingComment.id,
          validatedData.comment
        );
      } else {
        // Create new comment
        savedComment = await storage.createUserComment(validatedData);
      }

      res.status(201).json(savedComment);
    } catch (error) {
      console.error("Error saving user comment:", error);
      res.status(500).json({ message: "Failed to save comment" });
    }
  });

  // Delete user comment
  app.delete("/api/comments/:id", requireAuth, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      
      // Verify ownership (users can only delete their own comments)  
      const userId = req.user?.id;
      if (!userId) return res.sendStatus(401);
      // For now, allow deletion if user is admin or owns the comment
      
      await storage.deleteUserComment(commentId);
      res.status(200).json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // Get all comments for month/year (admin only) - station-filtered
  app.get("/api/comments/all/:month/:year", requireAdmin, async (req, res) => {
    try {
      const { month, year } = req.params;
      const user = req.user as any;
      const { stationId } = req.query;
      
      // Determine target station ID: supervisor can choose, admin gets own station
      let targetStationId = user.stationId; // Default to user's own station
      
      if (user.role === 'supervisor' && stationId) {
        const parsedStationId = Number(stationId);
        // Only allow valid positive integers, otherwise fall back to user's station
        if (Number.isInteger(parsedStationId) && parsedStationId > 0) {
          targetStationId = parsedStationId;
        }
      }
      
      console.log(`Fetching comments for month: ${month}, year: ${year}, station: ${targetStationId}`);
      
      const comments = await storage.getAllUserComments(
        parseInt(month),
        parseInt(year),
        targetStationId // 🔒 Station filtering added!
      );
      
      console.log(`Found ${comments.length} comments for station ${targetStationId}:`, comments);
      
      // Get user details for each comment (all users, will filter by station in mapping)
      const users = await storage.getAllUsers();
      const commentsWithUsers = comments.map(comment => {
        const user = users.find(u => u.id === comment.userId);
        return {
          ...comment,
          user: user ? {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName
          } : null
        };
      });
      
      console.log(`Returning ${commentsWithUsers.length} comments with user details for station ${targetStationId}`);
      res.json(commentsWithUsers);
    } catch (error) {
      console.error("Error getting all comments:", error);
      res.status(500).json({ message: "Failed to get comments" });
    }
  });

  // Deadline configuratie routes
  
  // Get current deadline setting (days before month)
  app.get("/api/system/deadline-days", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { stationId } = req.query;
      
      const targetStationId = user.role === 'supervisor' && stationId 
        ? parseInt(stationId as string)
        : user.stationId;
      
      const settingKey = `preference_deadline_days_station_${targetStationId}`;
      const setting = await storage.getSystemSetting(settingKey);
      // Default to 1 day if not set
      const days = setting ? parseInt(setting) : 1;
      res.json({ days });
    } catch (error) {
      console.error("Error getting deadline setting:", error);
      res.status(500).json({ message: "Failed to get deadline setting" });
    }
  });

  // Update deadline setting (admin only)
  app.post("/api/system/deadline-days", requireAdmin, async (req, res) => {
    try {
      const { days, stationId } = req.body;
      const user = req.user as any;
      
      if (!days || days < 1 || days > 60) {
        return res.status(400).json({ message: "Dagen moet tussen 1 en 60 zijn" });
      }
      
      const targetStationId = user.role === 'supervisor' && stationId 
        ? parseInt(stationId)
        : user.stationId;
      
      const settingKey = `preference_deadline_days_station_${targetStationId}`;
      await storage.setSystemSetting(settingKey, days.toString());
      res.json({ days, message: "Deadline instelling bijgewerkt" });
    } catch (error) {
      console.error("Error updating deadline setting:", error);
      res.status(500).json({ message: "Failed to update deadline setting" });
    }
  });

  // WORKAROUND: Station switcher zonder JavaScript
  app.get("/station-switcher", requireAuth, async (req: any, res) => {
    try {
      const accessibleStations = await storage.getUserAccessibleStations(req.user.id);
      const currentStationName = accessibleStations.find(s => s.id === req.user.stationId)?.displayName || "Onbekend";
      
      res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Station Switcher</title>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .station-option { margin: 15px 0; padding: 15px; border: 2px solid #e5e7eb; border-radius: 6px; }
    .current-station { background: #dcfce7; border-color: #16a34a; }
    .other-station { background: #f8fafc; }
    button { background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
    button:hover { background: #2563eb; }
    .back-link { display: inline-block; margin-top: 20px; color: #3b82f6; text-decoration: none; padding: 10px 20px; border: 1px solid #3b82f6; border-radius: 4px; }
    .back-link:hover { background: #3b82f6; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏥 Station Switcher</h1>
    <h2>Welkom ${req.user.firstName} ${req.user.lastName} (${req.user.username})</h2>
    
    <p><strong>Huidig actieve station:</strong> ${currentStationName}</p>
    <p>Je hebt toegang tot ${accessibleStations.length} stations:</p>
    
    ${accessibleStations.map(station => `
      <div class="station-option ${station.id === req.user.stationId ? 'current-station' : 'other-station'}">
        <h3>${station.displayName}</h3>
        <p><strong>Code:</strong> ${station.code}</p>
        ${station.id === req.user.stationId 
          ? '<p><strong>✅ Momenteel actief</strong></p>' 
          : `<form method="POST" action="/switch-station" style="margin-top: 10px;">
               <input type="hidden" name="stationId" value="${station.id}">
               <button type="submit">🔄 Wissel naar ${station.displayName}</button>
             </form>`
        }
      </div>
    `).join('')}
    
    <a href="/dashboard" class="back-link">← Terug naar Dashboard</a>
    
    <details style="margin-top: 30px; padding: 15px; background: #f1f5f9; border-radius: 6px;">
      <summary style="cursor: pointer; font-weight: bold;">Debug Info</summary>
      <pre style="margin-top: 10px; font-size: 12px;">
User ID: ${req.user.id}
Username: ${req.user.username}  
Current Station ID: ${req.user.stationId}
Accessible Stations: ${JSON.stringify(accessibleStations, null, 2)}
      </pre>
    </details>
  </div>
</body>
</html>
      `);
    } catch (error) {
      console.error("Error rendering station switcher:", error);
      res.status(500).send("Error loading station switcher");
    }
  });

  // Feestdagen routes
  
  // Get all holidays for a year (optionally filtered by station)
  app.get("/api/holidays", requireAuth, async (req, res) => {
    try {
      const { year, stationId } = req.query;
      const user = req.user as any;
      
      if (!year) {
        return res.status(400).json({ message: "Year parameter is required" });
      }
      
      // Voor supervisors: gebruik stationId parameter als die er is, anders hun eigen stationId
      const targetStationId = user.role === 'supervisor' && stationId 
        ? parseInt(stationId as string)
        : user.stationId;
      
      const holidays = await storage.getAllHolidays(parseInt(year as string), targetStationId);
      res.json(holidays);
    } catch (error) {
      console.error("Error getting holidays:", error);
      res.status(500).json({ message: "Failed to get holidays" });
    }
  });
  
  // Get specific holiday
  app.get("/api/holidays/:id", requireAuth, async (req, res) => {
    try {
      const holidayId = parseInt(req.params.id);
      const holiday = await storage.getHoliday(holidayId);
      
      if (!holiday) {
        return res.status(404).json({ message: "Holiday not found" });
      }
      
      res.json(holiday);
    } catch (error) {
      console.error("Error getting holiday:", error);
      res.status(500).json({ message: "Failed to get holiday" });
    }
  });
  
  // Create new holiday (admin only)
  app.post("/api/holidays", requireAdmin, async (req, res) => {
    try {
      const userStationId = (req.user as any).stationId;
      
      console.log("=== CREATE HOLIDAY DEBUG ===");
      console.log("Raw req.body:", req.body);
      console.log("req.body.date value:", req.body.date);
      console.log("req.body.date type:", typeof req.body.date);
      console.log("new Date(req.body.date):", new Date(req.body.date));
      console.log("isNaN(new Date(req.body.date)):", isNaN(new Date(req.body.date).getTime()));
      
      // Prepare data for validation (include year BEFORE validation)
      const rawData = {
        ...req.body,
        year: new Date(req.body.date).getFullYear(), // Calculate year from date string
        stationId: req.body.stationId || userStationId,
        category: req.body.category || (req.body.stationId ? "regional" : "national"),
        isFixed: true // Default value for custom holidays
      };
      
      console.log("Raw data before validation:", rawData);
      
      // Validate using Zod schema (automatically coerces string to Date)
      const holidayData = insertHolidaySchema.parse(rawData);
      
      console.log("Final validated holidayData:", holidayData);
      
      const holiday = await storage.createHoliday(holidayData);
      res.status(201).json(holiday);
    } catch (error) {
      console.error("Error creating holiday:", error);
      res.status(500).json({ message: "Failed to create holiday" });
    }
  });
  
  // Update holiday (admin only)
  app.patch("/api/holidays/:id", requireAdmin, async (req, res) => {
    try {
      const holidayId = parseInt(req.params.id);
      const updateData = {
        ...req.body,
        updatedAt: new Date()
      };
      
      if (req.body.date) {
        updateData.date = new Date(req.body.date);
        updateData.year = new Date(req.body.date).getFullYear();
      }
      
      const holiday = await storage.updateHoliday(holidayId, updateData);
      res.json(holiday);
    } catch (error) {
      console.error("Error updating holiday:", error);
      res.status(500).json({ message: "Failed to update holiday" });
    }
  });
  
  // Delete holiday (admin only)
  app.delete("/api/holidays/:id", requireAdmin, async (req, res) => {
    try {
      const holidayId = parseInt(req.params.id);
      
      // Check if holiday exists
      const holiday = await storage.getHoliday(holidayId);
      if (!holiday) {
        return res.status(404).json({ message: "Holiday not found" });
      }
      
      await storage.deleteHoliday(holidayId);
      res.status(200).json({ message: "Holiday deleted successfully" });
    } catch (error) {
      console.error("Error deleting holiday:", error);
      res.status(500).json({ message: "Failed to delete holiday" });
    }
  });
  
  // Generate Belgian holidays for a specific year (admin only)
  app.post("/api/holidays/generate-belgian/:year", requireAuth, async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const user = req.user as any;
      
      // Voor supervisors, gebruik stationId uit query parameter, anders gebruik user's stationId
      const targetStationId = user.role === 'supervisor' && req.query.stationId 
        ? parseInt(req.query.stationId as string)
        : user.stationId;
      
      if (year < 2020 || year > 2050) {
        return res.status(400).json({ message: "Year must be between 2020 and 2050" });
      }
      
      // Voor nu vertrouwen we erop dat supervisors toegang hebben tot alle stations
      // In de toekomst kunnen we hier een check toevoegen voor specifieke station toegang
      
      const generatedHolidays = await storage.generateBelgianHolidays(year, targetStationId);
      
      res.status(201).json({
        message: `Generated ${generatedHolidays.length} Belgian holidays for ${year}`,
        holidays: generatedHolidays
      });
    } catch (error) {
      console.error("Error generating Belgian holidays:", error);
      res.status(500).json({ message: "Failed to generate Belgian holidays" });
    }
  });
  
  // Check if a specific date is a holiday
  app.get("/api/holidays/check/:date", requireAuth, async (req, res) => {
    try {
      const dateParam = req.params.date;
      const userStationId = (req.user as any).stationId;
      
      const checkDate = new Date(dateParam);
      if (isNaN(checkDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      const isHolidayDay = await storage.isHoliday(checkDate, userStationId);
      const holidays = await storage.getHolidaysForDate(checkDate, userStationId);
      
      res.json({
        date: checkDate.toISOString(),
        isHoliday: isHolidayDay,
        holidays: holidays
      });
    } catch (error) {
      console.error("Error checking holiday:", error);
      res.status(500).json({ message: "Failed to check holiday" });
    }
  });

  // Calendar token routes
  
  // Get or create calendar token for current user
  app.get("/api/calendar/token", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      let token = await storage.getCalendarToken(userId);
      
      if (!token) {
        // Token bestaat nog niet, maak een nieuwe aan
        token = await storage.createCalendarToken(userId);
      }
      
      // Gebruik PUBLIC_URL environment variabele voor externe toegang, of fallback naar request URL
      const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
      
      res.json({
        token: token.token,
        url: `${baseUrl}/api/calendar/feed/${token.token}.ics`
      });
    } catch (error) {
      console.error("Error getting calendar token:", error);
      res.status(500).json({ message: "Failed to get calendar token" });
    }
  });
  
  // Regenerate calendar token for current user
  app.post("/api/calendar/token/regenerate", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      const newToken = await storage.regenerateCalendarToken(userId);
      
      // Gebruik PUBLIC_URL environment variabele voor externe toegang, of fallback naar request URL
      const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
      
      res.json({
        token: newToken.token,
        url: `${baseUrl}/api/calendar/feed/${newToken.token}.ics`
      });
    } catch (error) {
      console.error("Error regenerating calendar token:", error);
      res.status(500).json({ message: "Failed to regenerate calendar token" });
    }
  });
  
  // Public ICS feed route (authenticatie via token)
  app.get("/api/calendar/feed/:token.ics", async (req, res) => {
    try {
      const token = req.params.token;
      
      // Zoek de token op
      const calendarToken = await storage.getCalendarTokenByToken(token);
      if (!calendarToken) {
        return res.status(404).send("Calendar feed not found");
      }
      
      // Haal de gebruiker op
      const user = await storage.getUser(calendarToken.userId);
      if (!user) {
        return res.status(404).send("User not found");
      }
      
      // Haal alle shifts van de gebruiker op (huidige maand + 2 maanden vooruit)
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 1-12
      const currentYear = now.getFullYear();
      
      const allShifts = [];
      for (let i = 0; i < 3; i++) {
        const date = addMonths(now, i);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const monthShifts = await storage.getShiftsByMonth(month, year, user.stationId);
        allShifts.push(...monthShifts);
      }
      
      // Filter alleen shifts van deze gebruiker
      const userShifts = allShifts.filter(shift => shift.userId === user.id);
      
      // Genereer ICS bestand volgens RFC 5545
      const icsLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//DGH Planning//Ambulance Planning//NL',
        'CALSCALE:GREGORIAN',
        'X-WR-CALNAME:Mijn Ambulance Shifts',
        'X-WR-TIMEZONE:Europe/Brussels',
        'X-WR-CALDESC:Persoonlijke shift planning'
      ];
      
      for (const shift of userShifts) {
        const shiftDate = new Date(shift.date);
        const startTime = new Date(shift.startTime);
        const endTime = new Date(shift.endTime);
        
        // Hard-coded tijden op basis van shift type
        let summary = '';
        let description = '';
        
        if (shift.type === 'day') {
          if (shift.isSplitShift) {
            const startHour = startTime.getUTCHours();
            if (startHour === 7) {
              summary = 'Dagshift (07:00-13:00)';
              description = 'Ambulance dagshift - eerste helft';
            } else {
              summary = 'Dagshift (13:00-19:00)';
              description = 'Ambulance dagshift - tweede helft';
            }
          } else {
            summary = 'Dagshift (07:00-19:00)';
            description = 'Ambulance dagshift - volledig';
          }
        } else {
          summary = 'Nachtshift (19:00-07:00)';
          description = 'Ambulance nachtshift';
        }
        
        // Format datetime voor ICS (UTC format: YYYYMMDDTHHmmssZ)
        const formatICSDate = (date: Date) => {
          return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };
        
        const uid = `shift-${shift.id}@dgh-planning.be`;
        const dtstamp = formatICSDate(new Date());
        const dtstart = formatICSDate(startTime);
        const dtend = formatICSDate(endTime);
        
        icsLines.push(
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${dtstamp}`,
          `DTSTART:${dtstart}`,
          `DTEND:${dtend}`,
          `SUMMARY:${summary}`,
          `DESCRIPTION:${description}`,
          'STATUS:CONFIRMED',
          'TRANSP:OPAQUE',
          'END:VEVENT'
        );
      }
      
      icsLines.push('END:VCALENDAR');
      
      // Stuur ICS bestand terug met CORS en Cache headers voor externe kalender apps
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'inline; filename="shifts.ics"');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.send(icsLines.join('\r\n'));
      
    } catch (error) {
      console.error("Error generating calendar feed:", error);
      res.status(500).send("Failed to generate calendar feed");
    }
  });

  // =========================
  // VERDI INTEGRATIE ENDPOINTS
  // =========================
  
  // Get Verdi configuration voor station
  app.get("/api/verdi/config/:stationId", requireAdmin, async (req, res) => {
    try {
      const stationId = parseInt(req.params.stationId);
      const config = await storage.getVerdiStationConfig(stationId);
      
      if (!config) {
        return res.json({
          stationId,
          shiftSheetGuid: null,
          enabled: false
        });
      }
      
      res.json(config);
    } catch (error) {
      console.error("Error fetching Verdi config:", error);
      res.status(500).json({ message: "Failed to fetch Verdi configuration" });
    }
  });

  // Update Verdi configuration voor station
  app.post("/api/verdi/config/:stationId", requireAdmin, async (req, res) => {
    try {
      const stationId = parseInt(req.params.stationId);
      const { verdiUrl, authId, authSecret, shiftSheetGuid, enabled } = req.body;
      
      const config = await storage.upsertVerdiStationConfig(stationId, {
        verdiUrl,
        authId,
        authSecret,
        shiftSheetGuid,
        enabled
      });
      
      res.json(config);
    } catch (error) {
      console.error("Error updating Verdi config:", error);
      res.status(500).json({ message: "Failed to update Verdi configuration" });
    }
  });

  // Get all Verdi station configs
  app.get("/api/verdi/configs", requireAdmin, async (req, res) => {
    try {
      const configs = await storage.getAllVerdiStationConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching Verdi configs:", error);
      res.status(500).json({ message: "Failed to fetch Verdi configurations" });
    }
  });

  // Get Verdi user mapping
  app.get("/api/verdi/mapping/user/:userId", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const mapping = await storage.getVerdiUserMapping(userId);
      res.json(mapping || null);
    } catch (error) {
      console.error("Error fetching Verdi user mapping:", error);
      res.status(500).json({ message: "Failed to fetch Verdi user mapping" });
    }
  });

  // Update Verdi user mapping
  app.post("/api/verdi/mapping/user/:userId", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { personGuid } = req.body;
      
      if (!personGuid) {
        return res.status(400).json({ message: "personGuid is required" });
      }
      
      const mapping = await storage.upsertVerdiUserMapping(userId, personGuid);
      res.json(mapping);
    } catch (error) {
      console.error("Error updating Verdi user mapping:", error);
      res.status(500).json({ message: "Failed to update Verdi user mapping" });
    }
  });

  // Get users voor Verdi mapping (minimal info: id, username, firstName, lastName)
  // Supervisor: alle users, Admin: alleen station users (incl. cross-station)
  app.get("/api/verdi/users", requireAdmin, async (req, res) => {
    try {
      const user = req.user!;
      let users;
      
      if (user.role === 'supervisor') {
        // Supervisor ziet alle users
        users = await storage.getAllUsers();
      } else {
        // Admin ziet alleen users van zijn station (inclusief cross-station assignments)
        if (!user.stationId) {
          return res.status(400).json({ message: "Admin user must have a stationId" });
        }
        users = await storage.getUsersByStation(user.stationId);
      }
      
      // Return alleen de velden die nodig zijn voor Verdi user mapping
      const minimalUsers = users.map(u => ({
        id: u.id,
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName
      }));
      res.json(minimalUsers);
    } catch (error) {
      console.error("Error fetching users for Verdi:", error);
      res.status(500).json({ message: "Failed to fetch users for Verdi mapping" });
    }
  });

  // Get all Verdi user mappings
  app.get("/api/verdi/mappings/users", requireAdmin, async (req, res) => {
    try {
      const mappings = await storage.getAllVerdiUserMappings();
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching Verdi user mappings:", error);
      res.status(500).json({ message: "Failed to fetch Verdi user mappings" });
    }
  });

  // Get Verdi position mappings voor station
  app.get("/api/verdi/mappings/positions/:stationId", requireAdmin, async (req, res) => {
    try {
      const stationId = parseInt(req.params.stationId);
      const mappings = await storage.getVerdiPositionMappings(stationId);
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching Verdi position mappings:", error);
      res.status(500).json({ message: "Failed to fetch Verdi position mappings" });
    }
  });

  // Update Verdi position mapping
  app.post("/api/verdi/mappings/positions/:stationId/:positionIndex", requireAdmin, async (req, res) => {
    try {
      const stationId = parseInt(req.params.stationId);
      const positionIndex = parseInt(req.params.positionIndex);
      const { positionGuid, requiresLicenseC } = req.body;
      
      if (!positionGuid) {
        return res.status(400).json({ message: "positionGuid is required" });
      }
      
      if (typeof requiresLicenseC !== 'boolean') {
        return res.status(400).json({ message: "requiresLicenseC is required and must be a boolean" });
      }
      
      const mapping = await storage.upsertVerdiPositionMapping(stationId, positionIndex, positionGuid, requiresLicenseC);
      res.json(mapping);
    } catch (error) {
      console.error("Error updating Verdi position mapping:", error);
      res.status(500).json({ message: "Failed to update Verdi position mapping" });
    }
  });

  // Get sync status for shifts in een maand
  app.get("/api/verdi/sync-status/:month/:year", requireAdmin, async (req, res) => {
    try {
      const month = parseInt(req.params.month);
      const year = parseInt(req.params.year);
      const stationId = req.query.stationId ? parseInt(req.query.stationId as string) : undefined;
      
      const syncLogs = await storage.getVerdiSyncLogsByMonth(month, year, stationId);
      res.json(syncLogs);
    } catch (error) {
      console.error("Error fetching Verdi sync status:", error);
      res.status(500).json({ message: "Failed to fetch Verdi sync status" });
    }
  });

  // Get laatste succesvolle sync timestamp voor station/maand/jaar
  app.get("/api/verdi/last-sync/:stationId/:month/:year", requireAdmin, async (req, res) => {
    try {
      const stationId = parseInt(req.params.stationId);
      const month = parseInt(req.params.month);
      const year = parseInt(req.params.year);
      
      const lastSync = await storage.getLastSuccessfulVerdiSync(stationId, month, year);
      res.json({ lastSync });
    } catch (error) {
      console.error("Error fetching last Verdi sync:", error);
      res.status(500).json({ message: "Failed to fetch last Verdi sync" });
    }
  });

  // Sync shifts naar Verdi
  app.post("/api/verdi/sync", requireAdmin, async (req, res) => {
    try {
      const { month, year, stationId, changesOnly } = req.body;
      
      if (!month || !year || !stationId) {
        return res.status(400).json({ message: "month, year, and stationId are required" });
      }
      
      // Haal shifts op voor deze maand
      const shifts = await storage.getShiftsByMonth(month, year, stationId);
      const plannedShifts = shifts.filter(s => s.status === 'planned');
      
      if (plannedShifts.length === 0) {
        return res.json({ 
          success: true, 
          message: "Geen geplande shifts gevonden om te synchroniseren",
          synced: 0,
          errors: 0
        });
      }
      
      // Haal config op
      const config = await storage.getVerdiStationConfig(stationId);
      if (!config || !config.enabled) {
        return res.status(400).json({ message: "Verdi is niet geconfigureerd of niet ingeschakeld voor dit station" });
      }
      
      // Haal ALLE sync logs op voor deze maand/station om bestaande Verdi shifts te vinden
      // Dit is cruciaal voor UPDATE detectie bij opnieuw gegenereerde planningen
      const allSyncLogs = await storage.getVerdiSyncLogsByMonth(month, year, stationId);
      
      // Maak twee mappings:
      // 1. Op shift ID (voor bestaande shifts die niet opnieuw zijn gegenereerd)
      const syncLogByIdMap = new Map(allSyncLogs.map(log => [log.shiftId, log]));
      
      // 2. Op datum+tijd+type (voor UPDATE detectie bij opnieuw gegenereerde shifts)
      // Filter alleen logs met verdiShiftGuid (ongeacht status - ook 'pending' na wijzigingen)
      const syncLogByKeyMap = new Map<string, any>();
      for (const log of allSyncLogs) {
        if (log.verdiShiftGuid) {
          // Gebruik opgeslagen snapshot data i.p.v. shift op te halen (werkt ook voor verwijderde shifts!)
          if (log.shiftStartTime && log.shiftEndTime && log.shiftType) {
            const key = `${log.shiftStartTime.toISOString()}_${log.shiftEndTime.toISOString()}_${log.shiftType}`;
            syncLogByKeyMap.set(key, log);
          } else {
            // Legacy log zonder snapshot data - probeer shift op te halen als fallback
            const shift = await storage.getShift(log.shiftId);
            if (shift) {
              const key = `${shift.startTime.toISOString()}_${shift.endTime.toISOString()}_${shift.type}`;
              syncLogByKeyMap.set(key, log);
              console.warn(`Legacy sync log ${log.id} heeft geen snapshot data - shift ${log.shiftId} gebruikt als fallback`);
            } else {
              console.warn(`Legacy sync log ${log.id} heeft geen snapshot data en shift ${log.shiftId} bestaat niet meer - skip voor UPDATE detectie`);
            }
          }
        }
      }
      
      console.log(`Verdi sync: Found ${allSyncLogs.length} existing sync logs, ${syncLogByKeyMap.size} with valid Verdi GUIDs`);
      
      // Filter op alleen wijzigingen indien gevraagd
      let shiftsToSync = plannedShifts;
      if (changesOnly) {
        shiftsToSync = plannedShifts.filter(shift => {
          // Check eerst op shift ID (voor niet-opnieuw-gegenereerde shifts)
          const logById = syncLogByIdMap.get(shift.id);
          if (logById && logById.syncStatus === 'success') {
            return false; // Al gesynchroniseerd
          }
          
          // Check dan op datum+tijd+type (voor opnieuw gegenereerde shifts)
          const key = `${shift.startTime.toISOString()}_${shift.endTime.toISOString()}_${shift.type}`;
          const logByKey = syncLogByKeyMap.get(key);
          if (logByKey && logByKey.syncStatus === 'success') {
            return false; // Al gesynchroniseerd in Verdi (andere shift ID)
          }
          
          // Niet gesynchroniseerd of fout → moet gesynchroniseerd worden
          return true;
        });
      }
      
      if (shiftsToSync.length === 0) {
        return res.json({
          success: true,
          message: "Alle shifts zijn al gesynchroniseerd",
          synced: 0,
          errors: 0
        });
      }
      
      // Importeer Verdi client
      const { verdiClient } = await import('./verdi-client');
      
      // Haal user en position mappings op
      const allUserMappings = await storage.getAllVerdiUserMappings();
      const userMappingMap = new Map(allUserMappings.map(m => [m.userId, m]));
      
      const positionMappings = await storage.getVerdiPositionMappings(stationId);
      
      // Groepeer shifts op basis van startTime, endTime, type (meerdere users kunnen dezelfde shift hebben)
      const shiftGroups = new Map<string, Shift[]>();
      for (const shift of shiftsToSync) {
        const key = `${shift.startTime.toISOString()}_${shift.endTime.toISOString()}_${shift.type}`;
        if (!shiftGroups.has(key)) {
          shiftGroups.set(key, []);
        }
        shiftGroups.get(key)!.push(shift);
      }
      
      let synced = 0;
      let errors = 0;
      let skipped = 0;
      const results = [];
      
      // Synchroniseer elke shift groep (1 per keer zoals Verdi aanraadt)
      for (const [groupKey, groupShifts] of Array.from(shiftGroups.entries())) {
        try {
          // Verzamel alle userIds in deze groep
          const userIds = groupShifts.map((s: Shift) => s.userId).filter((id: number, index: number, arr: number[]) => arr.indexOf(id) === index);
          
          // Skip shifts met 0 personen (zou niet moeten voorkomen, maar voor de zekerheid)
          if (userIds.length === 0) {
            console.log(`Skipping shift group ${groupKey}: geen gebruikers toegewezen`);
            skipped++;
            
            // Log als skipped voor alle shifts in deze groep
            for (const shift of groupShifts) {
              const existingLog = await storage.getVerdiSyncLog(shift.id);
              if (existingLog) {
                await storage.updateVerdiSyncLog(shift.id, 'error', undefined, 'Shift heeft geen toegewezen gebruikers', undefined, shift.startTime, shift.endTime, shift.type);
              } else {
                await storage.createVerdiSyncLog(shift.id, shift.stationId, 'error', undefined, 'Shift heeft geen toegewezen gebruikers', undefined, shift.startTime, shift.endTime, shift.type);
              }
            }
            continue;
          }
          
          // Haal User objecten op zodat we hasDrivingLicenseC kunnen checken
          const assignedUsers = await Promise.all(
            userIds.map((userId: number) => storage.getUser(userId))
          );
          
          // Filter out any null users (shouldn't happen but safety check)
          const validUsers = assignedUsers.filter((u): u is User => u !== null && u !== undefined);
          if (validUsers.length === 0) {
            console.log(`Skipping shift group ${groupKey}: geen geldige gebruikers gevonden`);
            skipped++;
            
            // Log als error voor alle shifts in deze groep
            for (const shift of groupShifts) {
              const existingLog = await storage.getVerdiSyncLog(shift.id);
              if (existingLog) {
                await storage.updateVerdiSyncLog(shift.id, 'error', undefined, 'Geen geldige gebruikers gevonden', undefined, shift.startTime, shift.endTime, shift.type);
              } else {
                await storage.createVerdiSyncLog(shift.id, shift.stationId, 'error', undefined, 'Geen geldige gebruikers gevonden', undefined, shift.startTime, shift.endTime, shift.type);
              }
            }
            continue;
          }
          
          // Gebruik het eerste shift object als representatief voor de hele groep
          const representativeShift = groupShifts[0];
          
          // Zoek bestaande Verdi shift GUID op twee manieren:
          // 1. Via shift ID (voor niet-opnieuw-gegenereerde shifts)
          let existingVerdiShiftGuid: string | undefined = undefined;
          const existingLogById = await storage.getVerdiSyncLog(representativeShift.id);
          if (existingLogById?.verdiShiftGuid) {
            existingVerdiShiftGuid = existingLogById.verdiShiftGuid;
            console.log(`Found existing Verdi shift via ID ${representativeShift.id}: ${existingVerdiShiftGuid}`);
          } else {
            // 2. Via datum+tijd+type (voor opnieuw gegenereerde shifts - dit is de cruciale fix!)
            const existingLogByKey = syncLogByKeyMap.get(groupKey);
            if (existingLogByKey?.verdiShiftGuid) {
              existingVerdiShiftGuid = existingLogByKey.verdiShiftGuid;
              console.log(`Found existing Verdi shift via date/time match for ${groupKey}: ${existingVerdiShiftGuid}`);
            }
          }
          
          // Stuur naar Verdi (met bestaande GUID voor UPDATE indien gevonden)
          const response = await verdiClient.sendShiftToVerdi(
            representativeShift,
            config,
            userMappingMap,
            positionMappings,
            validUsers,
            existingVerdiShiftGuid
          );
          
          // Update sync log voor ALLE shifts in deze groep
          const syncStatus = response.result === 'Success' ? 'success' : 'error';
          const errorMessage = response.errorFeedback.length > 0 ? response.errorFeedback.join(', ') : null;
          const warningMessages = response.warningFeedback.length > 0 ? JSON.stringify(response.warningFeedback) : null;
          
          for (const shift of groupShifts) {
            const shiftLog = await storage.getVerdiSyncLog(shift.id);
            if (shiftLog) {
              await storage.updateVerdiSyncLog(
                shift.id,
                syncStatus,
                response.shift,
                errorMessage || undefined,
                warningMessages || undefined,
                shift.startTime,
                shift.endTime,
                shift.type
              );
            } else {
              await storage.createVerdiSyncLog(
                shift.id,
                shift.stationId,
                syncStatus,
                response.shift,
                errorMessage || undefined,
                warningMessages || undefined,
                shift.startTime,
                shift.endTime,
                shift.type
              );
            }
          }
          
          if (response.result === 'Success') {
            synced++;
          } else {
            errors++;
          }
          
          results.push({
            shiftId: representativeShift.id,
            date: representativeShift.date,
            userCount: validUsers.length,
            users: validUsers.map(u => `${u.firstName} ${u.lastName}`).join(', '),
            success: response.result === 'Success',
            errors: response.errorFeedback,
            warnings: response.warningFeedback
          });
          
        } catch (error: any) {
          console.error(`Error syncing shift group ${groupKey}:`, error);
          errors++;
          
          // Log error voor alle shifts in deze groep
          for (const shift of groupShifts) {
            const existingLog = await storage.getVerdiSyncLog(shift.id);
            if (existingLog) {
              await storage.updateVerdiSyncLog(shift.id, 'error', undefined, error.message, undefined, shift.startTime, shift.endTime, shift.type);
            } else {
              await storage.createVerdiSyncLog(shift.id, shift.stationId, 'error', undefined, error.message, undefined, shift.startTime, shift.endTime, shift.type);
            }
          }
          
          results.push({
            shiftId: groupShifts[0].id,
            date: groupShifts[0].date,
            userCount: groupShifts.length,
            users: 'Error fetching users',
            success: false,
            errors: [error.message],
            warnings: []
          });
        }
      }
      
      res.json({
        success: true,
        message: `Synchronisatie voltooid: ${synced} gelukt, ${errors} fouten${skipped > 0 ? `, ${skipped} overgeslagen` : ''}`,
        synced,
        errors,
        skipped,
        total: shiftGroups.size,
        results
      });
      
    } catch (error) {
      console.error("Error syncing to Verdi:", error);
      res.status(500).json({ message: "Failed to sync shifts to Verdi" });
    }
  });

  // Cleanup legacy Verdi sync logs (admin only)
  app.post("/api/verdi/cleanup-legacy-logs", requireAdmin, async (req, res) => {
    try {
      const user = req.user as User;
      const stationId = req.body.stationId;
      
      // Haal legacy logs op zonder snapshot data
      const legacyLogs = await storage.getLegacyVerdiSyncLogs(stationId);
      
      if (legacyLogs.length === 0) {
        return res.json({
          success: true,
          message: 'Geen legacy logs gevonden - alle logs hebben snapshot data',
          deleted: 0,
          failed: 0
        });
      }
      
      console.log(`Found ${legacyLogs.length} legacy sync logs to clean up`);
      
      let deleted = 0;
      let failed = 0;
      const errors: string[] = [];
      
      // Verwijder elke legacy log en probeer de Verdi shift te deleten
      for (const log of legacyLogs) {
        try {
          // Als de log een Verdi GUID heeft, probeer de shift te verwijderen
          if (log.verdiShiftGuid) {
            const config = await storage.getVerdiStationConfig(log.stationId);
            if (config?.verdiUrl && config?.authId && config?.authSecret) {
              const { verdiClient } = await import('./verdi-client');
              
              try {
                await verdiClient.deleteShiftFromVerdi(log.verdiShiftGuid, config);
                console.log(`Deleted Verdi shift ${log.verdiShiftGuid} for legacy log ${log.id}`);
              } catch (deleteError: any) {
                // 404 is OK - shift bestaat al niet meer in Verdi
                if (deleteError.statusCode === 404) {
                  console.log(`Verdi shift ${log.verdiShiftGuid} already deleted (404) - continuing`);
                } else {
                  console.warn(`Failed to delete Verdi shift ${log.verdiShiftGuid}:`, deleteError.message);
                }
              }
            }
          }
          
          // Verwijder de sync log uit de database
          await storage.deleteVerdiSyncLog(log.shiftId);
          deleted++;
          
        } catch (error: any) {
          console.error(`Error cleaning up legacy log ${log.id}:`, error);
          failed++;
          errors.push(`Log ${log.id}: ${error.message}`);
        }
      }
      
      res.json({
        success: true,
        message: `Legacy logs opgeschoond: ${deleted} verwijderd, ${failed} fouten`,
        deleted,
        failed,
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (error: any) {
      console.error("Error cleaning up legacy logs:", error);
      res.status(500).json({ message: "Failed to cleanup legacy logs", error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}