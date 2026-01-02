import "dotenv/config";
// Allow NODE_ENV to be set from environment, default to development if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { registerVkRoutes } from "./vk-routes";
import { setupVite, serveStatic, log } from "./vite";
import { checkAndNotifyDeadlines, checkAndSendShiftReminders } from "./push-notifications";

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve attached_assets folder as static files with 1 year cache
app.use('/attached_assets', express.static('attached_assets', {
  maxAge: '1y',
  immutable: true
}));

// Serve uploads folder as static files with 1 year cache
app.use('/uploads', express.static('public/uploads', {
  maxAge: '1y',
  immutable: true
}));

// Fix CSP issues - allow JavaScript to run
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.replit.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; " +
    "connect-src 'self' ws: wss:;"
  );
  next();
});

// Prevent caching of API responses
app.use('/api/*', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Security: Only log method, path, status, and timing - NO response body
      // Response bodies may contain sensitive data (passwords, sessions, PII, Verdi credentials)
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });

  next();
});

(async () => {
  registerVkRoutes(app);
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // In production, set proper cache headers for all static files
    app.use((req, res, next) => {
      const path = req.path;
      
      // Service Worker: NEVER cache (critical for update detection)
      if (path === '/service-worker.js' || path === '/sw.js') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        return next();
      }
      
      // manifest.json: short cache (allows PWA updates)
      if (path === '/manifest.json') {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        return next();
      }
      
      // HTML files and SPA routes: never cache
      if (path.endsWith('.html') || path === '/' || (!path.includes('.') && !path.startsWith('/api'))) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        return next();
      }
      
      // Hashed assets (JS/CSS/fonts with hash in filename): cache for 1 year
      // Vite adds hash to filenames, pattern like: index-a1b2c3d4.js
      if (path.match(/[-.]([0-9a-f]{8,}|[A-Za-z0-9_-]{8,})\.(js|css|woff|woff2|ttf|eot|otf)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return next();
      }
      
      // Images: cache for 1 year (safe to cache long-term)
      if (path.match(/\.(jpg|jpeg|png|gif|svg|ico|webp|avif)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return next();
      }
      
      // Non-hashed JS/CSS files: short cache to allow updates
      if (path.match(/\.(js|css)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate'); // 1 minute
        return next();
      }
      
      next();
    });
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  const host = '0.0.0.0'; // Bind to all interfaces for Windows Server
  server.listen(port, host, () => {
    log(`serving on port ${port} (host: ${host})`);
  });

  // Daily deadline notification check at 9:00 AM
  const scheduleDeadlineCheck = () => {
    const checkDeadlines = async () => {
      try {
        log('🔔 Running daily deadline notification check');
        await checkAndNotifyDeadlines();
      } catch (err) {
        log(`Failed to check deadlines: ${String(err)}`);
      }
    };

    // Track last check date to prevent duplicates
    let lastCheckDate = '';
    
    // Run check immediately on startup (deadline logic handles date filtering)
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    lastCheckDate = todayKey;
    log('🔔 Running startup deadline check');
    checkDeadlines();
    
    // Schedule daily check at 9:00 AM using interval-based approach
    setInterval(() => {
      const checkTime = new Date();
      const checkDateKey = `${checkTime.getFullYear()}-${checkTime.getMonth() + 1}-${checkTime.getDate()}`;
      
      // Run at 9:00 and only once per day
      if (checkTime.getHours() === 9 && checkTime.getMinutes() === 0 && lastCheckDate !== checkDateKey) {
        lastCheckDate = checkDateKey;
        checkDeadlines();
      }
    }, 60 * 1000); // Check every minute
    
    log('📅 Deadline check scheduler started (runs daily at 9:00 AM + on startup)');
  };
  
  scheduleDeadlineCheck();

  // Shift reminder check (runs every 15 minutes)
  const scheduleShiftReminderCheck = () => {
    // Run immediately on startup
    checkAndSendShiftReminders().catch(err => {
      log(`Failed to check shift reminders: ${String(err)}`);
    });
    
    // Run every 15 minutes
    setInterval(() => {
      checkAndSendShiftReminders().catch(err => {
        log(`Failed to check shift reminders: ${String(err)}`);
      });
    }, 15 * 60 * 1000); // 15 minutes
    
    log('🔔 Shift reminder scheduler started (runs every 15 minutes)');
  };
  
  scheduleShiftReminderCheck();
})();
