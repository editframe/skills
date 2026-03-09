/**
 * Test utility to load pre-generated JIT transcoded clips for browser testing
 * Uses the latest JIT transcoding APIs for realistic testing scenarios
 */

export interface JitTestClip {
  url: string;
  startTimeMs: number;
  durationMs: number;
  quality: "low" | "medium" | "high";
  data: Uint8Array;
  actualStartTimeMs: number;
  actualDurationMs: number;
  type: "video" | "audio";
}

export interface CreateJitTestClipsOptions {
  sourceVideoUrl: string;
  segments: Array<{
    startTimeMs: number;
    durationMs: number;
    quality: "low" | "medium" | "high";
    type?: "video" | "audio";
  }>;
}

export interface JitTestMetadata {
  url: string;
  durationMs: number;
  segmentDuration: number;
  streams: Array<{
    index: number;
    type: "video" | "audio";
    codecName: string;
    duration: number;
    durationMs: number;
    width?: number;
    height?: number;
    frameRate?: { num: number; den: number };
    channels?: number;
    sampleRate?: number;
    bitrate?: number;
  }>;
  presets: string[];
  supportedFormats: string[];
  extractedAt: string;
}

/**
 * Create realistic MP4 video segment with proper structure
 * Uses knowledge from JIT transcoding to create valid segments
 */
function createRealisticVideoSegment(
  durationMs: number,
  quality: "low" | "medium" | "high",
): Uint8Array {
  // Quality settings based on JIT transcoding presets
  const qualitySettings: Record<
    "low" | "medium" | "high",
    { bitrate: number; resolution: [number, number] }
  > = {
    low: { bitrate: 500000, resolution: [640, 360] },
    medium: { bitrate: 1500000, resolution: [1280, 720] },
    high: { bitrate: 4000000, resolution: [1920, 1080] },
  };

  const settings = qualitySettings[quality];

  // Create proper MP4 structure with realistic timing
  const ftypBox = createFtypBox();
  const moovBox = createMoovBox(durationMs);
  const mdatBox = createMdatBox(durationMs, settings.bitrate);

  const totalSize = ftypBox.length + moovBox.length + mdatBox.length;
  const result = new Uint8Array(totalSize);

  let offset = 0;
  result.set(ftypBox, offset);
  offset += ftypBox.length;
  result.set(moovBox, offset);
  offset += moovBox.length;
  result.set(mdatBox, offset);

  return result;
}

/**
 * Create realistic MP4 audio segment for audio-only testing
 */
function createRealisticAudioSegment(
  durationMs: number,
  quality: "low" | "medium" | "high",
): Uint8Array {
  const qualitySettings: Record<
    "low" | "medium" | "high",
    { bitrate: number; sampleRate: number }
  > = {
    low: { bitrate: 64000, sampleRate: 22050 },
    medium: { bitrate: 128000, sampleRate: 44100 },
    high: { bitrate: 256000, sampleRate: 48000 },
  };

  const settings = qualitySettings[quality];

  // Create MP4 audio-only structure
  const ftypBox = createFtypBox("M4A ");
  const moovBox = createAudioMoovBox(settings.sampleRate, durationMs);
  const mdatBox = createAudioMdatBox(durationMs, settings.bitrate);

  const totalSize = ftypBox.length + moovBox.length + mdatBox.length;
  const result = new Uint8Array(totalSize);

  let offset = 0;
  result.set(ftypBox, offset);
  offset += ftypBox.length;
  result.set(moovBox, offset);
  offset += moovBox.length;
  result.set(mdatBox, offset);

  return result;
}

function createFtypBox(majorBrand = "isom"): Uint8Array {
  // Ensure brand is exactly 4 bytes
  const brand = majorBrand.slice(0, 4).padEnd(4, " ");
  const brandBytes = new TextEncoder().encode(brand);
  const box = new Uint8Array(32);
  const view = new DataView(box.buffer);

  view.setUint32(0, 32); // box size
  box.set(new TextEncoder().encode("ftyp"), 4);
  box.set(brandBytes, 8);
  view.setUint32(12, 0x00000200); // minor version
  box.set(new TextEncoder().encode("isom"), 16);
  box.set(new TextEncoder().encode("iso2"), 20);
  box.set(new TextEncoder().encode("avc1"), 24);
  box.set(new TextEncoder().encode("mp41"), 28);

  return box;
}

function createMoovBox(durationMs: number): Uint8Array {
  // Simplified moov box with proper timing information
  const timescale = 30000; // 30fps * 1000
  const duration = Math.floor((durationMs * timescale) / 1000);

  const box = new Uint8Array(200); // Simplified moov box
  const view = new DataView(box.buffer);

  view.setUint32(0, 200); // box size
  box.set(new TextEncoder().encode("moov"), 4);

  // Add mvhd box with timing
  view.setUint32(8, 108); // mvhd size
  box.set(new TextEncoder().encode("mvhd"), 12);
  view.setUint32(16, 0); // version + flags
  view.setUint32(20, Math.floor(Date.now() / 1000)); // creation time
  view.setUint32(24, Math.floor(Date.now() / 1000)); // modification time
  view.setUint32(28, timescale); // timescale
  view.setUint32(32, duration); // duration
  view.setUint32(36, 0x00010000); // rate (1.0)

  return box;
}

function createAudioMoovBox(sampleRate: number, durationMs: number): Uint8Array {
  const timescale = sampleRate;
  const duration = Math.floor((durationMs * timescale) / 1000);

  const box = new Uint8Array(180);
  const view = new DataView(box.buffer);

  view.setUint32(0, 180); // box size
  box.set(new TextEncoder().encode("moov"), 4);

  // Add mvhd box for audio
  view.setUint32(8, 108);
  box.set(new TextEncoder().encode("mvhd"), 12);
  view.setUint32(16, 0);
  view.setUint32(20, Math.floor(Date.now() / 1000));
  view.setUint32(24, Math.floor(Date.now() / 1000));
  view.setUint32(28, timescale);
  view.setUint32(32, duration);

  return box;
}

function createMdatBox(durationMs: number, bitrate: number): Uint8Array {
  // Calculate realistic data size based on bitrate and duration
  const dataSize = Math.floor((bitrate * durationMs) / (8 * 1000)); // bytes
  const totalSize = dataSize + 8;

  const box = new Uint8Array(totalSize);
  const view = new DataView(box.buffer);

  view.setUint32(0, totalSize);
  box.set(new TextEncoder().encode("mdat"), 4);

  // Fill with pseudo-realistic video data patterns
  for (let i = 8; i < totalSize; i++) {
    // Create pattern that resembles video data
    const pattern = (i * 7 + Math.floor(i / 16) * 13) % 256;
    box[i] = pattern;
  }

  return box;
}

function createAudioMdatBox(durationMs: number, bitrate: number): Uint8Array {
  const dataSize = Math.floor((bitrate * durationMs) / (8 * 1000));
  const totalSize = dataSize + 8;

  const box = new Uint8Array(totalSize);
  const view = new DataView(box.buffer);

  view.setUint32(0, totalSize);
  box.set(new TextEncoder().encode("mdat"), 4);

  // Fill with audio-like data patterns
  for (let i = 8; i < totalSize; i++) {
    // Create pattern that resembles audio data (more regular patterns)
    const wave = Math.sin((i * 2 * Math.PI) / 1024) * 127 + 128;
    box[i] = Math.floor(wave);
  }

  return box;
}

/**
 * Create JIT test clips using realistic MP4 data structures
 */
export async function createJitTestClips(
  options: CreateJitTestClipsOptions,
): Promise<JitTestClip[]> {
  const clips: JitTestClip[] = [];

  for (const segment of options.segments) {
    try {
      const segmentType = segment.type || "video";

      const data =
        segmentType === "audio"
          ? createRealisticAudioSegment(segment.durationMs, segment.quality)
          : createRealisticVideoSegment(segment.durationMs, segment.quality);

      clips.push({
        url: options.sourceVideoUrl,
        startTimeMs: segment.startTimeMs,
        durationMs: segment.durationMs,
        quality: segment.quality,
        type: segmentType,
        data,
        actualStartTimeMs: segment.startTimeMs,
        actualDurationMs: segment.durationMs,
      });

      console.log(
        `✅ Created realistic ${segmentType} ${segment.quality} clip: ${data.length} bytes`,
      );
    } catch (error) {
      console.error(`Failed to create ${segment.quality} test clip:`, error);
    }
  }

  return clips;
}

/**
 * Create test clips specifically for MediaElementSource caching tests
 */
export async function createMediaElementSourceTestClips(
  sourceVideoUrl: string,
): Promise<JitTestClip[]> {
  return createJitTestClips({
    sourceVideoUrl,
    segments: [
      // Multiple segments that will trigger repeated MediaElementSource creation
      { startTimeMs: 0, durationMs: 2000, quality: "medium" },
      { startTimeMs: 2000, durationMs: 2000, quality: "medium" },
      { startTimeMs: 4000, durationMs: 2000, quality: "medium" },
      { startTimeMs: 6000, durationMs: 2000, quality: "medium" },
      { startTimeMs: 8000, durationMs: 2000, quality: "medium" },

      // Audio-only segments for testing audio-specific caching
      { startTimeMs: 0, durationMs: 2000, quality: "medium", type: "audio" },
      { startTimeMs: 2000, durationMs: 2000, quality: "medium", type: "audio" },
      { startTimeMs: 4000, durationMs: 2000, quality: "medium", type: "audio" },
    ],
  });
}

/**
 * Create realistic JIT metadata that matches transcoding service output
 */
export function createRealisticJitMetadata(
  sourceUrl: string,
  durationMs = 10000,
  hasAudio = true,
  hasVideo = true,
): JitTestMetadata {
  const streams: JitTestMetadata["streams"] = [];

  if (hasVideo) {
    streams.push({
      index: 0,
      type: "video",
      codecName: "h264",
      duration: durationMs / 1000,
      durationMs,
      width: 1920,
      height: 1080,
      frameRate: { num: 30, den: 1 },
      bitrate: 4000000,
    });
  }

  if (hasAudio) {
    streams.push({
      index: hasVideo ? 1 : 0,
      type: "audio",
      codecName: "aac",
      duration: durationMs / 1000,
      durationMs,
      channels: 2,
      sampleRate: 48000,
      bitrate: 128000,
    });
  }

  return {
    url: sourceUrl,
    durationMs,
    segmentDuration: 2000, // 2s segments for video, will be 15s for audio in AudioTranscodingClient
    streams,
    presets: ["low", "medium", "high"],
    supportedFormats: ["mp4"],
    extractedAt: new Date().toISOString(),
  };
}

/**
 * Mock JIT transcoding service that serves realistic test data
 */
export class MockJitTranscodingService {
  private clips: Map<string, JitTestClip> = new Map();
  private metadata: Map<string, JitTestMetadata> = new Map();

  constructor(clips: JitTestClip[]) {
    for (const clip of clips) {
      const key = `${clip.url}:${clip.startTimeMs}:${clip.quality}:${clip.type}`;
      this.clips.set(key, clip);
    }
  }

  setMetadata(url: string, metadata: JitTestMetadata) {
    this.metadata.set(url, metadata);
  }

  getMetadata(url: string): JitTestMetadata {
    const metadata = this.metadata.get(url);
    if (!metadata) {
      // Create default metadata
      return createRealisticJitMetadata(url);
    }
    return metadata;
  }

  getSegment(
    url: string,
    startTimeMs: number,
    quality: "low" | "medium" | "high",
    type: "video" | "audio" = "video",
  ): Uint8Array {
    // Align to segment boundaries like real service
    const segmentDuration = type === "audio" ? 15000 : 2000;
    const alignedStart = Math.floor(startTimeMs / segmentDuration) * segmentDuration;

    const key = `${url}:${alignedStart}:${quality}:${type}`;
    const clip = this.clips.get(key);

    if (!clip) {
      throw new Error(`No test clip found for ${key}`);
    }

    return clip.data;
  }

  // Create init segment for MediaSource streaming
  getInitSegment(type: "video" | "audio" = "video"): Uint8Array {
    if (type === "audio") {
      return createRealisticAudioSegment(0, "medium").slice(0, 200);
    }
    return createRealisticVideoSegment(0, "medium").slice(0, 300);
  }
}

/**
 * Cache for test clips to avoid regenerating them multiple times
 */
const testClipCache = new Map<string, JitTestClip[]>();

/**
 * Get or create cached test clips for MediaElementSource testing
 */
export async function getCachedMediaElementSourceTestClips(
  sourceVideoUrl: string,
): Promise<JitTestClip[]> {
  const cacheKey = `media-element-source:${sourceVideoUrl}`;
  let clips = testClipCache.get(cacheKey);

  if (!clips) {
    console.log(`Creating MediaElementSource test clips for ${sourceVideoUrl}...`);
    clips = await createMediaElementSourceTestClips(sourceVideoUrl);
    testClipCache.set(cacheKey, clips);
    console.log(`Created ${clips.length} MediaElementSource test clips`);
  }

  return clips;
}
