/**
 * Tests to isolate where the crash occurs:
 * 1. Raw bytes + mediabunny → CRASHES
 * 2. Raw bytes + direct VideoDecoder (no mediabunny) → ?
 */

import { describe, expect } from "vitest";
import { test as fixtureTest } from "../fixtures";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { bundleTestTemplate } from "../../test-utils/html-bundler";

describe("Exact Bytes Tests", () => {
  // Helper to get raw bytes from disk
  const getRawBytes = () => {
    const trackFile = join(process.cwd(), "data/video2/546d22e2-28cc-420b-949e-41429b2effca/01f6edbd-a850-4db9-afb4-1352d3135972/track-1.mp4");
    const tracksJsonFile = join(process.cwd(), "data/video2/546d22e2-28cc-420b-949e-41429b2effca/01f6edbd-a850-4db9-afb4-1352d3135972/tracks.json");
    
    if (!existsSync(trackFile) || !existsSync(tracksJsonFile)) {
      return null;
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
    
    return {
      combinedBytes: Buffer.concat([initBytes, seg0Bytes]),
      codec: track.codec,
      width: track.width,
      height: track.height,
    };
  };

  fixtureTest(
    "direct VideoDecoder with raw disk bytes (no mediabunny)",
    { timeout: 60000 },
    async ({ electronRPC, testAgent }) => {
      const data = getRawBytes();
      if (!data) {
        console.log("Track files not found, skipping");
        return;
      }
      
      const base64Data = data.combinedBytes.toString("base64");
      console.log("Combined bytes:", data.combinedBytes.length);
      console.log("Codec:", data.codec);
      
      // Test VideoDecoder directly - parse fMP4 ourselves, no mediabunny
      const html = /* HTML */ `
        <ef-timegroup class="w-[100px] h-[100px]" mode="fixed" duration="100ms">
          <div id="status">Testing direct VideoDecoder...</div>
        </ef-timegroup>
        <script type="module">
          window.testDirect = async function() {
            const log = (msg) => {
              console.log('[DIRECT]', msg);
              document.getElementById('status').textContent = msg;
            };
            
            try {
              log('Decoding base64...');
              const binary = atob("${base64Data}");
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
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
              
              // Find avcC in moov > trak > mdia > minf > stbl > stsd > avc1
              const moov = findBox(0, buffer.byteLength, 'moov');
              if (!moov) throw new Error('No moov box');
              log('moov at ' + moov.offset + ', size ' + moov.size);
              
              const trak = findBox(moov.content, moov.offset + moov.size, 'trak');
              if (!trak) throw new Error('No trak box');
              log('trak at ' + trak.offset);
              
              const mdia = findBox(trak.content, trak.offset + trak.size, 'mdia');
              if (!mdia) throw new Error('No mdia box');
              
              const minf = findBox(mdia.content, mdia.offset + mdia.size, 'minf');
              if (!minf) throw new Error('No minf box');
              
              const stbl = findBox(minf.content, minf.offset + minf.size, 'stbl');
              if (!stbl) throw new Error('No stbl box');
              
              const stsd = findBox(stbl.content, stbl.offset + stbl.size, 'stsd');
              if (!stsd) throw new Error('No stsd box');
              log('stsd at ' + stsd.offset);
              
              const avc1 = findBox(stsd.content + 8, stsd.offset + stsd.size, 'avc1');
              if (!avc1) throw new Error('No avc1 box');
              log('avc1 at ' + avc1.offset + ', size ' + avc1.size);
              
              // Scan for avcC inside avc1 (structure varies)
              let avcC = null;
              for (let scan = avc1.content; scan < avc1.offset + avc1.size - 8; scan++) {
                const t = String.fromCharCode(
                  view.getUint8(scan+4), view.getUint8(scan+5),
                  view.getUint8(scan+6), view.getUint8(scan+7)
                );
                if (t === 'avcC') {
                  const sz = view.getUint32(scan);
                  avcC = { offset: scan, size: sz, content: scan + 8 };
                  break;
                }
              }
              if (!avcC) throw new Error('No avcC box found in avc1');
              log('avcC at ' + avcC.offset + ', size ' + avcC.size);
              
              const avcCData = new Uint8Array(buffer, avcC.content, avcC.size - 8);
              
              // Find moof and mdat
              const moof = findBox(moov.offset + moov.size, buffer.byteLength, 'moof');
              const mdat = findBox(moof.offset + moof.size, buffer.byteLength, 'mdat');
              log('mdat at ' + mdat.offset + ', size ' + mdat.size);
              
              // Parse trun for samples
              const traf = findBox(moof.content, moof.offset + moof.size, 'traf');
              const trun = findBox(traf.content, traf.offset + traf.size, 'trun');
              const flags = view.getUint32(trun.content) & 0xFFFFFF;
              const sampleCount = view.getUint32(trun.content + 4);
              log('trun: ' + sampleCount + ' samples, flags=0x' + flags.toString(16));
              
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
              log('Parsed ' + samples.length + ' samples, first keyframe=' + samples[0].keyframe);
              
              // Create VideoDecoder
              log('Creating VideoDecoder...');
              let outputCount = 0;
              
              const decoder = new VideoDecoder({
                output: (frame) => {
                  outputCount++;
                  log('FRAME ' + outputCount + ': ' + frame.codedWidth + 'x' + frame.codedHeight);
                  frame.close();
                },
                error: (e) => log('DECODER ERROR: ' + e.message)
              });
              
              decoder.configure({
                codec: "${data.codec}",
                codedWidth: ${data.width},
                codedHeight: ${data.height},
                description: avcCData,
                hardwareAcceleration: 'prefer-software',
              });
              log('Decoder configured, state=' + decoder.state);
              
              // Decode first 5 samples ONE AT A TIME with waits
              const MAX = Math.min(5, samples.length);
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
                
                // Wait 200ms between samples to let decoder process
                await new Promise(r => setTimeout(r, 200));
                log('  -> outputCount=' + outputCount + ', queue=' + decoder.decodeQueueSize);
              }
              
              log('Flushing...');
              await decoder.flush();
              decoder.close();
              
              log('DONE: ' + outputCount + ' frames decoded');
              window.testResult = { success: outputCount > 0, frames: outputCount };
              
            } catch (e) {
              log('ERROR: ' + e.message);
              window.testResult = { success: false, error: e.message };
            }
          };
          
          window.testDirect();
        </script>
      `;
      
      const bundleInfo = await bundleTestTemplate(html, import.meta.url, "direct-videodecoder");
      
      const renderInfo = await electronRPC.rpc.call("getRenderInfo", {
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
      });
      
      console.log("Loaded, waiting for test...");
      await new Promise(r => setTimeout(r, 10000));
      console.log("Test completed without crash!");
    },
  );
});
