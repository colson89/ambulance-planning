/**
 * Rate Limiter for Login Attempts
 * 
 * Protects against brute-force attacks by tracking failed login attempts
 * and temporarily blocking IPs/usernames that exceed the limit.
 */

interface LoginAttempt {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  blockedUntil: number | null;
}

interface RateLimiterConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
  cleanupIntervalMs: number;
}

const DEFAULT_CONFIG: RateLimiterConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  blockDurationMs: 15 * 60 * 1000,
  cleanupIntervalMs: 5 * 60 * 1000,
};

class LoginRateLimiter {
  private attempts: Map<string, LoginAttempt> = new Map();
  private config: RateLimiterConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();
  }

  private getKey(ip: string, username: string, stationId: number): string {
    const normalizedUsername = username.toLowerCase().trim();
    const normalizedStation = stationId > 0 ? stationId : 0;
    return `${ip}:${normalizedUsername}:${normalizedStation}`;
  }

  private getGlobalKey(ip: string, username: string): string {
    const normalizedUsername = username.toLowerCase().trim();
    return `global:${ip}:${normalizedUsername}`;
  }

  private getIpKey(ip: string): string {
    return `ip:${ip}`;
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);

    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    const entries = Array.from(this.attempts.entries());
    for (const [key, attempt] of entries) {
      const isBlockExpired = attempt.blockedUntil && now > attempt.blockedUntil;
      const isWindowExpired = now - attempt.lastAttempt > this.config.windowMs;

      if (isBlockExpired || isWindowExpired) {
        this.attempts.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[RateLimiter] Cleaned up ${cleaned} expired entries`);
    }
  }

  isBlocked(ip: string, username: string, stationId: number): { blocked: boolean; remainingMs: number; remainingMinutes: number } {
    const now = Date.now();
    
    const keysToCheck = [
      this.getKey(ip, username, stationId),
      this.getGlobalKey(ip, username),
      this.getIpKey(ip),
    ];

    for (const key of keysToCheck) {
      const attempt = this.attempts.get(key);
      if (attempt && attempt.blockedUntil) {
        if (now < attempt.blockedUntil) {
          const remainingMs = attempt.blockedUntil - now;
          const remainingMinutes = Math.ceil(remainingMs / 60000);
          return { blocked: true, remainingMs, remainingMinutes };
        } else {
          this.attempts.delete(key);
        }
      }
    }

    return { blocked: false, remainingMs: 0, remainingMinutes: 0 };
  }

  private recordAttemptForKey(key: string, now: number): LoginAttempt {
    let attempt = this.attempts.get(key);

    if (!attempt) {
      attempt = {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
        blockedUntil: null,
      };
      this.attempts.set(key, attempt);
    } else if (now - attempt.firstAttempt > this.config.windowMs) {
      attempt.count = 1;
      attempt.firstAttempt = now;
      attempt.lastAttempt = now;
      attempt.blockedUntil = null;
    } else {
      attempt.count++;
      attempt.lastAttempt = now;
    }

    return attempt;
  }

  recordFailedAttempt(ip: string, username: string, stationId: number): { 
    blocked: boolean; 
    attemptsRemaining: number; 
    blockedForMinutes: number;
  } {
    const now = Date.now();
    
    const stationKey = this.getKey(ip, username, stationId);
    const globalKey = this.getGlobalKey(ip, username);
    const ipKey = this.getIpKey(ip);
    
    this.recordAttemptForKey(stationKey, now);
    const globalAttempt = this.recordAttemptForKey(globalKey, now);
    this.recordAttemptForKey(ipKey, now);
    
    if (globalAttempt.count >= this.config.maxAttempts) {
      globalAttempt.blockedUntil = now + this.config.blockDurationMs;
      const blockedForMinutes = Math.ceil(this.config.blockDurationMs / 60000);
      
      console.log(`[RateLimiter] 🚫 BLOCKED: IP=${ip}, User=${username} for ${blockedForMinutes} minutes after ${globalAttempt.count} failed attempts (across all stations)`);
      
      return { 
        blocked: true, 
        attemptsRemaining: 0, 
        blockedForMinutes 
      };
    }

    const attemptsRemaining = this.config.maxAttempts - globalAttempt.count;
    console.log(`[RateLimiter] ⚠️ Failed attempt: IP=${ip}, User=${username}, Station=${stationId} (${attemptsRemaining} attempts remaining)`);
    
    return { 
      blocked: false, 
      attemptsRemaining, 
      blockedForMinutes: 0 
    };
  }

  recordSuccessfulLogin(ip: string, username: string, stationId: number): void {
    const stationKey = this.getKey(ip, username, stationId);
    const globalKey = this.getGlobalKey(ip, username);
    
    this.attempts.delete(stationKey);
    this.attempts.delete(globalKey);
    
    console.log(`[RateLimiter] ✅ Successful login, cleared attempts for: ${username}@station${stationId}`);
  }

  getStats(): { activeEntries: number; blockedEntries: number } {
    const now = Date.now();
    let blockedEntries = 0;

    const values = Array.from(this.attempts.values());
    for (const attempt of values) {
      if (attempt.blockedUntil && now < attempt.blockedUntil) {
        blockedEntries++;
      }
    }

    return {
      activeEntries: this.attempts.size,
      blockedEntries,
    };
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.attempts.clear();
  }
}

export const loginRateLimiter = new LoginRateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  blockDurationMs: 15 * 60 * 1000,
  cleanupIntervalMs: 5 * 60 * 1000,
});

export function getClientIp(req: { ip?: string; headers: { [key: string]: string | string[] | undefined } }): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }
  
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }
  
  return req.ip || 'unknown';
}
