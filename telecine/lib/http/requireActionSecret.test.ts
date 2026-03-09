import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

describe("requireActionSecret", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV, ACTION_SECRET: "test-secret-value" };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  async function loadModule() {
    return import("./requireActionSecret");
  }

  describe("requireActionSecretOrThrow", () => {
    test("accepts correct secret", async () => {
      const { requireActionSecretOrThrow } = await loadModule();
      const request = new Request("http://localhost/hdb/test", {
        headers: { "X-ACTION-SECRET": "test-secret-value" },
      });

      expect(() => requireActionSecretOrThrow(request)).not.toThrow();
    });

    test("rejects missing header", async () => {
      const { requireActionSecretOrThrow } = await loadModule();
      const request = new Request("http://localhost/hdb/test");

      expect(() => requireActionSecretOrThrow(request)).toThrow();
    });

    test("rejects wrong secret", async () => {
      const { requireActionSecretOrThrow } = await loadModule();
      const request = new Request("http://localhost/hdb/test", {
        headers: { "X-ACTION-SECRET": "wrong-value" },
      });

      expect(() => requireActionSecretOrThrow(request)).toThrow();
    });

    test("rejects empty secret", async () => {
      const { requireActionSecretOrThrow } = await loadModule();
      const request = new Request("http://localhost/hdb/test", {
        headers: { "X-ACTION-SECRET": "" },
      });

      expect(() => requireActionSecretOrThrow(request)).toThrow();
    });

    test("rejects when env secret is undefined", async () => {
      process.env.ACTION_SECRET = undefined;
      const { requireActionSecretOrThrow } = await loadModule();
      const request = new Request("http://localhost/hdb/test", {
        headers: { "X-ACTION-SECRET": "any-value" },
      });

      expect(() => requireActionSecretOrThrow(request)).toThrow();
    });

    test("rejects secret of same length but different content", async () => {
      const { requireActionSecretOrThrow } = await loadModule();
      const request = new Request("http://localhost/hdb/test", {
        headers: { "X-ACTION-SECRET": "test-secret-valuf" },
      });

      expect(() => requireActionSecretOrThrow(request)).toThrow();
    });
  });

  describe("requireActionSecret (legacy callback style)", () => {
    test("returns false for valid secret", async () => {
      const { requireActionSecret } = await loadModule();
      const request = new Request("http://localhost/hdb/test", {
        headers: { "X-ACTION-SECRET": "test-secret-value" },
      });

      const mockRes = {
        writeHead: vi.fn(),
        end: vi.fn(),
      };

      const result = requireActionSecret(request, mockRes as any);

      expect(result).toBe(false);
      expect(mockRes.writeHead).not.toHaveBeenCalled();
    });

    test("returns true and writes 401 for invalid secret", async () => {
      const { requireActionSecret } = await loadModule();
      const request = new Request("http://localhost/hdb/test", {
        headers: { "X-ACTION-SECRET": "wrong" },
      });

      const mockRes = {
        writeHead: vi.fn(),
        end: vi.fn(),
      };

      const result = requireActionSecret(request, mockRes as any);

      expect(result).toBe(true);
      expect(mockRes.writeHead).toHaveBeenCalledWith(401, {
        "Content-Type": "text/plain",
      });
      expect(mockRes.end).toHaveBeenCalledWith("Unauthorized");
    });
  });
});
