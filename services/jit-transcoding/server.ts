import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "jit-transcoding" });

import express from "express";
import * as fs from "node:fs";
import * as crypto from "node:crypto";
import { cacheTranscodedSegmentFilePath, cacheTranscodedInitSegmentFilePath } from "@/util/filePaths";
import { storageProvider } from "@/util/storageProvider.server";
import { validateUrlToken } from "@/util/validateUrlToken";

// IMPLEMENTATION GUIDELINES: Import MP3 support functions
import {
  isMP3Url,
  generateMp3Manifest,
  resolveEffectiveTranscodingUrl,
  validateMp3Rendition,
} from "./mp3-helpers";
import { calculateSegmentDurations } from "@/transcode/src/jit/calculateSegmentDurations";
import { type SegmentDurationType, type AnyRendition, MP3_SEGMENT_DURATION, SCRUB_SEGMENT_DURATION, SEGMENT_DURATION, SEGMENT_DURATION_SECONDS } from "@/transcode/src/jit/transcoder-types";
import { mkTempDir } from "@/util/tempFile";
import { readFile } from "node:fs/promises";
import { promiseWithResolvers } from "@/util/promiseWithResolvers";

const PUBLIC_ASSET_DOMAINS = [
  'assets.editframe.com',
];

console.log("LAUNCHED JIT TRANSCODING SERVER");

// IMPLEMENTATION GUIDELINES: Eager boot pattern - start health check server immediately
import { createEagerBootServer } from "@/http/createEagerBootServer";

const eagerServer = createEagerBootServer({
  port: process.env.PORT ? Number.parseInt(process.env.PORT) : 3001,
  serviceName: "jit-transcoding",
  createRequestHandler: async () => {
    console.log("Initializing JIT transcoding Express app...");

    // Create and configure Express app during initialization
    const app = express();

    // All the Express setup happens here...
    setupExpressApp(app);

    // Return the app as a request handler
    return (req, res) => app(req, res);
  }
});

// Helper function to set up Express app
function setupExpressApp(app: express.Application) {
  // Helper function for detailed error logging
  function logError(context: string, error: unknown, req: express.Request, additionalInfo?: Record<string, any>) {
    const errorId = crypto.randomBytes(4).toString('hex');
    const errorInfo = {
      errorId,
      context,
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      query: req.query,
      params: req.params,
      ...additionalInfo
    };

    if (error instanceof Error) {
      console.error(`[ERROR ${errorId}] ${context}:`, {
        ...errorInfo,
        errorType: error.constructor.name,
        errorMessage: error.message,
        stack: error.stack
      });
    } else {
      console.error(`[ERROR ${errorId}] ${context}:`, {
        ...errorInfo,
        errorType: typeof error,
        errorValue: error
      });
    }

    return errorId;
  }

  // Helper function to send 500 error response with proper logging
  function send500Error(res: express.Response, context: string, error: unknown, req: express.Request, additionalInfo?: Record<string, any>) {
    const errorId = logError(context, error, req, additionalInfo);

    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        errorId // Include error ID for debugging
      }
    });
  }

  app.use(express.json());

  // CORS middleware for browser access
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Range');
    res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, X-Cache, X-Actual-Start-Time, X-Actual-Duration, X-Transcode-Time-Ms, X-Total-Server-Time-Ms');

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }

    next();
  });

  // Minimal request logging middleware (only for non-health checks)
  app.use((req, res, next) => {
    if (!req.url.startsWith("/health")) {
      console.log("Request", req.method, req.url);
      res.on("finish", () => {
        console.log("Response", req.method, req.url, res.statusCode);
      });
    }
    next();
  });

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", service: "jit-transcoding" }));
  });

  // Alternative health check endpoint for compatibility with other services
  app.get("/healthz", (_req, res) => {
    res.writeHead(200);
    res.end();
  });

  // Helper function to get segment duration based on rendition and URL type
  function getSegmentDuration(rendition: string, url?: string): SegmentDurationType {
    // Check if this is an MP3 file or cached MP3 conversion
    if (url && (url.toLowerCase().endsWith('.mp3') || url.includes('mp3-conversions/'))) {
      return MP3_SEGMENT_DURATION; // 15 seconds for MP3/audio content
    }

    // Regular video segment durations
    return rendition === 'scrub' ? SCRUB_SEGMENT_DURATION : SEGMENT_DURATION; // 30s for scrub, 2s for others
  }

  const TEMP_DIR = process.env.TEMP_DIR || '/app/temp';

  // Create temp directory if it doesn't exist (for transcoding work)
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  class TranscodeOperation {
    private static activeOperations = new Map<string, TranscodeOperation>();
    private cacheKey: string;
    private operationKey: string;

    private _whenTranscoded = promiseWithResolvers<{ buffer: Buffer; transcodeTimeMs: number; cacheKey: string }>();
    whenTranscoded = this._whenTranscoded.promise;

    constructor(
      private readonly url: string,
      private readonly rendition: string,
      private readonly segmentId: string,
      private readonly extension: 'mp4' | 'm4s',
      private readonly originalUrl?: string,
    ) {
      this.cacheKey = generateSegmentCacheKey(this.url, this.rendition, this.segmentId, this.extension, this.originalUrl);
      this.operationKey = `${this.cacheKey}-${this.extension}`;
      TranscodeOperation.activeOperations.set(this.operationKey, this);
    }

    static getOrCreate(url: string, rendition: string, segmentId: string, extension: 'mp4' | 'm4s', originalUrl?: string) {
      const cacheKey = generateSegmentCacheKey(url, rendition, segmentId, extension, originalUrl);
      const operationKey = `${cacheKey}-${extension}`;
      const existingOperation = TranscodeOperation.activeOperations.get(operationKey);
      if (existingOperation) {
        return existingOperation;
      }
      const operation = new TranscodeOperation(url, rendition, segmentId, extension, originalUrl);
      operation.execute();
      return operation;
    }
    private async execute() {
      try {
        if (await this.isCached()) {
          this._whenTranscoded.resolve(await this.readFromCache());
        } else {
          this._whenTranscoded.resolve(await this.transcode());
        }
      } catch (error) {
        this._whenTranscoded.reject(error);
      }
    }

    private isCached(): Promise<boolean> {
      return storageProvider.pathExists(this.cacheKey);
    }

    private async readFromCache() {
      const cachedStream = await storageProvider.createReadStream(this.cacheKey);
      const chunks: Buffer[] = [];
      for await (const chunk of cachedStream) {
        chunks.push(chunk);
      }
      return { buffer: Buffer.concat(chunks), transcodeTimeMs: 0, cacheKey: this.cacheKey };
    }

    private async writeToCache(buffer: Buffer) {
      await storageProvider.writeFile(this.cacheKey, buffer, {
        contentType: this.extension === 'm4s' ? 'video/iso.segment' : 'video/mp4'
      });
    }

    private async transcode() {
      console.log(`Cache miss - transcoding ${this.rendition}/${this.segmentId}.${this.extension}`);

      await using tempDir = await mkTempDir(TEMP_DIR);

      const transcodeStartTime = Date.now();

      const isFragmented = this.extension === 'm4s';
      if (!isFragmented && this.segmentId === 'init') {
        throw new Error('Init segments are not available as fragmented MP4');
      }
      const segmentDuration = getSegmentDuration(this.rendition, this.originalUrl);
      // IMPLEMENTATION GUIDELINES: Lazy load transcodeSegment to reduce cold start time
      const { transcodeSegment } = await import("@/transcode/src/jit/transcoding-service");
      const segmentPath = await transcodeSegment({
        inputUrl: this.url,
        rendition: this.rendition as AnyRendition,
        segmentDurationMs: segmentDuration,
        outputDir: tempDir.path,
        segmentId: this.segmentId,
        isFragmented,
      });

      const transcodeTimeMs = Date.now() - transcodeStartTime;

      // Read the transcoded segment
      const segmentBuffer = await readFile(segmentPath);
      await this.writeToCache(segmentBuffer);

      console.log(`Transcoded and cached ${this.rendition}/${this.segmentId}.${this.extension} in ${transcodeTimeMs}ms`);

      return { buffer: segmentBuffer, transcodeTimeMs, cacheKey: this.cacheKey };
    }

    [Symbol.asyncDispose]() {
      TranscodeOperation.activeOperations.delete(this.operationKey);
    }
  }

  // Helper to generate cache keys for different segment types
  function generateSegmentCacheKey(url: string, rendition: string, segmentId: string | number, extension: 'mp4' | 'm4s', originalUrl?: string): string {
    if (extension === 'm4s') {
      // For init segments, use dedicated init segment cache path
      if (segmentId === 'init') {
        // IMPLEMENTATION GUIDELINES: Use audio-specific preset for MP3-derived content
        const preset = (originalUrl && isMP3Url(originalUrl)) ? `audio-${rendition}` : rendition;
        return cacheTranscodedInitSegmentFilePath({
          url,
          preset,
          extension: 'm4s'
        });
      }

      // For media segments, use time-based cache path with rendition-specific segment duration
      const segmentDuration = getSegmentDuration(rendition, originalUrl);
      const startTimeMs = (Number(segmentId) - 1) * segmentDuration;
      // IMPLEMENTATION GUIDELINES: Use audio-specific preset for MP3-derived content
      const preset = (originalUrl && isMP3Url(originalUrl)) ? `audio-${rendition}` : rendition;
      return cacheTranscodedSegmentFilePath({
        url,
        preset,
        startTimeMs,
        extension: 'm4s'
      });
    }
    // For standalone MP4 segments (debugging), use a different key format
    const preset = (originalUrl && isMP3Url(originalUrl)) ? `audio-${rendition}` : rendition;
    return `debug/${crypto.createHash('md5').update(url).digest('hex')}/${preset}-${segmentId}.mp4`;
  }

  function isPublicAssetUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return PUBLIC_ASSET_DOMAINS.includes(parsedUrl.hostname);
    } catch {
      return false;
    }
  }

  // Authorization middleware
  const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const isDevelopment = process.env.NODE_ENV === "development";

    // Allow transcoding of public assets without authentication
    const sourceUrl = req.query.url as string | undefined;
    if (sourceUrl && isPublicAssetUrl(sourceUrl)) {
      console.log(`Public asset transcoding allowed: ${sourceUrl}`);
      next();
      return;
    }

    try {
      // IMPLEMENTATION GUIDELINES: Lazy load session parsing to reduce cold start time
      const { parseRequestSession } = await import("@/util/session");
      const session = await parseRequestSession(req);

      if (!session) {
        if (isDevelopment) {
          console.warn("DEV MODE: No session found, but allowing request to continue");
          next();
          return;
        }
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }));
        return;
      }

      // For API tokens, check expiration
      if (session.type === "api" && session.expired_at && new Date(session.expired_at) < new Date()) {
        if (isDevelopment) {
          console.warn("DEV MODE: API token expired, but allowing request to continue");
          next();
          return;
        }
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { code: "TOKEN_EXPIRED", message: "API token has expired" } }));
        return;
      }

      // For URL tokens, validate URL match
      if (session.type === "url") {
        const validation = validateUrlToken(session, req.url);
        if (!validation.isValid) {
          console.warn("url validation failed", validation);
          if (isDevelopment) {
            console.warn("DEV MODE: URL mismatch, but allowing request to continue");
            next();
            return;
          }
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: { code: "URL_MISMATCH", message: "Request URL does not match signed URL" } }));
          return;
        }
      }

      // For anonymous URL tokens, validate URL match
      if (session.type === "anonymous_url") {
        const validation = validateUrlToken(session, req.url);
        if (!validation.isValid) {
          console.warn("anonymous url validation failed", validation);
          if (isDevelopment) {
            console.warn("DEV MODE: Anonymous URL mismatch, but allowing request to continue");
            next();
            return;
          }
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: { code: "URL_MISMATCH", message: "Request URL does not match signed URL" } }));
          return;
        }
      }

      // Attach session to request for downstream use
      (req as any).session = session;
      next();
    } catch (error) {
      const errorId = logError("Authorization middleware", error, req);
      if (isDevelopment) {
        console.warn(`DEV MODE: Authorization error ${errorId}, but allowing request to continue`);
        next();
        return;
      }
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        error: {
          code: "AUTH_ERROR",
          message: "Authorization failed",
          errorId
        }
      }));
    }
  };

  // Helper function to get the correct base URL for manifest/segment URLs
  function getBaseUrl(req: express.Request): string {
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction) {
      // In production (Cloud Run), always use HTTPS regardless of req.protocol
      // since req.protocol shows 'http' due to load balancer terminating SSL
      return `https://${req.get('host')}`;
    } else {
      // In development, use the actual protocol from the request
      return `${req.protocol}://${req.get('host')}`;
    }
  }

  // Helper function to get file duration without full processing
  async function getVideoDuration(url: string): Promise<number> {
    // IMPLEMENTATION GUIDELINES: Lazy load transcoding service to reduce cold start time
    const { getFileDurationWithCaching } = await import("@/transcode/src/jit/transcoding-service");
    return getFileDurationWithCaching(url);
  }

  // Custom JIT manifest endpoint - provides codec info and rendition details
  app.get('/api/v1/transcode/manifest.json', requireAuth, async (req, res) => {
    try {
      const { url } = req.query;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL parameter is required' });
      }

      // IMPLEMENTATION GUIDELINES: Handle MP3 files with dedicated manifest generation
      if (isMP3Url(url)) {
        console.log(`Generating MP3 manifest for: ${url}`);
        const baseUrl = getBaseUrl(req);
        const manifest = await generateMp3Manifest(url, baseUrl);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
        res.json(manifest);
        return;
      }

      // Detect available tracks
      const { getFileDurationWithCaching, detectAvailableTracks, calculateAspectRatioDimensions } = await import("@/transcode/src/jit/transcoding-service");
      const [duration, { hasAudio, hasVideo }] = await Promise.all([
        getFileDurationWithCaching(url),
        detectAvailableTracks(url)
      ]);

      const baseUrl = getBaseUrl(req);
      const durationMs = duration * 1000;

      const videoSegmentDurations = hasVideo ? calculateSegmentDurations(durationMs, SEGMENT_DURATION, { mediaType: 'video' }) : [];
      const scrubSegmentDurations = hasVideo ? calculateSegmentDurations(durationMs, SCRUB_SEGMENT_DURATION, { mediaType: 'video' }) : [];
      const audioSegmentDurations = hasAudio ? calculateSegmentDurations(durationMs, SEGMENT_DURATION, { mediaType: 'audio' }) : [];

      let sourceDimensions = { width: 1920, height: 1080 };
      if (hasVideo) {
        const { createVideoSource } = await import("@/transcode/src/pipeline/VideoSource");
        using source = await createVideoSource({ url });
        const videoStream = source.streams.find(s => s.codecType === 'video');
        if (videoStream?.width && videoStream?.height) {
          sourceDimensions = { width: videoStream.width, height: videoStream.height };
        }
      }

      const highDimensions = calculateAspectRatioDimensions(sourceDimensions.width, sourceDimensions.height, 'high');
      const mediumDimensions = calculateAspectRatioDimensions(sourceDimensions.width, sourceDimensions.height, 'medium');
      const lowDimensions = calculateAspectRatioDimensions(sourceDimensions.width, sourceDimensions.height, 'low');
      const scrubDimensions = calculateAspectRatioDimensions(sourceDimensions.width, sourceDimensions.height, 'scrub');

      const manifest = {
        version: "1.0",
        type: "com.editframe/manifest",
        sourceUrl: url,
        duration: duration,
        durationMs: durationMs,
        baseUrl: baseUrl,

        videoRenditions: hasVideo ? [
          {
            id: "high",
            width: highDimensions.width,
            height: highDimensions.height,
            bitrate: 5000000,
            codec: "avc1.640029", // H.264 High Profile Level 4.1 (matches transcoding output)
            container: "video/mp4",
            mimeType: 'video/mp4; codecs="avc1.640029,mp4a.40.2"',
            segmentDuration: SEGMENT_DURATION / 1000,
            segmentDurationMs: SEGMENT_DURATION,
            segmentDurationsMs: videoSegmentDurations,
            frameRate: 30,
            profile: "High",
            level: "4.1"
          },
          {
            id: "medium",
            width: mediumDimensions.width,
            height: mediumDimensions.height,
            bitrate: 2500000,
            codec: "avc1.640029",
            container: "video/mp4",
            mimeType: 'video/mp4; codecs="avc1.640029,mp4a.40.2"',
            segmentDuration: SEGMENT_DURATION / 1000,
            segmentDurationMs: SEGMENT_DURATION,
            segmentDurationsMs: videoSegmentDurations,
            frameRate: 30,
            profile: "High",
            level: "4.1"
          },
          {
            id: "low",
            width: lowDimensions.width,
            height: lowDimensions.height,
            bitrate: 1000000,
            codec: "avc1.640029",
            container: "video/mp4",
            mimeType: 'video/mp4; codecs="avc1.640029,mp4a.40.2"',
            segmentDuration: SEGMENT_DURATION / 1000,
            segmentDurationMs: SEGMENT_DURATION,
            segmentDurationsMs: videoSegmentDurations,
            frameRate: 30,
            profile: "High",
            level: "4.1"
          },
          {
            id: "scrub",
            width: scrubDimensions.width,
            height: scrubDimensions.height,
            bitrate: 100000,
            codec: "avc1.640029",
            container: "video/mp4",
            mimeType: 'video/mp4; codecs="avc1.640029"', // Video-only for scrub tracks
            segmentDuration: SCRUB_SEGMENT_DURATION / 1000,
            segmentDurationMs: SCRUB_SEGMENT_DURATION,
            segmentDurationsMs: scrubSegmentDurations,
            frameRate: 15, // Lower frame rate for scrub
            profile: "High",
            level: "4.1"
          }
        ] : [],

        // Audio rendition
        audioRenditions: hasAudio ? [
          {
            id: "audio",
            channels: 1,
            sampleRate: 48000,
            bitrate: 128000,
            codec: "mp4a.40.2", // AAC-LC
            container: "audio/mp4",
            mimeType: 'audio/mp4; codecs="mp4a.40.2"',
            segmentDuration: SEGMENT_DURATION / 1000,
            segmentDurationMs: SEGMENT_DURATION,
            segmentDurationsMs: audioSegmentDurations,
            language: "en" // Default to English
          }
        ] : [],

        // Segment URL templates
        endpoints: {
          initSegment: `${baseUrl}/api/v1/transcode/{rendition}/init.m4s?url=${encodeURIComponent(url)}`,
          mediaSegment: `${baseUrl}/api/v1/transcode/{rendition}/{segmentId}.m4s?url=${encodeURIComponent(url)}`
        },

        // JIT-specific info
        jitInfo: {
          parallelTranscodingSupported: true,
          expectedTranscodeLatency: 500, // ms estimate
          segmentCount: videoSegmentDurations.length,
          scrubSegmentCount: scrubSegmentDurations.length
        }
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
      res.json(manifest);

    } catch (error) {
      send500Error(res, "JIT manifest generation", error, req, { sourceUrl: req.query.url });
    }
  });

  // DASH manifest endpoint
  app.get('/api/v1/transcode/manifest.mpd', requireAuth, async (req, res) => {
    try {
      const { url } = req.query;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL parameter is required' });
      }

      // Detect available tracks and get duration
      const { getFileDurationWithCaching, detectAvailableTracks } = await import("@/transcode/src/jit/transcoding-service");
      const [duration, { hasAudio, hasVideo }] = await Promise.all([
        getFileDurationWithCaching(url),
        detectAvailableTracks(url)
      ]);

      // Generate DASH manifest
      const baseUrl = getBaseUrl(req);
      // IMPLEMENTATION GUIDELINES: Lazy load ManifestGenerator to reduce cold start time
      const { ManifestGenerator } = await import("@/transcode/src/jit/manifest-generator");
      const manifest = ManifestGenerator.generateDashManifest({
        baseUrl,
        duration,
        segmentDuration: SEGMENT_DURATION_SECONDS,
        videoRenditions: hasVideo ? ['high', 'medium', 'low'] : [],
        audioRenditions: hasAudio ? ['audio'] : [],
        sourceUrl: url
      });

      res.setHeader('Content-Type', 'application/dash+xml');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(manifest);

    } catch (error) {
      send500Error(res, "DASH manifest generation", error, req, { sourceUrl: req.query.url });
    }
  });

  // HLS master manifest endpoint
  app.get('/api/v1/transcode/manifest.m3u8', requireAuth, async (req, res) => {
    try {
      const { url } = req.query;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL parameter is required' });
      }

      // Detect available tracks and get duration
      const { getFileDurationWithCaching, detectAvailableTracks } = await import("@/transcode/src/jit/transcoding-service");
      const [duration, { hasAudio, hasVideo }] = await Promise.all([
        getFileDurationWithCaching(url),
        detectAvailableTracks(url)
      ]);

      // Generate HLS master manifest
      const baseUrl = getBaseUrl(req);
      // IMPLEMENTATION GUIDELINES: Lazy load ManifestGenerator to reduce cold start time
      const { ManifestGenerator } = await import("@/transcode/src/jit/manifest-generator");
      const manifest = ManifestGenerator.generateHlsManifest({
        baseUrl,
        duration,
        segmentDuration: SEGMENT_DURATION_SECONDS,
        videoRenditions: hasVideo ? ['high', 'medium', 'low'] : [],
        audioRenditions: hasAudio ? ['audio'] : [],
        sourceUrl: url
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(manifest);

    } catch (error) {
      send500Error(res, "HLS manifest generation", error, req, { sourceUrl: req.query.url });
    }
  });

  // HLS rendition-specific playlist endpoint
  app.get('/api/v1/transcode/:rendition.m3u8', requireAuth, async (req, res) => {
    try {
      const { rendition } = req.params;
      const { url } = req.query;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL parameter is required' });
      }

      if (!rendition || !['high', 'medium', 'low', 'audio'].includes(rendition)) {
        return res.status(400).json({ error: 'Invalid rendition. Use high, medium, low, or audio' });
      }

      // Get video duration
      const duration = await getVideoDuration(url);

      // Generate HLS rendition playlist
      const baseUrl = getBaseUrl(req);
      // IMPLEMENTATION GUIDELINES: Lazy load ManifestGenerator to reduce cold start time
      const { ManifestGenerator } = await import("@/transcode/src/jit/manifest-generator");
      const manifest = ManifestGenerator.generateHlsQualityPlaylist({
        baseUrl,
        duration,
        segmentDuration: SEGMENT_DURATION_SECONDS,
        videoRenditions: ['high', 'medium', 'low'],
        audioRenditions: ['audio'],
        rendition: rendition as 'high' | 'medium' | 'low' | 'audio',
        sourceUrl: url
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(manifest);

    } catch (error) {
      send500Error(res, "HLS quality playlist generation", error, req, {
        sourceUrl: req.query.url,
        rendition: req.params.rendition
      });
    }
  });

  // Segment endpoints (.m4s and .mp4)
  app.get('/api/v1/transcode/:rendition/:segmentId.:extension', requireAuth, async (req, res) => {
    try {
      const { rendition, segmentId, extension } = req.params;
      const { url } = req.query;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL parameter is required' });
      }

      if (!extension || !['m4s', 'mp4'].includes(extension)) {
        return res.status(400).json({ error: 'Invalid extension. Use .m4s or .mp4' });
      }

      if (!rendition) {
        return res.status(400).json({ error: 'Rendition parameter is required' });
      }

      // IMPLEMENTATION GUIDELINES: Validate MP3 files only support audio rendition
      if (isMP3Url(url)) {
        if (!validateMp3Rendition(rendition)) {
          return res.status(400).json({
            error: {
              code: 'INVALID_RENDITION_FOR_MP3',
              message: 'MP3 files only support audio rendition',
              details: {
                providedRendition: rendition,
                supportedRenditions: ['audio'],
                fileType: 'mp3'
              }
            }
          });
        }
      } else {
        // For non-MP3 files, validate rendition is supported
        if (!rendition || !['high', 'medium', 'low', 'audio', 'scrub'].includes(rendition)) {
          return res.status(400).json({ error: 'Invalid rendition. Use high, medium, low, audio, or scrub' });
        }

        // Detect available tracks and validate the requested rendition type exists
        const { detectAvailableTracks } = await import("@/transcode/src/jit/transcoding-service");
        const { hasAudio, hasVideo } = await detectAvailableTracks(url);

        const isAudioRendition = rendition === 'audio';
        const isVideoRendition = ['high', 'medium', 'low', 'scrub'].includes(rendition);

        if (isAudioRendition && !hasAudio) {
          return res.status(400).json({
            error: {
              code: 'NO_AUDIO_TRACK',
              message: 'Source file does not contain an audio track',
              details: {
                providedRendition: rendition,
                hasAudio: false,
                hasVideo: hasVideo
              }
            }
          });
        }

        if (isVideoRendition && !hasVideo) {
          return res.status(400).json({
            error: {
              code: 'NO_VIDEO_TRACK',
              message: 'Source file does not contain a video track',
              details: {
                providedRendition: rendition,
                hasAudio: hasAudio,
                hasVideo: false
              }
            }
          });
        }
      }

      if (!segmentId || (segmentId !== 'init' && Number.isNaN(Number(segmentId)))) {
        return res.status(400).json({ error: 'segmentId must be "init" or a number' });
      }

      // Normalize segmentId - remove leading zeros for internal processing
      const normalizedSegmentId = segmentId === 'init' ? 'init' : String(Number(segmentId));

      // IMPLEMENTATION GUIDELINES: Track transcoding time for ABR algorithm
      const totalStartTime = Date.now();

      // IMPLEMENTATION GUIDELINES: Resolve effective URL for transcoding
      // For MP3s: this downloads cached MP4 to temp file and returns file path
      // For videos: this returns the original URL
      const effectiveUrl = await resolveEffectiveTranscodingUrl(url);

      const { buffer: segmentBuffer, transcodeTimeMs } = await TranscodeOperation.getOrCreate(
        effectiveUrl, // Internal path for MP3s, original URL for videos
        rendition,
        normalizedSegmentId,
        extension as 'mp4' | 'm4s',
        url // Pass original URL for context
      ).whenTranscoded;

      // Serve the segment
      const totalEndTime = Date.now();
      const totalServerTimeMs = totalEndTime - totalStartTime;

      const contentType = extension === 'm4s' ? 'video/iso.segment' : 'video/mp4';
      const cacheStatus = transcodeTimeMs === 0 ? 'HIT' : 'MISS';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': segmentBuffer.length.toString(),
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
        'X-Cache': cacheStatus,
        'X-Transcode-Time-Ms': transcodeTimeMs.toString(),
        'X-Total-Server-Time-Ms': totalServerTimeMs.toString()
      });
      res.end(segmentBuffer);

      console.log(`${cacheStatus === 'HIT' ? 'Cache hit' : 'Cache miss'} - served segment ${rendition}/${normalizedSegmentId}.${extension} (${transcodeTimeMs}ms transcode, ${totalServerTimeMs}ms total)`);

    } catch (error) {
      send500Error(res, "Segment transcoding/serving", error, req, {
        sourceUrl: req.query.url,
        rendition: req.params.rendition,
        segmentId: req.params.segmentId,
        extension: req.params.extension,
        cacheKey: req.params.rendition && req.params.segmentId ? generateSegmentCacheKey(
          req.query.url as string,
          req.params.rendition,
          req.params.segmentId === 'init' ? 'init' : String(Number(req.params.segmentId)),
          req.params.extension as 'mp4' | 'm4s'
        ) : undefined
      });
    }
  });





  // Return the Express app as a request handler
  return (req: any, res: any) => app(req, res);
}

export default eagerServer; 