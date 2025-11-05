/**
 * Request deduplication utility
 * Manages pending requests to prevent concurrent duplicate requests
 */

export class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  /**
   * Execute a request with deduplication
   * If a request with the same key is already pending, return the existing promise
   * Otherwise, execute the request factory and track the promise
   */
  async executeRequest<T>(
    key: string,
    requestFactory: () => Promise<T>,
  ): Promise<T> {
    // Check if there's already a pending request for this key
    const existingRequest = this.pendingRequests.get(key);
    if (existingRequest) {
      return existingRequest;
    }

    // Create and track the new request
    const requestPromise = requestFactory();
    this.pendingRequests.set(key, requestPromise);

    try {
      const result = await requestPromise;
      this.pendingRequests.delete(key);
      return result;
    } catch (error) {
      this.pendingRequests.delete(key);
      throw error;
    }
  }

  /**
   * Clear all pending requests (used in cache clearing)
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get number of pending requests
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Check if a request is pending
   */
  isPending(key: string): boolean {
    return this.pendingRequests.has(key);
  }

  /**
   * Get all pending request keys
   */
  getPendingKeys(): string[] {
    return Array.from(this.pendingRequests.keys());
  }
}
