import { idempotentTask } from "../idempotentTask.js";
import debug from "debug";
import { basename } from "node:path";
import { PassThrough } from "node:stream";
import { Probe } from "../Probe.js";
import { generateFragmentIndex } from "../generateFragmentIndex.js";

const log = debug("ef:generateScrubTrack");

export const generateScrubTrackFromPath = async (absolutePath: string) => {
  log(`Generating scrub track for ${absolutePath}`);

  const probe = await Probe.probePath(absolutePath);

  // Check if video stream exists
  if (probe.videoStreams.length === 0) {
    throw new Error("No video stream found for scrub track generation");
  }

  // Get the scrub track stream from FFmpeg (low-res transcoded video)
  const scrubStream = probe.createScrubTrackReadstream();

  const startTimeOffsetMs = probe.startTimeOffsetMs;

  // Create a PassThrough to tee the stream
  const outputStream = new PassThrough();
  const indexStream = new PassThrough();

  // Pipe data but DON'T end outputStream automatically - we'll control this
  scrubStream.pipe(outputStream, { end: false });
  scrubStream.pipe(indexStream);

  // Track when the source stream ends (but don't end output yet)
  let sourceStreamEnded = false;
  scrubStream.on("end", () => {
    sourceStreamEnded = true;
  });

  scrubStream.on("error", (error) => {
    outputStream.destroy(error);
    indexStream.destroy(error);
  });

  // Generate fragment index from the scrub track stream
  // Use a special track ID to identify scrub track (e.g., -1 or "scrub")
  // We'll use a negative track ID to distinguish from regular tracks
  const scrubTrackId = -1;
  const trackIdMapping = { 1: scrubTrackId }; // Single track 1 -> scrub track ID

  const fragmentIndexPromise = generateFragmentIndex(
    indexStream,
    startTimeOffsetMs,
    trackIdMapping,
  );

  // End outputStream only after BOTH source ends AND fragment index completes
  fragmentIndexPromise
    .then(() => {
      if (sourceStreamEnded) {
        outputStream.end();
      } else {
        // If fragment index completes first, wait for stream to end
        scrubStream.once("end", () => {
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

export const generateScrubTrackTask = idempotentTask({
  label: "scrub-track",
  filename: (absolutePath: string) =>
    `${basename(absolutePath)}.scrub-track.mp4`,
  runner: async (absolutePath: string) => {
    const probe = await Probe.probePath(absolutePath);

    if (probe.videoStreams.length === 0) {
      throw new Error("No video stream found for scrub track generation");
    }

    // Get the scrub track stream from FFmpeg
    const scrubStream = probe.createScrubTrackReadstream();

    // Wrap in PassThrough with timeout handling to ensure stream completes
    const finalStream = new PassThrough();

    // Monitor progress and extend timeout based on actual work
    let progressTimeout: NodeJS.Timeout | null = null;

    const resetProgressTimeout = () => {
      if (progressTimeout) {
        clearTimeout(progressTimeout);
      }

      progressTimeout = setTimeout(() => {
        if (!finalStream.destroyed) {
          console.warn(
            `Progress timeout triggered for scrub track - no activity for 30 seconds`,
          );
          finalStream.destroy(new Error("Scrub track generation timeout"));
        }
      }, 30000); // 30 second sliding timeout (longer for transcoding)
    };

    // Start the initial timeout
    resetProgressTimeout();

    // Monitor data flow to detect active work
    scrubStream.on("data", () => {
      resetProgressTimeout(); // Reset timeout when we see data
    });

    scrubStream.on("end", () => {
      resetProgressTimeout(); // Reset timeout when stream ends
      finalStream.end();
    });

    scrubStream.on("error", (error) => {
      if (progressTimeout) {
        clearTimeout(progressTimeout);
      }
      finalStream.destroy(error);
    });

    // Pipe data through
    scrubStream.pipe(finalStream, { end: false });

    // Clean up timeout when stream ends
    finalStream.on("end", () => {
      if (progressTimeout) {
        clearTimeout(progressTimeout);
      }
    });

    return finalStream;
  },
});

export const generateScrubTrack = async (
  cacheRoot: string,
  absolutePath: string,
) => {
  try {
    return await generateScrubTrackTask(cacheRoot, absolutePath);
  } catch (error) {
    console.error(error);
    console.trace("Error generating scrub track", error);
    throw error;
  }
};
