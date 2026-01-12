import { createWriteStream, existsSync } from "node:fs";
import path from "node:path";
import { md5FilePath } from "./md5.js";
import debug from "debug";
import { mkdir, writeFile, stat, readdir } from "node:fs/promises";
import { Readable } from "node:stream";

interface TaskOptions<T extends unknown[]> {
  label: string;
  filename: (absolutePath: string, ...args: T) => string;
  runner: (absolutePath: string, ...args: T) => Promise<string | Readable>;
}

export interface TaskResult {
  md5Sum: string;
  cachePath: string;
}

export const idempotentTask = <T extends unknown[]>({
  label,
  filename,
  runner,
}: TaskOptions<T>) => {
  const tasks: Record<string, Promise<TaskResult>> = {};
  const downloadTasks: Record<string, Promise<string>> = {};

  // Helper function to validate cache file completeness
  const isValidCacheFile = async (
    filePath: string,
    allowEmpty = false,
  ): Promise<boolean> => {
    try {
      const stats = await stat(filePath);
      // File must exist and either have content or be explicitly allowed to be empty
      return allowEmpty || stats.size > 0;
    } catch {
      return false;
    }
  };

  return async (
    rootDir: string,
    absolutePath: string,
    ...args: T
  ): Promise<TaskResult> => {
    const log = debug(`ef:${label}`);
    const cacheDirRoot = path.join(rootDir, ".cache");
    await mkdir(cacheDirRoot, { recursive: true });

    log(`Running ef:${label} task for ${absolutePath} in ${rootDir}`);

    // Handle HTTP downloads with proper race condition protection
    if (absolutePath.includes("http")) {
      const safePath = absolutePath.replace(/[^a-zA-Z0-9]/g, "_");
      const downloadCachePath = path.join(
        rootDir,
        ".cache",
        `${safePath}.file`,
      );

      // Check if already downloaded and valid (allow empty downloads)
      if (
        existsSync(downloadCachePath) &&
        (await isValidCacheFile(downloadCachePath, true))
      ) {
        log(`Already cached ${absolutePath}`);
        absolutePath = downloadCachePath;
      } else {
        // Use download task deduplication to prevent concurrent downloads
        const downloadKey = absolutePath;
        if (!downloadTasks[downloadKey]) {
          log(`Starting download for ${absolutePath}`);
          downloadTasks[downloadKey] = (async () => {
            try {
              const response = await fetch(absolutePath);
              if (!response.ok) {
                throw new Error(
                  `Failed to fetch file from URL ${absolutePath}: ${response.status} ${response.statusText}`,
                );
              }

              const stream = response.body;
              if (!stream) {
                throw new Error(`No response body for URL ${absolutePath}`);
              }

              // Use temporary file to prevent reading incomplete downloads
              const tempPath = `${downloadCachePath}.tmp`;
              const writeStream = createWriteStream(tempPath);

              // @ts-ignore node web stream support in typescript is incorrect about this.
              const readable = Readable.fromWeb(stream);
              readable.pipe(writeStream);

              await new Promise<void>((resolve, reject) => {
                readable.on("error", reject);
                writeStream.on("error", reject);
                writeStream.on("finish", () => resolve());
              });

              // Atomically move completed file to final location
              const { rename } = await import("node:fs/promises");
              await rename(tempPath, downloadCachePath);

              log(`Download completed for ${absolutePath}`);
              return downloadCachePath;
            } catch (error) {
              log(`Download failed for ${absolutePath}: ${error}`);
              // Clean up task reference on failure
              delete downloadTasks[downloadKey];
              throw error;
            }
          })();
        }

        absolutePath = await downloadTasks[downloadKey];
        // Clean up completed task
        delete downloadTasks[downloadKey];
      }
    }

    // First, try to find existing cache by scanning cache directories
    // This avoids expensive MD5 computation when cache already exists
    const expectedFilename = filename(absolutePath, ...args);
    let cachePath: string | null = null;
    let md5: string | null = null;
    
    // Scan cache directories to find existing cache file
    const scanStartTime = Date.now();
    try {
      const cacheDirs = await readdir(cacheDirRoot, { withFileTypes: true });
      console.log(`[ef:${label}] Scanning ${cacheDirs.length} cache directories for ${expectedFilename}`);
      for (const dir of cacheDirs) {
        if (dir.isDirectory()) {
          const candidatePath = path.join(cacheDirRoot, dir.name, expectedFilename);
          if (existsSync(candidatePath) && (await isValidCacheFile(candidatePath))) {
            cachePath = candidatePath;
            md5 = dir.name; // Directory name is the MD5
            const scanElapsed = Date.now() - scanStartTime;
            console.log(`[ef:${label}] Found existing cache in ${scanElapsed}ms: ${candidatePath} (skipped MD5)`);
            log(`Found existing cache for ${expectedFilename} in ${dir.name}, skipping MD5 computation`);
            break;
          }
        }
      }
      if (!cachePath) {
        const scanElapsed = Date.now() - scanStartTime;
        console.log(`[ef:${label}] Cache scan completed in ${scanElapsed}ms, no cache found - will compute MD5`);
      }
    } catch (error) {
      // If cache directory doesn't exist or can't be read, continue to MD5 computation
      const scanElapsed = Date.now() - scanStartTime;
      console.log(`[ef:${label}] Cache scan failed after ${scanElapsed}ms, will compute MD5: ${error}`);
      log(`Cache scan failed, will compute MD5: ${error}`);
    }

    // Only compute MD5 if we didn't find an existing cache
    if (!md5) {
      const md5StartTime = Date.now();
      console.log(`[ef:${label}] Computing MD5 for ${absolutePath}...`);
      md5 = await md5FilePath(absolutePath);
      const md5Elapsed = Date.now() - md5StartTime;
      console.log(`[ef:${label}] MD5 computed in ${md5Elapsed}ms: ${md5}`);
    }
    
    const cacheDir = path.join(cacheDirRoot, md5);
    log(`Cache dir: ${cacheDir}`);
    await mkdir(cacheDir, { recursive: true });

    if (!cachePath) {
      cachePath = path.join(cacheDir, expectedFilename);
    }
    const key = cachePath;

    // Check if cache exists and is valid (not zero-byte)
    if (existsSync(cachePath) && (await isValidCacheFile(cachePath))) {
      log(`Returning cached ef:${label} task for ${key}`);
      return { cachePath, md5Sum: md5 };
    }

    const maybeTask = tasks[key];
    if (maybeTask) {
      log(`Returning existing ef:${label} task for ${key}`);
      return await maybeTask;
    }

    log(`Creating new ef:${label} task for ${key}`);
    const fullTask = (async (): Promise<TaskResult> => {
      try {
        log(`Awaiting task for ${key}`);
        const result = await runner(absolutePath, ...args);

        if (result instanceof Readable) {
          log(`Piping task for ${key} to cache`);
          // Use temporary file to prevent reading incomplete results
          const tempPath = `${cachePath}.tmp`;
          const writeStream = createWriteStream(tempPath);
          result.pipe(writeStream);

          await new Promise<void>((resolve, reject) => {
            result.on("error", reject);
            writeStream.on("error", reject);
            writeStream.on("finish", () => resolve());
          });

          // Atomically move completed file to final location
          const { rename } = await import("node:fs/promises");
          await rename(tempPath, cachePath);
        } else {
          log(`Writing to ${cachePath}`);
          await writeFile(cachePath, result);
        }

        // Clean up task reference after successful completion
        delete tasks[key];

        return {
          md5Sum: md5,
          cachePath,
        };
      } catch (error) {
        // Clean up task reference on failure
        delete tasks[key];
        throw error;
      }
    })();

    tasks[key] = fullTask;
    return await fullTask;
  };
};
