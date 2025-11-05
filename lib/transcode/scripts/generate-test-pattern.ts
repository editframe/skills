/**
 * Script to generate a test pattern video using FFmpeg
 * Creates a 2K resolution video with animated test pattern and 220Hz tone
 * Duration: 10 minutes
 */
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Configuration options (can be modified as needed)
const config = {
  // Output file name and location
  outputDir: path.join(process.cwd(), 'test-assets'),
  fileName: 'test-pattern-2k-10min.mp4',

  // Video settings
  resolution: '2048x1080', // 2K resolution
  duration: '10:00',       // 10 minutes
  frameRate: 30,           // Frames per second

  // Audio settings
  audioFrequency: 220,     // 220Hz tone
  audioSampleRate: 48000,  // 48kHz
};

/**
 * Runs the FFmpeg command to generate the test pattern video
 */
async function generateTestPattern(): Promise<void> {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  const outputPath = path.join(config.outputDir, config.fileName);

  // FFmpeg command to generate test pattern with tone
  const ffmpegArgs = [
    '-y',
    // Input: Generate test pattern (SMPTE color bars)
    '-f', 'lavfi', '-i', `testsrc2=size=${config.resolution}:rate=${config.frameRate}`,

    // Input: Generate audio tone
    '-f', 'lavfi', '-i', `sine=frequency=${config.audioFrequency}:sample_rate=${config.audioSampleRate}`,

    // Add frame number and timestamp overlay
    '-vf', `drawtext=text='Frame\\: %{frame_num}\\n%{pts\\:hms}':fontsize=${Math.floor(parseInt(config.resolution.split('x')[0]) / 20)}:fontcolor=black:box=1:boxcolor=white@0.9:boxborderw=${Math.floor(parseInt(config.resolution.split('x')[0]) / 80)}:x=(w-text_w)/2:y=(h-text_h)/2:text_align=right`,

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
  console.log(`Resolution: ${config.resolution}`);
  console.log(`Duration: ${config.duration}`);
  console.log(`Audio: ${config.audioFrequency}Hz tone`);
  console.log(`Output: ${outputPath}`);

  // Run FFmpeg command
  const ffmpeg = spawn('ffmpeg', ffmpegArgs);

  // Log progress
  ffmpeg.stderr.on('data', (data: Buffer) => {
    process.stdout.write(data.toString());
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

// Run the generation function
generateTestPattern().catch(err => {
  console.error('Error generating test pattern:', err);
  process.exit(1);
}); 