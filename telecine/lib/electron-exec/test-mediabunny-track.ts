/**
 * Test that loads the processed track-1.mp4 through mediabunny
 * to isolate whether the issue is with the file format or mediabunny
 * 
 * Run with: ./scripts/npx tsx lib/electron-exec/test-mediabunny-track.ts
 */

import { spawn, execSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(__dirname, "test-mediabunny-tmp");

// Ensure test directory exists
if (!existsSync(TEST_DIR)) {
  mkdirSync(TEST_DIR, { recursive: true });
}

// The actual processed track file from the ingestion pipeline
const PROCESSED_TRACK = join(__dirname, "../../data/video2/546d22e2-28cc-420b-949e-41429b2effca/01f6edbd-a850-4db9-afb4-1352d3135972/track-1.mp4");
const TRACKS_JSON = join(__dirname, "../../data/video2/546d22e2-28cc-420b-949e-41429b2effca/01f6edbd-a850-4db9-afb4-1352d3135972/tracks.json");

const ELECTRON_SCRIPT = join(TEST_DIR, "electron-test.cjs");
const PRELOAD_SCRIPT = join(TEST_DIR, "preload.cjs");
const HTML_FILE = join(TEST_DIR, "test.html");

console.log("=== Mediabunny Track File Test ===\n");

// Check if track file exists
if (!existsSync(PROCESSED_TRACK)) {
  console.error("Processed track not found:", PROCESSED_TRACK);
  console.error("Run bars-video.test.ts first to generate it");
  process.exit(1);
}

console.log("Track file:", PROCESSED_TRACK);

// Read tracks.json to get segment info
const tracksJson = JSON.parse(readFileSync(TRACKS_JSON, "utf-8"));
const videoTrack = tracksJson["1"];
console.log("Video track info:", JSON.stringify(videoTrack, null, 2));

// Read the track file
const trackData = readFileSync(PROCESSED_TRACK);
console.log("Track file size:", trackData.length, "bytes");

// Extract init segment
const initSegment = trackData.slice(videoTrack.initSegment.offset, videoTrack.initSegment.offset + videoTrack.initSegment.size);
console.log("Init segment size:", initSegment.length, "bytes");

// Extract first media segment
const firstSegment = videoTrack.segments[0];
const mediaSegment = trackData.slice(firstSegment.offset, firstSegment.offset + firstSegment.size);
console.log("Media segment size:", mediaSegment.length, "bytes");

// Create combined data (init + media segment)
const combinedData = Buffer.concat([initSegment, mediaSegment]);
console.log("Combined data size:", combinedData.length, "bytes");

// Create preload script
writeFileSync(PRELOAD_SCRIPT, `
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('testData', {
  initSegmentBytes: [${Array.from(initSegment).join(",")}],
  mediaSegmentBytes: [${Array.from(mediaSegment).join(",")}],
  combinedBytes: [${Array.from(combinedData).join(",")}],
  trackInfo: ${JSON.stringify(videoTrack)},
});
`);

// Create HTML file - simple VideoDecoder test, no mediabunny
writeFileSync(HTML_FILE, `<!DOCTYPE html>
<html>
<head><title>VideoDecoder Test</title></head>
<body>
<h1>Testing VideoDecoder with processed track file</h1>
</body>
</html>`);

// Create electron main script - test VideoDecoder directly
writeFileSync(ELECTRON_SCRIPT, `
const { app, BrowserWindow } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('disable-dev-shm-usage');

app.whenReady().then(async () => {
  console.log('Electron ready...');
  
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
  console.log('Page loaded, running VideoDecoder test...');
  
  // Run VideoDecoder test in renderer - parse the fMP4 and decode
  const result = await win.webContents.executeJavaScript(\`
    (async function() {
      console.log('Starting VideoDecoder test with processed track data...');
      const combinedData = new Uint8Array(window.testData.combinedBytes);
      console.log('Combined data size:', combinedData.length);
      
      // Helper functions
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
      
      try {
        // Parse top-level boxes
        const topBoxes = readBoxes(combinedData);
        console.log('Top-level boxes:', topBoxes.map(b => b.type + '(' + b.size + ')').join(', '));
        
        // Find moov
        const moov = findBox(combinedData, 0, combinedData.length, 'moov');
        if (!moov) throw new Error('No moov box');
        console.log('Found moov at offset', moov.offset);
        
        // Find trak
        const trak = findBox(combinedData, moov.dataOffset, moov.dataOffset + moov.dataSize, 'trak');
        if (!trak) throw new Error('No trak box');
        
        // Find mdia
        const mdia = findBox(combinedData, trak.dataOffset, trak.dataOffset + trak.dataSize, 'mdia');
        if (!mdia) throw new Error('No mdia box');
        
        // Find minf
        const minf = findBox(combinedData, mdia.dataOffset, mdia.dataOffset + mdia.dataSize, 'minf');
        if (!minf) throw new Error('No minf box');
        
        // Find stbl
        const stbl = findBox(combinedData, minf.dataOffset, minf.dataOffset + minf.dataSize, 'stbl');
        if (!stbl) throw new Error('No stbl box');
        
        // Find stsd
        const stsd = findBox(combinedData, stbl.dataOffset, stbl.dataOffset + stbl.dataSize, 'stsd');
        if (!stsd) throw new Error('No stsd box');
        
        // stsd has 8 bytes header
        const stsdDataStart = stsd.dataOffset + 8;
        const avc1 = findBox(combinedData, stsdDataStart, stsd.dataOffset + stsd.dataSize, 'avc1');
        if (!avc1) throw new Error('No avc1 box');
        console.log('Found avc1 at offset', avc1.offset);
        
        // avc1 has 78 bytes of fixed data before child boxes
        const avc1ChildrenStart = avc1.dataOffset + 78;
        const avcC = findBox(combinedData, avc1ChildrenStart, avc1.dataOffset + avc1.dataSize, 'avcC');
        if (!avcC) throw new Error('No avcC box');
        console.log('Found avcC at offset', avcC.offset, 'size', avcC.size);
        
        // Extract avcC description
        const description = combinedData.slice(avcC.dataOffset, avcC.dataOffset + avcC.dataSize);
        console.log('avcC description length:', description.length);
        
        // Parse codec string from avcC
        const profileIdc = description[1];
        const profileCompat = description[2];
        const levelIdc = description[3];
        const codecString = 'avc1.' + 
          profileIdc.toString(16).padStart(2, '0') + 
          profileCompat.toString(16).padStart(2, '0') + 
          levelIdc.toString(16).padStart(2, '0');
        console.log('Codec string:', codecString);
        
        // Find moof/mdat
        const moof = findBox(combinedData, 0, combinedData.length, 'moof');
        const mdat = findBox(combinedData, 0, combinedData.length, 'mdat');
        if (!moof || !mdat) throw new Error('No moof/mdat');
        console.log('Found moof at', moof.offset, 'mdat at', mdat.offset);
        
        // Parse trun to get sample sizes
        const traf = findBox(combinedData, moof.dataOffset, moof.dataOffset + moof.dataSize, 'traf');
        if (!traf) throw new Error('No traf');
        
        const trun = findBox(combinedData, traf.dataOffset, traf.dataOffset + traf.dataSize, 'trun');
        if (!trun) throw new Error('No trun');
        
        const trunData = combinedData.slice(trun.dataOffset, trun.dataOffset + trun.dataSize);
        const trunFlags = (trunData[1] << 16) | (trunData[2] << 8) | trunData[3];
        const sampleCount = readUint32BE(trunData, 4);
        console.log('trun flags:', trunFlags.toString(16), 'sample_count:', sampleCount);
        
        // Get first sample size
        let offset = 8;
        if (trunFlags & 0x001) offset += 4; // data_offset
        if (trunFlags & 0x004) offset += 4; // first_sample_flags
        
        let firstSampleSize = 0;
        if (trunFlags & 0x200) {
          if (trunFlags & 0x100) offset += 4; // sample_duration
          firstSampleSize = readUint32BE(trunData, offset);
        }
        console.log('First sample size:', firstSampleSize);
        
        // Get sample data
        const sampleData = firstSampleSize > 0
          ? combinedData.slice(mdat.dataOffset, mdat.dataOffset + firstSampleSize)
          : combinedData.slice(mdat.dataOffset, mdat.dataOffset + 50000);
        console.log('Sample data size:', sampleData.length);
        
        // Configure VideoDecoder
        const config = {
          codec: codecString,
          codedWidth: 1920,
          codedHeight: 1080,
          description: description,
        };
        
        console.log('Checking isConfigSupported...');
        const support = await VideoDecoder.isConfigSupported(config);
        console.log('Support:', JSON.stringify(support));
        
        if (!support.supported) {
          return { success: false, error: 'Codec not supported' };
        }
        
        console.log('Creating VideoDecoder...');
        let frameDecoded = false;
        let decodeError = null;
        
        const decoder = new VideoDecoder({
          output: (frame) => {
            console.log('Frame decoded:', frame.codedWidth, 'x', frame.codedHeight);
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
        console.log('Decoder state:', decoder.state);
        
        console.log('Creating EncodedVideoChunk...');
        const chunk = new EncodedVideoChunk({
          type: 'key',
          timestamp: 0,
          duration: 33333,
          data: sampleData,
        });
        
        console.log('Decoding...');
        decoder.decode(chunk);
        
        console.log('Flushing...');
        await decoder.flush();
        
        console.log('Decoder final state:', decoder.state);
        
        if (decodeError) {
          return { success: false, error: decodeError };
        }
        
        if (!frameDecoded) {
          return { success: false, error: 'No frame decoded' };
        }
        
        return { success: true };
      } catch (e) {
        console.error('Test error:', e);
        return { success: false, error: e.message };
      }
    })()
  \`);
  
  console.log('Test result:', JSON.stringify(result));
  
  if (result.success) {
    console.log('SUCCESS!');
    app.exit(0);
  } else {
    console.log('FAILED:', result.error);
    app.exit(1);
  }
});
`);

console.log("\nRunning Electron test...");

const electronPath = join(__dirname, "../../node_modules/electron/dist/electron");

const electronProcess = spawn("xvfb-run", [
  "--auto-servernum",
  "--server-args=-screen 0 1920x1080x24",
  electronPath,
  "--no-sandbox",
  "--disable-dev-shm-usage",
  ELECTRON_SCRIPT,
], {
  stdio: "inherit",
  env: {
    ...process.env,
  },
});

electronProcess.on("close", (code) => {
  console.log("\nElectron process exited with code:", code);
  process.exit(code ?? 1);
});

electronProcess.on("error", (err) => {
  console.error("Failed to start Electron:", err);
  process.exit(1);
});
