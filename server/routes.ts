import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertShiftSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Admin middleware
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
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

  // Update user password (admin only)
  app.patch("/api/users/:id/password", requireAdmin, async (req, res) => {
    try {
      const { password } = z.object({
        password: z.string().min(6)
      }).parse(req.body);

      const user = await storage.updateUserPassword(
        parseInt(req.params.id),
        password
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

  // Protected routes that require authentication
  app.use("/api/shifts", (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    next();
  });

  // Get all shifts
  app.get("/api/shifts", async (req, res) => {
    const shifts = await storage.getAllShifts();
    res.json(shifts);
  });

  // Create shift
  app.post("/api/shifts", async (req, res) => {
    try {
      const shiftData = insertShiftSchema.parse(req.body);
      const shift = await storage.createShift(shiftData);
      res.status(201).json(shift);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json(error.errors);
      } else {
        res.status(500).json({ message: "Failed to create shift" });
      }
    }
  });

  // Update user preferences
  app.patch("/api/users/:id/preferences", async (req, res) => {
    if (!req.user?.isAdmin && req.user?.id !== parseInt(req.params.id)) {
      return res.sendStatus(403);
    }

    try {
      const preferences = z.object({
        maxHours: z.number().min(0).max(168),
        preferredHours: z.number().min(0).max(168)
      }).parse(req.body);

      const user = await storage.updateUserPreferences(
        parseInt(req.params.id),
        preferences
      );
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json(error.errors);
      } else {
        res.status(500).json({ message: "Failed to update preferences" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}