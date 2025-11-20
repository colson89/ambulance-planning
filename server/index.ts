import "dotenv/config";
// Allow NODE_ENV to be set from environment, default to development if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve attached_assets folder as static files with 1 year cache
app.use('/attached_assets', express.static('attached_assets', {
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
    // In production, wrap setHeader to enforce caching policy
    app.use((req, res, next) => {
      const originalSetHeader = res.setHeader.bind(res);
      
      res.setHeader = function(name: string, value: string | number | readonly string[]) {
        // Force correct cache headers based on file type, override whatever serveStatic tries to set
        if (name.toLowerCase() === 'cache-control') {
          // HTML files: never cache
          if (req.path.endsWith('.html') || req.path === '/' || (!req.path.includes('.') && !req.path.startsWith('/api'))) {
            return originalSetHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          }
          // Hashed assets (JS/CSS/fonts with hash in filename like index-a1b2c3d4.js): cache for 1 year
          // Vite adds hash to filenames, look for pattern like: -[hash].ext or .[hash].ext
          else if (req.path.match(/\.(js|css|woff|woff2|ttf|eot|otf)$/) && 
                   req.path.match(/[-.]([0-9a-f]{8,}|[A-Za-z0-9_-]{8,})\.(js|css|woff|woff2|ttf|eot|otf)$/)) {
            return originalSetHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
          // Images (always safe to cache long-term): cache for 1 year
          else if (req.path.match(/\.(jpg|jpeg|png|gif|svg|ico|webp|avif)$/)) {
            return originalSetHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
          // Non-hashed JS/CSS files: short cache to allow updates
          else if (req.path.match(/\.(js|css)$/)) {
            return originalSetHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
          }
        }
        return originalSetHeader(name, value);
      };
      
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
})();
