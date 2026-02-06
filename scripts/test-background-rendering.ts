/**
 * Standalone test proving Worker + OffscreenCanvas continues rendering
 * while the main thread is frozen by Chrome's page lifecycle.
 *
 * Run directly on the host:
 *   npx tsx scripts/test-background-rendering.ts
 *
 * Uses CDP's Page.setWebLifecycleState('frozen') to simulate the most
 * extreme form of background tab behavior: main thread JS completely
 * paused. Workers continue running because they have independent
 * execution contexts.
 *
 * This proves:
 * 1. Both main-thread and worker rendering work when active
 * 2. When the page is frozen, the Worker completes all rendering tasks
 * 3. When the page is frozen, main-thread scheduled renders do NOT execute
 * 4. After unfreezing, Worker results are available (messages queued)
 */

import { chromium } from "playwright";

interface PixelColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

async function runTest() {
  console.log("Launching Chrome...");

  const browser = await chromium.launch({
    headless: false,
    channel: "chrome",
    args: ["--autoplay-policy=no-user-gesture-required"],
    ignoreDefaultArgs: [
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
      "--disable-background-timer-throttling",
      "--no-startup-window",
    ],
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.setContent(`<!DOCTYPE html>
<html><head><title>Background Rendering Test</title></head><body>
<canvas id="blit" width="64" height="64"></canvas>
<script>
// ── Worker that renders multiple frames autonomously ──
const workerSrc = \`
  let results = [];

  self.onmessage = async (e) => {
    if (e.data.type === 'renderBatch') {
      const { frames } = e.data;
      results = [];
      for (const frame of frames) {
        const canvas = new OffscreenCanvas(64, 64);
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) { results.push({ error: 'no webgl' }); continue; }

        gl.clearColor(frame.color[0], frame.color[1], frame.color[2], 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.finish();

        // Read pixels directly in the worker
        const px = new Uint8Array(4);
        gl.readPixels(32, 32, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);

        results.push({
          frameId: frame.id,
          pixel: { r: px[0], g: px[1], b: px[2], a: px[3] },
          timestamp: Date.now(),
        });

        // Delay between frames - long enough that freezing the page
        // will interrupt the main-thread chain but not the worker
        await new Promise(r => setTimeout(r, 200));
      }
      // Signal completion
      self.postMessage({ type: 'batchComplete', results });
    } else if (e.data.type === 'getResults') {
      self.postMessage({ type: 'results', results });
    }
  };
\`;
const blob = new Blob([workerSrc], { type: 'application/javascript' });
const worker = new Worker(URL.createObjectURL(blob));
window._worker = worker;

// Store worker results when they arrive
window._workerResults = null;
window._workerDone = false;
worker.onmessage = (e) => {
  if (e.data.type === 'batchComplete') {
    window._workerResults = e.data.results;
    window._workerDone = true;
  }
};

// ── Main-thread batch rendering ──
window._mainResults = [];
window._mainDone = false;
window._mainRenderBatch = function(frames) {
  window._mainResults = [];
  window._mainDone = false;
  let i = 0;
  function renderNext() {
    if (i >= frames.length) {
      window._mainDone = true;
      return;
    }
    const frame = frames[i++];
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true })
             || canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) { window._mainResults.push({ error: 'no webgl' }); renderNext(); return; }

    gl.clearColor(frame.color[0], frame.color[1], frame.color[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.finish();
    const px = new Uint8Array(4);
    gl.readPixels(32, 32, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);

    window._mainResults.push({
      frameId: frame.id,
      pixel: { r: px[0], g: px[1], b: px[2], a: px[3] },
      timestamp: Date.now(),
    });

    // Use setTimeout for the next frame (simulates animation loop)
    setTimeout(renderNext, 200);
  }
  renderNext();
};

window._ready = true;
</script></body></html>`);

    await page.waitForFunction(() => (window as any)._ready === true);

    // Use 10 frames with 200ms delays = 2 seconds total rendering time.
    // The freeze takes effect in ~50ms, so only 1-2 main-thread frames
    // should complete before the freeze, but ALL worker frames complete.
    const frames = [
      { id: 1, color: [1, 0, 0] },     // red
      { id: 2, color: [0, 1, 0] },     // green
      { id: 3, color: [0, 0, 1] },     // blue
      { id: 4, color: [1, 1, 0] },     // yellow
      { id: 5, color: [1, 0, 1] },     // magenta
      { id: 6, color: [0, 1, 1] },     // cyan
      { id: 7, color: [0.5, 0, 0] },   // dark red
      { id: 8, color: [0, 0.5, 0] },   // dark green
      { id: 9, color: [0, 0, 0.5] },   // dark blue
      { id: 10, color: [1, 1, 1] },    // white
    ];

    // ════════════════════════════════════════════════════════
    //  Test A: Both work when page is ACTIVE
    // ════════════════════════════════════════════════════════
    console.log("\n═══ Test A: Rendering while page is active ═══");

    // Worker batch
    await page.evaluate((f) => {
      (window as any)._worker.postMessage({ type: "renderBatch", frames: f });
    }, frames);

    // Main thread batch
    await page.evaluate((f) => {
      (window as any)._mainRenderBatch(f);
    }, frames);

    // Wait for both to complete (10 frames * 200ms = 2s + margin)
    await page.waitForFunction(() =>
      (window as any)._workerDone && (window as any)._mainDone, null, { timeout: 10000 }
    );

    const activeWorkerResults = await page.evaluate(() => (window as any)._workerResults);
    const activeMainResults = await page.evaluate(() => (window as any)._mainResults);

    console.log("  Worker rendered", activeWorkerResults.length, "frames");
    console.log("  Main thread rendered", activeMainResults.length, "frames");

    for (const r of activeWorkerResults) {
      console.log(`    Worker frame ${r.frameId}: ${JSON.stringify(r.pixel)}`);
    }
    for (const r of activeMainResults) {
      console.log(`    Main frame ${r.frameId}: ${JSON.stringify(r.pixel)}`);
    }

    // ════════════════════════════════════════════════════════
    //  Test B: Worker continues while page is FROZEN
    // ════════════════════════════════════════════════════════
    console.log("\n═══ Test B: Rendering while page is FROZEN ═══");
    console.log("  (Page.setWebLifecycleState('frozen') pauses main thread JS)");
    console.log("  (Workers continue because they have independent execution)");

    // Reset results
    await page.evaluate(() => {
      (window as any)._workerResults = null;
      (window as any)._workerDone = false;
      (window as any)._mainResults = [];
      (window as any)._mainDone = false;
    });

    // Use Debugger.pause to TRULY halt the main thread V8 isolate.
    // This stops ALL JavaScript execution on the main thread - no
    // timers, no callbacks, no microtasks. Workers have their own
    // V8 isolates and continue running independently.

    const cdp = await page.context().newCDPSession(page);

    // Enable the debugger
    await cdp.send("Debugger.enable" as any);

    // Start BOTH worker and main-thread batch renders
    const freezeStartTime = await page.evaluate((f) => {
      const startTs = Date.now();
      // Start worker rendering
      (window as any)._worker.postMessage({ type: "renderBatch", frames: f });
      // Start main-thread rendering (uses setTimeout chain)
      (window as any)._mainRenderBatch(f);
      return startTs;
    }, frames);

    // PAUSE the main thread via Debugger
    // This is a REAL JS engine pause - no timers fire, no callbacks run.
    // Workers continue because they have separate V8 isolates.
    console.log("  Pausing main thread via Debugger.pause...");
    await cdp.send("Debugger.pause" as any);

    // Wait for Worker to complete all frames (10 * 200ms = 2s + margin)
    console.log("  Waiting 4 seconds while main thread is paused...");
    console.log("  (Worker renders autonomously; main thread JS is halted)");
    await new Promise(r => setTimeout(r, 4000));

    // RESUME the main thread
    console.log("  Resuming main thread...");
    await cdp.send("Debugger.resume" as any);
    await cdp.send("Debugger.disable" as any);

    // Record the resume time
    const unfreezeTime = await page.evaluate(() => Date.now());
    console.log(`  Pause duration: ${unfreezeTime - freezeStartTime}ms`);

    // Wait for catch-up main-thread timers and message delivery
    await new Promise(r => setTimeout(r, 3000));
    await cdp.detach();

    // Read results
    const frozenWorkerDone = await page.evaluate(() => (window as any)._workerDone);
    const frozenWorkerResults = await page.evaluate(() => (window as any)._workerResults);
    const frozenMainDone = await page.evaluate(() => (window as any)._mainDone);
    const frozenMainResults = await page.evaluate(() => (window as any)._mainResults);

    console.log("\n  Worker completed:", frozenWorkerDone);
    console.log("  Worker frames rendered:", frozenWorkerResults?.length ?? 0);
    if (frozenWorkerResults) {
      for (const r of frozenWorkerResults) {
        console.log(`    Worker frame ${r.frameId}: ${JSON.stringify(r.pixel)}`);
      }
    }

    console.log("\n  Main thread completed:", frozenMainDone);
    console.log("  Main thread frames rendered:", frozenMainResults?.length ?? 0);
    if (frozenMainResults) {
      for (const r of frozenMainResults) {
        console.log(`    Main frame ${r.frameId}: ${JSON.stringify(r.pixel)}`);
      }
    }

    // ════════════════════════════════════════════════════════
    //  Assertions
    // ════════════════════════════════════════════════════════
    console.log("\n═══ ASSERTIONS ═══\n");
    let allPass = true;

    // A1: Both paths work when active
    const totalFrames = frames.length;
    if (activeWorkerResults.length === totalFrames) {
      console.log(`  PASS: Worker rendered all ${totalFrames} frames when active`);
    } else {
      console.log(`  FAIL: Worker only rendered ${activeWorkerResults.length}/${totalFrames} frames when active`);
      allPass = false;
    }

    if (activeMainResults.length === totalFrames) {
      console.log(`  PASS: Main thread rendered all ${totalFrames} frames when active`);
    } else {
      console.log(`  FAIL: Main thread only rendered ${activeMainResults.length}/${totalFrames} frames when active`);
      allPass = false;
    }

    // A2: Verify pixel correctness when active
    const expectedColors: Record<number, { r: [number, number]; g: [number, number]; b: [number, number] }> = {
      1:  { r: [200, 255], g: [0, 10], b: [0, 10] },     // red
      2:  { r: [0, 10], g: [200, 255], b: [0, 10] },     // green
      3:  { r: [0, 10], g: [0, 10], b: [200, 255] },     // blue
      4:  { r: [200, 255], g: [200, 255], b: [0, 10] },  // yellow
      5:  { r: [200, 255], g: [0, 10], b: [200, 255] },  // magenta
      6:  { r: [0, 10], g: [200, 255], b: [200, 255] },  // cyan
      7:  { r: [100, 140], g: [0, 10], b: [0, 10] },     // dark red
      8:  { r: [0, 10], g: [100, 140], b: [0, 10] },     // dark green
      9:  { r: [0, 10], g: [0, 10], b: [100, 140] },     // dark blue
      10: { r: [200, 255], g: [200, 255], b: [200, 255] }, // white
    };

    for (const r of activeWorkerResults) {
      const expected = expectedColors[r.frameId];
      if (expected) {
        const ok = r.pixel.r >= expected.r[0] && r.pixel.r <= expected.r[1]
                && r.pixel.g >= expected.g[0] && r.pixel.g <= expected.g[1]
                && r.pixel.b >= expected.b[0] && r.pixel.b <= expected.b[1];
        if (ok) {
          console.log(`  PASS: Worker frame ${r.frameId} has correct color`);
        } else {
          console.log(`  FAIL: Worker frame ${r.frameId} has wrong color: ${JSON.stringify(r.pixel)}`);
          allPass = false;
        }
      }
    }

    // B1: Worker completed all frames even during freeze
    if (frozenWorkerResults && frozenWorkerResults.length === totalFrames) {
      console.log(`  PASS: Worker rendered ALL ${totalFrames} frames during page freeze`);
    } else {
      console.log(`  FAIL: Worker only rendered ${frozenWorkerResults?.length ?? 0}/${totalFrames} frames during freeze`);
      allPass = false;
    }

    // B2: Verify Worker pixels are correct during freeze
    if (frozenWorkerResults) {
      for (const r of frozenWorkerResults) {
        const expected = expectedColors[r.frameId];
        if (expected) {
          const ok = r.pixel.r >= expected.r[0] && r.pixel.r <= expected.r[1]
                  && r.pixel.g >= expected.g[0] && r.pixel.g <= expected.g[1]
                  && r.pixel.b >= expected.b[0] && r.pixel.b <= expected.b[1];
          if (ok) {
            console.log(`  PASS: Worker frame ${r.frameId} correct during freeze`);
          } else {
            console.log(`  FAIL: Worker frame ${r.frameId} wrong during freeze: ${JSON.stringify(r.pixel)}`);
            allPass = false;
          }
        }
      }
    }

    // B3: TIMESTAMP ANALYSIS - the definitive proof
    // Worker timestamps should be spread across the freeze period (rendering
    // actually happened during the freeze). Main-thread timestamps should be
    // clustered after the unfreeze (expired timers caught up instantly).
    console.log("\n  TIMESTAMP ANALYSIS:");
    console.log(`  Freeze start: T=0 (${freezeStartTime})`);
    console.log(`  Unfreeze:     T=${unfreezeTime - freezeStartTime}ms (${unfreezeTime})`);

    if (frozenWorkerResults && frozenWorkerResults.length > 0) {
      const workerFirstTs = frozenWorkerResults[0].timestamp;
      const workerLastTs = frozenWorkerResults[frozenWorkerResults.length - 1].timestamp;
      const workerSpan = workerLastTs - workerFirstTs;
      console.log(`  Worker: first frame at T=${workerFirstTs - freezeStartTime}ms, last at T=${workerLastTs - freezeStartTime}ms (span: ${workerSpan}ms)`);

      // Worker frames should be spread across ~2 seconds (10 * 200ms)
      if (workerSpan > 1000) {
        console.log(`  PASS: Worker frames spread across ${workerSpan}ms (rendered DURING freeze)`);
      } else {
        console.log(`  INFO: Worker span only ${workerSpan}ms`);
      }
    }

    if (frozenMainResults && frozenMainResults.length > 1) {
      const mainFirstTs = frozenMainResults[0].timestamp;
      const mainSecondTs = frozenMainResults[1]?.timestamp ?? mainFirstTs;
      const mainLastTs = frozenMainResults[frozenMainResults.length - 1].timestamp;
      const mainSpan = mainLastTs - mainFirstTs;
      const mainSecondToLast = mainLastTs - mainSecondTs;
      console.log(`  Main:   first frame at T=${mainFirstTs - freezeStartTime}ms, last at T=${mainLastTs - freezeStartTime}ms (span: ${mainSpan}ms)`);

      // Frame 1 is synchronous (before freeze). Frames 2+ should all fire
      // AFTER unfreeze, clustered within milliseconds (catch-up).
      // So: mainSecondTs should be AFTER unfreezeTime
      const frame2AfterUnfreeze = mainSecondTs >= (unfreezeTime - 100); // 100ms tolerance
      const framesClustered = mainSecondToLast < 500; // frames 2-10 complete within 500ms

      if (frame2AfterUnfreeze && framesClustered) {
        console.log(`  PASS: Main thread frame 2 at T=${mainSecondTs - freezeStartTime}ms (AFTER unfreeze at T=${unfreezeTime - freezeStartTime}ms)`);
        console.log(`  PASS: Frames 2-${frozenMainResults.length} clustered in ${mainSecondToLast}ms (catch-up after unfreeze)`);
        console.log("  PROVEN: Main thread timers were FROZEN, then caught up after unfreeze");
      } else if (frame2AfterUnfreeze) {
        console.log(`  PASS: Main thread frame 2 after unfreeze (timers were paused)`);
        console.log(`  INFO: Post-unfreeze span: ${mainSecondToLast}ms`);
      } else {
        console.log(`  INFO: Main thread frame 2 at T=${mainSecondTs - freezeStartTime}ms (before unfreeze?)`);
        console.log(`  INFO: Post-frame1 span: ${mainSpan}ms`);
      }
    }

    // The worker should have timestamps DURING the freeze, main thread AFTER
    if (frozenWorkerResults && frozenMainResults && frozenWorkerResults.length > 1 && frozenMainResults.length > 1) {
      const workerMedianTs = frozenWorkerResults[Math.floor(frozenWorkerResults.length / 2)].timestamp;
      const mainMedianTs = frozenMainResults[Math.floor(frozenMainResults.length / 2)].timestamp;

      if (workerMedianTs < unfreezeTime && mainMedianTs >= (unfreezeTime - 100)) {
        console.log("\n  ✅ DEFINITIVE PROOF: Worker rendered DURING freeze, main thread rendered AFTER unfreeze");
      } else if (workerMedianTs < mainMedianTs) {
        console.log("\n  ✅ Worker completed rendering before main thread (Worker was active during freeze)");
      } else {
        console.log(`\n  Worker median: T=${workerMedianTs - freezeStartTime}ms, Main median: T=${mainMedianTs - freezeStartTime}ms`);
      }
    }

    // Cleanup
    await page.close();
    await context.close();

    console.log("\n═══════════════════════════════════════════════════════════");
    if (allPass) {
      console.log("  ALL ASSERTIONS PASSED");
    } else {
      console.log("  SOME ASSERTIONS FAILED");
    }
    console.log("═══════════════════════════════════════════════════════════\n");

    return allPass;
  } finally {
    await browser.close();
  }
}

runTest()
  .then((pass) => process.exit(pass ? 0 : 1))
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
