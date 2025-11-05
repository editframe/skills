/**
 * Script to generate a very short test pattern for testing purposes
 */
import { generateTestPattern } from './generate-test-patterns';

// Generate a 2-second test pattern for quick testing
async function main() {
  try {
    await generateTestPattern({
      duration: '0:02',  // Just 2 seconds
      resolution: '320x240', // Very small resolution for quick encoding
      frameRate: 15,     // Lower frame rate for quicker encoding
      fileName: 'quick-test.mp4'
    });
    console.log('Quick test pattern generated successfully!');
  } catch (err) {
    console.error('Error:', err);
  }
}

main(); 