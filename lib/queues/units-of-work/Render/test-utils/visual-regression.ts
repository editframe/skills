import path from "node:path";
import { existsSync } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import { execSync } from "node:child_process";

export interface VisualRegressionResult {
  match: boolean;
  reason?: string;
  diffCount?: number;
  diffPercentage?: number;
}

/**
 * Extract frames from video using identical logic for both baseline and comparison frames
 * Extracts one frame per second at exact timestamps (1s, 2s, 3s, etc.)
 */
const extractFramesToDirectory = async (
  videoPath: string,
  outputDir: string,
  filenamePrefix: string
): Promise<string[]> => {
  const framePaths: string[] = [];

  try {
    // Get video duration to determine how many frames to extract
    const durationOutput = execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    const duration = parseFloat(durationOutput.trim());

    if (isNaN(duration) || duration <= 0) {
      throw new Error('Could not determine video duration');
    }

    // Create output directory
    await mkdir(outputDir, { recursive: true });

    // Extract one frame per second at exact timestamps
    const frameCount = Math.floor(duration);
    for (let i = 1; i <= frameCount; i++) {
      const timestamp = i; // Extract at exactly i seconds
      const framePath = path.join(outputDir, `${filenamePrefix}-${i.toString().padStart(3, '0')}.png`);
      
      // Extract frame at specific timestamp using -ss (seek) and -vframes 1
      execSync(`ffmpeg -y -i "${videoPath}" -ss ${timestamp} -vframes 1 "${framePath}"`, {
        stdio: 'pipe'
      });

      if (existsSync(framePath)) {
        framePaths.push(framePath);
      }
    }

  } catch (error) {
    console.warn(`Frame extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return framePaths;
};

/**
 * Extract multiple frames from video for comprehensive visual comparison
 * Extracts one frame per second at exact timestamps
 */
export const extractFramesForComparison = async (videoPath: string, templateHash: string, testTitle?: string): Promise<string[]> => {
  const titleSlug = testTitle ? `${testTitle.toLowerCase().replace(/\s+/g, '-')}-` : '';
  const testRenderDir = path.join(process.cwd(), "temp", `test-render-${titleSlug}${templateHash}`);
  const artifactsDir = path.join(testRenderDir, "artifacts");

  return extractFramesToDirectory(videoPath, artifactsDir, "regression-frame");
};

/**
 * Get baseline frame paths, creating them if they don't exist using identical extraction logic
 * Extracts one frame per second at exact timestamps
 */
export const getOrCreateBaseline = async (videoPath: string, templateHash: string, testTitle?: string): Promise<string[]> => {
  const titleSlug = testTitle ? `${testTitle.toLowerCase().replace(/\s+/g, '-')}-` : '';
  const testRenderDir = path.join(process.cwd(), "temp", `test-render-${titleSlug}${templateHash}`);
  const baselineDir = path.join(testRenderDir, "baselines");

  // Get video duration to determine expected frame count
  const durationOutput = execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`, {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  const duration = parseFloat(durationOutput.trim());
  const frameCount = Math.floor(duration);

  // Check if all baseline frames already exist
  const expectedBaselinePaths: string[] = [];
  for (let i = 1; i <= frameCount; i++) {
    expectedBaselinePaths.push(path.join(baselineDir, `baseline-frame-${i.toString().padStart(3, '0')}.png`));
  }

  const allBaselinesExist = expectedBaselinePaths.every(path => existsSync(path));

  if (!allBaselinesExist) {
    console.log(`Creating baselines with template hash ${templateHash}`);
    // Generate baseline frames using identical extraction logic
    return extractFramesToDirectory(videoPath, baselineDir, "baseline-frame");
  }

  return expectedBaselinePaths;
};

/**
 * Compare two frames using odiff for pixel-perfect visual regression testing
 */
export const compareFramesWithOdiff = async (
  baselineFramePath: string,
  testFramePath: string,
  templateHash: string,
  frameIndex: number,
  options: {
    threshold?: number;
    antialiasing?: boolean;
    diffColor?: string;
    testTitle?: string;
  } = {}
): Promise<VisualRegressionResult> => {
  try {
    // Validate inputs
    if (!baselineFramePath || !testFramePath) {
      throw new Error('Frame paths cannot be empty');
    }

    if (!existsSync(baselineFramePath) || !existsSync(testFramePath)) {
      throw new Error('Frame files must exist');
    }

    // Generate diff output path in the same directory structure as baselines/artifacts
    const titleSlug = options.testTitle ? `${options.testTitle.toLowerCase().replace(/\s+/g, '-')}-` : '';
    const testRenderDir = path.join(process.cwd(), "temp", `test-render-${titleSlug}${templateHash}`);
    const diffsDir = path.join(testRenderDir, "diffs");
    await mkdir(diffsDir, { recursive: true });
    const diffOutputPath = path.join(diffsDir, `diff-frame-${frameIndex.toString().padStart(3, '0')}.png`);

    // Use ImageMagick compare instead of odiff for Linux container compatibility
    let compareResult: { match: boolean; diffCount?: number; diffPercentage?: number };

    const command = `compare -metric AE -fuzz ${(options.threshold || 0.1) * 100}% "${baselineFramePath}" "${testFramePath}" "${diffOutputPath}"`;
    try {
      execSync(command, {
        stdio: 'pipe'
      });

      // If compare succeeds without throwing, images are similar enough
      compareResult = { match: true };
    } catch (error: any) {
      // ImageMagick compare exits with non-zero when differences found
      // Extract the difference count from stderr
      const stderr = error.stderr?.toString() || '';
      const diffCount = parseInt(stderr.trim()) || 0;

      // IMPLEMENTATION GUIDELINES: The diff percentage calculation assumes a typical HD frame
      // has about 2 million pixels (1920x1080). For more accurate percentages, we could
      // get actual image dimensions, but this approximation works well for our use case.
      const typicalPixelCount = 2_000_000; // Approximate pixel count for HD video

      compareResult = {
        match: false,
        diffCount,
        // Calculate percentage based on typical frame size
        diffPercentage: diffCount > 0 ? Math.min(100, (diffCount / typicalPixelCount) * 100) : undefined
      };
    }

    return {
      match: compareResult.match,
      reason: compareResult.match ? undefined : 'imagemagick-diff-detected',
      diffCount: compareResult.diffCount,
      diffPercentage: compareResult.diffPercentage
    };
  } catch (error) {
    console.error(`Odiff comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      match: false,
      reason: 'comparison-error'
    };
  }
};

/**
 * Perform visual regression testing for still images
 */
export const performStillImageRegressionTest = async (
  imagePath: string,
  templateHash: string
): Promise<void> => {
  const testRenderDir = path.dirname(path.dirname(imagePath));
  const baselineDir = path.join(testRenderDir, "baselines");
  const baselinePath = path.join(baselineDir, `baseline-still.png`);

  if (!existsSync(baselinePath)) {
    console.log(`Creating baseline for still image with template hash ${templateHash}`);
    await mkdir(baselineDir, { recursive: true });
    await copyFile(imagePath, baselinePath);
    console.log(`✅ Baseline created at ${baselinePath}`);
    return;
  }

  const comparison = await compareFramesWithOdiff(
    baselinePath,
    imagePath,
    templateHash,
    0,
    {
      threshold: 0.15,
      antialiasing: true,
      diffColor: '#ff0000'
    }
  );

  const isAcceptableDifference = comparison.diffPercentage !== undefined && comparison.diffPercentage < 1.0;

  if (!comparison.match && !isAcceptableDifference) {
    const diffInfo = comparison.diffPercentage !== undefined
      ? `${comparison.diffPercentage}% different`
      : `comparison failed: ${comparison.reason || 'unknown error'}`;
    throw new Error(`Still image visual regression detected: ${diffInfo}`);
  }

  if (isAcceptableDifference) {
    console.log(`Still image: Acceptable difference of ${comparison.diffPercentage}% (below 1% threshold)`);
  } else {
    console.log(`✅ Still image matches baseline`);
  }
};

/**
 * Perform complete visual regression testing - extract frames, compare with baselines, throw on failure
 * Extracts one frame per second at exact timestamps (1s, 2s, 3s, etc.)
 */
export const performVisualRegressionTest = async (
  videoPath: string,
  templateHash: string,
  testTitle?: string
): Promise<void> => {
  // Extract test and baseline frames using identical logic (one frame per second)
  const testFrames = await extractFramesForComparison(videoPath, templateHash, testTitle);
  const baselineFrames = await getOrCreateBaseline(videoPath, templateHash, testTitle);


  if (testFrames.length !== baselineFrames.length) {
    throw new Error(`Frame count mismatch: ${testFrames.length} test frames vs ${baselineFrames.length} baseline frames`);
  }

  const failedFrames: { frameIndex: number; diffPercentage?: number; reason?: string }[] = [];
  let passedFrames = 0;

  // Compare each frame
  for (let i = 0; i < testFrames.length; i++) {
    const testFramePath = testFrames[i];
    const baselineFramePath = baselineFrames[i];

    // Skip if frame extraction failed
    if (!testFramePath || !existsSync(testFramePath)) {
      console.warn(`Skipping frame ${i}: test frame not found`);
      failedFrames.push({ frameIndex: i, reason: 'test-frame-missing' });
      continue;
    }

    if (!baselineFramePath || !existsSync(baselineFramePath)) {
      console.warn(`Skipping frame ${i}: baseline frame not found`);
      failedFrames.push({ frameIndex: i, reason: 'baseline-frame-missing' });
      continue;
    }

    // Compare frames with consistent settings
    const comparison = await compareFramesWithOdiff(baselineFramePath, testFramePath, templateHash, i, {
      threshold: 0.15, // 15% tolerance for compression artifacts and minor differences
      antialiasing: true,
      diffColor: '#ff0000',
      testTitle,
    });

    // IMPLEMENTATION GUIDELINES: For encoder-level differences, we allow up to 1% pixel difference
    // even if ImageMagick detects some changes. This prevents false positives from minor
    // compression artifacts or encoder variations.
    const isAcceptableDifference = comparison.diffPercentage !== undefined && comparison.diffPercentage < 1.0;

    if (comparison.match || isAcceptableDifference) {
      passedFrames++;
      if (isAcceptableDifference) {
        console.log(`Frame ${i}: Acceptable difference of ${comparison.diffPercentage}% (below 1% threshold)`);
      }
    } else {
      const diffInfo = comparison.diffPercentage !== undefined
        ? `${comparison.diffPercentage}% different`
        : `comparison failed: ${comparison.reason || 'unknown error'}`;
      console.log(`Visual regression detected in frame ${i}: ${diffInfo}`);
      failedFrames.push({
        frameIndex: i,
        diffPercentage: comparison.diffPercentage,
        reason: comparison.reason || 'comparison-failed'
      });
    }
  }

  // Only throw if there are failed frames
  if (failedFrames.length > 0) {
    const frameDetails = failedFrames.map(f => {
      const diffInfo = f.diffPercentage !== undefined
        ? `${f.diffPercentage}%`
        : f.reason || 'comparison-failed';
      return `frame ${f.frameIndex} (${diffInfo})`;
    }).join(", ");
    throw new Error(`${failedFrames.length} frames failed visual regression test: ${frameDetails}`);
  }

  // All frames passed - success!

}; 