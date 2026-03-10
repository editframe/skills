import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequestDeduplicator } from "./RequestDeduplicator.js";

describe("RequestDeduplicator", () => {
  let deduplicator: RequestDeduplicator;

  beforeEach(() => {
    deduplicator = new RequestDeduplicator();
  });

  describe("executeRequest", () => {
    it("should execute request and return result for new key", async () => {
      const mockFactory = vi.fn().mockResolvedValue("result");

      const result = await deduplicator.executeRequest("key1", mockFactory);

      expect(result).toBe("result");
      expect(mockFactory).toHaveBeenCalledTimes(1);
    });

    it("should return same promise for concurrent requests with same key", async () => {
      const mockFactory = vi.fn().mockResolvedValue("result");

      const [result1, result2] = await Promise.all([
        deduplicator.executeRequest("key1", mockFactory),
        deduplicator.executeRequest("key1", mockFactory),
      ]);

      expect(result1).toBe("result");
      expect(result2).toBe("result");
      expect(mockFactory).toHaveBeenCalledTimes(1); // Should only be called once
    });

    it("should allow separate requests for different keys", async () => {
      const mockFactory1 = vi.fn().mockResolvedValue("result1");
      const mockFactory2 = vi.fn().mockResolvedValue("result2");

      const [result1, result2] = await Promise.all([
        deduplicator.executeRequest("key1", mockFactory1),
        deduplicator.executeRequest("key2", mockFactory2),
      ]);

      expect(result1).toBe("result1");
      expect(result2).toBe("result2");
      expect(mockFactory1).toHaveBeenCalledTimes(1);
      expect(mockFactory2).toHaveBeenCalledTimes(1);
    });

    it("should handle request failures and clean up", async () => {
      const error = new Error("Request failed");
      const mockFactory = vi.fn().mockRejectedValue(error);

      await expect(deduplicator.executeRequest("key1", mockFactory)).rejects.toThrow(
        "Request failed",
      );

      // Should allow new request with same key after failure
      const mockFactory2 = vi.fn().mockResolvedValue("success");
      const result = await deduplicator.executeRequest("key1", mockFactory2);

      expect(result).toBe("success");
      expect(mockFactory).toHaveBeenCalledTimes(1);
      expect(mockFactory2).toHaveBeenCalledTimes(1);
    });

    it("should clean up pending requests after success", async () => {
      const mockFactory = vi.fn().mockResolvedValue("result");

      await deduplicator.executeRequest("key1", mockFactory);

      expect(deduplicator.isPending("key1")).toBe(false);
      expect(deduplicator.getPendingCount()).toBe(0);
    });
  });

  describe("isPending", () => {
    it("should return true for pending requests", async () => {
      const mockFactory = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve("result"), 100);
          }),
      );

      const promise = deduplicator.executeRequest("key1", mockFactory);

      expect(deduplicator.isPending("key1")).toBe(true);

      await promise;

      expect(deduplicator.isPending("key1")).toBe(false);
    });

    it("should return false for non-existent keys", () => {
      expect(deduplicator.isPending("nonexistent")).toBe(false);
    });
  });

  describe("getPendingCount", () => {
    it("should return 0 initially", () => {
      expect(deduplicator.getPendingCount()).toBe(0);
    });

    it("should track pending request count", async () => {
      const mockFactory = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve("result"), 100);
          }),
      );

      const promise1 = deduplicator.executeRequest("key1", mockFactory);
      const promise2 = deduplicator.executeRequest("key2", mockFactory);

      expect(deduplicator.getPendingCount()).toBe(2);

      await Promise.all([promise1, promise2]);

      expect(deduplicator.getPendingCount()).toBe(0);
    });
  });

  describe("getPendingKeys", () => {
    it("should return empty array initially", () => {
      expect(deduplicator.getPendingKeys()).toEqual([]);
    });

    it("should return pending keys", async () => {
      const mockFactory = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve("result"), 100);
          }),
      );

      const promise1 = deduplicator.executeRequest("key1", mockFactory);
      const promise2 = deduplicator.executeRequest("key2", mockFactory);

      const pendingKeys = deduplicator.getPendingKeys();
      expect(pendingKeys).toHaveLength(2);
      expect(pendingKeys).toContain("key1");
      expect(pendingKeys).toContain("key2");

      await Promise.all([promise1, promise2]);

      expect(deduplicator.getPendingKeys()).toEqual([]);
    });
  });

  describe("clear", () => {
    it("should clear all pending requests", async () => {
      const mockFactory = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve("result"), 100);
          }),
      );

      deduplicator.executeRequest("key1", mockFactory);
      deduplicator.executeRequest("key2", mockFactory);

      expect(deduplicator.getPendingCount()).toBe(2);

      deduplicator.clear();

      expect(deduplicator.getPendingCount()).toBe(0);
      expect(deduplicator.getPendingKeys()).toEqual([]);
    });
  });
});
