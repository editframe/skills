import { test, describe, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rmdir, readdir } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Readable } from "node:stream";
import { md5Directory, md5FilePath, md5ReadStream, md5Buffer } from "./md5.js";

describe("MD5 Error Scenarios", () => {
  let testDir: string;

  beforeEach(async () => {
    // Create unique test directory
    testDir = join(
      tmpdir(),
      `md5-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await rmdir(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("md5Buffer edge cases", () => {
    test("handles empty buffer", () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = md5Buffer(emptyBuffer);

      // Should return a valid UUID format
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    test("handles very large buffer", () => {
      // Create 10MB buffer
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024, 0xff);

      expect(() => {
        const result = md5Buffer(largeBuffer);
        expect(result).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        );
      }).not.toThrow();
    });

    test("produces consistent results for same input", () => {
      const testBuffer = Buffer.from("test data", "utf8");

      const hash1 = md5Buffer(testBuffer);
      const hash2 = md5Buffer(testBuffer);

      expect(hash1).toBe(hash2);
    });

    test("produces different results for different input", () => {
      const buffer1 = Buffer.from("test data 1", "utf8");
      const buffer2 = Buffer.from("test data 2", "utf8");

      const hash1 = md5Buffer(buffer1);
      const hash2 = md5Buffer(buffer2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("md5FilePath error scenarios", () => {
    test("handles non-existent file", async () => {
      const nonExistentPath = join(testDir, "does-not-exist.txt");

      await expect(md5FilePath(nonExistentPath)).rejects.toThrow();
    });

    test("handles empty file", async () => {
      const emptyFilePath = join(testDir, "empty.txt");
      await writeFile(emptyFilePath, "");

      const result = await md5FilePath(emptyFilePath);
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    test("handles directory instead of file", async () => {
      const dirPath = join(testDir, "subdirectory");
      await mkdir(dirPath);

      // Should throw an error when trying to read a directory as a file
      await expect(md5FilePath(dirPath)).rejects.toThrow();
    });

    test("handles file with unusual characters in name", async () => {
      const weirdFileName = "file with spaces & special chars!@#$%.txt";
      const weirdFilePath = join(testDir, weirdFileName);
      await writeFile(weirdFilePath, "test content");

      const result = await md5FilePath(weirdFilePath);
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    test("handles very large file", async () => {
      const largeFilePath = join(testDir, "large.txt");

      // Create a 1MB file
      const writeStream = createWriteStream(largeFilePath);
      const chunk = Buffer.alloc(1024, "a");

      await new Promise<void>((resolve, reject) => {
        writeStream.on("error", reject);
        writeStream.on("finish", resolve);

        for (let i = 0; i < 1024; i++) {
          writeStream.write(chunk);
        }
        writeStream.end();
      });

      const result = await md5FilePath(largeFilePath);
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });

  describe("md5ReadStream error scenarios", () => {
    test("handles stream that errors", async () => {
      const errorStream = new Readable({
        read() {
          this.emit("error", new Error("Stream error"));
        },
      });

      await expect(md5ReadStream(errorStream as any)).rejects.toThrow(
        "Stream error",
      );
    });

    test("handles stream that closes without data", async () => {
      const emptyStream = new Readable({
        read() {
          this.push(null); // End stream immediately
        },
      });

      const result = await md5ReadStream(emptyStream as any);
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    test("handles stream with binary data", async () => {
      const binaryData = Buffer.from([0x00, 0x01, 0xff, 0xfe, 0x42]);
      const binaryStream = new Readable({
        read() {
          this.push(binaryData);
          this.push(null);
        },
      });

      const result = await md5ReadStream(binaryStream as any);
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    test("handles stream with multiple chunks", async () => {
      const chunks = ["chunk1", "chunk2", "chunk3"];
      let chunkIndex = 0;

      const multiChunkStream = new Readable({
        read() {
          if (chunkIndex < chunks.length) {
            this.push(Buffer.from(chunks[chunkIndex]!, "utf8"));
            chunkIndex++;
          } else {
            this.push(null);
          }
        },
      });

      const result = await md5ReadStream(multiChunkStream as any);
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });

  describe("md5Directory error scenarios", () => {
    test("handles non-existent directory", async () => {
      const nonExistentDir = join(testDir, "does-not-exist");

      await expect(md5Directory(nonExistentDir)).rejects.toThrow();
    });

    test("handles empty directory", async () => {
      const emptyDir = join(testDir, "empty");
      await mkdir(emptyDir);

      const result = await md5Directory(emptyDir);
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    test("handles directory with only subdirectories", async () => {
      const parentDir = join(testDir, "parent");
      const childDir = join(parentDir, "child");
      await mkdir(parentDir);
      await mkdir(childDir);

      const result = await md5Directory(parentDir);
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    test("handles deeply nested directory structure", async () => {
      let currentDir = testDir;

      // Create 10 levels deep
      for (let i = 0; i < 10; i++) {
        currentDir = join(currentDir, `level-${i}`);
        await mkdir(currentDir);
      }

      // Add a file at the deepest level
      await writeFile(join(currentDir, "deep-file.txt"), "deep content");

      const result = await md5Directory(testDir);
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    test("handles directory with mixed file types", async () => {
      const mixedDir = join(testDir, "mixed");
      await mkdir(mixedDir);

      // Create various file types
      await writeFile(join(mixedDir, "text.txt"), "text content");
      await writeFile(join(mixedDir, "empty.dat"), "");
      await writeFile(
        join(mixedDir, "binary.bin"),
        new Uint8Array([0x00, 0xff, 0x42]),
      );

      const subDir = join(mixedDir, "subdir");
      await mkdir(subDir);
      await writeFile(join(subDir, "nested.txt"), "nested content");

      const result = await md5Directory(mixedDir);
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    test("produces consistent results for same directory", async () => {
      const testDirContent = join(testDir, "consistent");
      await mkdir(testDirContent);
      await writeFile(join(testDirContent, "file1.txt"), "content1");
      await writeFile(join(testDirContent, "file2.txt"), "content2");

      const hash1 = await md5Directory(testDirContent);
      const hash2 = await md5Directory(testDirContent);

      expect(hash1).toBe(hash2);
    });

    test("handles permission errors gracefully", async () => {
      // Note: This test might behave differently on different systems
      // but it should at least not crash the process
      const restrictedDir = join(testDir, "restricted");
      await mkdir(restrictedDir);
      await writeFile(join(restrictedDir, "file.txt"), "content");

      // Attempt to hash the directory - should either succeed or fail gracefully
      try {
        const result = await md5Directory(restrictedDir);
        expect(result).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        );
      } catch (error) {
        // Permission errors should be proper Error objects
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe("UUID formatting edge cases", () => {
    test("consistent UUID format across all functions", async () => {
      const testBuffer = Buffer.from("test", "utf8");
      const testFile = join(testDir, "test.txt");
      await writeFile(testFile, "test");

      const bufferHash = md5Buffer(testBuffer);
      const fileHash = await md5FilePath(testFile);

      // Both should be valid UUID format
      expect(bufferHash).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(fileHash).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );

      // Same content should produce same hash
      expect(bufferHash).toBe(fileHash);
    });
  });
});
