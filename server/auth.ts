import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { loginRateLimiter, getClientIp } from "./rate-limiter";

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
  // Security: STRICT scrypt-only authentication - NO plaintext fallback
  try {
    // Validate stored password format (must be hash.salt)
    if (!stored || !stored.includes(".")) {
      console.error("Invalid stored password format - must be hashed with scrypt");
      return false;
    }

    const [hashed, salt] = stored.split(".");
    
    // Validate both parts exist
    if (!hashed || !salt) {
      console.error("Missing hash or salt in stored password");
      return false;
    }
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    // Validate buffer lengths match
    if (hashedBuf.length !== suppliedBuf.length) {
      console.error("Password hash length mismatch");
      return false;
    }
    
    // Timing-safe comparison to prevent timing attacks
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Error in comparePasswords:", error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Windows Server deployment: Nginx handles HTTPS, Express backend uses HTTP
  // Cookie secure flag must be false for HTTP backend, even though external connection is HTTPS
  const useSecureCookies = false; // Always false for reverse proxy deployments
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "ambulance-secret-key-2024",
    resave: false,
    saveUninitialized: false, // Security: Don't create sessions for unauthenticated users
    store: storage.sessionStore,
    cookie: {
      secure: useSecureCookies, // False for reverse proxy (Nginx handles HTTPS)
      httpOnly: true, // Security: Prevent XSS attacks by blocking JavaScript access
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax' // CSRF protection
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
          console.log(`Login failed: No station selected`);
          return done(null, false);
        }
        
        const user = await storage.getUserByUsernameAndStation(username, selectedStationId);
        
        if (!user) {
          console.log(`Login failed: User not found for station ${selectedStationId}`);
          return done(null, false);
        }
        
        // Security: NEVER log passwords - removed all password logging
        
        // Use scrypt-based password comparison
        try {
          if (await comparePasswords(password, user.password)) {
            console.log(`Login successful for user at station ${selectedStationId}`);
            return done(null, user);
          }
        } catch (err) {
          console.error("Error comparing passwords:", err);
          return done(null, false);
        }
        
        console.log(`Login failed: Incorrect password`);
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

  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const rawUsername = (req.body.username || '').toString().toLowerCase().trim();
    const rawStationId = parseInt(req.body.stationId);
    
    if (!rawUsername) {
      return res.status(400).json({
        message: "Gebruikersnaam is verplicht."
      });
    }
    
    if (!rawStationId || isNaN(rawStationId) || rawStationId <= 0) {
      return res.status(400).json({
        message: "Selecteer eerst een geldig station."
      });
    }
    
    const username = rawUsername;
    const stationId = rawStationId;

    const blockStatus = loginRateLimiter.isBlocked(ip, username, stationId);
    if (blockStatus.blocked) {
      console.log(`[Auth] 🚫 Login blocked for ${username}@station${stationId} from ${ip} - ${blockStatus.remainingMinutes} minuten resterend`);
      return res.status(429).json({
        message: `Te veel mislukte inlogpogingen. Probeer opnieuw over ${blockStatus.remainingMinutes} ${blockStatus.remainingMinutes === 1 ? 'minuut' : 'minuten'}.`,
        blockedUntil: Date.now() + blockStatus.remainingMs,
        remainingMinutes: blockStatus.remainingMinutes
      });
    }

    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        const result = loginRateLimiter.recordFailedAttempt(ip, username, stationId);
        
        if (result.blocked) {
          return res.status(429).json({
            message: `Te veel mislukte inlogpogingen. U bent geblokkeerd voor ${result.blockedForMinutes} minuten.`,
            blockedUntil: Date.now() + (result.blockedForMinutes * 60 * 1000),
            remainingMinutes: result.blockedForMinutes
          });
        }

        return res.status(401).json({
          message: `Ongeldige gebruikersnaam of wachtwoord. Nog ${result.attemptsRemaining} ${result.attemptsRemaining === 1 ? 'poging' : 'pogingen'} over.`,
          attemptsRemaining: result.attemptsRemaining
        });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        
        loginRateLimiter.recordSuccessfulLogin(ip, username, stationId);
        return res.status(200).json(user);
      });
    })(req, res, next);
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