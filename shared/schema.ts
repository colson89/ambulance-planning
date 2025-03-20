import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role", { enum: ["admin", "ambulancier"] }).notNull().default("ambulancier"),
  isAdmin: boolean("is_admin").notNull().default(false),
  minHours: integer("min_hours").notNull().default(24),
  maxHours: integer("max_hours").notNull().default(40),
  preferredHours: integer("preferred_hours").notNull().default(32)
});

export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  type: text("type").notNull() // day, night, etc
});

// Schema voor het aanmaken van een nieuwe gebruiker
export const insertUserSchema = createInsertSchema(users, {
  firstName: z.string().min(1, "Voornaam is verplicht"),
  lastName: z.string().min(1, "Achternaam is verplicht"),
  role: z.enum(["admin", "ambulancier"]),
}).pick({
  username: true,
  password: true,
  firstName: true,
  lastName: true,
  role: true,
  isAdmin: true,
  minHours: true,
  maxHours: true,
  preferredHours: true
});

export const insertShiftSchema = createInsertSchema(shifts);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Shift = typeof shifts.$inferSelect;