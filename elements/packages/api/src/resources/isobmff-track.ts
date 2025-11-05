import debug from "debug";
import { z } from "zod";
import type { Client } from "../client.js";
import { uploadChunks } from "../uploadChunks.js";
import { assertTypesMatch } from "../utils/assertTypesMatch.ts";

export const AudioStreamSchema = z.object({
  index: z.number(),
  codec_name: z.string(),
  codec_long_name: z.string(),
  codec_type: z.literal("audio"),
  codec_tag_string: z.string(),
  codec_tag: z.string(),
  sample_fmt: z.string(),
  sample_rate: z.string(),
  channels: z.number(),
  channel_layout: z.string().optional(),
  bits_per_sample: z.number(),
  initial_padding: z.number().optional(),
  r_frame_rate: z.string(),
  avg_frame_rate: z.string(),
  time_base: z.string(),
  start_pts: z.number().optional(),
  start_time: z.coerce.number().optional(),
  duration_ts: z.number(),
  duration: z.coerce.number(),
  bit_rate: z.string(),
  disposition: z.record(z.unknown()),
});

export interface AudioStreamSchema {
  /** The index of the stream in the file */
  index: number;
  /** The name of the codec */
  codec_name: string;
  /** The long name of the codec */
  codec_long_name: string;
  /** The type of the codec */
  codec_type: "audio";
  /** The tag string of the codec */
  codec_tag_string: string;
  /** The tag of the codec */
  codec_tag: string;
  /** The sample format */
  sample_fmt: string;
  /** The sample rate */
  sample_rate: string;
  /** The number of channels */
  channels: number;
  /** The channel layout */
  channel_layout?: string;
  /** The number of bits per sample */
  bits_per_sample: number;
  /** The initial padding */
  initial_padding?: number;
  /** The frame rate */
  r_frame_rate: string;
  /** The average frame rate */
  avg_frame_rate: string;
  /** The time base */
  time_base: string;
  /** The start presentation timestamp */
  start_pts?: number;
  /** The start time */
  start_time?: number;
  /** The duration timestamp */
  duration_ts: number;
  /** The duration */
  duration: number;
  /** The bit rate */
  bit_rate: string;
  /** The disposition record. Subject to change, not documented. */
  disposition: Record<string, unknown>;
}

assertTypesMatch<z.infer<typeof AudioStreamSchema>, AudioStreamSchema>(true);

export const VideoStreamSchema = z.object({
  index: z.number(),
  codec_name: z.string(),
  codec_long_name: z.string(),
  codec_type: z.literal("video"),
  codec_tag_string: z.string(),
  codec_tag: z.string(),
  width: z.number(),
  height: z.number(),
  coded_width: z.number(),
  coded_height: z.number(),
  r_frame_rate: z.string(),
  avg_frame_rate: z.string(),
  time_base: z.string(),
  start_pts: z.number().optional(),
  start_time: z.coerce.number().optional(),
  duration_ts: z.number().optional(),
  duration: z.coerce.number().optional(),
  bit_rate: z.string().optional(),
  disposition: z.record(z.unknown()),
});

export interface VideoStreamSchema {
  /** The index of the stream in the file */
  index: number;
  /** The name of the codec */
  codec_name: string;
  /** The long name of the codec */
  codec_long_name: string;
  /** The type of the codec */
  codec_type: "video";
  /** The tag string of the codec */
  codec_tag_string: string;
  /** The tag of the codec */
  codec_tag: string;
  /** The width */
  width: number;
  /** The height */
  height: number;
  /** The coded width */
  coded_width: number;
  /** The coded height */
  coded_height: number;
  /** The frame rate */
  r_frame_rate: string;
  /** The average frame rate */
  avg_frame_rate: string;
  /** The time base */
  time_base: string;
  /** The start presentation timestamp */
  start_pts?: number;
  /** The start time */
  start_time?: number;
  /** The duration timestamp */
  duration_ts?: number;
  /** The duration */
  duration?: number;
  /** The bit rate */
  bit_rate?: string;
  /** The disposition record. Subject to change, not documented. */
  disposition: Record<string, unknown>;
}

assertTypesMatch<z.infer<typeof VideoStreamSchema>, VideoStreamSchema>(true);

const log = debug("ef:api:isobmff-track");

const MAX_TRACK_SIZE = 1024 * 1024 * 1024; // 1GB

export const AudioTrackPayload = z.object({
  file_id: z.string(),
  track_id: z.number().int(),
  type: z.literal("audio"),
  probe_info: AudioStreamSchema,
  duration_ms: z.number().int(),
  codec_name: z.string(),
  byte_size: z.number().int().max(MAX_TRACK_SIZE),
});

export interface AudioTrackPayload {
  file_id: string;
  track_id: number;
  type: "audio";
  probe_info: AudioStreamSchema;
  duration_ms: number;
  codec_name: string;
  byte_size: number;
}

// These will actually error if types don't match
assertTypesMatch<z.infer<typeof AudioTrackPayload>, AudioTrackPayload>(true);

export const VideoTrackPayload = z.object({
  file_id: z.string(),
  track_id: z.number().int(),
  type: z.literal("video"),
  probe_info: VideoStreamSchema,
  duration_ms: z.number().int(),
  codec_name: z.string(),
  byte_size: z.number().int().max(MAX_TRACK_SIZE),
});

export interface VideoTrackPayload {
  file_id: string;
  track_id: number;
  type: "video";
  probe_info: VideoStreamSchema;
  duration_ms: number;
  codec_name: string;
  byte_size: number;
}

assertTypesMatch<z.infer<typeof VideoTrackPayload>, VideoTrackPayload>(true);

export const CreateISOBMFFTrackPayload = z.discriminatedUnion("type", [
  AudioTrackPayload,
  VideoTrackPayload,
]);

export type CreateISOBMFFTrackPayload = VideoTrackPayload | AudioTrackPayload;

assertTypesMatch<
  z.infer<typeof CreateISOBMFFTrackPayload>,
  CreateISOBMFFTrackPayload
>(true);

export interface CreateISOBMFFTrackResult {
  next_byte: number;
  byte_size: number;
  track_id: number;
  file_id: string;
  complete: boolean;
}

export const createISOBMFFTrack = async (
  client: Client,
  payload: CreateISOBMFFTrackPayload,
) => {
  log("Creating isobmff track", payload);
  CreateISOBMFFTrackPayload.parse(payload);
  const response = await client.authenticatedFetch("/api/v1/isobmff_tracks", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  log("ISOBMFF track created", response);
  if (response.ok) {
    return (await response.json()) as CreateISOBMFFTrackResult;
  }

  throw new Error(
    `Failed to create isobmff track ${response.status} ${response.statusText}`,
  );
};

export const uploadISOBMFFTrack = (
  client: Client,
  fileId: string,
  trackId: number,
  fileStream: ReadableStream,
  trackSize: number,
) => {
  log("Uploading fragment track", fileId);

  return uploadChunks(client, {
    url: `/api/v1/isobmff_tracks/${fileId}/${trackId}/upload`,
    fileStream,
    fileSize: trackSize,
    maxSize: MAX_TRACK_SIZE,
  });
};
