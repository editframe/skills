import { describe, test, expect } from "vitest";
import { isOriginAllowed } from "./cors";

describe("isOriginAllowed", () => {
  describe("exact matches", () => {
    test.each([
      "https://editframe.com",
      "https://www.editframe.com",
      "https://editframe.dev",
      "https://www.editframe.dev",
      "http://localhost:3000",
      "http://localhost:3001",
    ])("allows %s", (origin) => {
      expect(isOriginAllowed(origin, "/some/path")).toBe(true);
    });
  });

  describe("development *.localhost and Docker-internal origins", () => {
    const originalEnv = process.env.NODE_ENV;

    test("allows *.localhost origins in development", () => {
      process.env.NODE_ENV = "development";
      expect(isOriginAllowed("http://feature.localhost:5173", "/api/v1/renders")).toBe(true);
      process.env.NODE_ENV = originalEnv;
    });

    test("allows Docker-internal web origin in development", () => {
      process.env.NODE_ENV = "development";
      expect(isOriginAllowed("http://web:3000", "/api/v1/renders")).toBe(true);
      process.env.NODE_ENV = originalEnv;
    });

    test("rejects *.localhost origins in production", () => {
      process.env.NODE_ENV = "production";
      expect(isOriginAllowed("http://feature.localhost:5173", "/api/v1/renders")).toBe(false);
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("telemetry endpoint", () => {
    test("allows any origin for /api/v1/telemetry", () => {
      expect(isOriginAllowed("http://localhost:5175", "/api/v1/telemetry")).toBe(true);
    });

    test("allows arbitrary third-party origins for /api/v1/telemetry", () => {
      expect(isOriginAllowed("https://some-customer-app.example.com", "/api/v1/telemetry")).toBe(true);
    });

    test("allows null origin for /api/v1/telemetry", () => {
      expect(isOriginAllowed(null, "/api/v1/telemetry")).toBe(true);
    });
  });

  describe("blocked origins", () => {
    test("rejects unknown origins for non-telemetry paths", () => {
      expect(isOriginAllowed("https://evil.example.com", "/api/v1/renders")).toBe(false);
    });

    test("rejects unknown localhost port for non-telemetry paths in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      expect(isOriginAllowed("http://localhost:5175", "/api/v1/renders")).toBe(false);
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("no origin (non-browser requests)", () => {
    test("allows null origin for any path", () => {
      expect(isOriginAllowed(null, "/api/v1/renders")).toBe(true);
    });
  });
});
