import { createReadStream, statSync } from "node:fs";
import { rm } from "node:fs/promises";
import type { ServerResponse } from "node:http";
import path, { join } from "node:path";
import { Client, createURLToken } from "@editframe/api";
import {
  cacheImage,
  findOrCreateCaptions,
  generateTrack,
  generateScrubTrack,
  generateTrackFragmentIndex,
  md5FilePath,
  type TrackFragmentIndex,
} from "@editframe/assets";
import type { IncomingMessage, NextFunction } from "connect";
import debug from "debug";
import mime from "mime";
import type { Plugin } from "vite";

import { forbidRelativePaths } from "./forbidRelativePaths.js";
import { sendTaskResult } from "./sendTaskResult.js";

/**
 * Stream a specific byte range from a file.
 * This is used for JIT segment serving where the server extracts the correct bytes.
 */
function sendByteRange(
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
function sendMultipleByteRanges(
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
      log(`Requested range ${range.offset}-${end} exceeds file size ${stats.size}`);
      res.writeHead(416, { "Content-Range": `bytes */${stats.size}` });
      res.end();
      return;
    }
  }

  const totalSize = ranges.reduce((sum, r) => sum + r.size, 0);
  log(`Streaming ${ranges.length} ranges (${totalSize} total bytes) from ${filePath}`);
  
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
function isLocalHost(hostname: string): boolean {
  const localPatterns = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '.localhost', // Matches *.localhost (worktree domains like main.localhost)
  ];
  
  const lowerHost = hostname.toLowerCase();
  return localPatterns.some(pattern => 
    pattern.startsWith('.') 
      ? lowerHost.endsWith(pattern) || lowerHost === pattern.slice(1)
      : lowerHost === pattern || lowerHost.startsWith(pattern + ':')
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
function resolveMediaPath(
  urlParam: string,
  root: string,
): string {
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
function getSegmentDurationsMs(track: TrackFragmentIndex): number[] {
  return track.segments.map(
    (segment) => (segment.duration / track.timescale) * 1000,
  );
}

/**
 * Generate a JIT manifest for a local file.
 * Uses actual fragment index data for accurate segment information.
 */
async function generateLocalJitManifest(
  absolutePath: string,
  sourceUrl: string,
  baseUrl: string,
  cacheRoot: string,
) {
  const log = debug("ef:generateLocalJitManifest");
  
  // Generate the fragment index (this also ensures tracks are generated)
  log(`Generating fragment index for ${absolutePath}`);
  const fragmentIndexResult = await generateTrackFragmentIndex(cacheRoot, absolutePath);
  const fragmentIndex: Record<number, TrackFragmentIndex> = JSON.parse(
    await import("node:fs/promises").then((fs) => fs.readFile(fragmentIndexResult.cachePath, "utf-8")),
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
    durationMs = Math.max(durationMs, (videoTrack.duration / videoTrack.timescale) * 1000);
  }
  if (hasAudio && audioTrack) {
    durationMs = Math.max(durationMs, (audioTrack.duration / audioTrack.timescale) * 1000);
  }
  const durationSeconds = durationMs / 1000;

  // Get video dimensions from track
  const width = hasVideo && videoTrack && "width" in videoTrack ? videoTrack.width : 1920;
  const height = hasVideo && videoTrack && "height" in videoTrack ? videoTrack.height : 1080;
  const codec = hasVideo && videoTrack ? videoTrack.codec : "avc1.640029";

  // Get actual segment durations from fragment index
  const videoSegmentDurationsMs = hasVideo && videoTrack ? getSegmentDurationsMs(videoTrack) : [];
  const scrubSegmentDurationsMs = scrubTrack ? getSegmentDurationsMs(scrubTrack) : [];
  const audioSegmentDurationsMs = hasAudio && audioTrack ? getSegmentDurationsMs(audioTrack) : [];

  // Average segment duration for backward compatibility
  const avgVideoSegmentDurationMs = videoSegmentDurationsMs.length > 0
    ? videoSegmentDurationsMs.reduce((a, b) => a + b, 0) / videoSegmentDurationsMs.length
    : 2000;
  const avgScrubSegmentDurationMs = scrubSegmentDurationsMs.length > 0
    ? scrubSegmentDurationsMs.reduce((a, b) => a + b, 0) / scrubSegmentDurationsMs.length
    : 30000;
  const avgAudioSegmentDurationMs = audioSegmentDurationsMs.length > 0
    ? audioSegmentDurationsMs.reduce((a, b) => a + b, 0) / audioSegmentDurationsMs.length
    : 2000;

  log(`Video: ${videoSegmentDurationsMs.length} segments, Audio: ${audioSegmentDurationsMs.length} segments, Scrub: ${scrubSegmentDurationsMs.length} segments`);

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
            startTimeOffsetMs: videoTrack.startTimeOffsetMs,
            frameRate: 30,
            profile: "High",
            level: "4.1",
          },
          ...(scrubTrack
            ? [
                {
                  id: "scrub",
                  width: 320,
                  height: Math.round((320 * height) / width),
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

    audioRenditions: hasAudio && audioTrack
      ? [
          {
            id: "audio",
            channels: "channel_count" in audioTrack ? audioTrack.channel_count : 2,
            sampleRate: "sample_rate" in audioTrack ? audioTrack.sample_rate : 48000,
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
      initSegment: `${baseUrl}/api/v1/transcode/{rendition}/init.mp4?url=${encodeURIComponent(sourceUrl)}`,
      mediaSegment: `${baseUrl}/api/v1/transcode/{rendition}/{segmentId}.mp4?url=${encodeURIComponent(sourceUrl)}`,
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

interface VitePluginEditframeOptions {
  root: string;
  cacheRoot: string;
}

// In-memory mapping of MD5 -> file path for API route handling
const md5ToFilePathMap = new Map<string, string>();

// Create editframe client instance
const getEditframeClient = () => {
  const token = process.env.EF_TOKEN;
  const efHost = process.env.EF_HOST;
  if (!token) {
    throw new Error("EF_TOKEN environment variable must be set");
  }
  return new Client(token, efHost);
};

export const vitePluginEditframe = (options: VitePluginEditframeOptions) => {
  return {
    name: "vite-plugin-editframe",

    configureServer(server) {
      // Local JIT transcoding middleware for /api/v1/transcode/* routes
      const jitTranscodeMiddleware = async (
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

        // Handle CORS
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

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
            const baseUrl = `${url.protocol}//${url.host}`;

            try {
              const manifest = await generateLocalJitManifest(
                mediaPath,
                sourceUrl,
                baseUrl,
                options.cacheRoot,
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

          // Helper: Map rendition ID to track ID
          const getTrackId = (renditionId: string): number => {
            if (renditionId === "audio") return 2;
            if (renditionId === "scrub") return -1;
            return 1; // high, medium, low all use video track 1
          };

          // Handle init segment endpoint (e.g., /api/v1/transcode/high/init.mp4 or init.m4s)
          const initMatch = endpoint?.match(/^init\.(mp4|m4s)$/);
          if (initMatch && rendition) {
            const extension = initMatch[1];
            const contentType = extension === "m4s" ? "video/iso.segment" : "video/mp4";
            log(`Serving init segment (${extension}) for ${mediaPath}, rendition: ${rendition}`);

            try {
              const trackId = getTrackId(rendition);
              
              // Generate/get the track file
              let trackTaskResult;
              if (trackId === -1) {
                trackTaskResult = await generateScrubTrack(options.cacheRoot, mediaPath);
              } else {
                const trackUrl = `/@ef-track/${mediaPath}?trackId=${trackId}`;
                trackTaskResult = await generateTrack(options.cacheRoot, mediaPath, trackUrl);
              }

              // Get the fragment index to find init segment byte range
              const fragmentIndexResult = await generateTrackFragmentIndex(options.cacheRoot, mediaPath);
              const fragmentIndex: Record<number, TrackFragmentIndex> = JSON.parse(
                await import("node:fs/promises").then((fs) => fs.readFile(fragmentIndexResult.cachePath, "utf-8")),
              );

              const track = fragmentIndex[trackId];
              if (!track) {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: `Track ${trackId} not found` }));
                return;
              }

              // Stream only the init segment bytes
              const { offset, size } = track.initSegment;
              log(`Init segment: offset=${offset}, size=${size}`);
              sendByteRange(res, trackTaskResult.cachePath, offset, size, contentType);
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
            log(`Serving media segment ${segmentId}.${extension} for ${mediaPath}, rendition: ${rendition}, includeInit: ${includeInit}`);

            try {
              const trackId = getTrackId(rendition);
              
              // Generate/get the track file
              let trackTaskResult;
              if (trackId === -1) {
                trackTaskResult = await generateScrubTrack(options.cacheRoot, mediaPath);
              } else {
                const trackUrl = `/@ef-track/${mediaPath}?trackId=${trackId}`;
                trackTaskResult = await generateTrack(options.cacheRoot, mediaPath, trackUrl);
              }

              // Get the fragment index to find segment byte range
              const fragmentIndexResult = await generateTrackFragmentIndex(options.cacheRoot, mediaPath);
              const fragmentIndex: Record<number, TrackFragmentIndex> = JSON.parse(
                await import("node:fs/promises").then((fs) => fs.readFile(fragmentIndexResult.cachePath, "utf-8")),
              );

              const track = fragmentIndex[trackId];
              if (!track) {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: `Track ${trackId} not found` }));
                return;
              }

              // JIT uses 1-based segment IDs, fragment index uses 0-based
              const segmentIndex = segmentId - 1;
              const segment = track.segments[segmentIndex];
              if (!segment) {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ 
                  error: `Segment ${segmentId} not found`,
                  availableSegments: track.segments.length,
                }));
                return;
              }

              const contentType = extension === "m4s" ? "video/iso.segment" : "video/mp4";

              if (includeInit) {
                // .mp4: Stream init segment + media segment (playable file)
                const initSegment = track.initSegment;
                log(`Media segment ${segmentId}.mp4: init(offset=${initSegment.offset}, size=${initSegment.size}) + segment(offset=${segment.offset}, size=${segment.size})`);
                sendMultipleByteRanges(res, trackTaskResult.cachePath, [
                  { offset: initSegment.offset, size: initSegment.size },
                  { offset: segment.offset, size: segment.size },
                ], contentType);
              } else {
                // .m4s: Stream only this segment's bytes (moof+mdat)
                const { offset, size } = segment;
                log(`Media segment ${segmentId}.m4s: offset=${offset}, size=${size}`);
                sendByteRange(res, trackTaskResult.cachePath, offset, size, contentType);
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

      // Register JIT transcode middleware first
      server.middlewares.use(jitTranscodeMiddleware);

      // Handle local assets API format: /api/v1/assets/local/*
      server.middlewares.use(async (req, res, next) => {
        const log = debug("ef:vite-plugin");
        const reqUrl = req.url || "";
        
        if (!reqUrl.startsWith("/api/v1/assets/local/")) {
          return next();
        }
        
        const url = new URL(reqUrl, `http://${req.headers.host}`);
        const urlPath = url.pathname;
        const src = url.searchParams.get("src");
        
        if (!src) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "src parameter is required" }));
          return;
        }
        
        // Resolve src to absolute file path
        const absolutePath = src.startsWith("http")
          ? src
          : path.join(options.root, src).replace("dist/", "src/");
        
        log(`Handling local assets API: ${urlPath} for ${absolutePath}`);
        
        try {
          // Handle /api/v1/assets/local/captions - captions/transcriptions
          if (urlPath === "/api/v1/assets/local/captions") {
            log(`Serving captions for ${absolutePath}`);
            const taskResult = await findOrCreateCaptions(options.cacheRoot, absolutePath);
            sendTaskResult(req, res, taskResult);
            return;
          }
          
          // Handle /api/v1/assets/local/image - cached images
          if (urlPath === "/api/v1/assets/local/image") {
            log(`Serving image for ${absolutePath}`);
            const taskResult = await cacheImage(options.cacheRoot, absolutePath);
            sendTaskResult(req, res, taskResult);
            return;
          }
          
          // Unknown endpoint
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Unknown assets endpoint" }));
        } catch (error) {
          log(`Error handling assets request: ${error}`);
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("File not found");
          } else {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: (error as Error).message }));
          }
        }
      });

      // Handle production API format for local files: /api/v1/isobmff_files/local/*
      server.middlewares.use(async (req, res, next) => {
        const log = debug("ef:vite-plugin");
        const reqUrl = req.url || "";
        
        if (!reqUrl.startsWith("/api/v1/isobmff_files/local/")) {
          return next();
        }
        
        const url = new URL(reqUrl, `http://${req.headers.host}`);
        const urlPath = url.pathname;
        const src = url.searchParams.get("src");
        
        if (!src) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "src parameter is required" }));
          return;
        }
        
        // Resolve src to absolute file path
        const absolutePath = src.startsWith("http")
          ? src
          : path.join(options.root, src).replace("dist/", "src/");
        
        log(`Handling local isobmff API: ${urlPath} for ${absolutePath}`);
        
        try {
          // Handle /api/v1/isobmff_files/local/index - fragment index
          if (urlPath === "/api/v1/isobmff_files/local/index") {
            log(`Serving track fragment index for ${absolutePath}`);
            const taskResult = await generateTrackFragmentIndex(options.cacheRoot, absolutePath);
            sendTaskResult(req, res, taskResult);
            return;
          }
          
          // Handle /api/v1/isobmff_files/local/md5 - get MD5 hash for a file
          if (urlPath === "/api/v1/isobmff_files/local/md5") {
            log(`Getting MD5 for ${absolutePath}`);
            try {
              const md5 = await md5FilePath(absolutePath);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ md5 }));
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.end("File not found");
              } else {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: (error as Error).message }));
              }
            }
            return;
          }
          
          // Handle /api/v1/isobmff_files/local/track - track segments
          if (urlPath === "/api/v1/isobmff_files/local/track") {
            const trackIdStr = url.searchParams.get("trackId");
            const segmentIdStr = url.searchParams.get("segmentId");
            
            if (!trackIdStr) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "trackId parameter is required" }));
              return;
            }
            
            const trackId = parseInt(trackIdStr, 10);
            
            // For scrub track (trackId -1), use generateScrubTrack
            if (trackId === -1) {
              log(`Serving scrub track for ${absolutePath}`);
              const taskResult = await generateScrubTrack(options.cacheRoot, absolutePath);
              sendTaskResult(req, res, taskResult);
              return;
            }
            
            // For regular tracks, use generateTrack
            log(`Serving track ${trackId} segment ${segmentIdStr || "all"} for ${absolutePath}`);
            const trackUrl = `/@ef-track/${src}?trackId=${trackId}${segmentIdStr ? `&segmentId=${segmentIdStr}` : ""}`;
            const taskResult = await generateTrack(options.cacheRoot, absolutePath, trackUrl);
            sendTaskResult(req, res, taskResult);
            return;
          }
          
          // Unknown endpoint
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Unknown isobmff endpoint" }));
        } catch (error) {
          log(`Error handling isobmff request: ${error}`);
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("File not found");
          } else {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: (error as Error).message }));
          }
        }
      });
      
      // Handle @ef-* format (legacy)
      server.middlewares.use(async (req, res, next) => {
        const log = debug("ef:vite-plugin");
        // Forbid relative paths in any request
        if (req.url?.startsWith("/@ef")) {
          forbidRelativePaths(req);
        } else {
          return next();
        }

        log(`Handling ${req.url} at ${new Date().toISOString()}`);

        const requestPath = req.url.replace(/^\/@ef-[^/]+\//, "");
        const assetPath = requestPath.replace(/\?.*$/, "");

        const absolutePath = assetPath.startsWith("http")
          ? assetPath
          : path.join(options.root, assetPath).replace("dist/", "src/");

        options.cacheRoot = options.cacheRoot.replace("dist/", "src/");

        const efPrefix = req.url.split("/")[1];

        switch (efPrefix) {
          case "@ef-clear-cache": {
            if (req.method !== "DELETE") {
              res.writeHead(405, { Allow: "DELETE" });
              res.end();
              break;
            }
            log(`Clearing cache for ${options.cacheRoot}`);
            // Retry cache clearing to handle race conditions with concurrent tests
            const cachePath = join(options.cacheRoot, ".cache");
            const maxRetries = 3;
            for (let attempt = 0; attempt < maxRetries; attempt++) {
              try {
                await rm(cachePath, {
                  recursive: true,
                  force: true,
                });
                break; // Success, exit retry loop
              } catch (error: any) {
                // ENOTEMPTY can happen if files are being written during deletion
                // ENOENT is fine - directory doesn't exist
                if (error.code === "ENOENT") {
                  break; // Already cleared, done
                }
                if (error.code === "ENOTEMPTY" && attempt < maxRetries - 1) {
                  // Wait a bit and retry
                  await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
                  continue;
                }
                // Log but don't fail - cache clearing is best-effort
                log(`Warning: Cache clear attempt ${attempt + 1} failed: ${error.message}`);
                if (attempt === maxRetries - 1) {
                  log(`Cache clear failed after ${maxRetries} attempts, continuing anyway`);
                }
              }
            }
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("Cache cleared");
            break;
          }
          case "@ef-asset": {
            if (req.method !== "HEAD") {
              res.writeHead(405, { Allow: "HEAD" });
              res.end();
            }
            md5FilePath(absolutePath)
              .then((md5) => {
                // Store mapping for API route handling
                md5ToFilePathMap.set(md5, absolutePath);
                log(`Stored MD5 mapping: ${md5} -> ${absolutePath}`);
                res.writeHead(200, {
                  etag: md5,
                });
                res.end();
              })
              .catch(next);
            break;
          }
          case "@ef-track-fragment-index": {
            const indexStartTime = Date.now();
            log(`Serving track fragment index for ${absolutePath}`);
            generateTrackFragmentIndex(options.cacheRoot, absolutePath)
              .then((taskResult) => {
                const elapsed = Date.now() - indexStartTime;
                log(`Fragment index generated in ${elapsed}ms: ${taskResult.cachePath}`);
                sendTaskResult(req, res, taskResult);
              })
              .catch((error) => {
                const elapsed = Date.now() - indexStartTime;
                log(`Error generating fragment index after ${elapsed}ms:`, error);
                next(error);
              });
            break;
          }
          case "@ef-track": {
            const trackStartTime = Date.now();
            log(`Serving track for ${absolutePath} (cacheRoot: ${options.cacheRoot})`);
            generateTrack(options.cacheRoot, absolutePath, req.url)
              .then((taskResult) => {
                const elapsed = Date.now() - trackStartTime;
                log(`Track generated in ${elapsed}ms: ${taskResult.cachePath}`);
                sendTaskResult(req, res, taskResult);
              })
              .catch((error) => {
                const elapsed = Date.now() - trackStartTime;
                log(`Error generating track after ${elapsed}ms:`, error);
                next(error);
              });
            break;
          }
          case "@ef-scrub-track": {
            log(`Serving scrub track for ${absolutePath}`);
            generateScrubTrack(options.cacheRoot, absolutePath)
              .then((taskResult) => sendTaskResult(req, res, taskResult))
              .catch(next);
            break;
          }
          case "@ef-captions":
            log(`Serving captions for ${absolutePath}`);
            findOrCreateCaptions(options.cacheRoot, absolutePath)
              .then((taskResult) => sendTaskResult(req, res, taskResult))
              .catch(next);
            break;
          case "@ef-image":
            log(`Serving image file ${absolutePath}`);
            cacheImage(options.cacheRoot, absolutePath)
              .then((taskResult) => sendTaskResult(req, res, taskResult))
              .catch(next);
            break;
          case "@ef-sign-url": {
            if (req.method !== "POST") {
              res.writeHead(405, { Allow: "POST" });
              res.end();
              break;
            }

            log("Signing URL token");

            // Parse request body
            let body = "";
            req.on("data", (chunk) => {
              body += chunk.toString();
            });

            req.on("end", async () => {
              try {
                const payload = JSON.parse(body);
                log("Token signing request payload:", payload);

                // Handle both formats: { url } and { url, params }
                const { url, params } = payload;
                if (!url) {
                  res.writeHead(400, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ error: "URL is required" }));
                  return;
                }

                const client = getEditframeClient();

                // createURLToken expects just a string URL
                // For transcode URLs with params, we need to reconstruct the full URL
                let fullUrl = url;
                if (params) {
                  const urlObj = new URL(url);
                  // Add params as query parameters
                  Object.entries(params).forEach(([key, value]) => {
                    urlObj.searchParams.set(key, String(value));
                  });
                  fullUrl = urlObj.toString();
                }

                log("Creating token for full URL:", fullUrl);
                const token = await createURLToken(client, fullUrl);

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ token }));
              } catch (error) {
                log(`Error signing URL token: ${error}`);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Failed to sign URL token" }));
              }
            });

            break;
          }
          default:
            log(`Unknown asset type ${efPrefix}`);
            break;
        }
      });
    },
  } satisfies Plugin;
};
