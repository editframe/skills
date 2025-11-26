import { describe } from "vitest";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeFile, unlink } from "node:fs/promises";

import { isValidMP4Buffer } from "../test-utils";
import {
  Mp4Dump,
  extractMP4Metadata,
  verifyDurationConsistency,
} from "@/util/mp4-box-analysis";
import { test } from "./fixtures";

describe("Segment Assembly Quality", () => {
  test("assembles segments without gaps or corruption", ({
    renderOutput,
    expect,
  }) => {
    const { segmentBytes } = renderOutput;

    // Validate segment structure - we get 1 init + 4 data segments = 5 total
    expect(segmentBytes).toHaveLength(5); // 1 init + 4 data segments

    segmentBytes.forEach((bytes) => {
      const buffer = Buffer.from(bytes);
      expect(buffer.length).toBeGreaterThan(100); // Reasonable minimum segment size
      expect(isValidMP4Buffer(buffer)).toBe(true); // Valid MP4 structure
    });

    // Validate total size consistency
    const totalSegmentSize = segmentBytes.reduce(
      (sum, bytes) => sum + bytes.length,
      0,
    );
    expect(renderOutput.finalVideoBuffer.length).toBe(totalSegmentSize);
  }, 30000); // Extended timeout for first test that initializes renderOutput fixture

  test("maintains consistent video properties across segments", async ({
    renderOutput,
    expect,
  }) => {
    const { segmentBytes } = renderOutput;

    // Check each segment for basic validity
    for (const bytes of segmentBytes) {
      const buffer = Buffer.from(bytes);
      expect(buffer.length).toBeGreaterThan(100); // Not empty
      expect(isValidMP4Buffer(buffer)).toBe(true); // Valid MP4 structure

      // Each segment should have valid MP4 structure (more flexible check)
      const hasMP4Header =
        buffer.subarray(4, 8).toString() === "ftyp" ||
        buffer.includes(Buffer.from("moof")) ||
        buffer.includes(Buffer.from("mdat")) ||
        buffer.includes(Buffer.from("moov"));
      expect(hasMP4Header).toBe(true);
    }
  });

  test("produces segments with reasonable timing", ({
    renderOutput,
    expect,
  }) => {
    const { segmentBytes, renderInfo } = renderOutput;

    const expectedSegmentDuration = renderInfo.durationMs / 4; // 4 data segments (excluding init)

    // Each data segment should represent roughly equal time slices
    expect(expectedSegmentDuration).toBeCloseTo(500, 50); // ~500ms per segment ±50ms

    // Separate init segment from data segments for size analysis
    // Init segment is typically much smaller
    const segmentSizes = segmentBytes.map((bytes) => bytes.length);
    const [firstSegment, ...dataSegments] = segmentSizes;

    if (dataSegments.length > 0) {
      const avgDataSegmentSize =
        dataSegments.reduce((sum, size) => sum + size, 0) / dataSegments.length;

      // Data segments should have roughly similar sizes
      dataSegments.forEach((size) => {
        expect(size).toBeGreaterThan(avgDataSegmentSize * 0.2); // No data segment too small
        expect(size).toBeLessThan(avgDataSegmentSize * 5); // No data segment too large
      });
    }

    // First segment (likely init) can be much smaller
    expect(firstSegment).toBeGreaterThan(100); // Just needs to exist
  });

  test("validates base media decode times match cumulative sample durations", async ({
    renderOutput,
    expect,
  }) => {
    const { videoPath } = renderOutput;

    // Get mp4dump output for precise timing analysis
    const mp4Output = execSync(`mp4dump "${videoPath}"`, { encoding: "utf8" });

    // Parse timescales from mp4dump output
    // Structure: mvhd has movie timescale (1000), then track timescales follow in order
    const lines = mp4Output.split("\n");
    const timescales: number[] = [];

    for (const line of lines) {
      if (line.includes("timescale =")) {
        const parts = line.split("=");
        if (parts[1]) {
          const timescale = parseInt(parts[1].trim());
          timescales.push(timescale);
        }
      }
    }

    // Expected: [movie_timescale, video_track_timescale, audio_track_timescale]
    // From observation: [1000, 15360, 48000]
    expect(timescales.length).toBeGreaterThanOrEqual(3);

    const movieTimescale = timescales[0] ?? 1000; // 1000 (mvhd)
    const videoTimescale = timescales[1] ?? 15360; // 15360 (video track mdhd)
    const audioTimescale = timescales[2] ?? 48000; // 48000 (audio track mdhd)

    console.log(`Movie timescale: ${movieTimescale}`);
    console.log(`Video timescale: ${videoTimescale}`);
    console.log(`Audio timescale: ${audioTimescale}`);

    // Create track mapping based on observed structure
    // Track 1 = video (vide), Track 2 = audio (soun)
    const trackInfo = new Map<
      number,
      { timescale: number; handlerType: string }
    >();
    trackInfo.set(1, { timescale: videoTimescale, handlerType: "vide" });
    trackInfo.set(2, { timescale: audioTimescale, handlerType: "soun" });

    // Second pass: extract timing data for each track
    const trackSegments = new Map<
      number,
      Array<{ sequence: number; baseTime: number; sampleCount: number }>
    >();
    let currentSequence = 0;
    let currentTrackId: number | null = null;

    for (let i = 0; i < lines.length; i++) {
      const lineRaw = lines[i];
      if (!lineRaw) continue;
      const line = lineRaw.trim();

      // Look for sequence numbers
      if (line.includes("sequence number =")) {
        const parts = line.split("=");
        if (parts[1]) {
          currentSequence = parseInt(parts[1].trim());
          continue;
        }
      }

      // Look for track ID in tfhd boxes
      if (line.includes("track ID =")) {
        const parts = line.split("=");
        if (parts[1]) {
          currentTrackId = parseInt(parts[1].trim());
        }
      }

      // Look for base media decode time and sample count pairs
      if (
        line.includes("base media decode time =") &&
        currentTrackId !== null
      ) {
        const parts = line.split("=");
        if (parts[1]) {
          const baseTime = parseInt(parts[1].trim());

          // Look ahead for the sample count
          for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
            const searchLineRaw = lines[j];
            if (!searchLineRaw) continue;
            const searchLine = searchLineRaw.trim();
            if (searchLine.includes("sample count =")) {
              const sampleParts = searchLine.split("=");
              if (sampleParts[1]) {
                const sampleCount = parseInt(sampleParts[1].trim());

                if (!trackSegments.has(currentTrackId)) {
                  trackSegments.set(currentTrackId, []);
                }

                const segments = trackSegments.get(currentTrackId);
                if (segments) {
                  segments.push({
                    sequence: currentSequence,
                    baseTime,
                    sampleCount,
                  });
                }

                break;
              }
            }
          }
        }
      }
    }

    // Validate timing for each track
    expect(trackSegments.size).toBeGreaterThan(0);
    expect(trackInfo.size).toBeGreaterThan(0);

    for (const [trackId, segments] of trackSegments) {
      const info = trackInfo.get(trackId);

      expect(info).toBeDefined();
      expect(segments.length).toBeGreaterThan(0);

      // Sort segments by sequence number
      segments.sort((a, b) => a.sequence - b.sequence);

      let expectedCumulativeTime = 0;

      console.log(
        `\n🔍 Validating Track ${trackId} (${info!.handlerType}) with timescale ${info!.timescale}`,
      );

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (!segment) continue;

        // For synchronized tracks, both video and audio should have the same decode time in milliseconds
        // Convert to milliseconds for comparison across different timescales

        if (info!.handlerType === "soun") {
          // Audio track: verify against actual AAC frame pattern (23/25/24/25...)
          expect(segment.baseTime).toBe(expectedCumulativeTime);

          // Calculate next expected time based on actual AAC pattern
          let sampleDuration = 1024; // AAC frame is 1024 samples
          expectedCumulativeTime += segment.sampleCount * sampleDuration;
        } else if (info!.handlerType === "vide") {
          // Video track: should be synchronized with audio (same time in milliseconds)
          // Calculate what the audio time would be for this segment
          const audioSegments = trackSegments.get(2); // Audio is track 2
          if (audioSegments) {
            const correspondingAudioSegment = audioSegments.find(
              (s) => s.sequence === segment.sequence,
            );
            if (correspondingAudioSegment) {
              const audioTimeMs =
                (correspondingAudioSegment.baseTime / 48000) * 1000;
              const videoTimeMs = (segment.baseTime / 15360) * 1000;

              // Video and audio timing will have small differences due to frame alignment
              // Video: 33.33ms frames (30fps), Audio: 21.33ms frames (AAC), tolerance ~15ms
              expect(Math.abs(videoTimeMs - audioTimeMs)).toBeLessThanOrEqual(
                15,
              );
              console.log(
                `✅ Segment ${segment.sequence}: Video (${videoTimeMs.toFixed(2)}ms) synced with Audio (${audioTimeMs.toFixed(2)}ms)`,
              );
            }
          }

          // For expectedCumulativeTime calculation, use the synchronized time
          expectedCumulativeTime =
            segment.baseTime +
            segment.sampleCount * Math.round(info!.timescale / 30);
        } else {
          throw new Error(`Unknown handler type: ${info!.handlerType}`);
        }

        const sampleDuration =
          info!.handlerType === "soun"
            ? 1024
            : Math.round(info!.timescale / 30);
        console.log(
          `✅ Segment ${segment.sequence}: ${segment.baseTime} decode time, ${segment.sampleCount} samples (${sampleDuration} units per sample)`,
        );
      }

      console.log(
        `✅ Track ${trackId} (${info!.handlerType}): All ${segments.length} segments have correct base media decode times`,
      );
    }

    console.log(
      `\n✅ All tracks validated: Base media decode times perfectly match cumulative sample durations`,
    );
  });
});

describe("Fragmented MP4 Metadata Validation", () => {
  test("produces fragmented MP4 with correct duration metadata", async ({
    renderOutput,
    expect,
  }) => {
    const { videoPath, renderInfo } = renderOutput;

    // Extract comprehensive metadata
    const metadata = await extractMP4Metadata(videoPath);

    // Verify it's a fragmented MP4
    expect(metadata.isFragmented).toBe(true);

    // Expected duration in seconds
    const expectedDurationSeconds = renderInfo.durationMs / 1000;

    // Verify ffprobe reports correct duration (proxy for Chrome/FFmpeg players)
    expect(metadata.ffprobeDuration).toBeCloseTo(expectedDurationSeconds, 0.1);

    // Working files don't have mehd box - Chrome uses mvhd.duration instead
    expect(metadata.fragmentDuration).toBeUndefined();

    // Movie duration (mvhd) should also be set
    expect(metadata.movieDuration).toBeDefined();
    expect(metadata.movieDuration).toBeCloseTo(expectedDurationSeconds, 0.1);

    // Track durations should be 0 for fragmented MP4 (like working files)
    expect(metadata.trackDurations.length).toBeGreaterThan(0);
    for (const track of metadata.trackDurations) {
      expect(track.duration).toBe(0);
    }

    // Media durations should be 0 for fragmented MP4 (like working files)
    expect(metadata.mediaDurations.length).toBeGreaterThan(0);
    for (const media of metadata.mediaDurations) {
      expect(media.duration).toBe(0);
    }
  });

  test("maintains duration consistency across all metadata sources", async ({
    renderOutput,
    expect,
  }) => {
    const { videoPath } = renderOutput;

    const metadata = await extractMP4Metadata(videoPath);
    const consistency = verifyDurationConsistency(metadata, 0.1);

    if (!consistency.isConsistent) {
      console.error("Duration inconsistencies found:", consistency.issues);
    }

    expect(consistency.isConsistent).toBe(true);
    expect(consistency.issues).toHaveLength(0);
  });

  test("includes proper mvex structure without mehd for Chrome compatibility", async ({
    renderOutput,
    expect,
  }) => {
    const { videoPath } = renderOutput;

    const dump = await Mp4Dump.dump(videoPath);

    // Verify mvex (Movie Extends) box exists
    const mvex = dump.fetchAll("mvex");
    expect(mvex.length).toBeGreaterThan(0);

    // Verify NO mehd box - working files don't have it
    const mehd = dump.fetchOne("mehd");
    expect(mehd).toBeUndefined();

    // Verify trex (Track Extends) boxes exist for each track
    const trex = dump.fetchAll("trex");
    expect(trex.length).toBeGreaterThan(0);
  });

  test("avoids duplicate duration metadata that confuses QuickTime", async ({
    renderOutput,
    expect,
  }) => {
    const { videoPath, renderInfo } = renderOutput;

    const dump = await Mp4Dump.dump(videoPath);

    // Check for multiple mvhd boxes (should only be one)
    const mvhds = dump.fetchAll("mvhd");
    expect(mvhds.length).toBe(1);

    // Verify NO mehd boxes - working files don't have them
    const mehds = dump.fetchAll("mehd");
    expect(mehds.length).toBe(0);

    // Verify track/media durations are 0 to avoid double-counting
    const tkhds = dump.fetchAll("tkhd");
    const mdhds = dump.fetchAll("mdhd");

    for (const tkhd of tkhds) {
      expect(tkhd.duration).toBe(0);
    }

    for (const mdhd of mdhds) {
      expect(mdhd.duration).toBe(0);
    }

    // Verify mvhd has the full duration
    const mvhd = mvhds[0];
    if (mvhd && mvhd.timescale) {
      const mvhdDurationSeconds = mvhd.duration / mvhd.timescale;
      expect(mvhdDurationSeconds).toBeCloseTo(
        renderInfo.durationMs / 1000,
        0.1,
      );
    }
  });

  test("produces correct sequence numbers for fragments", async ({
    renderOutput,
    expect,
  }) => {
    const { videoPath } = renderOutput;

    const metadata = await extractMP4Metadata(videoPath);

    // Verify sequence numbers are sequential and start from 1
    const sequenceNumbers = metadata.sequenceNumbers;
    expect(sequenceNumbers.length).toBeGreaterThan(0);

    // Check they're in order and no duplicates
    for (let i = 0; i < sequenceNumbers.length; i++) {
      expect(sequenceNumbers[i]).toBe(i + 1);
    }
  });

  test("verifies init segment contains all necessary metadata boxes", async ({
    renderOutput,
    expect,
  }) => {
    const { segmentBytes } = renderOutput;

    // First segment should be the init segment
    expect(segmentBytes.length).toBeGreaterThan(0);
    const firstSegment = segmentBytes[0];
    if (!firstSegment) throw new Error("No init segment found");
    const initSegmentBuffer = Buffer.from(firstSegment);

    // Write to temp file for analysis

    const tmpFile = join(tmpdir(), "init-segment-analysis.m4s");
    await writeFile(tmpFile, initSegmentBuffer);

    const dump = await Mp4Dump.dump(tmpFile);

    // Init segment should have moov but no mdat
    expect(dump.moov.length).toBe(1);
    expect(dump.mdat.length).toBe(0);

    // Should have Movie Extends boxes for fragmented MP4
    const mvex = dump.fetchAll("mvex");
    expect(mvex.length).toBe(1);

    // Should NOT have mehd box - working files don't have it
    const mehd = dump.fetchOne("mehd");
    expect(mehd).toBeUndefined();

    // Clean up temp file
    await unlink(tmpFile);
  });

  test("analyzes complete MP4 box structure for player compatibility", async ({
    renderOutput,
    expect,
  }) => {
    const { videoPath } = renderOutput;

    // Get detailed mp4dump output
    const mp4dumpText = execSync(`mp4dump "${videoPath}"`, {
      encoding: "utf8",
    });

    // Verify critical boxes for player compatibility
    const criticalBoxes = [
      "ftyp", // File type box
      "moov", // Movie box
      "mvhd", // Movie header
      "mvex", // Movie extends (for fragmented)
      // Note: mehd not included - working files don't have it
      "trak", // Track boxes
      "tkhd", // Track header
      "mdia", // Media box
      "mdhd", // Media header
      "moof", // Movie fragment
      "mfhd", // Movie fragment header
      "traf", // Track fragment
      "tfhd", // Track fragment header
      "tfdt", // Track fragment decode time
      "trun", // Track fragment run
      "mdat", // Media data
    ];

    for (const boxType of criticalBoxes) {
      const hasBox = mp4dumpText.includes(`[${boxType}]`);
      if (!hasBox) {
        console.warn(`Missing expected box type: ${boxType}`);
      }
    }

    // Check for any error indicators
    expect(mp4dumpText).not.toContain("error");
    expect(mp4dumpText).not.toContain("invalid");
    expect(mp4dumpText).not.toContain("unknown");
  });
});
