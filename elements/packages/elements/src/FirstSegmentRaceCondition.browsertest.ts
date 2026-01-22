import { render, html } from "lit";
import { afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";

// Import test setup that clears caches
import "../test/setup.js";

// Import elements (triggers custom element registration)
import "./elements/EFVideo.js";
import "./elements/EFTimegroup.js";
import "./gui/EFConfiguration.js";
import "./gui/EFPreview.js";
import type { EFTimegroup } from "./elements/EFTimegroup.js";
import type { EFVideo } from "./elements/EFVideo.js";
import { MainVideoInputCache } from "./elements/EFMedia/videoTasks/MainVideoInputCache.js";

/**
 * Test suite to reproduce the first segment race condition bug.
 * 
 * SYMPTOM: The first segment of a video is sometimes blank/unplayable:
 * - Thumbnails generated for time 0 have no content
 * - Scrub/playback doesn't show frames until the second segment
 * - Works fine when DevTools is open (timing difference)
 * 
 * ROOT CAUSE: Race condition in MainVideoInputCache.getOrCreateInput().
 * When multiple concurrent requests arrive for the same segment:
 * 1. Request A checks cache (miss), starts async createInputFn()
 * 2. Request B checks cache (miss), also starts async createInputFn()
 * 3. Both create separate BufferedSeekingInput instances
 * 4. One overwrites the other in cache
 * 5. Concurrent users may get different/corrupted instances
 * 
 * DevTools masks this because it adds overhead that serializes requests.
 */

// Clear cache once before all tests
beforeAll(async () => {
  console.clear();
  await fetch("/@ef-clear-cache", { method: "DELETE" });
});

beforeEach(() => {
  localStorage.clear();
});

describe("First Segment Race Condition", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    container.style.cssText = "width: 800px; height: 600px;";
    document.body.appendChild(container);
  });

  afterEach(() => {
    container?.remove();
  });

  /**
   * UNIT TEST: Directly test the MainVideoInputCache race condition.
   * This test creates the exact scenario that causes the bug:
   * - Multiple concurrent calls to getOrCreateInput for the same segment
   * - Both calls find cache empty
   * - Both create separate instances
   * - One overwrites the other
   */
  test("MainVideoInputCache has race condition with concurrent getOrCreateInput calls", async () => {
    const cache = new MainVideoInputCache();
    
    // Track how many times createInputFn is called
    let createCount = 0;
    const createdInstances: object[] = [];
    
    // Simulate a slow async createInputFn (like fetching segments)
    const createInputFn = async () => {
      createCount++;
      const instanceId = createCount;
      console.log(`[Race Unit Test] createInputFn called (instance ${instanceId})`);
      
      // Simulate network/decode time - this is where the race window opens
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Create a mock BufferedSeekingInput
      const mockInstance = { instanceId, timestamp: Date.now() } as any;
      createdInstances.push(mockInstance);
      
      console.log(`[Race Unit Test] createInputFn ${instanceId} completed`);
      return mockInstance;
    };
    
    // Fire two concurrent requests for the SAME segment (segment 0)
    console.log("[Race Unit Test] Firing concurrent requests for segment 0...");
    const [result1, result2] = await Promise.all([
      cache.getOrCreateInput("test.mp4", 0, "high", createInputFn),
      cache.getOrCreateInput("test.mp4", 0, "high", createInputFn),
    ]);
    
    console.log(`[Race Unit Test] createInputFn was called ${createCount} times`);
    console.log(`[Race Unit Test] Created instances: ${createdInstances.length}`);
    console.log(`[Race Unit Test] result1.instanceId: ${(result1 as any)?.instanceId}`);
    console.log(`[Race Unit Test] result2.instanceId: ${(result2 as any)?.instanceId}`);
    console.log(`[Race Unit Test] result1 === result2: ${result1 === result2}`);
    
    // BUG: With the current implementation, createInputFn is called TWICE
    // and both results may be different instances!
    // 
    // EXPECTED (with proper deduplication):
    // - createCount should be 1 (only one fetch)
    // - result1 === result2 (same instance returned to both callers)
    //
    // ACTUAL (bug):
    // - createCount is 2 (duplicate fetches)
    // - result1 !== result2 (different instances)
    
    // This assertion will FAIL, demonstrating the race condition
    expect(createCount).toBe(1); // Should only create once
    expect(result1).toBe(result2); // Both should get same instance
  }, 10000);

  /**
   * Helper to check if a canvas has actual content (not just blank/black pixels)
   */
  function hasCanvasContent(canvas: HTMLCanvasElement, threshold = 10): boolean {
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Count non-black pixels (with some tolerance)
    let nonBlackPixels = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      // Consider a pixel "non-black" if any channel is above threshold
      if (r > threshold || g > threshold || b > threshold) {
        nonBlackPixels++;
      }
    }

    const totalPixels = canvas.width * canvas.height;
    const nonBlackRatio = nonBlackPixels / totalPixels;

    console.log(`[hasCanvasContent] ${nonBlackPixels}/${totalPixels} pixels non-black (${(nonBlackRatio * 100).toFixed(1)}%)`);

    // Consider the canvas to have content if > 5% of pixels are non-black
    return nonBlackRatio > 0.05;
  }

  /**
   * Helper to get pixel values from center of canvas for debugging
   */
  function getCenterPixel(canvas: HTMLCanvasElement): { r: number; g: number; b: number; a: number } {
    const ctx = canvas.getContext("2d");
    if (!ctx) return { r: 0, g: 0, b: 0, a: 0 };

    const x = Math.floor(canvas.width / 2);
    const y = Math.floor(canvas.height / 2);
    const data = ctx.getImageData(x, y, 1, 1).data;

    return { r: data[0]!, g: data[1]!, b: data[2]!, a: data[3]! };
  }

  test("video canvas has content at time 0 after initial load", async () => {
    render(
      html`
        <ef-configuration>
          <ef-preview>
            <ef-timegroup mode="contain" id="test-timegroup"
              style="width: 480px; height: 270px; background: #000;">
              <ef-video 
                id="test-video" 
                src="bars-n-tone.mp4" 
                style="width: 100%; height: 100%; object-fit: contain;">
              </ef-video>
            </ef-timegroup>
          </ef-preview>
        </ef-configuration>
      `,
      container,
    );

    const timegroup = container.querySelector("#test-timegroup") as EFTimegroup;
    const video = container.querySelector("#test-video") as EFVideo;

    expect(timegroup).toBeTruthy();
    expect(video).toBeTruthy();

    // Wait for elements to be ready
    await timegroup.updateComplete;
    await video.updateComplete;

    // Wait for media engine to load (this loads fragment index)
    await video.mediaEngineTask.taskComplete;
    console.log("[Test] Media engine loaded, duration:", video.intrinsicDurationMs);

    // Wait for media durations (ensures all media is ready)
    await timegroup.waitForMediaDurations();

    // Seek to time 0 explicitly
    await timegroup.seek(0);
    console.log("[Test] Seeked to time 0");

    // Wait for frame to render
    await video.waitForFrameReady();
    
    // Debug: Check what unifiedVideoSeekTask returned
    const videoSample = (video as any).unifiedVideoSeekTask.value;
    console.log("[Test 1] unifiedVideoSeekTask.value:", videoSample ? "has value" : "null");
    if (videoSample?.frame) {
      console.log("[Test 1] Frame dimensions:", (videoSample.frame as any).displayWidth, "x", (videoSample.frame as any).displayHeight);
    }
    
    // Debug: Check the cache state
    const mainVideoInputCache = (await import("./elements/EFMedia/videoTasks/MainVideoInputCache.js")).mainVideoInputCache;
    console.log("[Test 1] MainVideoInputCache stats:", JSON.stringify(mainVideoInputCache.getStats()));

    // Check the video canvas has content
    const canvas = video.canvasElement;
    expect(canvas).toBeTruthy();
    console.log("[Test] Canvas dimensions:", canvas!.width, "x", canvas!.height);

    const centerPixel = getCenterPixel(canvas!);
    console.log("[Test] Center pixel at time 0:", centerPixel);

    const hasContent = hasCanvasContent(canvas!);
    expect(hasContent).toBe(true);
  }, 15000);

  test("thumbnails at time 0 have content", async () => {
    render(
      html`
        <ef-configuration>
          <ef-preview>
            <ef-timegroup mode="contain" id="thumb-timegroup"
              style="width: 480px; height: 270px; background: #000;">
              <ef-video 
                id="thumb-video" 
                src="bars-n-tone.mp4" 
                style="width: 100%; height: 100%; object-fit: contain;">
              </ef-video>
            </ef-timegroup>
          </ef-preview>
        </ef-configuration>
      `,
      container,
    );

    const timegroup = container.querySelector("#thumb-timegroup") as EFTimegroup;
    const video = container.querySelector("#thumb-video") as EFVideo;

    expect(timegroup).toBeTruthy();
    expect(video).toBeTruthy();

    await timegroup.updateComplete;
    await video.updateComplete;
    await video.mediaEngineTask.taskComplete;
    await timegroup.waitForMediaDurations();

    console.log("[Test] Extracting thumbnail at time 0...");

    // Extract thumbnail at time 0 using the media engine's extractThumbnails
    const mediaEngine = video.mediaEngineTask.value;
    expect(mediaEngine).toBeTruthy();
    
    // Debug: Log media engine state
    const abortController = new AbortController();
    console.log("[Test] MediaEngine type:", mediaEngine!.constructor.name);
    console.log("[Test] MediaEngine src:", mediaEngine!.src);
    console.log("[Test] MediaEngine durationMs:", mediaEngine!.durationMs);
    const videoRendition = (mediaEngine as any).videoRendition;
    console.log("[Test] VideoRendition:", JSON.stringify(videoRendition));
    
    if (videoRendition) {
      try {
        const segmentId = mediaEngine!.computeSegmentId(0, videoRendition);
        console.log("[Test] computeSegmentId(0):", segmentId);
      } catch (err) {
        console.error("[Test] computeSegmentId error:", err);
      }
    }

    // Test fetching init and media segments directly
    const rendition = videoRendition as { trackId: number; src: string };
    let initData: ArrayBuffer | null = null;
    let mediaData: ArrayBuffer | null = null;

    // Debug: Check the fragment index data
    const engineData = (mediaEngine as any).data;
    const track1Data = engineData?.[1]; // Track ID 1 (video)
    if (track1Data) {
      console.log("[Test] Track 1 initSegment:", JSON.stringify(track1Data.initSegment));
      console.log("[Test] Track 1 segments count:", track1Data.segments?.length);
      if (track1Data.segments?.[0]) {
        console.log("[Test] Track 1 segment[0]:", JSON.stringify(track1Data.segments[0]));
      }
    }

    try {
      console.log("[Test] Attempting fetchInitSegment...");
      initData = await mediaEngine!.fetchInitSegment(rendition, abortController.signal);
      console.log("[Test] fetchInitSegment success, size:", initData.byteLength);
    } catch (err) {
      console.error("[Test] fetchInitSegment FAILED:", err);
    }

    // Check the URLs being used (using urlGenerator for unified URL generation)
    const urlGenerator = (mediaEngine as any).urlGenerator;
    if (urlGenerator && rendition.id) {
      const initUrl = urlGenerator.generateSegmentUrl("init", rendition.id, mediaEngine);
      const mediaUrl = urlGenerator.generateSegmentUrl(1, rendition.id, mediaEngine); // Segment 0 becomes 1 in JIT format
      console.log("[Test] Init URL:", initUrl);
      console.log("[Test] Media URL:", mediaUrl);
    }

    // Debug: Log the expected byte range for segment 0
    const segment0 = track1Data?.segments?.[0];
    if (segment0) {
      const expectedRange = `bytes=${segment0.offset}-${segment0.offset + segment0.size - 1}`;
      console.log("[Test] Expected Range header:", expectedRange);
      console.log("[Test] Expected size:", segment0.size);
    }

    try {
      console.log("[Test] Attempting fetchMediaSegment(0)...");
      mediaData = await (mediaEngine as any).fetchMediaSegment(0, rendition, abortController.signal);
      console.log("[Test] fetchMediaSegment success, size:", mediaData!.byteLength);
      
      // Debug: Check the first 8 bytes to see box type
      const mediaView = new DataView(mediaData!);
      const mediaBoxType = String.fromCharCode(
        mediaView.getUint8(4), mediaView.getUint8(5), 
        mediaView.getUint8(6), mediaView.getUint8(7)
      );
      console.log("[Test] Media segment first box type:", mediaBoxType);
      
      // Check if it's actually the start of mdat content
      const firstFourBytes = `${mediaView.getUint8(0).toString(16)} ${mediaView.getUint8(1).toString(16)} ${mediaView.getUint8(2).toString(16)} ${mediaView.getUint8(3).toString(16)}`;
      console.log("[Test] First 4 bytes (hex):", firstFourBytes);
      
      // Try to decode first 100 bytes as text to see if it's an error response
      const textDecoder = new TextDecoder();
      const first100Bytes = new Uint8Array(mediaData!.slice(0, 100));
      const asText = textDecoder.decode(first100Bytes);
      console.log("[Test] First 100 bytes as text:", asText.replace(/[^\x20-\x7E]/g, '?'));
    } catch (err) {
      console.error("[Test] fetchMediaSegment FAILED:", err);
    }
    
    // Also check init segment box type
    if (initData) {
      const initView = new DataView(initData);
      const initBoxType = String.fromCharCode(
        initView.getUint8(4), initView.getUint8(5), 
        initView.getUint8(6), initView.getUint8(7)
      );
      console.log("[Test] Init segment first box type:", initBoxType);
    }

    // Try creating a mediabunny Input directly to test
    if (initData && mediaData) {
      try {
        const { Input, ALL_FORMATS, BufferSource, VideoSampleSink } = await import("mediabunny");
        // Use the EXACT same approach as video playback
        const combinedBlob = new Blob([initData, mediaData]);
        const arrayBuffer = await combinedBlob.arrayBuffer();
        console.log("[Test] Created combined ArrayBuffer (via Blob), size:", arrayBuffer.byteLength);
        
        const input = new Input({
          formats: ALL_FORMATS,
          source: new BufferSource(arrayBuffer),
        });
        console.log("[Test] Created mediabunny Input with BufferSource");
        
        const videoTrack = await input.getPrimaryVideoTrack();
        console.log("[Test] Got video track:", videoTrack ? "yes" : "no");
        
        if (videoTrack) {
          // Get track info
          const firstTimestamp = await videoTrack.getFirstTimestamp();
          console.log("[Test] Video track first timestamp:", firstTimestamp, "s (", firstTimestamp * 1000, "ms)");
          
          // Try VideoSampleSink iteration (what BufferedSeekingInput uses for video)
          const sampleSink = new VideoSampleSink(videoTrack);
          const samples = [];
          let count = 0;
          for await (const sample of sampleSink.samples()) {
            samples.push(sample);
            count++;
            if (count >= 3) break; // Just get first 3 samples
          }
          console.log("[Test] VideoSampleSink got", count, "samples");
          if (samples.length > 0) {
            console.log("[Test] First sample timestamp:", samples[0].timestamp, "s (", (samples[0].timestamp || 0) * 1000, "ms)");
            console.log("[Test] First sample has frame:", samples[0].frame ? "YES" : "NO");
            if (samples[0].frame) {
              console.log("[Test] First frame dimensions:", (samples[0].frame as any).displayWidth, "x", (samples[0].frame as any).displayHeight);
            }
          }
        }
      } catch (err) {
        console.error("[Test] Direct mediabunny test FAILED:", err);
      }
    }

    // extractThumbnails requires a signal, otherwise returns null for all timestamps
    const thumbnailResults = await mediaEngine!.extractThumbnails([0], abortController.signal);
    console.log("[Test] thumbnailResults:", JSON.stringify(thumbnailResults.map(r => r ? { timestamp: r.timestamp, hasThumbnail: !!r.thumbnail } : null)));
    expect(thumbnailResults.length).toBe(1);

    const result = thumbnailResults[0];
    expect(result).toBeTruthy();
    expect(result!.thumbnail).toBeTruthy();

    const thumbnailCanvas = result!.thumbnail as HTMLCanvasElement;
    console.log("[Test] Thumbnail dimensions:", thumbnailCanvas.width, "x", thumbnailCanvas.height);

    const centerPixel = getCenterPixel(thumbnailCanvas);
    console.log("[Test] Thumbnail center pixel:", centerPixel);

    const hasContent = hasCanvasContent(thumbnailCanvas);
    expect(hasContent).toBe(true);
  }, 15000);

  test("RACE: concurrent seek and thumbnail extraction at time 0 both succeed", async () => {
    /**
     * This test attempts to reproduce the race condition by triggering
     * concurrent operations on segment 0.
     * 
     * The bug manifests when:
     * 1. Initial page load triggers seek to time 0
     * 2. Thumbnail generation also requests time 0
     * 3. Both race to create BufferedSeekingInput
     * 4. One gets an incompletely-initialized instance
     */
    render(
      html`
        <ef-configuration>
          <ef-preview>
            <ef-timegroup mode="contain" id="race-timegroup"
              style="width: 480px; height: 270px; background: #000;">
              <ef-video 
                id="race-video" 
                src="bars-n-tone.mp4" 
                style="width: 100%; height: 100%; object-fit: contain;">
              </ef-video>
            </ef-timegroup>
          </ef-preview>
        </ef-configuration>
      `,
      container,
    );

    const timegroup = container.querySelector("#race-timegroup") as EFTimegroup;
    const video = container.querySelector("#race-video") as EFVideo;

    expect(timegroup).toBeTruthy();
    expect(video).toBeTruthy();

    await timegroup.updateComplete;
    await video.updateComplete;
    await video.mediaEngineTask.taskComplete;
    await timegroup.waitForMediaDurations();

    const mediaEngine = video.mediaEngineTask.value;
    expect(mediaEngine).toBeTruthy();

    console.log("[Race Test] Starting concurrent operations on segment 0...");

    // Note: extractThumbnails requires a signal, otherwise returns null for all timestamps
    const abortController = new AbortController();

    // Trigger CONCURRENT operations - this is the race condition trigger
    const [seekResult, thumbnailResults] = await Promise.all([
      // Operation 1: Seek to time 0
      (async () => {
        await timegroup.seek(0);
        await video.waitForFrameReady();
        return video.canvasElement;
      })(),
      // Operation 2: Extract thumbnail at time 0
      mediaEngine!.extractThumbnails([0, 100, 200], abortController.signal),
    ]);

    // Verify seek result
    console.log("[Race Test] Verifying seek result...");
    expect(seekResult).toBeTruthy();
    const seekCanvas = seekResult!;
    console.log("[Race Test] Video canvas dimensions:", seekCanvas.width, "x", seekCanvas.height);
    
    const seekCenterPixel = getCenterPixel(seekCanvas);
    console.log("[Race Test] Video center pixel:", seekCenterPixel);
    
    const seekHasContent = hasCanvasContent(seekCanvas);
    expect(seekHasContent).toBe(true);

    // Verify thumbnail results
    console.log("[Race Test] Verifying thumbnail results...");
    expect(thumbnailResults.length).toBe(3);
    
    for (let i = 0; i < thumbnailResults.length; i++) {
      const result = thumbnailResults[i];
      const timeMs = [0, 100, 200][i];
      
      if (!result || !result.thumbnail) {
        console.log(`[Race Test] Thumbnail at ${timeMs}ms: FAILED (null result)`);
        // This would indicate the bug - thumbnail extraction failed
        expect(result).toBeTruthy();
        expect(result!.thumbnail).toBeTruthy();
        continue;
      }

      const thumbCanvas = result.thumbnail as HTMLCanvasElement;
      const thumbHasContent = hasCanvasContent(thumbCanvas);
      const thumbCenterPixel = getCenterPixel(thumbCanvas);
      
      console.log(`[Race Test] Thumbnail at ${timeMs}ms: ${thumbCanvas.width}x${thumbCanvas.height}, center=${JSON.stringify(thumbCenterPixel)}, hasContent=${thumbHasContent}`);
      
      // The first segment (time 0) should have content
      if (timeMs === 0) {
        expect(thumbHasContent).toBe(true);
      }
    }
  }, 20000);

  test("RACE: rapid concurrent thumbnail requests for first segment", async () => {
    /**
     * Stress test: fire multiple concurrent thumbnail requests
     * to maximize chance of hitting the race condition.
     */
    render(
      html`
        <ef-configuration>
          <ef-preview>
            <ef-timegroup mode="contain" id="stress-timegroup"
              style="width: 480px; height: 270px; background: #000;">
              <ef-video 
                id="stress-video" 
                src="bars-n-tone.mp4" 
                style="width: 100%; height: 100%; object-fit: contain;">
              </ef-video>
            </ef-timegroup>
          </ef-preview>
        </ef-configuration>
      `,
      container,
    );

    const timegroup = container.querySelector("#stress-timegroup") as EFTimegroup;
    const video = container.querySelector("#stress-video") as EFVideo;

    await timegroup.updateComplete;
    await video.updateComplete;
    await video.mediaEngineTask.taskComplete;
    await timegroup.waitForMediaDurations();

    const mediaEngine = video.mediaEngineTask.value;
    expect(mediaEngine).toBeTruthy();

    console.log("[Stress Test] Firing concurrent thumbnail requests...");

    // Note: extractThumbnails requires a signal, otherwise returns null for all timestamps
    const abortController = new AbortController();

    // Fire multiple concurrent requests for timestamps in the first segment
    const timestamps = [0, 50, 100, 150, 200, 250, 300, 350, 400, 450];
    
    // Start all requests concurrently (without awaiting)
    const allPromises = [
      mediaEngine!.extractThumbnails(timestamps.slice(0, 3), abortController.signal),
      mediaEngine!.extractThumbnails(timestamps.slice(3, 6), abortController.signal),
      mediaEngine!.extractThumbnails(timestamps.slice(6, 10), abortController.signal),
      timegroup.seek(0).then(() => video.waitForFrameReady()),
    ];

    const results = await Promise.all(allPromises);

    // Verify all thumbnail batches succeeded
    const thumbnailBatches = results.slice(0, 3) as (any[] | null)[];
    let successCount = 0;
    let failCount = 0;

    for (const batch of thumbnailBatches) {
      if (!batch) {
        failCount += 3; // Assume 3 per batch if batch failed
        continue;
      }
      for (const result of batch) {
        if (result && result.thumbnail) {
          const canvas = result.thumbnail as HTMLCanvasElement;
          if (hasCanvasContent(canvas)) {
            successCount++;
          } else {
            console.log("[Stress Test] Thumbnail has no content (blank)");
            failCount++;
          }
        } else {
          failCount++;
        }
      }
    }

    console.log(`[Stress Test] Results: ${successCount} succeeded, ${failCount} failed`);

    // All thumbnails should have content - any failures indicate the race condition
    expect(failCount).toBe(0);

    // Video canvas should also have content
    const videoCanvas = video.canvasElement;
    expect(videoCanvas).toBeTruthy();
    const videoHasContent = hasCanvasContent(videoCanvas!);
    expect(videoHasContent).toBe(true);
  }, 30000);

  test("second segment works while first segment may fail (demonstrates bug)", async () => {
    /**
     * This test demonstrates the specific symptom: first segment fails
     * but second segment works. If this test passes (first segment works),
     * the bug may be fixed or not manifesting.
     */
    render(
      html`
        <ef-configuration>
          <ef-preview>
            <ef-timegroup mode="contain" id="segment-timegroup"
              style="width: 480px; height: 270px; background: #000;">
              <ef-video 
                id="segment-video" 
                src="bars-n-tone.mp4" 
                style="width: 100%; height: 100%; object-fit: contain;">
              </ef-video>
            </ef-timegroup>
          </ef-preview>
        </ef-configuration>
      `,
      container,
    );

    const timegroup = container.querySelector("#segment-timegroup") as EFTimegroup;
    const video = container.querySelector("#segment-video") as EFVideo;

    await timegroup.updateComplete;
    await video.updateComplete;
    await video.mediaEngineTask.taskComplete;
    await timegroup.waitForMediaDurations();

    const duration = video.intrinsicDurationMs;
    console.log("[Segment Test] Video duration:", duration);

    // Get timestamps in first segment (0-2s) and second segment (2-4s)
    // Assuming ~2s segment duration typical for JIT/Asset media
    const firstSegmentTimes = [0, 500, 1000, 1500];
    const secondSegmentTimes = [2500, 3000, 3500, 4000];

    // Extract thumbnails from both segments
    const mediaEngine = video.mediaEngineTask.value;
    expect(mediaEngine).toBeTruthy();

    // Note: extractThumbnails requires a signal, otherwise returns null for all timestamps
    const abortController = new AbortController();

    console.log("[Segment Test] Extracting from first segment:", firstSegmentTimes);
    const firstResults = await mediaEngine!.extractThumbnails(firstSegmentTimes, abortController.signal);

    console.log("[Segment Test] Extracting from second segment:", secondSegmentTimes);
    const secondResults = await mediaEngine!.extractThumbnails(secondSegmentTimes, abortController.signal);

    // Count successes in each segment
    let firstSuccessCount = 0;
    let secondSuccessCount = 0;

    for (let i = 0; i < firstResults.length; i++) {
      const result = firstResults[i];
      const timeMs = firstSegmentTimes[i];
      if (result && result.thumbnail) {
        const hasContent = hasCanvasContent(result.thumbnail as HTMLCanvasElement);
        console.log(`[Segment Test] First segment ${timeMs}ms: hasContent=${hasContent}`);
        if (hasContent) firstSuccessCount++;
      } else {
        console.log(`[Segment Test] First segment ${timeMs}ms: FAILED (no result)`);
      }
    }

    for (let i = 0; i < secondResults.length; i++) {
      const result = secondResults[i];
      const timeMs = secondSegmentTimes[i];
      if (result && result.thumbnail) {
        const hasContent = hasCanvasContent(result.thumbnail as HTMLCanvasElement);
        console.log(`[Segment Test] Second segment ${timeMs}ms: hasContent=${hasContent}`);
        if (hasContent) secondSuccessCount++;
      } else {
        console.log(`[Segment Test] Second segment ${timeMs}ms: FAILED (no result)`);
      }
    }

    console.log(`[Segment Test] First segment: ${firstSuccessCount}/${firstSegmentTimes.length} succeeded`);
    console.log(`[Segment Test] Second segment: ${secondSuccessCount}/${secondSegmentTimes.length} succeeded`);

    // Bug symptom: second segment works but first doesn't
    // If this assertion fails with first=0 and second>0, the bug is present
    expect(firstSuccessCount).toBeGreaterThan(0);
    
    // Both segments should work when bug is fixed
    expect(secondSuccessCount).toBeGreaterThan(0);
  }, 20000);
});
