import { describe, test } from "vitest";
import { transcodeVideoSegment } from "./video-transcoder";
import { SEGMENT_DURATION } from "./transcoder-types";
import type { PacketProbe } from "@editframe/assets";
import { PacketProbe as PacketProbeClass } from "@editframe/assets";
import { Readable } from "node:stream";
import { readFile } from "node:fs/promises";
import { calculateSegmentDurations } from "./calculateSegmentDurations";
import { truncateDecimal } from "@/util/truncateDecimal";

const concatPaths = async (paths: string[]) => {
  const readabbles = await Promise.all(paths.map((path) => readFile(path)));
  return new Readable({
    read() {
      for (const readable of readabbles) {
        this.push(readable);
      }
      this.push(null);
    },
  });
};

describe("video-transcoder", () => {
  test("produces predictable segment durations", { timeout: 60_000 }, async ({ expect }) => {
    const initSegmentPath = await transcodeVideoSegment({
      inputUrl: "/app/test-assets/transcode/head-moov-480p.mp4",
      segmentId: "init",
      segmentDurationMs: SEGMENT_DURATION,
      outputDir: "/app/temp",
      rendition: "low",
    });

    const segmentIds = [1, 2, 3, 4, 5];
    const probes: PacketProbe[] = [];
    for (const id of segmentIds) {
      const segmentPath = await transcodeVideoSegment({
        inputUrl: "/app/test-assets/transcode/head-moov-480p.mp4",
        segmentId: id,
        segmentDurationMs: SEGMENT_DURATION,
        outputDir: "/app/temp",
        rendition: "low",
      });
      const combinedStream = await concatPaths([initSegmentPath, segmentPath]);
      probes.push(await PacketProbeClass.probeStream(combinedStream));
    }
    const segmentDurations = probes.map((probe) => probe.videoPacketDuration);

    const calculatedDurationsMs = calculateSegmentDurations(
      segmentIds.length * SEGMENT_DURATION,
      SEGMENT_DURATION,
      { mediaType: "video" },
    );
    const calculatedDurations = calculatedDurationsMs.map((d) =>
      truncateDecimal(d / 1000, 4),
    );

    expect(segmentDurations).toEqual(calculatedDurations);
  });
});
