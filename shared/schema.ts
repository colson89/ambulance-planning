import { pgTable, text, serial, integer, timestamp, boolean, varchar, date, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Brandweerposten tabel
export const stations = pgTable("stations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(), // bijv. "westerlo", "mol"
  displayName: text("display_name").notNull(), // bijv. "ZW Westerlo", "ZW Mol"
  address: text("address"), // Station adres voor kalender integratie
  isSupervisorStation: boolean("is_supervisor_station").notNull().default(false), // Max 1 supervisor station toegestaan
  kioskToken: text("kiosk_token").unique(),
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
  phoneNumber: text("phone_number"), // GSM nummer (optioneel)
  profilePhotoUrl: text("profile_photo_url"), // Profielfoto URL (optioneel)
  role: text("role", { enum: ["admin", "ambulancier", "supervisor", "viewer"] }).notNull().default("ambulancier"),
  isAdmin: boolean("is_admin").notNull().default(false),
  isProfessional: boolean("is_professional").notNull().default(false), // Beroepspersoneel - max 1 shift per week
  hasDrivingLicenseC: boolean("has_driving_license_c").notNull().default(true), // Rijbewijs C - minimaal 1 per shift vereist
  hours: integer("hours").notNull().default(24),
  stationId: integer("station_id").notNull().references(() => stations.id),
  calendarOffset: integer("calendar_offset").notNull().default(0), // Tijdzone offset in minuten voor kalender sync (-120 tot +120)
  kioskToken: text("kiosk_token").unique(), // Unieke token voor kiosk/display modus (alleen voor viewers)
  shiftReminderHours: integer("shift_reminder_hours").notNull().default(12), // Hoeveel uur voor shift een herinnering sturen
  darkMode: boolean("dark_mode").notNull().default(false) // Donkere modus voorkeur
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
  isEmergencyScheduling: boolean("is_emergency_scheduling").notNull().default(false), // Noodinplanning indicator
  emergencyReason: text("emergency_reason"), // Verplichte reden bij noodinplanning
  emergencyScheduledBy: integer("emergency_scheduled_by"), // User ID van supervisor die noodinplanning deed
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
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
  role: z.enum(["admin", "ambulancier", "supervisor", "viewer"]),
  phoneNumber: z.string().max(20, "Telefoonnummer mag maximaal 20 karakters bevatten").regex(/^[+\d\s()-]*$/, "Telefoonnummer mag alleen cijfers, spaties en +()- bevatten").optional().or(z.literal("")),
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
  stationId: true,
  phoneNumber: true
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
  emergencyPersonGuid1: text("emergency_person_guid_1"), // Nood PersonGUID 1 voor noodinplanning (personen van andere stations)
  emergencyPersonGuid2: text("emergency_person_guid_2"), // Nood PersonGUID 2 voor noodinplanning (tweede ambulancier van ander station)
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
  shiftId: integer("shift_id").references(() => shifts.id), // Nullable om planning regeneratie toe te staan
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
  splitStartTimeStr: text("split_start_time_str").notNull(), // ISO string van split start tijd (of '__UNSPLIT__' voor niet-split)
  splitEndTimeStr: text("split_end_time_str").notNull(), // ISO string van split end tijd (of '__UNSPLIT__' voor niet-split)
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

// Push Notification Subscriptions
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  // Notification preferences
  notifyNewPlanningPublished: boolean("notify_new_planning_published").notNull().default(false),
  notifyMyShiftChanged: boolean("notify_my_shift_changed").notNull().default(false),
  notifyAvailabilityDeadline: boolean("notify_availability_deadline").notNull().default(true),
  notifyShiftSwapUpdates: boolean("notify_shift_swap_updates").notNull().default(true), // Ruilverzoek updates
  notifyBidUpdates: boolean("notify_bid_updates").notNull().default(true), // Bieding updates
  notifyOpenSwapRequests: boolean("notify_open_swap_requests").notNull().default(true), // Open wissel verzoeken van collega's
  deadlineWarningDays: integer("deadline_warning_days").notNull().default(3), // Hoeveel dagen van tevoren waarschuwen
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;

// Station-specifieke notificatie voorkeuren voor cross-team users en supervisors
export const userStationNotificationPreferences = pgTable("user_station_notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stationId: integer("station_id").notNull().references(() => stations.id, { onDelete: "cascade" }),
  notifyNewPlanningPublished: boolean("notify_new_planning_published").notNull().default(true),
  notifyShiftSwapUpdates: boolean("notify_shift_swap_updates").notNull().default(true),
  notifyBidUpdates: boolean("notify_bid_updates").notNull().default(true),
  notifyOpenSwapRequests: boolean("notify_open_swap_requests").notNull().default(true),
  notifyShiftReminders: boolean("notify_shift_reminders").notNull().default(true), // Shift herinnering per station
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  userStationUnique: unique().on(table.userId, table.stationId)
}));

export const insertUserStationNotificationPreferenceSchema = createInsertSchema(userStationNotificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type UserStationNotificationPreference = typeof userStationNotificationPreferences.$inferSelect;
export type InsertUserStationNotificationPreference = z.infer<typeof insertUserStationNotificationPreferenceSchema>;

// Reportage Personeelsdienst - Configuratie
export const reportageConfig = pgTable("reportage_config", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  daysAfterMonthEnd: integer("days_after_month_end").notNull().default(5),
  emailSubject: text("email_subject").notNull().default("Maandelijkse Shift Rapportage - {maand} {jaar}"),
  emailBody: text("email_body").notNull().default("Beste,\n\nIn bijlage vindt u de maandelijkse shift rapportage voor alle stations.\n\nMet vriendelijke groeten,\nPlanning BWZK"),
  lastSentMonth: integer("last_sent_month"),
  lastSentYear: integer("last_sent_year"),
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port").default(587),
  smtpUser: text("smtp_user"),
  smtpPassword: text("smtp_password"),
  smtpFromAddress: text("smtp_from_address"),
  smtpFromName: text("smtp_from_name").default("Planning BWZK"),
  smtpSecure: boolean("smtp_secure").default(false),
  smtpVerified: boolean("smtp_verified").default(false),
  smtpVerifiedAt: timestamp("smtp_verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Reportage ontvangers (email adressen)
export const reportageRecipients = pgTable("reportage_recipients", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Reportage verzendlog
export const reportageLogs = pgTable("reportage_logs", {
  id: serial("id").primaryKey(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  recipientCount: integer("recipient_count").notNull(),
  status: text("status", { enum: ["success", "partial", "failed"] }).notNull(),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertReportageConfigSchema = createInsertSchema(reportageConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type ReportageConfig = typeof reportageConfig.$inferSelect;
export type InsertReportageConfig = z.infer<typeof insertReportageConfigSchema>;

export const insertReportageRecipientSchema = createInsertSchema(reportageRecipients).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type ReportageRecipient = typeof reportageRecipients.$inferSelect;
export type InsertReportageRecipient = z.infer<typeof insertReportageRecipientSchema>;

export type ReportageLog = typeof reportageLogs.$inferSelect;

// Welkomstmail configuratie voor nieuwe gebruikers
export const welcomeEmailConfig = pgTable("welcome_email_config", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  emailSubject: text("email_subject").notNull().default("Welkom bij Planning BWZK - Uw account gegevens"),
  emailBody: text("email_body").notNull().default(
    "Beste {voornaam},\n\n" +
    "Er is een account voor u aangemaakt in het Planning systeem van Brandweerzone Kempen.\n\n" +
    "Uw inloggegevens:\n" +
    "Gebruikersnaam: {gebruikersnaam}\n" +
    "Wachtwoord: {wachtwoord}\n\n" +
    "⚠️ BELANGRIJK: Wijzig uw wachtwoord direct na de eerste keer inloggen!\n\n" +
    "U kunt inloggen via: {loginUrl}\n\n" +
    "Met vriendelijke groeten,\n" +
    "Planning BWZK"
  ),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertWelcomeEmailConfigSchema = createInsertSchema(welcomeEmailConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type WelcomeEmailConfig = typeof welcomeEmailConfig.$inferSelect;
export type InsertWelcomeEmailConfig = z.infer<typeof insertWelcomeEmailConfigSchema>;

// Overuren registratie
export const overtime = pgTable("overtime", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  shiftId: integer("shift_id").notNull().references(() => shifts.id),
  stationId: integer("station_id").notNull().references(() => stations.id),
  date: timestamp("date").notNull(),
  startTime: timestamp("start_time").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  reason: text("reason").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertOvertimeSchema = createInsertSchema(overtime, {
  date: z.coerce.date(),
  startTime: z.coerce.date(),
  durationMinutes: z.number().min(1, "Duur moet minimaal 1 minuut zijn"),
  reason: z.string().min(1, "Reden is verplicht"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type Overtime = typeof overtime.$inferSelect;
export type InsertOvertime = z.infer<typeof insertOvertimeSchema>;

// Activiteitenlogs voor audit trail
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'set null' }),
  stationId: integer("station_id").references(() => stations.id),
  action: text("action").notNull(),
  category: text("category").notNull(),
  details: text("details"),
  targetUserId: integer("target_user_id").references(() => users.id, { onDelete: 'set null' }),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  deviceType: text("device_type"),
  deviceOS: text("device_os"),
  location: text("location"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// Station instellingen (per station configureerbare features)
export const stationSettings = pgTable("station_settings", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull().references(() => stations.id).unique(),
  allowShiftSwaps: boolean("allow_shift_swaps").notNull().default(false), // Of shift ruilen is toegestaan
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertStationSettingsSchema = createInsertSchema(stationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type StationSettings = typeof stationSettings.$inferSelect;
export type InsertStationSettings = z.infer<typeof insertStationSettingsSchema>;

// Shift ruil verzoeken
export const shiftSwapRequests = pgTable("shift_swap_requests", {
  id: serial("id").primaryKey(),
  // Aanvrager info
  requesterId: integer("requester_id").notNull().references(() => users.id),
  requesterShiftId: integer("requester_shift_id").notNull().references(() => shifts.id),
  // Snapshot van aanvrager shift (voor historie, zelfs nadat shift gewijzigd/verwijderd is)
  requesterShiftDate: timestamp("requester_shift_date"),
  requesterShiftType: text("requester_shift_type"),
  // Doelcollega info (wie de shift overneemt) - nullable voor open verzoeken
  targetUserId: integer("target_user_id").references(() => users.id),
  targetShiftId: integer("target_shift_id").references(() => shifts.id), // Optioneel: als ze ook ruilen
  // Snapshot van target shift (voor ruilen)
  targetShiftDate: timestamp("target_shift_date"),
  targetShiftType: text("target_shift_type"),
  // Station (voor filtering)
  stationId: integer("station_id").notNull().references(() => stations.id),
  // Open wissel verzoek velden
  isOpen: boolean("is_open").notNull().default(false), // Is dit een open verzoek (iedereen kan reageren)
  acceptedOfferId: integer("accepted_offer_id"), // Welke aanbieding is geaccepteerd (FK naar shiftSwapOffers)
  // Status workflow: pending -> accepted_by_target -> approved/rejected
  // Voor open verzoeken: open -> offer_selected -> approved/rejected
  status: text("status", { 
    enum: ["pending", "accepted_by_target", "approved", "rejected", "cancelled", "open", "offer_selected"] 
  }).notNull().default("pending"),
  // Optionele notities
  requesterNote: text("requester_note"),
  adminNote: text("admin_note"),
  // Wie heeft goedgekeurd/afgewezen
  reviewedById: integer("reviewed_by_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertShiftSwapRequestSchema = createInsertSchema(shiftSwapRequests, {
  requesterNote: z.string().max(500, "Notitie mag maximaal 500 karakters bevatten").optional(),
  adminNote: z.string().max(500, "Notitie mag maximaal 500 karakters bevatten").optional()
}).omit({
  id: true,
  status: true,
  reviewedById: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true
});
export type ShiftSwapRequest = typeof shiftSwapRequests.$inferSelect;
export type InsertShiftSwapRequest = z.infer<typeof insertShiftSwapRequestSchema>;

// Open wissel aanbiedingen - collega's kunnen reageren op open swap requests
export const shiftSwapOffers = pgTable("shift_swap_offers", {
  id: serial("id").primaryKey(),
  // Welk open verzoek
  swapRequestId: integer("swap_request_id").notNull().references(() => shiftSwapRequests.id, { onDelete: 'cascade' }),
  // Wie doet de aanbieding
  offererId: integer("offerer_id").notNull().references(() => users.id),
  // Welke shift bieden ze aan (null = alleen overnemen, geen ruil)
  offererShiftId: integer("offerer_shift_id").references(() => shifts.id),
  // Snapshot van de aangeboden shift (voor historie)
  offererShiftDate: timestamp("offerer_shift_date"),
  offererShiftType: text("offerer_shift_type"),
  // Status: pending -> accepted/rejected/withdrawn
  status: text("status", { 
    enum: ["pending", "accepted", "rejected", "withdrawn"] 
  }).notNull().default("pending"),
  // Optionele notitie
  note: text("note"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertShiftSwapOfferSchema = createInsertSchema(shiftSwapOffers, {
  note: z.string().max(500, "Notitie mag maximaal 500 karakters bevatten").optional(),
  offererShiftId: z.number().nullable().optional(),
  offererShiftDate: z.coerce.date().nullable().optional(),
  offererShiftType: z.string().nullable().optional()
}).omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true
});
export type ShiftSwapOffer = typeof shiftSwapOffers.$inferSelect;
export type InsertShiftSwapOffer = z.infer<typeof insertShiftSwapOfferSchema>;

// Shift biedingen - medewerkers kunnen bieden op open shifts
export const shiftBids = pgTable("shift_bids", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").notNull().references(() => shifts.id),
  userId: integer("user_id").notNull().references(() => users.id),
  stationId: integer("station_id").notNull().references(() => stations.id),
  status: text("status", { 
    enum: ["pending", "accepted", "rejected", "withdrawn"] 
  }).notNull().default("pending"),
  note: text("note"), // Optionele notitie van de bieder
  reviewedById: integer("reviewed_by_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertShiftBidSchema = createInsertSchema(shiftBids, {
  note: z.string().max(500, "Notitie mag maximaal 500 karakters bevatten").optional()
}).omit({
  id: true,
  status: true,
  reviewedById: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true
});
export type ShiftBid = typeof shiftBids.$inferSelect;
export type InsertShiftBid = z.infer<typeof insertShiftBidSchema>;

// Undo Historie - voor ongedaan maken van planning en gebruikersbeheer wijzigingen
export const undoHistory = pgTable("undo_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  stationId: integer("station_id").notNull().references(() => stations.id),
  entityType: text("entity_type", { 
    enum: [
      // Shift gerelateerde types
      "shift", "shift_assignment", "shift_delete", "planning_generate", "planning_delete",
      // Shift swap types
      "shift_swap",
      // Gebruikersbeheer types
      "user_create", "user_update", "user_delete", "user_station_add", "user_station_remove"
    ] 
  }).notNull(),
  entityId: integer("entity_id"),
  action: text("action").notNull(),
  description: text("description").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  isUndone: boolean("is_undone").notNull().default(false),
  undoneAt: timestamp("undone_at"),
  undoneById: integer("undone_by_id").references(() => users.id, { onDelete: 'set null' }),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertUndoHistorySchema = createInsertSchema(undoHistory).omit({
  id: true,
  isUndone: true,
  undoneAt: true,
  undoneById: true,
  createdAt: true
});
export type UndoHistory = typeof undoHistory.$inferSelect;
export type InsertUndoHistory = z.infer<typeof insertUndoHistorySchema>;

// Password Reset Tokens - voor wachtwoord vergeten functionaliteit
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  usedAt: timestamp("used_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow()
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Custom Push Notifications - door admins/supervisors verstuurde meldingen
export const customNotifications = pgTable("custom_notifications", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  stationId: integer("station_id").notNull().references(() => stations.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertCustomNotificationSchema = createInsertSchema(customNotifications).omit({
  id: true,
  createdAt: true
});
export type CustomNotification = typeof customNotifications.$inferSelect;
export type InsertCustomNotification = z.infer<typeof insertCustomNotificationSchema>;

// Custom Notification Recipients - wie heeft de melding ontvangen
export const customNotificationRecipients = pgTable("custom_notification_recipients", {
  id: serial("id").primaryKey(),
  notificationId: integer("notification_id").notNull().references(() => customNotifications.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  deliveryStatus: text("delivery_status", { 
    enum: ["pending", "sent", "failed", "no_subscription"] 
  }).notNull().default("pending"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at")
});

export const insertCustomNotificationRecipientSchema = createInsertSchema(customNotificationRecipients).omit({
  id: true,
  sentAt: true
});
export type CustomNotificationRecipient = typeof customNotificationRecipients.$inferSelect;
export type InsertCustomNotificationRecipient = z.infer<typeof insertCustomNotificationRecipientSchema>;

// Planning Periods - houdt publicatie status bij per maand/station
export const planningPeriods = pgTable("planning_periods", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull().references(() => stations.id, { onDelete: 'cascade' }),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  publishedById: integer("published_by_id").references(() => users.id, { onDelete: 'set null' }),
  generatedAt: timestamp("generated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  uniqueStationMonthYear: unique().on(table.stationId, table.month, table.year)
}));

export const insertPlanningPeriodSchema = createInsertSchema(planningPeriods).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type PlanningPeriod = typeof planningPeriods.$inferSelect;
export type InsertPlanningPeriod = z.infer<typeof insertPlanningPeriodSchema>;

// Azure AD Configuration - globale configuratie voor Microsoft/Azure AD login
export const azureAdConfig = pgTable("azure_ad_config", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  tenantId: text("tenant_id"), // Azure AD Tenant ID (Directory ID)
  clientId: text("client_id"), // Application (Client) ID
  clientSecretEncrypted: text("client_secret_encrypted"), // Encrypted Client Secret
  redirectUri: text("redirect_uri"), // OAuth Redirect URI
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertAzureAdConfigSchema = createInsertSchema(azureAdConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type AzureAdConfig = typeof azureAdConfig.$inferSelect;
export type InsertAzureAdConfig = z.infer<typeof insertAzureAdConfigSchema>;

// Shift Assignment Explanations - Legt uit waarom een shift is toegewezen of open is
export const shiftAssignmentExplanations = pgTable("shift_assignment_explanations", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").notNull().references(() => shifts.id, { onDelete: 'cascade' }),
  stationId: integer("station_id").notNull().references(() => stations.id, { onDelete: 'cascade' }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  assignedUserId: integer("assigned_user_id"), // null als shift open is
  explanationType: text("explanation_type", { enum: ["assigned", "open"] }).notNull(),
  primaryReason: text("primary_reason").notNull(), // Hoofdreden in leesbare tekst
  assignedUserPreference: text("assigned_user_preference"), // "volunteered" | "auto-assigned" | null
  assignedUserHoursAtAssignment: integer("assigned_user_hours_at_assignment"), // Hoeveel uren had deze user al
  assignedUserTargetHours: integer("assigned_user_target_hours"), // Doeluren van de user
  assignedUserCandidateDays: integer("assigned_user_candidate_days"), // Aantal kandidaat-dagen in maand
  candidatesConsidered: text("candidates_considered"), // JSON array van candidate objects
  rejectedCandidates: text("rejected_candidates"), // JSON array van afgewezen kandidaten met redenen
  constraintsApplied: text("constraints_applied"), // JSON array van toegepaste constraints
  fairnessMetrics: text("fairness_metrics"), // JSON object met fairness scores
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertShiftAssignmentExplanationSchema = createInsertSchema(shiftAssignmentExplanations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type ShiftAssignmentExplanation = typeof shiftAssignmentExplanations.$inferSelect;
export type InsertShiftAssignmentExplanation = z.infer<typeof insertShiftAssignmentExplanationSchema>;

// ============================================
// VRIENDENKRING MOL MODULE - Aparte ledenbeheer en activiteitensysteem
// ============================================

// VK Admins - Aparte admin accounts voor Vriendenkring (los van ambulance systeem)
export const vkAdmins = pgTable("vk_admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertVkAdminSchema = createInsertSchema(vkAdmins, {
  username: z.string().min(3, "Gebruikersnaam moet minstens 3 karakters zijn"),
  password: z.string().min(6, "Wachtwoord moet minstens 6 karakters zijn"),
  firstName: z.string().min(1, "Voornaam is verplicht"),
  lastName: z.string().min(1, "Achternaam is verplicht"),
  email: z.string().email("Ongeldig email adres").optional()
}).omit({ id: true, createdAt: true, updatedAt: true });
export type VkAdmin = typeof vkAdmins.$inferSelect;
export type InsertVkAdmin = z.infer<typeof insertVkAdminSchema>;

// VK Lidmaatschapstypes - Lid VZW, Niet Lid VZW, Genodigde, Weduwe, etc.
export const vkMembershipTypes = pgTable("vk_membership_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // bijv. "Lid VZW", "Niet Lid VZW", "Genodigde", "Weduwe"
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertVkMembershipTypeSchema = createInsertSchema(vkMembershipTypes).omit({ id: true, createdAt: true });
export type VkMembershipType = typeof vkMembershipTypes.$inferSelect;
export type InsertVkMembershipType = z.infer<typeof insertVkMembershipTypeSchema>;

// VK Leden - Leden van de vriendenkring
export const vkMembers = pgTable("vk_members", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phoneNumber: text("phone_number"),
  membershipTypeId: integer("membership_type_id").notNull().references(() => vkMembershipTypes.id),
  memberSince: date("member_since"),
  annualFeePaidUntil: integer("annual_fee_paid_until"), // Jaar tot wanneer lidgeld betaald is
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  stripeCustomerId: text("stripe_customer_id"), // Koppeling met Stripe
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertVkMemberSchema = createInsertSchema(vkMembers, {
  firstName: z.string().min(1, "Voornaam is verplicht"),
  lastName: z.string().min(1, "Achternaam is verplicht"),
  email: z.string().email("Ongeldig email adres")
}).omit({ id: true, createdAt: true, updatedAt: true });
export type VkMember = typeof vkMembers.$inferSelect;
export type InsertVkMember = z.infer<typeof insertVkMemberSchema>;

// VK Activiteiten - Hoofdactiviteiten zoals Sint Barbara
export const vkActivities = pgTable("vk_activities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // bijv. "Sint Barbara 2025"
  description: text("description"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  registrationDeadline: date("registration_deadline"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertVkActivitySchema = createInsertSchema(vkActivities, {
  name: z.string().min(1, "Naam is verplicht"),
  startDate: z.coerce.date()
}).omit({ id: true, createdAt: true, updatedAt: true });
export type VkActivity = typeof vkActivities.$inferSelect;
export type InsertVkActivity = z.infer<typeof insertVkActivitySchema>;

// VK Deelactiviteiten - Onderdelen van een activiteit (ontbijt, avondfeest, etc.)
export const vkSubActivities = pgTable("vk_sub_activities", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull().references(() => vkActivities.id, { onDelete: 'cascade' }),
  name: text("name").notNull(), // bijv. "Avondfeest", "Ontbijt", "Worstenbroden"
  description: text("description"),
  date: date("date"), // Datum van deze deelactiviteit
  time: text("time"), // Tijdstip als tekst (bijv. "19:00")
  maxParticipants: integer("max_participants"), // Optioneel max aantal
  allowQuantity: boolean("allow_quantity").notNull().default(true), // Mag men aantal opgeven?
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertVkSubActivitySchema = createInsertSchema(vkSubActivities).omit({ id: true, createdAt: true });
export type VkSubActivity = typeof vkSubActivities.$inferSelect;
export type InsertVkSubActivity = z.infer<typeof insertVkSubActivitySchema>;

// VK Prijzen - Prijzen per deelactiviteit per lidmaatschapstype
export const vkPricing = pgTable("vk_pricing", {
  id: serial("id").primaryKey(),
  subActivityId: integer("sub_activity_id").notNull().references(() => vkSubActivities.id, { onDelete: 'cascade' }),
  membershipTypeId: integer("membership_type_id").notNull().references(() => vkMembershipTypes.id),
  pricePerUnit: integer("price_per_unit").notNull(), // Prijs in eurocent
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  uniqueSubActivityMembershipType: unique().on(table.subActivityId, table.membershipTypeId)
}));

export const insertVkPricingSchema = createInsertSchema(vkPricing).omit({ id: true, createdAt: true });
export type VkPricing = typeof vkPricing.$inferSelect;
export type InsertVkPricing = z.infer<typeof insertVkPricingSchema>;

// VK Inschrijvingen - Registraties voor activiteiten
export const vkRegistrations = pgTable("vk_registrations", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull().references(() => vkActivities.id),
  memberId: integer("member_id").references(() => vkMembers.id), // Optioneel - kan ook gastregistratie zijn
  name: text("name").notNull(), // Naam van inschrijver
  email: text("email").notNull(),
  membershipTypeId: integer("membership_type_id").notNull().references(() => vkMembershipTypes.id),
  totalAmount: integer("total_amount").notNull(), // Totaalbedrag in eurocent
  paymentStatus: text("payment_status", { enum: ["pending", "paid", "failed", "refunded"] }).notNull().default("pending"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  tableAssignment: text("table_assignment"), // Tafelindeling
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertVkRegistrationSchema = createInsertSchema(vkRegistrations).omit({ id: true, createdAt: true, updatedAt: true });
export type VkRegistration = typeof vkRegistrations.$inferSelect;
export type InsertVkRegistration = z.infer<typeof insertVkRegistrationSchema>;

// VK Inschrijvingsitems - Geselecteerde deelactiviteiten per inschrijving
export const vkRegistrationItems = pgTable("vk_registration_items", {
  id: serial("id").primaryKey(),
  registrationId: integer("registration_id").notNull().references(() => vkRegistrations.id, { onDelete: 'cascade' }),
  subActivityId: integer("sub_activity_id").notNull().references(() => vkSubActivities.id),
  quantity: integer("quantity").notNull().default(1),
  pricePerUnit: integer("price_per_unit").notNull(), // Prijs op moment van registratie (in eurocent)
  subtotal: integer("subtotal").notNull(), // quantity * pricePerUnit
  notes: text("notes"), // bijv. "Spek met brood" voor ontbijt keuze
  createdAt: timestamp("created_at").defaultNow()
});

export const insertVkRegistrationItemSchema = createInsertSchema(vkRegistrationItems).omit({ id: true, createdAt: true });
export type VkRegistrationItem = typeof vkRegistrationItems.$inferSelect;
export type InsertVkRegistrationItem = z.infer<typeof insertVkRegistrationItemSchema>;

// VK Uitnodigingen - Tracking van verstuurde uitnodigingsmails
export const vkInvitations = pgTable("vk_invitations", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull().references(() => vkActivities.id, { onDelete: 'cascade' }),
  memberId: integer("member_id").notNull().references(() => vkMembers.id, { onDelete: 'cascade' }),
  trackingToken: text("tracking_token").notNull().unique(), // Unieke token voor tracking pixel
  email: text("email").notNull(), // E-mail adres op moment van verzenden
  subject: text("subject").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  openedAt: timestamp("opened_at"), // Null = niet geopend, timestamp = wanneer geopend
  openCount: integer("open_count").notNull().default(0), // Aantal keer geopend
});

export const insertVkInvitationSchema = createInsertSchema(vkInvitations).omit({ id: true, sentAt: true, openedAt: true, openCount: true });
export type VkInvitation = typeof vkInvitations.$inferSelect;
export type InsertVkInvitation = z.infer<typeof insertVkInvitationSchema>;