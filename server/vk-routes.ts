import type { Express, Request, Response, NextFunction } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { 
  vkAdmins, 
  vkMembershipTypes, 
  vkMembers, 
  vkActivities, 
  vkSubActivities, 
  vkPricing, 
  vkRegistrations, 
  vkRegistrationItems,
  insertVkAdminSchema,
  insertVkMembershipTypeSchema,
  insertVkMemberSchema,
  insertVkActivitySchema,
  insertVkSubActivitySchema,
  insertVkPricingSchema,
  insertVkRegistrationSchema,
  insertVkRegistrationItemSchema
} from "../shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

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

      res.json({
        ...activity,
        subActivities,
        pricing
      });
    } catch (error) {
      console.error("VK activities/:id GET error:", error);
      res.status(500).json({ message: "Fout bij ophalen activiteit" });
    }
  });

  app.post("/api/vk/activities", requireVkAdmin, async (req: Request, res: Response) => {
    try {
      const { name, description, startDate, endDate, registrationDeadline, isActive } = req.body;
      
      if (!name || !startDate) {
        return res.status(400).json({ message: "Naam en startdatum zijn verplicht" });
      }

      const [newActivity] = await db.insert(vkActivities).values({
        name,
        description: description || null,
        startDate: typeof startDate === 'string' ? startDate : new Date(startDate).toISOString().split('T')[0],
        endDate: endDate ? (typeof endDate === 'string' ? endDate : new Date(endDate).toISOString().split('T')[0]) : null,
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

      const [newRegistration] = await db
        .insert(vkRegistrations)
        .values(parsed.data)
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
      const registrationUrl = `${protocol}://${baseUrl}/VriendenkringMol/inschrijven/${activityId}`;

      // Build HTML email template
      const htmlMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Vriendenkring VZW Brandweer Mol</h1>
          </div>
          <div style="padding: 20px; background-color: #f8fafc;">
            <h2 style="color: #1e40af;">${activity.name}</h2>
            <div style="white-space: pre-wrap; margin-bottom: 20px;">${message}</div>
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
        </div>
      `;

      // Send emails
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (const member of filteredMembers) {
        try {
          await transporter.sendMail({
            from: `"Vriendenkring Mol" <${gmailUser}>`,
            to: member.email!,
            subject: subject,
            html: htmlMessage,
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
}
