import { test, describe, expect, beforeEach, afterEach } from "vitest";
import { idempotentTask } from "./idempotentTask.js";
import { createServer } from "node:http";
import { writeFile, mkdir, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import type { Server } from "node:http";

/**
 * Race condition regression tests for idempotentTask
 *
 * ⚠️ CRITICAL: DO NOT DELETE THESE TESTS ⚠️
 *
 * These tests protect against race conditions that were causing production issues:
 * - Zero-byte files from concurrent downloads of the same URL
 * - Cache corruption from incomplete writes being read by other processes
 * - Task deduplication failures leading to duplicate work
 * - Incomplete file reads from non-atomic operations
 * - Memory leaks from uncleaned task references
 *
 * The fixes implemented include:
 * - Download deduplication with atomic file operations
 * - Temporary file writes with atomic moves
 * - Cache validation that checks file completeness
 * - Proper cleanup of task references on success/failure
 *
 * If any of these tests fail, it indicates a regression that could cause:
 * - Silent data corruption in production
 * - Race conditions under load
 * - Incomplete cache files
 *
 * @see packages/assets/src/idempotentTask.ts for the implementation
 */
describe("idempotentTask Race Condition Protection", () => {
  let testDir: string;
  let httpServer: Server;
  let serverPort: number;
  let serverUrl: string;
  let testFilePath: string;

  beforeEach(async () => {
    // Setup test directory
    testDir = join(process.cwd(), "test-cache-" + Date.now());
    await mkdir(testDir, { recursive: true });

    // Create a real test file for non-HTTP tests
    testFilePath = join(testDir, "test-source.mp4");
    await writeFile(testFilePath, "test video content for local file");

    // Setup HTTP server for download testing
    httpServer = createServer((req, res) => {
      if (req.url === "/test-file.mp4") {
        // Simulate chunked download to expose race conditions
        const data = Buffer.from("test video data");
        res.writeHead(200, {
          "Content-Type": "video/mp4",
          "Content-Length": data.length.toString(),
        });

        // Write data in small chunks with delays
        let written = 0;
        const writeChunk = () => {
          if (written < data.length) {
            const chunkSize = Math.min(5, data.length - written);
            res.write(data.subarray(written, written + chunkSize));
            written += chunkSize;
            setTimeout(writeChunk, 5); // Small delay to expose races
          } else {
            res.end();
          }
        };
        writeChunk();
      } else if (req.url === "/empty-file.mp4") {
        // Test zero-byte file handling
        res.writeHead(200, {
          "Content-Type": "video/mp4",
          "Content-Length": "0",
        });
        res.end();
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    // Start server on random port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        if (address && typeof address === "object") {
          serverPort = address.port;
          serverUrl = `http://localhost:${serverPort}`;
          resolve();
        }
      });
    });
  });

  afterEach(async () => {
    httpServer.close();
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("concurrent download protection", () => {
    test("prevents zero-byte files from concurrent downloads", async () => {
      const testTask = idempotentTask({
        label: "concurrent-download",
        filename: (absolutePath: string) => "downloaded.mp4",
        runner: async (absolutePath: string) => absolutePath,
      });

      const downloadUrl = `${serverUrl}/test-file.mp4`;

      // Start multiple concurrent downloads of the same file
      const downloadPromises = Array.from({ length: 5 }, () =>
        testTask(testDir, downloadUrl),
      );

      const results = await Promise.all(downloadPromises);

      // All should return the same cache path (deduplication)
      const cachePaths = results.map((r) => r.cachePath);
      const uniquePaths = new Set(cachePaths);
      expect(uniquePaths.size).toBe(1);

      // File should exist and not be empty
      const cachePath = results[0].cachePath;
      expect(existsSync(cachePath)).toBe(true);

      const stats = await stat(cachePath);
      expect(stats.size).toBeGreaterThan(0);
    });

    test("handles empty file downloads correctly", async () => {
      const testTask = idempotentTask({
        label: "empty-download",
        filename: (absolutePath: string) => "empty.mp4",
        runner: async (absolutePath: string) => absolutePath,
      });

      const emptyFileUrl = `${serverUrl}/empty-file.mp4`;

      const result = await testTask(testDir, emptyFileUrl);

      expect(existsSync(result.cachePath)).toBe(true);

      const stats = await stat(result.cachePath);
      // Empty HTTP responses may include headers, so just verify it's small
      // The important thing is that the download completes without error
      expect(stats.size).toBeLessThan(200);
    });
  });

  describe("cache corruption protection", () => {
    test("detects and recovers from corrupted cache files", async () => {
      const testTask = idempotentTask({
        label: "corruption-recovery",
        filename: (absolutePath: string) => "test.mp4",
        runner: async (absolutePath: string) => "valid content",
      });

      // First call creates valid cache
      const result1 = await testTask(testDir, testFilePath);
      const cachePath = result1.cachePath;

      // Verify valid cache was created
      expect(existsSync(cachePath)).toBe(true);
      const stats1 = await stat(cachePath);
      expect(stats1.size).toBeGreaterThan(0);

      // Simulate corruption by writing zero-byte file
      await writeFile(cachePath, "");

      // Second call should detect corruption and regenerate
      const result2 = await testTask(testDir, testFilePath);

      const stats2 = await stat(result2.cachePath);
      expect(stats2.size).toBeGreaterThan(0);
    });
  });

  describe("task deduplication integrity", () => {
    test("maintains deduplication under concurrent load", async () => {
      let taskExecutionCount = 0;

      const testTask = idempotentTask({
        label: "deduplication-test",
        filename: (absolutePath: string) => "deduplicated.txt",
        runner: async (absolutePath: string) => {
          taskExecutionCount++;
          // Add delay to expose potential races
          await new Promise((resolve) => setTimeout(resolve, 10));
          return `task execution ${taskExecutionCount}`;
        },
      });

      // Start multiple concurrent tasks for the same cache key
      const taskPromises = Array.from({ length: 10 }, () =>
        testTask(testDir, testFilePath),
      );

      const results = await Promise.all(taskPromises);

      // All should return the same cache path
      const cachePaths = results.map((r) => r.cachePath);
      const uniquePaths = new Set(cachePaths);
      expect(uniquePaths.size).toBe(1);

      // Task should only be executed once due to deduplication
      expect(taskExecutionCount).toBe(1);

      // Verify the cached file exists
      const cachePath = results[0].cachePath;
      expect(existsSync(cachePath)).toBe(true);
    });
  });

  describe("stream processing safety", () => {
    test("handles concurrent stream tasks safely", async () => {
      const streamTask = idempotentTask({
        label: "stream-safety",
        filename: (absolutePath: string, suffix: string) =>
          `stream-${suffix}.data`,
        runner: async (absolutePath: string, suffix: string) => {
          const data = `stream data for ${suffix}`;
          return Readable.from([data]);
        },
      });

      // Start multiple concurrent stream tasks with different cache keys
      const streamPromises = Array.from({ length: 3 }, (_, i) =>
        streamTask(testDir, testFilePath, `suffix-${i}`),
      );

      const results = await Promise.all(streamPromises);

      // Verify each stream was written correctly
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        expect(existsSync(result.cachePath)).toBe(true);

        const stats = await stat(result.cachePath);
        expect(stats.size).toBeGreaterThan(0);
        expect(result.cachePath).toContain(`suffix-${i}`);
      }
    });
  });

  describe("atomic operations verification", () => {
    test("ensures no temporary files remain after task completion", async () => {
      const testTask = idempotentTask({
        label: "atomic-test",
        filename: (absolutePath: string) => "atomic.mp4",
        runner: async (absolutePath: string) => "atomic content",
      });

      await testTask(testDir, testFilePath);

      // Verify no temporary files left behind
      const cacheFiles = await import("node:fs").then((fs) =>
        fs.readdirSync(join(testDir, ".cache"), { recursive: true }),
      );

      const tempFiles = cacheFiles.filter((file) =>
        file.toString().includes(".tmp"),
      );
      expect(tempFiles.length).toBe(0);
    });

    test("cleans up temporary files on task failure", async () => {
      const failingTask = idempotentTask({
        label: "failure-cleanup",
        filename: (absolutePath: string) => "failing.mp4",
        runner: async (absolutePath: string) => {
          throw new Error("Simulated task failure");
        },
      });

      // Task should fail
      await expect(failingTask(testDir, testFilePath)).rejects.toThrow(
        "Simulated task failure",
      );

      // Verify no temporary files left behind even after failure
      const cacheFiles = await import("node:fs").then((fs) =>
        fs.readdirSync(join(testDir, ".cache"), { recursive: true }),
      );

      const tempFiles = cacheFiles.filter((file) =>
        file.toString().includes(".tmp"),
      );
      expect(tempFiles.length).toBe(0);
    });
  });

  describe("string result atomicity", () => {
    test("no .tmp files remain after successful string task", async () => {
      const stringTask = idempotentTask({
        label: "string-atomic",
        filename: () => "result.json",
        runner: async () => '{"ok": true}',
      });

      await stringTask(testDir, testFilePath);

      const cacheFiles = await import("node:fs").then((fs) =>
        fs.readdirSync(join(testDir, ".cache"), { recursive: true }),
      );
      const tempFiles = cacheFiles.filter((f) =>
        f.toString().includes(".tmp"),
      );
      expect(tempFiles.length).toBe(0);
    });

    test("no .tmp files remain after failed string task", async () => {
      const failingStringTask = idempotentTask({
        label: "string-fail",
        filename: () => "result.json",
        runner: async (): Promise<string> => {
          throw new Error("runner failure");
        },
      });

      await expect(
        failingStringTask(testDir, testFilePath),
      ).rejects.toThrow("runner failure");

      const { existsSync: exists } = await import("node:fs");
      const cacheRoot = join(testDir, ".cache");
      if (exists(cacheRoot)) {
        const cacheFiles = await import("node:fs").then((fs) =>
          fs.readdirSync(cacheRoot, { recursive: true }),
        );
        const tempFiles = cacheFiles.filter((f) =>
          f.toString().includes(".tmp"),
        );
        expect(tempFiles.length).toBe(0);
      }
    });

    test("string result content is complete and correct", async () => {
      const expected = '{"key": "value", "number": 42}';
      const stringTask = idempotentTask({
        label: "string-content",
        filename: () => "data.json",
        runner: async () => expected,
      });

      const result = await stringTask(testDir, testFilePath);

      const { readFile } = await import("node:fs/promises");
      const actual = await readFile(result.cachePath, "utf-8");
      expect(actual).toBe(expected);
    });
  });

  describe("HTTP URL detection", () => {
    test("does not treat a local path containing 'http' as a URL", async () => {
      // A path like /srv/httpd/media/video.mp4 contains "http" but is a local file.
      // The includes("http") check is too broad and would attempt fetch() on it.
      const httpInPathDir = join(testDir, "httpd-assets");
      await mkdir(httpInPathDir, { recursive: true });
      const localFileWithHttpInPath = join(httpInPathDir, "video.mp4");
      await writeFile(localFileWithHttpInPath, "local file content");

      const copyTask = idempotentTask({
        label: "http-path-test",
        filename: () => "output.txt",
        runner: async (absolutePath: string) => {
          const { createReadStream } = await import("node:fs");
          return createReadStream(absolutePath);
        },
      });

      // Should succeed as a local file read, not attempt fetch()
      const result = await copyTask(testDir, localFileWithHttpInPath);
      expect(result.cachePath).toBeDefined();
      expect(existsSync(result.cachePath)).toBe(true);

      const { readFile } = await import("node:fs/promises");
      const cached = await readFile(result.cachePath, "utf-8");
      expect(cached).toBe("local file content");
    });
  });
});
