import { describe, test, expect } from "vitest";
import { throwIfExpired } from "./throwIfExpired";

describe("throwIfExpired", () => {
  test("does nothing when expires_at is null", () => {
    expect(() => throwIfExpired(null)).not.toThrow();
  });

  test("does nothing when expires_at is undefined", () => {
    expect(() => throwIfExpired(undefined)).not.toThrow();
  });

  test("does nothing when expires_at is in the future", () => {
    const future = new Date(Date.now() + 60_000);
    expect(() => throwIfExpired(future)).not.toThrow();
  });

  test("throws 410 Response when expires_at is in the past (Date)", () => {
    const past = new Date(Date.now() - 60_000);
    try {
      throwIfExpired(past);
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(Response);
      const response = e as Response;
      expect(response.status).toBe(410);
    }
  });

  test("throws 410 Response when expires_at is in the past (string)", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    try {
      throwIfExpired(past);
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(Response);
      const response = e as Response;
      expect(response.status).toBe(410);
    }
  });

  test("response body contains error details", async () => {
    const past = new Date(Date.now() - 60_000);
    try {
      throwIfExpired(past);
      expect.unreachable("should have thrown");
    } catch (e) {
      const response = e as Response;
      const body = await response.json();
      expect(body.error).toBe("file_expired");
      expect(body.expires_at).toBe(past.toISOString());
      expect(body.message).toContain("expired");
    }
  });
});
