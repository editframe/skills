import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { URLTokenDeduplicator } from "./URLTokenDeduplicator.js";

describe("URLTokenDeduplicator", () => {
  let deduplicator: URLTokenDeduplicator;

  beforeEach(() => {
    deduplicator = new URLTokenDeduplicator();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should deduplicate concurrent requests for same cache key", async () => {
    const mockTokenFactory = vi.fn().mockResolvedValue("test-token");
    const mockParseExpiration = vi.fn().mockReturnValue(Date.now() + 60000);

    // Make 3 concurrent requests for the same cache key
    const promises = [
      deduplicator.getToken("key1", mockTokenFactory, mockParseExpiration),
      deduplicator.getToken("key1", mockTokenFactory, mockParseExpiration),
      deduplicator.getToken("key1", mockTokenFactory, mockParseExpiration),
    ];

    const results = await Promise.all(promises);

    // All should return the same token
    expect(results).toEqual(["test-token", "test-token", "test-token"]);

    // Factory should only be called once due to deduplication
    expect(mockTokenFactory).toHaveBeenCalledTimes(1);
    expect(mockParseExpiration).toHaveBeenCalledTimes(1);
  });

  it("should use separate tokens for different cache keys", async () => {
    const mockTokenFactory1 = vi.fn().mockResolvedValue("token1");
    const mockTokenFactory2 = vi.fn().mockResolvedValue("token2");
    const mockParseExpiration = vi.fn().mockReturnValue(Date.now() + 60000);

    const [token1, token2] = await Promise.all([
      deduplicator.getToken("key1", mockTokenFactory1, mockParseExpiration),
      deduplicator.getToken("key2", mockTokenFactory2, mockParseExpiration),
    ]);

    expect(token1).toBe("token1");
    expect(token2).toBe("token2");
    expect(mockTokenFactory1).toHaveBeenCalledTimes(1);
    expect(mockTokenFactory2).toHaveBeenCalledTimes(1);
  });

  it("should reuse cached tokens that haven't expired", async () => {
    const futureTime = Date.now() + 60000;
    const mockTokenFactory = vi.fn().mockResolvedValue("cached-token");
    const mockParseExpiration = vi.fn().mockReturnValue(futureTime);

    // First request
    const token1 = await deduplicator.getToken(
      "key1",
      mockTokenFactory,
      mockParseExpiration,
    );

    // Second request for same key should reuse cached token
    const token2 = await deduplicator.getToken(
      "key1",
      vi.fn(),
      mockParseExpiration,
    );

    expect(token1).toBe("cached-token");
    expect(token2).toBe("cached-token");
    expect(mockTokenFactory).toHaveBeenCalledTimes(1);
  });

  it("should fetch new token when cached token is expired", async () => {
    const pastTime = Date.now() - 1000; // Expired 1 second ago
    const futureTime = Date.now() + 60000; // New token expires in 1 minute

    const mockTokenFactory1 = vi.fn().mockResolvedValue("expired-token");
    const mockTokenFactory2 = vi.fn().mockResolvedValue("fresh-token");
    const mockParseExpiration1 = vi.fn().mockReturnValue(pastTime);
    const mockParseExpiration2 = vi.fn().mockReturnValue(futureTime);

    // First request with expired token
    await deduplicator.getToken(
      "key1",
      mockTokenFactory1,
      mockParseExpiration1,
    );

    // Advance time to simulate token expiration
    vi.advanceTimersByTime(2000);

    // Second request should fetch new token due to expiration
    const token2 = await deduplicator.getToken(
      "key1",
      mockTokenFactory2,
      mockParseExpiration2,
    );

    expect(token2).toBe("fresh-token");
    expect(mockTokenFactory1).toHaveBeenCalledTimes(1);
    expect(mockTokenFactory2).toHaveBeenCalledTimes(1);
  });

  it("should handle token factory errors by removing from cache", async () => {
    const mockTokenFactory1 = vi
      .fn()
      .mockRejectedValue(new Error("Network error"));
    const mockTokenFactory2 = vi.fn().mockResolvedValue("retry-token");
    const mockParseExpiration = vi.fn().mockReturnValue(Date.now() + 60000);

    // First request fails
    await expect(
      deduplicator.getToken("key1", mockTokenFactory1, mockParseExpiration),
    ).rejects.toThrow("Network error");

    // Retry should work and not be blocked by failed request
    const token = await deduplicator.getToken(
      "key1",
      mockTokenFactory2,
      mockParseExpiration,
    );

    expect(token).toBe("retry-token");
    expect(mockTokenFactory1).toHaveBeenCalledTimes(1);
    expect(mockTokenFactory2).toHaveBeenCalledTimes(1);
  });

  it("should provide utility methods for cache management", () => {
    const mockParseExpiration = vi.fn().mockReturnValue(Date.now() + 60000);

    expect(deduplicator.getCachedCount()).toBe(0);
    expect(deduplicator.getCachedKeys()).toEqual([]);
    expect(deduplicator.hasValidToken("nonexistent")).toBe(false);

    // Add a token to cache
    deduplicator.getToken(
      "key1",
      vi.fn().mockResolvedValue("token"),
      mockParseExpiration,
    );

    expect(deduplicator.getCachedCount()).toBe(1);
    expect(deduplicator.getCachedKeys()).toEqual(["key1"]);
    expect(deduplicator.hasValidToken("key1")).toBe(true);

    // Clear cache
    deduplicator.clear();
    expect(deduplicator.getCachedCount()).toBe(0);
  });

  it("should cleanup expired tokens", async () => {
    const pastTime = Date.now() - 1000;
    const futureTime = Date.now() + 60000;

    const mockParseExpiration1 = vi.fn().mockReturnValue(pastTime);
    const mockParseExpiration2 = vi.fn().mockReturnValue(futureTime);

    // Add expired and valid tokens
    await deduplicator.getToken(
      "expired",
      vi.fn().mockResolvedValue("token1"),
      mockParseExpiration1,
    );
    await deduplicator.getToken(
      "valid",
      vi.fn().mockResolvedValue("token2"),
      mockParseExpiration2,
    );

    expect(deduplicator.getCachedCount()).toBe(2);

    // Cleanup should remove expired tokens
    deduplicator.cleanup();

    expect(deduplicator.getCachedCount()).toBe(1);
    expect(deduplicator.getCachedKeys()).toEqual(["valid"]);
  });
});
