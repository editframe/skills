/**
 * Test mediabunny with the ORIGINAL bars-n-tone.mp4 (non-fragmented)
 * to see if the crash is specific to fMP4 format
 *
 * Run with: ./scripts/npx tsx lib/electron-exec/test-mediabunny-original.ts
 */

import { spawn } from "node:child_process";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(__dirname, "test-mediabunny-original-tmp");

// Ensure test directory exists
if (!existsSync(TEST_DIR)) {
  mkdirSync(TEST_DIR, { recursive: true });
}

// The ORIGINAL non-fragmented MP4
const ORIGINAL_FILE = join(
  __dirname,
  "../../lib/process-file/test-files/bars-n-tone.mp4",
);

const ELECTRON_SCRIPT = join(TEST_DIR, "electron-test.cjs");
const PRELOAD_SCRIPT = join(TEST_DIR, "preload.cjs");
const HTML_FILE = join(TEST_DIR, "test.html");

console.log("=== Mediabunny Original MP4 Test ===\n");

if (!existsSync(ORIGINAL_FILE)) {
  console.error("Original file not found:", ORIGINAL_FILE);
  process.exit(1);
}

console.log("Original file:", ORIGINAL_FILE);

// Read the file
const fileData = readFileSync(ORIGINAL_FILE);
console.log("File size:", fileData.length, "bytes");

// Create preload script
writeFileSync(
  PRELOAD_SCRIPT,
  `
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('testData', {
  fileBytes: [${Array.from(fileData).join(",")}],
});
`,
);

// Create HTML file - simple VideoDecoder test
writeFileSync(
  HTML_FILE,
  `<!DOCTYPE html>
<html>
<head><title>Mediabunny Original Test</title></head>
<body>
<h1>Testing mediabunny with original MP4</h1>
<script type="module">
import { BufferSource, Input, MP4, VideoSampleSink } from "/node_modules/mediabunny/dist/bundles/mediabunny.mjs";

async function runTest() {
  try {
    console.log('Starting mediabunny test with original MP4...');
    const fileData = new Uint8Array(window.testData.fileBytes);
    console.log('File data size:', fileData.length);
    
    const bufferSource = new BufferSource(fileData.buffer);
    console.log('BufferSource created');
    
    const input = new Input({
      source: bufferSource,
      formats: [MP4],
    });
    console.log('Input created');
    
    const videoTracks = await input.getVideoTracks();
    console.log('Video tracks:', videoTracks.length);
    
    if (videoTracks.length === 0) {
      return { success: false, error: 'No video tracks' };
    }
    
    const videoTrack = videoTracks[0];
    console.log('Video track:', videoTrack.id, videoTrack.type);
    
    const decoderConfig = await videoTrack.getDecoderConfig();
    console.log('Decoder config:', JSON.stringify({
      codec: decoderConfig?.codec,
      codedWidth: decoderConfig?.codedWidth,
      codedHeight: decoderConfig?.codedHeight,
      descriptionLength: decoderConfig?.description?.byteLength,
    }));
    
    console.log('Creating VideoSampleSink...');
    const videoSink = new VideoSampleSink(videoTrack);
    console.log('VideoSampleSink created');
    
    console.log('Getting samples iterator...');
    const samplesIterator = videoSink.samples();
    console.log('Got iterator, calling next()...');
    
    const { done, value: sample } = await samplesIterator.next();
    console.log('iterator.next() returned:', done, !!sample);
    
    if (sample) {
      console.log('Sample timestamp:', sample.timestamp);
      console.log('Sample duration:', sample.duration);
      
      console.log('Converting to VideoFrame...');
      const frame = sample.toVideoFrame();
      console.log('VideoFrame:', frame.codedWidth, 'x', frame.codedHeight);
      frame.close();
      
      return { success: true };
    }
    
    return { success: false, error: 'No sample' };
  } catch (e) {
    console.error('Test failed:', e);
    return { success: false, error: e.message };
  }
}

runTest().then(result => {
  console.log('Test result:', JSON.stringify(result));
  window.testResult = result;
});
</script>
</body>
</html>`,
);

// Create electron main script
writeFileSync(
  ELECTRON_SCRIPT,
  `
const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('disable-dev-shm-usage');

app.whenReady().then(async () => {
  console.log('Electron ready...');
  
  // Register file protocol for node_modules
  protocol.registerFileProtocol('file', (request, callback) => {
    let url = request.url.replace('file://', '');
    if (url.startsWith('/node_modules/')) {
      url = path.join(process.cwd(), url);
    }
    callback({ path: url });
  });
  
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      sandbox: false,
      offscreen: true,
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

  await win.loadFile(${JSON.stringify(HTML_FILE)});
  console.log('Page loaded, waiting for test...');
  
  // Wait for test with timeout
  const startTime = Date.now();
  while (Date.now() - startTime < 30000) {
    await new Promise(r => setTimeout(r, 100));
    const result = await win.webContents.executeJavaScript('window.testResult');
    if (result) {
      console.log('Final result:', JSON.stringify(result));
      app.exit(result.success ? 0 : 1);
      return;
    }
  }
  
  console.error('Test timed out');
  app.exit(1);
});
`,
);

console.log("\nRunning Electron test...");

const electronPath = join(
  __dirname,
  "../../node_modules/electron/dist/electron",
);

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
    cwd: join(__dirname, "../.."),
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
