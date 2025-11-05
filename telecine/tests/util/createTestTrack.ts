import type { createISOBMFFTrack } from "@editframe/api";

export function createTestTrack(
  options: Partial<Parameters<typeof createISOBMFFTrack>[1]> = {},
) {
  return Object.assign(
    {
      file_id: "test-id",
      track_id: 1,
      type: "audio",
      probe_info: {
        channels: 2,
        sample_rate: "44100",
        duration: 1000,
        duration_ts: 1000,
        start_time: 0,
        start_pts: 0,
        r_frame_rate: "100",
        channel_layout: "stereo",
        codec_tag_string: "mp3",
        codec_long_name: "MP3",
        codec_type: "audio",
        codec_tag: "0x0000",
        codec_name: "aac",
        bits_per_sample: 16,
        index: 0,
        sample_fmt: "s16",
        time_base: "100",
        avg_frame_rate: "100",
        disposition: {},
        bit_rate: "100",
      },
      duration_ms: 1000,
      codec_name: "mp3",
      byte_size: 1024 * 1024 * 5,
    } as const,
    options,
  );
}
