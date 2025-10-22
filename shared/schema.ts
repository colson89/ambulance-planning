import { pgTable, text, serial, integer, timestamp, boolean, varchar, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Brandweerposten tabel
export const stations = pgTable("stations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(), // bijv. "westerlo", "mol"
  displayName: text("display_name").notNull(), // bijv. "ZW Westerlo", "ZW Mol"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"), // Email optioneel voor bestaande gebruikers
  role: text("role", { enum: ["admin", "ambulancier", "supervisor"] }).notNull().default("ambulancier"),
  isAdmin: boolean("is_admin").notNull().default(false),
  isProfessional: boolean("is_professional").notNull().default(false), // Beroepspersoneel - max 1 shift per week
  hasDrivingLicenseC: boolean("has_driving_license_c").notNull().default(true), // Rijbewijs C - minimaal 1 per shift vereist
  hours: integer("hours").notNull().default(24),
  stationId: integer("station_id").notNull().references(() => stations.id)
});

export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  stationId: integer("station_id").notNull().references(() => stations.id),
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
  stationId: integer("station_id").notNull().references(() => stations.id),
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
  email: z.string().email("Ongeldig email adres").optional(),
  role: z.enum(["admin", "ambulancier", "supervisor"]),
}).pick({
  username: true,
  password: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  isAdmin: true,
  isProfessional: true,
  hasDrivingLicenseC: true,
  hours: true,
  stationId: true
});

export const insertShiftSchema = createInsertSchema(shifts);

export const insertShiftPreferenceSchema = createInsertSchema(shiftPreferences, {
  type: z.enum(["day", "night", "unavailable"]),
  date: z.coerce.date(),
  startTime: z.coerce.date().nullable(),
  endTime: z.coerce.date().nullable(),
}).pick({
  userId: true,
  stationId: true,
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
  stationId: integer("station_id").notNull().references(() => stations.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
  enableDayShifts: boolean("enable_day_shifts").notNull().default(false),
  enableNightShifts: boolean("enable_night_shifts").notNull().default(true),
  dayShiftCount: integer("day_shift_count").notNull().default(2),
  nightShiftCount: integer("night_shift_count").notNull().default(2),
  allowSplitShifts: boolean("allow_split_shifts").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Junction table voor multi-station toegang
export const userStations = pgTable("user_stations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  stationId: integer("station_id").notNull().references(() => stations.id),
  maxHours: integer("max_hours").notNull().default(24), // Maximum uren per maand voor dit station
  createdAt: timestamp("created_at").defaultNow()
});

export const userComments = pgTable("user_comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  stationId: integer("station_id").notNull().references(() => stations.id),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Feestdagen tabel voor België
export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // bijv. "Nieuwjaar", "Paasmaandag"
  date: date("date").notNull(), // Specifieke datum van feestdag
  year: integer("year").notNull(), // Jaar voor deze feestdag
  isFixed: boolean("is_fixed").notNull().default(true), // Vaste datum (zoals Kerstmis) of variabel (zoals Pasen)
  stationId: integer("station_id").references(() => stations.id), // Optional: station-specifieke feestdagen
  isActive: boolean("is_active").notNull().default(true), // Kunnen admins uit-/inschakelen
  category: text("category", { enum: ["national", "regional", "custom"] }).notNull().default("national"),
  description: text("description"), // Optionele beschrijving
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertWeekdayConfigSchema = createInsertSchema(weekdayConfigs);
export type WeekdayConfig = typeof weekdayConfigs.$inferSelect;
export type InsertWeekdayConfig = z.infer<typeof insertWeekdayConfigSchema>;

export const insertUserCommentSchema = createInsertSchema(userComments, {
  comment: z.string().min(1, "Opmerking mag niet leeg zijn").max(1000, "Opmerking mag maximaal 1000 karakters bevatten")
});
export type UserComment = typeof userComments.$inferSelect;
export type InsertUserComment = z.infer<typeof insertUserCommentSchema>;

// Holiday types
export const insertHolidaySchema = createInsertSchema(holidays, {
  name: z.string().min(1, "Naam van feestdag is verplicht"),
  date: z.coerce.date(), // ← Coerce string to date
  year: z.number().min(2020).max(2050),
  category: z.enum(["national", "regional", "custom"])
}).omit({ id: true, createdAt: true, updatedAt: true });
export type Holiday = typeof holidays.$inferSelect;
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;

// Station types
export const insertStationSchema = createInsertSchema(stations);
export type Station = typeof stations.$inferSelect;
export type InsertStation = z.infer<typeof insertStationSchema>;

// User Stations types (cross-team functionality)
export const insertUserStationSchema = createInsertSchema(userStations, {
  maxHours: z.number().min(1, "Maximum uren moet minimaal 1 zijn").max(160, "Maximum uren mag niet meer dan 160 zijn per maand")
}).omit({ id: true, createdAt: true });
export type UserStation = typeof userStations.$inferSelect;
export type InsertUserStation = z.infer<typeof insertUserStationSchema>;

// Calendar tokens tabel voor veilige kalender feeds
export const calendarTokens = pgTable("calendar_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  token: text("token").notNull().unique(), // Unieke, willekeurige token voor kalender feed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertCalendarTokenSchema = createInsertSchema(calendarTokens).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type CalendarToken = typeof calendarTokens.$inferSelect;
export type InsertCalendarToken = z.infer<typeof insertCalendarTokenSchema>;