import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Probe, PacketProbe } from "./Probe.js";

const TEST_ASSET_WITH_OFFSET = "test-assets/frame-count.frag.mp4"; // video stream start_time = 0.1s
const TEST_ASSET_NO_OFFSET = "test-assets/bars-n-tone.mp4";

const TEST_ASSET = "test-assets/bars-n-tone.mp4";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(tmpdir(), "ef-probe-test-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("Probe.probePath", () => {
  it("probes a file whose path contains spaces", async () => {
    const dest = path.join(tmpDir, "bars n tone.mp4");
    await copyFile(TEST_ASSET, dest);

    const probe = await Probe.probePath(dest);

    expect(probe.videoStreams).toHaveLength(1);
    expect(probe.audioStreams).toHaveLength(1);
  });

  it("probes a file whose path contains shell metacharacters", async () => {
    const dest = path.join(tmpDir, "bars$(echo injected)tone.mp4");
    await copyFile(TEST_ASSET, dest);

    const probe = await Probe.probePath(dest);

    expect(probe.videoStreams).toHaveLength(1);
  });
});

describe("PacketProbe.probePath", () => {
  it("probes a file whose path contains spaces", async () => {
    const dest = path.join(tmpDir, "bars n tone.mp4");
    await copyFile(TEST_ASSET, dest);

    const probe = await PacketProbe.probePath(dest);

    expect(probe.videoStreams).toHaveLength(1);
    expect(probe.packets.length).toBeGreaterThan(0);
  });
});

describe("Probe.startTimeOffsetMs", () => {
  it("returns 100ms offset for frame-count.frag.mp4 (video stream start_time = 0.1s)", async () => {
    const probe = await Probe.probePath(TEST_ASSET_WITH_OFFSET);

    expect(probe.startTimeOffsetMs).toBe(100);
  });

  it("returns undefined for bars-n-tone.mp4 which has no timing offset", async () => {
    const probe = await Probe.probePath(TEST_ASSET_NO_OFFSET);

    expect(probe.startTimeOffsetMs).toBeUndefined();
  });
});
