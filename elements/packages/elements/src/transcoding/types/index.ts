/**
 * Core types and interfaces for JIT Transcoding System
 */

export interface QualityPreset {
  name: string;
  width: number;
  height: number;
  videoBitrate: number;
  audioBitrate: number;
  audioChannels: number;
  audioSampleRate: number;
  audioCodec: "aac";
}

export type RenditionId = "high" | "medium" | "low" | "audio" | "scrub";

export interface VideoMetadata {
  url: string;
  durationMs: number;
  streams: Array<{
    index: number;
    type: "video" | "audio" | "subtitle" | "other";
    codecName: string;
    duration: number;
    durationMs: number;
    width?: number;
    height?: number;
    frameRate?: { num: number; den: number };
    channels?: number;
    sampleRate?: number;
  }>;
  presets: string[];
  segmentDuration: number;
  supportedFormats: string[];
  extractedAt: string;
}

export interface JitTranscodingConfig {
  baseUrl: string;
  defaultQuality: keyof QualityPresets;
  segmentCacheSize: number;
  enableNetworkAdaptation: boolean;
  enablePrefetch: boolean;
  prefetchSegments: number;
}

export interface QualityPresets {
  low: QualityPreset;
  medium: QualityPreset;
  high: QualityPreset;
  scrub: QualityPreset;
}

export interface NetworkCondition {
  bandwidth: number; // bits per second
  rtt: number; // round trip time in ms
  connectionType: string;
}

export interface SegmentInfo {
  url: string;
  startTimeMs: number;
  durationMs: number;
  quality: string;
  cached: boolean;
}

export interface ManifestVideoRendition {
  /** Unique identifier for the video rendition */
  id: string; // "high", "medium", "low", "scrub"
  /** Duration of each segment in milliseconds */
  segmentDuration: number;
  /** Duration of each segment in milliseconds */
  segmentDurationMs: number;
  /** Actual segment durations array (overrides fixed segmentDurationMs if provided) */
  segmentDurationsMs?: number[];
  /** Video width in pixels */
  width: number;
  /** Video height in pixels */
  height: number;
  /** Target bitrate in bits per second */
  bitrate: number;
  /** Video codec string (e.g., "avc1.640029") */
  codec: string;
  /** Container format (e.g., "video/mp4") */
  container: string;
  /** Complete MIME type with codecs */
  mimeType: string; // 'video/mp4; codecs="avc1.640029,mp4a.40.2"'
  /** Optional frame rate */
  frameRate?: number;
  /** Optional profile indication */
  profile?: string;
  /** Optional level indication */
  level?: string;
  /** Optional start time offset in milliseconds */
  startTimeOffsetMs?: number;
}

export interface ManifestAudioRendition {
  /** Unique identifier for the audio rendition */
  id: string; // "audio"
  /** Duration of each segment in milliseconds */
  segmentDuration: number;
  /** Duration of each segment in milliseconds */
  segmentDurationMs: number;
  /** Actual segment durations array (overrides fixed segmentDurationMs if provided) */
  segmentDurationsMs?: number[];
  /** Number of audio channels */
  channels: number;
  /** Sample rate in Hz */
  sampleRate: number;
  /** Target bitrate in bits per second */
  bitrate: number;
  /** Audio codec string (e.g., "mp4a.40.2") */
  codec: string;
  /** Container format (e.g., "audio/mp4") */
  container: string;
  /** Complete MIME type with codecs */
  mimeType: string; // 'audio/mp4; codecs="mp4a.40.2"'
  /** Optional language code */
  language?: string;
  /** Optional start time offset in milliseconds */
  startTimeOffsetMs?: number;
}

/**
 * CMAF Manifest Response Structure
 * Matches the server response from /api/v1/transcode/manifest.json
 */
export interface ManifestResponse {
  /** Manifest version for compatibility tracking */
  version: string;
  /** Type of manifest (e.g., "cmaf", "dash", "hls") */
  type: string;
  /** Original source URL for the media */
  sourceUrl: string;
  /** Total duration of the content in milliseconds */
  duration: number;
  /** Total duration of the content in milliseconds */
  durationMs: number;
  /** Duration of each segment in milliseconds */
  segmentDuration: number;
  /** Base URL for all relative URLs */
  baseUrl: string;
  /** Video renditions available for adaptive streaming */
  videoRenditions: ManifestVideoRendition[];
  /** Audio renditions available for adaptive streaming */
  audioRenditions: ManifestAudioRendition[];
  /** URL templates for segment access */
  endpoints: {
    /** Initialization segment URL template with {rendition} placeholder */
    initSegment: string;
    /** Media segment URL template with {rendition} and {segmentId} placeholders */
    mediaSegment: string;
  };
  /** JIT transcoding specific information */
  jitInfo: {
    /** Whether parallel transcoding is supported */
    parallelTranscodingSupported: boolean;
    /** Expected transcoding latency in milliseconds */
    expectedTranscodeLatency: number;
    /** Total number of segments */
    segmentCount: number;
  };
  /** Optional timescale for the media timeline */
  timescale?: number;
  /** Optional start number for segments */
  startNumber?: number;
  /** Optional minimum buffer time in milliseconds */
  minBufferTime?: number;
  /** Optional suggested presentation delay in milliseconds */
  suggestedPresentationDelay?: number;
}

/**
 * Cache statistics interface
 */
export interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  efficiency: number;
  totalRequests: number;
  recentKeys: string[];
}

// Re-export the unified MediaEngine from its new canonical location
export type { MediaEngine } from "../../elements/EFMedia/MediaEngine.js";
export type {
  TrackRef,
  TrackSet,
  TrackRole,
  SegmentIndex,
  SegmentTimeRange,
} from "../../elements/EFMedia/SegmentIndex.js";
export type { SegmentTransport } from "../../elements/EFMedia/SegmentTransport.js";
export type { TimingModel } from "../../elements/EFMedia/TimingModel.js";

// Legacy types kept for backwards compatibility
export interface AudioRendition {
  id?: RenditionId;
  trackId: number | undefined;
  src: string;
  segmentDurationMs?: number;
  segmentDurationsMs?: number[];
  startTimeOffsetMs?: number;
}
export interface VideoRendition {
  id?: RenditionId;
  trackId: number | undefined;
  src: string;
  segmentDurationMs?: number;
  segmentDurationsMs?: number[];
  startTimeOffsetMs?: number;
}

export type MediaRendition = AudioRendition | VideoRendition;

export interface ThumbnailResult {
  timestamp: number;
  thumbnail: HTMLCanvasElement | OffscreenCanvas;
}
interface InitSegmentPath {
  path: string;
  pos: number;
  size: number;
}
export interface InitSegmentPaths {
  audio?: InitSegmentPath;
  video?: InitSegmentPath;
}
export interface AudioSpan {
  startMs: number;
  endMs: number;
  blob: Blob;
}
