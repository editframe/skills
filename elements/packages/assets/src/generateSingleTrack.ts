import { idempotentTask } from "./idempotentTask.js";
import debug from "debug";
import { PassThrough } from "node:stream";
import { basename } from "node:path";
import { Probe } from "./Probe.js";
import { generateFragmentIndex } from "./generateFragmentIndex.js";

const log = debug("ef:generateSingleTrack");

export const generateSingleTrackFromPath = async (
  absolutePath: string,
  trackId: number,
) => {
  log(`Generating track ${trackId} for ${absolutePath}`);

  const probe = await Probe.probePath(absolutePath);

  // Map track ID (1-based) to stream index (0-based) - tracks use 1-based IDs, streams use 0-based indices
  const streamIndex = trackId - 1;

  if (streamIndex < 0 || streamIndex >= probe.streams.length) {
    throw new Error(
      `Track ${trackId} not found (valid tracks: 1-${probe.streams.length})`,
    );
  }

  // Get the track stream from FFmpeg (single track, fragmented MP4)
  const trackStream = probe.createTrackReadstream(streamIndex);

  // Create a PassThrough to tee the stream
  const outputStream = new PassThrough();
  const indexStream = new PassThrough();

  // Pipe data but DON'T end outputStream automatically - we'll control this
  trackStream.pipe(outputStream, { end: false });
  trackStream.pipe(indexStream);

  // Track when the source stream ends (but don't end output yet)
  let sourceStreamEnded = false;
  trackStream.on("end", () => {
    sourceStreamEnded = true;
  });

  trackStream.on("error", (error) => {
    outputStream.destroy(error);
    indexStream.destroy(error);
  });

  // Generate fragment index from the single-track stream
  // This will be a single-track index since we're processing isolated track
  // Map the single-track file's track ID 1 to the original multi-track ID
  const trackIdMapping = { 1: trackId }; // Single track 1 -> original trackId
  const fragmentIndexPromise = generateFragmentIndex(
    indexStream,
    undefined,
    trackIdMapping,
  );

  // End outputStream only after BOTH source ends AND fragment index completes
  fragmentIndexPromise
    .then(() => {
      if (sourceStreamEnded) {
        outputStream.end();
      } else {
        // If fragment index completes first, wait for stream to end
        trackStream.once("end", () => {
          outputStream.end();
        });
      }
    })
    .catch((error) => {
      outputStream.destroy(error);
    });

  // Return both the stream and the index
  return {
    stream: outputStream,
    fragmentIndex: fragmentIndexPromise,
  };
};

export const generateSingleTrackTask = idempotentTask({
  label: "track-single",
  filename: (absolutePath: string, trackId: number) =>
    `${basename(absolutePath)}.track-${trackId}.mp4`,
  runner: async (absolutePath: string, trackId: number) => {
    const result = await generateSingleTrackFromPath(absolutePath, trackId);

    // Create a PassThrough stream that processes fragment index in parallel
    const finalStream = new PassThrough();

    // Start fragment index processing immediately (don't wait for stream to end)
    const fragmentIndexPromise = result.fragmentIndex.catch((error) => {
      console.warn(
        `Fragment index generation failed for track ${trackId}:`,
        error,
      );
      // Don't fail the stream if fragment index fails
    });

    // Monitor progress and extend timeout based on actual work
    let progressTimeout: NodeJS.Timeout | null = null;

    const resetProgressTimeout = () => {
      if (progressTimeout) {
        clearTimeout(progressTimeout);
      }

      progressTimeout = setTimeout(() => {
        if (!finalStream.destroyed) {
          console.warn(
            `Progress timeout triggered for track ${trackId} - no activity for 10 seconds`,
          );
          finalStream.end();
        }
      }, 10000); // 10 second sliding timeout
    };

    // Start the initial timeout
    resetProgressTimeout();

    // Monitor data flow to detect active work
    result.stream.on("data", () => {
      resetProgressTimeout(); // Reset timeout when we see data
    });

    result.stream.on("end", () => {
      resetProgressTimeout(); // Reset timeout when stream ends
    });

    // Pipe data through but don't end until fragment index is ready
    result.stream.pipe(finalStream, { end: false });

    // Wait for fragment index to complete, then end the stream
    await fragmentIndexPromise;
    finalStream.end();

    // Clean up timeout
    if (progressTimeout) {
      clearTimeout(progressTimeout);
    }

    return finalStream;
  },
});

export const generateSingleTrack = async (
  cacheRoot: string,
  absolutePath: string,
  url: string,
) => {
  try {
    const trackId = new URL(`http://localhost${url}`).searchParams.get(
      "trackId",
    );
    if (trackId === null) {
      throw new Error(
        "No trackId provided. It must be specified in the query string: ?trackId=0",
      );
    }
    return await generateSingleTrackTask(
      cacheRoot,
      absolutePath,
      Number(trackId),
    );
  } catch (error) {
    console.error(error);
    console.trace("Error generating track", error);
    throw error;
  }
};

