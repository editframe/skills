import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { Redis as Valkey } from "iovalkey";

const valkeyHost = process.env.VALKEY_HOST || "valkey";
const valkeyPort = Number.parseInt(process.env.VALKEY_PORT ?? "6379", 10);

function createRedisClient() {
  try {
    return new Valkey({
      host: valkeyHost,
      port: valkeyPort,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
  } catch {
    return null;
  }
}

const redisClient = createRedisClient();

function createStore(prefix: string) {
  if (!redisClient) return undefined;
  return new RedisStore({
    // @ts-expect-error iovalkey is redis-compatible but types differ slightly
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: `rl:${prefix}:`,
  });
}

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: createStore("auth"),
  message: { error: "RATE_LIMITED", message: "Too many requests. Please try again later." },
  keyGenerator: (req) => {
    return req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";
  },
});

export const strictAuthRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: createStore("auth-strict"),
  message: { error: "RATE_LIMITED", message: "Too many attempts. Please try again later." },
  keyGenerator: (req) => {
    return req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";
  },
});
