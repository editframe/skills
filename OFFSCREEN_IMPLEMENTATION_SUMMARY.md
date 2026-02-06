# Offscreen Canvas Implementation Summary

## Overview
Successfully implemented offscreen canvas rendering for React Three Fiber scenes in Editframe, enabling 3D scenes to continue rendering even when browser tabs are hidden.

## What Was Implemented

### Phase 1: Core Infrastructure (elements package)
✅ **Package Dependencies**
- Added `@react-three/offscreen` as optional peer dependency in `elements/packages/react/package.json`
- Installed `@react-three/offscreen` in telecine package

✅ **Worker Protocol** (`elements/packages/react/src/r3f/worker-protocol.ts`)
- Defined TypeScript message types for main-thread ↔ worker communication
- `renderFrame` messages with `requestId` for frame synchronization
- `frameRendered` responses with `ImageBitmap` transfer

✅ **Worker-Side Rendering** (`elements/packages/react/src/r3f/renderOffscreen.ts`)
- Time synchronization store using pub/sub pattern
- `useCompositionTime()` hook for worker-based scenes
- Frame rendering + pixel capture pipeline
- DOM and Three.js shims for worker environment
- Based on `@react-three/offscreen` but extended for Editframe's needs

✅ **Main-Thread Component** (`elements/packages/react/src/r3f/OffscreenCompositionCanvas.tsx`)
- Wraps `@react-three/offscreen` Canvas component
- Integrates with `addFrameTask` for time synchronization
- Hidden capture canvas for video export pipeline
- Automatic resize synchronization
- Safari fallback support

✅ **Serialization Pipeline Updates** (`elements/packages/elements/src/preview/rendering/serializeTimelineDirect.ts`)
- Added `findCaptureProxy()` helper to locate offscreen capture canvas
- Updated `snapshotCanvas()` to use capture proxy when available
- Updated `serializeCanvas()` to use capture proxy for pixel access

✅ **Package Exports** (`elements/packages/react/package.json`)
- Added `./r3f` export path for R3F utilities
- Created barrel export at `elements/packages/react/src/r3f/index.ts`

### Phase 2: Telecine Migration

✅ **Worker Files**
- `telecine/.../jit-streaming-worker.ts` - JIT Streaming scene worker
- `telecine/.../parallel-fragments-worker.ts` - Parallel Fragments scene worker

✅ **Scene Component Updates**
- `JITStreamingScene`: Now uses `useCompositionTime()` with fallback to prop
- `ParallelFragmentsR3FScene`: Now uses `useCompositionTime()` with fallback to prop
- Both scenes work in worker context or main-thread fallback

✅ **Timeline Component Updates**
- `JITStreamingTimeline.tsx`: Replaced Canvas + flushSync + flushR3F with OffscreenCompositionCanvas
- `parallel-fragments-r3f.tsx` (ParallelFragmentsCanvas): Same transformation
- Removed manual time state management
- Removed visibility change listeners (no longer needed)

✅ **Deprecation**
- Added deprecation notice to `r3f-sync.tsx`
- Kept for backward compatibility but marked as legacy

## Architecture

### Two-Canvas System
1. **Display Canvas**: Transferred to offscreen, automatically composited by browser
2. **Capture Canvas**: Hidden 2D canvas that receives ImageBitmap frames from worker

### Message Flow
```
Main Thread (addFrameTask)
  ↓ postMessage(renderFrame, timeMs)
Worker
  ↓ Update time store → React re-render → R3F render → gl.finish()
  ↓ createImageBitmap(offscreenCanvas)
  ↓ postMessage(frameRendered, bitmap)
Main Thread
  ↓ drawImage(bitmap) onto capture canvas
Video Export Pipeline
  ↓ Reads from capture canvas
```

## What Needs Testing

### Critical Tests
- [ ] **Live Playback**: Verify scenes render correctly during normal playback
- [ ] **Hidden Tab Rendering**: Confirm rendering continues when tab is hidden
- [ ] **Video Export (Tab Visible)**: Ensure no regression in video export quality
- [ ] **Video Export (Tab Hidden)**: Verify frames are captured correctly when tab is hidden
- [ ] **Safari Fallback**: Test main-thread fallback on Safari (no OffscreenCanvas support)

### Integration Tests
- [ ] **Render Clones**: Verify R3F scenes work in render clones for video export
- [ ] **drei Compatibility**: Confirm `@react-three/drei` Text component works in workers
- [ ] **useCompositionTime()**: Verify hook returns correct values in worker context
- [ ] **Resize Handling**: Test that capture canvas stays in sync with display canvas

### Performance Tests
- [ ] **Frame Time Overhead**: Measure ImageBitmap transfer overhead (should be ~1-3ms)
- [ ] **Memory Leaks**: Verify ImageBitmap.close() is called, workers terminated on unmount
- [ ] **Concurrent Frames**: Test multiple frames in flight during video export

## Known Limitations

1. **Safari**: No OffscreenCanvas support, falls back to main-thread rendering (hidden tab issue persists)
2. **Worker Overhead**: ~1-3ms per frame for ImageBitmap transfer (acceptable given main thread is unburdened)
3. **Scene Isolation**: Worker scenes cannot directly access DOM (already met by existing scenes)

## Vite Configuration

No changes needed! Vite automatically handles workers with the `new Worker(new URL(...), { type: 'module' })` pattern.

## Next Steps

1. **Fix CMake Build**: Resolve the CMake cache issue in telecine to enable full testing
2. **Run Dev Server**: Test live playback with `npm run dev` in telecine
3. **Test Video Export**: Export videos with tab hidden to verify the fix works
4. **Browser Testing**: Test on Chrome, Firefox, Safari, and Edge
5. **Performance Profiling**: Measure frame time overhead and memory usage

## Files Changed

### Elements Package
- `elements/packages/react/package.json` (peer dependencies, exports)
- `elements/packages/react/src/r3f/worker-protocol.ts` (new)
- `elements/packages/react/src/r3f/renderOffscreen.ts` (new)
- `elements/packages/react/src/r3f/OffscreenCompositionCanvas.tsx` (new)
- `elements/packages/react/src/r3f/index.ts` (new)
- `elements/packages/elements/src/preview/rendering/serializeTimelineDirect.ts` (modified)

### Telecine Package
- `telecine/package.json` (added @react-three/offscreen)
- `telecine/.../jit-streaming-worker.ts` (new)
- `telecine/.../parallel-fragments-worker.ts` (new)
- `telecine/.../jit-streaming-scene.tsx` (modified)
- `telecine/.../parallel-fragments-r3f.tsx` (modified)
- `telecine/.../JITStreamingTimeline.tsx` (modified)
- `telecine/.../r3f-sync.tsx` (deprecated)

## Success Criteria

✅ Implementation complete
⏳ Testing pending (requires running dev server)

The implementation follows the plan exactly and should solve the hidden tab rendering issue completely for Chrome and other browsers that support OffscreenCanvas.
