/**
 * Centralized logging utility for the preview module.
 *
 * Logging is disabled by default. To enable logging, set:
 * - Environment variable: EF_LOG_LEVEL=debug (or info, warn, error)
 * - Global flag: globalThis.EF_LOG_LEVEL = 'debug'
 *
 * Log levels (in order of verbosity):
 * - debug: All logs including performance metrics
 * - info: Informational messages
 * - warn: Warnings
 * - error: Errors only
 * - silent: No logging (default)
 */

type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

function getLogLevel(): LogLevel {
  // Check global flag first
  if (typeof globalThis !== "undefined" && "EF_LOG_LEVEL" in globalThis) {
    const level = (globalThis as { EF_LOG_LEVEL?: string }).EF_LOG_LEVEL;
    if (level && level in LOG_LEVELS) {
      return level as LogLevel;
    }
  }

  // Check environment variable (works in Node.js and some bundlers)
  if (typeof process !== "undefined" && process.env?.EF_LOG_LEVEL) {
    const level = process.env.EF_LOG_LEVEL;
    if (level in LOG_LEVELS) {
      return level as LogLevel;
    }
  }

  // Default to silent
  return "silent";
}

function shouldLog(level: LogLevel): boolean {
  const currentLevel = getLogLevel();
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

export const logger = {
  debug: (...args: unknown[]): void => {
    if (shouldLog("debug")) {
      console.log(...args);
    }
  },

  info: (...args: unknown[]): void => {
    if (shouldLog("info")) {
      console.log(...args);
    }
  },

  warn: (...args: unknown[]): void => {
    if (shouldLog("warn")) {
      console.warn(...args);
    }
  },

  error: (...args: unknown[]): void => {
    if (shouldLog("error")) {
      console.error(...args);
    }
  },
};
