/**
 * Creates a test track object for testing ISOBMFF functionality
 */
export interface TestTrackOptions {
  type?: "audio" | "video";
  file_id?: string;
  track_id?: number;
  duration_ms?: number;
  codec_name?: string;
  byte_size?: number;
}

export function createTestTrack(options: TestTrackOptions = {}) {
  const type = options.type ?? "video";

  const base = {
    file_id: options.file_id ?? "test-file-id",
    track_id: options.track_id ?? 1,
    type,
    duration_ms: options.duration_ms ?? 1000,
    codec_name: options.codec_name ?? (type === "video" ? "h264" : "aac"),
    byte_size: options.byte_size ?? 1024,
  };

  if (type === "video") {
    return {
      ...base,
      type: "video" as const,
      probe_info: {
        index: 0,
        codec_name: base.codec_name,
        codec_long_name: `${base.codec_name} (long name)`,
        codec_type: "video" as const,
        codec_tag_string: "[0][0][0][0]",
        codec_tag: "0x0000",
        width: 1920,
        height: 1080,
        coded_width: 1920,
        coded_height: 1080,
        r_frame_rate: "30/1",
        avg_frame_rate: "30/1",
        time_base: "1/30000",
        start_pts: 0,
        start_time: 0,
        duration_ts: 30000,
        duration: base.duration_ms / 1000,
        bit_rate: "5000000",
        disposition: {},
      },
    };
  }

  return {
    ...base,
    type: "audio" as const,
    probe_info: {
      index: 1,
      codec_name: base.codec_name,
      codec_long_name: `${base.codec_name} (long name)`,
      codec_type: "audio" as const,
      codec_tag_string: "[0][0][0][0]",
      codec_tag: "0x0000",
      sample_fmt: "fltp",
      sample_rate: "44100",
      channels: 2,
      channel_layout: "stereo",
      bits_per_sample: 0,
      initial_padding: 0,
      r_frame_rate: "0/0",
      avg_frame_rate: "0/0",
      time_base: "1/44100",
      start_pts: 0,
      start_time: 0,
      duration_ts: 44100,
      duration: base.duration_ms / 1000,
      bit_rate: "128000",
      disposition: {},
    },
  };
}
