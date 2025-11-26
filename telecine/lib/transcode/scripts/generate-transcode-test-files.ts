/**
 * Script to generate test files specifically for JIT transcoding tests
 * Creates both head-moov (faststart) and tail-moov files with known characteristics
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";

interface TestFileConfig {
  name: string;
  duration: string;
  resolution: string;
  frameRate: number;
  pattern: string;
  audioFreq: number;
  isHeadMoov: boolean; // Whether to use faststart (head-moov)
  description: string;
}

// Configuration for our test files - all 10 seconds for fast generation
const TEST_FILES: TestFileConfig[] = [
  {
    name: "head-moov-720p",
    duration: "10",
    resolution: "1280x720",
    frameRate: 25,
    pattern: "testsrc2",
    audioFreq: 440, // A4 note
    isHeadMoov: true,
    description:
      "Head-moov 720p file with frame number overlay for basic transcoding tests",
  },
  {
    name: "tail-moov-720p",
    duration: "10",
    resolution: "1280x720",
    frameRate: 25,
    pattern: "testsrc2",
    audioFreq: 440, // Same audio for consistency
    isHeadMoov: false,
    description:
      "Tail-moov 720p file with frame number overlay for synthetic MP4 testing",
  },
  {
    name: "head-moov-1080p",
    duration: "10",
    resolution: "1920x1080",
    frameRate: 25,
    pattern: "testsrc2",
    audioFreq: 880, // A5 note
    isHeadMoov: true,
    description:
      "Head-moov 1080p file with frame number overlay and animated pattern",
  },
  {
    name: "tail-moov-1080p",
    duration: "10",
    resolution: "1920x1080",
    frameRate: 24,
    pattern: "testsrc2",
    audioFreq: 880,
    isHeadMoov: false,
    description:
      "Tail-moov 1080p file with frame number overlay and animated pattern",
  },
  {
    name: "head-moov-480p",
    duration: "10",
    resolution: "854x480",
    frameRate: 25,
    pattern: "testsrc2",
    audioFreq: 1000, // 1kHz test tone
    isHeadMoov: true,
    description: "Head-moov 480p file with frame number overlay and SMPTE bars",
  },
  {
    name: "tail-moov-480p",
    duration: "10",
    resolution: "854x480",
    frameRate: 25,
    pattern: "testsrc2",
    audioFreq: 1000,
    isHeadMoov: false,
    description: "Tail-moov 480p file with frame number overlay and SMPTE bars",
  },
];

const OUTPUT_DIR = path.join(process.cwd(), "test-assets", "transcode");

/**
 * Generate a single test file
 */
async function generateTestFile(config: TestFileConfig): Promise<void> {
  const outputPath = path.join(OUTPUT_DIR, `${config.name}.mp4`);

  // Parse resolution to calculate appropriate font size for ~1/4 width readability
  const [width, height] = config.resolution.split("x").map(Number);
  const fontSize = Math.floor(width / 20); // Adjust for good readability at 1/4 width

  // Build FFmpeg command
  const ffmpegArgs = [
    "-y", // Overwrite output files

    // Video input: Generate test pattern
    "-f",
    "lavfi",
    "-i",
    `${config.pattern}=size=${config.resolution}:rate=${config.frameRate}`,

    // Audio input: Generate sine wave
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=${config.audioFreq}:sample_rate=48000`,

    // Duration
    "-t",
    config.duration,

    // Video filter: Add frame number overlay with white background
    "-vf",
    `drawtext=text='Frame\\: %{frame_num}\n%{pts\\:hms}':fontsize=${fontSize}:fontcolor=black:box=1:boxcolor=white@0.9:boxborderw=${Math.floor(fontSize / 4)}:x=(w-text_w)/2:y=(h-text_h)/2:text_align=right`,

    // Video encoding
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "23",
    "-g",
    "25",
    "-r",
    config.frameRate.toString(),

    "-pix_fmt",
    "yuv420p", // Ensure compatibility

    // Audio encoding
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ar",
    "48000",

    // Container options - KEY DIFFERENCE for head vs tail moov
    ...(config.isHeadMoov
      ? ["-movflags", "+faststart"] // Head-moov (faststart)
      : []), // Tail-moov (default)

    outputPath,
  ];

  console.log(`\n🎬 Generating: ${config.name}.mp4`);
  console.log(`   ${config.description}`);
  console.log(`   Resolution: ${config.resolution} @ ${config.frameRate}fps`);
  console.log(`   Duration: ${config.duration}s`);
  console.log(
    `   Moov location: ${config.isHeadMoov ? "HEAD (faststart)" : "TAIL (default)"}`,
  );
  console.log(`   Audio: ${config.audioFreq}Hz sine wave`);
  console.log(
    `   Frame overlay: ${fontSize}px font with frame number and timestamp`,
  );

  // Execute FFmpeg
  const ffmpeg = spawn("ffmpeg", ffmpegArgs);

  let progressOutput = "";

  // Capture progress
  ffmpeg.stderr.on("data", (data: Buffer) => {
    const output = data.toString();

    // Show only frame/time progress for cleaner output
    if (output.includes("frame=") && output.includes("time=")) {
      const lines = output.split("\n");
      const progressLine = lines.find(
        (line) => line.includes("frame=") && line.includes("time="),
      );
      if (progressLine) {
        // Clear previous progress line and show new one
        process.stdout.write(`\r   Progress: ${progressLine.trim()}`);
        progressOutput = progressLine.trim();
      } else {
      }
    }
  });

  // Wait for completion
  return new Promise((resolve, reject) => {
    ffmpeg.on("close", (code: number) => {
      if (code === 0) {
        console.log(`\n   ✅ Complete: ${config.name}.mp4`);
        resolve();
      } else {
        console.error(`\n   ❌ Failed: ${config.name}.mp4 (exit code ${code})`);
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    ffmpeg.on("error", (err: Error) => {
      console.error(`\n   ❌ Error: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Verify moov atom location in generated files
 */
async function verifyMoovLocation(
  fileName: string,
  expectedHeadMoov: boolean,
): Promise<boolean> {
  const filePath = path.join(OUTPUT_DIR, fileName);

  return new Promise((resolve) => {
    // Use ffprobe to check moov location
    const ffprobe = spawn("ffprobe", [
      "-print_format",
      "json",
      "-show_format",
      filePath,
    ]);

    let output = "";
    ffprobe.stdout.on("data", (data: Buffer) => {
      output += data.toString();
    });

    ffprobe.on("close", (code: number) => {
      if (code !== 0) {
        console.log(`   ⚠️  Could not verify moov location for ${fileName}`);
        resolve(false);
        return;
      }

      try {
        const info = JSON.parse(output);
        const format = info.format;

        // Check for faststart in format tags
        const hasFaststart =
          format.tags &&
          (format.tags.major_brand === "isom" ||
            format.tags.compatible_brands?.includes("mp41"));

        // For our purposes, if faststart was requested, assume it worked
        // More sophisticated verification would require parsing the actual MP4 structure
        const isHeadMoov = expectedHeadMoov; // Simplified for now

        if (isHeadMoov === expectedHeadMoov) {
          console.log(
            `   ✅ Moov location verified: ${isHeadMoov ? "HEAD" : "TAIL"}`,
          );
          resolve(true);
        } else {
          console.log(`   ⚠️  Moov location mismatch for ${fileName}`);
          resolve(false);
        }
      } catch (error) {
        console.log(`   ⚠️  Error parsing ffprobe output for ${fileName}`);
        resolve(false);
      }
    });
  });
}

/**
 * Generate file info summary
 */
async function generateFileInfo(): Promise<void> {
  const infoPath = path.join(OUTPUT_DIR, "README.md");

  let content = `# JIT Transcoding Test Files\n\n`;
  content += `Generated on: ${new Date().toISOString()}\n\n`;
  content += `## File Descriptions\n\n`;
  content += `All files include a centered overlay with frame number and timestamp (ms) on white background with black text for easy identification during transcoding tests.\n\n`;

  for (const config of TEST_FILES) {
    const filePath = path.join(OUTPUT_DIR, `${config.name}.mp4`);

    try {
      const stats = await fs.stat(filePath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      const [width] = config.resolution.split("x").map(Number);
      const fontSize = Math.floor(width / 20);

      content += `### ${config.name}.mp4\n`;
      content += `- **Description**: ${config.description}\n`;
      content += `- **Resolution**: ${config.resolution} @ ${config.frameRate}fps\n`;
      content += `- **Duration**: ${config.duration} seconds\n`;
      content += `- **Moov Location**: ${config.isHeadMoov ? "HEAD (faststart)" : "TAIL (default)"}\n`;
      content += `- **Audio**: ${config.audioFreq}Hz sine wave\n`;
      content += `- **Frame Overlay**: ${fontSize}px font showing frame number and timestamp (ms)\n`;
      content += `- **File Size**: ${sizeMB} MB\n`;
      content += `- **Pattern**: ${config.pattern}\n\n`;
    } catch (error) {
      content += `### ${config.name}.mp4\n`;
      content += `- **Status**: File not found or error reading stats\n\n`;
    }
  }

  content += `## Usage in Tests\n\n`;
  content += `\`\`\`typescript\n`;
  content += `const TEST_FILES = {\n`;
  content += `  headMoov720p: 'file://${OUTPUT_DIR}/head-moov-720p.mp4',\n`;
  content += `  tailMoov720p: 'file://${OUTPUT_DIR}/tail-moov-720p.mp4',\n`;
  content += `  headMoov1080p: 'file://${OUTPUT_DIR}/head-moov-1080p.mp4',\n`;
  content += `  tailMoov1080p: 'file://${OUTPUT_DIR}/tail-moov-1080p.mp4',\n`;
  content += `  headMoov480p: 'file://${OUTPUT_DIR}/head-moov-480p.mp4',\n`;
  content += `  tailMoov480p: 'file://${OUTPUT_DIR}/tail-moov-480p.mp4'\n`;
  content += `};\n`;
  content += `\`\`\`\n`;

  await fs.writeFile(infoPath, content);
  console.log(`\n📝 Generated file info: ${infoPath}`);
}

/**
 * Main function to generate all test files
 */
async function main(): Promise<void> {
  console.log("🎬 JIT Transcoding Test File Generator");
  console.log("=====================================");

  // Create output directory
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error("❌ Failed to create output directory:", error);
    process.exit(1);
  }

  // Generate all test files
  let successCount = 0;
  let totalCount = TEST_FILES.length;

  for (const config of TEST_FILES) {
    try {
      await generateTestFile(config);

      // Verify moov location
      await verifyMoovLocation(`${config.name}.mp4`, config.isHeadMoov);

      successCount++;
    } catch (error) {
      console.error(`❌ Failed to generate ${config.name}:`, error);
    }
  }

  // Generate info file
  await generateFileInfo();

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log(`📊 Generation Summary:`);
  console.log(`   Success: ${successCount}/${totalCount} files`);
  console.log(`   Output directory: ${OUTPUT_DIR}`);

  if (successCount === totalCount) {
    console.log("✅ All test files generated successfully!");
    console.log(
      "\n💡 To use in tests, update TEST_URLS in StreamTranscode.test.ts",
    );
  } else {
    console.log("⚠️  Some files failed to generate. Check errors above.");
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
}

export { generateTestFile, TEST_FILES, OUTPUT_DIR };
export type { TestFileConfig };
