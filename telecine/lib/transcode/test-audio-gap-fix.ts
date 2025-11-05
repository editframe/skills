import { transcodeVideoSegment } from './src/jit/JitTranscoder.js';
import { writeFile } from 'fs/promises';

async function testAudioGapFix() {
  console.log('🔍 Testing Audio Gap Fix with Sine Wave Analysis...');

  try {
    // Generate 3 consecutive 1-second segments to analyze phase continuity
    const segments = [];

    for (let i = 0; i < 3; i++) {
      console.log(`\n📊 Generating segment ${i}...`);

      const result = await transcodeVideoSegment({
        url: 'file:///app/test-assets/transcode/head-moov-720p.mp4',  // 440Hz sine wave
        startTimeMs: i * 1000,   // 0ms, 1000ms, 2000ms
        durationMs: 1000,        // 1 second duration  
        targetWidth: 480,
        targetHeight: 270,
        videoBitrate: 1000000,
        audioCodec: 'aac',
        audioBitrate: 128000,
        audioChannels: 1,
        audioSampleRate: 48000,
        sequenceNumber: i,       // Proper sequence numbering
      });

      if (!result.success) {
        console.error(`❌ Segment ${i} failed:`, result.error);
        continue;
      }

      segments.push(result);

      // Save each segment for analysis
      await writeFile(`output/sine-segment-${i}.mp4`, new Uint8Array(result.outputData));
      console.log(`💾 Saved segment ${i}: ${result.outputData.byteLength} bytes`);

      // Log timing information
      console.log(`🎯 Segment ${i} Timing:`);
      console.log(`   Requested: ${result.alignedTiming.requestedFromUs / 1000}ms - ${result.alignedTiming.requestedToUs / 1000}ms`);
      console.log(`   Aligned: ${result.alignedTiming.alignedFromUs / 1000}ms - ${result.alignedTiming.alignedToUs / 1000}ms`);
      console.log(`   Duration: ${(result.alignedTiming.alignedToUs - result.alignedTiming.alignedFromUs) / 1000}ms`);
    }

    console.log('\n🎵 Phase Analysis:');
    console.log('Generated segments for sine wave phase analysis:');
    for (let i = 0; i < segments.length; i++) {
      console.log(`  Segment ${i}: output/sine-segment-${i}.mp4`);
    }

    console.log('\n🔬 Next Steps:');
    console.log('1. Extract audio from each segment');
    console.log('2. Analyze waveforms for phase discontinuities');
    console.log('3. Check if sine waves are in phase at segment boundaries');

    return segments;

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAudioGapFix().then(() => {
  console.log('✅ Test completed');
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 