import { createReadStream, statSync } from "node:fs";
import type { ServerResponse } from "node:http";
import path from "node:path";

import type { IncomingMessage, NextFunction } from "connect";
import debug from "debug";
import mime from "mime";

import { forbidRelativePaths } from "./forbidRelativePaths.js";

/**
 * Type for the TrackFragmentIndex from assets package.
 * Duplicated here to avoid import issues between package and direct imports.
 */
export interface TrackFragmentIndex {
  type: "video" | "audio";
  codec: string;
  duration: number;
  timescale: number;
  startTimeOffsetMs: number;
  initSegment: { offset: number; size: number };
  segments: Array<{ offset: number; size: number; duration: number }>;
  width?: number;
  height?: number;
  channel_count?: number;
  sample_rate?: number;
}

/**
 * Asset functions required by the JIT middleware.
 * These are injected to support both package imports and direct imports.
 */
export interface AssetFunctions {
  generateTrack: (
    cacheRoot: string,
    absolutePath: string,
    trackUrl: string,
  ) => Promise<{ cachePath: string }>;
  generateScrubTrack: (
    cacheRoot: string,
    absolutePath: string,
  ) => Promise<{ cachePath: string }>;
  generateTrackFragmentIndex: (
    cacheRoot: string,
    absolutePath: string,
  ) => Promise<{ cachePath: string }>;
}

export interface JitMiddlewareOptions {
  root: string;
  cacheRoot: string;
  /**
   * When true, remote URLs (http/https) are handled locally via ffprobe/ffmpeg
   * rather than passed to a downstream proxy (e.g. recordReplayProxyPlugin).
   * Set to true in dev-projects; leave false (default) in test environments
   * that use recordReplayProxyPlugin to proxy remote URLs to the cloud API.
   */
  handleRemoteUrls?: boolean;
}

/**
 * Stream a specific byte range from a file.
 * This is used for JIT segment serving where the server extracts the correct bytes.
 */
export function sendByteRange(
  res: ServerResponse,
  filePath: string,
  offset: number,
  size: number,
  contentType?: string,
) {
  const log = debug("ef:sendByteRange");
  const stats = statSync(filePath);
  const end = offset + size - 1;

  if (end >= stats.size) {
    log(`Requested range ${offset}-${end} exceeds file size ${stats.size}`);
    res.writeHead(416, { "Content-Range": `bytes */${stats.size}` });
    res.end();
    return;
  }

  log(`Streaming bytes ${offset}-${end} (${size} bytes) from ${filePath}`);

  res.writeHead(200, {
    "Content-Type": contentType || mime.getType(filePath) || "video/mp4",
    "Content-Length": size,
    "Cache-Control": "public, max-age=3600",
  });

  const readStream = createReadStream(filePath, { start: offset, end });
  readStream.pipe(res);
}

/**
 * Stream multiple byte ranges from a file concatenated together.
 * Used for creating playable .mp4 files by combining init segment + media segment.
 */
export function sendMultipleByteRanges(
  res: ServerResponse,
  filePath: string,
  ranges: Array<{ offset: number; size: number }>,
  contentType?: string,
) {
  const log = debug("ef:sendMultipleByteRanges");
  const stats = statSync(filePath);

  // Validate all ranges
  for (const range of ranges) {
    const end = range.offset + range.size - 1;
    if (end >= stats.size) {
      log(
        `Requested range ${range.offset}-${end} exceeds file size ${stats.size}`,
      );
      res.writeHead(416, { "Content-Range": `bytes */${stats.size}` });
      res.end();
      return;
    }
  }

  const totalSize = ranges.reduce((sum, r) => sum + r.size, 0);
  log(
    `Streaming ${ranges.length} ranges (${totalSize} total bytes) from ${filePath}`,
  );

  res.writeHead(200, {
    "Content-Type": contentType || "video/mp4",
    "Content-Length": totalSize,
    "Cache-Control": "public, max-age=3600",
  });

  // Stream ranges sequentially
  let rangeIndex = 0;

  const streamNextRange = () => {
    if (rangeIndex >= ranges.length) {
      res.end();
      return;
    }

    const range = ranges[rangeIndex]!;
    const end = range.offset + range.size - 1;
    const readStream = createReadStream(filePath, { start: range.offset, end });

    readStream.on("end", () => {
      rangeIndex++;
      streamNextRange();
    });

    readStream.on("error", (err) => {
      log(`Error streaming range ${rangeIndex}: ${err}`);
      res.destroy();
    });

    readStream.pipe(res, { end: false });
  };

  streamNextRange();
}

/**
 * Check if a hostname refers to the local vite server.
 * Handles various local hostname patterns including worktree domains.
 */
export function isLocalHost(hostname: string): boolean {
  const localPatterns = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    ".localhost", // Matches *.localhost (worktree domains like main.localhost)
  ];

  const lowerHost = hostname.toLowerCase();
  return localPatterns.some((pattern) =>
    pattern.startsWith(".")
      ? lowerHost.endsWith(pattern) || lowerHost === pattern.slice(1)
      : lowerHost === pattern || lowerHost.startsWith(pattern + ":"),
  );
}

/**
 * Resolve a URL to either a remote URL (for ffprobe) or a local file path.
 *
 * - Remote URLs (different host): passed directly to ffprobe (it supports http/https)
 * - Local URLs (localhost, *.localhost): resolved to local file path
 *
 * @param urlParam - The URL from the query parameter
 * @param root - The vite plugin root directory
 * @returns The path/URL to pass to ffprobe
 */
export function resolveMediaPath(urlParam: string, root: string): string {
  try {
    const url = new URL(urlParam);
    const hostname = url.hostname;

    // If NOT a local URL, pass directly to ffprobe - it supports http/https URLs
    if (!isLocalHost(hostname)) {
      return urlParam;
    }

    // Local URL - resolve to file path
    let filePath = decodeURIComponent(url.pathname);

    // Remove leading slash for path.join
    if (filePath.startsWith("/")) {
      filePath = filePath.slice(1);
    }

    // The root is already dev-projects/src, so if the URL path starts with "src/",
    // we should remove it to avoid duplication (src/src/assets -> src/assets)
    if (filePath.startsWith("src/")) {
      filePath = filePath.slice(4); // Remove "src/"
    }

    return path.join(root, filePath);
  } catch {
    // If not a valid URL, treat as relative path
    let filePath = urlParam;
    if (filePath.startsWith("src/")) {
      filePath = filePath.slice(4);
    }
    return path.join(root, filePath);
  }
}

/**
 * Convert fragment index segments to millisecond durations array.
 */
export function getSegmentDurationsMs(track: TrackFragmentIndex): number[] {
  return track.segments.map(
    (segment) => (segment.duration / track.timescale) * 1000,
  );
}

/**
 * Generate a JIT manifest for a local file.
 * Uses actual fragment index data for accurate segment information.
 */
export async function generateLocalJitManifest(
  absolutePath: string,
  sourceUrl: string,
  baseUrl: string,
  cacheRoot: string,
  assetFunctions: AssetFunctions,
) {
  const log = debug("ef:generateLocalJitManifest");

  // Generate the fragment index (this also ensures tracks are generated)
  log(`Generating fragment index for ${absolutePath}`);
  const fragmentIndexResult = await assetFunctions.generateTrackFragmentIndex(
    cacheRoot,
    absolutePath,
  );
  const fragmentIndex: Record<number, TrackFragmentIndex> = JSON.parse(
    await import("node:fs/promises").then((fs) =>
      fs.readFile(fragmentIndexResult.cachePath, "utf-8"),
    ),
  );

  // Find video track (track 1) and audio track (track 2) and scrub track (-1)
  const videoTrack = fragmentIndex[1];
  const audioTrack = fragmentIndex[2];
  const scrubTrack = fragmentIndex[-1];

  const hasVideo = videoTrack?.type === "video";
  const hasAudio = audioTrack?.type === "audio";

  // Get duration from the longest track
  let durationMs = 0;
  if (hasVideo && videoTrack) {
    durationMs = Math.max(
      durationMs,
      (videoTrack.duration / videoTrack.timescale) * 1000,
    );
  }
  if (hasAudio && audioTrack) {
    durationMs = Math.max(
      durationMs,
      (audioTrack.duration / audioTrack.timescale) * 1000,
    );
  }
  const durationSeconds = durationMs / 1000;

  // Get video dimensions from track
  const width =
    hasVideo && videoTrack && "width" in videoTrack ? videoTrack.width : 1920;
  const height =
    hasVideo && videoTrack && "height" in videoTrack ? videoTrack.height : 1080;
  const codec = hasVideo && videoTrack ? videoTrack.codec : "avc1.640029";

  // Get actual segment durations from fragment index
  const videoSegmentDurationsMs =
    hasVideo && videoTrack ? getSegmentDurationsMs(videoTrack) : [];
  const scrubSegmentDurationsMs = scrubTrack
    ? getSegmentDurationsMs(scrubTrack)
    : [];
  const audioSegmentDurationsMs =
    hasAudio && audioTrack ? getSegmentDurationsMs(audioTrack) : [];

  // Average segment duration for backward compatibility
  const avgVideoSegmentDurationMs =
    videoSegmentDurationsMs.length > 0
      ? videoSegmentDurationsMs.reduce((a, b) => a + b, 0) /
        videoSegmentDurationsMs.length
      : 2000;
  const avgScrubSegmentDurationMs =
    scrubSegmentDurationsMs.length > 0
      ? scrubSegmentDurationsMs.reduce((a, b) => a + b, 0) /
        scrubSegmentDurationsMs.length
      : 30000;
  const avgAudioSegmentDurationMs =
    audioSegmentDurationsMs.length > 0
      ? audioSegmentDurationsMs.reduce((a, b) => a + b, 0) /
        audioSegmentDurationsMs.length
      : 2000;

  log(
    `Video: ${videoSegmentDurationsMs.length} segments, Audio: ${audioSegmentDurationsMs.length} segments, Scrub: ${scrubSegmentDurationsMs.length} segments`,
  );

  // Construct manifest matching ManifestResponse format
  const manifest = {
    version: "1.0",
    type: "com.editframe/local-jit-manifest",
    sourceUrl: sourceUrl,
    duration: durationSeconds,
    durationMs: durationMs,
    baseUrl: baseUrl,

    videoRenditions: hasVideo
      ? [
          {
            id: "high",
            width: width,
            height: height,
            bitrate: 5000000,
            codec: codec,
            container: "video/mp4",
            mimeType: `video/mp4; codecs="${codec}"`,
            segmentDuration: avgVideoSegmentDurationMs / 1000,
            segmentDurationMs: avgVideoSegmentDurationMs,
            segmentDurationsMs: videoSegmentDurationsMs,
            startTimeOffsetMs: videoTrack!.startTimeOffsetMs,
            frameRate: 30,
            profile: "High",
            level: "4.1",
          },
          ...(scrubTrack
            ? [
                {
                  id: "scrub",
                  width: 320,
                  height: Math.round(
                    (320 * (height ?? 1080)) / (width ?? 1920),
                  ),
                  bitrate: 100000,
                  codec: scrubTrack.codec,
                  container: "video/mp4",
                  mimeType: `video/mp4; codecs="${scrubTrack.codec}"`,
                  segmentDuration: avgScrubSegmentDurationMs / 1000,
                  segmentDurationMs: avgScrubSegmentDurationMs,
                  segmentDurationsMs: scrubSegmentDurationsMs,
                  startTimeOffsetMs: scrubTrack.startTimeOffsetMs,
                  frameRate: 15,
                  profile: "High",
                  level: "4.1",
                },
              ]
            : []),
        ]
      : [],

    audioRenditions:
      hasAudio && audioTrack
        ? [
            {
              id: "audio",
              channels:
                "channel_count" in audioTrack ? audioTrack.channel_count : 2,
              sampleRate:
                "sample_rate" in audioTrack ? audioTrack.sample_rate : 48000,
              bitrate: 128000,
              codec: audioTrack.codec,
              container: "audio/mp4",
              mimeType: `audio/mp4; codecs="${audioTrack.codec}"`,
              segmentDuration: avgAudioSegmentDurationMs / 1000,
              segmentDurationMs: avgAudioSegmentDurationMs,
              segmentDurationsMs: audioSegmentDurationsMs,
              language: "en",
            },
          ]
        : [],

    endpoints: {
      initSegment: `${baseUrl}/api/v1/transcode/{rendition}/init.m4s?url=${encodeURIComponent(sourceUrl)}`,
      mediaSegment: `${baseUrl}/api/v1/transcode/{rendition}/{segmentId}.m4s?url=${encodeURIComponent(sourceUrl)}`,
    },

    jitInfo: {
      parallelTranscodingSupported: true,
      expectedTranscodeLatency: 100, // Local is fast
      segmentCount: videoSegmentDurationsMs.length,
      scrubSegmentCount: scrubSegmentDurationsMs.length,
    },
  };

  return manifest;
}

/**
 * Create the JIT transcode middleware for /api/v1/transcode/* routes.
 *
 * @param options - The middleware options (root, cacheRoot)
 * @param assetFunctions - The asset functions to use (allows dependency injection)
 * @returns Express-compatible middleware function
 */
export function createJitTranscodeMiddleware(
  options: JitMiddlewareOptions,
  assetFunctions: AssetFunctions,
) {
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: NextFunction,
  ) => {
    const log = debug("ef:vite-plugin:jit");

    if (!req.url?.startsWith("/api/v1/transcode/")) {
      return next();
    }

    forbidRelativePaths(req);
    log(`Handling JIT transcode request: ${req.url}`);

    const url = new URL(req.url, `http://${req.headers.host}`);
    const sourceUrl = url.searchParams.get("url");

    if (!sourceUrl) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "url parameter is required" }));
      return;
    }

    // Resolve URL to either local file path or keep as remote URL (ffprobe supports both)
    const mediaPath = resolveMediaPath(sourceUrl, options.root);

    // If the source is a remote URL and handleRemoteUrls is not enabled, let the
    // next middleware handle it (e.g. recordReplayProxyPlugin in test environments).
    if (
      !options.handleRemoteUrls &&
      (mediaPath.startsWith("http://") || mediaPath.startsWith("https://"))
    ) {
      return next();
    }

    // Handle CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      // Parse the path to determine which endpoint
      const pathMatch = url.pathname.match(
        /^\/api\/v1\/transcode\/(?:([^/]+)\/)?(.+)$/,
      );

      if (!pathMatch) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid transcode endpoint" }));
        return;
      }

      const [, rendition, endpoint] = pathMatch;

      // Handle manifest.json endpoint
      if (endpoint === "manifest.json") {
        log(`Generating manifest for ${mediaPath}`);
        const proto =
          (req.headers["x-forwarded-proto"] as string | undefined) ||
          url.protocol.replace(":", "");
        const baseUrl = `${proto}://${url.host}`;

        try {
          const manifest = await generateLocalJitManifest(
            mediaPath,
            sourceUrl,
            baseUrl,
            options.cacheRoot,
            assetFunctions,
          );

          res.writeHead(200, {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=300",
          });
          res.end(JSON.stringify(manifest, null, 2));
        } catch (error) {
          log(`Error generating manifest: ${error}`);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "Failed to generate manifest",
              details: error instanceof Error ? error.message : String(error),
            }),
          );
        }
        return;
      }

      // Get fragment index first - we need it to determine track IDs
      const fragmentIndexResult =
        await assetFunctions.generateTrackFragmentIndex(
          options.cacheRoot,
          mediaPath,
        );
      const fragmentIndex: Record<number, TrackFragmentIndex> = JSON.parse(
        await import("node:fs/promises").then((fs) =>
          fs.readFile(fragmentIndexResult.cachePath, "utf-8"),
        ),
      );

      // Helper: Map rendition ID to track ID, using fragment index to find correct track
      // For video files: track 1 = video, track 2 = audio
      // For audio-only files: track 1 = audio (no track 2)
      const getTrackId = (renditionId: string): number => {
        if (renditionId === "scrub") return -1;

        if (renditionId === "audio") {
          // Find the audio track - could be track 1 (audio-only) or track 2 (video+audio)
          for (const [trackIdStr, trackInfo] of Object.entries(fragmentIndex)) {
            if (trackInfo.type === "audio") {
              return Number.parseInt(trackIdStr, 10);
            }
          }
          // Fallback to track 2 if no audio track found by type
          return 2;
        }

        // For video renditions (high, medium, low), find the video track
        for (const [trackIdStr, trackInfo] of Object.entries(fragmentIndex)) {
          if (trackInfo.type === "video") {
            return Number.parseInt(trackIdStr, 10);
          }
        }
        // Fallback to track 1
        return 1;
      };

      // Handle init segment endpoint (e.g., /api/v1/transcode/high/init.mp4 or init.m4s)
      const initMatch = endpoint?.match(/^init\.(mp4|m4s)$/);
      if (initMatch && rendition) {
        const extension = initMatch[1];
        const contentType =
          extension === "m4s" ? "video/iso.segment" : "video/mp4";
        log(
          `Serving init segment (${extension}) for ${mediaPath}, rendition: ${rendition}`,
        );

        try {
          const trackId = getTrackId(rendition);

          // Generate/get the track file
          let trackTaskResult;
          if (trackId === -1) {
            trackTaskResult = await assetFunctions.generateScrubTrack(
              options.cacheRoot,
              mediaPath,
            );
          } else {
            const trackUrl = `/@ef-track/${mediaPath}?trackId=${trackId}`;
            trackTaskResult = await assetFunctions.generateTrack(
              options.cacheRoot,
              mediaPath,
              trackUrl,
            );
          }

          const track = fragmentIndex[trackId];
          if (!track) {
            const validTracks = Object.keys(fragmentIndex).join(", ");
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: `Track ${trackId} not found (valid tracks: ${validTracks})`,
              }),
            );
            return;
          }

          // Stream only the init segment bytes
          const { offset, size } = track.initSegment;
          log(`Init segment: offset=${offset}, size=${size}`);
          sendByteRange(
            res,
            trackTaskResult.cachePath,
            offset,
            size,
            contentType,
          );
        } catch (error) {
          log(`Error serving init segment: ${error}`);
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("File not found");
          } else {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: "Failed to generate init segment",
                details: error instanceof Error ? error.message : String(error),
              }),
            );
          }
        }
        return;
      }

      // Handle media segment endpoint
      // - .m4s: moof+mdat only (fragment for streaming)
      // - .mp4: init+moof+mdat (playable standalone file for testing)
      const segmentMatch = endpoint?.match(/^(\d+)\.(mp4|m4s)$/);
      if (segmentMatch?.[1] && segmentMatch?.[2] && rendition) {
        const segmentId = Number.parseInt(segmentMatch[1], 10);
        const extension = segmentMatch[2];
        const includeInit = extension === "mp4";
        log(
          `Serving media segment ${segmentId}.${extension} for ${mediaPath}, rendition: ${rendition}, includeInit: ${includeInit}`,
        );

        try {
          const trackId = getTrackId(rendition);

          // Generate/get the track file
          let trackTaskResult;
          if (trackId === -1) {
            trackTaskResult = await assetFunctions.generateScrubTrack(
              options.cacheRoot,
              mediaPath,
            );
          } else {
            const trackUrl = `/@ef-track/${mediaPath}?trackId=${trackId}`;
            trackTaskResult = await assetFunctions.generateTrack(
              options.cacheRoot,
              mediaPath,
              trackUrl,
            );
          }

          const track = fragmentIndex[trackId];
          if (!track) {
            const validTracks = Object.keys(fragmentIndex).join(", ");
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: `Track ${trackId} not found (valid tracks: ${validTracks})`,
              }),
            );
            return;
          }

          // JIT uses 1-based segment IDs, fragment index uses 0-based
          const segmentIndex = segmentId - 1;
          const segment = track.segments[segmentIndex];
          if (!segment) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: `Segment ${segmentId} not found`,
                availableSegments: track.segments.length,
              }),
            );
            return;
          }

          const contentType =
            extension === "m4s" ? "video/iso.segment" : "video/mp4";

          if (includeInit) {
            // .mp4: Stream init segment + media segment (playable file)
            const initSegment = track.initSegment;
            log(
              `Media segment ${segmentId}.mp4: init(offset=${initSegment.offset}, size=${initSegment.size}) + segment(offset=${segment.offset}, size=${segment.size})`,
            );
            sendMultipleByteRanges(
              res,
              trackTaskResult.cachePath,
              [
                { offset: initSegment.offset, size: initSegment.size },
                { offset: segment.offset, size: segment.size },
              ],
              contentType,
            );
          } else {
            // .m4s: Stream only this segment's bytes (moof+mdat)
            const { offset, size } = segment;
            log(
              `Media segment ${segmentId}.m4s: offset=${offset}, size=${size}`,
            );
            sendByteRange(
              res,
              trackTaskResult.cachePath,
              offset,
              size,
              contentType,
            );
          }
        } catch (error) {
          log(`Error serving media segment: ${error}`);
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("File not found");
          } else {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: "Failed to generate media segment",
                details: error instanceof Error ? error.message : String(error),
              }),
            );
          }
        }
        return;
      }

      // Unknown endpoint
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unknown transcode endpoint" }));
    } catch (error) {
      log(`Unexpected error: ${error}`);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Internal server error",
          details: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  };
}
