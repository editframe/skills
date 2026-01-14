import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";
import { createReadStream } from "node:fs";

import * as z from "zod";
import debug from "debug";
import type { Readable } from "node:stream";
import { truncateDecimal } from "./truncateDecimal";

const execPromise = promisify(exec);

const log = debug("ef:assets:probe");

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

export type AudioStreamSchema = z.infer<typeof AudioStreamSchema>;

export const VideoStreamSchema = z.object({
  index: z.number(),
  codec_name: z.string(),
  codec_long_name: z.string(),
  codec_type: z.literal("video"),
  codec_tag_string: z.string(),
  codec_tag: z.string(),
  profile: z.string().optional(),
  level: z.number().optional(),
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

export type VideoStreamSchema = z.infer<typeof VideoStreamSchema>;

const ProbeFormatSchema = z.object({
  filename: z.string(),
  nb_streams: z.number(),
  nb_programs: z.number(),
  format_name: z.string(),
  format_long_name: z.string(),
  start_time: z.string().optional(),
  duration: z.string().optional(),
  size: z.string().optional(),
  bit_rate: z.string().optional(),
  probe_score: z.number(),
});

export const DataStreamSchema = z.object({
  index: z.number(),
  codec_type: z.literal("data"),
  duration: z.string().optional(),
  duration_ts: z.number().optional(),
  start_pts: z.number().optional(),
});

export type DataStreamSchema = z.infer<typeof DataStreamSchema>;

const StreamSchema = z.discriminatedUnion("codec_type", [
  AudioStreamSchema,
  VideoStreamSchema,
  DataStreamSchema,
]);

export type StreamSchema = z.infer<typeof StreamSchema>;

const PacketSchema = z.object({
  stream_index: z.number(),
  pts: z.number(),
  pts_time: z.coerce.number(),
  dts: z.number(),
  dts_time: z.coerce.number(),
  duration: z.coerce.number().optional(),
  pos: z.coerce.number().optional(),
  flags: z.string().optional(),
});

export type PacketSchema = z.infer<typeof PacketSchema>;

const ProbeSchema = z.object({
  streams: z.array(StreamSchema),
  format: ProbeFormatSchema,
});

const PacketProbeSchema = z.object({
  packets: z.array(PacketSchema),
  format: ProbeFormatSchema,
  streams: z.array(StreamSchema),
});

export type ProbeSchema = z.infer<typeof ProbeSchema>;
export type PacketProbeSchema = z.infer<typeof PacketProbeSchema>;

export interface TrackSegment {
  cts: number;
  dts: number;
  duration: number;
  offset: number;
  size: number;
}

export interface AudioTrackFragmentIndex {
  track: number;
  type: "audio";
  timescale: number;
  duration: number;
  channel_count: number;
  sample_rate: number;
  sample_size: number;
  sample_count: number;
  codec: string;
  startTimeOffsetMs?: number;
  initSegment: {
    offset: 0;
    size: number;
  };
  segments: Array<TrackSegment>;
}

export interface VideoTrackFragmentIndex {
  track: number;
  type: "video";
  timescale: number;
  duration: number;
  width: number;
  height: number;
  sample_count: number;
  codec: string;
  startTimeOffsetMs?: number;
  initSegment: {
    offset: 0;
    size: number;
  };
  segments: Array<TrackSegment>;
}

export type TrackFragmentIndex =
  | AudioTrackFragmentIndex
  | VideoTrackFragmentIndex;

const buildProbeArgs = (options: { showPackets?: boolean }) => {
  const streamEntries =
    "stream=index,codec_name,codec_long_name,codec_type,codec_tag_string,codec_tag,profile,level,width,height,coded_width,coded_height,r_frame_rate,avg_frame_rate,time_base,start_pts,start_time,duration_ts,duration,bit_rate,sample_fmt,sample_rate,channels,channel_layout,bits_per_sample,initial_padding,disposition";
  const packetEntries =
    "packet=stream_index,pts,pts_time,dts,dts_time,duration,pos,flags";

  return [
    "-v",
    "error",
    "-show_format",
    "-show_streams",
    "-of",
    "json",
    ...(options.showPackets
      ? ["-show_entries", `${streamEntries}:${packetEntries}`]
      : ["-show_entries", streamEntries]),
  ];
};

class FFProbeRunner {
  static async probePath(
    absolutePath: string,
    includePackets: boolean,
  ): Promise<any> {
    const probeCommand = `ffprobe ${buildProbeArgs({ showPackets: includePackets }).join(" ")} ${absolutePath}`;
    log("Probing", probeCommand);
    const probeResult = await execPromise(probeCommand);
    log("Probe result", probeResult.stdout);
    log("Probe stderr", probeResult.stderr);
    return JSON.parse(probeResult.stdout);
  }

  static async probeStream(
    stream: Readable,
    includePackets: boolean,
  ): Promise<any> {
    const probe = spawn(
      "ffprobe",
      ["-i", "-", ...buildProbeArgs({ showPackets: includePackets })],
      { stdio: ["pipe", "pipe", "pipe"] },
    );

    const chunks: Uint8Array[] = [];

    // Handle process exit/error before data processing
    const processExit = new Promise<never>((_, reject) => {
      probe.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`ffprobe exited with code ${code}`));
        }
      });
      probe.on("error", (err) => reject(err));
    });

    probe.stderr.on("data", (data) => {
      log(data.toString());
    });

    probe.stdout.on("data", (data) => {
      chunks.push(data);
    });

    // Handle pipe errors
    probe.stdin.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EPIPE") {
        log("ffprobe closed input pipe");
        return;
      }
      log("ffprobe stdin error", error);
    });

    stream.pipe(probe.stdin);

    try {
      const json = await Promise.race([
        new Promise<any>((resolve, reject) => {
          probe.stdout.on("end", () => {
            try {
              const buffer = Buffer.concat(chunks).toString("utf8");
              resolve(JSON.parse(buffer));
            } catch (error) {
              reject(error);
            }
          });
        }),
        processExit,
      ]);

      return json;
    } finally {
      // Clean up regardless of success or failure
      stream.unpipe(probe.stdin);
      probe.stdin.end();
      stream.destroy();
    }
  }
}

abstract class ProbeBase {
  abstract data: ProbeSchema | PacketProbeSchema;

  get audioStreams() {
    return this.data.streams.filter(
      (stream) => stream.codec_type === "audio",
    ) as AudioStreamSchema[];
  }

  get videoStreams() {
    return this.data.streams.filter(
      (stream) => stream.codec_type === "video",
    ) as VideoStreamSchema[];
  }

  get streams() {
    return this.data.streams;
  }

  get format() {
    return this.data.format;
  }

  get mustReencodeAudio() {
    return this.audioStreams.some((stream) => stream.codec_name !== "aac");
  }

  get mustReencodeVideo() {
    return false;
  }

  get mustRemux() {
    return (
      this.format.format_name !== "mp4" ||
      this.data.streams.some(
        (stream) =>
          stream.codec_type !== "audio" && stream.codec_type !== "video",
      )
    );
  }

  get hasNonAudioOrVideoStreams() {
    return this.data.streams.some(
      (stream) =>
        stream.codec_type !== "audio" && stream.codec_type !== "video",
    );
  }

  get hasAudio() {
    return this.audioStreams.length > 0;
  }

  get hasVideo() {
    return this.videoStreams.length > 0;
  }

  get isAudioOnly() {
    return this.audioStreams.length > 0 && this.videoStreams.length === 0;
  }

  get isMp3() {
    return this.audioStreams.some((stream) => stream.codec_name === "mp3");
  }

  get isVideoOnly() {
    return this.audioStreams.length === 0 && this.videoStreams.length > 0;
  }

  get mustProcess() {
    return this.mustReencodeAudio || this.mustReencodeVideo || this.mustRemux;
  }

  get audioTimebase() {
    const audioStream = this.audioStreams[0];
    if (!audioStream) {
      return null;
    }
    const [num, den] = audioStream.time_base.split("/").map(Number);
    if (num === undefined || den === undefined) {
      return null;
    }
    return { num, den };
  }

  get videoTimebase() {
    const videoStream = this.videoStreams[0];
    if (!videoStream) {
      return null;
    }
    const [num, den] = videoStream.time_base.split("/").map(Number);
    if (num === undefined || den === undefined) {
      return null;
    }
    return { num, den };
  }

  get ffmpegAudioInputOptions() {
    if (!this.hasAudio) {
      return [];
    }
    if (this.isMp3) {
      return ["-c:a", "mp3"];
    }
    return [];
  }

  get ffmpegVideoInputOptions() {
    return [];
  }

  get ffmpegAudioOutputOptions() {
    if (!this.hasAudio) {
      return [];
    }
    if (this.mustReencodeAudio) {
      // biome-ignore format: keep cli argument paired together
      return ["-c:a", "aac", "-b:a", "192k", "-ar", "48000"];
    }
    return ["-c:a", "copy"];
  }

  get ffmpegVideoOutputOptions() {
    if (!this.hasVideo) {
      return [];
    }
    if (this.mustReencodeVideo) {
      // biome-ignore format: keep cli argument paired together
      return [
        "-c:v",
        "h264",
        // Filter out SEI NAL units that aren't supported by the webcodecs decoder
        "-bsf:v",
        "filter_units=remove_types=6",
        "-pix_fmt",
        "yuv420p",
      ];
    }
    // biome-ignore format: keep cli argument paired together
    return [
      "-c:v",
      "copy",
      // Filter out SEI NAL units that aren't supported by the webcodecs decoder
      "-bsf:v",
      "filter_units=remove_types=6",
    ];
  }

  protected constructor(protected absolutePath: string) {}

  createConformingReadstream() {
    if (this.absolutePath === "pipe:0") {
      throw new Error("Cannot create conforming readstream from pipe");
    }
    if (!this.mustProcess) {
      return createReadStream(this.absolutePath);
    }

    const fragmenterArgs = this.isAudioOnly
      ? [
          "-movflags",
          "frag_keyframe",
          "-frag_duration",
          "4000000", // Fragment every 4 seconds (in microseconds)
        ]
      : ["-movflags", "frag_keyframe"];

    // biome-ignore format: keep cli argument paired together
    const ffmpegConformanceArgs = [
      ...this.ffmpegAudioInputOptions,
      ...this.ffmpegVideoInputOptions,
      "-i",
      this.absolutePath,
      ...this.ffmpegAudioOutputOptions,
      ...this.ffmpegVideoOutputOptions,
      "-f",
      "mp4",
      "-bitexact", // Ensure deterministic output
      ...fragmenterArgs,
      "pipe:1",
    ];

    log("Running ffmpeg", ffmpegConformanceArgs);

    const ffmpegConformer = spawn("ffmpeg", ffmpegConformanceArgs, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    ffmpegConformer.stderr.on("data", (data) => {
      log("CONFORMER: ", data.toString());
    });

    // biome-ignore format: keep cli argument paired together
    const ffmpegFragmentArgs = [
      "-i",
      "-",
      "-c",
      "copy",
      "-f",
      "mp4",
      "-bitexact", // Ensure deterministic output
      ...fragmenterArgs,
      "pipe:1",
    ];

    log("Running ffmpeg", ffmpegFragmentArgs);

    const ffmpegFragmenter = spawn("ffmpeg", ffmpegFragmentArgs, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    ffmpegConformer.stdout.pipe(ffmpegFragmenter.stdin);
    ffmpegFragmenter.stderr.on("data", (data) => {
      log("FRAGMENTER: ", data.toString());
    });

    ffmpegConformer.on("error", (error) => {
      ffmpegFragmenter.stdout.emit("error", error);
    });

    ffmpegFragmenter.on("error", (error) => {
      ffmpegFragmenter.stdout.emit("error", error);
    });

    return ffmpegFragmenter.stdout;
  }

  createTrackReadstream(trackIndex: number) {
    if (this.absolutePath === "pipe:0") {
      throw new Error("Cannot create track readstream from pipe");
    }

    const track = this.data.streams[trackIndex];
    if (!track) {
      throw new Error(`Track ${trackIndex} not found`);
    }

    const isAudioTrack = track.codec_type === "audio";
    const isVideoTrack = track.codec_type === "video";

    if (!isAudioTrack && !isVideoTrack) {
      throw new Error(`Track ${trackIndex} is not audio or video`);
    }

    const fragmenterArgs = isAudioTrack
      ? [
          "-movflags",
          "empty_moov+default_base_moof",
          "-frag_duration",
          "4000000", // Fragment every 4 seconds (in microseconds)
        ]
      : ["-movflags", "frag_keyframe+empty_moov+default_base_moof"];

    // Create single-track MP4 with proper fragmentation
    // Use conforming stream system to handle codec compatibility
    const codecOptions =
      isAudioTrack && this.mustReencodeAudio
        ? this.ffmpegAudioOutputOptions
        : ["-c", "copy"];

    const ffmpegArgs = [
      ...this.ffmpegAudioInputOptions,
      ...this.ffmpegVideoInputOptions,
      "-i",
      this.absolutePath,
      "-map",
      `0:${trackIndex}`, // Select only this track
      ...codecOptions, // Use conforming stream codec options
      "-f",
      "mp4",
      "-bitexact", // Ensure deterministic output
      ...fragmenterArgs,
      "pipe:1",
    ];

    log("Creating track stream", ffmpegArgs);

    const ffmpegProcess = spawn("ffmpeg", ffmpegArgs, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    ffmpegProcess.stderr.on("data", (data) => {
      log(`TRACK ${trackIndex}: `, data.toString());
    });

    ffmpegProcess.on("error", (error) => {
      ffmpegProcess.stdout.emit("error", error);
    });

    return ffmpegProcess.stdout;
  }

  createScrubTrackReadstream() {
    if (this.absolutePath === "pipe:0") {
      throw new Error("Cannot create scrub track readstream from pipe");
    }

    const videoStream = this.videoStreams[0];
    if (!videoStream) {
      throw new Error("No video stream found for scrub track generation");
    }

    // Calculate proportional height for 320px width
    const targetWidth = 320;
    const aspectRatio = videoStream.height / videoStream.width;
    const targetHeight = Math.round(targetWidth * aspectRatio);
    // Ensure height is even (required for H.264)
    const scrubHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight + 1;

    // Parse frame rate from r_frame_rate (e.g., "30/1" or "30000/1001")
    const [fpsNum, fpsDen] = videoStream.r_frame_rate
      .split("/")
      .map(Number);
    const frameRate = fpsNum && fpsDen ? `${fpsNum}/${fpsDen}` : "30/1";

    // Scrub track uses 30-second fragments with keyframes every 10 frames for fast seeking.
    // NOTE: Do NOT use frag_keyframe - it would create a fragment at every keyframe.
    // We want multiple keyframes within a single 30-second fragment (single trun with many samples).
    const fragmenterArgs = [
      "-movflags",
      "empty_moov+default_base_moof",
      "-frag_duration",
      "30000000", // 30 seconds in microseconds
    ];

    // Transcode to low-res H.264 with keyframes every 10 frames for fast seeking
    const ffmpegArgs = [
      ...this.ffmpegAudioInputOptions,
      ...this.ffmpegVideoInputOptions,
      "-i",
      this.absolutePath,
      "-map",
      "0:v:0", // Select first video stream only (no audio for scrub)
      "-c:v",
      "libx264", // Encode to H.264
      "-preset",
      "ultrafast", // Fast encoding for scrub track
      "-crf",
      "28", // Lower quality for smaller file size
      "-vf",
      `scale=${targetWidth}:${scrubHeight}`, // Scale to scrub resolution
      "-r",
      frameRate, // Maintain native FPS
      "-g",
      "10", // Keyframe every 10 frames for fast seeking within fragments
      "-f",
      "mp4",
      "-bitexact", // Ensure deterministic output
      ...fragmenterArgs,
      "pipe:1",
    ];

    log("Creating scrub track stream", ffmpegArgs);

    const ffmpegProcess = spawn("ffmpeg", ffmpegArgs, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    ffmpegProcess.stderr.on("data", (data) => {
      log("SCRUB TRACK: ", data.toString());
    });

    ffmpegProcess.on("error", (error) => {
      ffmpegProcess.stdout.emit("error", error);
    });

    // Handle FFmpeg process exit
    ffmpegProcess.on("exit", (code, signal) => {
      if (code !== 0 && code !== null) {
        const error = new Error(
          `FFmpeg scrub track process exited with code ${code}${signal ? ` and signal ${signal}` : ""}`,
        );
        ffmpegProcess.stdout.emit("error", error);
      }
    });

    return ffmpegProcess.stdout;
  }
}

export class Probe extends ProbeBase {
  data: ProbeSchema;

  static async probePath(absolutePath: string): Promise<Probe> {
    const json = await FFProbeRunner.probePath(absolutePath, false);
    return new Probe(absolutePath, json);
  }

  static async probeStream(stream: Readable): Promise<Probe> {
    const json = await FFProbeRunner.probeStream(stream, false);
    return new Probe("pipe:0", json);
  }

  constructor(absolutePath: string, rawData: any) {
    super(absolutePath);
    this.data = ProbeSchema.parse(rawData);
  }
}

export class PacketProbe extends ProbeBase {
  data: PacketProbeSchema;

  static async probePath(absolutePath: string): Promise<PacketProbe> {
    const json = await FFProbeRunner.probePath(absolutePath, true);
    return new PacketProbe(absolutePath, json);
  }

  static async probeStream(stream: Readable): Promise<PacketProbe> {
    const json = await FFProbeRunner.probeStream(stream, true);
    return new PacketProbe("pipe:0", json);
  }

  constructor(absolutePath: string, rawData: any) {
    super(absolutePath);
    this.data = PacketProbeSchema.parse(rawData);
  }

  get packets() {
    return this.data.packets;
  }

  get bestEffortAudioDuration() {
    const stream = this.audioStreams[0];
    if (!stream) {
      throw new Error("No audio stream found");
    }
    return truncateDecimal(
      ((stream.duration_ts ?? 0) - (stream.start_pts ?? 0)) /
        (this.audioTimebase?.den ?? 0),
      5,
    );
  }

  get videoPacketDuration() {
    const videoStream = this.videoStreams[0];
    if (!videoStream) {
      return [];
    }
    const videoPackets = this.packets.filter(
      (packet) => packet.stream_index === videoStream.index,
    );

    const frameRate = videoStream.r_frame_rate;
    const [num, den] = frameRate.split("/").map(Number);
    if (!num || !den) {
      return [];
    }
    const packetDuration = den / num;

    // Calculate duration using actual packet PTS timing data
    if (videoPackets.length === 0) {
      return [];
    }

    const ptsTimes = videoPackets.map((p) => p.pts_time);
    const minPts = Math.min(...ptsTimes);
    const maxPts = Math.max(...ptsTimes);
    const totalDuration = maxPts - minPts + packetDuration;

    return truncateDecimal(Math.round(totalDuration * 10000) / 10000, 5);
  }
}
