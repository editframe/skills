---
title: Timeline Element
description: Complete timeline editor with zoomable tracks, multi-level hierarchy, scrubber, and synchronized playback controls.
type: reference
nav:
  parent: "Timeline"
  priority: 10
api:
  attributes:
    - name: target
      type: string
      description: ID of target element (temporal or canvas) to edit
    - name: control-target
      type: string
      description: ID of temporal element to control playback
    - name: pixels-per-ms
      type: number
      default: 0.04
      description: Zoom level (pixels per millisecond)
    - name: min-zoom
      type: number
      default: 0.1
      description: Minimum zoom level
    - name: max-zoom
      type: number
      default: 10
      description: Maximum zoom level
    - name: enable-trim
      type: boolean
      default: false
      description: Enable trim handles on tracks
    - name: show-controls
      type: boolean
      default: true
      description: Show header with playback and zoom controls
    - name: show-ruler
      type: boolean
      default: true
      description: Show time ruler with frame markers
    - name: show-hierarchy
      type: boolean
      default: true
      description: Show hierarchy panel with element labels
    - name: show-playhead
      type: boolean
      default: true
      description: Show playhead indicator
    - name: show-playback-controls
      type: boolean
      default: true
      description: Show play/pause/loop buttons
    - name: show-zoom-controls
      type: boolean
      default: true
      description: Show zoom in/out buttons
    - name: show-time-display
      type: boolean
      default: true
      description: Show current time / duration
    - name: hide
      type: string
      description: Comma-separated selectors for elements to hide
    - name: show
      type: string
      description: Comma-separated selectors for elements to show
react:
  generate: true
  componentName: Timeline
  importPath: "@editframe/react"
  propMapping:
    control-target: controlTarget
    pixels-per-ms: pixelsPerMs
    min-zoom: minZoom
    max-zoom: maxZoom
    enable-trim: enableTrim
    show-controls: showControls
    show-ruler: showRuler
    show-hierarchy: showHierarchy
    show-playhead: showPlayhead
    show-playback-controls: showPlaybackControls
    show-zoom-controls: showZoomControls
    show-time-display: showTimeDisplay
  additionalProps:
    - name: className
      type: string
      description: CSS classes for styling
  nav:
    parent: "Tools"
    priority: 43
    related: ["filmstrip", "timeline-ruler", "workbench"]
---

<!-- html-only -->
# ef-timeline
<!-- /html-only -->
<!-- react-only -->
# Timeline
<!-- /react-only -->

Full-featured timeline editor with tracks, hierarchy view, playback controls, and zoom. Shows the temporal structure of compositions with interactive editing capabilities.

<!-- react-only -->
## Import

```tsx
import { Timeline } from "@editframe/react";
```
<!-- /react-only -->

## Basic Usage

<!-- html-only -->
Complete timeline editor for a composition.

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black" id="timeline-demo">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>
  <ef-text class="absolute top-4 left-4 text-white text-3xl font-bold">Timeline Demo</ef-text>
  <ef-text class="absolute bottom-4 left-4 text-white text-lg">Subtitle text</ef-text>
</ef-timegroup>
<div class="mt-4 h-[400px] bg-gray-900 rounded-lg overflow-hidden">
  <ef-timeline target="timeline-demo"></ef-timeline>
</div>
```
<!-- /html-only -->
<!-- react-only -->
```tsx
import { Timeline, Timegroup, Video, Text } from "@editframe/react";

<div className="h-96">
  <Timeline className="w-full h-full" />

  <Timegroup mode="sequence" className="w-[1920px] h-[1080px]" id="composition">
    <Video src="/video1.mp4" />
    <Text>Hello World</Text>
    <Video src="/video2.mp4" />
  </Timegroup>
</div>
```
<!-- /react-only -->

<!-- react-only -->
## With Target

Target a specific timeline:

```tsx
<Timeline
  target="main-composition"
  className="w-full h-96"
/>

<Timegroup id="main-composition" mode="sequence" className="w-[1920px] h-[1080px]">
  <Video src="/video.mp4" />
</Timegroup>
```
<!-- /react-only -->

<!-- html-only -->
## Sequence Timeline

Timeline automatically adapts to sequential compositions.

```html live
<ef-timegroup mode="sequence" class="w-[720px] h-[480px] bg-black" id="seq-timeline">
  <ef-timegroup class="flex items-center justify-center">
    <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" sourcein="0s" sourceout="2s" class="absolute inset-0 size-full object-contain"></ef-video>
    <h1 class="text-white text-4xl bg-blue-600 p-4 rounded relative">First</h1>
  </ef-timegroup>
  <ef-timegroup class="flex items-center justify-center">
    <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" sourcein="5s" sourceout="7s" class="absolute inset-0 size-full object-contain"></ef-video>
    <h1 class="text-white text-4xl bg-purple-600 p-4 rounded relative">Second</h1>
  </ef-timegroup>
</ef-timegroup>
<div class="mt-4 h-[350px] bg-gray-900 rounded-lg overflow-hidden">
  <ef-timeline target="seq-timeline"></ef-timeline>
</div>
```
<!-- /html-only -->

## Minimal Timeline

<!-- html-only -->
Hide controls for a compact timeline view.

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black" id="minimal-demo">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>
  <ef-text class="absolute bottom-4 left-4 text-white text-2xl">Compact View</ef-text>
</ef-timegroup>
<div class="mt-4 h-[250px] bg-gray-900 rounded-lg overflow-hidden">
  <ef-timeline
    target="minimal-demo"
    show-controls="false"
    show-ruler="false"
  ></ef-timeline>
</div>
<div class="mt-2 flex gap-2">
  <ef-controls target="minimal-demo">
    <ef-toggle-play class="px-3 py-1 bg-blue-600 text-white rounded"></ef-toggle-play>
  </ef-controls>
</div>
```
<!-- /html-only -->
<!-- react-only -->
Hide optional UI elements:

```tsx
<Timeline
  showControls={false}
  showHierarchy={false}
  className="w-full h-64"
/>
```
<!-- /react-only -->

<!-- html-only -->
## Timeline with Zoom Controls

Built-in zoom controls for detailed editing.

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black" id="zoom-timeline">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" sourcein="0s" sourceout="5s" class="size-full object-contain"></ef-video>
  <ef-text class="absolute top-4 left-4 text-white text-2xl">Zoomable Timeline</ef-text>
</ef-timegroup>
<div class="mt-4 h-[350px] bg-gray-900 rounded-lg overflow-hidden">
  <ef-timeline target="zoom-timeline" min-zoom="0.5" max-zoom="5"></ef-timeline>
</div>
```

## Filtering Timeline Tracks

Control which elements appear in the timeline.

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black" id="filter-timeline">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>
  <ef-text class="absolute top-4 left-4 text-white text-2xl">Main Title</ef-text>
  <ef-text class="absolute bottom-4 left-4 text-white text-sm helper">Helper</ef-text>
  <ef-text class="absolute bottom-4 right-4 text-white text-xs watermark">© 2024</ef-text>
</ef-timegroup>
<div class="mt-4 h-[300px] bg-gray-900 rounded-lg overflow-hidden">
  <ef-timeline target="filter-timeline" hide=".helper, .watermark"></ef-timeline>
</div>
```
<!-- /html-only -->

<!-- react-only -->
## Custom Configuration

Configure timeline features:

```tsx
<Timeline
  pixelsPerMs={0.08}
  minZoom={0.5}
  maxZoom={5}
  enableTrim
  showControls
  showRuler
  showHierarchy
  showPlayhead
  className="w-full h-96 bg-gray-900"
/>
```

## Hide Specific Elements

Filter what appears in the timeline:

```tsx
{/* Hide waveforms */}
<Timeline
  hide="ef-waveform"
  className="w-full h-96"
/>

{/* Show only videos and images */}
<Timeline
  show="ef-video,ef-image"
  className="w-full h-96"
/>
```

## Trimming Mode

Enable trim handles for editing:

```tsx
import { Timeline, Timegroup, Video } from "@editframe/react";

<Timeline
  enableTrim
  className="w-full h-96"
/>

<Timegroup mode="sequence" className="w-[1920px] h-[1080px]">
  <Video src="/video.mp4" trimStart="2s" trimEnd="3s" />
</Timegroup>
```

## Compact Timeline

Hide non-essential UI:

```tsx
<Timeline
  showPlaybackControls={false}
  showZoomControls={false}
  showTimeDisplay={false}
  className="w-full h-64"
/>
```
<!-- /react-only -->

## Timeline Features

**Playback control** — Play/pause/loop buttons with keyboard shortcuts (Space for play/pause).

**Time navigation** — Click ruler or tracks to seek, drag playhead for scrubbing.

**Zoom control** — Zoom buttons and Cmd/Ctrl+Wheel for zooming toward cursor.

**Frame snapping** — At high zoom, snaps to frame boundaries for precision editing.

**Auto-scroll** — Playhead auto-scrolls during playback to stay visible.

**Keyboard navigation** — Arrow keys move by frame, Shift+Arrow moves by second.

**Hierarchy view** — Shows composition structure with nested elements.

**Track visualization** — Visual tracks for video, audio, text, images, and timegroups.

<!-- html-only -->
**Selection integration** — Syncs with `ef-canvas` for selecting and highlighting elements.
<!-- /html-only -->

**State persistence** — Remembers zoom and scroll position per composition.

<!-- html-only -->
## Timeline with Canvas

Timeline automatically integrates with canvas for selection and highlighting.

```html live
<ef-canvas class="w-[720px] h-[480px] bg-black" id="canvas-timeline">
  <ef-timegroup mode="contain" class="size-full">
    <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain" id="canvas-video"></ef-video>
    <ef-text class="absolute top-4 left-4 text-white text-3xl font-bold" id="canvas-title">
      Editable
    </ef-text>
  </ef-timegroup>
</ef-canvas>
<div class="mt-4 h-[350px] bg-gray-900 rounded-lg overflow-hidden">
  <ef-timeline target="canvas-timeline"></ef-timeline>
</div>
<div class="mt-2 text-white text-sm">
  Click elements in canvas or timeline to select. Hover tracks to highlight elements.
</div>
```
<!-- /html-only -->

<!-- react-only -->
## Full Editor

Complete editor with all features:

```tsx
import { useState } from "react";
import { Timeline, Preview, Timegroup, Video, Text } from "@editframe/react";

export const VideoEditor = () => {
  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Preview */}
      <div className="flex-1 p-6">
        <Preview className="w-full h-full bg-black rounded-lg shadow-2xl" />
      </div>

      {/* Timeline */}
      <div className="h-80 border-t border-gray-700">
        <Timeline
          enableTrim
          pixelsPerMs={0.06}
          className="w-full h-full"
        />
      </div>

      {/* Composition */}
      <Timegroup mode="sequence" className="w-[1920px] h-[1080px]">
        <Video src="/intro.mp4" />
        <Timegroup mode="contain" duration="5s" className="absolute w-full h-full">
          <Video src="/background.mp4" className="size-full" />
          <Text className="absolute top-20 left-20 text-6xl text-white">
            My Video
          </Text>
        </Timegroup>
        <Video src="/outro.mp4" />
      </Timegroup>
    </div>
  );
};
```
<!-- /react-only -->

## Zoom Levels

Timeline zoom affects level of detail:

- **1x (default)** — Standard view, balanced detail
- **0.1x to 0.5x** — Zoomed out, see entire long compositions
- **2x to 5x** — Zoomed in, frame markers appear for precision
- **5x to 10x** — Maximum zoom for frame-accurate editing

Frame markers become visible when there's enough space (typically above 2x zoom).

## Keyboard Shortcuts

When timeline has focus:

- **Space** — Play/pause
- **Arrow Left/Right** — Move by one frame
- **Shift + Arrow Left/Right** — Move by one second
- **Cmd/Ctrl + Wheel** — Zoom toward cursor

<!-- react-only -->
```tsx
<div>
  <div className="mb-4 text-sm space-y-1">
    <p><kbd>←</kbd> / <kbd>→</kbd> - Move by one frame</p>
    <p><kbd>Shift</kbd> + <kbd>←</kbd> / <kbd>→</kbd> - Move by one second</p>
    <p><kbd>Cmd/Ctrl</kbd> + <kbd>Wheel</kbd> - Zoom at cursor position</p>
  </div>

  <Timeline className="w-full h-96" />
</div>
```
<!-- /react-only -->

## CSS Custom Properties

Customize timeline appearance:

```css
ef-timeline {
  --ef-color-bg: #0f172a;
  --ef-color-border: #334155;
  --ef-color-playhead: #3b82f6;
  --ef-color-primary: #3b82f6;
  --ef-hierarchy-width: 200px;
  --ef-row-height: 24px;
  --ef-track-height: 24px;
}
```

## Configuration Patterns

<!-- html-only -->
**Simple playback** — Just timeline with controls:
```html
<ef-timeline target="composition" show-hierarchy="false"></ef-timeline>
```

**Editing mode** — Full features with trim handles:
```html
<ef-timeline target="composition" enable-trim></ef-timeline>
```

**Reference view** — Static timeline without controls:
```html
<ef-timeline
  target="composition"
  show-controls="false"
  show-playhead="false"
></ef-timeline>
```
<!-- /html-only -->
<!-- react-only -->
**Simple playback** — Just timeline with controls:
```tsx
<Timeline target="composition" showHierarchy={false} />
```

**Editing mode** — Full features with trim handles:
```tsx
<Timeline target="composition" enableTrim />
```

**Reference view** — Static timeline without controls:
```tsx
<Timeline
  target="composition"
  showControls={false}
  showPlayhead={false}
/>
```
<!-- /react-only -->

<!-- react-only -->
## With React State

Integrate with React state:

```tsx
import { useState } from "react";
import { Timeline } from "@editframe/react";

export const StatefulTimeline = () => {
  const [zoom, setZoom] = useState(0.04);
  const [showHierarchy, setShowHierarchy] = useState(true);
  const [enableTrim, setEnableTrim] = useState(false);

  return (
    <div>
      <div className="flex gap-4 mb-4 p-4 bg-gray-800">
        <label>
          <input
            type="checkbox"
            checked={showHierarchy}
            onChange={(e) => setShowHierarchy(e.target.checked)}
          />
          Show Hierarchy
        </label>

        <label>
          <input
            type="checkbox"
            checked={enableTrim}
            onChange={(e) => setEnableTrim(e.target.checked)}
          />
          Enable Trim
        </label>

        <div className="flex items-center gap-2">
          <span className="text-sm">Zoom:</span>
          <input
            type="range"
            min="0.01"
            max="0.2"
            step="0.01"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-32"
          />
          <span className="text-sm">{Math.round(zoom * 1000)}%</span>
        </div>
      </div>

      <Timeline
        pixelsPerMs={zoom}
        showHierarchy={showHierarchy}
        enableTrim={enableTrim}
        className="w-full h-96"
      />
    </div>
  );
};
```

## Multi-Track Layout

Timeline automatically shows all temporal elements:

```tsx
<Timeline className="w-full h-96" />

<Timegroup mode="contain" className="w-[1920px] h-[1080px]">
  {/* All elements appear as tracks */}
  <Video src="/video1.mp4" className="absolute top-0 left-0 w-1/2 h-full" />
  <Video src="/video2.mp4" className="absolute top-0 right-0 w-1/2 h-full" />
  <Audio src="/music.mp3" volume={0.5} />
  <Text className="absolute bottom-20 left-20 text-4xl">Caption</Text>
</Timegroup>
```

## Gestural Zoom

Timeline supports mouse/trackpad zoom:

```tsx
<div className="p-4 bg-gray-800 text-sm mb-2">
  Hold <kbd>Cmd/Ctrl</kbd> and scroll to zoom at cursor position
</div>

<Timeline className="w-full h-96" />
```
<!-- /react-only -->

## Notes

- Timeline provides a complete editing interface with controls
<!-- html-only -->
- Use `ef-filmstrip` for a simpler view without controls
<!-- /html-only -->
<!-- react-only -->
- Use `Filmstrip` for a simpler view without controls
<!-- /react-only -->
- Automatically syncs with playback state
- Supports frame-by-frame navigation with arrow keys
- Gestural zoom with Cmd/Ctrl + wheel
- Hierarchy panel shows element names and nesting
- Enable trim mode to edit clip in/out points
- Timeline state persists in localStorage per composition
