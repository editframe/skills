import { idempotentTask } from "../idempotentTask.js";
import debug from "debug";
import { basename } from "node:path";
import { Probe } from "../Probe.js";
import { generateFragmentIndex } from "../generateFragmentIndex.js";
import type { TrackFragmentIndex } from "../Probe.js";

export const generateTrackFragmentIndexFromPath = async (
  absolutePath: string,
) => {
  const log = debug("ef:generateTrackFragment");
  const probe = await Probe.probePath(absolutePath);

  // Extract timing offset from probe metadata (same logic as processISOBMFF.ts)
  let startTimeOffsetMs: number | undefined;

  // First check format-level start_time
  if (probe.format.start_time && Number(probe.format.start_time) !== 0) {
    startTimeOffsetMs = Number(probe.format.start_time) * 1000;
    log(
      `Extracted format start_time offset: ${probe.format.start_time}s (${startTimeOffsetMs}ms)`,
    );
  } else {
    // Check for video stream start_time (more common)
    const videoStream = probe.streams.find(
      (stream) => stream.codec_type === "video",
    );
    if (
      videoStream &&
      videoStream.start_time &&
      Number(videoStream.start_time) !== 0
    ) {
      startTimeOffsetMs = Number(videoStream.start_time) * 1000;
      log(
        `Extracted video stream start_time offset: ${videoStream.start_time}s (${startTimeOffsetMs}ms)`,
      );
    } else {
      log(
        "No format/stream timing offset found - will detect from composition time",
      );
    }
  }

  log(
    `Generating track fragment index for ${absolutePath} using single-track approach`,
  );

  // FIXED: Generate fragment indexes from individual single-track files
  // This ensures byte offsets match the actual single-track files that clients will request
  const trackFragmentIndexes: Record<number, TrackFragmentIndex> = {};

  // Process each audio/video stream as a separate track
  for (let streamIndex = 0; streamIndex < probe.streams.length; streamIndex++) {
    const stream = probe.streams[streamIndex]!;

    // Only process audio and video streams
    if (stream.codec_type !== "audio" && stream.codec_type !== "video") {
      continue;
    }

    const trackId = streamIndex + 1; // Convert to 1-based track ID
    log(`Processing track ${trackId} (${stream.codec_type})`);

    // Generate single-track file and its fragment index
    const trackStream = probe.createTrackReadstream(streamIndex);
    const trackIdMapping = { 0: trackId }; // Map single-track stream index 0 to original track ID

    const singleTrackIndexes = await generateFragmentIndex(
      trackStream,
      startTimeOffsetMs,
      trackIdMapping,
    );

    // Merge the single-track index into the combined result
    Object.assign(trackFragmentIndexes, singleTrackIndexes);
  }

  return trackFragmentIndexes;
};

const generateTrackFragmentIndexTask = idempotentTask({
  label: "trackFragmentIndex",
  filename: (absolutePath) => `${basename(absolutePath)}.tracks.json`,
  runner: async (absolutePath: string) => {
    const index = await generateTrackFragmentIndexFromPath(absolutePath);
    return JSON.stringify(index, null, 2);
  },
});

export const generateTrackFragmentIndex = async (
  cacheRoot: string,
  absolutePath: string,
) => {
  try {
    return await generateTrackFragmentIndexTask(cacheRoot, absolutePath);
  } catch (error) {
    console.trace("Error generating track fragment index", error);
    throw error;
  }
};
