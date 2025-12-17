# Skipped Tests Recovery Plan

## Overview

There are **26 skipped test suites** across 18 files. These were skipped during the merge of `elements-wip` because the tests were written against the old implementation and need updating to match new behavior.

## Guiding Principles (from component-test-coverage rules)

1. **Verify Observable Behavior** - Check what components produce (rendered DOM, visible outputs), not how they produce it
2. **Test Names Describe Behavior** - Names explain what behavior is being verified
3. **Verify Invariants Explicitly** - Assert what must always be true
4. **Check Outputs, Not Mechanisms** - Verify final outputs, not function calls or internal state

---

## Category 1: PanZoom/Overlay Transform Context (HIGH PRIORITY)

**Files:**
- `gui/panZoomTransformContext.browsertest.ts` (3 tests)
- `gui/EFOverlayLayer.browsertest.ts`
- `gui/PanZoomOverlayIntegration.browsertest.ts`

**Root Cause:**
Tests assert that `overlayLayer.style.transform` contains translate values, but the new implementation correctly sets `transform: none` when the overlay is a child of `ef-pan-zoom` (because the parent handles the transform).

**Fix Strategy:**
1. **Update tests to verify observable behavior:**
   - When overlay is a **child** of panzoom: verify `style.transform === 'none'` AND verify that `getBoundingClientRect()` returns transformed coordinates
   - When overlay is a **sibling** of panzoom: verify `style.transform` contains the translate

2. **New test cases to add:**
   - Verify overlay items position correctly relative to their targets
   - Verify overlay layer propagates transform to registered items via `updatePosition()`

---

## Category 2: Canvas Selection/Overlay System (HIGH PRIORITY)

**Files:**
- `canvas/overlays/SelectionOverlay.browsertest.ts`
- `canvas/overlays/SelectionOverlayPositioning.browsertest.ts`

**Root Cause:**
Tests depend on `canvas.getAPI()` which no longer exists. Also, selection context setup has changed.

**Fix Strategy:**
1. Replace `canvas.getAPI()` with `new CanvasAPI(canvas)`
2. Update fixture to include parent `ef-pan-zoom` element for context propagation
3. **Verify observable behavior:**
   - Selection box renders at correct screen coordinates
   - Selection bounds update when pan/zoom changes
   - Box-select visual feedback appears during drag operations

---

## Category 3: Canvas/Timeline Integration (MEDIUM PRIORITY)

**Files:**
- `canvas/canvas-integration.browsertest.ts`
- `canvas/canvasTimelineSync.browsertest.ts`

**Root Cause:**
Tests were written for old timeline API. The new `timelineStateContext` and `EFTimeline` component work differently.

**Fix Strategy:**
1. Update tests to use new `timelineStateContext` for timeline state
2. **Verify observable behavior:**
   - Timeline target updates when hierarchy item clicked
   - `activeTimegroupChange` event fires with correct IDs
   - Trim changes on filmstrip update the underlying element's `sourceIn`/`sourceOut`
   - Playhead position syncs between canvas and timeline

---

## Category 4: EFTimegroup Duration/Mode Tests (MEDIUM PRIORITY)

**Files:**
- `elements/EFTimegroup.browsertest.ts` (5 skipped describe blocks)

**Root Cause:**
Duration calculations may have changed with the new timeline implementation.

**Fix Strategy:**
1. **Re-verify invariants:**
   - `mode="fit"`: duration constrains to parent
   - `mode="sequence"`: duration = sum of child durations
   - `mode="contain"`: duration = max of child durations
2. **Verify observable behavior:**
   - `durationMs` property returns correct value
   - Child elements are positioned correctly at different `currentTimeMs` values
   - DOM updates when children added/removed dynamically

---

## Category 5: Media Engine Tests (MEDIUM PRIORITY)

**Files:**
- `elements/EFMedia.browsertest.ts` (JIT Media Engine, Media Engine Selection)
- `elements/EFMedia/JitMediaEngine.browsertest.ts`
- `elements/EFVideo.browsertest.ts`
- `elements/EFThumbnailStrip.browsertest.ts`
- `elements/EFThumbnailStrip.media-engine.browsertest.ts`

**Root Cause:**
These tests require media server infrastructure. They fail with "Unsupported media source" and HTML error pages.

**Fix Strategy:**
1. **Mock media infrastructure** rather than requiring live server
2. Use MSW (Mock Service Worker) to intercept media requests
3. **Verify observable behavior:**
   - Video element renders with correct dimensions
   - Seeking updates `currentTimeMs` and visible frame
   - Thumbnail strip displays expected number of thumbnails
   - Duration is correctly detected from media

**Consider:**
- Skip media engine tests in CI if infrastructure unavailable
- Use test media fixtures that are bundled with tests

---

## Category 6: Component-Specific Tests (LOWER PRIORITY)

**Files:**
- `elements/EFCaptions.browsertest.ts`
- `elements/EFAudio.browsertest.ts` (2 skipped describes)
- `elements/updateAnimations.browsertest.ts`
- `gui/EFFilmstrip.browsertest.ts`
- `gui/EFFitScale.browsertest.ts`
- `gui/ContextMixin.browsertest.ts`

**Root Cause:**
Various - some depend on timegroup timing changes, some on context propagation.

**Fix Strategy:**
1. **EFCaptions:** Verify caption text visibility at different time points
2. **EFAudio:** Verify audio timegroup integration
3. **updateAnimations:** Verify CSS animations use correct time source (`ownCurrentTimeMs` vs `currentTimeMs`)
4. **EFFilmstrip:** Verify element filtering by selector
5. **EFFitScale:** Verify scale calculations when container size changes
6. **ContextMixin:** Verify durationMs updates when children change

---

## Implementation Priority

### Phase 1: Core Transform/Selection (Unblocks other tests)
1. `panZoomTransformContext.browsertest.ts` - 1 hour
2. `EFOverlayLayer.browsertest.ts` - 1 hour
3. `SelectionOverlay.browsertest.ts` - 2 hours

### Phase 2: Timeline Integration
4. `canvas-integration.browsertest.ts` - 2 hours
5. `canvasTimelineSync.browsertest.ts` - 2 hours

### Phase 3: Timegroup Modes
6. `EFTimegroup.browsertest.ts` (5 blocks) - 3 hours

### Phase 4: Media Engine
7. All media-related tests - 4 hours (includes infrastructure work)

### Phase 5: Component Polish
8. Remaining component tests - 2 hours

---

## Test Pattern Template

For each test recovery, follow this pattern:

```typescript
describe("ComponentName", () => {
  // Setup: Create observable DOM structure
  beforeEach(async () => {
    // Create elements in DOM
    // Wait for components to initialize
  });

  // Teardown: Clean DOM
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("behavior description - not implementation steps", async () => {
    // Arrange: Set up input state
    
    // Act: Trigger the behavior being tested
    
    // Assert: Verify OBSERVABLE OUTPUT
    // - Check rendered DOM structure
    // - Check computed styles
    // - Check element attributes/properties
    // - Check event dispatch
    // DO NOT: Check internal function calls
  });
});
```

---

## Success Criteria

- [ ] All 26 skipped test suites are unskipped
- [ ] Tests verify observable behavior, not implementation details
- [ ] Tests survive refactoring of internal mechanisms
- [ ] Total test count returns to pre-skip levels (~369 tests recovered)

