/**
 * Minimal standalone test for WebCodecs VideoDecoder in Electron/Xvfb
 *
 * This test isolates the VideoDecoder crash to determine if it's:
 * 1. A mediabunny issue
 * 2. An Electron/Chromium issue
 * 3. A Docker/Xvfb environment issue
 *
 * Run with: ./scripts/npx tsx lib/electron-exec/test-webcodecs-minimal.ts
 */

import { spawn, execSync } from "node:child_process";
import {
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(__dirname, "test-webcodecs-tmp");

// Ensure test directory exists
if (!existsSync(TEST_DIR)) {
  mkdirSync(TEST_DIR, { recursive: true });
}

// Use the actual bars-n-tone.mp4 test file from our test fixtures
const BARS_N_TONE = join(
  __dirname,
  "../../lib/process-file/test-files/bars-n-tone.mp4",
);
const TEST_VIDEO = existsSync(BARS_N_TONE)
  ? BARS_N_TONE
  : join(TEST_DIR, "test-video.mp4");
const TEST_TRACK = join(TEST_DIR, "test-track.mp4");

// The actual processed track file from the ingestion pipeline
const PROCESSED_TRACK = join(
  __dirname,
  "../../data/video2/546d22e2-28cc-420b-949e-41429b2effca/01f6edbd-a850-4db9-afb4-1352d3135972/track-1.mp4",
);
const ELECTRON_SCRIPT = join(TEST_DIR, "electron-test.cjs");
const PRELOAD_SCRIPT = join(TEST_DIR, "preload.cjs");

// Copy mediabunny to test dir for the Electron script to use
const MEDIABUNNY_DIST = join(__dirname, "../../node_modules/mediabunny/dist");

console.log("=== WebCodecs VideoDecoder Minimal Reproduction ===\n");

// Step 1: Check for test video
console.log("Step 1: Checking test video...");
if (TEST_VIDEO === BARS_N_TONE && existsSync(BARS_N_TONE)) {
  console.log("  Using actual bars-n-tone.mp4: " + BARS_N_TONE);
} else if (!existsSync(TEST_VIDEO)) {
  console.log("  Creating test video with FFmpeg...");
  try {
    execSync(
      `ffmpeg -f lavfi -i testsrc=duration=1:size=320x240:rate=30 \
      -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p \
      -movflags +faststart \
      "${TEST_VIDEO}" -y 2>&1`,
      { stdio: "pipe" },
    );
    console.log("  Created test video: " + TEST_VIDEO);
  } catch (e: any) {
    console.error(
      "  Failed to create test video:",
      e.stderr?.toString() || e.message,
    );
    process.exit(1);
  }
} else {
  console.log("  Test video already exists: " + TEST_VIDEO);
}

// Step 2: Extract video track to fMP4 format (same as our pipeline)
console.log("\nStep 2: Extracting video track to fMP4...");
try {
  execSync(
    `ffmpeg -i "${TEST_VIDEO}" \
    -c:v copy \
    -an \
    -movflags frag_keyframe+empty_moov+default_base_moof \
    -bsf:v filter_units=remove_types=6 \
    "${TEST_TRACK}" -y 2>&1`,
    { stdio: "pipe" },
  );
  console.log("  Extracted track: " + TEST_TRACK);
} catch (e: any) {
  console.error(
    "  Failed to extract track:",
    e.stderr?.toString() || e.message,
  );
  process.exit(1);
}

// Step 3: Analyze the track with FFprobe
console.log("\nStep 3: Analyzing track structure...");
try {
  const probeOutput = execSync(
    `ffprobe -v quiet -print_format json -show_format -show_streams "${TEST_TRACK}"`,
    { encoding: "utf-8" },
  );
  const probe = JSON.parse(probeOutput);
  const videoStream = probe.streams?.find((s: any) => s.codec_type === "video");
  if (videoStream) {
    console.log("  Codec:", videoStream.codec_name);
    console.log("  Profile:", videoStream.profile);
    console.log("  Resolution:", videoStream.width + "x" + videoStream.height);
    console.log("  Frame rate:", videoStream.r_frame_rate);
  }
} catch (e: any) {
  console.log("  FFprobe analysis failed:", e.message);
}

// Step 4: Create the Electron preload script
console.log("\nStep 4: Creating Electron scripts...");

const preloadCode = `
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('testAPI', {
  trackPath: ${JSON.stringify(TEST_TRACK)},
});
`;
writeFileSync(PRELOAD_SCRIPT, preloadCode);

// Step 5: Create the Electron main script
const electronMainCode = `
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Don't disable hardware acceleration - WebCodecs may need it
// app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-dev-shm-usage');

const trackPath = ${JSON.stringify(TEST_TRACK)};

app.whenReady().then(async () => {
  console.log('Electron ready, creating window...');
  
  const win = new BrowserWindow({
    width: 400,
    height: 300,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      sandbox: false,
      offscreen: true, // Match production config
      preload: ${JSON.stringify(PRELOAD_SCRIPT)},
    },
  });

  win.webContents.on('render-process-gone', (event, details) => {
    console.error('CRASH! Renderer process gone:', JSON.stringify(details));
    app.exit(1);
  });

  win.webContents.on('console-message', (event, level, message) => {
    console.log('[Renderer]', message);
  });

  // Load a page - try file:// first as it's a secure context
  const htmlPath = ${JSON.stringify(join(TEST_DIR, "test.html"))};
  require('fs').writeFileSync(htmlPath, '<html><body><h1>WebCodecs Test</h1></body></html>');
  await win.loadFile(htmlPath);
  
  console.log('Page loaded, running VideoDecoder test...');
  
  try {
    // Read the track file
    const trackData = fs.readFileSync(trackPath);
    console.log('Track file size:', trackData.length, 'bytes');
    
    // First check what APIs are available
    const apiCheck = await win.webContents.executeJavaScript(\`
      (function() {
        return {
          hasVideoDecoder: typeof VideoDecoder !== 'undefined',
          hasVideoEncoder: typeof VideoEncoder !== 'undefined',
          hasAudioDecoder: typeof AudioDecoder !== 'undefined',
          hasAudioEncoder: typeof AudioEncoder !== 'undefined',
          hasEncodedVideoChunk: typeof EncodedVideoChunk !== 'undefined',
          hasVideoFrame: typeof VideoFrame !== 'undefined',
          userAgent: navigator.userAgent,
          isSecureContext: window.isSecureContext,
        };
      })()
    \`);
    console.log('WebCodecs API check:', JSON.stringify(apiCheck, null, 2));
    
    if (!apiCheck.hasVideoDecoder) {
      console.error('\\n=== FAILURE: VideoDecoder not available in this context ===');
      console.log('isSecureContext:', apiCheck.isSecureContext);
      console.log('This may be because:');
      console.log('1. Offscreen mode disables WebCodecs');
      console.log('2. The page is not in a secure context');
      console.log('3. WebCodecs needs to be enabled via a flag');
      app.exit(1);
      return;
    }
    
    // Run the VideoDecoder test in the renderer
    const result = await win.webContents.executeJavaScript(\`
      (async function() {
        const trackData = new Uint8Array([${Array.from(readFileSync(TEST_TRACK)).join(",")}]);
        console.log('Track data received in renderer:', trackData.length, 'bytes');
        
        // Parse the fMP4 to extract avcC and video samples
        // This is a minimal parser - just enough to test VideoDecoder
        
        function readUint32BE(data, offset) {
          return (data[offset] << 24) | (data[offset+1] << 16) | (data[offset+2] << 8) | data[offset+3];
        }
        
        function readBoxes(data, start = 0, end = data.length) {
          const boxes = [];
          let offset = start;
          while (offset < end - 8) {
            const size = readUint32BE(data, offset);
            if (size < 8 || offset + size > end) break;
            const type = String.fromCharCode(data[offset+4], data[offset+5], data[offset+6], data[offset+7]);
            boxes.push({ type, offset, size, dataOffset: offset + 8, dataSize: size - 8 });
            offset += size;
          }
          return boxes;
        }
        
        function findBox(data, start, end, type) {
          const boxes = readBoxes(data, start, end);
          return boxes.find(b => b.type === type);
        }
        
        function findBoxRecursive(data, start, end, types) {
          let current = { dataOffset: start, dataSize: end - start };
          for (const type of types) {
            const box = findBox(data, current.dataOffset, current.dataOffset + current.dataSize, type);
            if (!box) return null;
            current = box;
          }
          return current;
        }
        
        // Find avcC in moov > trak > mdia > minf > stbl > stsd > avc1 > avcC
        const moov = findBox(trackData, 0, trackData.length, 'moov');
        if (!moov) throw new Error('No moov box found');
        
        const trak = findBox(trackData, moov.dataOffset, moov.dataOffset + moov.dataSize, 'trak');
        if (!trak) throw new Error('No trak box found');
        
        const mdia = findBox(trackData, trak.dataOffset, trak.dataOffset + trak.dataSize, 'mdia');
        if (!mdia) throw new Error('No mdia box found');
        
        const minf = findBox(trackData, mdia.dataOffset, mdia.dataOffset + mdia.dataSize, 'minf');
        if (!minf) throw new Error('No minf box found');
        
        const stbl = findBox(trackData, minf.dataOffset, minf.dataOffset + minf.dataSize, 'stbl');
        if (!stbl) throw new Error('No stbl box found');
        
        const stsd = findBox(trackData, stbl.dataOffset, stbl.dataOffset + stbl.dataSize, 'stsd');
        if (!stsd) throw new Error('No stsd box found');
        
        // stsd has 8 bytes header (version + flags + entry_count)
        const stsdDataStart = stsd.dataOffset + 8;
        const avc1 = findBox(trackData, stsdDataStart, stsd.dataOffset + stsd.dataSize, 'avc1');
        if (!avc1) throw new Error('No avc1 box found');
        
        // avc1 has 78 bytes of fixed data before child boxes
        const avc1ChildrenStart = avc1.dataOffset + 78;
        const avcC = findBox(trackData, avc1ChildrenStart, avc1.dataOffset + avc1.dataSize, 'avcC');
        if (!avcC) throw new Error('No avcC box found');
        
        console.log('Found avcC at offset', avcC.offset, 'size', avcC.size);
        
        // Extract description (avcC contents without box header)
        const description = trackData.slice(avcC.dataOffset, avcC.dataOffset + avcC.dataSize);
        console.log('avcC description length:', description.length);
        
        // Parse avcC to get codec string
        const profileIdc = description[1];
        const profileCompat = description[2];
        const levelIdc = description[3];
        const codecString = 'avc1.' + 
          profileIdc.toString(16).padStart(2, '0') + 
          profileCompat.toString(16).padStart(2, '0') + 
          levelIdc.toString(16).padStart(2, '0');
        console.log('Codec string:', codecString);
        
        // Check if VideoDecoder supports this config
        // Get dimensions from mdhd or tkhd - for now use constants for bars-n-tone.mp4
        const config = {
          codec: codecString,
          codedWidth: 1920,
          codedHeight: 1080,
          description: description,
        };
        
        console.log('Checking VideoDecoder.isConfigSupported...');
        const support = await VideoDecoder.isConfigSupported(config);
        console.log('isConfigSupported result:', JSON.stringify(support));
        
        if (!support.supported) {
          return { success: false, error: 'Codec not supported: ' + codecString };
        }
        
        // Find first moof/mdat to get a sample
        const moof = findBox(trackData, 0, trackData.length, 'moof');
        const mdat = findBox(trackData, 0, trackData.length, 'mdat');
        
        if (!moof || !mdat) {
          return { success: false, error: 'No moof/mdat found' };
        }
        
        console.log('Found moof at', moof.offset, 'mdat at', mdat.offset);
        
        // Parse traf > trun to get sample sizes
        const traf = findBox(trackData, moof.dataOffset, moof.dataOffset + moof.dataSize, 'traf');
        if (!traf) return { success: false, error: 'No traf found' };
        
        const trun = findBox(trackData, traf.dataOffset, traf.dataOffset + traf.dataSize, 'trun');
        if (!trun) return { success: false, error: 'No trun found' };
        
        // Parse trun to get first sample size
        // trun: version(1) + flags(3) + sample_count(4) + [data_offset(4)] + [first_sample_flags(4)] + per-sample data
        const trunData = trackData.slice(trun.dataOffset, trun.dataOffset + trun.dataSize);
        const trunVersion = trunData[0];
        const trunFlags = (trunData[1] << 16) | (trunData[2] << 8) | trunData[3];
        const sampleCount = readUint32BE(trunData, 4);
        console.log('trun: version=' + trunVersion + ', flags=0x' + trunFlags.toString(16) + ', samples=' + sampleCount);
        
        // Calculate offsets based on flags
        let offset = 8; // past version/flags/sample_count
        if (trunFlags & 0x001) offset += 4; // data_offset present
        if (trunFlags & 0x004) offset += 4; // first_sample_flags present
        
        // Read first sample size (if sample_size flag is set)
        let firstSampleSize = 0;
        if (trunFlags & 0x200) { // sample_size_present
          // Per-sample: [duration][size][flags][cts_offset]
          if (trunFlags & 0x100) offset += 4; // sample_duration
          firstSampleSize = readUint32BE(trunData, offset);
          console.log('First sample size from trun:', firstSampleSize);
        }
        
        // Get just the first sample from mdat
        const mdatStart = mdat.dataOffset;
        const sampleData = firstSampleSize > 0 
          ? trackData.slice(mdatStart, mdatStart + firstSampleSize)
          : trackData.slice(mdatStart, mdatStart + 50000); // fallback: first 50KB
        console.log('Sample data size:', sampleData.length);
        
        // Create VideoDecoder
        console.log('Creating VideoDecoder...');
        let frameDecoded = false;
        let decodeError = null;
        
        const decoder = new VideoDecoder({
          output: (frame) => {
            console.log('Frame decoded! Size:', frame.codedWidth, 'x', frame.codedHeight);
            frameDecoded = true;
            frame.close();
          },
          error: (e) => {
            console.error('Decoder error:', e.message);
            decodeError = e.message;
          },
        });
        
        console.log('Configuring decoder...');
        decoder.configure(config);
        
        console.log('Decoder state after configure:', decoder.state);
        
        // Create EncodedVideoChunk and decode
        console.log('Creating EncodedVideoChunk...');
        const chunk = new EncodedVideoChunk({
          type: 'key',
          timestamp: 0,
          duration: 33333, // ~30fps
          data: sampleData,
        });
        
        console.log('Decoding chunk...');
        decoder.decode(chunk);
        
        console.log('Flushing decoder...');
        await decoder.flush();
        
        console.log('Decoder state after flush:', decoder.state);
        
        if (decodeError) {
          return { success: false, error: decodeError };
        }
        
        if (!frameDecoded) {
          return { success: false, error: 'No frame was decoded' };
        }
        
        return { success: true, message: 'VideoDecoder works!' };
      })()
    \`);
    
    console.log('Test result:', JSON.stringify(result));
    
    if (result.success) {
      console.log('\\n=== SUCCESS: VideoDecoder works in this environment! ===');
      app.exit(0);
    } else {
      console.log('\\n=== FAILURE:', result.error, '===');
      app.exit(1);
    }
  } catch (e) {
    console.error('Test failed with exception:', e.message);
    app.exit(1);
  }
});
`;

writeFileSync(ELECTRON_SCRIPT, electronMainCode);
console.log("  Created electron test script: " + ELECTRON_SCRIPT);

// Step 6: Run the Electron test
console.log("\nStep 5: Running Electron test...");

const electronPath = join(
  __dirname,
  "../../node_modules/electron/dist/electron",
);
console.log("  Electron path: " + electronPath);

// Use xvfb-run to provide a virtual display
const electronProcess = spawn(
  "xvfb-run",
  [
    "--auto-servernum",
    "--server-args=-screen 0 1920x1080x24",
    electronPath,
    "--no-sandbox",
    "--disable-dev-shm-usage",
    ELECTRON_SCRIPT,
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
    },
  },
);

electronProcess.on("close", (code) => {
  console.log("\nElectron process exited with code:", code);
  process.exit(code ?? 1);
});

electronProcess.on("error", (err) => {
  console.error("Failed to start Electron:", err);
  process.exit(1);
});
