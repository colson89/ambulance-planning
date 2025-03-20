import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertShiftSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

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
