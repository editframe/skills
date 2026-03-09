import { idempotentTask } from "../idempotentTask.js";
import debug from "debug";
import { basename } from "node:path";
import { Probe } from "../Probe.js";
import { generateFragmentIndex } from "../generateFragmentIndex.js";
import type { TrackFragmentIndex } from "../Probe.js";

export const generateTrackFragmentIndexFromPath = async (absolutePath: string) => {
  const log = debug("ef:generateTrackFragment");
  const probe = await Probe.probePath(absolutePath);

  const startTimeOffsetMs = probe.startTimeOffsetMs;
  if (startTimeOffsetMs !== undefined) {
    log(`Extracted start_time offset: ${startTimeOffsetMs}ms`);
  } else {
    log("No format/stream timing offset found - will detect from composition time");
  }

  log(`Generating track fragment index for ${absolutePath} using single-track approach`);

  // Process all audio/video streams and scrub track in parallel
  const trackTasks = probe.streams
    .map((stream, streamIndex) => {
      if (stream.codec_type !== "audio" && stream.codec_type !== "video") {
        return null;
      }
      const trackId = streamIndex + 1;
      log(`Processing track ${trackId} (${stream.codec_type})`);
      const trackStream = probe.createTrackReadstream(streamIndex);
      const trackIdMapping = { 0: trackId };
      return generateFragmentIndex(trackStream, startTimeOffsetMs, trackIdMapping);
    })
    .filter((task): task is Promise<Record<number, TrackFragmentIndex>> => task !== null);

  const scrubTask: Promise<Record<number, TrackFragmentIndex> | null> =
    probe.videoStreams.length > 0
      ? (async () => {
          try {
            log("Generating scrub track fragment index");
            const scrubStream = probe.createScrubTrackReadstream();
            const scrubTrackId = -1;
            const result = await generateFragmentIndex(scrubStream, startTimeOffsetMs, {
              0: scrubTrackId,
            });
            log("Scrub track fragment index generated successfully");
            return result;
          } catch (error) {
            log(`Failed to generate scrub track fragment index: ${error}`);
            return null;
          }
        })()
      : Promise.resolve(null);

  const [trackResults, scrubResult] = await Promise.all([Promise.all(trackTasks), scrubTask]);

  const trackFragmentIndexes: Record<number, TrackFragmentIndex> = {};
  for (const result of trackResults) {
    Object.assign(trackFragmentIndexes, result);
  }
  if (scrubResult) {
    Object.assign(trackFragmentIndexes, scrubResult);
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

export const generateTrackFragmentIndex = async (cacheRoot: string, absolutePath: string) => {
  try {
    return await generateTrackFragmentIndexTask(cacheRoot, absolutePath);
  } catch (error) {
    console.trace("Error generating track fragment index", error);
    throw error;
  }
};
