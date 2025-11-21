import { pgTable, text, serial, integer, timestamp, boolean, varchar, date, unique } from "drizzle-orm/pg-core";
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
  splitType: text("split_type", { enum: ["morning", "afternoon"] }),
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
  splitType: z.enum(["morning", "afternoon"]).nullable(),
}).pick({
  userId: true,
  stationId: true,
  date: true,
  type: true,
  startTime: true,
  endTime: true,
  canSplit: true,
  splitType: true,
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

// Verdi integratie tabellen
export const verdiStationConfig = pgTable("verdi_station_config", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull().references(() => stations.id),
  verdiUrl: text("verdi_url"), // Verdi omgeving URL (bijv. https://kempen-staging.verdi.cloud)
  authId: text("auth_id"), // Verdi API authenticatie ID
  authSecret: text("auth_secret"), // Verdi API authenticatie secret
  shiftSheetGuid: text("shift_sheet_guid"), // GuidShiftSheet van Verdi export
  enabled: boolean("enabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const verdiUserMappings = pgTable("verdi_user_mappings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  personGuid: text("person_guid").notNull(), // PersonGuid van Verdi export
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const verdiPositionMappings = pgTable("verdi_position_mappings", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull().references(() => stations.id),
  positionIndex: integer("position_index").notNull(), // 0, 1, 2 voor de 3 posities per shift
  positionGuid: text("position_guid").notNull(), // GuidShiftSheetGroupItem van Verdi export
  requiresLicenseC: boolean("requires_license_c").notNull().default(true), // Of deze functie rijbewijs C vereist
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const verdiSyncLog = pgTable("verdi_sync_log", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").notNull().references(() => shifts.id),
  stationId: integer("station_id").notNull().references(() => stations.id),
  syncStatus: text("sync_status", { enum: ["pending", "success", "error"] }).notNull().default("pending"),
  verdiShiftGuid: text("verdi_shift_guid"), // GUID van de shift in Verdi (uit response)
  errorMessage: text("error_message"),
  warningMessages: text("warning_messages"), // JSON array van warnings
  // Snapshot van shift data voor UPDATE detectie bij opnieuw gegenereerde planningen
  shiftStartTime: timestamp("shift_start_time"), // Kopie van shift.startTime
  shiftEndTime: timestamp("shift_end_time"), // Kopie van shift.endTime
  shiftType: text("shift_type", { enum: ["day", "night"] }), // Kopie van shift.type
  // Split shift metadata voor assignment tracking (voor slimme DELETE/UPDATE)
  isSplitShift: boolean("is_split_shift"), // Kopie van shift.isSplitShift
  splitGroup: integer("split_group"), // Kopie van shift.splitGroup
  splitStartTime: timestamp("split_start_time"), // Kopie van shift.splitStartTime
  splitEndTime: timestamp("split_end_time"), // Kopie van shift.splitEndTime
  assignedUserIds: text("assigned_user_ids"), // JSON array van user IDs die in deze sync zaten
  syncedAt: timestamp("synced_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const verdiShiftRegistry = pgTable("verdi_shift_registry", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull().references(() => stations.id),
  shiftDate: timestamp("shift_date").notNull(), // Datum van de shift
  shiftType: text("shift_type", { enum: ["day", "night"] }).notNull(), // Type shift (dag/nacht)
  splitStartTimeStr: text("split_start_time_str"), // ISO string van split start tijd (of NULL voor niet-split)
  splitEndTimeStr: text("split_end_time_str"), // ISO string van split end tijd (of NULL voor niet-split)
  verdiShiftGuid: text("verdi_shift_guid").notNull(), // Permanente GUID voor deze unieke shift
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  uniqueShiftKey: unique("unique_shift_key").on(
    table.stationId,
    table.shiftDate,
    table.shiftType,
    table.splitStartTimeStr,
    table.splitEndTimeStr
  )
}));

export const insertVerdiStationConfigSchema = createInsertSchema(verdiStationConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type VerdiStationConfig = typeof verdiStationConfig.$inferSelect;
export type InsertVerdiStationConfig = z.infer<typeof insertVerdiStationConfigSchema>;

export const insertVerdiUserMappingSchema = createInsertSchema(verdiUserMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type VerdiUserMapping = typeof verdiUserMappings.$inferSelect;
export type InsertVerdiUserMapping = z.infer<typeof insertVerdiUserMappingSchema>;

export const insertVerdiPositionMappingSchema = createInsertSchema(verdiPositionMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type VerdiPositionMapping = typeof verdiPositionMappings.$inferSelect;
export type InsertVerdiPositionMapping = z.infer<typeof insertVerdiPositionMappingSchema>;

export const insertVerdiSyncLogSchema = createInsertSchema(verdiSyncLog).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type VerdiSyncLog = typeof verdiSyncLog.$inferSelect;
export type InsertVerdiSyncLog = z.infer<typeof insertVerdiSyncLogSchema>;

export const insertVerdiShiftRegistrySchema = createInsertSchema(verdiShiftRegistry).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type VerdiShiftRegistry = typeof verdiShiftRegistry.$inferSelect;
export type InsertVerdiShiftRegistry = z.infer<typeof insertVerdiShiftRegistrySchema>;