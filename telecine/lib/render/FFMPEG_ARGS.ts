export const FF_LOGLEVEL = "error";

// biome-ignore format: strict command line format
export const FFMPEG_ARGS = [
  "-hide_banner",
  "-loglevel",
  FF_LOGLEVEL,
  "-bitexact",
];

// biome-ignore format: strict command line format
export const FFMPEG_ANALYZE_ARGS = [
  "-analyzeduration",
  "1",
  "-probesize",
  "32",
];
