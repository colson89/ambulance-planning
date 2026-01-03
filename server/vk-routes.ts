import type { Express, Request, Response, NextFunction } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { vkMembershipFeeScheduler } from "./vk-membership-fee-scheduler";
import { 
  vkAdmins, 
  vkMembershipTypes, 
  vkMembers, 
  vkActivities, 
  vkSubActivities, 
  vkPricing,
  vkActivityPricing,
  vkRegistrations, 
  vkRegistrationItems,
  vkInvitations,
  vkMembershipFeeCycles,
  vkMembershipFeeInvitations,
  insertVkAdminSchema,
  insertVkMembershipTypeSchema,
  insertVkMemberSchema,
  insertVkActivitySchema,
  insertVkSubActivitySchema,
  insertVkPricingSchema,
  insertVkRegistrationSchema,
  insertVkRegistrationItemSchema,
  insertVkMembershipFeeCycleSchema
} from "../shared/schema";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, char => htmlEscapes[char] || char);
}

declare module "express-session" {
  interface SessionData {
    vkAdminId?: number;
  }
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    if (!stored || !stored.includes(".")) {
      console.error("VK: Invalid stored password format");
      return false;
    }
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      return false;
    }
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    if (hashedBuf.length !== suppliedBuf.length) {
      return false;
    }
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("VK: Error comparing passwords:", error);
    return false;
  }
}

function requireVkAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.vkAdminId) {
    return res.status(401).json({ message: "Niet ingelogd als VK admin" });
  }
  next();
}

function optionalVkAdmin(req: Request, res: Response, next: NextFunction) {
  next();
}

export function registerVkRoutes(app: Express): void {
  
  // ========================================
  // VK AUTHENTICATIE
  // ========================================

  app.post("/api/vk/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Gebruikersnaam en wachtwoord zijn verplicht" });
      }

      const [admin] = await db
        .select()
        .from(vkAdmins)
        .where(eq(vkAdmins.username, username.toLowerCase().trim()))
        .limit(1);

      if (!admin) {
        return res.status(401).json({ message: "Ongeldige gebruikersnaam of wachtwoord" });
      }

      if (!admin.isActive) {
        return res.status(403).json({ message: "Account is gedeactiveerd" });
      }

      const isValid = await comparePasswords(password, admin.password);
      if (!isValid) {
        return res.status(401).json({ message: "Ongeldige gebruikersnaam of wachtwoord" });
      }

      req.session.vkAdminId = admin.id;
      
      const { password: _, ...adminWithoutPassword } = admin;
      res.json(adminWithoutPassword);
    } catch (error) {
      console.error("VK login error:", error);
      res.status(500).json({ message: "Inloggen mislukt" });
    }
  });

  app.post("/api/vk/logout", (req: Request, res: Response) => {
    req.session.vkAdminId = undefined;
    res.json({ message: "Uitgelogd" });
  });

  app.get("/api/vk/me", async (req: Request, res: Response) => {
    try {
      if (!req.session.vkAdminId) {
        return res.status(401).json({ message: "Niet ingelogd" });
      }

      const [admin] = await db
        .select()
        .from(vkAdmins)
        .where(eq(vkAdmins.id, req.session.vkAdminId))
        .limit(1);

      if (!admin) {
        req.session.vkAdminId = undefined;
        return res.status(401).json({ message: "Admin niet gevonden" });
      }

      const { password: _, ...adminWithoutPassword } = admin;
      res.json(adminWithoutPassword);
    } catch (error) {
      console.error("VK me error:", error);
      res.status(500).json({ message: "Fout bij ophalen gebruiker" });
    }
  });

  // ========================================
  // VK ADMIN BEHEER
  // ========================================

  app.get("/api/vk/admins", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const admins = await db
        .select({
          id: vkAdmins.id,
          username: vkAdmins.username,
          firstName: vkAdmins.firstName,
          lastName: vkAdmins.lastName,
          email: vkAdmins.email,
          memberId: vkAdmins.memberId,
          isActive: vkAdmins.isActive,
          mustChangePassword: vkAdmins.mustChangePassword,
          createdAt: vkAdmins.createdAt,
          updatedAt: vkAdmins.updatedAt,
          member: {
            id: vkMembers.id,
            firstName: vkMembers.firstName,
            lastName: vkMembers.lastName,
            membershipTypeId: vkMembers.membershipTypeId
          },
          membershipType: {
            id: vkMembershipTypes.id,
            name: vkMembershipTypes.name
          }
        })
        .from(vkAdmins)
        .leftJoin(vkMembers, eq(vkAdmins.memberId, vkMembers.id))
        .leftJoin(vkMembershipTypes, eq(vkMembers.membershipTypeId, vkMembershipTypes.id))
        .orderBy(asc(vkAdmins.lastName), asc(vkAdmins.firstName));
      res.json(admins);
    } catch (error) {
      console.error("VK admins GET error:", error);
      res.status(500).json({ message: "Fout bij ophalen administrators" });
    }
  });

  app.post("/api/vk/admins", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const { username, password, firstName, lastName, email, memberId } = req.body;

      if (!username || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "Gebruikersnaam, wachtwoord, voornaam en achternaam zijn verplicht" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Wachtwoord moet minstens 6 karakters zijn" });
      }

      const existing = await db
        .select()
        .from(vkAdmins)
        .where(eq(vkAdmins.username, username.toLowerCase().trim()))
        .limit(1);

      if (existing.length > 0) {
        return res.status(400).json({ message: "Gebruikersnaam bestaat al" });
      }

      // Validate memberId if provided
      if (memberId) {
        const memberExists = await db.select().from(vkMembers).where(eq(vkMembers.id, memberId)).limit(1);
        if (memberExists.length === 0) {
          return res.status(400).json({ message: "Geselecteerd lid bestaat niet" });
        }
      }

      const hashedPassword = await hashPassword(password);
      const [newAdmin] = await db.insert(vkAdmins).values({
        username: username.toLowerCase().trim(),
        password: hashedPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email?.trim() || null,
        memberId: memberId || null,
        isActive: true,
        mustChangePassword: true
      }).returning();

      const { password: _, ...adminWithoutPassword } = newAdmin;
      res.status(201).json(adminWithoutPassword);
    } catch (error) {
      console.error("VK admins POST error:", error);
      res.status(500).json({ message: "Fout bij aanmaken administrator" });
    }
  });

  app.patch("/api/vk/admins/:id", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ongeldige ID" });
      }

      const { firstName, lastName, email, isActive, memberId } = req.body;
      const updateData: any = { updatedAt: new Date() };
      
      if (firstName !== undefined) updateData.firstName = firstName.trim();
      if (lastName !== undefined) updateData.lastName = lastName.trim();
      if (email !== undefined) updateData.email = email?.trim() || null;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (memberId !== undefined) {
        // Validate memberId if provided and not null
        if (memberId !== null) {
          const memberExists = await db.select().from(vkMembers).where(eq(vkMembers.id, memberId)).limit(1);
          if (memberExists.length === 0) {
            return res.status(400).json({ message: "Geselecteerd lid bestaat niet" });
          }
        }
        updateData.memberId = memberId;
      }

      const [updated] = await db
        .update(vkAdmins)
        .set(updateData)
        .where(eq(vkAdmins.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Administrator niet gevonden" });
      }

      const { password: _, ...adminWithoutPassword } = updated;
      res.json(adminWithoutPassword);
    } catch (error) {
      console.error("VK admins PATCH error:", error);
      res.status(500).json({ message: "Fout bij bijwerken administrator" });
    }
  });

  app.post("/api/vk/admins/:id/reset-password", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ongeldige ID" });
      }

      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Nieuw wachtwoord moet minstens 6 karakters zijn" });
      }

      const hashedPassword = await hashPassword(newPassword);
      const [updated] = await db
        .update(vkAdmins)
        .set({ 
          password: hashedPassword, 
          mustChangePassword: true,
          updatedAt: new Date() 
        })
        .where(eq(vkAdmins.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Administrator niet gevonden" });
      }

      res.json({ message: "Wachtwoord is gereset. Gebruiker moet wachtwoord wijzigen bij volgende login." });
    } catch (error) {
      console.error("VK admins reset-password error:", error);
      res.status(500).json({ message: "Fout bij resetten wachtwoord" });
    }
  });

  app.post("/api/vk/change-password", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const adminId = req.session.vkAdminId;
      if (!adminId) {
        return res.status(401).json({ message: "Niet ingelogd" });
      }

      const { currentPassword, newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Nieuw wachtwoord moet minstens 6 karakters zijn" });
      }

      const [admin] = await db
        .select()
        .from(vkAdmins)
        .where(eq(vkAdmins.id, adminId))
        .limit(1);

      if (!admin) {
        return res.status(404).json({ message: "Administrator niet gevonden" });
      }

      if (!admin.mustChangePassword) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Huidig wachtwoord is verplicht" });
        }
        const isValid = await comparePasswords(currentPassword, admin.password);
        if (!isValid) {
          return res.status(401).json({ message: "Huidig wachtwoord is onjuist" });
        }
      }

      const hashedPassword = await hashPassword(newPassword);
      await db
        .update(vkAdmins)
        .set({ 
          password: hashedPassword, 
          mustChangePassword: false,
          updatedAt: new Date() 
        })
        .where(eq(vkAdmins.id, adminId));

      res.json({ message: "Wachtwoord succesvol gewijzigd" });
    } catch (error) {
      console.error("VK change-password error:", error);
      res.status(500).json({ message: "Fout bij wijzigen wachtwoord" });
    }
  });

  // ========================================
  // VK LIDMAATSCHAPSTYPES
  // ========================================

  app.get("/api/vk/membership-types", async (req: Request, res: Response) => {
    try {
      const types = await db
        .select()
        .from(vkMembershipTypes)
        .orderBy(asc(vkMembershipTypes.sortOrder), asc(vkMembershipTypes.name));
      res.json(types);
    } catch (error) {
      console.error("VK membership-types GET error:", error);
      res.status(500).json({ message: "Fout bij ophalen lidmaatschapstypes" });
    }
  });

  app.post("/api/vk/membership-types", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = insertVkMembershipTypeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Ongeldige gegevens", errors: parsed.error.errors });
      }

      const [newType] = await db.insert(vkMembershipTypes).values(parsed.data).returning();
      res.status(201).json(newType);
    } catch (error) {
      console.error("VK membership-types POST error:", error);
      res.status(500).json({ message: "Fout bij aanmaken lidmaatschapstype" });
    }
  });

  app.patch("/api/vk/membership-types/:id", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ongeldige ID" });
      }

      const [updated] = await db
        .update(vkMembershipTypes)
        .set(req.body)
        .where(eq(vkMembershipTypes.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Lidmaatschapstype niet gevonden" });
      }
      res.json(updated);
    } catch (error) {
      console.error("VK membership-types PATCH error:", error);
      res.status(500).json({ message: "Fout bij bijwerken lidmaatschapstype" });
    }
  });

  app.delete("/api/vk/membership-types/:id", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ongeldige ID" });
      }

      const [deleted] = await db
        .delete(vkMembershipTypes)
        .where(eq(vkMembershipTypes.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Lidmaatschapstype niet gevonden" });
      }
      res.json({ message: "Lidmaatschapstype verwijderd" });
    } catch (error) {
      console.error("VK membership-types DELETE error:", error);
      res.status(500).json({ message: "Fout bij verwijderen lidmaatschapstype" });
    }
  });

  // ========================================
  // VK LEDEN
  // ========================================

  app.get("/api/vk/members", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const members = await db
        .select()
        .from(vkMembers)
        .orderBy(asc(vkMembers.lastName), asc(vkMembers.firstName));
      res.json(members);
    } catch (error) {
      console.error("VK members GET error:", error);
      res.status(500).json({ message: "Fout bij ophalen leden" });
    }
  });

  app.post("/api/vk/members", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = insertVkMemberSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Ongeldige gegevens", errors: parsed.error.errors });
      }

      const [newMember] = await db.insert(vkMembers).values(parsed.data).returning();
      res.status(201).json(newMember);
    } catch (error) {
      console.error("VK members POST error:", error);
      res.status(500).json({ message: "Fout bij aanmaken lid" });
    }
  });

  app.patch("/api/vk/members/:id", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ongeldige ID" });
      }

      const updateData = { ...req.body, updatedAt: new Date() };
      const [updated] = await db
        .update(vkMembers)
        .set(updateData)
        .where(eq(vkMembers.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Lid niet gevonden" });
      }
      res.json(updated);
    } catch (error) {
      console.error("VK members PATCH error:", error);
      res.status(500).json({ message: "Fout bij bijwerken lid" });
    }
  });

  app.delete("/api/vk/members/:id", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ongeldige ID" });
      }

      const [deleted] = await db
        .delete(vkMembers)
        .where(eq(vkMembers.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Lid niet gevonden" });
      }
      res.json({ message: "Lid verwijderd" });
    } catch (error) {
      console.error("VK members DELETE error:", error);
      res.status(500).json({ message: "Fout bij verwijderen lid" });
    }
  });

  // ========================================
  // VK ACTIVITEITEN
  // ========================================

  app.get("/api/vk/activities", optionalVkAdmin, async (req: Request, res: Response) => {
    try {
      const isAdmin = !!req.session.vkAdminId;
      
      let activities;
      if (isAdmin) {
        activities = await db.select().from(vkActivities).orderBy(desc(vkActivities.startDate));
      } else {
        activities = await db
          .select()
          .from(vkActivities)
          .where(eq(vkActivities.isActive, true))
          .orderBy(desc(vkActivities.startDate));
      }
      
      res.json(activities);
    } catch (error) {
      console.error("VK activities GET error:", error);
      res.status(500).json({ message: "Fout bij ophalen activiteiten" });
    }
  });

  app.get("/api/vk/activities/:id", optionalVkAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ongeldige ID" });
      }

      const [activity] = await db
        .select()
        .from(vkActivities)
        .where(eq(vkActivities.id, id))
        .limit(1);

      if (!activity) {
        return res.status(404).json({ message: "Activiteit niet gevonden" });
      }

      const subActivities = await db
        .select()
        .from(vkSubActivities)
        .where(eq(vkSubActivities.activityId, id))
        .orderBy(asc(vkSubActivities.sortOrder), asc(vkSubActivities.name));

      const subActivityIds = subActivities.map(sa => sa.id);
      
      let pricing: any[] = [];
      if (subActivityIds.length > 0) {
        pricing = await db
          .select()
          .from(vkPricing)
          .where(
            subActivityIds.length === 1 
              ? eq(vkPricing.subActivityId, subActivityIds[0])
              : eq(vkPricing.subActivityId, subActivityIds[0])
          );
        
        if (subActivityIds.length > 1) {
          const allPricing = [];
          for (const saId of subActivityIds) {
            const prices = await db
              .select()
              .from(vkPricing)
              .where(eq(vkPricing.subActivityId, saId));
            allPricing.push(...prices);
          }
          pricing = allPricing;
        }
      }

      // Get direct activity pricing (for simple activities without sub-activities)
      const activityPricing = await db
        .select()
        .from(vkActivityPricing)
        .where(eq(vkActivityPricing.activityId, id));

      res.json({
        ...activity,
        subActivities,
        pricing,
        activityPricing
      });
    } catch (error) {
      console.error("VK activities/:id GET error:", error);
      res.status(500).json({ message: "Fout bij ophalen activiteit" });
    }
  });

  app.post("/api/vk/activities", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const { name, description, startDate, endDate, startTime, endTime, registrationDeadline, isActive } = req.body;
      
      if (!name || !startDate) {
        return res.status(400).json({ message: "Naam en startdatum zijn verplicht" });
      }

      const [newActivity] = await db.insert(vkActivities).values({
        name,
        description: description || null,
        startDate: typeof startDate === 'string' ? startDate : new Date(startDate).toISOString().split('T')[0],
        endDate: endDate ? (typeof endDate === 'string' ? endDate : new Date(endDate).toISOString().split('T')[0]) : null,
        startTime: startTime || null,
        endTime: endTime || null,
        registrationDeadline: registrationDeadline ? (typeof registrationDeadline === 'string' ? registrationDeadline : new Date(registrationDeadline).toISOString().split('T')[0]) : null,
        isActive: isActive ?? true
      }).returning();
      res.status(201).json(newActivity);
    } catch (error) {
      console.error("VK activities POST error:", error);
      res.status(500).json({ message: "Fout bij aanmaken activiteit" });
    }
  });

  app.patch("/api/vk/activities/:id", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ongeldige ID" });
      }

      const updateData = { ...req.body, updatedAt: new Date() };
      const [updated] = await db
        .update(vkActivities)
        .set(updateData)
        .where(eq(vkActivities.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Activiteit niet gevonden" });
      }
      res.json(updated);
    } catch (error) {
      console.error("VK activities PATCH error:", error);
      res.status(500).json({ message: "Fout bij bijwerken activiteit" });
    }
  });

  app.delete("/api/vk/activities/:id", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ongeldige ID" });
      }

      const [deleted] = await db
        .delete(vkActivities)
        .where(eq(vkActivities.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Activiteit niet gevonden" });
      }
      res.json({ message: "Activiteit verwijderd" });
    } catch (error) {
      console.error("VK activities DELETE error:", error);
      res.status(500).json({ message: "Fout bij verwijderen activiteit" });
    }
  });

  // ========================================
  // VK ACTIVITEIT PRIJZEN (directe prijzen op hoofdactiviteit)
  // ========================================

  // Get activity pricing for an activity
  app.get("/api/vk/activities/:activityId/pricing", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const activityId = parseInt(req.params.activityId);
      if (isNaN(activityId)) {
        return res.status(400).json({ message: "Ongeldige activiteit ID" });
      }

      const pricing = await db
        .select()
        .from(vkActivityPricing)
        .where(eq(vkActivityPricing.activityId, activityId));

      res.json(pricing);
    } catch (error) {
      console.error("VK activity pricing GET error:", error);
      res.status(500).json({ message: "Fout bij ophalen prijzen" });
    }
  });

  // Save/update activity pricing (upsert all prices for an activity)
  app.put("/api/vk/activities/:activityId/pricing", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const activityId = parseInt(req.params.activityId);
      if (isNaN(activityId)) {
        return res.status(400).json({ message: "Ongeldige activiteit ID" });
      }

      const { prices } = req.body; // Array of { membershipTypeId, price }
      if (!Array.isArray(prices)) {
        return res.status(400).json({ message: "Prijzen moeten als array worden meegegeven" });
      }

      // Delete existing pricing for this activity
      await db.delete(vkActivityPricing).where(eq(vkActivityPricing.activityId, activityId));

      // Insert new pricing
      if (prices.length > 0) {
        const validPrices = prices.filter(p => p.membershipTypeId && (p.price !== null && p.price !== undefined && p.price !== ""));
        if (validPrices.length > 0) {
          await db.insert(vkActivityPricing).values(
            validPrices.map(p => ({
              activityId,
              membershipTypeId: parseInt(p.membershipTypeId),
              price: Math.round(parseFloat(p.price) * 100) // Convert euros to cents
            }))
          );
        }
      }

      // Return updated pricing
      const updatedPricing = await db
        .select()
        .from(vkActivityPricing)
        .where(eq(vkActivityPricing.activityId, activityId));

      res.json(updatedPricing);
    } catch (error) {
      console.error("VK activity pricing PUT error:", error);
      res.status(500).json({ message: "Fout bij opslaan prijzen" });
    }
  });

  // ========================================
  // VK DEELACTIVITEITEN
  // ========================================

  app.post("/api/vk/activities/:activityId/sub-activities", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const activityId = parseInt(req.params.activityId);
      if (isNaN(activityId)) {
        return res.status(400).json({ message: "Ongeldige activiteit ID" });
      }

      const [activity] = await db
        .select()
        .from(vkActivities)
        .where(eq(vkActivities.id, activityId))
        .limit(1);

      if (!activity) {
        return res.status(404).json({ message: "Activiteit niet gevonden" });
      }

      const data = { ...req.body, activityId };
      const parsed = insertVkSubActivitySchema.safeParse(data);
      if (!parsed.success) {
        return res.status(400).json({ message: "Ongeldige gegevens", errors: parsed.error.errors });
      }

      const [newSubActivity] = await db.insert(vkSubActivities).values(parsed.data).returning();
      res.status(201).json(newSubActivity);
    } catch (error) {
      console.error("VK sub-activities POST error:", error);
      res.status(500).json({ message: "Fout bij aanmaken deelactiviteit" });
    }
  });

  app.patch("/api/vk/sub-activities/:id", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ongeldige ID" });
      }

      const [updated] = await db
        .update(vkSubActivities)
        .set(req.body)
        .where(eq(vkSubActivities.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Deelactiviteit niet gevonden" });
      }
      res.json(updated);
    } catch (error) {
      console.error("VK sub-activities PATCH error:", error);
      res.status(500).json({ message: "Fout bij bijwerken deelactiviteit" });
    }
  });

  app.delete("/api/vk/sub-activities/:id", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ongeldige ID" });
      }

      const [deleted] = await db
        .delete(vkSubActivities)
        .where(eq(vkSubActivities.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Deelactiviteit niet gevonden" });
      }
      res.json({ message: "Deelactiviteit verwijderd" });
    } catch (error) {
      console.error("VK sub-activities DELETE error:", error);
      res.status(500).json({ message: "Fout bij verwijderen deelactiviteit" });
    }
  });

  // ========================================
  // VK PRIJZEN
  // ========================================

  app.post("/api/vk/sub-activities/:id/pricing", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const subActivityId = parseInt(req.params.id);
      if (isNaN(subActivityId)) {
        return res.status(400).json({ message: "Ongeldige deelactiviteit ID" });
      }

      const [subActivity] = await db
        .select()
        .from(vkSubActivities)
        .where(eq(vkSubActivities.id, subActivityId))
        .limit(1);

      if (!subActivity) {
        return res.status(404).json({ message: "Deelactiviteit niet gevonden" });
      }

      const data = { ...req.body, subActivityId };
      const parsed = insertVkPricingSchema.safeParse(data);
      if (!parsed.success) {
        return res.status(400).json({ message: "Ongeldige gegevens", errors: parsed.error.errors });
      }

      const existingPrice = await db
        .select()
        .from(vkPricing)
        .where(
          and(
            eq(vkPricing.subActivityId, subActivityId),
            eq(vkPricing.membershipTypeId, parsed.data.membershipTypeId)
          )
        )
        .limit(1);

      if (existingPrice.length > 0) {
        const [updated] = await db
          .update(vkPricing)
          .set({ pricePerUnit: parsed.data.pricePerUnit })
          .where(eq(vkPricing.id, existingPrice[0].id))
          .returning();
        return res.json(updated);
      }

      const [newPricing] = await db.insert(vkPricing).values(parsed.data).returning();
      res.status(201).json(newPricing);
    } catch (error) {
      console.error("VK pricing POST error:", error);
      res.status(500).json({ message: "Fout bij instellen prijs" });
    }
  });

  app.delete("/api/vk/pricing/:id", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ongeldige ID" });
      }

      const [deleted] = await db
        .delete(vkPricing)
        .where(eq(vkPricing.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Prijs niet gevonden" });
      }
      res.json({ message: "Prijs verwijderd" });
    } catch (error) {
      console.error("VK pricing DELETE error:", error);
      res.status(500).json({ message: "Fout bij verwijderen prijs" });
    }
  });

  // ========================================
  // VK INSCHRIJVINGEN
  // ========================================

  app.get("/api/vk/registrations", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const activityId = req.query.activityId ? parseInt(req.query.activityId as string) : undefined;
      
      let registrations;
      if (activityId && !isNaN(activityId)) {
        registrations = await db
          .select()
          .from(vkRegistrations)
          .where(eq(vkRegistrations.activityId, activityId))
          .orderBy(desc(vkRegistrations.createdAt));
      } else {
        registrations = await db
          .select()
          .from(vkRegistrations)
          .orderBy(desc(vkRegistrations.createdAt));
      }
      
      res.json(registrations);
    } catch (error) {
      console.error("VK registrations GET error:", error);
      res.status(500).json({ message: "Fout bij ophalen inschrijvingen" });
    }
  });

  app.get("/api/vk/registrations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ongeldige ID" });
      }

      const [registration] = await db
        .select()
        .from(vkRegistrations)
        .where(eq(vkRegistrations.id, id))
        .limit(1);

      if (!registration) {
        return res.status(404).json({ message: "Inschrijving niet gevonden" });
      }

      const items = await db
        .select()
        .from(vkRegistrationItems)
        .where(eq(vkRegistrationItems.registrationId, id));

      res.json({
        ...registration,
        items
      });
    } catch (error) {
      console.error("VK registrations/:id GET error:", error);
      res.status(500).json({ message: "Fout bij ophalen inschrijving" });
    }
  });

  app.post("/api/vk/registrations", async (req: Request, res: Response) => {
    try {
      const { items, ...registrationData } = req.body;
      
      const parsed = insertVkRegistrationSchema.safeParse(registrationData);
      if (!parsed.success) {
        return res.status(400).json({ message: "Ongeldige gegevens", errors: parsed.error.errors });
      }

      const [activity] = await db
        .select()
        .from(vkActivities)
        .where(eq(vkActivities.id, parsed.data.activityId))
        .limit(1);

      if (!activity) {
        return res.status(404).json({ message: "Activiteit niet gevonden" });
      }

      if (!activity.isActive) {
        return res.status(400).json({ message: "Inschrijving voor deze activiteit is gesloten" });
      }

      // Validate personCount against activity's max (null means unlimited)
      const maxPersons = activity.maxPersonsPerRegistration;
      const requestedPersonCount = parsed.data.personCount ?? 1;
      if (requestedPersonCount < 1) {
        return res.status(400).json({ message: "Aantal personen moet minimaal 1 zijn" });
      }
      if (maxPersons !== null && requestedPersonCount > maxPersons) {
        return res.status(400).json({ 
          message: `Aantal personen mag maximaal ${maxPersons} zijn` 
        });
      }

      // Validate sub-activity quantities against their per-registration limits
      if (items && Array.isArray(items) && items.length > 0) {
        const subActivityIds = items.map((item: any) => item.subActivityId);
        const subActivities = await db
          .select()
          .from(vkSubActivities)
          .where(inArray(vkSubActivities.id, subActivityIds));
        
        for (const item of items) {
          const subActivity = subActivities.find((sa: any) => sa.id === item.subActivityId);
          if (subActivity) {
            const maxQty = subActivity.maxQuantityPerRegistration;
            if (maxQty !== null && item.quantity > maxQty) {
              return res.status(400).json({
                message: `Maximum ${maxQty} stuks per registratie voor ${subActivity.name}`
              });
            }
          }
        }
      }

      const [newRegistration] = await db
        .insert(vkRegistrations)
        .values({ ...parsed.data, personCount: requestedPersonCount })
        .returning();

      if (items && Array.isArray(items) && items.length > 0) {
        const itemsToInsert = items.map((item: any) => ({
          ...item,
          registrationId: newRegistration.id
        }));

        await db.insert(vkRegistrationItems).values(itemsToInsert);
      }

      const registrationItems = await db
        .select()
        .from(vkRegistrationItems)
        .where(eq(vkRegistrationItems.registrationId, newRegistration.id));

      res.status(201).json({
        ...newRegistration,
        items: registrationItems
      });
    } catch (error) {
      console.error("VK registrations POST error:", error);
      res.status(500).json({ message: "Fout bij aanmaken inschrijving" });
    }
  });

  app.patch("/api/vk/registrations/:id", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ongeldige ID" });
      }

      const updateData = { ...req.body, updatedAt: new Date() };
      delete updateData.items;

      const [updated] = await db
        .update(vkRegistrations)
        .set(updateData)
        .where(eq(vkRegistrations.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Inschrijving niet gevonden" });
      }

      const items = await db
        .select()
        .from(vkRegistrationItems)
        .where(eq(vkRegistrationItems.registrationId, id));

      res.json({
        ...updated,
        items
      });
    } catch (error) {
      console.error("VK registrations PATCH error:", error);
      res.status(500).json({ message: "Fout bij bijwerken inschrijving" });
    }
  });

  // ========================================
  // STRIPE CHECKOUT VOOR VK INSCHRIJVINGEN
  // ========================================

  app.post("/api/vk/checkout", async (req: Request, res: Response) => {
    try {
      const { registrationId } = req.body;

      if (!registrationId) {
        return res.status(400).json({ message: "Inschrijving ID is verplicht" });
      }

      const [registration] = await db
        .select()
        .from(vkRegistrations)
        .where(eq(vkRegistrations.id, registrationId))
        .limit(1);

      if (!registration) {
        return res.status(404).json({ message: "Inschrijving niet gevonden" });
      }

      if (registration.paymentStatus === 'paid') {
        return res.status(400).json({ message: "Deze inschrijving is al betaald" });
      }

      const [activity] = await db
        .select()
        .from(vkActivities)
        .where(eq(vkActivities.id, registration.activityId))
        .limit(1);

      const items = await db
        .select()
        .from(vkRegistrationItems)
        .where(eq(vkRegistrationItems.registrationId, registrationId));

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      const lineItems = items.map(item => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: `${activity?.name || 'Activiteit'} - Deelactiviteit`,
          },
          unit_amount: item.pricePerUnit,
        },
        quantity: item.quantity,
      }));

      if (lineItems.length === 0) {
        lineItems.push({
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${activity?.name || 'Inschrijving'} - Deelnamekosten`,
            },
            unit_amount: registration.totalAmount,
          },
          quantity: 1,
        });
      }

      const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
      const protocol = baseUrl.includes('localhost') ? 'http' : 'https';

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card', 'bancontact', 'ideal'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${protocol}://${baseUrl}/VriendenkringMol/inschrijven?success=true&registrationId=${registrationId}`,
        cancel_url: `${protocol}://${baseUrl}/VriendenkringMol/inschrijven?canceled=true`,
        customer_email: registration.email,
        metadata: {
          registrationId: registrationId.toString(),
          activityId: registration.activityId.toString(),
        },
      });

      await db
        .update(vkRegistrations)
        .set({
          stripeCheckoutSessionId: session.id,
          updatedAt: new Date()
        })
        .where(eq(vkRegistrations.id, registrationId));

      res.json({ url: session.url, sessionId: session.id });
    } catch (error) {
      console.error("VK checkout error:", error);
      res.status(500).json({ message: "Fout bij aanmaken betaling" });
    }
  });

  // GRATIS REGISTRATIES - directe bevestiging zonder betaling
  app.post("/api/vk/confirm-free", async (req: Request, res: Response) => {
    try {
      const { registrationId } = req.body;

      if (!registrationId) {
        return res.status(400).json({ message: "Inschrijving ID is verplicht" });
      }

      const [registration] = await db
        .select()
        .from(vkRegistrations)
        .where(eq(vkRegistrations.id, registrationId))
        .limit(1);

      if (!registration) {
        return res.status(404).json({ message: "Inschrijving niet gevonden" });
      }

      if (registration.paymentStatus === 'paid') {
        return res.status(400).json({ message: "Deze inschrijving is al bevestigd" });
      }

      // Verify this is actually a free registration (totalAmount = 0)
      const amount = Number(registration.totalAmount);
      if (isNaN(amount) || amount !== 0) {
        return res.status(400).json({ message: "Deze inschrijving is niet gratis en vereist betaling" });
      }

      // Mark as confirmed (paid status for consistency, even though no payment)
      const [updated] = await db
        .update(vkRegistrations)
        .set({
          paymentStatus: 'paid',
          paidAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(vkRegistrations.id, registrationId))
        .returning();

      res.json({ 
        success: true, 
        message: "Inschrijving bevestigd",
        registration: updated 
      });
    } catch (error) {
      console.error("VK confirm-free error:", error);
      res.status(500).json({ message: "Fout bij bevestigen inschrijving" });
    }
  });

  app.get("/api/vk/checkout/verify/:registrationId", async (req: Request, res: Response) => {
    try {
      const registrationId = parseInt(req.params.registrationId);
      if (isNaN(registrationId)) {
        return res.status(400).json({ message: "Ongeldige ID" });
      }

      const [registration] = await db
        .select()
        .from(vkRegistrations)
        .where(eq(vkRegistrations.id, registrationId))
        .limit(1);

      if (!registration) {
        return res.status(404).json({ message: "Inschrijving niet gevonden" });
      }

      if (registration.paymentStatus === 'paid') {
        return res.json({ paid: true, registration });
      }

      if (!registration.stripeCheckoutSessionId) {
        return res.json({ paid: false, registration });
      }

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      const session = await stripe.checkout.sessions.retrieve(registration.stripeCheckoutSessionId);

      if (session.payment_status === 'paid') {
        await db
          .update(vkRegistrations)
          .set({
            paymentStatus: 'paid',
            stripePaymentIntentId: session.payment_intent as string,
            paidAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(vkRegistrations.id, registrationId));

        const [updatedRegistration] = await db
          .select()
          .from(vkRegistrations)
          .where(eq(vkRegistrations.id, registrationId))
          .limit(1);

        return res.json({ paid: true, registration: updatedRegistration });
      }

      res.json({ paid: false, registration });
    } catch (error) {
      console.error("VK checkout verify error:", error);
      res.status(500).json({ message: "Fout bij verificatie betaling" });
    }
  });

  // ========================================
  // EMAIL UITNODIGINGEN
  // ========================================

  // Send invitation emails to members of selected membership types
  app.post("/api/vk/send-invitations", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const { activityId, membershipTypeIds, subject, message } = req.body;

      if (!activityId || !membershipTypeIds || !Array.isArray(membershipTypeIds) || membershipTypeIds.length === 0) {
        return res.status(400).json({ message: "Activiteit en minstens één lidmaatschapstype zijn verplicht" });
      }

      if (!subject || !message) {
        return res.status(400).json({ message: "Onderwerp en bericht zijn verplicht" });
      }

      // Get the activity
      const [activity] = await db
        .select()
        .from(vkActivities)
        .where(eq(vkActivities.id, activityId))
        .limit(1);

      if (!activity) {
        return res.status(404).json({ message: "Activiteit niet gevonden" });
      }

      // Get members of selected membership types with valid emails
      const members = await db
        .select()
        .from(vkMembers)
        .where(eq(vkMembers.isActive, true));

      const filteredMembers = members.filter(
        (m) => m.email && membershipTypeIds.includes(m.membershipTypeId)
      );

      // Get membership types for placeholder replacement
      const membershipTypesData = await db.select().from(vkMembershipTypes);
      const membershipTypeMap = new Map(membershipTypesData.map(mt => [mt.id, mt.name]));

      if (filteredMembers.length === 0) {
        return res.status(400).json({ message: "Geen leden gevonden met de geselecteerde categorieën en een geldig e-mailadres" });
      }

      // Check if Gmail credentials are configured
      const gmailUser = process.env.VK_GMAIL_USER?.trim();
      const gmailPassword = process.env.VK_GMAIL_APP_PASSWORD?.trim();

      if (!gmailUser || !gmailPassword) {
        console.error("VK email: Gmail credentials not configured");
        return res.status(500).json({ message: "E-mailconfiguratie niet ingesteld. Contacteer de beheerder." });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(gmailUser)) {
        console.error("VK email: Invalid Gmail user format");
        return res.status(500).json({ message: "Ongeldige e-mailconfiguratie. Contacteer de beheerder." });
      }

      // Create nodemailer transporter
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailPassword,
        },
      });

      // Build registration link with validation
      const rawDomains = process.env.REPLIT_DOMAINS || '';
      const firstDomain = rawDomains.split(',')[0]?.trim();
      // Validate domain format (alphanumeric, dots, hyphens only)
      const domainRegex = /^[a-zA-Z0-9.-]+$/;
      const baseUrl = (firstDomain && domainRegex.test(firstDomain)) ? firstDomain : 'localhost:5000';
      const protocol = baseUrl.includes('localhost') ? 'http' : 'https';

      // Send emails with tracking
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (const member of filteredMembers) {
        try {
          // Generate unique tracking token and registration token
          const trackingToken = randomBytes(32).toString("hex");
          const registrationToken = randomBytes(32).toString("hex");
          const trackingPixelUrl = `${protocol}://${baseUrl}/api/vk/track/${trackingToken}`;
          
          // Build personalized registration URL with registration token
          const registrationUrl = `${protocol}://${baseUrl}/VriendenkringMol/inschrijven?token=${registrationToken}`;

          // Replace placeholders in message with HTML-escaped values
          const safeFirstName = escapeHtml(member.firstName);
          const safeMemberTypeName = escapeHtml(membershipTypeMap.get(member.membershipTypeId) || "Lid");
          const personalizedMessage = escapeHtml(message)
            .replace(/\{voornaam\}/g, safeFirstName)
            .replace(/\{lidtype\}/g, safeMemberTypeName);

          // Build HTML email template with tracking pixel
          const safeActivityName = escapeHtml(activity.name);
          const htmlMessage = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">Vriendenkring VZW Brandweer Mol</h1>
              </div>
              <div style="padding: 20px; background-color: #f8fafc;">
                <h2 style="color: #1e40af;">${safeActivityName}</h2>
                <div style="white-space: pre-wrap; margin-bottom: 20px;">${personalizedMessage}</div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${registrationUrl}" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                    Schrijf je nu in
                  </a>
                </div>
                <p style="color: #64748b; font-size: 12px; text-align: center;">
                  Of kopieer deze link: ${registrationUrl}
                </p>
              </div>
              <div style="background-color: #e2e8f0; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
                Vriendenkring VZW Brandweer Mol
              </div>
              <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />
            </div>
          `;

          await transporter.sendMail({
            from: `"Vriendenkring Mol" <${gmailUser}>`,
            to: member.email!,
            subject: subject,
            html: htmlMessage,
          });

          // Save invitation record for tracking with registration token
          await db.insert(vkInvitations).values({
            activityId: activityId,
            memberId: member.id,
            trackingToken: trackingToken,
            registrationToken: registrationToken,
            email: member.email!,
            subject: subject,
          });

          successCount++;
        } catch (emailError: any) {
          failCount++;
          errors.push(`${member.firstName} ${member.lastName}: ${emailError.message}`);
          console.error(`VK email failed for ${member.email}:`, emailError);
        }
      }

      res.json({
        success: true,
        message: `${successCount} e-mail(s) verzonden${failCount > 0 ? `, ${failCount} mislukt` : ""}`,
        successCount,
        failCount,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error("VK send-invitations error:", error);
      res.status(500).json({ message: "Fout bij verzenden uitnodigingen" });
    }
  });

  // Tracking pixel endpoint - records when email is opened
  app.get("/api/vk/track/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      if (!token || token.length !== 64) {
        // Return transparent 1x1 pixel anyway to not break email display
        const pixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
        res.setHeader("Content-Type", "image/gif");
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
        return res.send(pixel);
      }

      // Find and update the invitation
      const [invitation] = await db
        .select()
        .from(vkInvitations)
        .where(eq(vkInvitations.trackingToken, token))
        .limit(1);

      if (invitation) {
        // Update openedAt (first open) and increment openCount
        await db
          .update(vkInvitations)
          .set({
            openedAt: invitation.openedAt || new Date(),
            openCount: invitation.openCount + 1,
          })
          .where(eq(vkInvitations.id, invitation.id));
      }

      // Return transparent 1x1 GIF pixel
      const pixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
      res.setHeader("Content-Type", "image/gif");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
      res.send(pixel);
    } catch (error) {
      console.error("VK tracking error:", error);
      // Still return pixel to not break email display
      const pixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
      res.setHeader("Content-Type", "image/gif");
      res.send(pixel);
    }
  });

  // Get invitations for an activity (admin only)
  app.get("/api/vk/invitations/:activityId", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const activityId = parseInt(req.params.activityId);
      if (isNaN(activityId)) {
        return res.status(400).json({ message: "Ongeldige activiteit ID" });
      }

      const invitations = await db
        .select({
          id: vkInvitations.id,
          activityId: vkInvitations.activityId,
          memberId: vkInvitations.memberId,
          memberFirstName: vkMembers.firstName,
          memberLastName: vkMembers.lastName,
          email: vkInvitations.email,
          subject: vkInvitations.subject,
          sentAt: vkInvitations.sentAt,
          openedAt: vkInvitations.openedAt,
          openCount: vkInvitations.openCount,
        })
        .from(vkInvitations)
        .leftJoin(vkMembers, eq(vkInvitations.memberId, vkMembers.id))
        .where(eq(vkInvitations.activityId, activityId))
        .orderBy(desc(vkInvitations.sentAt));

      res.json(invitations);
    } catch (error) {
      console.error("VK invitations GET error:", error);
      res.status(500).json({ message: "Fout bij ophalen uitnodigingen" });
    }
  });

  // Get all invitations summary (admin only)
  app.get("/api/vk/invitations", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const invitations = await db
        .select({
          id: vkInvitations.id,
          activityId: vkInvitations.activityId,
          activityName: vkActivities.name,
          memberId: vkInvitations.memberId,
          memberFirstName: vkMembers.firstName,
          memberLastName: vkMembers.lastName,
          email: vkInvitations.email,
          subject: vkInvitations.subject,
          sentAt: vkInvitations.sentAt,
          openedAt: vkInvitations.openedAt,
          openCount: vkInvitations.openCount,
        })
        .from(vkInvitations)
        .leftJoin(vkMembers, eq(vkInvitations.memberId, vkMembers.id))
        .leftJoin(vkActivities, eq(vkInvitations.activityId, vkActivities.id))
        .orderBy(desc(vkInvitations.sentAt));

      res.json(invitations);
    } catch (error) {
      console.error("VK invitations GET all error:", error);
      res.status(500).json({ message: "Fout bij ophalen uitnodigingen" });
    }
  });

  // Get invitation data by registration token (public endpoint for pre-filling registration form)
  app.get("/api/vk/invitation-data/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      if (!token || token.length !== 64) {
        return res.status(400).json({ message: "Ongeldige token" });
      }

      // Find invitation by registration token
      const [invitation] = await db
        .select({
          id: vkInvitations.id,
          activityId: vkInvitations.activityId,
          memberId: vkInvitations.memberId,
          email: vkInvitations.email,
        })
        .from(vkInvitations)
        .where(eq(vkInvitations.registrationToken, token))
        .limit(1);

      if (!invitation) {
        return res.status(404).json({ message: "Uitnodiging niet gevonden of verlopen" });
      }

      // Get member details
      const [member] = await db
        .select()
        .from(vkMembers)
        .where(eq(vkMembers.id, invitation.memberId))
        .limit(1);

      if (!member) {
        return res.status(404).json({ message: "Lid niet gevonden" });
      }

      // Get activity details
      const [activity] = await db
        .select()
        .from(vkActivities)
        .where(eq(vkActivities.id, invitation.activityId))
        .limit(1);

      if (!activity) {
        return res.status(404).json({ message: "Activiteit niet gevonden" });
      }

      // Check if activity is still active
      if (!activity.isActive) {
        return res.status(400).json({ message: "Deze activiteit is niet meer actief" });
      }

      // Return data for pre-filling the registration form
      res.json({
        name: `${member.firstName} ${member.lastName}`,
        email: invitation.email,
        membershipTypeId: member.membershipTypeId,
        activityId: invitation.activityId,
        activityName: activity.name,
      });
    } catch (error) {
      console.error("VK invitation-data error:", error);
      res.status(500).json({ message: "Fout bij ophalen uitnodigingsgegevens" });
    }
  });

  // ========================================
  // MEMBERSHIP FEE MANAGEMENT ROUTES
  // ========================================

  // Get all membership fee cycles
  app.get("/api/vk/membership-fee-cycles", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const cycles = await db
        .select()
        .from(vkMembershipFeeCycles)
        .orderBy(desc(vkMembershipFeeCycles.year));
      res.json(cycles);
    } catch (error) {
      console.error("VK membership fee cycles GET error:", error);
      res.status(500).json({ message: "Fout bij ophalen lidgeldrondes" });
    }
  });

  // Get single cycle with invitations summary
  app.get("/api/vk/membership-fee-cycles/:id", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const cycleId = parseInt(id);

      const [cycle] = await db
        .select()
        .from(vkMembershipFeeCycles)
        .where(eq(vkMembershipFeeCycles.id, cycleId))
        .limit(1);

      if (!cycle) {
        return res.status(404).json({ message: "Lidgeldronde niet gevonden" });
      }

      // Get all invitations for this cycle with member details
      const invitations = await db
        .select({
          id: vkMembershipFeeInvitations.id,
          memberId: vkMembershipFeeInvitations.memberId,
          memberFirstName: vkMembers.firstName,
          memberLastName: vkMembers.lastName,
          email: vkMembershipFeeInvitations.email,
          status: vkMembershipFeeInvitations.status,
          amountDueCents: vkMembershipFeeInvitations.amountDueCents,
          amountPaidCents: vkMembershipFeeInvitations.amountPaidCents,
          penaltyApplied: vkMembershipFeeInvitations.penaltyApplied,
          invitationSentAt: vkMembershipFeeInvitations.invitationSentAt,
          paidAt: vkMembershipFeeInvitations.paidAt,
          reminderOneWeekSentAt: vkMembershipFeeInvitations.reminderOneWeekSentAt,
          reminderThreeDaysSentAt: vkMembershipFeeInvitations.reminderThreeDaysSentAt,
          reminderOneDaySentAt: vkMembershipFeeInvitations.reminderOneDaySentAt,
        })
        .from(vkMembershipFeeInvitations)
        .leftJoin(vkMembers, eq(vkMembershipFeeInvitations.memberId, vkMembers.id))
        .where(eq(vkMembershipFeeInvitations.cycleId, cycleId))
        .orderBy(asc(vkMembers.lastName), asc(vkMembers.firstName));

      // Calculate summary stats
      const summary = {
        total: invitations.length,
        pending: invitations.filter(i => i.status === "pending").length,
        paid: invitations.filter(i => i.status === "paid").length,
        overdue: invitations.filter(i => i.status === "overdue").length,
        totalAmountDue: invitations.reduce((sum, i) => sum + (i.amountDueCents || 0), 0),
        totalAmountPaid: invitations.reduce((sum, i) => sum + (i.amountPaidCents || 0), 0),
      };

      res.json({ cycle, invitations, summary });
    } catch (error) {
      console.error("VK membership fee cycle GET error:", error);
      res.status(500).json({ message: "Fout bij ophalen lidgeldronde" });
    }
  });

  // Create new membership fee cycle and send invitations
  app.post("/api/vk/membership-fee-cycles", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const validationResult = insertVkMembershipFeeCycleSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Ongeldige invoer", 
          errors: validationResult.error.errors 
        });
      }

      const { year, label, baseAmountCents, penaltyAmountCents, dueDate, memberIds } = req.body;

      // Create the cycle
      const [newCycle] = await db
        .insert(vkMembershipFeeCycles)
        .values({
          year,
          label,
          baseAmountCents,
          penaltyAmountCents,
          dueDate,
          createdBy: req.session.vkAdminId,
        })
        .returning();

      // Get selected members (or all active members if no selection)
      let membersToInvite;
      if (memberIds && memberIds.length > 0) {
        membersToInvite = await db
          .select()
          .from(vkMembers)
          .where(and(
            eq(vkMembers.isActive, true),
            inArray(vkMembers.id, memberIds)
          ));
      } else {
        membersToInvite = await db
          .select()
          .from(vkMembers)
          .where(eq(vkMembers.isActive, true));
      }

      // Create invitations for each member
      const invitationsCreated = [];
      for (const member of membersToInvite) {
        const token = randomBytes(32).toString("hex");
        
        const [invitation] = await db
          .insert(vkMembershipFeeInvitations)
          .values({
            cycleId: newCycle.id,
            memberId: member.id,
            email: member.email,
            token,
            status: "pending",
            amountDueCents: baseAmountCents,
            penaltyApplied: false,
          })
          .returning();

        invitationsCreated.push({ invitation, member });
      }

      res.status(201).json({ 
        cycle: newCycle, 
        invitationsCreated: invitationsCreated.length,
        message: `Lidgeldronde aangemaakt met ${invitationsCreated.length} uitnodigingen`
      });
    } catch (error) {
      console.error("VK membership fee cycle POST error:", error);
      res.status(500).json({ message: "Fout bij aanmaken lidgeldronde" });
    }
  });

  // Send invitation emails for a cycle
  app.post("/api/vk/membership-fee-cycles/:id/send-invitations", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const cycleId = parseInt(id);
      const { memberIds } = req.body;

      // Get cycle
      const [cycle] = await db
        .select()
        .from(vkMembershipFeeCycles)
        .where(eq(vkMembershipFeeCycles.id, cycleId))
        .limit(1);

      if (!cycle) {
        return res.status(404).json({ message: "Lidgeldronde niet gevonden" });
      }

      // Get pending invitations that haven't been sent yet
      const invitations = await db
        .select({
          invitation: vkMembershipFeeInvitations,
          member: vkMembers,
        })
        .from(vkMembershipFeeInvitations)
        .leftJoin(vkMembers, eq(vkMembershipFeeInvitations.memberId, vkMembers.id))
        .where(and(
          eq(vkMembershipFeeInvitations.cycleId, cycleId),
          eq(vkMembershipFeeInvitations.status, "pending"),
          sql`${vkMembershipFeeInvitations.invitationSentAt} IS NULL`
        ));

      let sentCount = 0;
      let errorCount = 0;

      // Import nodemailer dynamically to avoid issues if not configured
      const nodemailer = await import("nodemailer");
      
      // Check if email credentials are available
      const gmailUser = process.env.VK_GMAIL_USER;
      const gmailPassword = process.env.VK_GMAIL_APP_PASSWORD;
      
      if (!gmailUser || !gmailPassword) {
        return res.status(400).json({ message: "E-mail instellingen niet geconfigureerd" });
      }

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailPassword,
        },
      });

      const protocol = process.env.NODE_ENV === "production" ? "https" : "https";
      const baseUrl = req.get("host") || "localhost:5000";

      // Filter by memberIds if provided
      const filteredInvitations = memberIds && Array.isArray(memberIds) && memberIds.length > 0
        ? invitations.filter(({ member }) => member && memberIds.includes(member.id))
        : invitations;

      for (const { invitation, member } of filteredInvitations) {
        if (!member) continue;

        try {
          const paymentUrl = `${protocol}://${baseUrl}/VriendenkringMol/lidgeld/${invitation.token}`;
          const dueDateFormatted = new Date(cycle.dueDate).toLocaleDateString("nl-BE");
          const amountFormatted = `€${(invitation.amountDueCents / 100).toFixed(2)}`;

          const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background-color: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
                .button { display: inline-block; background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                .footer { background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b; border-radius: 0 0 8px 8px; }
                .amount { font-size: 24px; font-weight: bold; color: #2563eb; }
                .deadline { color: #dc2626; font-weight: bold; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Vriendenkring VZW Brandweer Mol</h1>
                </div>
                <div class="content">
                  <p>Beste ${escapeHtml(member.firstName)},</p>
                  <p>We willen je vriendelijk herinneren aan het lidgeld voor ${cycle.label}. Via onderstaande link kun je eenvoudig en veilig online betalen.</p>
                  <p style="text-align: center;">
                    <span class="amount">${amountFormatted}</span><br>
                    <span class="deadline">Te betalen voor: ${dueDateFormatted}</span>
                  </p>
                  <p style="text-align: center;">
                    <a href="${paymentUrl}" class="button">Nu betalen</a>
                  </p>
                  <p style="font-size: 12px; color: #64748b;">
                    Of kopieer deze link: ${paymentUrl}
                  </p>
                  <p>Heb je vragen? Neem gerust contact met ons op.</p>
                  <p>Met vriendelijke groeten,<br>Vriendenkring VZW Brandweer Mol</p>
                </div>
                <div class="footer">
                  <p>Vriendenkring VZW Brandweer Mol</p>
                </div>
              </div>
            </body>
            </html>
          `;

          await transporter.sendMail({
            from: `"Vriendenkring Brandweer Mol" <${gmailUser}>`,
            to: member.email,
            subject: `Lidgeld ${cycle.year} - Vriendenkring Brandweer Mol`,
            html: htmlContent,
          });

          // Update invitation as sent
          await db
            .update(vkMembershipFeeInvitations)
            .set({ invitationSentAt: new Date() })
            .where(eq(vkMembershipFeeInvitations.id, invitation.id));

          sentCount++;
        } catch (emailError) {
          console.error(`Failed to send email to ${member.email}:`, emailError);
          errorCount++;
        }
      }

      res.json({ 
        message: `${sentCount} uitnodigingen verstuurd${errorCount > 0 ? `, ${errorCount} mislukt` : ""}`,
        sentCount,
        errorCount
      });
    } catch (error) {
      console.error("VK send membership fee invitations error:", error);
      res.status(500).json({ message: "Fout bij versturen uitnodigingen" });
    }
  });

  // Resend single invitation
  app.post("/api/vk/membership-fee-invitations/:id/resend", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const invitationId = parseInt(id);
      const { subject, message } = req.body;

      // Get invitation with cycle and member
      const [result] = await db
        .select({
          invitation: vkMembershipFeeInvitations,
          cycle: vkMembershipFeeCycles,
          member: vkMembers,
        })
        .from(vkMembershipFeeInvitations)
        .leftJoin(vkMembershipFeeCycles, eq(vkMembershipFeeInvitations.cycleId, vkMembershipFeeCycles.id))
        .leftJoin(vkMembers, eq(vkMembershipFeeInvitations.memberId, vkMembers.id))
        .where(eq(vkMembershipFeeInvitations.id, invitationId))
        .limit(1);

      if (!result || !result.member || !result.cycle) {
        return res.status(404).json({ message: "Uitnodiging niet gevonden" });
      }

      const { invitation, cycle, member } = result;

      // Check email credentials
      const gmailUser = process.env.VK_GMAIL_USER;
      const gmailPassword = process.env.VK_GMAIL_APP_PASSWORD;
      
      if (!gmailUser || !gmailPassword) {
        return res.status(400).json({ message: "E-mail instellingen niet geconfigureerd" });
      }

      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: gmailUser, pass: gmailPassword },
      });

      const protocol = "https";
      const baseUrl = req.get("host") || "localhost:5000";
      const paymentUrl = `${protocol}://${baseUrl}/VriendenkringMol/lidgeld/${invitation.token}`;
      const dueDateFormatted = new Date(cycle.dueDate).toLocaleDateString("nl-BE");
      const amountFormatted = `€${(invitation.amountDueCents / 100).toFixed(2)}`;

      const personalizedMessage = (message || `Beste {voornaam},\n\nHerinnering om je lidgeld te betalen voor ${cycle.year}.`)
        .replace(/\{voornaam\}/g, member.firstName)
        .replace(/\{achternaam\}/g, member.lastName)
        .replace(/\{bedrag\}/g, amountFormatted)
        .replace(/\{vervaldatum\}/g, dueDateFormatted)
        .replace(/\{jaar\}/g, cycle.year.toString());

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
            .button { display: inline-block; background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .amount { font-size: 24px; font-weight: bold; color: #2563eb; }
            .deadline { color: #dc2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Vriendenkring VZW Brandweer Mol</h1>
            </div>
            <div class="content">
              <p>${escapeHtml(personalizedMessage).replace(/\n/g, '<br>')}</p>
              <p style="text-align: center;">
                <span class="amount">${amountFormatted}</span><br>
                <span class="deadline">Te betalen voor: ${dueDateFormatted}</span>
              </p>
              <p style="text-align: center;">
                <a href="${paymentUrl}" class="button">Nu betalen</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: `"Vriendenkring Brandweer Mol" <${gmailUser}>`,
        to: member.email,
        subject: (subject || `Herinnering: Lidgeld ${cycle.year}`).replace(/\{jaar\}/g, cycle.year.toString()),
        html: htmlContent,
      });

      // Update invitation sent timestamp
      await db
        .update(vkMembershipFeeInvitations)
        .set({ invitationSentAt: new Date(), updatedAt: new Date() })
        .where(eq(vkMembershipFeeInvitations.id, invitationId));

      res.json({ message: "Herinnering verstuurd" });
    } catch (error) {
      console.error("VK resend membership fee invitation error:", error);
      res.status(500).json({ message: "Fout bij versturen herinnering" });
    }
  });

  // Public endpoint: Get payment info by token
  app.get("/api/vk/membership-fee-payment/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      if (!token || token.length !== 64) {
        return res.status(400).json({ message: "Ongeldige betaallink" });
      }

      // Get invitation with cycle and member info
      const [result] = await db
        .select({
          invitation: vkMembershipFeeInvitations,
          cycle: vkMembershipFeeCycles,
          member: vkMembers,
        })
        .from(vkMembershipFeeInvitations)
        .leftJoin(vkMembershipFeeCycles, eq(vkMembershipFeeInvitations.cycleId, vkMembershipFeeCycles.id))
        .leftJoin(vkMembers, eq(vkMembershipFeeInvitations.memberId, vkMembers.id))
        .where(eq(vkMembershipFeeInvitations.token, token))
        .limit(1);

      if (!result || !result.cycle || !result.member) {
        return res.status(404).json({ message: "Betaallink niet gevonden of verlopen" });
      }

      const { invitation, cycle, member } = result;

      // Check if already paid
      if (invitation.status === "paid") {
        return res.json({
          status: "paid",
          message: "Dit lidgeld is al betaald",
          paidAt: invitation.paidAt,
        });
      }

      // Check if cycle is still active
      if (!cycle.isActive) {
        return res.status(400).json({ message: "Deze lidgeldronde is niet meer actief" });
      }

      // Check if deadline has passed and apply penalty if needed
      const now = new Date();
      const dueDate = new Date(cycle.dueDate);
      const isOverdue = now > dueDate;
      
      let amountDue = cycle.baseAmountCents;
      let penaltyApplied = false;

      if (isOverdue && !invitation.penaltyApplied) {
        amountDue = cycle.baseAmountCents + cycle.penaltyAmountCents;
        penaltyApplied = true;

        // Update invitation with penalty
        await db
          .update(vkMembershipFeeInvitations)
          .set({ 
            amountDueCents: amountDue, 
            penaltyApplied: true,
            status: "overdue",
            updatedAt: new Date()
          })
          .where(eq(vkMembershipFeeInvitations.id, invitation.id));
      } else if (invitation.penaltyApplied) {
        amountDue = invitation.amountDueCents;
        penaltyApplied = true;
      }

      res.json({
        status: invitation.status,
        memberName: `${member.firstName} ${member.lastName}`,
        memberEmail: member.email,
        cycleLabel: cycle.label,
        cycleYear: cycle.year,
        baseAmount: cycle.baseAmountCents,
        penaltyAmount: cycle.penaltyAmountCents,
        amountDue,
        penaltyApplied,
        dueDate: cycle.dueDate,
        isOverdue,
      });
    } catch (error) {
      console.error("VK membership fee payment info error:", error);
      res.status(500).json({ message: "Fout bij ophalen betalingsgegevens" });
    }
  });

  // Public endpoint: Create Stripe PaymentIntent for membership fee
  app.post("/api/vk/membership-fee-payment/:token/create-payment-intent", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      if (!token || token.length !== 64) {
        return res.status(400).json({ message: "Ongeldige betaallink" });
      }

      // Get invitation with cycle and member info
      const [result] = await db
        .select({
          invitation: vkMembershipFeeInvitations,
          cycle: vkMembershipFeeCycles,
          member: vkMembers,
        })
        .from(vkMembershipFeeInvitations)
        .leftJoin(vkMembershipFeeCycles, eq(vkMembershipFeeInvitations.cycleId, vkMembershipFeeCycles.id))
        .leftJoin(vkMembers, eq(vkMembershipFeeInvitations.memberId, vkMembers.id))
        .where(eq(vkMembershipFeeInvitations.token, token))
        .limit(1);

      if (!result || !result.cycle || !result.member) {
        return res.status(404).json({ message: "Betaallink niet gevonden of verlopen" });
      }

      const { invitation, cycle, member } = result;

      // Check if already paid
      if (invitation.status === "paid") {
        return res.status(400).json({ message: "Dit lidgeld is al betaald" });
      }

      // Check if cycle is still active
      if (!cycle.isActive) {
        return res.status(400).json({ message: "Deze lidgeldronde is niet meer actief" });
      }

      // Calculate amount (check for penalty)
      const now = new Date();
      const dueDate = new Date(cycle.dueDate);
      const isOverdue = now > dueDate;
      
      let amountDue = invitation.amountDueCents;
      if (isOverdue && !invitation.penaltyApplied) {
        amountDue = cycle.baseAmountCents + cycle.penaltyAmountCents;
        // Update invitation with penalty
        await db
          .update(vkMembershipFeeInvitations)
          .set({ 
            amountDueCents: amountDue, 
            penaltyApplied: true,
            status: "overdue",
            updatedAt: new Date()
          })
          .where(eq(vkMembershipFeeInvitations.id, invitation.id));
      }

      // Get Stripe client
      const stripe = await getUncachableStripeClient();
      const publishableKey = await getStripePublishableKey();

      // Create PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountDue,
        currency: "eur",
        metadata: {
          token: token,
          invitationId: invitation.id.toString(),
          memberId: member.id.toString(),
          cycleId: cycle.id.toString(),
          type: "membership_fee",
        },
        description: `${cycle.label} - ${member.firstName} ${member.lastName}`,
        payment_method_types: ["card", "bancontact", "ideal"],
      });

      // Store PaymentIntent ID in invitation
      await db
        .update(vkMembershipFeeInvitations)
        .set({ 
          stripePaymentIntentId: paymentIntent.id,
          updatedAt: new Date()
        })
        .where(eq(vkMembershipFeeInvitations.id, invitation.id));

      res.json({
        clientSecret: paymentIntent.client_secret,
        publishableKey,
        amount: amountDue,
      });
    } catch (error) {
      console.error("VK create payment intent error:", error);
      res.status(500).json({ message: "Fout bij aanmaken betaling" });
    }
  });

  // Stripe webhook for payment confirmation
  app.post("/api/vk/stripe-webhook", async (req: Request, res: Response) => {
    try {
      const stripe = await getUncachableStripeClient();
      const event = req.body;

      // Handle payment_intent.succeeded event
      if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;
        
        // Check if this is a membership fee payment
        if (paymentIntent.metadata?.type === "membership_fee" && paymentIntent.metadata?.token) {
          const token = paymentIntent.metadata.token;
          const invitationId = parseInt(paymentIntent.metadata.invitationId);

          // Get invitation with cycle
          const [result] = await db
            .select({
              invitation: vkMembershipFeeInvitations,
              cycle: vkMembershipFeeCycles,
            })
            .from(vkMembershipFeeInvitations)
            .leftJoin(vkMembershipFeeCycles, eq(vkMembershipFeeInvitations.cycleId, vkMembershipFeeCycles.id))
            .where(eq(vkMembershipFeeInvitations.id, invitationId))
            .limit(1);

          if (result && result.cycle) {
            // Update invitation as paid
            await db
              .update(vkMembershipFeeInvitations)
              .set({ 
                status: "paid",
                paidAt: new Date(),
                amountPaidCents: paymentIntent.amount,
                updatedAt: new Date()
              })
              .where(eq(vkMembershipFeeInvitations.id, invitationId));

            // Update member's annualFeePaidUntil
            await db
              .update(vkMembers)
              .set({ 
                annualFeePaidUntil: result.cycle.year,
                updatedAt: new Date()
              })
              .where(eq(vkMembers.id, result.invitation.memberId));

            console.log(`VK Membership fee paid: invitation ${invitationId}, amount ${paymentIntent.amount} cents`);
          }
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("VK Stripe webhook error:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // Get Stripe publishable key (public endpoint)
  app.get("/api/vk/stripe-publishable-key", async (req: Request, res: Response) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("VK get Stripe key error:", error);
      res.status(500).json({ message: "Kon Stripe niet initialiseren" });
    }
  });

  // Cancel a membership fee invitation
  app.patch("/api/vk/membership-fee-invitations/:id/cancel", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const invitationId = parseInt(id);

      const [updated] = await db
        .update(vkMembershipFeeInvitations)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(vkMembershipFeeInvitations.id, invitationId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Uitnodiging niet gevonden" });
      }

      res.json({ message: "Uitnodiging geannuleerd", invitation: updated });
    } catch (error) {
      console.error("VK cancel membership fee invitation error:", error);
      res.status(500).json({ message: "Fout bij annuleren uitnodiging" });
    }
  });

  // Manually mark as paid (admin override)
  app.patch("/api/vk/membership-fee-invitations/:id/mark-paid", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const invitationId = parseInt(id);

      // Get invitation to update member record
      const [invitation] = await db
        .select()
        .from(vkMembershipFeeInvitations)
        .leftJoin(vkMembershipFeeCycles, eq(vkMembershipFeeInvitations.cycleId, vkMembershipFeeCycles.id))
        .where(eq(vkMembershipFeeInvitations.id, invitationId))
        .limit(1);

      if (!invitation) {
        return res.status(404).json({ message: "Uitnodiging niet gevonden" });
      }

      // Update invitation
      const [updated] = await db
        .update(vkMembershipFeeInvitations)
        .set({ 
          status: "paid", 
          paidAt: new Date(),
          amountPaidCents: invitation.vk_membership_fee_invitations.amountDueCents,
          updatedAt: new Date() 
        })
        .where(eq(vkMembershipFeeInvitations.id, invitationId))
        .returning();

      // Update member's annualFeePaidUntil
      if (invitation.vk_membership_fee_cycles) {
        await db
          .update(vkMembers)
          .set({ 
            annualFeePaidUntil: invitation.vk_membership_fee_cycles.year,
            updatedAt: new Date()
          })
          .where(eq(vkMembers.id, invitation.vk_membership_fee_invitations.memberId));
      }

      res.json({ message: "Betaling geregistreerd", invitation: updated });
    } catch (error) {
      console.error("VK mark paid membership fee invitation error:", error);
      res.status(500).json({ message: "Fout bij registreren betaling" });
    }
  });
}
