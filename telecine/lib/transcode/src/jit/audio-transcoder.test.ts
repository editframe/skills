import { describe, test } from "vitest";
import { transcodeAudioSegment } from "./audio-transcoder";
import { SEGMENT_DURATION, SegmentDurationType } from "./transcoder-types";
import { PacketProbe, Probe } from "@editframe/assets";
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
    }
  });
}

describe("audio-transcoder", () => {
  test("produces predictable segment durations", async ({ expect }) => {
    const initSegmentPath = await transcodeAudioSegment({
      inputUrl: "/app/test-assets/transcode/head-moov-480p.mp4",
      segmentId: "init",
      segmentDurationMs: SEGMENT_DURATION,
      outputDir: "/app/temp",
      rendition: "audio",
    });

    const segmentIds = [1, 2, 3, 4, 5];
    const probes: PacketProbe[] = [];
    for (const id of segmentIds) {
      const segmentPath = await transcodeAudioSegment({
        inputUrl: "/app/test-assets/transcode/head-moov-480p.mp4",
        segmentId: id,
        segmentDurationMs: SEGMENT_DURATION,
        outputDir: "/app/temp",
        rendition: "audio",
      });
      const combinedStream = await concatPaths([initSegmentPath, segmentPath]);
      probes.push(await PacketProbe.probeStream(combinedStream));
    }
    const segmentDurations = probes.map((probe) => probe.bestEffortAudioDuration);

    const calculatedDurationsMs = calculateSegmentDurations(segmentIds.length * SEGMENT_DURATION, SEGMENT_DURATION, { mediaType: 'audio' });
    const calculatedDurations = calculatedDurationsMs.map(d => d / 1000); // Convert to seconds to match probe

    expect(segmentDurations).toEqual(calculatedDurations);
  });
});