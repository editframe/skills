# Complete Skills Documentation Plan

## Overview

This plan documents all exported elements, components, APIs, and methods from the @editframe packages that are currently undocumented in the skills system. The goal is to achieve complete coverage of the public API surface for both HTML (Web Components) and React users.

## Context

**Current state:**
- 7 skills with 65+ reference files
- Significant gaps in documentation for exported elements
- Missing critical APIs like `renderToVideo()`, `createRenderClone()`
- Asymmetric coverage between HTML and React skills
- No documentation for secondary entry points (`./server`, `./r3f`, etc.)

**Skills involved:**
- `skills/skills/elements-composition/` (HTML Web Components)
- `skills/skills/react-composition/` (React wrappers)
- `skills/skills/vite-plugin/` (new skill to create)

**Documentation system:** See `.cursor/skills/skills-docs/SKILL.md` for authoring conventions.

---

## Task Categories

### Category 1: New HTML Element References (28 files)
Files to create in `skills/skills/elements-composition/references/`

#### Configuration & Setup
1. **configuration.md** - `ef-configuration`
   - Attributes: `apiHost`, `signingURL`, `mediaEngine`
   - Wrapping compositions for cloud/local media
   - Examples: local development vs production setup

2. **pan-zoom.md** - `ef-pan-zoom`
   - Attributes: `x`, `y`, `scale`, `autoFit`
   - Gesture handling (wheel, pointer)
   - Context provision for children
   - Example: Zoomable video preview

#### Preview & Display
3. **preview.md** - `ef-preview`
   - Attributes: `target`
   - Focus tracking
   - Context provision (`focusedElement`)
   - Example: Preview wrapper for composition

#### Editor UI
4. **workbench.md** - `ef-workbench`
   - Full editor UI
   - Properties: `rendering`
   - Methods: `setPreviewPresentationMode()`, `getPreviewPresentationMode()`
   - Example: Complete editing interface

5. **controls.md** - `ef-controls`
   - Attributes: `target`
   - Context bridging for playback controls
   - Provides: `playing`, `loop`, `currentTimeMs`, `durationMs` contexts
   - Example: Control panel wrapper

#### Playback Controls
6. **play.md** - `ef-play`
   - Attributes: `target`, `playing`
   - Slots: `play`
   - Auto-hide when playing
   - Example: Custom play button

7. **pause.md** - `ef-pause`
   - Attributes: `target`, `playing`
   - Slots: `pause`
   - Auto-hide when paused
   - Example: Custom pause button

8. **toggle-play.md** - `ef-toggle-play`
   - Attributes: `target`, `playing`
   - Slots: `play`, `pause`
   - Example: Combined play/pause button

9. **toggle-loop.md** - `ef-toggle-loop`
   - Attributes: `target`, `loop`
   - Slots: `on`, `off`
   - Example: Loop toggle button

#### Timeline Controls
10. **scrubber.md** - `ef-scrubber`
    - Attributes: `target`, `orientation`, `zoomScale`
    - CSS Parts: `scrubber`, `progress`, `handle`, `playhead`
    - Playhead manipulation
    - Example: Horizontal and vertical scrubbers with custom styling

11. **time-display.md** - `ef-time-display`
    - Attributes: `currentTimeMs`, `durationMs`
    - CSS Parts: `time`
    - Format: "M:SS / M:SS"
    - Example: Custom styled time display

12. **filmstrip.md** - `ef-filmstrip`
    - Attributes: `target`, `pixelsPerMs`, `hidePlayhead`, `disableInternalScroll`, `hide`, `show`
    - Timeline visualization
    - Example: Timeline with tracks and playhead

13. **timeline.md** - `ef-timeline`
    - Track management
    - Item manipulation
    - Selection handling
    - Example: Detailed timeline editor

14. **timeline-ruler.md** - `ef-timeline-ruler`
    - Frame markers
    - Zoom support
    - Methods: `quantizeToFrameTimeMs()`, `calculateFrameIntervalMs()`, `calculatePixelsPerFrame()`, `shouldShowFrameMarkers()`
    - Example: Ruler with frame markers at different zoom levels

15. **thumbnail-strip.md** - `ef-thumbnail-strip`
    - Target video element
    - Thumbnail generation and display
    - Example: Video scrub thumbnails

16. **trim-handles.md** - `ef-trim-handles`
    - Attributes: `startMs`, `endMs`, `canMove`
    - Events: `trim-change`
    - Types: `TrimValue`, `TrimChangeDetail`
    - Example: Trim UI with live preview

#### Hierarchy & Organization
17. **hierarchy.md** - `ef-hierarchy`
    - Attributes: `target`, `header`, `showHeader`, `hideSelectors`, `showSelectors`
    - Hierarchy item variants for each element type
    - Example: Layer panel showing composition structure

#### Overlay System
18. **overlay-layer.md** - `ef-overlay-layer`
    - Container for positioned overlays
    - Coordinate system management
    - Example: Overlay container with multiple items

19. **overlay-item.md** - `ef-overlay-item`
    - Attributes: `x`, `y`, `scale`, `rotation`
    - Types: `OverlayItemPosition`
    - Example: Positioned overlay elements

#### Canvas & Drawing
20. **canvas.md** - `ef-canvas` / `ef-canvas-item`
    - Attributes: `elementIdAttribute`, `enableTransformHandles`
    - Methods: `selectElement()`, `getSelectedElements()`, `updateElementBounds()`
    - Classes: `CanvasAPI`, `SelectionModel`
    - Drag-and-drop manipulation
    - Example: Interactive canvas with selectable elements

#### Transform & Manipulation
21. **transform-handles.md** - `ef-transform-handles`
    - Attributes: `bounds`, `enableRotation`
    - Events: `transform-changed`
    - Types: `TransformBounds`
    - Example: Transform UI with rotation/scale/position handles

22. **resizable-box.md** - `ef-resizable-box`
    - Bounds and resize handles
    - Types: `BoxBounds`
    - Example: Resizable container

23. **dial.md** - `ef-dial`
    - Attributes: `value`, `min`, `max`, `step`
    - Events: `dial-change`
    - Types: `DialChangeDetail`
    - Rotary input control
    - Example: Volume dial, rotation control

#### Layout Helpers
24. **focus-overlay.md** - `ef-focus-overlay`
    - Focus highlighting behavior
    - Visual focus indicator
    - Example: Highlight focused element in preview

25. **fit-scale.md** - `ef-fit-scale`
    - Attributes: `fitMode` ("contain"/"cover"/"fill")
    - Methods: `computeFitScale()`
    - Types: `ScaleInput`, `ScaleOutput`
    - Helpers: `needsFitScale()`, `elementNeedsFitScale()`
    - Example: Responsive container scaling

26. **active-root-temporal.md** - `ef-active-root-temporal`
    - Root timegroup binding
    - Temporal context provision
    - Example: Root temporal provider setup

#### Text Elements
27. **text-segment.md** - `ef-text-segment`
    - Attributes: `segmentIndex`, `startTimeMs`, `durationMs`
    - Static methods: `registerAnimations()`, `unregisterAnimations()`
    - Styling individual text segments
    - Example: Custom animated text segments

28. **captions-sub-elements.md** - Caption styling sub-elements
    - `ef-captions-active-word` - Currently spoken word
    - `ef-captions-before-active-word` - Words before active
    - `ef-captions-after-active-word` - Words after active
    - `ef-captions-segment` - Full caption segment
    - Example: Styled caption segments with highlighting

---

### Category 2: New React Component References (25 files)
Files to create in `skills/skills/react-composition/references/`

#### Configuration & Setup
29. **pan-zoom.md** - `PanZoom` component
    - Props: `x`, `y`, `scale`, `autoFit`, `className`, `style`, `children`
    - Context provision for `usePanZoomTransform()`
    - Example: Zoomable video preview in React

#### Playback Controls
30. **play.md** - `Play` component
    - Props: `target`, slot customization
    - Example: Custom play button

31. **pause.md** - `Pause` component
    - Props: `target`, slot customization
    - Example: Custom pause button

32. **toggle-play.md** - `TogglePlay` component
    - Props: `target`, `play`/`pause` slots
    - Example: Combined play/pause button

33. **toggle-loop.md** - `ToggleLoop` component
    - Props: `target`, `on`/`off` slots
    - Example: Loop toggle button

#### Timeline Controls
34. **scrubber.md** - `Scrubber` component
    - Props: all scrubber properties
    - Types: `ScrubberProps`
    - Example: Custom styled scrubber

35. **time-display.md** - `TimeDisplay` component
    - Props: display properties
    - Example: Custom time display

36. **filmstrip.md** - `Filmstrip` component
    - Props: `target`, `pixelsPerMs`, `hide`, `show`
    - Example: Timeline filmstrip

37. **timeline.md** - `Timeline` component
    - Track management in React
    - Example: Timeline with React state integration

38. **timeline-ruler.md** - `TimelineRuler` component
    - Frame markers, zoom
    - Example: Ruler component

39. **thumbnail-strip.md** - `ThumbnailStrip` component
    - Video thumbnails
    - Example: Thumbnail preview

40. **trim-handles.md** - `TrimHandles` component
    - Props and event handling in React
    - Example: Trim UI with React state

#### Hierarchy & Organization
41. **hierarchy.md** - `Hierarchy` component
    - Props for hierarchy display
    - Example: Layer panel in React

#### Overlay System
42. **overlay-layer.md** - `OverlayLayer` component
    - Props for overlay container
    - Example: React overlay system

43. **overlay-item.md** - `OverlayItem` component
    - Props: `x`, `y`, `scale`, `rotation`
    - Types: `OverlayItemProps`
    - Example: Positioned overlays in React

#### Canvas & Drawing
44. **canvas.md** - `Canvas` / `CanvasItem` components
    - Canvas with selection in React
    - Example: Interactive canvas with React state

#### Transform & Manipulation
45. **transform-handles.md** - `TransformHandles` component
    - Props and event handling
    - Example: Transform UI in React

46. **resizable-box.md** - `ResizableBox` component
    - Props for resizable container
    - Example: Resizable box with React

47. **dial.md** - `Dial` component
    - Props and event handling
    - Example: Dial input in React

#### Layout Helpers
48. **focus-overlay.md** - `FocusOverlay` component
    - Props for focus indicator
    - Example: Focus overlay in React

49. **fit-scale.md** - `FitScale` component
    - Props: `fitMode`
    - Example: Fit scale in React

50. **active-root-temporal.md** - `ActiveRootTemporal` component
    - Props for root temporal
    - Example: Root provider in React

#### Text Elements
51. **text-segment.md** - `TextSegment` component
    - Props and animation registration
    - Example: Text segments in React

52. **captions-sub-components.md** - Caption styling components
    - `CaptionsActiveWord`, `CaptionsBeforeActiveWord`, `CaptionsAfterActiveWord`, `CaptionsSegment`
    - Example: Caption styling in React

#### Hooks
53. **use-media-info.md** (or add to existing hooks.md)
    - `useMediaInfo()` hook
    - Returns: media metadata (duration, dimensions, etc.)
    - Example: Using media info in React components

---

### Category 3: Rewrites / Major Upgrades (13 files)

54. **elements-composition/references/render-api.md** - COMPLETE REWRITE
    - Document `renderToVideo()` on Timegroup element
    - All `RenderToVideoOptions` fields:
      - `fps`, `codec`, `bitrate`, `filename`, `scale`
      - `keyFrameInterval`, `fromMs`, `toMs`
      - `onProgress`, `streaming`, `signal`
      - `includeAudio`, `audioBitrate`
      - `contentReadyMode`, `blockingTimeoutMs`
      - `returnBuffer`, `preferredAudioCodecs`
      - `benchmarkMode`, `customWritableStream`
      - `progressPreviewInterval`, `canvasMode`
    - Show browser-side export with progress callback
    - Document `renderToCanvas()` - canvas/image export
    - Document `renderToImage()`, `renderToImageNative()`
    - Document `createRenderClone()` - off-DOM rendering
    - Keep existing `getRenderData()` documentation
    - Show codec options and browser support matrix
    - Example: Full render with progress bar

55. **elements-composition/references/surface.md** - EXPAND
    - Increase from 46 lines to ~80-100 lines
    - Add `html live` demos for:
      - Video wall (multiple mirrors in grid)
      - Picture-in-picture
      - Reflection effect (scale-y flip)
      - Blurred background
      - CSS filter effects on surface (grayscale, hue-rotate, blur, etc.)
    - Match React version's quality (191 lines, 7 examples)

56. **elements-composition/references/waveform.md** - ADD VISUAL DEMOS
    - Add `html live` demos showing all 8 visualization modes:
      - `bars` - vertical bars
      - `roundBars` - rounded bars
      - `line` - line graph
      - `curve` - smooth curve
      - `wave` - wave pattern
      - `spikes` - spike pattern
      - `bricks` - brick pattern
      - `pixel` - pixel art style
    - Currently has zero visual examples for a visual element
    - Show `barSpacing`, `lineWidth`, `color` customization

57. **elements-composition/references/audio.md** - ADD DEMOS
    - Add `html live` demos showing:
      - Audio with waveform visualization
      - Volume control (interactive slider)
      - Multiple audio tracks layering
      - Mute/unmute behavior
      - `fft-size` effect on waveform

58. **elements-composition/references/captions.md** - ADD DEMOS
    - Add more `html live` demos showing:
      - Different styling approaches for active word
      - Segment-level styling
      - Karaoke-style captions (word highlighting progression)
      - Custom caption JSON format examples
      - Using with transcription workflow

59. **elements-composition/references/text.md** - ADD DEMOS
    - Add `html live` demos for all split modes:
      - `split="word"` with stagger
      - `split="char"` with character animation
      - `split="line"` with line-by-line reveal
    - Show `registerAnimations()` usage for custom animations
    - Show `easing` options
    - Show `staggerMs` timing

60. **elements-composition/references/timegroup.md** - ADD METHODS
    - Add documentation for methods not in current API frontmatter:
      - `renderToVideo()` method
      - `createRenderClone()` method
      - `onFrameTask()` method for frame callbacks
      - `renderToCanvas()` method
    - Document `FrameTaskCallback` type
    - Document `RenderCloneResult` type
    - Document `TimegroupInitializer` type

61. **react-composition/references/hooks.md** - ADD HOOK
    - Add `useMediaInfo()` documentation (or create separate file - task 53)
    - Returns: duration, dimensions, codec info, etc.
    - Example: Using media info in components

62. **react-composition/references/surface.md** - ADD LIVE DEMOS
    - Add note about live demos requiring Preview wrapper
    - Convert existing code examples to `html live` where possible
    - Or add more interactive examples

63. **react-composition/references/workbench.md** - VERIFY COMPLETENESS
    - Ensure `setPreviewPresentationMode()` documented
    - Ensure `getPreviewPresentationMode()` documented
    - Ensure `rendering` state documented
    - Ensure UI panels documented

64. **react-composition/references/configuration.md** - VERIFY COMPLETENESS
    - Ensure `apiHost` fully documented
    - Ensure `signingURL` fully documented
    - Ensure `mediaEngine` fully documented
    - Show all three options: "cloud", "local", "jit"

65. **react-composition/references/controls.md** - VERIFY COMPLETENESS
    - Ensure context bridging documented
    - Show non-adjacent controls example
    - Document all provided contexts

66. **react-composition/references/preview.md** - VERIFY COMPLETENESS
    - Ensure focus tracking documented
    - Ensure target binding documented
    - Show `focusedElement` context usage

---

### Category 4: New Cross-Cutting / Conceptual Docs (11 files)

67. **elements-composition/references/render-to-video.md** - TUTORIAL
    - End-to-end: build a composition, render with `renderToVideo()` in browser
    - Show progress callback implementation
    - Show codec selection
    - Show audio inclusion
    - Show the output (download link)
    - Show error handling
    - Show abort signal usage
    - Example: Complete render flow from composition to MP4

68. **react-composition/references/render-to-video.md** - TUTORIAL
    - Same but React: use Timegroup ref to call `renderToVideo()`
    - Show with `useTimingInfo()` for progress
    - Show React state integration
    - Show download in React app
    - Example: React app with render button

69. **elements-composition/references/render-strategies.md** - EXPLANATION
    - Three render paths:
      1. CLI render (Playwright) - `npx editframe render`
      2. Browser render (`renderToVideo()`) - WebCodecs
      3. Cloud render (API `createRender()`) - server-side
    - When to use each:
      - CLI: local development, scripts, automation
      - Browser: user-facing export, no backend needed
      - Cloud: production, scalable, no browser needed
    - Architecture differences:
      - CLI spawns Vite dev server + Playwright
      - Browser uses WebCodecs + FFmpeg.wasm
      - Cloud uploads bundle + processes server-side
    - Performance characteristics
    - Browser support matrix

70. **elements-composition/references/composition-model.md** - EXPLANATION
    - Mental model document (60 lines, no code):
      - Timegroup tree structure
      - Temporal scheduling (how time flows)
      - Media elements produce frames (video, audio, image)
      - Text/captions render as HTML
      - Surface mirrors other elements
      - The whole tree renders to video
      - Canvas-based rendering
      - Context system (how elements communicate)
    - Conceptual diagram (ASCII art or Mermaid)

71. **elements-composition/references/events.md** - REFERENCE
    - Catalog of all custom events:
      - `trim-change` (on `ef-trim-handles`)
      - `transform-changed` (on `ef-transform-handles`, `ef-pan-zoom`)
      - `dial-change` (on `ef-dial`)
      - `scrub-segment-loading` (on `ef-video`)
    - Event detail types:
      - `TrimChangeDetail`
      - `DialChangeDetail`
    - Example: Listening to events

72. **elements-composition/references/css-parts.md** - REFERENCE
    - Catalog of all `::part()` selectors by element:
      - `ef-scrubber`: `scrubber`, `progress`, `handle`, `playhead`
      - `ef-time-display`: `time`
      - (list all elements with parts)
    - Example: Styling with `::part()`
    - Show before/after styling examples

73. **elements-composition/references/editor-toolkit.md** - HOW-TO
    - Composing Preview + Controls + Filmstrip + Workbench
    - Show minimal editor (Preview + Controls)
    - Progressively add features:
      - Add Filmstrip for timeline
      - Add Workbench for full editor
      - Add Hierarchy for layers
      - Custom styling with CSS parts
    - Example: Complete custom editor

74. **react-composition/references/editor-toolkit.md** - HOW-TO
    - Same but React version
    - Show React component composition
    - Show state management
    - Show event handling
    - Example: React editor app

75. **react-composition/references/r3f.md** - REFERENCE
    - React Three Fiber integration
    - Import from `@editframe/react/r3f`
    - Components:
      - `OffscreenCompositionCanvas` - web worker rendering
      - `CompositionCanvas` - main thread rendering
    - Hook: `useCompositionTime()` - sync 3D animations with timeline
    - Function: `renderOffscreen()` - offscreen rendering
    - Worker protocol types
    - Example: 3D scene in composition

76. **react-composition/references/server-rendering.md** - REFERENCE
    - SSR support
    - Import from `@editframe/react/server`
    - What's safe to import server-side
    - What requires browser environment
    - Example: Next.js / Remix integration

77. **elements-composition/references/entry-points.md** - REFERENCE
    - Package entry points:
      - `"."` - Full package (browser)
      - `"./server"` - SSR-safe types only
      - `"./node"` - Node.js safe entry (no DOM)
      - `"./styles.css"` - Component styles
      - `"./theme.css"` - Theme styles
    - When to use each
    - Import examples for each

---

### Category 5: New vite-plugin Skill (6 files)

78. **skills/skills/vite-plugin/SKILL.md** - NEW SKILL
    - Name: `vite-plugin`
    - Description: Vite integration for Editframe development - JIT transcoding, local assets API, and build configuration
    - References list (5 files below)
    - Overview of what the plugin provides

79. **vite-plugin/references/getting-started.md** - REFERENCE
    - Installation: `npm install @editframe/vite-plugin`
    - Configuration in `vite.config.ts`
    - Basic setup example
    - Plugin options overview

80. **vite-plugin/references/jit-transcoding.md** - REFERENCE
    - On-demand video transcoding in dev server
    - How JIT transcoding works
    - Performance characteristics
    - Cache management
    - Example: Using JIT transcoding in development

81. **vite-plugin/references/local-assets.md** - REFERENCE
    - `/api/v1/assets/local/*` endpoints
    - Image caching endpoint
    - Caption generation endpoint
    - How local assets work vs cloud assets
    - Example: Using local assets in development

82. **vite-plugin/references/file-api.md** - REFERENCE
    - `/api/v1/files/local/*` endpoints
    - `/api/v1/isobmff_files/local/*` endpoints
    - Local file management during development
    - Example: File upload/processing locally

83. **vite-plugin/references/visual-testing.md** - REFERENCE
    - Image diff tools (odiff integration)
    - Visual regression testing setup
    - Snapshot testing compositions
    - Example: Visual test suite

---

## Authoring Guidelines

### For All Files

1. **Frontmatter must include:**
   - `title` - Clear, concise title
   - `description` - One sentence describing the element/concept
   - `type` - One of: `reference`, `tutorial`, `how-to`, `explanation`
   - `nav.parent` - Logical grouping (use existing paths where possible)
   - `nav.priority` - Sort order
   - `api` - Structured API metadata (for elements/components)

2. **API frontmatter structure:**
   ```yaml
   api:
     attributes:  # For HTML elements
       - name: src
         type: string
         required: true
         description: Source URL

     properties:  # For React components
       - name: src
         type: string
         required: true
         description: Source URL

     methods:  # Instance methods
       - name: play()
         signature: play(): void
         description: Start playback
         returns: void

     functions:  # Standalone functions
       - name: createRender
         signature: createRender(client, payload)
         description: Create render job
         returns: CreateRenderResult
   ```

3. **Use `html live` blocks** for interactive demos wherever possible
   - Every visual element should have at least one live demo
   - Show basic usage first, then advanced examples
   - Use real assets from `https://assets.editframe.com/`

4. **Length targets:**
   - `reference`: 60-100 lines (attributes + usage + patterns)
   - `tutorial`: ~90 lines (step-by-step with demos)
   - `how-to`: 20-40 lines (single task, actions only)
   - `explanation`: 60-80 lines (conceptual, no code)

5. **Writing style:**
   - Neutral, technical language
   - Effects over implementation
   - Show, don't describe
   - No marketing language
   - Qualify absolutes

6. **Cross-references:**
   - Link to related elements
   - Link to tutorials
   - Use markdown link syntax: `[filename.md](filename.md)`

### For HTML Elements (elements-composition)

- Tag name in heading: `# ef-video`
- Show HTML usage first
- Include `html live` demos
- Document attributes in `api.attributes`
- Show CSS parts if applicable
- Show events if applicable

### For React Components (react-composition)

- Component name in heading: `# Video`
- Show import statement first
- Show TypeScript props types
- Document props in `api.properties`
- Show JSX usage
- Link to HTML element equivalent

### For Methods/APIs

- Show TypeScript signature
- Document all parameters
- Document return type
- Show error cases
- Show abort/cancellation if applicable
- Include usage example

---

## Testing After Implementation

For each file created:

1. **Generate LLM skills:**
   ```bash
   npx tsx scripts/generate-skills.ts
   ```

2. **Verify output:**
   - Check `skills/skills-generated/` for generated files
   - Verify frontmatter survived (name, description, license, metadata)
   - Verify `api` was converted to prose correctly
   - Verify markdown body is preserved

3. **Preview on web:**
   - Navigate to telecine docs site
   - Verify file renders correctly
   - Verify `html live` blocks render
   - Verify links work
   - Verify API reference cards render

4. **Test navigation:**
   - Verify file appears in sidebar (if `nav` defined)
   - Verify file appears in topic group (if `topic` defined)
   - Verify related links work

---

## Implementation Strategy

### Phase 1: Critical Gaps (P0)
- Task 54: render-api.md rewrite (`renderToVideo()` documentation)
- Task 1: configuration.md (HTML)
- Task 64: configuration.md verification (React)
- Task 69: render-strategies.md (explanation)

### Phase 2: High-Value Elements (P1)
- Task 2: pan-zoom.md (HTML)
- Task 29: pan-zoom.md (React)
- Task 55: surface.md upgrade (HTML)
- Task 56: waveform.md visual demos
- Task 57: audio.md demos
- Task 70: composition-model.md (mental model)

### Phase 3: Preview & Display (P1)
- Task 3: preview.md (HTML)
- Task 66: preview.md verification (React)
- Task 4: workbench.md (HTML)
- Task 63: workbench.md verification (React)

### Phase 4: Playback Controls (P2)
- Tasks 5-11: Controls elements (HTML)
- Tasks 30-35: Controls components (React)

### Phase 5: Timeline & Editor (P2)
- Tasks 12-16: Timeline elements (HTML)
- Tasks 36-40: Timeline components (React)
- Task 73: editor-toolkit.md (HTML)
- Task 74: editor-toolkit.md (React)

### Phase 6: Canvas & Manipulation (P2)
- Tasks 20-23: Canvas/transform elements (HTML)
- Tasks 44-47: Canvas/transform components (React)

### Phase 7: Overlay & Layout (P2)
- Tasks 18-19, 24-26: Overlay/layout elements (HTML)
- Tasks 42-43, 48-50: Overlay/layout components (React)

### Phase 8: Hierarchy & Organization (P2)
- Task 17: hierarchy.md (HTML)
- Task 41: hierarchy.md (React)
- Tasks 27-28: Text/caption sub-elements (HTML)
- Tasks 51-52: Text/caption sub-components (React)

### Phase 9: Cross-Cutting Docs (P2)
- Task 67: render-to-video.md tutorial (HTML)
- Task 68: render-to-video.md tutorial (React)
- Task 71: events.md catalog
- Task 72: css-parts.md catalog
- Task 75: r3f.md (React Three Fiber)
- Task 76: server-rendering.md
- Task 77: entry-points.md

### Phase 10: Vite Plugin (P3)
- Tasks 78-83: New vite-plugin skill (6 files)

### Phase 11: Remaining Upgrades (P3)
- Tasks 58-62, 65: Remaining file upgrades/verifications

---

## Success Criteria

- All 83 tasks completed
- All files pass generation script (`npx tsx scripts/generate-skills.ts`)
- All files render correctly on web
- All `html live` blocks render interactively
- All API frontmatter converts to prose correctly
- All cross-references resolve
- Zero broken links
- Coverage: 100% of public API surface documented
- Quality: All reference files have at least one usage example
- Quality: All visual elements have at least one `html live` demo

---

## Notes

- This plan represents the **complete** documentation gap
- Estimated total: ~8,000-10,000 lines of documentation
- Each file independently testable
- Can be parallelized across multiple agents
- Follow `.cursor/skills/skills-docs/SKILL.md` conventions strictly
- Test generation after each file to catch YAML parser issues early
