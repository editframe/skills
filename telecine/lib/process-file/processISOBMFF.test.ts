import { describe, expect, test, vi } from "vitest";
import { org, apiKey } from "../../tests/@editframe/api/client";
import { join } from "node:path";
import { v4 } from "uuid";
import { stat } from "node:fs/promises";
import { db } from "@/sql-client.server";
import { processISOBMFF } from "./processISOBMFF";
import { TestProgressTracker } from "@/progress-tracking/ProgressTracker";

const fileFixture = async (filename: string) => {
  const path = join(__dirname, `test-files/${filename}`);
  const stats = await stat(path);
  return {
    path,
    stats,
  };
};

describe("processISOBMFF", () => {
  test("fails gracefully when no tracks are found in file", async () => {
    const id = v4();
    const md5 = v4();

    // Create a test file that would produce no tracks (like a plain text file)
    const testFilePath = join(__dirname, "test-files/no-tracks.txt");

    // This should throw an error when no tracks are found
    await expect(
      processISOBMFF(
        testFilePath,
        {
          id,
          md5,
          org_id: org.id,
          creator_id: org.primary_user_id,
          filename: "no-tracks.txt",
          api_key_id: apiKey.id,
          byte_size: 100, // fake size
        },
        new TestProgressTracker(),
      ),
    ).rejects.toThrow(); // Should fail when no valid tracks are found

    // Verify no isobmff_file record was created for failed processing
    const failedFile = await db
      .selectFrom("video2.isobmff_files")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirst();

    expect(failedFile).toBeUndefined();
  });

  test("processes bars-n-tone.mp4 file successfully (full integration)", async () => {
    const id = v4();
    const md5 = v4();
    const fixture = await fileFixture("bars-n-tone.mp4");

    // Process the minimal test file - should succeed
    const result = await processISOBMFF(
      fixture.path,
      {
        id,
        md5,
        org_id: org.id,
        creator_id: org.primary_user_id,
        filename: "bars-n-tone.mp4",
        api_key_id: apiKey.id,
        byte_size: fixture.stats.size,
      },
      new TestProgressTracker(),
    );

    // Verify the file was processed successfully
    expect(result).toBeDefined();
    expect(result.id).toBe(id);

    // Verify isobmff_file record was created
    const processedFile = await db
      .selectFrom("video2.isobmff_files")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirst();

    expect(processedFile).toBeDefined();
    expect(processedFile!.filename).toBe("bars-n-tone.mp4");
    expect(processedFile!.fragment_index_complete).toBe(true);

    // Verify tracks were created
    const tracks = await db
      .selectFrom("video2.isobmff_tracks")
      .where("file_id", "=", id)
      .selectAll()
      .execute();

    expect(tracks.length).toBeGreaterThan(0);

    // bars-n-tone.mp4 should have both video and audio tracks
    const videoTracks = tracks.filter((track) => track.type === "video");
    const audioTracks = tracks.filter((track) => track.type === "audio");

    expect(videoTracks.length).toBeGreaterThan(0); // bars-n-tone definitely has video
    expect(audioTracks.length).toBeGreaterThan(0); // bars-n-tone definitely has audio

    // All tracks should be marked as complete
    tracks.forEach((track) => {
      expect(track.complete).toBe(true);
      expect(track.byte_size).toBeGreaterThan(0);
      expect(track.duration_ms).toBeGreaterThan(0);
      expect(track.codec_name).toBeTruthy();
    });
  });

  test("processes bars-n-tone.mp4 file successfully", async () => {
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
        filename: "bars-n-tone.mp4",
        api_key_id: apiKey.id,
        byte_size: fixture.stats.size,
      },
      new TestProgressTracker(),
    );

    expect(result).toBeTruthy();
    expect(result.id).toBe(id);
  }, 30000); // 30 second timeout

  test("processes card-joker.mp3 file successfully", async () => {
    const id = v4();
    const md5 = v4();
    const fixture = await fileFixture("card-joker.mp3");

    const result = await processISOBMFF(
      fixture.path,
      {
        id,
        md5,
        org_id: org.id,
        creator_id: org.primary_user_id,
        filename: "card-joker.mp3",
        api_key_id: apiKey.id,
        byte_size: fixture.stats.size,
      },
      new TestProgressTracker(),
    );

    expect(result).toBeTruthy();
    expect(result.id).toBe(id);
  });

  test("progress tracking scales from 20% to 95% during processing", async () => {
    const id = v4();
    const md5 = v4();
    const fixture = await fileFixture("bars-n-tone.mp4");

    // Create a mock progress tracker that records all progress updates
    const progressUpdates: number[] = [];
    const mockTracker = {
      startHeartbeat: vi.fn(),
      stopHeartbeat: vi.fn(),
      writeProgress: vi.fn(async (progress: number) => {
        progressUpdates.push(progress);
      }),
      writeFailure: vi.fn(),
    };

    await processISOBMFF(
      fixture.path,
      {
        id,
        md5,
        org_id: org.id,
        creator_id: org.primary_user_id,
        filename: "progress-test.mp4",
        api_key_id: apiKey.id,
        byte_size: fixture.stats.size,
      },
      mockTracker as any,
    );

    // Verify heartbeat was started and stopped
    expect(mockTracker.startHeartbeat).toHaveBeenCalledTimes(1);
    expect(mockTracker.stopHeartbeat).toHaveBeenCalledTimes(1);

    // Verify progress updates
    expect(progressUpdates.length).toBeGreaterThan(0);

    // First progress update should be >= 20%
    expect(progressUpdates[0]).toBeGreaterThanOrEqual(0.2);

    // Progress should never exceed 95% during processing
    const processingUpdates = progressUpdates.slice(0, -1); // Exclude final 100%
    processingUpdates.forEach((progress) => {
      expect(progress).toBeGreaterThanOrEqual(0.2);
      expect(progress).toBeLessThanOrEqual(0.95);
    });

    // Final progress should be 100%
    expect(progressUpdates[progressUpdates.length - 1]).toBe(1);

    // Progress should be monotonically increasing
    for (let i = 1; i < progressUpdates.length; i++) {
      expect(progressUpdates[i]).toBeGreaterThanOrEqual(
        progressUpdates[i - 1]!,
      );
    }
  });

  test("handles storage write failures gracefully", async () => {
    const id = v4();
    const md5 = v4();
    const fixture = await fileFixture("bars-n-tone.mp4");

    // Mock storage provider to fail
    const { storageProvider } = await import("@/util/storageProvider.server");
    const originalCreateWriteStream = storageProvider.createWriteStream;

    storageProvider.createWriteStream = vi
      .fn()
      .mockRejectedValue(new Error("Storage write failed"));

    try {
      await expect(
        processISOBMFF(
          fixture.path,
          {
            id,
            md5,
            org_id: org.id,
            creator_id: org.primary_user_id,
            filename: "storage-fail.mp4",
            api_key_id: apiKey.id,
            byte_size: fixture.stats.size,
          },
          new TestProgressTracker(),
        ),
      ).rejects.toThrow("Storage write failed");

      // Verify no tracks were created in DB on failure
      const tracks = await db
        .selectFrom("video2.isobmff_tracks")
        .where("file_id", "=", id)
        .selectAll()
        .execute();

      expect(tracks.length).toBe(0);
    } finally {
      // Restore original function
      storageProvider.createWriteStream = originalCreateWriteStream;
    }
  });

  test("handles corrupted file data gracefully", async () => {
    const id = v4();
    const md5 = v4();

    // Use a non-media file that will fail processing
    const corruptedFile = join(__dirname, "test-files/no-tracks.txt");

    const mockTracker = {
      startHeartbeat: vi.fn(),
      stopHeartbeat: vi.fn(),
      writeProgress: vi.fn(),
      writeFailure: vi.fn(),
    };

    await expect(
      processISOBMFF(
        corruptedFile,
        {
          id,
          md5,
          org_id: org.id,
          creator_id: org.primary_user_id,
          filename: "corrupted.mp4",
          api_key_id: apiKey.id,
          byte_size: 100,
        },
        mockTracker as any,
      ),
    ).rejects.toThrow();

    // Verify failure was written to tracker
    expect(mockTracker.writeFailure).toHaveBeenCalledTimes(1);
    expect(mockTracker.stopHeartbeat).toHaveBeenCalledTimes(1);
  });

  test("processes files with multiple video and audio tracks", async () => {
    const id = v4();
    const md5 = v4();
    // Note: This test requires a multi-track file. For now using bars-n-tone.mp4
    const fixture = await fileFixture("bars-n-tone.mp4");

    await processISOBMFF(
      fixture.path,
      {
        id,
        md5,
        org_id: org.id,
        creator_id: org.primary_user_id,
        filename: "multi-track.mp4",
        api_key_id: apiKey.id,
        byte_size: fixture.stats.size,
      },
      new TestProgressTracker(),
    );

    // Verify tracks were created
    const tracks = await db
      .selectFrom("video2.isobmff_tracks")
      .where("file_id", "=", id)
      .selectAll()
      .execute();

    expect(tracks.length).toBeGreaterThan(0);

    // Verify each track has proper metadata
    for (const track of tracks) {
      expect(track.track_id).toBeGreaterThan(0);
      expect(["video", "audio"]).toContain(track.type);
      expect(track.byte_size).toBeGreaterThan(0);
      expect(track.duration_ms).toBeGreaterThan(0);
      expect(track.codec_name).toBeTruthy();
      expect(track.complete).toBe(true);
      expect(track.probe_info).toBeTruthy();

      // Validate probe info (it's already parsed as JSON in the database)
      const probeInfo = track.probe_info;
      expect(probeInfo).toBeDefined();
    }
  });

  test("processes WAV files successfully with conforming stream system", async () => {
    const id = v4();
    const md5 = v4();
    const fixture = await fileFixture("test-sample.wav");

    const result = await processISOBMFF(
      fixture.path,
      {
        id,
        md5,
        org_id: org.id,
        creator_id: org.primary_user_id,
        filename: "test-sample.wav",
        api_key_id: apiKey.id,
        byte_size: fixture.stats.size,
      },
      new TestProgressTracker(),
    );

    expect(result).toBeDefined();
    expect(result.id).toBe(id);

    // Verify tracks were created - WAV should be transcoded to AAC
    const tracks = await db
      .selectFrom("video2.isobmff_tracks")
      .where("file_id", "=", id)
      .selectAll()
      .execute();

    expect(tracks.length).toBe(1); // WAV should have exactly 1 audio track

    const track = tracks[0]!;
    expect(track.type).toBe("audio");
    expect(track.codec_name).toContain("mp4a"); // AAC-LC codec tag in MP4 container
    expect(track.byte_size).toBeGreaterThan(0);
    expect(track.duration_ms).toBeGreaterThan(0);
    expect(track.complete).toBe(true);
  });
});
