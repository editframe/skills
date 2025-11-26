/**
 * Unified Byte Range Fetcher
 *
 * Automatically chooses between HTTP and local file fetching
 * based on the URL protocol or path format.
 */

import { HttpByteRangeFetcher } from "./HttpByteRangeFetcher.js";
import { LocalFileByteRangeFetcher } from "./LocalFileByteRangeFetcher.js";
import type {
  ByteRangeRequest,
  ByteRangeResponse,
} from "./HttpByteRangeFetcher.js";

export class UnifiedByteRangeFetcher {
  private httpFetcher: HttpByteRangeFetcher;
  private localFetcher: LocalFileByteRangeFetcher;

  constructor() {
    this.httpFetcher = new HttpByteRangeFetcher();
    this.localFetcher = new LocalFileByteRangeFetcher();
  }

  async fetchByteRange(request: ByteRangeRequest): Promise<ByteRangeResponse> {
    const fetcher = this.getFetcher(request.url);
    return fetcher.fetchByteRange(request);
  }

  async fetchMultipleRanges(
    requests: ByteRangeRequest[],
  ): Promise<ByteRangeResponse[]> {
    // Group requests by fetcher type for efficiency
    const httpRequests: ByteRangeRequest[] = [];
    const localRequests: ByteRangeRequest[] = [];

    for (const request of requests) {
      if (this.isLocalFile(request.url)) {
        localRequests.push(request);
      } else {
        httpRequests.push(request);
      }
    }

    // Fetch all ranges in parallel
    const results: ByteRangeResponse[] = [];

    const [httpResults, localResults] = await Promise.all([
      httpRequests.length > 0
        ? this.httpFetcher.fetchMultipleRanges(httpRequests)
        : [],
      localRequests.length > 0
        ? this.localFetcher.fetchMultipleRanges(localRequests)
        : [],
    ]);

    // Merge results back in original order
    let httpIndex = 0;
    let localIndex = 0;

    for (const request of requests) {
      if (this.isLocalFile(request.url)) {
        const result = localResults[localIndex++];
        if (result) {
          results.push(result);
        }
      } else {
        const result = httpResults[httpIndex++];
        if (result) {
          results.push(result);
        }
      }
    }

    return results;
  }

  async getResourceSize(url: string): Promise<number | null> {
    const fetcher = this.getFetcher(url);
    return fetcher.getResourceSize(url);
  }

  async supportsRangeRequests(url: string): Promise<boolean> {
    const fetcher = this.getFetcher(url);
    return fetcher.supportsRangeRequests(url);
  }

  /**
   * Get the appropriate fetcher for a given URL
   */
  private getFetcher(
    url: string,
  ): HttpByteRangeFetcher | LocalFileByteRangeFetcher {
    return this.isLocalFile(url) ? this.localFetcher : this.httpFetcher;
  }

  /**
   * Determine if a URL refers to a local file
   */
  private isLocalFile(url: string): boolean {
    // Check for file:// protocol
    if (url.startsWith("file://")) {
      return true;
    }

    // Check for HTTP/HTTPS protocols (these are definitely remote)
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return false;
    }

    // For everything else, assume it's a local file path
    // This includes relative paths, absolute paths, etc.
    return true;
  }
}

/**
 * Convenience function for unified byte range fetching
 */
export async function fetchByteRange(
  url: string,
  startByte: number,
  endByte: number,
): Promise<ByteRangeResponse> {
  const fetcher = new UnifiedByteRangeFetcher();
  return fetcher.fetchByteRange({ url, startByte, endByte });
}

/**
 * Convenience function to validate byte range support for any URL type
 */
export async function validateByteRangeSupport(url: string): Promise<{
  supported: boolean;
  totalSize?: number;
  error?: string;
  sourceType: "http" | "local";
}> {
  try {
    const fetcher = new UnifiedByteRangeFetcher();
    const isLocal =
      url.startsWith("file://") ||
      (!url.startsWith("http://") && !url.startsWith("https://"));

    const [supported, totalSize] = await Promise.all([
      fetcher.supportsRangeRequests(url),
      fetcher.getResourceSize(url),
    ]);

    return {
      supported,
      totalSize: totalSize || undefined,
      sourceType: isLocal ? "local" : "http",
    };
  } catch (error) {
    const isLocal =
      url.startsWith("file://") ||
      (!url.startsWith("http://") && !url.startsWith("https://"));

    return {
      supported: false,
      error: error instanceof Error ? error.message : String(error),
      sourceType: isLocal ? "local" : "http",
    };
  }
}
