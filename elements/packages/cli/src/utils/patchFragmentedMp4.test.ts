import { readFile, writeFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ISOBoxer from "codem-isoboxer";

const fragFixture = resolve(
  __dirname,
  "../../../../test-assets/frame-count.frag.mp4",
);

describe("patchMoovDuration", () => {
  it("sets mvhd.duration from durationMs using the file's timescale", async () => {
    const { patchMoovDuration } = await import("./patchFragmentedMp4.js");
    const buf = await readFile(fragFixture);
    const arrayBuffer = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    );

    const patched = patchMoovDuration(arrayBuffer, 5000);

    const iso = ISOBoxer.parseBuffer(patched);
    const mvhd = iso.fetch("mvhd");
    expect(mvhd?.timescale).toBe(1000);
    expect(mvhd?.duration).toBe(5000); // 5000ms * (1000 timescale / 1000) = 5000
  });

  it("zeroes tkhd and mdhd durations", async () => {
    const { patchMoovDuration } = await import("./patchFragmentedMp4.js");
    const buf = await readFile(fragFixture);
    const arrayBuffer = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    );

    const patched = patchMoovDuration(arrayBuffer, 5000);

    const iso = ISOBoxer.parseBuffer(patched);
    for (const tkhd of iso.fetchAll("tkhd")) {
      expect(tkhd?.duration).toBe(0);
    }
    for (const mdhd of iso.fetchAll("mdhd")) {
      expect(mdhd?.duration).toBe(0);
    }
  });

  it("removes edts boxes from all trak children", async () => {
    const { patchMoovDuration } = await import("./patchFragmentedMp4.js");
    const buf = await readFile(fragFixture);
    const arrayBuffer = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    );

    const patched = patchMoovDuration(arrayBuffer, 5000);

    const iso = ISOBoxer.parseBuffer(patched);
    expect(iso.fetchAll("edts").length).toBe(0);
  });

  it("preserves moof boxes (output is still fragmented)", async () => {
    const { patchMoovDuration } = await import("./patchFragmentedMp4.js");
    const buf = await readFile(fragFixture);
    const arrayBuffer = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    );

    const patched = patchMoovDuration(arrayBuffer, 5000);

    const iso = ISOBoxer.parseBuffer(patched);
    expect(iso.fetchAll("moof").length).toBeGreaterThan(0);
  });
});

describe("patchFragmentedMp4", () => {
  let tmpPath: string;

  beforeEach(async () => {
    tmpPath = join(tmpdir(), `ef-test-${Date.now()}.mp4`);
    const src = await readFile(fragFixture);
    await writeFile(tmpPath, src);
  });

  afterEach(async () => {
    if (existsSync(tmpPath)) await unlink(tmpPath);
    const tmp2 = tmpPath + ".tmp.mp4";
    if (existsSync(tmp2)) await unlink(tmp2);
    vi.restoreAllMocks();
  });

  it("patches mvhd.duration in the output file", async () => {
    vi.mock("node:child_process", async (importOriginal) => {
      const original =
        await importOriginal<typeof import("node:child_process")>();
      return {
        ...original,
        spawnSync: () => ({ status: 1, stderr: Buffer.from("") }),
      };
    });
    const { patchFragmentedMp4 } = await import("./patchFragmentedMp4.js");

    await patchFragmentedMp4(tmpPath, 3000);

    const result = await readFile(tmpPath);
    const arrayBuffer = result.buffer.slice(
      result.byteOffset,
      result.byteOffset + result.byteLength,
    );
    const iso = ISOBoxer.parseBuffer(arrayBuffer);
    const mvhd = iso.fetch("mvhd");
    expect(mvhd?.duration).toBe(3000);
  });

  it("logs a message when ffmpeg is not available", async () => {
    vi.mock("node:child_process", async (importOriginal) => {
      const original =
        await importOriginal<typeof import("node:child_process")>();
      return {
        ...original,
        spawnSync: () => ({ status: null, error: new Error("ENOENT") }),
      };
    });
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const { patchFragmentedMp4 } = await import("./patchFragmentedMp4.js");

    await patchFragmentedMp4(tmpPath, 3000);

    const output = stderrSpy.mock.calls.map((c) => c[0]).join("");
    expect(output).toMatch(/ffmpeg/i);
    stderrSpy.mockRestore();
  });
});
