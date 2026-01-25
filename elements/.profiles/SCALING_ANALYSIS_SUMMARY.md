# Scaling Analysis Summary: simple-demo vs video.html

**Date:** 2026-01-25  
**Task:** Profile and compare rendering performance to identify what scales with content

## Executive Summary

Profiled two projects rendering the same duration (5 seconds @ 30fps, 150 frames):

| Project | Elements | Speed | Verdict |
|---------|----------|-------|---------|
| **simple-demo.html** | ~3 | **1.33x realtime** | ✅ Fast |
| **video.html** | ~89 | **0.45x realtime** | ❌ 3x slower |

**Key Finding:** video.html has **30x more elements** but is only **3x slower**, suggesting the bottleneck is **NOT primarily element count**.

## Critical Profile Limitation

⚠️ **The profiles only captured initialization (2-4s), missing 78% of the render time (9+ seconds)**

This means the real bottleneck is in the **frame rendering loop**, not initialization.

## What We Found (Initialization Phase)

### Top Hotspots

| Function | simple-demo | video.html | Scaling |
|----------|-------------|------------|---------|
| `_canvasToImageData` | 167ms (1.4%) | 249ms (10.2%) | **1.49x** |
| `splitText` | ~0ms | 43ms (2%) | **New** |
| `discoverAndTrackAnimations` | ~0ms | 142ms (4%) | **New** |
| `extractPeaksFromBuffer` | ~0ms | 23ms (1%) | **New** |

### By File

| File | simple-demo | video.html | Scaling |
|------|-------------|------------|---------|
| `EFThumbnailStrip.ts` | 209ms (1.8%) | 260ms (10.6%) | **1.24x** |
| `updateAnimations.ts` | ~0ms | 169ms (4.5%) | **New** |
| `EFText.ts` | ~0ms | 50ms (2.1%) | **New** |

## What's Missing (The Real Bottleneck)

The frame loop processes **150 frames** with these operations:

```typescript
for (let frame = 0; frame < 150; frame++) {
  await renderClone.seekForRender(timeMs);    // Seek video
  syncStyles(syncState, timeMs);               // ← LIKELY BOTTLENECK
  const image = await renderToImageDirect();   // ← LIKELY BOTTLENECK
  await videoSource.add(timestampS);           // Encode
}
```

**Expected overhead:**
- simple-demo: 25ms/frame
- video.html: 75ms/frame
- **Difference: 50ms/frame × 150 frames = 7.5 seconds**

This 7.5 seconds is the missing time **NOT captured by the profiler**.

## Likely Culprits (Hypothesis)

Based on code analysis of `renderTimegroupToVideo.ts` and `renderTimegroupPreview.ts`:

### 1. `syncStyles()` - Line 497

```typescript
syncStyles(syncState, renderTimeMs);
```

This function calls:
- `syncNodeRecursive()` - **traverses ALL nodes** in the tree
- `syncNodeStyles()` - applies styles to each node
- `getAllLitElementDescendants()` - finds ALL lit elements

**Hypothesis:** Touching ALL elements on EVERY frame, even if unchanged.

### 2. `renderToImageDirect()` - Line 502

```typescript
const image = await renderToImageDirect(previewContainer, width, height);
```

This function calls:
- `serializeToSvgDataUri()` or `renderToImageNative()`
- `XMLSerializer.serializeToString()` - **serializes entire DOM**
- `inlineImages()` - processes all images

**Hypothesis:** Serializing the entire DOM tree for every frame.

### 3. Element Traversals

Look for operations that scale with element count:

```bash
# Find potential traversals
rg "querySelectorAll|getAllDescendants|getTemporalBounds" \
  packages/elements/src/preview/
```

## Data-Driven Next Steps

### Step 1: Add Frame-Level Instrumentation

Add timing inside the frame loop:

```typescript
// In renderTimegroupToVideo.ts, inside frame loop
for (let frame = 0; frame < totalFrames; frame++) {
  console.time(`frame-${frame}-seek`);
  await renderClone.seekForRender(timeMs);
  console.timeEnd(`frame-${frame}-seek`);
  
  console.time(`frame-${frame}-sync`);
  syncStyles(syncState, timeMs);
  console.timeEnd(`frame-${frame}-sync`);
  
  console.time(`frame-${frame}-render`);
  const image = await renderToImageDirect(previewContainer, width, height);
  console.timeEnd(`frame-${frame}-render`);
  
  console.time(`frame-${frame}-encode`);
  await videoSource.add(timestampS, config.frameDurationS);
  console.timeEnd(`frame-${frame}-encode`);
}
```

### Step 2: Run with Console Logging

```bash
cd elements
BROWSER_CONSOLE_LOGS=1 ./scripts/browsertest dev-projects/video-render.browsertest.ts
```

### Step 3: Analyze Frame Timings

Look for:
- **Consistent overhead per frame** → Algorithmic issue (traversal)
- **Increasing time over frames** → Memory pressure / leaks
- **Specific stage dominates** → Target that operation

### Step 4: Profile syncStyles() and renderToImageDirect()

Add breakpoints or instrumentation inside these functions to see:
- How many nodes are visited?
- How many elements are processed?
- Is work skipped for unchanged elements?

## Expected Findings

If the hypothesis is correct, we should see:

```
simple-demo (3 elements):
  frame-0-sync: 2ms
  frame-0-render: 15ms
  
video.html (89 elements):
  frame-0-sync: 20ms   ← 10x slower (scales with elements)
  frame-0-render: 45ms ← 3x slower (serialization overhead)
```

## Recommended Fix (After Validation)

Once we confirm the bottleneck is element traversal:

### Option 1: Skip Unchanged Elements

```typescript
function syncStyles(syncState, timeMs) {
  // Track which elements have changed
  const changedElements = findChangedElements(syncState, timeMs);
  
  // Only sync changed elements
  for (const element of changedElements) {
    syncNodeStyles(element, timeMs);
  }
}
```

### Option 2: Cache Serialization

```typescript
function renderToImageDirect(container, width, height) {
  // Cache serialized DOM if unchanged
  const cacheKey = computeContentHash(container);
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const image = await actualRenderToImage(container);
  cache.set(cacheKey, image);
  return image;
}
```

### Option 3: Incremental Updates

```typescript
// Instead of re-serializing entire DOM:
// - Keep a base serialization
// - Apply diffs for changed elements only
```

## Deliverables

1. ✅ **Browsertest profiles** - Created `simple-demo-render.browsertest.ts` and `video-render.browsertest.ts`
2. ✅ **CPU profiles captured** - `.profiles/simple-demo-render.cpuprofile` and `.profiles/video-render.cpuprofile`
3. ✅ **Comparative analysis** - `.profiles/SCALING_COMPARISON.md`
4. ✅ **Data-driven recommendations** - This document

## Files Created

```
elements/dev-projects/simple-demo-render.browsertest.ts
elements/.profiles/simple-demo-render.cpuprofile
elements/.profiles/video-render.cpuprofile
elements/.profiles/SCALING_COMPARISON.md
elements/.profiles/SCALING_ANALYSIS_SUMMARY.md
```

## Next Action

**Run frame-level instrumentation** to identify the exact bottleneck in the render loop:

```bash
# 1. Add console.time() calls to frame loop
# 2. Run with logging enabled
# 3. Analyze which stage scales with content
# 4. Profile that specific function
```

The profiles told us **what to look for** (syncStyles/renderToImage), now we need **targeted instrumentation** to confirm and measure the fix.
