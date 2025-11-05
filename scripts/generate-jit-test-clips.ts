/**
 * Script to generate JIT transcoded test clips for browser testing
 * Creates pre-transcoded segments that can be served by MSW during tests
 */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { transcodeVideoSegment } from "../../transcode/src/jit/JitTranscoder.js";

interface JitTestSegment {
  startTimeMs: number;
  durationMs: number;
  quality: "low" | "medium" | "high";
  filename: string;
}

const QUALITY_PRESETS = {
  low: {
    width: 480,
    height: 270,
    videoBitrate: 400000,
    audioBitrate: 64000,
    audioChannels: 2,
    audioSampleRate: 48000,
  },
  medium: {
    width: 854,
    height: 480,
    videoBitrate: 1000000,
    audioBitrate: 128000,
    audioChannels: 2,
    audioSampleRate: 48000,
  },
  high: {
    width: 1280,
    height: 720,
    videoBitrate: 2500000,
    audioBitrate: 192000,
    audioChannels: 2,
    audioSampleRate: 48000,
  },
};

const TEST_SEGMENTS: JitTestSegment[] = [
  // Basic 2-second segments for different qualities
  {
    startTimeMs: 0,
    durationMs: 2000,
    quality: "low",
    filename: "segment-0ms-2s-low.mp4",
  },
  {
    startTimeMs: 0,
    durationMs: 2000,
    quality: "medium",
    filename: "segment-0ms-2s-medium.mp4",
  },
  {
    startTimeMs: 0,
    durationMs: 2000,
    quality: "high",
    filename: "segment-0ms-2s-high.mp4",
  },

  // Sequential segments for testing playback
  {
    startTimeMs: 2000,
    durationMs: 2000,
    quality: "medium",
    filename: "segment-2000ms-2s-medium.mp4",
  },
  {
    startTimeMs: 4000,
    durationMs: 2000,
    quality: "medium",
    filename: "segment-4000ms-2s-medium.mp4",
  },

  // Different durations for edge case testing
  {
    startTimeMs: 0,
    durationMs: 4000,
    quality: "medium",
    filename: "segment-0ms-4s-medium.mp4",
  },
  {
    startTimeMs: 6000,
    durationMs: 1000,
    quality: "low",
    filename: "segment-6000ms-1s-low.mp4",
  },
];

const OUTPUT_DIR = path.join(process.cwd(), "test-assets", "jit-segments");
const SOURCE_VIDEO_DIR = path.join(
  process.cwd(),
  "../../lib/transcode/test-assets/transcode",
);

/**
 * Generate a test source video if it doesn't exist
 */
async function generateSourceVideo(): Promise<string> {
  const sourceVideoPath = path.join(SOURCE_VIDEO_DIR, "test-source-10s.mp4");

  try {
    await fs.access(sourceVideoPath);
    console.log(`✅ Using existing source video: ${sourceVideoPath}`);
    return sourceVideoPath;
  } catch {
    console.log(`📹 Generating test source video: ${sourceVideoPath}`);

    // Create source directory
    await fs.mkdir(SOURCE_VIDEO_DIR, { recursive: true });

    // Generate 10-second test video with frame numbers
    const ffmpegArgs = [
      "-y", // Overwrite
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=1920x1080:rate=25", // HD test pattern
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:sample_rate=48000", // Audio
      "-t",
      "10", // 10 seconds
      "-vf",
      "drawtext=text='Frame\\: %{frame_num}\\nTime\\: %{pts\\:hms}':fontsize=48:fontcolor=white:box=1:boxcolor=black@0.8:x=(w-text_w)/2:y=(h-text_h)/2",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "23",
      "-g",
      "25", // GOP size
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart", // Head-moov for better streaming
      sourceVideoPath,
    ];

    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", ffmpegArgs);

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          console.log(`✅ Generated source video: ${sourceVideoPath}`);
          resolve();
        } else {
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });

      ffmpeg.on("error", reject);
    });

    return sourceVideoPath;
  }
}

/**
 * Generate a single JIT transcoded segment
 */
async function generateSegment(
  sourceVideoPath: string,
  segment: JitTestSegment,
): Promise<void> {
  const outputPath = path.join(OUTPUT_DIR, segment.filename);
  const preset = QUALITY_PRESETS[segment.quality];

  console.log(`🎬 Generating: ${segment.filename}`);
  console.log(`   Source: ${sourceVideoPath}`);
  console.log(
    `   Time: ${segment.startTimeMs}ms - ${segment.startTimeMs + segment.durationMs}ms`,
  );
  console.log(
    `   Quality: ${segment.quality} (${preset.width}x${preset.height})`,
  );

  try {
    const result = await transcodeVideoSegment({
      url: sourceVideoPath,
      startTimeMs: segment.startTimeMs,
      durationMs: segment.durationMs,
      targetWidth: preset.width,
      targetHeight: preset.height,
      videoBitrate: preset.videoBitrate,
      audioCodec: "aac",
      audioBitrate: preset.audioBitrate,
      audioChannels: preset.audioChannels,
      audioSampleRate: preset.audioSampleRate,
    });

    if (!result.success) {
      throw new Error(`Transcoding failed: ${result.error}`);
    }

    await fs.writeFile(outputPath, result.outputData);

    const sizeMB = (result.outputData.length / (1024 * 1024)).toFixed(2);
    console.log(`   ✅ Generated: ${sizeMB}MB`);
  } catch (error) {
    console.error(
      `   ❌ Failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * Generate index file for test segments
 */
async function generateIndex(): Promise<void> {
  const indexData = {
    generated: new Date().toISOString(),
    sourceVideo: "test-source-10s.mp4",
    segments: TEST_SEGMENTS.map((segment) => ({
      ...segment,
      path: `jit-segments/${segment.filename}`,
      cacheKey: `test-source:${segment.startTimeMs}:${segment.quality}`,
    })),
    qualities: QUALITY_PRESETS,
  };

  const indexPath = path.join(OUTPUT_DIR, "index.json");
  await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));

  console.log(`📝 Generated index: ${indexPath}`);
}

/**
 * Generate TypeScript definitions for tests
 */
async function generateTestConstants(): Promise<void> {
  const tsContent = `/**
 * Generated JIT test clip constants
 * Auto-generated by scripts/generate-jit-test-clips.ts
 */

export const JIT_TEST_CLIPS = {
  sourceVideo: 'test-source-10s.mp4',
  baseUrl: 'file://${OUTPUT_DIR}',
  segments: {
${TEST_SEGMENTS.map(
  (segment) =>
    `    '${segment.filename.replace(".mp4", "")}': {
      startTimeMs: ${segment.startTimeMs},
      durationMs: ${segment.durationMs}, 
      quality: '${segment.quality}' as const,
      filename: '${segment.filename}',
      cacheKey: 'test-source:${segment.startTimeMs}:${segment.quality}'
    }`,
).join(",\n")}
  }
} as const;

export type JitTestClipKey = keyof typeof JIT_TEST_CLIPS.segments;
`;

  const tsPath = path.join(OUTPUT_DIR, "../jit-test-constants.ts");
  await fs.writeFile(tsPath, tsContent);

  console.log(`📝 Generated TypeScript constants: ${tsPath}`);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log("🎬 JIT Test Clips Generator");
  console.log("===========================");

  // Create output directory
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);

  // Generate or use existing source video
  const sourceVideoPath = await generateSourceVideo();

  // Generate all segments
  let successCount = 0;
  for (const segment of TEST_SEGMENTS) {
    try {
      await generateSegment(sourceVideoPath, segment);
      successCount++;
    } catch (error) {
      console.error(`Failed to generate ${segment.filename}:`, error);
    }
  }

  // Generate index and constants
  await generateIndex();
  await generateTestConstants();

  // Summary
  console.log(`\n${"=".repeat(50)}`);
  console.log("📊 Generation Summary:");
  console.log(`   Success: ${successCount}/${TEST_SEGMENTS.length} segments`);
  console.log(`   Output directory: ${OUTPUT_DIR}`);

  if (successCount === TEST_SEGMENTS.length) {
    console.log("✅ All JIT test clips generated successfully!");
  } else {
    console.log("⚠️  Some clips failed to generate. Check errors above.");
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
}

export { generateSegment, TEST_SEGMENTS, OUTPUT_DIR };
export type { JitTestSegment };
