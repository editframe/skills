import path from "node:path";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { execSync } from "node:child_process";

export interface BoundaryDiscontinuityResult {
  boundaryIndex: number;
  timeSeconds: number;
  hasDiscontinuity: boolean;
  energyGap?: number;
  sampleCountDiscrepancy?: number;
  sampleJumpMagnitude?: number;
  sampleJumpLocation?: number;
  reason?: string;
}

export interface EnergyAnalysis {
  rmsEnergy: number;
  peakAmplitude: number;
  sampleCount: number;
  energyVariance: number; // How much energy varies within the window
}

/**
 * Generate sine wave visualization PNG for visual regression testing
 */
const generateSineWavePNG = async (
  videoPath: string,
  templateHash: string,
  width: number = 5000,
  height: number = 400
): Promise<string> => {
  const testRenderDir = path.join(process.cwd(), "temp", `test-render-${templateHash}`);
  const audioVisualsDir = path.join(testRenderDir, "audio-visuals");
  await mkdir(audioVisualsDir, { recursive: true });

  const outputPath = path.join(audioVisualsDir, "sinewave-regression.png");

  // Generate complete waveform visualization (filmstrip-style like Audacity)
  // Using showwavespic to create a single image of the entire audio file
  execSync(`ffmpeg -y -i "${videoPath}" \
    -filter_complex "showwavespic=s=${width}x${height}" \
    -vframes 1 "${outputPath}"`, {
    stdio: 'pipe'
  });

  if (!existsSync(outputPath)) {
    throw new Error(`Failed to generate sine wave PNG at ${outputPath}`);
  }

  return outputPath;
};

/**
 * Get or create baseline sine wave PNG
 */
export const getOrCreateSineWaveBaseline = async (
  videoPath: string,
  templateHash: string
): Promise<string> => {
  const testRenderDir = path.join(process.cwd(), "temp", `test-render-${templateHash}`);
  const baselineDir = path.join(testRenderDir, "audio-baselines");
  const baselinePath = path.join(baselineDir, "baseline-sinewave.png");

  if (!existsSync(baselinePath)) {
    console.log(`Creating sine wave baseline with template hash ${templateHash}`);
    await mkdir(baselineDir, { recursive: true });

    // Generate baseline using same logic
    const tempPath = await generateSineWavePNG(videoPath, templateHash);

    // Copy to baseline location
    execSync(`cp "${tempPath}" "${baselinePath}"`, { stdio: 'pipe' });
  }

  return baselinePath;
};

/**
 * Extract raw PCM audio samples around a specific time point
 */
export const extractAudioSamplesAtTime = async (
  videoPath: string,
  timeSeconds: number,
  durationSeconds: number,
  templateHash: string
): Promise<Float32Array> => {
  const testRenderDir = path.join(process.cwd(), "temp", `test-render-${templateHash}`);
  const tempDir = path.join(testRenderDir, "temp-audio");
  await mkdir(tempDir, { recursive: true });

  const outputPath = path.join(tempDir, `samples-${timeSeconds.toFixed(3)}.raw`);

  // Extract raw 32-bit float PCM samples
  execSync(`ffmpeg -y -ss ${timeSeconds} -t ${durationSeconds} -i "${videoPath}" \
    -f f32le -acodec pcm_f32le -ar 48000 -ac 1 "${outputPath}"`, {
    stdio: 'pipe'
  });

  if (!existsSync(outputPath)) {
    throw new Error(`Failed to extract audio samples at ${timeSeconds}s`);
  }

  const buffer = await readFile(outputPath);
  if (!buffer || !buffer.buffer) {
    throw new Error(`Failed to read audio sample buffer from ${outputPath}`);
  }
  return new Float32Array(buffer.buffer);
};

/**
 * Analyze energy characteristics in a sample buffer for boundary discontinuity detection
 */
export const analyzeEnergyWindow = (samples: Float32Array): EnergyAnalysis => {
  if (!samples || samples.length === 0) {
    return { rmsEnergy: 0, peakAmplitude: 0, sampleCount: 0, energyVariance: 0 };
  }

  // Calculate RMS energy
  const sumSquares = samples.reduce((sum, sample) => sum + sample * sample, 0);
  const rmsEnergy = Math.sqrt(sumSquares / samples.length);

  // Find peak amplitude
  const peakAmplitude = Math.max(...samples.map(Math.abs));

  // Calculate energy variance by analyzing energy in smaller sub-windows
  const windowSize = Math.max(64, Math.floor(samples.length / 8)); // 8 sub-windows
  const subWindowEnergies: number[] = [];

  for (let i = 0; i < samples.length - windowSize; i += windowSize) {
    const subWindow = samples.slice(i, i + windowSize);
    const subWindowSumSquares = subWindow.reduce((sum, sample) => sum + sample * sample, 0);
    const subWindowRMS = Math.sqrt(subWindowSumSquares / subWindow.length);
    subWindowEnergies.push(subWindowRMS);
  }

  // Calculate variance in energy across sub-windows
  const meanEnergy = subWindowEnergies.reduce((sum, energy) => sum + energy, 0) / subWindowEnergies.length;
  const energyVariance = subWindowEnergies.reduce((sum, energy) => sum + Math.pow(energy - meanEnergy, 2), 0) / subWindowEnergies.length;

  return {
    rmsEnergy,
    peakAmplitude,
    sampleCount: samples.length,
    energyVariance
  };
};

/**
 * Analyze sample-to-sample continuity across a longer audio window to detect discontinuities
 * This is more sensitive to 1-2 sample packet issues than energy analysis
 */
export const analyzeSampleContinuity = (
  samples: Float32Array,
  sampleRate: number,
  expectedCenterTime: number
): { hasDiscontinuity: boolean; sampleJumpMagnitude?: number; sampleJumpLocation?: number; reason?: string } => {
  if (!samples || samples.length === 0) {
    return { hasDiscontinuity: false, reason: 'no-samples' };
  }

  // Calculate sample-to-sample differences (derivative)
  const sampleDiffs: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    sampleDiffs.push(samples[i] - samples[i - 1]);
  }

  // For a smooth sine wave, sample-to-sample differences should be relatively smooth
  // Calculate the second derivative to find abrupt changes in slope
  const secondDiffs: number[] = [];
  for (let i = 1; i < sampleDiffs.length; i++) {
    secondDiffs.push(Math.abs(sampleDiffs[i] - sampleDiffs[i - 1]));
  }

  // Find the maximum second derivative (biggest slope change)
  let maxSecondDiff = 0;
  let maxSecondDiffIndex = -1;

  for (let i = 0; i < secondDiffs.length; i++) {
    if (secondDiffs[i] > maxSecondDiff) {
      maxSecondDiff = secondDiffs[i];
      maxSecondDiffIndex = i;
    }
  }

  // Calculate the typical second derivative (background noise level)
  const sortedSecondDiffs = [...secondDiffs].sort((a, b) => a - b);
  const medianSecondDiff = sortedSecondDiffs[Math.floor(sortedSecondDiffs.length / 2)];
  const p90SecondDiff = sortedSecondDiffs[Math.floor(sortedSecondDiffs.length * 0.9)];

  // A discontinuity would show up as a second derivative much larger than typical
  const discontinuityThreshold = Math.max(medianSecondDiff * 10, p90SecondDiff * 3);

  if (maxSecondDiff > discontinuityThreshold && maxSecondDiff > 0.001) {
    // Calculate the time location of the discontinuity
    const sampleIndexOfJump = maxSecondDiffIndex + 2; // Account for derivative offsets
    const timeOffsetSeconds = sampleIndexOfJump / sampleRate;
    const jumpTime = expectedCenterTime - 0.25 + timeOffsetSeconds; // Convert to absolute time

    return {
      hasDiscontinuity: true,
      sampleJumpMagnitude: maxSecondDiff,
      sampleJumpLocation: jumpTime,
      reason: `sample-jump-${maxSecondDiff.toFixed(4)}-at-${jumpTime.toFixed(3)}s`
    };
  }

  return { hasDiscontinuity: false };
};

/**
 * Detect energy gaps or discontinuities between two audio segments
 * This detects missing samples (gaps) or extra samples (overlaps) at segment boundaries
 */
export const detectEnergyGap = (
  preAnalysis: EnergyAnalysis,
  postAnalysis: EnergyAnalysis,
  tolerances: {
    energyDropThreshold: number; // Percentage drop that indicates missing samples
    energySpikeThreshold: number; // Percentage spike that indicates overlap
    minimumEnergyLevel: number; // Minimum energy to consider valid audio
  }
): { hasDiscontinuity: boolean; energyGap?: number; sampleCountDiscrepancy?: number; reason?: string } => {

  // Skip analysis if both segments have very low energy (silence)
  if (preAnalysis.rmsEnergy < tolerances.minimumEnergyLevel &&
    postAnalysis.rmsEnergy < tolerances.minimumEnergyLevel) {
    return {
      hasDiscontinuity: false,
      reason: `both-segments-silent (pre: ${preAnalysis.rmsEnergy.toFixed(4)}, post: ${postAnalysis.rmsEnergy.toFixed(4)})`
    };
  }

  // Calculate energy change between segments
  const maxEnergy = Math.max(preAnalysis.rmsEnergy, postAnalysis.rmsEnergy);
  const energyChange = postAnalysis.rmsEnergy - preAnalysis.rmsEnergy;
  const energyChangePercent = maxEnergy > 0 ? (Math.abs(energyChange) / maxEnergy) * 100 : 0;

  // Check for sudden energy drops (missing samples)
  const hasEnergyDrop = energyChange < 0 && energyChangePercent > tolerances.energyDropThreshold;

  // Check for sudden energy spikes (overlapping samples)
  const hasEnergySpike = energyChange > 0 && energyChangePercent > tolerances.energySpikeThreshold;

  // Sample count discrepancy detection
  // For audio boundaries, we expect sample counts to be consistent with timing
  const expectedSampleRatio = 1.0; // Segments should have similar sample density
  const actualSampleRatio = preAnalysis.sampleCount > 0 ? postAnalysis.sampleCount / preAnalysis.sampleCount : 1.0;
  const sampleRatioDiscrepancy = Math.abs(actualSampleRatio - expectedSampleRatio);

  // Check for high energy variance (indicating choppy audio from boundary issues)
  const highVariance = preAnalysis.energyVariance > preAnalysis.rmsEnergy * 0.5 ||
    postAnalysis.energyVariance > postAnalysis.rmsEnergy * 0.5;

  if (hasEnergyDrop || hasEnergySpike || sampleRatioDiscrepancy > 0.1 || highVariance) {
    const reasons = [];
    if (hasEnergyDrop) reasons.push(`energy-drop-${energyChangePercent.toFixed(1)}%`);
    if (hasEnergySpike) reasons.push(`energy-spike-${energyChangePercent.toFixed(1)}%`);
    if (sampleRatioDiscrepancy > 0.1) reasons.push(`sample-count-mismatch-${(sampleRatioDiscrepancy * 100).toFixed(1)}%`);
    if (highVariance) reasons.push('high-energy-variance');

    return {
      hasDiscontinuity: true,
      energyGap: energyChangePercent,
      sampleCountDiscrepancy: sampleRatioDiscrepancy,
      reason: reasons.join(', ')
    };
  }

  return {
    hasDiscontinuity: false
  };
};

/**
 * Calculate segment boundary times from render info
 */
const calculateSegmentBoundaries = (renderInfo: { durationMs: number }): number[] => {
  const durationSeconds = renderInfo.durationMs / 1000;
  const segmentDuration = durationSeconds / 4; // Assuming 4 data segments

  // Return boundary times (not including start/end)
  const boundaries: number[] = [];
  for (let i = 1; i < 4; i++) {
    boundaries.push(i * segmentDuration);
  }

  return boundaries;
};

/**
 * Perform sine wave visual regression test - reuses existing visual comparison infrastructure
 */
export const performSineWaveVisualRegressionTest = async (
  videoPath: string,
  templateHash: string
): Promise<void> => {
  const testSineWavePNG = await generateSineWavePNG(videoPath, templateHash);
  const baselineSineWavePNG = await getOrCreateSineWaveBaseline(videoPath, templateHash);

  // Reuse existing visual comparison logic
  const { compareFramesWithOdiff } = await import('./visual-regression');

  const comparison = await compareFramesWithOdiff(
    baselineSineWavePNG,
    testSineWavePNG,
    templateHash,
    0, // Single frame index
    {
      threshold: 0.05, // Tight threshold for sine wave consistency
      antialiasing: true
    }
  );

  if (!comparison.match) {
    const diffInfo = comparison.diffPercentage
      ? `${comparison.diffPercentage}% different`
      : comparison.reason || 'unknown-difference';
    throw new Error(`Sine wave visual regression detected: ${diffInfo}`);
  }
};

/**
 * Perform algorithmic discontinuity detection at segment boundaries
 */
export const performBoundaryDiscontinuityTest = async (
  videoPath: string,
  renderInfo: { durationMs: number },
  expectedFrequency: number,
  templateHash: string
): Promise<void> => {
  const segmentBoundaries = calculateSegmentBoundaries(renderInfo);
  const windowDuration = 0.2; // 200ms window for analysis (increased for better frequency detection)
  const sampleRate = 48000;

  const discontinuities: BoundaryDiscontinuityResult[] = [];

  for (let i = 0; i < segmentBoundaries.length; i++) {
    const boundary = segmentBoundaries[i];

    if (boundary === undefined) {
      discontinuities.push({
        boundaryIndex: i,
        timeSeconds: 0,
        hasDiscontinuity: true,
        reason: 'undefined-boundary-time'
      });
      continue;
    }

    try {
      // Extract samples before and after boundary
      const presamples = await extractAudioSamplesAtTime(
        videoPath,
        boundary - windowDuration,
        windowDuration,
        templateHash
      );

      const postsamples = await extractAudioSamplesAtTime(
        videoPath,
        boundary,
        windowDuration,
        templateHash
      );

      // Analyze energy characteristics around boundary
      const preAnalysis = analyzeEnergyWindow(presamples);
      const postAnalysis = analyzeEnergyWindow(postsamples);

      // Detect energy gaps or discontinuities indicating sample boundary issues
      const discontinuityResult = detectEnergyGap(
        preAnalysis,
        postAnalysis,
        {
          energyDropThreshold: 30, // 30% energy drop indicates missing samples
          energySpikeThreshold: 50, // 50% energy spike indicates overlapping samples  
          minimumEnergyLevel: 0.001 // Minimum energy to consider valid audio signal
        }
      );

      if (discontinuityResult.hasDiscontinuity) {
        discontinuities.push({
          boundaryIndex: i,
          timeSeconds: boundary,
          hasDiscontinuity: true,
          energyGap: discontinuityResult.energyGap,
          sampleCountDiscrepancy: discontinuityResult.sampleCountDiscrepancy,
          reason: discontinuityResult.reason
        });
      }

    } catch (error) {
      // If we can't analyze a boundary, consider it a discontinuity
      discontinuities.push({
        boundaryIndex: i,
        timeSeconds: boundary,
        hasDiscontinuity: true,
        reason: `analysis-failed: ${error instanceof Error ? error.message : 'unknown-error'}`
      });
    }
  }

  if (discontinuities.length > 0) {
    const details = discontinuities.map(d => {
      const info = d.phaseJumpRadians
        ? `phase jump ${(d.phaseJumpRadians * 180 / Math.PI).toFixed(1)}°`
        : d.amplitudeJumpPercent
          ? `amplitude jump ${d.amplitudeJumpPercent.toFixed(1)}%`
          : d.reason || 'unknown';
      return `boundary ${d.boundaryIndex} at ${d.timeSeconds.toFixed(3)}s (${info})`;
    }).join(', ');

    throw new Error(`Audio discontinuities detected at segment boundaries: ${details}`);
  }
}; 