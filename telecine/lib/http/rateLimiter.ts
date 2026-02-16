import type { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs: number;
  limit: number;
  message: { error: string; message: string };
}

function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, limit, message } = options;
  const entries = new Map<string, RateLimitEntry>();

  // Sweep expired entries every windowMs
  const sweepInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of entries) {
      if (now >= entry.resetAt) {
        entries.delete(key);
      }
    }
  }, windowMs);
  sweepInterval.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.DISABLE_RATE_LIMITING === "true") {
      return next();
    }

    const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const now = Date.now();
    let entry = entries.get(key);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      entries.set(key, entry);
    }

    entry.count++;

    const remaining = Math.max(0, limit - entry.count);
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);

    res.setHeader("RateLimit-Limit", limit);
    res.setHeader("RateLimit-Remaining", remaining);
    res.setHeader("RateLimit-Reset", resetSeconds);

    if (entry.count > limit) {
      res.setHeader("Retry-After", resetSeconds);
      res.status(429).json(message);
      return;
    }

    next();
  };
}

export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  limit: 10,
  message: {
    error: "RATE_LIMITED",
    message: "Too many requests. Please try again later.",
  },
});

export const strictAuthRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  limit: 5,
  message: {
    error: "RATE_LIMITED",
    message: "Too many attempts. Please try again later.",
  },
});
