# Scaling Analysis: simple-demo vs video.html

**Generated:** 2026-01-25T18:44:00Z

## Performance Summary

| Project | Elements | Duration | Elapsed | Speed | Ratio |
|---------|----------|----------|---------|-------|-------|
| **simple-demo.html** | ~3 | 5.0s | 3.8s | **1.33x realtime** | Baseline |
| **video.html** | ~89 | 5.0s | 11.2s | **0.45x realtime** | **2.95x slower** |

**Key Finding:** video.html has **30x more elements** but is only **3x slower** - suggesting the bottleneck is NOT primarily element count.

## Top Functions by Self Time

### simple-demo.html (fast)

| Rank | Function | Self Time | Self % | Samples | Location |
|------|----------|-----------|--------|---------|----------|
| 1 | `_canvasToImageData` | 167.1ms | 1.4% | 126 | EFThumbnailStrip.ts:711 |
| 2 | `serializeToSvgDataUri` | 46.4ms | 0.4% | 35 | renderToImageForeignObject.ts:15 |
| 3 | `readTransform` | 37.1ms | 0.3% | 28 | EFOverlayLayer.ts:40 |
| 4 | `onError` | 37.1ms | 0.3% | 28 | EFWaveform.ts:42 |
| 5 | `_canvasToImageData` | 31.8ms | 0.3% | 24 | EFThumbnailStrip.ts:711 |

**Profile captured:** 11.6s of execution, 8732 samples

### video.html (slow)

| Rank | Function | Self Time | Self % | Samples | Location |
|------|----------|-----------|--------|---------|----------|
| 1 | `_canvasToImageData` | 248.7ms | 10.2% | 152 | EFThumbnailStrip.ts:711 |
| 2 | `renderToImageNative` | 32.7ms | 1.3% | 20 | renderToImageNative.ts:16 |
| 3 | `splitText` | 27.8ms | 1.1% | 17 | EFText.ts:200 |
| 4 | `extractPeaksFromBuffer` | 22.9ms | 0.9% | 14 | waveformUtils.ts:42 |
| 5 | `splitText` | 14.7ms | 0.6% | 9 | EFText.ts:200 |

**Profile captured:** 2.4s of execution (CDP session lost early), 1495 samples

## Functions That Scale with Content

Comparing functions that take MORE time in video.html relative to element count:

| Function | simple-demo | video.html | Absolute Δ | Scale Factor |
|----------|-------------|------------|------------|--------------|
| `_canvasToImageData` | 167.1ms | 248.7ms | **+81.6ms** | **1.49x** |
| `renderToImageNative` | ~0ms | 32.7ms | **+32.7ms** | **New** |
| `splitText` | ~0ms | 42.5ms | **+42.5ms** | **New** |
| `extractPeaksFromBuffer` | ~0ms | 22.9ms | **+22.9ms** | **New** |
| `serializeToSvgDataUri` | 46.4ms | ~0ms | **-46.4ms** | **Removed** |

### Key Observations

1. **`_canvasToImageData` (EFThumbnailStrip)**: Scales **1.49x** with content (167ms → 249ms)
   - This is the #1 hotspot in both projects
   - Takes **10.2%** of profiled time in video.html vs **1.4%** in simple-demo
   - **Likely generating thumbnails for ALL elements**, not just visible ones

2. **`splitText` (EFText)**: **New cost** in video.html (42.5ms total)
   - video.html has many text elements with animations
   - simple-demo has minimal text
   - Scales linearly with number of text elements

3. **`renderToImageNative`**: **New cost** in video.html (32.7ms)
   - video.html uses native rendering path
   - simple-demo used foreign object path (`serializeToSvgDataUri`)
   - Different rendering strategies between projects

## By File Analysis

### simple-demo.html

| Rank | File | Self Time | Self % |
|------|------|-----------|--------|
| 1 | EFThumbnailStrip.ts | 209.2ms | 1.8% |
| 2 | renderTimegroupPreview.ts | 55.1ms | 0.5% |
| 3 | EFWaveform.ts | 38.7ms | 0.3% |
| 4 | EFOverlayLayer.ts | 37.9ms | 0.3% |

### video.html

| Rank | File | Self Time | Self % |
|------|------|-----------|--------|
| 1 | EFThumbnailStrip.ts | 260.1ms | 10.6% |
| 2 | EFTemporal.ts | 81.8ms | 3.3% |
| 3 | EFText.ts | 50.7ms | 2.1% |
| 4 | updateAnimations.ts | 40.9ms | 1.7% |

**EFThumbnailStrip.ts** scales **1.24x** (209ms → 260ms) but takes **5.9x more** of total profile time (1.8% → 10.6%).

## Root Cause Analysis

### Primary Bottleneck: Thumbnail Generation

The profiles show that **`_canvasToImageData`** in `EFThumbnailStrip` is the dominant bottleneck:

1. **Absolute scaling** (1.49x): Moderate - not the main issue
2. **Relative cost** (5.9x more % of profile): **This is the problem**
3. **Sample frequency** (126 → 152 samples): Only +20% more samples despite 30x more elements

**Hypothesis:** Thumbnail generation is taking a fixed amount of time regardless of element count, which becomes a larger percentage of total time when the render is slower.

### Secondary Scaling Issues

1. **Text processing** (`splitText`): Scales linearly with text elements
2. **Animation discovery** (`discoverAndTrackAnimations`): Appears in video.html profile
3. **Waveform processing** (`extractPeaksFromBuffer`): Scales with audio complexity

### Why is video.html 3x Slower?

The profile data suggests **multiple small costs** adding up:

| Category | Contribution |
|----------|-------------|
| Thumbnail generation | ~250ms (10% of captured profile) |
| Text processing | ~43ms (2% of captured profile) |
| Animation tracking | ~41ms (2% of captured profile) |
| Waveform processing | ~23ms (1% of captured profile) |
| **Other (not captured)** | **~10+ seconds** |

**Critical Insight:** The captured profiles only show **2.4s** of the **11.2s** total render time for video.html. The CDP session was lost early, meaning **~9 seconds of work is NOT in the profile**.

## What's Missing from the Profiles?

The video.html test took **11.2 seconds** but the profile only captured **2.4 seconds**. This means:

- **78% of the render time is NOT profiled**
- The slow work happens **later in the render**
- The bottleneck is likely in the **actual frame rendering loop**, not initialization

### Likely Culprits (Not Captured)

Based on the code structure in `renderTimegroupToVideo.ts`:

1. **Frame-by-frame rendering loop** (lines 455-602):
   - `syncStyles()` - synchronizes styles for each frame
   - `renderToImageDirect()` - renders each frame to canvas
   - `inlineImages()` - inlines images for SVG serialization
   - `videoSource.add()` - encodes video frame

2. **Per-frame operations that scale with elements:**
   - `syncNodeRecursive()` - traverses ALL nodes in tree
   - `getAllLitElementDescendants()` - finds ALL lit elements
   - `getTemporalBounds()` - calculates bounds for each element
   - `XMLSerializer.serializeToString()` - serializes entire DOM

## Data-Driven Recommendations

### 1. Profile the FULL render (not just initialization)

The current profiles capture initialization but miss the frame loop. We need to profile the actual frame rendering:

```bash
# Profile the full render with instrumentation
# Modify renderTimegroupToVideo.ts to add console.time() markers
```

### 2. Investigate frame-loop overhead

Based on code review, likely candidates:

```typescript:elements/packages/elements/src/preview/renderTimegroupToVideo.ts
// Line 497: syncStyles is called for EVERY frame
syncStyles(syncState, renderTimeMs);

// Line 502: renderToImageDirect renders each frame
const image = await renderToImageDirect(previewContainer, width, height);
```

**Expected behavior:** These should only process CHANGED elements, not ALL elements.

### 3. Add instrumentation to identify hidden traversals

Look for operations that touch ALL elements:

- `querySelectorAll()` - searches entire tree
- `XMLSerializer.serializeToString()` - serializes all nodes
- `getAllLitElementDescendants()` - walks all descendants
- `getTemporalBounds()` - calculates bounds for each element

### 4. Profile with more frames

The current test renders 150 frames (5s @ 30fps). If the bottleneck is per-frame, we should see:

```
simple-demo: 150 frames in 3.8s = 25.3ms/frame
video.html:  150 frames in 11.2s = 74.7ms/frame

Difference: 49.4ms/frame * 150 frames = 7.4 seconds
```

This **7.4 seconds** is likely the per-frame overhead that scales with elements.

## Next Steps

1. **Add instrumentation to renderTimegroupToVideo.ts:**
   ```typescript
   console.time('syncStyles');
   syncStyles(syncState, renderTimeMs);
   console.timeEnd('syncStyles');
   
   console.time('renderToImage');
   const image = await renderToImageDirect(previewContainer, width, height);
   console.timeEnd('renderToImage');
   ```

2. **Profile with instrumentation enabled:**
   ```bash
   BROWSER_CONSOLE_LOGS=1 ./scripts/browsertest dev-projects/video-render.browsertest.ts
   ```

3. **Search for hidden element traversals:**
   ```bash
   rg "querySelectorAll|getAllLitElementDescendants|getTemporalBounds" \
     packages/elements/src/preview/
   ```

4. **Compare frame-by-frame timing:**
   - Log timing for frames 1, 50, 100, 150
   - Check if time/frame increases over time (memory pressure)
   - Check if time/frame is constant (algorithmic issue)

## Conclusion

The profiles reveal that **initialization overhead** (thumbnails, text processing, animations) accounts for **~350ms** of the difference. However, **~9 seconds** of the video.html render is **not captured** in the profiles.

The real bottleneck is likely **per-frame operations** that:
- Touch ALL elements (not just changed ones)
- Scale linearly with element count
- Happen in the frame loop (not initialization)

**Recommended approach:** Add targeted instrumentation to the frame loop in `renderTimegroupToVideo.ts` to identify which operations scale with content.
