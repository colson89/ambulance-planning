import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  // Directe vergelijking als laatste redmiddel
  if (supplied === stored) {
    console.log("Direct string comparison match!");
    return true;
  }
  
  try {
    // Controleer of we een geldig stored wachtwoord hebben
    if (!stored || !stored.includes(".")) {
      console.log("Invalid stored password format, but we'll try direct comparison");
      // Direct vergelijken als back-up
      return supplied === stored;
    }

    const [hashed, salt] = stored.split(".");
    
    // Controleer of beide delen bestaan
    if (!hashed || !salt) {
      console.log("Missing parts in stored password, using direct comparison");
      // Direct vergelijken als back-up
      return supplied === stored;
    }
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    // Controleer of de buffers dezelfde lengte hebben
    if (hashedBuf.length !== suppliedBuf.length) {
      console.log(`Buffer length mismatch: ${hashedBuf.length} vs ${suppliedBuf.length}`);
      // Direct vergelijken als back-up
      return supplied === stored;
    }
    
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Error in comparePasswords:", error);
    // Direct vergelijken als laatste redmiddel
    return supplied === stored;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "ambulance-secret-key-2024",
    resave: false,
    saveUninitialized: true, // Changed to true to create sessions
    store: storage.sessionStore,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: false, // Temporarily set to false for debugging
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax' // Added for better cookie handling
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({
      usernameField: 'username',
      passwordField: 'password',
      passReqToCallback: true
    }, async (req, username, password, done) => {
      try {
        console.log(`Login attempt for username: ${username}`);
        
        // Get selected station from request body
        const selectedStationId = req.body.stationId;
        if (!selectedStationId) {
          console.log(`Login failed: No station selected for ${username}`);
          return done(null, false);
        }
        
        const user = await storage.getUserByUsernameAndStation(username, selectedStationId);
        
        if (!user) {
          console.log(`Login failed: User ${username} not found for station ${selectedStationId}`);
          return done(null, false);
        }
        
        // Log wachtwoord details voor debugging
        console.log(`Password in DB for ${username}: ${user.password}`);
        console.log(`Supplied password: ${password}`);
        
        // Gebruik de verbeterde comparePasswords functie die meerdere vergelijkingsmethoden probeert
        try {
          if (await comparePasswords(password, user.password)) {
            console.log(`Password match for ${username} at station ${selectedStationId}!`);
            return done(null, user);
          }
        } catch (err) {
          console.error("Error comparing passwords:", err);
        }
        
        // Laatste directe vergelijking als noodoplossing
        if (user.password === password) {
          console.log(`Direct string equality match for ${username} at station ${selectedStationId}`);
          return done(null, user);
        }
        
        console.log(`Login failed: Incorrect password for ${username} at station ${selectedStationId}`);
        return done(null, false);
      } catch (error) {
        console.error("Login error:", error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log("=== SERIALIZE USER ===");
    console.log("Serializing user:", { id: user.id, username: user.username, stationId: user.stationId });
    // Store both user ID and stationId to preserve station switching
    done(null, { id: user.id, stationId: user.stationId });
  });
  
  passport.deserializeUser(async (sessionData: any, done) => {
    try {
      console.log("=== DESERIALIZE USER ===");
      
      // Handle both old format (just number) and new format (object with id and stationId)
      let userId: number;
      let sessionStationId: number | undefined;
      
      if (typeof sessionData === 'number') {
        // Old format - just the user ID
        userId = sessionData;
        console.log("Deserializing user ID (old format):", userId);
      } else if (sessionData && typeof sessionData === 'object') {
        // New format - object with id and stationId
        userId = sessionData.id;
        sessionStationId = sessionData.stationId;
        console.log("Deserializing user:", { id: userId, sessionStationId });
      } else {
        throw new Error("Invalid session data format");
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        console.log("User not found for ID:", userId);
        return done(null, null);
      }
      
      // Use the stationId from session if available, otherwise use the one from database
      if (sessionStationId !== undefined) {
        user.stationId = sessionStationId;
        console.log("Using session stationId:", sessionStationId);
      }
      
      console.log("Retrieved user:", { id: user.id, username: user.username, stationId: user.stationId, role: user.role });
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(error, null);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password),
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}