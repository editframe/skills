# Frame Marker vs Playhead Alignment Analysis

## Problem
Frame markers don't align with playhead position, even though both should be constrained to FPS boundaries.

## How Playhead Determines Position

**Source**: `elements/packages/elements/src/gui/PlaybackController.ts`

```typescript
get currentTime(): number {
  const rawTime = this.#currentTime ?? 0;
  // Quantize to frame boundaries based on host's fps
  const fps = (this.#host as any).fps ?? 30;
  if (!fps || fps <= 0) return rawTime;
  const frameDurationS = 1 / fps;  // e.g., 1/30 = 0.033333... seconds
  return Math.round(rawTime / frameDurationS) * frameDurationS;  // Quantize in SECONDS
}
```

**Conversion to milliseconds** (`EFTimegroup.ts`):
```typescript
get currentTimeMs() {
  return this.currentTime * 1000;  // Convert quantized seconds to milliseconds
}
```

**Flow**:
1. `PlaybackController.currentTime` quantizes in **seconds** using `Math.round(timeSeconds / frameDurationS) * frameDurationS`
2. `EFTimegroup.currentTimeMs` converts to milliseconds: `currentTime * 1000`
3. `TimeManager` reads `currentTimeMs` from element
4. `TimelinePlayhead` uses `timeToPixels(currentTime, ...)` to position

## How Frame Markers Determine Position

**Source**: `TimelineRuler.tsx`

```typescript
const frameIntervalMs = 1000 / fps;  // e.g., 1000/30 = 33.333... milliseconds
const frameTimeMs = frameIndex * frameIntervalMs;  // Calculate directly in MILLISECONDS
const x = timeToPixels(frameTimeMs, durationMs, containerWidth, zoomScale);
```

**Flow**:
1. Calculate `frameIntervalMs = 1000 / fps` directly in **milliseconds**
2. Calculate frame times: `frameTimeMs = frameIndex * frameIntervalMs`
3. Use `timeToPixels()` to position

## The Problem

**Floating Point Precision Mismatch**:

At 30fps:
- **Playhead**: Quantizes `0.03333333333333333` seconds → `33.333333333333336` ms (after `* 1000`)
- **Frame markers**: Calculates `33.333333333333336` ms directly

These should be mathematically equivalent, but floating point operations can introduce tiny differences:
- `Math.round(0.033333... / 0.033333...) * 0.033333... * 1000` might not equal `1 * (1000/30)`
- The order of operations matters for floating point precision

**Example at 30fps, frame 1**:
- Playhead: `Math.round(0.033333... / 0.033333...) * 0.033333... * 1000 = 1 * 0.033333... * 1000 = 33.333333333333336`
- Frame marker: `1 * (1000/30) = 33.333333333333336`

These look the same, but there could be subtle differences in:
1. How JavaScript handles the division `1/30` vs `1000/30`
2. The order of multiplication operations
3. Rounding errors accumulating differently

## Root Cause

The frame markers use a **different calculation path** than the playhead:
- Playhead: Quantize in seconds → convert to milliseconds
- Frame markers: Calculate directly in milliseconds

Even though mathematically equivalent, floating point precision can cause misalignment.

## Solution

Frame markers should use the **exact same calculation path** as the playhead:
1. Calculate frame time in seconds: `frameTimeSeconds = frameIndex * frameDurationS` where `frameDurationS = 1 / fps`
2. Quantize using same logic: `Math.round(frameTimeSeconds / frameDurationS) * frameDurationS`
   - Note: For integer `frameIndex`, this is mathematically a no-op but ensures same calculation path
3. Convert to milliseconds: `frameTimeMs = quantizedSeconds * 1000`
4. Use `timeToPixels()` to position

This ensures both systems use identical floating point operations and will align perfectly.

## Implementation

Added `quantizeToFrameTimeMs()` function that matches PlaybackController quantization logic exactly.
Updated `renderFrameMarkers()` to use this quantization for each frame marker.

**Key insight**: Even though quantization is a no-op for integer frame indices, using the exact same calculation path (seconds → quantize → milliseconds) ensures floating point precision matches between playhead and frame markers.

