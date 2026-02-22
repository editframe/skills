import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { idempotentTask } from "./idempotentTask.js";

// The actual package version — any stale stamp we plant must differ from this
const CURRENT_VERSION = (
  JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8")) as {
    version: string;
  }
).version;
const STALE_VERSION = "0.0.0";

describe("idempotentTask version-based cache busting", () => {
  let testDir: string;
  let cacheDir: string;
  let sourceFile: string;

  beforeEach(async () => {
    testDir = join(process.cwd(), "test-cache-bust-" + Date.now());
    cacheDir = join(testDir, ".cache");
    await mkdir(cacheDir, { recursive: true });

    sourceFile = join(testDir, "source.mp4");
    await writeFile(sourceFile, "fake source content");
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  const makeTask = () =>
    idempotentTask({
      label: "bust-test",
      filename: () => "output.txt",
      runner: async () => "computed result",
    });

  test("writes .version file containing current package version on first use", async () => {
    const task = makeTask();
    await task(testDir, sourceFile);

    const versionFile = join(cacheDir, ".version");
    expect(existsSync(versionFile)).toBe(true);
    const written = (await readFile(versionFile, "utf-8")).trim();
    expect(written).toBe(CURRENT_VERSION);
  });

  test("busts computed cache subdirectories when .version file is missing", async () => {
    // Plant a fake computed output cache (simulates a previous run)
    const fakeComputedDir = join(cacheDir, "abc123deadbeef");
    await mkdir(fakeComputedDir, { recursive: true });
    await writeFile(
      join(fakeComputedDir, "video.tracks.json"),
      '{"stale": true}',
    );

    // No .version file — should be treated as incompatible
    const task = makeTask();
    await task(testDir, sourceFile);

    expect(existsSync(fakeComputedDir)).toBe(false);
  });

  test("busts computed cache subdirectories when .version is stale", async () => {
    // Plant stale version stamp
    await writeFile(join(cacheDir, ".version"), STALE_VERSION);

    // Plant fake computed output
    const fakeComputedDir = join(cacheDir, "abc123deadbeef");
    await mkdir(fakeComputedDir, { recursive: true });
    await writeFile(
      join(fakeComputedDir, "video.tracks.json"),
      '{"stale": true}',
    );

    const task = makeTask();
    await task(testDir, sourceFile);

    expect(existsSync(fakeComputedDir)).toBe(false);
  });

  test("preserves downloaded .file entries when busting stale computed caches", async () => {
    await writeFile(join(cacheDir, ".version"), STALE_VERSION);

    // Downloaded original — lives directly in .cache/ with .file extension
    const downloadedFile = join(cacheDir, "https___example_com_video_mp4.file");
    await writeFile(downloadedFile, "original video bytes");

    // Stale computed output
    const fakeComputedDir = join(cacheDir, "abc123deadbeef");
    await mkdir(fakeComputedDir, { recursive: true });
    await writeFile(
      join(fakeComputedDir, "video.tracks.json"),
      '{"stale": true}',
    );

    const task = makeTask();
    await task(testDir, sourceFile);

    expect(existsSync(fakeComputedDir)).toBe(false);
    expect(existsSync(downloadedFile)).toBe(true);
    const preserved = await readFile(downloadedFile, "utf-8");
    expect(preserved).toBe("original video bytes");
  });

  test("does not bust caches when version matches current", async () => {
    await writeFile(join(cacheDir, ".version"), CURRENT_VERSION);

    // Fake computed output from a previous run at the same version
    const fakeComputedDir = join(cacheDir, "abc123deadbeef");
    await mkdir(fakeComputedDir, { recursive: true });
    await writeFile(
      join(fakeComputedDir, "video.tracks.json"),
      '{"current": true}',
    );

    const task = makeTask();
    await task(testDir, sourceFile);

    expect(existsSync(fakeComputedDir)).toBe(true);
  });
});
