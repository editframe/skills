# Fidelity Test Performance Analysis

## Current State
- **Duration**: ~4.4 minutes for 32 tests (2 test files with 10 tests each + smaller tests)
- **Goal**: 1-2 minutes

## Render Path Analysis

### Per-Render Operations (each of 5 modes per test)

1. **Template Bundling** (~1-2s per render)
   - `bundleTestTemplate()` creates directories
   - `createBundledHTMLDirectory()` runs Vite build
   - **PROBLEM**: Same HTML bundled 5x per test suite (server + 4 browser modes)

2. **Electron Context Creation** (~2-3s per render)
   - Creates BrowserWindow
   - Loads bundled HTML
   - Waits for `waitForMediaDurations()`
   - Waits for `frameTask.taskComplete`
   - **PROBLEM**: Context created fresh for each render

3. **getRenderInfo RPC** (~0.5-1s per render)
   - Creates temporary context to extract dimensions
   - Disposes context after
   - **PROBLEM**: Redundant - we already know dimensions from HTML

4. **Asset Metadata Bundle** (~0.5s per render)
   - Fetches asset info from database
   - **PROBLEM**: Same assets fetched 5x per test

5. **Frame Generation** (97% of render time according to logs)
   - 1s video @ 30fps = 30 frames
   - Each frame: seek → capture → encode
   - **server mode**: Electron offscreen capture (fast)
   - **browser-frame-by-frame**: executeJavaScript IPC (slow)
   - **browser-full-video**: mediabunny in-browser (moderate)

6. **Frame Extraction for Comparison** (~1s per comparison)
   - FFmpeg spawns per frame
   - **PROBLEM**: Extracts baseline frames 4 times (once per browser mode comparison)

### Time Breakdown (estimated from logs)

For a 1s video with 5 render modes:
- Template bundling: 5 × 1.3s = 6.5s
- Context creation: 5 × 2.5s = 12.5s
- Frame generation: 5 × 4s = 20s
- Frame extraction: 5 × 0.5s = 2.5s
- Frame comparison: 4 × 0.5s = 2s
- **Total per test suite**: ~43.5s

For 2 test suites (bars + video-only): ~87s × 2 = ~174s ≈ 3 minutes (matches observed)

## Optimization Opportunities

### HIGH IMPACT

#### 1. Share Template Bundle Across Modes (~12s saved per test)
The same HTML is used for all 5 modes. Bundle once, reuse.

```typescript
// Current: Each mode bundles separately
const baseline = await render(html, "baseline", { renderMode: "server" });
for (mode of BROWSER_MODES) {
  await render(html, mode.label, { renderMode: mode.renderMode });
}

// Optimized: Bundle once, pass bundleInfo to renders
const bundleInfo = await bundleTestTemplate(html, testFilePath, testTitle);
const baseline = await renderWithBundle(bundleInfo, { renderMode: "server" });
for (mode of BROWSER_MODES) {
  await renderWithBundle(bundleInfo, { renderMode: mode.renderMode });
}
```

#### 2. Reuse Electron Context Across Modes (~10s saved per test)
All renders use the same HTML. Create context once, seek between renders.

```typescript
// Current: Each render creates/destroys context
await using renderContext = await electronEngine.createContext({...});

// Optimized: Create context once, reuse for all modes
const contextId = await electronRpc.call("createContext", {...});
try {
  for (mode of ALL_MODES) {
    await renderWithContext(contextId, mode);
  }
} finally {
  await electronRpc.call("disposeContext", contextId);
}
```

#### 3. Skip getRenderInfo When Dimensions Known (~2.5s saved per test)
For fidelity tests, dimensions are explicit in HTML (`w-[480px] h-[270px]`).
Pass dimensions directly instead of extracting.

#### 4. Cache Asset Metadata (~2.5s saved per test)
Asset IDs don't change between modes. Fetch once, reuse.

### MEDIUM IMPACT

#### 5. Reduce Frame Count
- Currently: 1s @ 30fps = 30 frames
- Optimized: 1s @ 10fps = 10 frames (3x faster frame generation)
- Or: Use keyframes only (1 frame per second)

#### 6. Parallelize Frame Comparison
- Currently: Sequential ImageMagick spawns
- Optimized: `Promise.all()` for frame comparisons

#### 7. Reduce Test Modes
- If `native` and `foreignObject` produce identical output, test one deeply + smoke test other
- If `browser-full-video` and `browser-frame-by-frame` are equivalent, consolidate

### LOW IMPACT (but good for quality)

#### 8. Skip Visual Comparison for Same-Encoder Modes
- `browser-full-video` uses mediabunny encoder
- `browser-frame-by-frame` uses FFmpeg encoder
- Compare one browser mode to server, verify others produce valid MP4

## Proposed New Test Structure

```
fidelity/
├── PERFORMANCE_ANALYSIS.md (this file)
├── perf-bundle-reuse.test.ts      # Benchmark: template bundle sharing
├── perf-context-reuse.test.ts     # Benchmark: Electron context reuse
├── perf-frame-capture.test.ts     # Benchmark: frame capture overhead
├── perf-encoding-comparison.test.ts # Benchmark: mediabunny vs FFmpeg
└── optimized-fidelity.test.ts     # Fast fidelity test with all optimizations
```

## Implementation Priority

1. **Share template bundle** - Simple change, high impact
2. **Context reuse** - Medium complexity, high impact
3. **Skip getRenderInfo** - Simple change, medium impact
4. **Reduce test modes** - Test design change, medium impact
5. **Lower fps for tests** - Config change, medium impact

## Expected Results

With optimizations 1-4:
- Per test suite: 43.5s → ~15s
- Two test suites: ~30s
- **Target achieved**: 30s < 1-2 minutes




