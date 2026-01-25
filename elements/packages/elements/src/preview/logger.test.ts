/**
 * Tests for the logger utility to ensure logging is disabled by default
 * and can be enabled via environment variable or global flag.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { logger } from "./logger.js";

describe("Logger", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  
  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  
  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    
    // Clean up global flag
    delete (globalThis as { EF_LOG_LEVEL?: string }).EF_LOG_LEVEL;
  });
  
  it("should not log anything by default (silent mode)", () => {
    logger.debug("debug message");
    logger.info("info message");
    logger.warn("warn message");
    logger.error("error message");
    
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
  
  it("should log all levels when set to debug", () => {
    (globalThis as { EF_LOG_LEVEL?: string }).EF_LOG_LEVEL = "debug";
    
    logger.debug("debug message");
    logger.info("info message");
    logger.warn("warn message");
    logger.error("error message");
    
    expect(consoleLogSpy).toHaveBeenCalledTimes(2); // debug and info
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
  
  it("should only log warn and error when set to warn", () => {
    (globalThis as { EF_LOG_LEVEL?: string }).EF_LOG_LEVEL = "warn";
    
    logger.debug("debug message");
    logger.info("info message");
    logger.warn("warn message");
    logger.error("error message");
    
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
  
  it("should only log error when set to error", () => {
    (globalThis as { EF_LOG_LEVEL?: string }).EF_LOG_LEVEL = "error";
    
    logger.debug("debug message");
    logger.info("info message");
    logger.warn("warn message");
    logger.error("error message");
    
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
  
  it("should not log anything when set to silent", () => {
    (globalThis as { EF_LOG_LEVEL?: string }).EF_LOG_LEVEL = "silent";
    
    logger.debug("debug message");
    logger.info("info message");
    logger.warn("warn message");
    logger.error("error message");
    
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
  
  it("should handle invalid log level as silent", () => {
    (globalThis as { EF_LOG_LEVEL?: string }).EF_LOG_LEVEL = "invalid";
    
    logger.debug("debug message");
    logger.warn("warn message");
    logger.error("error message");
    
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
