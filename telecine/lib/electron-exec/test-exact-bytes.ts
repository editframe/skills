/**
 * Test VideoDecoder with the EXACT same bytes mediabunny uses
 * 
 * This test:
 * 1. Reads the actual ingested track-1.mp4 file
 * 2. Uses the exact byte ranges from tracks.json (init segment + segment 0)
 * 3. Manually parses the fMP4 to extract avcC and samples
 * 4. Directly feeds them to VideoDecoder (no mediabunny)
 * 
 * If this crashes: the issue is with the data or Electron/WebCodecs
 * If this works: the issue is with mediabunny's processing
 */

import { spawn } from "node:child_process";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(__dirname, "test-exact-bytes-tmp");

if (!existsSync(TEST_DIR)) {
  mkdirSync(TEST_DIR, { recursive: true });
}

// The actual processed track file from the ingestion pipeline
const TRACK_FILE = join(__dirname, "../../data/video2/546d22e2-28cc-420b-949e-41429b2effca/01f6edbd-a850-4db9-afb4-1352d3135972/track-1.mp4");
const TRACKS_JSON = join(__dirname, "../../data/video2/546d22e2-28cc-420b-949e-41429b2effca/01f6edbd-a850-4db9-afb4-1352d3135972/tracks.json");

console.log("=== Testing VideoDecoder with EXACT mediabunny bytes ===\n");

// Step 1: Read the tracks.json metadata
console.log("Step 1: Reading tracks.json metadata...");
if (!existsSync(TRACKS_JSON)) {
  console.error("ERROR: tracks.json not found at:", TRACKS_JSON);
  process.exit(1);
}
const tracksJson = JSON.parse(readFileSync(TRACKS_JSON, "utf-8"));
const track = tracksJson["1"]; // Track 1 is video
console.log("  Track codec:", track.codec);
console.log("  Init segment: offset=" + track.initSegment.offset + ", size=" + track.initSegment.size);
console.log("  Segment 0: offset=" + track.segments[0].offset + ", size=" + track.segments[0].size);

// Step 2: Read the exact bytes
console.log("\nStep 2: Reading track file bytes...");
if (!existsSync(TRACK_FILE)) {
  console.error("ERROR: track-1.mp4 not found at:", TRACK_FILE);
  process.exit(1);
}
const trackData = readFileSync(TRACK_FILE);
console.log("  Total file size:", trackData.length, "bytes");

const initSegmentBytes = trackData.subarray(
  track.initSegment.offset,
  track.initSegment.offset + track.initSegment.size
);
const segment0Bytes = trackData.subarray(
  track.segments[0].offset,
  track.segments[0].offset + track.segments[0].size
);

console.log("  Init segment bytes:", initSegmentBytes.length);
console.log("  Segment 0 bytes:", segment0Bytes.length);

// Combine them (this is what mediabunny does)
const combinedBytes = Buffer.concat([initSegmentBytes, segment0Bytes]);
console.log("  Combined:", combinedBytes.length, "bytes");

// Write combined bytes for inspection
const combinedPath = join(TEST_DIR, "combined-segment.mp4");
writeFileSync(combinedPath, combinedBytes);
console.log("  Written to:", combinedPath);

// Step 3: Create the Electron test script
console.log("\nStep 3: Creating Electron test...");

const preloadCode = `
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('testData', {
  combinedBytes: Buffer.from(${JSON.stringify(Array.from(combinedBytes))}),
  codec: ${JSON.stringify(track.codec)},
  samples: ${JSON.stringify(track.segments[0].samples)},
});
`;

const electronCode = `
const { app, BrowserWindow } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('use-gl', 'swiftshader');
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
app.disableHardwareAcceleration();

const htmlContent = \`<!DOCTYPE html>
<html>
<head><title>VideoDecoder Test</title></head>
<body>
<h1>VideoDecoder Exact Bytes Test</h1>
<pre id="log"></pre>
<script>
function log(msg) {
  console.log(msg);
  document.getElementById('log').textContent += msg + '\\n';
}

async function test() {
  try {
    log('Starting VideoDecoder test with exact mediabunny bytes...');
    log('Combined buffer size: ' + window.testData.combinedBytes.length);
    log('Codec: ' + window.testData.codec);
    log('Samples in segment: ' + window.testData.samples.length);
    
    const buffer = new Uint8Array(window.testData.combinedBytes).buffer;
    
    // Parse the fMP4 to find avcC box (in moov > trak > mdia > minf > stbl > stsd > avc1 > avcC)
    log('\\nParsing fMP4 structure...');
    const view = new DataView(buffer);
    
    function findBox(data, offset, end, boxType) {
      while (offset < end) {
        const size = data.getUint32(offset);
        const type = String.fromCharCode(
          data.getUint8(offset + 4),
          data.getUint8(offset + 5),
          data.getUint8(offset + 6),
          data.getUint8(offset + 7)
        );
        if (type === boxType) {
          return { offset, size, contentOffset: offset + 8 };
        }
        offset += size;
      }
      return null;
    }
    
    function findNestedBox(data, offset, end, path) {
      for (const boxType of path) {
        const box = findBox(data, offset, end, boxType);
        if (!box) return null;
        offset = box.contentOffset;
        end = box.offset + box.size;
      }
      return { offset, end };
    }
    
    // Find avcC inside moov > trak > mdia > minf > stbl > stsd > avc1
    const moov = findBox(view, 0, buffer.byteLength, 'moov');
    if (!moov) throw new Error('No moov box found');
    log('Found moov at offset ' + moov.offset + ', size ' + moov.size);
    
    const stsd = findNestedBox(view, moov.contentOffset, moov.offset + moov.size, 
      ['trak', 'mdia', 'minf', 'stbl', 'stsd']);
    if (!stsd) throw new Error('No stsd box found');
    
    // stsd has 8 bytes of header after the box header
    const stsdContentStart = stsd.offset + 8;
    const avc1 = findBox(view, stsdContentStart, stsd.end, 'avc1');
    if (!avc1) throw new Error('No avc1 box found');
    log('Found avc1 at offset ' + avc1.offset);
    
    // avc1 has 78 bytes before child boxes
    const avc1ChildStart = avc1.contentOffset + 70;
    const avcC = findBox(view, avc1ChildStart, avc1.offset + avc1.size, 'avcC');
    if (!avcC) throw new Error('No avcC box found');
    log('Found avcC at offset ' + avcC.offset + ', size ' + avcC.size);
    
    const avcCData = new Uint8Array(buffer, avcC.contentOffset, avcC.size - 8);
    log('avcC data length: ' + avcCData.length);
    
    // Get dimensions from tkhd
    const trak = findBox(view, moov.contentOffset, moov.offset + moov.size, 'trak');
    const tkhd = findBox(view, trak.contentOffset, trak.offset + trak.size, 'tkhd');
    // tkhd version 0: width at offset 76, height at offset 80 (as 16.16 fixed point)
    const tkhdVersion = view.getUint8(tkhd.contentOffset);
    const widthOffset = tkhd.contentOffset + (tkhdVersion === 0 ? 76 : 88);
    const width = view.getUint32(widthOffset) >> 16;
    const height = view.getUint32(widthOffset + 4) >> 16;
    log('Dimensions: ' + width + 'x' + height);
    
    // Find moof and mdat for video samples
    const moof = findBox(view, moov.offset + moov.size, buffer.byteLength, 'moof');
    if (!moof) throw new Error('No moof box found');
    log('Found moof at offset ' + moof.offset);
    
    const mdat = findBox(view, moof.offset + moof.size, buffer.byteLength, 'mdat');
    if (!mdat) throw new Error('No mdat box found');
    log('Found mdat at offset ' + mdat.offset + ', size ' + mdat.size);
    
    // Parse trun to get sample info
    const traf = findBox(view, moof.contentOffset, moof.offset + moof.size, 'traf');
    const trun = findBox(view, traf.contentOffset, traf.offset + traf.size, 'trun');
    
    const trunFlags = view.getUint32(trun.contentOffset) & 0xFFFFFF;
    const sampleCount = view.getUint32(trun.contentOffset + 4);
    log('trun: ' + sampleCount + ' samples, flags=' + trunFlags.toString(16));
    
    // Parse sample entries
    let trunOffset = trun.contentOffset + 8;
    if (trunFlags & 0x1) trunOffset += 4; // data offset
    if (trunFlags & 0x4) trunOffset += 4; // first sample flags
    
    const samples = [];
    let dataOffset = mdat.contentOffset;
    
    for (let i = 0; i < sampleCount; i++) {
      let duration = 0, size = 0, flags = 0, compositionOffset = 0;
      if (trunFlags & 0x100) { duration = view.getUint32(trunOffset); trunOffset += 4; }
      if (trunFlags & 0x200) { size = view.getUint32(trunOffset); trunOffset += 4; }
      if (trunFlags & 0x400) { flags = view.getUint32(trunOffset); trunOffset += 4; }
      if (trunFlags & 0x800) { compositionOffset = view.getInt32(trunOffset); trunOffset += 4; }
      
      const isKeyframe = (flags & 0x10000) === 0;
      samples.push({ offset: dataOffset, size, duration, isKeyframe, compositionOffset });
      dataOffset += size;
    }
    
    log('Parsed ' + samples.length + ' samples from trun');
    log('First sample: offset=' + samples[0].offset + ', size=' + samples[0].size + ', keyframe=' + samples[0].isKeyframe);
    
    // Now create VideoDecoder
    log('\\nCreating VideoDecoder...');
    
    let outputCount = 0;
    let decodeCount = 0;
    const decoder = new VideoDecoder({
      output: (frame) => {
        outputCount++;
        log('OUTPUT FRAME ' + outputCount + ': ' + frame.codedWidth + 'x' + frame.codedHeight + ' ts=' + frame.timestamp);
        frame.close();
        
        if (outputCount >= 5) {
          log('\\n=== SUCCESS: Got ' + outputCount + ' frames! ===');
          window.testResult = { success: true, frames: outputCount };
        }
      },
      error: (e) => {
        log('DECODER ERROR: ' + e.message);
        window.testResult = { success: false, error: e.message };
      }
    });
    
    const config = {
      codec: window.testData.codec,
      codedWidth: width,
      codedHeight: height,
      description: avcCData,
      hardwareAcceleration: 'prefer-software',
      optimizeForLatency: true,
    };
    
    log('Configuring decoder: ' + JSON.stringify({
      codec: config.codec,
      width: config.codedWidth,
      height: config.codedHeight,
      descriptionLength: config.description.byteLength,
    }));
    
    decoder.configure(config);
    log('Decoder configured, state=' + decoder.state);
    
    // Decode samples one at a time
    const MAX_SAMPLES = Math.min(10, samples.length);
    log('\\nDecoding first ' + MAX_SAMPLES + ' samples...');
    
    for (let i = 0; i < MAX_SAMPLES; i++) {
      const sample = samples[i];
      const sampleData = new Uint8Array(buffer, sample.offset, sample.size);
      
      const chunk = new EncodedVideoChunk({
        type: sample.isKeyframe ? 'key' : 'delta',
        timestamp: i * 33333, // ~30fps
        duration: 33333,
        data: sampleData,
      });
      
      log('Decoding sample ' + i + ': type=' + chunk.type + ', size=' + chunk.byteLength + ', queueSize=' + decoder.decodeQueueSize);
      
      try {
        decoder.decode(chunk);
        decodeCount++;
        log('  decode() returned successfully');
      } catch (e) {
        log('  decode() threw: ' + e.message);
        break;
      }
      
      // Small delay between frames
      await new Promise(r => setTimeout(r, 50));
    }
    
    log('\\nWaiting for decoder to process queue...');
    log('Decoded ' + decodeCount + ' chunks, queueSize=' + decoder.decodeQueueSize);
    
    // Wait for outputs
    await new Promise(r => setTimeout(r, 2000));
    
    log('\\nFinal state: outputCount=' + outputCount + ', decodeCount=' + decodeCount);
    
    if (outputCount === 0) {
      log('\\n=== FAILURE: No frames output despite ' + decodeCount + ' decode() calls ===');
      window.testResult = { success: false, error: 'No frames output' };
    }
    
    try {
      await decoder.flush();
      log('Decoder flushed');
    } catch (e) {
      log('Flush error: ' + e.message);
    }
    
    decoder.close();
    log('Decoder closed');
    
  } catch (e) {
    log('ERROR: ' + e.message);
    log(e.stack);
    window.testResult = { success: false, error: e.message };
  }
}

test();
</script>
</body>
</html>\`;

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      offscreen: true,
    },
  });
  
  win.webContents.on('console-message', (e, level, msg) => {
    console.log('[RENDERER]', msg);
  });
  
  win.webContents.on('render-process-gone', (e, details) => {
    console.log('\\n=== RENDERER CRASHED ===');
    console.log('Reason:', details.reason);
    console.log('Exit code:', details.exitCode);
    process.exit(1);
  });
  
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
  
  // Wait for test to complete
  setTimeout(async () => {
    try {
      const result = await win.webContents.executeJavaScript('window.testResult');
      console.log('\\nTest result:', JSON.stringify(result, null, 2));
      process.exit(result?.success ? 0 : 1);
    } catch (e) {
      console.log('Failed to get result:', e.message);
      process.exit(1);
    }
  }, 10000);
});
`;

writeFileSync(join(TEST_DIR, "preload.cjs"), preloadCode);
writeFileSync(join(TEST_DIR, "electron-test.cjs"), electronCode);

// Step 4: Run Electron
console.log("\nStep 4: Running Electron test...\n");

const electron = spawn(
  join(__dirname, "../../node_modules/.bin/electron"),
  ["--no-sandbox", join(TEST_DIR, "electron-test.cjs")],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DISPLAY: process.env.DISPLAY || ":99",
      ELECTRON_DISABLE_GPU: "1",
    },
  }
);

electron.on("close", (code) => {
  console.log("\nElectron exited with code:", code);
  process.exit(code || 0);
});
