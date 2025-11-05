/**
 * Global URL token deduplication utility
 * Ensures that multiple EFMedia elements requesting tokens for the same resource
 * share a single token request, preventing unnecessary duplicate token generation
 */

export interface TokenCacheEntry {
  tokenPromise: Promise<string>;
  expiration: number;
}

export class URLTokenDeduplicator {
  private tokenCache = new Map<string, TokenCacheEntry>();

  /**
   * Get or create a URL token with global deduplication
   * Multiple requests for the same cache key will share the same token promise
   */
  async getToken(
    cacheKey: string,
    tokenFactory: () => Promise<string>,
    parseExpiration: (token: string) => number,
  ): Promise<string> {
    const now = Date.now();
    const cached = this.tokenCache.get(cacheKey);

    // Check if we have a valid cached token
    if (cached && now < cached.expiration) {
      return cached.tokenPromise;
    }

    // Create new token request
    const tokenPromise = tokenFactory()
      .then(async (token) => {
        // Update expiration after we get the token
        const expiration = parseExpiration(token);
        this.tokenCache.set(cacheKey, { tokenPromise, expiration });
        return token;
      })
      .catch((error) => {
        // Remove failed request from cache
        this.tokenCache.delete(cacheKey);
        throw error;
      });

    // Cache the promise immediately to deduplicate concurrent requests
    this.tokenCache.set(cacheKey, {
      tokenPromise,
      expiration: now + 60000, // Temporary 1-minute expiration, will be updated when token is received
    });

    return tokenPromise;
  }

  /**
   * Clear all cached tokens (used in testing)
   */
  clear(): void {
    this.tokenCache.clear();
  }

  /**
   * Get number of cached tokens
   */
  getCachedCount(): number {
    return this.tokenCache.size;
  }

  /**
   * Check if a token is cached and valid
   */
  hasValidToken(cacheKey: string): boolean {
    const cached = this.tokenCache.get(cacheKey);
    if (!cached) return false;

    const now = Date.now();
    return now < cached.expiration;
  }

  /**
   * Get all cached token keys
   */
  getCachedKeys(): string[] {
    return Array.from(this.tokenCache.keys());
  }

  /**
   * Remove expired tokens from cache
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.tokenCache.entries()) {
      if (now >= entry.expiration) {
        this.tokenCache.delete(key);
      }
    }
  }
}

// Global instance shared across all context providers
export const globalURLTokenDeduplicator = new URLTokenDeduplicator();
