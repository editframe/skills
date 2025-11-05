import type { RENDITION_CONFIGS } from './transcoding-service';

export interface BaseTranscodeOptions {
  inputUrl: string;
  segmentId: string | number;
  segmentDurationMs: SegmentDurationType;
  outputDir: string;
  isFragmented?: boolean;      // Optional - controls MP4 format
  syntheticMp4?: ArrayBuffer;  // Optional - will fetch if not provided
  segmentData?: Uint8Array;    // Optional - will fetch if not provided
}

export type AudioRendition = 'audio';
export type VideoRendition = 'high' | 'medium' | 'low' | 'scrub';


export function isAudioRendition(rendition: string): rendition is AudioRendition {
  return rendition === 'audio';
}

export function isVideoRendition(rendition: string): rendition is VideoRendition {
  return ['high', 'medium', 'low', 'scrub'].includes(rendition);
}

export type AnyRendition = AudioRendition | VideoRendition;

export interface AudioTranscodeOptions extends BaseTranscodeOptions {
  rendition: AudioRendition;  // Only support audio rendition
}

export interface VideoTranscodeOptions extends BaseTranscodeOptions {
  rendition: VideoRendition;  // Only support video renditions
  isScrubTrack?: boolean;  // Enable scrub track optimizations
}

export type TranscodeOptions = AudioTranscodeOptions | VideoTranscodeOptions;

export interface SegmentInfo {
  index: number;
  startTimeUs: number;
  endTimeUs: number;
  isLast: boolean;
  actualStartTimeUs: number;
  actualDurationUs: number;
}

export type RenditionConfig = typeof RENDITION_CONFIGS[keyof typeof RENDITION_CONFIGS];// Configuration
type SegmentDuration = 2000 & { __brand: "SEGMENT_DURATION"; };
type ScrubSegmentDuration = 30000 & { __brand: "SCRUB_SEGMENT_DURATION"; };
type Mp3SegmentDuration = 15000 & { __brand: "MP3_SEGMENT_DURATION"; };

export type SegmentDurationType = SegmentDuration | ScrubSegmentDuration | Mp3SegmentDuration;

export const SEGMENT_DURATION = 2000 as SegmentDuration; // 2 second segments (in milliseconds)
export const SCRUB_SEGMENT_DURATION = 30000 as ScrubSegmentDuration; // 30 second segments for scrub tracks (in milliseconds)
export const MP3_SEGMENT_DURATION = 15000 as Mp3SegmentDuration; // 15 second segments for MP3/audio content
export const SEGMENT_DURATION_SECONDS = SEGMENT_DURATION / 1000; // Convert to seconds for manifest generation
