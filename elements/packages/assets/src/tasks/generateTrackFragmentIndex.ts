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

  const startTimeOffsetMs = probe.startTimeOffsetMs;
  if (startTimeOffsetMs !== undefined) {
    log(`Extracted start_time offset: ${startTimeOffsetMs}ms`);
  } else {
    log("No format/stream timing offset found - will detect from composition time");
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

  // Generate scrub track fragment index if video stream exists
  if (probe.videoStreams.length > 0) {
    try {
      log("Generating scrub track fragment index");
      // Generate scrub track stream and fragment index directly (don't generate full file)
      const scrubStream = probe.createScrubTrackReadstream();
      const scrubTrackId = -1;
      const trackIdMapping = { 0: scrubTrackId }; // Map single-track stream index 0 to scrub track ID -1

      const scrubFragmentIndex = await generateFragmentIndex(
        scrubStream,
        startTimeOffsetMs,
        trackIdMapping,
      );

      if (scrubFragmentIndex[scrubTrackId]) {
        trackFragmentIndexes[scrubTrackId] = scrubFragmentIndex[scrubTrackId]!;
        log("Scrub track fragment index generated successfully");
      }
    } catch (error) {
      log(`Failed to generate scrub track fragment index: ${error}`);
      // Don't fail the entire operation if scrub track generation fails
    }
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
