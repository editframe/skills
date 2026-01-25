# Native Canvas API Investigation Report

**Date:** 2026-01-24  
**Objective:** Determine if the native Canvas API (`drawElementImage`) is available and could be used to improve performance

---

## Executive Summary

The native Canvas API (`drawElementImage`) is **experimental** and only available in **Chrome Canary** with the `chrome://flags/#canvas-draw-element` flag enabled. The codebase has proper detection logic, but the API is **not available** in standard browsers.

**Key Finding:** The profiling data showing 1.76x speedup was likely obtained in Chrome Canary with the experimental flag enabled. In production environments, the API is not available, so the code correctly falls back to `foreignObject` serialization.

---

## 1. Current Detection Implementation

### Code Location
`elements/packages/elements/src/preview/previewSettings.ts` (lines 54-61)

### Detection Logic
```typescript
export function isNativeCanvasApiAvailable(): boolean {
  if (_nativeApiAvailable === null) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    _nativeApiAvailable = ctx !== null && "drawElementImage" in ctx;
  }
  return _nativeApiAvailable;
}
```

**Status:** ✅ **Properly implemented** - Not hardcoded, performs actual detection

### Fallback Logic
`elements/packages/elements/src/preview/renderers.ts` (lines 58-66)

```typescript
export function getEffectiveRenderMode(): RenderMode {
  const mode = getRenderMode();
  
  if (mode === "native" && !isNativeCanvasApiAvailable()) {
    return "foreignObject";
  }
  
  return mode;
}
```

**Status:** ✅ **Properly implemented** - Validates availability and falls back if needed

---

## 2. Browser Compatibility

### Availability
- **Chrome Canary:** ✅ Available with `chrome://flags/#canvas-draw-element` enabled
- **Chrome Stable:** ❌ Not available
- **Firefox:** ❌ Not available
- **Safari:** ❌ Not available
- **Edge:** ❌ Not available

### API Status
- **Specification:** WICG HTML-in-Canvas proposal (experimental)
- **GitHub:** https://github.com/WICG/html-in-canvas
- **Stability:** Experimental - may change or be removed

---

## 3. How to Enable (Chrome Canary Only)

### Steps
1. Install **Chrome Canary** (separate from regular Chrome)
2. Open `chrome://flags` in the address bar
3. Search for `canvas-draw-element`
4. Enable the flag
5. Restart Chrome Canary
6. The API will be detected automatically

### Verification
Run the diagnostic script: `elements/test-native-api-availability.html`

---

## 4. Performance Comparison

### Profiling Results (from earlier investigation)
- **Native API:** ~1.76x faster than foreignObject
- **Benefits:**
  - Direct DOM-to-canvas rendering (no serialization)
  - No SVG foreignObject serialization overhead
  - No image encoding/decoding
  - No canvas tainting issues
  - Avoids image loading delays

### Why Native is Faster
1. **No Serialization:** Direct rendering vs. DOM → SVG → Image → Canvas
2. **No Encoding:** Skips canvas-to-dataURL conversion
3. **No Loading:** Returns canvas directly vs. waiting for image load
4. **Native Implementation:** Browser-native code vs. JavaScript serialization

---

## 5. Current Code Safety

### Error Handling
**Location:** `elements/packages/elements/src/preview/rendering/renderToImageNative.ts` (line 180)

```typescript
const ctx = captureCanvas.getContext("2d") as HtmlInCanvasContext;
ctx.drawElementImage(container, 0, 0);  // ⚠️ No try/catch
```

**Status:** ⚠️ **No explicit error handling** around the call

**Why it's safe:**
- `getEffectiveRenderMode()` validates availability before selecting native mode
- If detection is correct, the API exists
- If detection fails, code never reaches this point (falls back to foreignObject)

**Risk:** If detection incorrectly reports availability, this will throw `TypeError: ctx.drawElementImage is not a function`

---

## 6. Risks & Downsides

### Risks
1. **Experimental API:** May change or be removed in future Chrome versions
2. **Chrome-only:** Not available in Firefox, Safari, or Edge
3. **Requires Canary:** Not available in stable Chrome
4. **Detection Edge Cases:** If detection fails, could cause runtime errors
5. **Limited Testing:** Fewer users can test the native path

### Downsides
1. **Browser Fragmentation:** Different behavior across browsers
2. **Development Complexity:** Need to maintain two rendering paths
3. **User Confusion:** Performance varies by browser
4. **Maintenance Burden:** Experimental APIs may change

### Mitigations
- ✅ Proper detection prevents crashes
- ✅ Automatic fallback to foreignObject
- ✅ Code is structured to handle both paths
- ⚠️ Could add try/catch for extra safety (defensive programming)

---

## 7. Recommendations

### Short Term
1. ✅ **Keep current implementation** - Detection and fallback work correctly
2. ✅ **Use diagnostic script** - Test availability in your environment
3. ⚠️ **Consider adding try/catch** - Defensive programming around `drawElementImage` call

### Long Term
1. **Monitor API Evolution:** Track WICG proposal status
2. **Test in Canary:** Verify native path works when available
3. **Performance Monitoring:** Track which path users actually get
4. **Documentation:** Document browser requirements for optimal performance

### If Native API Becomes Available
- Code will automatically detect and use it
- No changes needed - detection handles it
- Users will get 1.76x performance improvement automatically

---

## 8. Testing

### Diagnostic Script
**File:** `elements/test-native-api-availability.html`

**What it tests:**
1. Basic API detection (`drawElementImage` in context)
2. Functional test (actual call with proper setup)
3. Browser information
4. Simulated `isNativeCanvasApiAvailable()` result
5. Performance information

**How to use:**
1. Open in browser
2. Check results
3. If not available, follow instructions to enable in Chrome Canary

---

## 9. Conclusion

### Can Native Path Help?
**Yes, but only in Chrome Canary with experimental flag enabled.**

### Current Status
- ✅ Detection is properly implemented
- ✅ Fallback works correctly
- ❌ API not available in standard browsers
- ⚠️ No error handling around `drawElementImage` call (but protected by detection)

### Expected Performance Improvement
- **If available:** ~1.76x faster (from profiling data)
- **If not available:** Falls back to foreignObject (current behavior)

### Recommendation
**Keep current implementation.** The code correctly detects availability and falls back when needed. If you want to test the native path, use Chrome Canary with the experimental flag enabled. The performance benefit is significant when available, but the code gracefully handles when it's not.

---

## 10. Next Steps

1. **Test in your environment:** Run `test-native-api-availability.html`
2. **If you have Chrome Canary:** Enable flag and verify native path works
3. **Consider adding try/catch:** Extra safety around `drawElementImage` call
4. **Monitor API status:** Check WICG proposal for updates

---

**Investigation Complete** ✅
