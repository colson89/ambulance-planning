import { pgTable, text, serial, integer, timestamp, boolean, varchar } from "drizzle-orm/pg-core";
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
  hours: integer("hours").notNull().default(24)
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
  splitGroup: integer("split_group"),
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
  hours: true
});

export const insertShiftSchema = createInsertSchema(shifts);

export const insertShiftPreferenceSchema = createInsertSchema(shiftPreferences, {
  type: z.enum(["day", "night", "unavailable"]),
  date: z.coerce.date(),
  startTime: z.coerce.date().nullable(),
  endTime: z.coerce.date().nullable(),
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

// Instellingen voor systeeminformatie
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Weekdag configuratie voor shift generatie
export const weekdayConfigs = pgTable("weekday_configs", {
  id: serial("id").primaryKey(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
  enableDayShifts: boolean("enable_day_shifts").notNull().default(false),
  enableNightShifts: boolean("enable_night_shifts").notNull().default(true),
  dayShiftCount: integer("day_shift_count").notNull().default(2),
  nightShiftCount: integer("night_shift_count").notNull().default(2),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertWeekdayConfigSchema = createInsertSchema(weekdayConfigs);
export type WeekdayConfig = typeof weekdayConfigs.$inferSelect;
export type InsertWeekdayConfig = z.infer<typeof insertWeekdayConfigSchema>;