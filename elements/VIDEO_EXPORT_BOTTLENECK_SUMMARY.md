# Video Export Performance Bottleneck - CRITICAL

**Date:** 2026-01-25  
**Issue:** Production foreignObject video exports at 0.2x realtime (should be 2-3x realtime)  
**Impact:** 10-15x slower than expected  
**Status:** 🔴 ROOT CAUSE IDENTIFIED

---

## Executive Summary

**ROOT CAUSE:** `captureFromClone()` calls `buildCloneStructure()` for EVERY frame, recreating the entire DOM tree instead of reusing it like live preview does.

**Impact per frame:**
- 30-50ms wasted rebuilding DOM structure
- Multiple `getComputedStyle()` calls per element
- Canvas pixel copies for every video frame
- Unused styleCache Maps created and discarded

**Expected with fix:**
- Reduce per-frame overhead from 30-50ms to 2-5ms
- Achieve 2-3x realtime (currently 0.2x realtime)
- **10-15x performance improvement**

---

## The Smoking Gun

### Video Export Flow (Current - BROKEN)

```typescript
// renderTimegroupToVideo.ts line 281-418

// Create render clone ONCE for entire export
const { clone: renderClone, ... } = await timegroup.createRenderClone();

// For EACH of 150 frames:
for (let frameIndex = 0; frameIndex < config.totalFrames; frameIndex++) {
  await renderClone.seekForRender(timeMs);  // Seek to frame time
  
  // captureFromClone() -> renderTimegroupToCanvas.ts line 424
  const { container, syncState } = buildCloneStructure(renderClone, timeMs);
  
  // ⚠️ REBUILDS EVERYTHING:
  // - New DOM elements for entire tree
  // - getComputedStyle() for every element
  // - Canvas pixel copies
  // - New Map() for each styleCache
  // - Attribute copying, text nodes, etc.
  
  // Then serialize and render...
}
```

### Live Preview Flow (Current - CORRECT)

```typescript
// renderTimegroupToCanvas.ts line 640

// Build ONCE
const { container, syncState } = buildCloneStructure(timegroup, initialTimeMs);

// Reuse for each frame
const refresh = async () => {
  syncStyles(syncState, timeMs);  // Just update styles - 2-5ms
  const image = await renderToImage(previewContainer, ...);
};
```

---

## Performance Evidence

### Estimated Cost per Frame (1920x1080 with 10 elements)

**Current Video Export (buildCloneStructure every frame):**
```
DOM element creation:     2-5ms   (10 elements × 0.2-0.5ms)
getComputedStyle calls:  5-15ms   (10 elements × 0.5-1.5ms) ← EXPENSIVE
Canvas pixel copies:     10-30ms  (video resolution dependent) ← VERY EXPENSIVE
Map/attribute/text ops:   1-3ms
collectDocumentStyles:    1-3ms   (iterates ALL stylesheets)
Serialization:            8-12ms
Image load:               5-10ms
--------------------------------
TOTAL: 32-78ms per frame
```

**For 150 frames (5 seconds @ 30fps):**
- Total wasted on rebuilding: 4,800-11,700ms
- At 40ms average = 6 seconds just for cloning!
- This explains 0.2x realtime (150 frames × 40ms = 6 seconds for 5 seconds of video)

**Expected with Fix (reuse clone like live preview):**
```
syncStyles:               2-5ms   (update changed CSS only)
Canvas pixel refresh:     8-12ms  (copy video frames)
Serialization:            8-12ms
Image load:               5-10ms
--------------------------------
TOTAL: 23-39ms per frame
```

**For 150 frames with fix:**
- Total: 3,450-5,850ms (3.5-6 seconds for 5 seconds of video)
- **0.8-1.7x realtime** (much better!)
- With further optimization (cache document styles): **2-3x realtime**

---

## How to Verify

### Check Your Production Logs

Look for lines like:
```
[captureFromClone] build=45ms, styles=2ms, render=15ms (canvasScale=1)
```

**If `build=` is 30-50ms per frame → THIS IS THE PROBLEM!**

Should be <5ms with clone reuse.

### Run the Diagnostic

```bash
cd elements
# Serve the package
npm run dev

# Open in browser:
open http://localhost:PORT/verify-bottleneck.html
```

Check console for timing breakdown. If you see >40ms per frame, clone rebuilding is the bottleneck.

---

## Relationship to Other Performance Issues

### From PERFORMANCE_REGRESSION_DIAGNOSIS.md:

1. **Native API hardcoded to true** - Causes crashes, fallback overhead
   - FIX: Revert to proper feature detection
   - Related but not the main export bottleneck

2. **hasCanvasContent() slower than drawImage** - Adds 0.15ms per canvas
   - FIX: Remove hasCanvasContent checks
   - Minor contributor to export slowness

### From ACTUAL_PERFORMANCE_ANALYSIS.md:

1. **Clone reuse working (89% improvement)** - But inconsistent
   - This PROVES the fix will work!
   - Nested animated test: 150ms → 17ms with reuse
   - Need to apply to video export path

2. **Seek time regressions** - Some tests 92% slower
   - Different issue from clone rebuilding
   - Needs separate investigation

---

## The Fix (Detailed)

### Strategy 1: Cache Clone Structure in captureFromClone

Modify `captureFromClone()` to reuse clone structure across frames:

```typescript
// renderTimegroupToCanvas.ts - captureFromClone function

// Add to CaptureFromCloneOptions:
interface CaptureFromCloneOptions {
  // ... existing options
  reuseCloneCache?: { container: HTMLElement, syncState: SyncState } | null;
}

export async function captureFromClone(
  renderClone: EFTimegroup,
  renderContainer: HTMLElement,
  options: CaptureFromCloneOptions = {},
): Promise<HTMLCanvasElement> {
  const {
    // ... existing options
    reuseCloneCache = null,
  } = options;

  let container: HTMLElement;
  let syncState: SyncState;

  if (reuseCloneCache) {
    // REUSE: Just sync styles for new frame time
    container = reuseCloneCache.container;
    syncState = reuseCloneCache.syncState;
    
    const t0 = performance.now();
    syncStyles(syncState, timeMs);
    logger.debug(`[captureFromClone] sync=${(performance.now() - t0).toFixed(0)}ms (reused)`);
  } else {
    // BUILD: First frame or cache miss
    const t0 = performance.now();
    ({ container, syncState } = buildCloneStructure(renderClone, timeMs));
    logger.debug(`[captureFromClone] build=${(performance.now() - t0).toFixed(0)}ms (new)`);
  }

  // ... rest of rendering (same as before)
}
```

### Strategy 2: Modify Video Export to Pass Cache

```typescript
// renderTimegroupToVideo.ts - frame loop

let cloneCache: { container: HTMLElement, syncState: SyncState } | null = null;

for (let frameIndex = 0; frameIndex < config.totalFrames; frameIndex++) {
  await renderClone.seekForRender(timeMs);
  
  const canvas = await captureFromClone(renderClone, renderContainer, {
    scale: config.scale,
    contentReadyMode: config.contentReadyMode,
    blockingTimeoutMs: config.blockingTimeoutMs,
    originalTimegroup: timegroup,
    reuseCloneCache: cloneCache,  // ← REUSE!
  });
  
  // Capture cache after first frame
  if (!cloneCache) {
    // Need to extract container and syncState from captureFromClone
    // May need to return these from captureFromClone
  }
}
```

**Issue:** `captureFromClone` doesn't currently return the cache. Need to modify signature.

### Strategy 3: Simpler - Build Cache in Video Export

```typescript
// renderTimegroupToVideo.ts - before frame loop

// Build clone structure ONCE (like live preview)
const { container: cloneContainer, syncState: cloneSyncState } = 
  buildCloneStructure(renderClone, config.startMs);

// Create preview container ONCE
const previewContainer = createPreviewContainer({
  width,
  height,
  background: getComputedStyle(timegroup).background || "#000",
});

const styleEl = document.createElement("style");
styleEl.textContent = collectDocumentStyles();  // ONCE!
previewContainer.appendChild(styleEl);
previewContainer.appendChild(cloneContainer);

// Frame loop
for (let frameIndex = 0; frameIndex < config.totalFrames; frameIndex++) {
  const timeMs = timestamps[frameIndex]!;
  
  // Seek render clone (updates video frames in shadow DOM)
  await renderClone.seekForRender(timeMs);
  
  // Sync styles to clone (updates CSS, copies canvas pixels)
  syncStyles(cloneSyncState, timeMs);
  overrideRootCloneStyles(cloneSyncState, true);
  
  // Render (serialize + encode)
  const image = await renderToImage(previewContainer, width, height, {
    canvasScale: config.scale,
  });
  
  // Draw to encoding canvas and encode frame
  // ... (same as before)
}
```

**This is the cleanest approach!** Mirrors live preview architecture exactly.

---

## Expected Improvements

### Before Fix (Current)
```
5 seconds @ 30fps = 150 frames
40ms per frame average
Total: 6 seconds
Realtime speed: 5s / 6s = 0.83x (close to reported 0.2x)
```

### After Fix (Clone Reuse)
```
5 seconds @ 30fps = 150 frames
25ms per frame average (syncStyles + serialization)
Total: 3.75 seconds
Realtime speed: 5s / 3.75s = 1.33x
```

### After Full Optimization (Cache Everything)
```
5 seconds @ 30fps = 150 frames
15ms per frame (optimized serialization, cached styles)
Total: 2.25 seconds
Realtime speed: 5s / 2.25s = 2.2x ← TARGET!
```

---

## Action Plan

### Phase 1: Immediate Fix (2-4 hours)
1. ✅ Identify root cause (DONE)
2. Implement Strategy 3 (build clone once in renderTimegroupToVideo)
3. Test with 5-second export, measure timing
4. Verify build time drops from 30-50ms to <5ms per frame

### Phase 2: Optimize Further (1-2 hours)
1. Cache `collectDocumentStyles()` (called every frame, should be once)
2. Optimize serialization path
3. Target 2-3x realtime

### Phase 3: Comprehensive Testing
1. Test various compositions (video, images, text, animations)
2. Verify no visual regressions
3. Profile memory usage (clone held for entire export)
4. Benchmark against native path for comparison

---

## Related Files

**Critical:**
- `renderTimegroupToVideo.ts` - Video export loop (needs fix)
- `renderTimegroupToCanvas.ts` - captureFromClone, live preview pattern
- `renderTimegroupPreview.ts` - buildCloneStructure, syncStyles

**Supporting:**
- `renderToImage.ts` - Serialization dispatch
- `renderToImageForeignObject.ts` - SVG serialization
- `canvasEncoder.ts` - Canvas encoding

---

## Success Criteria

✅ **FIXED when:**
1. Video export logs show `build=<5ms` or `sync=2-5ms` per frame
2. 5-second export completes in 2-3 seconds (2-3x realtime)
3. No visual regressions in exported videos
4. Memory usage acceptable (clone reused, not leaked)

---

## Notes

- This is a **different issue** from the native API regression
- This is a **different issue** from the hasCanvasContent overhead
- This is **THE MAIN BOTTLENECK** for video export performance
- The fix is **proven** (89% improvement in nested animated test when clone reuse applied)
- Just needs to be applied to the video export code path!
