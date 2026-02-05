# Video Rendering Test Suite

Clean, focused test suite for Editframe video rendering with clear separation of concerns.

## Structure

```
tests/
├── smoke/                     # Smoke tests (quick validation)
│   ├── elements.smoke.test.ts
│   ├── audio-quality.smoke.test.ts
│   ├── mp4-structure.smoke.test.ts
│   ├── core.smoke.test.ts
│   ├── cache-benefit.test.ts
│   └── timing-analysis.test.ts
├── core/                      # Basic functionality (fast, runs every commit)
│   ├── elements/              # Individual element tests
│   │   ├── ef-timegroup.test.ts
│   │   ├── ef-image.test.ts
│   │   ├── ef-text.test.ts
│   │   ├── css-animations.test.ts
│   │   ├── ef-audio.test.ts
│   │   ├── ef-video.test.ts
│   │   └── ef-waveform.test.ts
│   ├── mp4-structure.test.ts  # MP4 format validation
│   └── edge-cases.test.ts     # Edge case handling
├── visual/                    # Visual regression (runs on commit)
│   ├── regression.test.ts
│   ├── fixtures/              # Baseline videos
│   └── snapshots/             # Frame snapshots
├── audio/                     # Audio quality
│   ├── presence.test.ts
│   └── continuity.test.ts
├── performance/               # Benchmarks (on-demand/nightly)
│   └── render-speed.test.ts
├── experimental/              # Browser modes (optional, non-blocking)
│   └── browser-rendering.test.ts
└── utils/                     # Test utilities
    ├── render.ts              # Simple render helper
    ├── video-validator.ts     # MP4/playback checks
    ├── visual-diff.ts         # Frame comparison
    └── test-assets/           # Test media files
```

## Running Tests

### All Tests

```bash
cd telecine
npm test tests/
```

### Core Tests Only (Fast)

```bash
npm test tests/core/
```

### Smoke Tests Only (Fastest)

```bash
npm test tests/smoke/
```

### Specific Test File

```bash
npm test tests/core/elements/ef-timegroup.test.ts
npm test tests/smoke/elements.smoke.test.ts
```

### Visual Regression Only

```bash
npm test tests/visual/
```

### Audio Tests Only

```bash
npm test tests/audio/
```

### Performance Benchmarks

```bash
npm test tests/performance/
```

### Experimental Tests (Non-blocking)

```bash
npm test tests/experimental/
```

## Test Categories

### Smoke Tests (<30 seconds total)

**Purpose:** Quick validation of critical functionality. Fastest test suite.

**Tests:**
- Elements smoke test (elements.smoke.test.ts)
- Audio quality smoke test (audio-quality.smoke.test.ts)
- MP4 structure smoke test (mp4-structure.smoke.test.ts)
- Core smoke test (core.smoke.test.ts)
- Cache benefit analysis (cache-benefit.test.ts)
- Timing analysis (timing-analysis.test.ts)

**When they fail:** Critical rendering functionality is broken.

### Core Tests (<30 seconds total)

**Purpose:** Validate basic functionality. Fast, reliable, no flakes.

**Tests:**
- Element rendering (ef-timegroup, ef-image, ef-text, ef-audio, ef-video, ef-waveform)
- CSS animations with proper fill-mode
- MP4 structure validation
- Edge cases (short/long durations, special characters)

**When they fail:** Something broke in core rendering.

### Visual Regression (~2 minutes)

**Purpose:** Catch unintended visual changes.

**Tests:**
- Frame-by-frame comparison against baselines
- 1 frame per second extraction
- ImageMagick diff with configurable threshold

**When they fail:** Visual output changed. Either:
- Intentional change → Update baselines
- Bug → Fix the rendering issue

### Audio Tests

**Purpose:** Validate audio presence and quality.

**Tests:**
- Audio track presence
- Audio continuity (no glitches)
- Waveform rendering

**When they fail:** Audio pipeline issue.

### Performance Benchmarks

**Purpose:** Track rendering speed over time.

**Tests:**
- Render speed for various content types
- Historical comparison

**When they fail:** Performance regression.

### Experimental Tests

**Purpose:** Explore browser-based rendering modes.

**Tests:**
- Browser full-video mode
- Browser frame-by-frame mode
- Comparison to server rendering

**When they fail:** Doesn't block CI. Used for research.

## Visual Regression Baselines

### Creating Baselines

When adding new visual regression tests:

```bash
UPDATE_BASELINES=true npm test tests/visual/
```

This creates baseline frames in `tests/visual/fixtures/<test-name>/baseline/`.

### Updating Baselines

When intentionally changing visual output:

```bash
UPDATE_BASELINES=true npm test tests/visual/
```

### Baseline Structure

```
tests/visual/fixtures/<test-name>/
├── baseline/              # Known-good frames
│   ├── frame-001.png
│   ├── frame-002.png
│   └── frame-003.png
├── test/                  # Current test frames
│   ├── frame-001.png
│   ├── frame-002.png
│   └── frame-003.png
└── diffs/                 # Difference images (when tests fail)
    ├── diff-001.png
    ├── diff-002.png
    └── diff-003.png
```

### Viewing Diffs

When visual regression fails:

1. Check test output for artifact path
2. Open `tests/visual/fixtures/<test-name>/diffs/` to see differences
3. Compare baseline vs test frames side-by-side
4. Decide: bug fix or baseline update

## Writing New Tests

### Core Element Test

```typescript
import { describe, test, expect } from "vitest";
import { render } from "../../utils/render";
import { validateMP4 } from "../../utils/video-validator";

describe("ef-my-element", () => {
  test("renders basic element", async () => {
    const result = await render(`
      <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
        <ef-my-element class="w-full h-full" />
      </ef-timegroup>
    `);

    expect(result.videoBuffer.length).toBeGreaterThan(1000);
    expect(result.durationMs).toBeCloseTo(2000, 100);

    const validation = validateMP4(result.videoBuffer);
    expect(validation.isValid).toBe(true);
  });
});
```

### Visual Regression Test

```typescript
import { describe, test } from "vitest";
import { render } from "../utils/render";
import { compareToBaseline } from "../utils/visual-diff";

describe("Visual Regression", () => {
  test("my-feature matches baseline", async () => {
    const result = await render(`
      <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
        <div class="w-full h-full bg-blue-500">My Feature</div>
      </ef-timegroup>
    `);

    await compareToBaseline(result.videoPath, "my-feature", {
      threshold: 0.01, // 1% tolerance
      updateBaseline: process.env.UPDATE_BASELINES === "true",
    });
  });
});
```

## Debugging Failed Tests

### Test Artifacts

All test artifacts are saved to `.test-output/`:

```
.test-output/
└── render-<timestamp>/
    ├── output.mp4         # Rendered video
    └── metadata.json      # Render metadata
```

### Visual Regression Artifacts

Visual regression artifacts are saved to `tests/visual/fixtures/`:

```
tests/visual/fixtures/<test-name>/
├── baseline/              # Known-good frames
├── test/                  # Current test frames
└── diffs/                 # Difference images
```

### MP4 Analysis

To inspect MP4 structure:

```bash
mp4dump .test-output/render-<timestamp>/output.mp4
ffprobe .test-output/render-<timestamp>/output.mp4
```

### Playback Testing

Open output.mp4 in a video player:

```bash
open .test-output/render-<timestamp>/output.mp4
```

## Test Utilities

### `render(html, options?)`

Simple render function that takes HTML and returns video.

```typescript
const result = await render(`
  <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
    <div class="w-full h-full bg-blue-500"></div>
  </ef-timegroup>
`);

// result.videoBuffer - Video as Buffer
// result.videoPath - Path to saved video
// result.width, result.height - Dimensions
// result.durationMs - Duration in milliseconds
// result.renderTimeMs - How long render took
// result.templateHash - Template hash for artifacts
```

### `validateMP4(pathOrBuffer)`

Validates MP4 structure and metadata.

```typescript
const validation = validateMP4(result.videoBuffer);

// validation.isValid - true if valid MP4
// validation.hasVideoTrack - true if video track present
// validation.hasAudioTrack - true if audio track present
// validation.duration - Duration in seconds
// validation.width, validation.height - Dimensions
// validation.fps - Framerate
// validation.codec - Video codec
// validation.errors - Array of error messages
```

### `compareToBaseline(videoPath, testName, options?)`

Compares video against baseline frames.

```typescript
await compareToBaseline(result.videoPath, "my-test", {
  threshold: 0.01,           // 1% tolerance (default)
  updateBaseline: false,      // Set true to update baselines
  framesPerSecond: 1,        // Extract 1 frame/sec (default)
});

// Throws error if frames don't match baseline
// Creates/updates baseline if updateBaseline=true
```

## CI Integration

### GitHub Actions

```yaml
- name: Run smoke tests
  run: cd telecine && npm test tests/smoke/

- name: Run core tests
  run: cd telecine && npm test tests/core/

- name: Run visual regression
  run: cd telecine && npm test tests/visual/

- name: Run audio tests
  run: cd telecine && npm test tests/audio/

- name: Upload test artifacts
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: test-artifacts
    path: telecine/lib/queues/units-of-work/Render/tests/.test-output/
```

### Running Both Suites (During Transition)

```yaml
- name: Run old test suite
  run: cd telecine && npm test full-render/

- name: Run new test suite
  run: cd telecine && npm test tests/

- name: Compare results
  run: echo "Both suites passed"
```

## Performance Expectations

- **Smoke tests:** <30 seconds
- **Core tests:** <30 seconds
- **Visual regression:** ~2 minutes
- **Audio tests:** ~1 minute
- **Performance benchmarks:** ~5 minutes (on-demand)
- **Experimental tests:** Variable (non-blocking)

**Total CI time:** ~3 minutes (smoke + core + visual + audio)

## Key Principles

1. **Simplicity** - Each test does ONE thing
2. **Speed** - Core tests are fast (<30s)
3. **Clarity** - Test names describe what's validated
4. **Independence** - Tests don't share state
5. **Debuggability** - Clear errors with artifact paths

## Migration from Old Suite

The old test suite (`full-render/`) will be deleted after verification period.

**Current state:** Both suites run in parallel  
**After verification:** New suite only

**Key differences:**
- **Faster:** 3min vs 4.4min
- **Clearer:** Each test has single purpose
- **Simpler:** No shared fixtures or worker scope
- **Better errors:** Actionable failure messages

## Troubleshooting

### Tests are slow

Check if you're running the right test category:
- Core tests should be <30s
- Visual regression ~2min
- Performance tests are intentionally slow

### Visual regression failing unexpectedly

1. Check if baseline exists: `tests/visual/fixtures/<test-name>/baseline/`
2. View diffs: `tests/visual/fixtures/<test-name>/diffs/`
3. If intentional change: `UPDATE_BASELINES=true npm test`

### MP4 validation errors

1. Check test output for artifact path
2. Analyze with mp4dump: `mp4dump <path>`
3. Check playback: `open <path>`
4. Review validation errors in test output

### Render function failing

1. Check `.test-output/` for artifacts
2. Look for bundle errors in test output
3. Verify HTML is valid
4. Check element names (ef-timegroup, ef-image, etc.)

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Editframe Elements](../../packages/elements/)
- [CSS Animations Skill](.cursor/skills/css-animations/SKILL.md)
- [Video Analysis Skill](.cursor/skills/video-analysis/SKILL.md)
