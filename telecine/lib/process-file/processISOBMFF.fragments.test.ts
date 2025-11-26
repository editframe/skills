import { describe, expect, test, beforeAll } from "vitest";
import { org, apiKey } from "../../tests/@editframe/api/client";
import { join } from "node:path";
import { v4 } from "uuid";
import { stat } from "node:fs/promises";
import { db } from "@/sql-client.server";
import { processISOBMFF } from "./processISOBMFF";
import { TestProgressTracker } from "@/progress-tracking/ProgressTracker";
import { storageProvider } from "@/util/storageProvider.server";
import { isobmffIndexFilePath, isobmffTrackFilePath } from "@/util/filePaths";
import type { TrackFragmentIndex } from "@editframe/assets";

const fileFixture = async (filename: string) => {
  const path = join(__dirname, `test-files/${filename}`);
  const stats = await stat(path);
  return {
    path,
    stats,
  };
};

describe("processISOBMFF - fragment boundary validation", () => {
  beforeAll(async () => {
    // Storage provider initialization happens automatically
  });

  test("correctly identifies init segment boundaries", async () => {
    const id = v4();
    const md5 = v4();
    const fixture = await fileFixture("bars-n-tone.mp4");

    const result = await processISOBMFF(
      fixture.path,
      {
        id,
        md5,
        org_id: org.id,
        creator_id: org.primary_user_id,
        filename: "init-segment-test.mp4",
        api_key_id: apiKey.id,
        byte_size: fixture.stats.size,
      },
      new TestProgressTracker(),
    );

    // Read the fragment index
    const indexPath = isobmffIndexFilePath({
      org_id: org.id,
      id: result.id,
    });
    const indexContent = await storageProvider.readFile(indexPath);
    const fragmentIndex: Record<number, TrackFragmentIndex> =
      JSON.parse(indexContent);

    // Verify each track has an init segment
    for (const [trackId, track] of Object.entries(fragmentIndex)) {
      expect(track.initSegment).toBeDefined();
      expect(track.initSegment.offset).toBe(0); // Init segment should start at beginning
      expect(track.initSegment.size).toBeGreaterThan(0);

      // Init segment size should be reasonable (typically < 10KB for most files)
      expect(track.initSegment.size).toBeLessThan(50000);
    }
  });

  test("validates fragment offsets are sequential and non-overlapping", async () => {
    const id = v4();
    const md5 = v4();
    const fixture = await fileFixture("bars-n-tone.mp4");

    const result = await processISOBMFF(
      fixture.path,
      {
        id,
        md5,
        org_id: org.id,
        creator_id: org.primary_user_id,
        filename: "sequential-fragments.mp4",
        api_key_id: apiKey.id,
        byte_size: fixture.stats.size,
      },
      new TestProgressTracker(),
    );

    // Read the fragment index
    const indexPath = isobmffIndexFilePath({
      org_id: org.id,
      id: result.id,
    });
    const indexContent = await storageProvider.readFile(indexPath);
    const fragmentIndex: Record<number, TrackFragmentIndex> =
      JSON.parse(indexContent);

    // For each track, verify segments are sequential
    for (const [trackId, track] of Object.entries(fragmentIndex)) {
      if (track.segments.length > 1) {
        for (let i = 1; i < track.segments.length; i++) {
          const prevSegment = track.segments[i - 1]!;
          const currSegment = track.segments[i]!;

          // Current segment should start where previous ended
          expect(currSegment.offset).toBe(
            prevSegment.offset + prevSegment.size,
          );
        }
      }
    }
  });

  test("fragment byte offsets match actual track file sizes", async () => {
    const id = v4();
    const md5 = v4();
    const fixture = await fileFixture("bars-n-tone.mp4");

    const result = await processISOBMFF(
      fixture.path,
      {
        id,
        md5,
        org_id: org.id,
        creator_id: org.primary_user_id,
        filename: "offset-validation.mp4",
        api_key_id: apiKey.id,
        byte_size: fixture.stats.size,
      },
      new TestProgressTracker(),
    );

    // Read the fragment index
    const indexPath = isobmffIndexFilePath({
      org_id: org.id,
      id: result.id,
    });
    const indexContent = await storageProvider.readFile(indexPath);
    const fragmentIndex: Record<number, TrackFragmentIndex> =
      JSON.parse(indexContent);

    // Get track records from database
    const tracks = await db
      .selectFrom("video2.isobmff_tracks")
      .where("file_id", "=", id)
      .selectAll()
      .execute();

    // Verify each track's total size matches fragment offsets
    for (const track of tracks) {
      const trackIndex = fragmentIndex[track.track_id];
      expect(trackIndex).toBeDefined();

      if (trackIndex!.segments.length > 0) {
        const lastSegment =
          trackIndex!.segments[trackIndex!.segments.length - 1]!;
        const totalSizeFromFragments = lastSegment.offset + lastSegment.size;

        // The track byte_size in DB should match the total from fragments
        expect(track.byte_size).toBe(totalSizeFromFragments);
      }
    }
  });

  test("media segments have valid timing information", async () => {
    const id = v4();
    const md5 = v4();
    const fixture = await fileFixture("bars-n-tone.mp4");

    const result = await processISOBMFF(
      fixture.path,
      {
        id,
        md5,
        org_id: org.id,
        creator_id: org.primary_user_id,
        filename: "timing-validation.mp4",
        api_key_id: apiKey.id,
        byte_size: fixture.stats.size,
      },
      new TestProgressTracker(),
    );

    // Read the fragment index
    const indexPath = isobmffIndexFilePath({
      org_id: org.id,
      id: result.id,
    });
    const indexContent = await storageProvider.readFile(indexPath);
    const fragmentIndex: Record<number, TrackFragmentIndex> =
      JSON.parse(indexContent);

    // Verify timing information for each segment
    for (const [trackId, track] of Object.entries(fragmentIndex)) {
      let totalDuration = 0;

      for (const segment of track.segments) {
        // CTS and DTS should be valid numbers
        expect(typeof segment.cts).toBe("number");
        expect(typeof segment.dts).toBe("number");
        expect(segment.cts).toBeGreaterThanOrEqual(0);
        expect(segment.dts).toBeGreaterThanOrEqual(0);

        // Duration should be positive
        expect(segment.duration).toBeGreaterThan(0);

        // CTS should be >= DTS (presentation time >= decode time)
        expect(segment.cts).toBeGreaterThanOrEqual(segment.dts);

        totalDuration += segment.duration;
      }

      // Total duration from segments should match track duration
      expect(totalDuration).toBe(track.duration);
    }
  });

  test("fragment sizes are reasonable and consistent", async () => {
    const id = v4();
    const md5 = v4();
    const fixture = await fileFixture("bars-n-tone.mp4");

    const result = await processISOBMFF(
      fixture.path,
      {
        id,
        md5,
        org_id: org.id,
        creator_id: org.primary_user_id,
        filename: "fragment-size-test.mp4",
        api_key_id: apiKey.id,
        byte_size: fixture.stats.size,
      },
      new TestProgressTracker(),
    );

    // Read the fragment index
    const indexPath = isobmffIndexFilePath({
      org_id: org.id,
      id: result.id,
    });
    const indexContent = await storageProvider.readFile(indexPath);
    const fragmentIndex: Record<number, TrackFragmentIndex> =
      JSON.parse(indexContent);

    // Analyze fragment sizes
    for (const [trackId, track] of Object.entries(fragmentIndex)) {
      const segmentSizes = track.segments.map((s) => s.size);

      if (segmentSizes.length > 0) {
        // All segments should have positive size
        segmentSizes.forEach((size) => {
          expect(size).toBeGreaterThan(0);
        });

        // For video tracks, segments are typically 100KB - 10MB
        if (track.type === "video") {
          const avgSize =
            segmentSizes.reduce((a, b) => a + b, 0) / segmentSizes.length;
          expect(avgSize).toBeGreaterThan(1000); // At least 1KB
          expect(avgSize).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
        }

        // For audio tracks, segments are typically smaller
        if (track.type === "audio") {
          const avgSize =
            segmentSizes.reduce((a, b) => a + b, 0) / segmentSizes.length;
          expect(avgSize).toBeGreaterThan(100); // At least 100 bytes
          expect(avgSize).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
        }
      }
    }
  });

  test("verifies track metadata is correctly extracted", async () => {
    const id = v4();
    const md5 = v4();
    const fixture = await fileFixture("bars-n-tone.mp4");

    const result = await processISOBMFF(
      fixture.path,
      {
        id,
        md5,
        org_id: org.id,
        creator_id: org.primary_user_id,
        filename: "metadata-test.mp4",
        api_key_id: apiKey.id,
        byte_size: fixture.stats.size,
      },
      new TestProgressTracker(),
    );

    // Read the fragment index
    const indexPath = isobmffIndexFilePath({
      org_id: org.id,
      id: result.id,
    });
    const indexContent = await storageProvider.readFile(indexPath);
    const fragmentIndex: Record<number, TrackFragmentIndex> =
      JSON.parse(indexContent);

    // Verify video track metadata
    const videoTrack = Object.values(fragmentIndex).find(
      (t) => t.type === "video",
    );
    if (videoTrack) {
      expect(videoTrack.width).toBeGreaterThan(0);
      expect(videoTrack.height).toBeGreaterThan(0);
      expect(videoTrack.codec).toBeTruthy();
      expect(videoTrack.timescale).toBeGreaterThan(0);
      expect(videoTrack.sample_count).toBeGreaterThan(0);
    }

    // Verify audio track metadata
    const audioTrack = Object.values(fragmentIndex).find(
      (t) => t.type === "audio",
    );
    if (audioTrack) {
      expect(audioTrack.channel_count).toBeGreaterThan(0);
      expect(audioTrack.sample_rate).toBeGreaterThan(0);
      expect(audioTrack.codec).toBeTruthy();
      expect(audioTrack.timescale).toBeGreaterThan(0);
      expect(audioTrack.sample_count).toBeGreaterThan(0);
    }
  });
});
