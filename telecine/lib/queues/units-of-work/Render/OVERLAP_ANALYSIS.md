# Test Suite Overlap Analysis

## Summary

**Old Suite:** `full-render/` - 51 tests focused on deep validation  
**New Suite:** `tests/smoke/elements.smoke.test.ts` - 8 tests × 5 strategies = 40 test runs + 8 comparison tests = 48 tests

## Overlap Analysis

### ✅ Covered by New Smoke Tests (Can be removed)

#### 1. Basic Element Rendering
- **Old:** `visual-regression.test.ts` - Basic bars pattern, video-only rendering
- **New:** `ef-video renders` - Tests video element rendering
- **Verdict:** NEW IS BETTER - Tests all 5 strategies automatically

#### 2. Visual Consistency
- **Old:** `visual-regression.test.ts` - Pixel-perfect regression test
- **Old:** `fidelity/bars-video.test.ts` - Cross-mode fidelity with odiff
- **New:** Strategy Consistency tests - `compareStrategies()` with odiff for all 8 element tests
- **Verdict:** NEW IS BETTER - More comprehensive, tests 8 different element types vs 1

#### 3. Edge Cases (Partial overlap)
- **Old:** `edge-cases.test.ts` - Very short durations (11ms, 20ms), audio frame boundary (501ms), render-to-end
- **New:** `tests/core/edge-cases.test.ts` - More comprehensive edge cases
- **Verdict:** NEW IS BETTER - More edge cases covered

#### 4. Multiple Elements
- **Old:** SVG filter test in `visual-regression.test.ts`
- **New:** `multiple elements render together` - Tests image + text composition
- **Verdict:** NEW IS COMPARABLE

### ⚠️ NOT Covered by New Smoke Tests (Should be ported)

#### 1. Audio Quality Validation ⚠️ CRITICAL
**File:** `full-render/audio-regression.test.ts`

**What it tests:**
- Zero-crossing timing analysis for detecting audio discontinuities
- Segment boundary discontinuity detection (AAC splicing issues)
- Sine wave visual regression for waveform accuracy
- Audio frequency spectrum analysis
- WAV/MP3 processing validation

**Current smoke test coverage:**
- `ef-audio renders` - Only checks audio track presence with `hasAudioTrack` assertion
- `ef-waveform renders` - Only checks visual rendering, not audio quality

**Gap:** The smoke tests don't validate audio QUALITY - no discontinuity detection, no zero-crossing analysis, no spectrum analysis

**Recommendation:** Port to `tests/smoke/audio-quality.smoke.test.ts` or add tests to existing smoke suite:
```typescript
test("ef-audio has no discontinuities at segment boundaries", async () => {
  // Use zero-crossing timing analysis from old test
});

test("ef-audio frequency spectrum matches source", async () => {
  // Use audio spectrum analysis from old test
});
```

#### 2. Deep MP4 Structure Validation
**File:** `full-render/mp4-structure.test.ts`

**What it tests:**
- Base media decode time validation (matches cumulative sample durations)
- Segment timing consistency using `mp4dump` parsing
- Fragment box structure details (mvex, mehd, sequence numbers)

**Current smoke test coverage:**
- Basic MP4 validity check: `validateMP4(result.videoBuffer)` only checks if parseable

**Gap:** No deep MP4 internals validation in smoke tests

**Recommendation:** Port critical MP4 timing tests to `tests/smoke/mp4-internals.smoke.test.ts`:
```typescript
test("segment timing is consistent across all strategies", async () => {
  // Use mp4dump parsing from old test
});
```

#### 3. Still Image Rendering
**File:** `full-render/still-image.test.ts`

**What it tests:**
- WebP still rendering from HTML, video-only assets, video with audio tracks

**Current smoke test coverage:** None

**Gap:** No still image rendering tests

**Recommendation:** Only port if still rendering is actively used. Add to smoke suite as:
```typescript
test("renders to webp still image", async () => {
  // Use renderStill API
});
```

#### 4. Playback & Seeking Validation
**File:** `full-render/playback-quality.test.ts`

**What it tests:**
- Video playback works
- Seeking capability throughout video
- Codec validation

**Current smoke test coverage:** None

**Gap:** No playback/seeking validation

**Recommendation:** Add to smoke suite:
```typescript
test("video supports seeking throughout duration", async () => {
  // Use testVideoSeek from test-utils
});
```

#### 5. Performance Benchmarks (Less critical)
**Files:** `fidelity/perf-frame-capture.test.ts`, `fidelity/perf-bundle-reuse.test.ts`

**What they test:**
- Frame capture method comparison (mediabunny vs FFmpeg vs Electron offscreen)
- Bundle reuse optimization
- FPS impact analysis

**Current smoke test coverage:**
- Performance data is collected in `perf.json` but not explicitly compared

**Gap:** No performance regression detection

**Recommendation:** `tests/performance/render-speed.test.ts` already exists - verify it has sufficient benchmarks, or port specific comparisons

### 🎯 Overlap with Redundancy (Can remove old)

#### 1. Basic Video Rendering
- **Old:** `fidelity/video-only.test.ts`, `fidelity/short-video.test.ts`
- **New:** `ef-video renders and seeks through frames`
- **Verdict:** Remove old - new is more comprehensive with strategy comparison

#### 2. Simple Visual Tests
- **Old:** `visual-regression.test.ts` - Frame count, dimensions, bars pattern
- **New:** All 8 smoke tests validate frame count, dimensions, valid MP4
- **Verdict:** Remove old - new has broader coverage

#### 3. Basic MP4 Validation
- **Old:** `mp4-structure.test.ts` - First 3 tests (segment assembly, properties, timing)
- **New:** All smoke tests use `validateMP4()` and check segment consistency
- **Verdict:** Remove old (except decode time validation) - new is sufficient

### 📊 Test Distribution

| Category | Old Count | New Smoke Count | Gap |
|----------|-----------|-----------------|-----|
| Element rendering | ~8 | 8 × 5 strategies = 40 | ✅ Better in new |
| Visual consistency | ~10 | 8 comparison tests | ✅ Better in new |
| Audio quality | ~9 | 5 tests × 3 strategies = 15 | ✅ PORTED (audio-quality.smoke.test.ts) |
| MP4 structure | ~8 | 4 tests × 3 strategies = 12 | ✅ PORTED (mp4-structure.smoke.test.ts) |
| Still images | ~3 | 0 | ℹ️ Low priority - rarely used |
| Playback/seek | ~3 | Integrated into audio-quality tests | ✅ PORTED |
| Performance | ~4 | Implicit via perf.json | ℹ️ Already tracked |
| Edge cases | ~6 | Covered in core/edge-cases | ✅ Better in new |

## Recommended Action Plan

### Phase 1: Port Critical Tests to Smoke Suite ✅ COMPLETED

1. **Audio quality smoke test** (`tests/smoke/audio-quality.smoke.test.ts`) ✅:
   - ✅ Ported zero-crossing analysis
   - ✅ Ported segment boundary discontinuity detection
   - ✅ Run across all audio-capable strategies (server, browser-full-video-native/foreignObject)
   - ✅ Added frequency spectrum analysis
   - ✅ Added audio metadata validation
   - ✅ Added playback and seeking validation

2. **MP4 timing smoke test** (`tests/smoke/mp4-structure.smoke.test.ts`) ✅:
   - ✅ Ported base media decode time validation
   - ✅ Ported segment validation
   - ✅ Ported duration consistency checks
   - ✅ Ported sequence number validation
   - ✅ Run across all MP4-capable strategies (server, browser-full-video-native/foreignObject)

3. **Playback smoke test** ✅:
   - ✅ Integrated into `audio-quality.smoke.test.ts` (tests video+audio playback and seeking)

### Phase 2: Deprecate Old Suite (READY TO PROCEED)

After verification that new tests pass:
1. Remove `full-render/` directory
2. Update any imports/references
3. Document what was removed in git commit

### Phase 3: Optional Enhancements (DEFERRED)

- Still image tests if feature is actively used (low priority - rarely used)
- Performance regression tests if needed (already tracked via `perf.json`)

## Conclusion

**Verdict: ✅ All critical tests have been ported. The old suite can now be safely deprecated.**

### What Was Ported

1. **Audio Quality** (`tests/smoke/audio-quality.smoke.test.ts`):
   - Zero-crossing timing analysis for 220Hz sine wave
   - Segment boundary discontinuity detection (AAC splicing validation)
   - Frequency spectrum analysis
   - Audio metadata validation
   - Playback and seeking validation

2. **MP4 Structure** (`tests/smoke/mp4-structure.smoke.test.ts`):
   - Base media decode time validation (matches cumulative sample durations)
   - Segment validation
   - Duration consistency checks
   - Sequence number validation

### Why the New Suite is Better

- **Better element coverage**: 8 elements vs scattered tests
- **Automatic strategy comparison**: All tests run across 3-5 strategies automatically
- **Better organization**: Clear smoke/ directory structure
- **Comprehensive audio validation**: Now includes all critical audio tests from old suite
- **Deep MP4 validation**: All timing and structure tests ported
- **Detailed performance metrics**: Tracked via perf.json

### Next Steps

The old `full-render/` suite can now be safely removed after verification that the new tests pass consistently.
