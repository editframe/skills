/**
 * Test different Chromium flags in Docker to find a working VideoDecoder config
 * 
 * Run with: ./scripts/npx tsx lib/electron-exec/test-docker-flags.ts
 */

import { spawn } from "node:child_process";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(__dirname, "test-docker-flags-tmp");

if (!existsSync(TEST_DIR)) {
  mkdirSync(TEST_DIR, { recursive: true });
}

// Read the raw bytes
const trackFile = join(__dirname, "../../data/video2/546d22e2-28cc-420b-949e-41429b2effca/01f6edbd-a850-4db9-afb4-1352d3135972/track-1.mp4");
const tracksJsonFile = join(__dirname, "../../data/video2/546d22e2-28cc-420b-949e-41429b2effca/01f6edbd-a850-4db9-afb4-1352d3135972/tracks.json");

if (!existsSync(trackFile) || !existsSync(tracksJsonFile)) {
  console.error("Track files not found!");
  process.exit(1);
}

const tracksJson = JSON.parse(readFileSync(tracksJsonFile, "utf-8"));
const track = tracksJson["1"];
const trackData = readFileSync(trackFile);

const initBytes = trackData.subarray(track.initSegment.offset, track.initSegment.offset + track.initSegment.size);
const seg0Bytes = trackData.subarray(track.segments[0].offset, track.segments[0].offset + track.segments[0].size);
const combinedBytes = Buffer.concat([initBytes, seg0Bytes]);

console.log("=== Docker VideoDecoder Flag Test ===");
console.log("Combined bytes:", combinedBytes.length);

// Write data
const dataFile = join(TEST_DIR, "video-data.bin");
writeFileSync(dataFile, combinedBytes);

// Different flag configurations to try
const flagConfigs = [
  {
    name: "minimal (just no-sandbox)",
    flags: [],
  },
  {
    name: "software rendering",
    flags: [
      "disable-gpu",
      "disable-software-rasterizer", 
    ],
  },
  {
    name: "swiftshader",
    flags: [
      "use-gl=swiftshader",
      "disable-gpu-sandbox",
    ],
  },
  {
    name: "angle on vulkan",
    flags: [
      "use-gl=angle",
      "use-angle=vulkan",
    ],
  },
  {
    name: "in-process-gpu",
    flags: [
      "in-process-gpu",
    ],
  },
];

const configIndex = parseInt(process.argv[2] || "0");
const config = flagConfigs[configIndex];

if (!config) {
  console.log("Usage: test-docker-flags.ts [config_index]");
  console.log("Available configs:");
  flagConfigs.forEach((c, i) => console.log(`  ${i}: ${c.name}`));
  process.exit(1);
}

console.log(`\nTesting config ${configIndex}: ${config.name}`);
console.log("Flags:", config.flags);

// HTML file
const htmlFile = join(TEST_DIR, "test.html");
const htmlContent = `<!DOCTYPE html>
<html><head><title>VideoDecoder Test</title></head>
<body>
<h1>VideoDecoder Test (Docker)</h1>
<pre id="log"></pre>
<script>
const log = (msg) => {
  console.log(msg);
  document.getElementById('log').textContent += msg + '\\n';
};

async function test() {
  try {
    log('Starting VideoDecoder test...');
    log('Config: ${config.name}');
    
    const bytes = new Uint8Array(window.testData.bytes);
    const buffer = bytes.buffer;
    const view = new DataView(buffer);
    log('Got ' + buffer.byteLength + ' bytes');
    
    // Parse boxes
    function findBox(offset, end, type) {
      while (offset + 8 <= end) {
        const size = view.getUint32(offset);
        if (size < 8 || offset + size > end) break;
        const t = String.fromCharCode(view.getUint8(offset+4), view.getUint8(offset+5), view.getUint8(offset+6), view.getUint8(offset+7));
        if (t === type) return { offset, size, content: offset + 8 };
        offset += size;
      }
      return null;
    }
    
    const moov = findBox(0, buffer.byteLength, 'moov');
    const trak = findBox(moov.content, moov.offset + moov.size, 'trak');
    const mdia = findBox(trak.content, trak.offset + trak.size, 'mdia');
    const minf = findBox(mdia.content, mdia.offset + mdia.size, 'minf');
    const stbl = findBox(minf.content, minf.offset + minf.size, 'stbl');
    const stsd = findBox(stbl.content, stbl.offset + stbl.size, 'stsd');
    const avc1 = findBox(stsd.content + 8, stsd.offset + stsd.size, 'avc1');
    
    let avcC = null;
    for (let scan = avc1.content; scan < avc1.offset + avc1.size - 8; scan++) {
      const t = String.fromCharCode(view.getUint8(scan+4), view.getUint8(scan+5), view.getUint8(scan+6), view.getUint8(scan+7));
      if (t === 'avcC') { avcC = { offset: scan, size: view.getUint32(scan), content: scan + 8 }; break; }
    }
    const avcCData = new Uint8Array(buffer, avcC.content, avcC.size - 8);
    
    const moof = findBox(moov.offset + moov.size, buffer.byteLength, 'moof');
    const mdat = findBox(moof.offset + moof.size, buffer.byteLength, 'mdat');
    const traf = findBox(moof.content, moof.offset + moof.size, 'traf');
    const trun = findBox(traf.content, traf.offset + traf.size, 'trun');
    const flags = view.getUint32(trun.content) & 0xFFFFFF;
    const sampleCount = view.getUint32(trun.content + 4);
    
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
    
    log('Creating VideoDecoder...');
    let outputCount = 0;
    
    const decoder = new VideoDecoder({
      output: (frame) => {
        outputCount++;
        log('FRAME ' + outputCount + ': ' + frame.codedWidth + 'x' + frame.codedHeight);
        frame.close();
      },
      error: (e) => log('ERROR: ' + e.message)
    });
    
    decoder.configure({
      codec: window.testData.codec,
      codedWidth: window.testData.width,
      codedHeight: window.testData.height,
      description: avcCData,
      hardwareAcceleration: 'prefer-software',
    });
    log('Decoder state: ' + decoder.state);
    
    // Decode just 3 samples to test
    for (let i = 0; i < Math.min(3, samples.length); i++) {
      const s = samples[i];
      const chunk = new EncodedVideoChunk({
        type: s.keyframe ? 'key' : 'delta',
        timestamp: i * 33333,
        duration: 33333,
        data: new Uint8Array(buffer, s.offset, s.size),
      });
      log('decode(' + i + ')...');
      decoder.decode(chunk);
      await new Promise(r => setTimeout(r, 200));
      log('  outputCount=' + outputCount);
    }
    
    await decoder.flush();
    decoder.close();
    
    log('DONE: ' + outputCount + ' frames');
    window.testResult = { success: outputCount > 0, frames: outputCount };
    
  } catch (e) {
    log('ERROR: ' + e.message);
    window.testResult = { success: false, error: e.message };
  }
}
test();
</script>
</body>
</html>`;

writeFileSync(htmlFile, htmlContent);

// Preload
const preloadCode = `
const { contextBridge } = require('electron');
const fs = require('fs');
const bytes = fs.readFileSync(${JSON.stringify(dataFile)});
const arr = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.length);
contextBridge.exposeInMainWorld('testData', {
  bytes: Array.from(arr),
  codec: "${track.codec}",
  width: ${track.width},
  height: ${track.height},
});
`;
writeFileSync(join(TEST_DIR, "preload.cjs"), preloadCode);

// Electron main with configurable flags
const flagsCode = config.flags.map(f => {
  const [key, val] = f.split('=');
  return val ? `app.commandLine.appendSwitch('${key}', '${val}');` : `app.commandLine.appendSwitch('${key}');`;
}).join('\n');

const electronCode = `
const { app, BrowserWindow } = require('electron');
const path = require('path');

// Apply test flags
${flagsCode}

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 800, height: 600, show: false, // Match ElectronEngine config
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      offscreen: true, // Match ElectronEngine config
    },
  });
  
  win.webContents.on('console-message', (e, level, msg) => console.log('[R]', msg));
  win.webContents.on('render-process-gone', (e, d) => {
    console.log('CRASH:', d.reason, d.exitCode);
    process.exit(1);
  });
  
  await win.loadFile(${JSON.stringify(htmlFile)});
  
  setTimeout(async () => {
    try {
      const result = await win.webContents.executeJavaScript('window.testResult');
      console.log('Result:', JSON.stringify(result));
      process.exit(result?.success ? 0 : 1);
    } catch (e) {
      console.log('No result');
      process.exit(1);
    }
  }, 10000);
});
`;

writeFileSync(join(TEST_DIR, "electron-test.cjs"), electronCode);

console.log("\nRunning...\n");

const electron = spawn(
  join(__dirname, "../../node_modules/.bin/electron"),
  ["--no-sandbox", join(TEST_DIR, "electron-test.cjs")],
  { stdio: "inherit", env: { ...process.env, DISPLAY: process.env.DISPLAY || ":99" } }
);

electron.on("close", (code) => {
  console.log("\nExit code:", code);
  process.exit(code || 0);
});
