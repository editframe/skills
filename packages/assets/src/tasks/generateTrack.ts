import { idempotentTask } from "../idempotentTask.js";
import debug from "debug";
import { basename } from "node:path";
import { generateSingleTrackFromPath } from "../generateSingleTrack.js";

export const generateTrackFromPath = async (
  absolutePath: string,
  trackId: number,
) => {
  const log = debug("ef:generateTrackFragment");
  log(`Generating track ${trackId} for ${absolutePath}`);

  // Use the single-track implementation
  const result = await generateSingleTrackFromPath(absolutePath, trackId);

  // Return just the stream for compatibility with existing API
  return result.stream;
};

export const generateTrackTask = idempotentTask({
  label: "track",
  filename: (absolutePath: string, trackId: number) =>
    `${basename(absolutePath)}.track-${trackId}.mp4`,
  runner: generateTrackFromPath,
});

export const generateTrack = async (
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
        "No trackId provided. It must be specified in the query string: ?trackId=1 (for video) or ?trackId=2 (for audio)",
      );
    }
    return await generateTrackTask(cacheRoot, absolutePath, Number(trackId));
  } catch (error) {
    console.error(error);
    console.trace("Error generating track", error);
    throw error;
  }
};
