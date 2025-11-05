/**
 * HTTP Byte Range Fetcher - Simplified
 */

export interface ByteRangeRequest {
  url: string;
  startByte?: number;
  endByte?: number;
}

export interface ByteRangeResponse {
  success: boolean;
  data: Uint8Array;
  actualStartByte: number;
  actualEndByte: number;
  totalSize?: number;
  statusCode: number;
  error?: string;
}

export class HttpByteRangeFetcher {
  async fetchByteRange(request: ByteRangeRequest): Promise<ByteRangeResponse> {
    const { url, startByte, endByte } = request;

    try {
      const headers: HeadersInit = {};
      const useByteRange = startByte !== undefined && endByte !== undefined;
      if (useByteRange) {
        headers['Range'] = `bytes=${startByte}-${endByte}`;
        const response = await fetch(url, { headers });
        if (!response.ok && response.status !== 206) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
  
        const data = new Uint8Array(await response.arrayBuffer());
  
        return {
          success: true,
          data,
          actualStartByte: startByte,
          actualEndByte: endByte,
          statusCode: response.status
        };
      }
      else {
        const response = await fetch(url, { headers });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = new Uint8Array(await response.arrayBuffer());
        return {
          success: true,
          data,
          actualStartByte: 0,
          actualEndByte: -1,
          statusCode: response.status
        };
      }


    } catch (error) {
      console.error('[HttpByteRangeFetcher] Fetch failed:', error);
      return {
        success: false,
        data: new Uint8Array(0),
        actualStartByte: startByte,
        actualEndByte: endByte,
        statusCode: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Fetch multiple byte ranges concurrently
   */
  async fetchMultipleRanges(requests: ByteRangeRequest[]): Promise<ByteRangeResponse[]> {
    const promises = requests.map(request => this.fetchByteRange(request));
    const results = await Promise.all(promises);

    return results;
  }

  /**
   * Get the total size of a resource using a HEAD request
   */
  async getResourceSize(url: string): Promise<number | null> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'JitTranscoder/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const size = Number.parseInt(contentLength, 10);
        return size;
      }

      return null;

    } catch (error) {
      console.error('[HttpByteRangeFetcher] Failed to get resource size:', error);
      return null;
    }
  }

  /**
   * Check if a server supports byte range requests
   */
  async supportsRangeRequests(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'JitTranscoder/1.0'
        }
      });

      if (!response.ok) {
        return false;
      }

      const acceptRanges = response.headers.get('accept-ranges');
      const supportsRanges = acceptRanges === 'bytes';

      return supportsRanges;

    } catch (error) {
      console.error('[HttpByteRangeFetcher] Failed to check range support:', error);
      return false;
    }
  }
}

/**
 * Convenience function for simple byte range fetching
 */
export async function fetchByteRange(
  url: string,
  startByte: number,
  endByte: number
): Promise<ByteRangeResponse> {
  const fetcher = new HttpByteRangeFetcher();
  return fetcher.fetchByteRange({ url, startByte, endByte });
}

/**
 * Convenience function to validate byte range support
 */
export async function validateByteRangeSupport(url: string): Promise<{
  supported: boolean;
  totalSize?: number;
  error?: string;
}> {
  try {
    const fetcher = new HttpByteRangeFetcher();

    const [supported, totalSize] = await Promise.all([
      fetcher.supportsRangeRequests(url),
      fetcher.getResourceSize(url)
    ]);

    return {
      supported,
      totalSize: totalSize || undefined
    };

  } catch (error) {
    return {
      supported: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
} 