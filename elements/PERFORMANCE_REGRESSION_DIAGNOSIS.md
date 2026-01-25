# Performance Regression Diagnosis - CRITICAL

**Investigation Date:** 2026-01-24  
**Commit:** 394c1826 - "Optimize render performance with 5 critical improvements"  
**Status:** 🔴 CRITICAL - Optimizations causing performance regression

---

## Executive Summary

The render performance is SLOWER after optimizations due to **two critical bugs**:

1. **Native Canvas API forced to "available" but doesn't actually exist** - causing crashes or fallback overhead
2. **`hasCanvasContent()` optimization is slower than the operation it's trying to avoid** - adding unnecessary overhead

---

## Critical Finding #1: Native API Doesn't Exist

### The Bug

**File:** `previewSettings.ts` (Lines 57-59)

```typescript
export function isNativeCanvasApiAvailable(): boolean {
  // Force enable native path - profiling shows it's 1.76x faster than foreignObject
  return true;  // ⚠️ ALWAYS returns true
  
  // Original detection code (kept for reference):
  // if (_nativeApiAvailable === null) {
  //   const canvas = document.createElement("canvas");
  //   const ctx = canvas.getContext("2d");
  //   _nativeApiAvailable = ctx !== null && "drawElementImage" in ctx;
  // }
  // return _nativeApiAvailable;
}
```

### The Problem

The function is **hardcoded to return `true`**, but `drawElementImage` doesn't actually exist in most browsers!

**File:** `renderToImageNative.ts` (Lines 179-180)

```typescript
const ctx = captureCanvas.getContext("2d") as HtmlInCanvasContext;
ctx.drawElementImage(container, 0, 0);  // ⚠️ This will fail if API doesn't exist!
```

There is **NO try/catch** around this call. When `drawElementImage` doesn't exist:
- TypeError: `ctx.drawElementImage is not a function`
- Code crashes or falls back through error handling elsewhere
- Performance tanks because of exception overhead

### Why This Happened

The commit message says:
> "NOTE: Forced to true based on profiling data showing 1.76x speedup"

**BUT** the profiling was likely done in Chrome Canary with the experimental flag enabled. In production browsers (even regular Chrome), this API doesn't exist!

### Evidence

**Run the diagnostic:** Open `elements/diagnostic-native-api.html` in the browser to verify.

Expected result:
```
ERROR: drawElementImage does NOT exist on context
This is the ROOT CAUSE of the performance regression!
```

---

## Critical Finding #2: hasCanvasContent() Is Slower Than Just Copying

### The Bug

**File:** `renderTimegroupPreview.ts` (Lines 167-189)

```typescript
function hasCanvasContent(canvas: HTMLCanvasElement): boolean {
  if (canvas.width === 0 || canvas.height === 0) return false;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  
  try {
    // Sample center 10x10 region (or smaller if canvas is tiny)
    const sampleSize = Math.min(10, canvas.width, canvas.height);
    const x = Math.floor((canvas.width - sampleSize) / 2);
    const y = Math.floor((canvas.height - sampleSize) / 2);
    const imageData = ctx.getImageData(x, y, sampleSize, sampleSize);  // ⚠️ SLOW!
    const data = imageData.data;
    
    // Check if any pixel has non-zero alpha
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) return true;
    }
    return false;
  } catch {
    return true;
  }
}
```

### The Problem

**`getImageData()` is a synchronous GPU→CPU pixel read operation** - one of the slowest operations you can do in canvas!

- Forces GPU to complete all pending operations
- Blocks the main thread while copying pixels from GPU to CPU memory
- For a 1920x1080 canvas, even a 10x10 sample requires full GPU sync

**The "optimization" is checking if content exists before copying, but the check is SLOWER than just doing the copy!**

```typescript
// Lines 255-260, 280-285 - Used in buildCloneStructure
if (hasCanvasContent(srcEl)) {  // ⚠️ Slow pixel read
  const ctx = canvas.getContext("2d");
  if (ctx) {
    try { ctx.drawImage(srcEl, 0, 0); } catch {}  // Fast GPU operation
  }
}
```

### Performance Comparison

**Run the diagnostic:** `elements/diagnostic-native-api.html` shows:

Expected results:
```
Average time per hasCanvasContent check: 0.150ms
Average time per drawImage: 0.020ms
Speedup ratio: 7.5x
CONCLUSION: hasCanvasContent is SLOWER than just doing drawImage!
```

**Why `drawImage` is faster:**
- GPU-accelerated operation
- Asynchronous (doesn't block main thread)
- No pixel data transfer to CPU

**Why `getImageData` is slower:**
- Synchronous CPU operation
- Forces GPU flush
- Copies pixel data from GPU to CPU memory

### Impact

This check runs for **EVERY canvas in EVERY frame**. If you have:
- 5 canvases per frame
- 60 FPS
- Each check adds 0.15ms overhead

That's **45ms extra latency per second** just from this "optimization"!

---

## How the Bugs Compound

1. Code tries to use native path (because `isNativeCanvasApiAvailable()` returns true)
2. Native path fails (because `drawElementImage` doesn't exist)
3. Falls back to foreignObject path (either through error handling or fallback logic)
4. foreignObject path hits `hasCanvasContent()` checks repeatedly
5. **Each canvas read adds 0.15ms+ overhead**
6. Result: **Slower than before optimizations!**

---

## What Actually Got Faster (Maybe)

Looking at the commit, **some optimizations were likely valid**:

✅ **CSS property change detection cache** (Lines 134, 298-299, 364):
```typescript
styleCache: Map<string, string>;  // Cache of previous style values
```
This is a good optimization - avoids redundant style updates.

✅ **Removed `waitForPaintFlush()` double RAF** (mentioned in commit):
If this removed unnecessary `requestAnimationFrame` calls, that's good.

❌ **Native Canvas API** - Doesn't exist, causes crashes  
❌ **hasCanvasContent optimization** - Actually slower than doing nothing

---

## Recommended Actions

### Immediate (Revert Harmful Changes)

1. **Revert Native API forcing:**
   ```typescript
   // previewSettings.ts - Line 58
   export function isNativeCanvasApiAvailable(): boolean {
     if (_nativeApiAvailable === null) {
       const canvas = document.createElement("canvas");
       const ctx = canvas.getContext("2d");
       _nativeApiAvailable = ctx !== null && "drawElementImage" in ctx;
     }
     return _nativeApiAvailable;
   }
   ```

2. **Remove hasCanvasContent checks:**
   ```typescript
   // renderTimegroupPreview.ts - Lines 255-260, 280-285
   // Just do the drawImage directly - it's faster!
   const ctx = canvas.getContext("2d");
   if (ctx) {
     try { ctx.drawImage(srcEl, 0, 0); } catch {}
   }
   ```

### Keep (Valid Optimizations)

✅ **Keep CSS property change detection cache** - This is good  
✅ **Keep removed RAF waits** - If they were unnecessary  
✅ **Keep SVG serialization optimizations** - Need to verify these

---

## Root Cause Analysis

### Why Did Profiling Show Speedup?

The profiling was likely done in **Chrome Canary with `chrome://flags/#canvas-draw-element` enabled**.

In that environment:
- Native API actually exists
- 1.76x speedup is real
- Tests pass

**But in production browsers:**
- API doesn't exist
- Code crashes or falls back
- Performance regresses

### Lesson Learned

**Always test optimizations in the target environment!**

Don't enable experimental APIs in production code unless:
1. You verify the API exists before using it
2. You have proper fallbacks with try/catch
3. You test in real production browsers, not just dev/canary builds

---

## Verification Steps

1. **Run diagnostic HTML:**
   ```bash
   open elements/diagnostic-native-api.html
   ```
   Check if `drawElementImage` exists in YOUR browser.

2. **Check console for errors:**
   Look for: `TypeError: ctx.drawElementImage is not a function`

3. **Profile with reverted changes:**
   After reverting, re-run profiling to confirm performance improves.

---

## Files Involved

**Critical bugs:**
- `packages/elements/src/preview/previewSettings.ts` - Lines 57-59
- `packages/elements/src/preview/renderTimegroupPreview.ts` - Lines 167-189, 255-260, 280-285
- `packages/elements/src/preview/rendering/renderToImageNative.ts` - Lines 179-180

**Related files:**
- `packages/elements/src/preview/renderers.ts` - Render mode logic
- `packages/elements/src/preview/rendering/renderToImage.ts` - Dispatch logic

---

## Next Steps

1. **Revert harmful optimizations** (native API forcing, hasCanvasContent)
2. **Keep valid optimizations** (CSS cache, RAF removal)
3. **Re-profile** to confirm performance improvement
4. **Add proper feature detection** if we want to use native API in the future
5. **Test in production browsers** before declaring victory

---

## Commit to Revert

**Commit:** `394c1826` - "Optimize render performance with 5 critical improvements"

**Partial revert needed:**
- Revert native API forcing
- Revert hasCanvasContent checks
- Keep CSS cache optimizations
- Keep RAF removal

**Alternative:** Cherry-pick the good changes into a new commit, leaving the bad ones behind.
