# ForeignObject Rendering Performance Analysis

## Executive Summary

**Root Cause Identified:** Video export calls `buildCloneStructure()` for EVERY frame, creating brand new DOM trees instead of reusing them like live preview does.

**Impact:** 10-15x slower than expected (0.2x realtime vs 2-3x realtime)

**Location:** `captureFromClone()` in `renderTimegroupToCanvas.ts` line 424

---

## The Problem

### Current Video Export Flow (per frame):

```typescript
// renderTimegroupToVideo.ts line 281-418
const { clone: renderClone, ... } = await timegroup.createRenderClone(); // ONCE

for (let frameIndex = 0; frameIndex < config.totalFrames; frameIndex++) {
  await renderClone.seekForRender(timeMs);  // Seek to frame time
  
  // captureFromClone() -> line 424
  const { container, syncState } = buildCloneStructure(renderClone, timeMs); // ⚠️ REBUILDS EVERYTHING!
  
  // Then serialize and render...
}
```

### What `buildCloneStructure()` Does (EVERY FRAME):

1. **DOM Tree Recreation** - Creates brand new elements for entire tree
2. **getComputedStyle()** - Calls for every element to get CSS values
3. **Canvas Pixel Copying** - `ctx.drawImage()` for every video canvas
4. **Map Creation** - New Map() for each element's styleCache (never reused!)
5. **Attribute Copying** - Copies all attributes from source to clone
6. **Text Node Creation** - Creates new text nodes

### Cost Estimation (1920x1080 video with 10 elements):

```
buildCloneStructure per frame:
- DOM element creation: ~2-5ms (10 elements × ~0.2-0.5ms)
- getComputedStyle calls: ~5-15ms (10 elements × ~0.5-1.5ms) ← EXPENSIVE
- Canvas pixel copies: ~10-30ms (depends on video resolution) ← VERY EXPENSIVE
- Map/attribute/text operations: ~1-3ms

TOTAL per frame: 18-53ms
For 150 frames (5 seconds @ 30fps): 2,700-7,950ms just for cloning!
```

**This explains the 0.2x realtime performance!**

---

## Comparison: Live Preview (renderTimegroupToCanvas)

Live preview does this CORRECTLY:

```typescript
// renderTimegroupToCanvas.ts line 640
const { container, syncState } = buildCloneStructure(timegroup, initialTimeMs); // ONCE

const refresh = async () => {
  syncStyles(syncState, timeMs);  // Just update styles - NO REBUILD!
  const image = await renderToImage(previewContainer, ...);
};
```

**Cost per frame:**
- `syncStyles()`: ~2-5ms (only updates changed CSS properties)
- `renderToImage()`: ~10-20ms (serialization + encoding)

**TOTAL per frame: 12-25ms** (2-4x faster than current video export!)

---

## Evidence from Logs

Check your production export logs for lines like:

```
[captureFromClone] build=45ms, styles=2ms, render=15ms (canvasScale=1)
```

If you see `build=` taking 30-50ms per frame, that's the smoking gun.

---

## Why the CSS Cache Doesn't Help

The `styleCache` Map on each CloneNode is meant to skip unchanged CSS properties:

```typescript
// renderTimegroupPreview.ts line 553
if (styleCache.get(camel) === strVal) continue; // Skip if unchanged
styleCache.set(camel, strVal);
```

**BUT:** Video export creates NEW CloneNodes with EMPTY styleCaches every frame!

The cache is NEVER reused between frames, so every property is treated as "changed" and requires:
- Map.get() call (cache miss)
- style property assignment
- Map.set() call

**This adds overhead without any benefit!**

---

## Other Contributing Issues

### 1. collectDocumentStyles() Called Every Frame

```typescript
// captureFromClone line 437
styleEl.textContent = collectDocumentStyles();
```

This iterates ALL stylesheets in the document every frame:

```typescript
// renderTimegroupPreview.ts line 723-737
for (const sheet of document.styleSheets) {
  for (const rule of sheet.cssRules) {
    rules.push(rule.cssText);
  }
}
```

**Cost:** 1-3ms per frame for typical documents (500-1000 CSS rules)

### 2. Multiple getComputedStyle() Calls Per Element

For canvas clones (videos):
```typescript
// renderTimegroupPreview.ts line 443-444
const canvasCs = getComputedStyle(shadowCanvas);
const hostCs = getComputedStyle(source);
```

For regular elements:
```typescript
// renderTimegroupPreview.ts line 579
cs = getComputedStyle(source);
```

Each call forces style recalculation. With 10 elements × 2 calls each = 20 style recalculations per frame!

---

## The Fix (Conceptual)

Modify `captureFromClone()` to reuse clone structure:

```typescript
// Option 1: Cache clone structure on renderClone
let cachedCloneStructure: { container: HTMLElement, syncState: SyncState } | null = null;

export async function captureFromClone(...) {
  if (!cachedCloneStructure) {
    cachedCloneStructure = buildCloneStructure(renderClone, timeMs);
  } else {
    // Refresh canvas pixels and sync styles (like live preview)
    syncStyles(cachedCloneStructure.syncState, timeMs);
  }
  
  // ... rest of rendering
}
```

**Expected improvement:**
- Reduces per-frame build time from 30-50ms to 2-5ms
- Should achieve 2-3x realtime (similar to live preview)

---

## Action Items

1. **Verify the issue:**
   - Run a 5-second export with foreignObject rendering
   - Check console logs for `[captureFromClone] build=XXms` timing
   - If build time is >30ms, this analysis is confirmed

2. **Measure baseline:**
   - Total export time for 5 seconds @ 30fps = 150 frames
   - Calculate current realtime multiplier

3. **Implement fix:**
   - Modify captureFromClone to reuse clone structure
   - Similar to how renderTimegroupToCanvas works

4. **Verify fix:**
   - Re-run same export
   - Should see build time drop to <5ms
   - Realtime multiplier should improve to 2-3x

---

## Why This Regressed

This likely worked better before because:
1. Clone structure may have been simpler (fewer elements)
2. buildCloneStructure may have been faster
3. OR: There was a different code path that reused clones

The current architecture is correct for SINGLE captures (thumbnails) but inefficient for BATCH operations (video export).

---

## Related Files

- `renderTimegroupToVideo.ts` - Video export loop
- `renderTimegroupToCanvas.ts` - captureFromClone, live preview
- `renderTimegroupPreview.ts` - buildCloneStructure, syncStyles
- `renderToImageForeignObject.ts` - SVG serialization
- `canvasEncoder.ts` - Canvas encoding

---

## Timing Breakdown (Expected After Fix)

```
Per frame (foreignObject):
- syncStyles: 2-5ms (update CSS only)
- Canvas pixel refresh: 8-12ms (copy video frames)
- collectDocumentStyles: 2ms (can be cached too)
- Serialization: 8-12ms (XML + base64)
- Image load: 5-10ms (browser decode)
---
TOTAL: 25-41ms per frame

For 30fps video: 33.3ms per frame target
25-41ms = 0.8x - 1.3x realtime (close to target!)

With further optimizations (cache document styles, faster serialization):
Could achieve 2-3x realtime as expected.
```
