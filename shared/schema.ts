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
  type: text("type", { enum: ["day", "night"] }).notNull(),
  status: text("status", { enum: ["planned", "open"] }).notNull().default("open"),
  isSplitShift: boolean("is_split_shift").notNull().default(false),
  splitStartTime: timestamp("split_start_time"),
  splitEndTime: timestamp("split_end_time"),
  month: integer("month").notNull(),
  year: integer("year").notNull()
});

export const shiftPreferences = pgTable("shift_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull(),
  type: text("type", { enum: ["day", "night", "unavailable"] }).notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  canSplit: boolean("can_split").notNull().default(false),
  notes: text("notes")
});

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

export const insertShiftPreferenceSchema = createInsertSchema(shiftPreferences, {
  type: z.enum(["day", "night", "unavailable"]),
}).pick({
  userId: true,
  date: true,
  type: true,
  startTime: true,
  endTime: true,
  canSplit: true,
  month: true,
  year: true,
  notes: true
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Shift = typeof shifts.$inferSelect;
export type ShiftPreference = typeof shiftPreferences.$inferSelect;
export type InsertShiftPreference = z.infer<typeof insertShiftPreferenceSchema>;