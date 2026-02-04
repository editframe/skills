/**
 * Standalone VideoDecoder test - runs on HOST machine (not Docker)
 * 
 * Run directly with: npx tsx lib/electron-exec/test-host-videodecoder.ts
 */

import { spawn } from "node:child_process";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(__dirname, "test-host-tmp");

if (!existsSync(TEST_DIR)) {
  mkdirSync(TEST_DIR, { recursive: true });
}

// Read the raw bytes from disk
const trackFile = join(__dirname, "../../data/video2/546d22e2-28cc-420b-949e-41429b2effca/01f6edbd-a850-4db9-afb4-1352d3135972/track-1.mp4");
const tracksJsonFile = join(__dirname, "../../data/video2/546d22e2-28cc-420b-949e-41429b2effca/01f6edbd-a850-4db9-afb4-1352d3135972/tracks.json");

if (!existsSync(trackFile) || !existsSync(tracksJsonFile)) {
  console.error("Track files not found!");
  console.error("Expected:", trackFile);
  process.exit(1);
}

const tracksJson = JSON.parse(readFileSync(tracksJsonFile, "utf-8"));
const track = tracksJson["1"];
const trackData = readFileSync(trackFile);

const initBytes = trackData.subarray(
  track.initSegment.offset,
  track.initSegment.offset + track.initSegment.size
);
const seg0Bytes = trackData.subarray(
  track.segments[0].offset,
  track.segments[0].offset + track.segments[0].size
);

const combinedBytes = Buffer.concat([initBytes, seg0Bytes]);

console.log("=== Host VideoDecoder Test ===");
console.log("Track file:", trackFile);
console.log("Combined bytes:", combinedBytes.length);
console.log("Codec:", track.codec);
console.log("Dimensions:", track.width, "x", track.height);

// Write combined bytes to a file
const dataFile = join(TEST_DIR, "video-data.bin");
writeFileSync(dataFile, combinedBytes);

// Create HTML file
const htmlFile = join(TEST_DIR, "test.html");
const htmlContent = `<!DOCTYPE html>
<html><head><title>VideoDecoder Test</title></head>
<body>
<h1>VideoDecoder Test (Host)</h1>
<pre id="log"></pre>
<script>
const log = (msg) => {
  console.log(msg);
  document.getElementById('log').textContent += msg + '\\n';
};

async function test() {
  try {
    log('Starting VideoDecoder test on HOST...');
    log('Codec: ' + window.testData.codec);
    log('Dimensions: ' + window.testData.width + 'x' + window.testData.height);
    
    const bytes = new Uint8Array(window.testData.bytes);
    const buffer = bytes.buffer;
    const view = new DataView(buffer);
    log('Got ' + buffer.byteLength + ' bytes');
    
    // Parse fMP4 boxes
    function findBox(offset, end, type) {
      while (offset + 8 <= end) {
        const size = view.getUint32(offset);
        if (size < 8 || offset + size > end) break;
        const t = String.fromCharCode(
          view.getUint8(offset+4), view.getUint8(offset+5),
          view.getUint8(offset+6), view.getUint8(offset+7)
        );
        if (t === type) return { offset, size, content: offset + 8 };
        offset += size;
      }
      return null;
    }
    
    const moov = findBox(0, buffer.byteLength, 'moov');
    log('moov at ' + moov.offset + ', size ' + moov.size);
    
    const trak = findBox(moov.content, moov.offset + moov.size, 'trak');
    const mdia = findBox(trak.content, trak.offset + trak.size, 'mdia');
    const minf = findBox(mdia.content, mdia.offset + mdia.size, 'minf');
    const stbl = findBox(minf.content, minf.offset + minf.size, 'stbl');
    const stsd = findBox(stbl.content, stbl.offset + stbl.size, 'stsd');
    const avc1 = findBox(stsd.content + 8, stsd.offset + stsd.size, 'avc1');
    
    // Scan for avcC
    let avcC = null;
    for (let scan = avc1.content; scan < avc1.offset + avc1.size - 8; scan++) {
      const t = String.fromCharCode(
        view.getUint8(scan+4), view.getUint8(scan+5),
        view.getUint8(scan+6), view.getUint8(scan+7)
      );
      if (t === 'avcC') {
        avcC = { offset: scan, size: view.getUint32(scan), content: scan + 8 };
        break;
      }
    }
    log('avcC at ' + avcC.offset + ', size ' + avcC.size);
    
    const avcCData = new Uint8Array(buffer, avcC.content, avcC.size - 8);
    
    // Find moof and mdat
    const moof = findBox(moov.offset + moov.size, buffer.byteLength, 'moof');
    const mdat = findBox(moof.offset + moof.size, buffer.byteLength, 'mdat');
    log('mdat at ' + mdat.offset + ', size ' + mdat.size);
    
    // Parse trun
    const traf = findBox(moof.content, moof.offset + moof.size, 'traf');
    const trun = findBox(traf.content, traf.offset + traf.size, 'trun');
    const flags = view.getUint32(trun.content) & 0xFFFFFF;
    const sampleCount = view.getUint32(trun.content + 4);
    log('trun: ' + sampleCount + ' samples');
    
    let off = trun.content + 8;
    if (flags & 0x1) off += 4;
    if (flags & 0x4) off += 4;
    
    const samples = [];
    let dataOff = mdat.content;
    for (let i = 0; i < sampleCount; i++) {
      let size = 0, sampleFlags = 0;
      if (flags & 0x100) off += 4;
      if (flags & 0x200) { size = view.getUint32(off); off += 4; }
      if (flags & 0x400) { sampleFlags = view.getUint32(off); off += 4; }
      if (flags & 0x800) off += 4;
      samples.push({ offset: dataOff, size, keyframe: (sampleFlags & 0x10000) === 0 });
      dataOff += size;
    }
    log('Parsed ' + samples.length + ' samples');
    
    // Create VideoDecoder
    log('\\nCreating VideoDecoder...');
    let outputCount = 0;
    
    const decoder = new VideoDecoder({
      output: (frame) => {
        outputCount++;
        log('FRAME ' + outputCount + ': ' + frame.codedWidth + 'x' + frame.codedHeight + ' ts=' + frame.timestamp);
        frame.close();
        
        if (outputCount >= 5) {
          window.testResult = { success: true, frames: outputCount };
        }
      },
      error: (e) => {
        log('DECODER ERROR: ' + e.message);
        window.testResult = { success: false, error: e.message };
      }
    });
    
    decoder.configure({
      codec: window.testData.codec,
      codedWidth: window.testData.width,
      codedHeight: window.testData.height,
      description: avcCData,
      hardwareAcceleration: 'prefer-software',
    });
    log('Decoder configured, state=' + decoder.state);
    
    // Decode samples
    const MAX = Math.min(10, samples.length);
    for (let i = 0; i < MAX; i++) {
      const s = samples[i];
      const chunk = new EncodedVideoChunk({
        type: s.keyframe ? 'key' : 'delta',
        timestamp: i * 33333,
        duration: 33333,
        data: new Uint8Array(buffer, s.offset, s.size),
      });
      log('decode(' + i + '): ' + chunk.type + ', ' + chunk.byteLength + 'b, queue=' + decoder.decodeQueueSize);
      decoder.decode(chunk);
      
      await new Promise(r => setTimeout(r, 100));
      log('  -> outputCount=' + outputCount);
    }
    
    log('\\nFlushing...');
    await decoder.flush();
    decoder.close();
    
    log('\\nDONE: ' + outputCount + ' frames decoded');
    window.testResult = { success: outputCount > 0, frames: outputCount };
    
  } catch (e) {
    log('ERROR: ' + e.message);
    log(e.stack);
    window.testResult = { success: false, error: e.message };
  }
}

test();
</script>
</body>
</html>`;

writeFileSync(htmlFile, htmlContent);

// Create preload script
const preloadCode = `
const { contextBridge } = require('electron');
const fs = require('fs');
const path = ${JSON.stringify(dataFile)};
const nodeBuffer = fs.readFileSync(path);
const arr = new Uint8Array(nodeBuffer.buffer, nodeBuffer.byteOffset, nodeBuffer.length);
contextBridge.exposeInMainWorld('testData', {
  bytes: Array.from(arr),
  codec: "${track.codec}",
  width: ${track.width},
  height: ${track.height},
});
console.log('Preload: loaded', arr.length, 'bytes');
`;

writeFileSync(join(TEST_DIR, "preload.cjs"), preloadCode);

// Create electron main script
const electronCode = `
const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
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
  
  await win.loadFile(${JSON.stringify(htmlFile)});
  
  setTimeout(async () => {
    try {
      const result = await win.webContents.executeJavaScript('window.testResult');
      console.log('\\nTest result:', JSON.stringify(result, null, 2));
      if (result?.success) {
        console.log('\\n=== SUCCESS ===');
        process.exit(0);
      } else {
        console.log('\\n=== FAILED (but no crash) ===');
        process.exit(1);
      }
    } catch (e) {
      console.log('Failed to get result:', e.message);
      process.exit(1);
    }
  }, 15000);
});
`;

writeFileSync(join(TEST_DIR, "electron-test.cjs"), electronCode);

console.log("\nRunning Electron on HOST...\n");

const electron = spawn(
  join(__dirname, "../../node_modules/.bin/electron"),
  [join(TEST_DIR, "electron-test.cjs")],
  {
    stdio: "inherit",
    env: process.env,
  }
);

electron.on("close", (code) => {
  console.log("\nElectron exited with code:", code);
  process.exit(code || 0);
});
