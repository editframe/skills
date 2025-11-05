#!/usr/bin/env npx tsx

/**
 * Local File Transcoding Demo
 * 
 * This script demonstrates how to use the JitTranscoder with local files
 * instead of HTTP URLs. The system automatically detects the source type
 * and uses the appropriate fetcher.
 */

import { transcodeVideoSegment } from '../src/jit/JitTranscoder.js';
import { UnifiedByteRangeFetcher, validateByteRangeSupport } from '../src/async/UnifiedByteRangeFetcher.js';
import { fetchMoovAndFtypUnified } from '../src/moovScanner.js';
import * as path from 'node:path';

async function demonstrateLocalFileSupport() {
  console.log('🎬 Local File Transcoding Demo\n');

  // Example file paths (replace with actual MP4 files for real testing)
  const examples = [
    '/path/to/local/video.mp4',           // Absolute path
    './relative/path/video.mp4',          // Relative path  
    'file:///path/to/local/video.mp4',    // File URL
    'https://example.com/video.mp4'       // HTTP URL (for comparison)
  ];

  console.log('📋 The system now supports these URL formats:');
  examples.forEach((url, i) => {
    const type = url.startsWith('http') ? 'HTTP' : 'Local File';
    console.log(`   ${i + 1}. ${type}: ${url}`);
  });

  console.log('\n🔍 Demonstrating byte range support detection:\n');

  for (const url of examples.slice(0, 3)) { // Skip HTTP for this demo
    try {
      const result = await validateByteRangeSupport(url);
      console.log(`   ${url}`);
      console.log(`   ├─ Supported: ${result.supported}`);
      console.log(`   ├─ Source Type: ${result.sourceType}`);
      console.log(`   ${result.error ? `└─ Error: ${result.error}` : '└─ ✅ Ready'}\n`);
    } catch (error) {
      console.log(`   ${url}`);
      console.log(`   └─ ❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }

  console.log('💡 Usage Examples:\n');

  console.log('   // Basic local file transcoding');
  console.log('   const result = await transcodeVideoSegment({');
  console.log('     url: "/path/to/video.mp4",  // Local file path');
  console.log('     startTimeMs: 0,');
  console.log('     durationMs: 5000,');
  console.log('     targetWidth: 1280,');
  console.log('     targetHeight: 720,');
  console.log('     videoBitrate: 1000000,');
  console.log('     audioCodec: "aac",');
  console.log('     audioBitrate: 128000,');
  console.log('     audioChannels: 2,');
  console.log('     audioSampleRate: 48000');
  console.log('   });\n');

  console.log('   // File URL format');
  console.log('   const result2 = await transcodeVideoSegment({');
  console.log('     url: "file:///absolute/path/to/video.mp4",');
  console.log('     // ... same options');
  console.log('   });\n');

  console.log('   // HTTP URLs still work exactly as before');
  console.log('   const result3 = await transcodeVideoSegment({');
  console.log('     url: "https://example.com/video.mp4",');
  console.log('     // ... same options');
  console.log('   });\n');

  console.log('✨ Key Benefits:');
  console.log('   • No need to run a local HTTP server for testing');
  console.log('   • Faster access to local files (no network overhead)');
  console.log('   • Automatic detection - no code changes needed');
  console.log('   • Full backward compatibility with existing HTTP usage');
  console.log('   • Support for both absolute and relative paths');
  console.log('   • Support for file:// URL format\n');

  console.log('🧪 To test with a real MP4 file:');
  console.log('   1. Place an MP4 file in your project directory');
  console.log('   2. Update the file path in this script');
  console.log('   3. Run: npx tsx examples/local-file-demo.ts\n');
}

// Run the demo
demonstrateLocalFileSupport().catch(console.error); 