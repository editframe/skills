import { describe } from "vitest";

import {
  performVisualRegressionTest,
  extractFrameCountFromBuffer,
  extractFrameAtTime,
  analyzeBarsPattern,
  extractAudioMetadata,
  analyzeAudioSpectrum,
  testVideoPlayback,
  validateMP4Structure,
  testVideoSeek,
  extractCodecInfo,
} from "../test-utils";
import {
  extractAudioSamplesAtTime,
  performSineWaveVisualRegressionTest,
} from "../test-utils/audio-regression";
import { test } from "./fixtures";

describe("Audio Content Regression", () => {
  test("preserves audio track with tone signal", async ({ renderOutput, expect }) => {
    const { videoPath } = renderOutput;

    // Validate audio presence and properties
    const audioMetadata = await extractAudioMetadata(videoPath);

    expect(audioMetadata.hasAudio).toBe(true);
    expect(audioMetadata.sampleRate).toBeGreaterThan(0);
    expect(audioMetadata.channels).toBeGreaterThan(0);
    expect(audioMetadata.duration).toBeCloseTo(2.0, 0.2); // 2 seconds ±200ms
  }, 30000); // Extended timeout for first test that initializes renderOutput fixture

  test("generates expected tone frequency", async ({ renderOutput, expect }) => {
    const { videoPath } = renderOutput;

    // Analyze audio frequency content
    const audioAnalysis = await analyzeAudioSpectrum(videoPath);

    expect(audioAnalysis.hasToneSignal).toBe(true);
    expect(audioAnalysis.dominantFrequency).toBeGreaterThan(500); // Has substantial frequency content
    expect(audioAnalysis.signalLevel).toBeGreaterThan(-40); // Reasonable audio level (dB)
  });

  test("passes sine wave visual regression test", async ({ renderOutput }) => {
    const { videoPath, templateHash } = renderOutput;

    // Perform sine wave visual regression using PNG generation
    await performSineWaveVisualRegressionTest(videoPath, templateHash);
  });

  test("has no sample boundary issues at segment boundaries", async ({ renderOutput, expect }) => {
    // FAILING TEST: This will fail until AAC segment splicing math is fixed
    // Currently detects timing anomalies at 500ms segment boundaries due to 1-2 sample packet errors
    const { videoPath, templateHash } = renderOutput;

    // Zero-crossing timing analysis for 220Hz sine wave discontinuity detection  
    const expectedZeroCrossingInterval = 109;
    const deviationThreshold = 20;

    async function analyzeZeroCrossingTiming(startTime: number, duration: number, label: string) {
      console.log(`\n=== ${label} ===`);
      console.log(`Analyzing ${startTime.toFixed(1)}s to ${(startTime + duration).toFixed(1)}s`);

      const samples = await extractAudioSamplesAtTime(videoPath, startTime, duration, templateHash);

      // Find zero-crossings
      const zeroCrossings: number[] = [];
      for (let i = 1; i < samples.length; i++) {
        const current = samples[i];
        const previous = samples[i - 1];
        if (current !== undefined && previous !== undefined) {
          if ((current >= 0) !== (previous >= 0)) {
            zeroCrossings.push(i);
          }
        }
      }

      // Calculate intervals between zero-crossings
      const intervals: number[] = [];
      for (let i = 1; i < zeroCrossings.length; i++) {
        const current = zeroCrossings[i];
        const previous = zeroCrossings[i - 1];
        if (current !== undefined && previous !== undefined) {
          intervals.push(current - previous);
        }
      }

      if (intervals.length === 0) {
        console.log(`❌ No zero-crossing intervals found`);
        return { hasDiscontinuity: true, mean: 0, stdDev: 0, anomalies: [] };
      }

      const mean = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      const stdDev = Math.sqrt(
        intervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / intervals.length
      );

      // Find anomalous intervals
      const anomalies = intervals
        .map((interval, i) => ({
          interval,
          deviation: Math.abs(interval - expectedZeroCrossingInterval),
          timeSec: startTime + (zeroCrossings[i] || 0) / 48000
        }))
        .filter(anomaly => anomaly.deviation > deviationThreshold);

      console.log(`Zero-crossings found: ${zeroCrossings.length}`);
      console.log(`Mean interval: ${mean.toFixed(2)} samples (expected: ${expectedZeroCrossingInterval})`);
      console.log(`Standard deviation: ${stdDev.toFixed(2)} samples`);
      console.log(`Anomalous intervals: ${anomalies.length}`);

      if (anomalies.length > 0) {
        console.log(`🚨 Timing anomalies detected:`);
        anomalies.slice(0, 5).forEach(anomaly => {
          console.log(`   At ${anomaly.timeSec.toFixed(3)}s: ${anomaly.interval} samples (deviation: ${anomaly.deviation.toFixed(1)})`);
        });
        if (anomalies.length > 5) {
          console.log(`   ... and ${anomalies.length - 5} more`);
        }
      } else {
        console.log(`✅ No timing anomalies detected`);
      }

      return {
        hasDiscontinuity: anomalies.length > 0,
        mean,
        stdDev,
        anomalies
      };
    }

    // Test segment boundary area around 1.0s where discontinuities currently occur
    const problemSection = await analyzeZeroCrossingTiming(0.8, 0.4, "Segment Boundary Area (0.8s-1.2s)");

    console.log(`\n=== Test Results ===`);
    console.log(`Segment boundary has discontinuity: ${problemSection.hasDiscontinuity ? '🚨 YES' : '✅ NO'}`);

    // This test expects NO discontinuities (will fail until AAC splicing is fixed)
    expect(problemSection.hasDiscontinuity).toBe(false);
  });

  test("maintains consistent sample timing in clean sections", async ({ renderOutput, expect }) => {
    const { videoPath, templateHash } = renderOutput;

    // Zero-crossing timing analysis for 220Hz sine wave 
    const expectedZeroCrossingInterval = 109;
    const deviationThreshold = 20;

    async function analyzeZeroCrossingTiming(startTime: number, duration: number, label: string) {
      console.log(`\n=== ${label} ===`);
      console.log(`Analyzing ${startTime.toFixed(1)}s to ${(startTime + duration).toFixed(1)}s`);

      const samples = await extractAudioSamplesAtTime(videoPath, startTime, duration, templateHash);

      // Find zero-crossings
      const zeroCrossings: number[] = [];
      for (let i = 1; i < samples.length; i++) {
        const current = samples[i];
        const previous = samples[i - 1];
        if (current !== undefined && previous !== undefined) {
          if ((current >= 0) !== (previous >= 0)) {
            zeroCrossings.push(i);
          }
        }
      }

      // Calculate intervals between zero-crossings
      const intervals: number[] = [];
      for (let i = 1; i < zeroCrossings.length; i++) {
        const current = zeroCrossings[i];
        const previous = zeroCrossings[i - 1];
        if (current !== undefined && previous !== undefined) {
          intervals.push(current - previous);
        }
      }

      if (intervals.length === 0) {
        console.log(`❌ No zero-crossing intervals found`);
        return { hasDiscontinuity: true, mean: 0, stdDev: 0, anomalies: [] };
      }

      const mean = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      const stdDev = Math.sqrt(
        intervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / intervals.length
      );

      // Find anomalous intervals
      const anomalies = intervals
        .map((interval, i) => ({
          interval,
          deviation: Math.abs(interval - expectedZeroCrossingInterval),
          timeSec: startTime + (zeroCrossings[i] || 0) / 48000
        }))
        .filter(anomaly => anomaly.deviation > deviationThreshold);

      console.log(`Zero-crossings found: ${zeroCrossings.length}`);
      console.log(`Mean interval: ${mean.toFixed(2)} samples (expected: ${expectedZeroCrossingInterval})`);
      console.log(`Standard deviation: ${stdDev.toFixed(2)} samples`);
      console.log(`Anomalous intervals: ${anomalies.length}`);

      if (anomalies.length > 0) {
        console.log(`🚨 Timing anomalies detected:`);
        anomalies.slice(0, 5).forEach(anomaly => {
          console.log(`   At ${anomaly.timeSec.toFixed(3)}s: ${anomaly.interval} samples (deviation: ${anomaly.deviation.toFixed(1)})`);
        });
        if (anomalies.length > 5) {
          console.log(`   ... and ${anomalies.length - 5} more`);
        }
      } else {
        console.log(`✅ No timing anomalies detected`);
      }

      return {
        hasDiscontinuity: anomalies.length > 0,
        mean,
        stdDev,
        anomalies
      };
    }

    // Test clean section well away from any 500ms segment boundaries
    const cleanSection = await analyzeZeroCrossingTiming(0.2, 0.3, "Clean Section (0.2s-0.5s)");

    console.log(`\n=== Test Results ===`);
    console.log(`Clean section has discontinuity: ${cleanSection.hasDiscontinuity ? '🚨 YES' : '✅ NO'}`);

    // Clean sections should have no discontinuities
    expect(cleanSection.hasDiscontinuity).toBe(false);
  });

  test("shows no discontinuities at non-segment boundary points", async ({ renderOutput, expect }) => {
    const { videoPath, templateHash } = renderOutput;

    // Zero-crossing timing analysis for 220Hz sine wave 
    const expectedZeroCrossingInterval = 109;
    const deviationThreshold = 20;

    async function analyzeZeroCrossingTiming(startTime: number, duration: number, label: string) {
      console.log(`\n=== ${label} ===`);
      console.log(`Analyzing ${startTime.toFixed(1)}s to ${(startTime + duration).toFixed(1)}s`);

      const samples = await extractAudioSamplesAtTime(videoPath, startTime, duration, templateHash);

      // Find zero-crossings
      const zeroCrossings: number[] = [];
      for (let i = 1; i < samples.length; i++) {
        const current = samples[i];
        const previous = samples[i - 1];
        if (current !== undefined && previous !== undefined) {
          if ((current >= 0) !== (previous >= 0)) {
            zeroCrossings.push(i);
          }
        }
      }

      // Calculate intervals between zero-crossings
      const intervals: number[] = [];
      for (let i = 1; i < zeroCrossings.length; i++) {
        const current = zeroCrossings[i];
        const previous = zeroCrossings[i - 1];
        if (current !== undefined && previous !== undefined) {
          intervals.push(current - previous);
        }
      }

      if (intervals.length === 0) {
        console.log(`❌ No zero-crossing intervals found`);
        return { hasDiscontinuity: true, mean: 0, stdDev: 0, anomalies: [] };
      }

      const mean = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      const stdDev = Math.sqrt(
        intervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / intervals.length
      );

      // Find anomalous intervals
      const anomalies = intervals
        .map((interval, i) => ({
          interval,
          deviation: Math.abs(interval - expectedZeroCrossingInterval),
          timeSec: startTime + (zeroCrossings[i] || 0) / 48000
        }))
        .filter(anomaly => anomaly.deviation > deviationThreshold);

      console.log(`Zero-crossings found: ${zeroCrossings.length}`);
      console.log(`Mean interval: ${mean.toFixed(2)} samples (expected: ${expectedZeroCrossingInterval})`);
      console.log(`Standard deviation: ${stdDev.toFixed(2)} samples`);
      console.log(`Anomalous intervals: ${anomalies.length}`);

      if (anomalies.length > 0) {
        console.log(`🚨 Timing anomalies detected:`);
        anomalies.slice(0, 5).forEach(anomaly => {
          console.log(`   At ${anomaly.timeSec.toFixed(3)}s: ${anomaly.interval} samples (deviation: ${anomaly.deviation.toFixed(1)})`);
        });
        if (anomalies.length > 5) {
          console.log(`   ... and ${anomalies.length - 5} more`);
        }
      } else {
        console.log(`✅ No timing anomalies detected`);
      }

      return {
        hasDiscontinuity: anomalies.length > 0,
        mean,
        stdDev,
        anomalies
      };
    }

    // Test at points away from the segment boundaries at 0.5s, 1.0s, 1.5s to ensure no false positives
    const nonBoundaryTimes = [0.25, 0.75, 1.25, 1.75]; // Points well away from 500ms segment boundaries

    for (const timePoint of nonBoundaryTimes) {
      const windowDuration = 0.2;

      // Analyze zero-crossing timing at this non-boundary point
      const analysis = await analyzeZeroCrossingTiming(timePoint, windowDuration, `Non-boundary point (${timePoint}s)`);

      // Should NOT detect discontinuity at non-boundary points where audio should be consistent
      // If this fails, the zero-crossing algorithm is detecting false positives
      expect(analysis.hasDiscontinuity).toBe(false);
    }
  });
});

describe("Audio Content Quality", () => {
  test("preserves audio properties in rendered video", async ({ renderOutput, expect }) => {
    // Reuse the existing renderOutput which contains audio content from bars-n-tone.mp4
    const { videoPath } = renderOutput;

    const audioMetadata = await extractAudioMetadata(videoPath);

    expect(audioMetadata.hasAudio).toBe(true);
    expect(audioMetadata.sampleRate).toBeGreaterThan(0);
    expect(audioMetadata.channels).toBeGreaterThan(0);
    expect(audioMetadata.duration).toBeGreaterThan(0);
  });

  test("maintains audio frequency content in rendered video", async ({ renderOutput, expect }) => {
    // Reuse the existing renderOutput which contains audio content from bars-n-tone.mp4
    const { videoPath } = renderOutput;

    const audioAnalysis = await analyzeAudioSpectrum(videoPath);

    expect(audioAnalysis.signalLevel).toBeGreaterThan(-60); // Has reasonable audio level
    expect(audioAnalysis.hasToneSignal).toBe(true); // Has audio content
  });

  test("processes mp3 audio assets correctly", ({ cardJoker, expect }) => {
    // Validate the processed MP3 asset record (already processed in beforeAll)
    expect(cardJoker).toBeDefined();
    expect(cardJoker.id).toBeDefined();
    expect(cardJoker.filename).toContain("card-joker");
    expect(cardJoker.org_id).toBeDefined();
    expect(cardJoker.creator_id).toBeDefined();
    expect(cardJoker.md5).toBeDefined();

    // Should be successfully processed (fragment_index_complete should be true)
    expect(cardJoker.fragment_index_complete).toBe(true);

    // Should have a valid creation timestamp
    expect(cardJoker.created_at).toBeInstanceOf(Date);
    expect(cardJoker.created_at.getTime()).toBeGreaterThan(0); // Valid timestamp

    // ID should be a valid UUID format
    expect(cardJoker.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});

describe("Audio Playback Quality", () => {
  test("produces playable rendered video with audio", async ({ renderOutput, expect }) => {
    // Reuse the existing renderOutput which contains both video and audio content
    const { videoPath } = renderOutput;

    const playbackTest = await testVideoPlayback(videoPath);
    expect(playbackTest.canPlay).toBe(true);
    expect(playbackTest.duration).toBeGreaterThan(0);

    const structureValidation = await validateMP4Structure(videoPath);
    expect(structureValidation.isValid).toBe(true);
    expect(structureValidation.hasVideoTrack).toBe(true);
    expect(structureValidation.hasAudioTrack).toBe(true);
  });

  test("supports seeking in rendered video with audio", async ({ renderOutput, expect }) => {
    // Reuse the existing renderOutput which contains both video and audio content
    const { videoPath } = renderOutput;

    const seekTests = [0.2, 0.5, 0.8];

    for (const position of seekTests) {
      const seekResult = await testVideoSeek(videoPath, position);
      expect(seekResult.success).toBe(true);
      expect(seekResult.actualPosition).toBeCloseTo(position, 0.3);
    }
  });
});

describe("WAV File Processing Regression", () => {
  test("processes wav files with conforming stream system", ({ testWav, expect }) => {
    // Validate the processed WAV asset record
    expect(testWav).toBeDefined();
    expect(testWav.id).toBeDefined();
    expect(testWav.filename).toContain("test-sample");
    expect(testWav.org_id).toBeDefined();
    expect(testWav.creator_id).toBeDefined();
    expect(testWav.md5).toBeDefined();

    // Should be successfully processed (fragment_index_complete should be true)
    expect(testWav.fragment_index_complete).toBe(true);

    // Should have a valid creation timestamp
    expect(testWav.created_at).toBeInstanceOf(Date);
    expect(testWav.created_at.getTime()).toBeGreaterThan(0);

    // ID should be a valid UUID format
    expect(testWav.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  }, 30000); // Extended timeout for first test that initializes testWav fixture

  test("renders wav audio with waveform visualization", ({ wavRenderOutput, expect }) => {
    const { finalVideoBuffer, renderInfo } = wavRenderOutput;

    // Frame count validation for WAV waveform animation
    const expectedFrameCount = Math.ceil((renderInfo.durationMs / 1000) * 30); // 30fps
    const actualFrameCount = extractFrameCountFromBuffer(finalVideoBuffer);

    expect(actualFrameCount).toBeGreaterThan(0);
    const tolerance = 6; // ±6 frames tolerance
    expect(actualFrameCount).toBeGreaterThanOrEqual(expectedFrameCount - tolerance);
    expect(actualFrameCount).toBeLessThanOrEqual(expectedFrameCount + tolerance);
    expect(renderInfo.durationMs).toBeCloseTo(2000, 100); // ~2 seconds
  });

  test("produces playable video from wav audio source", async ({ wavRenderOutput, expect }) => {
    const { videoPath } = wavRenderOutput;

    const playbackTest = await testVideoPlayback(videoPath);
    expect(playbackTest.canPlay).toBe(true);
    expect(playbackTest.duration).toBeGreaterThan(0);

    const structureValidation = await validateMP4Structure(videoPath);
    expect(structureValidation.isValid).toBe(true);
    expect(structureValidation.hasAudioTrack).toBe(true);
  });

  test("transcodes wav pcm to aac correctly", async ({ wavRenderOutput, expect }) => {
    const { videoPath } = wavRenderOutput;

    const codecInfo = await extractCodecInfo(videoPath);
    expect(codecInfo.audioCodec).toBeDefined();
    expect(codecInfo.audioCodec).toContain('aac'); // Should be transcoded to AAC

    const audioMetadata = await extractAudioMetadata(videoPath);
    expect(audioMetadata.hasAudio).toBe(true);
    expect(audioMetadata.sampleRate).toBe(48000); // Should be resampled to 48kHz
    expect(audioMetadata.channels).toBeGreaterThan(0);
  });

  test("passes wav waveform visual regression test", async ({ wavRenderOutput }) => {
    const { videoPath, templateHash, testTitle } = wavRenderOutput;

    // Perform WAV waveform visual regression test
    await performVisualRegressionTest(videoPath, templateHash, testTitle);
  });

  test("getRenderInfo should return correct duration for WAV audio files", async ({ testWav, wavRenderInfo, expect }) => {
    expect(wavRenderInfo).toEqual({
      "assets": {
        "efImageSrcs": [],
        "efMediaSrcs": [
          `asset-id=${testWav.id}`,
        ],
      },
      width: 480,
      height: 270,
      durationMs: 2000,
      fps: 30,
    });
  });
});

describe("Audio Waveform Visual Regression", () => {
  test("renders waveform visualization with expected frame count", ({ audioRenderOutput, expect }) => {
    const { finalVideoBuffer, renderInfo } = audioRenderOutput;

    // Frame count validation for waveform animation
    const expectedFrameCount = Math.ceil((renderInfo.durationMs / 1000) * 30); // 30fps
    const actualFrameCount = extractFrameCountFromBuffer(finalVideoBuffer);

    expect(actualFrameCount).toBeGreaterThan(0);
    const tolerance = 6; // ±6 frames tolerance
    expect(actualFrameCount).toBeGreaterThanOrEqual(expectedFrameCount - tolerance);
    expect(actualFrameCount).toBeLessThanOrEqual(expectedFrameCount + tolerance);
  }, 30000); // Extended timeout for first test that initializes audioRenderOutput fixture

  test("passes waveform visual regression test against baseline", async ({ audioRenderOutput }) => {
    const { videoPath, templateHash, testTitle } = audioRenderOutput;

    // Perform waveform visual regression test using simplified single function
    // Function will throw on failure, pass on success
    await performVisualRegressionTest(videoPath, templateHash, testTitle);
  });

  test("renders waveform bars with visual content", async ({ audioRenderOutput, expect }) => {
    const { videoPath, templateHash } = audioRenderOutput;

    // Extract and analyze waveform content
    const midFrameData = await extractFrameAtTime(videoPath, 0.5, templateHash);
    const frameAnalysis = analyzeBarsPattern(midFrameData);

    expect(frameAnalysis.hasBarsPattern).toBe(true); // Should detect waveform bars
    expect(frameAnalysis.colorRegions).toBeGreaterThanOrEqual(3); // Multiple waveform sections
    expect(frameAnalysis.brightness).toBeGreaterThan(0.1); // Not black frame
  });

  test("maintains expected waveform dimensions", ({ audioRenderOutput, expect }) => {
    const { renderInfo } = audioRenderOutput;

    expect(renderInfo.width).toBe(480); // From template class="w-[480px]"
    expect(renderInfo.height).toBe(270); // From template class="h-[270px]"
    expect(renderInfo.width / renderInfo.height).toBeCloseTo(16 / 9, 0.1); // Aspect ratio
  });

  test("successfully processes mp3 for waveform testing", ({ audioRenderOutput, expect, cardJoker }) => {
    // Validate that we can process MP3 assets for audio waveform testing
    expect(cardJoker).toBeDefined();
    expect(cardJoker.id).toBeDefined();
    expect(cardJoker.filename).toContain("card-joker");
    expect(cardJoker.fragment_index_complete).toBe(true);

    // This confirms the audio pipeline is ready for waveform rendering
    expect(audioRenderOutput).toBeDefined();
    expect(audioRenderOutput.finalVideoBuffer.length).toBeGreaterThan(0);
    expect(audioRenderOutput.renderInfo.durationMs).toBeGreaterThan(0);
  });
});

