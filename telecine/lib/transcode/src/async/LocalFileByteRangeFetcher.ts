/**
 * Local File Byte Range Fetcher
 *
 * Provides byte range fetching capabilities for local files,
 * compatible with the HttpByteRangeFetcher interface.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type {
  ByteRangeRequest,
  ByteRangeResponse,
} from "./HttpByteRangeFetcher.js";

export class LocalFileByteRangeFetcher {
  async fetchByteRange(request: ByteRangeRequest): Promise<ByteRangeResponse> {
    const { url, startByte, endByte } = request;

    try {
      // Convert file:// URL or handle regular path
      const filePath = this.urlToPath(url);

      // Validate file exists and get stats
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${filePath}`);
      }

      const fileSize = stats.size;

      // Validate byte range
      if (startByte < 0 || endByte >= fileSize || startByte > endByte) {
        throw new Error(
          `Invalid byte range: ${startByte}-${endByte} for file size ${fileSize}`,
        );
      }

      // Calculate read size
      const readSize = endByte - startByte + 1;

      // Open file and read the byte range
      const fileHandle = await fs.open(filePath, "r");
      try {
        const buffer = Buffer.allocUnsafe(readSize);
        const { bytesRead } = await fileHandle.read(
          buffer,
          0,
          readSize,
          startByte,
        );

        if (bytesRead !== readSize) {
          throw new Error(
            `Expected to read ${readSize} bytes, but read ${bytesRead}`,
          );
        }

        const data = new Uint8Array(buffer);

        return {
          success: true,
          data,
          actualStartByte: startByte,
          actualEndByte: endByte,
          totalSize: fileSize,
          statusCode: 200, // Simulate HTTP 200 OK for local files
        };
      } finally {
        await fileHandle.close();
      }
    } catch (error) {
      console.error("[LocalFileByteRangeFetcher] Read failed:", error);
      return {
        success: false,
        data: new Uint8Array(0),
        actualStartByte: startByte,
        actualEndByte: endByte,
        statusCode: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Fetch multiple byte ranges from the same file
   */
  async fetchMultipleRanges(
    requests: ByteRangeRequest[],
  ): Promise<ByteRangeResponse[]> {
    const promises = requests.map((request) => this.fetchByteRange(request));
    const results = await Promise.all(promises);

    return results;
  }

  /**
   * Get the total size of a local file
   */
  async getResourceSize(url: string): Promise<number | null> {
    try {
      const filePath = this.urlToPath(url);
      const stats = await fs.stat(filePath);

      if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${filePath}`);
      }

      const size = stats.size;
      return size;
    } catch (error) {
      console.error(
        "[LocalFileByteRangeFetcher] Failed to get file size:",
        error,
      );
      return null;
    }
  }

  /**
   * Local files always support byte range operations
   */
  async supportsRangeRequests(url: string): Promise<boolean> {
    try {
      const filePath = this.urlToPath(url);
      const stats = await fs.stat(filePath);
      const isFile = stats.isFile();

      return isFile;
    } catch (error) {
      console.error("[LocalFileByteRangeFetcher] File check failed:", error);
      return false;
    }
  }

  /**
   * Convert file:// URL or local path to file system path
   */
  private urlToPath(url: string): string {
    if (url.startsWith("file://")) {
      // Convert file:// URL to local path
      // Handle both file:///path and file://host/path formats
      let urlObj: URL;
      try {
        urlObj = new URL(url);
      } catch (error) {
        throw new Error(`Invalid file URL: ${url}`);
      }

      if (urlObj.protocol !== "file:") {
        throw new Error(`Expected file:// protocol, got: ${urlObj.protocol}`);
      }

      // For file:// URLs, use the pathname
      return urlObj.pathname;
    }

    // Assume it's already a local file path
    return path.resolve(url);
  }
}

/**
 * Convenience function for simple local file byte range fetching
 */
export async function fetchLocalFileByteRange(
  url: string,
  startByte: number,
  endByte: number,
): Promise<ByteRangeResponse> {
  const fetcher = new LocalFileByteRangeFetcher();
  return fetcher.fetchByteRange({ url, startByte, endByte });
}

/**
 * Convenience function to validate local file access
 */
export async function validateLocalFileAccess(url: string): Promise<{
  supported: boolean;
  totalSize?: number;
  error?: string;
}> {
  try {
    const fetcher = new LocalFileByteRangeFetcher();

    const [supported, totalSize] = await Promise.all([
      fetcher.supportsRangeRequests(url),
      fetcher.getResourceSize(url),
    ]);

    return {
      supported,
      totalSize: totalSize || undefined,
    };
  } catch (error) {
    return {
      supported: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
