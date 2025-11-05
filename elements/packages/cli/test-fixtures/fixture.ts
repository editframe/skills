import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { md5Buffer } from "@editframe/assets";
import { v4 } from "uuid";
import { expect } from "vitest";
import type { SyncStatusInfo } from "../src/operations/syncAssetsDirectory/SyncStatus.js";
import { syncAssetDirectory } from "../src/operations/syncAssetsDirectory.js";

export const fixture = async (
  fixture: string,
  name: string,
): Promise<Fixture> => {
  const originalPath = join(__dirname, fixture);
  const content = await readFile(originalPath);
  return {
    name,
    fixture,
    content,
    originalPath,
    md5: md5Buffer(content),
    write: async (dir: string) => {
      await writeFile(join(dir, name), content);
    },
  };
};
export interface Fixture {
  name: string;
  fixture: string;
  md5: string;
  content: Buffer;
  originalPath: string;
  write: (dir: string) => Promise<void>;
}
export const withFixtures = async (
  fixtures: Promise<Fixture>[],
  fn: (props: {
    files: Fixture[];
    rootDir: string;
    srcDir: string;
    assetsDir: string;
    cacheDir: string;
    expectCacheFiles: (fixture: Fixture, files: string[]) => Promise<void>;
    expectInfoFileContent: (
      fileName: string,
      fixture: Fixture,
      expectedContent: Pick<SyncStatusInfo, "complete" | "id"> & {
        byte_size?: number;
      },
    ) => Promise<void>;
    syncAssetsDirectory: () => Promise<void>;
    cacheImage: (fixture: Fixture) => Promise<string>;
    generateTrack: (fixture: Fixture, trackId: number) => Promise<string>;
    generateTrackFragmentIndex: (fixture: Fixture) => Promise<string>;
    generateCaptions: (fixture: Fixture) => Promise<string>;
  }) => Promise<void>,
) => {
  const files = await Promise.all(fixtures);
  const tempDir = `${tmpdir()}/${v4()}`;
  const srcDir = join(tempDir, "src");
  const assetsDir = join(srcDir, "assets");
  const cacheDir = join(assetsDir, ".cache");
  await mkdir(assetsDir, { recursive: true });
  await Promise.all(files.map(async (file) => file.write(assetsDir)));

  await fn({
    files,
    rootDir: tempDir,
    srcDir,
    assetsDir,
    cacheDir,
    expectCacheFiles: async (fixture, expectedFiles) => {
      const files = await readdir(join(assetsDir, ".cache", fixture.md5));
      expect(files).toEqual(expectedFiles);
    },
    expectInfoFileContent: async (fileName, fixture, expectedContent) => {
      const filePath = join(cacheDir, fixture.md5, fileName);
      const content = JSON.parse(await readFile(filePath, "utf-8"));
      expect(content).toMatchObject({
        md5: fixture.md5,
        version: "1",
        byte_size: fixture.content.length,
        ...expectedContent,
      });
    },
    syncAssetsDirectory: () => {
      return syncAssetDirectory(cacheDir);
    },
    cacheImage: async (fixture) => {
      await mkdir(join(cacheDir, fixture.md5), { recursive: true });
      const filePath = join(cacheDir, fixture.md5, fixture.name);
      await writeFile(filePath, fixture.content);
      return filePath;
    },
    generateTrack: async (fixture, trackId: number) => {
      await mkdir(join(cacheDir, fixture.md5), { recursive: true });
      const filePath = join(
        cacheDir,
        fixture.md5,
        `${fixture.name}.track-${trackId}.mp4`,
      );
      await writeFile(filePath, fixture.content);
      return filePath;
    },
    generateTrackFragmentIndex: async (fixture) => {
      await mkdir(join(cacheDir, fixture.md5), { recursive: true });
      const filePath = join(
        cacheDir,
        fixture.md5,
        `${fixture.name}.tracks.json`,
      );
      await writeFile(
        filePath,
        JSON.stringify({
          tracks: ["FAKE_TRACK_INDEX"],
        }),
      );
      return filePath;
    },
    generateCaptions: async (fixture) => {
      await mkdir(join(cacheDir, fixture.md5), { recursive: true });
      const filePath = join(
        cacheDir,
        fixture.md5,
        `${fixture.name}.captions.json`,
      );
      await writeFile(
        filePath,
        JSON.stringify({
          captions: ["FAKE_CAPTION_INDEX"],
        }),
      );
      return filePath;
    },
  });
  await rm(tempDir, { recursive: true });
};
