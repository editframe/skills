import path from "node:path";
import { existsSync } from "node:fs";
import { mkdir, copyFile } from "node:fs/promises";
import { execSync } from "node:child_process";

export interface FrameComparisonResult {
  match: boolean;
  diffPercentage?: number;
  diffCount?: number;
  diffImagePath?: string;
  reason?: string;
}

export interface BaselineComparisonOptions {
  threshold?: number;
  updateBaseline?: boolean;
  framesPerSecond?: number;
}

/**
 * Extract frames from video at specified intervals
 */
export async function extractFrames(
  videoPath: string,
  outputDir: string,
  options: { framesPerSecond?: number } = {},
): Promise<string[]> {
  const fps = options.framesPerSecond ?? 1; // Default: 1 frame per second

  await mkdir(outputDir, { recursive: true });

  // Get video duration
  const durationOutput = execSync(
    `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`,
    { encoding: "utf8" },
  );
  const duration = parseFloat(durationOutput.trim());

  if (isNaN(duration) || duration <= 0) {
    throw new Error(`Could not determine video duration for ${videoPath}`);
  }

  const framePaths: string[] = [];
  const frameCount = Math.floor(duration * fps);

  // Extract frames at specified intervals
  for (let i = 0; i < frameCount; i++) {
    const timestamp = (i + 1) / fps; // Extract at 1s, 2s, 3s...
    const framePath = path.join(
      outputDir,
      `frame-${(i + 1).toString().padStart(3, "0")}.png`,
    );

    execSync(
      `ffmpeg -y -ss ${timestamp} -i "${videoPath}" -vframes 1 "${framePath}"`,
      { stdio: "pipe" },
    );

    if (existsSync(framePath)) {
      framePaths.push(framePath);
    }
  }

  return framePaths;
}

/**
 * Compare two frames using ImageMagick
 */
export async function compareFrames(
  baselineFramePath: string,
  testFramePath: string,
  diffOutputPath: string,
  options: { threshold?: number } = {},
): Promise<FrameComparisonResult> {
  const threshold = options.threshold ?? 0.1; // 10% tolerance by default

  if (!existsSync(baselineFramePath)) {
    return {
      match: false,
      reason: "baseline-frame-missing",
    };
  }

  if (!existsSync(testFramePath)) {
    return {
      match: false,
      reason: "test-frame-missing",
    };
  }

  try {
    // Ensure diff output directory exists
    await mkdir(path.dirname(diffOutputPath), { recursive: true });

    // Use ImageMagick compare
    const command = `compare -metric AE -fuzz ${threshold * 100}% "${baselineFramePath}" "${testFramePath}" "${diffOutputPath}"`;

    execSync(command, { stdio: "pipe" });

    // If we got here without error, images match within threshold
    return {
      match: true,
      diffPercentage: 0,
    };
  } catch (error: any) {
    // ImageMagick exits with non-zero when differences found
    const stderr = error.stderr?.toString() || "";
    const diffCount = parseInt(stderr.trim()) || 0;

    // Calculate percentage based on typical HD frame (2M pixels)
    const typicalPixelCount = 2_000_000;
    const diffPercentage =
      diffCount > 0 ? Math.min(100, (diffCount / typicalPixelCount) * 100) : 0;

    return {
      match: false,
      diffCount,
      diffPercentage,
      diffImagePath: existsSync(diffOutputPath) ? diffOutputPath : undefined,
      reason: `image-diff-${diffPercentage.toFixed(2)}%`,
    };
  }
}

/**
 * Compare video against baseline with automatic baseline management
 */
export async function compareToBaseline(
  videoPath: string,
  testName: string,
  options: BaselineComparisonOptions = {},
): Promise<void> {
  const threshold = options.threshold ?? 0.01; // 1% default
  const updateBaseline = options.updateBaseline ?? false;
  const fps = options.framesPerSecond ?? 1;

  // Setup directories
  const baseDir = path.join(
    process.cwd(),
    "lib/queues/units-of-work/Render/tests/visual/fixtures",
    testName,
  );
  const baselineDir = path.join(baseDir, "baseline");
  const testDir = path.join(baseDir, "test");
  const diffDir = path.join(baseDir, "diffs");

  // Extract test frames
  const testFrames = await extractFrames(videoPath, testDir, { framesPerSecond: fps });

  // If updating baseline, copy test frames to baseline and exit
  if (updateBaseline) {
    await mkdir(baselineDir, { recursive: true });
    for (const testFrame of testFrames) {
      const baselineFrame = path.join(
        baselineDir,
        path.basename(testFrame),
      );
      await copyFile(testFrame, baselineFrame);
    }
    console.log(`✅ Updated baseline for ${testName} (${testFrames.length} frames)`);
    return;
  }

  // Get baseline frames
  const baselineFrames: string[] = [];
  for (let i = 0; i < testFrames.length; i++) {
    const frameNum = (i + 1).toString().padStart(3, "0");
    const baselineFrame = path.join(baselineDir, `frame-${frameNum}.png`);
    
    if (!existsSync(baselineFrame)) {
      throw new Error(
        `Baseline not found for ${testName}. Run with UPDATE_BASELINES=true to create baselines.\n` +
        `Missing: ${baselineFrame}`,
      );
    }
    
    baselineFrames.push(baselineFrame);
  }

  // Compare frames
  const failedFrames: Array<{
    frameIndex: number;
    diffPercentage: number;
    diffImagePath?: string;
  }> = [];

  for (let i = 0; i < testFrames.length; i++) {
    const testFrame = testFrames[i];
    const baselineFrame = baselineFrames[i];

    if (!testFrame || !baselineFrame) continue;

    const diffPath = path.join(
      diffDir,
      `diff-${(i + 1).toString().padStart(3, "0")}.png`,
    );

    const comparison = await compareFrames(
      baselineFrame,
      testFrame,
      diffPath,
      { threshold },
    );

    if (!comparison.match) {
      const diffPercentage = comparison.diffPercentage ?? 100;
      
      // Allow some tolerance for encoding artifacts
      if (diffPercentage > threshold * 100) {
        failedFrames.push({
          frameIndex: i,
          diffPercentage,
          diffImagePath: comparison.diffImagePath,
        });
      }
    }
  }

  // Report results
  if (failedFrames.length > 0) {
    const details = failedFrames
      .map(
        (f) =>
          `  Frame ${f.frameIndex + 1}: ${f.diffPercentage.toFixed(2)}% different${
            f.diffImagePath ? ` (diff: ${f.diffImagePath})` : ""
          }`,
      )
      .join("\n");

    throw new Error(
      `Visual regression detected in ${testName}:\n` +
      `${failedFrames.length}/${testFrames.length} frames exceeded ${threshold * 100}% threshold\n` +
      details +
      `\n\nTo update baselines: UPDATE_BASELINES=true npm test\n` +
      `Artifacts: ${baseDir}`,
    );
  }

  console.log(`✅ Visual regression passed for ${testName} (${testFrames.length} frames)`);
}

/**
 * Extract single frame at specific time
 */
export async function extractFrame(
  videoPath: string,
  timeSeconds: number,
  outputPath: string,
): Promise<string> {
  await mkdir(path.dirname(outputPath), { recursive: true });

  execSync(
    `ffmpeg -y -ss ${timeSeconds} -i "${videoPath}" -vframes 1 "${outputPath}"`,
    { stdio: "pipe" },
  );

  if (!existsSync(outputPath)) {
    throw new Error(`Failed to extract frame at ${timeSeconds}s from ${videoPath}`);
  }

  return outputPath;
}

export interface StrategyComparisonResult {
  strategy1: string;
  strategy2: string;
  frameIndex: number;
  diffPercentage: number;
  diffPixels: number;
  diffImagePath: string;
  passed: boolean;
}

/**
 * Compare frames using odiff (faster, more accurate than ImageMagick)
 */
export async function compareFramesWithOdiff(
  frame1Path: string,
  frame2Path: string,
  diffOutputPath: string,
  options: { threshold?: number } = {},
): Promise<{ passed: boolean; diffPercentage: number; diffPixels: number }> {
  const threshold = options.threshold ?? 0.1; // 10% tolerance by default

  if (!existsSync(frame1Path)) {
    throw new Error(`Frame 1 not found: ${frame1Path}`);
  }

  if (!existsSync(frame2Path)) {
    throw new Error(`Frame 2 not found: ${frame2Path}`);
  }

  await mkdir(path.dirname(diffOutputPath), { recursive: true });

  try {
    // Use odiff for comparison
    // odiff exits with 0 if images match, non-zero if they differ
    const result = execSync(
      `odiff --threshold ${threshold} --diff-image "${diffOutputPath}" "${frame1Path}" "${frame2Path}"`,
      { encoding: "utf8", stdio: "pipe" },
    );

    // Parse odiff output: "Pixel difference: 1234 (0.5%)"
    const match = result.match(/Pixel difference: (\d+) \(([\d.]+)%\)/);
    const diffPixels = match ? parseInt(match[1]) : 0;
    const diffPercentage = match ? parseFloat(match[2]) : 0;

    return {
      passed: true,
      diffPercentage,
      diffPixels,
    };
  } catch (error: any) {
    // odiff exits with non-zero when differences exceed threshold
    const output = error.stdout?.toString() || error.stderr?.toString() || "";
    const match = output.match(/Pixel difference: (\d+) \(([\d.]+)%\)/);
    const diffPixels = match ? parseInt(match[1]) : 0;
    const diffPercentage = match ? parseFloat(match[2]) : 0;

    return {
      passed: false,
      diffPercentage,
      diffPixels,
    };
  }
}

/**
 * Compare render outputs across all strategies for a given test
 */
export async function compareStrategies(
  testOutputDir: string,
  strategies: string[],
  options: { threshold?: number; framesPerSecond?: number } = {},
): Promise<StrategyComparisonResult[]> {
  const threshold = options.threshold ?? 0.1; // 10% default
  const fps = options.framesPerSecond ?? 1;
  const results: StrategyComparisonResult[] = [];

  // Use first strategy as reference
  const referenceStrategy = strategies[0];
  const referenceVideoPath = path.join(testOutputDir, referenceStrategy, "output.mp4");

  if (!existsSync(referenceVideoPath)) {
    throw new Error(`Reference video not found: ${referenceVideoPath}`);
  }

  // Extract frames from reference
  const referenceFramesDir = path.join(testOutputDir, referenceStrategy, "frames");
  const referenceFrames = await extractFrames(referenceVideoPath, referenceFramesDir, { framesPerSecond: fps });

  // Compare each other strategy against reference
  for (let i = 1; i < strategies.length; i++) {
    const compareStrategy = strategies[i];
    const compareVideoPath = path.join(testOutputDir, compareStrategy, "output.mp4");

    if (!existsSync(compareVideoPath)) {
      console.warn(`⚠️  Video not found for ${compareStrategy}: ${compareVideoPath}`);
      continue;
    }

    // Extract frames from comparison video
    const compareFramesDir = path.join(testOutputDir, compareStrategy, "frames");
    const compareFrames = await extractFrames(compareVideoPath, compareFramesDir, { framesPerSecond: fps });

    // Compare frame by frame
    for (let frameIdx = 0; frameIdx < Math.min(referenceFrames.length, compareFrames.length); frameIdx++) {
      const referenceFrame = referenceFrames[frameIdx];
      const compareFrame = compareFrames[frameIdx];

      const diffDir = path.join(testOutputDir, "diffs", `${referenceStrategy}-vs-${compareStrategy}`);
      const diffPath = path.join(diffDir, `frame-${(frameIdx + 1).toString().padStart(3, "0")}.png`);

      const comparison = await compareFramesWithOdiff(
        referenceFrame,
        compareFrame,
        diffPath,
        { threshold },
      );

      results.push({
        strategy1: referenceStrategy,
        strategy2: compareStrategy,
        frameIndex: frameIdx,
        diffPercentage: comparison.diffPercentage,
        diffPixels: comparison.diffPixels,
        diffImagePath: diffPath,
        passed: comparison.passed,
      });
    }
  }

  return results;
}
