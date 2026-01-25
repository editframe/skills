# video.html Real-World Performance Analysis

**Date:** 2026-01-25T09:05:00Z
**Project:** elements/dev-projects/video.html
**Command:** `npx tsx scripts/profile-export.ts --project dev-projects/video.html`

---

## Test Setup

| Parameter | Value |
|-----------|-------|
| Project | `dev-projects/video.html` |
| Content | 7 scenes with videos, audio, waveforms, text, captions |
| Resolution | 800x500 (default timegroup size) |
| Total Duration | 41 seconds |
| Browser | Chrome (via Playwright, connected to existing instance) |
| Dev Server | http://main.localhost:4321 |

### Content Breakdown

The video.html project is a complex real-world composition featuring:

1. **Scene 1 (5s):** Opening video + background music + animated title text
2. **Scene 2 (5s):** B-roll video + separate voiceover audio + lower third text + logo image overlay
3. **Scene 3 (6s):** Video with synchronized captions and word highlighting
4. **Scene 4 (6s):** Picture-in-picture layout with two videos + background music
5. **Scene 5 (4s):** Static image slideshow with music bed + animated text
6. **Scene 6 (5s):** Multiple text animations over background video + ambient audio
7. **Scene 7 (5s):** Audio waveform visualization
8. **Scene 8 (5s):** Complex composition with all layer types (video, image, audio, text)

---

## Measured Performance

| Metric | Value |
|--------|-------|
| Video Duration | 41.0s |
| Export Time | 56.88s |
| **Speed** | **0.72x realtime** |
| Profile Samples | 344,364 |
| Sample Interval | 165µs |
| Total Profile Time | 56985.2ms |
| Video Output Size | 5.3 MB (5,338,149 bytes) |

### VideoFrame Creation Benchmark

| Canvas Type | Total Time (50 frames) | Per-Frame Cost |
|-------------|------------------------|----------------|
| HTMLCanvasElement → VideoFrame | 0.4ms | 0.01ms/frame |
| OffscreenCanvas → VideoFrame | 0.2ms | 0.00ms/frame |

**Note:** VideoFrame creation itself is not a bottleneck.

---

## Comparison with Integration Tests

| Scenario | Speed | Duration | Context |
|----------|-------|----------|---------|
| Integration tests (baseline) | 1.8-2.6x | ~10s video | Simple content, isolated features |
| **video.html (actual)** | **0.72x** | 41s video | Complex real project, multiple features |
| User reported (design-catalog) | 0.4x | Long videos | Real-world usage with complex compositions |

**Gap Analysis:**
- Integration tests run at **2.5x faster** than real-world projects
- Real-world performance is **2.8x slower** than integration test performance
- This indicates **integration tests do not capture real-world complexity**

---

## Top Hotspots (Our Code)

Based on CPU profile with source map resolution:

| Time (ms) | % of Total | Function | File | Line |
|-----------|------------|----------|------|------|
| 670.4 | 1.2% | `(anonymous)` - Image loading | `renderToImage.ts` | 19 |
| 195.9 | 0.3% | `serializeToSvgDataUri` | `renderToImageForeignObject.ts` | 25 |
| 58.1 | 0.1% | `syncNodeStyles` | `renderTimegroupPreview.ts` | 407 |
| 55.4 | 0.1% | `syncNodeStyles` | `renderTimegroupPreview.ts` | 407 |
| 26.0 | 0.0% | `syncNodeStyles` | `renderTimegroupPreview.ts` | 407 |
| 21.0 | 0.0% | `syncNodeStyles` | `renderTimegroupPreview.ts` | 407 |
| 9.8 | 0.0% | `syncNodeStyles` | `renderTimegroupPreview.ts` | 407 |
| 4.6 | 0.0% | `renderTimegroupToVideo` | `renderTimegroupToVideo.ts` | 264 |
| 2.0 | 0.0% | `collectDocumentStyles` | `renderTimegroupPreview.ts` | 663 |

**Key Observation:** `syncNodeStyles` appears 5+ times with different sample counts, indicating it's called repeatedly during rendering (once per frame or per element).

---

## File-Level Breakdown

Time spent in each file (self time = code executed directly in that file):

| Time (ms) | % of Total | File | Category |
|-----------|------------|------|----------|
| 54197.7 | 95.1% | `(native)` | Browser APIs |
| 674.0 | 1.2% | `renderToImage.ts` | Image rendering |
| 332.6 | 0.6% | `EFTemporal.ts` | Element timing |
| 197.4 | 0.3% | `renderToImageForeignObject.ts` | SVG serialization |
| 186.2 | 0.3% | `renderTimegroupPreview.ts` | DOM cloning & style sync |
| 170.4 | 0.3% | `waveformUtils.ts` | Audio visualization |
| 121.1 | 0.2% | `EFOverlayLayer.ts` | Layer management |
| 119.1 | 0.2% | `EFTimegroup.ts` | Timeline control |
| 95.2 | 0.2% | `updateAnimations.ts` | Animation updates |
| 90.7 | 0.2% | `lit-html.ts` | Template rendering |
| 79.9 | 0.1% | `EFCanvas.ts` | Canvas element |
| 50.8 | 0.1% | `reactive-element.ts` | Lit reactivity |

---

## Native API Breakdown

Where the 95.1% "native" time is spent:

| Time (ms) | % of Total | Native API | Purpose |
|-----------|------------|------------|---------|
| 41725.4 | 73.2% | `(idle)` | **Browser waiting / idle time** |
| 6300.6 | 11.1% | `(program)` | JS runtime overhead |
| 1867.4 | 3.3% | `getImageData` | Reading canvas pixels |
| 844.1 | 1.5% | `(anonymous)` | Various internal calls |
| 817.6 | 1.4% | `serializeToString` | DOM serialization |
| 487.0 | 0.9% | `getAnimations` | Animation discovery |
| 384.9 | 0.7% | `encode` | Video encoding |
| 381.8 | 0.7% | `(garbage collector)` | Memory management |
| 344.0 | 0.6% | `VideoFrame` | VideoFrame construction |
| 246.7 | 0.4% | `drawImage` | Canvas drawing |
| 98.5 | 0.2% | `Blob` | Blob creation |
| 98.5 | 0.2% | `drawElementImage` | Native HTML-to-canvas |

---

## Line-Level Profiling (Hot Lines)

### renderToImage.ts (670.4ms total)

Most time spent waiting for image load:

| Line | Time (ms) | % | Code Context |
|------|-----------|---|--------------|
| 26 | 638.8 | 1.1% | Image load promise awaiting |
| 19 | Hotspot | - | Anonymous image loading function |
| 21 | 1.3 | 0.0% | Image setup |

### renderToImageForeignObject.ts (195.9ms total)

SVG serialization overhead:

| Line | Time (ms) | % | Code Context |
|------|-----------|---|--------------|
| 56 | 101.6 | 0.2% | SVG serialization |
| 134 | 44.5 | 0.1% | Data URI encoding |
| 129 | 39.1 | 0.1% | Serialization finalization |

### renderTimegroupPreview.ts (186.2ms total)

Style synchronization is expensive:

| Line | Time (ms) | % | Code Context |
|------|-----------|---|--------------|
| 407 | 113.5 | 0.2% | `syncNodeStyles` entry point |
| 504 | 94.3 | 0.2% | Style property iteration/copy |
| 529 | 4.8 | 0.0% | Style application |
| 508 | 4.5 | 0.0% | Computed style access |

---

## Analysis

### Why is Real-World Slower?

**1. Idle Time Dominates (73.2%)**

The largest component is "idle" time (41.7 seconds out of 57 seconds). This indicates:
- **Sequential pipeline bottleneck:** Browser is waiting between operations
- **No parallelization:** Rendering → Encoding → Next frame happens serially
- **Blocking operations:** Image loads, canvas operations, or encoding blocks the next frame

**2. Native API Overhead is Cumulative**

While individual calls are fast, they add up across 41 seconds of video:
- `getImageData`: 1.9s (likely per-frame pixel readback)
- `serializeToString`: 818ms (DOM serialization for foreignObject path)
- `getAnimations`: 487ms (repeated animation discovery)
- `encode`: 385ms (video encoding - surprisingly LOW, suggesting it's not the bottleneck)

**3. Repeated Style Synchronization**

`syncNodeStyles` is called many times (5+ distinct call sites in top hotspots):
- Each call copies computed styles from source → clone
- Happens **per frame** for every element in the composition
- 7 scenes × many elements × 41 seconds = thousands of sync operations

**4. Garbage Collection Overhead**

381ms in GC suggests memory churn:
- Creating/destroying VideoFrames
- Temporary canvas contexts
- Style objects/strings
- SVG serialization strings

### Key Differences from Integration Tests

| Aspect | Integration Tests | video.html (Real World) |
|--------|-------------------|-------------------------|
| Content Complexity | Single video or simple text | 7 scenes, multi-layered |
| Audio | Often absent or simple | Multiple tracks, waveforms |
| Animations | Minimal | Text split animations, stagger effects |
| Text Rendering | Basic | Captions, word highlighting, split chars |
| Images | Few or none | Multiple images + SVG overlays |
| Duration | 3-10s | 41s |
| **Result** | **Optimistic 2.6x** | **Pessimistic 0.72x** |

### Hypothesis: What's Causing the Slowdown

**Primary Bottleneck: Sequential Processing Pipeline**

The 73% idle time strongly suggests:

```
Frame N: Render → Read Pixels → Encode → [WAIT FOR BROWSER]
Frame N+1: Render → Read Pixels → Encode → [WAIT FOR BROWSER]
```

**Why idle time happens:**
1. **Canvas operations may block:** `getImageData` forces a sync readback, stalling the pipeline
2. **No frame lookahead:** We render frame-by-frame instead of batching
3. **Encoding may not be parallelized:** VideoEncoder may serialize encoding even if we submit frames async

**Secondary Bottlenecks:**

1. **Style sync overhead:** `syncNodeStyles` called repeatedly for every element, every frame
2. **Animation discovery:** `getAnimations()` called 487ms worth - could be cached
3. **DOM serialization:** For foreignObject path, `serializeToString` takes 818ms total
4. **Image loading:** 670ms waiting for images (but this might be one-time per asset)

---

## Bottleneck Identification

### Primary Bottleneck

**Sequential Frame Processing → 73% Idle Time**

- **Symptom:** Browser spends most time idle/waiting
- **Root Cause:** No pipelining between render → readback → encode
- **Impact:** ~42 seconds of wasted idle time (73% of 57s export)
- **Potential Speedup:** 2-4x if we can parallelize pipeline

### Secondary Bottlenecks

1. **Style Synchronization (186ms)**
   - Called repeatedly per frame
   - Could be optimized with style caching or dirty tracking
   - Potential speedup: 50-100ms

2. **Animation Discovery (487ms)**
   - `getAnimations()` called many times
   - Should be cached per element with invalidation
   - Potential speedup: 400-450ms

3. **Canvas Readback (1867ms)**
   - `getImageData` forces synchronous GPU → CPU transfer
   - Blocks pipeline
   - May be unavoidable with current API, but could be parallelized

4. **Garbage Collection (382ms)**
   - Memory churn from temporary objects
   - Could reduce with object pooling
   - Potential speedup: 200-300ms

### Unexpected Findings

1. **Video encoding is NOT the bottleneck**
   - Only 385ms total (0.7%)
   - Expected this to be higher
   - Suggests VideoEncoder is efficient

2. **VideoFrame creation is cheap**
   - Only 344ms total (0.6%)
   - Benchmark shows 0.01ms/frame
   - Not worth optimizing

3. **Our TypeScript code is minimal**
   - Only ~2% of total time
   - Most time is in browser APIs
   - Optimizing JS won't give major wins

---

## Actionable Optimization Targets

Based on hotspot analysis:

### 🎯 Priority 1: Pipeline Parallelization (Expected: 2-4x speedup)

**Problem:** 73% idle time due to sequential processing

**Solution:**
- Implement frame pipelining: render N+1 while encoding frame N
- Use multiple canvas contexts to avoid blocking
- Batch VideoFrame creation/encoding

**Expected Impact:** Reduce idle time from 73% → 20-30%, achieving 2-3x speedup

---

### 🎯 Priority 2: Cache Animation Discovery (Expected: 400ms savings)

**Problem:** `getAnimations()` called repeatedly, taking 487ms

**Solution:**
- Cache `getAnimations()` results per element
- Invalidate cache only when animations change
- Track animation add/remove at element level

**Expected Impact:** Reduce from 487ms → <50ms

---

### 🎯 Priority 3: Optimize Style Synchronization (Expected: 100-150ms savings)

**Problem:** `syncNodeStyles` called thousands of times

**Solution:**
- Cache computed styles and only sync on first frame
- Use dirty tracking for style changes
- Batch style updates instead of per-element sync

**Expected Impact:** Reduce from 186ms → 50-80ms

---

### 🎯 Priority 4: Reduce Garbage Collection (Expected: 200ms savings)

**Problem:** 382ms in GC from memory churn

**Solution:**
- Pool VideoFrame objects
- Reuse canvas contexts
- Avoid string concatenation in hot paths
- Preallocate buffers

**Expected Impact:** Reduce GC from 382ms → 150ms

---

## Comparison: Expected vs Integration Test Performance

If we fix the primary bottleneck (pipelining):

| Scenario | Current Speed | After Pipelining | After All Optimizations |
|----------|---------------|------------------|-------------------------|
| video.html | 0.72x | 1.8-2.2x | 2.5-3.0x |
| Integration tests | 2.6x | 4-5x | 5-6x |
| design-catalog (user) | 0.4x | 1.0-1.3x | 1.5-2.0x |

**Realistic Target:** Get real-world projects from **0.4-0.7x → 1.5-2.0x realtime**

---

## NO FIXES ATTEMPTED

✅ This is measurement only. Fixes will come after user reviews this data.

---

## Next Steps (Recommendations)

1. **Review this data with user** to validate bottleneck hypothesis
2. **Prioritize pipelining implementation** (biggest impact)
3. **Profile design-catalog video** to see if same patterns emerge
4. **Implement optimizations in priority order** and re-measure
5. **Update integration tests** to include complex compositions like video.html

---

## Raw Profile Data

- **Profile File:** `export-profile.cpuprofile` (57MB, 344k samples)
- **Video Output:** `profile-export-test.mp4` (5.3MB, 41s)
- **Chrome DevTools:** Load profile at `chrome://inspect` → Performance tab

