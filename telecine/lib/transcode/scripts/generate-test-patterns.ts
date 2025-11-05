/**
 * Script to generate various test pattern videos using FFmpeg
 * Includes multiple pattern types, resolutions, and audio options
 */
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Types for configuration
type PatternType = 'testsrc' | 'testsrc2' | 'smptebars' | 'color' | 'mandelbrot';
type AudioType = 'sine' | 'silence' | 'anoisesrc';

interface TestPatternConfig {
  // Pattern options
  patternType: PatternType;

  // Video settings
  resolution: string;
  duration: string;
  frameRate: number;

  // Audio settings
  audioType: AudioType;
  audioFrequency?: number;
  audioSampleRate: number;

  // Output settings
  outputDir: string;
  fileName: string;
}

/**
 * Default test pattern configuration
 */
const defaultConfig: TestPatternConfig = {
  patternType: 'testsrc',
  resolution: '2048x1080',  // 2K resolution
  duration: '10:00',        // 10 minutes
  frameRate: 30,            // Frames per second
  audioType: 'sine',
  audioFrequency: 220,      // 220Hz tone
  audioSampleRate: 48000,   // 48kHz
  outputDir: path.join(process.cwd(), 'test-assets'),
  fileName: 'test-pattern-2k-10min.mp4',
};

/**
 * Generates video pattern command based on pattern type
 */
function getPatternSource(config: TestPatternConfig): string {
  switch (config.patternType) {
    case 'testsrc':
      return `testsrc=size=${config.resolution}:rate=${config.frameRate}`;
    case 'testsrc2':
      return `testsrc2=size=${config.resolution}:rate=${config.frameRate}`;
    case 'smptebars':
      return `smptebars=size=${config.resolution}:rate=${config.frameRate}`;
    case 'color':
      return `color=c=blue:s=${config.resolution}:r=${config.frameRate}`;
    case 'mandelbrot':
      return `mandelbrot=size=${config.resolution}:rate=${config.frameRate}`;
    default:
      return `testsrc=size=${config.resolution}:rate=${config.frameRate}`;
  }
}

/**
 * Generates audio source command based on audio type
 */
function getAudioSource(config: TestPatternConfig): string {
  switch (config.audioType) {
    case 'sine':
      return `sine=frequency=${config.audioFrequency}:sample_rate=${config.audioSampleRate}`;
    case 'silence':
      return `anullsrc=sample_rate=${config.audioSampleRate}`;
    case 'anoisesrc':
      return `anoisesrc=amplitude=0.1:sample_rate=${config.audioSampleRate}`;
    default:
      return `sine=frequency=${config.audioFrequency}:sample_rate=${config.audioSampleRate}`;
  }
}

/**
 * Generates a test pattern video with the specified configuration
 */
async function generateTestPattern(customConfig?: Partial<TestPatternConfig>): Promise<void> {
  // Merge custom config with default config
  const config: TestPatternConfig = { ...defaultConfig, ...customConfig };

  // Create output directory if it doesn't exist
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  const outputPath = path.join(config.outputDir, config.fileName);

  // Get pattern and audio source commands
  const patternSource = getPatternSource(config);
  const audioSource = getAudioSource(config);

  // FFmpeg command to generate test pattern with tone
  const ffmpegArgs = [
    // Input: Generate test pattern
    '-f', 'lavfi', '-i', patternSource,

    // Input: Generate audio
    '-f', 'lavfi', '-i', audioSource,

    // Output options
    '-t', config.duration,        // Duration
    '-c:v', 'libx264',            // Video codec
    '-preset', 'medium',          // Encoding preset (balance between speed and quality)
    '-crf', '23',                 // Constant Rate Factor (quality setting, lower is better)
    '-c:a', 'aac',                // Audio codec
    '-b:a', '128k',               // Audio bitrate
    '-pix_fmt', 'yuv420p',        // Pixel format for compatibility
    '-movflags', '+faststart',    // Optimize for web streaming
    outputPath                    // Output file
  ];

  console.log('Generating test pattern video...');
  console.log(`Pattern: ${config.patternType}`);
  console.log(`Resolution: ${config.resolution}`);
  console.log(`Duration: ${config.duration}`);
  console.log(`Audio: ${config.audioType}${config.audioFrequency ? ` at ${config.audioFrequency}Hz` : ''}`);
  console.log(`Output: ${outputPath}`);

  // Run FFmpeg command
  const ffmpeg = spawn('ffmpeg', ffmpegArgs);

  // Log progress
  ffmpeg.stderr.on('data', (data: Buffer) => {
    const output = data.toString();
    // Only show frame/time info for cleaner output
    if (output.includes('frame=') && output.includes('time=')) {
      process.stdout.write(`\rProgress: ${output.trim()}`);
    }
  });

  // Handle completion
  return new Promise((resolve, reject) => {
    ffmpeg.on('close', (code: number) => {
      if (code === 0) {
        console.log('\nTest pattern video generated successfully!');
        resolve();
      } else {
        console.error(`\nFFmpeg process exited with code ${code}`);
        reject(new Error(`FFmpeg process exited with code ${code}`));
      }
    });

    ffmpeg.on('error', (err: Error) => {
      console.error('Failed to start FFmpeg process:', err);
      reject(err);
    });
  });
}

// Generate the default test pattern (2K, 10min, 220Hz tone)
async function generateDefaultPattern() {
  await generateTestPattern();
}

// Generate an animated test pattern (mandelbrot) with 220Hz tone
async function generateMandelbrotPattern() {
  await generateTestPattern({
    patternType: 'mandelbrot',
    fileName: 'mandelbrot-2k-10min.mp4'
  });
}

// Generate SMPTE color bars with 1kHz tone (standard test pattern)
async function generateSmptePattern() {
  await generateTestPattern({
    patternType: 'smptebars',
    audioFrequency: 1000, // 1kHz tone (standard for test patterns)
    fileName: 'smptebars-2k-10min.mp4'
  });
}

// Run the generation functions in sequence
async function main() {
  try {
    console.log('=== Generating Test Pattern Videos ===');
    await generateDefaultPattern();
    console.log('\n');
    await generateMandelbrotPattern();
    console.log('\n');
    await generateSmptePattern();
    console.log('\nAll test pattern videos generated successfully!');
  } catch (err) {
    console.error('Error generating test patterns:', err);
    process.exit(1);
  }
}

// Auto-run main when this file is executed directly (not imported)
// Use a different approach for ESM modules since require.main is not available
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}

// Export the generation function for use in other scripts
export { generateTestPattern };
export type { TestPatternConfig }; 