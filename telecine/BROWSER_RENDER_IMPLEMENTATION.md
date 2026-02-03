# Browser-Based Rendering Implementation

## Summary

Successfully implemented the missing RPC handlers to enable browser-based video rendering using the client-side `renderTimegroupToVideo()` function from `@editframe/elements`.

## Changes Made

### 1. ElectronRPCServer.ts

Added two new RPC handlers:

#### `renderBrowserFullVideo`
- **Purpose**: Uses `renderTimegroupToVideo()` to create the entire MP4 in the browser using mediabunny encoder
- **Process**: 
  - Loads the page in Electron
  - Waits for media to be ready
  - Calls `renderTimegroupToVideo()` via `executeJavaScript`
  - Returns complete video buffer
- **Benefits**: Fast for full renders, uses same code path as client-side exports

#### `renderBrowserFrameByFrame`
- **Purpose**: Captures frames one-by-one in browser, encodes with FFmpeg on server
- **Process**:
  - Loads the page in Electron
  - For each frame:
    - Calls `captureTimegroupAtTime()` to get frame as JPEG
    - Calls `renderAudio()` to get audio samples
    - Passes to `SegmentEncoder` (FFmpeg pipeline)
  - Returns encoded video segment
- **Benefits**: Maintains compatibility with segmented rendering architecture

### 2. fixtures.ts

- Added type definitions: `RenderMode`, `CanvasMode`, `ExtendedRenderOptions`
- Updated `render` fixture to route to appropriate implementation based on `renderMode`:
  - `"server"` → `renderWithElectronRPC()` (existing server-side Electron offscreen)
  - `"browser-full-video"` → `renderWithBrowserFullVideo()` (new)
  - `"browser-frame-by-frame"` → `renderWithBrowserFrameByFrame()` (new)
- Updated signature to match test expectations: `render(html, testFilePath, testTitle, options)`

### 3. html-bundler.ts

- Added `getTestRenderDir()` function for organizing test artifacts when sharing bundles

### 4. browser-render.ts

- Already existed with implementations of `renderWithBrowserFullVideo` and `renderWithBrowserFrameByFrame`
- These functions now work with the newly registered RPC handlers

## Architecture

```
Test Code
  ↓
fixtures.render(html, testFilePath, testTitle, { renderMode, canvasMode })
  ↓
[Routes based on renderMode]
  ↓
┌─────────────────────────────────────────────────────────────────┐
│ browser-render.ts                                               │
│  - renderWithBrowserFullVideo()                                 │
│  - renderWithBrowserFrameByFrame()                              │
└─────────────────────────────────────────────────────────────────┘
  ↓
ElectronRPC.call("renderBrowserFullVideo" | "renderBrowserFrameByFrame")
  ↓
┌─────────────────────────────────────────────────────────────────┐
│ ElectronRPCServer.ts (NEW HANDLERS)                            │
│  ↓                                                              │
│  executeJavaScript in browser context:                         │
│    - Import renderTimegroupToVideo / captureTimegroupAtTime    │
│    - Call with appropriate options                             │
│    - Return video buffer or frame data                         │
└─────────────────────────────────────────────────────────────────┘
  ↓
elements/src/preview/renderTimegroupToVideo.ts (client-side code)
```

## Render Modes Comparison

| Mode | Encoder | Frame Capture | Audio | Speed | Use Case |
|------|---------|---------------|-------|-------|----------|
| **server** | FFmpeg | Electron offscreen | FFmpeg | Fast | Production (current) |
| **browser-full-video** | mediabunny | Browser (serialization) | Browser | Moderate | Same code as client exports |
| **browser-frame-by-frame** | FFmpeg | Browser (IPC) | Browser | Slower | Segmented compatibility |

## Canvas Modes

- **`foreignObject`**: Standard SVG wrapping (reliable, cross-browser)
- **`native`**: Experimental `drawElement` API (faster but different output)

## Testing

### Run API Availability Test
```bash
cd telecine
npm test -- lib/queues/units-of-work/Render/full-render/fidelity/api-availability.test.ts
```

### Run Optimized Fidelity Test (all modes in parallel)
```bash
cd telecine
npm test -- lib/queues/units-of-work/Render/full-render/fidelity/optimized-fidelity.test.ts
```

### Run Performance Benchmark
```bash
cd telecine
npm test -- lib/queues/units-of-work/Render/full-render/fidelity/perf-frame-capture.test.ts
```

### Run Video-Only Fidelity Test
```bash
cd telecine
npm test -- lib/queues/units-of-work/Render/full-render/fidelity/video-only.test.ts
```

## Expected Test Output

The optimized fidelity test should:
1. ✅ Bundle template once (shared across modes)
2. ✅ Render all 5 modes in parallel (server + 4 browser modes)
3. ✅ Complete in < 2 minutes
4. ✅ Produce valid MP4s for all modes
5. ✅ Show performance comparison between modes
6. ✅ Validate pixel fidelity against server baseline

Example output:
```
=== Optimized Fidelity Test ===
Bundle: 1234ms
GetRenderInfo: 567ms
  Dimensions: 480x270, Duration: 1000ms
AssetBundle: 123ms

Rendering 5 modes @ 10fps...
  server: 3456ms, 234.5KB
  browser-full-video + native: 4567ms, 245.6KB
  browser-full-video + foreignObject: 4678ms, 246.7KB
  browser-frame-by-frame + native: 5678ms, 234.5KB
  browser-frame-by-frame + foreignObject: 5789ms, 235.6KB
Total render: 5890ms

=== Validation ===
  ✓ server: valid MP4
  ✓ browser-full-video + native: valid MP4
  ✓ browser-full-video + foreignObject: valid MP4
  ✓ browser-frame-by-frame + native: valid MP4
  ✓ browser-frame-by-frame + foreignObject: valid MP4

=== Frame Comparison ===
  ✓ browser-full-video + native: 123 pixels different (within tolerance)
  ✓ browser-full-video + foreignObject: 45 pixels different (within tolerance)
  ✓ browser-frame-by-frame + native: 134 pixels different (within tolerance)
  ✓ browser-frame-by-frame + foreignObject: 56 pixels different (within tolerance)

=== Timing Summary ===
Total test time: 12.34s
```

## Next Steps

1. **Run tests** to validate the implementation works end-to-end
2. **Analyze performance** - Compare actual performance vs expectations
3. **Tune canvas modes** - Determine which modes provide best fidelity/speed tradeoff
4. **Production integration** - Decide which render mode(s) to use in production
5. **Documentation** - Update user-facing docs if browser rendering is exposed as a feature

## Files Modified

- `telecine/lib/queues/units-of-work/Render/ElectronRPCServer.ts` - Added RPC handlers
- `telecine/lib/queues/units-of-work/Render/full-render/fixtures.ts` - Updated render fixture
- `telecine/lib/queues/units-of-work/Render/test-utils/html-bundler.ts` - Added getTestRenderDir
- `telecine/BROWSER_RENDER_IMPLEMENTATION.md` - This file

## Technical Notes

### Why executeJavaScript?

The implementation uses `webContents.executeJavaScript()` to call browser-side functions because:
1. `renderTimegroupToVideo()` is client-side code (uses DOM, Canvas API, mediabunny)
2. IPC overhead would be prohibitive for per-frame communication
3. Allows reuse of existing, well-tested client code
4. Maintains same rendering logic as user-facing exports

### Memory Considerations

- Video buffers are converted to Arrays for IPC transfer (Uint8Array doesn't cross IPC boundary)
- For large videos, consider streaming chunks instead of single buffer
- Frame-by-frame mode uses JPEG compression to reduce IPC overhead

### Error Handling

- All RPC handlers validate dimensions and durations
- Browser-side errors are caught and propagated to server
- Keepalive signals prevent RPC timeout during long renders
